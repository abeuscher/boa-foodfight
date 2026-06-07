/**
 * Expand the live event stream into a flat list of log entries for the
 * right-rail activity feed.
 *
 * Default behavior: one line per `ReplayEvent` via `eventLabel`.
 *
 * Special case for `battle-resolved`: the engine already produces a
 * per-round, per-action narration on `BattleResult.rounds[].actions[]`
 * (the data the in-rail CombatPanel + the BattlePanel both consume).
 * We surface that same narration as **scrollable text** in the feed so
 * the player can read past battles unfold even after the camera /
 * combat-panel has moved on. Each battle expands into:
 *
 *   - one header line (attacker → defender)
 *   - one line per action ("R2: Ant footman → Spider soldier −3 ✕")
 *   - one tally line (winner + casualties)
 *
 * Engine data already shipped:
 *
 *   - `BattleResult.rounds[].actions[]` (PR #57) — round/action stream
 *   - `BattleResult.participants[]` (PR #57) — template-name source for
 *     `summarizeBattle` to turn unit ids into "Ant footman"-style labels
 *   - `BattleResult.modifierStack` (PR #60) — surfaced separately in
 *     the modifier panel; not in the rolling log to keep it scannable
 *
 * Pure: no React, no DOM. The feed component renders the returned lines.
 */

import type { ReplayEvent } from '../../../engine/types.ts';

import { summarizeBattle } from '../scenario/battleSummary.ts';
import { eventLabel } from '../scenario/eventLabel.ts';

export interface FeedLine {
  readonly key: string;
  readonly text: string;
  /** Drives the CSS class for visual hierarchy:
   *   - `event` — default per-event log line
   *   - `cross-plane` — Chunk 16 — party-moved event whose `from.plane`
   *     differs from `to.plane`. Highlighted so the player reads the
   *     engine's one-step plane jump (ant-plane-switch ability, edge
   *     adjacency, paired-POST traversal) as a *crossing*, not a
   *     teleport bug.
   *   - `battle-header` — bold "⚔ Combat: A attack B." intro
   *   - `battle-action` — indented per-round action
   *   - `battle-tally` — indented closing winner + casualties
   *   - `recruit-success` — Chunk 29 — neutral converted to ant. Pops
   *     in green so the player's explicit Try-to-Recruit click reads
   *     as a clear win in the feed (it auto-pauses too).
   *   - `recruit-failure` — Chunk 29 — neutral recruit failed (the
   *     75% case at a single attempt). Muted red so the player sees
   *     "yes, we tried, no, it didn't land — try again." */
  readonly kind:
    | 'event'
    | 'cross-plane'
    | 'battle-header'
    | 'battle-action'
    | 'battle-tally'
    | 'recruit-success'
    | 'recruit-failure'
    /** Chunk 31 — Royal Jelly cast landed. Same logic as
     *  recruit-success: the player explicitly clicked, the engine
     *  fired, the feed line should pop so the player can verify the
     *  +25%/+15% buff is in flight. */
    | 'jelly-applied'
    /** Chunk 32 — flee succeeded. Battle ended as a draw, party
     *  knocked back one tile. Green-friendly tint like
     *  recruit-success because the player got the outcome they
     *  clicked for. */
    | 'flee-success'
    /** Chunk 32 — flee failed. Party lost their action this round
     *  and the opponent got a bonus unopposed round. Muted-red tint
     *  like recruit-failure: the click registered, the roll didn't. */
    | 'flee-failure';
}

/**
 * Per-action line in plain English. Format:
 *   - Normal hit:  "Round N: A attacks B for D damage (H/Max HP)."
 *   - Killing hit: "Round N: A attacks B for D damage. B is killed."
 * Matches the narration style of the original text-mode replay logs
 * the PM remembered — "this unit attacks this unit for N points of
 * damage" — using the same `summarizeBattle` data (PR #57's per-
 * action stream + PR #60's running HP).
 */
const actionLine = (action: {
  readonly roundIndex: number;
  readonly attackerLabel: string;
  readonly defenderLabel: string;
  readonly damage: number;
  readonly killed: boolean;
  readonly defenderHpAfter: number;
  readonly defenderMaxHp: number;
}): string => {
  const round = action.roundIndex + 1;
  const lead = `Round ${String(round)}: ${action.attackerLabel} attacks ${action.defenderLabel} for ${String(action.damage)} damage`;
  if (action.killed) return `${lead}. ${action.defenderLabel} is killed.`;
  return `${lead} (${String(action.defenderHpAfter)}/${String(action.defenderMaxHp)} HP).`;
};

const expandBattle = (
  event: Extract<ReplayEvent, { kind: 'battle-resolved' }>,
): readonly FeedLine[] => {
  const summary = summarizeBattle(event.result);
  const out: FeedLine[] = [];
  out.push({
    key: `t${String(event.tick)}-h`,
    text: `⚔ Combat: ${summary.attackerPartyId} attack ${summary.defenderPartyId}.`,
    kind: 'battle-header',
  });
  for (let i = 0; i < summary.actions.length; i++) {
    const a = summary.actions[i]!;
    out.push({
      key: `t${String(event.tick)}-a${String(i)}`,
      text: actionLine(a),
      kind: 'battle-action',
    });
  }
  // `winnerLabel` is already prose-shaped ("vanguard (defender) won"
  // / "Draw"). Wrap with closing punctuation so the tally line reads
  // as a complete sentence.
  out.push({
    key: `t${String(event.tick)}-t`,
    text: `Combat ends — ${summary.winnerLabel}.`,
    kind: 'battle-tally',
  });
  return out;
};

/**
 * Expand a sequence of replay events into log lines. Battle events
 * fan out into round-action text; everything else is a single line
 * via `eventLabel`. Stable per-tick keys mean the feed can re-render
 * without React's diff thrashing.
 */
export const expandEventsForFeed = (events: readonly ReplayEvent[]): readonly FeedLine[] => {
  const out: FeedLine[] = [];
  for (const e of events) {
    if (e.kind === 'battle-resolved') {
      for (const line of expandBattle(e)) out.push(line);
      continue;
    }
    // Chunk 16 — surface cross-plane moves as their own line kind so
    // the eye picks them up. The engine fires a single party-moved
    // event for an ant-plane-switch teleport / paired-POST traversal /
    // edge crossing; without a visual call-out it reads as the squad
    // skipping out of one face.
    const isCrossPlane = e.kind === 'party-moved' && e.from.plane !== e.to.plane;
    // Chunk 29 — recruit-attempted-neutral gets its own tinted kind so
    // the player can spot the outcome of an explicit Try-to-Recruit
    // click without combing the feed. Pairs with the auto-pause we
    // added in clock.ts: clock halts, banner names success/failure,
    // feed line is colored.
    let kind: FeedLine['kind'];
    if (isCrossPlane) {
      kind = 'cross-plane';
    } else if (e.kind === 'recruit-attempted-neutral') {
      kind = e.success ? 'recruit-success' : 'recruit-failure';
    } else if (e.kind === 'jelly-applied') {
      // Chunk 31 — explicit cast confirmed; same tint family as
      // recruit-success so the player learns "this color = my
      // ability landed."
      kind = 'jelly-applied';
    } else if (e.kind === 'battle-flee-attempted') {
      // Chunk 32 — explicit flee outcome. Success/failure split
      // mirrors recruit so the color carries consistent meaning.
      kind = e.success ? 'flee-success' : 'flee-failure';
    } else {
      kind = 'event';
    }
    out.push({
      key: `t${String(e.tick)}-e`,
      text: eventLabel(e),
      kind,
    });
  }
  return out;
};
