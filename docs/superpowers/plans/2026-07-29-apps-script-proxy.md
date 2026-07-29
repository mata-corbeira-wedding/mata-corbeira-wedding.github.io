# Apps Script Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the browser's direct fetch of the published Google Sheets CSV with a Google Apps Script web app that returns only the caller's own group, so the full guest list stops being publicly downloadable.

**Architecture:** A single Apps Script web app exposes one `doPost` with three actions (`lookup`, `submit`, `adminList`). All decision logic lives in a pure-JavaScript file with no Google globals so it can be unit-tested in Node; a thin adapter file handles Sheets I/O, caching, and HTTP. The browser talks to it through one shared `api.js` global, used by both `script.js` and `admin.js`. The Google Form and the published CSV are retired.

**Tech Stack:** Plain ES6+ browser JS (no bundler, no imports — scripts load via `<script>` tags), Google Apps Script (`.gs`), Node's built-in test runner (`node --test`, no new dependencies), Playwright (already a devDependency) for browser-level tests.

**Spec:** `docs/superpowers/specs/2026-07-29-apps-script-proxy-design.md`

## Global Constraints

- **No build system, no bundler, no framework.** Scripts are loaded via `<script>` tags and share globals. Do not add `import`/`export` to any browser file.
- **No new runtime dependencies.** Tests may use only `node:test`/`node:assert` (built in) and the existing `@playwright/test`.
- **All visible UI text comes from the `translations` map in `script.js`.** Never hardcode a user-facing string in `index.html`. (`admin.html` is English-only and is not translated — that is pre-existing and stays.)
- **Never commit the passphrase, and never write it into any file in this repo.** It lives only in Apps Script Script Properties, set by the user.
- **Requests are always `POST`** with `Content-Type: text/plain`. Never `GET`. Phone numbers and passphrases must never appear in a URL, query string, or `console.log`.
- **`lookup` and `submit` responses must never contain a phone number, a Group ID, or a sheet row index.**
- The Apps Script must resolve sheet columns **by header name** read from row 1, and write only individual `RVSP` / `Allergies` cells — never a range spanning other columns, because `# confirmed` / `# declined` hold summary formulas.
- Design system values are fixed: `--bg: #f4efe5`, `--text: #3d3226`, `--accent: #7f8d6a`.
- Sheet header names, verbatim: `Nombre`, `Bride or Groom`, `Phone #`, `Group ID`, `RVSP`, `Allergies`.

## File Structure

**Create:**
- `apps-script/logic.gs` — pure functions, zero Google globals. All matching, mapping, and validation logic.
- `apps-script/Code.gs` — `doPost` adapter: Sheets I/O, throttling, logging, JSON responses.
- `apps-script/README.md` — click-by-click deployment instructions for the site owner.
- `api.js` — browser-side client. Defines `window.WeddingApi`. The single place holding `API_URL`.
- `tests/logic.test.js` — Node tests for `logic.gs`.
- `tests/rsvp.spec.js` — Playwright: guest RSVP flow against a stubbed endpoint.
- `tests/admin.spec.js` — Playwright: admin login + dashboard against a stubbed endpoint.

**Modify:**
- `script.js` — delete `GUESTS_CSV_URL`, `GOOGLE_FORM_ACTION`, `FORM_ENTRY_*`, `FORM_FBZ`, `parseCsv`, `parseCsvLine`, `fetchCsv`, `ensureGuestList`, and the `guestList` cache. Rewrite the search and submit handlers to call `WeddingApi`. Add missing `rsvp_error` translations.
- `admin.js` — full rewrite. Delete `ADMIN_PASSWORD`, `GUESTS_CSV_URL`, and the `wedding_admin_authenticated` flag.
- `admin.html` — relabel "Password" → "Passphrase", delete the stale CSV instructions at line 49.
- `index.html` — add `<script src="api.js">` before `script.js`.
- `package.json` — add `test` scripts.
- `CLAUDE.md` — its Data Flow, Admin Access, and Google Form sections all become wrong.

**Delete:** nothing. `data/country-codes.json` is already dead code and stays out of scope.

**Why `logic.gs` is split from `Code.gs`:** Apps Script cannot run in Node — `SpreadsheetApp`, `CacheService`, and `PropertiesService` do not exist there. Keeping every real decision in a file with no Google globals means it is genuinely unit-testable, and the untestable part shrinks to thin I/O that gets verified by hand once. Apps Script projects share one global scope across files, so `Code.gs` calls `logic.gs` functions directly with no imports.

---

### Task 1: Pure logic module

**Files:**
- Create: `apps-script/logic.gs`
- Create: `tests/logic.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces, all as bare globals (no `module.exports` — Apps Script would choke):
  - `phoneKey(raw) -> string` — digits only, `+` and separators stripped.
  - `phoneTail(raw) -> string` — last 9 digits of `phoneKey`, or `""` if fewer than 9.
  - `readAttending(cell) -> "yes" | "no" | null`
  - `writeAttending(v) -> "Yes" | "No"`
  - `readAllergies(cell) -> string` — `"No allergies"` becomes `""`.
  - `writeAllergies(notes) -> string` — `""` becomes `"No allergies"`.
  - `resolveHeaders(headerRow) -> {nombre, side, phone, groupId, rvsp, allergies}` of 0-based column indexes; throws `Error` naming the missing header.
  - `findGroup(rows, headers, rawPhone) -> number[]` — 0-based indexes into `rows` for the whole matching group, `[]` if no match or ambiguous.
  - `buildLookupResponse(rows, headers, memberIdx) -> {group: [{name, attending}], notes}`
  - `validateResponses(memberIdx, responses) -> {ok: true} | {ok: false, error: string}`
  - `constantTimeEquals(a, b) -> boolean`

**Matching rule to implement:** exact `phoneKey` match first. If none, fall back to `phoneTail`. If the tail matches rows belonging to **more than one distinct Group ID**, return `[]` — an ambiguous match must never leak the wrong family's names. Rows with an empty `Nombre` are skipped everywhere (the sheet has one blank row).

- [ ] **Step 1: Write the failing tests**

Create `tests/logic.test.js`. It loads the `.gs` file into a sandbox with `vm`, so the `.gs` stays free of Node-only syntax and can be pasted straight into the Apps Script editor.

```js
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "..", "apps-script", "logic.gs"), "utf8"),
  sandbox
);
const {
  phoneKey, phoneTail, readAttending, writeAttending,
  readAllergies, writeAllergies, resolveHeaders, findGroup,
  buildLookupResponse, validateResponses, constantTimeEquals,
} = sandbox;

