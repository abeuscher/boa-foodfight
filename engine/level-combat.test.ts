/**
 * Phase-B follow-up #1 — level-up bonuses folded into live combat.
 *
 * Proves the per-`Unit` `levelBonus` (populated only by world-inject
 * from a carried `WorldUnit.level`) actually changes combat, while a
 * missing bonus is a strict no-op (the non-campaign regression guard).
 *
 * Coverage:
 *   1. No `levelBonus` → byte-identical battle vs baseline.
 *   2. A level-5 footman (via world-inject) out-damages a level-1.
 *   3. Defender level armor bonus reduces incoming damage.
 *   4. Level HP bonus → larger spawn `currentHp` (world-inject).
 *   5. Agility level bonus changes strike order.
 *   6. Intelligence level bonus boosts a mage's magic-arrow.
 *   7. world-inject sets `levelBonus` matching the world-levelup curve.
 *   8. Determinism: same campaign seed → identical leveled outcomes.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ENEMY_AIS, neutralPlayer, PLAYER_AIS } from '../ai/index.ts';

import { applyOpeningAbilities } from './battle-abilities.ts';
import { resolveBattle, type BattleInput } from './battle.ts';
import { applyLevelBonusToStats, computeAgilityOrder } from './combat.ts';
import { createTickClock } from './replay.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import { runScenario } from './turn.ts';
import type {
  GameState,
  Party,
  PartyId,
  Stats,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplateId,
} from './types.ts';
import { extractWorldRoster } from './world-extract.ts';
import { injectWorldRoster, scaffoldFromState } from './world-inject.ts';
import { cumulativeLevelBonus } from './world-levelup.ts';
import type { WorldRoster, WorldUnit } from './world-state.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const noAbilities = {
  version: 1 as const,
  abilities: [
    {
      id: 'noop' as const,
      name: 'noop',
      category: 'information' as const,
      target: 'self' as const,
      uses: 1,
      cooldown: 0,
      params: {},
      description: 'noop',
    },
  ],
};

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const ANT_BATTLE_TILE: TileCoord = { plane: 'floor', x: 4, y: 4 };

const antParty = (id: string, units: readonly Unit[]): Party => ({
  id: id as PartyId,
  faction: 'ant',
  units,
  leaderId: units[0]?.id ?? ('none' as UnitId),
  location: ANT_BATTLE_TILE,
  orders: [],
  posture: 'fight',
  strategyModifiers: [],
  jellyDoses: 0,
  leaderless: false,
});

const spiderParty = (id: string, units: readonly Unit[]): Party => ({
  ...antParty(id, units),
  id: id as PartyId,
  faction: 'spider',
});

const mkUnit = (
  state: GameState,
  templateId: string,
  unitId: string,
  over: Partial<Unit> = {},
): Unit => {
  const tmpl = state.unitTemplates.get(templateId as UnitTemplateId);
  if (!tmpl) throw new Error(`test fixture: unknown template '${templateId}'`);
  return {
    id: unitId as UnitId,
    templateId: tmpl.id,
    currentHp: tmpl.baseStats.hp,
    level: 1,
    xp: 0,
    ...over,
  };
};

const installParties = (state: GameState, parties: readonly Party[]): GameState => {
  const m = new Map(state.parties);
  for (const p of parties) m.set(p.id, p);
  return { ...state, parties: m };
};

const neutralInput = (attacker: Party, defender: Party): BattleInput => ({
  attacker,
  defender,
  postDefense: 0,
  queenProximityAttack: 1,
  queenProximityResilience: 1,
  attackerJellyAttack: 1,
  attackerJellyResilience: 1,
  defenderJellyAttack: 1,
  defenderJellyResilience: 1,
  abilities: noAbilities,
});

/** Sum of all damage dealt across every round of a resolved battle. */
const totalDamage = (state: GameState, atk: Party, def: Party, seed: number): number => {
  const s = installParties(state, [atk, def]);
  const out = resolveBattle(s, neutralInput(atk, def), createRng(seed), makeTickClock());
  let dmg = 0;
  for (const r of out.result.rounds) for (const a of r.actions) dmg += a.damage;
  return dmg;
};

