/**
 * Scenario-completion reward (pure). Victory pays a flat base plus two
 * skill bonuses, per the PM ruling: 100 flat + up to 25 for finishing
 * quickly + up to 25 for finishing intact (surviving ant HP fraction),
 * so a clean fast win tops out around 150 buttons. Added to the carried
 * `WorldState.gold`. Decoupled from in-sim `playerGold` (0 on L1 — the
 * §4e economy gap), so it works on shipped maps today.
 */
import type { GameState } from '../../../engine/types.ts';

import { MAX_TURNS } from './liveScenario.ts';

const FLAT = 100;
const SPEED_MAX = 25;
const INTACT_MAX = 25;

export interface ScenarioReward {
  readonly flat: number;
  readonly speedBonus: number;
  readonly intactBonus: number;
  readonly total: number;
}

/** Surviving ant HP as a fraction of the army's template-max HP [0, 1]. */
export const antHpFraction = (state: GameState): number => {
  let current = 0;
  let max = 0;
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    for (const u of party.units) {
      const tmpl = state.unitTemplates.get(u.templateId);
      max += tmpl ? tmpl.baseStats.hp : Math.max(0, u.currentHp);
      current += Math.max(0, u.currentHp);
    }
  }
  return max > 0 ? Math.min(1, current / max) : 0;
};

/** Reward for completing a scenario in `turnsPlayed` turns. Intended for
 * a victory; callers grant 0 on defeat. */
export const scenarioReward = (state: GameState, turnsPlayed: number): ScenarioReward => {
  const speed = Math.max(0, Math.min(1, (MAX_TURNS - turnsPlayed) / MAX_TURNS));
  const speedBonus = Math.round(SPEED_MAX * speed);
  const intactBonus = Math.round(INTACT_MAX * antHpFraction(state));
  return { flat: FLAT, speedBonus, intactBonus, total: FLAT + speedBonus + intactBonus };
};
