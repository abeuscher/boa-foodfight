/**
 * Shared types for the headless replay-rendering helpers
 * (render-png.ts, render-ascii.ts) and replay-snapshot.test.ts.
 *
 * Don't import these from the in-browser viewer/main.js — that file
 * is plain JS by design (no transpile step, served as-is from
 * viewer/dist).
 */

export interface ScenarioStartEvent {
  readonly kind: 'scenario-start';
  readonly tick: number;
  readonly scenario?: string;
  readonly posts?: readonly {
    readonly id: string;
    readonly location: { readonly plane: string; readonly x: number; readonly y: number };
    readonly owner: string;
  }[];
  readonly obstacles?: readonly {
    readonly plane: string;
    readonly x: number;
    readonly y: number;
  }[];
  /** Round-7 feature 2: post-placement initial party positions.
   * Optional — older replays without pre-game placement omit this
   * field, in which case viewers fall back to first `party-moved.from`. */
  readonly partyPositions?: readonly {
    readonly partyId: string;
    readonly location: { readonly plane: string; readonly x: number; readonly y: number };
  }[];
}
