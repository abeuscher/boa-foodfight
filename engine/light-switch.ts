/**
 * L4 (Hallway) Light-Switch flip-state POST → global combat modifier
 * (roadmap §3.8 / §4a boundary #1).
 *
 * §4a split: Level owns the flip-state POST node (position, the fact
 * that its ownership is the switch); Gameplay owns this combat
 * payload, kept to a single low-cognitive flat attack delta per the
 * Gameplay PA ruling so it does not exceed L4's cognitive budget.
 *
 * A POST may carry `combatModifier = { litOwner, faction, attack }`.
 * The switch is "lit" iff the POST is owned by `litOwner`; while it is
 * UNLIT (any other owner) every unit of `faction` gets `+attack`
 * effective attack engine-wide. `engine/battle` folds this into the
 * exact additive lane as the POST-occupation bonus (after plane
 * affinity, before the multiplicative posture/jelly/queen stack), so
 * it never compounds into the multiplicative reach.
 *
 * Pure leaf — imports `engine/types` only; no I/O, no RNG. With no
 * `combatModifier` POST on any shipped map the offset is identically
 * zero and combat is byte-identical.
 */

import type { Faction, GameState } from './types.ts';

export interface LightSwitchAttack {
  readonly ant: number;
  readonly spider: number;
}

const ZERO: LightSwitchAttack = { ant: 0, spider: 0 };

/**
 * Sum the per-faction flat attack delta contributed by every UNLIT
 * `combatModifier` POST. Additive across POSTs (realistically one),
 * order-independent. Returns the shared `ZERO` when nothing applies
 * so the caller can cheaply detect the no-op case.
 */
export const computeLightSwitchAttack = (state: GameState): LightSwitchAttack => {
  let ant = 0;
  let spider = 0;
  for (const post of state.posts.values()) {
    const cm = post.combatModifier;
    if (cm === undefined) continue;
    if (post.owner === cm.litOwner) continue; // lit → modifier off
    if (cm.faction === 'ant') ant += cm.attack;
    else if (cm.faction === 'spider') spider += cm.attack;
  }
  return ant === 0 && spider === 0 ? ZERO : { ant, spider };
};

/** Look up the flat attack delta for a faction. Neutral → 0. */
export const lightSwitchAttackFor = (offsets: LightSwitchAttack, faction: Faction): number => {
  if (faction === 'ant') return offsets.ant;
  if (faction === 'spider') return offsets.spider;
  return 0;
};
