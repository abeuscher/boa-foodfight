# Design Memo — Mechanics Research (FF3 / Chrono Trigger / Risk 2210 / Ogre Battle)

**Project:** boa-foodfight
**Context:** Phase 4 mechanics research. The prior memo (`docs/design-memo-tbs-expert.md`) settled balance levers (asymmetric plane-switch, plane-affinity, day/night). Since then the game has accreted a lot of structure: pre-game placement (R7), neutral parties (R8/R10/R11), gold without a sink (R12), 6-template item slot (R14), HP-threshold + Lanchester retreat (R15/R16), 2-turn POST hold to win (R17), and web-guard heal priority (R18). This memo proposes **6 mechanics** drawn from Final Fantasy III (NES/3D), Chrono Trigger, Risk 2210 A.D., and Ogre Battle (MotBQ + OB64) to fill the remaining design gaps — chiefly: gold has no use, items are flat +1 buffs, queens are passive sinks, and there is no late-game pressure to break stalemates.

The research target was deliberate per-game: FF3 for class/MP shape, Chrono Trigger for combo abilities under ATB, Risk 2210 for time-bounded resource economies, and Ogre Battle for the morale/charisma/formation patterns the prior memo only sampled. Each pick is sized for a 30-turn squad-ops loop and preserves the deterministic-replay invariant.

---

## Section 1 — Six selected mechanics (priority order)

### 1.1 — Tiered MP pool ("spell-level slots") for ant-mage and spider-witch

**Source pattern (FF3 NES):** FF3's MP system is per-spell-level, not a single shared pool. "MP is divided into 8 levels, and a character must have at least 1 MP of a given level to cast a spell of that level. Each time they do, their current MP for that level is decreased by 1. Characters cannot use higher-level MP to cast a lower-level spell once they run out of MP for a particular level." ([Final Fantasy Wiki — Magic tier system](https://finalfantasy.fandom.com/wiki/Magic_tier_system); [StrategyWiki — FF3 Jobs](https://strategywiki.org/wiki/Final_Fantasy_III/Jobs)) The effect is that big spells are intrinsically scarce regardless of how much fighting you have done that scenario.

**Translation:** Today abilities have a flat `uses: N` per scenario. Replace the caster's `uses` with a 3-tier slot pool: `slotsT1: 4, slotsT2: 2, slotsT3: 1`. Each ability declares `tier: 1|2|3`. `pheroblast` is T1, `recruit` is T2, `queen-ultimate` is T3. T2 abilities cannot drain from T1, so a player cannot grind out a single ult by skipping fluff. This makes the queen and ant-mage feel like FF3 magic users — limited by a structured pool, not a single global counter — and gives spider-witch (or whichever spider unit picks up casting) parity scaffolding.

**Files/systems touched:**

- `data/level-1/abilities.json` — add `tier` field to each casting ability.
- `data/level-1/units.json` — add `castSlots: { t1, t2, t3 }` to caster templates (ant-mage, ant-queen, spider-witch).
- `engine/abilities.ts` — replace `uses` decrement with tier-slot decrement; reject if tier is empty.
- `engine/state.ts` — slot bookkeeping per unit, not per template.
- All AI variants — must consult slots, not `uses`, when scoring spell options.

