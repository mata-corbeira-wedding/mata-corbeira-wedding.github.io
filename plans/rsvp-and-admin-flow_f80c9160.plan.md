---
name: rsvp-and-admin-flow
overview: Add an RSVP button and flow that uses an external Google Form/Sheet as the data store, plus a simple password-protected admin view for you to see and filter responses by group number and country code.
todos: []
isProject: false
---

# RSVP button and admin flow

## High-level approach

- **RSVP storage**
  - Use **Google Forms + Google Sheets** to store RSVP submissions instead of building our own backend, to keep deployment simple.
  - The public site will submit RSVP responses to the Google Form URL.
  - A separate **admin page** on your site will embed or read from the Google Sheet (using a published CSV/JSON view) to show who has RSVP’d and headcount, filtered by group number.
- **Guest master list**
  - Keep your detailed guest list (with columns B–F and I–J) in **Google Sheets** as the “source of truth”.
  - We will export two views from that Sheet:
    - A **guest group view** (guest name, phone, group number) used by the admin page for matching.
    - A **country/area code view** (columns I and J) exported once as a static JSON file in the repo for the phone dropdown + flags.

## File & route structure

- **Public site**
  - `[index.html](/Users/mariacorbeira/Documents/wedding website/index.html)`: add the RSVP button in the Home hero section and an RSVP modal/section.
  - `[script.js](/Users/mariacorbeira/Documents/wedding website/script.js)`:
    - Handle RSVP button click, show/hide a modal or in-page form.
    - Build the area-code + country dropdown from static data.
- **Admin view**
  - `[admin.html](/Users/mariacorbeira/Documents/wedding website/admin.html)`: new page for you only.
    - Simple login screen that asks for a password (`BuddyBupsters`).
    - After correct password, displays RSVP dashboard.
  - `[admin.js](/Users/mariacorbeira/Documents/wedding website/admin.js)`: logic for password check (client-side), loading guest/RSVP data, and grouping.
  - `[data/country-codes.json](/Users/mariacorbeira/Documents/wedding website/data/country-codes.json)`: static mapping of country codes + country name + flag emoji, generated from your Sheet columns I and J.

## UI changes on Home page

- **Replace “Save the Date” label**
  - Remove the text-only "Save the Date" above your names.
  - Add a **primary RSVP button** there, styled to match your current buttons, labeled for both languages:
    - EN: `RSVP`
    - ES: `Confirmar asistencia`.
  - Button opens the RSVP form (either as a modal overlay or a section lower on the page).
- **RSVP form fields**
  - **Phone input** split into:
    - Dropdown for **country/area code**.
    - Text field for local phone number.
  - When the guest submits their phone number, the page will:
    - Send their RSVP answer to Google Forms.
    - Optionally show a confirmation view showing all names in their **group** (pulled from a pre-exported group mapping or via the Google Sheet).
  - Include radio buttons or toggles for:
    - `Attending` / `Not attending`.
    - Optional notes (dietary, plus-one, etc.) as a free-text field.

## Admin page behavior

- **Access and login**
  - The footer text `Maria & Raynulfo` is turned into a link to `admin.html`.
  - `admin.html` initially shows a small password form.
  - Password is checked client-side against the string `BuddyBupsters`.
  - On success, store a flag in `localStorage` so you don’t need to re-enter the password every refresh on the same browser.
- **Loading data from Google Sheets**
  - In your Google Sheet (guest master), create **two tabs**:
    - `Guests`: columns: FirstName (B), LastName (C), PartySide (D), Phone (E), GroupNumber (F).
    - `RSVPs`: response tab from Google Forms (must include submitted phone, group, attending/not, timestamp, etc.).
  - For this implementation to stay frontend-only:
    - Publish each tab as a **CSV** using `File → Share → Publish to the web` and get public CSV URLs.
    - In `admin.js`, fetch those CSV URLs with `fetch()` and parse into arrays.
- **Group matching logic**
  - In admin view, provide:
    - A **phone-number search** input: when you paste a phone number (normalized without spaces), it looks up the matching entry in `Guests` by phone.
    - Once a match is found, find all rows in `Guests` with the same `GroupNumber` and display them as a list.
  - Display for each guest:
    - Full name.
    - Bride/groom side.
    - Whether they have RSVP’d (from `RSVPs` tab) and their attending status.
- **Headcount and filters**
  - Show at least these summaries:
    - Total guests marked `Attending`.
    - Total guests per group number (summed from `Guests` where RSVP is attending).
  - Simple controls:
    - Filter table by `Attending`, `Not attending`, or `No response`.
    - Optional sort by group number.

## Area code & flag dropdown

- **Static data extraction**
  - From your Sheet columns I (area code) and J (country): export once to a local JSON file like:
    - `[data/country-codes.json]`: `[{ "code": "+1", "country": "United States", "flag": "🇺🇸" }, ...]`.
  - You can regenerate this JSON manually whenever your list changes.
- **Form rendering**
  - In `script.js`, on page load:
    - Fetch `data/country-codes.json`.
    - Populate a `<select>` in the RSVP form with options like `🇺🇸 +1 — United States`.
  - Selected code is prefixed to the phone number field when submitting to Google Forms.

## Implementation notes & tradeoffs

- **Security**
  - The admin password check is client-side only; it hides the admin tools from casual visitors but does **not** protect the data from someone technical.
  - Because Google Sheets CSV URLs are public, treat this as convenience access, not highly sensitive data.
- **Data consistency**
  - Group membership is defined entirely in the Google Sheet `Guests` tab.
  - RSVP entries are matched to guests by **normalized phone number** and then assigned to a group via the group number from `Guests`.
- **Future backend option**
  - If later you want stronger security or more complex reporting, we can:
    - Replace Google Forms with a small backend API (Node/Express or serverless) that writes RSVPs into a database.
    - Add proper authentication to the admin page.

## Next steps once you approve this plan

- Add RSVP button and form markup to `index.html` and corresponding styles in `styles.css`.
- Set up a Google Form and connect it to your Sheet; wire the RSVP form’s `action` to that Form URL.
- Create `admin.html` and `admin.js` with the password gate and CSV fetching/parsing.
- Add `data/country-codes.json` based on your Sheet’s area codes and countries.
- Test:
  - RSVP submission from the main page.
  - Admin login with `BuddyBupsters`.
  - Guest grouping by phone and headcount calculations.
  - English/Spanish text for all new UI pieces.

