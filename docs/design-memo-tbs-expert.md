# Design Memo — TBS Expert Consultation

**Project:** boa-foodfight
**Context:** Round 4 of coevolution rebalancing. Baseline ant AI wins 82% (target 55–60%); spiders won 0% across all six ant variants in round 3. Watchability metrics are healthy. The diagnosis is structural, not stat-tuning: ants enjoy a shorter capture chain, free initiative on their home plane, and no information cost on aggression.

This memo draws specifically on Ogre Battle (March of the Black Queen and OB64 — the real-time-with-pause squad games), StarCraft Brood War + SC2, and Civilization IV: Beyond the Sword. Each recommendation is concrete enough to drop into a designer-agent proposal.

---

## Section 1 — Balance recommendations

### 1.1 Asymmetric capture chain — give spiders a parallel objective

**Source pattern (Civ IV / BtS):** Civ IV ships six victory conditions (Conquest, Domination, Cultural, Diplomatic, Space, Score). Asymmetric leaders are biased toward different paths so the same map can be won via wildly different routes. ([Victory in Civ IV — Civilization Wiki](<https://civilization.fandom.com/wiki/Victory_(Civ4)>))

**Translation:** Today the only ant win path is "walk POST chain → spider-web." Spiders only win by attrition (wipe field force or kill queen) — both are reactive. Add a _spider-only_ offensive victory: an "ant-queen siege" track of two new spider-controlled POSTs (e.g., `drain-grate` on the floor edge and `larder-raid` adjacent to storm-drain) that, when both are spider-held continuously for 3 ant turns, allow spiders to attack the ant queen at storm-drain even without breaching field force. This converts the spider strategic problem from "stop the ants" to "race the ants on a parallel chain," which is what the asymmetric design actually needs.

**Files/systems touched:**

- `data/level-1/map.json` — add 2 new POSTs with adjacency to floor.
- `engine/posts.ts` — add a continuous-hold counter (`heldFor: turns`) and a chain-completion check.
- `engine/end-of-turn.ts` — add new spider-win check.
- `ai/spider-l1.ts` — add target prioritization for the new chain.

**Expected effect:** Spiders gain a positive objective they can plan around, forcing ants to split forces (currently 5 parties all push the chain). Estimated 10–20pp swing toward spiders if the new POSTs sit in spider-friendly terrain (ceiling-adjacent or wall-adjacent edges).

### 1.2 Day/Night cycle as a structural counter-balance

**Source pattern (Ogre Battle 64):** Day/night is a global state that flips unit profiles. Vampires are immobile by day with bonus defense; certain classes get attack/move bonuses at night. The cycle is deterministic but creates predictable strategic windows. ([Ogre Battle 64 mechanics](https://lparchive.org/Ogre-Battle-64/Update%2002/))

**Translation:** Toggle a `phase: "day" | "night"` global on a fixed cadence (e.g., flip every 4 turns; turns 1–4 day, 5–8 night, etc.). At night: spiders gain `+1 attack, +1 agility`; ant-archer's `volley` halves its range (drawn from their light-dependent design hook); ant-scout's `scout-ping` is suppressed (`uses: 0` while night). At day: revert. This is one knob the designer-agents can tune (cadence + bonus magnitudes) and gives spiders forced-tempo windows rather than always reacting.

**Files/systems touched:**

- `engine/state.ts` — add `phase` field; advance it in turn-start hook.
- `engine/turn.ts` — emit phase-change events.
- `engine/combat.ts` — apply phase modifiers in damage calc.
- `engine/abilities.ts` — gate `scout-ping`/`volley` by phase.
- `data/level-1/abilities.json` — phase-conditional metadata.
- `ai/spider-l1.ts`, `ai/baseline.ts` — add phase-aware policy hooks.

**Expected effect:** Strong (10–15pp toward spiders) and the magnitude is dial-tunable. Also raises strategic depth — ant rush variant gets penalized for dive-bombing during night windows.

### 1.3 Plane-affinity terrain modifiers (front/back row analog)

**Source pattern (OB64):** Units have terrain ratings — most walk best on roads/grass, some on snow/mountain, some fly. Strongholds give defensive bonuses. ([OB64 mechanics](https://lparchive.org/Ogre-Battle-64/Update%2002/)) Combined with MotBQ's front/back-row positioning where wizards belong in back. ([OB MotBQ Army Building](https://gamefaqs.gamespot.com/snes/588541-ogre-battle-the-march-of-the-black-queen/faqs/57336))

**Translation:** Add a `planeAffinity: { floor, ceiling, wall }` field to `units.json` templates. Spider templates get `+1 attack/+1 armor` on ceiling, `0` on walls, `−1 attack` on floor. Ant templates get the inverse on floor, with ant-scout/ant-worker neutral on walls. Currently combat is plane-blind: a spider-elite fighting on the floor is statistically identical to one on its home ceiling, which is a tacit ant subsidy because the chain forces the fight onto ant-favored planes (floor → walls → ceiling endpoint).

**Files/systems touched:**

- `data/level-1/units.json` — `planeAffinity` per template.
- `engine/combat.ts` — read affinity off the party's current plane in `parties.ts`, apply in damage roll.
- `engine/types.ts` — extend stat-modifier type.
- Optional: `viewer/` — render affinity tooltip.

**Expected effect:** Moderate (5–10pp toward spiders) but high-leverage because it makes the geometric asymmetry actually _mean something_ rather than being flavor. Pairs naturally with rec 1.4.

### 1.4 Spider plane-switch as a free action; ant plane-switch as a turn-cost order

**Source pattern (StarCraft):** Asymmetry by _cost_, not by stats. The Terran Wraith and Protoss Scout fill structurally similar niches but at very different prices, which forces different macro decisions. ([Brood War Unit Design](https://www.scribd.com/document/323752622/Brood-Units))

**Translation:** Today `plane-switch` is `uses: 1` per scenario for both factions. Make it asymmetric:

- Spiders: `plane-switch` becomes a _passive_ — at corner edges, a spider party can move across the corner in the same turn it moved (no extra order). Free, unlimited, but only at corners.
- Ants: `plane-switch` stays at `uses: 1` per scenario, AND consumes the party's order for that turn.

This mirrors Brood War's "same niche, different cost" asymmetry and makes ceiling/wall traversal a spider competency rather than a shared one. The ant chain still ends at spider-web, but the spiders can actually maneuver around field-force pursuit instead of being pinned.

**Files/systems touched:**

- `data/level-1/abilities.json` — split into `spider-plane-switch` (passive) and `ant-plane-switch` (order).
- `engine/abilities.ts` — passive trigger on edge-cross movement.
- `engine/edges.ts` / `engine/movement.ts` — flag corner-cross moves.
- `data/level-1/roster-spiders.json`, `roster-ants.json` — assign new ability ids.
- All six ant AI variants and `ai/spider-l1.ts` — re-cost the action.

**Expected effect:** Strong (10–15pp toward spiders), and creates clear "harassment" gameplay where spiders flank around the chain — the StarCraft pattern of attacking economy/objectives rather than always fighting army-vs-army.

### 1.5 Pheromone trail (limited information warfare for ants only)

**Source pattern (StarCraft):** Fog of war + scouting is the central information layer. Asymmetric vision tools (Comsat sweep, Observer, Overlord detection) shape what each faction _can_ know. ([StarCraft Fog of War](https://starcraft.fandom.com/wiki/Fog_of_war))

**Translation:** Don't add full fog (would invalidate locked AI specs). Instead add _partial information cost_ to ants only: ant parties carry a `pheroTrail` — a 3-turn-decaying breadcrumb of their last positions, visible to spider AI policy. Spiders see the trail, not the live position; ants see everything. This caps ant-rush dominance because the spider AI can pre-position to intercept high-value parties without a full fog rewrite, while preserving the deterministic engine.

**Files/systems touched:**

- `engine/state.ts` — add `pheroTrails: Record<partyId, Array<{plane, x, y, age}>>`.
- `engine/end-of-turn.ts` — write/decay trail entries.
- `ai/policy-helpers.ts` — expose `getSpiderVisibleAntTrail()` (NOT `getAntPositions`); spider AI must call this.
- `ai/spider-l1.ts` — switch from `state.parties` ant scan to trail scan.
- `engine/types.ts` — type additions.

**Expected effect:** Direct counter to ant-rush and ant-dive variants (currently the worst matchups for spiders), targeted 5–10pp swing. Safe: deterministic, preserves replay invariants.

---

## Section 2 — Gameplay expansion recommendations

### 2.1 Leader-driven party identity (Ogre Battle leader class)

**Source pattern (OB MotBQ + OB64):** A unit must contain a leader; leader class determines party tactics, terrain bonuses, and which class promotions are unlocked. ([OB64 mechanics](https://lparchive.org/Ogre-Battle-64/Update%2002/))

**Translation:** Promote one unit per party to `leader: true` (already exists as a `tags: ["leader-eligible"]` concept). Leader's stats apply a party-wide modifier: an ant-mage leader gives the party `+1 intelligence` and unlocks a `mass-magic-arrow` ability slot; a spider-elite leader grants `+1 armor` party-wide. Killing a leader in battle forces an immediate morale check (e.g., next round each surviving member rolls 1d6 vs `constitution`; below-roll misses next attack). This adds a high-value target inside each party — currently every member is fungible.

**Files/systems touched:**

- `data/level-1/leaders.json` — already exists; extend with leader-effects schema.
- `data/level-1/formations.json` — designate leader slot.
- `engine/battle.ts` — leader-death morale check.
- `engine/combat.ts` — apply party-wide leader modifier.
- `ai/*.ts` — protect leader (defensive positioning).

**Expected effect:** Adds tactical depth without a mechanic rewrite (data + 2 engine hooks). Creates emergent gameplay: focus-fire-the-leader vs surround-the-leader. Watchability boost.

### 2.2 Civic slot system: 3 build-around levers per faction per game

**Source pattern (Civ IV):** Five civic categories (Government, Legal, Labor, Economy, Religion) where the player picks one option each. Anarchy cost on switch, but options are powerful enough to define a strategy. ([Civ IV: BtS — Civilization Wiki](https://civilization.fandom.com/wiki/Civilization_IV:_Beyond_the_Sword))

**Translation:** At scenario start (turn 0), each faction picks 1 option from each of 3 slots. Examples:

- **Doctrine slot:** `aggressive` (`+1 attack`, `−1 armor` party-wide) | `defensive` (inverse) | `mobile` (`+1 agility`, `−1 hp`).
- **Logistics slot:** `forage` (workers/spiderlings auto-heal 1 hp/turn) | `siege` (POST capture takes 1 fewer turn) | `recruit` (`recruit` ability `uses +1`).
- **Doctrine slot:** `pheromone` (ant) / `silk` (spider) — faction-specific third axis.

Choices are locked for the scenario, deterministic, and visible to opponents (no hidden info). Six ant variants × 6 spider variants = 36 strategic shapes the AI can navigate, hugely increasing diversity-floor signal.

**Files/systems touched:**

- `data/level-1/civics.json` (new file).
- `engine/state.ts` — `civics: { ant: {...}, spider: {...} }` on init.
- `engine/combat.ts`, `engine/abilities.ts` — apply civic modifiers.
- `ai/types.ts` — civic-aware policy interface.
- All AI variants — pick civics in opening; the ant-firepower designer agent gains a much wider design surface.

**Expected effect:** Strategic depth jump and a natural axis for the coevolution loop to explore. Existing diversity metric becomes more meaningful.

### 2.3 Recruit-to-promote class chain (Ogre Battle promotion)

**Source pattern (OB MotBQ):** Class change requires level + charisma + alignment-in-range. The promotion gating is what makes army-building strategic instead of just stat-stacking. ([OB MotBQ — promotion](https://gamefaqs.gamespot.com/snes/588541-ogre-battle-the-march-of-the-black-queen/faqs/57336))

**Translation:** Units gain a single `kills` counter (already implicit in battle resolution — just expose it). When `kills >= 3`, a unit can promote at the queen's POST (storm-drain or spider-web): ant-footman → ant-veteran (`+2 hp, +1 attack`), spider-soldier → spider-warden (`+1 armor, gains brace`). Promotion costs the queen's order for that turn. This adds a pull-back-to-base loop and gives the queen a non-`queen-ultimate` job.

**Files/systems touched:**

- `engine/state.ts` — `unit.kills: number`.
- `engine/combat.ts` — increment on kill.
- `engine/abilities.ts` — new `promote` order issuable only at queen POST.
- `data/level-1/units.json` — add `promotionTo` field.
- `data/level-1/roster-*.json` — define promoted templates.

**Expected effect:** Adds a meaningful late-game tempo decision and a positive feedback loop on successful skirmishing. Likely small balance impact but large gameplay-depth impact.

### 2.4 Alignment-style "aggression score" as a behavior modifier

**Source pattern (OB MotBQ):** Per-character alignment (0–100) plus army-wide reputation. Moves on the moral axis change which units join, which endings unlock, and how battles resolve. ([Alignment & Reputation — StrategyWiki](https://strategywiki.org/wiki/Ogre_Battle:_The_March_of_the_Black_Queen/Alignment_%26_Reputation))

**Translation:** Track a per-faction `aggression: number` (0–100, starts at 50). Increase when you initiate combat against a smaller party; decrease when you initiate against a larger or queen-adjacent party. `recruit` ability gates differently by aggression — at high aggression spiders recruit `mouse-mercenary` (already in roster) cheaply; at low aggression they recruit `spiderling` cheaply. Adds a long-term consequence to early-game tactical choices and gives the coevolution loop a visible scalar to track diversity on.

**Files/systems touched:**

- `engine/state.ts` — `aggression: { ant, spider }`.
- `engine/battle.ts` — adjust on engagement initiation.
- `engine/abilities.ts` — gate `recruit` by aggression band.
- `ai/policy-helpers.ts` — expose aggression band.
- `data/level-1/abilities.json` — recruit cost-tiers.

**Expected effect:** Light-touch system that complements 2.2's civic axis. Useful for the diversity floor metric.

### 2.5 Espionage-lite: queen-ultimate redesign as a one-shot info strike

**Source pattern (Civ IV BtS):** Espionage points + Great Spy give targeted disruption (citizen unrest, tech steal, etc.) — a one-shot that's expensive but decisive. ([Civ IV: BtS — espionage](https://www.gamespot.com/articles/civilization-iv-beyond-the-sword-hands-on-espionage-corporations-and-more/1100-6172983/))

**Translation:** Currently `queen-ultimate` is a single ability we don't have rich design on. Make it a one-shot espionage strike: revealing all enemy parties' next-turn intent (their queued order) for one turn. Costs the queen's order for 2 consecutive turns (high opportunity cost) and is `uses: 1` per scenario. Counters scout-ping for spiders, counters spider-snare prepositioning for ants. Pairs naturally with rec 1.5's pheroTrail.

**Files/systems touched:**

- `data/level-1/abilities.json` — re-spec `queen-ultimate`.
- `data/level-1/queen.json` — queen order budget.
- `engine/abilities.ts` — peek-next-order implementation.
- `ai/*.ts` — opt-in usage.

**Expected effect:** Adds a high-stakes climactic ability without rebalancing the queen herself. Makes queen-at-risk decisions more interesting.

---

## Section 3 — What to skip

- **Civ IV–style tech tree.** A research dependency graph assumes a long game arc with cumulative investment. boa-foodfight maxes at 30 turns and victory is positional, not economic. A tech tree would slow the game without changing the win-condition shape — exactly the wrong direction.
- **Civ IV religion / great-people generation.** Great-people require specialist slots and city-level economies the game doesn't have. Religion's main effect (diplomatic modifier) presumes >2 factions; with two asymmetric factions it collapses to a flag.
- **Civ IV vassal / colony cost.** Vassalage rewards a snowballing-conquest game state. boa-foodfight's win-by-POST-capture already short-circuits before "vassal of whom?" becomes meaningful.
- **Full StarCraft fog of war.** Locked engine semantics + deterministic replay + spec-locked baseline AI. A vision-radius rewrite invalidates `ai/baseline.ts` regression tests. The pheroTrail (rec 1.5) is the right-shape borrow.
- **StarCraft macro / production cycles.** No resource economy and no per-turn build queue exists; bolting one on duplicates `recruit` and pushes the game toward 4X. Stay in the squad-ops genre.
- **OB MotBQ tarot/zodiac stat rolls.** Pre-battle randomized modifiers undermine the deterministic-replay invariant. Skip.
- **OB64 tactic selection (Strong/Weak/Leader targeting).** Tempting but redundant: battle resolution is already auto-resolved over rounds. Adding a targeting-tactic selector would re-invent combat.ts and break locked engine semantics.
- **Real-time-with-pause overworld.** The defining OB feel, but the game is turn-based and the AI / replay infra assumes discrete turns. Don't port the pacing.
- **Multiple religions / civic anarchy cost.** The civic slot recommendation (2.2) deliberately _strips_ the anarchy switching-cost — adding it would punish the AI for adapting and damage the diversity floor.

---

## Section 4 — Priority ranking (top 3, biggest impact / lowest cost)

1. **Rec 1.4 — Asymmetric plane-switch costs (spider-passive / ant-order).** Smallest code surface (one ability split + a corner-move flag), strongest direct balance effect, and it makes the core geometric asymmetry of the game _load-bearing_ instead of cosmetic. Borrowed from StarCraft's "same niche, different cost" design.
2. **Rec 1.3 — Plane-affinity stat modifiers.** Pure data change in `units.json` plus one read in `combat.ts`. Composes with 1.4. Closes the "spider on floor = ant on floor, statistically" silent subsidy.
3. **Rec 1.2 — Day/night cycle.** Single global state field, dial-tunable cadence and magnitude — perfect for the coevolution gate to discover the right setting. Provides spiders forced-tempo offensive windows, which the data shows is the missing axis.

Recs 1.1 (parallel capture chain) and 2.2 (civic slots) are the next tier — high impact, but each is roughly 4× the implementation cost of any item in the top 3.

---

### Sources

- [Ogre Battle: The March of the Black Queen — Wikipedia](https://en.wikipedia.org/wiki/Ogre_Battle:_The_March_of_the_Black_Queen)
- [OB MotBQ Alignment & Reputation — StrategyWiki](https://strategywiki.org/wiki/Ogre_Battle:_The_March_of_the_Black_Queen/Alignment_%26_Reputation)
- [OB MotBQ Army Building Guide — GameFAQs](https://gamefaqs.gamespot.com/snes/588541-ogre-battle-the-march-of-the-black-queen/faqs/57336)
- [Ogre Battle 64: Game Mechanics Megadump — LP Archive](https://lparchive.org/Ogre-Battle-64/Update%2002/)
- [BW Cheat Sheet — Unit Counters & Builds (TL.net)](https://tl.net/forum/brood-war/515230-bw-cheat-sheet-unit-counters-builds)
- [Brood War Unit Design Overview](https://www.scribd.com/document/323752622/Brood-Units)
- [StarCraft Fog of War — Fandom](https://starcraft.fandom.com/wiki/Fog_of_war)
- [StarCraft Scouting — StrategyWiki](https://strategywiki.org/wiki/StarCraft/Scouting)
- [Civilization IV: Beyond the Sword — Civilization Wiki](https://civilization.fandom.com/wiki/Civilization_IV:_Beyond_the_Sword)
- [Civ IV BtS Hands-On — Espionage, Corporations, and More (GameSpot)](https://www.gamespot.com/articles/civilization-iv-beyond-the-sword-hands-on-espionage-corporations-and-more/1100-6172983/)
- [Victory in Civ IV — Civilization Wiki](<https://civilization.fandom.com/wiki/Victory_(Civ4)>)

---

## Section 5 — User-authored expansion specs (for a later phase)

These are queued, not implemented. The current immediate work is the top-3 plus rec 1.5.

### 5.1 Worker barriers + arachnoram

- Worker ants gain a `build-barrier` 3-turn ability.
- Barriers occupy a tile, block movement.
- Barriers can only be broken by a new spider unit, the **arachnoram**: strong against buildings (POSTs treated as buildings for this niche), weak against infantry / foot soldiers.
- **Open design points** to resolve before implementation: hard "only-arachnoram-can-break" rule risks unwinnable states; need placement constraints (probably adjacent to worker, never on POST/queen tiles); decide whether arachnoram also accelerates POST capture.

### 5.2 Neutral parties

- 3 neutral parties per scenario, never spawning on the same plane (one per surface, mice restricted to floor/ceiling).
- Three types:
  - **Mice** (3 units): large; floor + ceiling only; no plane-switching (cannot move off spawn plane).
  - **Cockroaches** (8 units): ferocious fighters; 10% chance per attack to hit own party.
  - **Stinkbugs** (2 units): on failed recruit/hypnotize, leave a 5-tile damage block (1 hp/turn to all non-stinkbug units, decays 1 hp/turn over 5 rounds).
- **Recruit (ants):** ant-mage uses the existing `recruit` ability; permanent conversion. Same 25% success rate as spiderling recruit.
- **Hypnotize (spiders):** any spider unit may attempt; costs the caster half its current HP. 80% success rate. Roll % between 5 and 10 turns of spider control.
- After hypnosis ends, neutral becomes immune from spider hypnosis for 10 turns and tries to escape from spider parties (creates ant-recruit window).
- Default behavior: random walk on spawn plane.
- While hypnotized: seeks out and fights ants.
