/**
 * L9 (Basement) dynamic-hazard surface (§3.6 / §4a #5 Sump-Pump +
 * #6 Boiler — one shared engine surface).
 *
 *   - Boiler (always-on): a `hazardField` with no suppress owner
 *     damages units on its tiles every end-of-turn + emits a
 *     `hazard-field-tick`.
 *   - Sump-Pump (toggle): `suppressedWhenOwnedBy` drains the field
 *     when the POST is owned by that faction; floods it otherwise.
 *   - Overlapping fields stack additively (damage-zone convention).
 *   - Units off the governed tiles are untouched.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { endOfTurn } from './end-of-turn.ts';
import { loadScenario } from './state.ts';
import type { Faction, GameState, PartyId, Post, PostId, TileCoord, Unit } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const TILE: TileCoord = { plane: 'floor', x: 4, y: 4 };
const OFF_TILE: TileCoord = { plane: 'floor', x: 7, y: 7 };

const firstAntFieldPartyId = (state: GameState): PartyId => {
  for (const p of state.parties.values()) {
    if (p.faction !== 'ant') continue;
    const isQueen = p.units.some(
      (u) => state.unitTemplates.get(u.templateId)?.tags.includes('queen') === true,
    );
    if (!isQueen && p.units.some((u) => u.currentHp > 0)) return p.id;
  }
  throw new Error('no living ant field party');
};

const moveParty = (state: GameState, id: PartyId, location: TileCoord): GameState => {
  const parties = new Map(state.parties);
  const p = parties.get(id);
  if (!p) throw new Error(`no party ${String(id)}`);
  parties.set(id, { ...p, location });
  return { ...state, parties };
};

const addHazardPost = (
  state: GameState,
  id: string,
  owner: Faction,
  hazardField: NonNullable<Post['hazardField']>,
): GameState => {
  const posts = new Map(state.posts);
  posts.set(id as PostId, {
    id: id as PostId,
    name: id,
    location: { plane: 'north-wall', x: 0, y: 0 },
    owner,
    defensiveBonus: 0,
    healingRate: 0,
    hazardField,
    tags: [],
    capturingFaction: null,
    captureTurnsRemaining: null,
  });
  return { ...state, posts };
};

const run = (state: GameState) => {
  const { data } = loadScenario(DATA_DIR, 1);
  return endOfTurn(state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
};

const partyHp = (state: GameState, id: PartyId): number => {
  let sum = 0;
  for (const u of state.parties.get(id)?.units ?? []) sum += u.currentHp;
  return sum;
};
const livingCount = (units: readonly Unit[]): number => units.filter((u) => u.currentHp > 0).length;

describe('L9 dynamic hazard field', () => {
  it('no hazardField POST → no hazard damage and no tick event', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const id = firstAntFieldPartyId(state);
    const s = moveParty(state, id, TILE);
    const before = partyHp(s, id);
    const out = run(s);
    expect(partyHp(out.state, id)).toBe(before);
    expect(out.events.some((e) => e.kind === 'hazard-field-tick')).toBe(false);
  });

  it('Boiler (always-on): damages units on a governed tile + emits a tick', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const id = firstAntFieldPartyId(state);
    let s = moveParty(state, id, TILE);
    s = addHazardPost(s, 'boiler', 'spider', { tiles: [TILE], damage: 2 });
    const livePre = livingCount(s.parties.get(id)!.units);
    const before = partyHp(s, id);
    const out = run(s);
    expect(partyHp(out.state, id)).toBe(before - 2 * livePre);
    const tick = out.events.find((e) => e.kind === 'hazard-field-tick');
    expect(tick?.kind).toBe('hazard-field-tick');
    if (tick?.kind === 'hazard-field-tick') {
      expect(tick.postId).toBe('boiler');
      expect(tick.damage).toBe(2);
      expect(tick.affectedUnits.length).toBe(livePre);
    }
  });

  it('a party off the governed tiles is untouched', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const id = firstAntFieldPartyId(state);
    let s = moveParty(state, id, OFF_TILE);
    s = addHazardPost(s, 'boiler', 'spider', { tiles: [TILE], damage: 5 });
    const before = partyHp(s, id);
    const out = run(s);
    expect(partyHp(out.state, id)).toBe(before);
  });

  it('Sump-Pump drained: field off when the POST is owned by the suppress faction', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const id = firstAntFieldPartyId(state);
    let s = moveParty(state, id, TILE);
    s = addHazardPost(s, 'sump-pump', 'ant', {
      tiles: [TILE],
      damage: 3,
      suppressedWhenOwnedBy: 'ant',
    });
    const before = partyHp(s, id);
    const out = run(s);
    expect(partyHp(out.state, id)).toBe(before);
    expect(out.events.some((e) => e.kind === 'hazard-field-tick')).toBe(false);
  });

  it('Sump-Pump flooded: field on when the POST is NOT owned by the suppress faction', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const id = firstAntFieldPartyId(state);
    let s = moveParty(state, id, TILE);
    s = addHazardPost(s, 'sump-pump', 'spider', {
      tiles: [TILE],
      damage: 3,
      suppressedWhenOwnedBy: 'ant',
    });
    const livePre = livingCount(s.parties.get(id)!.units);
    const before = partyHp(s, id);
    const out = run(s);
    expect(partyHp(out.state, id)).toBe(before - 3 * livePre);
  });

  it('overlapping hazard fields stack additively on the shared tile', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const id = firstAntFieldPartyId(state);
    let s = moveParty(state, id, TILE);
    s = addHazardPost(s, 'boiler-a', 'spider', { tiles: [TILE], damage: 2 });
    s = addHazardPost(s, 'boiler-b', 'spider', { tiles: [TILE], damage: 1 });
    const livePre = livingCount(s.parties.get(id)!.units);
    const before = partyHp(s, id);
    const out = run(s);
    expect(partyHp(out.state, id)).toBe(before - 3 * livePre);
    expect(out.events.filter((e) => e.kind === 'hazard-field-tick')).toHaveLength(2);
  });
});
