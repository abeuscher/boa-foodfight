/**
 * Phase B (B2) — scenario → world extraction.
 *
 * After a scenario's `runScenario` completes, distill the post-scenario
 * `GameState` into the campaign-durable `WorldState`. This is a pure
 * read of the final state — the scenario engine is not modified.
 *
 * ## What carries forward (per the Phase B spec + game-outline)
 *
 * - **Surviving ant units only.** Any ant unit with `currentHp <= 0` at
 *   scenario end is a casualty and is dropped (decision (d) in
 *   `engine/world-state.ts`). Spider / neutral units never enter the
 *   player roster in this milestone (the L1→L2 "spider swears fealty"
 *   narrative is a Phase-D follow-up).
 * - **XP gains applied.** Concrete formula (kept simple + documented):
 *     - `+10 XP` per scenario the unit participated in and survived
 *       (battle-participation proxy: alive at end ⇒ it was deployed),
 *     - `+25 XP` alive-at-scenario-end bonus,
 *     - `+50 XP` if the unit's faction won the scenario.
 *   So a surviving ant on the winning side earns `10 + 25 + 50 = 85`
 *   XP; a surviving ant on a loss earns `35`. The base unit `xp` from
 *   the final state is preserved and the scenario award is added on
 *   top. (game-outline "Experience and leveling": battle participation
 *   + alive-at-end collective bonus.)
 * - **Gold.** `state.playerGold.ant` carried forward verbatim.
 * - **Charisma + promoted.** Round-26 fields carried forward. A unit
 *   that promoted mid-scenario keeps its evolved `templateId` and
 *   `promoted: true`.
 * - **Equipped item.** Round-14 `Party.item` is a *party*-level slot;
 *   it is carried onto the party's leader's `WorldUnit` so the item
 *   isn't lost between scenarios (re-equip UI is a Phase-B follow-up).
 * - **Heal-between.** Every surviving unit's `currentHp` is set to its
 *   template-max at extraction (decision (a)): units rest at the home
 *   base between scenarios.
 *
 * Determinism: pure transformation, no RNG, no I/O.
 *
 * Imports allowed: `engine/types`, `engine/world-state`, `engine/parties`.
 */

import { isAlive } from './parties.ts';
import type { Faction, GameState, ItemId, UnitId } from './types.ts';
import { pruneDeadWorldUnits } from './world-state.ts';
import type { WorldPartyAssignment, WorldRoster, WorldUnit } from './world-state.ts';

/** XP for a scenario the unit was deployed in and survived. */
export const XP_PARTICIPATION = 10;
/** XP bonus for being alive when the scenario ends. */
export const XP_ALIVE_AT_END = 25;
/** XP bonus when the unit's faction won the scenario. */
export const XP_WINNING_SIDE = 50;

/**
 * Total scenario XP award for a surviving unit. Always at least
 * participation + alive-at-end (the unit must be alive to be extracted);
 * the winning-side bonus is conditional on `won`.
 */
export const scenarioXpAward = (won: boolean): number =>
  XP_PARTICIPATION + XP_ALIVE_AT_END + (won ? XP_WINNING_SIDE : 0);

export interface ExtractInput {
  readonly finalState: GameState;
  /** The scenario's winner (`finalState.winner`); `null` only on the
   * degenerate no-policy timeout path. */
  readonly winner: Faction | null;
  /**
   * Roadmap §7.8 — carry-forward barracks. Units that were in the
   * prior roster but **undeployed** (in no party → never injected →
   * absent from `finalState`) would otherwise be silently dropped.
   * The world-loop runner passes the prior roster's `barracksUnits`
   * here; they are appended to the next roster's pool **unchanged**
   * (no XP / no heal — they didn't fight) and in **no party
   * assignment** (still barracks next scenario). Absent on the static
   * path and pre-§7.8 callers ⇒ behaviour identical to before.
   */
  readonly carryForward?: readonly WorldUnit[];
}

/**
 * Build the post-scenario `WorldRoster` from a finished `GameState`.
 *
 * Walks every ant party, keeps living units, applies the scenario XP
 * award, heals each survivor to template-max, carries charisma /
 * promoted / equipped item forward, and records the party assignment
 * (so the next scenario can re-form the same party shapes). Dead units
 * are pruned (belt-and-braces via `pruneDeadWorldUnits`, though the
 * walk already excludes them). §7.8: `input.carryForward` barracks
 * units (undeployed → not in `finalState`) are appended verbatim.
 */
export const extractWorldRoster = (input: ExtractInput): WorldRoster => {
  const { finalState, winner } = input;
  const won = winner === 'ant';
  const award = scenarioXpAward(won);
  const units: WorldUnit[] = [];
  const partyAssignments: WorldPartyAssignment[] = [];

  // Deterministic order: party ids sorted, then roster order within a
  // party. Matches the snapshot convention used elsewhere in the engine.
  for (const partyId of [...finalState.parties.keys()].sort()) {
    const party = finalState.parties.get(partyId);
    if (!party) continue;
    if (party.faction !== 'ant') continue;
    const partyItem: ItemId | null = party.item ?? null;
    const survivorIds: UnitId[] = [];
    const survivors = party.units.filter(isAlive);
    survivors.forEach((u, idx) => {
      const tmpl = finalState.unitTemplates.get(u.templateId);
      const maxHp = tmpl ? tmpl.baseStats.hp : u.currentHp;
      // The party's equipped item rides on the party leader's world
      // unit; if the leader died, the first surviving member carries it
      // so the item isn't dropped from the campaign.
      const carriesItem = idx === 0 ? partyItem : null;
      units.push({
        id: u.id,
        templateId: u.templateId,
        currentHp: maxHp,
        level: u.level,
        xp: u.xp + award,
        charisma: u.charisma ?? 0,
        promoted: u.promoted === true,
        item: carriesItem,
      });
      survivorIds.push(u.id);
    });
    if (survivorIds.length === 0) continue;
    const leaderAlive = survivors.some((u) => u.id === party.leaderId);
    const leaderId = leaderAlive ? party.leaderId : survivors[0]?.id;
    if (leaderId === undefined) continue;
    partyAssignments.push({ partyId: party.id, unitIds: survivorIds, leaderId });
  }

  // §7.8 — append carry-forward barracks units verbatim (id-deduped
  // against survivors; in no assignment ⇒ they stay barracks next
  // scenario). Deterministic: prior-roster order, after survivors.
  const survivorIdsAll = new Set(units.map((u) => u.id));
  for (const u of input.carryForward ?? []) {
    if (survivorIdsAll.has(u.id)) continue;
    units.push(u);
    survivorIdsAll.add(u.id);
  }

  const roster: WorldRoster = { faction: 'ant', units, partyAssignments };
  // The walk already excludes casualties; prune defensively so any
  // future change to the walk can't leak a dead unit into a save.
  return pruneDeadWorldUnits(roster);
};

/** Carry the ant faction's gold forward verbatim (round-12). */
export const extractGold = (finalState: GameState): number => finalState.playerGold.ant;
