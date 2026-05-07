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
 *
 * Phase-4 round-2 strategy retune (current revision):
 *  - Pursuit POST-ownership gate raised from >=1 to >=2: previous
 *    setting one-shot a chipped baseline party as soon as the first
 *    soap-dish flipped, crushing baseline (19% ant wins) and dive
 *    (13%). Two-POST gate gives both variants a setup turn before
 *    the spider hunts wounded.
 *  - spawn-spiderlings deferred from turn 3 to turn 5: baseline's
 *    slow chain was being overrun by the spiderling cloud before it
 *    reached towel-rack. Two extra setup turns let baseline plant
 *    soap-dish before the swarm arrives.
 *  - silk-line counter-push softened from ANT_DOMINANCE_THRESHOLD
 *    (3 POSTs) to a single-POST early lever: when ants own >=1 POST
 *    AND it is turn >= 3, silk-line pushes wall-crack. Catches the
 *    rush/turtle/jelly-rush variants that currently dodge the
 *    3-POST trigger because they capture ceiling/wall POSTs and
 *    skip past floor totals (rush 77%, turtle 87%, jelly-rush 78%).
 *    Independent of `pickPusher` so the larger formation can still
 *    fire the late-game `counterPushActive` push.
 *  - web-watch active reposition: instead of holding the spawn
 *    tile, web-watch moves one tile toward the nearest ant party
 *    every turn (capped to its current plane). Adds a smart
 *    interceptor that pressures rush's ceiling lane and turtle's
 *    floor approach without committing to a ceiling tile pick that
 *    would over-rotate against rush like round-2 did.
 *  - web-guard AoE dodge: when queenUltimateCharge >= 80 and the
 *    Queen has charges left, web-guard slides one tile off the
 *    spider-web tile (toward the ant home base direction) to drop
 *    the AoE blast radius around the web. Reactive behavior that
 *    interacts directly with the queen-ultimate `radius`/`damage`
 *    system in queen.json.
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

/**
 * Queen ultimate AoE-dodge trigger. Once charge crosses this fraction
 * of `chargeMax` (queen.json: chargeMax 100, radius 5, damage 60), the
 * web-guard slides one tile off the spider-web tile so that the
 * 5-tile blast radius is no longer centered on the queen's defender
 * stack. The ant queen's ultimate has `usesPerScenario: 1`, so once
 * `queenUltimatesUsed >= 1` the dodge is unnecessary.
 */
const QUEEN_ULT_DODGE_CHARGE = 80;

const SILK_LINE: PartyId = 'silk-line' as PartyId;
const WEB_WATCH: PartyId = 'web-watch' as PartyId;
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
 * Returns null if no eligible ant is on the same plane. Used by web-watch
 * to pick its repositioning target without falling into Infinity-distance
 * cross-plane lookups.
 */
const closestAntPartyOnPlane = (state: GameState, from: TileCoord): Party | null =>
  closestPartyTo(samePlaneAntParties(state, from.plane), from);

