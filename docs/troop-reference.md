# Troop & Army-Organization Reference

**Status:** Running reference (living doc). Source of truth for the
unit / party / organization data model — the contract a troop-management
or army-organization UI binds to. Generated from code + data, not from
prose spec; every section cites its authoritative file.

**Stability contract:** the _schemas_ (`engine/schemas/*.ts`) and the
_type model_ (`engine/types.ts`) are the stable, invariant contract —
build the UI against these. The concrete _values_ (`data/level-N/*.json`)
are per-scenario and DO vary level to level; `data/level-1/` is the
frozen canonical "all mechanics on" reference build (gate-29 locked) and
is the catalog used for the tables below.

---

## 1. The unit template — what defines a troop

Authoritative: `engine/schemas/units.ts` (validation contract),
`engine/types.ts:141` (`UnitTemplate`), `data/level-N/units.json` (data).

A unit _template_ is the definition of a troop type. Every template has
exactly these fields:

| Field           | Type                                               | Notes                                                                                  |
| --------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `id`            | string                                             | Unique within the file (e.g. `ant-footman`)                                            |
| `name`          | string                                             | Display name (e.g. "Ant Footman")                                                      |
| `faction`       | `ant` \| `spider` \| `neutral`                     | `engine/schemas/common.ts`                                                             |
| `size`          | `small` \| `medium` \| `large` \| `huge`           | Drives `slotCost`                                                                      |
| `slotCost`      | int 1–5                                            | **Must match size**: small=1, medium=2, large=3, huge=4 or 5 (`units.ts:11`, enforced) |
| `movement`      | `ground` \| `climbing` \| `flying` \| `restricted` | Ants `ground`, spiders `climbing`                                                      |
| `baseStats`     | 6 stats                                            | See §2                                                                                 |
| `abilities`     | string[]                                           | Ability ids (`data/level-N/abilities.json`)                                            |
| `tags`          | string[]                                           | Behavior/role markers — see §5                                                         |
| `planeAffinity` | floor/ceiling/wall × {attack,armor}                | Per-plane combat offset; see §6                                                        |

## 2. Stats

Authoritative: `engine/types.ts:113` (`Stats`). Exactly six, all integers:

`hp` · `attack` · `agility` · `armor` · `intelligence` · `constitution`

- **hp** — health pool (spawn HP; campaign level-ups enlarge this pool).
- **attack / armor** — core damage vs mitigation; the lane many
  modifiers fold into (items, formation, leader, plane, POST, cards,
  campaign level bonus).
- **agility** — initiative / flee-roll weighting.
- **intelligence** — ≥ 5 makes a unit caster-eligible (MP pool, §7).
- **constitution** — durability/endurance contributor.

## 3. Full troop catalog (canonical L1 build)

Source: `data/level-1/units.json`. 27 templates. Stats are
`hp/atk/agi/arm/int/con`.

### Ants (`faction: ant`, `movement: ground`)

| id               | name           | size   | slot | stats          | abilities                                    | key tags                         |
| ---------------- | -------------- | ------ | ---- | -------------- | -------------------------------------------- | -------------------------------- |
| `ant-queen`      | Ant Queen      | huge   | 4    | 60/20/3/5/8/10 | queen-ultimate                               | queen, leader-eligible, immobile |
| `ant-footman`    | Ant Footman    | small  | 1    | 6/7/5/2/1/7    | brace                                        | melee, infantry                  |
| `ant-archer`     | Ant Archer     | small  | 1    | 5/5/7/1/2/6    | volley                                       | ranged                           |
| `ant-worker`     | Ant Worker     | small  | 1    | 7/3/4/0/1/8    | boat-form, jelly-apply                       | worker, support                  |
| `ant-scout`      | Ant Scout      | small  | 1    | 5/5/10/0/3/6   | pheroblast, scout-ping                       | scout, leader-eligible           |
| `ant-potato-bug` | Ant Potato Bug | medium | 2    | 12/9/3/3/1/9   | brace                                        | melee, heavy                     |
| `ant-mage`       | Ant Mage       | small  | 1    | 6/6/5/1/8/6    | ant-plane-switch, mend, jelly-apply, recruit | caster, leader-eligible, support |
| `ant-tank`       | Ant Tank       | large  | 3    | 22/8/2/4/1/10  | brace                                        | melee, heavy, no-fly             |

### Spiders (`faction: spider`, `movement: climbing`)

