/**
 * Spider Level 1 enemy AI policy.
 *
 * The Level-1 spider AI is deliberately transparent (Sergeant Antonio briefs
 * the player at scenario start): spiders hunker at the web, send a single
 * scout toward the soap dish, and respond to threats on the towel-rack /
 * wall-crack plane transition. This module implements that behavior as a
 * pure (state, scenario, rng) -> state function.
 *
 * The AI is a read-only consumer of engine state. It mutates only the
 * `orders` of spider parties; ant parties are returned unchanged.
 *
 * Round 4 conservative tuning (post-rejection lessons from round 2):
 *  - Avoid any ceiling intercept logic: round-2 web-watch (1,1) and
 *    silk-line midpoint intercepts hard-countered rush. All new
 *    behavior is restricted to the floor / wall plane.
 *  - advance-scout harasses the floor wall-crack ladder (towel-rack)
 *    once ants own soap-dish, denying the canonical capture chain
 *    (soap-dish -> towel-rack -> wall-crack) one beat earlier.
 *  - Wall-crack threat radius widens by 1 when ants own towel-rack,
 *    pulling a non-scout responder onto the ladder before the climb
 *    completes. This is the same conditional-gate idea but on the
 *    *floor/wall* side, not the ceiling.
 */

import { distance, sameCoord } from '../engine/coord.ts';
import type { ScenarioData } from '../engine/state.ts';
import type {
  AbilityId,
  GameState,
  Order,
  Party,
  PartyId,
  Post,
  PostId,
  Rng,
  TileCoord,
  UnitTemplate,
  UnitTemplateId,
} from '../engine/types.ts';

import {
  postsOfType,
  SOAP_DISH_TYPE,
  SPIDER_WEB,
  TOWEL_RACK_TYPE,
  WALL_CRACK_TYPE,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const THREAT_RADIUS = 2;
/**
 * When ants control this many POSTs or more, the spiders are clearly
 * losing the floor war. The largest non-scout spider party then breaks
 * formation and counter-pushes toward the ant home base — both to
 * disrupt the ants' supply line and to pull one party into range of
 * the queen ultimate. This is the spec's spider AI's fourth response,
 * added in Phase 4c after the 0%-win-rate diagnosis showed the
 * default patrol-to-web behavior was too passive once ants dominated
 * the floor.
 */
const ANT_DOMINANCE_THRESHOLD = 3;

const totalSlotCost = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): number => {
  let total = 0;
  for (const unit of party.units) {
    const tmpl = templates.get(unit.templateId);
    if (tmpl) total += tmpl.slotCost;
  }
  return total;
};

const requirePost = (state: GameState, id: PostId): TileCoord => {
  const post = state.posts.get(id);
  if (!post) throw new Error(`spiderL1: missing post '${String(id)}'`);
  return post.location;
};

const firstPostOfType = (state: GameState, type: string): Post | undefined =>
  postsOfType(state, type)[0];

const requireFirstPostOfType = (state: GameState, type: string): TileCoord => {
  const post = firstPostOfType(state, type);
  if (!post) throw new Error(`spiderL1: no POST of type '${type}' (map-gen failed to place one)`);
  return post.location;
};

/** True iff every POST of `type` is ant-owned. (Empty pool returns false.) */
const allPostsOfTypeOwnedByAnt = (state: GameState, type: string): boolean => {
  const all = postsOfType(state, type);
  if (all.length === 0) return false;
  return all.every((p) => p.owner === 'ant');
};

const moveTo = (target: TileCoord): Order => ({ kind: 'move-to', target });

/**
 * Closest Chebyshev distance from any threat-eligible ant to the given coord.
 * Cross-plane distances are Infinity (engine/coord.ts), which is what we
 * want: a wall-plane ant cannot directly threaten a floor POST.
 */
const closestAntDistance = (state: GameState, target: TileCoord): number => {
  let best = Number.POSITIVE_INFINITY;
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    if (party.units.length === 0) continue;
    const d = distance(party.location, target);
    if (d < best) best = d;
  }
  return best;
};

interface ThreatDecision {
  readonly defend: TileCoord | null;
}

/** Closest ant distance among all POSTs of a given type. Returns the
 * matching POST and the distance, or {null, Infinity} when no
 * unowned threat-eligible POST exists. */