/**
 * Take one step from `from` toward `target` along the larger axis (Chebyshev
 * step), clamped to the 0-9 board. Stays on the same plane — web-watch
 * never plane-jumps via this helper, which keeps it from bumping into the
 * round-2 ceiling-intercept regression that hard-countered rush.
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
    // queen-bearing non-scout spider is redirected to pursue it. The
    // POST-ownership gate is now >= 2 (was >= 1) — the previous setting
    // hunted baseline as soon as the first soap-dish flipped, killing
    // its slow chain (19% baseline win rate). Two POSTs means the ants
    // have committed to the wall climb and the pursuit is no longer a
    // decisive over-rotation.
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

    // Counter-push: if ants dominate the floor, pick the largest non-scout
    // spider party to break formation and head for the storm-drain.
    const counterPushActive = antControlledPostCount(state) >= ANT_DOMINANCE_THRESHOLD;
    const pusher = counterPushActive ? pickPusher(state, scout?.id ?? null) : null;

    // Silk-line early counter-push: the 3-POST `counterPushActive` gate
    // never fires against rush/jelly-rush (which capture few POSTs) and
    // fires too late against turtle. Pull silk-line forward to wall-crack
    // once the ants have grabbed any POST and we're past turn 2 — a
    // single-party probe that keeps the ladder contested without
    // committing the formation.
    const silkPushActive =
      !counterPushActive && state.turn >= 3 && antControlledPostCount(state) >= 1;

    // Web-watch active reposition: instead of holding its spawn tile,
    // step one tile per turn toward the closest ant on its plane. Skip
    // when web-watch has a higher-priority assignment (responder /
    // pursuer / pusher) — those branches override naturally below.
    const webWatchParty = state.parties.get(WEB_WATCH);
    const webWatchTarget =
      webWatchParty && webWatchParty.units.length > 0 && !webWatchParty.leaderless
        ? closestAntPartyOnPlane(state, webWatchParty.location)
        : null;

    // Queen-ult AoE dodge: when the queen ultimate is nearly ready and
    // hasn't fired yet, slide web-guard one tile off the spider-web in
    // the direction of the closest ant. Dropping the queen-guard stack
    // out of the AoE center reduces incoming AoE damage on the most
    // valuable spider party. Once the ult has been used, the dodge is
    // disabled. queen.ultimate.usesPerScenario is 1 (data/level-1/queen.json),
    // so this fires at most once per scenario.
    const ultDodgeArmed =
      state.queenUltimateCharge >= QUEEN_ULT_DODGE_CHARGE && state.queenUltimatesUsed < 1;
    let webGuardDodgeTarget: TileCoord | null = null;
    if (ultDodgeArmed) {
      const refAnt = closestAntPartyOnPlane(state, webLoc);
      if (refAnt !== null) {
        const stepped = stepToward(webLoc, refAnt.location);
        if (!sameCoord(stepped, webLoc)) {
          webGuardDodgeTarget = stepped;
        }
      }
    }

    // Phase-2 ability triggers — emit once on a specific turn so the
    // engine's `uses: 1` envelopes are respected without per-unit
    // bookkeeping in the AI:
    //   turn 2 — silk-line spins a web on its current wall tile.
    //   turn 5 — web-guard spawns 10 spiderlings as separate parties.
    //
    // The spawn-spiderlings turn moved from 3 to 5 because the early
    // swarm overwhelmed baseline's slow chain before it could plant
    // soap-dish. Two extra turns let baseline get a foothold before
    // the spiderling cloud arrives.
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
      // Priority order: web-guard ability fire (turn 5); silk-line ability
      // fire (turn 2); web-guard AoE dodge (queen ult ~ready); web-guard
      // hold; counter-push pusher; silk-line early push; pursuit; on-web
      // hold; scout; web-watch reposition; patrol/threat.
      if (id === WEB_GUARD && state.turn === 5 && !spiderlingsAlreadySpawned) {
        nextOrders = [{ kind: 'use-ability', abilityId: 'spawn-spiderlings' as AbilityId }];
      } else if (id === SILK_LINE && state.turn === 2) {
        nextOrders = [{ kind: 'use-ability', abilityId: 'spin-web' as AbilityId }];
      } else if (id === WEB_GUARD && webGuardDodgeTarget !== null) {
        nextOrders = [moveTo(webGuardDodgeTarget)];
      } else if (id === WEB_GUARD) {
        nextOrders = [];
      } else if (pusher !== null && id === pusher.id) {
        nextOrders = sameCoord(party.location, counterPushTargetLoc)
          ? []
          : [moveTo(counterPushTargetLoc)];
      } else if (
        silkPushActive &&
        id === SILK_LINE &&
        // Don't override the scout slot or the threat-response slot.
        id !== scout?.id &&
        !(responder !== null && responder.id === SILK_LINE && threat.defend !== null)
      ) {
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
      } else if (
        id === WEB_WATCH &&
        webWatchTarget !== null &&
        // Don't override responder duty.
        !(responder !== null && responder.id === WEB_WATCH && threat.defend !== null)
      ) {
        const stepped = stepToward(party.location, webWatchTarget.location);
        nextOrders = sameCoord(party.location, stepped) ? [] : [moveTo(stepped)];
      } else {
        const isResponder = responder !== null && id === responder.id;
        nextOrders = ordersForPatrolOrThreat(party, threat.defend, webLoc, isResponder);
      }

      nextParties.set(id, { ...party, orders: nextOrders });
    }

    return { ...state, parties: nextParties };
  },
};
