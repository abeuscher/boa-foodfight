/**
 * Phase D-0 — spider policy for the stripped tutorial Level 1
 * (`data/level-1-tutorial`, roadmap §3.2).
 *
 * Companion to `ai/baseline-tutorial.ts`. The stripped kit gives the
 * spider exactly two unit types (queen + soldier) and ZERO spider
 * abilities (web-tangle / web-mend / web-snare / spawn-spiderlings /
 * venom-blast / hypnotize are all stripped out of
 * `data/level-1-tutorial/abilities.json`). So this AI cannot — and must
 * not try to — do anything the full `ai/spider-l1.ts` does. It is
 * additive; `ai/spider-l1.ts` is untouched and still drives gate-29.
 *
 * Heal-priority is OFF here, deliberately. The mechanic-distribution
 * plan §3 ruling F ("heal-priority web-defense ON at L1, mild tuning a
 * named L1 exit gate") applies to the FULLY-LOADED L1 (gate-29, the
 * canonical all-mechanics reference) — that scenario's spider has
 * `web-mend`. The stripped tutorial has no heal ability at all, so
 * there is nothing to prioritise; ruling F is not in scope for the
 * stripped kit. (Confirmed against `docs/mechanic-distribution-plan.md`
 * §3 ruling F and §4: the L1=58% reconciliation note explicitly says
 * the stripped kit removes the spider's advanced toolkit.)
 *
 * Behavior — the spec tutorial-transparent web defense:
 *
 *   1. web-guard (queen-bearing): the immovable last line. It never
 *      leaves the web tile. Losing it is losing the scenario for the
 *      spider, and a learner must see a defender that *holds ground*.
 *   2. web-watch / web-picket (soldier parties): hold near the web
 *      until an ant party closes within a short leash, then surge to
 *      that ant's tile to body-block the assault on the web. Outside
 *      the leash they drift back to their web-anchor tile so the web
 *      always reads as a defended strongpoint, not an empty objective.
 *
 * No storm-drain raid, no ambush re-engage, no neutral hypnosis: those
 * are L2+ behaviors (ruling A: retreat threat-assessment / ambush is
 * L2; the spider's offensive toolkit is gated ≥L2 throughout the plan).
 *
 * Determinism: pure (state) → state; the only mutation is this
 * faction's parties' `orders`. No RNG consulted; fully replayable.
 *
 * Imports: engine/types, engine/coord, ai/policy-helpers,
 * ai/threat-flee, ai/types (the spider-l2 import surface).
 */

import { distance } from '../engine/coord.ts';
import type { GameState, Order, Party, PartyId } from '../engine/types.ts';

import { moveToOrHold, partyAlive, SPIDER_WEB } from './policy-helpers.ts';
import { appendPolicyEvents } from './threat-flee.ts';
import type { AIPolicy } from './types.ts';

/** The queen-bearing party that anchors the web. Never moves. */
const WEB_GUARD: PartyId = 'web-guard' as PartyId;

/**
 * Chebyshev range at which a holding soldier party breaks its anchor
 * hold and surges to intercept an approaching ant. A short leash keeps
 * the web reading as a sequence of "the spiders come to meet you"
 * beats rather than one undifferentiated swarm (tutorial transparency).
 */
const INTERCEPT_RADIUS = 4;

/** The closest living ant field party to `from` (Manhattan within a
 * plane, infinite across planes), or null. Soldiers use this to decide
 * whether an attacker is inside the leash. */
const closestAnt = (state: GameState, from: Party): Party | null => {
  let best: { party: Party; d: number } | null = null;
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    if (!partyAlive(party)) continue;
    const d = distance(from.location, party.location);
    if (best === null || d < best.d || (d === best.d && party.id < best.party.id)) {
      best = { party, d };
    }
  }
  return best?.party ?? null;
};

/**
 * Orders for a soldier picket. Hold the web-anchor tile until an ant
 * enters the leash, then move onto that ant's tile to body-block the
 * assault. The web-guard (queen) is the immovable block and is handled
 * by the caller (it never reaches here).
 */
const ordersForPicket = (state: GameState, party: Party): readonly Order[] => {
  const ant = closestAnt(state, party);
  if (ant === null) return [];
  const d = distance(party.location, ant.location);
  if (d === Number.POSITIVE_INFINITY || d > INTERCEPT_RADIUS) {
    // Attacker not yet in reach (or on another plane the engine will
    // route it onto). Hold the anchor — drop any stale chase order.
    return [];
  }
  // Surge to the ant's tile to force the defensive battle at the web.
  return moveToOrHold(party, ant.location);
};

export const spiderTutorial: AIPolicy = {
  name: 'spider-tutorial',
  faction: 'spider',
  decide(state: GameState): GameState {
    // Touch the web post id so a future map rename surfaces here rather
    // than silently desyncing the defense from the objective.
    void SPIDER_WEB;
    const nextParties = new Map(state.parties);
    for (const [id, party] of state.parties) {
      if (party.faction !== 'spider') continue;
      if (!partyAlive(party)) continue;
      // web-guard: the immovable queen block. Never chases; defending
      // its tile is the whole point of the scenario for the spider.
      const orders = id === WEB_GUARD ? [] : ordersForPicket(state, party);
      if (orders === party.orders) continue;
      nextParties.set(id, { ...party, orders });
    }
    const next: GameState = { ...state, parties: nextParties };
    return appendPolicyEvents(next, []);
  },
};
