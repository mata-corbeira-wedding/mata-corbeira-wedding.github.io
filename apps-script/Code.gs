/**
 * HTTP adapter for the wedding RSVP proxy.
 *
 * All decision logic lives in logic.gs and is unit-tested in Node. This file is
 * the only place allowed to touch Google APIs. Keep it thin.
 */

var SHEET_NAME = "Guest List";   // adjust if the tab is named differently
var LOG_SHEET_NAME = "_log";
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

/** Returns {headers, rows, headerRowIndex}. rows excludes the header row. */
function readTable_() {
  var values = sheet_().getDataRange().getValues();
  if (!values.length) throw new Error("Sheet is empty");
  var headers = resolveHeaders(values[0]);
  return { headers: headers, rows: values.slice(1) };
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
  log_("lookup", phone, members.length ? "hit" : "miss");
  if (!members.length) return { ok: true, group: [] };
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
    var t = readTable_();
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
