/**
 * Round 17 — POST hold mechanic tests.
 *
 * Covers:
 *   1. Capture starts on first non-friendly arrival (event + state).
 *   2. Capture decrements once per turn while only capturer is present.
 *   3. Capture completes after 2 turns and emits `post-captured` /
 *      `gold-earned` (storm-drain awards 0).
 *   4. Holder leaving mid-capture aborts and resets owner to neutral.
 *   5. Both factions co-located pauses (no decrement, no abort).
 *   6. Storm-drain is excluded — never carries `capturingFaction`.
 *   7. Spider-web requires the 2-turn hold before flipping to ant.
 *   8. Already-owned POSTs survive a holder departure (post-capture
 *      no-op when no capture in progress).
 *   9. Enemy stepping on a neutral mid-POST starts a fresh capture
 *      from `fromOwner: 'neutral'`.
 *  10. Ant arriving on a spider-being-captured POST swaps the
 *      capture to ant (cancels the spider attempt).
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { POST_CAPTURE_TURNS, resolvePostCapture } from './post-capture.ts';
import { loadScenario } from './state.ts';
import type {
  Faction,
  GameState,
  Party,
  PartyId,
  PostId,
  ReinforcementConfig,
  ReplayEvent,
  UnitId,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const STORM_DRAIN = 'storm-drain' as PostId;
const SPIDER_WEB = 'spider-web' as PostId;

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

/** Move `partyId`'s party to the location of `postId`. */
const placePartyOnPost = (state: GameState, partyId: PartyId, postId: PostId): GameState => {
  const post = state.posts.get(postId);
  if (!post) throw new Error(`no post ${String(postId)}`);
  const parties = new Map(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no party ${String(partyId)}`);
  parties.set(partyId, { ...party, location: post.location });
  return { ...state, parties };
};

/** Move `partyId`'s party off any POST tile (to a known free coord). */
const movePartyAway = (
  state: GameState,
  partyId: PartyId,
  to: { plane: string; x: number; y: number },
): GameState => {
  const parties = new Map(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no party ${String(partyId)}`);
  parties.set(partyId, { ...party, location: to as Party['location'] });
  return { ...state, parties };
};

/** Find the first ant party that is NOT the queen-guard. */
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

/** Pick a mid-POST that is NOT storm-drain and NOT spider-web. */
const firstMidPost = (state: GameState): PostId => {
  for (const post of state.posts.values()) {
    if (post.id === STORM_DRAIN) continue;
    if (post.id === SPIDER_WEB) continue;
    return post.id;
  }
  throw new Error('no mid-post found');
};

const eventsOfKind = <K extends ReplayEvent['kind']>(
  events: readonly ReplayEvent[],
  kind: K,
): Extract<ReplayEvent, { kind: K }>[] =>
  events.filter((e): e is Extract<ReplayEvent, { kind: K }> => e.kind === kind);

