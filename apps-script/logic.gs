/**
 * Pure logic for the wedding RSVP proxy.
 *
 * This file must contain NO Google Apps Script globals (SpreadsheetApp,
 * CacheService, PropertiesService, Utilities...). Everything here is unit-tested
 * in Node by tests/logic.test.js. Keep it that way — Code.gs is the only file
 * allowed to touch Google APIs.
 */

var REQUIRED_HEADERS = {
  nombre: "Nombre",
  side: "Bride or Groom",
  phone: "Phone #",
  groupId: "Group ID",
  rvsp: "RVSP",
  allergies: "Allergies",
};

var DEFAULT_ALLERGIES = "No allergies";
var MAX_ALLERGIES_LEN = 500;

// Sheets treats a cell whose text starts with any of these as a formula, so a
// guest-supplied note could otherwise run =IMPORTDATA(...) with the owner's
// authority and exfiltrate the whole guest list, or spill an array over the
// summary formulas in the neighbouring columns.
var FORMULA_PREFIXES = ["=", "+", "-", "@"];

function phoneKey(raw) {
  if (!raw) return "";
  return String(raw).replace(/\D/g, "");
}

function phoneTail(raw) {
  var k = phoneKey(raw);
  return k.length >= 9 ? k.slice(-9) : "";
}

function readAttending(cell) {
  var v = String(cell == null ? "" : cell).trim().toLowerCase();
  if (v === "yes" || v === "sí" || v === "si") return "yes";
  if (v === "no") return "no";
  return null;
}

function writeAttending(v) {
  return v === "yes" ? "Yes" : "No";
}

function readAllergies(cell) {
  var v = String(cell == null ? "" : cell).trim();
  // Undo the single leading apostrophe writeAllergies adds to neutralise a
  // formula prefix, so "-peanuts" reads back as "-peanuts", not "'-peanuts".
  if (v.charAt(0) === "'") v = v.slice(1);
  return v.toLowerCase() === DEFAULT_ALLERGIES.toLowerCase() ? "" : v;
}

function writeAllergies(notes) {
  var v = String(notes == null ? "" : notes).trim();
  if (v === "") return DEFAULT_ALLERGIES;
  if (v.length > MAX_ALLERGIES_LEN) v = v.slice(0, MAX_ALLERGIES_LEN);
  // A leading apostrophe makes Sheets store the rest verbatim as text.
  if (FORMULA_PREFIXES.indexOf(v.charAt(0)) !== -1) v = "'" + v;
  return v;
}

function resolveHeaders(headerRow) {
  var row = (headerRow || []).map(function (h) {
    return String(h == null ? "" : h).trim();
  });
  var out = {};
  Object.keys(REQUIRED_HEADERS).forEach(function (key) {
    var idx = row.indexOf(REQUIRED_HEADERS[key]);
    if (idx === -1) {
      throw new Error("Missing required column: " + REQUIRED_HEADERS[key]);
    }
    out[key] = idx;
  });
  return out;
}

function isBlankRow(row, headers) {
  return String(row[headers.nombre] == null ? "" : row[headers.nombre]).trim() === "";
}

function findGroup(rows, headers, rawPhone) {
  var key = phoneKey(rawPhone);
  if (!key) return [];
  var tail = phoneTail(rawPhone);

  var exact = [];
  var loose = [];
  for (var i = 0; i < rows.length; i++) {
    if (isBlankRow(rows[i], headers)) continue;
    var cell = rows[i][headers.phone];
    if (!phoneKey(cell)) continue;
    if (phoneKey(cell) === key) exact.push(i);
    else if (tail && phoneTail(cell) === tail) loose.push(i);
  }

  var hits = exact.length ? exact : loose;
  if (!hits.length) return [];

  // An ambiguous tail match spanning several families must never be resolved —
  // returning the wrong group would disclose strangers' names.
  var groupIds = {};
  hits.forEach(function (i) {
    groupIds[String(rows[i][headers.groupId] || "").trim()] = true;
  });
  var distinct = Object.keys(groupIds);
  if (distinct.length !== 1) return [];

  var groupId = distinct[0];
  if (!groupId) {
    // No Group ID means no group can be established. A single row is that
    // guest alone; several rows are unrelated people who merely share a
    // blank cell, and resolving them together would leak strangers' names.
    return hits.length === 1 ? hits : [];
  }

  var members = [];
  for (var j = 0; j < rows.length; j++) {
    if (isBlankRow(rows[j], headers)) continue;
    if (String(rows[j][headers.groupId] || "").trim() === groupId) members.push(j);
  }
  return members;
}

function buildLookupResponse(rows, headers, memberIdx) {
  // Every distinct note in the group, in first-seen order. The guest edits one
  // field and the result is written back to every row, so returning only the
  // first note would silently erase the others.
  //
  // Dedup on "; "-separated SEGMENTS, not on whole cell values. A partial
  // submit only writes the joined string to the rows it answered for, so the
  // group ends up holding a mix of joined and unjoined cells ("nuts; wheat"
  // next to "wheat"). Comparing whole values would treat those as distinct and
  // append "; wheat" again on every lookup, growing until MAX_ALLERGIES_LEN
  // truncates it away. Splitting first makes the join idempotent: re-joining an
  // already-joined value yields the same string, so repeats converge.
  var seen = {};
  var collected = [];
  var group = memberIdx.map(function (i) {
    readAllergies(rows[i][headers.allergies]).split("; ").forEach(function (part) {
      var segment = part.trim();
      if (!segment) return;
      if (Object.prototype.hasOwnProperty.call(seen, segment)) return;
      seen[segment] = true;
      collected.push(segment);
    });
    return {
      name: String(rows[i][headers.nombre] || "").trim(),
      attending: readAttending(rows[i][headers.rvsp]),
    };
  });
  return { group: group, notes: collected.join("; ") };
}

function validateResponses(memberIdx, responses) {
  if (!Array.isArray(responses) || responses.length === 0) {
    return { ok: false, error: "no_responses" };
  }
  // A group can never need more answers than it has members. Without this a
  // single request could issue tens of thousands of setValue calls and burn
  // the daily quota.
  if (responses.length > memberIdx.length) {
    return { ok: false, error: "too_many" };
  }
  var used = {};
  for (var i = 0; i < responses.length; i++) {
    var r = responses[i];
    if (!r || typeof r !== "object") return { ok: false, error: "bad_response" };
    if (typeof r.i !== "number" || r.i < 0 || r.i >= memberIdx.length || r.i % 1 !== 0) {
      return { ok: false, error: "bad_index" };
    }
    if (Object.prototype.hasOwnProperty.call(used, String(r.i))) {
      return { ok: false, error: "duplicate_index" };
    }
    used[String(r.i)] = true;
    if (r.attending !== "yes" && r.attending !== "no") {
      return { ok: false, error: "bad_attending" };
    }
  }
  return { ok: true };
}

function constantTimeEquals(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
