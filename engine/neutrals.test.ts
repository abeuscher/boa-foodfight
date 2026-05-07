/**
 * Round 8 — neutral spawn determinism + placement rules.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { coordKey } from './coord.ts';
import { partyIdForKind } from './neutrals.ts';
import { loadScenario } from './state.ts';
import type { GameState, NeutralKind, PartyId, Plane, TileCoord } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const NEUTRAL_KINDS: readonly NeutralKind[] = ['mice', 'cockroaches', 'stinkbugs'];

const findNeutralLocations = (state: GameState): Map<NeutralKind, TileCoord> => {
  const out = new Map<NeutralKind, TileCoord>();
  for (const kind of NEUTRAL_KINDS) {
    const id = partyIdForKind(kind);
    const party = state.parties.get(id);
    if (party) out.set(kind, party.location);
  }
  return out;
};

describe('round 8 neutral spawn', () => {
  it('spawns three neutral parties, one of each kind', () => {
    const { state } = loadScenario(DATA_DIR, 12345);
    const locs = findNeutralLocations(state);
    expect(locs.size).toBe(3);
    for (const kind of NEUTRAL_KINDS) {
      const id = partyIdForKind(kind);
      const party = state.parties.get(id);
      expect(party).toBeDefined();
      expect(party?.faction).toBe('neutral');
    }
  });

  it('places each neutral on a distinct plane', () => {
    const { state } = loadScenario(DATA_DIR, 12345);
    const planes = new Set<Plane>();
    for (const kind of NEUTRAL_KINDS) {
      const id = partyIdForKind(kind);
      const party = state.parties.get(id);
      expect(party).toBeDefined();
      planes.add(party!.location.plane);
    }
    expect(planes.size).toBe(3);
  });

  it('keeps mice on floor or ceiling', () => {
    for (const seed of [1, 2, 3, 4, 5, 7, 11, 13, 99, 12345]) {
      const { state } = loadScenario(DATA_DIR, seed);
      const mice = state.parties.get(partyIdForKind('mice'));
      expect(mice).toBeDefined();
      expect(['floor', 'ceiling']).toContain(mice!.location.plane);
    }
  });

  it('avoids POSTs and obstacles when picking spawn tiles', () => {
    const { state } = loadScenario(DATA_DIR, 7);
    const postKeys = new Set([...state.posts.values()].map((p) => coordKey(p.location)));
    for (const kind of NEUTRAL_KINDS) {
      const id = partyIdForKind(kind);
      const party = state.parties.get(id);
      expect(party).toBeDefined();
      const tile = state.tiles.get(coordKey(party!.location));
      expect(tile).toBeDefined();
      expect(tile!.terrain.kind).not.toBe('obstacle');
      expect(postKeys.has(coordKey(party!.location))).toBe(false);
    }
  });

  it('produces identical neutral spawns for the same seed', () => {
    const a = loadScenario(DATA_DIR, 42);
    const b = loadScenario(DATA_DIR, 42);
    for (const kind of NEUTRAL_KINDS) {
      const id = partyIdForKind(kind);
      const aParty = a.state.parties.get(id);
      const bParty = b.state.parties.get(id);
      expect(aParty?.location).toEqual(bParty?.location);
    }
  });

  it('produces different neutral spawns for different seeds (at least one of three)', () => {
    const a = loadScenario(DATA_DIR, 1);
    const b = loadScenario(DATA_DIR, 2);
    let differ = false;
    for (const kind of NEUTRAL_KINDS) {
      const id = partyIdForKind(kind);
      const aParty = a.state.parties.get(id);
      const bParty = b.state.parties.get(id);
      if (!aParty || !bParty) {
        differ = true;
        break;
      }
      if (
        aParty.location.plane !== bParty.location.plane ||
        aParty.location.x !== bParty.location.x ||
        aParty.location.y !== bParty.location.y
      ) {
        differ = true;
      }
    }
    expect(differ).toBe(true);
  });

  it('emits one neutral-spawned event per spawned party', () => {
    const loaded = loadScenario(DATA_DIR, 99);
    expect(loaded.neutralSpawnEvents.length).toBe(3);
    const kinds = new Set(loaded.neutralSpawnEvents.map((e) => e.neutralKind));
    expect(kinds).toEqual(new Set<NeutralKind>(['mice', 'cockroaches', 'stinkbugs']));
    const ids = new Set<PartyId>(loaded.neutralSpawnEvents.map((e) => e.partyId));
    expect(ids.size).toBe(3);
  });

  it('attaches a default NeutralStatus for each neutral party', () => {
    const { state } = loadScenario(DATA_DIR, 5);
    for (const kind of NEUTRAL_KINDS) {
      const id = partyIdForKind(kind);
      const status = state.neutralStatus.get(id);
      expect(status).toBeDefined();
      expect(status!.hypnotizedBy).toBeNull();
      expect(status!.hypnoticControlRemaining).toBe(0);
      expect(status!.spiderImmunityRemaining).toBe(0);
      expect(status!.kind).toBe(kind);
    }
  });
});