const HEADER = ["Column 1", "Nombre", "Bride or Groom", "Phone #", "Group ID", "RVSP", "Allergies"];
const H = () => resolveHeaders(HEADER);
// [Column 1, Nombre, Side, Phone, GroupID, RVSP, Allergies]
const ROWS = [
  ["", "Ana García",  "Bride", "+34 612 345 678", "G1", "Yes",         "seafood"],
  ["", "Luis García", "Bride", "612345678",       "G1", "No Response", "No allergies"],
  ["", "Sam Smith",   "Groom", "+1 555 000 1111", "G2", "No",          "No allergies"],
  ["", "",            "",      "",                "",   "",            ""],
];

test("phoneKey strips everything but digits", () => {
  assert.equal(phoneKey("+34 612-345-678"), "34612345678");
  assert.equal(phoneKey(""), "");
  assert.equal(phoneKey(null), "");
});

test("phoneTail takes the last 9 digits", () => {
  assert.equal(phoneTail("+34 612 345 678"), "612345678");
  assert.equal(phoneTail("612345678"), "612345678");
  assert.equal(phoneTail("12345"), "");
});

test("readAttending maps sheet values to the API vocabulary", () => {
  assert.equal(readAttending("Yes"), "yes");
  assert.equal(readAttending("sí"), "yes");
  assert.equal(readAttending("SI"), "yes");
  assert.equal(readAttending("no"), "no");
  assert.equal(readAttending("No Response"), null);
  assert.equal(readAttending(""), null);
});

test("writeAttending maps back to sheet values", () => {
  assert.equal(writeAttending("yes"), "Yes");
  assert.equal(writeAttending("no"), "No");
});

test("allergies round-trip through the default string", () => {
  assert.equal(readAllergies("No allergies"), "");
  assert.equal(readAllergies("seafood"), "seafood");
  assert.equal(writeAllergies(""), "No allergies");
  assert.equal(writeAllergies("seafood"), "seafood");
});

test("resolveHeaders finds columns by name and throws on a missing one", () => {
  const h = H();
  assert.equal(h.nombre, 1);
  assert.equal(h.phone, 3);
  assert.equal(h.rvsp, 5);
  // Throws on the first missing header in REQUIRED_HEADERS order.
  assert.throws(() => resolveHeaders(["Nombre", "Phone #"]), /Bride or Groom/);
});

test("findGroup matches an exact phone and returns the whole group", () => {
  assert.deepEqual(findGroup(ROWS, H(), "+34612345678"), [0, 1]);
});

test("findGroup falls back to the 9-digit tail when nothing matches exactly", () => {
  // "1612345678" matches no row exactly; the tail "612345678" matches both G1
  // rows, so the tail path is what resolves this.
  assert.deepEqual(findGroup(ROWS, H(), "+1 612 345 678"), [0, 1]);
});

test("findGroup returns empty for an unknown number", () => {
  assert.deepEqual(findGroup(ROWS, H(), "+34999999999"), []);
});

test("findGroup refuses an ambiguous tail match across groups", () => {
  const rows = [
    ["", "A", "Bride", "+34612345678", "G1", "No Response", ""],
    ["", "B", "Groom", "+1612345678",  "G2", "No Response", ""],
  ];
  assert.deepEqual(findGroup(rows, H(), "612345678"), []);
});

test("findGroup ignores the blank trailing row", () => {
  // ROWS[3] has no name and no phone. It must never appear in a result, and an
  // empty query must not match it.
  assert.ok(!findGroup(ROWS, H(), "+34612345678").includes(3));
  assert.deepEqual(findGroup(ROWS, H(), ""), []);
});

test("buildLookupResponse exposes names and status but never phone or group id", () => {
  const out = buildLookupResponse(ROWS, H(), [0, 1]);
  assert.deepEqual(out.group, [
    { name: "Ana García", attending: "yes" },
    { name: "Luis García", attending: null },
  ]);
  assert.equal(out.notes, "seafood");
  const blob = JSON.stringify(out);
  assert.ok(!blob.includes("612345678"), "phone leaked");
  assert.ok(!blob.includes("G1"), "group id leaked");
});

test("buildLookupResponse omits the default allergies string", () => {
  assert.equal(buildLookupResponse(ROWS, H(), [2]).notes, "");
});

test("validateResponses rejects out-of-range and malformed indexes", () => {
  assert.deepEqual(validateResponses([0, 1], [{ i: 0, attending: "yes" }]), { ok: true });
  assert.equal(validateResponses([0, 1], [{ i: 2, attending: "yes" }]).ok, false);
  assert.equal(validateResponses([0, 1], [{ i: -1, attending: "yes" }]).ok, false);
  assert.equal(validateResponses([0, 1], [{ i: 0, attending: "maybe" }]).ok, false);
  assert.equal(validateResponses([0, 1], []).ok, false);
  assert.equal(validateResponses([0, 1], "nope").ok, false);
});

