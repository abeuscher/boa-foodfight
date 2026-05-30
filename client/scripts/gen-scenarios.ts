/**
 * Scenario-data bake (Node / tsx, run via `pnpm gen:scenario`).
 *
 * Writes the parsed-and-validated `ScenarioData` for each shipped
 * playable scenario to `client/src/fixtures/scenario-<id>-data.json`
 * as a single plain-JSON blob. The browser bundles whichever blob
 * matches the active `scenarioIndex` and rebuilds the full (Map-ful)
 * `GameState` in-process via the pure `buildInitialStateWithEvents`,
 * then runs the real engine turn-by-turn — the live engine-in-browser
 * path. `ScenarioData` is plain JSON (no Maps), so the round-trip is
 * lossless; the in-browser side never touches `node:fs`.
 *
 * Chunk B1 — generalized from the L1-only `gen-l1-scenario.ts`:
 * iterate over the SCENARIOS list and bake each. The previous output
 * filename (`scenario-l1-data.json`) is preserved so the runtime
 * import in `useLiveScenario.ts` still resolves while B2 wires up
 * scenarioIndex-based routing.
 *
 * Deterministic; regenerate with `pnpm gen:scenario` if any data
 * directory changes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { loadScenarioData } from '../../engine/state.ts';

interface ScenarioBakeSpec {
  /** Short id used in the output filename (`scenario-<id>-data.json`)
   *  and in the runtime fixture lookup table (B2). */
  readonly id: string;
  /** Repository-relative path to the level data directory. */
  readonly dataDir: string;
}

const SCENARIOS: readonly ScenarioBakeSpec[] = [
  { id: 'l1', dataDir: 'data/level-1' },
  { id: 'l2', dataDir: 'data/level-2' },
];

const outDir = path.join('client', 'src', 'fixtures');
mkdirSync(outDir, { recursive: true });

for (const spec of SCENARIOS) {
  const data = loadScenarioData(spec.dataDir);
  const outFile = path.join(outDir, `scenario-${spec.id}-data.json`);
  writeFileSync(outFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(
    `scenario-${spec.id}-data.json: ${String(data.units.templates.length)} unit templates, ` +
      `${String(data.map.planes.length)} planes, ${String(data.map.posts.length)} posts`,
  );
}
