/**
 * Shared capture-post chain-march / fortress-attrition policy builders
 * for the static `capture-post` scenarios (L3 Kitchen, L4 Hallway and
 * onward).
 *
 * L3 and L4 are the same match-up shape — a chain-marching ant attacker
 * that musters on the last neutral POST then assaults a spider-held
 * objective as one mass, against a spider defender that garrisons the
 * fortified objective tile with pickets on a leash plus one forward
 * muster-gated assault-breaker. They differ ONLY in their POST ids,
 * party ids and gate widths. The two policy pairs independently grew
 * the same chain-walk + muster-gate and the same sortie/fortress
 * resolver; this module is the single home for that shape so each
 * scenario file expresses only its own ids and tuning constants.
 *
 * This mirrors the `ai/picket-defense.ts` consolidation precedent (four
 * policies that grew the same primitives, factored to one module). It
 * is additive and imports nothing the policies didn't already import;
 * it deliberately does NOT live in `ai/policy-helpers.ts` (the gate-29
 * byte-identity reference surface, which must stay untouched), and it
 * does NOT touch `ai/picket-defense.ts` (so `spider-tutorial` stays
 * byte-for-byte behavior-identical). Refactoring L3 onto these builders
 * is a pure structural extraction — L3's resolved orders are unchanged
 * (verified by the gate-29 / tutorial-76 / L3-67 measurements), so the
 * shared shape introduces no behavior delta.
 *
 * Determinism: every builder is pure (state[, scenario, rng]) → state;
 * no RNG is consulted by either the ant chain-march or the spider
 * fortress defense — fully replayable. Scans iterate `state.parties` in
 * insertion order with the lower-party-id tiebreak inherited from the
 * reused `closestAntParty`.
 */

import { distance, planarManhattan } from '../engine/coord.ts';
import type {
  FleeOrder,
  GameState,
  Order,
  Party,
  PartyId,
  PostId,
  TileCoord,
} from '../engine/types.ts';

import { closestAntParty, partyShouldFlee } from './picket-defense.ts';
import {
  buildAntPolicy,
  moveToOrHold,
  type PartyDecision,
  partyAlive,
  postLocation,
} from './policy-helpers.ts';
import { appendPolicyEvents } from './threat-flee.ts';
import type { AIPolicy } from './types.ts';

/** Round-15-style low-HP retreat threshold (mirrors the tutorial). */
const FLEE_HP_THRESHOLD = 0.3;
const FLEE_ORDER: FleeOrder = { kind: 'flee' };

/**
 * L4-only Light-Switch contest doctrine (re-arbitration §9.3(b).1).
 *
 * Bolted onto the shared chain-march as an *optional* config field so
 * L3 — which omits it — resolves the exact original code path
 * (`cfg.switchContest === undefined` short-circuits every new branch,
 * verified byte-identical by the L3-67 measurement). L4 supplies it to
 * make the ant *earn* the otherwise-permanent `combatModifier` buff:
 * once the field force has mustered, one designated capture party (it
 * MUST contain an ant-mage so the engine's `ant-plane-switch`
 * teleport — `engine/movement.ts:tryPlaneTransition` — lifts it onto
 * the north-wall when given a move-to a north-wall tile) detaches from
 * the objective assault and takes the spider-held `light-switch`.
 * Capturing it flips owner→ant, which (`litOwner:"ant"`)
 * self-extinguishes the +2 — the ruled transient, earned comeback.
 */