test("constantTimeEquals is correct and length-safe", () => {
  assert.equal(constantTimeEquals("abc", "abc"), true);
  assert.equal(constantTimeEquals("abc", "abd"), false);
  assert.equal(constantTimeEquals("abc", "abcd"), false);
  assert.equal(constantTimeEquals("", ""), true);
  assert.equal(constantTimeEquals("abc", null), false);
});
```

- [ ] **Step 2: Add the test scripts to `package.json`**

Add a `scripts` block (it is currently `{}`):

```json
  "scripts": {
    "test": "node --test tests/logic.test.js",
    "test:e2e": "playwright test"
  },
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `ENOENT: no such file or directory ... apps-script/logic.gs`

- [ ] **Step 4: Write `apps-script/logic.gs`**

```js
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
  if (!groupId) return hits;

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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 15 tests.

- [ ] **Step 6: Commit**

```bash
git add apps-script/logic.gs tests/logic.test.js package.json
git commit -m "feat: pure matching and mapping logic for the RSVP proxy"
```

---

### Task 2: Apps Script adapter and deployment guide

**Files:**
- Create: `apps-script/Code.gs`
- Create: `apps-script/README.md`

**Interfaces:**
- Consumes: every global from `apps-script/logic.gs` (Task 1). Apps Script shares one global scope across files in a project, so no import is needed.
- Produces: an HTTP contract, consumed by `api.js` in Task 3.
  - `POST` body is `text/plain` containing JSON: `{action, ...}`.
  - `{"action":"lookup","phone":string}` → `{ok:true, group:[{name,attending}], notes:string}`
  - `{"action":"submit","phone":string,"responses":[{i:number,attending:"yes"|"no"}],"notes":string}` → `{ok:true, written:number}`
  - `{"action":"adminList","passphrase":string}` → `{ok:true, guests:[{name,side,phone,groupId,attending,allergies}]}`
  - Errors: `{ok:false, error:"not_found"|"unauthorized"|"throttled"|"bad_request"|"server_error", retryAfter?:number}`

This task has **no automated test** — Apps Script cannot run outside Google. Its logic is already covered by Task 1; what remains is I/O, verified by hand in Step 4 below. Do not attempt to mock `SpreadsheetApp`.

- [ ] **Step 1: Write `apps-script/Code.gs`**

```js
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

function bump_(key, ttl) {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), ttl);
  return n;
}

function peek_(key) {
  return Number(CacheService.getScriptCache().get(key) || 0);
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

  try {
    switch (req.action) {
      case "lookup":    return json_(handleLookup_(req));
      case "submit":    return json_(handleSubmit_(req));
      case "adminList": return json_(handleAdminList_(req));
      default:          return json_({ ok: false, error: "bad_request" });
    }
  } catch (err) {
    log_(String(req.action || "?"), "", "error: " + err.message);
    return json_({ ok: false, error: "server_error" });
  }
}

/** GET exists only so a browser visit shows something harmless. It returns no data. */
function doGet() {
  return json_({ ok: false, error: "bad_request" });
}

function handleLookup_(req) {
  var phone = String(req.phone || "");
  if (!phone) return { ok: true, group: [] };

  if (bump_("g_lookup", GLOBAL_WINDOW_S) > GLOBAL_LOOKUP_LIMIT) {
    log_("lookup", phone, "throttled_global");
    return { ok: false, error: "throttled", retryAfter: GLOBAL_WINDOW_S };
  }
  if (bump_("lk_" + hash_(phoneKey(phone)), LOOKUP_WINDOW_S) > LOOKUP_LIMIT_PER_PHONE) {
    log_("lookup", phone, "throttled_phone");
    return { ok: false, error: "throttled", retryAfter: LOOKUP_WINDOW_S };
  }

  var t = readTable_();
  var members = findGroup(t.rows, t.headers, phone);
  log_("lookup", phone, members.length ? "hit" : "miss");
  if (!members.length) return { ok: true, group: [] };
  return Object.assign({ ok: true }, buildLookupResponse(t.rows, t.headers, members));
}

