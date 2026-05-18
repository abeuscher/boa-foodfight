/**
 * L7 — spider policy for Level 7 ("The Living Room", `data/level-7`).
 *
 * Companion to `ai/baseline-l7.ts`. L7 is a `capture-post` scenario
 * (the L3/L4/L5 victory shape resumed after L6's `eradicate`): the
 * spider must keep the ants from capturing mantel (floor 9,9, +5 def),
 * which it starts holding, while the ants march the canonical POST
 * chain and assault as one mass across the largest, most open arena of
 * the tier.
 *
 * Composes the shared `buildFortressDefensePolicy`
 * (`ai/capture-chain.ts`) — L3/L4/L5/L7 are the same fortress-attrition
 * shape. This file is a thin **L7-specific opt-in** that COMPOSES the
 * shared builder (it does NOT modify it: `capture-chain.ts` /
 * `picket-defense.ts` / `closest-party.ts` defaults stay byte-identical;
 * gate-29 / tutorial-76 / L2-68 / L3-67 / L4-60 / L5-66 / L6-56 are
 * unchanged because this policy is registered ONLY under `ENEMY_AIS`).
 * L7 supplies no `switchDefense`, so the shared builder collapses to
 * the exact original L3 fortress code path.
 *
 * The ruled L7 mechanic delta (Gameplay-PA arbitration
 * `docs/debate/l7-gameplay-pa-arbitration.md`, **RE-ARBITRATION 3**):
 * the Remote is RESTORED from RE-ARB-2's demoted neutral-flavor
 * classification to its original §4a #3 `goldPerTurn` currency economy
 * role, now expressible on the merged engine dep #9. The ~64% rebound
 * is carried by the proven-exercised ant cards+combos *funded by the
 * Remote economy*, *ceilinged* by the spider's registering Venom Storm
 * AND the spider's own ability to capture the Remote to zero the ant's
 * income / fund its own. This file carries the spider side of the
 * binding within-loop AI-doctrines as L7-specific opt-in config over
 * the unchanged shared fortress:
 *
 *   - **§3.3 combo-adjacency, spider side (binding, STAYS byte-
 *     identical) — Venom Storm ceiling:** the shipped combo resolver
 *     (`engine/battle-abilities.ts`: a combo fires only when a
 *     same-faction partner of the right composition is Chebyshev ≤1 on
 *     the same plane when a battle opens). The L7 spider roster has
 *     `end-guard` (spider-queen → `venom-blast`+`web-tangle`) pinned to
 *     mantel (9,9) and `north-picket` (spider-spinners →
 *     `venom-blast`+`web-tangle`) garrisoning (9,8) — Chebyshev 1,
 *     adjacent at start. This doctrine keeps `north-picket` welded
 *     Chebyshev-≤1 to the queen block (it garrisons the same fortress
 *     tile anyway) so Venom Storm fires whenever the mantel fortress is
 *     assaulted — the spider's owed open-arena counter-pressure
 *     (§3.3/§3.4 ceiling). RE-ARB-2 R2.2(d) raises Venom Storm
 *     `damage` 3→5 (pure data, the bounded ceiling that caps the
 *     rebound at [62,66] so it does not overshoot — raised LESS than
 *     Royal Onslaught so the net stays player-favorable). Spider
 *     roster unchanged (R2.2(d)): Venom Storm assembling 93×/100
 *     proves the doctrine is already satisfied.
 *
 * Plus the **spider blitz 5% debut (§3.4)**: the engine flips a
 * per-scenario `state.spiderBlitzMode` on a frozen 5% coin
 * (`engine/state.ts` `blitzRng.next() < 0.05` — exactly the ruled 5%,
 * engine-frozen, NOT a data knob; NOT reopened by RE-ARB-2). On the 5%
 * of seeds it lands, the non-queen fortress parties abandon the leash
 * and CHARGE the closest ant (an open-arena initiative burst — the
 * §3.4 registering ceiling variance), so the blitz is a real
 * measurable counter-pressure rather than the dead-payoff the spider
 * fought.
 *
 *   - **§R3.3 spider-contests/captures-the-Remote (RESTORED binding
 *     doctrine — now MEANINGFUL & race-proof):** the RE-ARB-1 §3.1.2
 *     spider Remote-contest doctrine, retired in RE-ARB-2 *because the
 *     §4e heal-hack made it inert*, is **RESTORED as a ruled invariant
 *     and a ship-gate sub-check** now that engine dep #9 makes the
 *     Remote a real `goldPerTurn` economy and the §4e co-located-pause
 *     race no longer applies (income accrues on OWNERSHIP, not
 *     co-occupation). The rover (`corridor-rovers`) sorties to
 *     contest/capture the Remote — **denying the ant's card economy**
 *     (a neutral or spider-held Remote pays the ant 0) **and funding
 *     its own** (a spider-held Remote credits `state.playerGold.spider`,
 *     the pool the spider deck / Venom Storm support draws on). With
 *     `defensiveBonus:0` and `owner` not spider, the rover can win the
 *     co-located fight and complete the 2-turn capture. The sortie is a
 *     genuine garrison-split on the lane it already defends (R3.2
 *     on-path placement). It is gated so it never abandons the mantel
 *     spine: only the rover economy-sorties; the queen block + pickets
 *     hold the fortress.
 *
 * Strategy (one sentence, §3.4.3 learnability):
 *
 *   The queen block pins mantel as the impregnable +5/+2 spine with the
 *   spinner picket welded beside it (Venom Storm on contact); the
 *   second picket holds the fortress on the shared leash; the rover
 *   sorties to seize the Remote currency POST and zero the ant's card
 *   economy; unless the 5% blitz fires, when the whole defense charges.
 *
 * Determinism: the shared builder is pure (state) → state; the L7
 * overlay is a pure post-pass (the combo-glue is a pure Chebyshev
 * step, the blitz a state-flag read). No RNG is consulted here — fully
 * replayable.
 */

