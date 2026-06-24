import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { endOfTurn } from './end-of-turn.ts';
import { loadScenario } from './state.ts';
import type {
  GameState,
  NeutralDecision,
  Party,
  PartyId,
  Post,
  PostId,
  ReplayEvent,
  TileCoord,
  Unit,
  UnitTemplateId,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

/** Locate the ant queen-tagged party. */
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

const findQueenUnit = (state: GameState): Unit => {
  const party = findQueenParty(state);
  const unit = party.units.find((u) => {
    const tmpl = state.unitTemplates.get(u.templateId);
    return tmpl?.faction === 'ant' && tmpl.tags.includes('queen');
  });
  if (!unit) throw new Error('queen unit not found');
  return unit;
};

const updateParty = (state: GameState, partyId: PartyId, patch: Partial<Party>): GameState => {
  const parties = new Map(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no party ${String(partyId)}`);
  parties.set(partyId, { ...party, ...patch });
  return { ...state, parties };
};

const replaceUnitInParty = (state: GameState, partyId: PartyId, replacement: Unit): GameState => {
  const parties = new Map(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no party ${String(partyId)}`);
  const units = party.units.map((u) => (u.id === replacement.id ? replacement : u));
  parties.set(partyId, { ...party, units });
  return { ...state, parties };
};

const setPost = (state: GameState, postId: PostId, patch: Partial<Post>): GameState => {
  const posts = new Map(state.posts);
  const post = posts.get(postId);
  if (!post) throw new Error(`no post ${String(postId)}`);
  posts.set(postId, { ...post, ...patch });
  return { ...state, posts };
};

const isTurnStartFor = (e: ReplayEvent, turn: number): boolean =>
  e.kind === 'turn-start' && e.turn === turn;

describe('endOfTurn', () => {
  it('advances turn by 1 and emits a turn-start for the new turn (smoke)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const out = endOfTurn(state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.turn).toBe(state.turn + 1);
    const turnStart = out.events.find((e) => isTurnStartFor(e, out.state.turn));
    expect(turnStart).toBeDefined();
  });

  it('heals a wounded unit on a friendly POST by post.healingRate + home-anthill rate', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    // queen-guard sits on the storm-drain — the ant home POST. Chunk
    // C-1 (combat-rework Phase 1) added a separate home-anthill heal
    // (`HOME_HEAL_RATE = 3`) that stacks on top of the per-POST
    // healingRate so the home node can be tuned independently of the
    // chain-march POSTs. The expected heal at storm-drain is now
    // `post.healingRate + HOME_HEAL_RATE`.
    const HOME_HEAL_RATE = 3;
    const queenParty = findQueenParty(state);
    const stormDrain = state.posts.get('storm-drain' as PostId);
    expect(stormDrain).toBeDefined();
    expect(stormDrain?.owner).toBe('ant');

    // Wound a non-queen unit so we can observe the heal cleanly.
    const target = queenParty.units.find((u) => {
      const tmpl = state.unitTemplates.get(u.templateId);
      return tmpl?.tags.includes('queen') !== true;
    });
    expect(target).toBeDefined();
    if (!target) return;
    const tmpl = state.unitTemplates.get(target.templateId);
    expect(tmpl).toBeDefined();
    if (!tmpl) return;
    const max = tmpl.baseStats.hp;
    const wounded: Unit = { ...target, currentHp: 1 };
    const s = replaceUnitInParty(state, queenParty.id, wounded);

    const heal = (stormDrain?.healingRate ?? 0) + HOME_HEAL_RATE;
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const after = out.state.parties.get(queenParty.id);
    const healed = after?.units.find((u) => u.id === target.id);
    expect(healed?.currentHp).toBe(Math.min(max, 1 + heal));
    // And does not exceed max if already near it.
    const nearMax: Unit = { ...target, currentHp: max - 1 };
    const s2 = replaceUnitInParty(state, queenParty.id, nearMax);
    const out2 = endOfTurn(s2, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const healed2 = out2.state.parties.get(queenParty.id)?.units.find((u) => u.id === target.id);
    expect(healed2?.currentHp).toBe(max);

    // Chunk C-1 — the home heal also emits a `home-heal-applied`
    // event so the harness can measure recovery utilization.
    const homeEvents = out.events.filter((e) => e.kind === 'home-heal-applied');
    expect(homeEvents.length).toBe(1);
    expect(homeEvents[0]?.kind).toBe('home-heal-applied');
  });

  it('does not heal units that are not on a friendly POST', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    // vanguard-alpha starts at (floor, 1, 0), no POST there.
    const partyId = 'vanguard-alpha' as PartyId;
    const party = state.parties.get(partyId);
    expect(party).toBeDefined();
    if (!party) return;
    // There is no POST at the vanguard-alpha starting location; sanity check.
    const onPost = [...state.posts.values()].some(
      (p) =>
        p.location.plane === party.location.plane &&
        p.location.x === party.location.x &&
        p.location.y === party.location.y,
    );
    expect(onPost).toBe(false);

    const someUnit = party.units[0];
    expect(someUnit).toBeDefined();
    if (!someUnit) return;
    const wounded: Unit = { ...someUnit, currentHp: 1 };
    const s = replaceUnitInParty(state, partyId, wounded);
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const after = out.state.parties.get(partyId)?.units.find((u) => u.id === someUnit.id);
    expect(after?.currentHp).toBe(1);
  });

  it('queenUltimateCharge increases by chargePerTurn and is capped at chargeMax', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const out = endOfTurn(state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.queenUltimateCharge).toBe(data.queen.ultimate.chargePerTurn);

    // Pin charge near the cap and verify it does not exceed chargeMax.
    const near: GameState = {
      ...state,
      queenUltimateCharge: data.queen.ultimate.chargeMax - 1,
    };
    const out2 = endOfTurn(near, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out2.state.queenUltimateCharge).toBe(data.queen.ultimate.chargeMax);

    // Charge event reflects the new value.
    const chargeEvt = out2.events.find((e) => e.kind === 'queen-ultimate-charged');
    expect(chargeEvt).toBeDefined();
    if (chargeEvt?.kind === 'queen-ultimate-charged') {
      expect(chargeEvt.charge).toBe(data.queen.ultimate.chargeMax);
    }
  });

  it('produces one configured unit at the production cadence', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const cadence = data.queen.production.turnsPerUnit;
    const producedId = data.queen.production.producedTemplateId;

    // Make room in the queen party so production is permitted by capacity.
    const queenParty = findQueenParty(state);
    const queenOnly = queenParty.units.filter((u) => {
      const tmpl = state.unitTemplates.get(u.templateId);
      return tmpl?.tags.includes('queen') === true;
    });
    const queenLeader = queenOnly[0];
    expect(queenLeader).toBeDefined();
    if (!queenLeader) return;
    const trimmedState = updateParty(state, queenParty.id, {
      units: queenOnly,
      leaderId: queenLeader.id,
    });

    // Walk endOfTurn cadence-1 times, then the next call should produce.
    let cur = trimmedState;
    for (let i = 0; i < cadence - 1; i++) {
      const out = endOfTurn(cur, { queen: data.queen, jelly: data.jelly }, makeTickClock());
      cur = out.state;
    }
    const before = findQueenParty(cur);
    const beforeCount = before.units.filter((u) => String(u.templateId) === producedId).length;

    const out = endOfTurn(cur, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.turn).toBe(cadence);
    const after = findQueenParty(out.state);
    const afterCount = after.units.filter((u) => String(u.templateId) === producedId).length;
    expect(afterCount).toBe(beforeCount + 1);
  });

  it('skips production when the Queen party is already at slot capacity', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const cadence = data.queen.production.turnsPerUnit;

    // The queen-guard starts at exactly 12 used slots, so production this round
    // would push us past the 12-slot cap if attempted.
    let cur: GameState = { ...state, turn: cadence - 1 };
    const before = findQueenParty(cur);
    const beforeUnitCount = before.units.length;

    const out = endOfTurn(cur, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.turn).toBe(cadence);
    const after = findQueenParty(out.state);
    expect(after.units.length).toBe(beforeUnitCount);
    cur = out.state;
  });

  it('fires victory when the spider-web POST is owned by ant', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const s = setPost(state, 'spider-web' as PostId, { owner: 'ant' });
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.winner).toBe('ant');
    const end = out.events.find((e) => e.kind === 'scenario-end');
    expect(end).toBeDefined();
    if (end?.kind === 'scenario-end') expect(end.winner).toBe('ant');
  });

  it('fires loss when the queen-tagged unit is dead', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const queenParty = findQueenParty(state);
    const queenUnit = findQueenUnit(state);
    const dead: Unit = { ...queenUnit, currentHp: 0 };
    const s = replaceUnitInParty(state, queenParty.id, dead);
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    expect(out.state.winner).toBe('spider');
    const end = out.events.find((e) => e.kind === 'scenario-end');
    expect(end).toBeDefined();
    if (end?.kind === 'scenario-end') expect(end.winner).toBe('spider');
  });

  it('does not modify the Queen unit currentHp/level/xp during normal turn', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const before = findQueenUnit(state);
    const out = endOfTurn(state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const after = findQueenUnit(out.state);
    expect(after.currentHp).toBe(before.currentHp);
    expect(after.level).toBe(before.level);
    expect(after.xp).toBe(before.xp);
  });

  it('accrues jelly doses up to capacityPerParty at the Queen party', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const queenParty = findQueenParty(state);
    // Drain doses to a known floor to track production cleanly.
    const s0 = updateParty(state, queenParty.id, { jellyDoses: 0 });
    let cur = s0;
    for (let i = 0; i < data.jelly.capacityPerParty + 2; i++) {
      const out = endOfTurn(cur, { queen: data.queen, jelly: data.jelly }, makeTickClock());
      cur = out.state;
    }
    const final = findQueenParty(cur);
    expect(final.jellyDoses).toBe(data.jelly.capacityPerParty);
  });

  it('emits exactly one queen-ultimate-charged event per call', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const out = endOfTurn(state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const charges = out.events.filter((e) => e.kind === 'queen-ultimate-charged');
    expect(charges).toHaveLength(1);
  });

  it('produced unit ids follow the deterministic u-prod-{turn}-{templateId} format', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const cadence = data.queen.production.turnsPerUnit;
    const producedId = data.queen.production.producedTemplateId;

    // Make room in the queen party by dropping all non-queen units, so production
    // is permitted by capacity.
    const queenParty = findQueenParty(state);
    const onlyQueen = queenParty.units.filter((u) => {
      const tmpl = state.unitTemplates.get(u.templateId);
      return tmpl?.tags.includes('queen') === true;
    });
    const queenLeader = onlyQueen[0];
    expect(queenLeader).toBeDefined();
    if (!queenLeader) return;
    const trimmed: Party = {
      ...queenParty,
      units: onlyQueen,
      leaderId: queenLeader.id,
    };
    const parties = new Map(state.parties);
    parties.set(queenParty.id, trimmed);
    const s: GameState = { ...state, parties, turn: cadence - 1 };

    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const after = findQueenParty(out.state);
    const expectedId = `u-prod-${String(cadence)}-${producedId}`;
    const found = after.units.find((u) => String(u.id) === expectedId);
    expect(found).toBeDefined();
    expect(found?.templateId).toBe(producedId as UnitTemplateId);
  });
});

