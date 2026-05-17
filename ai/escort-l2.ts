/**
 * L2 — escort player AI for Level 2 ("The Pipe").
 *
 * L1's `baseline` is capture-the-web shaped (staging axis, kill-dive,
 * jelly supply line). None of that wins L2: there is no spider-web and
 * no POST chain — the win condition is to walk a living `aunt-ant` from
 * the pipe entrance to the exit POST through a 3-wide anti-diagonal
 * channel that the L2 spider ambushes at the pinch points.
 *
 * This policy is deliberately simple and tutorial-tier (roadmap §4.3.1):
 *
 *   1. Escort party — the ant party that carries a living `aunt-ant`.
 *      Walk it toward the exit tile (`moveToOrHold`; the engine's
 *      greedy Manhattan descent traverses the verified-navigable pipe).
 *      If a living spider party sits on the escort's immediate forward
 *      tile, HOLD one turn so Aunt Ant doesn't walk into a fight; the
 *      guards clear it. Posture `defend`.
 *   2. Guard parties — ant field parties that are NOT the escort and
 *      NOT the queen-guard. Screen the escort: move onto the nearest
 *      threatening spider party to body-block / initiate the fight on
 *      the guards' terms. Posture `fight`.
 *   3. Queen-guard — stays at the pipe entrance (queen immobile, the
 *      framework enforces this). If a worker carries `jelly-apply`, fire
 *      it on the escort party every turn so the dose stack travels with
 *      Aunt Ant. Posture `defend`.
 *   4. Shared campaign hooks — reuse the same `tryOpportunisticRecruit`,
 *      low-HP flee, threat-flee and commander-card plumbing baseline
 *      wires, so L2 inherits the campaign mechanics. BUT the escort
 *      party is gated OUT of both flee triggers: fleeing Aunt Ant off
 *      the route loses the scenario tempo. Guards still flee per the
 *      existing threat model.
 *
 * Determinism: every dice roll forks the seeded policy rng exactly like
 * `baseline.ts`, so replays reproduce.
 *
 * Identify by data, not hardcoded ids: the escort party is found by the
 * `aunt-ant` unit, the exit tile by `victoryCondition.exitPostId`, and
 * the guards as "ant, not escort, not queen-guard".
 */

import { partyHasAbility } from '../engine/abilities.ts';
import { distance, inPlaneNeighbors, sameCoord } from '../engine/coord.ts';
import { livingHpFraction } from '../engine/parties.ts';
import type { GameState, Party, Rng, TileCoord } from '../engine/types.ts';
import type { Order, PartyId, ReplayEvent, UnitTemplateId } from '../engine/types.ts';
import type { AbilityId, AbilityOrder, FleeOrder } from '../engine/types.ts';

import { factionCardOrders } from './card-helpers.ts';
import { tryOpportunisticRecruit } from './neutral-recruit-helper.ts';
import {
  buildAntPolicyWithRng,
  moveToOrHold,
  type PartyDecision,
  partyAlive,
  postLocation,
  QUEEN_PARTY,
} from './policy-helpers.ts';
import { appendPolicyEvents, computeThreatFlee, lowHpFleeEvent } from './threat-flee.ts';
import type { AIPolicy } from './types.ts';

const AUNT_ANT: UnitTemplateId = 'aunt-ant' as UnitTemplateId;
const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;

/** Round 15 parity — HP-fraction threshold below which a guard prepends
 * a flee order. Same 30% the baseline uses; the escort party is exempt
 * (see `ESCORT_FLEE_EXEMPT`). */
const FLEE_HP_THRESHOLD = 0.3;
const FLEE_ORDER: FleeOrder = { kind: 'flee' };

/** True iff `party` is an ant party that still carries a living
 * `aunt-ant` (the escortee). */
const carriesLivingAuntAnt = (party: Party): boolean =>
  party.faction === 'ant' && party.units.some((u) => u.templateId === AUNT_ANT && u.currentHp > 0);

