# Mobile Responsive Design — Wedding Website

**Date:** 2026-03-21
**Approach:** Audit and fix all sections (CSS-only, no redesign, no framework)

## Problem

The wedding website has partial mobile CSS but several real breakdowns on phones:

1. **RSVP modal** — not centered, clips the viewport, close button nearly off-screen
2. **Header/nav** — brand text overflows on very small screens; nav dropdown clips at screen edges
3. **Hero** — excessive padding wastes vertical space on mobile; names don't scale with `clamp` effectively at phone widths
4. **Content sections** — card grids squeeze below their `minmax` floor; map height is fixed at 420px; list padding causes overflow at 375px

## Scope

Changes are **CSS-only** in `styles.css`. No changes to `index.html`, `script.js`, or `admin.*`. Desktop layout is preserved exactly; all changes live inside `@media (max-width: 720px)` and a new `@media (max-width: 480px)` breakpoint.

One pre-existing bug is fixed as part of this work: `.things-list-numbered > li::before` references `var(--accent)` and `var(--text)` which are undefined — the correct variables are `var(--color-accent-soft)` and `var(--color-text)`. This is fixed in the base (non-media-query) rule.

## Design Decisions

### RSVP Modal

The `.rsvp-modal` is a flex container (`align-items: center; justify-content: center`). The centering is already correct in principle, but on short or narrow viewports the dialog overflows because there is no vertical breathing room and the `margin: 0 1.5rem` on `.rsvp-dialog` doesn't adapt to very small screens.

Fixes applied to `.rsvp-modal` inside `@media (max-width: 720px)`:
- Add `padding: 1rem` to the modal backdrop so the dialog always has space from edges
- Add `align-items: flex-start` with `overflow-y: auto` so that on short screens the dialog scrolls within the backdrop rather than clipping

Fixes applied to `.rsvp-dialog` inside `@media (max-width: 720px)`:
- `width: 100%` (fills the padded modal area), `margin: auto` (centers within the flex column)
- `max-height: calc(100vh - 2rem)` with `overflow-y: auto; -webkit-overflow-scrolling: touch`
- `padding-bottom: max(1.5rem, env(safe-area-inset-bottom))` for notched phones

Fixes applied to `.rsvp-close` inside `@media (max-width: 720px)`:
- `top: 0.75rem; right: 0.75rem`
- `min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center` for accessible tap target without visual overflow

### Header & Navigation

- `.brand-names`: `font-size: clamp(0.75rem, 3vw, 0.9rem)` inside `@media (max-width: 720px)`
- `.brand-date`: add `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60vw`
- `.nav-links-wrapper` (inside `@media (max-width: 720px)`): change from `right: 1.5rem` to `left: 0; right: 0; margin: 0.4rem 0.5rem 0` — this positions the dropdown relative to `.site-header-inner` (the nearest positioned ancestor, which is `position: sticky`), giving near-full-width behavior within the header container. True full-viewport-width is not needed; aligning to the header container is sufficient.
- `.nav-toggle`: add `min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center` — the bars stay 22px wide but the tap area is 44px

### Hero & Schedule Cards

- `.hero-content` (not `.hero`): `padding: 4rem 1rem 3rem` inside `@media (max-width: 720px)`
- `.hero` (for min-height): `min-height: 60vh` inside `@media (max-width: 720px)`
- `.hero-names`: `font-size: clamp(1.9rem, 7vw, 2.6rem)` inside `@media (max-width: 720px)` — replaces the existing value which uses `4vw` (barely responsive on phones)
- `.schedule-card`: `padding: 1rem 1.1rem` inside `@media (max-width: 720px)`
- `.callout` (transport): `border-radius: var(--radius-soft); padding: 0.9rem 1rem` inside `@media (max-width: 720px)`

### Content Sections (Wedding Day, Registry, Hotel, Things To Do)

- `.section`: `padding: 3rem 0` inside `@media (max-width: 720px)`
- `.card-grid`: `grid-template-columns: 1fr` inside `@media (max-width: 480px)` — removes the 240px/280px floor
- `.hotel-card-grid`: `grid-template-columns: 1fr` inside `@media (max-width: 480px)`
- `.timeline-item`: `padding-left: 1.2rem` inside `@media (max-width: 480px)` (down from `1.6rem`) — reduces overflow risk on 375px screens
- `#things-map`: `height: 260px` inside `@media (max-width: 720px)`
- `.things-list-numbered > li`: `padding-left: 2.2rem` inside `@media (max-width: 480px)` (not the list itself)
- `.things-list-numbered > li::before` (base rule, not media query): fix undefined variables — change `var(--accent)` → `var(--color-accent-soft)` and `var(--text)` → `var(--color-text)`

### Footer

- `.site-footer`: add `padding-bottom: max(1.8rem, env(safe-area-inset-bottom))` inside `@media (max-width: 720px)`

## Breakpoints Used

| Breakpoint | Purpose |
|---|---|
| `max-width: 900px` | Already exists — two-column collapses |
| `max-width: 720px` | Already exists — expanded with more fixes |
| `max-width: 480px` | **New** — card grids single column, tighter list/timeline padding |

## Out of Scope

- Admin dashboard (`admin.html`) — separate page, separate task
- Any design/visual changes to colors, typography, or animations
- Framework or build system changes
- Desktop layout changes
