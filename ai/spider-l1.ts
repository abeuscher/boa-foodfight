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
 * Phase-4 round-4 deep-raider integration (current revision):
 *  - A fifth spider party `deep-raider` spawns on east-wall (5, 5) with
 *    2 spider-elite + 2 spider-soldier + 1 spider-spinner. Round-3 left
 *    it idle (no AI logic referenced its id), so it sat in the middle of
 *    the east-wall and contributed nothing. This revision wires it in
 *    as a **wall-plane interceptor + proactive second front**.
 *  - Role: patrol east-wall, then plane-jump down to the floor (via the
 *    floor↔east-wall edge at floor x=9 / east-wall y=9) or up to the
 *    ceiling (via ceiling↔east-wall at ceiling x=9 / east-wall y=0)
 *    when an ant party comes within Chebyshev radius 3 on the touching
 *    plane. From turn 1 onward, with no proximate threat the raider
 *    proactively descends toward the floor door — converting it from a
 *    passive interceptor into a permanent second front so the counter-
 *    push pusher and the raider hit the storm-drain column from two
 *    planes at once.
 *  - Movement is stepped along the Chebyshev gradient using the same
 *    `stepToward` helper as the counter-push pusher and the spiderling
 *    swarm; the engine's spider-on-wall allowance of 3 tiles/turn lets
 *    the raider close the 4-tile gap to (5, 9) in 2 turns. Once at the
 *    door, a move-to with an off-plane target lets the engine resolve
 *    the edge-adjacency transition in a single tile of allowance.
 *  - Spin-web fire: turn 3, on whatever east-wall tile the raider
 *    occupies. The order list contains BOTH the use-ability and the
 *    move-to step, since the engine resolves abilities before movement
 *    and the spinner's `uses: 1` cap means subsequent turns just drop
 *    the order silently. The result is a delay-1 web on the wall the
 *    raider just left, slowing any ant pursuing across the corner.
 *  - The raider's posture stays `fight` (set in roster-spiders.json),
 *    so engine collision rules let it engage the moment it arrives.
 *
 * Other round-4 strategy elements (preserved across the rewrite):
 *  - ANT_DOMINANCE_THRESHOLD stays at 1 (round-3 setting): largest
 *    non-scout/non-raider spider counter-pushes toward storm-drain on
 *    the first POST flip. With the deep-raider as a permanent second
 *    forward party, the counter-push and the raider can pincer the
 *    same ant column from two planes.
 *  - silk-line keeps its turn-2 spin-web + turn-2 raid toward
 *    storm-drain (round-3); turn-3 silk-line wall-crack push when
 *    >=1 POST has flipped.
 *  - Spiderling swarm stepping toward closest same-plane ant.
 *  - advance-scout floor harassment (soap-dish -> towel-rack chain).
 *  - Queen-guard holds at the web. Queen-ultimate is engine-driven
 *    (end-of-turn fires it automatically once charged); the AI does
 *    not need to issue an order for it.
 */

import { distance, sameCoord } from '../engine/coord.ts';
import { livingHpFraction } from '../engine/parties.ts';
import type { ScenarioData } from '../engine/state.ts';
import type {
  AbilityId,
  GameState,
  Order,
  Party,
  PartyId,
  Post,
  PostId,
  ReplayEvent,
  Rng,
  TileCoord,
  UnitTemplate,
  UnitTemplateId,
} from '../engine/types.ts';

import { buyCardOrderFor, playCardOrderFor } from './card-helpers.ts';
import { spiderPlacement } from './placement-helpers.ts';
import {
  getSpiderVisibleAntTrail,
  postsOfType,
  SPIDER_WEB,
  STORM_DRAIN,
  SOAP_DISH_TYPE,
  TOWEL_RACK_TYPE,
  WALL_CRACK_TYPE,
  type SpiderVisibleTrailEntry,
} from './policy-helpers.ts';
import { appendPolicyEvents, computeThreatFlee, lowHpFleeEvent } from './threat-flee.ts';
import type { AIPolicy } from './types.ts';

const THREAT_RADIUS = 2;
/**
 * When ants control this many non-home POSTs or more, the spiders are
 * clearly losing the floor war. The largest non-scout/non-raider spider
 * party then breaks formation and counter-pushes toward the ant home
 * base (storm-drain).
 */
const ANT_DOMINANCE_THRESHOLD = 1;

const SILK_LINE: PartyId = 'silk-line' as PartyId;
const WEB_GUARD: PartyId = 'web-guard' as PartyId;
const DEEP_RAIDER: PartyId = 'deep-raider' as PartyId;

const HYPNOTIZE: AbilityId = 'hypnotize' as AbilityId;
const WEB_MEND: AbilityId = 'web-mend' as AbilityId;

/**
 * Round 18 — heal-priority trigger radius. When an ant trail entry
 * (age ≤ 1) sits within Chebyshev `HEAL_TRIGGER_RADIUS` of the
 * spider-web on the same plane, OR when an ant is on the floor at the
 * web's (x, y) column (the wall-crack ladder approach), web-guard
 * fires `web-mend` instead of sitting idle. This is NOT a recall —
 * silk-line / deep-raider / advance-scout keep their offensive
 * orders. Only web-guard's ABILITY use changes; its tile is
 * unchanged. The reach mirrors the rolled-back round-13 emergency-
 * defense radius without the stack-on-one-tile recall.
 */
const HEAL_TRIGGER_RADIUS = 3;

