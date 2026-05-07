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
 * Phase-4 round-3 aggressive retune (current revision):
 *  - Round 2's diagnosis: spiders sat at the web waiting and timed out
 *    55% of baseline games while losing 0/100 against 5/6 strategy
 *    variants. The fix is *more* aggression, not less — push spiders
 *    forward to force decisive battles instead of stalled timeouts.
 *  - ANT_DOMINANCE_THRESHOLD lowered from 3 to 1: the largest non-scout
 *    spider party breaks formation as soon as ants own a single POST,
 *    rather than waiting for the floor to be lost. Earlier counter-push
 *    creates collision opportunities ants can exploit (or be crushed
 *    by) instead of two factions stalling on opposite ends of the map.
 *  - Early raid: silk-line marches toward the ant queen base
 *    (storm-drain, floor (0,0)) starting turn 2, regardless of POST
 *    count. A direct queen-base assault on the canonical ant supply
 *    line, taking advantage of the storm-drain tag `home-base` as a
 *    fixed strategic target. Independent of `pickPusher` / silk
 *    early-push so silk-line always has somewhere to go from turn 2.
 *  - Counter-push pusher now steps toward the storm-drain along the
 *    Chebyshev gradient, rather than emitting a single `move-to`
 *    wall-crack order. The engine's per-turn movement budget
 *    advances the pusher one tile per call, so this is functionally
 *    equivalent to `move-to storm-drain` but uses the same
 *    `stepToward` helper as spiderlings for code reuse.
 *  - spawn-spiderlings reverted from turn 5 back to turn 3: bring the
 *    swarm online earlier so the early raid + pusher have flanking
 *    pressure on turns 4-6 instead of waiting until turn 6+.
 *  - Spiderlings step toward the closest ant party (Chebyshev) every
 *    turn instead of wandering randomly. A 10-strong cloud of
 *    drifting tiles wasn't accomplishing anything; pointed at ants
 *    the cloud becomes a real harassment threat.
 *
 * Round-3 removals (round-2 over-corrections that made spiders sticky
 * without making them lethal):
 *  - Removed `web-watch active reposition` (Chebyshev step toward the
 *    closest ant on its plane). Web-watch now follows the standard
 *    responder/patrol path.
 *  - Removed `web-guard queen-ult AoE dodge` (the slide-off-web-tile
 *    when queenUltimateCharge >= 80). Web-guard simply holds at the
 *    web tile when it has no higher-priority assignment.
 *
 * Preserved from round 2:
 *  - silk-line single-POST counter-push when ants own >=1 POST AND
 *    turn >= 3. This cooperates with the new turn-2 early raid: turn
 *    2 silk-line walks toward storm-drain unconditionally; from turn
 *    3 onward, if any POST has fallen the silk push lever picks the
 *    closer wall-crack target rather than the deep storm-drain.
 *  - Pursuit POST-ownership gate at >= 2 (didn't matter much, kept
 *    for consistency with round-2 chipping logic).
 *  - advance-scout floor harassment chain (soap-dish -> towel-rack).
 *  - Wall-crack threat-radius widening when towel-racks all owned.
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
  SPIDER_WEB,
  STORM_DRAIN,
  SOAP_DISH_TYPE,
  TOWEL_RACK_TYPE,
  WALL_CRACK_TYPE,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const THREAT_RADIUS = 2;
/**
 * When ants control this many non-home POSTs or more, the spiders are
 * clearly losing the floor war. The largest non-scout spider party
 * then breaks formation and counter-pushes toward the ant home base
 * (storm-drain).
 *
 * Round-3 lowered from 3 to 1: round-2 diagnostics showed spiders
 * timing out 55% of baseline games because the dominance gate fired
 * too late. Triggering on the first non-home POST flip turns the
 * spider AI aggressive immediately — by turn 2-3 in most games —
 * forcing a decisive midboard battle instead of a timeout slog.
 * The home-base storm-drain is excluded from the count so the
 * trigger fires on actual ant *progress* rather than on the always-
 * owned starting POST.
 */
const ANT_DOMINANCE_THRESHOLD = 1;

const SILK_LINE: PartyId = 'silk-line' as PartyId;
const WEB_GUARD: PartyId = 'web-guard' as PartyId;

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
 * Iterate over spider parties eligible to be assigned an order: friendly,
 * has living units, has a leader, and is not the queen-bearing `web-guard`.
 */
