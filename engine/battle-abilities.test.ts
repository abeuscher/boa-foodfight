import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { applyOpeningAbilities } from './battle-abilities.ts';
import { loadScenario } from './state.ts';
import type { AbilityId, Party, PartyId, Unit, UnitId, UnitTemplateId } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const mkUnit = (templateId: string, id: string, hp?: number): Unit => {
  // currentHp passed in or defaulted to 99 (caller patches HP per test)
  return {
    id: id as UnitId,
    templateId: templateId as UnitTemplateId,
    currentHp: hp ?? 99,
    level: 1,
    xp: 0,
  };
};

const mkParty = (id: string, units: readonly Unit[], faction: 'ant' | 'spider'): Party => ({
  id: id as PartyId,
  faction,
  units,
  leaderId: units[0]?.id ?? ('none' as UnitId),
  location: { plane: 'floor', x: 0, y: 0 },
  orders: [],
  posture: 'fight',
  strategyModifiers: [],
  jellyDoses: 0,
  leaderless: false,
});

describe('applyOpeningAbilities — volley', () => {
  it('an archer party fires volley at the lowest-HP enemy unit', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const archer = mkUnit('ant-archer', 'a-arc-1', 5);
    const atk = mkParty('atk-test', [archer], 'ant');
    // Two spiders: a low-HP scout and a higher-HP soldier. Volley should
    // pick the scout (lower HP).
    const scout = mkUnit('spider-scout', 'd-scout-1', 10);
    const soldier = mkUnit('spider-soldier', 'd-sold-1', 12);
    const def = mkParty('def-test', [scout, soldier], 'spider');

    const out = applyOpeningAbilities(
      atk,
      def,
      state.unitTemplates,
      data.abilities,
      1,
      makeTickClock(),
    );

    const damage = data.abilities.abilities.find((a) => a.id === 'volley')?.params.damage ?? 0;
    const newScout = out.defender.units.find((u) => u.id === scout.id);
    const newSoldier = out.defender.units.find((u) => u.id === soldier.id);
    expect(newScout?.currentHp).toBe(Math.max(0, 10 - damage));
    expect(newSoldier?.currentHp).toBe(12);
    // Volley marked as used on the archer.
    expect(out.attacker.units[0]?.usedAbilities).toContain('volley' as AbilityId);
    // Emits an ability-used event.
    const abilityEvents = out.events.filter((e) => e.kind === 'ability-used');
    expect(abilityEvents).toHaveLength(1);
  });

  it('a unit that already used volley does not fire it again', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const archerUsed: Unit = {
      ...mkUnit('ant-archer', 'a-arc-1', 5),
      usedAbilities: ['volley' as AbilityId],
    };
    const atk = mkParty('atk', [archerUsed], 'ant');
    const target = mkUnit('spider-soldier', 'd-1', 12);
    const def = mkParty('def', [target], 'spider');

    const out = applyOpeningAbilities(
      atk,
      def,
      state.unitTemplates,
      data.abilities,
      1,
      makeTickClock(),
    );
    expect(out.defender.units[0]?.currentHp).toBe(12);
    expect(out.events.filter((e) => e.kind === 'ability-used')).toHaveLength(0);
  });

  it('volley can kill a low-HP enemy outright; emits unit-died', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const archer = mkUnit('ant-archer', 'a-arc-1', 5);
    const atk = mkParty('atk', [archer], 'ant');
    const target = mkUnit('spider-scout', 'd-1', 1);
    const def = mkParty('def', [target], 'spider');

    const out = applyOpeningAbilities(
      atk,
      def,
      state.unitTemplates,
      data.abilities,
      1,
      makeTickClock(),
    );
    expect(out.defender.units[0]?.currentHp).toBe(0);
    const deaths = out.events.filter((e) => e.kind === 'unit-died');
    expect(deaths).toHaveLength(1);
  });

  it('a non-archer unit (footman) does NOT fire volley', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const footman = mkUnit('ant-footman', 'a-foot-1', 6);
    const atk = mkParty('atk', [footman], 'ant');
    const target = mkUnit('spider-soldier', 'd-1', 12);
    const def = mkParty('def', [target], 'spider');

    const out = applyOpeningAbilities(
      atk,
      def,
      state.unitTemplates,
      data.abilities,
      1,
      makeTickClock(),
    );
    expect(out.defender.units[0]?.currentHp).toBe(12);
    expect(out.events.filter((e) => e.kind === 'ability-used')).toHaveLength(0);
  });
});

describe('applyOpeningAbilities — mend', () => {
  it('an ant-mage heals every living unit in its own party (capped at template max)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const mage = mkUnit('ant-mage', 'a-mage-1', 5);
    const wounded = mkUnit('ant-footman', 'a-foot-1', 1); // hurt
    const fullHealth = mkUnit('ant-footman', 'a-foot-2', 6); // already at max
    const atk = mkParty('atk', [mage, wounded, fullHealth], 'ant');
    const def = mkParty('def', [mkUnit('spider-soldier', 'd-1', 12)], 'spider');

    const heal = data.abilities.abilities.find((a) => a.id === 'mend')?.params.heal ?? 0;
    const out = applyOpeningAbilities(
      atk,
      def,
      state.unitTemplates,
      data.abilities,
      1,
      makeTickClock(),
    );

    const healedWounded = out.attacker.units.find((u) => u.id === wounded.id);
    const healedFull = out.attacker.units.find((u) => u.id === fullHealth.id);
    expect(healedWounded?.currentHp).toBe(Math.min(6, 1 + heal));
    expect(healedFull?.currentHp).toBe(6); // already at cap
    expect(out.attacker.units.find((u) => u.id === mage.id)?.usedAbilities).toContain(
      'mend' as AbilityId,
    );
  });

  it('mend does not heal the enemy party', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const mage = mkUnit('ant-mage', 'a-mage-1', 5);
    const atk = mkParty('atk', [mage], 'ant');
    const enemyHurt = mkUnit('spider-soldier', 'd-1', 1);
    const def = mkParty('def', [enemyHurt], 'spider');

    const out = applyOpeningAbilities(
      atk,
      def,
      state.unitTemplates,
      data.abilities,
      1,
      makeTickClock(),
    );
    expect(out.defender.units[0]?.currentHp).toBe(1);
  });
});

describe('applyOpeningAbilities — both sides fire in deterministic order', () => {
  it('attacker volley resolves before defender volley — the killed defender cannot retaliate', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const atkArcher = mkUnit('ant-archer', 'a-arc', 5);
    const atk = mkParty('atk', [atkArcher], 'ant');
    // Defender is also an archer (unusual but fine for the symmetry test).
    // Volley damage (12) > defender HP (5) so the attacker's volley kills
    // the defender's archer before it can volley back. Only one
    // ability-used event should fire.
    const defArcher = mkUnit('ant-archer', 'd-arc', 5);
    const def = mkParty('def', [defArcher], 'ant');

    const out = applyOpeningAbilities(
      atk,
      def,
      state.unitTemplates,
      data.abilities,
      1,
      makeTickClock(),
    );
    const abilityUseds = out.events.filter((e) => e.kind === 'ability-used');
    expect(abilityUseds).toHaveLength(1);
    // The defender's archer is dead.
    expect(out.defender.units[0]?.currentHp).toBe(0);
  });
});