| id               | name           | size   | slot | stats        | abilities                                                       | key tags                  |
| ---------------- | -------------- | ------ | ---- | ------------ | --------------------------------------------------------------- | ------------------------- |
| `spider-queen`   | Spider Queen   | huge   | 4    | 37/8/4/2/9/6 | web-tangle, web-mend, web-snare, spawn-spiderlings, venom-blast | queen, leader-eligible    |
| `spider-scout`   | Spider Scout   | small  | 1    | 10/4/7/1/2/4 | —                                                               | scout                     |
| `spider-soldier` | Spider Soldier | small  | 1    | 13/5/5/3/1/4 | —                                                               | melee, infantry           |
| `spider-spinner` | Spider Spinner | medium | 2    | 14/6/4/2/5/5 | web-tangle, spin-web, venom-blast                               | debuffer, support         |
| `spider-elite`   | Spider Elite   | medium | 2    | 14/4/5/1/3/5 | —                                                               | melee, elite, queen-guard |

### Promoted forms (reached via the charisma-promotion track, §8)

`tags` include `promoted`. Source/target pairing is engine-defined
(`engine/` promotion logic); names make the lineage explicit.

| id                       | from           | size   | slot | stats        | abilities                                    |
| ------------------------ | -------------- | ------ | ---- | ------------ | -------------------------------------------- |
| `ant-veteran-footman`    | ant-footman    | small  | 1    | 8/8/5/3/1/7  | brace                                        |
| `ant-sharpshooter`       | ant-archer     | small  | 1    | 7/7/7/1/2/6  | volley                                       |
| `ant-archmage`           | ant-mage       | small  | 1    | 8/6/5/1/9/6  | ant-plane-switch, mend, jelly-apply, recruit |
| `ant-scout-elite`        | ant-scout      | small  | 1    | 7/5/11/0/3/6 | pheroblast, scout-ping                       |
| `spider-veteran-soldier` | spider-soldier | small  | 1    | 15/6/5/3/1/4 | —                                            |
| `spider-knight`          | spider-elite   | medium | 2    | 16/5/5/2/3/5 | —                                            |
| `spider-weaver`          | spider-spinner | medium | 2    | 16/6/4/2/6/5 | web-tangle, spin-web, venom-blast            |
| `spider-stalker`         | spider-scout   | small  | 1    | 12/4/8/1/2/4 | —                                            |

### Neutrals / spawned (`faction: neutral` or spawn)

| id           | name            | faction | size   | slot | stats        | tags                                          |
| ------------ | --------------- | ------- | ------ | ---- | ------------ | --------------------------------------------- |
| `mouse-merc` | Mouse Mercenary | neutral | large  | 3    | 25/5/3/2/1/8 | tank, mercenary                               |
| `mouse`      | Mouse           | neutral | medium | 2    | 14/5/4/1/2/7 | mercenary                                     |
| `cockroach`  | Cockroach       | neutral | small  | 1    | 6/6/7/0/1/5  | swarm, ferocious                              |
| `stinkbug`   | Stinkbug        | neutral | small  | 1    | 8/3/3/1/2/6  | damage-zone                                   |
| `spiderling` | Spiderling      | spider  | small  | 1    | 3/2/6/0/1/2  | scout, swarm (spawned by `spawn-spiderlings`) |

## 4. Army organization — parties

A _party_ is the unit of organization, command, and movement. Troops
are never standalone; they live in a party.

**Starting roster (data — what an army-org UI authors/edits):**
`engine/schemas/roster.ts`, `data/level-N/roster-ants.json` /
`roster-spiders.json`. Each party:

| Field              | Notes                                                                |
| ------------------ | -------------------------------------------------------------------- |
| `id`               | Unique within the faction roster                                     |
| `leaderClass`      | A leader class id (§9)                                               |
| `leaderIndex`      | Index into `units` marking which unit is the leader                  |
| `slotCapacity`     | **Queen's home party = 12; standard parties = 8** (Tier-1 party cap) |
| `units`            | List of `{ templateId, count }`                                      |
| `startingLocation` | `{ plane, x, y }`                                                    |
| `posture`          | `run` \| `fight` \| `defend`                                         |

**Capacity rule:** the sum of each member's `slotCost` must fit within
`slotCapacity`. A standard 8-slot party = 8 small units, or e.g. 4 small

- 2 medium, etc. The queen's party is 12 to seat the huge (slot-4) queen
  plus a guard.

**Runtime party (engine state during a scenario):**
`engine/types.ts:489` (`Party`). Adds: `units` (full `Unit` objects with
`currentHp`/`level`/`xp`), `leaderId`, `orders`, `posture`,
`strategyModifiers` (`offensive`/`defensive`/`protect-leader`/`target-weakest`,
`types.ts:448`), `jellyDoses`, `leaderless`, optional `item` (one
equipped persistent item, Round 14), optional `formation` (slot layout,
§7), transient `cardBuffs`. A UI editing live parties touches this
shape; a between-scenario org UI edits the persistent roster (§10).

