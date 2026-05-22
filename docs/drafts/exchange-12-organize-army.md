# Change Request: Organize Army spec back-fill + Shop spec engine re-ratification

From / To: UX → Dev (Gameplay/Engine)
Status: Proposal — awaiting cost/feasibility read
Blocking: Non-blocking, batched. The engine work it binds to is already
shipped (`dd75621`); this exchange ratifies the design record against it.

**Exchange number note (post-migration drift).** The committed
`change-request-protocol.md` §7 log ends at **Exchange #9**. Recruit
(#10) and Shop (#11) were transacted but live only as drafts
(`docs/drafts/exchange-10-dev-reply.md`; the Shop spec itself was never
committed). Per the user's ruling, this entry takes the **next free
number, #12**, leaving #10/#11 to be reconciled into the protocol log
separately. If the reconciliation renumbers, this entry moves with it.

## Solving for

Two between-scenario sub-views need their design record squared with
shipped engine truth, so the coding agent can build the real Hill hub
shell client against a ratified sub-view family instead of placeholders:

1. **Organize Army** shipped ahead of any spec (merged to `main`, PR #41,
   post-`dd75621`). It needs a ratified spec that (a) locks the shipped
   engine bindings and constraints as design truth, and (b) sets the
   two-layer (army overview / party detail) target the client is reworked
   toward.
2. **Shop** (revision 2) carried "sketch pending dev rework" engine
   sections. The rework has landed; the Shop spec's engine binding needs
   re-ratifying against the real signatures, and its open
   "confirmations" closing.

## Proposed change

Ratify two draft specs, bundled as one package:

- **`docs/ui-organize-army-subview-spec.md`** (new) — drafted at
  `docs/drafts/ui-organize-army-subview-spec.md`. Target two-layer
  architecture + an explicit "as-built today (v0)" record of the shipped
  composite Squads+Barracks view. Engine bindings, slot caps, formation
  ranks, queen-pin, and barracks-as-derived-view all recorded against
  live engine truth.
- **`docs/ui-shop-subview-spec.md`** revision 3 — drafted at
  `docs/drafts/ui-shop-subview-spec.md`. Revision-2 surface unchanged;
  Engine binding rewritten against shipped `buyItem` / `equipItem` /
  catalog schema; "Engine-truth confirmations needed" retired (1–4
  ratified; 5 → forward-dep); stock schema reference made concrete. Also
  the first committed form of this doc (it was never committed in 003).

**What is NOT changing:** no engine work is requested — the operators and
schema this binds to are already shipped. No client code (design track).
No visual treatment (deferred, cube memo §D). No amendment to the shell
IA, hub spec, or mechanic plan. The two-layer *layout* is a target for the
client track's later rework, not a request for engine change.

## Why

The trio (Recruit / Shop / Organize Army) must have ratified specs before
the coding agent builds the real verb-rail + resource-strip hub shell
against the family rather than ad-hoc placeholders. This package completes
the design half for Shop and Organize Army.

The back-fill also **corrects three stale design assumptions** against
shipped engine truth (flagged so the record is right, not to relitigate):

- **No L2 gate on formation editing.** `setUnitRank` is ungated; the
  three-rank model (front/back/reserve) shipped via Exchange #5; the
  mechanic plan schedules no Tier-1 formation gate. The session brief's
  "formation debuts at L2" is retired.
- **Slot caps are 9 / 12 (slot-cost-weighted), canon.** Per Exchange #1
  (8→9 for a legible 3×3 grid; queen-guard 12). The old "party-cap-8" is
  superseded and retired.
- **Barracks is a derived view + persistent surface**, not flow-only.
  Exchange #4 ratified the unassigned-units pool; `barracksUnits` is
  `units` minus assigned, with no separate collection. No dedicated
  barracks view is needed.

## Our cost guess (please correct)

- Engine: **zero** — everything bound here is shipped. We may be wrong
  about `reorderParties` (we believe no such operator exists; Reorder
  Squads is recorded as a target verb with a forward-dep operator). Please
  confirm.
- Confirm the shipped signatures we recorded match (especially `equipItem`
  being 3-arg / inventory-consuming, `buyItem`'s 4-arg shape, and that
  `buyItem` does not decrement stock).

## What we want back

Decision (ratify the two specs into `docs/`), plus correction on any
signature we misrecorded and confirmation on the `reorderParties`
non-existence. Decision record destination: `roadmap-tier-1.md` §7 (next
free subsection) + operator contracts already in `troop-reference.md` §10.
