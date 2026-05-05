# Contracts

This document is the cross-module source of truth. Every agent in Phase 1 and
Phase 2 reads it before writing code; the reconciler agent is the only role
permitted to modify it. If a module needs to change a contract, the change goes
through the reconciler, not into the module's PR.

Status: **Phase 0 skeleton.** Names and shapes below are placeholders to be
filled in by the architecture pass at the start of Phase 1. Anything marked
TODO must be resolved before Phase 2 begins.

## Module boundaries

| Module             | Owns                                           | Imports from                      |
| ------------------ | ---------------------------------------------- | --------------------------------- |
| `engine/world`     | Plane, Tile, terrain                           | `engine/types`                    |
| `engine/posts`     | POST, ownership, pairings                      | `engine/world`, `engine/types`    |
| `engine/parties`   | Party, Unit, slot accounting                   | `engine/types`                    |
| `engine/movement`  | Order, MovementResult, simultaneous resolution | `engine/world`, `engine/parties`  |
| `engine/battle`    | BattleResult, posture, retreat                 | `engine/parties`, `engine/combat` |
| `engine/combat`    | Pure damage/agility math                       | `engine/types`                    |
| `engine/abilities` | Ability effects                                | `engine/parties`, `engine/world`  |
| `engine/fog`       | Visibility                                     | `engine/world`, `engine/parties`  |
| `engine/save`      | GameState (de)serialization                    | every other engine module         |
| `engine/replay`    | ReplayEvent emission                           | `engine/types`                    |
| `ai/*`             | Policy: (state, seed) -> Order[]               | `engine/*` (read-only)            |
| `harness/*`        | Driver, RNG, batch runs                        | `engine/*`, `ai/*`                |
| `critics/*`        | Read replay logs, score                        | `engine/replay` (types only)      |

Cross-module imports must go through the importing module's declared public
surface (`index.ts`). Reaching into another module's internals is a
PR consistency reviewer violation.

## Core types (placeholders)

These are the names every agent agrees on. Shapes are stubbed; the architecture
pass at the start of Phase 1 fills them in.

```ts
// TODO: shape filled by architecture pass
export type Plane = 'floor' | 'wall' | 'ceiling';

export interface TileCoord {
  plane: Plane;
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  // TODO
}

export interface Party {
  id: string;
  // TODO
}

export interface Post {
  id: string;
  location: TileCoord;
  // TODO
}

export interface GameState {
  turn: number;
  // TODO
}

export interface Order {
  partyId: string;
  // TODO
}

export interface BattleResult {
  // TODO
}

export interface ReplayEvent {
  type: string;
  turn: number;
  // TODO: discriminated union of all event types
}
```

## Naming conventions

- TypeScript identifiers: `camelCase`
- Type / interface names: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Files: `kebab-case.ts` (tests: `kebab-case.test.ts`)
- Data files: `kebab-case.json` under `data/<level>/`
- Replay event types: `kebab-case` strings (e.g., `party-moved`, `battle-resolved`)

## Determinism

- All randomness goes through an injected `Rng` interface. No `Math.random()`
  in `engine/`, `ai/`, or `harness/`.
- Given an identical seed and identical inputs, the engine produces an
  identical replay log. This is enforced by a golden test in Phase 2.

## Replay log

- Format: JSONL. One `ReplayEvent` per line.
- Path: `out/runs/<timestamp>/replay-<seed>.jsonl`.
- Every state mutation in the engine emits an event.
- The replay log is the single artifact consumed by tests, critics, and the
  Phase 5 viewer.

## Schema validation

- Every JSON file under `data/` has a Zod schema under `engine/schemas/`.
- The reconciler validates all data files on every PR.
- Cross-file references (e.g., a roster unit must exist in `units.json`) are
  also checked by the reconciler.

## What NOT to put in CONTRACTS.md

- Implementation details
- Tuning numbers
- Game balance opinions
- Anything that would change between Level 1 and Level 2
