# S2 — Control inventory (L1 live scenario)

**Date:** 2026-06-10
**Branch:** `fix/cube-fit-and-labels` (HEAD) — see S1 README's branch note.
**Driver:** Playwright 1.59.1, headless Chromium, viewport 1440×900,
against the running Vite dev server (`pnpm dev:client`, http://localhost:5173).
**Artifacts:** `test-script.spec.ts` (the committed inventory spec),
`pw.config.ts` (minimal runner config), `hill-after-end-scenario.png`.

```
# from repo root, with the dev server running:
pnpm exec playwright test docs/test-feedback/ui-audit-s2/test-script.spec.ts \
  --config docs/test-feedback/ui-audit-s2/pw.config.ts --reporter=list
# → 17 passed
```

---

## Final summary

**(a) How many controls pass.** **15 of 18 controls verified working
end-to-end.** The other 3 are not broken _as controls_ — they are all
blocked by a single root cause (**H-1**, below): the cross-plane move
order, plus the two abilities whose only valid targets live on
cross-plane faces (**Try to recruit**, and the _resolution_ half of
**Flee**). The Playwright spec passes **17/17** assertions (it asserts the
_observed_ cross-plane stall, so the bug is encoded as a passing test —
flip it when H-1 is fixed).

**(b) What I'd fix first.**

1. **H-1 — the cross-plane move stall (and its silent acceptance).** This
   is the highest-leverage fix by far. It alone makes L1's **win
   condition unreachable** (the objective POST is on the ceiling), makes
   **all combat unreachable** (every combatant is cross-plane → the
   battle camera / CombatPanel can never be seen by a player), and
   **disables two shipped abilities** (recruit, and flee's actual
   resolution) because their targets are cross-plane. Whatever the engine
   fix, the _interface_ must at minimum stop silently accepting an order
   it won't fulfill — refuse it, or expose the intended cross-plane
   affordance (the cube-memo "gutter hint").
2. **H-2 — the right-rail 88px clip at 1440** (from S1). Cheap, constant
   papercut on every live frame.

**(c) Is S3 worth doing?** **Not yet — defer until H-1 is fixed.** S3
(driving the baseline AI through the UI as a regression harness) would
mostly exercise the _engine/AI_ path, and right now the human-facing UI
literally cannot reach combat or the win state, so a UI-driven regression
harness would either bypass the very layer S2 is about or get stuck at
the same wall. Once H-1 lands and a human can actually traverse planes,
fight, and capture the ceiling POST, S3 becomes meaningful — at that
point this S2 spec is a natural seed for it (the helpers and selectors
are stable and already encode the control surface). File S3 as a
follow-up gated on H-1.

---

## Control matrix

Legend: ✓ pass · ✗ fail · ◑ partial (reachable part works; rest blocked)
· — not applicable. "State change" = the expected state change appeared in
the next render.

| #   | Control                           | Found | Click registers |                                                              State change correct                                                               | Console error |
| --- | --------------------------------- | :---: | :-------------: | :---------------------------------------------------------------------------------------------------------------------------------------------: | :-----------: |
| 1   | Party selection (each card)       |   ✓   |        ✓        |                                        ✓ rail/actions update, card highlights, tile gets selection ring                                         |     none      |
| 2   | Inspect → PartyDetail panel       |   ✓   |        ✓        |                                             ✓ panel opens in rail; does **not** swap the rail away                                              |     none      |
| 3   | Queen-guard (immobile)            |   ✓   |        ✓        |                                       ✓ correctly shows **Inspect only** + "immobile" hint (no Move/Hold)                                       |     none      |
| 4   | **Move** (same plane)             |   ✓   |        ✓        |                                                ✓ gold × marker; party traverses & captures POST                                                 |     none      |
| 5   | **Move (cross-plane)**            |   ✓   |        ✓        |                                       **✗ silently stalls (H-1)** — order accepted, party never traverses                                       |     none      |
| 6   | Hold position                     |   ✓   |        ✓        |                                               ✓ overrides/cancels a pending move; party stays put                                               |     none      |
| 7   | Clear order                       |   ✓   |        ✓        |                                                    ✓ cancels a pending move; party stays put                                                    |     none      |
| 8   | **Cast Royal Jelly**              |   ✓   |        ✓        |                                         ✓ pending → advance turn → dose 0/3→1/3, auto-pause + feed line                                         |     none      |
| 9   | **Flee next combat**              |   ✓   |        ✓        |                         ◑ arms ("✓ Flee queued… advance turn"); **resolution unreachable** (needs spider contact → H-1)                         |     none      |
| 10  | **Try to recruit**                |   ◑   |        —        | ◑ **gating correct** (button hidden with no neutral in Chebyshev≤1); **full flow unreachable** — recruitable neutrals are all cross-plane (H-1) |     none      |
| 11  | Plane rotation — face tabs        |   ✓   |        ✓        |                                                       ✓ active face changes (all 6 faces)                                                       |     none      |
| 12  | Plane rotation — peripheral click |   ✓   |        ✓        |                                            ✓ all 4 peripherals rotate to active (DOM hit-test works)                                            |     none      |
| 13  | Play                              |   ✓   |        ✓        |                                                                 ✓ turns advance                                                                 |     none      |
| 14  | Pause                             |   ✓   |        ✓        |                                                                 ✓ turns freeze                                                                  |     none      |
| 15  | Step                              |   ✓   |        ✓        |                                                           ✓ advances exactly one turn                                                           |     none      |
| 16  | Speed 0.5× / 1× / 2× / 4×         |   ✓   |        ✓        |                                                  ✓ each preset becomes `active` when selected                                                   |     none      |
| 17  | Fog toggle                        |   ✓   |        ✓        |                                                ✓ mask flips; tiles reveal/hide; label Fog on↔off                                                |     none      |
| 18  | ← End scenario                    |   ✓   |        ✓        |                              ✓ routes to **The Hill** home base (Deploy / Organize Army / Recruit / Shop / System)                              |     none      |

**No console errors or warnings** were emitted across the entire
inventory (asserted by the final spec test and by S1's manual session).

---

## Notes on the ✗ / ◑ rows

### 5 — Move (cross-plane) · ✗ state change (H-1)

Selecting a floor party, rotating to the ceiling (arming persists across
rotation — good), and clicking a ceiling tile **commits a normal-looking
order**: gold × marker, the verb set switches to Move/Clear/Flee/Inspect,
no error. But stepping 10 turns, the party never leaves its floor tile
(traced (0,1) → (0,1) for all 10 turns). The order layer pantomimes a
valid move it cannot fulfill. The underlying stall is already logged
(chunk 28); the **interface defect is the silent acceptance** — there is
no signal to the player that the move won't happen. _Reproduced: 1/1
(10-turn trace) + encoded as a passing Playwright assertion._

### 9 — Flee next combat · ◑ resolution unreachable

The button is present for any controllable, mobile ant party and arms
correctly: click → "✓ Flee queued… (advance turn)". The **full
resolution** the brief asks for (walk into a spider → auto-pause on
`battle-flee-attempted` with a success/failure feed line) **could not be
exercised**, because reaching a spider requires a cross-plane move
(H-1). The arming half is verified; the combat-resolution half is blocked
upstream.

### 10 — Try to recruit · ◑ full flow unreachable

The recruit ability is carried by **pathfinders** (and the leader unit
with `["ant-plane-switch","mend","jelly-apply","recruit"]`). Gating is
**correct**: with no neutral within Chebyshev ≤ 1, the button is absent —
verified. But the button **never surfaced** in L1 floor play because
every recruitable neutral spawns/roams on a **cross-plane face**
(stinkbugs/north-wall, cockroaches/west-wall, mice/ceiling) while all own
parties sit on the floor; closing the gap needs a cross-plane move
(H-1). So the gating is verified but the recruit _flow_ is unreachable.

---

## Things confirmed working that the brief flagged as uncertain

- **Peripheral-tile clicks (the "known gotcha").** Approach #1 (DOM
  hit-testing) **works** — Playwright `.click()` on
  `.cube-slot.cube-* .cube-face.cube-peripheral` rotates that face to
  active. No need for the keyboard-shortcut fallback. Peripheral _tile_
  (x,y) targeting still needs rotate-to-active-first (the perspective
  skew is real), but rotation-by-click is solid.
- **Cast Royal Jelly** (chunk 31) end-to-end: dose increments, auto-pause
  fires ("⏸ Paused — Royal Jelly · 1/3"), colored feed line appears.
- **End-scenario routing** reaches the Hill — Phase B's Hill hub exists
  on this branch (see `hill-after-end-scenario.png`).

## Workflow friction observed (minor, not a control failure)

- **Re-selecting a party always drops into Move-pre-armed mode**
  (Cancel/Hold/Inspect), which **hides** Clear order / Flee / Recruit /
  Jelly until you commit or cancel out of ordering. To reach those verbs
  you must avoid re-clicking the card. Worth a design look — the
  committed verbs are unreachable by the obvious "click the party again"
  gesture.
- **Squad-card status doesn't reflect _pending_ orders.** A card reads
  "floor · idle" even after a move/hold is queued; it only updates to
  "moving"/"holding" after the turn resolves. Pre-resolution, the only
  order feedback is the board × marker (moves only) and the action-button
  view — a held party gives no board feedback at all.
  </content>
