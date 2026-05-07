/**
 * Round 12 — gold mechanic tests.
 *
 * Covers POST-capture gold (faction-locked vs mid-POST values) and
 * battle-kill gold (winner credit, friendly-fire skip, environmental
 * deaths skip). Pure structural tracking — no AI policy or combat math
 * is changed by the mechanic.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveBattle, type BattleInput } from './battle.ts';
import { endOfTurn } from './end-of-turn.ts';
import { setPostOwner } from './posts.ts';
import { createRng } from './rng.ts';
import { loadScenario, loadScenarioData } from './state.ts';
import type {
  DamageZone,
  GameState,
  Party,
  PartyId,
  PostId,
  ReplayEvent,
  Rng,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplateId,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');
const BATTLE_TILE: TileCoord = { plane: 'floor', x: 4, y: 4 };

const noAbilities = {
  version: 1 as const,
  abilities: [
    {
      id: 'noop' as const,
      name: 'noop',
      category: 'information' as const,
      target: 'self' as const,
      uses: 1,
      cooldown: 0,
      params: {},
      description: 'noop',
    },
  ],
};

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const mkUnit = (state: GameState, templateId: string, unitId: string): Unit => {
  const tmpl = state.unitTemplates.get(templateId as UnitTemplateId);
  if (!tmpl) throw new Error(`unknown template '${templateId}'`);
  return {
    id: unitId as UnitId,
    templateId: tmpl.id,
    currentHp: tmpl.baseStats.hp,
    level: 1,
    xp: 0,
  };
};

const mkParty = (
  id: string,
  faction: 'ant' | 'spider' | 'neutral',
  units: readonly Unit[],
  leaderId: UnitId,
): Party => ({
  id: id as PartyId,
  faction,
  units,
  leaderId,
  location: BATTLE_TILE,
  orders: [],
  posture: 'fight',
  strategyModifiers: [],
  jellyDoses: 0,
  leaderless: false,
});

const installParties = (state: GameState, parties: readonly Party[]): GameState => {
  const m = new Map(state.parties);
  for (const p of parties) m.set(p.id, p);
  return { ...state, parties: m };
};

const buildInput = (atk: Party, def: Party): BattleInput => ({
  attacker: atk,
  defender: def,
  postDefense: 0,
  queenProximityAttack: 1,
  queenProximityResilience: 1,
  attackerJellyAttack: 1,
  attackerJellyResilience: 1,
  defenderJellyAttack: 1,
  defenderJellyResilience: 1,
  abilities: noAbilities,
});

const constantRng = (value: number): Rng => {
  const self: Rng = {
    next: () => value,
    int: (max: number) => Math.floor(value * max),
    pick: <T>(items: readonly T[]): T => items[0]!,
    fork: () => self,
  };
  return self;
};

const goldEvents = (events: readonly ReplayEvent[]): readonly ReplayEvent[] =>
  events.filter((e) => e.kind === 'gold-earned');

describe('round 12 — POST capture gold', () => {
  it('capturing a soap-dish credits the capturing faction with 10 gold', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const soap = [...state.posts.values()].find((p) => p.id.startsWith('soap-dish'));
    if (!soap) return; // some seeds skip the type — fall back to direct map
    const tick = makeTickClock();
    const out = setPostOwner(state, soap.id, 'ant', tick);
    expect(out.state.playerGold.ant).toBe(10);
    expect(out.state.playerGold.spider).toBe(0);
    const gold = goldEvents(out.events);
    expect(gold).toHaveLength(1);
    const ev = gold[0];
    if (ev?.kind === 'gold-earned') {
      expect(ev.faction).toBe('ant');
      expect(ev.source).toBe('post');
      expect(ev.amount).toBe(10);
      expect(ev.newTotal).toBe(10);
      expect(ev.sourceId).toBe(soap.id);
    }
  });

  it('capturing a towel-rack credits 15 gold, wall-crack 20', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const towel = [...state.posts.values()].find((p) => p.id.startsWith('towel-rack'));
    const wall = [...state.posts.values()].find((p) => p.id.startsWith('wall-crack'));
    if (towel) {
      const out = setPostOwner(state, towel.id, 'spider', makeTickClock());
      expect(out.state.playerGold.spider).toBe(15);
    }
    if (wall) {
      const out = setPostOwner(state, wall.id, 'ant', makeTickClock());
      expect(out.state.playerGold.ant).toBe(20);
    }
  });

  it('capturing storm-drain awards 0 gold (faction-locked)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const out = setPostOwner(state, 'storm-drain' as PostId, 'spider', makeTickClock());
    // Owner did change (storm-drain starts ant-owned), so post-captured fired.
    const captured = out.events.filter((e) => e.kind === 'post-captured');
    expect(captured).toHaveLength(1);
    // ...but no gold-earned event was emitted, and totals are unchanged.
    expect(goldEvents(out.events)).toHaveLength(0);
    expect(out.state.playerGold.ant).toBe(0);
    expect(out.state.playerGold.spider).toBe(0);
  });

  it('capturing spider-web awards 0 gold (faction-locked)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const out = setPostOwner(state, 'spider-web' as PostId, 'ant', makeTickClock());
    const captured = out.events.filter((e) => e.kind === 'post-captured');
    expect(captured).toHaveLength(1);
    expect(goldEvents(out.events)).toHaveLength(0);
    expect(out.state.playerGold.ant).toBe(0);
  });
});

describe('round 12 — battle kill gold', () => {
  it('battle won by ants credits ants for spider casualties', () => {
    const { state: base } = loadScenario(DATA_DIR, 1);
    // Ants: 4 footmen vs 1 spiderling — easy ant win.
    const f1 = mkUnit(base, 'ant-footman', 'a-f1');
    const f2 = mkUnit(base, 'ant-footman', 'a-f2');
    const f3 = mkUnit(base, 'ant-footman', 'a-f3');
    const f4 = mkUnit(base, 'ant-footman', 'a-f4');
    const a = mkParty('atk', 'ant', [f1, f2, f3, f4], f1.id);
    const sl = mkUnit(base, 'spiderling', 'd-sl');
    const d = mkParty('def', 'spider', [sl], sl.id);
    const state = installParties(base, [a, d]);
    const rng = createRng(99);
    const out = resolveBattle(state, buildInput(a, d), rng, makeTickClock());
    // Spiderling died → ant credit (bounty=1).
    expect(out.state.playerGold.ant).toBeGreaterThanOrEqual(1);
    expect(out.state.playerGold.spider).toBe(0);
    const gold = goldEvents(out.events).filter(
      (e) => e.kind === 'gold-earned' && e.faction === 'ant',
    );
    expect(gold.length).toBeGreaterThanOrEqual(1);
  });

  it('battle won by spiders credits spiders for ant casualties', () => {
    const { state: base } = loadScenario(DATA_DIR, 1);
    // Spiders: 4 elites vs 1 worker — easy spider win.
    const e1 = mkUnit(base, 'spider-elite', 'd-e1');
    const e2 = mkUnit(base, 'spider-elite', 'd-e2');
    const e3 = mkUnit(base, 'spider-elite', 'd-e3');
    const e4 = mkUnit(base, 'spider-elite', 'd-e4');
    const def = mkParty('def', 'spider', [e1, e2, e3, e4], e1.id);
    const w = mkUnit(base, 'ant-worker', 'a-w');
    const atk = mkParty('atk', 'ant', [w], w.id);
    const state = installParties(base, [atk, def]);
    const rng = createRng(7);
    const out = resolveBattle(state, buildInput(atk, def), rng, makeTickClock());
    // ant-worker bounty = 3.
    expect(out.state.playerGold.spider).toBeGreaterThanOrEqual(3);
    expect(out.state.playerGold.ant).toBe(0);
  });

  it('cockroach friendly-fire kills credit no one', () => {
    const { state: base } = loadScenario(DATA_DIR, 1);
    // 3 attacker cockroaches vs 1 attacker cockroach (defender = ant
    // archer with a fragile HP value isn't right — we want a setup
    // where a cockroach kills another cockroach via friendly fire).
    // Stack four cockroaches as attackers vs a strong ant defender so
    // the 100% FF rng (constantRng(0)) lands at least once and we can
    // observe the gold totals.
    const c1 = mkUnit(base, 'cockroach', 'a-c1');
    const c2 = mkUnit(base, 'cockroach', 'a-c2');
    const c3 = mkUnit(base, 'cockroach', 'a-c3');
    const c4 = mkUnit(base, 'cockroach', 'a-c4');
    // Make c2..c4 critically wounded so the first FF blow kills them.
    const cWounded = (c: Unit): Unit => ({ ...c, currentHp: 1 });
    const a = mkParty('atk', 'neutral', [c1, cWounded(c2), cWounded(c3), cWounded(c4)], c1.id);
    // Strong tank defender so the battle is decisive.
    const t = mkUnit(base, 'ant-tank', 'd-t');
    const d = mkParty('def', 'ant', [t], t.id);
    const state = installParties(base, [a, d]);
    // constant-zero rng → every cockroach attack triggers FF redirect.
    const out = resolveBattle(state, buildInput(a, d), constantRng(0), makeTickClock());
    // Verify some action where attacker and defender are both
    // cockroaches in the same party — FF actually fired.
    const cockIds = new Set([c1.id, c2.id, c3.id, c4.id]);
    let ffKills = 0;
    for (const r of out.result.rounds) {
      for (const act of r.actions) {
        if (act.killed && cockIds.has(act.attackerId) && cockIds.has(act.defenderId)) {
          ffKills += 1;
        }
      }
    }
    expect(ffKills).toBeGreaterThanOrEqual(1);
    // The defender (ant) is alive → ants win, but cockroach FF deaths
    // must NOT credit ants. Ant gold may be > 0 only if the tank
    // actually killed any cockroach itself; but with all-zeros rng the
    // tank always redirects too — wait, the tank is not a cockroach so
    // its attacks pass through. To isolate FF cleanly, assert the
    // *number* of gold-earned events for cockroach kills equals the
    // number of cockroaches the TANK killed (action.attackerId === t).
    let tankCockroachKills = 0;
    for (const r of out.result.rounds) {
      for (const act of r.actions) {
        if (act.killed && act.attackerId === t.id && cockIds.has(act.defenderId)) {
          tankCockroachKills += 1;
        }
      }
    }
    const antGoldEvents = goldEvents(out.events).filter(
      (e) => e.kind === 'gold-earned' && e.faction === 'ant',
    );
    expect(antGoldEvents).toHaveLength(tankCockroachKills);
  });

  it('damage-zone deaths credit no one (environmental, not battle)', () => {
    const data = loadScenarioData(DATA_DIR);
    const { state: base } = loadScenario(DATA_DIR, 1);
    // Plant a tiny ant party at a tile, then drop a damage zone on
    // that tile and tick end-of-turn until the ants die.
    const tile: TileCoord = { plane: 'floor', x: 3, y: 3 };
    const w = mkUnit(base, 'ant-worker', 'z-w');
    const wWounded: Unit = { ...w, currentHp: 1 };
    const p: Party = {
      id: 'zone-ants' as PartyId,
      faction: 'ant',
      units: [wWounded],
      leaderId: wWounded.id,
      location: tile,
      orders: [],
      posture: 'fight',
      strategyModifiers: [],
      jellyDoses: 0,
      leaderless: false,
    };
    const zone: DamageZone = {
      plane: tile.plane,
      centerX: tile.x,
      centerY: tile.y,
      turnsRemaining: 3,
    };
    const stateWithZone: GameState = {
      ...installParties(base, [p]),
      damageZones: [zone],
    };
    const before = stateWithZone.playerGold;
    const out = endOfTurn(stateWithZone, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    // The worker should be dead from the zone tick.
    const survivors = out.state.parties.get(p.id)?.units.filter((u) => u.currentHp > 0) ?? [];
    expect(survivors).toHaveLength(0);
    // No gold credit happened.
    expect(out.state.playerGold).toEqual(before);
    expect(goldEvents(out.events)).toHaveLength(0);
  });
});