function* eligibleSpiders(state: GameState): IterableIterator<Party> {
  for (const party of state.parties.values()) {
    if (party.faction !== 'spider') continue;
    if (party.leaderless) continue;
    if (party.units.length === 0) continue;
    if (party.id === WEB_GUARD) continue;
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

/**
 * Count of ant-controlled POSTs that represent ant *progress*. Excludes
 * the home-base storm-drain, which starts ant-owned every game (per the
 * `home-base` tag in map.json). Without this exclusion, the ANT_DOMINANCE
 * trigger would fire on turn 0 in every game and the aggressive
 * counter-push would short-circuit the threat-response slot before any
 * captures had actually happened.
 */
const antControlledPostCount = (state: GameState): number => {
  let n = 0;
  for (const post of state.posts.values()) {
    if (post.id === STORM_DRAIN) continue;
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
 * Pick the closest party in `candidates` to `from`. Deterministic tiebreak
 * by lexical PartyId. Generic over what the caller filters in.
 */
const closestPartyTo = (candidates: Iterable<Party>, from: TileCoord): Party | null => {
  let best: { party: Party; d: number } | null = null;
  for (const party of candidates) {
    const d = distance(party.location, from);
    if (best === null || d < best.d || (d === best.d && party.id < best.party.id)) {
      best = { party, d };
    }
  }
  return best?.party ?? null;
};

const eligibleResponders = function* (state: GameState, scoutId: PartyId | null): Iterable<Party> {
  for (const party of eligibleSpiders(state)) {
    if (scoutId !== null && party.id === scoutId) continue;
    yield party;
  }
};

/**
 * Closest non-scout, non-web-guard spider responder to `target`. Deterministic
 * tiebreak by lexical PartyId.
 */
const pickResponder = (
  state: GameState,
  scoutId: PartyId | null,
  target: TileCoord,
): Party | null => closestPartyTo(eligibleResponders(state, scoutId), target);

const samePlaneAntParties = function* (
  state: GameState,
  plane: TileCoord['plane'],
): Iterable<Party> {
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    if (party.units.length === 0) continue;
    if (party.location.plane !== plane) continue;
    yield party;
  }
};

/**
 * Closest threat-eligible ant party to `from` (Chebyshev, same-plane only).
 * Returns null if no eligible ant is on the same plane.
 */
const closestAntPartyOnPlane = (state: GameState, from: TileCoord): Party | null =>
  closestPartyTo(samePlaneAntParties(state, from.plane), from);

/**
 * Take one step from `from` toward `target` along the larger axis (Chebyshev
 * step), clamped to the 0-9 board. Stays on the same plane — callers that
 * need plane-jumping should use a higher-level pathfinder. Used by the
 * counter-push pusher (step toward storm-drain) and spiderling chase
 * (step toward closest ant) so the same helper drives both kinds of
 * forward-pressure motion.
 */
const stepToward = (from: TileCoord, target: TileCoord): TileCoord => {
  if (from.plane !== target.plane) return from;
  const dx = Math.sign(target.x - from.x);
  const dy = Math.sign(target.y - from.y);
  const nx = Math.max(0, Math.min(9, from.x + dx));
  const ny = Math.max(0, Math.min(9, from.y + dy));
  return { plane: from.plane, x: nx, y: ny };
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
    const stormDrainLoc = requirePost(state, STORM_DRAIN);
    const soapLoc = requireFirstPostOfType(state, SOAP_DISH_TYPE);
    // Counter-push deep target: the ant queen base (storm-drain). The
    // pusher steps toward this each turn so over a multi-turn arc it
    // crosses the entire map and arrives at the ant supply line.
    const counterPushTargetLoc = stormDrainLoc;
    // Silk-line early-push target stays at wall-crack: catches ants on
    // the canonical soap-dish -> towel-rack -> wall-crack climb without
    // committing to a deep storm-drain march.
    const silkPushTargetLoc = requireFirstPostOfType(state, WALL_CRACK_TYPE);
    const threat = decideThreat(state);

    const scout = pickScout(state);
    const responderTarget = threat.defend ?? webLoc;
    const responder = pickResponder(state, scout?.id ?? null, responderTarget);

    // Phase-3 pursuit: once we're past the early rush window, look for
    // an ant party at < 50% effective HP. If found, the closest non-
    // queen-bearing non-scout spider is redirected to pursue it. The
    // POST-ownership gate is >= 2: hunting wounded ants the moment a
    // single POST flips one-shot baseline (round-2 diagnosis).
    let pursueTarget: { antPartyId: PartyId; loc: TileCoord } | null = null;
    if (state.turn >= 4 && antControlledPostCount(state) >= 2) {
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

    // Counter-push: aggressive 1-POST gate (round-3). The largest non-scout
    // spider breaks formation toward the ant queen base as soon as the
    // first POST flips. Steps along the Chebyshev gradient toward
    // storm-drain so the pusher closes distance every turn.
    const counterPushActive = antControlledPostCount(state) >= ANT_DOMINANCE_THRESHOLD;
    const pusher = counterPushActive ? pickPusher(state, scout?.id ?? null) : null;

    // Silk-line early counter-push: when ants own >=1 POST AND turn >= 3,
    // silk-line pushes wall-crack. Catches the rush/turtle/jelly-rush
    // variants on the floor->wall->ceiling climb. Independent of
    // `pickPusher` so the larger formation can still fire the deep
    // storm-drain push above. Cooperates with the unconditional
    // turn-2 silk-line raid: turn 2 always heads for storm-drain;
    // turn >=3 (with a POST flipped) prefers wall-crack as the
    // closer engagement target.
    const silkEarlyPushActive =
      !counterPushActive && state.turn >= 3 && antControlledPostCount(state) >= 1;

    // Silk-line turn-2 raid: walk toward storm-drain unconditionally.
    // The single-POST `counterPushActive` gate may have already picked
    // silk-line as the pusher — in that case the pusher branch handles
    // it and this trigger is bypassed. From turn 2 onward, silk-line
    // is never idle: either raiding (turn 2), early-push (turn >= 3
    // with a POST flipped), pusher (counter-push active), or otherwise
    // continuing the silk-line raid drift.
    const silkRaidActive = state.turn >= 2;

    // Phase-2 ability triggers — emit once on a specific turn so the
    // engine's `uses: 1` envelopes are respected without per-unit
    // bookkeeping in the AI:
    //   turn 2 — silk-line spins a web on its current wall tile.
    //   turn 3 — web-guard spawns 10 spiderlings as separate parties.
    //
    // Round-3 reverted spawn-spiderlings from turn 5 back to turn 3:
    // earlier spawn means the swarm is online while the early raid
    // and counter-push are still in motion, multiplying flanking
    // pressure rather than arriving after the battle is decided.
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
      // Spiderling chase: step toward the closest same-plane ant party
      // every turn. A pointed swarm is a real flanking threat; the
      // round-2 random wander wasn't actually contributing pressure.
      // Falls back to a small random hop if no same-plane ant is
      // reachable (keeps the visual life and the determinism contract).
      if (id.startsWith('spiderling-')) {
        const chaseTarget = closestAntPartyOnPlane(state, party.location);
        let target: TileCoord;
        if (chaseTarget !== null) {
          target = stepToward(party.location, chaseTarget.location);
        } else {
          const dx = rng.int(3) - 1;
          const dy = rng.int(3) - 1;
          const tx = Math.max(0, Math.min(9, party.location.x + dx));
          const ty = Math.max(0, Math.min(9, party.location.y + dy));
          target = { plane: party.location.plane, x: tx, y: ty };
        }
        nextOrders = sameCoord(party.location, target) ? [] : [moveTo(target)];
        nextParties.set(id, { ...party, orders: nextOrders });
        continue;
      }
      // Priority order: web-guard ability fire (turn 3); silk-line ability
      // fire (turn 2); web-guard hold; counter-push pusher; silk-line
      // early-push (wall-crack); silk-line turn-2 raid (storm-drain);
      // pursuit; on-web hold; scout; patrol/threat.
      if (id === WEB_GUARD && state.turn === 3 && !spiderlingsAlreadySpawned) {
        nextOrders = [{ kind: 'use-ability', abilityId: 'spawn-spiderlings' as AbilityId }];
      } else if (id === SILK_LINE && state.turn === 2) {
        nextOrders = [{ kind: 'use-ability', abilityId: 'spin-web' as AbilityId }];
      } else if (id === WEB_GUARD) {
        nextOrders = [];
      } else if (pusher !== null && id === pusher.id) {
        const stepped = stepToward(party.location, counterPushTargetLoc);
        nextOrders = sameCoord(party.location, stepped) ? [] : [moveTo(stepped)];
      } else if (
        silkEarlyPushActive &&
        id === SILK_LINE &&
        // Don't override the scout slot or the threat-response slot.
        id !== scout?.id &&
        !(responder !== null && responder.id === SILK_LINE && threat.defend !== null)
      ) {
        nextOrders = sameCoord(party.location, silkPushTargetLoc)
          ? []
          : [moveTo(silkPushTargetLoc)];
      } else if (
        silkRaidActive &&
        id === SILK_LINE &&
        id !== scout?.id &&
        !(responder !== null && responder.id === SILK_LINE && threat.defend !== null)
      ) {
        // Turn-2+ raid: step toward the ant queen base. The spin-web
        // ability fires on turn 2 and is handled above; from turn 3
        // onward (with no POSTs flipped) silk-line keeps walking
        // toward storm-drain.
        const stepped = stepToward(party.location, stormDrainLoc);
        nextOrders = sameCoord(party.location, stepped) ? [] : [moveTo(stepped)];
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