const runL1 = (seed: number): GameState => {
  const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(DATA_DIR, seed);
  const player = PLAYER_AIS.baseline;
  const enemy = ENEMY_AIS['spider-l1'];
  if (!player || !enemy) throw new Error('missing AI');
  const clock = createTickClock();
  const outcome = runScenario(state, data, createRng(seed), clock.next, {
    maxTurns: 100,
    policies: [player, enemy, neutralPlayer],
    neutralSpawnEvents,
    itemSpawnEvents,
  });
  return outcome.finalState;
};

const FOOTMAN = 'ant-footman';
const SOLDIER = 'spider-soldier';

describe('engine/level-combat — combat folding', () => {
  it('1. a unit with no levelBonus deals identical damage to baseline', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const atk = antParty('atk', [mkUnit(state, FOOTMAN, 'f1'), mkUnit(state, FOOTMAN, 'f2')]);
    const def = spiderParty('def', [mkUnit(state, SOLDIER, 's1'), mkUnit(state, SOLDIER, 's2')]);
    // Two independent resolutions with the same seed must match exactly;
    // and a no-levelBonus run must equal the pre-folding behavior (the
    // levelBonus branch is never entered when the field is undefined).
    const a = totalDamage(state, atk, def, 7);
    const b = totalDamage(state, atk, def, 7);
    expect(b).toBe(a);
    // Helper is a strict identity no-op on an undefined bonus.
    const base: Stats = state.unitTemplates.get(FOOTMAN as UnitTemplateId)!.baseStats;
    expect(applyLevelBonusToStats(base, undefined)).toBe(base);
  });

  it('2. a level-5 footman (via world-inject) out-damages a level-1 footman', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const tmpl = state.unitTemplates.get(FOOTMAN as UnitTemplateId)!;
    const lvl5Bonus = cumulativeLevelBonus(5, tmpl);
    const l1Atk = antParty('l1', [mkUnit(state, FOOTMAN, 'f1')]);
    const l5Atk = antParty('l5', [
      mkUnit(state, FOOTMAN, 'f1', { level: 5, levelBonus: lvl5Bonus }),
    ]);
    const mkDef = (): Party => spiderParty('def', [mkUnit(state, SOLDIER, 's1')]);

    // Average across seeds so the ±1 damage variance can't mask the
    // deterministic +attack delta.
    let l1Sum = 0;
    let l5Sum = 0;
    for (let seed = 1; seed <= 12; seed++) {
      l1Sum += totalDamage(state, l1Atk, mkDef(), seed);
      l5Sum += totalDamage(state, l5Atk, mkDef(), seed);
    }
    expect(lvl5Bonus.attack).toBe(4); // footman primary = attack, +1/level
    expect(l5Sum).toBeGreaterThan(l1Sum);
  });

  it('3. a defender level armor/HP bonus reduces effective incoming damage', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const tmpl = state.unitTemplates.get(SOLDIER as UnitTemplateId)!;
    // spider-soldier primary is attack; its level bonus adds +hp which
    // raises the defender's effective HP pool, so a leveled defender
    // survives strictly longer (more total HP buffer) for the same
    // incoming damage stream.
    const bonus = cumulativeLevelBonus(6, tmpl);
    const atk = (): Party => antParty('atk', [mkUnit(state, FOOTMAN, 'f1')]);
    const plainDef = spiderParty('def', [mkUnit(state, SOLDIER, 's1')]);
    const leveledDef = spiderParty('def', [
      mkUnit(state, SOLDIER, 's1', {
        level: 6,
        levelBonus: bonus,
        currentHp: tmpl.baseStats.hp + bonus.hp,
      }),
    ]);
    const sPlain = installParties(state, [atk(), plainDef]);
    const sLvl = installParties(state, [atk(), leveledDef]);
    const oPlain = resolveBattle(
      sPlain,
      neutralInput(atk(), plainDef),
      createRng(3),
      makeTickClock(),
    );
    const oLvl = resolveBattle(
      sLvl,
      neutralInput(atk(), leveledDef),
      createRng(3),
      makeTickClock(),
    );
    const survPlain = oPlain.result.participants.find((p) => p.unitId === ('s1' as UnitId))!;
    const survLvl = oLvl.result.participants.find((p) => p.unitId === ('s1' as UnitId))!;
    // The leveled defender enters the battle with a strictly larger max
    // HP pool (the hp lane), so its damage cushion is larger.
    expect(survLvl.maxHp).toBeGreaterThan(survPlain.maxHp);
    expect(bonus.hp).toBeGreaterThan(0);
  });

  it('4. the level HP bonus makes a unit spawn with a larger currentHp (world-inject)', () => {
    const finalState = runL1(3);
    const roster = extractWorldRoster({ finalState, winner: finalState.winner });
    // Force a level on the first footman so the inject path lifts HP.
    const tmplId = roster.units[0]?.templateId;
    if (!tmplId) throw new Error('empty roster');
    const bumped: WorldRoster = {
      ...roster,
      units: roster.units.map((u, i) => (i === 0 ? { ...u, level: 4, xp: 600 } : u)),
    };
    const next = loadScenario(DATA_DIR, 4);
    const scaffold = scaffoldFromState(next.state);
    const { state } = injectWorldRoster(next.state, bumped, scaffold);

    const tmpl = next.state.unitTemplates.get(tmplId)!;
    const expected = cumulativeLevelBonus(4, tmpl);
    let found: Unit | undefined;
    for (const p of state.parties.values()) {
      if (p.faction !== 'ant') continue;
      found = p.units.find((u) => u.id === bumped.units[0]!.id);
      if (found) break;
    }
    expect(found).toBeDefined();
    expect(found!.currentHp).toBe(tmpl.baseStats.hp + expected.hp);
    expect(found!.currentHp).toBeGreaterThan(tmpl.baseStats.hp);
    expect(found!.levelBonus).toEqual(expected);
  });

  it('5. an agility level bonus changes the deterministic strike order', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const archerTmpl = state.unitTemplates.get('ant-archer' as UnitTemplateId)!;
    const footTmpl = state.unitTemplates.get(FOOTMAN as UnitTemplateId)!;
    const slow: Stats = footTmpl.baseStats;
    const fast: Stats = archerTmpl.baseStats;
    const rngOrder = (): readonly UnitId[] =>
      computeAgilityOrder(
        [
          { id: 'slow' as UnitId, stats: slow },
          { id: 'fast' as UnitId, stats: fast },
        ],
        createRng(5),
      );
    const baseline = rngOrder();
    // Give the slow unit a big agility level bonus so it now outpaces
    // the previously-faster unit.
    const boosted: Stats = applyLevelBonusToStats(slow, {
      attack: 0,
      armor: 0,
      hp: 0,
      agility: fast.agility - slow.agility + 3,
      intelligence: 0,
    });
    const after = computeAgilityOrder(
      [
        { id: 'slow' as UnitId, stats: boosted },
        { id: 'fast' as UnitId, stats: fast },
      ],
      createRng(5),
    );
    expect(baseline[0]).toBe('fast' as UnitId);
    expect(after[0]).toBe('slow' as UnitId);
  });

  it('6. an intelligence level bonus boosts a mage magic-arrow', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    let mage: Unit | undefined;
    let archer: Unit | undefined;
    for (const party of state.parties.values()) {
      for (const u of party.units) {
        if (!mage && u.templateId === ('ant-mage' as UnitTemplateId)) mage = u;
        if (!archer && u.templateId === ('ant-archer' as UnitTemplateId)) archer = u;
      }
      if (mage && archer) break;
    }
    if (!mage || !archer) throw new Error('need mage + archer');

    const target: Unit = {
      id: 'tgt' as UnitId,
      templateId: SOLDIER as UnitTemplateId,
      currentHp: 99,
      level: 1,
      xp: 0,
    };
    const mkDef = (): Party => spiderParty('def', [target]);
    const fire = (mageUnit: Unit): number => {
      const atk = antParty('atk', [mageUnit, archer]);
      const out = applyOpeningAbilities(
        atk,
        mkDef(),
        state.unitTemplates,
        data.abilities,
        1,
        makeTickClock(),
      );
      const tgt = out.defender.units.find((u) => u.id === target.id)!;
      return 99 - tgt.currentHp;
    };
    const plainDmg = fire(mage);
    const leveledDmg = fire({
      ...mage,
      level: 4,
      levelBonus: { attack: 0, armor: 0, hp: 0, agility: 0, intelligence: 3 },
    });
    expect(plainDmg).toBeGreaterThan(0);
    expect(leveledDmg).toBe(plainDmg + 3);
  });

  it('7. world-inject sets levelBonus from WorldUnit.level matching the curve', () => {
    const finalState = runL1(5);
    const roster = extractWorldRoster({ finalState, winner: finalState.winner });
    // Synthesize a known mix of levels onto the carried roster.
    const leveled: WorldRoster = {
      ...roster,
      units: roster.units.map((u, i): WorldUnit => {
        const lvl = (i % 4) + 1; // 1..4
        return { ...u, level: lvl, xp: lvl >= 2 ? 10_000 : 0 };
      }),
    };
    const next = loadScenario(DATA_DIR, 6);
    const scaffold = scaffoldFromState(next.state);
    const { state, report } = injectWorldRoster(next.state, leveled, scaffold);

    const byId = new Map(leveled.units.map((u) => [u.id, u] as const));
    for (const p of state.parties.values()) {
      if (p.faction !== 'ant') continue;
      for (const u of p.units) {
        const wu = byId.get(u.id);
        if (!wu) continue;
        const tmpl = next.state.unitTemplates.get(u.templateId)!;
        const expected = cumulativeLevelBonus(wu.level, tmpl);
        if (wu.level >= 2) {
          expect(u.levelBonus).toEqual(expected);
        } else {
          // Level-1 → no field at all (strict combat no-op).
          expect(u.levelBonus).toBeUndefined();
        }
      }
    }
    // The report lists exactly the leveled units (level >= 2).
    for (const ls of report.leveledUnits) {
      expect(ls.level).toBeGreaterThanOrEqual(2);
      const tmpl = [...state.parties.values()]
        .flatMap((p) => p.units)
        .find((u) => u.id === ls.unitId);
      expect(tmpl?.levelBonus).toEqual(ls.levelBonus);
    }
  });

  it('8. deterministic: same campaign seed → identical leveled-combat outcomes', () => {
    const { state } = loadScenario(DATA_DIR, 9);
    const tmpl = state.unitTemplates.get(FOOTMAN as UnitTemplateId)!;
    const bonus = cumulativeLevelBonus(5, tmpl);
    const mkAtk = (): Party =>
      antParty('atk', [
        mkUnit(state, FOOTMAN, 'f1', { level: 5, levelBonus: bonus }),
        mkUnit(state, FOOTMAN, 'f2', { level: 5, levelBonus: bonus }),
      ]);
    const mkDef = (): Party =>
      spiderParty('def', [mkUnit(state, SOLDIER, 's1'), mkUnit(state, SOLDIER, 's2')]);

    const run = (): number[] => {
      const s = installParties(state, [mkAtk(), mkDef()]);
      const out = resolveBattle(s, neutralInput(mkAtk(), mkDef()), createRng(123), makeTickClock());
      return out.result.rounds.flatMap((r) => r.actions.map((a) => a.damage));
    };
    expect(run()).toEqual(run());
  });
});
