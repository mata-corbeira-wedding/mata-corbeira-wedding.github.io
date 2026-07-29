/**
 * HTTP adapter for the wedding RSVP proxy.
 *
 * All decision logic lives in logic.gs and is unit-tested in Node. This file is
 * the only place allowed to touch Google APIs. Keep it thin.
 */

var SHEET_NAME = "Guest List";   // adjust if the tab is named differently
var LOG_SHEET_NAME = "_log";
var GUEST_TABLE_CACHE_KEY = "guest_table";
var GUEST_TABLE_CACHE_TTL_S = 120;
// CacheService caps a value at ~100KB per key; stay well under that so a
// larger-than-expected sheet never throws on put — it just skips the cache
// and falls through to a live read for that request.
var GUEST_TABLE_CACHE_MAX_BYTES = 90 * 1024;
var ADMIN_FAIL_LIMIT = 10;
var ADMIN_FAIL_WINDOW_S = 900;   // 15 minutes
var LOOKUP_LIMIT_PER_PHONE = 20;
var LOOKUP_WINDOW_S = 900;
var GLOBAL_LOOKUP_LIMIT = 300;
var GLOBAL_WINDOW_S = 300;

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sh) throw new Error("Sheet not found: " + SHEET_NAME);
  return sh;
}

/**
 * Returns {headers, rows}. rows excludes the header row.
 *
 * Backed by a short-lived CacheService cache (see GUEST_TABLE_CACHE_*) so
 * repeated lookups within the TTL skip getDataRange().getValues() — a read
 * that also forces re-evaluation of the "# confirmed" / "# declined" summary
 * formula columns and costs real latency on every call.
 *
 * Pass { bypassCache: true } to force a live read that neither reads nor
 * populates the cache. handleAdminList_ uses this: the admin is specifically
 * checking current RSVP state, and a stale-by-up-to-120s view there would be
 * actively misleading rather than just a minor inconvenience.
 */
function readTable_(opts) {
  var bypassCache = !!(opts && opts.bypassCache);
  var cache = CacheService.getScriptCache();

  if (!bypassCache) {
    var cached = cache.get(GUEST_TABLE_CACHE_KEY);
    if (cached) {
      try {
        var parsed = JSON.parse(cached);
        if (parsed && parsed.headers && parsed.rows) return parsed;
      } catch (e) {
        // Corrupt/undecodable cache entry: fall through to a live read
        // instead of throwing.
      }
    }
  }

  var values = sheet_().getDataRange().getValues();
  if (!values.length) throw new Error("Sheet is empty");
  var headers = resolveHeaders(values[0]);
  var table = { headers: headers, rows: values.slice(1) };

  if (!bypassCache) {
    try {
      var json = JSON.stringify(table);
      if (json.length <= GUEST_TABLE_CACHE_MAX_BYTES) {
        cache.put(GUEST_TABLE_CACHE_KEY, json, GUEST_TABLE_CACHE_TTL_S);
      }
      // Else: too large to cache safely. Skip caching and just return the
      // live read below — do not throw.
    } catch (e) {
      // Caching is an optimization; it must never break the request.
    }
  }

  return table;
}

/** Sheet row number for a 0-based index into `rows` (header is row 1). */
function sheetRow_(idx) {
  return idx + 2;
}

function hash_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s));
  return Utilities.base64EncodeWebSafe(bytes).slice(0, 16);
}

/**
 * Increments a fixed-window counter and returns the new count.
 *
 * The window must NOT slide: re-putting with the full ttl on every hit would let
 * a caller sending one request every few seconds hold the counter over its limit
 * forever, locking out every guest. So the window's expiry is stored alongside
 * the count ("count|epochSeconds") and a fresh ttl is only used when starting a
 * new window; inside an existing window we put with just the time remaining.
 */
function bump_(key, ttl) {
  var cache = CacheService.getScriptCache();
  var now = Math.floor(Date.now() / 1000);
  var parts = String(cache.get(key) || "").split("|");
  var n = Number(parts[0]) || 0;
  var expires = Number(parts[1]) || 0;

  if (!n || !expires || expires <= now) {
    n = 1;
    expires = now + ttl;
    cache.put(key, n + "|" + expires, ttl);
  } else {
    n = n + 1;
    cache.put(key, n + "|" + expires, Math.max(1, expires - now));
  }
  return n;
}

