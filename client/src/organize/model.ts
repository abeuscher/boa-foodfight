/**
 * The Organize Army UI's binding surface. It touches the engine ONLY
 * through the pure operators in `engine/world-organize.ts` (the
 * troop-reference §10 contract) and the read-only `WorldRoster` /
 * `UnitTemplate` types — never engine internals, never the sim path.
 */
import type {
  PartyId,
  Stats,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
} from '../../../engine/types.ts';
import type { OrganizeResult } from '../../../engine/world-organize.ts';
import {
  barracksUnits,
  partySlotUsage,
  unitEffectiveStats,
} from '../../../engine/world-organize.ts';
import type { WorldRoster, WorldUnit } from '../../../engine/world-state.ts';
import rawFixture from '../fixtures/l1-roster.json';

interface Fixture {
  readonly roster: WorldRoster;
  readonly templates: readonly UnitTemplate[];
}

const fixture = rawFixture as unknown as Fixture;

export const TEMPLATES: readonly UnitTemplate[] = fixture.templates;
export const INITIAL_ROSTER: WorldRoster = fixture.roster;

const templateById = new Map<UnitTemplateId, UnitTemplate>(TEMPLATES.map((t) => [t.id, t]));

export const templateOf = (unit: WorldUnit): UnitTemplate | undefined =>
  templateById.get(unit.templateId);

export const unitLabel = (unit: WorldUnit): string =>
  templateOf(unit)?.name ?? String(unit.templateId);

export const isLeaderEligible = (unit: WorldUnit): boolean =>
  templateOf(unit)?.tags.includes('leader-eligible') ?? true;

export const slotsFor = (roster: WorldRoster, partyId: PartyId) =>
  partySlotUsage(roster, partyId, TEMPLATES);

export const statsFor = (unit: WorldUnit): Stats | undefined => unitEffectiveStats(unit, TEMPLATES);

export const barracksOf = (roster: WorldRoster): readonly WorldUnit[] => barracksUnits(roster);

export const unitById = (roster: WorldRoster, id: UnitId): WorldUnit | undefined =>
  roster.units.find((u) => u.id === id);

export interface Notice {
  readonly kind: 'ok' | 'error';
  readonly text: string;
}

/** Fold an `OrganizeResult` into the next roster + a user-facing
 * notice. On rejection the operator returns the input roster unchanged
 * and a surfaceable reason; we show it rather than failing silently. */
export const fold = (
  result: OrganizeResult,
  okText: string,
): { roster: WorldRoster; notice: Notice } => ({
  roster: result.roster,
  notice: result.ok
    ? { kind: 'ok', text: okText }
    : { kind: 'error', text: result.error ?? 'operation rejected' },
});
