/**
 * L8 — spider AI for Level 8 ("The Attic", `data/level-8`).
 *
 * Companion to `ai/baseline-l8.ts`. L8 is the campaign's only
 * `recruit-count` scenario: the ants win ONLY by recruiting the neutral
 * cockroach party to the `target` (1, the frozen-engine ceiling — see
 * `ai/baseline-l8.ts` header); the spider wins by DENYING that recruit
 * and surviving — reaching the turn cap is an unconditional ant LOSS
 * with no score path (`engine/turn.ts` ~480,
 * `engine/end-of-turn.ts` `recruitedPartyCount`). The spider is
 * therefore a RACER/DENIER, the structural sibling of the L6
 * survivalist but with a different objective object: the prize is the
 * single stationary neutral cockroach party, not a landing.
 *
 * It deliberately does NOT use `ai/capture-chain.ts`
 * (`buildFortressDefensePolicy` is the L3/L4/L5 counter-edge/end-door
 * fortress doctrine — a different game) nor `ai/picket-defense.ts`
 * (`spider-tutorial` web defense). It is a standalone policy on the
 * `spider-l6` import surface (engine/coord, engine/parties,
 * engine/types, ai/closest-party, ai/policy-helpers, ai/threat-flee,
 * ai/types), so `spider-l3`/`-l4`/`-l5`/`-l6`/`-tutorial` and the
 * shared builders stay byte-for-byte untouched.
 *
 * The recruit-deny mechanics the AI exploits (verified against the
 * engine):
 *
 *   - Neutral parties NEVER trigger a battle
 *     (`engine/movement.ts` collision pairing skips any pair with a
 *     neutral). So a spider sitting ON the cockroach tile does not
 *     fight it — but an ANT recruiter that then steps onto that tile
 *     collides with the spider and an ant-vs-spider BATTLE fires
 *     (post-movement). That battle is the denial: the recruiter must
 *     win through the spider before it ever gets a clean co-located
 *     turn to fire `recruit` (abilities resolve BEFORE movement, so a
 *     recruiter only converts the cockroach on a turn it STARTS
 *     co-located and unobstructed).
 *   - The cockroach party is stationary at its seeded spawn tile, on a
 *     RANDOM plane (`engine/neutrals.ts` `pickPlanes`). The L8 map
 *     declares all 6 planes so it always spawns; the spider reaches a
 *     wall/ceiling spawn via the open walls + floor/ceiling↔wall edge
 *     adjacency, the same routes the ant screen uses.
 *   - Timeout is an ant loss: every turn the recruit is denied is
 *     progress for the spider, so "occupy the prize and out-last the
 *     clock" is a real win path (unlike the capture-post grind, §4c).
 *
 * Strategy (one sentence, §3.4.3 learnability):
 *
 *   The field parties INTERCEPT — each bodies the ant party currently
 *   closest to the lone neutral cockroach (the recruiter racing for
 *   the prize), falling back to camp the cockroach tile itself only
 *   when NO ant is near it, so an arriving recruiter is fought before
 *   it gets a clean co-located turn but the prize is never made
 *   absolutely unreachable (a genuine, tunable race, NOT the
 *   degenerate perfect-camp turkey-shoot the L6 arbitration warns
 *   against); the queen block anchors `spider-nest` (kept intact and
 *   out of the scrum so a broken contest can re-form), and a field
 *   party below the heal threshold peels back to `spider-nest` to
 *   regen and re-commits — so the ant must fight a recovering screen
 *   off the prize while the clock ticks toward its timeout loss.
 *
 * Why this is the right pre-delta doctrine (NOT a turtle, NOT a
 * suicide charge): a static turtle on `spider-nest` ignores the prize
 * entirely → the ant recruiter walks onto an uncontested cockroach and
 * wins early (a turkey-shoot the other way). Independently charging the
 * nearest ant scatters the spider off the one tile that matters. The
 * cockroach tile is the ONLY contested point in a `recruit-count`
 * game; concentrating the field force ON it (and recovering off
 * `spider-nest`) is the doctrine that converts the timeout-loss
 * structure into spider wins. The Gameplay-PA L8 delta (hypnotize
 * full-power / recruit tuning / tiered-MP — NOT designed here) layers
 * onto exactly this "be on the prize" positioning; the orchestrator +
 * loop tune it after.
 *
 * Determinism: pure (state) → state inside the policy; scans iterate
 * `state.parties` in insertion order with a lower-party-id tiebreak
 * (the shared `closestLivingPartyOfFaction`); no RNG is consulted —
 * fully replayable.
 */

