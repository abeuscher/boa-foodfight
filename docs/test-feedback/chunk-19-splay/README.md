# Visual review — splayed cube view (post-PR #79, Chunk 19 + 19b)

**Branch:** `local/chunk-19-visual-review` (off `main`)
**Reviewer:** local agent (Playwright / chrome-devtools, real Chromium)
**Scenario:** L1 — The Bathroom, live engine in browser
**Build sandbox checks:** `build:client` ✓ (CSS compiles, 20.36 kB), `prettier --check` ✓

---

## TL;DR

The perspective splay **was rendering** (preserve-3d propagates fine — the
trapezoids were real), but **top/bottom seams were broken**: the peripheral
slots collapsed to zero height, so the north/south walls floated ~135 px
off the active face. Fixed.

Then, per PM direction during the review, the splay was **reversed** to read
as looking _into_ the cube (walls flare toward the viewer, active face = back
wall) and the tilt taken to **90°** so the four walls **meet at their outer
vertices** — a sealed one-point-perspective box interior. The hover affordance
was reworked (the old flat outline no longer made sense) into a perspective-
correct gridline highlight.

All five verification points pass (battle camera verified as a CSS-composition
check — see point 5).

---

## Screenshots

| #   | File                            | What it shows                                                                                                                                   |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `01-before-start.png`           | **BEFORE.** Top (North-Wall) & bottom (South-Wall) float far off the Floor — broken seams. Left/right are flush. Walls fold _away_ from viewer. |
| 2   | `02-after-start.png`            | Seam fix applied — all four walls now flush to the active face (still folding away, pre-reversal).                                              |
| 3   | `03-after-outward.png`          | Splay **reversed** to into-the-cube at 40° — correct direction, but walls overflow the viewport and leave triangular corner gaps.               |
| 4   | `04-cube-interior.png`          | **FINAL geometry @ 90°.** Sealed box interior; walls meet at the four outer corners; back face centered; fits the frame. (fog on)               |
| 5   | `05-hover-gridlines.png`        | New hover: hovered wall's gridlines warm to gold, **following the perspective**; other walls unaffected.                                        |
| 6   | `06-fog-off.png`                | Fog off — wall legibility. Back face crisp; walls show terrain/POST/glyphs but heavily foreshortened near the seam.                             |
| 7   | `07-battle-camera-composed.png` | Battle camera (forced state) composing with the splay: active zooms 2.5×, peripherals dim to 0.45, vignette, splay holds.                       |

---

## Verification points

### 1. Trapezoids, not rectangles — ✅ PASS (was never broken)

`transform-style: preserve-3d` propagates correctly down
`.cube → .cube-slot → .cube-peripheral → .cube-peripheral-stage`. Measured a
370 px-wide board projecting to 193 px on its far edge at the original 40° —
genuine foreshortening, not a flattened affine. The "rectangles?" worry in the
brief was actually the **seam gap** below making the trapezoids hard to read.

### 2. Seam alignment — ❌→✅ FIXED

**Root cause:** `.cube-peripheral` is `position: absolute`, so each slot had no
in-flow content. With `.cube { align-items: center }` the slots collapsed to
**zero height** and centered in their 270 px row tracks. The top/bottom stages
(`bottom: 0` / `top: 0`) then pinned their seam edge to the row track's _center_
instead of its inner edge → ~135 px gap above and below the active face. The
top gap was an extra ~17 px because the in-flow active-face label pushed the
Board down.

Left/right were unaffected — `justify-items` defaults to `stretch`, so those
slots kept full column width and the seam landed on the column boundary.

**Fix (two parts):**

- `.cube { align-items: stretch }` — slots fill their tracks; seam anchors hit
  the true inner edge.
- Float the active-face label (`position: absolute`, like the peripheral labels)
  so the active Board fills its row flush, removing the residual 17 px.

**Result:** measured seam gaps **top/bottom/left/right = 0,0,0,0**; far edges
form a single outer square; corners coincide (top wall far-left vertex ==
left wall far-top vertex == `[611, 248]`).

### 3. Legibility — ✅ PASS (on-spec preview fidelity)

With fog off (`06-fog-off.png`): the back face is fully crisp (34 px cells,
readable glyphs, terrain colors, POST diamonds). The four walls show terrain
bands, POST marks, and pawn glyphs — enough to register _that_ something is on
a wall — but at 90° the row nearest the seam is strongly compressed, so **stack
counts and POST-pip detail are not readable from the wall.** This is consistent
with cube-view memo §A.1's "lower-fidelity previews": you read the wall to know
where to look, then click to rotate it active for detail. If you want more wall
readability we can trade a little corner-meet precision (see "Knobs").

### 4. Click behavior — ✅ PASS

Clicked a **cell** on the north-wall peripheral (real pointer hit-test, through
the 90° transform): it **rotated north-wall to active** and did **not** select
a tile. §A.1 "peripherals are previews, never directly tile-clickable" holds —
`Board.onClickTile` for peripherals routes to `onSelectFace`. Hit-testing
survives the steep transform.

### 5. Battle camera — ✅ PASS (CSS composition)

A natural battle didn't resolve on the active face within the review window
(the ant marched to a floor destination; spiders were active on other faces —
feed showed "web spun", Turn 3). The auto-rotate _trigger_ is engine logic that
this change does not touch. What the change _could_ affect is whether the
battle-camera CSS still **composes with the splay**, so I forced the camera
state directly (`07-battle-camera-composed.png`): the active face zooms 2.5×
clipped to its frame (`overflow: hidden`), the focused tile centers, peripherals
dim to opacity 0.45, the vignette renders, and the splayed walls hold. None of
the battle-camera rules were modified.

---

## Changes made (all in `client/src/styles.css`)

1. `.cube` `align-items: center → stretch` — fixes the zero-height slot collapse
   (seam gaps).
2. Float the active-face label (`.cube-face-active > .cube-label.active`
   `position: absolute`) — removes the residual top-seam offset.
3. **Reverse the splay direction** — negated all four `rotateX/Y` signs so walls
   flare toward the viewer (into-the-cube read). _(PM call during review.)_
4. **Tilt 40° → 90°** — the only angle where adjacent walls meet at their outer
   vertices (`a = b ⇒ cosθ = 0`); also pulls the far edges back into the frame.
   _(PM call during review.)_
5. **Hover affordance reworked** — replaced the flat wrapper outline (which
   floated detached once walls tilted) with a perspective-correct gridline tint
   on `.cube-peripheral:hover .board` / `.cell`. _(PM call during review.)_

The geometry rationale (the `a = b ⇒ θ = 90°` derivation) is captured in the
CSS comments so the next person doesn't re-discover it.

---

## Knobs (if you want to tune later)

All in `client/src/styles.css`, `/* --- Splayed cube view --- */` block:

- **Wall readability vs. perfect corners:** dropping the tilt to ~84–86°
  reopens a small triangular corner gap but gives the walls a few more px of
  depth (more legible content). 90° is the exact corner-meet.
- **`.cube { perspective: 1000px }`** — larger flattens the foreshortening
  (walls less squashed) but also shrinks the far-edge flare.
- **Hover tint** (`#5b4f30` board / `#6f6038` cell) — currently fairly bold for
  "alter slightly"; mute toward the base `#2a2f37` / `#3a4049` if you want it
  subtler.
