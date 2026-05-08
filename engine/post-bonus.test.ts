/**
 * Round 28 — POST-occupation combat bonus tests.
 *
 * Covers:
 *   1. Owning 0 mid-POSTs → 0 bonus.
 *   2. Owning 1 mid-POST → +1/+1 bonus.
 *   3. Owning all mid-POSTs → bonus capped at MAX_BONUS_POINTS.
 *   4. storm-drain + spider-web do NOT count toward bonus (home bases).
 *   5. Bonus is applied to combat damage for the correct faction.
 *   6. Capture in progress (round 17) doesn't grant bonus until
 *      ownership flips.
 *   7. Battle resolution emits the round-28 summary event.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveBattle, type BattleInput } from './battle.ts';
import {
  MAX_BONUS_POINTS,
  computePostOccupationOffsets,
  countNonBasePostsOwned,
  isHomeBasePost,
  offsetForFaction,
} from './post-bonus.ts';
import { POST_CAPTURE_TURNS } from './post-capture.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import type { Faction, GameState, Party, PartyId, Post, PostId } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const STORM_DRAIN = 'storm-drain' as PostId;
const SPIDER_WEB = 'spider-web' as PostId;

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const setOwner = (state: GameState, postId: PostId, owner: Faction): GameState => {
  const post = state.posts.get(postId);
  if (!post) throw new Error(`no post ${String(postId)}`);
  const posts = new Map(state.posts);
  posts.set(postId, { ...post, owner });
  return { ...state, posts };
};

const clearAllOwners = (state: GameState): GameState => {
  const posts = new Map<PostId, Post>();
  for (const [id, post] of state.posts) {
    if (id === STORM_DRAIN || id === SPIDER_WEB) {
      posts.set(id, post);
      continue;
    }
    posts.set(id, { ...post, owner: 'neutral' });
  }
  return { ...state, posts };
};

const midPostIds = (state: GameState): readonly PostId[] => {
  const out: PostId[] = [];
  for (const [id] of state.posts) {
    if (id === STORM_DRAIN || id === SPIDER_WEB) continue;
    out.push(id);
  }
  return out;
};

const firstFieldAnt = (state: GameState): Party => {
  for (const p of state.parties.values()) {
    if (p.faction !== 'ant') continue;
    const isQueen = p.units.some((u) => {
      const tmpl = state.unitTemplates.get(u.templateId);
      return tmpl?.tags.includes('queen') === true;
    });
    if (!isQueen) return p;
  }
  throw new Error('no field ant party found');
};

const firstSpider = (state: GameState): Party => {
  for (const p of state.parties.values()) {
    if (p.faction === 'spider') return p;
  }
  throw new Error('no spider party found');
};

describe('engine/post-bonus offsets', () => {
  it('1. owning 0 mid-POSTs → 0 bonus for both factions', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const cleared = clearAllOwners(state);
    const offsets = computePostOccupationOffsets(cleared);
    expect(offsets.ant).toEqual({ attack: 0, armor: 0 });
    expect(offsets.spider).toEqual({ attack: 0, armor: 0 });
  });

  it('2. owning 1 mid-POST → +1/+1 bonus for that faction', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const cleared = clearAllOwners(state);
    const ids = midPostIds(cleared);
    expect(ids.length).toBeGreaterThan(0);
    const owned = setOwner(cleared, ids[0]!, 'ant');
    const offsets = computePostOccupationOffsets(owned);
    expect(offsets.ant).toEqual({ attack: 1, armor: 1 });
    expect(offsets.spider).toEqual({ attack: 0, armor: 0 });
  });

  it('3. owning all mid-POSTs → bonus capped at MAX_BONUS_POINTS', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const cleared = clearAllOwners(state);
    const ids = midPostIds(cleared);
    let owned = cleared;
    for (const id of ids) {
      owned = setOwner(owned, id, 'ant');
    }
    const offsets = computePostOccupationOffsets(owned);
    // Bonus is +1 attack / +1 armor per owned non-base POST, capped
    // at MAX_BONUS_POINTS so a snowballed ant team doesn't compound a
    // multi-point swing through every battle. The raw count is
    // exposed through `countNonBasePostsOwned` for telemetry.
    const cap = Math.min(ids.length, MAX_BONUS_POINTS);
    expect(offsets.ant.attack).toBe(cap);
    expect(offsets.ant.armor).toBe(cap);
    expect(countNonBasePostsOwned(owned, 'ant')).toBe(ids.length);
    // The map generator picks 3-5 mid-POSTs per scenario (storm-drain
    // and spider-web are fixed home bases).
    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(ids.length).toBeLessThanOrEqual(5);
  });

  it('4. storm-drain and spider-web do NOT count toward the bonus', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // Storm-drain is ant-owned and spider-web is spider-owned by
    // default. With every mid-POST neutral, both bonuses must be 0.
    const cleared = clearAllOwners(state);
    expect(cleared.posts.get(STORM_DRAIN)?.owner).toBe<Faction>('ant');
    expect(cleared.posts.get(SPIDER_WEB)?.owner).toBe<Faction>('spider');
    const offsets = computePostOccupationOffsets(cleared);
    expect(offsets.ant).toEqual({ attack: 0, armor: 0 });
    expect(offsets.spider).toEqual({ attack: 0, armor: 0 });
    expect(isHomeBasePost(STORM_DRAIN)).toBe(true);
    expect(isHomeBasePost(SPIDER_WEB)).toBe(true);
    expect(countNonBasePostsOwned(cleared, 'ant')).toBe(0);
    expect(countNonBasePostsOwned(cleared, 'spider')).toBe(0);
  });

  it('5. bonus is applied in damage calculation for the correct faction', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const cleared = clearAllOwners(state);
    const ids = midPostIds(cleared);
    // Give ants every mid-POST so the +N/+N bonus is unambiguous.
    let owned = cleared;
    for (const id of ids) owned = setOwner(owned, id, 'ant');

    // Pull two parties to fight: an ant attacker vs a spider defender.
    const ant = firstFieldAnt(owned);
    const spider = firstSpider(owned);
    const partiesNoBonus = new Map(cleared.parties);
    partiesNoBonus.set(ant.id, { ...ant });
    partiesNoBonus.set(spider.id, { ...spider });
    const stateNoBonus: GameState = { ...cleared, parties: partiesNoBonus };
    const partiesBonus = new Map(owned.parties);
    partiesBonus.set(ant.id, { ...ant });
    partiesBonus.set(spider.id, { ...spider });
    const stateBonus: GameState = { ...owned, parties: partiesBonus };

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

    // Same seed to both runs so the variance / agility rolls are
    // identical; only the additive POST-occupation bonus differs.
    const out0 = resolveBattle(stateNoBonus, input, createRng(11), makeTickClock());
    const outN = resolveBattle(stateBonus, input, createRng(11), makeTickClock());

    // Direct check: the bonus offsets are non-zero.
    const offsets = computePostOccupationOffsets(stateBonus);
    const cap = Math.min(ids.length, MAX_BONUS_POINTS);
    expect(offsetForFaction(offsets, 'ant').attack).toBe(cap);
    expect(offsetForFaction(offsets, 'spider').attack).toBe(0);
    // The bonus must affect the damage stream — at least one
    // battle-resolved event should differ between the two runs.
    const a = JSON.stringify(out0.events);
    const b = JSON.stringify(outN.events);
    expect(a).not.toBe(b);
  });

  it('6. capture in progress does not grant the bonus until ownership flips', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const cleared = clearAllOwners(state);
    const ids = midPostIds(cleared);
    const target = ids[0]!;
    // Mark a capture in progress for ants on `target`. Owner stays
    // 'neutral' until the round-17 hold completes — bonus must not
    // count this POST yet.
    const post = cleared.posts.get(target)!;
    const posts = new Map(cleared.posts);
    posts.set(target, {
      ...post,
      owner: 'neutral',
      capturingFaction: 'ant',
      captureTurnsRemaining: POST_CAPTURE_TURNS,
    });
    const inProgress: GameState = { ...cleared, posts };
    const offsets = computePostOccupationOffsets(inProgress);
    expect(offsets.ant).toEqual({ attack: 0, armor: 0 });
    expect(offsets.spider).toEqual({ attack: 0, armor: 0 });
    // Only after `owner` flips to 'ant' should the bonus apply.
    const flipped = setOwner(inProgress, target, 'ant');
    const offsetsFlipped = computePostOccupationOffsets(flipped);
    expect(offsetsFlipped.ant).toEqual({ attack: 1, armor: 1 });
  });

  it('7. resolveBattle emits a post-occupation-bonus-summary event', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const cleared = clearAllOwners(state);
    const ids = midPostIds(cleared);
    let owned = cleared;
    for (const id of ids) owned = setOwner(owned, id, 'ant');
    const ant = firstFieldAnt(owned);
    const spider = firstSpider(owned);
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
    const out = resolveBattle(owned, input, createRng(99), makeTickClock());
    const summary = out.events.find((e) => e.kind === 'post-occupation-bonus-summary');
    expect(summary).toBeDefined();
    if (summary?.kind === 'post-occupation-bonus-summary') {
      const cap = Math.min(ids.length, MAX_BONUS_POINTS);
      // `posts` reports the raw count (pre-cap, for telemetry);
      // `attack` / `armor` reflect the capped offset folded into
      // combat math.
      expect(summary.ant.posts).toBe(ids.length);
      expect(summary.ant.attack).toBe(cap);
      expect(summary.ant.armor).toBe(cap);
      expect(summary.spider.posts).toBe(0);
      expect(summary.spider.attack).toBe(0);
      expect(summary.spider.armor).toBe(0);
    }
  });
});

describe('engine/post-bonus party-wide application', () => {
  it('bonus is party-wide: every ant party benefits regardless of its tile', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const cleared = clearAllOwners(state);
    const ids = midPostIds(cleared);
    let owned = cleared;
    for (const id of ids) owned = setOwner(owned, id, 'ant');
    // Confirm: the offset returned by `computePostOccupationOffsets`
    // is a single per-faction value (not per-party), so any ant
    // party combat resolves with the +N offset regardless of party
    // location. The integration into `buildLiveUnits` reads the
    // attacker / defender faction's offset and applies it party-
    // wide; this assertion captures the offset shape.
    const offsets = computePostOccupationOffsets(owned);
    expect(offsets.ant.attack).toBe(Math.min(ids.length, MAX_BONUS_POINTS));
    let antPartyCount = 0;
    for (const p of owned.parties.values()) {
      if (p.faction === 'ant') antPartyCount += 1;
    }
    expect(antPartyCount).toBeGreaterThan(1);
  });
});

// Suppress unused imports — keep types referenced for clarity.
void ({} as PartyId);
