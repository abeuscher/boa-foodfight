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
 */

import { distance, sameCoord } from '../engine/coord.ts';
import type { ScenarioData } from '../engine/state.ts';
import type {
  GameState,
  Order,
  Party,
  PartyId,
  PostId,
  Rng,
  TileCoord,
  UnitTemplate,
  UnitTemplateId,
} from '../engine/types.ts';

import type { AIPolicy } from './types.ts';

const SPIDER_WEB: PostId = 'spider-web' as PostId;
const SOAP_DISH: PostId = 'soap-dish' as PostId;
const TOWEL_RACK: PostId = 'towel-rack' as PostId;
const WALL_CRACK: PostId = 'wall-crack' as PostId;

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

const decideThreat = (state: GameState): ThreatDecision => {
  const towelLoc = requirePost(state, TOWEL_RACK);
  const crackLoc = requirePost(state, WALL_CRACK);
  const towelD = closestAntDistance(state, towelLoc);
  const crackD = closestAntDistance(state, crackLoc);
  const towelThreat = towelD <= THREAT_RADIUS;
  const crackThreat = crackD <= THREAT_RADIUS;
  if (!towelThreat && !crackThreat) return { defend: null };
  if (towelThreat && !crackThreat) return { defend: towelLoc };
  if (crackThreat && !towelThreat) return { defend: crackLoc };
  // Both threatened: defend whichever has the closer ant; tiebreak to wall-crack.
  if (towelD < crackD) return { defend: towelLoc };
  return { defend: crackLoc };
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

const ordersForScout = (party: Party, soapLoc: TileCoord): readonly Order[] => {
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
    const soapLoc = requirePost(state, SOAP_DISH);
    // Counter-push target: wall-crack on the wall plane. The storm-drain
    // is the conceptual goal but is physically unreachable for spiders
    // (no ceiling↔floor route; the towel-rack/wall-crack pair is
    // ant-controlled by the time the counter-push fires). Pushing toward
    // wall-crack drops the spider down via the climbing bypass and puts
    // it on top of the ant parties camped there for the ceiling assault.
    const counterPushTargetLoc = requirePost(state, WALL_CRACK);
    const threat = decideThreat(state);

    const scout = pickScout(state);
    const responderTarget = threat.defend ?? webLoc;
    const responder = pickResponder(state, scout?.id ?? null, responderTarget);

    // Counter-push: if ants dominate the floor, pick the largest non-scout
    // spider party to break formation and head for the storm-drain.
    const counterPushActive = antControlledPostCount(state) >= ANT_DOMINANCE_THRESHOLD;
    const pusher = counterPushActive ? pickPusher(state, scout?.id ?? null) : null;

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
      // Priority order: web-guard always holds (queen is sacred). Counter-push
      // wins next — it's the whole point of the rule, so even a party that
      // happens to be on the web tile gets pulled off when ants dominate.
      // Otherwise on-the-web means hold; then scout; then patrol/threat.
      if (id === ('web-guard' as PartyId)) {
        nextOrders = [];
      } else if (pusher !== null && id === pusher.id) {
        nextOrders = sameCoord(party.location, counterPushTargetLoc)
          ? []
          : [moveTo(counterPushTargetLoc)];
      } else if (isOnWeb(party, webLoc)) {
        nextOrders = [];
      } else if (id === scout?.id) {
        nextOrders = ordersForScout(party, soapLoc);
      } else {
        const isResponder = responder !== null && id === responder.id;
        nextOrders = ordersForPatrolOrThreat(party, threat.defend, webLoc, isResponder);
      }

      nextParties.set(id, { ...party, orders: nextOrders });
    }

    return { ...state, parties: nextParties };
  },
};