L1 canonical parties: ants — `queen-guard`(12), `vanguard-alpha`,
`vanguard-bravo`, `pathfinders`; spiders — `web-guard`(12),
`web-watch`, `silk-line`, `advance-scout`, `deep-raider`.

## 5. Tags (role / behavior markers)

Free-form strings; engine + AI branch on them. Observed in the L1
catalog: `queen`, `leader-eligible`, `immobile`, `melee`, `infantry`,
`ranged`, `worker`, `support`, `scout`, `heavy`, `caster`, `no-fly`,
`elite`, `queen-guard`, `debuffer`, `tank`, `mercenary`, `swarm`,
`ferocious`, `damage-zone`, `promoted`. UI-relevant ones:
**`leader-eligible`** (may be a party leader), **`caster`** (gets an MP
pool regardless of intelligence, §7), **`immobile`** (queen never
moves), **`promoted`** (a promotion-tier form).

## 6. Plane affinity

`engine/types.ts:130`, `engine/schemas/units.ts:29`. Per-plane
`{attack, armor}` offset folded into combat math by the battle tile's
plane. Pattern: **ants favor the floor** (`floor +1/+1`,
`ceiling -1/0`), **spiders favor the ceiling** (`ceiling +1/+1`,
`floor -1/0`), neutrals all-zero. Walls (n/s/e/w) share one `wall` row,
typically zero. Display this so players understand why the same troop
hits harder on its home plane.

## 7. Formations — TWO distinct systems (do not conflate)

1. **Formation slots (runtime layout).** `engine/types.ts:473`
   (`FormationSlot = front|back|reserve`), `:483` (`Formation`),
   `engine/formation.ts`. Per-party ordered id lists: **front (cap 3)**
   absorbs/deals damage first, **back (cap 2)** trails, **reserve** is
   off the active layout (no damage dealt/taken until a casualty
   promotes a reserve in). Auto-assigned at scenario start by tags +
   size. This is the tactical row layout.
2. **Named formations (party bonus).** `engine/schemas/formations.ts`,
   `data/level-N/formations.json`. Conditional multiplicative buffs:
   `phalanx` (≥3, def ×1.25), `swarm` (≥4, atk ×1.2), `lift` (≥5,
   requires `worker`, def ×1.1), `skirmish-line` (≥3, requires
   `ranged`, atk ×1.15). Each: `minUnits`, optional `requiresTag`,
   `attackMultiplier`, `defenseMultiplier`.

An army-org UI likely surfaces both: slot assignment (1) and which
named-formation bonus (2) a party currently qualifies for.

## 8. Casters & MP

`engine/types.ts:171` (`MpSlots`). A unit is caster-eligible if
`baseStats.intelligence ≥ 5` OR it has tag `caster`. Eligible units
start each scenario with `{ tier1: 4, tier2: 2, tier3: 1 }`; each cast
spends a slot at the ability's tier (no spillover; 0 ⇒ silent fail).
Non-casters carry no pool. Relevant for showing per-unit ability
capacity.

## 9. Leader classes

`engine/schemas/leaders.ts`, `data/level-N/leaders.json`. A party's
`leaderClass` applies stat modifiers. Each class: `modifiers`
(`{stat, delta, appliesTo: leader|party|leader-and-party}`) + optional
`grantsAbility`. L1 classes:

| id              | name          | modifiers                                             | grants       |
| --------------- | ------------- | ----------------------------------------------------- | ------------ |
| `queen`         | Ant Queen     | +5 atk & +3 arm (leader-and-party), +4 morale (party) | —            |
| `spider-queen`  | Spider Queen  | +5 atk & +3 agi (leader-and-party), +2 arm (leader)   | —            |
| `sergeant`      | Sergeant      | +1 atk, +2 morale (party)                             | —            |
| `scout-captain` | Scout Captain | +2 agi, +1 move, −1 arm (party)                       | `pheroblast` |
| `war-chief`     | War Chief     | +2 atk (party), +1 atk (leader), −1 arm (party)       | —            |
| `quartermaster` | Quartermaster | +1 arm, +2 healing, −1 atk (party)                    | —            |

Note `modifiers[].stat` is open-ended (includes derived stats like
`morale`, `movement`, `healing` not in the 6-stat `Stats`); the
reconciler cross-validates. A leader must be a `leader-eligible` unit.

## 10. Progression — what carries between scenarios

This is the layer a _between-scenario_ organization UI (the world loop)
actually edits. Authoritative: `engine/types.ts:177` (`Unit.level`,
`.xp`, `.levelBonus`), `engine/world-extract.ts`, `engine/world-inject.ts`,
`engine/world-levelup.ts`, `engine/world-state.ts`,
`engine/schemas/world.ts`.

