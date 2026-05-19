/**
 * Round 17 — POST hold capture mechanic.
 *
 * Replaces the round-1 instant-capture rule (`resolveCaptures` in
 * `engine/posts.ts`) with a 2-turn hold. A non-owner faction's party
 * walking onto a capturable POST starts a capture; the capture
 * progresses one tick per end-of-turn while at least one capturing-
 * faction party is co-located alone (no enemy party). Aborting (the
 * capturer leaves the tile without an enemy present) resets the POST
 * to neutral — the user's directive that mid-capture failures strip
 * prior ownership. Storm-drain is excluded from the mechanic
 * (faction-locked); spider-web supports capture (the ant win
 * condition).
 *
 * Determinism: no RNG. Capture progresses purely from movement +
 * battle resolution. POSTs are scanned in the same key order as
 * `state.posts` (preserves insertion order from `engine/state.ts`).
 *
 * The single public entry point `resolvePostCapture` is meant to
 * replace the round-1 `resolveCaptures` call inside `engine/turn.ts`.
 * It runs once per turn AFTER movement + battle resolution and BEFORE
 * end-of-turn (so a successful flip is visible to the win-check in
 * `endOfTurn.checkWinner`).
 */

import { sameCoord } from './coord.ts';
import { setPostOwner } from './posts.ts';
import type { Faction, GameState, Post, PostId, ReplayEvent } from './types.ts';

/** POST id excluded from the round-17 hold mechanic (faction-locked). */
const STORM_DRAIN_POST_ID = 'storm-drain' as PostId;

/** Hold duration (in end-of-turn ticks) for a fresh capture. */
export const POST_CAPTURE_TURNS = 2;

export interface PostCaptureOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

interface FactionsAtPost {
  readonly factions: ReadonlySet<Faction>;
  readonly capturerPresent: boolean;
}

/**
 * Inspect parties standing on `post`'s tile. Returns the set of
 * non-neutral factions present (with at least one living unit) and a
 * bool indicating whether the existing `capturingFaction` is among
 * them.
 */
const inspectPostOccupants = (state: GameState, post: Post): FactionsAtPost => {
  const factions = new Set<Faction>();
  let capturerPresent = false;
  for (const party of state.parties.values()) {
    if (!sameCoord(party.location, post.location)) continue;
    if (!party.units.some((u) => u.currentHp > 0)) continue;
    if (party.faction === 'neutral') continue;
    factions.add(party.faction);
    if (post.capturingFaction !== null && party.faction === post.capturingFaction) {
      capturerPresent = true;
    }
  }
  return { factions, capturerPresent };
};

/** Replace `postId` in state with a transformed copy. */
const updatePost = (state: GameState, postId: PostId, next: Post): GameState => {
  const map = new Map(state.posts);
  map.set(postId, next);
  return { ...state, posts: map };
};

/** Clear capture state on `post` (no event side-effect). */
const clearedCapture = (post: Post): Post => ({
  ...post,
  capturingFaction: null,
  captureTurnsRemaining: null,
});

/**
 * Capture trigger — for every POST that has at least one non-friendly
 * non-neutral faction party on it, start (or swap) a capture for the
 * appropriate faction. Reinforcing (same-faction-as-capturer) arrivals
 * are a no-op. Storm-drain is excluded.
 *
 * "Friendly" here means matching the POST's current `owner`. A party
 * stepping onto a POST owned by its own faction is a no-op even if a
 * prior capture was in progress (e.g., its own faction's capture was
 * already winding down). Such a case is unreachable because a POST
 * owned by faction F never has `capturingFaction === F`.
 */
const applyCaptureTriggers = (state: GameState, tick: () => number): PostCaptureOutcome => {
  const events: ReplayEvent[] = [];
  let working = state;
  for (const [postId, post] of state.posts) {
    if (postId === STORM_DRAIN_POST_ID) continue;
    const { factions } = inspectPostOccupants(working, post);
    // No non-neutral occupants, or both factions present → trigger
    // logic doesn't fire here. (Both-factions present causes the tick
    // to pause; doesn't change capture identity.)
    if (factions.size !== 1) continue;
    const [presentFaction] = factions;
    if (presentFaction === undefined) continue;
    if (presentFaction === post.owner) continue;
    if (post.capturingFaction === presentFaction) continue;
    // Start (or swap) a capture for `presentFaction`. The previous
    // owner remains the `owner` field until the hold completes — the
    // event records who is being displaced.
    const fromOwner: Faction = post.owner;
    const next: Post = {
      ...post,
      capturingFaction: presentFaction,
      captureTurnsRemaining: POST_CAPTURE_TURNS,
    };
    working = updatePost(working, postId, next);
    events.push({
      kind: 'post-capture-started',
      turn: state.turn,
      tick: tick(),
      postId,
      capturingFaction: presentFaction,
      fromOwner,
    });
  }
  return { state: working, events };
};

