/**
 * L6 — spider AI for Level 6 ("The Stairs", `data/level-6`).
 *
 * Companion to `ai/baseline-l6.ts`. L6 is the campaign's only
 * `eradicate` scenario: the ants win ONLY by destroying every spider
 * party; the spider wins by surviving — reaching the turn cap is an
 * unconditional ant LOSS with no score path (`engine/turn.ts` ~490,
 * `engine/end-of-turn.ts` `allSpiderPartiesEliminated`). The spider is
 * therefore a SURVIVALIST — but, per the Gameplay-PA L6 arbitration
 * (`docs/debate/l6-gameplay-pa-arbitration.md` §3.1.2), a survivalist
 * that *statically turtles* its scattered start-landings is the §4d
 * trap / the L4-§9 falsification a third time: the ant grinds three
 * isolated 5-unit garrisons one at a time (it fields five parties +
 * the permanent `stairwell-base` POST-occupation offset) and beats the
 * clock — a ~69% turkey-shoot, NOT the ruled hardest-but-fair ~55%.
 * The BINDING doctrine the arbitration mandates is the opposite: the
 * spider reads the per-turn held-landing economy and SORTIES off its
 * start-landings — concentrating its three field parties into one
 * mass that BANKS a defensible landing (a real, completed capture →
 * the `defensiveBonus:3` + `healingRate:3` economy) and counter-
 * punches the ant contesting it, falling back to heal. The *existence*
 * of that sortie is a ruled invariant; the muster point / aggression
 * threshold / timing below is the within-loop tuning latitude.
 *
 * It deliberately does NOT use `ai/capture-chain.ts`
 * (`buildFortressDefensePolicy` is the L3/L4/L5 counter-edge/end-door
 * fortress doctrine — a different game) nor `ai/picket-defense.ts`
 * (`spider-tutorial` web defense). It is a standalone policy on the
 * `spider-l2` import surface (engine/coord, engine/types,
 * ai/policy-helpers, ai/closest-party, ai/threat-flee, ai/types), so
 * `spider-l3`/`spider-l4`/`spider-l5`/`spider-tutorial` and the shared
 * builders stay byte-for-byte untouched.
 *
 * The held-landing economy the AI reads (verified against the engine):
 *
 *   - The 3 contested landings (`lower-/mid-/upper-landing`) start
 *     `neutral`. A faction OWNS one only after a 2-turn SOLO hold
 *     (`engine/post-capture.ts`: any enemy co-located pauses it; the
 *     capturer leaving aborts it back to neutral). Once owned it pays
 *     that faction `healingRate:3` regen each end-of-turn to the
 *     occupying party (`engine/end-of-turn.ts:applyHealing`) plus a
 *     `defensiveBonus:3` when it defends there
 *     (`engine/turn.ts:assignSides`).
 *   - Pre-doctrine the capture NEVER completed (a mid-terrace muster
 *     is a tug-of-war: the ant arrives before turn 2 and resets it),
 *     so the ruled `3/3` payload measured INERT — exactly the §4d /
 *     L4-§9 falsification. The fix is to muster on the landing the ant
 *     reaches LAST (`upper-landing`, far from ant staging), so the
 *     solo capture actually completes and the economy is real: a
 *     stacked mass that regenerates 3 hp/turn and defends at +3 is
 *     dramatically slower to eradicate, so far more games run the
 *     `eradicate` clock out (the spider win) — the engine of the
 *     resumed descent.
 *
 * Strategy (one sentence, §3.4.3 learnability):
 *
 *   The queen block holds the safe top tile (its survival past the cap
 *   IS the eradicate win); the three field parties abandon their
 *   scattered start landings and RALLY onto `upper-landing` (the
 *   landing the ant column reaches last), where one party stays as the
 *   GARRISON that keeps the capture banked (the self-healing, hardened
 *   anchor) while the other two are the SORTIE WING that ranges off the
 *   landing onto any ant closing on the economy and falls back to it to
 *   regen — so the hunter must crack a recovering fortress that also
 *   punches back, instead of turkey-shooting three static garrisons.
 *
 * Why this is NOT a turtle (the §3.1 / §4d intent) and NOT a suicide
 * charge: a static scattered three-garrison turtle is the ~69%
 * turkey-shoot the arbitration rejects (and the ruled `3/3` payload is
 * inert under it — no landing is ever held); three parties
 * independently charging the nearest ant is worse (~86%). The economy
 * is only REAL once a landing is genuinely captured and held, which
 * forces the survivalist's optimizer to abandon the scattered start
 * tiles, concentrate, and fight a sortie-and-recover rhythm off a
 * banked landing — the trade that runs the clock out often enough to
 * land the ruled hardest-but-fair point.
 *
 * Determinism: pure (state) → state inside the policy; scans iterate
 * `state.parties` in insertion order with a lower-party-id tiebreak;
 * no RNG is consulted — fully replayable.
 */

