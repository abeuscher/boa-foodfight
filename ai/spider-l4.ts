/**
 * L4 — spider policy for Level 4 ("The Hallway", `data/level-4`).
 *
 * Companion to `ai/baseline-l4.ts`. L4 is a `capture-post` scenario:
 * the spider must keep the ants from capturing end-door (floor 9,4,
 * +5 def, +2 heal), which it starts holding. The ant baseline marches
 * the canonical Doorway chain (doorway-east → doorway-mid →
 * doorway-west), musters on doorway-west, then assaults the spider-held
 * objective as one mass. The three Doorway POSTs are per-seed
 * row-jittered in the corridor band (rows 3–6); the loader resolves
 * them once at scenario load, so the spider — like the ant — just reads
 * `state.posts` and never has to anticipate the randomization.
 *
 * Same fortress-attrition doctrine as `ai/spider-l3.ts`, retargeted
 * from the Kitchen's counter-edge to the Hallway's end-door. L3 and L4
 * are the same defensive shape, so both are thin configs over the
 * shared `buildFortressDefensePolicy` (`ai/capture-chain.ts`) — the
 * same consolidation precedent as `ai/picket-defense.ts`. end-door is
 * spider-owned, so a spider party standing on it gets BOTH the +5
 * defensive bonus AND +2 healing every turn
 * (`engine/end-of-turn.ts` heals only on a friendly-owned post), while
 * the ants must cross the open corridor band to reach it. Concentrating
 * force on that tile turns every assault into a losing trade and denies
 * the capture by co-location (the 2-turn capture in
 * `engine/post-capture.ts` only ticks when the capturer is *alone*).
 * The single straight corridor axis removes any flank, so the
 * randomized Doorway rows are the only variance — the muster-gated
 * rover absorbs that variance by reacting to where the ant mass
 * actually forms up rather than to a fixed staging tile.
 *
 * The shared builder does NOT use `buildPicketDefensePolicy`, so
 * `ai/picket-defense.ts` — and therefore `spider-tutorial` /
 * `spider-l3` — is left exactly as-is and the stripped tutorial still
 * measures 76 and L3 still measures 67.
 *
 * Strategy (one sentence, §3.4.3 learnability):
 *
 *   The whole spider force PERMANENTLY turtles on the +5/+2 end-door
 *   fortress (the within-loop sweep proved any forward sortie into the
 *   +2-buffed corridor is annihilated and hands the ant the score
 *   tiebreak — L3-shape sortie measured ant 99%, pure turtle ant 23%),
 *   EXCEPT `north-picket`, which from the fortress darts only a shallow
 *   leash to the switch's floor projection to body-block the ant's
 *   mage detachment and contest the flip (re-arbitration §9.3(b).2),
 *   then falls straight back to bank the heal.
 *
 * Roles: end-guard (queen-bearing) pins end-door; south-picket and
 * corridor-rovers PERMANENTLY pin the fortress (`permanentPin` — the
 * pure-turtle base, ant 23%); `north-picket` is the shallow
 * Light-Switch floor-projection defender on the `SWITCH_GARRISON_RADIUS`
 * leash (§9.3(b).2 — the single, tunable forward element that lifts the
 * 23% turtle floor toward the band).
 *
 * The §9.3(b).2 garrison-split is the load-bearing correction: under
 * §4a the spider held the switch *for free all game* (the ant AI never
 * contested it), making the ruled `combatModifier` a permanent
 * army-wide ant +2 (measured ant 99%). The re-derived L4 geometry fact
 * (`engine/edges.ts`: floor↔north-wall connects only at floor y=0,
 * solid paneling here) means a spider physically cannot stand on the
 * north-wall switch — the §3.I range-limit. So the spider contests it
 * the only way it can: `north-picket` darts from the turtle to the
 * switch's *floor projection* to body-block the ant detachment, then
 * retreats — a genuine but minimal-exposure §3.2 garrison-split that
 * delays/bleeds the flip without feeding the fortress to the +2. The
 * contest *difficulty* (the `SWITCH_GARRISON_RADIUS` exposure, paired
 * with the ant-side `musterRing`) is the within-loop tuning lever
 * toward the §9.4 [58,61] band; the *existence* of the contest is the
 * §9 ruled invariant. This is opt-in config (`switchDefense`); L3
 * omits it and the fortress defense is byte-identical (L3-67 unchanged,
 * re-verified post-tune).
 *
 * Determinism: pure (state) → state inside the shared builder; scans
 * iterate `state.parties` in insertion order with a lower-party-id
 * tiebreak; no RNG is consulted — fully replayable.
 */

import type { PartyId, PostId } from '../engine/types.ts';

import { buildFortressDefensePolicy, type FortressDefenseConfig } from './capture-chain.ts';
import type { AIPolicy } from './types.ts';

/**
 * Inert under the L4 `permanentPin` turtle (kept only to satisfy the
 * shared `FortressDefenseConfig` shape and the L3 sortie semantics).
 * On L4 every picket/rover is pinned to the fortress for the whole
 * scenario (the within-loop sweep proved any forward sortie into the
 * +2-buffed corridor is fatal), so the picket sortie leash is never
 * consulted. Left at the L3 plateau-centre value for documentation
 * continuity; changing it does NOT move L4 (and L3 — which uses its
 * own `spider-l3.ts` value — is untouched).
 */
const INTERCEPT_RADIUS = 10;

/**
 * Inert under the L4 `permanentPin` turtle (see `INTERCEPT_RADIUS`).
 * The rover never sorties on L4 — it pins the fortress — so this gate
 * is not consulted. Left at the prior value for continuity.
 */
const ROVER_GATE = 6;

/**
 * Chebyshev leash from the switch's FLOOR PROJECTION within which the
 * shallow switch defender (`north-picket`) darts off the fortress to
 * body-block the ant's mage detachment, then retreats (re-arbitration
 * §9.3(b).2). The single forward element on top of the pure-turtle
 * base, and the spider-side contest-difficulty knob. Swept seeds
 * 1..100 vs `baseline-l4` (detach=`vanguard-bravo`, not spent,
 * `detachGate:'muster'`, ant `musterRing:4`):
 *   0 → ant 23 (pure turtle, defender never darts — over-strong),
 *   1 → ant 60 (defender hugs the fortress, darts only point-blank —
 *       the band centre, paired with `musterRing:4`),
 *   ≥2 → ant 81–91 (defender chases deep into the buffed corridor and
 *       is annihilated — over-weak).
 * 1 is the shipped value: the defender contests the flip (the switch
 * still flips to ant in 100/100 seeds — §9.3(b) transience invariant)
 * at minimum fortress exposure. The `musterRing` plateau (3/4/5 all =
 * ant 60) is what makes this calibration robust rather than knife-edge.
 */
const SWITCH_GARRISON_RADIUS = 1;

const L4_DEFENSE_CONFIG: FortressDefenseConfig = {
  name: 'spider-l4',
  objective: 'end-door' as PostId,
  guard: 'end-guard' as PartyId,
  pickets: ['south-picket' as PartyId],
  rover: 'corridor-rovers' as PartyId,
  interceptRadius: INTERCEPT_RADIUS,
  roverGate: ROVER_GATE,
  switchDefense: {
    post: 'light-switch' as PostId,
    defender: 'north-picket' as PartyId,
    garrisonRadius: SWITCH_GARRISON_RADIUS,
    defensiveFortressWhileLit: true,
    permanentPin: true,
  },
};

export const spiderL4: AIPolicy = buildFortressDefensePolicy(L4_DEFENSE_CONFIG);
