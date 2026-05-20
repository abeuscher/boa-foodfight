import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ENEMY_AIS, neutralPlayer } from '../ai/index.ts';

import { createTickClock } from './replay.ts';
import { createRng } from './rng.ts';
import {
  parseScenarioSave,
  recordingPlayer,
  restoreScenario,
  serializeScenarioSave,
  type ScenarioSave,
  type TurnOrderLog,
} from './scenario-save.ts';
import { loadScenario } from './state.ts';
import { runScenario, type PolicyHandle } from './turn.ts';
import type { GameState, Order, PartyId } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');
const SEED = 7;
const SAVE_TURN = 8;

const enemy = ENEMY_AIS['spider-l1'];
if (!enemy) throw new Error('missing spider-l1 AI');

/** A side-effect-free player: every turn it issues `hold` to all ant
 * parties (and nothing else). This is exactly the shape of real
 * player input — per-party orders, no rng, no placement, no
 * out-of-band state — so record→replay fidelity is provable, unlike
 * an AI which does things a human can't. */
const scriptedPlayer: PolicyHandle = {
  name: 'scripted-ant',
  faction: 'ant',
  decide: (state) => {
    const parties = new Map(state.parties);
    for (const p of state.parties.values()) {
      if (p.faction !== 'ant') continue;
      parties.set(p.id, { ...p, orders: [{ kind: 'hold' as const }] });
    }
    return { ...state, parties };
  },
};

/** Deterministic projection — strong but non-brittle equality of the
 * reproduced world (avoids a fragile deep-equal of every Map). */
const project = (s: GameState) => ({
  turn: s.turn,
  winner: s.winner,
  gold: s.playerGold,
  parties: [...s.parties.keys()].sort().map((id) => {
    const p = s.parties.get(id);
    if (!p) throw new Error('missing party');
    return { id, faction: p.faction, loc: p.location, unitIds: p.units.map((u) => u.id) };
  }),
  posts: [...s.posts.keys()].sort().map((id) => {
    const post = s.posts.get(id);
    if (!post) throw new Error('missing post');
    return { id, owner: post.owner, cap: post.captureTurnsRemaining };
  }),
});

describe('engine/scenario-save (§7.13 Option B)', () => {
  it('round-trips: replaying the recorded order log reproduces the checkpoint', () => {
    const s1 = loadScenario(DATA_DIR, SEED);
    const sink: TurnOrderLog[] = [];
    const a = runScenario(s1.state, s1.data, createRng(SEED), createTickClock().next, {
      maxTurns: SAVE_TURN,
      policies: [recordingPlayer(scriptedPlayer, sink), enemy, neutralPlayer],
      neutralSpawnEvents: s1.neutralSpawnEvents,
      itemSpawnEvents: s1.itemSpawnEvents,
    });

    const save: ScenarioSave = {
      version: 1,
      scenarioId: 'level-1',
      seed: SEED,
      savedAtTurn: SAVE_TURN,
      orderLog: sink,
    };

    const s2 = loadScenario(DATA_DIR, SEED);
    const r = restoreScenario(
      save,
      s2.state,
      s2.data,
      createRng(SEED),
      createTickClock().next,
      [enemy, neutralPlayer],
      { neutralSpawnEvents: s2.neutralSpawnEvents, itemSpawnEvents: s2.itemSpawnEvents },
    );

    expect(r.state.turn).toBe(a.finalState.turn);
    expect(project(r.state)).toEqual(project(a.finalState));
    expect(sink.length).toBeGreaterThan(0); // the log actually captured input
  });

  it('serialize → parse is a faithful round-trip', () => {
    const save: ScenarioSave = {
      version: 1,
      scenarioId: 'level-1',
      seed: SEED,
      savedAtTurn: 3,
      orderLog: [
        {
          turn: 1,
          parties: [
            {
              partyId: 'vanguard-alpha' as PartyId,
              orders: [
                { kind: 'move-to', target: { plane: 'floor', x: 1, y: 2 } },
              ] as readonly Order[],
            },
          ],
        },
      ],
    };
    expect(parseScenarioSave(serializeScenarioSave(save))).toEqual(save);
  });

  it('rejects a malformed save envelope (trust boundary)', () => {
    expect(() => parseScenarioSave(JSON.stringify({ version: 2, seed: 1 }))).toThrow();
    expect(() => parseScenarioSave('{ not json')).toThrow();
  });

  it('an empty order log is valid (parties simply hold)', () => {
    const s = loadScenario(DATA_DIR, SEED);
    const save: ScenarioSave = {
      version: 1,
      scenarioId: 'level-1',
      seed: SEED,
      savedAtTurn: 3,
      orderLog: [],
    };
    const r = restoreScenario(save, s.state, s.data, createRng(SEED), createTickClock().next, [
      enemy,
      neutralPlayer,
    ]);
    expect(r.state.turn).toBeLessThanOrEqual(3);
    expect(r.state.parties.size).toBeGreaterThan(0);
  });
});
