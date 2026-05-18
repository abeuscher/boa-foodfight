/**
 * Engine dependency #10 — opt-in authoritative `abilities.json`
 * hypnotize/recruit params (closes the docs §4g finding).
 *
 * BEFORE: `engine/abilities.ts` resolved hypnotize & recruit from
 * hardcoded module constants (`HYPNOTIZE_SUCCESS_RATE`/`MIN`/`MAX`,
 * `HYPNOTIZE_REBOUND_IMMUNITY`, `RECRUIT_SUCCESS_RATE`) and NEVER read
 * the loaded `abilities.json`. Data-driven tuning of those two
 * abilities was therefore inert — it falsified L8 and the L5
 * hypnotize "cap" never bound.
 *
 * AFTER: an opt-in, scenario-gated flag `abilityParamsAuthoritative`
 * (declared on `map.json`, threaded onto `GameState`). The default
 * (flag absent / false — every shipped scenario `data/level-1..8` and
 * the gate-29 locked baseline) is provably byte-identical: the engine
 * reads the SAME module constants on the SAME code path. Only a
 * scenario that explicitly opts in reads the data params.
 *
 * Coverage:
 *   (a) flag ABSENT ⇒ hypnotize/recruit behave at the hardcoded
 *       0.8 / 5 / 10 / 0.25 EVEN WHEN the supplied `abilities.json`
 *       declares wildly different params (the opt-in-inertness /
 *       byte-identity guarantee).
 *   (b) flag TRUE ⇒ the engine uses the data params: a distinct
 *       success rate flips the success/fail gate under a fixed roll,
 *       and distinct min/max observably change the control span; a
 *       distinct recruit success rate flips the recruit gate.
 *   (c) flag TRUE but a param missing in `abilities.json` ⇒ the
 *       engine falls back to the hardcoded constant (defensive,
 *       deterministic — never NaN/undefined).
 *   (d) determinism: same seed ⇒ identical replay under BOTH flag
 *       states, across a multi-turn `runScenario` fixture
 *       (2 seeds × 2 runs).
 *   (e) the rebound-immunity window honors the data param when opted
 *       in (the §4g param applied at its end-of-turn application
 *       point), and the constant when not.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveAbilityOrders } from './abilities.ts';
import { endOfTurn } from './end-of-turn.ts';
import { partyIdForKind } from './neutrals.ts';
import { createRng } from './rng.ts';
import type { AbilitiesFile } from './schemas/index.ts';
import { loadScenario } from './state.ts';
import type {
  AbilityId,
  GameState,
  NeutralKind,
  Order,
  Party,
  PartyId,
  Rng,
  Unit,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const HYPNOTIZE: AbilityId = 'hypnotize' as AbilityId;
const RECRUIT: AbilityId = 'recruit' as AbilityId;

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

/** Deterministic stub: `next()` walks `rolls`, `int()` walks `ints`
 * (clamped at the last element). Mirrors the precedent
 * `engine/hypnotize.test.ts` stub so the RNG draw sequence is fixed. */
const stubRng = (rolls: readonly number[], ints: readonly number[] = []): Rng => {
  let rIdx = 0;
  let iIdx = 0;
  const self: Rng = {
    next: () => rolls[Math.min(rIdx++, rolls.length - 1)] ?? 0,
    int: () => ints[Math.min(iIdx++, ints.length - 1)] ?? 0,
    pick: <T>(items: readonly T[]): T => items[0]!,
    fork: () => self,
  };
  return self;
};

const findSpiderParty = (state: GameState): Party => {
  for (const p of state.parties.values()) {
    if (p.faction !== 'spider') continue;
    if (p.units.some((u) => u.currentHp > 0)) return p;
  }
  throw new Error('no spider party');
};

const findMageParty = (state: GameState): Party => {
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    for (const u of party.units) {
      const tmpl = state.unitTemplates.get(u.templateId);
      if (tmpl?.abilities.includes(RECRUIT)) return party;
    }
  }
  throw new Error('no ant party with recruit');
};