import { distance, sameCoord } from '../engine/coord.ts';
import type { GameState, PartyId, PostId } from '../engine/types.ts';

import { buildFortressDefensePolicy, type FortressDefenseConfig } from './capture-chain.ts';
import { closestLivingPartyOfFaction } from './closest-party.ts';
import { moveToOrHold, partyAlive, postLocation } from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/**
 * The fortress leash knobs, carried at the L5/L6 plateau-interior
 * values (the structurally-identical fortress shape). The base
 * fortress is the impregnable +5/+2 mantel hold; the L7 §5 ~64%
 * REBOUND-UP target is reached by the player-favorable RE-ARB-2 ruled
 * delta (the ant's re-ruled cards + Royal Onslaught) lifting the
 * cards+combos-only ~43% floor UP, *bounded* by the spider's re-ruled
 * Venom Storm + the blitz — NOT by re-tuning these leashes (the
 * L3/L5/L6 "ship the plateau interior" discipline).
 */
const INTERCEPT_RADIUS = 2;
const ROVER_GATE = 4;

/**
 * §R3.3 spider economy-sortie REACTIVITY knob (loop latitude — the
 * ruled invariant is only the *existence* of the spider Remote
 * contest; this trigger threshold is tuning latitude toward [62,66]).
 *
 * The contest is **reactive**, not a perpetual camp: the rover diverts
 * off the shared fortress path to RETAKE the Remote ONLY once the ant
 * has actually OWNED it for at least `REMOTE_RETAKE_DELAY` cumulative
 * turns this scenario (the ant has had a real, gold-earning ownership
 * window — the §R3.3(b) card-economy-funded condition is being met —
 * so the spider now contests it back). The instant the spider flips it
 * the rover RETURNS to fortress duty (the Remote is no longer
 * ant-owned, so the trigger lifts); the ant economy party then comes
 * back and recaptures, producing the genuine **bidirectional** flip
 * cycle R3.3(a) requires rather than one side perma-camping the tile.
 * A small safety override keeps the rover home if the fortress is
 * under immediate assault (an ant within `REMOTE_SORTIE_SAFE_GATE`
 * Chebyshev of mantel — never crack the spine to chase economy).
 *
 * Larger `REMOTE_RETAKE_DELAY` ⇒ the ant banks more uncontested
 * gold-owning turns before the spider reacts ⇒ HIGHER ant win; smaller
 * ⇒ the spider snaps the income away sooner ⇒ LOWER ant win. Swept
 * seeds 1..100; the shipped values land the ruled [62,66] band.
 */
const REMOTE_RETAKE_DELAY = 4;
const REMOTE_SORTIE_SAFE_GATE = 2;

