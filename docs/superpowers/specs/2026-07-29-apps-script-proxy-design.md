# Design: Apps Script proxy to stop exposing the guest list

**Date:** 2026-07-29
**Branch:** `worktree-apps-script-proxy`
**Status:** approved (design), not yet implemented

## Problem

The site is static and hosted on GitHub Pages, so it has no server. Every secret it
touches ships to the browser. Two of those secrets are real:

1. **The published Google Sheets CSV URL** is hardcoded in `script.js` and `admin.js:5`.
   GitHub Pages serves those files to everyone. Fetching that URL anonymously returns
   **all 236 guest rows with names and phone numbers**. Verified 2026-07-29.
2. **The admin password** (`<redacted>`) is hardcoded at `admin.js:1` and compared
   client-side. View-source defeats it.

A third defect is data loss rather than disclosure: the RSVP submit at `script.js:799`
posts to Google Forms with `mode: "no-cors"`. The response is opaque, so `catch` only
fires on network errors. A guest can be shown "success" when nothing was recorded.

Hosting is not the problem. GitHub Pages stays.

## Current architecture

```
Browser ──fetch CSV (all 236 rows)──▶ Published Google Sheet   [PUBLIC, no auth]
   │
   └────POST no-cors──▶ Google Form ──▶ Form Responses tab ──manual re-typing──▶ Guest list tab
```

Facts established by inspecting the live data:

- 236 data rows, 104 distinct Group IDs, largest group is 9 people.
- 222 rows have a phone number; ~13 real guests have none and cannot use the lookup
  at all today. This is pre-existing and out of scope to fix, but the admin view must
  keep showing them.
- `RVSP` is populated in **all** 236 rows with the literal default `"No Response"`
  (6 `Yes`, 1 `No`). A formula pulling from the Form Responses tab would leave blanks
  blank. Combined with the user's confirmation that no Apps Script exists, this means
  **Form responses do not reach the guest list automatically** — they are copied by hand.
- `# confirmed` and `# declined` are populated in exactly one row each: they are
  summary formulas, not per-guest data.
- Only `gid=698292239` is published. The whole-document export returns the same single
  sheet, so the Form Responses tab is **not** exposed.

## Target architecture

```
Browser (GitHub Pages, public)
   │  POST {action, …}   Content-Type: text/plain
   ▼
Apps Script Web App  /exec   ◀── the only data path
   │
   ├── reads/writes ──▶ Guest list tab   [PRIVATE, unpublished]
   └── returns only what the caller is entitled to
```

The Google Form is retired. Apps Script writes RSVPs straight into the guest list,
which also eliminates the manual re-typing step and gives us a real success/failure
response.

## API contract

One web app, one `doPost`, three actions. All requests are `POST` — never `GET` —
so phone numbers and tokens never appear in a URL, query string, or server log.

**Transport note:** the body is `Content-Type: text/plain` containing JSON. This keeps
it a CORS "simple request" so no preflight is issued; Apps Script does not handle
`OPTIONS` preflight, so `application/json` would fail.

### `lookup`

```jsonc
// request
{ "action": "lookup", "phone": "+34612345678" }

// response — success
{ "ok": true, "group": [
    { "name": "Ana García", "attending": "yes" | "no" | null },
    { "name": "Luis García", "attending": null }
  ],
  "notes": "seafood"        // existing allergies text for the group, or ""
}

// response — no match
{ "ok": true, "group": [] }
```

**No phone numbers, no Group ID, and no row indices are ever returned.** The client
gets names and RSVP state only. A "no match" is indistinguishable from a match with an
empty group, and returns in comparable time.

### `submit`

```jsonc
// request — `i` is the index into the group array returned by `lookup`
{ "action": "submit", "phone": "+34612345678",
  "responses": [ { "i": 0, "attending": "yes" }, { "i": 1, "attending": "no" } ],
  "notes": "seafood allergy" }

// response
{ "ok": true, "written": 2 }
{ "ok": false, "error": "not_found" }
```

The server re-runs the lookup from `phone` and maps `i` onto the same group. The client
never learns or supplies a sheet row number, so it cannot write to a row it did not
legitimately look up. Indices outside the group are rejected.

This replaces the Google Form entirely, which fixes the `no-cors` silent-failure bug:
the response is a real readable JSON body.

### `adminList`

```jsonc
// request
{ "action": "adminList", "passphrase": "…" }

// response
{ "ok": true, "guests": [ { "name", "side", "phone", "groupId", "attending", "allergies" }, … ] }
{ "ok": false, "error": "unauthorized" }
{ "ok": false, "error": "throttled", "retryAfter": 300 }
```

