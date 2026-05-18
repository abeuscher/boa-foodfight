/**
 * L8 — ant policy for Level 8 ("The Attic", `data/level-8`,
 * level-progression-plan §2 "L8 — Attic", §5 deviation #2).
 *
 * L8 is the campaign's only `recruit-count` scenario: the ants win ONLY
 * by reaching the recruited-cockroach-party target
 * (`engine/end-of-turn.ts` `recruitedPartyCount` ≥ `target`); reaching
 * the turn cap is an unconditional ant LOSS with no score path
 * (`engine/turn.ts` ~480 — recruit-count is decisive-or-timeout-loss,
 * structurally the L6 sibling, NOT the capture-post L3/L4/L5). It is
 * therefore NOT a capture-post chain-marcher and deliberately does NOT
 * use `ai/capture-chain.ts` (the shared L3/L4/L5 chain-march builder):
 * there is no POST chain to walk, no objective POST to capture, no
 * muster-then-assault — the only winning behaviour is "get a recruiter
 * (ant-mage) onto the neutral cockroach party and convert it before the
 * spider denies it or the clock runs out". This is its own doctrine, a
 * standalone RECRUITER/RACER, exactly as the Level PA brief directs (L8
 * needs its OWN AIs, like L6 did).
 *
 * Engine reality the design is built around (verified against source,
 * §0 — overrides the §2-L8 spec text where they conflict; §5 #2
 * realization-method deviation, flagged in the handoff):
 *
 *   - `engine/neutrals.ts` spawns EXACTLY ONE neutral cockroach party
 *     (`KIND_RECIPE.cockroaches = {templateId:'cockroach', unitCount:8}`,
 *     hardcoded; the frozen engine read the roadmap's "8 cockroach
 *     parties" as 8 UNITS in 1 PARTY). The recruit handler
 *     (`engine/abilities.ts` `recruitNeutral`) converts the WHOLE
 *     neutral party to `faction:'ant'` on success. So
 *     `recruitedPartyCount` tops out at 1 → the only achievable
 *     `target` under the frozen engine is **1** (wired in
 *     `data/level-8/map.json` `victoryCondition`). Recorded
 *     engine-reality deviation from roadmap §4.3.3's "≥4 parties".
 *   - `engine/neutrals.ts` `pickPlanes` assigns the cockroach party a
 *     RANDOM plane of the 5 non-mice planes; `pickSpawnTile` returns
 *     null (no spawn) if that plane has no passable tile. A 2-plane
 *     (floor+ceiling) attic would spawn a cockroach only ~16/100 seeds
 *     (the other 84 unwinnable). `data/level-8/map.json` therefore
 *     declares ALL 6 planes (floor + clipped ceiling carry the cramped
 *     identity; the 4 walls are open spawn-safety + cross-plane reach
 *     scaffolding). Verified: cockroach spawns 100/100 seeds.
 *
 * Geometry (`data/level-8/map.json`, §2-L8 + §5 #2): a static 10×10.
 * FLOOR is the cramped cruciform attic crawl — open = (cols 3–6, any
 * row) ∪ (rows 3–6, any col); everything else obstacle (the sloping
 * eaves / wedged boxes). Orthogonally convex → the §0 strict-greedy
 * invariant holds GLOBALLY (an exhaustive all-open-tile × all-open-tile
 * sweep finds ZERO stuck ordered pairs — `engine/movement.ts`
 * `pickGreedyStep` never sticks; the cruciform is twisty/cramped but
 * always navigable). CEILING is heavily clipped — a 5×5 patch
 * (rows/cols 3–7) plus a 1-wide col-5 reach spine (also strict-greedy
 * clean): the L8 identity vs L6 (the ceiling is NOT a free flyer lane
 * here). The 4 wall planes are open 10×10 (inert to the AI doctrine
 * per §4d — the recruit/deny fight is on the floor; they exist so the
 * frozen plane-blind cockroach spawn always lands a REACHABLE party:
 * the ant-mage reaches any plane via `ant-plane-switch`
 * `engine/movement.ts:tryPlaneTransition` #1, and both factions reach
 * walls via floor/ceiling↔wall edge adjacency from the cruciform's
 * border tiles).
 *
 * Six POSTs (§4.2 5–8 rule, L8:6 — positional/economy, NOT an
 * objective POST since `recruit-count` has none): `hatch` (ant
 * home/staging, floor (5,8)), `spider-nest` (spider staging, floor
 * (4,1)), `trunk` (central treasure + the floor↔ceiling
 * plane-transition pair, neutral, floor (5,5) — dead centre, the
 * natural midpoint of the recruit race), `rafter-beam` (ceiling (5,5),
 * `trunk`'s transition partner, so a ceiling-spawned cockroach is
 * reachable through the duct by non-mage parties too), `box-fort-west`
 * /`box-fort-east` (the two contested recruit-race loci, neutral, the
 * west/east ends of the horizontal arm at (1,4)/(8,5) — they frame the
 * centre so the race is a two-sided pull, not a walkover). The
 * recruiter neither chains nor captures any of them — recruit-count
 * has no capture objective.
 *
 * Strategy (one sentence, per the §3.4.3 learnability rule):
 *
 *   The two mage-bearing parties (`pathfinders`, `vanguard-bravo` —
 *   the recruiters) race to the single neutral cockroach party and
 *   fire `recruit` the instant they are co-located (the only path to
 *   the win); the remaining field parties screen the recruiters by
 *   bodying the closest spider to the cockroach (denying the spider's
 *   hypnotize/kill of the prize), the queen-guard holds `hatch`, and
 *   any field party below the low-HP threshold runs — until the
 *   cockroach party is ant-owned (the recruit-count win) or the clock
 *   runs out (the loss).
 *
 * Greedy navigability (the §0 strict-closer-neighbour argument):
 *   - Floor (recruiters + screens): the cruciform open region is
 *     orthogonally convex, so for EVERY pair of open floor tiles a
 *     strictly-closer (Manhattan) open neighbour exists at the source
 *     (exhaustive 64×64 sweep: 0 stuck pairs). The cockroach is
 *     stationary at its seeded spawn tile; whatever floor tile that
 *     is, every faction's greedy descent reaches it without sticking.
 *   - Cross-plane (cockroach off the floor): a recruiter party carries
 *     an `ant-mage`, so `tryPlaneTransition` #1 teleports it to the
 *     cockroach's exact (x,y) on ANY plane when its `move-to` targets a
 *     cross-plane tile — no POST needed, no stick. Non-mage screens /
 *     the spider reach a wall/ceiling cockroach via the open walls +
 *     floor/ceiling↔wall edge adjacency (both clean, no interior
 *     obstacle on the walls).
 *
 * Determinism: pure (state) → state via the locked read-only
 * `buildAntPolicy` helper (the same import surface `ai/capture-chain.ts`
 * uses — `ai/policy-helpers.ts` is NOT modified) plus the shared
 * read-only `ai/neutral-recruit-helper.ts` (the campaign recruit
 * surface `baseline.ts` itself uses; consumed, NOT modified) and
 * `ai/closest-party.ts` (the additive L6 shared scan, read-only); no
 * RNG is consulted — fully replayable. Additive; registered ONLY under
 * `SCENARIO_PLAYER_AIS` (never `PLAYER_AIS`) so the gate-29 diversity
 * sweep stays byte-identical, and it touches NEITHER
 * `ai/capture-chain.ts` NOR `ai/picket-defense.ts` NOR
 * `ai/closest-party.ts` default behaviour (L3/L4/L5/L6 + the tutorial
 * share those and stay byte-identical).
 *
 * The §5 L8 target is the continued descent toward L10 ~50 (the
 * Gameplay PA sets the exact band — roughly ~50–56, the "hard level
 * before the end" spike). The orchestrator + Gameplay PA tune toward
 * it after applying the ruled L8 mechanic delta (recruit tuning /
 * hypnotize-full-restore / tiered-MP); this recruiter/racer is the
 * stable pre-delta baseline doctrine.
 */