function handleSubmit_(req) {
  var phone = String(req.phone || "");
  var t = readTable_();
  var members = findGroup(t.rows, t.headers, phone);
  if (!members.length) {
    log_("submit", phone, "not_found");
    return { ok: false, error: "not_found" };
  }

  var check = validateResponses(members, req.responses);
  if (!check.ok) {
    log_("submit", phone, "invalid: " + check.error);
    return { ok: false, error: "bad_request" };
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
  if (peek_("admin_fail") >= ADMIN_FAIL_LIMIT) {
    log_("adminList", "", "throttled");
    return { ok: false, error: "throttled", retryAfter: ADMIN_FAIL_WINDOW_S };
  }

  var expected = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSPHRASE");
  if (!expected || !constantTimeEquals(String(req.passphrase || ""), expected)) {
    bump_("admin_fail", ADMIN_FAIL_WINDOW_S);
    log_("adminList", "", "unauthorized");
    return { ok: false, error: "unauthorized" };
  }
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
```

- [ ] **Step 2: Write `apps-script/README.md`**

```markdown
# Apps Script deployment

These steps require the Google account that owns the guest spreadsheet.
Nothing here can be automated from the repository.

## 1. Create the project

1. Open the guest Google Sheet.
2. **Extensions → Apps Script**. A new project opens.
3. Delete the placeholder `Code.gs` contents.
4. Paste the contents of `apps-script/Code.gs` into the file named `Code.gs`.
5. Click **+ → Script**, name it `logic`, and paste in `apps-script/logic.gs`.
6. Save (⌘S / Ctrl+S).

If the guest tab is not named exactly `Guest List`, change `SHEET_NAME` at the
top of `Code.gs` to match.

## 2. Set the passphrase

1. **Project Settings** (gear icon, left sidebar).
2. Scroll to **Script Properties → Add script property**.
3. Property: `ADMIN_PASSPHRASE`. Value: a 3–4 word phrase of your choosing.
4. **Save script properties.**

Share this phrase with the other admin in person or in a message you delete.
Do not put it in the repository, in a document, or in a chat with an assistant.
To change it later, edit this property — nothing else needs to change.

## 3. Deploy

1. **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. **Execute as:** Me. **Who has access:** Anyone.
4. **Deploy**, then authorise when prompted. Google will warn that the app is
   unverified because you wrote it yourself — choose **Advanced → Go to
   (project name)** to continue.
5. Copy the **Web app URL**. It ends in `/exec`.

"Who has access: Anyone" is required: wedding guests are not signed in to
Google. The URL is not a secret — the script controls what it returns, and it
never returns the full list without the passphrase.

## 4. Hand the URL back

Paste the `/exec` URL into `API_URL` at the top of `api.js` in the repository.

## 5. After the site is live and verified

1. Sheet → **File → Share → Publish to web → Stop publishing**.
2. Google Form → **Responses** → turn off **Accepting responses**.

Do these two steps last. The old code has no data source other than the
published CSV, so un-publishing early takes the live site down.

## Re-deploying after a code change

**Deploy → Manage deployments →** pencil icon **→ Version: New version → Deploy.**
Creating a *new deployment* instead would issue a different URL and the site
would keep calling the old one.
```

- [ ] **Step 3: Commit**

```bash
git add apps-script/Code.gs apps-script/README.md
git commit -m "feat: Apps Script web app adapter and deployment guide"
```

- [ ] **Step 4: Hand off for deployment (blocks Task 6)**

Tell the user: the Apps Script is ready to deploy, `apps-script/README.md` has the steps, and you need the `/exec` URL back before the final wiring in Task 6. Tasks 3–5 do not need it — they run against a stubbed endpoint.

---

### Task 3: Browser API client

**Files:**
- Create: `api.js`
- Modify: `index.html` (add the `<script>` tag)

**Interfaces:**
- Consumes: the HTTP contract from Task 2.
- Produces: `window.WeddingApi`, used by Tasks 4 and 5.
  - `WeddingApi.lookup(phone) -> Promise<{ok, group, notes} | {ok:false, error}>`
  - `WeddingApi.submit(phone, responses, notes) -> Promise<{ok, written} | {ok:false, error}>`
  - `WeddingApi.adminList(passphrase) -> Promise<{ok, guests} | {ok:false, error}>`
  - Network failure resolves to `{ok:false, error:"network"}` — it never rejects, so callers need no `try`/`catch`.

- [ ] **Step 1: Write `api.js`**

```js
/**
 * Client for the wedding RSVP Apps Script proxy.
 *
 * Loaded via a <script> tag before script.js and admin.js; exposes one global.
 * There is no bundler in this project — do not add import/export.
 */
(function () {
  // Apps Script web app /exec URL. Set this after deploying; see apps-script/README.md.
  // This is not a secret: the script decides what it returns, and it never
  // returns the full guest list without the admin passphrase.
  var API_URL = "https://script.google.com/macros/s/REPLACE_ME/exec";

  async function call(payload) {
    if (API_URL.indexOf("REPLACE_ME") !== -1) {
      return { ok: false, error: "not_configured" };
    }
    try {
      // text/plain keeps this a CORS "simple request" so no preflight is sent.
      // Apps Script does not answer OPTIONS, so application/json would fail.
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow",
      });
      if (!res.ok) return { ok: false, error: "network" };
      return await res.json();
    } catch (_err) {
      return { ok: false, error: "network" };
    }
  }

  window.WeddingApi = {
    lookup: function (phone) {
      return call({ action: "lookup", phone: phone });
    },
    submit: function (phone, responses, notes) {
      return call({ action: "submit", phone: phone, responses: responses, notes: notes });
    },
    adminList: function (passphrase) {
      return call({ action: "adminList", passphrase: passphrase });
    },
  };
})();
```

- [ ] **Step 2: Load it in `index.html`**

Find the `<script src="script.js">` tag near the end of `index.html` and add `api.js` immediately before it:

```html
    <script src="api.js"></script>
    <script src="script.js"></script>
```

- [ ] **Step 3: Verify it loads without error**

Start the preview (`.claude/launch.json` defines `wedding-site` on port 8080), open `index.html`, and check the console.
Expected: no errors, and `typeof WeddingApi.lookup === "function"` in the console.

- [ ] **Step 4: Commit**

```bash
git add api.js index.html
git commit -m "feat: browser client for the RSVP proxy endpoint"
```

---

### Task 4: Rewrite the guest RSVP flow

**Files:**
- Modify: `script.js:520-529` (delete constants), `script.js:531-591` (delete CSV helpers), `script.js:652-701` (search), `script.js:704-754` (render), `script.js:765-814` (submit), and the two `translations` blocks near lines 170 and 389.
- Create: `tests/rsvp.spec.js`

**Interfaces:**
- Consumes: `window.WeddingApi` (Task 3).
- Produces: nothing consumed by later tasks.

**Behaviour changes:** the whole-list download and the `guestList` cache are gone; the search handler renders whatever `lookup` returns. Submission goes to `submit` and reports the real result, so `mode:"no-cors"` and its silent failure disappear. `renderGroupList` receives `[{name, attending}]` rather than raw sheet rows.

- [ ] **Step 1: Write the failing test**

Create `tests/rsvp.spec.js`. It stubs the endpoint with `page.route`, so it needs no deployment.

```js
import { test, expect } from "@playwright/test";

const API = "**/macros/s/**";

async function stub(page, handler) {
  await page.route(API, async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(await handler(body)),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/index.html");
});

