import type { UnitTemplateId } from '../../../engine/types.ts';
import { recruitArrivalLevel, recruitUnit } from '../../../engine/world-recruit.ts';
import type { WorldState } from '../../../engine/world-state.ts';

import { RECRUITS, TEMPLATES } from '../fixture.ts';
import { barracksOf, templateName, unitLabel, type Apply } from '../shared.ts';

interface Props {
  readonly state: WorldState;
  readonly apply: Apply;
}

export function Recruit({ state, apply }: Props): JSX.Element {
  const arrival = recruitArrivalLevel(state.roster);
  const barracks = barracksOf(state.roster);

  return (
    <div className="columns">
      <section className="parties">
        <h2>Anthill — Recruit</h2>
        <p className="hint">
          New recruits arrive at level {arrival} (lower-median roster level − 1) and land in the
          barracks, undeployed. Deploy them in Organize Army.
        </p>
        <ul>
          {RECRUITS.recruits.map((r) => {
            const id = r.templateId as UnitTemplateId;
            const affordable = state.gold >= r.cost;
            return (
              <li key={r.templateId}>
                <span className="unit">{templateName(id)}</span>
                <span className="acts">
                  <span className="cost">{r.cost} buttons</span>
                  <button
                    disabled={!affordable}
                    onClick={() => {
                      const res = recruitUnit(state, id, RECRUITS, TEMPLATES);
                      apply(res.state, res, `recruited ${templateName(id)} (lvl ${arrival})`);
                    }}
                  >
                    Recruit
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="barracks">
        <h2>Barracks ({barracks.length})</h2>
        {barracks.length === 0 && <p className="empty">No undeployed units.</p>}
        <ul>
          {barracks.map((u) => (
            <li key={u.id}>
              <span className="unit">
                {unitLabel(u)} <span className="rank">lvl {u.level}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