import type {
  AbilityId,
  AbilityOrder,
  GameState,
  Order,
  Party,
  PartyId,
  PostId,
  TileCoord,
} from '../engine/types.ts';

import {
  buildMissionSpiderPolicy,
  closestLivingPartyOfFaction,
  distance,
  livingHpFraction,
  moveToOrHold,
  sameCoord,
} from './mission-spider-policy.ts';
import { cockroachParty } from './recruit-race-helper.ts';
import type { AIPolicy } from './types.ts';

/**
 * BINDING within-loop doctrine (L8-opt-in, this file only — the shared
 * `buildMissionSpiderPolicy` decide() loop is NOT changed):
 * **"spider hypnotize-priority + queen-vector"**
 * (`docs/debate/l8-gameplay-pa-arbitration.md` §3.5.2, a RULED
 * INVARIANT). A non-queen-block field party that is co-located with the
 * recruitable neutral cockroach party fires `hypnotize` on it BEFORE
 * any generic intercept/hold. On engine success the cockroach is
 * seized for the hardcoded full-power 5–10 turns
 * (`engine/abilities.ts` `handleHypnotize`) and the engine's neutral
 * driver (`ai/neutral.ts` — a spider-hypnotized neutral seeks the
 * CLOSEST ant party and steps at it every turn) automatically marches
 * the seized roach at the ant column / queen — the "queen-vector" is
 * thus engine-automatic once the seizure lands; the doctrine's live,
 * AI-exercised obligation is to PRIORITIZE spending a caster onto the
 * prize to fire the seizure (not a random distant target). Its
 * existence in a seed-robust majority is the §3.5.2 invariant; the
 * trigger geometry / tuning is the within-loop latitude. */
const HYPNOTIZE: AbilityId = 'hypnotize' as AbilityId;

/** Constructs the `hypnotize` use-ability order targeting the lone
 * neutral cockroach party (the seizure that weaponizes the prize at the
 * ant queen via the engine's hypnotized-neutral driver). */
const hypnotizeOrder = (target: PartyId): AbilityOrder => ({
  kind: 'use-ability',
  abilityId: HYPNOTIZE,
  target,
});

/** The queen-bearing block. It anchors `spider-nest` (kept whole and
 * OUT of the cockroach scrum) so a broken blockade can re-form behind
 * it; it never joins the race (the spine must not be spent — though,
 * unlike L6 eradicate, a dead spider queen is not itself an ant win in
 * recruit-count, keeping it intact preserves the contest mass). */
const QUEEN_BLOCK: PartyId = 'end-guard' as PartyId;

/** The spider home/recovery POST (`data/level-8/map.json`). The queen
 * block anchors it; a hurt field party peels back here to regen on its
 * `healingRate` before re-committing to the prize. */
const SPIDER_NEST: PostId = 'spider-nest' as PostId;

/**
 * The PRIMARY smooth aggression knob the within-scenario loop tunes
 * toward the ruled band (the L6 `SORTIE_LEASH` shape, chosen over an
 * HP gate because `recruit-count` games resolve fast — median ~a
 * handful of turns — so an HP-fraction gate almost never fires and is
 * a DEAD lever here, the §4e/§4f dead-zone failure mode; a distance
 * gate fires every turn and is genuinely live). A field party only
 * diverts to deny while the ant party racing the cockroach is within
 * `DENY_LEASH` Manhattan of it; otherwise the field party holds at
 * `spider-nest` (massed, not feeding itself piecemeal into the
 * cruciform). Larger leash → denies earlier/more often → lower ant
 * win rate; smaller → the recruiter buys more clean co-located turns
 * → higher ant win rate. The shipped value is a mid starting point;
 * the orchestrator + Gameplay PA retune it (and apply the ruled L8
 * recruit/hypnotize delta) toward the §5 band after. */
const DENY_LEASH = 6;

/**
 * Secondary discipline (NOT the curve lever — kept low so it rarely
 * fires, since fast games make it inert as a tuning knob; it only
 * stops a near-dead party from suiciding into the prize). Living-HP
 * fraction below which a contesting field party peels back to
 * `spider-nest` to regen and re-commits once healed.
 */
const HEAL_RETREAT_HP = 0.25;

