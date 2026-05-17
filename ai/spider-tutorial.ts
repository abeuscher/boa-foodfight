/**
 * Phase D-0 — spider policy for the stripped tutorial Level 1
 * (`data/level-1-tutorial`, roadmap §3.2).
 *
 * Companion to `ai/baseline-tutorial.ts`. The stripped kit gives the
 * spider exactly two unit types (queen + soldier) and ZERO spider
 * abilities (web-tangle / web-mend / web-snare / spawn-spiderlings /
 * venom-blast / hypnotize are all stripped out of
 * `data/level-1-tutorial/abilities.json`). So this AI cannot — and must
 * not try to — do anything the full `ai/spider-l1.ts` does. It is
 * additive; `ai/spider-l1.ts` is untouched and still drives gate-29.
 *
 * Heal-priority is OFF here, deliberately. The mechanic-distribution
 * plan §3 ruling F ("heal-priority web-defense ON at L1, mild tuning a
 * named L1 exit gate") applies to the FULLY-LOADED L1 (gate-29, the
 * canonical all-mechanics reference) — that scenario's spider has
 * `web-mend`. The stripped tutorial has no heal ability at all, so
 * there is nothing to prioritise; ruling F is not in scope for the
 * stripped kit. (Confirmed against `docs/mechanic-distribution-plan.md`
 * §3 ruling F and §4: the L1=58% reconciliation note explicitly says
 * the stripped kit removes the spider's advanced toolkit.)
 *
 * Behavior — the spec tutorial-transparent web defense:
 *
 *   1. web-guard (queen-bearing): the immovable last line. It never
 *      leaves the web tile. Losing it is losing the scenario for the
 *      spider, and a learner must see a defender that *holds ground*.
 *   2. web-watch / web-picket (soldier parties): hold near the web
 *      until an ant party closes within a short leash, then surge to
 *      that ant's tile to body-block the assault on the web. Outside
 *      the leash they drift back to their web-anchor tile so the web
 *      always reads as a defended strongpoint, not an empty objective.
 *
 * No storm-drain raid, no ambush re-engage, no neutral hypnosis: those
 * are L2+ behaviors (ruling A: retreat threat-assessment / ambush is
 * L2; the spider's offensive toolkit is gated ≥L2 throughout the plan).
 *
 * Determinism: pure (state) → state; the only mutation is this
 * faction's parties' `orders`. No RNG consulted; fully replayable.
 *
 * Imports: engine/types, engine/coord, ai/policy-helpers,
 * ai/threat-flee, ai/types (the spider-l2 import surface).
 */

import type { PartyId } from '../engine/types.ts';

import { buildPicketDefensePolicy } from './picket-defense.ts';
import { SPIDER_WEB } from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/** The queen-bearing party that anchors the web. Never moves. */
const WEB_GUARD: PartyId = 'web-guard' as PartyId;

/**
 * Chebyshev range at which a holding soldier party breaks its anchor
 * hold and surges to intercept an approaching ant. A short leash keeps
 * the web reading as a sequence of "the spiders come to meet you"
 * beats rather than one undifferentiated swarm (tutorial transparency).
 */
const INTERCEPT_RADIUS = 4;

export const spiderTutorial: AIPolicy = buildPicketDefensePolicy(
  'spider-tutorial',
  WEB_GUARD,
  INTERCEPT_RADIUS,
  // Touch the web post id so a future map rename surfaces here rather
  // than silently desyncing the defense from the objective (behaviour
  // preserved verbatim from the pre-refactor inline policy).
  () => {
    void SPIDER_WEB;
  },
);
