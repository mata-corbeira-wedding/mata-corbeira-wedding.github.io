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

## Design Decisions

### RSVP Modal
- `width: calc(100% - 2rem)` + `max-width: 92vw` + `margin: 0 auto` — always centered regardless of viewport
- `max-height: 85vh` with `-webkit-overflow-scrolling: touch` for smooth iOS scroll
- Close button: `top: 0.75rem; right: 0.75rem`, minimum tap target 44×44px
- Add `padding-bottom: env(safe-area-inset-bottom)` for notched phones

### Header & Navigation
- Brand names: `font-size: clamp(0.75rem, 3vw, 0.9rem)` so they don't overflow at 320px
- Brand date: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- Nav dropdown: `left: 0; right: 0` (full-width) instead of right-anchored, preventing edge clipping
- Nav toggle: `min-width: 44px; min-height: 44px` for accessible tap target

### Hero & Schedule Cards
- Hero: `min-height: 60vh`, `padding: 4rem 1rem 3rem` on mobile (down from 6rem/4.5rem)
- Hero names: `font-size: clamp(1.9rem, 7vw, 2.6rem)` — actually responds to phone widths
- Schedule cards: `padding: 1rem 1.1rem`, `font-size` reduced slightly
- Transport callout: `border-radius: 14px` (not pill), `padding: 0.9rem 1rem`

### Content Sections (Wedding Day, Registry, Hotel, Things To Do)
- All sections: `padding: 3rem 0` on mobile (down from 4.5rem)
- `card-grid`: `grid-template-columns: 1fr` below 480px (removes `minmax` floor issue)
- Timeline: reduced `padding-left` to prevent text overflow at 375px
- Map (`#things-map`): `height: 260px` on mobile
- Numbered list (`things-list-numbered`): `padding-left: 2.2rem` on mobile
- Hotel card grid: `grid-template-columns: 1fr` below 480px

### Footer
- Add `padding-bottom: max(1.8rem, env(safe-area-inset-bottom))` for iOS home bar

## Breakpoints Used

| Breakpoint | Purpose |
|---|---|
| `max-width: 900px` | Already exists — two-column collapses |
| `max-width: 720px` | Already exists — hamburger menu, schedule grid single column |
| `max-width: 480px` | **New** — card grids forced to single column, smaller padding |

## Out of Scope

- Admin dashboard (`admin.html`) — separate page, separate task
- Any design/visual changes to colors, typography, or animations
- Framework or build system changes
- Desktop layout changes
