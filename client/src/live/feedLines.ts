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
   *   - `battle-header` — bold "⚔ attacker → defender" intro
   *   - `battle-action` — indented per-round action
   *   - `battle-tally` — indented closing winner + casualties */
  readonly kind: 'event' | 'battle-header' | 'battle-action' | 'battle-tally';
}

const expandBattle = (
  event: Extract<ReplayEvent, { kind: 'battle-resolved' }>,
): readonly FeedLine[] => {
  const summary = summarizeBattle(event.result);
  const out: FeedLine[] = [];
  out.push({
    key: `t${String(event.tick)}-h`,
    text: `⚔ ${summary.attackerPartyId} → ${summary.defenderPartyId}`,
    kind: 'battle-header',
  });
  for (let i = 0; i < summary.actions.length; i++) {
    const a = summary.actions[i]!;
    const kill = a.killed ? ' ✕' : '';
    out.push({
      key: `t${String(event.tick)}-a${String(i)}`,
      text: `R${String(a.roundIndex + 1)}: ${a.attackerLabel} → ${a.defenderLabel} −${String(a.damage)} (${String(a.defenderHpAfter)}/${String(a.defenderMaxHp)})${kill}`,
      kind: 'battle-action',
    });
  }
  out.push({
    key: `t${String(event.tick)}-t`,
    text: `↳ ${summary.winnerLabel}`,
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
    } else {
      out.push({
        key: `t${String(e.tick)}-e`,
        text: eventLabel(e),
        kind: 'event',
      });
    }
  }
  return out;
};