import type { GameState, Party, TileCoord } from '../engine/types.ts';

import { closestLivingPartyOfFaction } from './closest-party.ts';
import { tryOpportunisticRecruit } from './neutral-recruit-helper.ts';
import { partyShouldFlee } from './picket-defense.ts';
import {
  buildAntPolicy,
  CEILING_CAPABLE,
  moveToOrHold,
  type PartyDecision,
} from './policy-helpers.ts';
import { cockroachParty } from './recruit-race-helper.ts';
import type { AIPolicy } from './types.ts';

/** Round-15-style low-HP retreat threshold (mirrors the shared
 * chain-march / tutorial / L6 value; recruit-count keeps the same flee
 * discipline so a broken screen doesn't feed itself piecemeal and
 * strand the recruiters). */
const FLEE_HP_THRESHOLD = 0.3;
const FLEE_ORDER = { kind: 'flee' as const };

/** The lone neutral cockroach party (the recruit prize) is read via
 * the shared `recruit-race-helper` `cockroachParty` scan (additive,
 * jscpd-0; the same lookup `spider-l8` uses so both sides read the
 * prize identically). */

/** True iff this party carries a living recruiter (ant-mage → the
 * `recruit` ability). Hardcoded by the L6/L8 ceiling-capable id set,
 * which is exactly the two mage-bearing parties in the L8 roster
 * (`pathfinders`, `vanguard-bravo`). */
