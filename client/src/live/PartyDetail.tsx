import { postAt } from '../../../engine/posts.ts';
import type { GameState, Party, Post, Unit, UnitId, UnitTemplate } from '../../../engine/types.ts';

import { abilityCategory, abilityLabel } from './abilityLabels.ts';

interface Props {
  readonly state: GameState;
  readonly party: Party;
  readonly selectedUnitId: UnitId | null;
  readonly onSelectUnit: (id: UnitId | null) => void;
  readonly onClose: () => void;
}

const alive = (u: Unit): boolean => u.currentHp > 0;
const partyAlive = (p: Party): boolean => p.units.some(alive);

const tmplOf = (state: GameState, u: Unit): UnitTemplate | undefined =>
  state.unitTemplates.get(u.templateId);

const roleName = (state: GameState, u: Unit): string => tmplOf(state, u)?.name ?? u.templateId;

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
}: Props): JSX.Element {
  const unitById = new Map<UnitId, Unit>(party.units.map((u) => [u.id, u]));
  const leader = unitById.get(party.leaderId);

  const status = !partyAlive(party)
    ? 'fallen'
    : party.orders.some((o) => o.kind === 'move-to')
      ? 'moving'
      : 'idle';

  // Formation rows; legacy parties without a formation render as one row.
  const rows: { label: string; ids: readonly UnitId[] }[] = party.formation
    ? [
        { label: 'Front', ids: party.formation.front },
        { label: 'Back', ids: party.formation.back },
        { label: 'Reserve', ids: party.formation.reserve },
      ]
    : [{ label: 'Units', ids: party.units.map((u) => u.id) }];

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
        {rows.map((row) => (
          <div className="pd-row" key={row.label}>
            <span className="pd-row-label">{row.label}</span>
            <div className="pd-units">
              {row.ids.length === 0 && <span className="hint">—</span>}
              {row.ids.map((id) => {
                const u = unitById.get(id);
                if (!u) return null;
                const tmpl = tmplOf(state, u);
                const maxHp = tmpl ? tmpl.baseStats.hp : u.currentHp;
                const pct = maxHp > 0 ? Math.max(0, Math.round((u.currentHp / maxHp) * 100)) : 0;
                const classes = ['pd-unit'];
                if (!alive(u)) classes.push('down');
                if (u.id === selectedUnitId) classes.push('sel');
                if (u.id === party.leaderId) classes.push('leader');
                return (
                  <button
                    key={id}
                    className={classes.join(' ')}
                    onClick={() => {
                      onSelectUnit(u.id === selectedUnitId ? null : u.id);
                    }}
                    title={roleName(state, u)}
                  >
                    <span className="pd-u-role">
                      {u.id === party.leaderId ? '★ ' : ''}
                      {roleName(state, u)}
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
          </div>
        ))}
      </div>

      <div className="pd-cols">
        <div className="pd-stats">
          <div className="pd-sub">Composition</div>
          <div className="pd-line">{composition || '—'}</div>
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
          <p className="hint">Select a unit to inspect.</p>
        ) : (
          <UnitDrill state={state} unit={sel} party={party} />
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
