/**
 * Dev-fixture generator (Node / tsx, run via `pnpm gen:fixture`).
 *
 * Produces `client/src/fixtures/l1-roster.json` — a schema-valid
 * `WorldRoster` plus the `UnitTemplate[]` catalog, distilled from the
 * frozen canonical `data/level-1/` build through the real engine
 * loader (`loadScenarioData`). The browser client imports the JSON so
 * it never needs Node I/O; regenerate with `pnpm gen:fixture` if the
 * L1 data changes.
 *
 * This is a *seed* for the Organize Army UI to operate on, not engine
 * canon — unit ids are fixture-stable, not the engine's runtime ids.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { loadScenarioData } from '../../engine/state.ts';
import type {
  AbilityId,
  PartyId,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
} from '../../engine/types.ts';
import type { WorldPartyAssignment, WorldRoster, WorldUnit } from '../../engine/world-state.ts';

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

const outDir = path.join('client', 'src', 'fixtures');
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, 'l1-roster.json'),
  `${JSON.stringify({ roster, templates }, null, 2)}\n`,
  'utf8',
);

console.log(
  `l1-roster.json: ${String(units.length)} units, ${String(partyAssignments.length)} parties, ${String(templates.length)} templates`,
);