export interface SwitchContestConfig {
  /** The flip-state Light-Switch POST to capture (north-wall). */
  readonly post: PostId;
  /**
   * The ant parties detached to take it — each MUST carry an ant-mage
   * (only mage parties can `ant-plane-switch` up to the north-wall in
   * L4's 3-plane geometry). Detaching one footman-heavy party vs two
   * mage parties is the primary ant-side contest-difficulty knob: more
   * detached force = a weaker main end-door assault = fewer ant wins.
   */
  readonly captureParties: readonly PartyId[];
  /**
   * §9.4 detachment-cost realism. When `true`, a detached party that
   * has captured (or whose switch is already ant-owned) STAYS on the
   * switch tile rather than recycling into the end-door assault — the
   * detachment is a *spent* tempo/force price (the §9.4 "real tempo
   * price … partially nets the spider garrison cost"), not a free
   * round-trip. When `false` it rejoins the assault once the switch is
   * ant-owned.
   */
  readonly detachmentIsSpent: boolean;
  /**
   * When the detachment peels off — the primary ant-side timing knob
   * for *how long the +2 stays live*:
   *   - `'early'`: as soon as the first chain link is ant-owned
   *     (~turn 1). The detachment races the switch immediately; it
   *     flips by ~turn 4 so the buff is barely live — minimal ant gain
   *     (with a near-pure-turtle spider this measured ant ~39%).
   *   - `'muster'`: only once the whole field force has mustered on the
   *     last neutral link. The body pushes the entire corridor *under
   *     the +2* (the §6 "push through the dark" beat at full length)
   *     before the detachment peels off, so the buff is live across the
   *     whole corridor approach — substantially more ant gain. This is
   *     the §9.4 "ON during the corridor push, OFF for the decisive
   *     end-door assault" shape, and the knob (with the spider's
   *     `garrisonRadius`) that lands the [58,61] band.
   */
  readonly detachGate: 'early' | 'muster';
}

/** Configuration for a chain-march ant policy. */
export interface ChainMarchConfig {
  /** Policy name (e.g. `baseline-l3`, `baseline-l4`). */
  readonly name: string;
  /** Ordered POST chain, last entry is the spider-held objective. */
  readonly chain: readonly PostId[];
  /** The objective POST (must equal the last `chain` entry). */
  readonly objective: PostId;
  /** The last *neutral* chain link the field force musters on. */
  readonly musterPost: PostId;
  /** Manhattan ring within which a party counts as "mustered". */
  readonly musterRing: number;
  /** The immobile queen-guard party id (excluded from the muster gate). */
  readonly queenGuard: PartyId;
  /**
   * L4-only Light-Switch contest (re-arbitration §9.3(b).1). Absent on
   * L3 (→ original chain-march, byte-identical). When present the named
   * `captureParty` peels off post-muster to take the switch.
   */
  readonly switchContest?: SwitchContestConfig;
}

/**
 * Build the chain-march ant policy: every field party walks the POST
 * chain, parties that reach the muster POST wait there until EVERY
 * living field party is within the muster ring, then the whole body
 * commits to the spider-held objective as one mass; the queen-guard is
 * driven by `buildAntPolicy` (immobile, always `defend`); any field
 * party below the low-HP threshold prepends a flee.
 */
