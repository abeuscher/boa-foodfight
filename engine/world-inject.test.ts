import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ENEMY_AIS, neutralPlayer, PLAYER_AIS } from '../ai/index.ts';

import { createTickClock } from './replay.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, PartyId } from './types.ts';
import { extractWorldRoster } from './world-extract.ts';
import { injectWorldRoster, scaffoldFromState } from './world-inject.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const runL1 = (seed: number): GameState => {
  const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(DATA_DIR, seed);
  const player = PLAYER_AIS.baseline;
  const enemy = ENEMY_AIS['spider-l1'];
  if (!player || !enemy) throw new Error('missing AI');
  const clock = createTickClock();
  const outcome = runScenario(state, data, createRng(seed), clock.next, {
    maxTurns: 100,
    policies: [player, enemy, neutralPlayer],
    neutralSpawnEvents,
    itemSpawnEvents,
  });
  return outcome.finalState;
};

describe('engine/world-inject', () => {
  it('rebuilds ant parties from a carried roster and keeps spider parties', () => {
    const finalState = runL1(1);
    const roster = extractWorldRoster({ finalState, winner: finalState.winner });

    const next = loadScenario(DATA_DIR, 2);
    const scaffold = scaffoldFromState(next.state);
    const { state, report } = injectWorldRoster(next.state, roster, scaffold);

    // Spider parties survived verbatim from the fresh scenario.
    const spiderBefore = [...next.state.parties.values()].filter(
      (p) => p.faction === 'spider',
    ).length;
    const spiderAfter = [...state.parties.values()].filter((p) => p.faction === 'spider').length;
    expect(spiderAfter).toBe(spiderBefore);

    // Every ant party in the injected state is built from carried unit ids.
    const carriedIds = new Set(roster.units.map((u) => u.id));
    for (const p of state.parties.values()) {
      if (p.faction !== 'ant') continue;
      for (const u of p.units) expect(carriedIds.has(u.id)).toBe(true);
    }
    expect(report.antUnitsPlaced).toBeGreaterThan(0);
    expect(report.rebuiltParties.length).toBeGreaterThan(0);
  });

  it('carries level / xp / charisma / promoted onto injected units', () => {
    const finalState = runL1(3);
    const roster = extractWorldRoster({ finalState, winner: finalState.winner });
    const next = loadScenario(DATA_DIR, 4);
    const scaffold = scaffoldFromState(next.state);
    const { state } = injectWorldRoster(next.state, roster, scaffold);

    const byId = new Map(roster.units.map((u) => [u.id, u] as const));
    for (const p of state.parties.values()) {
      if (p.faction !== 'ant') continue;
      for (const u of p.units) {
        const wu = byId.get(u.id);
        expect(wu).toBeDefined();
        if (!wu) continue;
        expect(u.xp).toBe(wu.xp);
        expect(u.level).toBe(wu.level);
        if (wu.promoted) expect(u.promoted).toBe(true);
      }
    }
  });

  it('respects the 8-slot party cap and trims overflow', () => {
    const finalState = runL1(5);
    const roster = extractWorldRoster({ finalState, winner: finalState.winner });
    const next = loadScenario(DATA_DIR, 6);
    const scaffold = scaffoldFromState(next.state);
    const { state } = injectWorldRoster(next.state, roster, scaffold);
    for (const [id, p] of state.parties) {
      if (p.faction !== 'ant') continue;
      const cap = id === ('queen-guard' as PartyId) ? 12 : 8;
      let slots = 0;
      for (const u of p.units) {
        slots += next.state.unitTemplates.get(u.templateId)?.slotCost ?? 0;
      }
      expect(slots).toBeLessThanOrEqual(cap);
    }
  });

  it('drops a scaffold party with no surviving carried units', () => {
    const next = loadScenario(DATA_DIR, 8);
    const scaffold = scaffoldFromState(next.state);
    // Empty roster: every ant party should be dropped.
    const { state, report } = injectWorldRoster(
      next.state,
      { faction: 'ant', units: [], partyAssignments: [] },
      scaffold,
    );
    const antParties = [...state.parties.values()].filter((p) => p.faction === 'ant');
    expect(antParties.length).toBe(0);
    expect(report.droppedParties.length).toBe(scaffold.size);
    expect(report.antUnitsPlaced).toBe(0);
  });
});