**Expected effect:** Closes a soft balance gap: today, the smart play is "save `uses` for the one moment that matters." Tiered slots force casters to spend lower-tier slots constantly (since they don't carry over), which surfaces ability variety in replays and improves watchability. Mild balance impact, large depth gain.

**Effort:** Medium (1 schema field, 1 engine path, 6 AI variants to update).

---

### 1.2 — Combo abilities ("Dual Techs") for adjacent same-faction parties

**Source pattern (Chrono Trigger):** Dual Techs combine two characters' single techs into a stronger shared ability. "Each Double Tech requires that the two characters know certain prerequisite Single Techs prior to learning. Double Techs are learned by having the two characters in the party and knowing the prerequisites at the end of a battle." ([Chrono Wiki — Tech](<https://chrono.fandom.com/wiki/Tech_(Chrono_Trigger)>); [Chrono Trigger/Techniques — StrategyWiki](https://strategywiki.org/wiki/Chrono_Trigger/Techniques)) Damage of a dual is the sum of the underlying components, and "a double/triple tech will never miss" — the combo is more reliable, not just bigger.

**Translation:** Add a `comboAbilities` table keyed by an unordered pair of single-ability ids. When two **same-faction** parties end their move adjacent (within 1 tile, same plane) and **both** have the prerequisite ability with a tier slot available, a combo ability is offered. Examples:

- `pheroblast` + `volley` → `pheroline-barrage`: T1 cost from each caster, hits a 3-tile line, never misses.
- `silk-snare` + `web-spit` → `silk-prison`: roots target party for 1 turn (no movement, can still attack).

This rewards the existing party-clustering tactic instead of penalizing it (today clustering only matters for retreat-threat math). Does **not** conflict with the R15/R16 retreat system — combos resolve before retreat checks. Does **not** invalidate determinism — combo offers are computed from public state.

**Files/systems touched:**

- `data/level-1/combos.json` (new): `[{a, b, result, tier, range}]`.
- `engine/abilities.ts` — combo resolver invoked at order-issuance time.
- `engine/parties.ts` — adjacency lookup helper (already partial).
- `ai/policy-helpers.ts` — `getAvailableCombos(partyId)`.
- All AI variants — opportunistic combo scoring.

**Expected effect:** Gives spiders a real reason to stage two parties at a chokepoint (currently they are mostly solo-pursuit). Adds a spike-damage moment that breaks the late-game grind toward POST-hold timeout. Watchability win.

**Effort:** Medium (one new data file, one resolver hook, AI policy update).

---

### 1.3 — Commander cards: gold sink + scenario-shaping picks

**Source pattern (Risk 2210):** "Energy has a strategic importance and is used to buy cards, to bring commanders and space stations into play, to bid for the most advantageous place in the turn order, and to play certain cards." There are five commander types (Land, Naval, Space, Nuclear, Diplomat); each has a 20-card deck, and each commander rolls a d8 instead of d6 within their domain. ([Wikipedia — Risk 2210 A.D.](https://en.wikipedia.org/wiki/Risk_2210_A.D.); [UltraBoardGames — Risk 2210 Rules](https://www.ultraboardgames.com/risk/risk-2210.php)) Cards are bought with energy; you can only buy cards if you have the matching commander out.

**Translation:** Convert the dormant **gold** resource (R12) into a card-purchase economy. Each faction has a small deck (8–12 cards) of one-shot tactical effects:

- **Ant deck examples:** `Forced March` (one party gets +2 movement this turn), `Pheromone Beacon` (reveal all spider parties for 1 turn), `Royal Decree` (queen acts twice this turn).
- **Spider deck examples:** `Web Trap` (place a 1-tile snare), `Ambush` (one spider party attacks first regardless of agility), `Silk Cocoon` (one spider party is invulnerable for 1 turn but cannot move).

Cards cost 2–5 gold; hand size capped at 3. Drawing is **not** random — all cards are visible in a public "shop" and the player chooses (preserves determinism). Pairs naturally with R12 gold without inventing a new currency. Pairs cleanly with R14 items (items are persistent buffs, cards are spike effects).

**Files/systems touched:**

- `data/level-1/cards.json` (new): card templates with cost/effect.
- `data/level-1/shop.json` — extend (already exists) with card row.
- `engine/state.ts` — `hand: { ant: cardId[], spider: cardId[] }`.
- `engine/orders.ts` — `play-card` order type.
- `engine/abilities.ts` — most card effects reduce to existing ability primitives.
- All AI variants — card-purchase scoring (small policy addition).

**Expected effect:** Makes gold load-bearing. Caps stalemates: a faction that is behind on map can spend a hoarded card to break a POST-hold timer. Risk 2210's 5-turn limit is its forcing function; boa-foodfight's 30-turn cap + 2-turn POST hold are ours, and cards give a way to spend resources to bend that timer.

**Effort:** Medium-large (new data, new order type, AI scoring; ~6–8 cards is enough for v1).

**Conflict note:** Make sure `play-card` does not double-spend the party's order in the same turn it acted; treat the queen as the "card-issuing authority" so it costs the queen's order instead. This avoids interaction with the R14 party-slot item.

---

### 1.4 — Charisma-gated promotion chain (replaces the prior memo's `kills`-only promotion)

**Source pattern (Ogre Battle MotBQ + OB64):** "Charisma serves two major purposes: it is used as a unit promotion requirement for small units, and it determines the probability of success for a unit leader to recruit a neutral unit. Charisma is primarily gained by killing targets that have a higher level than the unit that killed them, and is lost by killing targets that have a lower level than the unit that killed them or by running away." ([Ogre Battle Saga Wiki — Statistics](https://ogrebattlesaga.fandom.com/wiki/Statistics); [OB64 LP Archive — Mechanics](https://lparchive.org/Ogre-Battle-64/Update%2002/)) Class-change requires a tuple: level, charisma band, alignment band.

**Translation:** The prior memo's recommendation 2.3 (`kills >= 3` → promote) is the right shape but wrong gate — counting raw kills causes the bigger party to snowball. Replace with **charisma**: a unit's charisma goes **up** for engaging a larger or higher-template-tier opposing party, **down** for engaging a smaller one or for fleeing (R15/R16 retreat). Promotion at the queen POST requires `charisma >= K`, not `kills >= K`. Also makes the existing R10 ant-recruit-on-neutrals charisma-gated: a low-charisma ant-mage has worse recruit odds, mirroring OB64's persuasion math (where Princesses/Vampires give +30% — see [OgreBattle64.net — Neutral Encounters](https://ogrebattle64.net/guides/neutral-encounters/)).

**Files/systems touched:**

- `engine/state.ts` — `unit.charisma: number` (0–100, default 50).
- `engine/battle.ts` — charisma adjustment on engagement initiation and on retreat.
- `engine/abilities.ts` — charisma-gated `promote`; charisma modifier on R10 recruit roll.
- `data/level-1/units.json` — `promotionTo`, `promoteCharismaMin` per template.
- `data/level-1/roster-*.json` — promoted templates.
- `ai/*.ts` — charisma-aware target selection (don't farm small targets).

**Expected effect:** Discourages the snowball strategy of mopping up small parties for promotion farm. Aligns with the R15/R16 retreat system — choosing to retreat now has a long-term charisma cost, a soft anti-retreat tax that prevents R15/R16 from being a free reset button.

**Effort:** Medium. Cleanly extends the prior memo's `promotion` rec without rewriting it.

**Conflict note:** Replaces, not stacks with, the prior memo's `kills`-counter design (rec 2.3 in `design-memo-tbs-expert.md`). Pick one; this is better.

---

### 1.5 — Formation slots: front-row / back-row positioning inside a party

**Source pattern (Ogre Battle MotBQ):** "You can fit a maximum of 3 characters in the front or the back of a unit, and 5 altogether. Large characters count double for your overall headcount." ([Ogre Battle Saga Wiki — MotBQ classes](https://ogrebattlesaga.fandom.com/wiki/Ogre_Battle:_The_March_of_the_Black_Queen); [GameFAQs — OB MotBQ Army Building Guide](https://gamefaqs.gamespot.com/snes/588541-ogre-battle-the-march-of-the-black-queen/faqs/57336)) Casters belong in back, fighters in front. Front-row units are reachable by short-range melee; back-row are reachable only by ranged attacks, magic, or a charging melee class.

**Translation:** Each party has a formation with `front` (up to 3 unit slots) and `back` (up to 2 slots). `data/level-1/formations.json` already exists — extend to enforce the slot count and add a `placement: "front" | "back"` per unit. Combat resolution rules:

- Melee attacks resolve against `front` first; `back` is hit only when `front` is empty.
- Ranged attacks (`volley`, `web-spit`) can target either row.
- Casters in `back` get `+1 intelligence`; melee in `front` gets `+1 attack`.
- Leader (per the prior memo's leader-driven party identity) defaults to `back` for casters, `front` for fighters.

This is a **pure data + combat-reorder** change. No new mechanics — just a sequencing rule on `engine/combat.ts`.

**Files/systems touched:**

- `data/level-1/formations.json` — slot schema.
- `data/level-1/units.json` — `defaultRow: "front" | "back"`.
- `engine/combat.ts` — target-row selection in damage roll.
- `engine/parties.ts` — formation validation on party creation (R7 placement).
- `viewer/` — render row split.

**Expected effect:** Big watchability and depth payoff. Closes the long-standing gap that "ant-mage in a party of footmen is just as exposed as an ant-footman" — today it is, which makes mages strictly worse than they should be. Indirectly buffs casters (1.1) and combos (1.2) since their casters now survive longer.

**Effort:** Small-medium. The schema already half-exists in `formations.json`.

---

### 1.6 — Hard turn-cap with score-based fallback victory

**Source pattern (Risk 2210):** "The game is only 5 years (turns) long; the winner is the player with highest score at the end of the last year." ([UltraBoardGames — Risk 2210](https://www.ultraboardgames.com/risk/risk-2210.php); [Wikipedia — Risk 2210 A.D.](https://en.wikipedia.org/wiki/Risk_2210_A.D.)) The 5-turn limit is the entire reason Risk 2210 plays differently from classic Risk: it forces aggression because attrition can't win.

**Translation:** Today the 30-turn cap is an implicit "game ends" without crisp win-determination on timeout. Codify a **score** that decides timeout victories:

- POSTs held: 3 pts each (continuous-hold counter from prior memo's rec 1.1).
- Spider-web hold counter (R17): 5 pts per turn already held.
- Living queen: 10 pts.
- Charisma-promoted units: 1 pt each.
- Gold/cards in hand: 0.5 pts each (so a hoarder doesn't win by sandbagging).

If 30 turns elapse with no POST-hold-victory, no queen-kill, and no chain-completion, score wins. This converts a "draw → ant default" implicit rule (which the data shows is the spider's worst outcome) into a clean tiebreaker that respects both factions' play.

**Files/systems touched:**

- `engine/end-of-turn.ts` — score evaluation at turn 30.
- `engine/state.ts` — score breakdown for postmortem.
- `data/level-1/scoring.json` (new) — point weights so designer agents can re-tune.
- `harness/` (whatever runs the AI eval) — record final score, not just winner.

**Expected effect:** Probably the highest leverage-per-effort item in the memo. The 30-turn cap stops being an implicit ant-win (since "ants chained 4 of 6 POSTs and ran out the clock" today reads as a draw) and becomes a measurable spider achievement target ("hold 2 POSTs + queen alive = 16 pts"). Pairs cleanly with the R17 POST-hold mechanic by making the in-progress hold worth points.

**Effort:** Small. One new file, one engine block.

---

## Section 2 — Honorable mentions

- **FF3 job-change transition phase ([Final Fantasy Wiki — Job Adjustment Phase](https://finalfantasy.fandom.com/wiki/Job_Adjustment_Phase)).** Switching jobs imposes a 0–10-battle stat penalty. Translates to a "reorganize cost" if we let players move units between parties mid-scenario. Useful but requires that mid-scenario reorganization actually exist; today party composition is locked at R7.
- **Chrono Trigger Triple Techs.** Three-party combo, much spikier. Skipped from top-6 because adjacency requirements rarely line up in a 30-turn game; better to nail dual techs (1.2) first and elevate to triples in a later phase.
- **OB MotBQ Class evolution trees ([Ogre Battle Saga Wiki — Classes](https://ogrebattlesaga.fandom.com/wiki/Category:The_March_of_the_Black_Queen_-_Classes)).** Multi-step branching promotion. 1.4 covers single-step promotion, which is the right v1 ceiling. Multi-step trees would explode the unit-template count.
- **Risk 2210 turn-order energy bid.** Each turn players bid energy for first-player initiative. Tempting (it makes gold matter every turn), but boa-foodfight already has agility-based initiative inside parties; a faction-level bid would conflict.
- **Ogre Battle Tarot/zodiac character creation ([StrategyWiki — Tarot Cards](https://strategywiki.org/wiki/Ogre_Battle:_The_March_of_the_Black_Queen/Tarot_Cards)).** Pre-game randomized stat tweaks. The prior memo correctly skipped these for replay-determinism reasons. Worth re-considering only if pre-game roll seeds are deterministic per scenario id, which they would be.

## Section 3 — What to skip

- **FF3 8-spell-level expansion.** Eight tiers is overkill at our scale; 3 tiers (1.1) captures the dynamic without needing 24 abilities per caster.
- **Chrono Trigger ATB / time-based combat.** Real-time ATB conflicts with the deterministic, fully turn-based replay invariant. Combo dual-techs (1.2) are the borrowable shape; the timing system isn't.
- **Risk 2210 Nuclear cards (continent wipe).** Single-card destruction of a whole region would invalidate the careful POST-hold pacing. The card economy (1.3) deliberately keeps card effects bounded.
- **Risk 2210 Space stations / Moon territory.** Adding a new map plane purely to host commanders would conflict with the existing 6-plane geometry and the R7 placement system.
- **OB MotBQ Reputation as ending-gate.** Reputation in OB MotBQ ([StrategyWiki — Alignment & Reputation](https://strategywiki.org/wiki/Ogre_Battle:_The_March_of_the_Black_Queen/Alignment_%26_Reputation)) drives one of multiple endings; boa-foodfight has binary win/loss + score. Skip.
- **OB Tarot draws on town liberation.** Random per-POST card draws are tempting but break determinism. The card economy in 1.3 sidesteps this by making the shop deterministic.
- **OB Day/Night werewolf/vampire form-shifts.** Overlaps with day/night (prior memo rec 1.2). Don't add a second night-only sub-class system on top.
- **Chrono Trigger character-specific learning curves (Magus joins pre-mastered).** No analog: boa-foodfight units are templated, not narrative-individual.

## Section 4 — Priority justification

The top-6 ranking weights three criteria: (1) does it fix an existing dead system, (2) does it preserve replay determinism, (3) is implementation effort under one focused designer-week. Rec 1.1 (tiered MP) and rec 1.5 (formation slots) come first because they fix latent flaws in already-shipped systems — the flat `uses` counter and the row-blind combat resolver respectively. Rec 1.2 (combos) and rec 1.4 (charisma promotion) extend systems we have but don't fully exploit (party adjacency and engagement initiation respectively). Rec 1.3 (cards) and rec 1.6 (score-tiebreaker) are the most ambitious — they introduce new player-facing concepts — but each maps to a system we know is broken (gold without a sink, draws as implicit ant wins).

The honest tradeoff: rec 1.3 (cards) is the riskiest. It introduces a new resource/economy axis on top of items, jelly, and gold. If we ship it badly, it overlaps with R14 items and creates "which buff goes where" decision fatigue. The mitigation is a strict separation — items are persistent stat buffs, cards are spike one-shots — but designer-agents will need a clear style guide to keep them apart. Conversely, rec 1.6 (score) is almost free and unblocks better diagnostics for every other rec; it should ship before any of the others so we can measure them.

Of the four source games, FF3 contributes 1 mechanic (1.1), Chrono Trigger contributes 1 (1.2), Risk 2210 contributes 2 (1.3, 1.6), and Ogre Battle contributes 2 (1.4, 1.5). The Risk 2210 over-representation is intentional: its 5-turn-limit-plus-score design is the closest structural analog to boa-foodfight's 30-turn-cap-plus-POST-hold tension, and the borrow is sharper than picking another OB pattern would be. None of the picks duplicate the prior memo's recommendations — 1.1 / 1.5 / 1.6 are entirely new axes; 1.2, 1.3, 1.4 deliberately extend (or supersede, in 1.4's case) prior-memo mechanics rather than re-listing them.

---

### Sources

- [Final Fantasy Wiki — Magic tier system](https://finalfantasy.fandom.com/wiki/Magic_tier_system)
- [StrategyWiki — Final Fantasy III / Jobs](https://strategywiki.org/wiki/Final_Fantasy_III/Jobs)
- [Final Fantasy Wiki — Job Adjustment Phase](https://finalfantasy.fandom.com/wiki/Job_Adjustment_Phase)
- [Chrono Wiki — Tech (Chrono Trigger)](<https://chrono.fandom.com/wiki/Tech_(Chrono_Trigger)>)
- [StrategyWiki — Chrono Trigger / Techniques](https://strategywiki.org/wiki/Chrono_Trigger/Techniques)
- [Wikipedia — Risk 2210 A.D.](https://en.wikipedia.org/wiki/Risk_2210_A.D.)
- [UltraBoardGames — Risk 2210 A.D. Rules](https://www.ultraboardgames.com/risk/risk-2210.php)
- [Risk 2210 — Command Cards Summary (PDF)](https://risk2210.net/resources/Command_Cards_Summary.pdf)
- [Ogre Battle Saga Wiki — Statistics](https://ogrebattlesaga.fandom.com/wiki/Statistics)
- [Ogre Battle Saga Wiki — MotBQ overview](https://ogrebattlesaga.fandom.com/wiki/Ogre_Battle:_The_March_of_the_Black_Queen)
- [StrategyWiki — OB MotBQ / Alignment & Reputation](https://strategywiki.org/wiki/Ogre_Battle:_The_March_of_the_Black_Queen/Alignment_%26_Reputation)
- [StrategyWiki — OB MotBQ / Tarot Cards](https://strategywiki.org/wiki/Ogre_Battle:_The_March_of_the_Black_Queen/Tarot_Cards)
- [GameFAQs — OB MotBQ Army Building Guide (azuarc)](https://gamefaqs.gamespot.com/snes/588541-ogre-battle-the-march-of-the-black-queen/faqs/57336)
- [OgreBattle64.net — Neutral Encounters](https://ogrebattle64.net/guides/neutral-encounters/)
- [Ogre Battle 64 LP Archive — Game Mechanics Megadump](https://lparchive.org/Ogre-Battle-64/Update%2002/)
- [Ogre Battle Saga Wiki — MotBQ Classes](https://ogrebattlesaga.fandom.com/wiki/Category:The_March_of_the_Black_Queen_-_Classes)