export const buildChainMarchPolicy = (cfg: ChainMarchConfig): AIPolicy =>
  buildAntPolicy(cfg.name, (state: GameState) => {
    const nextChainPost = (): PostId | undefined => {
      for (const id of cfg.chain) {
        const post = state.posts.get(id);
        if (post && post.owner !== 'ant') return id;
      }
      return undefined;
    };

    const next = nextChainPost();
    const objective = state.posts.get(cfg.objective);
    const objectiveOwned = objective?.owner === 'ant';
    // Assault phase: every neutral chain link is ant-owned and only the
    // spider-held objective is left (or it is already ours).
    const assaultPhase = next === cfg.objective || objectiveOwned;

    // Muster gate: while still walking the neutral chain, parties that
    // already reached the muster POST wait there until EVERY living
    // field party is within the muster ring, so the objective assault
    // lands as one mass. Once we flip to the assault phase the gate is
    // moot (everyone commits). L4-only: the Light-Switch detach party
    // is excluded from the gate exactly like the queen-guard — it is
    // off on the north-wall by design and must NOT stall the main
    // body's end-door assault forever. `cfg.switchContest` is undefined
    // on L3, so `contestPartyId` is undefined and the gate is unchanged
    // (byte-identical, asserted by L3-67).
    const contestPartySet = new Set<PartyId>(cfg.switchContest?.captureParties ?? []);
    const musterLoc = postLocation(state, cfg.musterPost);
    let mustered = assaultPhase;
    if (!assaultPhase && musterLoc !== undefined) {
      const musterOwned = state.posts.get(cfg.musterPost)?.owner === 'ant';
      if (musterOwned) {
        mustered = true;
        for (const [id, p] of state.parties) {
          if (p.faction !== 'ant') continue;
          if (id === cfg.queenGuard) continue;
          if (contestPartySet.has(id)) continue;
          if (!partyAlive(p)) continue;
          if (planarManhattan(p.location, musterLoc) > cfg.musterRing) {
            mustered = false;
            break;
          }
        }
      }
    }

    const nextLoc = next === undefined ? undefined : postLocation(state, next);
    const objLoc = postLocation(state, cfg.objective);

    // L4-only Light-Switch detachment (re-arbitration §9.3(b).1). The
    // detach party peels off EARLY — as soon as the first chain link is
    // ant-owned (`detachReady`), NOT after full muster — and races the
    // north-wall switch while it is still spider-held. This is the
    // load-bearing timing: the +2 must self-extinguish DURING the
    // corridor push (§6 "push through the dark, then earn it"), so the
    // decisive end-door assault lands WITHOUT the buff — a genuinely
    // transient comeback, not the §4a permanent army-wide wall that
    // measured ant 99% (where the body took end-door at turn ~10 with
    // the buff still on because the contest only began at muster). The
    // instant the switch is ant-owned the buff is gone and the capture
    // party rejoins the assault (no point holding an inert POST). L3
    // omits `switchContest`, so `switchLoc` stays undefined and every
    // branch below collapses to the original chain-march byte-for-byte.
    const switchCfg = cfg.switchContest;
    const switchPost = switchCfg === undefined ? undefined : state.posts.get(switchCfg.post);
    const firstChainPost = cfg.chain[0];
    const firstChainOwned =
      firstChainPost !== undefined && state.posts.get(firstChainPost)?.owner === 'ant';
    // `detachGate` controls how long the +2 stays live: 'early' peels
    // off the moment the first chain link is taken (buff ~4 turns,
    // minimal gain); 'muster' pushes the whole corridor under the buff
    // first (buff live across the approach, the §9.4 corridor-push
    // shape). 'muster' falls through to the shared `mustered` gate.
    const detachReady = switchCfg?.detachGate === 'early' ? firstChainOwned : false;
    const switchSpiderHeld = switchPost !== undefined && switchPost.owner !== 'ant';
    const switchContestable =
      switchCfg !== undefined && switchSpiderHeld && (detachReady || mustered || assaultPhase);
    const switchTile = switchCfg === undefined ? undefined : postLocation(state, switchCfg.post);
    // While spider-held → race the switch. Once ant-owned → if the
    // detachment is "spent" (§9.4 real force price) the parties STAY on
    // the captured switch and never recycle into the end-door assault;
    // otherwise they rejoin the chain-march.
    const switchLoc = switchContestable
      ? switchTile
      : switchCfg !== undefined && switchCfg.detachmentIsSpent && !switchSpiderHeld
        ? switchTile
        : undefined;

    return (party): PartyDecision | null => {
      const fleeing = partyShouldFlee(party, state.unitTemplates, FLEE_HP_THRESHOLD);

      // The designated capture parties peel off to the north-wall
      // switch (the engine plane-switches each mage-bearing party onto
      // it). They still flee when broken, like any field party.
      if (switchCfg !== undefined && switchLoc !== undefined && contestPartySet.has(party.id)) {
        const moveOrders = moveToOrHold(party, switchLoc);
        return fleeing
          ? { orders: [FLEE_ORDER, ...moveOrders], posture: 'run' }
          : { orders: moveOrders, posture: 'fight' };
      }

      // Target selection:
      //   - assault phase / chain done → commit to the objective.
      //   - chain incomplete, mustered → push the next chain link.
      //   - chain incomplete, this party already at the muster POST and
      //     it is the next link → hold for stragglers.
      //   - otherwise → walk the next chain link.
      let target: TileCoord | undefined;
      const atMuster = musterLoc !== undefined && planarManhattan(party.location, musterLoc) <= 1;
      if (assaultPhase || next === undefined) {
        target = objLoc;
      } else if (mustered) {
        target = nextLoc;
      } else if (atMuster && next === cfg.musterPost) {
        target = musterLoc;
      } else {
        target = nextLoc;
      }

      if (target === undefined) {
        return fleeing
          ? { orders: [FLEE_ORDER], posture: 'run' }
          : { orders: [], posture: 'fight' };
      }
      const moveOrders = moveToOrHold(party, target);
      return fleeing
        ? { orders: [FLEE_ORDER, ...moveOrders], posture: 'run' }
        : { orders: moveOrders, posture: 'fight' };
    };
  });

