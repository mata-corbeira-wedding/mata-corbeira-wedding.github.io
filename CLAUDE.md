# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static HTML/CSS/JS wedding website with no build system. Backend is Google Forms/Sheets for RSVP collection.

To preview locally, open `index.html` directly in a browser or use any static file server:
```bash
python3 -m http.server 8080
```

## Architecture

### Files
- `index.html` + `script.js` — public wedding website (single page, hash navigation)
- `admin.html` + `admin.js` — password-protected RSVP dashboard
- `styles.css` — shared stylesheet for both pages
- `data/country-codes.json` — phone country codes for RSVP form dropdown

### Data Flow
1. The browser never talks to Google Sheets directly — `api.js` (`window.WeddingApi`) POSTs to a Google Apps Script proxy deployed at the `/exec` URL in `API_URL`
2. The proxy (`apps-script/Code.gs`) reads and writes the private guest Sheet server-side
3. A guest lookup (`WeddingApi.lookup(phone)`) returns only that caller's own group — the response never includes a phone number or Group ID for anyone
4. RSVP submissions (`WeddingApi.submit(...)`) are written into the Sheet by the proxy
5. The admin dashboard requests the full guest list via `WeddingApi.adminList(passphrase)`; Apps Script checks the passphrase server-side before returning anything

### Key Design Decisions
- **Bilingual (EN/ES):** All visible text is driven by a translation map in `script.js`. To add or change UI text, update the `translations` object — do not hardcode strings in HTML.
- **RSVP lookup is group-based:** When a guest searches by phone in the admin, all members of their group are displayed together.
- **No framework or bundler:** Plain ES6+, no imports. All scripts are loaded via `<script>` tags.

## Design System

CSS variables defined in `styles.css`:
- `--bg`: `#f4efe5` (warm beige)
- `--text`: `#3d3226` (dark brown)
- `--accent`: `#7f8d6a` (sage green)
- Fonts: Cormorant Garamond (serif headings), Lato (sans body) — loaded via Google Fonts

## Images

Two kinds of image asset, both committed in a web-ready form. The originals live
on disk outside the repo's tracked files; `assets/Photos/` is gitignored.

- **Logos** (`assets/logo-*.png`) — the designer's line art, which arrives as
  black-on-off-white JPEGs. They must be transparent PNGs, or they render as
  white boxes on the beige. Convert with
  `node tools/make-logo.js <input.jpg> <output.png> [maxEdge]`, which keys the
  paper out into alpha, trims the margin, and downscales (260px long edge;
  the header monogram is 320). One logo per section, none for Home.
- **Section backdrops** (`assets/bg-*.jpg`) — photographs, resized to ~1500px
  and heavily compressed with `sips`. Only about 10% of each survives the beige
  wash over it, so compression is invisible and file weight is what matters.
  Keep them near the ~150–300 KB of the existing backdrops.

## Admin Access

There is no password in the repository and no client-side auth check. The passphrase lives only in Apps Script Script Properties as `ADMIN_PASSPHRASE` and is verified inside Apps Script when the dashboard calls `adminList`. Rotate it by editing that Script Property — nothing in the repo changes. The dashboard holds the passphrase in `sessionStorage` for the tab's lifetime only.

## Apps Script Proxy

The RSVP/admin backend is a Google Apps Script web app deployed behind the URL in `api.js` (`API_URL`). See `apps-script/README.md` for deployment and re-deployment steps.

The Apps Script code is deliberately split in two:
- `apps-script/logic.gs` — pure functions with no Google globals (no `SpreadsheetApp`, `ContentService`, etc.). Unit-tested in Node via `npm test`.
- `apps-script/Code.gs` — every call into a Google API. Cannot be tested outside the Apps Script environment, so keep it thin and push logic into `logic.gs`.

## Testing

- `npm test` — Node unit tests for `apps-script/logic.gs`.
- `npx playwright test tests/rsvp.spec.js tests/admin.spec.js --project=chromium` — browser tests for the public site and admin dashboard, run against a stubbed Apps Script endpoint.
- `tests/example.spec.js` and `tests/seed.spec.ts` are unrelated Playwright scaffolding that hit external sites; they are not part of this project's test suite.