The passphrase is compared **server-side** against `ADMIN_PASSPHRASE` in Apps Script
**Script Properties** — never in the repository, never in client JavaScript. Comparison
is length-checked then constant-time to avoid leaking it through response timing.

This is the only action that returns phone numbers, and the only one that returns
guests who have none.

#### Why a memorable passphrase, not a random token

One of the two admins is non-technical. A token long enough to resist offline guessing
is a token nobody can type, which pushes it into a sticky note or a chat message — a
worse outcome than a weaker secret used correctly.

The original flaw was never that `<redacted>` was memorable. It was that it lived in
`admin.js` where anyone could read it, and was compared in the browser where anyone
could skip the comparison. Moving the check server-side fixes both. Once the only
remaining attack is guessing over the network, a 3–4 word phrase is sufficient:

- Choose something like `sage-monastery-lentils-2026`. Roughly 40+ bits against a
  dictionary attack, which is far beyond what a rate-limited network endpoint allows.
- **Failed attempts are throttled** via `CacheService`: a global counter, since Apps
  Script cannot see caller IPs. After 10 failures in 15 minutes, `adminList` returns
  `throttled` for everyone until the window expires. A wedding dashboard is opened a
  handful of times, so a blunt global lock is acceptable and is the only mechanism the
  platform actually supports.
- Failures are recorded in the `_log` tab.

The passphrase can be rotated at any time by editing the Script Property. No code
change, no redeploy, no site update.

Operationally: choose it, tell Maria out-of-band (in person, or a message she deletes),
and never put it in the repository, in this document, or in a chat with an assistant.

## Sheet contract

The script must resolve columns **by header name** (`Nombre`, `Bride or Groom`,
`Phone #`, `Group ID`, `RVSP`, `Allergies`) read from row 1, and write only to
individual `RVSP` / `Allergies` cells.

It must never write a range spanning other columns, because `# confirmed` /
`# declined` hold summary formulas that a blanket range write would destroy. If a
required header is missing the script fails loudly rather than guessing a column index.

Phone matching reuses the existing `normalizePhone` semantics (strip everything but
digits, compare the significant tail) so numbers stored inconsistently still match.

### Value mapping

The sheet's vocabulary and the API's vocabulary differ. The mapping is fixed:

| Sheet `RVSP` | API `attending` |
|---|---|
| `Yes` / `Sí` / `Si` (any case) | `"yes"` |
| `No` (any case) | `"no"` |
| `No Response`, empty, anything else | `null` |

Writing back: `"yes"` → `Yes`, `"no"` → `No`. The script never writes `No Response`;
that default is only ever set by hand in the sheet.

For `Allergies`, an empty `notes` writes the existing default string `No allergies`
rather than blanking the cell, matching what the sheet already contains in 229 rows.
On read, `No allergies` is normalised to `""` so it does not appear as pre-filled
text in the guest's notes box — which is what `script.js:722` already does today.

## Security properties

| Exposure | Before | After |
|---|---|---|
| Bulk guest-list download | 236 rows, names + phones, anonymous | endpoint returns one group, no phones |
| Admin password | `<redacted>` in client JS, compared in browser | passphrase in Script Properties, compared server-side, attempts throttled |
| RSVP silent failure | opaque `no-cors` response | real JSON success/failure |
| Form Responses tab | not exposed | not exposed (Form retired) |

### Residual risk — stated plainly

**This does not make the data secret. It makes it non-bulk-downloadable.**

- Someone who *already knows* a guest's phone number can still confirm that person is
  invited and learn their group members' names. That is inherent to an unauthenticated
  phone lookup and cannot be designed away while keeping the feature.
- **Apps Script cannot see the caller's IP address.** Per-attacker rate limiting is
  therefore impossible. We can apply a per-phone throttle and a global ceiling via
  `CacheService`, which stops fast scraping, but a patient attacker holding a list of
  phone numbers could still probe them one at a time. They cannot obtain the list from
  us — and the list is the asset we are protecting.
- Every `lookup` is appended to a hidden `_log` tab (timestamp, hashed phone, hit/miss)
  so abuse is detectable after the fact.
- **Anything already scraped is already gone.** Phone numbers cannot be un-leaked.
  This stops future collection only.
- `maria-corbeira/wedding-website` still serves the guest CSVs at commit `205568b` by
  direct SHA. **Out of our control** — only that repository's owner can delete the repo
  or ask GitHub Support to purge the object.