test("a matched phone shows the group and no phone numbers", async ({ page }) => {
  await stub(page, () => ({
    ok: true,
    group: [
      { name: "Ana García", attending: "yes" },
      { name: "Luis García", attending: null },
    ],
    notes: "seafood",
  }));

  await page.click(".hero-rsvp-button");
  await page.selectOption("#rsvp-country", "+34");
  await page.fill("#rsvp-phone", "612345678");
  await page.click("#rsvp-search-btn");

  await expect(page.locator("#rsvp-step-2")).toBeVisible();
  await expect(page.locator(".rsvp-guest-row")).toHaveCount(2);
  await expect(page.locator("#rsvp-group-list")).toContainText("Ana García");
  await expect(page.locator("#rsvp-group-list")).not.toContainText("612345678");
  await expect(page.locator("#rsvp-notes")).toHaveValue("seafood");
});

test("an unmatched phone shows the not-found message and stays on step 1", async ({ page }) => {
  await stub(page, () => ({ ok: true, group: [] }));

  await page.click(".hero-rsvp-button");
  await page.fill("#rsvp-phone", "999999999");
  await page.click("#rsvp-search-btn");

  await expect(page.locator("#rsvp-lookup-message")).toContainText("No guest found");
  await expect(page.locator("#rsvp-step-1")).toBeVisible();
});

test("a successful submit sends indexes, not names, and reports success", async ({ page }) => {
  let submitted = null;
  await stub(page, (body) => {
    if (body.action === "lookup") {
      return { ok: true, group: [{ name: "Ana García", attending: null }], notes: "" };
    }
    submitted = body;
    return { ok: true, written: 1 };
  });

  await page.click(".hero-rsvp-button");
  await page.fill("#rsvp-phone", "612345678");
  await page.click("#rsvp-search-btn");
  // attending is null, so the row checkbox starts unchecked and the submit
  // handler would skip it. Tick it, then choose Yes.
  await page.check("#rsvp-guest-0");
  await page.check('input[name="rsvp-attend-0"][value="yes"]');
  await page.click("#rsvp-submit-btn");

  await expect(page.locator("#rsvp-submit-message")).toContainText("recorded");
  expect(submitted.action).toBe("submit");
  expect(submitted.responses).toEqual([{ i: 0, attending: "yes" }]);
  expect(JSON.stringify(submitted)).not.toContain("Ana García");
});

test("a failed submit reports the error and re-enables the button", async ({ page }) => {
  await stub(page, (body) =>
    body.action === "lookup"
      ? { ok: true, group: [{ name: "Ana García", attending: null }], notes: "" }
      : { ok: false, error: "server_error" }
  );

  await page.click(".hero-rsvp-button");
  await page.fill("#rsvp-phone", "612345678");
  await page.click("#rsvp-search-btn");
  await page.check("#rsvp-guest-0");
  await page.check('input[name="rsvp-attend-0"][value="yes"]');
  await page.click("#rsvp-submit-btn");

  await expect(page.locator("#rsvp-submit-message")).toContainText("went wrong");
  await expect(page.locator("#rsvp-submit-btn")).toBeEnabled();
});

