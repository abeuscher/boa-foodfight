import { useState } from 'react';

import { AGGRESSION_PROMOTION_THRESHOLD } from '../../../engine/behavior-promotion.ts';
import { PROMOTION_TREE } from '../../../engine/charisma.ts';
import { postAt } from '../../../engine/posts.ts';
import type { GameState, Party, Post, Unit, UnitId, UnitTemplate } from '../../../engine/types.ts';

import { abilityCategory, abilityLabel } from './abilityLabels.ts';
import { UnitRoleIcon } from './unitIcons.tsx';

interface Props {
  readonly state: GameState;
  readonly party: Party;
  readonly selectedUnitId: UnitId | null;
  readonly onSelectUnit: (id: UnitId | null) => void;
  readonly onClose: () => void;
  /** Chunk 41 — when true, the formation rows accept drag-drop reassign
   * + the leader chip is clickable to swap. False during the combat
   * modal (which is the only UI state where "active engagement" is
   * unambiguous). When false, all edit affordances render but are
   * disabled / styled inert. */
  readonly canEdit?: boolean;
  /** Chunk 41 — move `unitId` to `targetSlot` on this party. The hook
   * (`useLiveScenario.reassignUnit`) returns true on success; the UI
   * uses the return to clear the drag-overlay state. */
  readonly onReassignUnit?: (unitId: UnitId, targetSlot: 'front' | 'back' | 'reserve') => boolean;
  /** Chunk 41 — make `unitId` the new party leader. */
  readonly onChangeLeader?: (unitId: UnitId) => boolean;
}

const alive = (u: Unit): boolean => u.currentHp > 0;
const partyAlive = (p: Party): boolean => p.units.some(alive);

const tmplOf = (state: GameState, u: Unit): UnitTemplate | undefined =>
  state.unitTemplates.get(u.templateId);

const roleName = (state: GameState, u: Unit): string => tmplOf(state, u)?.name ?? u.templateId;

/** Chunk 39 — how many units can fit legibly in a single .pd-row before
 * the role-name text starts ellipsis-truncating. Derived from the 300px
 * right rail: ~280px usable - 3.5rem (~56px) row label - 0.5rem gap
 * ≈ 216px for unit cards; at ~68px per readable unit (4rem min-width +
 * 0.3rem gap) that's ≈ 3 units. The front formation cap is 3 and back
 * cap is 2 — both naturally fit; reserve is the row that overruns. */
const PD_UNITS_PER_ROW_BUDGET = 3;

/** Read-only party-detail panel (ui-party-detail-spec): banner, formation
 * preview (front/back/reserve), party-level stats + active modifiers,
 * current order, and unit drill-down. Binds only to engine-surfaced
 * state — no invented abilities or stats. Editing affordances are out of
 * scope this pass; the reserved region holds their space. */
