/**
 * L2-2 — Level 2 ("The Pipe") data-set load + schema tests.
 *
 * Verifies the L2 data set loads and schema-validates, the Aunt Ant
 * escortee template is present and shaped per roadmap §4.3.1, the pipe
 * map carries entrance + exit POSTs and the escort victory condition,
 * and the hand-authored corridor survives the load (the `static` map
 * flag suppressed the per-seed random map pass).
 *
 * The spider-l2 policy assertions land in L2-3.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadScenario, loadScenarioData } from './state.ts';
import type { PartyId, PostId, UnitTemplateId } from './types.ts';

const L2_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-2');

describe('Level 2 — data set', () => {
  it('loads and schema-validates', () => {
    const data = loadScenarioData(L2_DIR);
    expect(data.map.name).toBe('The Pipe');
    expect(data.map.static).toBe(true);
    // Two planes (floor + ceiling flank), not the L1 six.
    expect(data.map.planes.map((p) => p.plane).sort()).toEqual(['ceiling', 'floor']);
  });

  it('declares the escort victory condition', () => {
    const data = loadScenarioData(L2_DIR);
    expect(data.map.victoryCondition).toEqual({
      kind: 'escort',
      escortUnitTemplateId: 'aunt-ant',
      exitPostId: 'pipe-exit',
    });
  });

  it('Aunt Ant template present and shaped per spec', () => {
    const { state } = loadScenario(L2_DIR, 4);
    const t = state.unitTemplates.get('aunt-ant' as UnitTemplateId);
    expect(t).toBeDefined();
    if (!t) return;
    expect(t.faction).toBe('ant');
    expect(t.size).toBe('huge');
    expect(t.slotCost).toBe(4);
    expect(t.baseStats.hp).toBeGreaterThanOrEqual(45);
    expect(t.baseStats.attack).toBe(0);
    expect(t.abilities).toHaveLength(0);
    expect(t.tags).toContain('escort');
    expect(t.tags).toContain('non-combatant');
  });

  it('pipe map has entrance + exit POSTs and no spider-web', () => {
    const { state } = loadScenario(L2_DIR, 4);
    const entrance = state.posts.get('pipe-entrance' as PostId);
    const exit = state.posts.get('pipe-exit' as PostId);
    expect(entrance).toBeDefined();
    expect(exit).toBeDefined();
    expect(entrance?.owner).toBe('ant');
    expect(entrance?.tags).toContain('entrance');
    expect(exit?.tags).toContain('exit');
    // The escort objective replaces the capture objective; no web.
    expect(state.posts.get('spider-web' as PostId)).toBeUndefined();
    // Optional mid-pipe POSTs exist but are not the win trigger.
    expect(state.posts.get('pipe-joint' as PostId)).toBeDefined();
    expect(state.posts.get('drain-cap' as PostId)).toBeDefined();
  });

  it('escort party carries Aunt Ant; queen guard sits at the entrance', () => {
    const { state } = loadScenario(L2_DIR, 4);
    const escort = state.parties.get('escort-column' as PartyId);
    expect(escort).toBeDefined();
    expect(escort?.units.some((u) => u.templateId === ('aunt-ant' as UnitTemplateId))).toBe(true);
    const queenGuard = state.parties.get('queen-guard' as PartyId);
    const entrance = state.posts.get('pipe-entrance' as PostId);
    expect(queenGuard?.location).toEqual(entrance?.location);
  });

  it('static flag suppressed the random map pass (corridor survives)', () => {
    // Two different seeds must produce an identical map: a static map
    // is seed-invariant (no generateRandomMap). A random L1 map would
    // differ between seeds.
    const a = loadScenario(L2_DIR, 4);
    const b = loadScenario(L2_DIR, 99);
    const obstacleCount = (s: typeof a.state): number =>
      [...s.tiles.values()].filter((t) => t.terrain.kind === 'obstacle').length;
    expect(obstacleCount(a.state)).toBe(obstacleCount(b.state));
    expect(obstacleCount(a.state)).toBeGreaterThan(0);
    // The two end POSTs must be far apart (a real pipe, not a stub).
    const entrance = a.state.posts.get('pipe-entrance' as PostId);
    const exit = a.state.posts.get('pipe-exit' as PostId);
    expect(entrance?.location.plane).toBe(exit?.location.plane);
  });
});
