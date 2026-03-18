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
1. Guests submit RSVPs via modal form → posts to Google Form (external)
2. Google Forms stores responses in Google Sheets
3. Admin dashboard fetches both the master guest list and RSVP responses as CSVs from published Google Sheets URLs (hardcoded in `admin.js` lines 6–9)
4. Admin correlates guests with RSVPs by phone number, displaying group-based results

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

## Admin Access

Password is hardcoded in `admin.js` (`BuddyBupsters`). Auth state persists in `localStorage`. Google Sheets CSV URLs are also hardcoded in `admin.js`.

## Google Form Integration

The RSVP form submits to a Google Form URL. The placeholder `YOUR_GOOGLE_FORM_URL_HERE` in `script.js` must be replaced with the actual form URL for submissions to work. Field names must match the Google Form's entry IDs.
