# Contracts

This document is the cross-module source of truth. Every agent in Phase 1 and
Phase 2 reads it before writing code; the reconciler agent is the only role
permitted to modify it. If a module needs to change a contract, the change goes
through the reconciler, not into the module's PR.

Status: **Architecture pass complete.** Core types are defined in
`engine/types.ts`. Per-data-file schemas are defined in `engine/schemas/`.
Phase 1 design agents read those files and produce data conforming to the
schemas. Phase 2 module agents read those files and implement behavior.

## Module boundaries

| Module             | Owns                                    | Imports from                      |
| ------------------ | --------------------------------------- | --------------------------------- |
| `engine/types`     | All core types (no behavior)            | (nothing)                         |
| `engine/schemas`   | Zod schemas for every `data/` file      | `engine/types` (types only)       |
| `engine/world`     | Plane, Tile, terrain runtime            | `engine/types`                    |
| `engine/posts`     | POST ownership, pairings, healing       | `engine/world`, `engine/types`    |
| `engine/parties`   | Party, Unit, slot accounting            | `engine/types`                    |
| `engine/movement`  | Order resolution, simultaneous movement | `engine/world`, `engine/parties`  |
| `engine/battle`    | BattleResult, posture, retreat          | `engine/parties`, `engine/combat` |
| `engine/combat`    | Pure damage/agility math                | `engine/types`                    |
| `engine/abilities` | Ability effects                         | `engine/parties`, `engine/world`  |
| `engine/fog`       | Visibility                              | `engine/world`, `engine/parties`  |
| `engine/save`      | GameState (de)serialization             | every other engine module         |
| `engine/replay`    | ReplayEvent emission                    | `engine/types`                    |
| `ai/*`             | Policy: (state, seed) -> Order[]        | `engine/*` (read-only)            |
| `harness/*`        | Driver, RNG, batch runs                 | `engine/*`, `ai/*`                |
| `critics/*`        | Read replay logs, score                 | `engine/replay` (types only)      |

Cross-module imports must go through the importing module's declared public
surface (`index.ts`). Reaching into another module's internals is a
PR consistency reviewer violation.

## Core types

The authoritative shape lives in `engine/types.ts`. Names defined there:

- **Identifiers (branded):** `UnitId`, `PartyId`, `PostId`, `AbilityId`,
  `UnitTemplateId`
- **World:** `Plane`, `Faction`, `TileCoord`, `TerrainKind`, `Terrain`, `Tile`
- **Units:** `UnitSize`, `MovementMode`, `Stats`, `UnitTemplate`, `Unit`
- **Posts:** `Post`
- **Orders:** `MoveOrder`, `CaptureOrder`, `AbilityOrder`, `HoldOrder`,
  `Order` (discriminated union on `kind`)
- **Parties:** `Posture`, `StrategyModifier`, `Party`
- **Battle:** `BattleAction`, `BattleRound`, `BattleResult`
- **Fog:** `FogTile`
- **State:** `GameState`
- **Replay:** `ReplayEventCommon`, `ReplayEvent` (discriminated union on `kind`)
- **Determinism:** `Rng`

If a Phase 2 module needs a new type, add it to `engine/types.ts` via a
reconciler-mediated change, not in the consuming module.

## Phase 1 data files (one per design agent)

| File                               | Schema                 | Owning agent              |
| ---------------------------------- | ---------------------- | ------------------------- |
| `data/level-1/units.json`          | `unitsFileSchema`      | Stats designer            |
| `data/level-1/abilities.json`      | `abilitiesFileSchema`  | Abilities designer        |
| `data/level-1/map.json`            | `mapFileSchema`        | Map/POST/terrain designer |
| `data/level-1/roster-ants.json`    | `rosterFileSchema`     | Roster designer (ants)    |
| `data/level-1/roster-spiders.json` | `rosterFileSchema`     | Roster designer (spiders) |
| `data/level-1/leaders.json`        | `leadersFileSchema`    | Leader-class designer     |
| `data/level-1/jelly.json`          | `jellyFileSchema`      | Royal Jelly tuner         |
| `data/level-1/queen.json`          | `queenFileSchema`      | Queen ultimate designer   |
| `data/level-1/formations.json`     | `formationsFileSchema` | Coop-ant designer         |
| `data/level-1/shop.json`           | `shopFileSchema`       | Shop designer             |
| `data/level-1/dialogue.json`       | `dialogueFileSchema`   | Dialogue designer         |

Battle math (`engine/combat.ts`) is code, not data, and is owned by the Battle
math designer in Phase 1.

## Reconciler cross-file checks

Beyond per-file schema validation, the reconciler enforces:

- Every `templateId` referenced in a roster file exists in `units.json`.
- Every `abilities` entry on a unit template exists in `abilities.json`.
- Every `leaderClass` referenced in a roster exists in `leaders.json`.
- Every `producedTemplateId` in `queen.json` exists in `units.json`.
- Every `pairedWith` post id resolves to another post in `map.json`.
- Every `locationPostId` in `shop.json` resolves to a post in `map.json`.
- The Queen's party in `roster-ants.json` totals exactly 12 slot capacity, and
  the Queen unit therein has `slotCost === 4`.
- Every other party respects an 8-slot cap in Tier 1.
- Every starting location in a roster falls within the corresponding plane's
  declared dimensions in `map.json`.
- The Storm Drain post is owned by `ant`; the Spider Web post is owned by
  `spider`; the Soap Dish is `neutral`. (Spec-locked.)
- Map contains exactly five Level-1 POSTs (storm-drain, soap-dish,
  towel-rack, wall-crack, spider-web).

## Naming conventions

- TypeScript identifiers: `camelCase`
- Type / interface names: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Files: `kebab-case.ts` (tests: `kebab-case.test.ts`)
- Data files: `kebab-case.json` under `data/<level>/`
- Replay event kinds: `kebab-case` strings (e.g., `party-moved`)
- All ids inside data files: `kebab-case` (enforced by `idSchema`)

## Determinism

- All randomness goes through an injected `Rng` (defined in `engine/types.ts`).
  No `Math.random()` in `engine/`, `ai/`, or `harness/`.
- Given an identical seed and identical inputs, the engine produces an
  identical replay log. Enforced by a golden test in Phase 2.
- Subsystems that need entropy fork a labeled child stream
  (`rng.fork('battle')`) so adding a new consumer doesn't perturb existing
  ones.

## Replay log

- Format: JSONL. One `ReplayEvent` per line.
- Path: `out/runs/<timestamp>/replay-<seed>.jsonl`.
- Every state mutation in the engine emits an event.
- The replay log is the single artifact consumed by tests, critics, and the
  Phase 5 viewer.

## Schema validation

- Every JSON file under `data/` has a Zod schema under `engine/schemas/`.
- The reconciler validates all data files on every PR.
- Cross-file references (see "Reconciler cross-file checks" above) are
  validated by the reconciler in addition to per-file schemas.

## What NOT to put in CONTRACTS.md

- Implementation details
- Tuning numbers
- Game balance opinions
- Anything that would change between Level 1 and Level 2