export function PartyDetail({
  state,
  party,
  selectedUnitId,
  onSelectUnit,
  onClose,
  canEdit = false,
  onReassignUnit,
  onChangeLeader,
}: Props): JSX.Element {
  // Chunk 41 — drag-drop bookkeeping. We only need transient client-side
  // state (no re-render across drop), but `.pd-row.dragover` needs to
  // know which row the cursor is over so we can paint the drop-zone
  // affordance. The dragged unit id rides on the DataTransfer.
  const editable = canEdit && onReassignUnit !== undefined;
  const [dragOverRow, setDragOverRow] = useState<'front' | 'back' | 'reserve' | null>(null);
  const unitById = new Map<UnitId, Unit>(party.units.map((u) => [u.id, u]));
  const leader = unitById.get(party.leaderId);

  const status = !partyAlive(party)
    ? 'fallen'
    : party.orders.some((o) => o.kind === 'move-to')
      ? 'moving'
      : 'idle';

  // Formation rows; legacy parties without a formation render as one row.
  // Chunk 41 — each row carries its slot identifier so drag-drop can
  // dispatch `onReassignUnit(unit, slot)` directly. Legacy parties use
  // `'front'` for the single rendered row; reassign refuses gracefully
  // when there's no formation.
  const rows: {
    label: string;
    ids: readonly UnitId[];
    slot: 'front' | 'back' | 'reserve';
  }[] = party.formation
    ? [
        { label: 'Front', ids: party.formation.front, slot: 'front' },
        { label: 'Back', ids: party.formation.back, slot: 'back' },
        { label: 'Reserve', ids: party.formation.reserve, slot: 'reserve' },
      ]
    : [{ label: 'Units', ids: party.units.map((u) => u.id), slot: 'front' }];

  // Composition summary (counts by role).
  const counts = new Map<string, number>();
  for (const u of party.units) {
    const r = roleName(state, u);
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const composition = [...counts.entries()].map(([r, n]) => `${String(n)} ${r}`).join(', ');

  // Active party-level modifiers (engine-surfaced only).
  const modifiers: string[] = [];
  if (party.jellyDoses > 0) modifiers.push(`Royal jelly ×${String(party.jellyDoses)}`);
  if (party.item) modifiers.push(`Item: ${String(party.item)}`);
  if (party.cardBuffs && party.cardBuffs.bonusTurnsRemaining > 0) {
    modifiers.push(`Card buff (${String(party.cardBuffs.bonusTurnsRemaining)} turns)`);
  }
  const heldPost = postAt(state, party.location);
  if (heldPost && heldPost.owner === party.faction) modifiers.push(`Holding ${heldPost.name}`);
  const terrain = state.tiles.get(
    `${party.location.plane}:${String(party.location.x)},${String(party.location.y)}`,
  )?.terrain;
  if (terrain && terrain.defenseModifier !== 0) {
    modifiers.push(
      `Terrain defense ${terrain.defenseModifier > 0 ? '+' : ''}${String(terrain.defenseModifier)}`,
    );
  }

  const moveOrder = party.orders.find((o) => o.kind === 'move-to');
  const destPost: Post | undefined =
    moveOrder?.kind === 'move-to' ? postAt(state, moveOrder.target) : undefined;
  const activity = !partyAlive(party)
    ? 'Fallen'
    : moveOrder?.kind === 'move-to'
      ? `Moving toward ${destPost ? destPost.name : `(${String(moveOrder.target.x)}, ${String(moveOrder.target.y)})`}`
      : heldPost && heldPost.owner === party.faction
        ? `Holding ${heldPost.name}`
        : 'Idle';

  const sel = selectedUnitId !== null ? unitById.get(selectedUnitId) : undefined;

  return (
    <div className="pdetail">
      <div className="pd-banner">
        <div>
          <div className="pd-name">{party.id}</div>
          <div className="pd-leader">
            Leader: {leader ? roleName(state, leader) : '—'} · {status}
          </div>
        </div>
        <button className="pd-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="pd-formation">
        {rows.map((row) => {
          // Chunk 39 — single-row layout per PM playthrough. The .pd-units
          // strip is now `flex-wrap: nowrap` with equal-width children
          // (`flex: 1 1 0` + `min-width: 0`), so units shrink to fit
          // whatever width the right rail has. Role names truncate via
          // ellipsis. When more units share a row than the rail can
          // legibly display (rail ≈ 216px usable / ~70px per readable
          // unit ≈ 3 units), we flag the row so the player knows the
          // names are being clipped — the fix the PM noted is "remove
          // or change the location of the names" (planned for Chunk 40
          // when SVG icons replace the in-card labels).
          const cramped = row.ids.length > PD_UNITS_PER_ROW_BUDGET;
          const slot = row.slot;
          const isDragTarget = dragOverRow === slot;
          const rowClass = [
            'pd-row',
            cramped ? 'pd-row-cramped' : '',
            editable ? 'pd-row-editable' : '',
            isDragTarget ? 'pd-row-dragover' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div
              className={rowClass}
              key={row.label}
              onDragOver={
                editable
                  ? (e) => {
                      // Chunk 41 — preventDefault enables the drop target.
                      // Without it the browser blocks `drop` from firing.
                      e.preventDefault();
                      if (dragOverRow !== slot) setDragOverRow(slot);
                    }
                  : undefined
              }
              onDragLeave={editable ? () => setDragOverRow(null) : undefined}
              onDrop={
                editable && onReassignUnit
                  ? (e) => {
                      e.preventDefault();
                      const unitId = e.dataTransfer.getData('text/plain') as UnitId;
                      setDragOverRow(null);
                      if (!unitId) return;
                      onReassignUnit(unitId, slot);
                    }
                  : undefined
              }
            >
              <span className="pd-row-label">{row.label}</span>
              <div className="pd-units">
                {row.ids.length === 0 && <span className="hint">—</span>}
                {row.ids.map((id) => {
                  const u = unitById.get(id);
                  if (!u) return null;
                  const tmpl = tmplOf(state, u);
                  const maxHp = tmpl ? tmpl.baseStats.hp : u.currentHp;
                  const pct = maxHp > 0 ? Math.max(0, Math.round((u.currentHp / maxHp) * 100)) : 0;
                  const isLeader = u.id === party.leaderId;
                  // Chunk 41 — leader can't leave the active formation,
                  // so disable drag on the leader card when the only valid
                  // re-drop is reserve. Other moves (front ↔ back) stay
                  // allowed for the leader.
                  const draggable = editable && alive(u);
                  const classes = ['pd-unit'];
                  if (!alive(u)) classes.push('down');
                  if (u.id === selectedUnitId) classes.push('sel');
                  if (isLeader) classes.push('leader');
                  return (
                    <button
                      key={id}
                      className={classes.join(' ')}
                      draggable={draggable}
                      onDragStart={
                        draggable
                          ? (e) => {
                              e.dataTransfer.setData('text/plain', String(u.id));
                              e.dataTransfer.effectAllowed = 'move';
                            }
                          : undefined
                      }
                      onClick={() => {
                        onSelectUnit(u.id === selectedUnitId ? null : u.id);
                      }}
                      title={roleName(state, u)}
                    >
                      <span className="pd-u-role">
                        {/* Chunk 40 — Lucide role icon stands in for the
                         * role name in cramped rows (CSS hides .pd-u-name
                         * when .pd-row-cramped is set). The icon is
                         * faction-tinted (ant amber / spider red). */}
                        <UnitRoleIcon unit={u} template={tmpl} />
                        <span className="pd-u-name">
                          {isLeader ? '★ ' : ''}
                          {roleName(state, u)}
                        </span>
                      </span>
                      <span className="pd-hpbar">
                        <span className="pd-hpfill" style={{ width: `${String(pct)}%` }} />
                      </span>
                      <span className="pd-u-hp">
                        {String(u.currentHp)}/{String(maxHp)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {cramped && (
                <span
                  className="pd-row-flag"
                  title={`${String(row.ids.length)} units in this row — names are truncated. Remove a unit or wait for icon mode (Chunk 40).`}
                  aria-label="Row is cramped; unit names truncated"
                >
                  ⚠
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="pd-cols">
        <div className="pd-stats">
          <div className="pd-sub">Composition</div>
          <div className="pd-line">{composition || '—'}</div>
          {/* L1-iteration #9 — behavior-gated promotion hint. Surfaces
              when the party has at least one promotable, un-promoted unit
              so the player can read the Aggression bar as "next promotion at X".
              The header line only renders if there's actually a candidate. */}
          {(() => {
            const candidates = party.units.filter(
              (u) => u.currentHp > 0 && u.promoted !== true && PROMOTION_TREE.has(u.templateId),
            );
            if (candidates.length === 0) return null;
            const aggression = party.aggression ?? 0;
            const ready = aggression >= AGGRESSION_PROMOTION_THRESHOLD;
            return (
              <div className={`pd-promotion ${ready ? 'ready' : ''}`}>
                {ready ? (
                  <span>
                    ★ Field promotion ready ({String(candidates.length)} unit
                    {candidates.length === 1 ? '' : 's'})
                  </span>
                ) : (
                  <span>
                    Field promotion at Aggression {String(AGGRESSION_PROMOTION_THRESHOLD)} (
                    {String(candidates.length)} candidate{candidates.length === 1 ? '' : 's'})
                  </span>
                )}
              </div>
            );
          })()}
          <div className="pd-sub">Earned stats</div>
          <div className="pd-earned">
            <span className="pd-earned-row">
              <span className="pd-earned-label">Aggression</span>
              <span className="pd-earned-bar">
                <span
                  className="pd-earned-fill pd-earned-fill-agg"
                  style={{ width: `${String(party.aggression ?? 0)}%` }}
                />
              </span>
              <span className="pd-earned-num">{String(party.aggression ?? 0)}</span>
            </span>
            <span className="pd-earned-row">
              <span className="pd-earned-label">Discipline</span>
              <span className="pd-earned-bar">
                <span
                  className="pd-earned-fill pd-earned-fill-disc"
                  style={{ width: `${String(party.discipline ?? 0)}%` }}
                />
              </span>
              <span className="pd-earned-num">{String(party.discipline ?? 0)}</span>
            </span>
          </div>
          <div className="pd-sub">Modifiers</div>
          {modifiers.length === 0 ? (
            <div className="pd-line hint">No active modifiers</div>
          ) : (
            <ul className="pd-mods">
              {modifiers.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="pd-order">
          <div className="pd-sub">Current order</div>
          <div className="pd-line">{activity}</div>
          <div className="pd-sub">Face</div>
          <div className="pd-line">{party.location.plane}</div>
        </div>
      </div>

      <div className="pd-drill">
        {sel === undefined ? (
          <p className="hint">
            Select a unit to inspect.
            {editable && ' Drag a unit between Front / Back / Reserve to reassign.'}
          </p>
        ) : (
          <>
            <UnitDrill state={state} unit={sel} party={party} />
            {/* Chunk 41 — leader-swap affordance. Renders when:
             *   - canEdit is true (PartyDetail open, combat modal not up),
             *   - the inspected unit isn't already the leader,
             *   - the unit is alive AND in front/back row (reserve
             *     can't lead per `validateLeaderChange`).
             * The button calls `onChangeLeader`; the hook returns true
             * on success (the panel re-renders with the new ★ marker)
             * or false on refusal. */}
            {editable && onChangeLeader && sel.id !== party.leaderId && alive(sel) && (
              <button
                className="pd-make-leader"
                onClick={() => {
                  onChangeLeader(sel.id);
                }}
                title="Promote this unit to party leader. Front/back row only; reserve units must move up first."
                disabled={party.formation?.reserve.includes(sel.id) ?? false}
              >
                ★ Make leader
              </button>
            )}
          </>
        )}
      </div>

      <div className="pd-reserved" aria-hidden />
    </div>
  );
}

function UnitDrill({
  state,
  unit,
  party,
}: {
  state: GameState;
  unit: Unit;
  party: Party;
}): JSX.Element {
  const tmpl = tmplOf(state, unit);
  const maxHp = tmpl ? tmpl.baseStats.hp : unit.currentHp;
  const row = party.formation
    ? party.formation.front.includes(unit.id)
      ? 'front row'
      : party.formation.back.includes(unit.id)
        ? 'back row'
        : party.formation.reserve.includes(unit.id)
          ? 'reserve'
          : '—'
    : '—';
  const abilities = tmpl?.abilities ?? [];
  return (
    <>
      <div className="pd-sub">
        {roleName(state, unit)} {unit.id === party.leaderId ? '(leader)' : ''} · lvl{' '}
        {String(unit.level)}
      </div>
      <div className="pd-line">
        HP {String(unit.currentHp)}/{String(maxHp)} · {row}
      </div>
      <div className="pd-sub">Abilities</div>
      {abilities.length === 0 ? (
        <div className="pd-line hint">None</div>
      ) : (
        <ul className="pd-mods">
          {abilities.map((a) => (
            <li key={a}>
              {abilityLabel(a)}
              {abilityCategory(a) ? <span className="hint"> · {abilityCategory(a)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
