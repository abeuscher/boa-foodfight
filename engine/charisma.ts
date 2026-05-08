/**
 * engine/charisma — round 26 charisma-gated promotion (mechanics memo
 * §1.4, Ogre Battle inspired).
 *
 * Charisma is a per-unit dynamic stat (range [0, 100]) that gates a
 * single-step promotion track. Initialized to 50 at scenario start
 * for promotable units (everything except queens and specialty
 * templates: ant-worker, ant-tank, ant-potato-bug, spiderling,
 * mouse, mouse-merc, cockroach, stinkbug). Adjusted at battle end:
 *
 *   - Underdog (defender slots ≥ attacker slots + 2): +5 charisma to
 *     each living attacker unit.
 *   - Parity (|defender slots − attacker slots| ≤ 1): +1 charisma to
 *     each living attacker unit.
 *   - Overdog (attacker slots ≥ defender slots + 2): -3 charisma to
 *     each living attacker unit.
 *   - Flee (round-15 mechanic): -5 charisma to every living unit in
 *     the fleeing party.
 *   - Queen-kill: +20 charisma to the unit that landed the killing
 *     blow on an enemy queen.
 *
 * Bounds: clamped to [0, 100] after every adjustment. Once a unit
 * reaches `charisma >= PROMOTION_THRESHOLD` it becomes eligible; the
 * end-of-turn promotion tick fires if the unit is on its faction's
 * home POST and has not yet promoted (`unit.promoted !== true`).
 *
 * Promotion is single-step, locked at v1: each promotable template
 * has exactly one target template (`PROMOTION_TREE`). Promoted units
 * keep their `id`, `currentHp` (capped at the new template's hp),
 * `level`, `xp`, `mpSlots`, `charisma`, and `promoted: true`. Combat
 * stats come from the new templateId.
 *
 * Determinism: pure transformation. No I/O, no `Math.random()`. All
 * scoring is integer math; all event emissions are stable in unit-id
 * sort order.
 *
 * Imports allowed: `engine/types`, `engine/parties`.
 */

