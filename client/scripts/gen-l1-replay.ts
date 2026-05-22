/**
 * Replay-fixture generator (Node / tsx, run via `pnpm gen:replay`).
 *
 * Runs the canonical L1 reference pairing (baseline ant vs. spider-l1,
 * + neutral) through the real engine and writes the resulting
 * `ReplayEvent[]` stream to `client/src/fixtures/replay-l1.json`. The
 * in-scenario playback view animates this stream through the clock
 * core (`client/src/clock/clock.ts`) — the replay-playback path before
 * the live engine-in-browser path lands.
 *
 * Deterministic (fixed seed); regenerate with `pnpm gen:replay` if the
 * L1 data or AIs change.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { ENEMY_AIS, neutralPlayer, PLAYER_AIS } from '../../ai/index.ts';
import { createTickClock } from '../../engine/replay.ts';
import { createRng } from '../../engine/rng.ts';
import { loadScenario } from '../../engine/state.ts';
import { runScenario } from '../../engine/turn.ts';

const SEED = 1;

const loaded = loadScenario('data/level-1', SEED);
const player = PLAYER_AIS.baseline;
const enemy = ENEMY_AIS['spider-l1'];
if (!player || !enemy) throw new Error('missing baseline / spider-l1 AI');

const outcome = runScenario(loaded.state, loaded.data, createRng(SEED), createTickClock().next, {
  maxTurns: 100,
  policies: [player, enemy, neutralPlayer],
  neutralSpawnEvents: loaded.neutralSpawnEvents,
  itemSpawnEvents: loaded.itemSpawnEvents,
});

const outDir = path.join('client', 'src', 'fixtures');
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, 'replay-l1.json'),
  `${JSON.stringify(outcome.events, null, 2)}\n`,
  'utf8',
);

console.log(
  `replay-l1.json: ${String(outcome.events.length)} events, ` +
    `${String(outcome.turnsPlayed)} turns, winner=${String(outcome.finalState.winner)}`,
);