/**
 * End-of-turn capture tick — for every POST with an in-progress
 * capture: if both factions are co-located, pause (no decrement); if
 * only the capturing faction is present, decrement and possibly flip
 * ownership; if the capturer is gone, abort and reset owner to
 * neutral. Storm-drain is excluded by the trigger step (it never
 * carries `capturingFaction`).
 */
const applyCaptureTick = (state: GameState, tick: () => number): PostCaptureOutcome => {
  const events: ReplayEvent[] = [];
  let working = state;
  for (const [postId, post] of state.posts) {
    if (post.capturingFaction === null) continue;
    if (post.captureTurnsRemaining === null) continue;
    const { factions, capturerPresent } = inspectPostOccupants(working, post);
    const enemyPresent = [...factions].some((f) => f !== post.capturingFaction);

    // Both factions co-located → pause: no decrement, no abort.
    if (capturerPresent && enemyPresent) continue;

    // Capturer absent → abort. Reset owner to neutral per spec.
    if (!capturerPresent) {
      const previousOwner: Faction = post.owner;
      let next: Post = clearedCapture(post);
      // Strip prior ownership (only if the post wasn't already neutral).
      if (post.owner !== 'neutral') {
        next = { ...next, owner: 'neutral' };
      }
      working = updatePost(working, postId, next);
      events.push({
        kind: 'post-capture-aborted',
        turn: state.turn,
        tick: tick(),
        postId,
        previousOwner,
      });
      continue;
    }

    // Only the capturing faction present → decrement.
    const remaining = post.captureTurnsRemaining - 1;
    if (remaining > 0) {
      const next: Post = { ...post, captureTurnsRemaining: remaining };
      working = updatePost(working, postId, next);
      events.push({
        kind: 'post-capture-progressed',
        turn: state.turn,
        tick: tick(),
        postId,
        capturingFaction: post.capturingFaction,
        turnsRemaining: remaining,
      });
      continue;
    }

    // remaining === 0 → flip ownership and clear capture state.
    const newOwner = post.capturingFaction;
    // Clear the capture fields BEFORE delegating to `setPostOwner` so
    // the resulting Post carries no stale capture metadata.
    const cleared = clearedCapture(post);
    working = updatePost(working, postId, cleared);
    const flip = setPostOwner(working, postId, newOwner, tick);
    working = flip.state;
    events.push(...flip.events);

    // §7.12 (Exchange #8) — reinforcement-at-POST. Provably inert
    // unless this scenario's roster data configured a trigger for
    // this POST: `working.reinforcements` is absent on every shipped
    // scenario, so the guard is false, zero parties/events/RNG —
    // gate-29 byte-identical by construction. Single-shot per trigger
    // POST. The party was fully built at load; this is a pure insert.
    const reinf = working.reinforcements?.get(postId);
    if (reinf && !(working.firedReinforcements?.has(postId) ?? false)) {
      const nextParties = new Map(working.parties);
      nextParties.set(reinf.party.id, reinf.party);
      const fired = new Set(working.firedReinforcements ?? []);
      fired.add(postId);
      working = { ...working, parties: nextParties, firedReinforcements: fired };
      events.push({
        kind: 'reinforcement-spawned',
        turn: state.turn,
        tick: tick(),
        postId,
        arrivalPostId: reinf.arrivalPostId,
        newPartyIds: [reinf.party.id],
      });
    }
  }
  return { state: working, events };
};

/**
 * Round 17 driver entry point. Run once per turn after movement +
 * battle resolution. Replaces `resolveCaptures` in `engine/turn.ts`.
 *
 * Ordering matters: triggers fire FIRST (so a fresh arrival registers
 * a capture this turn), then the tick decrements / finalizes / aborts.
 * Without that order, a capturing party that moved onto a POST and
 * stayed would not get credited on the same turn.
 */
export const resolvePostCapture = (state: GameState, tick: () => number): PostCaptureOutcome => {
  const triggered = applyCaptureTriggers(state, tick);
  const ticked = applyCaptureTick(triggered.state, tick);
  return {
    state: ticked.state,
    events: [...triggered.events, ...ticked.events],
  };
};