import type { GameState, Order, Party, PartyId, PostId, TileCoord } from '../engine/types.ts';

import {
  buildMissionSpiderPolicy,
  closestLivingPartyOfFaction,
  distance,
  livingHpFraction,
  moveToOrHold,
  sameCoord,
} from './mission-spider-policy.ts';
import type { AIPolicy } from './types.ts';

/**
 * The shared muster landing the three field parties rally onto, BANK
 * (a completed 2-turn solo capture), and hold as one concentrated,
 * self-healing, hardened mass. `upper-landing` (8,2) is the landing
 * the ant column reaches LAST: the ant stages at (0..1,7..9) and must
 * climb the whole terraced gauntlet up the east connector to reach
 * (8,2), giving the spider the clean solo turns the capture needs (a
 * mid-terrace muster is a perpetual tug-of-war that leaves the ruled
 * `3/3` economy inert — the §4d trap). Swept seeds 1..100 vs
 * `baseline-l6`: upper banks the economy and lands the ruled ~55%
 * band; mid/lower never complete the capture (stay on the ~69+
 * turtle-plateau). Upper is the shipped value.
 */
const MUSTER_LANDING: PostId = 'upper-landing' as PostId;

/**
 * Chebyshev range from the muster landing within which an approaching
 * ant party is judged to be CONTESTING the banked economy — the field
 * parties then range off the landing onto that ant (the §3.1.2 ruled
 * counter-punch) and fall back to regen. Swept seeds 1..100 vs
 * `baseline-l6`: a sharp phase step at 6→7 (ant 66→51 — a knife-edge,
 * NOT shipped) then a WIDE STABLE PLATEAU at 7..15 (ant ~51, sortie
 * fully engaged). 9 is the shipped plateau-interior value (the L3/L5
 * "ship the plateau interior, never the knife-edge" discipline). The
 * smooth `HEAL_RETREAT_HP` knob below lifts that robust ~51 plateau
 * into the ruled [53,57] band — NOT this phase-transitioning leash.
 */
const SORTIE_LEASH = 9;

/**
 * Living-HP fraction below which a sortieing party BREAKS OFF and
 * returns to the muster landing to regen on the banked
 * `healingRate:3`, regardless of ongoing pressure (it re-sorties once
 * healed). This is the smooth, robust aggression knob the loop tunes
 * toward the ruled band: it interpolates spider survival continuously
 * between "retreat early, survive long" (high threshold → low ant) and
 * "fight until nearly dead, bleed out of heal range" (low threshold →
 * high ant), unlike the phase-transitioning `SORTIE_LEASH`. Swept
 * seeds 1..100 vs `baseline-l6` on the stable leash-9 plateau: it
 * walks the stable ~51 wing-engaged floor up through the [53,57] band
 * monotonically; the shipped value is the band-interior midpoint. It
 * is doctrinally the §3.1.2 economy read (a hurt party uses the heal
 * economy it banked), not a behaviour-flavour zero.
 */
