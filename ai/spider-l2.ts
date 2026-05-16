/**
 * L2-3 — spider AI for Level 2 ("The Pipe").
 *
 * The L1 spider policy (`ai/spider-l1.ts`) is web-defense shaped:
 * web-guard, deep-raider, silk-line storm-drain raid, mid-POST detour
 * chains. None of that applies to the pipe — there is no spider-web,
 * no storm-drain, and the win condition is an escort, not a capture.
 *
 * This policy is a deliberately simple, readable pipe-AMBUSH (L2 is a
 * tutorial-tier enemy per roadmap §4.3.1):
 *
 *   1. Identify the escort party: the ant party that contains a living
 *      `aunt-ant` unit (the escortee).
 *   2. Opportunistic hypnotize: if a spider party that knows
 *      `hypnotize` is co-located with an eligible neutral party and
 *      its caster is healthy, cast it (a hypnotized escort is
 *      catastrophic; the engine only lets hypnotize seize neutrals, so
 *      this denies the ants any neutral help and turns it on them).
 *   3. Otherwise hold the pinch-point until the escort comes within
 *      `INTERCEPT_RADIUS`, then move to intercept the escort party's
 *      tile (greedy step — the pipe is laid out so a single move-to is
 *      enough; movement resolves the path).
 *
 * No storm-drain raid, no web-mend, no POST-detour chains: the spider's
 * whole job here is to body-block / overwhelm the escort in the tube.
 *
 * Determinism: pure (state, scenario) -> state; the only mutation is
 * this faction's parties' `orders`. No RNG is consulted.
 *
 * Imports allowed: engine/types, engine/coord, ai/policy-helpers,
 * ai/threat-flee, ai/types (mirrors spider-l1's import surface).
 */

import { distance, sameCoord } from '../engine/coord.ts';
import type {
  AbilityId,
  GameState,
  Order,
  Party,
  PartyId,
  UnitTemplateId,
} from '../engine/types.ts';

import { moveToOrHold, partyAlive } from './policy-helpers.ts';
import { appendPolicyEvents } from './threat-flee.ts';
import type { AIPolicy } from './types.ts';

const AUNT_ANT: UnitTemplateId = 'aunt-ant' as UnitTemplateId;
const HYPNOTIZE: AbilityId = 'hypnotize' as AbilityId;

/** Chebyshev range at which a holding spider party breaks its pinch
 * hold and surges to intercept the escort. Tutorial-tier: a short
 * leash so the pipe still reads as a sequence of ambushes rather than
 * one swarm. */
const INTERCEPT_RADIUS = 4;

/** Hypnotize halves the caster's HP; require the leader above this so
 * a low party doesn't suicide-cast. Mirrors the L1 gate value. */
const HYPNOTIZE_MIN_HP = 5;

/** The escort party = the (alive) ant party carrying a living
 * `aunt-ant`. Returns null if the escortee is gone (the engine then
 * resolves the scenario as an ant loss anyway). */
const findEscortParty = (state: GameState): Party | null => {
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    if (party.units.some((u) => u.templateId === AUNT_ANT && u.currentHp > 0)) {
      return party;
    }
  }
  return null;
};

/** True iff the party's leader knows `hypnotize` and is healthy enough
 * to pay the half-HP cost. */
const canHypnotize = (state: GameState, party: Party): boolean => {
  const leader = party.units.find((u) => u.id === party.leaderId);
  if (!leader || leader.currentHp <= HYPNOTIZE_MIN_HP) return false;
  const tmpl = state.unitTemplates.get(leader.templateId);
  return tmpl?.abilities.includes(HYPNOTIZE) ?? false;
};

/** Lowest-id co-located neutral party that is not already hypnotized
 * by the spider and not in the post-hypnosis immunity window. The pipe
 * spider never walks for a hypnosis — pure opportunity grabbing. */
const coLocatedHypnoTarget = (state: GameState, spider: Party): Party | null => {
  let best: Party | null = null;
  for (const candidate of state.parties.values()) {
    if (candidate.faction !== 'neutral') continue;
    if (!sameCoord(candidate.location, spider.location)) continue;
    if (!partyAlive(candidate)) continue;
    const status = state.neutralStatus.get(candidate.id);
    if (!status) continue;
    if (status.hypnotizedBy === 'spider') continue;
    if (status.spiderImmunityRemaining > 0) continue;
    if (best === null || candidate.id < best.id) best = candidate;
  }
  return best;
};

/**
 * Per-party orders. The pinch-command (queen-bearing) party defends
 * its tile and never chases (it is the pipe's last-ditch block at the
 * mid-span). Field pinch parties hold until the escort enters their
 * leash, then move to the escort's tile to body-block it.
 */
const ordersForPinchParty = (
  state: GameState,
  party: Party,
  escort: Party | null,
  isCommand: boolean,
): readonly Order[] => {
  // Opportunistic hypnotize comes first (resolveAbilityOrders runs
  // before movement, so the cast lands this turn).
  if (canHypnotize(state, party)) {
    const target = coLocatedHypnoTarget(state, party);
    if (target) {
      return [{ kind: 'use-ability', abilityId: HYPNOTIZE, target: target.id }];
    }
  }

  // The command party is the immovable mid-pipe block.
  if (isCommand) return [];

  if (escort === null || !partyAlive(escort)) return [];

  // Hold the pinch-point until the escort is within the leash.
  const d = distance(party.location, escort.location);
  if (d === Number.POSITIVE_INFINITY || d > INTERCEPT_RADIUS) {
    // Escort not yet here (or on another plane). If the escort is on
    // the floor and this party drifted off the choke, drift back
    // toward the exit (the choke the escort must pass last); else
    // hold.
    return [];
  }
  // Surge to the escort's tile to body-block / force a battle.
  return moveToOrHold(party, escort.location);
};

/** Party ids whose roster posture is `defend` are the command block.
 * The L2 spider roster names exactly one: `pinch-command`. */
const COMMAND_PARTY: PartyId = 'pinch-command' as PartyId;

export const spiderL2: AIPolicy = {
  name: 'spider-l2',
  faction: 'spider',
  decide(state: GameState): GameState {
    const escort = findEscortParty(state);
    const nextParties = new Map(state.parties);
    for (const [id, party] of state.parties) {
      if (party.faction !== 'spider') continue;
      if (!partyAlive(party)) continue;
      const orders = ordersForPinchParty(state, party, escort, id === COMMAND_PARTY);
      nextParties.set(id, { ...party, orders });
    }
    const next: GameState = { ...state, parties: nextParties };
    return appendPolicyEvents(next, []);
  },
};