test("a guest name containing markup is not rendered as HTML", async ({ page }) => {
  await stub(page, () => ({
    ok: true,
    group: [{ name: "<img src=x onerror=alert(1)>Ana", attending: null }],
    notes: "",
  }));

  await page.click(".hero-rsvp-button");
  await page.fill("#rsvp-phone", "612345678");
  await page.click("#rsvp-search-btn");

  await expect(page.locator("#rsvp-group-list img")).toHaveCount(0);
  await expect(page.locator("#rsvp-group-list")).toContainText("<img");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Start the `wedding-site` preview first (port 8080), then run: `npx playwright test tests/rsvp.spec.js --project=chromium`
Expected: FAIL — the page still fetches the CSV, so the stubbed route is never hit and step 2 never appears.

- [ ] **Step 3: Delete the dead constants and CSV helpers**

In `script.js`, delete lines 520–529 (`GUESTS_CSV_URL` through `FORM_FBZ`) and lines 537–591 (`parseCsvLine`, `parseCsv`, `fetchCsv`). Keep `normalizePhone` — the search handler still uses it. Delete the `guestList` cache and `ensureGuestList` at lines 652–657.

- [ ] **Step 4: Add the missing `rsvp_error` translations**

`script.js:810` reads `translations[currentLang].rsvp_error` but neither language defines it, so Spanish users see an English fallback. Add to the English block (near line 175):

```js
      rsvp_error: "Something went wrong. Please try again.",
```

And to the Spanish block (near line 394):

```js
      rsvp_error: "Algo salió mal. Por favor intenta de nuevo.",
```

- [ ] **Step 5: Rewrite the search handler**

Replace the body of the `searchBtn` click listener (was lines 660–701) with:

```js
  if (searchBtn) {
    searchBtn.addEventListener("click", async () => {
      if (!countrySelect || !phoneInput) return;
      const code  = countrySelect.value || "";
      const local = phoneInput.value.trim();
      if (!local) {
        if (lookupMsgEl) lookupMsgEl.textContent = translations[currentLang].rsvp_not_found;
        return;
      }
      currentPhone = normalizePhone(code + local);

      if (lookupMsgEl) lookupMsgEl.textContent = translations[currentLang].rsvp_loading;
      searchBtn.disabled = true;

      const res = await WeddingApi.lookup(currentPhone);

      searchBtn.disabled = false;

      if (!res.ok || !res.group || res.group.length === 0) {
        if (lookupMsgEl) lookupMsgEl.textContent = translations[currentLang].rsvp_not_found;
        return;
      }

      if (lookupMsgEl) lookupMsgEl.textContent = "";

      renderGroupList(res.group, res.notes || "");
      if (step1El) step1El.hidden = true;
      if (step2El) step2El.hidden = false;
      if (submitBtn) submitBtn.disabled = false;
      if (submitMsgEl) submitMsgEl.textContent = "";
    });
  }
```

Declare the phone alongside the other RSVP state, where `let guestList = []` used to be:

```js
  // Phone used for the current lookup; replayed on submit so the server can
  // re-resolve the group. The browser never learns sheet row numbers.
  let currentPhone = "";
```

- [ ] **Step 6: Rewrite `renderGroupList` to take API shapes and avoid `innerHTML`**

Replace the whole function (was lines 704–754):

```js
  // Renders [{name, attending}] from the API. Builds nodes rather than
  // interpolating into innerHTML so sheet text can never become markup.
  function renderGroupList(group, notes) {
    if (!groupListEl) return;
    groupListEl.innerHTML = "";
    const lang = currentLang;

    group.forEach((g, i) => {
      const isYes = g.attending === "yes";
      const isNo  = g.attending === "no";
      const hasResponse = isYes || isNo;

      const row = document.createElement("div");
      row.className = "rsvp-guest-row";

      const nameLabel = document.createElement("label");
      nameLabel.className = "rsvp-guest-name";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "rsvp-guest-check";
      check.id = `rsvp-guest-${i}`;
      check.checked = hasResponse;
      const nameSpan = document.createElement("span");
      nameSpan.textContent = g.name || "";
      nameLabel.append(check, nameSpan);

      const attendDiv = document.createElement("div");
      attendDiv.className = "rsvp-guest-attend";
      [
        ["yes", isYes, translations[lang].rsvp_attend_yes],
        ["no",  isNo,  translations[lang].rsvp_attend_no],
      ].forEach(([value, checked, label]) => {
        const wrap = document.createElement("label");
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `rsvp-attend-${i}`;
        radio.value = value;
        radio.checked = checked;
        const span = document.createElement("span");
        span.textContent = label;
        span.setAttribute(value === "yes" ? "data-attend-yes" : "data-attend-no", "");
        wrap.append(radio, span);
        attendDiv.appendChild(wrap);
      });

      row.append(nameLabel, attendDiv);
      groupListEl.appendChild(row);
    });

    if (notesEl) notesEl.value = notes || "";
  }
```

- [ ] **Step 7: Rewrite the submit handler**

Replace the body of the `submitBtn` click listener (was lines 766–813):

```js
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      if (!groupListEl) return;
      const notes = notesEl ? notesEl.value.trim() : "";
      const rows  = groupListEl.querySelectorAll(".rsvp-guest-row");
      const responses = [];

      rows.forEach((row, i) => {
        const checkbox = row.querySelector(`#rsvp-guest-${i}`);
        if (!checkbox || !checkbox.checked) return;
        const attendRadio = row.querySelector(`input[name="rsvp-attend-${i}"]:checked`);
        responses.push({ i, attending: attendRadio && attendRadio.value === "no" ? "no" : "yes" });
      });

      if (responses.length === 0) return;

      if (submitMsgEl) submitMsgEl.textContent = translations[currentLang].rsvp_submitting;
      submitBtn.disabled = true;

      const res = await WeddingApi.submit(currentPhone, responses, notes);

      if (!res.ok) {
        if (submitMsgEl) submitMsgEl.textContent = translations[currentLang].rsvp_error;
        submitBtn.disabled = false;
        return;
      }

      if (submitMsgEl) submitMsgEl.textContent = translations[currentLang].rsvp_success;
      // Hide form content — only success message + back button remain
      if (groupIntroEl) groupIntroEl.style.display = "none";
      if (groupListEl) groupListEl.style.display = "none";
      if (notesEl) notesEl.closest(".rsvp-field").style.display = "none";
      if (submitBtn) submitBtn.style.display = "none";
    });
  }
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx playwright test tests/rsvp.spec.js --project=chromium`
Expected: PASS, 5 tests.

- [ ] **Step 9: Confirm no CSV or Form references remain in `script.js`**

Run: `grep -n "CSV\|formResponse\|no-cors\|entry\.\|fbzx" script.js`
Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add script.js tests/rsvp.spec.js
git commit -m "feat: guest RSVP flow uses the proxy instead of the published CSV

Removes the whole-guest-list download from the browser and replaces the
no-cors Google Form post, which could report success when nothing was
written. Also adds the rsvp_error translations, which were referenced but
never defined, so Spanish users saw an English error."
```

---

### Task 5: Rewrite the admin dashboard

**Files:**
- Modify: `admin.js` (full rewrite), `admin.html:27,31,49-51,97`
- Create: `tests/admin.spec.js`

**Interfaces:**
- Consumes: `window.WeddingApi.adminList` (Task 3).
- Produces: nothing consumed by later tasks.

**Behaviour changes:** the client-side password comparison and the `wedding_admin_authenticated` localStorage flag are both gone — that flag alone unlocked the dashboard for anyone who set it in devtools. The passphrase is held in `sessionStorage`, and `throttled` gets its own message so a locked-out admin does not think they have forgotten the phrase.

- [ ] **Step 1: Write the failing test**

Create `tests/admin.spec.js`:

