/**
 * Scenario-data bake (Node / tsx, run via `pnpm gen:scenario`).
 *
 * Writes the parsed-and-validated L1 `ScenarioData` (the contents of
 * `data/level-1/*.json` after zod parsing) to
 * `client/src/fixtures/scenario-l1-data.json` as a single plain-JSON
 * blob. The browser bundles that blob and rebuilds the full (Map-ful)
 * `GameState` in-process via the pure `buildInitialStateWithEvents`,
 * then runs the real engine turn-by-turn — the live engine-in-browser
 * path. `ScenarioData` is plain JSON (no Maps), so the round-trip is
 * lossless; the in-browser side never touches `node:fs`.
 *
 * Deterministic; regenerate with `pnpm gen:scenario` if the L1 data
 * files change.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { loadScenarioData } from '../../engine/state.ts';

const data = loadScenarioData('data/level-1');

const outDir = path.join('client', 'src', 'fixtures');
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, 'scenario-l1-data.json'),
  `${JSON.stringify(data, null, 2)}\n`,
  'utf8',
);

console.log(
  `scenario-l1-data.json: ${String(data.units.templates.length)} unit templates, ` +
    `${String(data.map.planes.length)} planes, ${String(data.map.posts.length)} posts`,
);