- **XP / level** — `Unit` carries `level` + `xp`. Campaign level-ups
  add a `levelBonus` (`attack/armor/hp/agility/intelligence`;
  `armor` lane always 0 by curve) computed from `level` via
  `world-levelup`'s `cumulativeLevelBonus`, applied on world-inject.
- **Charisma promotion** — `Unit.charisma` (0–100, `types.ts:208`),
  init 50 for promotable units; queens and specialty templates
  (worker, tank, potato-bug, spiderling, mouse, cockroach, stinkbug)
  never promote. ≥70 ⇒ eligible; promotes automatically at end-of-turn
  on the faction home POST; once per scenario; yields the `promoted`
  form (§3).
- **Royal Jelly** — `Party.jellyDoses`; `ant-worker`/`ant-mage` carry
  `jelly-apply`; defined in `data/level-N/jelly.json` (a progression
  resource — out of scope here, pointer only).
- **Persistent roster shape (`WorldState`) — THE binding contract for a
  between-scenario org UI.** Authoritative: `engine/schemas/world.ts`,
  `engine/world-state.ts`. Concrete shape (verified against the
  implementation):

  ```
  WorldState {
    campaignId:    string
    scenarioIndex: number
    roster: WorldRoster {
      faction: 'ant'              // ONLY the ant colony persists;
                                  // spiders are per-scenario opponents
      units: WorldUnit[] {        // survivors only — 0-HP units pruned
        id, templateId,
        currentHp,                // healed to template-max between scenarios
        level, xp, charisma, promoted,
        item,                     // equipped party item (rides on the leader)
        levelUpBonus?             // cumulative { hp, attack, agility, intelligence }
      }
      partyAssignments: WorldPartyAssignment[] {
        partyId, unitIds[], leaderId
      }
    }
    gold:       number            // carried verbatim
    cardsOwned: []                // empty — cards are per-scenario
    rngSeed:    number            // campaign seed (deterministic world ops)
    savedAt:    string            // ISO timestamp, informational only
  }
  ```

  **Persisted:** unit identity, template, level, xp, charisma,
  promoted, equipped item, cumulative level bonus, party assignments,
  gold. **Reset every scenario (NOT persisted):** cards-in-hand, MP
  slots, fog/pheromone trails, damage zones, queen-ultimate charge,
  day/night phase, POST-capture progress, neutral status. Save is
  byte-stable (fixed key order) and round-trip Zod-validated;
  save/resume is deterministic.

  **Important for the org UI:** an army-organization UI edits
  `WorldState.roster` — specifically `units` (the colony) and
  `partyAssignments` (how they're grouped). It is **ant-only** (you
  organize your colony; the opponent is scenario-authored). The
  capacity rule (§4) applies to `partyAssignments`: each party's
  members' total `slotCost` must fit 8 (12 for the queen-guard party).

- **Backend operators the org UI will call — STATUS.** The persistence
  _model_ exists and is complete, but several _mutation operators_ a
  troop-org UI needs are **not yet implemented** (no engine-freeze
  risk, no UI dependency — pure `WorldRoster → WorldRoster`
  transforms): move-unit-between-parties, swap-leader, create/disband
  party, equip/unequip item, and a multi-item shop purchase + an
  exposed effective-stats accessor (`effectiveStats` exists in
  `engine/world-levelup.ts` but is not surfaced for UI binding). These
  are the contract the UI binds to; treat the function signatures as
  TBD until built (see the world-loop status note maintained
  separately).

---

## Source-of-truth index

| Concern                    | File(s)                                                               |
| -------------------------- | --------------------------------------------------------------------- |
| Unit template contract     | `engine/schemas/units.ts`, `engine/types.ts:141`                      |
| Stats                      | `engine/types.ts:113`, `engine/schemas/common.ts`                     |
| Troop catalog (values)     | `data/level-N/units.json` (L1 = canonical)                            |
| Party (starting/data)      | `engine/schemas/roster.ts`, `data/level-N/roster-*.json`              |
| Party (runtime)            | `engine/types.ts:489`                                                 |
| Formation slots            | `engine/types.ts:473/483`, `engine/formation.ts`                      |
| Named formations           | `engine/schemas/formations.ts`, `data/level-N/formations.json`        |
| Leader classes             | `engine/schemas/leaders.ts`, `data/level-N/leaders.json`              |
| Casters / MP               | `engine/types.ts:171`                                                 |
| Cross-scenario progression | `engine/world-*.ts`, `engine/schemas/world.ts`, `engine/types.ts:177` |

**Caveat for the UI builder:** `units.json` / `roster-*.json` are
per-scenario. Stat values, which templates appear, and party
compositions differ by level (e.g. L9/L10 carry a different roster than
L1). Bind the UI to the _schemas_; treat L1 as the reference instance,
not the only instance.
