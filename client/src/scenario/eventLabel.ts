import type { ReplayEvent } from '../../../engine/types.ts';

/** A short, human-readable line for a replay event — what the
 * notification strip / event log shows as playback advances. Pure. */
export const eventLabel = (ev: ReplayEvent): string => {
  switch (ev.kind) {
    case 'scenario-start':
      return 'Scenario start';
    case 'scenario-end':
      return 'Scenario over';
    case 'turn-start':
      return `Turn ${String(ev.turn)} begins`;
    case 'party-moved':
      return 'A party moved';
    case 'battle-resolved':
      return 'Battle resolved';
    case 'post-capture-started':
      return `Capturing ${String(ev.postId)}`;
    case 'post-captured':
      return `${String(ev.postId)} captured by the ${ev.newOwner}s`;
    case 'reinforcement-spawned':
      return 'Reinforcements arrived';
    case 'unit-died':
      return 'A unit fell';
    case 'leader-died':
      return 'A squad lost its leader';
    case 'ability-used':
      return 'Ability used';
    case 'jelly-applied':
      return 'Royal jelly applied';
    case 'recruit-attempted':
      return ev.success ? 'Recruited a neutral' : 'Recruit attempt failed';
    case 'scripted-beat':
      return ev.title;
    default:
      return ev.kind.replace(/-/g, ' ');
  }
};

/** The short auto-pause reason shown when the clock stops on a trigger. */
export const pauseReasonLabel = (ev: ReplayEvent): string => {
  switch (ev.kind) {
    case 'post-captured':
      return 'POST captured';
    case 'battle-resolved':
      return 'Combat';
    case 'reinforcement-spawned':
      return 'Reinforcements';
    case 'scripted-beat':
      return ev.title;
    default:
      return ev.kind.replace(/-/g, ' ');
  }
};
