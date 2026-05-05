# Fun Critic rubric

Authoritative rubric for the Fun Critic agent. The orchestrator passes
this verbatim into the agent's prompt when invoking it. Update here,
never inline.

## Mandate

The Fun Critic complements the deterministic critics (metrics,
spec-compliance) by judging whether scenarios are tactically interesting
and watchable, not just whether they pass mechanical checks. From
`PLAN.md`: "Scenarios that pass mechanical checks but fail Fun Critic
review are flagged for redesign."

## What to grade

Beyond the original watchability rubric, the critic now grades these
**objectives explicitly**:

1. **Win-rate band** — ant win rate must lie in `[65%, 80%]` for the
   locked baseline player. (Already enforced by the metrics critic;
   the Fun Critic re-flags it because a balanced win rate is a
   precondition for a fun scenario.)

2. **Strategy diversity** — at least three distinct player strategies
   should achieve **≥ 40% win rate** each. Current variants are
   `baseline`, `rush`, `turtle`, `flank`. The Fun Critic flags when
   only one or two variants are viable; calls out which strategies
   are dead-on-arrival and why.

3. **Composition diversity** — different party compositions should be
   viable, not a single dominant stack. The critic samples replays
   across variants and notes when one composition (e.g.,
   "archers + mage") wins everything and others lose everything. If
   the answer is "only the archer-heavy roster ever survives the web
   assault," that's a finding.

4. **Outcome credibility** — the original rubric criterion. Wins
   should feel earned (built up over phases), losses should feel like
   the player was outplayed, not like the engine ate their orders.

5. **Tactical variety per replay** — does a typical replay show
   distinct phases (capture, counter-push, final assault), use of
   abilities (volley, mend, queen ultimate), and meaningful
   interactions between formations / postures / jelly buffs?

6. **Watchability** — the original rubric criterion. Reading 10
   replays in a row should be interesting, not numbing.

## Permitted tuning levers

The Fun Critic may suggest changes to:

- **Spider AI** (`ai/spider-l1.ts`) — patrol patterns, counter-push
  thresholds, response radii.
- **Initial circumstances** — starting POST ownership, starting party
  positions, party slot capacities.
- **Battlefield** — terrain placement, obstacles, additional POSTs (with
  caveats per the spec-locked POST list).
- **Scenario goals** — supplementary win/loss conditions.
- **Troop mechanics** — unit stats (HP, attack, agility, armor),
  ability params (volley damage, mend heal, queen ult radius), unit
  template counts within parties, slot costs. Per the user's standing
  instruction: troop mechanics are explicitly fair game for the Fun
  Critic to recommend rebalancing.

## Out of scope (still locked)

- `ai/baseline.ts` — the locked reference player AI. Tuning must
  measure against a fixed baseline.
- The 5 spec-locked POST IDs and their faction ownerships:
  `storm-drain` ant, `soap-dish` neutral, `towel-rack` neutral,
  `wall-crack` neutral, `spider-web` spider. New POSTs may be
  proposed but the existing 5 must keep their identities.
- Engine semantics (movement, combat math, capture rules). Spec-faithful
  additions (climbing bypass, opening abilities, capture-on-wipe, the
  6-plane edge geometry) are accepted; new engine features need their
  own design pass.

## Output format

Findings JSON at `critics/findings/fun.json`:

```json
{
  "source": "<input replay directory>",
  "sampled_seeds": [...],
  "per_replay_scores": [{ "seed": N, "decisions_articulable": 0..3, ... }],
  "batch_scores": { "watchability": 0..3, "route_diversity": 0..3,
                    "composition_diversity": 0..3 },
  "findings": [
    {
      "rule": "<one of: win-rate-band, strategy-diversity,
                composition-diversity, outcome-credibility,
                tactical-variety, watchability>",
      "severity": "high|medium|low",
      "observation": "<concrete description, citing patterns>",
      "suggested_action": "<concrete change a tuner could make>"
    }
  ]
}
```

Findings must cite what the critic actually saw in replays. Generic
prose is not useful to the tuner.