/**
 * The escort party = the (alive) ant party carrying a living `aunt-ant`
 * unit. Returns undefined if the escortee is gone (the engine then
 * resolves the scenario as a spider win regardless of our orders).
 */
const findEscortParty = (state: GameState): Party | undefined =>
  [...state.parties.values()].find(carriesLivingAuntAnt);

/** Exit tile = the location of the scenario's `exitPostId`. Undefined
 * if the scenario has no escort victory condition (defensive — the
 * world-loop only wires this policy for L2). */
const exitTile = (state: GameState): TileCoord | undefined => {
  const vc = state.victoryCondition;
  if (vc?.kind !== 'escort') return undefined;
  return postLocation(state, vc.exitPostId);
};

/** True iff `party` has at least one living unit and is a living spider
 * party. Shared spider-liveness predicate so the block/interpose passes
 * read the same way. */
const isLivingSpider = (party: Party): boolean => party.faction === 'spider' && partyAlive(party);

/** Closest living spider party to `from` (Chebyshev within-plane;
 * cross-plane is infinity). Ties break on the lower party id so the
 * pick is deterministic. Undefined if no spider party is alive. */
const closestSpiderParty = (state: GameState, from: TileCoord): Party | undefined => {
  let best: { party: Party; d: number } | undefined;
  for (const party of state.parties.values()) {
    if (!isLivingSpider(party)) continue;
    const d = distance(from, party.location);
    if (!best || d < best.d || (d === best.d && party.id < best.party.id)) {
      best = { party, d };
    }
  }
  return best?.party;
};

/** Manhattan distance within a plane; infinity across planes. The pipe
 * is single-plane so this is the escort's true path metric. */
const manhattan = (a: TileCoord, b: TileCoord): number =>
  a.plane === b.plane ? Math.abs(a.x - b.x) + Math.abs(a.y - b.y) : Number.POSITIVE_INFINITY;

/**
 * The living spider party (if any) sitting on a tile that is an
 * in-plane neighbour of the escort AND strictly closer (Manhattan) to
 * the exit than the escort — i.e., exactly the tile the engine's greedy
 * descent would step Aunt Ant onto next turn. Returns undefined if the
 * forward tile is clear.
 */
const forwardBlocker = (state: GameState, escort: Party, exit: TileCoord): Party | undefined => {
  if (escort.location.plane !== exit.plane) return undefined;
  const escortToExit = manhattan(escort.location, exit);
  for (const party of state.parties.values()) {
    if (!isLivingSpider(party)) continue;
    const loc = party.location;
    if (loc.plane !== escort.location.plane) continue;
    if (!inPlaneNeighbors(escort.location).some((n) => sameCoord(n, loc))) continue;
    if (manhattan(loc, exit) < escortToExit) return party;
  }
  return undefined;
};

/** True iff some living guard party (ant, not the escort) is already
 * co-located with or adjacent to `spider` this turn — i.e., a guard is
 * actively clearing that blocker, so the escort can safely hold one
 * turn rather than walk Aunt Ant into the fight. */
const guardIsClearing = (state: GameState, escortId: PartyId, spider: Party): boolean => {
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    if (party.id === escortId || party.id === QUEEN_PARTY) continue;
    if (!partyAlive(party)) continue;
    if (party.location.plane !== spider.location.plane) continue;
    if (distance(party.location, spider.location) <= 1) return true;
  }
  return false;
};

/**
 * Escort decision. Walk Aunt Ant toward the exit. If a spider blocks
 * the forward tile, hold ONE turn ONLY when a guard is already on/next
 * to that spider (about to clear it) — otherwise push through with the
 * column's own footmen/archers rather than stall into a timeout loss
 * (an indefinite hold is a guaranteed escort defeat). Posture `defend`:
 * Aunt Ant's column never initiates, but it will fight through when it
 * must. */
