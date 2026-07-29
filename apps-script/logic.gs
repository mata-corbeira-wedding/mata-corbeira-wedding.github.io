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
  return v.toLowerCase() === DEFAULT_ALLERGIES.toLowerCase() ? "" : v;
}

function writeAllergies(notes) {
  var v = String(notes == null ? "" : notes).trim();
  return v === "" ? DEFAULT_ALLERGIES : v;
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
  var notes = "";
  var group = memberIdx.map(function (i) {
    if (!notes) notes = readAllergies(rows[i][headers.allergies]);
    return {
      name: String(rows[i][headers.nombre] || "").trim(),
      attending: readAttending(rows[i][headers.rvsp]),
    };
  });
  return { group: group, notes: notes };
}

function validateResponses(memberIdx, responses) {
  if (!Array.isArray(responses) || responses.length === 0) {
    return { ok: false, error: "no_responses" };
  }
  for (var i = 0; i < responses.length; i++) {
    var r = responses[i];
    if (!r || typeof r !== "object") return { ok: false, error: "bad_response" };
    if (typeof r.i !== "number" || r.i < 0 || r.i >= memberIdx.length || r.i % 1 !== 0) {
      return { ok: false, error: "bad_index" };
    }
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