describe('endOfTurn: day/night phase cycle (rec 1.2)', () => {
  it('phase flips to night after PHASE_LENGTH end-of-turns', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    expect(state.phase).toBe('day');
    expect(state.phaseTurnsRemaining).toBe(4);
    // Walk forward 4 end-of-turns. The 4th end-of-turn brings the
    // counter to 0, flips the phase to night, and emits a phase-
    // changed event for the now-active phase. The runTurn calls that
    // follow run with state.phase === 'night'.
    let working = state;
    let phaseChanges: ReplayEvent[] = [];
    for (let i = 0; i < 4; i++) {
      const out = endOfTurn(working, { queen: data.queen, jelly: data.jelly }, makeTickClock());
      working = out.state;
      phaseChanges = [...phaseChanges, ...out.events.filter((e) => e.kind === 'phase-changed')];
    }
    expect(working.turn).toBe(4);
    expect(working.phase).toBe('night');
    expect(working.phaseTurnsRemaining).toBe(4);
    expect(phaseChanges).toHaveLength(1);
    const ev = phaseChanges[0];
    expect(ev?.kind).toBe('phase-changed');
    if (ev?.kind === 'phase-changed') {
      expect(ev.phase).toBe('night');
    }
  });

  it('phaseTurnsRemaining decrements each turn during a phase', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const after1 = endOfTurn(
      state,
      { queen: data.queen, jelly: data.jelly },
      makeTickClock(),
    ).state;
    expect(after1.phaseTurnsRemaining).toBe(3);
    expect(after1.phase).toBe('day');
    const after2 = endOfTurn(
      after1,
      { queen: data.queen, jelly: data.jelly },
      makeTickClock(),
    ).state;
    expect(after2.phaseTurnsRemaining).toBe(2);
    expect(after2.phase).toBe('day');
  });
});