const escortDecision = (state: GameState, escort: Party, exit: TileCoord): PartyDecision => {
  const blocker = forwardBlocker(state, escort, exit);
  if (blocker && guardIsClearing(state, escort.id, blocker)) {
    return { orders: [], posture: 'defend' };
  }
  return { orders: moveToOrHold(escort, exit), posture: 'defend' };
};

/**
 * Guard decision: screen the escortee. Body-block the living spider
 * party CLOSEST TO THE ESCORT (the actual threat to Aunt Ant — not the
 * one nearest this guard), so the guards converge on the pinch-point
 * ambushers blocking the column's path and resolve the fight on their
 * terms. When no spider is alive (or no escortee), rally on the escort
 * / push to the exit so the screen stays tight. Posture `fight`.
 */
const guardDecision = (
  state: GameState,
  guard: Party,
  escort: Party | undefined,
  exit: TileCoord,
): PartyDecision => {
  const focus = escort ? escort.location : guard.location;
  const spider = closestSpiderParty(state, focus);
  if (spider) {
    return { orders: moveToOrHold(guard, spider.location), posture: 'fight' };
  }
  // No spiders left — escort the column home (or push to the exit if
  // the escortee is already gone; the engine resolves the loss).
  const rallyTile = escort ? escort.location : exit;
  return { orders: moveToOrHold(guard, rallyTile), posture: 'fight' };
};

/** Constructs a `jelly-apply` ability order targeting `target`. */
const jellyApplyOrder = (target: PartyId): AbilityOrder => ({
  kind: 'use-ability',
  abilityId: JELLY_APPLY,
  target,
});

/**
 * Queen-guard hook. The queen is immobile (the framework keeps the
 * guard at the pipe entrance and forces posture `defend`); the worker
 * supplies the campaign-level commander-card buy/play orders and, when
 * it carries `jelly-apply`, doses the escort party every turn so the
 * multiplier stack travels with Aunt Ant. Mirrors baseline's queen-
 * guard order shape (cards resolve in a separate pass, so mixing the
 * jelly order in one queue is safe).
 */
const queenGuardOrders = (state: GameState, queenGuard: Party): readonly Order[] => {
  const orders: Order[] = [...factionCardOrders(state, 'ant')];
  const escort = findEscortParty(state);
  if (
    escort &&
    !escort.leaderless &&
    partyAlive(escort) &&
    partyHasAbility(queenGuard, JELLY_APPLY, state.unitTemplates)
  ) {
    orders.push(jellyApplyOrder(escort.id));
  }
  return orders;
};

/**
 * True iff the (non-escort, non-queen) party's living-HP fraction is
 * below the flee threshold. Empty parties return false. The escort
 * party never reaches this helper — it is gated out upstream.
 */
const partyShouldFlee = (state: GameState, party: Party): boolean => {
  const frac = livingHpFraction(party, state.unitTemplates);
  return frac > 0 && frac < FLEE_HP_THRESHOLD;
};

/**
 * Round 15 parity — wrap a guard `PartyDecision` with a leading flee
 * order when its living-HP fraction is below 30%. Returns the matching
 * telemetry event so the caller can fold it into the policy sidecar.
 */
const withFleeIfLowHp = (
  state: GameState,
  party: Party,
  decision: PartyDecision,
): { decision: PartyDecision; event?: ReplayEvent } => {
  if (!partyShouldFlee(state, party)) return { decision };
  return {
    decision: { ...decision, orders: [FLEE_ORDER, ...decision.orders] },
    event: lowHpFleeEvent(state, party),
  };
};

/**
 * Closure-scoped flee-event buffer (same pattern as baseline). The
 * per-party closure pushes flee-queued events here; the outer wrapper
 * folds the buffer onto `state.pendingPolicyEvents`. Reassigned to a
 * fresh array at the top of every `decide` so a pass starts clean.
 */
let escortPendingEvents: ReplayEvent[] = [];

