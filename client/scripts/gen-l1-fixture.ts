/**
 * Dev-fixture generator (Node / tsx, run via `pnpm gen:fixture`).
 *
 * Produces `client/src/fixtures/l1.json` — a schema-valid `WorldState`
 * plus the catalogs the between-scenario views bind to (unit
 * templates, the Anthill recruit catalog, persistent items),
 * distilled from the frozen canonical `data/level-1/` build through
 * the real engine loader (`loadScenarioData`). The browser client
 * imports the JSON so it never needs Node I/O; regenerate with
 * `pnpm gen:fixture` if the L1 data changes.
 *
 * This is a *seed* for the world-loop views to operate on, not engine
 * canon — unit ids are fixture-stable, not the engine's runtime ids,
 * and the starting gold is an arbitrary dev value.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { recruitsFileSchema } from '../../engine/schemas/recruits.ts';
import { loadScenarioData } from '../../engine/state.ts';
import type {
  AbilityId,
  PartyId,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
} from '../../engine/types.ts';
import type {
  WorldPartyAssignment,
  WorldRoster,
  WorldState,
  WorldUnit,
} from '../../engine/world-state.ts';

const DEV_GOLD = 120;
const DEV_SEED = 12345;

const data = loadScenarioData('data/level-1');

const templates: UnitTemplate[] = data.units.templates.map((t) => ({
  ...t,
  id: t.id as UnitTemplateId,
  abilities: t.abilities.map((a) => a as AbilityId),
}));

const templateHp = new Map(templates.map((t) => [t.id as string, t.baseStats.hp]));

const antRoster = data.rosters.find((r) => r.faction === 'ant');
if (!antRoster) throw new Error('level-1 has no ant roster');

const units: WorldUnit[] = [];
const partyAssignments: WorldPartyAssignment[] = [];

for (const party of antRoster.parties) {
  const unitIds: UnitId[] = [];
  let leaderId: UnitId | undefined;
  party.units.forEach((entry, entryIndex) => {
    for (let copy = 0; copy < entry.count; copy++) {
      const id = `${party.id}-${entry.templateId}-${copy}` as UnitId;
      unitIds.push(id);
      if (entryIndex === party.leaderIndex && copy === 0) leaderId = id;
      units.push({
        id,
        templateId: entry.templateId as UnitTemplateId,
        currentHp: templateHp.get(entry.templateId) ?? 1,
        level: 1,
        xp: 0,
        charisma: 50,
        promoted: false,
        item: null,
      });
    }
  });
  partyAssignments.push({
    partyId: party.id as PartyId,
    unitIds,
    leaderId: leaderId ?? unitIds[0]!,
  });
}

const roster: WorldRoster = { faction: 'ant', units, partyAssignments };

const state: WorldState = {
  campaignId: 'l1-dev',
  scenarioIndex: 0,
  roster,
  gold: DEV_GOLD,
  cardsOwned: [],
  rngSeed: DEV_SEED,
  savedAt: '2026-01-01T00:00:00.000Z',
};

const recruits = recruitsFileSchema.parse(
  JSON.parse(readFileSync(path.join('data', 'level-1', 'recruits.json'), 'utf8')),
);

const items = data.items.templates.filter((t) => t.kind === 'persistent');

const outDir = path.join('client', 'src', 'fixtures');
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, 'l1.json'),
  `${JSON.stringify({ state, templates, recruits, items }, null, 2)}\n`,
  'utf8',
);

console.log(
  `l1.json: ${String(units.length)} units, ${String(partyAssignments.length)} parties, ` +
    `${String(templates.length)} templates, ${String(recruits.recruits.length)} recruits, ` +
    `${String(items.length)} items, ${String(DEV_GOLD)} gold`,
);
