/**
 * End-of-scenario debrief stats (pure). All engine-surfaced — derived
 * from the final `GameState` (and the resolved terminal), never invented
 * (ui-end-of-scenario-spec "all stats are engine-surfaced only").
 */
import type { Faction, GameState } from '../../../engine/types.ts';

import type { Terminal } from './liveScenario.ts';

export type ResolutionPath = 'Decisive' | 'Score-resolved';

export interface EndStats {
  readonly winner: Faction;
  readonly outcome: 'Victory' | 'Defeat';
  readonly resolution: ResolutionPath;
  /** Enemy (spider) units the player destroyed. */
  readonly antKills: number;
  /** Player (ant) units lost. */
  readonly spiderKills: number;
  readonly postsHeld: number;
  readonly partiesLost: number;
  readonly turnsElapsed: number;
  /** Score totals when the scenario resolved by score (L1 cap), else null. */
  readonly score: { readonly ant: number; readonly spider: number } | null;
}

const dead = (hp: number): boolean => hp <= 0;

export const computeEndStats = (
  state: GameState,
  terminal: Terminal,
  turnsPlayed: number,
): EndStats => {
  let antKills = 0;
  let spiderKills = 0;
  let postsHeld = 0;
  let partiesLost = 0;

  for (const party of state.parties.values()) {
    const allDown = party.units.every((u) => dead(u.currentHp));
    if (party.faction === 'ant' && allDown && party.units.length > 0) partiesLost += 1;
    for (const u of party.units) {
      if (!dead(u.currentHp)) continue;
      if (party.faction === 'spider') antKills += 1;
      else if (party.faction === 'ant') spiderKills += 1;
    }
  }
  for (const post of state.posts.values()) {
    if (post.owner === 'ant') postsHeld += 1;
  }

  return {
    winner: terminal.winner,
    outcome: terminal.winner === 'ant' ? 'Victory' : 'Defeat',
    resolution: terminal.scoreBreakdown ? 'Score-resolved' : 'Decisive',
    antKills,
    spiderKills,
    postsHeld,
    partiesLost,
    turnsElapsed: turnsPlayed,
    score: terminal.scoreBreakdown
      ? {
          ant: Math.round(terminal.scoreBreakdown.ant.total),
          spider: Math.round(terminal.scoreBreakdown.spider.total),
        }
      : null,
  };
};