/**
 * L4-only Light-Switch garrison doctrine (re-arbitration §9.3(b).2).
 *
 * Optional, exactly like `SwitchContestConfig`: L3 omits it and the
 * fortress defense resolves byte-identically. L4 supplies it so the
 * spider *actively defends* the switch — a genuine garrison-split (one
 * party pulled off the end-door fortress to hold the north-wall
 * switch), making the ant's capture *earned*, not free. The defender
 * sits on the switch tile and sorties onto any ant that closes within
 * `garrisonRadius`, body-blocking the capture (the 2-turn hold in
 * `engine/post-capture.ts` pauses while both factions are co-located).
 */
export interface SwitchDefenseConfig {
  /** The Light-Switch POST to hold (north-wall). */
  readonly post: PostId;
  /** The spider party detached to garrison it. */
  readonly defender: PartyId;
  /** Chebyshev leash within which the defender sorties onto an ant. */
  readonly garrisonRadius: number;
  /**
   * §9.4 buff-aware fortress doctrine — the load-bearing tuning lever.
   * While the switch is still spider-held the ruled `combatModifier`
   * gives every ant unit +2 attack army-wide. Sortieing the mobile
   * fortress force (rover AND pickets) forward into that buffed
   * corridor just feeds them piecemeal to a +2 enemy and leaves
   * end-door undermanned for the *decisive post-buff assault* — exactly
   * why every naive split measured ant 92–100%. When `true`, every
   * mobile fortress party (the rover and all pickets) instead HOLDS on
   * the end-door fortress tile while the buff is live, conceding the
   * corridor entirely (the ant's +2 is spent on empty tiles, not on
   * bleeding the defenders); they resume their normal sortie/leash
   * behavior only once the ant has captured the switch and the +2 has
   * self-extinguished, so the end-door assault meets the *full intact
   * +5/+2 fortress with no buff against it*. This is the genuine §3.2
   * tactical choice ("concede the corridor to keep the fortress whole,
   * then fight the unbuffed assault") made mechanically real, and the
   * primary knob that brings L4 from ~92% down into the [58,61] band.
   * Only the switch defender stays forward (it must contest the switch
   * — §9.3(b).2). L3 omits `switchDefense` entirely → byte-identical.
   */
  readonly defensiveFortressWhileLit: boolean;
  /**
   * §9.4 — make the buff-aware turtle PERMANENT for the pickets and
   * rover (they pin to the end-door fortress for the whole scenario,
   * never sortieing forward, not even after the switch flips). The
   * within-loop sweep established the bracket empirically: the L3-shape
   * forward sortie measures ant 99% on L4's corridor (the +2-buffed ant
   * shreds every forward spider, then wins the score tiebreak), while a
   * pure permanent turtle measures ant 23% (a 4-party +5/+2 healing
   * stack the ant cannot capture or out-attrit). [58,61] lies between,
   * and is reached by `permanentPin: true` (pure turtle base, ant 23%)
   * PLUS the single shallow §9.3(b).2 switch defender as the only
   * forward element, whose `garrisonRadius` exposure is the monotone
   * difficulty knob that lifts 23% up into the band. When `false` the
   * pickets/rover resume the L3 sortie once the switch flips (the
   * leaky behavior that measured 80–98%). L3 omits `switchDefense`
   * entirely, so this is never consulted (byte-identical, L3-67).
   */
  readonly permanentPin: boolean;
}

/** Configuration for a fortress-attrition spider defense. */
export interface FortressDefenseConfig {
  /** Policy name (e.g. `spider-l3`, `spider-l4`). */
  readonly name: string;
  /** The objective POST the defense fortifies. */
  readonly objective: PostId;
  /** Queen-bearing party pinned to the objective; never moves. */
  readonly guard: PartyId;
  /** Picket party ids that garrison the objective on a wide leash. */
  readonly pickets: readonly PartyId[];
  /** The forward muster-gated assault-breaker party id. */
  readonly rover: PartyId;
  /** Chebyshev leash for the fortress pickets. */
  readonly interceptRadius: number;
  /** Chebyshev gate for the forward rover (muster-staging width). */
  readonly roverGate: number;
  /**
   * L4-only Light-Switch garrison (re-arbitration §9.3(b).2). Absent on
   * L3 (→ original fortress defense, byte-identical). When present the
   * named `defender` holds the switch instead of the end-door fortress.
   */
  readonly switchDefense?: SwitchDefenseConfig;
}

