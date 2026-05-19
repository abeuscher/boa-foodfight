import { z } from 'zod';

/**
 * Roadmap §7.13 (Exchange #9) — mid-scenario save, Option B
 * (input-stream replay). The persisted save is NOT a state snapshot:
 * it is the seed + scenario id + the ordered log of the player's
 * issued orders up to the save turn. Restore re-runs the engine
 * feeding that log (the engine is deterministic from seed + inputs),
 * stopping at `savedAtTurn`.
 *
 * This is the FROZEN on-disk contract. The real-time UI (later) emits
 * exactly this shape; the engine consumes it now (tested with
 * synthetic logs). The envelope is validated strictly; per-order
 * payloads are validated structurally-loosely on purpose — a
 * corrupted order surfaces as a loud determinism divergence on
 * restore (the Option-B safety property), not a silent bad state.
 */
const loggedOrderSchema = z.object({ kind: z.string().min(1) }).passthrough();

const turnOrderLogSchema = z.object({
  turn: z.number().int().nonnegative(),
  parties: z.array(
    z.object({
      partyId: z.string().min(1),
      orders: z.array(loggedOrderSchema),
    }),
  ),
});

export const scenarioSaveSchema = z.object({
  version: z.literal(1),
  scenarioId: z.string().min(1),
  seed: z.number().int(),
  savedAtTurn: z.number().int().nonnegative(),
  orderLog: z.array(turnOrderLogSchema),
});

export type ScenarioSaveFile = z.infer<typeof scenarioSaveSchema>;