const closestThreatenedOfType = (
  state: GameState,
  type: string,
): { post: Post | null; distance: number } => {
  let best: Post | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const post of postsOfType(state, type)) {
    if (post.owner === 'ant') continue; // already lost; skip
    const d = closestAntDistance(state, post.location);
    if (d < bestD) {
      bestD = d;
      best = post;
    }
  }
  return { post: best, distance: bestD };
};

const decideThreat = (state: GameState): ThreatDecision => {
  const towel = closestThreatenedOfType(state, TOWEL_RACK_TYPE);
  const crack = closestThreatenedOfType(state, WALL_CRACK_TYPE);
  // Conditional gate: if every towel-rack is ant-owned, the wall-crack
  // ladder is the next imminent capture. Widen the wall-crack radius
  // by 1 so a non-scout responder is dispatched one turn earlier.
  const crackRadius = allPostsOfTypeOwnedByAnt(state, TOWEL_RACK_TYPE)
    ? THREAT_RADIUS + 1
    : THREAT_RADIUS;
  const towelThreat = towel.post !== null && towel.distance <= THREAT_RADIUS;
  const crackThreat = crack.post !== null && crack.distance <= crackRadius;
  if (!towelThreat && !crackThreat) return { defend: null };
  if (towelThreat && !crackThreat) return { defend: towel.post?.location ?? null };
  if (crackThreat && !towelThreat) return { defend: crack.post?.location ?? null };
  // Both threatened: defend whichever has the closer ant; tiebreak to wall-crack.
  if (towel.distance < crack.distance) return { defend: towel.post?.location ?? null };
  return { defend: crack.post?.location ?? null };
};

const isOnWeb = (party: Party, webLoc: TileCoord): boolean => sameCoord(party.location, webLoc);

/**
 * Smallest spider party by total slot cost, deterministic tiebreak by
 * lexical PartyId. Excludes leaderless/empty parties and the queen-bearing
 * web-guard party (which is pinned to the web by rule 1).
 */
/**
 * Iterate over spider parties eligible to be assigned an order: friendly,
 * has living units, has a leader, and is not the queen-bearing `web-guard`.
 */
function* eligibleSpiders(state: GameState): IterableIterator<Party> {
  for (const party of state.parties.values()) {
    if (party.faction !== 'spider') continue;
    if (party.leaderless) continue;
    if (party.units.length === 0) continue;
    if (party.id === ('web-guard' as PartyId)) continue;
    yield party;
  }
}

const pickScout = (state: GameState): Party | null => {
  let best: { party: Party; cost: number } | null = null;
  for (const party of eligibleSpiders(state)) {
    const cost = totalSlotCost(party, state.unitTemplates);
    if (best === null || cost < best.cost || (cost === best.cost && party.id < best.party.id)) {
      best = { party, cost };
    }
  }
  return best?.party ?? null;
};

const antControlledPostCount = (state: GameState): number => {
  let n = 0;
  for (const post of state.posts.values()) {
    if (post.owner === 'ant') n += 1;
  }
  return n;
};

/**
 * Largest non-scout, non-web-guard spider party by total slot cost.
 * Deterministic tiebreak by lexical PartyId. Used as the counter-push
 * party when ants dominate the floor.
 */
const pickPusher = (state: GameState, scoutId: PartyId | null): Party | null => {
  let best: { party: Party; cost: number } | null = null;
  for (const party of eligibleSpiders(state)) {
    if (scoutId !== null && party.id === scoutId) continue;
    const cost = totalSlotCost(party, state.unitTemplates);
    if (best === null || cost > best.cost || (cost === best.cost && party.id < best.party.id)) {
      best = { party, cost };
    }
  }
  return best?.party ?? null;
};

/**
 * Closest non-scout, non-web-guard spider responder to `target`. Deterministic
 * tiebreak by lexical PartyId.
 */
const pickResponder = (
  state: GameState,
  scoutId: PartyId | null,
  target: TileCoord,
): Party | null => {
  let best: { party: Party; d: number } | null = null;
  for (const party of eligibleSpiders(state)) {
    if (scoutId !== null && party.id === scoutId) continue;
    const d = distance(party.location, target);
    if (best === null || d < best.d || (d === best.d && party.id < best.party.id)) {
      best = { party, d };
    }
  }
  return best?.party ?? null;
};

