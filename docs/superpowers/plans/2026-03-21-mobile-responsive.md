# Mobile Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all mobile layout issues in the wedding website so it renders correctly on phones (320px–480px) without breaking the existing desktop layout.

**Architecture:** All changes are CSS-only edits to `styles.css`. The existing `@media (max-width: 720px)` block is expanded; a new `@media (max-width: 480px)` block is added. One pre-existing CSS variable bug is also fixed in the base (non-media-query) rules. No HTML, JS, or admin files are touched.

**Tech Stack:** Plain CSS3, no build system. Preview by opening `index.html` in a browser and using DevTools (F12 → Toggle Device Toolbar) to simulate phone viewports. Test at 375px (iPhone SE/standard) and 320px (smallest common width).

---

## Files

- **Modify:** `styles.css`
  - Fix base rule: `.things-list-numbered > li::before` (wrong CSS variable names)
  - Expand: `@media (max-width: 720px)` block
  - Add: `@media (max-width: 480px)` block

---

## Task 1: Fix CSS Variable Bug in Numbered List Counter

**Files:**
- Modify: `styles.css` (base rules, around line 773–789)

The counter circles on `.things-list-numbered > li::before` use `var(--accent)` and `var(--text)` which don't exist in `:root`. The correct names are `var(--color-accent-soft)` and `var(--color-text)`. This makes the counter circles invisible on all screen sizes.

- [ ] **Step 1: Locate the broken rule**

Open `styles.css` and find `.things-list-numbered > li::before`. It will look like:
```css
.things-list-numbered > li::before {
  content: counter(things-counter);
  ...
  background: var(--accent);      /* ← wrong */
  color: var(--text);             /* ← wrong */
  ...
}
```

- [ ] **Step 2: Fix the variable names**

Change to:
```css
.things-list-numbered > li::before {
  content: counter(things-counter);
  position: absolute;
  left: 0;
  top: 0.05em;
  width: 1.9rem;
  height: 1.9rem;
  background: var(--color-accent-soft);
  color: var(--color-text);
  border-radius: 50%;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 3: Verify visually**

Open `index.html` in browser. Scroll to the "Things To Do" section. The numbered circles should now be visible with a sage-green background and dark text. At any viewport width.

- [ ] **Step 4: Commit**

```bash
git add styles.css
git commit -m "fix: correct CSS variable names on things-to-do counter circles"
```

---

## Task 2: RSVP Modal — Mobile Centering & Scroll Fix

**Files:**
- Modify: `styles.css` (inside `@media (max-width: 720px)`)

The RSVP modal clashes on mobile: the dialog can overflow the viewport vertically, the close button clips near the edge, and on very short screens (landscape mode) there's no way to scroll to form fields.

- [ ] **Step 1: Add modal backdrop fixes inside the 720px media query**

Locate the `@media (max-width: 720px)` block in `styles.css`. Add these rules inside it:

```css
.rsvp-modal {
  padding: 1rem;
  align-items: flex-start;
  overflow-y: auto;
}

.rsvp-dialog {
  width: 100%;
  margin: auto;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
}