/**
 * The designated SEIZER field party — the §3.5.2 queen-vector arm. It
 * always vectors onto the cockroach tile to fire the hypnotize-priority
 * seizure (rather than only bodying the ant racer), so the ruled
 * invariant provably fires in a seed-robust majority (the L4-§9 /
 * L6-§3.1.2 "the AI must actually aim the ruled lever" discipline). The
 * remaining field parties run the distance-gated intercept of the ant
 * racer (the deny screen). Splitting one party onto the prize + the
 * rest onto the racer is the doctrinally-clean "spend a caster on the
 * prize while the screen buys it the clean co-located turn" shape. */
const SEIZER: PartyId = 'corridor-rovers' as PartyId;

/**
 * The deny-screen commitment cap (L8-opt-in within-loop tuning latitude
 * — this file only, NOT a shared-builder DEFAULT). At most this many
 * screen pickets (the non-queen-block, non-seizer field parties)
 * actively body the ant racer at once — the closest-to-the-cockroach
 * `SCREEN_DENIER_CAP` of them; the rest hold massed at the nest. This
 * is the FINE continuous bridge between "no deny screen" (cap 0 — the
 * race uncontested by the pickets) and "the full screen commits" (cap
 * ≥ picket count — the original two-picket wall), letting the loop
 * land cleanly inside the §5 band without exceeding the ruled
 * `recruit.successRate` ceiling and without gutting the spider's
 * RACER/DENIER identity (a smaller screen is still a real, doctrinally
 * coherent deny — the §3.1 "genuine, tunable race" the file header
 * describes, just lighter; the §3.5.2 hypnotize-priority + queen-vector
 * SEIZER arm — the ruled invariant — is unaffected, it runs ahead of
 * this gate). Larger cap → more deniers → lower ant win rate. */
const SCREEN_DENIER_CAP = 2;

/**
 * Rank of `id` among the living screen pickets by Manhattan distance to
 * the cockroach (0 = closest). Screen pickets = field parties that are
 * neither the queen block nor the seizer. Deterministic: ties broken by
 * `state.parties` insertion order (the same stable order every shared
 * scan in this file uses), so the active-denier set is replay-stable.
 * A party not in the screen set returns a rank ≥ the screen size (it is
 * never gated by the cap — it has its own branch above). */
const screenRank = (state: GameState, id: PartyId, prizeLoc: TileCoord): number => {
  const ranked: { id: PartyId; d: number }[] = [];
  for (const [pid, p] of state.parties) {
    if (pid === QUEEN_BLOCK || pid === SEIZER) continue;
    if (p.faction !== 'spider') continue;
    if (!p.units.some((u) => u.currentHp > 0)) continue;
    ranked.push({ id: pid, d: distance(p.location, prizeLoc) });
  }
  // Stable sort by distance; insertion order is the natural tiebreak
  // because `ranked` is built in `state.parties` iteration order and
  // Array.prototype.sort is stable (ES2019+).
  ranked.sort((a, b) => a.d - b.d);
  return ranked.findIndex((r) => r.id === id);
};

/** The lone neutral cockroach party (the contested prize) — the
 * shared L8 `recruit-race-helper` scan (additive, jscpd-0; the same
 * lookup `baseline-l8` uses, so the two sides read the prize
 * identically). Null once recruited (the ant has won; the engine
 * resolves it that end-of-turn) — the deniers have nothing left. */

/** `spider-nest`'s tile (the queen anchor / heal fallback). */
const nestLoc = (state: GameState): TileCoord | undefined => state.posts.get(SPIDER_NEST)?.location;

/**
 * Per-party orders (the concentrated race-and-deny doctrine):
 *
 *   0. Queen block → anchor `spider-nest` (kept whole, out of the
 *      scrum) and never race.
 *   1. Heal-retreat gate (secondary discipline, rarely fires): a
 *      field party below `HEAL_RETREAT_HP` peels back to `spider-nest`
 *      to regen (re-commits once healed).
 *   2. Distance-gated intercept (the live smooth lever): while the ant
 *      racing the cockroach is within `DENY_LEASH` of it, body that
 *      recruiter so it is fought before a clean co-located recruit
 *      turn — NOT a perfect camp (the race stays contestable/tunable).
 *   2b. Racer not yet near the prize → hold massed at `spider-nest`
 *      (don't trickle into the cruciform before the contest is live).
 *   3. Prize gone (recruited / none): hold (the engine resolves the
 *      ant win this end-of-turn).
 */