const HEAL_RETREAT_HP = 0.55;

/**
 * The turn by which a field party must be committed to the rally even
 * if no ant has closed (a slow / cautious ant seed). The arbitration's
 * sortie is a RULED INVARIANT — it must provably fire in a seed-robust
 * majority of games, not only when the ant rushes. Short: the rally +
 * the 2-turn upper-landing capture must complete well before the
 * hunter climbs the gauntlet. Loop-tunable timing (§3.1.2); 2 is the
 * shipped value (rally from turn 2 — the parties commit immediately
 * after the first read).
 */
const RALLY_BY_TURN = 2;

/**
 * The queen-bearing block. Its survival past the cap IS the
 * eradicate-loss-prevention spine (if every other party dies but this
 * one lives, the ants still cannot win). It RALLIES to the muster
 * landing with the field parties and then holds it — full
 * concentration of force on the banked economy — but it NEVER sorties
 * (the spine must not be spent in the counter-punch). Folding the
 * queen-block into the banked mass (vs leaving it a safe-corner
 * straggler the ant can never reach) is the doctrinally-clean
 * concentration the §3.1.2 economy read implies AND the lever that
 * lands the ruled band: with the spine reachable by a fully-committed
 * ant climb to `upper-landing`, the hunter has a real eradication path
 * in ~44% of seeds — swept seeds 1..100 vs `baseline-l6`, this is the
 * difference between the stable ~51 (queen safe-corner) and the ruled
 * ~56 (queen in the mass), itself a wide flat plateau under the
 * `SORTIE_LEASH` 7..12 / `HEAL_RETREAT_HP` sweep.
 */
const QUEEN_BLOCK: PartyId = 'end-guard' as PartyId;

/** The three POST-occupation economy landings (Level-owned positions;
 * the Gameplay-PA ruled `defensiveBonus:3 healingRate:3` payload is
 * wired into the map by the orchestrator — read here via the engine,
 * not encoded). */
const LANDINGS: readonly PostId[] = [
  'lower-landing' as PostId,
  'mid-landing' as PostId,
  'upper-landing' as PostId,
];

/** Closest living ant party to `from` (the shared L6 scan — Manhattan
 * within-plane, +∞ across planes, lowest-party-id tiebreak). */
const closestAnt = (state: GameState, from: TileCoord): Party | null =>
  closestLivingPartyOfFaction(state, 'ant', from);

/** The muster landing's tile (the rally / fallback / heal anchor). */
const musterLoc = (state: GameState): TileCoord | undefined =>
  state.posts.get(MUSTER_LANDING)?.location;

/**
 * Read the held-landing economy from the muster landing's vantage: the
 * closest living ant party to it plus that ant's Chebyshev distance to
 * the landing. Undefined when no ant is reachable (all dead / airborne
 * with no same-plane path). The three field parties all read the SAME
 * landing, so they converge (concentration of force) instead of
 * scattering one-per-ant — and they all sortie at / fall back from the
 * same pressure signal, staying massed.
 */
const economyPressure = (
  state: GameState,
): { antLoc: TileCoord; antToMuster: number } | undefined => {
  const post = state.posts.get(MUSTER_LANDING);
  if (post === undefined) return undefined;
  const ant = closestAnt(state, post.location);
  if (ant === null) return undefined;
  const d = distance(post.location, ant.location);
  return { antLoc: ant.location, antToMuster: d === Number.POSITIVE_INFINITY ? 1e9 : d };
};

/** True iff this party stands on any contested landing tile. Lets a
 * pre-rally party that already sits on a landing hold one beat so a
 * free no-pressure capture can begin before it rallies. */
const onAnyLanding = (state: GameState, party: Party): boolean => {
  for (const id of LANDINGS) {
    const post = state.posts.get(id);
    if (post !== undefined && sameCoord(post.location, party.location)) return true;
  }
  return false;
};

