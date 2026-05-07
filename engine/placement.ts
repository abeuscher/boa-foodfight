/**
 * Pre-game advance troop placement (round 7 feature 2).
 *
 * Both AI policies get a chance to reposition their parties before turn
 * 1. The engine validates each requested move against per-faction rules
 * and silently reverts invalid placements so a buggy AI can't break
 * scenario invariants:
 *
 *   Spider faction:
 *     - May move up to ⌊N/2⌋ parties (any subset). N is the number of
 *       spider parties in the initial state.
 *     - Each repositioned party may land on ANY tile of ANY plane that
 *       is NOT a POST tile and NOT an obstacle tile.
 *     - The choice of *which* parties moved is preserved by stable
 *       PartyId iteration: when more than ⌊N/2⌋ parties are moved, the
 *       first ⌊N/2⌋ in lexical order are kept; the rest revert.
 *
 *   Ant faction:
 *     - May move ANY parties EXCEPT `queen-guard` (the ant queen is
 *       immobile per the design memo; the queen-guard stays at storm-
 *       drain). No cap on the number of ant parties moved.
 *     - Each repositioned party must land on a `floor`-plane tile
 *       within Chebyshev radius 5 of the storm-drain (floor 0,0).
 *     - Tile must NOT be a POST tile and NOT an obstacle tile.
 *
 * Both factions' final placements are visible (no hidden info). The
 * scenario-start replay event records the FINAL post-placement
 * positions so replays remain self-contained.
 *
 * Determinism: the helper itself does not consume any RNG. AI policies
 * may use the rng they're passed (their fork), but the engine-side
 * validation is deterministic given identical input states.
 */

import { coordKey, distance, sameCoord } from './coord.ts';
import type { ScenarioData } from './state.ts';
import type { Faction, GameState, Party, PartyId, Plane, Post, TileCoord } from './types.ts';

/** Storm-drain tile: floor (0, 0). Hardcoded reference for the ant
 * placement radius rule. */
const STORM_DRAIN_TILE: TileCoord = { plane: 'floor', x: 0, y: 0 };

/** Chebyshev radius around storm-drain within which ants may place
 * parties. Tuned for the design memo: large enough to enable real
 * forward-staging, small enough that aggressive placement still has
 * to walk the chain. */
const ANT_PLACEMENT_RADIUS = 5;

/** The ant queen-bearing party. Immobile by spec — placement attempts
 * targeting it are rejected. */
const ANT_QUEEN_PARTY: PartyId = 'queen-guard' as PartyId;

const planeIs = (plane: Plane, kind: Plane): boolean => plane === kind;

/**
 * True iff the named coordinate is occupied by a POST in the state's
 * post map. POSTs anchor the capture chain; placement on top of one
 * would defeat the spawn-on-POST scoring rules.
 */
const isPostTile = (coord: TileCoord, posts: ReadonlyMap<unknown, Post>): boolean => {
  for (const post of posts.values()) {
    if (sameCoord(post.location, coord)) return true;
  }
  return false;
};

/** True iff the tile is on the `obstacle` terrain kind (impassable map
 * tile). Movement-cost-wise these are also blocked at runtime; rejecting
 * them here keeps AI placements walkable. */
const isObstacleTile = (coord: TileCoord, state: GameState): boolean => {
  const tile = state.tiles.get(coordKey(coord));
  if (!tile) return true;
  return tile.terrain.kind === 'obstacle';
};

/**
 * Validate an ant placement. Rules:
 *   - Party must NOT be the ant queen-guard.
 *   - Destination plane must be `floor`.
 *   - Destination tile must be within Chebyshev radius 5 of storm-drain.
 *   - Destination must not be a POST tile.
 *   - Destination must not be an obstacle tile.
 *
 * Same-position (no actual move) is treated as valid — a no-op
 * placement is harmless.
 */
export const validateAntPlacement = (
  party: Party,
  before: TileCoord,
  proposed: TileCoord,
  state: GameState,
  _scenario: ScenarioData,
): boolean => {
  if (party.faction !== 'ant') return false;
  if (sameCoord(before, proposed)) return true;
  if (party.id === ANT_QUEEN_PARTY) return false;
  if (!planeIs(proposed.plane, 'floor')) return false;
  if (distance(STORM_DRAIN_TILE, proposed) > ANT_PLACEMENT_RADIUS) return false;
  if (isPostTile(proposed, state.posts)) return false;
  if (isObstacleTile(proposed, state)) return false;
  return true;
};

/**
 * Validate a spider placement. Rules:
 *   - Destination must not be a POST tile.
 *   - Destination must not be an obstacle tile.
 *   - Any plane is allowed.
 *
 * The ⌊N/2⌋ party-count cap is enforced separately (see
 * `applyPlacement`).
 */
export const validateSpiderPlacement = (
  party: Party,
  before: TileCoord,
  proposed: TileCoord,
  state: GameState,
  _scenario: ScenarioData,
): boolean => {
  if (party.faction !== 'spider') return false;
  if (sameCoord(before, proposed)) return true;
  if (isPostTile(proposed, state.posts)) return false;
  if (isObstacleTile(proposed, state)) return false;
  return true;
};

/**
 * Compose `before` (roster-position) state with `after` (policy-
 * proposed) state for a single faction, validating each diff. Returns
 * a new GameState with valid moves applied; invalid moves silently
 * revert to the `before` party position.
 *
 * For the spider faction the ⌊N/2⌋ party-count cap is applied: if the
 * policy moved more than half the parties, only the first ⌊N/2⌋ in
 * lexical PartyId order are accepted.
 */
export const applyPlacement = (
  faction: Faction,
  before: GameState,
  after: GameState,
  scenario: ScenarioData,
): GameState => {
  // Build map of moved parties for this faction in stable lexical
  // order. `moved` means the location differs.
  const movedIds: PartyId[] = [];
  for (const id of [...after.parties.keys()].sort()) {
    const beforeParty = before.parties.get(id);
    const afterParty = after.parties.get(id);
    if (!beforeParty || !afterParty) continue;
    if (beforeParty.faction !== faction) continue;
    if (sameCoord(beforeParty.location, afterParty.location)) continue;
    movedIds.push(id);
  }

  // Spider cap: ⌊N/2⌋ where N = total spider parties in the initial
  // state. Trim the moved-list (lex order) to the first cap entries.
  let allowedIds = movedIds;
  if (faction === 'spider') {
    let totalSpiderParties = 0;
    for (const party of before.parties.values()) {
      if (party.faction === 'spider') totalSpiderParties += 1;
    }
    const cap = Math.floor(totalSpiderParties / 2);
    allowedIds = movedIds.slice(0, cap);
  }

  const allowedSet = new Set<PartyId>(allowedIds);
  const nextParties = new Map<PartyId, Party>(before.parties);
  for (const id of movedIds) {
    const beforeParty = before.parties.get(id);
    const afterParty = after.parties.get(id);
    if (!beforeParty || !afterParty) continue;
    if (!allowedSet.has(id)) continue; // over-cap; revert
    const valid =
      faction === 'ant'
        ? validateAntPlacement(
            beforeParty,
            beforeParty.location,
            afterParty.location,
            before,
            scenario,
          )
        : validateSpiderPlacement(
            beforeParty,
            beforeParty.location,
            afterParty.location,
            before,
            scenario,
          );
    if (!valid) continue; // invalid; revert
    nextParties.set(id, { ...beforeParty, location: afterParty.location });
  }
  return { ...before, parties: nextParties };
};