const L7_DEFENSE_CONFIG: FortressDefenseConfig = {
  name: 'spider-l7',
  objective: 'mantel' as PostId,
  guard: 'end-guard' as PartyId,
  pickets: ['north-picket' as PartyId, 'south-picket' as PartyId],
  rover: 'corridor-rovers' as PartyId,
  interceptRadius: INTERCEPT_RADIUS,
  roverGate: ROVER_GATE,
  // No `switchDefense`: L7 has no Light-Switch — the shared builder
  // collapses to the exact original L3 fortress code path.
};

/** The Venom Storm partner pair (§3.3 spider side): the queen block
 * (Component A/B caster) and the spinner picket (Component A/B caster).
 * Both carry `venom-blast` + `web-tangle`; either can be shooter or
 * partner. They garrison the same mantel fortress, so keeping the
 * spinner picket Chebyshev-≤1 to the queen block is the doctrine. */
const QUEEN_BLOCK: PartyId = 'end-guard' as PartyId;
const SPINNER_PICKET: PartyId = 'north-picket' as PartyId;
/** §R3.3 — the RESTORED Remote currency POST (floor 6,5) and the rover
 * party that economy-sorties to contest/capture it. Capturing it both
 * zeros the ant's card-market income (neutral/spider Remote pays the
 * ant 0) and funds the spider's own pool (spider-held credits
 * `state.playerGold.spider`). */
const REMOTE_POST: PostId = 'remote' as PostId;
const ROVER: PartyId = 'corridor-rovers' as PartyId;
/** The mantel objective — the assault-proximity reference for the
 * §R3.3 economy-sortie safety gate (only sortie when no ant assault is
 * within `REMOTE_SORTIE_SAFE_GATE` of it). */
const OBJECTIVE: PostId = 'mantel' as PostId;

const base = buildFortressDefensePolicy(L7_DEFENSE_CONFIG);

/**
 * §R3.3 — true iff the rover should sortie to CONTEST the Remote this
 * turn. The contest is a genuine garrison-split (the R3.2 on-path
 * intent): the rover detaches from the fortress to deny the ant's
 * card-market income and fund the spider's own pool, which BOTH makes
 * the Remote a real bidirectional contest AND weakens the +5/+2 mantel
 * turtle enough that the RE-ARB-2-funded ant assault can break it (the
 * ruled mechanism by which the funded card market converts to the
 * +pp). Fires when
 *   (1) the Remote is NOT spider-owned (nothing to contest on a node
 *       we already hold — `goldPerTurn` accrues on ownership
 *       regardless of co-location, so a spider-held Remote needs no
 *       rover on it), AND
 *   (2) the scenario is past `REMOTE_RETAKE_DELAY` turns — the ant
 *       gets a genuine early uncontested gold-owning window (the
 *       §R3.3(b) card-economy-funded condition is met) before the
 *       spider starts contesting it back, AND
 *   (3) no ant assault party has closed within `REMOTE_SORTIE_SAFE_GATE`
 *       Chebyshev of mantel (never crack the spine when the decisive
 *       assault is actually landing — the §3.4 fortress ceiling
 *       remains the bound).
 * The ant economy party (`pathfinders`, 6 units, holding with `fight`
 * posture) wins the co-located fight vs the 2-unit rover and completes
 * its 2-turn solo capture once the rover is driven off; the rover
 * regroups and re-contests — the genuine **bidirectional** R3.3(a)
 * flip cycle, with the rover's absence from the fortress the
 * curve-moving cost that lets the funded assault through.
 */
const roverShouldContestRemote = (state: GameState): boolean => {
  const remote = state.posts.get(REMOTE_POST);
  if (remote === undefined || remote.owner === 'spider') return false;
  if (state.turn < REMOTE_RETAKE_DELAY) return false;
  const objLoc = postLocation(state, OBJECTIVE);
  if (objLoc === undefined) return false;
  const ant = closestLivingPartyOfFaction(state, 'ant', objLoc);
  if (ant !== null) {
    const d = distance(objLoc, ant.location);
    if (d !== Number.POSITIVE_INFINITY && d <= REMOTE_SORTIE_SAFE_GATE) return false;
  }
  return true;
};