const isRecruiter = (party: Party): boolean => CEILING_CAPABLE.has(party.id);

export const baselineL8Player: AIPolicy = buildAntPolicy('baseline-l8', (state: GameState) => {
  return (party: Party): PartyDecision | null => {
    const fleeing = partyShouldFlee(party, state.unitTemplates, FLEE_HP_THRESHOLD);
    const cockroach = cockroachParty(state);

    if (cockroach === null) {
      // No neutral cockroach party (recruited already → the win
      // resolves this end-of-turn, or — defensively — none visible).
      // Hold; flee if broken.
      return fleeing ? { orders: [FLEE_ORDER], posture: 'run' } : { orders: [], posture: 'fight' };
    }

    if (isRecruiter(party)) {
      // Recruiter: the instant we are co-located with the cockroach,
      // fire `recruit` (the shared campaign surface — same helper
      // `baseline.ts` uses; 25%/turn, repeats until success). Until
      // then, race to the cockroach's tile. A cross-plane target is
      // resolved by the ant-mage plane-switch (`tryPlaneTransition`
      // #1 → teleport to the same (x,y) on the cockroach's plane).
      const recruit = tryOpportunisticRecruit(state, party);
      if (recruit) {
        return fleeing ? { orders: [FLEE_ORDER, ...recruit.orders], posture: 'run' } : recruit;
      }
      const target: TileCoord = cockroach.location;
      const moveOrders = moveToOrHold(party, target);
      return fleeing
        ? { orders: [FLEE_ORDER, ...moveOrders], posture: 'run' }
        : { orders: moveOrders, posture: 'fight' };
    }

    // Screen: body-block the spider party closest to the cockroach (the
    // actual threat to the prize — it would hypnotize/kill it), so the
    // recruiters get clean co-located turns. If no spider is alive,
    // rally on the cockroach to keep the screen tight around it.
    const threat = closestLivingPartyOfFaction(state, 'spider', cockroach.location);
    const screenTarget: TileCoord = threat ? threat.location : cockroach.location;
    const moveOrders = moveToOrHold(party, screenTarget);
    return fleeing
      ? { orders: [FLEE_ORDER, ...moveOrders], posture: 'run' }
      : { orders: moveOrders, posture: 'fight' };
  };
});
