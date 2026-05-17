# Level Progression Plan — Tier 1 (L1–L10)

**Owner:** Level Progression Agent (solo, per `docs/roadmap-tier-1.md` §6.2).
**Status:** Phase-C planning deliverable. Document only.

Per-scenario environment design for the full Tier-1 campaign. Refines (not
replaces) the §4.1 room sequence, respects the §4.3 special objectives,
follows the §6.3 mechanic-ownership rule, and stays inside the verified engine
constraints below. References — does not duplicate — `game-outline.md`, the
TBS memo, and the Mechanics memo.

---

## 0. Engine reality (verified against source)

- **Grid is 10×10, hardcoded.** `engine/map-gen.ts:66` `const GRID = 10`; no
  per-map dimension is honored. `static: true` (L2 pattern) ships literal
  tiles but still 10×10.
- **Plane set is the fixed 6:** floor, ceiling, north/south/east/west-wall.
  Spec's Underfloor/Inside-Wall are not in the engine. "Reduced plane sets" =
  a `static` map that only places passable tiles on a subset (L2 uses only
  floor+ceiling).
- **Victory kinds implemented:** `capture-post` and `escort` only
  (`engine/schemas/map.ts:21–29`, a 2-member union; `end-of-turn.ts` dispatches
  only those). **`eradicate` (L6) and `recruit-count` (L8) do not exist** —
  Phase-D work (§3).
- **Movement is greedy Manhattan-descent**, no BFS. Every corridor here is
  verified greedily navigable: at every reachable tile a non-obstacle neighbor
  strictly closer (Manhattan) to the objective exists. L2's proven invariant is
  `|x−y| ≤ 1`; this plan reuses or restates the equivalent invariant per shape.

**Technique used throughout:** obstacle-approximation — distinct room _feel_
from obstacle layout + active-plane subset + `static` + POST placement, never
from non-10×10 dimensions. Every literal §4.1 dimension is re-expressed as an
obstacle mask inside 10×10; fidelity loss is flagged as a Phase-D dependency.

---

## 1. Final L1–L10 sequence

| #   | Room        | Victory         | Identity                                            |
| --- | ----------- | --------------- | --------------------------------------------------- |
| L1  | Bathroom    | capture-post    | Spec-locked tutorial; canonical "all systems" ref.  |
| L2  | The Pipe    | escort          | 1-D channel; plane-switch is the only flank.        |
| L3  | Kitchen     | capture-post    | Center island splits room into two approach lanes.  |
| L4  | Hallway     | capture-post    | Long axis; POST-randomization debut; light-switch.  |
| L5  | Bedroom     | capture-post    | Bed bisects the floor; first concealment POST.      |
| L6  | Stairs      | eradicate\*     | Terraced vertical stack; flyers favored; no turtle. |
| L7  | Living Room | capture-post    | Largest open arena (3 clusters); card economy.      |
| L8  | Attic       | recruit-count\* | Cramped, clipped ceiling; cockroach recruit race.   |
| L9  | Basement    | capture-post    | Dim; water hazards; player-flippable sump-pump.     |
| L10 | Garage      | capture-post    | Climax; multi-cluster boss arena; all systems on.   |

`*` = victory kind not yet implemented; Phase-D dependency.

---

## 2. Per-scenario design

Each: (1) room+narrative, (2) geometry, (3) POSTs, (4) victory, (5) environment
mechanic, (6) interest intent vs the §5 win-curve.

### L1 — Bathroom (capture-post)

1. Spec-locked (`game-outline.md`, "Level 1"). Storm-drain emergence; spider
   ceiling web. Frozen as the "all mechanics on" reference (roadmap §2). Not
   redesigned — it is the baseline the other nine deviate from.
2. As shipped (`data/level-1/map.json`): 10×10, all 6 planes, near-square; wet
   band + tub obstacle clusters; per-seed procedural (the only scenario using
   `map-gen.ts`; L2–L10 are `static`). Entrance storm-drain (0,0 floor) →
   objective web (9,9 ceiling).