/**
 * Scout orders:
 *   - Default: walk to soap-dish (preserved for the existing test).
 *   - If ants already own the soap-dish, harass the towel-rack on the
 *     floor instead. Towel-rack is the next link in the canonical
 *     soap-dish -> towel-rack -> wall-crack ladder; jamming a 4-slot
 *     scout there forces the ant turtle/baseline opener to either
 *     stop and dislodge it (slowing capture by 1-2 turns) or skip
 *     ahead to wall-crack with a wounded escort.
 *   - This is floor-only behavior — advance-scout never touches the
 *     ceiling, so rush's plane-switch route is untouched.
 */
const ordersForScout = (state: GameState, party: Party, soapLoc: TileCoord): readonly Order[] => {
  // If every soap-dish is ant-owned, harass the (first un-owned) towel-rack.
  if (allPostsOfTypeOwnedByAnt(state, SOAP_DISH_TYPE)) {
    const towelLoc = requireFirstPostOfType(state, TOWEL_RACK_TYPE);
    if (sameCoord(party.location, towelLoc)) return [];
    if (distance(party.location, towelLoc) <= 1) return [];
    return [moveTo(towelLoc)];
  }
  if (sameCoord(party.location, soapLoc)) return [];
  if (distance(party.location, soapLoc) <= 1) return [];
  return [moveTo(soapLoc)];
};

const ordersForPatrolOrThreat = (
  party: Party,
  threat: TileCoord | null,
  _webLoc: TileCoord,
  isResponder: boolean,
): readonly Order[] => {
  // If actively responding to a threat, move to the threatened POST.
  // Otherwise hold position (no orders). With the 6-plane geometry,
  // having every party patrol back to spider-web causes pile-ups on
  // the web tile that overwhelm any ant assault — so the default is
  // to anchor at the starting tile and only move on demand.
  if (isResponder && threat !== null) {
    if (sameCoord(party.location, threat)) return [];
    return [moveTo(threat)];
  }
  return [];
};