/**
 * Round 23 — web-mend HP-fraction gate. The queen carries the
 * spider-side venom-blast (r22; tier-2 pre-battle damage parity) AND
 * web-mend (r18; tier-2 active heal). Both abilities draw from the
 * queen's 2-tier-2-slot MP pool. A web-mend fired at 99% HP burns a
 * slot that could have powered a venom-blast in the next battle, so we
 * hold the heal until the queen is meaningfully wounded — < 80% of her
 * effective HP. Below that threshold the heal pays for itself; above
 * it the venom-blast is more valuable.
 */
const WEB_MEND_HP_THRESHOLD = 0.8;

/**
 * True iff at least one fresh (age ≤ 1) ant trail entry sits within
 * `HEAL_TRIGGER_RADIUS` of the spider-web on the same plane, OR sits
 * on the floor at the web's (x, y) (the wall-crack ladder approach).
 * Exported for direct unit testing.
 */
export const isWebUnderHealThreat = (state: GameState, webLoc: TileCoord): boolean => {
  const trail = getSpiderVisibleAntTrail(state);
  for (const entry of trail) {
    if (entry.ageInTurns > 1) continue;
    if (entry.plane === webLoc.plane) {
      const dx = Math.abs(entry.x - webLoc.x);
      const dy = Math.abs(entry.y - webLoc.y);
      if (Math.max(dx, dy) <= HEAL_TRIGGER_RADIUS) return true;
    }
    if (entry.plane === 'floor' && entry.x === webLoc.x && entry.y === webLoc.y) return true;
  }
  return false;
};

/** Round 15 — HP-fraction threshold for the flee trigger. Mirrors the
 * baseline value so the asymmetry is purely strategic, not numeric. */
const FLEE_HP_THRESHOLD = 0.3;
const FLEE_ORDER: Order = { kind: 'flee' };

/**
 * True iff the spider party's living-HP / max-HP fraction is below
 * `FLEE_HP_THRESHOLD`. Web-guard (queen-bearer) and deep-raider are
 * filtered at the call site.
 */
const spiderShouldFlee = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  const frac = livingHpFraction(party, templates);
  return frac > 0 && frac < FLEE_HP_THRESHOLD;
};
/** Round 8 — minimum caster currentHp before issuing a hypnotize.
 * The cast halves currentHp so we want the leader to survive at >=
 * half the spider-soldier 13-HP baseline. 5 keeps a 9-10 HP unit
 * alive after the cast. */
const HYPNOTIZE_MIN_HP = 5;
/** Round 9 — value-ranking by neutral kind. Cockroach (8 units, attack
 * 6) is the highest-value flip; mice (3 units) second; stinkbugs
 * REJECTED (value 0) — only 2 units, and a failed cast spawns a 5-tile
 * damage zone (1hp/turn for 5 turns) on the stinkbug's tile, which the
 * spider must subsequently walk through to leave. The expected EV of
 * a stinkbug attempt is net-negative for the spider once the half-HP
 * cast cost AND the post-miss damage zone are tallied, so we skip it
 * entirely (return 0 to make the candidate ineligible at the value
 * floor). Cockroach + mice still gate on the standard
 * HYPNOTIZE_MIN_HP threshold. */
const NEUTRAL_VALUE: Readonly<Record<'cockroaches' | 'mice' | 'stinkbugs', number>> = {
  cockroaches: 3,
  mice: 2,
  stinkbugs: 0,
};

/**
 * Deep-raider home tile on east-wall and the two corner-approach tiles.
 * The raider patrols between these; corners are where it can plane-jump
 * to floor (y=9 corner) or ceiling (y=0 corner) via edge adjacency.
 *
 * `engine/edges.ts` documents these mappings precisely:
 *   - east-wall (x, y=9) ↔ floor (x=9, y=x).
 *     So east-wall (5, 9) ↔ floor (9, 5) — one tile away from the
 *     storm-drain column.
 *   - east-wall (x, y=0) ↔ ceiling (x=9, y=x).
 *     So east-wall (5, 0) ↔ ceiling (9, 5) — adjacent to the spider-web.
 */
const RAIDER_HOME: TileCoord = { plane: 'east-wall', x: 5, y: 5 };
const RAIDER_FLOOR_DOOR: TileCoord = { plane: 'east-wall', x: 5, y: 9 };
const RAIDER_CEILING_DOOR: TileCoord = { plane: 'east-wall', x: 5, y: 0 };
/**
 * Detection radius for cross-plane threats reaching the east-wall. If
 * an ant is within Chebyshev `RAIDER_DETECT` on the floor or ceiling,
 * the raider commits to that door. Radius 3 gives the raider a 1-2
 * turn head start before the ant could hop to the wall.
 */
const RAIDER_DETECT = 3;

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
 * Round 29 — mid-POST detour (mechanics memo §1.7). When silk-line or
 * advance-scout is mid-route to its existing target, check if there's
 * a closer unowned mid-POST that's still off-route by ≤ 2 tiles
 * (Chebyshev). If so, detour to it first to capture (round-17 hold
 * mechanic, 2 turns). After the hold completes, the spider resumes
 * its original target.
 *
 * Returns the detour POST's location, or null if no detour is
 * worthwhile. The caller decides whether to issue a move-to (toward
 * the detour) or hold (party already on the detour tile, finishing
 * its 2-turn capture). Capture progresses purely from movement +
 * battle resolution in the engine; the AI only needs to keep the
 * spider stationary on the POST tile until the flip.
 *
 * Off-route budget: Chebyshev(here, post) + Chebyshev(post, target) ≤
 * Chebyshev(here, target) + DETOUR_BUDGET. With DETOUR_BUDGET = 2 the
 * detour pays for itself in 1-2 turns of POST-bonus accrual.
 *
 * Tiebreak: lowest `id` (stable across replays).
 */