/**
 * The shared sortie decision for every mobile spider party. It looks at
 * the closest living ant *to the objective* (the objective reference is
 * the pinned guard, whose location IS the objective tile — reusing the
 * shared `closestAntParty` rather than re-deriving a tile-distance
 * scan):
 *
 *   - ant within `gate` Chebyshev of the objective → sortie onto that
 *     ant's tile to body-block / bleed it;
 *   - otherwise → the party's `hold` fallback.
 *
 * Pickets pass the objective tile as their `hold` (garrison the
 * fortress, banking the def + heal); the rover passes `null` (hold its
 * forward ground — never fall back to the heal). One helper, two
 * postures: the only difference between a fortress picket and the
 * forward assault-breaker is the fallback and the gate width.
 */
const sortieOrders = (
  state: GameState,
  party: Party,
  objectiveRef: Party | null,
  gate: number,
  hold: Party['location'] | null,
): readonly Order[] => {
  if (objectiveRef !== null) {
    const ant = closestAntParty(state, objectiveRef);
    if (ant !== null) {
      const d = distance(objectiveRef.location, ant.location);
      if (d !== Number.POSITIVE_INFINITY && d <= gate) {
        return moveToOrHold(party, ant.location);
      }
    }
  }
  return hold === null ? [] : moveToOrHold(party, hold);
};

/**
 * Build the fortress-attrition spider defense: the guard never leaves
 * the objective (the immovable spine — its presence pauses the ants'
 * capture tick, its absence aborts any hold); the pickets garrison the
 * fortified tile on a wide leash, sortieing only to body-block an ant
 * that closes within `interceptRadius` then falling straight back to
 * bank the def + heal; the rover stays forward and breaks the ant mass
 * once it reaches the muster staging zone (`roverGate`), never
 * collapsing back to the heal (the structural strength-down that
 * calibrates the otherwise-impregnable fortress down to the ruled win
 * band). Any unexpected spider party converges on the objective so it
 * is never idle dead weight.
 */
