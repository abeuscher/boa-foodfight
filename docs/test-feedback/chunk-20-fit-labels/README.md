# Chunk 20 — cube fit + perimeter labels

**Branch:** `fix/cube-fit-and-labels` (off `main` @ b4dd005)
**Build sandbox:** `build:client` ✓, `prettier --check` ✓

## Problem (from PM)

The cube box sat small inside a much larger container — lots of deadspace —
and the side labels ran horizontally, reserving room. Wanted: enlarge the box
to fill its container, keep it on-screen (no off-frame overflow), and run the
side labels at 90° so they hug the box.

## Root cause of the deadspace

At 1920×953 the `.scn-world` container was **952×952** but the visible cube box
was only **587×587** — centered, leaving ~182 px of dead margin per side. Two
causes:

1. The peripheral grid slots were a fixed **270 px**, but at 90° the walls only
   project **~109 px** deep — so each slot reserved ~160 px of empty grid.
2. The active board (and therefore the whole box) was a fixed 370 px; it never
   grew to fill the container.

## Fix (all `client/src/styles.css`)

One sizing knob, `--cube-cell`, drives everything:

- Slots sized to the wall's foreshortened depth (`2.935·cell + 8.8px`) so the
  **grid hugs the box** — no dead grid space.
- `perspective` scales **with** the cell (`27·cell + 81px`, ≈ 2.7 × active-edge)
  so the trapezoid proportions and the 90° corner-meet stay identical at any
  size. (A fixed perspective would distort as the board grew.)
- `--cube-cell: clamp(34px, 5vmin, 50px)` — fills the container on a big screen,
  **shrinks to fit shorter screens** instead of running off-frame.
- `.live .scn-world` is now flex-centered so the box sits dead-center.
- Peripheral labels re-anchored to each wall's **outer edge**; left/right rotated
  **90°** (vertical) and set `pointer-events: none` so clicks still fall through
  to the wall.

## Result

| Viewport | Container            | Box      | Fill | Overflow         | Seams    |
| -------- | -------------------- | -------- | ---- | ---------------- | -------- |
| 1920×953 | 846² (flex-centered) | **804²** | 95%  | none             | 0,0,0,0  |
| 1366×720 | 661²                 | **619²** | ~94% | none on any side | (scales) |

Box grew 587 → 804 (+37%); deadspace 62% → 95% fill. Seams stay flush, corners
still meet (perspective-scaled), click-to-rotate verified via hit-test on the
wall's overflowing far-edge region.

## Screenshots

- `02-fit-1366x720.png` — responsive: scales down, stays in-bounds, vertical
  side labels.
- `03-fit-1920-final.png` — full size: box fills container, perimeter labels.

## Notes / knobs

- `--cube-cell` clamp (`34px / 5vmin / 50px`) is the single tuning point — raise
  the cap or coefficient for a bigger box, lower for more label gutter.
- Label color/size are unchanged (still `0.7rem #9a958a`); only placement +
  rotation changed. Easy to bump if you want them more prominent like the mockup.
- Sizing is viewport-responsive (`vmin`), not container-measured — tuned to look
  right across desktop sizes; a `ResizeObserver` would be the move if we ever
  need it pixel-exact to `.scn-world`.