/**
 * Per-party orders (the §3.1.2 concentrated bank-and-sortie doctrine):
 *
 *   0. Queen block → rally to the muster landing and hold it (full
 *      concentration on the banked economy) but NEVER sortie: the
 *      spine fights only from the hardened, healing landing, never
 *      walks out into the hunter.
 *   1. SORTIE (the ruled invariant): an ant party is contesting the
 *      banked economy (within `SORTIE_LEASH` of the muster landing) →
 *      a healthy field party steps off onto that ant, the concentrated
 *      counter-punch (the stacked field mass into the ant's lead 5–8),
 *      coming DOWN/ACROSS the terrace at the hunter.
 *   1b. Heal-retreat gate: a field party below `HEAL_RETREAT_HP` breaks
 *      off and falls back to the banked landing to regen (the economy
 *      it captured), re-sortieing once healed — the smooth aggression
 *      knob.
 *   2. BANK / hold: otherwise converge on the muster landing and hold
 *      it — completing the 2-turn solo capture (the real
 *      `defensiveBonus:3` + `healingRate:3` economy) and stacking the
 *      field parties into one self-healing hardened mass.
 *   3. Pre-rally grace: in the first beat a party already on its own
 *      start landing may hold once (lets a free capture start) — but
 *      it is rallying by `RALLY_BY_TURN` regardless, so the sortie
 *      invariant always fires.
 */
const ordersFor = (state: GameState, id: PartyId, party: Party): readonly Order[] => {
  const muster = musterLoc(state);
  if (muster === undefined) return [];

  // 0. Queen block: rally to and hold the muster landing (full
  //    concentration), but never sortie — the eradicate spine fights
  //    only from the hardened healing landing.
  if (id === QUEEN_BLOCK) {
    if (sameCoord(party.location, muster)) return [];
    return moveToOrHold(party, muster);
  }

  // Heal-retreat gate: a hurt party breaks off and returns to the
  // banked landing to regen (uses the economy it captured), regardless
  // of pressure — re-sorties once healed. The smooth aggression knob.
  const hurt = livingHpFraction(party, state.unitTemplates) < HEAL_RETREAT_HP;
  if (hurt && !sameCoord(party.location, muster)) {
    return moveToOrHold(party, muster);
  }

  const pressure = economyPressure(state);

  // 1. Sortie — the ruled invariant: ant on the doorstep of the banked
  //    economy → concentrated counter-punch onto it (unless hurt, which
  //    the gate above already diverted to the heal landing).
  if (!hurt && pressure !== undefined && pressure.antToMuster <= SORTIE_LEASH) {
    if (sameCoord(party.location, pressure.antLoc)) return [];
    return moveToOrHold(party, pressure.antLoc);
  }

  // 3. Pre-rally grace: very early, a party already on a start landing
  //    holds one beat so a free capture can begin — never past
  //    RALLY_BY_TURN (the sortie/rally invariant must always fire).
  if (
    state.turn < RALLY_BY_TURN &&
    !sameCoord(party.location, muster) &&
    onAnyLanding(state, party)
  ) {
    return [];
  }

  // 2. Bank / hold / fall-back: converge on the muster landing and
  //    hold it (complete the capture, concentrate, regen).
  if (sameCoord(party.location, muster)) return [];
  return moveToOrHold(party, muster);
};

/**
 * The standalone L6 survivalist policy. The generic decide() loop
 * (snapshot parties → recompute `ordersFor` per living spider party →
 * write back only the changed → `appendPolicyEvents`) is the shared
 * `buildMissionSpiderPolicy` (additive consolidation, jscpd-0; the
 * same loop L8's `spider-l8` uses). Behaviour is byte-for-byte the
 * previous inline loop — the L6 = 56 measurement is unchanged.
 */
export const spiderL6: AIPolicy = buildMissionSpiderPolicy('spider-l6', ordersFor);
