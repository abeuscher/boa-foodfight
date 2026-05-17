/**
 * L4 (Hallway) Light-Switch flip-state POST → global combat modifier
 * (§3.8 / §4a #1).
 *
 *   1. No `combatModifier` POST → zero offset (byte-identical case).
 *   2. UNLIT switch (owner ≠ litOwner) → the configured faction gets
 *      +attack; the other faction is unaffected.
 *   3. LIT switch (owner === litOwner) → modifier off.
 *   4. Multiple unlit modifiers sum per faction.
 *   5. `lightSwitchAttackFor` is faction-scoped; neutral → 0.
 *   6. The delta actually reaches combat damage (via `resolveBattle`).
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveBattle, type BattleInput } from './battle.ts';
import { computeLightSwitchAttack, lightSwitchAttackFor } from './light-switch.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import type { Faction, GameState, Party, PostId } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const addSwitch = (
  state: GameState,
  owner: Faction,
  cm: { litOwner: Faction; faction: Faction; attack: number },
): GameState => {
  const posts = new Map(state.posts);
  posts.set('light-switch' as PostId, {
    id: 'light-switch' as PostId,
    name: 'light-switch',
    location: { plane: 'north-wall', x: 5, y: 5 },
    owner,
    defensiveBonus: 0,
    healingRate: 0,
    combatModifier: cm,
    tags: [],
    capturingFaction: null,
    captureTurnsRemaining: null,
  });
  return { ...state, posts };
};

const firstFieldAnt = (state: GameState): Party => {
  for (const p of state.parties.values()) {
    if (p.faction !== 'ant') continue;
    const isQueen = p.units.some(
      (u) => state.unitTemplates.get(u.templateId)?.tags.includes('queen') === true,
    );
    if (!isQueen) return p;
  }
  throw new Error('no field ant party');
};

const firstSpider = (state: GameState): Party => {
  for (const p of state.parties.values()) {
    if (p.faction === 'spider') return p;
  }
  throw new Error('no spider party');
};

describe('engine/light-switch offsets', () => {
  it('1. no combatModifier POST → zero offset for both factions', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const o = computeLightSwitchAttack(state);
    expect(o).toEqual({ ant: 0, spider: 0 });
  });

  it('2. UNLIT switch grants the configured faction +attack only', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // litOwner ant, but POST is spider-owned → unlit → spiders +2.
    const s = addSwitch(state, 'spider', { litOwner: 'ant', faction: 'spider', attack: 2 });
    const o = computeLightSwitchAttack(s);
    expect(o).toEqual({ ant: 0, spider: 2 });
    expect(lightSwitchAttackFor(o, 'spider')).toBe(2);
    expect(lightSwitchAttackFor(o, 'ant')).toBe(0);
  });

  it('3. LIT switch (owner === litOwner) disables the modifier', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const s = addSwitch(state, 'ant', { litOwner: 'ant', faction: 'spider', attack: 2 });
    expect(computeLightSwitchAttack(s)).toEqual({ ant: 0, spider: 0 });
  });

  it('4. multiple unlit modifiers sum per faction', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    let s = addSwitch(state, 'spider', { litOwner: 'ant', faction: 'ant', attack: 1 });
    // A second modifier POST under a different id.
    const posts = new Map(s.posts);
    posts.set('light-switch-2' as PostId, {
      id: 'light-switch-2' as PostId,
      name: 'light-switch-2',
      location: { plane: 'south-wall', x: 1, y: 1 },
      owner: 'neutral',
      defensiveBonus: 0,
      healingRate: 0,
      combatModifier: { litOwner: 'ant', faction: 'ant', attack: 3 },
      tags: [],
      capturingFaction: null,
      captureTurnsRemaining: null,
    });
    s = { ...s, posts };
    expect(computeLightSwitchAttack(s)).toEqual({ ant: 4, spider: 0 });
  });

  it('5. lightSwitchAttackFor: neutral always 0', () => {
    const o = { ant: 3, spider: 5 } as const;
    expect(lightSwitchAttackFor(o, 'neutral')).toBe(0);
  });

  it('6. the delta reaches combat damage (unlit vs lit differ, same seed)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const ant = firstFieldAnt(state);
    const spider = firstSpider(state);
    const input: BattleInput = {
      attacker: ant,
      defender: spider,
      postDefense: 0,
      queenProximityAttack: 1,
      queenProximityResilience: 1,
      attackerJellyAttack: 1,
      attackerJellyResilience: 1,
      defenderJellyAttack: 1,
      defenderJellyResilience: 1,
      abilities: data.abilities,
    };
    // Large delta so the change is unambiguous against equal RNG.
    const cm = { litOwner: 'ant' as Faction, faction: 'ant' as Faction, attack: 6 };
    const unlit = addSwitch(state, 'spider', cm); // ants +6 attack
    const lit = addSwitch(state, 'ant', cm); // modifier off
    const outUnlit = resolveBattle(unlit, input, createRng(11), makeTickClock());
    const outLit = resolveBattle(lit, input, createRng(11), makeTickClock());
    expect(computeLightSwitchAttack(unlit)).toEqual({ ant: 6, spider: 0 });
    expect(computeLightSwitchAttack(lit)).toEqual({ ant: 0, spider: 0 });
    expect(JSON.stringify(outUnlit.events)).not.toBe(JSON.stringify(outLit.events));
  });
});