export const spiderL7: AIPolicy = {
  name: 'spider-l7',
  faction: 'spider',
  decide(state, scenario, rng): GameState {
    // 1. The unchanged shared fortress resolves every spider party's
    //    base orders (the L3/L5 doctrine, byte-identical code path).
    //    The rover resolves the shared fortress path (the RE-ARB-1
    //    §3.1.2 Remote-contest sortie is RETIRED — RE-ARB-2 R2.1).
    const afterBase = base.decide(state, scenario, rng);

    const nextParties = new Map(afterBase.parties);
    let changed = false;

    // 2. §3.4 — spider blitz 5% debut. On the engine's frozen 5% of
    //    seeds, the non-queen fortress parties abandon the leash and
    //    charge the closest ant (an open-arena initiative burst — the
    //    registering ceiling variance). The queen block never charges
    //    (the spine that holds mantel). Overrides the base orders for
    //    the blitz seeds only; the other 95% keep the fortress.
    if (state.spiderBlitzMode === true) {
      for (const [id, party] of afterBase.parties) {
        if (party.faction !== 'spider' || !partyAlive(party) || party.leaderless) continue;
        if (id === QUEEN_BLOCK) continue;
        const ant = closestLivingPartyOfFaction(state, 'ant', party.location);
        if (ant === null) continue;
        if (sameCoord(party.location, ant.location)) continue;
        const chargeOrders = moveToOrHold(party, ant.location);
        if (chargeOrders !== party.orders) {
          nextParties.set(id, { ...party, orders: chargeOrders, posture: 'fight' });
          changed = true;
        }
      }
      // Blitz fully overrides this turn (no combo-glue on top of the
      // all-in charge).
      if (!changed) return afterBase;
      return { ...afterBase, parties: nextParties };
    }

    // 3. §3.3 (spider side) — weld the spinner picket Chebyshev-≤1 to
    //    the queen block so Venom Storm fires whenever the mantel
    //    fortress is assaulted. They garrison the same tile, so this
    //    only corrects a drift: if the spinner picket has strayed off
    //    the queen block (e.g. a leash sortie pulled it >1 away),
    //    pull it straight back beside the queen so the resolver's
    //    Chebyshev-≤1 / same-plane adjacency holds.
    const queen = afterBase.parties.get(QUEEN_BLOCK);
    const spinner = afterBase.parties.get(SPINNER_PICKET);
    if (
      queen &&
      partyAlive(queen) &&
      spinner?.faction === 'spider' &&
      partyAlive(spinner) &&
      !spinner.leaderless
    ) {
      const adjacent =
        queen.location.plane === spinner.location.plane &&
        distance(spinner.location, queen.location) <= 1;
      if (!adjacent) {
        const glueOrders = moveToOrHold(spinner, queen.location);
        if (glueOrders !== spinner.orders) {
          nextParties.set(SPINNER_PICKET, {
            ...spinner,
            orders: glueOrders,
            posture: 'fight',
          });
          changed = true;
        }
      }
    }

    // 4. §R3.3 (spider side) — the RESTORED Remote-contest sortie, made
    //    race-proof (dep #9 makes the Remote a `goldPerTurn` economy).
    //    An L7-opt-in override of the ROVER ONLY (the shared
    //    `capture-chain.ts` fortress is byte-identical — this is a
    //    post-pass over its output, never a modification of it; the
    //    queen block + pickets + the §3.4 ceiling are untouched). When
    //    the contest condition holds (Remote not spider-owned, past the
    //    early ant funding window, the decisive assault not yet landing
    //    on mantel) the rover sorties onto the Remote — a genuine
    //    garrison-split that denies the ant's card income, funds the
    //    spider pool, AND removes the rover from the fortress so the
    //    RE-ARB-2-funded ant assault can convert (the ruled mechanism).
    //    The 6-unit ant economy party holding with `fight` wins the
    //    co-located fight and completes its solo capture; the rover
    //    regroups and re-contests — the bidirectional R3.3(a) cycle.
    const rover = afterBase.parties.get(ROVER);
    if (
      rover?.faction === 'spider' &&
      partyAlive(rover) &&
      !rover.leaderless &&
      roverShouldContestRemote(state)
    ) {
      const remoteLoc = postLocation(state, REMOTE_POST);
      if (remoteLoc !== undefined && !sameCoord(remoteLoc, rover.location)) {
        const sortieOrders = moveToOrHold(rover, remoteLoc);
        if (sortieOrders !== rover.orders) {
          nextParties.set(ROVER, { ...rover, orders: sortieOrders, posture: 'fight' });
          changed = true;
        }
      }
    }

    if (!changed) return afterBase;
    return { ...afterBase, parties: nextParties };
  },
};
