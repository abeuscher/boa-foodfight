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
    case 'party-moved': {
      // Chunk 16 — give every party-moved event a real, readable label
      // including which squad moved, from where, to where. Cross-plane
      // steps (ant-plane-switch ability, paired-POST traversal, or
      // edge crossing) get an explicit "→ <plane>" tag so the player
      // doesn't read the engine's intentional one-step jump as a bug.
      const fromTxt = `(${String(ev.from.x)}, ${String(ev.from.y)})`;
      const toTxt = `(${String(ev.to.x)}, ${String(ev.to.y)})`;
      if (ev.from.plane !== ev.to.plane) {
        return `${String(ev.partyId)} crossed from ${ev.from.plane} ${fromTxt} to ${ev.to.plane} ${toTxt}`;
      }
      return `${String(ev.partyId)} moved ${fromTxt} → ${toTxt} on ${ev.from.plane}`;
    }
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
    case 'recruit-attempted-neutral':
      return ev.success
        ? `Converted neutral ${String(ev.targetId)}`
        : `Recruit attempt on ${String(ev.targetId)} failed`;
    case 'scripted-beat':
      return ev.title;
    case 'unit-promoted':
      return `${String(ev.fromTemplate)} → ${String(ev.toTemplate)}`;
    case 'stat-earned': {
      const arrow = ev.delta >= 0 ? '↑' : '↓';
      const sign = ev.delta >= 0 ? '+' : '';
      return `${String(ev.partyId)} ${ev.stat} ${arrow} ${sign}${String(ev.delta)} (${String(ev.before)}→${String(ev.after)})`;
    }
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
    case 'unit-promoted':
      return 'Promotion';
    case 'recruit-attempted-neutral':
      // Chunk 29 — auto-pause on a recruit attempt so the player sees
      // whether their explicit click landed. Distinct text per outcome
      // so the pause-reason banner reads success or failure at a glance.
      return ev.success ? 'Neutral recruited' : 'Recruit failed';
    default:
      return ev.kind.replace(/-/g, ' ');
  }
};