```js
import { test, expect } from "@playwright/test";

const API = "**/macros/s/**";

const GUESTS = [
  { name: "Ana García",  side: "Bride", phone: "+34612345678", groupId: "G1", attending: "yes",  allergies: "seafood" },
  { name: "Luis García", side: "Bride", phone: "+34612345679", groupId: "G1", attending: "no",   allergies: "" },
  { name: "Sam Smith",   side: "Groom", phone: "",             groupId: "G2", attending: null,   allergies: "" },
];

async function stub(page, handler) {
  await page.route(API, async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(await handler(body)),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/admin.html");
});

test("the dashboard is hidden until the server returns data", async ({ page }) => {
  await expect(page.locator("#admin-dashboard-section")).toBeHidden();
  await expect(page.locator("#admin-login-section")).toBeVisible();
});

test("the old localStorage flag no longer unlocks the dashboard", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("wedding_admin_authenticated", "true"));
  await page.reload();
  await expect(page.locator("#admin-dashboard-section")).toBeHidden();
});

test("a wrong passphrase shows an error and no data", async ({ page }) => {
  await stub(page, () => ({ ok: false, error: "unauthorized" }));

  await page.fill("#admin-password", "wrong");
  await page.click('#admin-login-form button[type="submit"]');

  await expect(page.locator("#admin-login-error")).toContainText("Incorrect");
  await expect(page.locator("#admin-dashboard-section")).toBeHidden();
  await expect(page.locator("#admin-guests-table tbody tr")).toHaveCount(0);
});

test("a throttled response is distinguished from a wrong passphrase", async ({ page }) => {
  await stub(page, () => ({ ok: false, error: "throttled", retryAfter: 900 }));

  await page.fill("#admin-password", "whatever");
  await page.click('#admin-login-form button[type="submit"]');

  await expect(page.locator("#admin-login-error")).toContainText("Too many attempts");
  await expect(page.locator("#admin-login-error")).toContainText("15");
});

test("a correct passphrase renders the summary and the responded table", async ({ page }) => {
  await stub(page, () => ({ ok: true, guests: GUESTS }));

  await page.fill("#admin-password", "right");
  await page.click('#admin-login-form button[type="submit"]');

  await expect(page.locator("#admin-dashboard-section")).toBeVisible();
  await expect(page.locator("#summary-attending")).toHaveText("1");
  await expect(page.locator("#summary-not-attending")).toHaveText("1");
  await expect(page.locator("#summary-no-response")).toHaveText("1");

  // Only Yes/No guests are listed, attending first.
  const rows = page.locator("#admin-guests-table tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Ana García");
  await expect(rows.nth(1)).toContainText("Luis García");
});

test("the passphrase survives a reload in the same session but not a new one", async ({ page, context }) => {
  await stub(page, () => ({ ok: true, guests: GUESTS }));
  await page.fill("#admin-password", "right");
  await page.click('#admin-login-form button[type="submit"]');
  await expect(page.locator("#admin-dashboard-section")).toBeVisible();

  await page.reload();
  await expect(page.locator("#admin-dashboard-section")).toBeVisible();

  const fresh = await context.newPage();
  await stub(fresh, () => ({ ok: true, guests: GUESTS }));
  await fresh.goto("http://localhost:8080/admin.html");
  await expect(fresh.locator("#admin-login-section")).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/admin.spec.js --project=chromium`
Expected: FAIL — the localStorage flag still unlocks the dashboard, and there is no throttle message.

- [ ] **Step 3: Rewrite `admin.js` in full**

```js
/**
 * Admin dashboard.
 *
 * There is no password in this file and no client-side auth check. The
 * passphrase is verified inside the Apps Script proxy; the dashboard appears
 * only because the server chose to return data.
 */
document.addEventListener("DOMContentLoaded", () => {
  const loginSection = document.getElementById("admin-login-section");
  const dashboardSection = document.getElementById("admin-dashboard-section");
  const loginForm = document.getElementById("admin-login-form");
  const passwordInput = document.getElementById("admin-password");
  const loginError = document.getElementById("admin-login-error");

  const summaryAttending = document.getElementById("summary-attending");
  const summaryNotAttending = document.getElementById("summary-not-attending");
  const summaryNoResponse = document.getElementById("summary-no-response");

  const guestsTableBody = document.querySelector("#admin-guests-table tbody");

  const STORAGE_KEY = "wedding_admin_passphrase";
  let guests = [];

  // Left over from the client-side auth this replaced; anyone could set it.
  window.localStorage.removeItem("wedding_admin_authenticated");

  function showDashboard() {
    if (loginSection) loginSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "";
  }

  function errorFor(res) {
    if (res.error === "throttled") {
      const mins = Math.ceil((res.retryAfter || 900) / 60);
      return `Too many attempts. Try again in about ${mins} minutes.`;
    }
    if (res.error === "network") return "Could not reach the server. Check your connection.";
    if (res.error === "not_configured") return "The dashboard is not configured yet.";
    return "Incorrect passphrase.";
  }

  async function loadData(passphrase) {
    const res = await WeddingApi.adminList(passphrase);
    if (!res.ok) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      if (loginError) loginError.textContent = errorFor(res);
      return false;
    }
    guests = res.guests || [];
    window.sessionStorage.setItem(STORAGE_KEY, passphrase);
    if (loginError) loginError.textContent = "";
    showDashboard();
    updateSummary();
    renderResponded();
    return true;
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const value = passwordInput ? passwordInput.value : "";
      if (!value) return;
      if (loginError) loginError.textContent = "Checking…";
      await loadData(value);
    });
  }

  function updateSummary() {
    let attending = 0;
    let notAttending = 0;

    guests.forEach((g) => {
      if (g.attending === "yes") attending += 1;
      else if (g.attending === "no") notAttending += 1;
    });

    const noResponse = Math.max(guests.length - attending - notAttending, 0);

    if (summaryAttending) summaryAttending.textContent = String(attending);
    if (summaryNotAttending) summaryNotAttending.textContent = String(notAttending);
    if (summaryNoResponse) summaryNoResponse.textContent = String(noResponse);
  }

  function renderResponded() {
    if (!guestsTableBody) return;
    guestsTableBody.innerHTML = "";

    const responded = guests.filter((g) => g.attending === "yes" || g.attending === "no");
    responded.sort((a, b) => (a.attending === "yes" ? 0 : 1) - (b.attending === "yes" ? 0 : 1));

    if (responded.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.style.padding = "0.75rem 0.5rem";
      cell.style.color = "#888";
      cell.textContent = "No responses yet.";
      row.appendChild(cell);
      guestsTableBody.appendChild(row);
      return;
    }

    responded.forEach((g) => {
      const row = document.createElement("tr");
      [
        g.name || "",
        g.side || "",
        g.phone || "",
        g.groupId || "",
        g.attending === "yes" ? "Yes" : "No",
        g.allergies || "",
      ].forEach((val) => {
        const cell = document.createElement("td");
        cell.style.padding = "0.35rem 0.5rem";
        cell.textContent = val;
        row.appendChild(cell);
      });
      guestsTableBody.appendChild(row);
    });
  }

  const saved = window.sessionStorage.getItem(STORAGE_KEY);
  if (saved) loadData(saved);
});
```