const DETOUR_BUDGET = 2;
const pickMidPostDetour = (
  state: GameState,
  here: TileCoord,
  finalTarget: TileCoord,
): Post | null => {
  // Already on a same-plane unowned mid-POST? That's a "stay put for
  // the hold tick" trigger.
  for (const type of [SOAP_DISH_TYPE, TOWEL_RACK_TYPE, WALL_CRACK_TYPE]) {
    for (const post of postsOfType(state, type)) {
      if (post.owner === 'spider') continue;
      if (post.location.plane !== here.plane) continue;
      if (sameCoord(post.location, here)) return post;
    }
  }
  // When the primary target is cross-plane, `distance(here, finalTarget)`
  // is Infinity (Chebyshev across planes is undefined). In that case
  // any same-plane unowned mid-POST is a strict improvement: the
  // spider needs to walk somewhere on this plane anyway before the
  // engine can resolve a plane transition, so prefer one that flips
  // a POST en route. Pick the closest by Chebyshev with id tiebreak.
  const sameTargetPlane = finalTarget.plane === here.plane;
  const directDist = sameTargetPlane ? distance(here, finalTarget) : 0;
  let best: Post | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const type of [SOAP_DISH_TYPE, TOWEL_RACK_TYPE, WALL_CRACK_TYPE]) {
    for (const post of postsOfType(state, type)) {
      if (post.owner === 'spider') continue;
      // Skip cross-plane posts — Chebyshev distance there is infinite,
      // and the AI's stepToward helper can't bridge planes anyway.
      if (post.location.plane !== here.plane) continue;
      const here2post = distance(here, post.location);
      let score: number;
      if (sameTargetPlane) {
        const post2target = distance(post.location, finalTarget);
        const extra = here2post + post2target - directDist;
        if (extra > DETOUR_BUDGET) continue;
        score = extra;
      } else {
        // Cross-plane primary target: pick the closest same-plane post.
        score = here2post;
      }
      if (best === null || score < bestScore || (score === bestScore && post.id < best.id)) {
        best = post;
        bestScore = score;
      }
    }
  }
  return best;
};

/**
 * Stale-entry weight for the spider's trail-based scans (rec 1.5).
 * The trail carries entries aged 0..3. The spider AI trusts the most
 * recent observation fully and adds 1 phantom tile of distance per
 * turn of staleness; an age-3 entry is treated as 3 tiles farther
 * than its raw Chebyshev distance suggests. This keeps the AI honest
 * (it can't read minds) without making old breadcrumbs useless.
 */
const STALE_PENALTY_PER_TURN = 1;

const trailDistance = (target: TileCoord, entry: SpiderVisibleTrailEntry): number => {
  if (entry.plane !== target.plane) return Number.POSITIVE_INFINITY;
  const dx = Math.abs(entry.x - target.x);
  const dy = Math.abs(entry.y - target.y);
  return Math.max(dx, dy) + STALE_PENALTY_PER_TURN * entry.ageInTurns;
};

/**
 * Closest weighted Chebyshev distance from any ant trail entry to the
 * given coord. Cross-plane is Infinity. Uses pheromone trails (rec
 * 1.5) instead of live ant positions — the spider AI's only sanctioned
 * window into ant locations.
 */
