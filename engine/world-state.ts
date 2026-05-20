/**
 * Phase B (B1) — campaign world-state model + persistence.
 *
 * `WorldState` is the cross-scenario save record. The scenario engine
 * (`engine/turn.ts`, `engine/battle.ts`, ...) is untouched by Phase B:
 * the world loop *wraps* it. After a scenario ends, `engine/world-extract`
 * distills the durable campaign facts into a `WorldState`; before the
 * next scenario, `engine/world-inject` rebuilds an initial `GameState`
 * from it.
 *
 * ## Design decisions (documented inline per the Phase B spec)
 *
 * (a) **Units heal to full between scenarios.** The spec says garrisoned
 *     parties heal at accelerated rates at the home base, and the world
 *     loop is the between-scenario rest point. So `currentHp` on a
 *     `WorldUnit` is *always* the unit's template-max HP at the moment
 *     of extraction (see `engine/world-extract.ts`). The field is still
 *     persisted (rather than dropped) so a future "wounded carries"
 *     tuning lever doesn't require a save-format change.
 *
 * (b) **Per-scenario state does NOT persist.** Cards in hand, MP slots,
 *     `neutralStatus`, damage zones, fog, pheromone trails, the queen
 *     ultimate charge, day/night phase, and POST capture progress are
 *     all scenario-scoped and intentionally absent from `WorldState`.
 *     They are re-initialized fresh by `loadScenario` / `world-inject`.
 *
 * (c) **`cardsOwned` is empty and stays empty (cards are per-scenario).**
 *     Round-25 commander cards are bought from a per-scenario market
 *     with per-scenario gold-in-hand semantics; carrying a hand across
 *     scenarios would double-dip the gold sink. The field exists in the
 *     schema for forward-compatibility but the world loop never fills it.
 *
 * (d) **Dead units are dropped from the roster.** A unit with
 *     `currentHp <= 0` at scenario end is a casualty and is pruned by
 *     `world-extract` before a `WorldState` is built — it never reaches
 *     this module. `pruneDeadWorldUnits` is provided for tests / belt-
 *     and-braces, but the extraction path already excludes them.
 *
 * Determinism: pure data + JSON. The campaign `rngSeed` is carried here
 * and consumed by `engine/world-levelup` / `engine/world-shop` via the
 * existing seeded `createRng`. No `Math.random`, no I/O in this module
 * (disk I/O lives in `engine/world-save.ts`).
 */

import { worldStateSchema } from './schemas/world.ts';
import type { ItemId, PartyId, UnitId, UnitTemplateId } from './types.ts';

export interface WorldUnit {
  readonly id: UnitId;
  readonly templateId: UnitTemplateId;
  /** Carried HP. Always template-max in practice (heal-between, see
   * decision (a)); persisted for completeness. */
  readonly currentHp: number;
  readonly level: number;
  readonly xp: number;
  /** Round-26 charisma carries forward across the campaign. */
  readonly charisma: number;
  /** Round-26 promotion is permanent within a campaign. */
  readonly promoted: boolean;
  /** Round-14 equipped item carries forward; null for an empty slot. */
  readonly item: ItemId | null;
  /**
   * Phase B (B3) — cumulative campaign level-up stat bonus. Absent
   * until the unit's first level-up (treated as all-zero). Persisted
   * so growth accumulates across save / reload boundaries. The
   * concrete grant rule lives in `engine/world-levelup.ts`; the field
   * is declared here (rather than there) to keep it serializable
   * without a circular import.
   */
  readonly levelUpBonus?: WorldLevelUpBonus;
}

/**
 * Phase B (B3) — per-unit additive stat bonus from campaign level-ups.
 * Folded onto template base stats by `engine/world-levelup`'s
 * `effectiveStats`. Fields the curve doesn't grant stay 0.
 */
export interface WorldLevelUpBonus {
  readonly hp: number;
  readonly attack: number;
  readonly agility: number;
  readonly intelligence: number;
}

/**
 * Roadmap §7.9 — player-set formation override (sparse). Lists only
 * the units the player has *explicitly* placed in a rank; surviving
 * members not listed here are auto-assigned by the engine at scenario
 * staging (`engine/world-inject`, the §7.9 honoring follow-on). The
 * queen is always front (queen-pin). Caps mirror the engine model:
 * the operator guards explicit front ≤ 3 / back ≤ 2; `world-inject`
 * re-enforces the hard caps at staging.
 */
export interface WorldFormation {
  readonly front: readonly UnitId[];
  readonly back: readonly UnitId[];
  readonly reserve: readonly UnitId[];
}

export interface WorldPartyAssignment {
  readonly partyId: PartyId;
  readonly unitIds: readonly UnitId[];
  readonly leaderId: UnitId;
  /**
   * Roadmap §7.9 — optional sparse player formation override. Absent
   * until the player sets a rank (engine auto-assigns when absent —
   * preserves byte-identical saves / replays, same discipline as
   * `WorldUnit.levelUpBonus`).
   */
  readonly formation?: WorldFormation;
}