3. 5 spec-fixed POSTs: Storm Drain (home, floor 0,0), Soap Dish (neutral 5,5),
   Towel Rack ↔ Wall Crack (plane-transition pair), Spider Web (objective).
4. `capture-post` → `spider-web`. Implemented. Loss: Queen dies.
5. None new — persistent fog only (§3.1 floor: pheromone-erasure is L2+).
6. Pedagogical; geometry deliberately least-distinct. §5 75%; geometry adds
   nothing to the curve by design.

### L2 — The Pipe (escort)

1. Colony moves through the wall pipe toward the kitchen sink (§4.1 L1→L2→L3
   pipe motif). Aunt Ant (future kitchen queen, non-combatant) escorted end to
   end.
2. As shipped (`data/level-2/map.json`): `static`, 2 planes (floor, ceiling).
   3-wide anti-diagonal channel, obstacle-masked, invariant `|x−y| ≤ 1` so
   Manhattan-descent never sticks. 1-wide ceiling skylight = the only flank
   around a held pinch. The proven format-break template all narrow shapes
   here imitate.
3. 4 floor-line POSTs: Pipe Entrance (home/escort start), Pipe Joint &
   Drain Cap (optional chokepoints, not required), Pipe Exit (objective).
4. `escort` → `aunt-ant` to `pipe-exit`. Implemented/shipped. Loss: Aunt Ant
   dies OR Queen dies.
5. Pheromone-erasure debuts (§3.1 floor — Gameplay-owned, §4). The _spatial_
   mechanic is the 1-D channel itself — Level-owned, no boundary case.
6. Pursuit/hold, not a POST race; spiders hold pinch-points (§4.3.1). §5 ~72–76
   (shipped at 76%).

### L3 — Kitchen (capture-post)

1. Aunt Ant installed; kitchen forward base. Bio-evolution debuts here
   (roadmap §3.4 item 5 — a Gameplay unit mechanic, not Level's; noted, not a
   boundary case).
2. `static`, 10×10, **4 planes** (floor, ceiling, north-wall, east-wall — a
   _reduced_ set vs L1, flatter feel). Central **island**: 3×3 floor obstacle
   ~(4–6,4–6) → two ≥3-wide greedily-navigable lanes (north rows 0–3, south
   rows 7–9; verified: from any lane tile a closer-to-corner open neighbor
   exists). Entrance sink-drain (0,9 floor, L2 continuity); objective far
   counter (9,0 floor).
3. 6 POSTs: Sink-Drain (home), Crumb-Pile (neutral, north lane), Counter-Edge
   (objective, +3 def), Stove-Hood ↔ Backsplash (plane-transition pair around
   the island), Pantry (neutral, south lane). Two lanes = two chain routes →
   route diversity (spec criterion).
4. `capture-post` → `counter-edge`. Implemented.
5. Island geometry only (Level-owned). Class-change is Gameplay, never touches
   terrain — no boundary case.