/**
 * Appends one row to the hidden `_log` sheet. This is a spreadsheet WRITE
 * that takes a document lock and costs ~1s; under concurrent traffic, writes
 * queuing behind that lock are what turn a ~2s lookup into a multi-second
 * spike. So this is called ONLY for events with an abuse or failure signal,
 * never for the common legitimate case:
 *
 *   - lookup: a MISS or a throttled request IS logged. A successful (hit)
 *     lookup is deliberately NOT logged here — see bumpLookupHit_(), which
 *     records it with a CacheService counter instead of a sheet write. Do
 *     not "restore" a log_() call on the hit path; that would silently
 *     reintroduce the write this optimization exists to remove.
 *   - submit: not_found (including validation failures, which return the
 *     same not_found response) and successful writes ARE logged.
 *   - adminList: unauthorized attempts, throttled attempts, and successful
 *     loads ARE logged.
 *   - doPost's catch-all: any uncaught handler error IS logged.
 *
 * Never throws — logging must never break a request.
 */
function log_(action, phone, result) {
  try {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(LOG_SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(LOG_SHEET_NAME);
      sh.appendRow(["timestamp", "action", "phone_hash", "result"]);
      sh.hideSheet();
    }
    sh.appendRow([new Date(), action, phone ? hash_(phone) : "", result]);
  } catch (e) {
    // Logging must never break a request.
  }
}

/**
 * Cheap, approximate visibility into successful lookup volume without a
 * spreadsheet write. Not authoritative (CacheService values can be evicted
 * early and the counter resets whenever the key expires); it exists only so
 * successful lookups aren't completely invisible now that they no longer
 * write a `_log` row.
 */
function bumpLookupHit_() {
  try {
    var cache = CacheService.getScriptCache();
    var n = Number(cache.get("lk_hits")) || 0;
    // 21600s (6h) is CacheService's max TTL.
    cache.put("lk_hits", String(n + 1), 21600);
  } catch (e) {
    // Counting must never break a request.
  }
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return json_({ ok: false, error: "bad_request" });
  }

  // A body of "null" or "[]" or "3" parses fine but has no .action. Reject it
  // here so nothing downstream (including the catch below) dereferences it.
  if (!req || typeof req !== "object" || Array.isArray(req)) {
    return json_({ ok: false, error: "bad_request" });
  }

  var action = String(req.action || "");
  try {
    switch (action) {
      case "lookup":    return json_(handleLookup_(req));
      case "submit":    return json_(handleSubmit_(req));
      case "adminList": return json_(handleAdminList_(req));
      default:          return json_({ ok: false, error: "bad_request" });
    }
  } catch (err) {
    // The handler already failed; this block must not be able to fail too.
    try {
      log_(action || "?", "", "error: " + (err && err.message ? err.message : err));
    } catch (ignored) {}
    return json_({ ok: false, error: "server_error" });
  }
}

/** GET exists only so a browser visit shows something harmless. It returns no data. */
function doGet() {
  return json_({ ok: false, error: "bad_request" });
}

/**
 * Shared budget for lookup and submit: one global ceiling plus one per-phone
 * allowance. Both actions must spend from the same counters, otherwise the
 * unthrottled one becomes a free membership oracle for guessing numbers.
 * Returns an error response to send back, or null to continue.
 */
function throttleByPhone_(action, phone) {
  if (bump_("g_lookup", GLOBAL_WINDOW_S) > GLOBAL_LOOKUP_LIMIT) {
    log_(action, phone, "throttled_global");
    return { ok: false, error: "throttled", retryAfter: GLOBAL_WINDOW_S };
  }
  if (bump_("lk_" + hash_(phoneKey(phone)), LOOKUP_WINDOW_S) > LOOKUP_LIMIT_PER_PHONE) {
    log_(action, phone, "throttled_phone");
    return { ok: false, error: "throttled", retryAfter: LOOKUP_WINDOW_S };
  }
  return null;
}

