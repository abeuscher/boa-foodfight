/**
 * Round 8 stage 7 — stinkbug damage zones.
 *
 * Coverage:
 *  - Failed recruit/hypnotize against a stinkbug spawns a zone (already
 *    covered in stage 4/5 tests; here we add the end-of-turn damage
 *    + decay coverage).
 *  - Zone deals 1 hp/turn to non-stinkbug units on its tiles.
 *  - Zone respects map bounds (out-of-bounds neighbors drop).
 *  - Zone expires after 5 turns.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { endOfTurn } from './end-of-turn.ts';
import { loadScenario } from './state.ts';
import type {
  DamageZone,
  GameState,
  Party,
  PartyId,
  Plane,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplateId,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const tickClock = (): (() => number) => {
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
  location: TileCoord,
): Party => ({
  id: id as PartyId,
  faction,
  units,
  leaderId: units[0]?.id ?? ('none' as UnitId),
  location,
  orders: [],
  posture: 'fight',
  strategyModifiers: [],
  jellyDoses: 0,
  leaderless: false,
});

const installState = (
  base: GameState,
  parties: readonly Party[],
  zones: readonly DamageZone[],
): GameState => {
  const m = new Map(base.parties);
  for (const p of parties) m.set(p.id, p);
  return { ...base, parties: m, damageZones: zones };
};

describe('round 8 — damage-zone end-of-turn ticks', () => {
  it('damages non-stinkbug units standing on a zone tile', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const center: TileCoord = { plane: 'floor', x: 4, y: 4 };
    const zone: DamageZone = {
      plane: center.plane,
      centerX: center.x,
      centerY: center.y,
      turnsRemaining: 5,
    };
    const f = mkUnit(base, 'ant-footman', 'tg-f');
    const ant = mkParty('test-ant', 'ant', [f], center);
    const state = installState(base, [ant], [zone]);
    const out = endOfTurn(state, { queen: data.queen, jelly: data.jelly }, tickClock());
    const newAnt = out.state.parties.get(ant.id)!;
    expect(newAnt.units[0]?.currentHp).toBe(f.currentHp - 1);
    const tickEvent = out.events.find((e) => e.kind === 'damage-zone-tick');
    expect(tickEvent).toBeDefined();
  });

  it('does not damage stinkbug units (own kind immune)', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const center: TileCoord = { plane: 'floor', x: 4, y: 4 };
    const zone: DamageZone = {
      plane: center.plane,
      centerX: center.x,
      centerY: center.y,
      turnsRemaining: 5,
    };
    const sb = mkUnit(base, 'stinkbug', 'tg-sb');
    const stinkbugParty = mkParty('test-sb', 'neutral', [sb], center);
    const state = installState(base, [stinkbugParty], [zone]);
    const out = endOfTurn(state, { queen: data.queen, jelly: data.jelly }, tickClock());
    const newSB = out.state.parties.get(stinkbugParty.id)!;
    expect(newSB.units[0]?.currentHp).toBe(sb.currentHp);
  });

  it('ignores out-of-bounds neighbors when computing the plus shape', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    // Center at (0, 0) — north and west neighbors are out of bounds.
    const corner: TileCoord = { plane: 'floor', x: 0, y: 0 };
    // Place a unit at (1, 0): the east neighbor; should take damage.
    // Place a unit at (-1, 0) is impossible — we instead place a unit
    // at (0, 1): the south neighbor; should also take damage.
    const eastTile: TileCoord = { plane: 'floor', x: 1, y: 0 };
    const southTile: TileCoord = { plane: 'floor', x: 0, y: 1 };
    const e = mkUnit(base, 'ant-footman', 'tg-east');
    const s = mkUnit(base, 'ant-footman', 'tg-south');
    const eastParty = mkParty('east', 'ant', [e], eastTile);
    const southParty = mkParty('south', 'ant', [s], southTile);
    const zone: DamageZone = {
      plane: corner.plane,
      centerX: corner.x,
      centerY: corner.y,
      turnsRemaining: 5,
    };
    const state = installState(base, [eastParty, southParty], [zone]);
    const out = endOfTurn(state, { queen: data.queen, jelly: data.jelly }, tickClock());
    expect(out.state.parties.get(eastParty.id)!.units[0]?.currentHp).toBe(e.currentHp - 1);
    expect(out.state.parties.get(southParty.id)!.units[0]?.currentHp).toBe(s.currentHp - 1);
  });

  it('expires after 5 turns and emits damage-zone-expired', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const center: TileCoord = { plane: 'floor', x: 5, y: 5 };
    const zone: DamageZone = {
      plane: center.plane,
      centerX: center.x,
      centerY: center.y,
      turnsRemaining: 5,
    };
    let working = installState(base, [], [zone]);
    let sawExpired = false;
    for (let i = 0; i < 5; i++) {
      const out = endOfTurn(working, { queen: data.queen, jelly: data.jelly }, tickClock());
      working = out.state;
      if (out.events.some((e) => e.kind === 'damage-zone-expired')) sawExpired = true;
    }
    expect(sawExpired).toBe(true);
    expect(working.damageZones.length).toBe(0);
  });

  it('multiple stacked zones deal additive damage on the overlapping tile', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const tile: TileCoord = { plane: 'floor', x: 4, y: 4 };
    const z1: DamageZone = {
      plane: tile.plane,
      centerX: tile.x,
      centerY: tile.y,
      turnsRemaining: 5,
    };
    const z2: DamageZone = {
      plane: tile.plane,
      centerX: tile.x,
      centerY: tile.y,
      turnsRemaining: 5,
    };
    const f = mkUnit(base, 'ant-footman', 'tg-stack');
    const ant = mkParty('test-stack', 'ant', [f], tile);
    const state = installState(base, [ant], [z1, z2]);
    const out = endOfTurn(state, { queen: data.queen, jelly: data.jelly }, tickClock());
    expect(out.state.parties.get(ant.id)!.units[0]?.currentHp).toBe(f.currentHp - 2);
  });

  // Light reference to Plane to keep import set used.
  it('plane type is exhaustive (sanity ref)', () => {
    const planes: readonly Plane[] = [
      'floor',
      'ceiling',
      'north-wall',
      'south-wall',
      'east-wall',
      'west-wall',
    ];
    expect(planes.length).toBe(6);
  });
});