const setupHypnotize = (
  state: GameState,
  kind: NeutralKind,
): { state: GameState; spiderId: PartyId; targetId: PartyId; casterUnit: Unit } => {
  const spider = findSpiderParty(state);
  const neutralId = partyIdForKind(kind);
  const neutral = state.parties.get(neutralId);
  if (!neutral) throw new Error(`no neutral '${kind}'`);
  const order: Order = { kind: 'use-ability', abilityId: HYPNOTIZE, target: neutralId };
  const newSpider: Party = { ...spider, location: neutral.location, orders: [order] };
  const parties = new Map(state.parties);
  parties.set(spider.id, newSpider);
  const casterUnit = newSpider.units.find((u) => u.id === newSpider.leaderId)!;
  return { state: { ...state, parties }, spiderId: spider.id, targetId: neutralId, casterUnit };
};

const setupRecruitNeutral = (
  state: GameState,
  kind: NeutralKind,
): { state: GameState; mageId: PartyId; targetId: PartyId } => {
  const mage = findMageParty(state);
  const neutralId = partyIdForKind(kind);
  const neutral = state.parties.get(neutralId);
  if (!neutral) throw new Error(`no neutral '${kind}'`);
  const recruitOrder: Order = { kind: 'use-ability', abilityId: RECRUIT, target: neutralId };
  const newMage: Party = { ...mage, location: neutral.location, orders: [recruitOrder] };
  const parties = new Map(state.parties);
  parties.set(mage.id, newMage);
  return { state: { ...state, parties }, mageId: mage.id, targetId: neutralId };
};

/** Clone an AbilitiesFile, replacing one ability's `params` wholesale. */
const withParams = (
  abilities: AbilitiesFile,
  abilityId: string,
  params: Record<string, number>,
): AbilitiesFile => ({
  ...abilities,
  abilities: abilities.abilities.map((a) => (a.id === abilityId ? { ...a, params } : a)),
});

/** Opt the scenario in. "Flag absent" is represented by simply NOT
 * calling this (the loaded state has no `abilityParamsAuthoritative`),
 * matching every shipped scenario. */
const optIn = (state: GameState): GameState => ({
  ...state,
  abilityParamsAuthoritative: true,
});