import { slotsUsed } from './parties.ts';
import type {
  GameState,
  Party,
  PartyId,
  Post,
  PostId,
  ReplayEvent,
  Unit,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

/** Initial charisma value for every promotable unit at scenario start. */
export const INITIAL_CHARISMA = 50;

/** A unit at or above this threshold is eligible to promote at home. */
export const PROMOTION_THRESHOLD = 70;

/** Charisma deltas per the spec. Stored as named constants so test
 *  assertions and the `ScoreBreakdown` math both reference the same
 *  numbers. */
export const CHARISMA_UNDERDOG_GAIN = 5;
export const CHARISMA_PARITY_GAIN = 1;
export const CHARISMA_OVERDOG_LOSS = -3;
export const CHARISMA_FLEE_LOSS = -5;
export const CHARISMA_QUEEN_KILL_GAIN = 20;

/** Slot-count gap that triggers underdog/overdog. A gap of 0 or 1 is
 *  parity. A gap of ≥ 2 in either direction triggers the asymmetric
 *  reward / penalty. */
const SLOT_GAP_THRESHOLD = 2;

/** Charisma bounds. */
const CHARISMA_MIN = 0;
const CHARISMA_MAX = 100;

const STORM_DRAIN_POST_ID = 'storm-drain' as PostId;
const SPIDER_WEB_POST_ID = 'spider-web' as PostId;

/**
 * Round 26 — single-step promotion tree (mechanics memo §1.4). Maps a
 * promotable template's id to its evolved form. Templates not listed
 * here are not promotable (queens, specialty units, neutrals, and the
 * promoted templates themselves).
 */
export const PROMOTION_TREE: ReadonlyMap<UnitTemplateId, UnitTemplateId> = new Map([
  ['ant-footman' as UnitTemplateId, 'ant-veteran-footman' as UnitTemplateId],
  ['ant-archer' as UnitTemplateId, 'ant-sharpshooter' as UnitTemplateId],
  ['ant-mage' as UnitTemplateId, 'ant-archmage' as UnitTemplateId],
  ['ant-scout' as UnitTemplateId, 'ant-scout-elite' as UnitTemplateId],
  ['spider-soldier' as UnitTemplateId, 'spider-veteran-soldier' as UnitTemplateId],
  ['spider-elite' as UnitTemplateId, 'spider-knight' as UnitTemplateId],
  ['spider-spinner' as UnitTemplateId, 'spider-weaver' as UnitTemplateId],
  ['spider-scout' as UnitTemplateId, 'spider-stalker' as UnitTemplateId],
]);

/**
 * Round 26 — true iff the template is on the promotion track. Used at
 * scenario start to seed charisma only for promotable units (queens
 * and specialty templates carry no charisma since they can't promote).
 */
export const isPromotableTemplate = (templateId: UnitTemplateId): boolean =>
  PROMOTION_TREE.has(templateId);

/** Clamp a charisma value to [0, 100]. */
export const clampCharisma = (value: number): number =>
  Math.max(CHARISMA_MIN, Math.min(CHARISMA_MAX, value));

/**
 * Round 26 — categorize an attacker/defender slot-count comparison.
 * Returns `'underdog'` when the defender outnumbers the attacker by
 * ≥ 2 slots, `'overdog'` when the attacker outnumbers the defender
 * by ≥ 2, `'parity'` otherwise.
 */
export type EngagementCategory = 'underdog' | 'parity' | 'overdog';

export const categorizeEngagement = (
  attackerSlots: number,
  defenderSlots: number,
): EngagementCategory => {
  if (defenderSlots >= attackerSlots + SLOT_GAP_THRESHOLD) return 'underdog';
  if (attackerSlots >= defenderSlots + SLOT_GAP_THRESHOLD) return 'overdog';
  return 'parity';
};

/** Map an engagement category to its charisma delta per spec. */
export const deltaForCategory = (category: EngagementCategory): number => {
  if (category === 'underdog') return CHARISMA_UNDERDOG_GAIN;
  if (category === 'overdog') return CHARISMA_OVERDOG_LOSS;
  return CHARISMA_PARITY_GAIN;
};

/** Map an engagement category to its replay reason tag. */
export const reasonForCategory = (
  category: EngagementCategory,
): 'underdog' | 'parity' | 'overdog' => category;

export interface CharismaUnitUpdate {
  readonly partyId: PartyId;
  readonly unitId: UnitId;
  readonly oldCharisma: number;
  readonly newCharisma: number;
  readonly reason: 'underdog' | 'parity' | 'overdog' | 'flee' | 'queen-kill';
}

/**
 * Round 26 — apply a flat charisma delta to every living, charisma-
 * carrying unit in the given party. Returns the updated party plus
 * the per-unit (oldCharisma, newCharisma) shifts for replay-event
 * emission. Units without a charisma field (queens, specialty
 * templates) are skipped — the delta only applies to the promotion-
 * track roster.
 */
export const applyCharismaToParty = (
  party: Party,
  delta: number,
  reason: CharismaUnitUpdate['reason'],
): { party: Party; updates: readonly CharismaUnitUpdate[] } => {
  const updates: CharismaUnitUpdate[] = [];
  let changed = false;
  const newUnits: Unit[] = party.units.map((u) => {
    if (u.charisma === undefined) return u;
    if (u.currentHp <= 0) return u;
    const oldCharisma = u.charisma;
    const newCharisma = clampCharisma(oldCharisma + delta);
    if (newCharisma === oldCharisma) return u;
    changed = true;
    updates.push({
      partyId: party.id,
      unitId: u.id,
      oldCharisma,
      newCharisma,
      reason,
    });
    return { ...u, charisma: newCharisma };
  });
  if (!changed) return { party, updates };
  return { party: { ...party, units: newUnits }, updates };
};

/**
 * Round 26 — slot-count helper for the charisma engagement check.
 * Lives charisma off `slotsUsed` from `engine/parties.ts` so the
 * "size" definition stays consistent with capacity bookkeeping.
 */
export const partySlotCount = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): number => slotsUsed(party, templates);