export const spiderL1: AIPolicy = {
  name: 'spider-l1',
  faction: 'spider',
  decide(state: GameState, _scenario: ScenarioData, rng: Rng): GameState {
    // Fork an unused stream so future tiebreak randomness can plug in without
    // shifting other subsystems' entropy. (Currently all tiebreaks are by id.)
    rng.fork('spider-l1-tiebreak');

    const webLoc = requirePost(state, SPIDER_WEB);
    const soapLoc = requireFirstPostOfType(state, SOAP_DISH_TYPE);
    // Counter-push target: the first wall-crack on the wall plane.
    // Pushing toward wall-crack drops the spider down via the climbing
    // bypass and puts it on top of the ant parties camped there for the
    // ceiling assault.
    const counterPushTargetLoc = requireFirstPostOfType(state, WALL_CRACK_TYPE);
    const threat = decideThreat(state);

    const scout = pickScout(state);
    const responderTarget = threat.defend ?? webLoc;
    const responder = pickResponder(state, scout?.id ?? null, responderTarget);

    // Phase-3 pursuit: once we're past the early rush window, look for
    // an ant party at < 50% effective HP. If found, the closest non-
    // queen-bearing non-scout spider on the same plane is redirected to
    // pursue it. Gated on `state.turn >= 4` and ant POST ownership ≥ 1
    // so rush (which doesn't capture POSTs) can't be hard-countered.
    let pursueTarget: { antPartyId: PartyId; loc: TileCoord } | null = null;
    if (state.turn >= 4 && antControlledPostCount(state) >= 1) {
      let weakest: { partyId: PartyId; hpFrac: number; loc: TileCoord } | null = null;
      for (const party of state.parties.values()) {
        if (party.faction !== 'ant') continue;
        if (party.id === ('queen-guard' as PartyId)) continue;
        const livingHp = party.units.reduce((s, u) => s + Math.max(0, u.currentHp), 0);
        const maxHp = party.units.reduce((s, u) => {
          const tmpl = state.unitTemplates.get(u.templateId);
          return s + (tmpl?.baseStats.hp ?? 0);
        }, 0);
        if (maxHp <= 0) continue;
        const frac = livingHp / maxHp;
        if (frac >= 0.5) continue;
        if (!weakest || frac < weakest.hpFrac) {
          weakest = { partyId: party.id, hpFrac: frac, loc: party.location };
        }
      }
      if (weakest) pursueTarget = { antPartyId: weakest.partyId, loc: weakest.loc };
    }
    const pursuer =
      pursueTarget !== null ? pickResponder(state, scout?.id ?? null, pursueTarget.loc) : null;

    // Counter-push: if ants dominate the floor, pick the largest non-scout
    // spider party to break formation and head for the storm-drain.
    const counterPushActive = antControlledPostCount(state) >= ANT_DOMINANCE_THRESHOLD;
    const pusher = counterPushActive ? pickPusher(state, scout?.id ?? null) : null;

    // Phase-2 ability triggers — emit once on a specific turn so the
    // engine's `uses: 1` envelopes are respected without per-unit
    // bookkeeping in the AI:
    //   turn 2 — silk-line spins a web on its current wall tile.
    //   turn 3 — web-guard spawns 10 spiderlings as separate parties.
    const spiderlingsAlreadySpawned = [...state.parties.keys()].some((pid) =>
      pid.startsWith('spiderling-'),
    );

    const nextParties = new Map<PartyId, Party>();
    for (const [id, party] of state.parties) {
      if (party.faction !== 'spider') {
        nextParties.set(id, party);
        continue;
      }
      if (party.leaderless) {
        nextParties.set(id, party);
        continue;
      }
      if (party.units.length === 0) {
        nextParties.set(id, party);
        continue;
      }

      let nextOrders: readonly Order[];
      // Spiderling wander: tiny randomized hops, no battle-seeking. Just
      // adds visual life. Using the ai-tiebreak rng keeps deterministic.
      if (id.startsWith('spiderling-')) {
        const dx = rng.int(3) - 1;
        const dy = rng.int(3) - 1;
        const tx = Math.max(0, Math.min(9, party.location.x + dx));
        const ty = Math.max(0, Math.min(9, party.location.y + dy));
        const target: TileCoord = { plane: party.location.plane, x: tx, y: ty };
        nextOrders = sameCoord(party.location, target) ? [] : [moveTo(target)];
        nextParties.set(id, { ...party, orders: nextOrders });
        continue;
      }
      // Priority order: web-guard always holds (queen is sacred). Counter-push
      // wins next — it's the whole point of the rule, so even a party that
      // happens to be on the web tile gets pulled off when ants dominate.
      // Otherwise on-the-web means hold; then scout; then patrol/threat.
      if (id === ('web-guard' as PartyId) && state.turn === 3 && !spiderlingsAlreadySpawned) {
        nextOrders = [{ kind: 'use-ability', abilityId: 'spawn-spiderlings' as AbilityId }];
      } else if (id === ('silk-line' as PartyId) && state.turn === 2) {
        nextOrders = [{ kind: 'use-ability', abilityId: 'spin-web' as AbilityId }];
      } else if (id === ('web-guard' as PartyId)) {
        nextOrders = [];
      } else if (pusher !== null && id === pusher.id) {
        nextOrders = sameCoord(party.location, counterPushTargetLoc)
          ? []
          : [moveTo(counterPushTargetLoc)];
      } else if (pursuer !== null && id === pursuer.id && pursueTarget !== null) {
        // Pursue the weakened ant party. If we're already on its tile,
        // hold (engine collision triggers a battle).
        nextOrders = sameCoord(party.location, pursueTarget.loc) ? [] : [moveTo(pursueTarget.loc)];
      } else if (isOnWeb(party, webLoc)) {
        nextOrders = [];
      } else if (id === scout?.id) {
        nextOrders = ordersForScout(state, party, soapLoc);
      } else {
        const isResponder = responder !== null && id === responder.id;
        nextOrders = ordersForPatrolOrThreat(party, threat.defend, webLoc, isResponder);
      }

      nextParties.set(id, { ...party, orders: nextOrders });
    }

    return { ...state, parties: nextParties };
  },
};