const closestAntDistance = (state: GameState, target: TileCoord): number => {
  const trail = getSpiderVisibleAntTrail(state);
  let best = Number.POSITIVE_INFINITY;
  for (const entry of trail) {
    const d = trailDistance(target, entry);
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
 * Round-4: also exclude `deep-raider`, which has its own dedicated logic
 * (interceptor/raider role, not threat-responder/scout).
 */
function* eligibleSpiders(state: GameState): IterableIterator<Party> {
  for (const party of state.parties.values()) {
    if (party.faction !== 'spider') continue;
    if (party.leaderless) continue;
    if (party.units.length === 0) continue;
    if (party.id === WEB_GUARD) continue;
    if (party.id === DEEP_RAIDER) continue;
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
 * the home-base storm-drain, which starts ant-owned every game.
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
 * Largest non-scout, non-web-guard, non-raider spider party by total
 * slot cost. Deterministic tiebreak by lexical PartyId. Used as the
 * counter-push party when ants dominate the floor.
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
 * Closest non-scout, non-web-guard, non-raider spider responder to
 * `target`. Deterministic tiebreak by lexical PartyId.
 */
const pickResponder = (
  state: GameState,
  scoutId: PartyId | null,
  target: TileCoord,
): Party | null => closestPartyTo(eligibleResponders(state, scoutId), target);

/**
 * Pick the lowest-weighted-distance trail entry on the same plane as
 * `from`. Returns null if no entry exists on that plane. Used as the
 * trail-driven analogue of "closest same-plane ant party". Tiebreak
 * is by lexical PartyId so the choice is deterministic across seed
 * replays.
 */
const closestTrailEntryOnPlane = (
  state: GameState,
  plane: TileCoord['plane'],
  from: TileCoord,
): SpiderVisibleTrailEntry | null => {
  const trail = getSpiderVisibleAntTrail(state);
  let best: { entry: SpiderVisibleTrailEntry; d: number } | null = null;
  for (const entry of trail) {
    if (entry.plane !== plane) continue;
    const d = trailDistance(from, entry);
    if (best === null || d < best.d || (d === best.d && entry.partyId < best.entry.partyId)) {
      best = { entry, d };
    }
  }
  return best?.entry ?? null;
};

/**
 * Closest *trail-derived* ant location to `from` on the same plane.
 * Returns null if no entry exists on that plane. The shape mirrors
 * the live-position helper this replaced (rec 1.5): callers see a
 * Party-shaped result built from the trail's reported partyId/loc, so
 * the existing `chase the closest ant` logic continues to compile.
 */
const closestAntPartyOnPlane = (state: GameState, from: TileCoord): Party | null => {
  const entry = closestTrailEntryOnPlane(state, from.plane, from);
  if (!entry) return null;
  // The spider AI doesn't actually consume the Party-level structure
  // beyond `id` and `location`. We synthesize a stub from the trail —
  // note this *does not* leak live HP/units; the spider AI must treat
  // the trail as a position-only signal.
  const stub: Party = {
    id: entry.partyId,
    faction: 'ant',
    units: [],
    leaderId: '' as Party['leaderId'],
    location: { plane: entry.plane, x: entry.x, y: entry.y },
    orders: [],
    posture: 'fight',
    strategyModifiers: [],
    jellyDoses: 0,
    leaderless: false,
  };
  return stub;
};

/**
 * Closest trail entry on a specific plane, returned with its derived
 * location. Used by the deep-raider's interceptor logic — it needs
 * to pick the door tile on the touching plane.
 */
const closestAntOnPlane = (
  state: GameState,
  plane: TileCoord['plane'],
): { party: Party; loc: TileCoord } | null => {
  // Pick the freshest entry on the plane (age 0 first, then by lex
  // partyId). Distance from "any reference" doesn't matter here — the
  // raider just wants to know if there's *anyone* recently sighted.
  const trail = getSpiderVisibleAntTrail(state);
  let best: SpiderVisibleTrailEntry | null = null;
  for (const entry of trail) {
    if (entry.plane !== plane) continue;
    if (
      best === null ||
      entry.ageInTurns < best.ageInTurns ||
      (entry.ageInTurns === best.ageInTurns && entry.partyId < best.partyId)
    ) {
      best = entry;
    }
  }
  if (!best) return null;
  const loc: TileCoord = { plane: best.plane, x: best.x, y: best.y };
  const stub: Party = {
    id: best.partyId,
    faction: 'ant',
    units: [],
    leaderId: '' as Party['leaderId'],
    location: loc,
    orders: [],
    posture: 'fight',
    strategyModifiers: [],
    jellyDoses: 0,
    leaderless: false,
  };
  return { party: stub, loc };
};

/**
 * Take one step from `from` toward `target` along the larger axis (Chebyshev
 * step), clamped to the 0-9 board. Stays on the same plane — callers that
 * need plane-jumping should use a higher-level pathfinder. Used by the
 * counter-push pusher (step toward storm-drain), the spiderling chase
 * (step toward closest ant), and the deep-raider patrol (step toward
 * door tile or chase target) so the same helper drives every kind of
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
  // Round 29 — mid-POST capture detour. If there's a soap-dish or
  // towel-rack on the same plane that's only ≤ 2 tiles off the
  // primary route, divert to it first to capture (round-17 hold
  // mechanic). Once the spider OWNS the POST it earns the round-28
  // POST bonus (+1/+1 capped) and the ant POST bonus is denied —
  // a real swing in baseline win rate. After the flip the existing
  // soap-dish-then-towel-rack chain takes over.
  // Pick the primary target the way the legacy logic did, then ask
  // the detour helper if a better intermediate sits within budget.
  const primaryTarget = allPostsOfTypeOwnedByAnt(state, SOAP_DISH_TYPE)
    ? requireFirstPostOfType(state, TOWEL_RACK_TYPE)
    : soapLoc;
  const detour = pickMidPostDetour(state, party.location, primaryTarget);
  if (detour !== null) {
    if (sameCoord(party.location, detour.location)) return [];
    return [moveTo(detour.location)];
  }
  if (sameCoord(party.location, primaryTarget)) return [];
  if (distance(party.location, primaryTarget) <= 1) return [];
  return [moveTo(primaryTarget)];
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

/**
 * Decide where the deep-raider should head this turn.
 *
 * Priority:
 *   1. Already off-wall (descended to floor or ceiling) → drive at the
 *      closest same-plane ant. Once committed, the raider engages
 *      whatever it can reach; if no ants on the current plane, drive
 *      to the storm-drain (floor) or back to home (ceiling).
 *   2. Same-plane (east-wall) ant within Chebyshev 3 → chase it.
 *   3. Floor ant within Chebyshev 3 of the floor door (9, 5) → step
 *      toward east-wall (5, 9), then through the edge to the floor.
 *   4. Ceiling ant within Chebyshev 3 of the ceiling door (9, 5) → step
 *      toward east-wall (5, 0), then through the edge to the ceiling.
 *   5. Otherwise: proactive descent. Drive on the floor door so the
 *      raider becomes a permanent second front pressuring the storm-
 *      drain column from the wall.
 *
 * Note: once the raider is at a door tile (5, 9) or (5, 0), issuing a
 * move-to order targeted at the off-plane ant tile triggers the
 * engine's `tryPlaneTransition` → edge-adjacency path and the raider
 * steps across in a single tile of allowance.
 */
const decideRaiderTarget = (state: GameState): TileCoord => {
  const here = state.parties.get(DEEP_RAIDER)?.location ?? RAIDER_HOME;

  // 1. Already descended off the east-wall → engage closest same-plane ant.
  if (here.plane !== 'east-wall') {
    const sameAnt = closestAntPartyOnPlane(state, here);
    if (sameAnt !== null) return sameAnt.location;
    // No ants here; drive toward storm-drain (floor) or home (ceiling).
    if (here.plane === 'floor') return { plane: 'floor', x: 0, y: 0 };
    return RAIDER_HOME;
  }

  // 2. Same-plane chase: any ant on east-wall within Chebyshev 3.
  const wallAnt = closestAntPartyOnPlane(state, here);
  if (wallAnt !== null && distance(here, wallAnt.location) <= RAIDER_DETECT) {
    return wallAnt.location;
  }

  // 3. Floor approach: ant within radius 3 of floor (9, 5) — the tile
  //    that maps to east-wall (5, 9) via edge adjacency.
  const floorDoorTarget: TileCoord = { plane: 'floor', x: 9, y: 5 };
  const floorAnt = closestAntOnPlane(state, 'floor');
  if (floorAnt !== null && distance(floorDoorTarget, floorAnt.loc) <= RAIDER_DETECT) {
    if (sameCoord(here, RAIDER_FLOOR_DOOR)) return floorAnt.loc;
    return RAIDER_FLOOR_DOOR;
  }

  // 4. Ceiling approach: ant within radius 3 of ceiling (9, 5) — the
  //    tile that maps to east-wall (5, 0) via edge adjacency.
  const ceilingDoorTarget: TileCoord = { plane: 'ceiling', x: 9, y: 5 };
  const ceilingAnt = closestAntOnPlane(state, 'ceiling');
  if (ceilingAnt !== null && distance(ceilingDoorTarget, ceilingAnt.loc) <= RAIDER_DETECT) {
    if (sameCoord(here, RAIDER_CEILING_DOOR)) return ceilingAnt.loc;
    return RAIDER_CEILING_DOOR;
  }

  // 5. Proactive descent: walk the raider to the floor door from turn 1
  //    onward to drop into the storm-drain column. This forces the
  //    raider onto the field as a permanent second front.
  return RAIDER_FLOOR_DOOR;
};

/**
 * Round 8 — opportunistic hypnotize target selection.
 *
 * Returns the best (highest-value) co-located neutral party that is
 * NOT already hypnotized AND NOT in the rebound immunity window.
 * Returns null if no eligible target.
 *
 * "Co-located" means the spider party's tile equals the neutral's
 * tile (no walking required). The AI never goes out of its way for a
 * hypnosis; it's pure opportunity grabbing.
 */
const pickHypnotizeTarget = (state: GameState, spider: Party): Party | null => {
  let best: { party: Party; value: number } | null = null;
  for (const candidate of state.parties.values()) {
    if (candidate.faction !== 'neutral') continue;
    if (!sameCoord(candidate.location, spider.location)) continue;
    if (candidate.units.every((u) => u.currentHp <= 0)) continue;
    const status = state.neutralStatus.get(candidate.id);
    if (!status) continue;
    if (status.hypnotizedBy === 'spider') continue;
    if (status.spiderImmunityRemaining > 0) continue;
    const value = NEUTRAL_VALUE[status.kind] ?? 0;
    // Round 9 — skip any neutral whose ranked value is <= 0. This
    // hard-filters stinkbugs (value 0) so a co-located spider never
    // attempts a cast whose miss spawns a damage zone it then has to
    // walk through.
    if (value <= 0) continue;
    if (
      best === null ||
      value > best.value ||
      (value === best.value && candidate.id < best.party.id)
    ) {
      best = { party: candidate, value };
    }
  }
  return best?.party ?? null;
};

/** Round 8 — leader currentHp gate. Hypnotize halves caster HP, so
 * we require the leader (chosen caster) to be above
 * HYPNOTIZE_MIN_HP. */
const casterHealthyEnough = (party: Party): boolean => {
  const leader = party.units.find((u) => u.id === party.leaderId);
  if (!leader || leader.currentHp <= 0) return false;
  return leader.currentHp > HYPNOTIZE_MIN_HP;
};

/**
 * Round-23 placement (spider side). With 5 spider parties the engine
 * cap is ⌊5/2⌋ = 2 movable. We commit:
 *   - deep-raider at floor (8, 3): pulled BACK from round-9's (7, 3).
 *     Round 22's diversity gate showed rush at 39% and flank at 40%
 *     (both at/below the 40% diversity floor). Rush travels through
 *     floor (3, 3) → (5, 0); flank uses the ceiling (5, 5) and (9, 5)
 *     waypoints. The raider at (7, 3) sat one tile diagonally off
 *     rush's vanguard-bravo (3, 3) staging path and could intercept
 *     within 2 turns. Stepping it east one column to (8, 3) keeps it
 *     on the spider half of the floor and still in the storm-drain
 *     column for `decideRaiderTarget`'s forward-pressure path, while
 *     putting one extra tile of buffer between the raider and rush's
 *     (3-5, 0-3) breakout zone. Net effect: rush/flank get back a
 *     hair of breathing room on turns 1-2, restoring the diversity
 *     floor without abandoning mid-board pressure.
 *   - silk-line at ceiling (7, 7): unchanged from round 7. Forward
 *     of (9, 8) toward the storm-drain column on the ceiling —
 *     silk-line's per-turn logic already pushes toward storm-drain
 *     on turn 2, so this saves a turn of approach without changing
 *     behavior.
 * web-guard intentionally stays at the spider-web (queen).
 */
const spiderL1Placement = (state: GameState): GameState =>
  spiderPlacement(state, {
    'deep-raider': { plane: 'floor', x: 8, y: 3 },
    'silk-line': { plane: 'ceiling', x: 7, y: 7 },
  });

/**
 * Round 16 — set of spider party ids that never queue a threat-flee.
 * web-guard carries the queen and must hold ground; deep-raider's
 * interceptor role outranks self-preservation (its placement is the
 * tactical commitment). All other spider parties (silk-line, advance-
 * scout, pursuer, spiderlings) are eligible.
 */
const SPIDER_FLEE_EXEMPT: ReadonlySet<PartyId> = new Set<PartyId>([WEB_GUARD, DEEP_RAIDER]);

export const spiderL1: AIPolicy = {
  name: 'spider-l1',
  faction: 'spider',
  placement: spiderL1Placement,
  decide(state: GameState, _scenario: ScenarioData, rng: Rng): GameState {
    // Fork an unused stream so future tiebreak randomness can plug in without
    // shifting other subsystems' entropy. (Currently all tiebreaks are by id.)
    rng.fork('spider-l1-tiebreak');
    // Round 16 — separate fork for the threat-flee dice. Independent
    // of every other subsystem's entropy so replays remain
    // deterministic when other features grow.
    const threatRng = rng.fork('threat-flee');
    const pendingEvents: ReplayEvent[] = [];

    const webLoc = requirePost(state, SPIDER_WEB);
    const stormDrainLoc = requirePost(state, STORM_DRAIN);
    const soapLoc = requireFirstPostOfType(state, SOAP_DISH_TYPE);
    const counterPushTargetLoc = stormDrainLoc;
    const silkPushTargetLoc = requireFirstPostOfType(state, WALL_CRACK_TYPE);
    const threat = decideThreat(state);

    const scout = pickScout(state);
    const responderTarget = threat.defend ?? webLoc;
    const responder = pickResponder(state, scout?.id ?? null, responderTarget);

    // Phase-3 pursuit: once we're past the early rush window, look for
    // an ant party at < 50% effective HP. If found, the closest non-
    // queen-bearing non-scout/non-raider spider is redirected to pursue
    // it. The POST-ownership gate is >= 2.
    //
    // Position lookup uses the pheromone trail (rec 1.5) — the ant
    // party's *most recent* breadcrumb (lowest `ageInTurns`) stands in
    // for live position. HP fraction stays as the trigger because the
    // spider AI's "is this party hurt?" signal is preserved by spec
    // (rec 1.5 only constrains *position* visibility, not full state).
    let pursueTarget: { antPartyId: PartyId; loc: TileCoord } | null = null;
    // Round 23 — looser pursuit gate. The cumulative drift through r22
    // had baseline at 67% — over the 65% band. Spider damage parity is
    // venom-blast (r22, pre-battle, 4 dmg/unit/rank), but it only fires
    // when a battle actually happens. To raise venom-blast fire rate
    // without buffing any unit stats, we widen the pursuit window: the
    // pursuit gate now fires from turn 3 onward (was turn 4) with the
    // first ant POST flip (was 2 POSTs), and the wounded-ant fraction
    // threshold rises to < 0.65 (was < 0.5). The result: more ant
    // parties qualify as pursuit targets earlier, so a non-scout spider
    // spends fewer turns idle and more turns engaging — and every
    // engagement is a venom-blast firing opportunity.
    if (state.turn >= 3 && antControlledPostCount(state) >= 1) {
      const trail = getSpiderVisibleAntTrail(state);
      const freshestByParty = new Map<PartyId, SpiderVisibleTrailEntry>();
      for (const entry of trail) {
        const prior = freshestByParty.get(entry.partyId);
        if (!prior || entry.ageInTurns < prior.ageInTurns)
          freshestByParty.set(entry.partyId, entry);
      }
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
        if (frac >= 0.65) continue;
        const fresh = freshestByParty.get(party.id);
        if (!fresh) continue; // No trail yet (turn 0); skip pursuit.
        const trailLoc: TileCoord = { plane: fresh.plane, x: fresh.x, y: fresh.y };
        if (!weakest || frac < weakest.hpFrac) {
          weakest = { partyId: party.id, hpFrac: frac, loc: trailLoc };
        }
      }
      if (weakest) pursueTarget = { antPartyId: weakest.partyId, loc: weakest.loc };
    }
    const pursuer =
      pursueTarget !== null ? pickResponder(state, scout?.id ?? null, pursueTarget.loc) : null;

    // Counter-push: aggressive 1-POST gate (round-3). The largest non-
    // scout/non-raider spider breaks formation toward storm-drain on
    // the first POST flip.
    const counterPushActive = antControlledPostCount(state) >= ANT_DOMINANCE_THRESHOLD;
    const pusher = counterPushActive ? pickPusher(state, scout?.id ?? null) : null;

    // Silk-line early counter-push: when ants own >=1 POST AND turn >= 3,
    // silk-line pushes wall-crack.
    const silkEarlyPushActive =
      !counterPushActive && state.turn >= 3 && antControlledPostCount(state) >= 1;

    // Silk-line turn-2 raid: walk toward storm-drain unconditionally.
    const silkRaidActive = state.turn >= 2;

    // Round-4 deep-raider target.
    const raiderTargetLoc = decideRaiderTarget(state);

    // Phase-2 ability triggers — emit once on a specific turn so the
    // engine's `uses: 1` envelopes are respected without per-unit
    // bookkeeping in the AI:
    //   turn 2 — silk-line spins a web on its current wall tile.
    //   turn 3 — web-guard spawns spiderlings as separate parties.
    //   turn 3 — deep-raider spins a web on east-wall (combined with move).
    const spiderlingsAlreadySpawned = [...state.parties.keys()].some((pid) =>
      pid.startsWith('spiderling-'),
    );

    // Round 25 — commander cards (mechanics memo §1.3). The web-guard
    // hosts the spider faction's card buy / play orders. Computed
    // once per turn so the buy/play targets see consistent state.
    const spiderBuyOrder = buyCardOrderFor(state, 'spider');
    const spiderPlayOrder = playCardOrderFor(state, 'spider');

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

      // Round 8 — opportunistic hypnotize. If this spider party is
      // co-located with an eligible (non-hypnotized, non-rebound)
      // neutral and the caster is healthy enough to survive the
      // half-HP cost, issue a hypnotize use-ability. The order goes
      // alongside (in front of) whatever the rest of the policy
      // decides; resolveAbilityOrders will fire abilities before
      // movement.
      const hypnoTarget = casterHealthyEnough(party) ? pickHypnotizeTarget(state, party) : null;
      const hypnoOrders: readonly Order[] = hypnoTarget
        ? [{ kind: 'use-ability', abilityId: HYPNOTIZE, target: hypnoTarget.id }]
        : [];

      let nextOrders: readonly Order[];
      // Round 29 — blitz-mode override (mechanics memo §1.7). When the
      // per-scenario 5% coin flip lands true, every non-queen-guard
      // spider party (silk-line, deep-raider, advance-scout, counter-
      // push pusher, spiderlings) marches DIRECTLY toward the storm-
      // drain. Web-guard still fires web-mend / venom-blast pre-battle
      // and stays at the web. No POST-capture detours, no patrols, no
      // pursuit — just one objective: kill the ant queen.
      if (state.spiderBlitzMode === true && id !== WEB_GUARD) {
        // Cross-plane: emit the off-plane target directly so the
        // engine's edge-adjacency path resolves it; same-plane: step
        // toward storm-drain along the Chebyshev gradient.
        let moveOrders: readonly Order[];
        if (party.location.plane === stormDrainLoc.plane) {
          const stepped = stepToward(party.location, stormDrainLoc);
          moveOrders = sameCoord(party.location, stepped) ? [] : [moveTo(stepped)];
        } else {
          moveOrders = [moveTo(stormDrainLoc)];
        }
        nextOrders = [...hypnoOrders, ...moveOrders];
        nextParties.set(id, { ...party, orders: nextOrders });
        continue;
      }
      // Spiderling chase: step toward the closest same-plane ant party
      // every turn. A pointed swarm is a real flanking threat.
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
        const moveOrders = sameCoord(party.location, target) ? [] : [moveTo(target)];
        nextOrders = [...hypnoOrders, ...moveOrders];
        nextParties.set(id, { ...party, orders: nextOrders });
        continue;
      }
      // Priority order: deep-raider (with optional turn-3 spin-web combo);
      // web-guard ability fire (turn 3); silk-line ability fire (turn 2);
      // web-guard hold; counter-push pusher; silk-line early-push (wall-
      // crack); silk-line turn-2 raid (storm-drain); pursuit; on-web
      // hold; scout; patrol/threat.
      if (id === DEEP_RAIDER) {
        // Compute move step toward the chosen target.
        const moveOrders: Order[] = [];
        if (party.location.plane === raiderTargetLoc.plane) {
          if (!sameCoord(party.location, raiderTargetLoc)) {
            const stepped = stepToward(party.location, raiderTargetLoc);
            if (!sameCoord(party.location, stepped)) moveOrders.push(moveTo(stepped));
          }
        } else {
          // Cross-plane: emit the off-plane target directly; engine's
          // edge-adjacency path resolves it.
          moveOrders.push(moveTo(raiderTargetLoc));
        }
        // Turn-3 combo: spin-web on the current east-wall tile + move.
        // The engine resolves abilities before movement, so the web
        // lands on the tile we're leaving and the step still fires.
        // The spinner has uses:1, so emitting in subsequent turns is
        // a no-op — the order list just drops the unused ability.
        if (state.turn === 3 && party.location.plane === 'east-wall') {
          nextOrders = [{ kind: 'use-ability', abilityId: 'spin-web' as AbilityId }, ...moveOrders];
        } else {
          nextOrders = moveOrders;
        }
      } else if (id === WEB_GUARD && state.turn === 3 && !spiderlingsAlreadySpawned) {
        nextOrders = [{ kind: 'use-ability', abilityId: 'spawn-spiderlings' as AbilityId }];
      } else if (id === SILK_LINE && state.turn === 2) {
        nextOrders = [{ kind: 'use-ability', abilityId: 'spin-web' as AbilityId }];
      } else if (id === WEB_GUARD) {
        // Round 18 — heal-priority. When ants threaten the spider-web
        // (within Chebyshev HEAL_TRIGGER_RADIUS on the ceiling, or on
        // the floor at the web's (x, y) column) AND web-guard is
        // meaningfully wounded, fire `web-mend`. Otherwise hold
        // position. This intentionally does NOT change web-guard's
        // tile — the queen bearer stays on the web; only her ability
        // use changes.
        //
        // Round 23 — tightened HP-fraction gate from < 1.0 to <
        // WEB_MEND_HP_THRESHOLD (0.8). Web-mend is a tier-2 cast on
        // the queen, and venom-blast is also tier-2. The queen carries
        // 2 tier-2 slots per scenario, so every web-mend at 99% HP
        // burns one slot that could have gone to a venom-blast (4
        // dmg/unit/rank pre-battle). Holding the heal until the queen
        // is at < 80% effective HP preserves the second tier-2 slot
        // for the next battle's venom-blast firing.
        const healThreat = isWebUnderHealThreat(state, webLoc);
        const hpFrac = livingHpFraction(party, state.unitTemplates);
        if (healThreat && hpFrac > 0 && hpFrac < WEB_MEND_HP_THRESHOLD) {
          nextOrders = [{ kind: 'use-ability', abilityId: WEB_MEND }];
        } else {
          nextOrders = [];
        }
      } else if (pusher !== null && id === pusher.id) {
        const stepped = stepToward(party.location, counterPushTargetLoc);
        nextOrders = sameCoord(party.location, stepped) ? [] : [moveTo(stepped)];
      } else if (
        silkEarlyPushActive &&
        id === SILK_LINE &&
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
        // Round 29 — mid-POST detour. While walking to storm-drain
        // pick up any unowned mid-POST that's only ≤ 2 tiles off the
        // direct route. The 2-turn hold (round 17) pauses silk-line
        // on the POST tile; once flipped, the round-28 +1/+1 bonus
        // is denied to ants and the raid resumes its storm-drain
        // approach. The detour helper returns null when nothing's
        // worthwhile; the legacy direct-step path runs in that case.
        const detour = pickMidPostDetour(state, party.location, stormDrainLoc);
        if (detour !== null) {
          if (sameCoord(party.location, detour.location)) {
            // Already on the POST — hold for the capture tick.
            nextOrders = [];
          } else {
            const stepped = stepToward(party.location, detour.location);
            nextOrders = sameCoord(party.location, stepped) ? [] : [moveTo(stepped)];
          }
        } else {
          const stepped = stepToward(party.location, stormDrainLoc);
          nextOrders = sameCoord(party.location, stepped) ? [] : [moveTo(stepped)];
        }
      } else if (pursuer !== null && id === pursuer.id && pursueTarget !== null) {
        nextOrders = sameCoord(party.location, pursueTarget.loc) ? [] : [moveTo(pursueTarget.loc)];
      } else if (isOnWeb(party, webLoc)) {
        nextOrders = [];
      } else if (id === scout?.id) {
        nextOrders = ordersForScout(state, party, soapLoc);
      } else {
        const isResponder = responder !== null && id === responder.id;
        nextOrders = ordersForPatrolOrThreat(party, threat.defend, webLoc, isResponder);
      }

      // Round 25 — commander cards (mechanics memo §1.3). Prepend
      // the spider faction's buy / play card orders to the web-
      // guard's queue. Other spider parties don't host the cards
      // (the orders are faction-level; one host is enough). Buy
      // before play so a buy-and-immediately-play in the same turn
      // works.
      const cardOrders: readonly Order[] =
        id === WEB_GUARD
          ? [
              ...(spiderBuyOrder ? [spiderBuyOrder] : []),
              ...(spiderPlayOrder ? [spiderPlayOrder] : []),
            ]
          : [];
      // Prepend any opportunistic hypnotize order so the engine fires
      // it (resolveAbilityOrders runs before movement).
      const ordersWithHypno: readonly Order[] = [...cardOrders, ...hypnoOrders, ...nextOrders];
      // Round 15 — HP-threshold flee. Queen-guard (web-guard) and
      // deep-raider stay put; web-guard never flees (queen), and
      // deep-raider's interceptor role outranks self-preservation.
      // Spiderlings and silk-line / advance-scout / pursuit lines all
      // can flee. The flee order is prepended so the engine handles
      // it during battle resolution.
      const wantsFlee =
        id !== WEB_GUARD && id !== DEEP_RAIDER && spiderShouldFlee(party, state.unitTemplates);
      const ordersAfterLowHp: readonly Order[] = wantsFlee
        ? [FLEE_ORDER, ...ordersWithHypno]
        : ordersWithHypno;
      if (wantsFlee) pendingEvents.push(lowHpFleeEvent(state, party));
      // Round 16 — pre-battle threat assessment. Predict an unwinnable
      // collision this turn and prepend a flee order with probability
      // scaled to the matchup. Skipped for SPIDER_FLEE_EXEMPT (web-
      // guard, deep-raider) and when a flee order is already in the
      // list (the round-15 trigger fired above, or some other path).
      const threatFlee = computeThreatFlee(state, party, ordersAfterLowHp, threatRng, {
        exempt: SPIDER_FLEE_EXEMPT,
      });
      if (threatFlee.event) pendingEvents.push(threatFlee.event);
      nextParties.set(id, { ...party, orders: threatFlee.orders });
    }

    const next: GameState = { ...state, parties: nextParties };
    return appendPolicyEvents(next, pendingEvents);
  },
};