describe('engine/post-capture', () => {
  it('1. starts a capture on first non-friendly arrival (event + state)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const ant = firstFieldAnt(state);
    const midPost = firstMidPost(state);
    const placed = placePartyOnPost(state, ant.id, midPost);
    const out = resolvePostCapture(placed, makeTickClock());
    const started = eventsOfKind(out.events, 'post-capture-started');
    expect(started).toHaveLength(1);
    expect(started[0]?.postId).toBe(midPost);
    expect(started[0]?.capturingFaction).toBe<Faction>('ant');
    expect(started[0]?.fromOwner).toBe<Faction>('neutral');
    const post = out.state.posts.get(midPost);
    expect(post?.capturingFaction).toBe<Faction>('ant');
    // First tick already decremented from POST_CAPTURE_TURNS to
    // POST_CAPTURE_TURNS - 1 (capturer is alone on the tile).
    expect(post?.captureTurnsRemaining).toBe(POST_CAPTURE_TURNS - 1);
    // Owner does NOT flip yet; the hold isn't complete.
    expect(post?.owner).toBe<Faction>('neutral');
  });

  it('2. decrements once per turn while only the capturer is present', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const ant = firstFieldAnt(state);
    const midPost = firstMidPost(state);
    const placed = placePartyOnPost(state, ant.id, midPost);
    // First call: start + tick → 1 remaining.
    const a = resolvePostCapture(placed, makeTickClock());
    expect(a.state.posts.get(midPost)?.captureTurnsRemaining).toBe(1);
    expect(eventsOfKind(a.events, 'post-capture-progressed')).toHaveLength(1);
    expect(eventsOfKind(a.events, 'post-capture-progressed')[0]?.turnsRemaining).toBe(1);
  });

  it('3. completes after 2 turns and flips ownership (post-captured + gold)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const ant = firstFieldAnt(state);
    const midPost = firstMidPost(state);
    let working = placePartyOnPost(state, ant.id, midPost);
    const tick = makeTickClock();
    const a = resolvePostCapture(working, tick);
    working = a.state;
    const b = resolvePostCapture(working, tick);
    working = b.state;
    expect(working.posts.get(midPost)?.owner).toBe<Faction>('ant');
    expect(working.posts.get(midPost)?.capturingFaction).toBeNull();
    expect(working.posts.get(midPost)?.captureTurnsRemaining).toBeNull();
    expect(eventsOfKind(b.events, 'post-captured')).toHaveLength(1);
    expect(eventsOfKind(b.events, 'post-captured')[0]?.newOwner).toBe<Faction>('ant');
    // mid-POSTs award gold on flip; storm-drain/spider-web pay 0
    // (covered by gold.test.ts). For mid-POSTs, expect a gold-earned
    // event keyed to ant.
    const gold = eventsOfKind(b.events, 'gold-earned');
    expect(gold.length).toBeGreaterThan(0);
    expect(gold[0]?.faction).toBe<'ant' | 'spider'>('ant');
  });

  it('4. holder leaving mid-capture aborts and resets owner to neutral', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const spider = firstSpider(state);
    // Pre-set the post owner to ant so we observe "previous owner"
    // semantics (capture by spider, holder leaves → reset to
    // neutral — strips the prior ant ownership).
    const midPost = firstMidPost(state);
    const posts = new Map(state.posts);
    const p = posts.get(midPost);
    if (!p) throw new Error('no post');
    posts.set(midPost, { ...p, owner: 'ant' });
    let working: GameState = { ...state, posts };
    working = placePartyOnPost(working, spider.id, midPost);
    const tick = makeTickClock();
    const a = resolvePostCapture(working, tick);
    working = a.state;
    expect(working.posts.get(midPost)?.capturingFaction).toBe<Faction>('spider');
    expect(working.posts.get(midPost)?.owner).toBe<Faction>('ant');
    // Now move the spider off the tile and tick again.
    working = movePartyAway(working, spider.id, { plane: 'floor', x: 4, y: 4 });
    const b = resolvePostCapture(working, tick);
    working = b.state;
    const aborts = eventsOfKind(b.events, 'post-capture-aborted');
    expect(aborts).toHaveLength(1);
    expect(aborts[0]?.previousOwner).toBe<Faction>('ant');
    expect(working.posts.get(midPost)?.owner).toBe<Faction>('neutral');
    expect(working.posts.get(midPost)?.capturingFaction).toBeNull();
  });

  it('5. both factions co-located pauses the capture (no decrement, no abort)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const ant = firstFieldAnt(state);
    const spider = firstSpider(state);
    const midPost = firstMidPost(state);
    let working = placePartyOnPost(state, ant.id, midPost);
    const tick = makeTickClock();
    const a = resolvePostCapture(working, tick);
    working = a.state;
    expect(working.posts.get(midPost)?.captureTurnsRemaining).toBe(1);
    // Now bring spider in. Both factions present → pause.
    working = placePartyOnPost(working, spider.id, midPost);
    const b = resolvePostCapture(working, tick);
    working = b.state;
    expect(working.posts.get(midPost)?.captureTurnsRemaining).toBe(1);
    expect(working.posts.get(midPost)?.capturingFaction).toBe<Faction>('ant');
    expect(eventsOfKind(b.events, 'post-capture-progressed')).toHaveLength(0);
    expect(eventsOfKind(b.events, 'post-capture-aborted')).toHaveLength(0);
  });

  it('6. storm-drain is excluded — never carries a capturingFaction', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const spider = firstSpider(state);
    // Force-place a spider on storm-drain. Trigger should NOT start
    // a capture there.
    const placed = placePartyOnPost(state, spider.id, STORM_DRAIN);
    const out = resolvePostCapture(placed, makeTickClock());
    expect(out.state.posts.get(STORM_DRAIN)?.capturingFaction).toBeNull();
    expect(out.state.posts.get(STORM_DRAIN)?.owner).toBe<Faction>('ant');
    expect(eventsOfKind(out.events, 'post-capture-started')).toHaveLength(0);
  });

  it('7. spider-web requires the 2-turn hold before flipping to ant (no instant win)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const ant = firstFieldAnt(state);
    // Move every spider away from spider-web (the default roster
    // places one on it). We test the ant-alone capture flow.
    let working: GameState = state;
    for (const p of state.parties.values()) {
      if (p.faction === 'spider') {
        working = movePartyAway(working, p.id, { plane: 'floor', x: 4, y: 4 });
      }
    }
    working = placePartyOnPost(working, ant.id, SPIDER_WEB);
    const tick = makeTickClock();
    // Turn 1: capture starts and ticks once. Owner stays spider.
    const a = resolvePostCapture(working, tick);
    working = a.state;
    expect(working.posts.get(SPIDER_WEB)?.owner).toBe<Faction>('spider');
    expect(eventsOfKind(a.events, 'post-captured')).toHaveLength(0);
    // Turn 2: capture completes, ownership flips to ant.
    const b = resolvePostCapture(working, tick);
    working = b.state;
    expect(working.posts.get(SPIDER_WEB)?.owner).toBe<Faction>('ant');
    expect(eventsOfKind(b.events, 'post-captured')).toHaveLength(1);
  });

  it('8. already-owned POSTs survive a friendly holder leaving (no abort, no flip)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const ant = firstFieldAnt(state);
    const midPost = firstMidPost(state);
    let working = placePartyOnPost(state, ant.id, midPost);
    const tick = makeTickClock();
    // Complete the capture (2 turns).
    working = resolvePostCapture(working, tick).state;
    working = resolvePostCapture(working, tick).state;
    expect(working.posts.get(midPost)?.owner).toBe<Faction>('ant');
    expect(working.posts.get(midPost)?.capturingFaction).toBeNull();
    // Move ant off; tick again — owner stays ant (no capture in progress).
    working = movePartyAway(working, ant.id, { plane: 'floor', x: 4, y: 4 });
    const out = resolvePostCapture(working, tick);
    working = out.state;
    expect(working.posts.get(midPost)?.owner).toBe<Faction>('ant');
    expect(eventsOfKind(out.events, 'post-capture-aborted')).toHaveLength(0);
  });

  it('9. enemy stepping on a neutral mid-POST starts a fresh capture from neutral', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const spider = firstSpider(state);
    const midPost = firstMidPost(state);
    expect(state.posts.get(midPost)?.owner).toBe<Faction>('neutral');
    const placed = placePartyOnPost(state, spider.id, midPost);
    const out = resolvePostCapture(placed, makeTickClock());
    const started = eventsOfKind(out.events, 'post-capture-started');
    expect(started).toHaveLength(1);
    expect(started[0]?.fromOwner).toBe<Faction>('neutral');
    expect(started[0]?.capturingFaction).toBe<Faction>('spider');
    expect(out.state.posts.get(midPost)?.capturingFaction).toBe<Faction>('spider');
  });

  it('10. ant arriving on a spider-being-captured POST swaps to ant capture', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const spider = firstSpider(state);
    const ant = firstFieldAnt(state);
    const midPost = firstMidPost(state);
    let working = placePartyOnPost(state, spider.id, midPost);
    const tick = makeTickClock();
    // Spider starts capturing.
    working = resolvePostCapture(working, tick).state;
    expect(working.posts.get(midPost)?.capturingFaction).toBe<Faction>('spider');
    // Spider leaves; ant arrives same tile.
    working = movePartyAway(working, spider.id, { plane: 'floor', x: 4, y: 4 });
    working = placePartyOnPost(working, ant.id, midPost);
    const out = resolvePostCapture(working, tick);
    working = out.state;
    // The trigger sees a non-capturer faction alone on the post and
    // SWAPS the capturingFaction to ant. The spider's progress is
    // abandoned (a fresh 2-turn hold for ants begins).
    const started = eventsOfKind(out.events, 'post-capture-started');
    expect(started.length).toBeGreaterThan(0);
    expect(started[started.length - 1]?.capturingFaction).toBe<Faction>('ant');
    expect(working.posts.get(midPost)?.capturingFaction).toBe<Faction>('ant');
    expect(working.posts.get(midPost)?.owner).toBe<Faction>('neutral');
  });

  it('11. friendly party on its own POST is a no-op (no event, no state change)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // queen-guard is already on storm-drain (ant-owned).
    const out = resolvePostCapture(state, makeTickClock());
    expect(eventsOfKind(out.events, 'post-capture-started')).toHaveLength(0);
    expect(eventsOfKind(out.events, 'post-capture-progressed')).toHaveLength(0);
    expect(eventsOfKind(out.events, 'post-capture-aborted')).toHaveLength(0);
  });

  // --- §7.12 (Exchange #8) reinforcement-at-POST hook ---

  const REINF_PARTY_ID = 'reinf-squad' as PartyId;
  const mkReinforcements = (
    s: GameState,
    postId: PostId,
  ): ReadonlyMap<PostId, ReinforcementConfig> => {
    const post = s.posts.get(postId);
    if (!post) throw new Error(`no post ${String(postId)}`);
    const tmpl = [...s.unitTemplates.values()].find((t) => t.faction === 'ant');
    if (!tmpl) throw new Error('no ant template');
    const uid = 'reinf-u1' as UnitId;
    const party: Party = {
      id: REINF_PARTY_ID,
      faction: 'ant',
      units: [{ id: uid, templateId: tmpl.id, currentHp: tmpl.baseStats.hp, level: 1, xp: 0 }],
      leaderId: uid,
      location: post.location,
      orders: [],
      posture: 'fight',
      strategyModifiers: [],
      jellyDoses: 0,
      leaderless: false,
      formation: { front: [uid], back: [], reserve: [] },
    };
    return new Map([[postId, { triggerPostId: postId, arrivalPostId: postId, party }]]);
  };

  it('12. reinforcement spawns on capture-complete', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const ant = firstFieldAnt(state);
    const midPost = firstMidPost(state);
    let working = placePartyOnPost(state, ant.id, midPost);
    working = { ...working, reinforcements: mkReinforcements(working, midPost) };
    const tick = makeTickClock();
    working = resolvePostCapture(working, tick).state; // turn 1: progress
    const b = resolvePostCapture(working, tick); // turn 2: complete + hook
    expect(b.state.posts.get(midPost)?.owner).toBe<Faction>('ant');
    const spawned = eventsOfKind(b.events, 'reinforcement-spawned');
    expect(spawned).toHaveLength(1);
    expect(spawned[0]?.postId).toBe(midPost);
    expect(spawned[0]?.newPartyIds).toEqual([REINF_PARTY_ID]);
    expect(b.state.parties.get(REINF_PARTY_ID)).toBeDefined();
    expect(b.state.firedReinforcements?.has(midPost)).toBe(true);
  });

  it('13. reinforcement is single-shot (firedReinforcements blocks re-spawn)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const ant = firstFieldAnt(state);
    const midPost = firstMidPost(state);
    let working = placePartyOnPost(state, ant.id, midPost);
    working = {
      ...working,
      reinforcements: mkReinforcements(working, midPost),
      firedReinforcements: new Set([midPost]),
    };
    const tick = makeTickClock();
    working = resolvePostCapture(working, tick).state;
    const b = resolvePostCapture(working, tick);
    expect(b.state.posts.get(midPost)?.owner).toBe<Faction>('ant'); // capture still works
    expect(eventsOfKind(b.events, 'reinforcement-spawned')).toHaveLength(0);
    expect(b.state.parties.get(REINF_PARTY_ID)).toBeUndefined();
  });

  it('14. capturing a non-trigger POST emits no reinforcement-spawned event', () => {
    // L1-iteration #3: L1 now configures spider reinforcements at
    // towel-rack-1 and wall-crack-1 (one-shot per trigger). Capturing
    // a mid-POST that is NOT a configured trigger must still produce
    // no spawn.
    const { state } = loadScenario(DATA_DIR, 1);
    const ant = firstFieldAnt(state);
    const triggers = new Set([...(state.reinforcements?.keys() ?? [])]);
    let targetPost: PostId | undefined;
    for (const post of state.posts.values()) {
      if (post.id === STORM_DRAIN) continue;
      if (post.id === SPIDER_WEB) continue;
      if (triggers.has(post.id)) continue;
      targetPost = post.id;
      break;
    }
    if (!targetPost) throw new Error('no non-trigger mid-POST found');
    let working = placePartyOnPost(state, ant.id, targetPost);
    const tick = makeTickClock();
    working = resolvePostCapture(working, tick).state;
    const b = resolvePostCapture(working, tick);
    expect(b.state.posts.get(targetPost)?.owner).toBe<Faction>('ant');
    expect(eventsOfKind(b.events, 'reinforcement-spawned')).toHaveLength(0);
  });
});