6. First "which lane?" decision; flank timing matters. §5 ~70. Island gives
   the defender interior lines — slight spider nudge (Gameplay-PA's call).

### L4 — Hallway (capture-post)

1. Push out of the kitchen into the house hallway thoroughfare.
2. `static`, 10×10. §4.1's 6×16 → a **4-wide corridor band** along rows 3–6,
   all 10 columns; rows 0–2/7–9 obstacle paneling. 3 planes (floor, ceiling,
   north-wall). Straight axis = trivially greedy (every column-step toward the
   end-objective is open in-band). Literal 6×16 not expressible →
   **Phase-D fidelity dependency** (§3.5).
3. 6 POSTs: Hall-Threshold (home, col 0), three **Doorway** POSTs at cols 3/5/7
   (seed-randomized row in-band — see mechanic), End-Door (objective, col 9,
   high def), Light-Switch (flip-state POST, mid-corridor wall).
4. `capture-post` → `end-door`. Implemented.
5. Two mechanics: **(a) POST-randomization debut** — Doorway POSTs fixed
   column, seed-jittered row. Purely spatial → **Level-owned, no boundary
   case**; needs a small Phase-D `jitter` field on `static` maps (§3.3).
   **(b) Light-Switch flip-state POST** toggling a global combat modifier →
   **boundary case, flagged for human review** (§4).
6. Randomized doorways defeat pre-planning → §5 ~60 (randomization shock toward
   spider); single long axis removes flanking, raises variance.

### L5 — Bedroom (capture-post)

1. Off the hallway into the bedroom; the bed dominates the floor.
2. `static`, 10×10, **all 6 planes** (room "opens back up" after L3/L4's
   reduced sets). **Bed**: 6×5 floor obstacle (2–7,3–7) bisecting the floor
   into a north strip (rows 0–2) and south strip (rows 8–9), connected at both
   column ends (cols 0–1, 8–9 open top-to-bottom) — greedy-navigable around
   either end (verified). Ceiling over the bed is fully open → ceiling is the
   premium route.
3. 6 POSTs: Nightstand (home), Under-Bed (concealment POST — fog-immune
   garrison; reachable only via plane-transition since the bed blocks the
   floor), Headboard ↔ Ceiling-Fan (plane-transition pair onto the open
   ceiling), Pillow-Fort (high-def neutral, ceiling), Dresser-Top (objective,
   far corner).
4. `capture-post` → `dresser-top`. Implemented.
5. **Under-Bed concealment / fog-immunity** → **boundary case, flagged**
   (§4). Bed-as-obstacle bisection is purely Level-owned.
6. First info-asymmetry room; holding Under-Bed denies spider trail-scouting
   (TBS §1.5). §5 ~65 (rebound — player-favorable tool).

### L6 — Stairs (eradicate — ENGINE DEPENDENCY)

1. Ascend the staircase to the upper floor. Format-break partner to L2 (§4.1).
   Total spider eradication (§4.3.2).
2. `static`, 10×10. §4.1's "5 stacked floor planes" is **not expressible**
   (planes aren't interchangeable floors). Realized as **five terraced bands**
   on one floor plane (rows 0–1/2–3/4–5/6–7/8–9) connected only by 1-wide
   zig-zag **step gaps** offset per landing; ceiling = the flyer lane. Vertical
   greedy-navigability holds: the step gap is always the unique
   Manhattan-closer tile toward an upper-landing target (always open, no
   trap). Flyers/climbers skip gaps via existing unit-type movement. 2 planes.
3. 5 **Step-Landing** POSTs, one per terrace (heal/stage only — no capture
   chain). Ant queen bottom landing; spiders scattered on the upper four.
4. **`eradicate`** — kill all spider parties. **NOT IMPLEMENTED**
   (`engine/schemas/map.ts` lacks it). **Phase-D dependency** (§3.1). Timeout
   default must be **ant-loss** (§4.3.2) — also new engine behavior
   (`turn.ts` special-cases only `escort` today).
5. **Vertical traversal** as a spatial constraint — funnel non-flyers through
   step gaps. **Level-owned**: pure geometry × existing unit-type movement, no
   new combat behavior. No boundary case.
6. Turtling is useless — must climb and hunt. Geometry strongly favors the
   high-ground defender. §5 ~55 (novelty favors spider — curve intent).

### L7 — Living Room (capture-post)

1. Break into the open living room — the tier's largest, most open arena.
2. `static`, 10×10, all 6 planes. §4.1's 14×14 L-shape not expressible →
   approximated by a 10×10 floor with three small **2×2 furniture clusters**
   (Couch NW, Coffee-Table center, TV-Stand SE) plus an SE obstacle wedge for
   the L. Clusters small/offset → no concave pocket traps a party; greedy to
   any corner (verified). **Phase-D fidelity dependency** (§3.5) — loses the
   "feels big" payoff.
3. 7 POSTs (largest count, biggest room): Floor-Vent (home), Couch-Cushion
   (+4 def), Coffee-Table-Top (plane-transition), Remote (**currency POST** —
   bonus gold/turn), TV-Stand (neutral), Bookshelf (transition endpoint),
   Mantel (objective, far corner).
4. `capture-post` → `mantel`. Implemented.
5. **Remote currency POST** (gold/turn) → **boundary case, flagged** (spatial
   node, economy payload — §4). Three-cluster geometry is Level-owned.
6. Open arena = maneuver warfare; Remote feeds the card economy that "starts
   paying off here." §5 ~65 (rebound — player has cards).

### L8 — Attic (recruit-count — ENGINE DEPENDENCY)

1. Climb into the cramped box-filled attic. Variety bookend #1.
   Cockroach recruit-or-die (§4.3.3).
2. `static`, 10×10. §4.1's 8×8 + 5×5 ceiling → navigable floor is an **8×8
   core** (rows/cols 1–8; outer ring obstacle "eaves"); ceiling **clipped to a
   5×5 core** (rows/cols 2–6). ~10 scattered single-tile box obstacles placed
   so no 3×3 open square exists but every open tile keeps a Manhattan-closer
   open neighbor (greedy, just twisty). 2 planes.
3. 6 POSTs: Hatch (home), Trunk (treasure, center), Rafter-Beam (ceiling),
   Skylight (one-way floor→ceiling transit — see below), 2 Box-Fort neutrals.
   No capture chain.
4. **`recruit-count`** — recruit ≥4 cockroach parties, queen alive (§4.3.3).
   **NOT IMPLEMENTED.** **Phase-D dependency** (§3.2): new victory member +
   counter + dual loss (queen dead OR all ant-mages dead). Attic spawns ~8
   cockroach neutrals (a data knob); the win check is new engine code. One-way
   Skylight transit is also new (transitions are bidirectional today).
5. Clipped-ceiling box-maze geometry = Level-owned. High cockroach density /
   recruit-race = Gameplay (noted, not a Level boundary). **One-way plane
   transit** → **boundary case, flagged** (spatial vs movement-rule, §4).
6. The "hard level before the end" spike (§5 ~50). Cramped maze makes the queen
   hard to screen while ant-mages chase recruits — geometry compounds tension.

### L9 — Basement (capture-post)

1. Descend into the dim damp basement. Variety bookend #2. First
   player-controllable environment mechanic.
2. §4.1's 12×12 + Underfloor plane: neither exists. `static`, 10×10; the
   "underfloor" is re-mapped onto the otherwise-unused **`south-wall` plane as
   a low crawlspace**, paired to the floor via a normal plane-transition (no
   7th plane invented). 3 planes (floor, ceiling, south-wall-crawlspace). Floor
   carries **water `kind: "hazard"` tiles** (engine already supports this —
   confirmed in `data/level-1/map.json`, `hazardDamage: 1`): 3–4 puddles
   (movementCost 2 but passable, so descent is taxed, never trapped — detour
   lanes kept open; greedy-navigable). Entrance stairs (0,0) → objective (9,9).
3. 6 POSTs: Stairwell (home), Boiler (**hazard-emitting POST**), Workbench
   (neutral), Sump-Pump (**water-control POST**), Crawlspace-Mouth
   (plane-transition pair), Fuse-Box (objective).
4. `capture-post` → `fuse-box`. Implemented.
5. **Sump-Pump** (owner toggles water hazards on/off) and **Boiler**
   (radiates hazard to adjacent tiles) → **two boundary cases, flagged** (§4 —
   §6.3 names "basement water" explicitly). Static water tiles are Level-owned;
   the player-toggle and POST-emission cross the line.
6. First time the player _shapes_ the field — flood the spider approach or
   drain to advance. §5 ~60 (player-favorable tool).

### L10 — Garage (capture-post)

1. Tier-1 finale; all systems on. Spider queen swears fealty on victory
   (`game-outline.md` bridge, generalized to tier end).
2. §4.1's 16×12 not expressible. `static`, 10×10, **all 6 planes** (max
   richness, bookends L1; only L2–L10 scenario using all 6). Three clusters:
   Workbench (W), **Car** (3×3 center — the dominant arena divider),
   Shelving (E). Car splits floor into north/south passages (≥2 wide, greedy
   around either end, verified); open walls/ceiling make the "over the car"
   plane-transition route real. **Phase-D fidelity dependency** (§3.5) — the
   biggest gap, since the finale is where scale matters most.
3. 7 POSTs: Side-Door (home), Tool-Rack (narrative shop hook; mechanically a
   high-heal POST — shops are world-loop, §6.5, not in-scenario), Car-Hood
   (plane-transition), Workbench (def), Shelving (transition endpoint),
   Garage-Door (neutral), Engine-Block (objective — boss arena, highest def in
   tier).
4. `capture-post` → `engine-block`. Implemented.
5. **Day/night cycle activates here** (§4.1; TBS §1.2) — global combat-profile
   flip → **boundary case, flagged** (§6.3 names it explicitly, §4).
   Multi-cluster geometry is Level-owned. Tool-Rack "shop extension" is
   world-loop narrative, not an in-scenario mechanic — noted, not a boundary.
6. Genuinely close finale (§5 ~50); day/night forced-tempo windows over the
   densest obstacle field of the tier.

---

## 3. Engine dependencies (Phase-D input)

Capabilities L3–L10 rely on that **do not exist** today. Verified against
`engine/schemas/map.ts`, `end-of-turn.ts`, `map-gen.ts`, `turn.ts`, the L1/L2
map data.

1. **`eradicate` victory kind (L6).** New union member + `end-of-turn.ts`
   dispatch + configurable timeout default (ant-loss; `turn.ts` special-cases
   only `escort` today).
2. **`recruit-count` victory kind (L8).** New member (`target` count +
   `unitTemplateId`) + counter in `end-of-turn.ts` + dual loss (queen dead OR
   all ant-mages dead).
3. **Per-seed POST jitter on `static` maps (L4).** A loader-resolved `jitter`
   (fixed column, seed-chosen row in a band) without abandoning `static`.
4. **One-way plane transition (L8 Skylight).** A direction flag honored by the
   transition/movement code (transitions are bidirectional today).
5. **Larger / elongated maps (L4, L7, L10 — fidelity gap, not a blocker).**
   `GRID = 10` hardcoded (`map-gen.ts:66`). All such rooms ship via
   obstacle-approximation, but the long-hallway / big-living-room / big-garage
   _feel_ is degraded. A map-gen refactor honoring per-map `width`/`height`
   (incl. non-10×10 `static`) is the single highest-leverage quality
   investment, most felt at L7/L10.
6. **Dynamic terrain state (L9).** Player-toggleable hazard region + POST-driven
   hazard emission. The static `hazard` tile type exists; the dynamic toggle
   /emission does not. (Also a boundary case — §4.)
7. **Concealment / fog-immunity POST property (L5).** New POST behavior
   interacting with the fog/pheromone layer. (Also a boundary case — §4.)
8. **POST-bound / cadence global combat modifier (L4 light-switch, L10
   day/night).** A flip-state POST or turn-cadence global altering combat
   engine-wide. (Both boundary cases — §4.)

**Engine dependencies flagged for Phase D: 8.**

---

## 4. Mechanic-ownership boundary cases

Per §6.3: unit/combat/faction = Gameplay; spatial/environmental = Level;
line-crossers are **flagged for human resolution, not claimed**. The Level PA
claims none of these.

1. **L4 Light-Switch flip-state POST → global combat modifier.**
   _Recommendation: split._ Level owns the POST (position, flip-state-ness);
   Gameplay owns the combat-resolution payload. Spatial trigger, non-spatial
   effect — §6.3 reserves combat changes for Gameplay.
2. **L5 Under-Bed concealment → garrison fog-immunity.**
   _Recommendation: Level, with Gameplay sign-off._ Concealment is
   terrain-driven and positional (like stealth grass in TBS games), but it
   changes what the spider AI/info layer perceives (TBS §1.5) — Gameplay must
   confirm it doesn't invalidate locked AI specs.
3. **L7 Remote currency POST → bonus gold/turn.**
   _Recommendation: Gameplay owns economy; Level owns the node._ Same split
   pattern as L4 — spatial trigger, economy payload (feeds Mechanics §1.3
   cards).
4. **L8 Skylight one-way plane transit.**
   _Recommendation: Level._ Connectivity is core Level territory
   (`game-outline.md` "World model"); "one-way" is a connectivity property,
   not combat. Flagged only because it changes the engine's bidirectional
   transition rule — needs engine-owner confirmation it doesn't break movement
   AI.
5. **L9 Sump-Pump player-toggleable hazard tiles.**
   _Recommendation: split._ Level owns the water region + the controllable
   pump-node; Gameplay owns the damage. §6.3 pre-identifies "basement water" —
   the clearest line-crosser; don't let either agent claim it whole.
6. **L9 Boiler hazard-emitting POST.**
   _Recommendation: same split as #5; bundle the human decision_ — shares the
   dynamic-hazard engine surface.
7. **L10 Day/night cycle.**
   _Recommendation: Gameplay._ §6.3 raises it explicitly. A global
   turn-cadence state flipping unit combat profiles (TBS §1.2); uniform across
   all tiles, no spatial stake. Level only schedules _where in the tier_ it
   debuts (L10).

**Mechanic-ownership boundary cases flagged for human review: 7.**

Deliberately _not_ flagged (clean handoffs): L3 bio-evolution debut and L8
cockroach recruit-race (pure Gameplay, no spatial component); all obstacle
layouts, plane-set reductions, POST-randomization, and the
1-D/terraced/island/bisection geometries (pure Level spatial).

---

## 5. Deviations from §4.1

1. **No sequence reorder or room replacement.** L1–L10 rooms and order are kept
   exactly. The house-walk narrative is coherent and honors the user's
   logical-progression idea (roadmap §4). The "reorder/replace with
   justification" license is deliberately not exercised — the proposed
   sequence is sound. (The §1 header note about "one reorder/replacement"
   present in an earlier draft is withdrawn; there are none.)
2. **All literal dimensions → obstacle-approximation inside 10×10.** §4.1's
   4×16, 6×16, 14×14, 8×8+5×5, 12×12, 16×12, and "5 stacked floor planes" are
   not expressible (`map-gen.ts:66`; fixed 6 planes). All delivered as obstacle
   masks / reduced plane sets per the L2 precedent. A _realization-method_
   deviation, not a design-intent one; fidelity gaps (worst at L7/L10) flagged
   §3.5 as the top Phase-D quality lever.
3. **L9 "Underfloor plane" → `south-wall` repurposed as crawlspace.** No
   Underfloor plane exists; adding a 7th is out of scope (Mechanics memo §3
   skips new planes). Same hidden-sub-route experience, zero new planes.
4. **L6 "5 floor planes" → single terraced floor + ceiling flyer lane.**
   Planes aren't interchangeable stacked floors; terraces preserve the
   vertical-traversal intent and the flyer-favored payoff.
5. **POST counts set to the §4.2 5–8 rule** (L1:5, L2:4, L3:6, L4:6, L5:6,
   L6:5, L7:7, L8:6, L9:6, L10:7). L2 at 4 is the shipped, intentional escort
   exception — pre-existing, not a new deviation.

Win-rate figures are quoted from roadmap §5 only to mark where geometry alone
nudges the curve; the Level PA does not set win rates (Gameplay PA does, §6.2).

---

## 6. Handoff summary

- Sequence: §1. Seven `capture-post` (L1,3,4,5,7,9,10), one `escort` (L2,
  shipped), one `eradicate` (L6, Phase D), one `recruit-count` (L8, Phase D) —
  matches roadmap §4.3 / §8-resolved.
- **8 engine dependencies** for Phase D (§3).
- **7 mechanic-ownership boundary cases** for human review (§4).
- Top Phase-D quality lever: the 10×10 map-gen refactor (§3.5) — not a
  correctness blocker, but the biggest environment-variety unlock, most felt
  at L7 and L10.
