/**
 * Day/night phase tunables and helpers (rec 1.2).
 *
 * Phase cadence is global: turns 1..PHASE_LENGTH are day, the next
 * PHASE_LENGTH are night, and so on. The turn driver decrements
 * `phaseTurnsRemaining` at end-of-turn and emits a `phase-changed`
 * event when the new phase starts.
 *
 * Combat modifiers (applied AFTER plane affinity, BEFORE the
 * multiplicative posture/jelly/queen stack):
 *   - Night: spiders gain `+1 attack, +1 agility`.
 *   - Night: ant-archer template gets `-1 attack`.
 *   - Day: no modifiers.
 *
 * Ability gating (in `engine/abilities.ts`):
 *   - `scout-ping` is suppressed at night (no-op + emits
 *     `ability-blocked-by-phase`).
 *
 * This module is a leaf — it depends only on `engine/types`. State and
 * end-of-turn import the constants here; combat reads the phase off
 * the GameState and applies the bonuses inline.
 */

import type { DayNightPhase, Stats, UnitTemplate } from './types.ts';

/** Turns each phase lasts before flipping. */
export const PHASE_LENGTH = 4;

/**
 * Per-template attack/agility offsets keyed off the current phase.
 * Returns flat numbers (default 0/0) the combat resolver folds into
 * the unit's effective stats. Spiders +1/+1 attack/agility at night;
 * ant-archer -1 attack at night.
 */
export interface PhaseStatOffset {
  readonly attack: number;
  readonly agility: number;
}

const ZERO_OFFSET: PhaseStatOffset = { attack: 0, agility: 0 };

export const phaseStatOffsetFor = (
  template: UnitTemplate,
  phase: DayNightPhase,
): PhaseStatOffset => {
  if (phase === 'day') return ZERO_OFFSET;
  if (template.faction === 'spider') return { attack: 1, agility: 1 };
  if (template.id === ('ant-archer' as UnitTemplate['id'])) return { attack: -1, agility: 0 };
  return ZERO_OFFSET;
};

/**
 * Apply a phase offset to a Stats record without mutating it. Returns
 * a fresh Stats with attack/agility shifted by the offset; other
 * fields are passed through.
 */
export const applyPhaseOffsetToStats = (stats: Stats, offset: PhaseStatOffset): Stats => ({
  ...stats,
  attack: stats.attack + offset.attack,
  agility: stats.agility + offset.agility,
});
