/**
 * L5 (Bedroom) Under-Bed concealment / fog-immunity (§3.7).
 *
 * An ant party standing on a `concealment` POST emits NO pheromone
 * trail that turn and any existing trail is cleared, so the spider's
 * trail-scouting can no longer see it. The mechanic lives entirely in
 * engine trail-emission; the locked spider-AI visibility helper
 * `getSpiderVisibleAntTrail` is unchanged and simply finds no entries
 * for a concealed party (asserted directly below).
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getSpiderVisibleAntTrail } from '../ai/policy-helpers.ts';

import { endOfTurn } from './end-of-turn.ts';
import { loadScenario } from './state.ts';
import type { GameState, PartyId, Post, PostId, TileCoord } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const firstAntFieldPartyId = (state: GameState): PartyId => {
  for (const p of state.parties.values()) {
    if (p.faction !== 'ant') continue;
    const isQueen = p.units.some((u) =>
      state.unitTemplates.get(u.templateId)?.tags.includes('queen'),
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

const addConcealmentPost = (state: GameState, location: TileCoord): GameState => {
  const posts = new Map(state.posts);
  const post: Post = {
    id: 'under-bed' as PostId,
    name: 'under-bed',
    location,
    owner: 'ant',
    defensiveBonus: 0,
    healingRate: 0,
    concealment: true,
    tags: [],
    capturingFaction: null,
    captureTurnsRemaining: null,
  };
  posts.set(post.id, post);
  return { ...state, posts };
};

const run = (state: GameState) => {
  const { data } = loadScenario(DATA_DIR, 1);
  return endOfTurn(state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
};

describe('Under-Bed concealment — pheromone trail', () => {
  const TILE: TileCoord = { plane: 'floor', x: 4, y: 4 };

  it('control: an unconcealed ant party emits a fresh trail breadcrumb', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const id = firstAntFieldPartyId(state);
    const s = moveParty(state, id, TILE);
    const out = run(s);
    const trail = out.state.pheroTrails.get(id) ?? [];
    expect(trail.length).toBeGreaterThan(0);
    expect(trail[0]).toEqual({ plane: 'floor', x: 4, y: 4, ageInTurns: 0 });
    // The spider can see it.
    const seen = getSpiderVisibleAntTrail(out.state).filter((e) => e.partyId === id);
    expect(seen.length).toBeGreaterThan(0);
  });

  it('a party on a concealment POST emits an empty trail', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const id = firstAntFieldPartyId(state);
    let s = moveParty(state, id, TILE);
    s = addConcealmentPost(s, TILE);
    const out = run(s);
    expect(out.state.pheroTrails.get(id)).toEqual([]);
    // ...and the spider's only window onto ant positions shows nothing
    // for the concealed party.
    const seen = getSpiderVisibleAntTrail(out.state).filter((e) => e.partyId === id);
    expect(seen).toHaveLength(0);
  });

  it('concealment also clears a pre-existing trail (historical breadcrumbs gone)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const id = firstAntFieldPartyId(state);
    let s = moveParty(state, id, TILE);
    s = addConcealmentPost(s, TILE);
    // Seed a stale trail the party would otherwise carry forward.
    s = {
      ...s,
      pheroTrails: new Map([[id, [{ plane: 'floor', x: 1, y: 1, ageInTurns: 1 }]]]),
    };
    const out = run(s);
    expect(out.state.pheroTrails.get(id)).toEqual([]);
  });

  it('leaving the concealment POST resumes trail emission', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const id = firstAntFieldPartyId(state);
    // Off the POST (POST exists elsewhere) → normal emission.
    let s = moveParty(state, id, TILE);
    s = addConcealmentPost(s, { plane: 'floor', x: 9, y: 9 });
    const out = run(s);
    const trail = out.state.pheroTrails.get(id) ?? [];
    expect(trail.length).toBeGreaterThan(0);
    expect(trail[0]).toEqual({ plane: 'floor', x: 4, y: 4, ageInTurns: 0 });
  });
});