/**
 * Round 26 — promotion eligibility check. A unit is eligible iff it
 * is alive, has charisma at or above the threshold, hasn't already
 * promoted, and its template is on the promotion tree.
 */
export const isPromotionEligible = (unit: Unit): boolean => {
  if (unit.currentHp <= 0) return false;
  if (unit.promoted === true) return false;
  if (unit.charisma === undefined) return false;
  if (unit.charisma < PROMOTION_THRESHOLD) return false;
  return PROMOTION_TREE.has(unit.templateId);
};

/**
 * Round 26 — true iff `party.location` matches the faction's home POST
 * tile. Storm-drain for ants, spider-web for spiders. Neutral parties
 * never promote (no home base; handled by `INITIAL_CHARISMA` not being
 * seeded onto neutral templates anyway).
 */
const onHomePost = (party: Party, posts: ReadonlyMap<PostId, Post>): boolean => {
  const homeId = party.faction === 'ant' ? STORM_DRAIN_POST_ID : SPIDER_WEB_POST_ID;
  const home = posts.get(homeId);
  if (!home) return false;
  if (home.location.plane !== party.location.plane) return false;
  return home.location.x === party.location.x && home.location.y === party.location.y;
};

/**
 * Round 26 — promote a unit by switching its templateId to the paired
 * promoted template. Carries currentHp (capped at the new template's
 * max), level, xp, mpSlots, charisma, and any other transient fields
 * forward. Sets `promoted: true` so the second-eligibility window is
 * a no-op. The caller is responsible for unitTemplate map updates;
 * unit-template lookup at battle / end-of-turn time uses the new
 * template id.
 */
export const promoteUnit = (unit: Unit, toTemplate: UnitTemplate): Unit => ({
  ...unit,
  templateId: toTemplate.id,
  currentHp: Math.min(unit.currentHp, toTemplate.baseStats.hp),
  promoted: true,
});

export interface CharismaPromotionOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

/**
 * Round 26 — end-of-turn charisma promotion tick. Walks every party;
 * for any party whose location is its faction's home POST tile, walks
 * the party's units in id order and promotes each eligible unit.
 * Emits one `unit-promoted` event per promotion, in the same id order
 * (deterministic for replay). Returns the state unchanged when no
 * promotion fires.
 */
export const applyCharismaPromotions = (
  state: GameState,
  turn: number,
  tick: () => number,
): CharismaPromotionOutcome => {
  const events: ReplayEvent[] = [];
  let changedAny = false;
  const newParties = new Map<PartyId, Party>();
  for (const [id, party] of state.parties) {
    if (!onHomePost(party, state.posts)) {
      newParties.set(id, party);
      continue;
    }
    let partyChanged = false;
    const sortedUnits = [...party.units].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const idToPromoted = new Map<UnitId, Unit>();
    for (const u of sortedUnits) {
      if (!isPromotionEligible(u)) continue;
      const toTemplateId = PROMOTION_TREE.get(u.templateId);
      if (!toTemplateId) continue;
      const toTemplate = state.unitTemplates.get(toTemplateId);
      if (!toTemplate) continue;
      const promoted = promoteUnit(u, toTemplate);
      idToPromoted.set(u.id, promoted);
      events.push({
        kind: 'unit-promoted',
        turn,
        tick: tick(),
        partyId: party.id,
        unitId: u.id,
        fromTemplate: u.templateId,
        toTemplate: toTemplate.id,
      });
      partyChanged = true;
    }
    if (partyChanged) {
      const newUnits = party.units.map((u) => idToPromoted.get(u.id) ?? u);
      newParties.set(id, { ...party, units: newUnits });
      changedAny = true;
    } else {
      newParties.set(id, party);
    }
  }
  if (!changedAny) return { state, events };
  return { state: { ...state, parties: newParties }, events };
};