### Incidental hardening

`renderGroupList` (`script.js:731`) builds rows with `innerHTML` and interpolates
`${name}` from sheet data. Names are admin-entered so there is no live injection path,
but since this code is being rewritten anyway it will use `textContent` for all
untrusted values.

## Client changes

**`script.js`**
- Delete `GUESTS_CSV_URL`, `GOOGLE_FORM_ACTION`, `FORM_ENTRY_*`, `FORM_FBZ`.
- Add a single `API_URL` constant (the `/exec` URL — public by design; it is the code,
  not the URL, that enforces the boundary).
- `ensureGuestList()` and the whole `guestList` cache are removed. The search handler
  calls `lookup` and renders whatever comes back.
- The submit handler calls `submit` and reports the real result. `mode: "no-cors"` is gone.
- `parseCsv` / `fetchCsv` are deleted if nothing else uses them.

**`admin.js`**
- Delete `ADMIN_PASSWORD` and `GUESTS_CSV_URL`.
- The login form posts the typed passphrase to `adminList`. Success is "the server
  returned data"; there is no client-side comparison. The `wedding_admin_authenticated`
  localStorage flag is deleted — it was a client-side boolean anyone could set to `true`
  to reveal the dashboard.
- The passphrase is held in `sessionStorage`, not `localStorage`, so it does not persist
  on a shared or borrowed machine. The admin re-enters it once per browser session,
  which is cheap precisely because it is memorable.
- The `throttled` error is surfaced as its own message ("too many attempts, try again in
  N minutes"), distinct from "incorrect passphrase", so a locked-out admin is not left
  guessing that they have forgotten it.
- Summary counts and the responded-table render from the JSON response. The existing
  `updateSummary` / `renderResponded` logic is preserved as-is.

**`admin.html` / `index.html`** — unchanged apart from any copy tweaks. The footer link
at `index.html:564` stays as the admin entry point.

## Rollout order

Order matters. Un-publishing the sheet first would take the live site down.

1. Deploy the Apps Script web app, note the `/exec` URL.
2. Set `ADMIN_PASSPHRASE` in Script Properties.
3. Point the site's `API_URL` at it; verify lookup, submit, and admin against the live
   endpoint while the CSV is still published (both paths work, so there is no outage).
4. Merge and publish to GitHub Pages. Verify on the live origin.
5. **Only then** un-publish the sheet: File → Share → Publish to web → Stop publishing.
6. Confirm the old CSV URL returns 404 and the site still works.
7. Turn off the Google Form's accepting-responses toggle.

Rollback at any point before step 5 is a `git revert`. After step 5, rollback additionally
requires re-publishing the sheet.

## Testing

- Apps Script unit checks run in the Apps Script editor against a **copy** of the sheet,
  never the live one.
- `lookup` with: a valid phone, an unknown phone, a phone with different formatting,
  a guest whose group has 9 members, and a guest with no phone (must miss).
- Assert no response from `lookup` or `submit` contains a phone number or Group ID.
- `submit` with an out-of-range index must be rejected without writing.
- `adminList` with a wrong passphrase, an empty passphrase, and no passphrase field at
  all must each return `unauthorized` and no data.
- 10 consecutive failures must flip `adminList` to `throttled`; a correct passphrase
  during the lock window must still be refused, and must succeed after it expires.
- Setting `wedding_admin_authenticated` in localStorage by hand must not reveal the
  dashboard.
- After a `submit`, confirm `# confirmed` / `# declined` formulas are intact.
- Browser-level verification against the deployed site: RSVP round-trip and admin login.

## Out of scope

Noted, not being changed: `data/country-codes.json` is dead code (the codes are inlined
at `script.js:512`), and `assets/monastery-cloister.png` / `assets/save-the-date.png`
are unreferenced. The ~13 guests without phone numbers still cannot self-serve.

## What the user must do

These require the owner's Google account; they cannot be automated from here.

1. Create the Apps Script project bound to the guest Sheet and paste in the delivered code.
2. Deploy as a web app: **Execute as:** Me — **Who has access:** Anyone.
3. Set Script Property `ADMIN_PASSPHRASE` to a 3–4 word phrase of your choosing. Share
   it with Maria out-of-band. Do not put it in the repo, in this document, or in a chat
   with an assistant. It can be rotated later by editing this property alone.
4. Send back the `/exec` URL.
5. After step 4 of the rollout is verified: un-publish the sheet and close the Form.
