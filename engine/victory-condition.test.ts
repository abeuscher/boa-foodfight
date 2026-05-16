/**
 * L2-1 — victory-condition generalization tests.
 *
 * `checkWinner` (private to end-of-turn) dispatches on the scenario's
 * `victoryCondition`. These tests drive it via the public `endOfTurn`
 * entry point and assert on the resulting `state.winner`.
 *
 *   - capture-post: the L1 default (a state without `victoryCondition`
 *     reproduces the historical hardcoded behavior byte-identically),
 *     plus an explicit capture-post objective.
 *   - escort: win when the living escortee reaches the exit POST tile;
 *     loss when the escortee dies; loss when the ant queen dies; the
 *     turn-cap timeout is an ant loss (verified via `runScenario`).
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { endOfTurn } from './end-of-turn.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import { runScenario } from './turn.ts';
import type {
  GameState,
  Party,
  PartyId,
  Post,
  PostId,
  Unit,
  UnitTemplateId,
  VictoryCondition,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const findQueenParty = (state: GameState): Party => {
  for (const p of state.parties.values()) {
    const hasQueen = p.units.some((u) => {
      const tmpl = state.unitTemplates.get(u.templateId);
      return tmpl?.faction === 'ant' && tmpl.tags.includes('queen');
    });
    if (hasQueen) return p;
  }
  throw new Error('queen party not found');
};

const setPost = (state: GameState, postId: PostId, patch: Partial<Post>): GameState => {
  const posts = new Map(state.posts);
  const post = posts.get(postId);
  if (!post) throw new Error(`no post ${String(postId)}`);
  posts.set(postId, { ...post, ...patch });
  return { ...state, posts };
};

const setVictory = (state: GameState, vc: VictoryCondition): GameState => ({
  ...state,
  victoryCondition: vc,
});

/** Inject a synthetic escortee unit into the given party. The L1 data
 * set has no aunt-ant template; for the L2-1 unit-level tests we borrow
 * `ant-tank` — a valid L1 template that is *not* placed in any L1
 * roster party or neutral spawn, so a single injected copy is the only
 * unit of that template in the state (collision-free for the
 * escort-unit-lost check). The real aunt-ant template lands in L2-2. */
const ESCORTEE: UnitTemplateId = 'ant-tank' as UnitTemplateId;

const addEscortee = (state: GameState, partyId: PartyId, hp: number): GameState => {
  const parties = new Map(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no party ${String(partyId)}`);
  const escortee: Unit = {
    id: 'u-escortee-test' as Unit['id'],
    templateId: ESCORTEE,
    currentHp: hp,
    level: 1,
    xp: 0,
  };
  parties.set(partyId, { ...party, units: [...party.units, escortee] });
  return { ...state, parties };
};

const moveParty = (state: GameState, partyId: PartyId, to: Post['location']): GameState => {
  const parties = new Map(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no party ${String(partyId)}`);
  parties.set(partyId, { ...party, location: to });
  return { ...state, parties };
};

describe('victoryCondition — capture-post (L1 default, byte-identical)', () => {
  it('a state without victoryCondition still wins on owning spider-web', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    // L1 loadScenario sets victoryCondition to the capture-spider-web
    // default; deleting it must be equivalent.
    const stripped: GameState = { ...state };
    delete (stripped as { victoryCondition?: VictoryCondition }).victoryCondition;
    const s = setPost(stripped, 'spider-web' as PostId, { owner: 'ant' });
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.winner).toBe('ant');
  });

  it('explicit capture-post objective fires on owning the named post', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const s = setVictory(setPost(state, 'spider-web' as PostId, { owner: 'ant' }), {
      kind: 'capture-post',
      postId: 'spider-web' as PostId,
    });
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.winner).toBe('ant');
  });

  it('capture-post still loses when the ant queen is dead', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const qp = findQueenParty(state);
    const parties = new Map(state.parties);
    parties.set(qp.id, {
      ...qp,
      units: qp.units.map((u) => {
        const tmpl = state.unitTemplates.get(u.templateId);
        return tmpl?.tags.includes('queen') ? { ...u, currentHp: 0 } : u;
      }),
    });
    const s = setVictory(
      { ...state, parties },
      { kind: 'capture-post', postId: 'spider-web' as PostId },
    );
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.winner).toBe('spider');
  });
});

describe('victoryCondition — escort', () => {
  it('ants win when the living escortee reaches the exit POST tile', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const exit = state.posts.get('spider-web' as PostId);
    if (!exit) throw new Error('no exit post');
    let s = addEscortee(state, 'vanguard-alpha' as PartyId, 50);
    s = moveParty(s, 'vanguard-alpha' as PartyId, exit.location);
    s = setVictory(s, {
      kind: 'escort',
      escortUnitTemplateId: ESCORTEE,
      exitPostId: 'spider-web' as PostId,
    });
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.winner).toBe('ant');
  });

  it('no win while the escortee is short of the exit', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    let s = addEscortee(state, 'vanguard-alpha' as PartyId, 50);
    s = setVictory(s, {
      kind: 'escort',
      escortUnitTemplateId: ESCORTEE,
      exitPostId: 'spider-web' as PostId,
    });
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.winner).toBeNull();
  });

  it('ants lose when the escortee is dead even if it is on the exit tile', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const exit = state.posts.get('spider-web' as PostId);
    if (!exit) throw new Error('no exit post');
    let s = addEscortee(state, 'vanguard-alpha' as PartyId, 0);
    s = moveParty(s, 'vanguard-alpha' as PartyId, exit.location);
    s = setVictory(s, {
      kind: 'escort',
      escortUnitTemplateId: ESCORTEE,
      exitPostId: 'spider-web' as PostId,
    });
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.winner).toBe('spider');
  });

  it('ants lose when the ant queen dies during an escort', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    let s = addEscortee(state, 'vanguard-alpha' as PartyId, 50);
    const qp = findQueenParty(s);
    const parties = new Map(s.parties);
    parties.set(qp.id, {
      ...qp,
      units: qp.units.map((u) => {
        const tmpl = s.unitTemplates.get(u.templateId);
        return tmpl?.tags.includes('queen') ? { ...u, currentHp: 0 } : u;
      }),
    });
    s = setVictory(
      { ...s, parties },
      {
        kind: 'escort',
        escortUnitTemplateId: ESCORTEE,
        exitPostId: 'spider-web' as PostId,
      },
    );
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.winner).toBe('spider');
  });

  it('escort timeout (turn cap reached) is an ant loss — no score tiebreak', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    // A living escortee that never reaches the exit: with no policies
    // nothing moves, the queen stays alive, the escortee stays alive
    // but parked away from the exit. The run hits the turn cap and the
    // round-19 path must resolve escort → spider WITHOUT a score
    // breakdown (the score path is a capture-objective construct).
    let s = addEscortee(state, 'vanguard-alpha' as PartyId, 50);
    s = setVictory(s, {
      kind: 'escort',
      escortUnitTemplateId: ESCORTEE,
      exitPostId: 'spider-web' as PostId,
    });
    const outcome = runScenario(s, data, createRng(1), makeTickClock(), {
      maxTurns: 3,
      policies: [],
    });
    expect(outcome.finalState.winner).toBe('spider');
    const end = [...outcome.events].reverse().find((e) => e.kind === 'scenario-end');
    expect(end?.kind).toBe('scenario-end');
    if (end?.kind === 'scenario-end') {
      expect(end.winner).toBe('spider');
      expect(end.scoreBreakdown).toBeUndefined();
    }
  });
});