export interface WorldRoster {
  /** The player is always the ant faction across the campaign. */
  readonly faction: 'ant';
  /** The surviving pool, not yet assigned to parties. */
  readonly units: readonly WorldUnit[];
  /** How the pool was last organized into parties (for re-form / inject). */
  readonly partyAssignments: readonly WorldPartyAssignment[];
}

export interface WorldState {
  readonly campaignId: string;
  /** 0-based scenario index; 0 = L1. */
  readonly scenarioIndex: number;
  readonly roster: WorldRoster;
  /** Player gold carried forward (round-12). */
  readonly gold: number;
  /** Round-25 cards are per-scenario — see decision (c). Always []. */
  readonly cardsOwned: readonly never[];
  /** Campaign-level seed for deterministic world ops. */
  readonly rngSeed: number;
  /** ISO timestamp of when the save was written. */
  readonly savedAt: string;
}

/**
 * Drop any unit with `currentHp <= 0` from a roster. The extraction
 * path already excludes casualties (decision (d)); this is a defensive
 * helper for tests and any future hand-built roster. Party assignments
 * referencing a dropped unit have that id filtered out; an assignment
 * whose leader died keeps the first surviving member as leader (or is
 * dropped entirely if it has no survivors).
 */
export const pruneDeadWorldUnits = (roster: WorldRoster): WorldRoster => {
  const living = roster.units.filter((u) => u.currentHp > 0);
  const livingIds = new Set<UnitId>(living.map((u) => u.id));
  const assignments: WorldPartyAssignment[] = [];
  for (const a of roster.partyAssignments) {
    const unitIds = a.unitIds.filter((id) => livingIds.has(id));
    if (unitIds.length === 0) continue;
    const leaderId = livingIds.has(a.leaderId) ? a.leaderId : unitIds[0];
    if (leaderId === undefined) continue;
    assignments.push({ partyId: a.partyId, unitIds, leaderId });
  }
  return { faction: roster.faction, units: living, partyAssignments: assignments };
};

/**
 * Serialize a `WorldState` to a stable JSON string. Keys are emitted in
 * a fixed object order (the literal below) so two equal world states
 * produce byte-identical saves — important for the round-trip and
 * resume-determinism tests.
 */
export const serializeWorldState = (ws: WorldState): string =>
  JSON.stringify(
    {
      campaignId: ws.campaignId,
      scenarioIndex: ws.scenarioIndex,
      roster: {
        faction: ws.roster.faction,
        units: ws.roster.units.map((u) => ({
          id: u.id,
          templateId: u.templateId,
          currentHp: u.currentHp,
          level: u.level,
          xp: u.xp,
          charisma: u.charisma,
          promoted: u.promoted,
          item: u.item,
          // Only emit when present so a never-leveled roster's save
          // stays byte-identical to the pre-B3 format.
          ...(u.levelUpBonus !== undefined ? { levelUpBonus: u.levelUpBonus } : {}),
        })),
        partyAssignments: ws.roster.partyAssignments.map((a) => ({
          partyId: a.partyId,
          unitIds: [...a.unitIds],
          leaderId: a.leaderId,
          // Only emit when the player has set a formation, so a save
          // with no formation overrides stays byte-identical to the
          // pre-§7.9 format.
          ...(a.formation !== undefined
            ? {
                formation: {
                  front: [...a.formation.front],
                  back: [...a.formation.back],
                  reserve: [...a.formation.reserve],
                },
              }
            : {}),
        })),
      },
      gold: ws.gold,
      cardsOwned: [],
      rngSeed: ws.rngSeed,
      savedAt: ws.savedAt,
    },
    null,
    2,
  );

/**
 * Parse + validate a serialized world state. Throws `ZodError` (with a
 * readable path) if the blob is malformed — the save file is a trust
 * boundary, so a bad save fails loudly rather than corrupting a
 * campaign.
 */
export const deserializeWorldState = (str: string): WorldState => {
  const raw: unknown = JSON.parse(str);
  const parsed = worldStateSchema.parse(raw);
  return {
    campaignId: parsed.campaignId,
    scenarioIndex: parsed.scenarioIndex,
    roster: {
      faction: 'ant',
      units: parsed.roster.units.map((u) => ({
        id: u.id as UnitId,
        templateId: u.templateId as UnitTemplateId,
        currentHp: u.currentHp,
        level: u.level,
        xp: u.xp,
        charisma: u.charisma,
        promoted: u.promoted,
        item: u.item === null ? null : (u.item as ItemId),
        ...(u.levelUpBonus !== undefined ? { levelUpBonus: u.levelUpBonus } : {}),
      })),
      partyAssignments: parsed.roster.partyAssignments.map((a) => ({
        partyId: a.partyId as PartyId,
        unitIds: a.unitIds.map((id) => id as UnitId),
        leaderId: a.leaderId as UnitId,
        ...(a.formation !== undefined
          ? {
              formation: {
                front: a.formation.front.map((id) => id as UnitId),
                back: a.formation.back.map((id) => id as UnitId),
                reserve: a.formation.reserve.map((id) => id as UnitId),
              },
            }
          : {}),
      })),
    },
    gold: parsed.gold,
    cardsOwned: [],
    rngSeed: parsed.rngSeed,
    savedAt: parsed.savedAt,
  };
};