const ordersFor = (state: GameState, id: PartyId, party: Party): readonly Order[] => {
  const nest = nestLoc(state);
  if (nest === undefined) return [];

  // 0. Queen block: anchor the nest, never race.
  if (id === QUEEN_BLOCK) {
    if (sameCoord(party.location, nest)) return [];
    return moveToOrHold(party, nest);
  }

  // 1. Heal-retreat gate: a hurt field party falls back to the nest
  //    to regen, regardless of the race.
  const hurt = livingHpFraction(party, state.unitTemplates) < HEAL_RETREAT_HP;
  if (hurt) {
    if (sameCoord(party.location, nest)) return [];
    return moveToOrHold(party, nest);
  }

  const cockroach = cockroachParty(state);
  if (cockroach === null) {
    // 3. Prize recruited / gone — nothing left to deny.
    return [];
  }

  // 1.5 HYPNOTIZE-PRIORITY (the §3.5.2 ruled invariant — the live,
  //     AI-exercised obligation). A healthy field party that is
  //     co-located with the still-seizable cockroach fires `hypnotize`
  //     on it THIS turn, ahead of any generic intercept/hold. The
  //     engine (`handleHypnotize`) auto-fails+consumes silently if the
  //     roach is already spider-controlled or rebound-immune, so
  //     issuing it unconditionally when co-located is safe and is the
  //     correct "spend the caster on the prize, not a random target"
  //     behaviour. On success the engine's neutral driver marches the
  //     seized roach at the closest ant (the queen-vector) for the
  //     hardcoded full-power 5–10 turns.
  const status = state.neutralStatus.get(cockroach.id);
  const seizable =
    status !== undefined && status.hypnotizedBy !== 'spider' && status.spiderImmunityRemaining <= 0;
  if (seizable && sameCoord(party.location, cockroach.location)) {
    return [hypnotizeOrder(cockroach.id)];
  }

  // 1.6 SEIZER queen-vector arm: the designated seizer ALWAYS marches
  //     ONTO the cockroach tile so the §3.5.2 hypnotize-priority above
  //     provably gets a co-located turn to fire — the ruled invariant
  //     must fire in a seed-robust MAJORITY, not only when an ant
  //     happens to body it onto the prize (the L4-§9 / L6-§3.1.2 "the
  //     AI must actually aim the ruled lever" discipline). This is
  //     deliberately UNGATED: contest-gating the seizer was empirically
  //     shown to drop hypnotize firing to ZERO games (the recruiter is
  //     faster than the nest→prize travel), which IS the L4-§9
  //     falsification — so the seizer's prize-vector is a ruled
  //     invariant, NOT a tuning knob. Once the roach is spider-seized
  //     the engine's neutral driver marches it at the closest ant — the
  //     queen-vector is engine-automatic from there, so the seizer
  //     reverts to the intercept screen (no longer seizable → falls
  //     through). The curve lever is the deny-screen aggression
  //     (`DENY_LEASH`/`SCREEN_DENIER_CAP`) + ruled `recruit.successRate`,
  //     NOT this arm.
  const racer = closestLivingPartyOfFaction(state, 'ant', cockroach.location);
  if (id === SEIZER && seizable) {
    if (sameCoord(party.location, cockroach.location)) return [];
    return moveToOrHold(party, cockroach.location);
  }

  // 2. Distance-gated intercept (the live smooth lever). Only divert
  //    to deny while the ant racing the cockroach is within
  //    `DENY_LEASH` of it; body that recruiter (fought before a clean
  //    co-located recruit turn) — not a perfect camp, so the race
  //    stays contestable/tunable (the L6-sortie counter-punch shape).
  //    Outside the leash, hold massed at the nest (don't trickle into
  //    the cruciform early).
  const racerNear = racer !== null && distance(racer.location, cockroach.location) <= DENY_LEASH;
  // Screen-commitment cap: only the closest `SCREEN_DENIER_CAP` pickets
  // actively deny; pickets beyond the cap hold massed at the nest (a
  // lighter — but still real — deny screen, the fine bridge into the §5
  // band). The seizer arm above is unaffected (it returned already).
  const committed = screenRank(state, id, cockroach.location) < SCREEN_DENIER_CAP;
  if (!racerNear || !committed) {
    if (sameCoord(party.location, nest)) return [];
    return moveToOrHold(party, nest);
  }
  const target: TileCoord = racer ? racer.location : cockroach.location;
  if (sameCoord(party.location, target)) return [];
  return moveToOrHold(party, target);
};

/**
 * The standalone L8 racer/denier policy. The generic decide() loop is
 * the shared `buildMissionSpiderPolicy` (the same additive
 * consolidation `spider-l6` uses — jscpd-0, no locked path touched).
 */
export const spiderL8: AIPolicy = buildMissionSpiderPolicy('spider-l8', ordersFor);