const escortInner: AIPolicy = buildAntPolicyWithRng(
  'escort-l2',
  (state: GameState, rng: Rng) => {
    const escort = findEscortParty(state);
    const exit = exitTile(state);
    // Threat-flee dice fork — isolated from any other entropy so the
    // guard flee rolls are deterministic and replayable.
    const threatRng = rng.fork('threat-flee');
    // Escort party id is exempt from BOTH flee triggers (fleeing Aunt
    // Ant off-route loses the scenario tempo) and from the queen-guard
    // (the framework filters the queen-guard before this closure runs).
    const fleeExempt: ReadonlySet<PartyId> = new Set<PartyId>(
      escort ? [QUEEN_PARTY, escort.id] : [QUEEN_PARTY],
    );

    /** True iff `party` is the escort column (the aunt-ant carrier).
     * `escort?.id` is undefined when the escortee is gone, so this is
     * false for every party then — the engine resolves the loss. */
    const isEscortParty = (party: Party): boolean => party.id === escort?.id;

    const baseDecision = (party: Party): PartyDecision | null => {
      // The escort party is owned by the OUTER wrapper, not the
      // framework: the escortee must keep walking to the exit even
      // after its sergeant dies (the framework skips leaderless
      // parties, which would strand a leaderless escort and time the
      // scenario out). Returning null leaves it untouched here.
      if (isEscortParty(party)) return null;

      // Shared campaign hook: opportunistic recruit fires when a party
      // is co-located with a recruitable neutral (same surface baseline
      // exposes so L2 inherits the mechanic).
      const recruit = tryOpportunisticRecruit(state, party);
      if (recruit) return recruit;

      if (exit === undefined) return null;

      // Everything else here is a guard (the framework already filtered
      // the queen-guard and leaderless parties): screen the escort.
      return guardDecision(state, party, escort, exit);
    };

    return (party: Party) => {
      const decision = baseDecision(party);
      if (decision === null) return null;
      // The escort party is exempt from the low-HP flee trigger.
      const lowHpResult = isEscortParty(party)
        ? { decision }
        : withFleeIfLowHp(state, party, decision);
      if (lowHpResult.event) escortPendingEvents.push(lowHpResult.event);
      // Pre-battle threat assessment for the guards (escort + queen are
      // in `fleeExempt`, so the helper bails for them).
      const threat = computeThreatFlee(state, party, lowHpResult.decision.orders, threatRng, {
        exempt: fleeExempt,
      });
      if (threat.event) escortPendingEvents.push(threat.event);
      return { ...lowHpResult.decision, orders: threat.orders };
    };
  },
  queenGuardOrders,
);

/**
 * Apply the escort party's decision authoritatively, bypassing the
 * framework's leaderless gate. The escort objective only needs a living
 * `aunt-ant` — not the column's sergeant — so the escortee must keep
 * advancing toward the exit even after its leader dies (otherwise the
 * framework strands the leaderless column and the scenario times out).
 * Returns the state unchanged when the escortee is gone (the engine
 * resolves the loss) or the scenario isn't an escort.
 */
const applyEscortDecision = (state: GameState): GameState => {
  const escort = findEscortParty(state);
  const exit = exitTile(state);
  if (!escort || exit === undefined) return state;
  const { orders, posture } = escortDecision(state, escort, exit);
  if (orders === escort.orders && posture === escort.posture) return state;
  const parties = new Map(state.parties);
  parties.set(escort.id, { ...escort, orders, posture });
  return { ...state, parties };
};

/**
 * Outer wrapper. Runs the framework (guards + queen-guard), then
 * re-applies the escort decision so a leaderless escort still walks to
 * the exit, and finally flushes the per-turn flee-event buffer onto
 * `state.pendingPolicyEvents` (same shape as baseline's `baselineCore`).
 */
export const escortL2Player: AIPolicy = {
  name: escortInner.name,
  faction: escortInner.faction,
  decide(state, scenario, rng) {
    escortPendingEvents = [];
    const framework = escortInner.decide(state, scenario, rng);
    const withEscort = applyEscortDecision(framework);
    return appendPolicyEvents(withEscort, escortPendingEvents);
  },
};