describe('engine dep #10 — opt-in authoritative abilities.json hypnotize/recruit params', () => {
  // ----------------------------------------------------------------
  // (a) flag absent ⇒ hardcoded constants, data ignored entirely.
  // ----------------------------------------------------------------
  it('(a) flag absent: hypnotize uses the hardcoded 0.8 even if abilities.json says 0.0', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'mice');
    // Data declares successRate 0.0 (always fail). Flag absent ⇒ the
    // engine ignores it and uses the constant 0.8: roll 0.5 < 0.8 ⇒
    // SUCCESS, exactly as the frozen engine.
    const badData = withParams(data.abilities, 'hypnotize', {
      successRate: 0.0,
      minControlTurns: 99,
      maxControlTurns: 99,
      reboundImmunityTurns: 1,
    });
    const out = resolveAbilityOrders(
      setup.state, // no flag set
      data.jelly,
      stubRng([0.5], [0]),
      tickClock(),
      badData,
    );
    const status = out.state.neutralStatus.get(setup.targetId)!;
    expect(status.hypnotizedBy).toBe('spider'); // succeeded at 0.8
    // Control span uses the constant 5 + int(10-5+1=6) → 5, NOT 99.
    expect(status.hypnoticControlRemaining).toBe(5);
  });

  it('(a) flag absent: recruit uses the hardcoded 0.25 even if abilities.json says 1.0', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupRecruitNeutral(base, 'mice');
    // Data says successRate 1.0 (always succeed). Flag absent ⇒ engine
    // uses constant 0.25: roll 0.5 ≥ 0.25 ⇒ FAIL (no conversion).
    const badData = withParams(data.abilities, 'recruit', { successRate: 1.0 });
    const out = resolveAbilityOrders(setup.state, data.jelly, stubRng([0.5]), tickClock(), badData);
    expect(out.state.parties.get(setup.targetId)?.faction).toBe('neutral'); // not converted
  });

  // ----------------------------------------------------------------
  // (b) flag true ⇒ data params bind.
  // ----------------------------------------------------------------
  it('(b) flag true: hypnotize success gate flips to the data successRate', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'mice');
    // Data successRate 0.3. Roll 0.5: constant path (0.8) would
    // SUCCEED, data path (0.3) FAILS. Flag true ⇒ data wins ⇒ fail.
    const tuned = withParams(data.abilities, 'hypnotize', {
      successRate: 0.3,
      minControlTurns: 5,
      maxControlTurns: 10,
      reboundImmunityTurns: 10,
    });
    const out = resolveAbilityOrders(
      optIn(setup.state),
      data.jelly,
      stubRng([0.5], [0]),
      tickClock(),
      tuned,
    );
    const status = out.state.neutralStatus.get(setup.targetId)!;
    expect(status.hypnotizedBy).toBeNull(); // failed at data rate 0.3
  });

  it('(b) flag true: control span uses the data min/max (distinct from 5..10)', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'mice');
    // min 2 / max 3 (the L5-style hypnotize-light cap). int() returns
    // 1 ⇒ controlTurns = min + 1 = 3 (constant path would give
    // 5 + 1 = 6). Same `min + rng.int(max-min+1)` shape.
    const tuned = withParams(data.abilities, 'hypnotize', {
      successRate: 0.8,
      minControlTurns: 2,
      maxControlTurns: 3,
      reboundImmunityTurns: 10,
    });
    const out = resolveAbilityOrders(
      optIn(setup.state),
      data.jelly,
      stubRng([0.0], [1]),
      tickClock(),
      tuned,
    );
    const status = out.state.neutralStatus.get(setup.targetId)!;
    expect(status.hypnotizedBy).toBe('spider');
    expect(status.hypnoticControlRemaining).toBe(3); // 2 + int(2)=1 → 3
  });

  it('(b) flag true: recruit success gate flips to the data successRate', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupRecruitNeutral(base, 'mice');
    // Data successRate 0.9. Roll 0.5: constant path (0.25) would FAIL,
    // data path (0.9) SUCCEEDS. Flag true ⇒ data wins ⇒ converted.
    const tuned = withParams(data.abilities, 'recruit', { successRate: 0.9 });
    const out = resolveAbilityOrders(
      optIn(setup.state),
      data.jelly,
      stubRng([0.5]),
      tickClock(),
      tuned,
    );
    expect(out.state.parties.get(setup.targetId)?.faction).toBe('ant'); // converted at 0.9
  });

  // ----------------------------------------------------------------
  // (c) flag true but a param absent ⇒ fall back to the constant.
  // ----------------------------------------------------------------
  it('(c) flag true + hypnotize successRate missing ⇒ falls back to constant 0.8', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'mice');
    // successRate omitted; min/max present. Roll 0.5 < fallback 0.8 ⇒
    // SUCCESS; control span uses the present data min/max (4..4 → 4).
    const partial = withParams(data.abilities, 'hypnotize', {
      minControlTurns: 4,
      maxControlTurns: 4,
      reboundImmunityTurns: 10,
    });
    const out = resolveAbilityOrders(
      optIn(setup.state),
      data.jelly,
      stubRng([0.5], [0]),
      tickClock(),
      partial,
    );
    const status = out.state.neutralStatus.get(setup.targetId)!;
    expect(status.hypnotizedBy).toBe('spider'); // fallback 0.8
    expect(status.hypnoticControlRemaining).toBe(4); // data min/max
  });

  it('(c) flag true + recruit successRate missing ⇒ falls back to constant 0.25', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupRecruitNeutral(base, 'mice');
    const partial = withParams(data.abilities, 'recruit', {}); // no successRate
    const out = resolveAbilityOrders(
      optIn(setup.state),
      data.jelly,
      stubRng([0.5]), // 0.5 ≥ fallback 0.25 ⇒ fail
      tickClock(),
      partial,
    );
    expect(out.state.parties.get(setup.targetId)?.faction).toBe('neutral'); // fallback 0.25
  });

  it('(c) flag true but abilities arg undefined ⇒ falls back to constants', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'mice');
    // No abilities file passed at all. Flag true but nothing to read ⇒
    // hardcoded 0.8 / 5..10. Roll 0.5 ⇒ success, span 5.
    const out = resolveAbilityOrders(
      optIn(setup.state),
      data.jelly,
      stubRng([0.5], [0]),
      tickClock(),
      // abilities arg omitted
    );
    const status = out.state.neutralStatus.get(setup.targetId)!;
    expect(status.hypnotizedBy).toBe('spider');
    expect(status.hypnoticControlRemaining).toBe(5);
  });

  // ----------------------------------------------------------------
  // (e) rebound-immunity window honors the data param when opted in.
  // ----------------------------------------------------------------
  it('(e) flag true: end-of-turn rebound window uses the data reboundImmunityTurns', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'cockroaches');
    // min/max 1 so control expires after a single end-of-turn tick;
    // reboundImmunityTurns 3 (distinct from the constant 10).
    const tuned = withParams(data.abilities, 'hypnotize', {
      successRate: 0.8,
      minControlTurns: 1,
      maxControlTurns: 1,
      reboundImmunityTurns: 3,
    });
    let working = resolveAbilityOrders(
      optIn(setup.state),
      data.jelly,
      stubRng([0.0], [0]),
      tickClock(),
      tuned,
    ).state;
    expect(working.neutralStatus.get(setup.targetId)!.hypnoticControlRemaining).toBe(1);
    const eot = endOfTurn(
      working,
      { queen: data.queen, jelly: data.jelly, abilities: tuned },
      tickClock(),
    );
    working = eot.state;
    const status = working.neutralStatus.get(setup.targetId)!;
    expect(status.hypnotizedBy).toBeNull();
    expect(status.spiderImmunityRemaining).toBe(3); // data param, NOT 10
  });

  it('(e) flag absent: end-of-turn rebound window stays the constant 10', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'cockroaches');
    // Even with data declaring reboundImmunityTurns 3, the flag-absent
    // path uses the hardcoded 10.
    const tuned = withParams(data.abilities, 'hypnotize', {
      successRate: 0.8,
      minControlTurns: 1,
      maxControlTurns: 1,
      reboundImmunityTurns: 3,
    });
    let working = resolveAbilityOrders(
      setup.state, // no flag
      data.jelly,
      stubRng([0.0], [0]),
      tickClock(),
      tuned,
    ).state;
    // Flag absent ⇒ control span is the constant 5 (NOT data's 1).
    expect(working.neutralStatus.get(setup.targetId)!.hypnoticControlRemaining).toBe(5);
    for (let i = 0; i < 5; i++) {
      working = endOfTurn(
        working,
        { queen: data.queen, jelly: data.jelly, abilities: tuned },
        tickClock(),
      ).state;
    }
    const status = working.neutralStatus.get(setup.targetId)!;
    expect(status.hypnotizedBy).toBeNull();
    expect(status.spiderImmunityRemaining).toBe(10); // constant, NOT data's 3
  });

  // ----------------------------------------------------------------
  // (d) determinism under both flag states.
  // ----------------------------------------------------------------
  it('(d) determinism: identical replay under flag ABSENT (2 seeds × 2 runs)', () => {
    const replayFor = (seed: number) => {
      const { state, data } = loadScenario(DATA_DIR, seed);
      const out = resolveAbilityOrders(
        setupHypnotize(state, 'mice').state, // flag absent
        data.jelly,
        createRng(seed).fork('det'),
        tickClock(),
        data.abilities,
      );
      return {
        statuses: [...out.state.neutralStatus.entries()].map(([k, v]) => [k, v]),
        events: out.events.length,
      };
    };
    for (const seed of [1, 2]) {
      expect(replayFor(seed)).toEqual(replayFor(seed));
    }
  });

  it('(d) determinism: identical replay under flag TRUE (2 seeds × 2 runs)', () => {
    const tunedFor = (data: { abilities: AbilitiesFile }) =>
      withParams(data.abilities, 'hypnotize', {
        successRate: 0.6,
        minControlTurns: 3,
        maxControlTurns: 7,
        reboundImmunityTurns: 4,
      });
    const replayFor = (seed: number) => {
      const { state, data } = loadScenario(DATA_DIR, seed);
      const out = resolveAbilityOrders(
        optIn(setupHypnotize(state, 'mice').state),
        data.jelly,
        createRng(seed).fork('det'),
        tickClock(),
        tunedFor(data),
      );
      return {
        statuses: [...out.state.neutralStatus.entries()].map(([k, v]) => [k, v]),
        events: out.events.length,
      };
    };
    for (const seed of [1, 2]) {
      expect(replayFor(seed)).toEqual(replayFor(seed));
    }
  });
});