- [ ] **Step 4: Update `admin.html`**

Change line 27 from `Enter the password to view RSVP details.` to:

```html
              Enter the passphrase to view RSVP details.
```

Change the label at line 31 from `Password` to `Passphrase`.

Delete the now-false instructions at lines 48–51 (`Data is loaded from your published Google Sheets CSV links…`) and replace with:

```html
            <p class="small muted" style="margin-top: 0">
              Live data from the RSVP proxy. Counts cover every guest on the list.
            </p>
```

Add `api.js` before `admin.js` at line 97:

```html
    <script src="api.js"></script>
    <script src="admin.js"></script>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx playwright test tests/admin.spec.js --project=chromium`
Expected: PASS, 6 tests.

- [ ] **Step 6: Confirm no secret remains in the client**

Run: `grep -rn "BuddyBupsters\|ADMIN_PASSWORD\|wedding_admin_authenticated" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs`
Expected: only the `removeItem` cleanup line in `admin.js`.

- [ ] **Step 7: Commit**

```bash
git add admin.js admin.html tests/admin.spec.js
git commit -m "feat: admin dashboard authenticates against the proxy

Deletes the hardcoded password and the client-side comparison. Also drops
the wedding_admin_authenticated localStorage flag, which anyone could set
in devtools to reveal the dashboard without knowing the password at all."
```

---

### Task 6: Wire up the live endpoint and update the docs

**Blocked by:** the user completing the deployment from Task 2 and returning the `/exec` URL.

**Files:**
- Modify: `api.js` (the `API_URL` constant), `CLAUDE.md`

- [ ] **Step 1: Paste in the real endpoint**

Replace the placeholder in `api.js`:

```js
  var API_URL = "https://script.google.com/macros/s/<the deployed id>/exec";
```

- [ ] **Step 2: Verify against the live endpoint**

With the preview running, open the site and do a real lookup using a phone number that exists in the sheet, then submit a response. Confirm in the Sheet that `RVSP` and `Allergies` changed on the right rows, and that `# confirmed` / `# declined` still show formulas rather than pasted values. Then log into `admin.html` with the real passphrase.

- [ ] **Step 3: Confirm the responses carry no phone numbers**

With devtools open on the Network tab, run a lookup and inspect the response body.
Expected: names and attending status only — no phone number, no Group ID.

- [ ] **Step 3b: Verify the server-side admin throttle**

The client-side rendering of `throttled` is covered by Task 5, but the throttle
itself only exists in Apps Script and must be checked by hand once.

Submit a wrong passphrase on `admin.html` eleven times in a row.
Expected: the first ten say "Incorrect passphrase", the eleventh switches to
"Too many attempts. Try again in about 15 minutes." Then enter the **correct**
passphrase and confirm it is still refused while the window is open. Clear the
lock early by deleting the `admin_fail` key — Apps Script editor, run a one-off
`CacheService.getScriptCache().remove('admin_fail')` — and confirm the correct
passphrase works again.

- [ ] **Step 4: Update `CLAUDE.md`**

Three sections are now wrong. Rewrite them:

- **Data Flow** — replace the four Google Forms/Sheets steps with: the browser calls the Apps Script proxy (`api.js`); the proxy reads and writes the private Sheet; guests receive only their own group; the admin dashboard requests the full list with a passphrase checked server-side.
- **Admin Access** — replace the `BuddyBupsters` paragraph with: the passphrase lives in Apps Script Script Properties as `ADMIN_PASSPHRASE`, is never in the repository, and is rotated by editing that property.
- **Google Form Integration** — delete it. Replace with a short **Apps Script Proxy** section pointing at `apps-script/README.md`, and note that `apps-script/logic.gs` is pure and unit-tested via `npm test` while `apps-script/Code.gs` holds all Google API calls.

Also correct the stale claim that `admin.js` fetches two CSVs from lines 6–9.

- [ ] **Step 5: Run the full suite**

Run: `npm test && npx playwright test --project=chromium`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add api.js CLAUDE.md
git commit -m "feat: point the site at the deployed proxy and update docs"
```

- [ ] **Step 7: Hand back the shutdown steps**

Tell the user to now, and only now, do the last two steps in `apps-script/README.md`: un-publish the Sheet and turn off the Google Form. Then confirm the old CSV URL returns 404 while the live site still works.

---

## Post-merge verification

After merging and deploying to GitHub Pages, confirm on the live origin:

1. The published CSV URL returns 404 or a permission error.
2. A guest lookup works end to end from `https://mata-corbeira-wedding.github.io/`.
3. `grep` of the deployed `script.js`, `admin.js`, and `api.js` finds no `docs.google.com/spreadsheets` URL and no passphrase.
4. The admin dashboard loads with the passphrase and shows all 236 guests.

**Still outstanding and outside this plan:** `maria-corbeira/wedding-website` continues to serve the guest CSVs at commit `205568b` by direct SHA. Only that repository's owner can delete the repo or ask GitHub Support to purge the object.