.rsvp-close {
  top: 0.75rem;
  right: 0.75rem;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 2: Verify at 375px viewport**

Open `index.html` in browser. Open DevTools → Device Toolbar → set width to 375px. Click the RSVP button.

Expected:
- Dialog appears centered horizontally
- Close button (×) is fully visible in top-right of the dialog
- On a short viewport (e.g. 375×667 landscape), you can scroll inside the modal to reach the Submit button
- Backdrop is visible around the dialog on all sides

- [ ] **Step 3: Verify at 320px viewport**

Set DevTools width to 320px. Click RSVP. Dialog should still be fully visible and scrollable.

- [ ] **Step 4: Commit**

```bash
git add styles.css
git commit -m "fix: RSVP modal centering and scroll on mobile"
```

---

## Task 3: Header & Navigation — Mobile Fixes

**Files:**
- Modify: `styles.css` (inside `@media (max-width: 720px)`)

Brand text overflows on narrow screens; the nav dropdown is right-anchored and can clip at screen edges; the hamburger button has a tiny tap target.

- [ ] **Step 1: Add header fixes inside the 720px media query**

Add these rules inside the existing `@media (max-width: 720px)` block:

```css
.brand-names {
  font-size: clamp(0.75rem, 3vw, 0.9rem);
}

.brand-date {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60vw;
}

.nav-toggle {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 2: Fix the nav dropdown positioning**

Inside the existing `@media (max-width: 720px)` block, find the existing `.nav-links-wrapper` rule. It currently has `right: 1.5rem`. Replace `right: 1.5rem` with `left: 0; right: 0; margin: 0.4rem 0.5rem 0`:

The full updated rule should look like:
```css
.nav-links-wrapper {
  position: absolute;
  left: 0;
  right: 0;
  margin: 0.4rem 0.5rem 0;
  top: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  background: rgba(244, 239, 229, 0.98);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(209, 196, 178, 0.96);
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
  transform-origin: top right;
  transform: scale(0.96);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}
```

- [ ] **Step 3: Verify at 375px**

Open DevTools at 375px. Check:
- Brand names ("Maria & Raynulfo") don't overflow the header
- The date below is truncated with `…` if too long, not wrapping or overflowing
- Clicking the hamburger opens the dropdown — it spans nearly the full header width, not clipped on either side
- Hamburger is easy to tap (large enough target)

- [ ] **Step 4: Commit**

```bash
git add styles.css
git commit -m "fix: header and nav dropdown layout on mobile"
```

---

## Task 4: Hero & Schedule Cards — Mobile Fixes

**Files:**
- Modify: `styles.css` (inside `@media (max-width: 720px)`)

The hero has excessive padding on mobile and the name `clamp()` value doesn't actually respond to phone widths. Schedule cards and the transport callout need tighter padding.

- [ ] **Step 1: Add hero and schedule fixes inside the 720px media query**

Add these rules inside the `@media (max-width: 720px)` block:

```css
.hero {
  min-height: 60vh;
}

.hero-content {
  padding: 4rem 1rem 3rem;
}

.hero-names {
  font-size: clamp(1.9rem, 7vw, 2.6rem);
}

.schedule-card {
  padding: 1rem 1.1rem;
}

.callout {
  border-radius: var(--radius-soft);
  padding: 0.9rem 1rem;
}
```

- [ ] **Step 2: Verify at 375px**

Open DevTools at 375px. Check the hero section:
- Names (Maria Alejandra / Raynulfo Jesus) scale down and fit without horizontal scroll
- Hero doesn't take up the entire screen — content below the fold is visible or hinted
- Schedule cards (Ceremony / Cocktail Hour / Celebration) are readable with appropriate padding
- Transport callout ("Parking at the monastery…") has a softer radius (not a pill) and fits its text

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "fix: hero padding and names scaling on mobile"
```

---

## Task 5: Content Sections — 720px Fixes

**Files:**
- Modify: `styles.css` (inside `@media (max-width: 720px)`)

All sections have 4.5rem top/bottom padding which feels excessive on mobile. The map is too tall.

- [ ] **Step 1: Add section and map fixes inside the 720px media query**

Add these rules inside the `@media (max-width: 720px)` block:

```css
.section {
  padding: 3rem 0;
}

#things-map {
  height: 260px;
}

.site-footer {
  padding-bottom: max(1.8rem, env(safe-area-inset-bottom));
}
```

- [ ] **Step 2: Verify at 375px**

Scroll through the full page at 375px:
- Sections feel appropriately spaced — not too cramped, not too airy
- The Things To Do map is visible and not overwhelming (260px tall)
- Footer has extra bottom padding (visible on iPhones with home bar)

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "fix: section padding and map height on mobile"
```

---

## Task 6: Content Sections — New 480px Breakpoint

**Files:**
- Modify: `styles.css` (add new `@media (max-width: 480px)` block at end of file, before the `@media (prefers-reduced-motion)` block)

Card grids have a `minmax(240px, 1fr)` floor that can squeeze cards on phones. The timeline and numbered list have padding that causes overflow at 375px.

- [ ] **Step 1: Add new 480px media query block**

Find the `@media (prefers-reduced-motion: reduce)` block at the very end of `styles.css`. Insert the following **before** it:

```css
@media (max-width: 480px) {
  .card-grid {
    grid-template-columns: 1fr;
  }

  .hotel-card-grid {
    grid-template-columns: 1fr;
  }

  .timeline-item {
    padding-left: 1.2rem;
  }

  .things-list-numbered > li {
    padding-left: 2.2rem;
  }
}
```

- [ ] **Step 2: Verify at 375px**

Open DevTools at 375px. Check:
- Registry cards (Amazon Registry, Honeymoon Fund) stack vertically — no squeezing
- Hotel cards stack vertically
- Wedding day timeline items don't overflow horizontally
- Things To Do numbered list items don't overflow — text aligns cleanly after the circle

- [ ] **Step 3: Verify desktop not broken**

Set DevTools to 1280px (or close browser DevTools entirely). Confirm:
- Registry card grid shows side-by-side
- Hotel cards show side-by-side
- Timeline looks the same as before
- Everything else unchanged

- [ ] **Step 4: Commit**

```bash
git add styles.css
git commit -m "fix: add 480px breakpoint for card grids and list overflow"
```

---

## Task 7: Final Pass — Full Mobile Scroll Test

No code changes. This task is a thorough end-to-end verification.

- [ ] **Step 1: Test at 375px (portrait)**

Open `index.html` in a browser. DevTools → 375px width. Scroll through the entire page top to bottom:

| Section | What to check |
|---|---|
| Header | Brand name fits, hamburger visible, date truncates |
| Hero | Names scale, padding not excessive, schedule cards readable |
| Wedding Day | Timeline readable, venue card not overflowing, two-column stacked |
| Registry | Cards stacked, buttons visible |
| Hotel | Cards stacked, links accessible |
| Things To Do | Map 260px tall, numbered list not overflowing |
| Footer | Visible, not clipped |
| RSVP Modal | Open it — centered, scrollable, close button visible |

- [ ] **Step 2: Test at 320px (portrait)**

Repeat the same scroll at 320px. Nothing should overflow horizontally (no scrollbar should appear in the x-axis).

- [ ] **Step 3: Test at 375px (landscape / short viewport)**

Set DevTools to 375×667 (landscape). Open RSVP modal — you should be able to scroll inside it to reach the Submit button.

- [ ] **Step 4: Test desktop at 1280px**

Confirm the desktop layout is unchanged. All sections look identical to before.

- [ ] **Step 5: Final commit if any last tweaks were needed**

```bash
git add styles.css
git commit -m "fix: mobile responsive final polish"
```
