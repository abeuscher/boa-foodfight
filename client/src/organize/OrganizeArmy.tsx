import { useMemo, useState } from 'react';

import type { PartyId, UnitId } from '../../../engine/types.ts';
import {
  createParty,
  dismissUnit,
  disbandParty,
  moveUnit,
  removeUnit,
  setUnitRank,
  swapLeader,
  type Rank,
} from '../../../engine/world-organize.ts';
import type { WorldPartyAssignment, WorldRoster } from '../../../engine/world-state.ts';

import {
  INITIAL_ROSTER,
  TEMPLATES,
  type Notice,
  barracksOf,
  fold,
  isLeaderEligible,
  slotsFor,
  statsFor,
  unitById,
  unitLabel,
} from './model.ts';

const RANKS: readonly Rank[] = ['front', 'back', 'reserve'];

const rankOf = (assignment: WorldPartyAssignment, unitId: UnitId): Rank | undefined => {
  const f = assignment.formation;
  if (!f) return undefined;
  if (f.front.includes(unitId)) return 'front';
  if (f.back.includes(unitId)) return 'back';
  if (f.reserve.includes(unitId)) return 'reserve';
  return undefined;
};

export function OrganizeArmy(): JSX.Element {
  const [roster, setRoster] = useState<WorldRoster>(INITIAL_ROSTER);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<UnitId>>(new Set());
  const [newPartyId, setNewPartyId] = useState('');

  const barracks = useMemo(() => barracksOf(roster), [roster]);
  const partyIds = roster.partyAssignments.map((a) => a.partyId);

  const run = (result: ReturnType<typeof fold>): void => {
    setRoster(result.roster);
    setNotice(result.notice);
  };

  const togglePick = (id: UnitId): void => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const formSquad = (leaderId: UnitId): void => {
    const ids = [...picked];
    run(
      fold(
        createParty(roster, newPartyId as PartyId, ids, leaderId, TEMPLATES),
        `created squad '${newPartyId}'`,
      ),
    );
    setPicked(new Set());
    setNewPartyId('');
  };

  return (
    <div className="oa">
      <header>
        <h1>Organize Army</h1>
        <p className="sub">
          L1 ant colony · binds to <code>engine/world-organize</code> (troop-reference §10)
        </p>
      </header>

      {notice && (
        <div className={`notice ${notice.kind}`} role="status">
          {notice.text}
        </div>
      )}

      <div className="columns">
        <section className="parties">
          <h2>Squads</h2>
          {roster.partyAssignments.map((a) => {
            const usage = slotsFor(roster, a.partyId);
            return (
              <div className="party" key={a.partyId}>
                <div className="party-head">
                  <strong>{a.partyId}</strong>
                  <span className="slots">
                    {usage.used}/{usage.cap} slots
                  </span>
                  <button
                    onClick={() =>
                      run(fold(disbandParty(roster, a.partyId), `disbanded '${a.partyId}'`))
                    }
                  >
                    Disband
                  </button>
                </div>
                <ul>
                  {a.unitIds.map((id) => {
                    const u = unitById(roster, id);
                    if (!u) return null;
                    const isLeader = a.leaderId === id;
                    const rank = rankOf(a, id);
                    const st = statsFor(u);
                    return (
                      <li key={id}>
                        <span className="unit">
                          {unitLabel(u)} {isLeader && <em>★ leader</em>}
                          {rank && <span className="rank">[{rank}]</span>}
                          {st && (
                            <span className="stats">
                              hp {st.hp} · atk {st.attack} · arm {st.armor}
                            </span>
                          )}
                        </span>
                        <span className="acts">
                          {!isLeader && isLeaderEligible(u) && (
                            <button
                              onClick={() =>
                                run(
                                  fold(
                                    swapLeader(roster, a.partyId, id, TEMPLATES),
                                    `${unitLabel(u)} now leads ${a.partyId}`,
                                  ),
                                )
                              }
                            >
                              Make leader
                            </button>
                          )}
                          {RANKS.map((rk) => (
                            <button
                              key={rk}
                              disabled={rank === rk}
                              onClick={() =>
                                run(
                                  fold(
                                    setUnitRank(roster, id, rk, TEMPLATES),
                                    `${unitLabel(u)} → ${rk}`,
                                  ),
                                )
                              }
                            >
                              {rk}
                            </button>
                          ))}
                          <button
                            onClick={() =>
                              run(
                                fold(
                                  removeUnit(roster, id, TEMPLATES),
                                  `${unitLabel(u)} → barracks`,
                                ),
                              )
                            }
                          >
                            → barracks
                          </button>
                          <button
                            onClick={() =>
                              run(
                                fold(
                                  dismissUnit(roster, id, TEMPLATES),
                                  `dismissed ${unitLabel(u)}`,
                                ),
                              )
                            }
                          >
                            Dismiss
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="barracks">
          <h2>Barracks ({barracks.length})</h2>
          {barracks.length === 0 && <p className="empty">No undeployed units.</p>}
          <ul>
            {barracks.map((u) => (
              <li key={u.id}>
                <label className="unit">
                  <input
                    type="checkbox"
                    checked={picked.has(u.id)}
                    onChange={() => togglePick(u.id)}
                  />
                  {unitLabel(u)}
                </label>
                <span className="acts">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const to = e.target.value;
                      if (to)
                        run(
                          fold(
                            moveUnit(roster, u.id, to as PartyId, TEMPLATES),
                            `${unitLabel(u)} → ${to}`,
                          ),
                        );
                      e.target.value = '';
                    }}
                  >
                    <option value="">move to…</option>
                    {partyIds.map((pid) => (
                      <option key={pid} value={pid}>
                        {pid}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      run(fold(dismissUnit(roster, u.id, TEMPLATES), `dismissed ${unitLabel(u)}`))
                    }
                  >
                    Dismiss
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <div className="form-squad">
            <h3>Form new squad</h3>
            <input
              placeholder="new squad id"
              value={newPartyId}
              onChange={(e) => setNewPartyId(e.target.value)}
            />
            <p className="hint">
              {picked.size === 0
                ? 'Tick barracks units above, then pick a leader.'
                : `${picked.size} selected — choose a leader:`}
            </p>
            {[...picked].map((id) => {
              const u = unitById(roster, id);
              if (!u || !isLeaderEligible(u)) return null;
              return (
                <button key={id} disabled={!newPartyId} onClick={() => formSquad(id)}>
                  Create with {unitLabel(u)} as leader
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