function handleLookup_(req) {
  var phone = String(req.phone || "");
  if (!phone) return { ok: true, group: [] };

  var blocked = throttleByPhone_("lookup", phone);
  if (blocked) return blocked;

  var t = readTable_();
  var members = findGroup(t.rows, t.headers, phone);
  if (!members.length) {
    log_("lookup", phone, "miss");
    return { ok: true, group: [] };
  }
  bumpLookupHit_();
  return Object.assign({ ok: true }, buildLookupResponse(t.rows, t.headers, members));
}

function handleSubmit_(req) {
  var phone = String(req.phone || "");

  // Throttle before the group is resolved, on the same budget as lookup.
  var blocked = throttleByPhone_("submit", phone);
  if (blocked) return blocked;

  var t = readTable_();
  var members = findGroup(t.rows, t.headers, phone);
  if (!members.length) {
    log_("submit", phone, "not_found");
    return { ok: false, error: "not_found" };
  }

  var check = validateResponses(members, req.responses);
  if (!check.ok) {
    // Deliberately the SAME error a missing group returns. Distinguishable
    // outcomes here would tell an attacker whether a guessed number is on the
    // list. The real reason is logged server-side for debugging.
    log_("submit", phone, "invalid: " + check.error);
    return { ok: false, error: "not_found" };
  }

  var sh = sheet_();
  var allergies = writeAllergies(req.notes);

  // Write single cells only. A range write would clobber the
  // "# confirmed" / "# declined" summary formulas in neighbouring columns.
  req.responses.forEach(function (r) {
    var row = sheetRow_(members[r.i]);
    sh.getRange(row, t.headers.rvsp + 1).setValue(writeAttending(r.attending));
    sh.getRange(row, t.headers.allergies + 1).setValue(allergies);
  });

  // Invalidate the guest-table cache immediately after writing. Without this,
  // a guest who submits and then looks up again within the TTL would see
  // their own stale pre-submit state for up to GUEST_TABLE_CACHE_TTL_S.
  try {
    CacheService.getScriptCache().remove(GUEST_TABLE_CACHE_KEY);
  } catch (e) {
    // Cache invalidation must never break a request that already succeeded.
  }

  log_("submit", phone, "wrote " + req.responses.length);
  return { ok: true, written: req.responses.length };
}

function handleAdminList_(req) {
  var expected = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSPHRASE");

  // Passphrase check first. The throttle counter only blocks wrong attempts, never
  // a correct one. This prevents anyone with the public URL from locking out the real
  // admins by posting ten wrong passphrases.
  if (expected && constantTimeEquals(String(req.passphrase || ""), expected)) {
    // Correct passphrase: grant access immediately, clear any prior failures.
    CacheService.getScriptCache().remove("admin_fail");
    // Bypass the guest-table cache: the admin is specifically checking
    // current RSVP state, and a stale-by-up-to-120s view would be actively
    // misleading right after a guest submits.
    var t = readTable_({ bypassCache: true });
    var h = t.headers;
    var guests = [];
    t.rows.forEach(function (row) {
      if (String(row[h.nombre] || "").trim() === "") return;
      guests.push({
        name: String(row[h.nombre] || "").trim(),
        side: String(row[h.side] || "").trim(),
        phone: String(row[h.phone] || "").trim(),
        groupId: String(row[h.groupId] || "").trim(),
        attending: readAttending(row[h.rvsp]),
        allergies: readAllergies(row[h.allergies]),
      });
    });
    log_("adminList", "", "ok " + guests.length);
    return { ok: true, guests: guests };
  }

  // Wrong or missing passphrase: bump the failure counter.
  var failCount = bump_("admin_fail", ADMIN_FAIL_WINDOW_S);
  if (failCount >= ADMIN_FAIL_LIMIT) {
    log_("adminList", "", "throttled");
    return { ok: false, error: "throttled", retryAfter: ADMIN_FAIL_WINDOW_S };
  }
  log_("adminList", "", "unauthorized");
  return { ok: false, error: "unauthorized" };
}