export const buildFortressDefensePolicy = (cfg: FortressDefenseConfig): AIPolicy => {
  const picketSet = new Set<PartyId>(cfg.pickets);
  const switchDef = cfg.switchDefense;

  /**
   * L4-only switch garrison (§9.3(b).2), realized for the L4 3-plane
   * geometry. Re-derived engine fact: the floor↔north-wall edge
   * (`engine/edges.ts`) only connects at floor y∈{0} — which in L4 is
   * solid paneling (the corridor is rows 3–6). A spider (no
   * `ant-plane-switch`) therefore *physically cannot* stand on the
   * north-wall switch tile; only the ant's mage-bearing detachment can
   * teleport up. This is the §3.I "range-limited by the 3-plane set"
   * reality. So the spider defends the switch the only way it can: it
   * garrisons the **floor projection of the switch** (the floor tile
   * directly beneath it — the column the ant detachment must occupy to
   * plane-switch up) and body-blocks the closest ant within
   * `garrisonRadius`, forcing `vanguard-bravo` to fight through a real
   * spider party on the floor *before* it can teleport to the switch.
   * This is the genuine §3.2 garrison-split realized at minimum
   * exposure: empirically (the within-loop sweep) ANY spider party that
   * lingers forward in the buffed corridor is annihilated and swings
   * the attrition/score hugely to the ant (pure turtle measured ant
   * 23%, turtle + one always-forward defender measured ant 87%). So the
   * defender's DEFAULT is to bank the end-door fortress heal with the
   * rest of the turtle (it is NOT a permanently-forward party); it only
   * DARTS to the switch's floor projection to body-block the ant
   * detachment when an ant has closed within `garrisonRadius` of that
   * projection, then immediately falls back to the fortress. The
   * contest is therefore real (it delays/bleeds the detachment and
   * forces the ant to fight for the flip — §9.3(b).2 satisfied) but
   * *shallow and brief*, and `garrisonRadius` is a clean monotone knob:
   * larger ⇒ darts out sooner / stays forward longer ⇒ more exposure ⇒
   * higher ant win; smaller ⇒ hugs the fortress ⇒ lower ant win — the
   * precise lever that tunes the contest difficulty into the §9.4
   * [58,61] band. Once the ant flips the switch the contest is over and
   * the defender simply banks the fortress. L3 omits `switchDefense` →
   * never reached (byte-identical, L3-67).
   */
  const switchDefenderOrders = (
    state: GameState,
    party: Party,
    objectivePost: Party['location'] | undefined,
  ): readonly Order[] => {
    if (switchDef === undefined) return [];
    const switchPost = state.posts.get(switchDef.post);
    if (switchPost === undefined) return [];
    const holdFortress = (): readonly Order[] =>
      objectivePost === undefined ? [] : moveToOrHold(party, objectivePost);
    // Switch resolved (ant-owned) → contest done; bank the fortress.
    if (switchPost.owner === 'ant') return holdFortress();
    // The floor projection of the (north-wall) switch — the tile the
    // ant detachment must occupy to plane-switch up. Dart here to
    // body-block ONLY a detachment that has closed within
    // `garrisonRadius` of it; otherwise stay on the healing fortress.
    const projection: Party['location'] = {
      plane: party.location.plane,
      x: switchPost.location.x,
      y: switchPost.location.y,
    };
    const ant = closestAntParty(state, { ...party, location: projection });
    if (ant !== null) {
      const d = distance(projection, ant.location);
      if (d !== Number.POSITIVE_INFINITY && d <= switchDef.garrisonRadius) {
        return moveToOrHold(party, ant.location);
      }
    }
    return holdFortress();
  };

  const ordersFor = (
    state: GameState,
    id: PartyId,
    party: Party,
    objectiveRef: Party | null,
    objectivePost: Party['location'] | undefined,
  ): readonly Order[] => {
    if (id === cfg.guard) return [];
    if (switchDef?.defender === id) {
      return switchDefenderOrders(state, party, objectivePost);
    }
    // §9.4 buff-aware fortress: while the switch is spider-held (the
    // ruled ant +2 is live) every mobile fortress party holds on the
    // end-door tile rather than trade forward into a buffed enemy; they
    // resume normal sortie/leash behavior once the ant flips the switch
    // (buff gone). L3 omits `switchDefense`, so `litForAnt` is false and
    // both branches below collapse to the original sortie (L3-67).
    const pinForever = switchDef?.permanentPin === true;
    const litForAnt =
      switchDef?.defensiveFortressWhileLit === true &&
      (() => {
        const sw = state.posts.get(switchDef.post);
        return sw !== undefined && sw.owner !== 'ant';
      })();
    const pinned = pinForever || litForAnt;
    if (picketSet.has(id)) {
      if (pinned) {
        return objectivePost === undefined ? [] : moveToOrHold(party, objectivePost);
      }
      return sortieOrders(state, party, objectiveRef, cfg.interceptRadius, objectivePost ?? null);
    }
    if (id === cfg.rover) {
      if (pinned) {
        return objectivePost === undefined ? [] : moveToOrHold(party, objectivePost);
      }
      return sortieOrders(state, party, objectiveRef, cfg.roverGate, null);
    }
    return objectivePost === undefined ? [] : moveToOrHold(party, objectivePost);
  };

  return {
    name: cfg.name,
    faction: 'spider',
    decide(state: GameState): GameState {
      // The guard is pinned to the objective and never moves, so it is
      // a stable proxy for "the objective tile" — distance-to-objective
      // is measured from it (see `sortieOrders`).
      const guard = state.parties.get(cfg.guard) ?? null;
      const objectiveRef = guard !== null && partyAlive(guard) ? guard : null;
      const objectivePost = state.posts.get(cfg.objective)?.location;

      const updates: [PartyId, Party][] = [];
      for (const [id, party] of state.parties) {
        if (party.faction !== 'spider' || !partyAlive(party)) continue;
        const orders = ordersFor(state, id, party, objectiveRef, objectivePost);
        if (orders !== party.orders) updates.push([id, { ...party, orders }]);
      }
      if (updates.length === 0) return appendPolicyEvents(state, []);
      const nextParties = new Map(state.parties);
      for (const [id, p] of updates) nextParties.set(id, p);
      return appendPolicyEvents({ ...state, parties: nextParties }, []);
    },
  };
};