describe('endOfTurn: pheromone trails (rec 1.5)', () => {
  const partyId = 'pathfinders' as PartyId;

  it('builds up trail entries over consecutive turns and ages them in lock-step', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    expect(state.pheroTrails.size).toBe(0);
    const out1 = endOfTurn(state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const t1 = out1.state.pheroTrails.get(partyId);
    expect(t1).toBeDefined();
    expect(t1?.length).toBe(1);
    expect(t1?.[0]?.ageInTurns).toBe(0);
    const out2 = endOfTurn(out1.state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const t2 = out2.state.pheroTrails.get(partyId);
    // Two entries: one fresh (age 0), one aged (age 1).
    expect(t2?.length).toBe(2);
    const ages2 = (t2 ?? []).map((e) => e.ageInTurns).sort();
    expect(ages2).toEqual([0, 1]);
    const out3 = endOfTurn(out2.state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const t3 = out3.state.pheroTrails.get(partyId);
    expect(t3?.length).toBe(3);
    const ages3 = (t3 ?? []).map((e) => e.ageInTurns).sort();
    expect(ages3).toEqual([0, 1, 2]);
  });

  it('drops entries older than 3 turns (3-turn decay)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    let working = state;
    // Run 5 endOfTurns. The trail should top out at 4 entries (ages
    // 0..3). The age-4 entry from the very first append is dropped.
    for (let i = 0; i < 5; i++) {
      const out = endOfTurn(working, { queen: data.queen, jelly: data.jelly }, makeTickClock());
      working = out.state;
    }
    const trail = working.pheroTrails.get(partyId);
    expect(trail?.length).toBe(4);
    const ages = (trail ?? []).map((e) => e.ageInTurns).sort();
    expect(ages).toEqual([0, 1, 2, 3]);
  });

  it('spider visibility helper reads trail position (not the live position)', async () => {
    // Setup: the pheromone trail records "old" position; the ant has
    // since moved to a new location. The spider AI's trail-based scan
    // (rec 1.5) should resolve to the trail (older) location, not the
    // live one — confirming the AI consumes only sanctioned visibility.
    const { state } = loadScenario(DATA_DIR, 1);
    const { getSpiderVisibleAntTrail } = await import('../ai/policy-helpers.ts');
    const oldTile: TileCoord = { plane: 'floor', x: 4, y: 0 };
    const liveTile: TileCoord = { plane: 'floor', x: 8, y: 8 };
    const ant = state.parties.get('vanguard-alpha' as PartyId);
    if (!ant) throw new Error('test fixture: vanguard-alpha missing');
    const parties = new Map(state.parties);
    parties.set('vanguard-alpha' as PartyId, { ...ant, location: liveTile });
    const trails = new Map<
      PartyId,
      readonly { plane: TileCoord['plane']; x: number; y: number; ageInTurns: number }[]
    >();
    trails.set('vanguard-alpha' as PartyId, [
      { plane: oldTile.plane, x: oldTile.x, y: oldTile.y, ageInTurns: 1 },
    ]);
    const customState: GameState = {
      ...state,
      parties,
      pheroTrails: trails,
    };
    const visible = getSpiderVisibleAntTrail(customState);
    // The trail helper exposes the OLD tile coords (rec 1.5 information
    // asymmetry: spiders see breadcrumbs, not live positions).
    expect(visible).toContainEqual({
      partyId: 'vanguard-alpha' as PartyId,
      plane: oldTile.plane,
      x: oldTile.x,
      y: oldTile.y,
      ageInTurns: 1,
    });
    // Sanity: the live tile is not in the trail (we synthesized only
    // the old breadcrumb).
    const matchesLive = visible.some(
      (v) => v.plane === liveTile.plane && v.x === liveTile.x && v.y === liveTile.y,
    );
    expect(matchesLive).toBe(false);
  });
});

describe('endOfTurn: neutralDecision tick (round 11)', () => {
  const partyId = 'pathfinders' as PartyId;

  const setNeutralDecision = (state: GameState, decision: NeutralDecision): GameState => {
    const party = state.parties.get(partyId);
    if (!party) throw new Error('test fixture: pathfinders missing');
    return updateParty(state, partyId, { neutralDecision: decision });
  };

  it('decrements turnsRemaining by 1 each tick and preserves the rest of the field', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const cockroachId = 'neutral-cockroaches' as PartyId;
    expect(state.parties.has(cockroachId)).toBe(true);
    const seeded = setNeutralDecision(state, {
      kind: 'pursue',
      targetPartyId: cockroachId,
      turnsRemaining: 5,
    });
    const out = endOfTurn(seeded, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const after = out.state.parties.get(partyId);
    expect(after?.neutralDecision).toEqual({
      kind: 'pursue',
      targetPartyId: cockroachId,
      turnsRemaining: 4,
    });
  });

  it('drops the field when turnsRemaining hits 0', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const seeded = setNeutralDecision(state, { kind: 'ignore', turnsRemaining: 1 });
    const out = endOfTurn(seeded, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const after = out.state.parties.get(partyId);
    expect(after?.neutralDecision).toBeUndefined();
  });

  it('drops a pursue decision early when the target party is no longer in state', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const ghostId = 'never-existed' as PartyId;
    const seeded = setNeutralDecision(state, {
      kind: 'pursue',
      targetPartyId: ghostId,
      turnsRemaining: 5,
    });
    const out = endOfTurn(seeded, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const after = out.state.parties.get(partyId);
    expect(after?.neutralDecision).toBeUndefined();
  });

  it('drops a pursue decision early when the target party is leaderless / wiped', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    // Add a placeholder neutral party with all units at HP 0 so the
    // tick's "alive?" check fails.
    const cockroachId = 'placeholder-cockroaches' as PartyId;
    const sample = state.parties.values().next().value!;
    const placeholder: Party = {
      ...sample,
      id: cockroachId,
      faction: 'neutral',
      units: sample.units.map((u) => ({ ...u, currentHp: 0 })),
      leaderless: true,
      orders: [],
    };
    const parties = new Map(state.parties);
    parties.set(cockroachId, placeholder);
    let working: GameState = { ...state, parties };
    working = setNeutralDecision(working, {
      kind: 'pursue',
      targetPartyId: cockroachId,
      turnsRemaining: 5,
    });
    const out = endOfTurn(working, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const after = out.state.parties.get(partyId);
    expect(after?.neutralDecision).toBeUndefined();
  });

  it('leaves parties without a neutralDecision untouched', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const before = state.parties.get(partyId);
    expect(before?.neutralDecision).toBeUndefined();
    const out = endOfTurn(state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const after = out.state.parties.get(partyId);
    expect(after?.neutralDecision).toBeUndefined();
  });
});

describe('Chunk C-1 — recentBattleOutcome decay', () => {
  it('survives one full end-of-turn after the battle, then clears', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    // Stamp a fake recent battle on vanguard-alpha (anywhere that isn't
    // the storm-drain so heal doesn't muddy the snapshot we're checking).
    const partyId = 'vanguard-alpha' as PartyId;
    const party = state.parties.get(partyId)!;
    const baseParties = new Map(state.parties);
    baseParties.set(partyId, {
      ...party,
      recentBattleOutcome: {
        turn: state.turn,
        hpLossFraction: 0.4,
        winner: 'spider',
        opponentId: 'web-guard' as PartyId,
      },
    });
    const stamped: GameState = { ...state, parties: baseParties };

    // End of turn N — outcome survives so turn N+1's AI can read it.
    const out1 = endOfTurn(stamped, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const afterTurnN = out1.state.parties.get(partyId);
    expect(afterTurnN?.recentBattleOutcome).toBeDefined();

    // Bump the turn counter to simulate the next-turn driver, then end
    // of turn N+1 — outcome decays.
    const next1: GameState = { ...out1.state, turn: out1.state.turn + 1 };
    const out2 = endOfTurn(next1, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const afterTurnN1 = out2.state.parties.get(partyId);
    expect(afterTurnN1?.recentBattleOutcome).toBeUndefined();
  });
});

describe('Chunk C-1 — home-heal-applied event', () => {
  it('fires when the queen-guard occupies storm-drain and is wounded', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const queenParty = findQueenParty(state);
    // Wound the leader unit so the heal has somewhere to land.
    const leader = queenParty.units.find((u) => u.id === queenParty.leaderId);
    expect(leader).toBeDefined();
    if (!leader) return;
    const wounded: Unit = { ...leader, currentHp: 1 };
    const s = replaceUnitInParty(state, queenParty.id, wounded);
    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());

    const homeEvents = out.events.filter((e) => e.kind === 'home-heal-applied');
    expect(homeEvents.length).toBe(1);
    const ev = homeEvents[0];
    if (ev?.kind === 'home-heal-applied') {
      expect(ev.partyId).toBe(queenParty.id);
      expect(ev.amount).toBeGreaterThan(0);
    }
  });

  it('does not fire when no party occupies a home POST', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    // Move the queen-guard away from storm-drain by relocating to a
    // floor tile that has no POST. (1,1) is open in the L1 fixture.
    const queenParty = findQueenParty(state);
    const moved: Party = {
      ...queenParty,
      location: { plane: 'floor', x: 1, y: 1 },
    };
    const baseParties = new Map(state.parties);
    baseParties.set(queenParty.id, moved);
    const s: GameState = { ...state, parties: baseParties };

    const out = endOfTurn(s, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const homeEvents = out.events.filter((e) => e.kind === 'home-heal-applied');
    expect(homeEvents.length).toBe(0);
  });
});
