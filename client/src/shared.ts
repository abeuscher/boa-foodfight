/**
 * Shared view helpers. Read-only derivations over a `WorldRoster` /
 * `WorldState` through the engine's documented accessors — no engine
 * internals.
 */
import type { PartyId, Stats, UnitId, UnitTemplate, UnitTemplateId } from '../../engine/types.ts';
import { barracksUnits, partySlotUsage, unitEffectiveStats } from '../../engine/world-organize.ts';
import type { WorldRoster, WorldState, WorldUnit } from '../../engine/world-state.ts';

import { ITEMS, TEMPLATES } from './fixture.ts';

const templateById = new Map<UnitTemplateId, UnitTemplate>(TEMPLATES.map((t) => [t.id, t]));
const itemNameById = new Map<string, string>(ITEMS.map((i) => [i.id, i.name]));

export const templateOf = (unit: WorldUnit): UnitTemplate | undefined =>
  templateById.get(unit.templateId);

export const unitLabel = (unit: WorldUnit): string =>
  templateOf(unit)?.name ?? String(unit.templateId);

export const templateName = (id: UnitTemplateId): string =>
  templateById.get(id)?.name ?? String(id);

export const isLeaderEligible = (unit: WorldUnit): boolean =>
  templateOf(unit)?.tags.includes('leader-eligible') ?? true;

export const statsFor = (unit: WorldUnit): Stats | undefined => unitEffectiveStats(unit, TEMPLATES);

export const slotsFor = (roster: WorldRoster, partyId: PartyId) =>
  partySlotUsage(roster, partyId, TEMPLATES);

export const barracksOf = (roster: WorldRoster): readonly WorldUnit[] => barracksUnits(roster);

export const unitById = (roster: WorldRoster, id: UnitId): WorldUnit | undefined =>
  roster.units.find((u) => u.id === id);

export const itemName = (id: string): string => itemNameById.get(id) ?? id;

export interface Notice {
  readonly kind: 'ok' | 'error';
  readonly text: string;
}

/** Build a user-facing notice from an operator result. On rejection
 * the operator returns its input unchanged plus a surfaceable reason. */
export const noticeOf = (result: { ok: boolean; error?: string }, okText: string): Notice =>
  result.ok ? { kind: 'ok', text: okText } : { kind: 'error', text: result.error ?? 'rejected' };

/** Commit a new world state and surface the operator's result. Held by
 * the App shell; the views call it after invoking an engine operator. */
export type Apply = (
  next: WorldState,
  result: { ok: boolean; error?: string },
  okText: string,
) => void;
