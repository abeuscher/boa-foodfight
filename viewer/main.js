// Pure-consumer replay viewer. Loads a JSONL replay and walks events
// to compute per-tick state. Renders six planes (3x2 grid) on a single
// canvas: floor / north-wall / ceiling on the top row, west-wall /
// south-wall / east-wall on the bottom row.

// Layout grid: indexed by [row, col] -> plane name.
const PLANE_GRID = [
  ['west-wall', 'north-wall', 'east-wall'],
  ['floor', 'ceiling', 'south-wall'],
];
const PLANES = PLANE_GRID.flat();

const GRID = 10;
const CELL = 30;
const PLANE_W = GRID * CELL;
const PLANE_GAP = 30;
const HEADER_H = 30;
// Spider was '#1f1f1f' (near-black) which blended into the dark canvas
// background — party circles became invisible. Magenta/purple gives
// clear contrast against both the bg and the orange-red ants.
const FACTION_COLOR = { ant: '#e85d4a', spider: '#c026d3', neutral: '#888' };

// ---------------------------------------------------------------------------
// State reduction: walk events up to a target tick, return derived state.
// ---------------------------------------------------------------------------

// Best-effort: ant party ids start with known prefixes. We hydrate
// initial faction info from the first time we see a party-moved
// event and use the partyId convention as a fallback.
function guessFaction(partyId) {
  if (partyId.startsWith('queen-guard')) return 'ant';
  if (partyId.startsWith('vanguard')) return 'ant';
  if (partyId.startsWith('pathfinders')) return 'ant';
  if (partyId.startsWith('web')) return 'spider';
  if (partyId.startsWith('silk')) return 'spider';
  if (partyId.startsWith('advance')) return 'spider';
  if (partyId.startsWith('spiderling-')) return 'spider';
  return 'neutral';
}

// ---------------------------------------------------------------------------
// Initial-state hydration: parties at their roster starting locations.
// We don't have direct access to the roster JSON, so we read the first
// party-moved event for each party (its `from`) as the initial position.
// ---------------------------------------------------------------------------

function hydrateInitialPositions(events) {
  const seen = new Map();
  // Round-7 feature 2: scenario-start may carry a `partyPositions`
  // snapshot (post-placement positions). Prefer that as the source of
  // truth so the viewer renders the initial board correctly even for
  // parties that never end up moving. Fall back to the first
  // party-moved event for older replays without the snapshot.
  for (const e of events) {
    if (e.kind === 'scenario-start' && Array.isArray(e.partyPositions)) {
      for (const entry of e.partyPositions) {
        if (seen.has(entry.partyId)) continue;
        seen.set(entry.partyId, {
          faction: guessFaction(entry.partyId),
          alive: true,
          plane: entry.location.plane,
          x: entry.location.x,
          y: entry.location.y,
        });
      }
      break;
    }
  }
  // Round 8 — neutral-spawned events carry the spawn party + location.
  // Hydrate them so the very first frame already shows the neutrals.
  for (const e of events) {
    if (e.kind !== 'neutral-spawned') continue;
    if (seen.has(e.partyId)) continue;
    seen.set(e.partyId, {
      faction: 'neutral',
      neutralKind: e.neutralKind,
      alive: true,
      plane: e.location.plane,
      x: e.location.x,
      y: e.location.y,
    });
  }
  for (const e of events) {
    if (e.kind !== 'party-moved') continue;
    if (seen.has(e.partyId)) continue;
    seen.set(e.partyId, {
      faction: guessFaction(e.partyId),
      alive: true,
      plane: e.from.plane,
      x: e.from.x,
      y: e.from.y,
    });
  }
  return seen;
}

function reduceWithInitial(events, targetTick) {
  const parties = hydrateInitialPositions(events);
  const posts = new Map();
  // Initial map state from scenario-start. Per-seed map randomization
  // means this varies between replays — fall back to SPEC_POSTS only
  // if the replay is older and doesn't carry the snapshot.
  let initialPosts = null;
  let obstacles = [];
  // Webbed tiles overlay. Keys are `${plane}:${x},${y}`. Web-spun
  // adds; web-broken removes. Spider-spawned spider parties (id
  // starting with `spiderling-`) appear via party-moved events.
  const webs = new Map();
  // Round 8 — damage zones currently active. Keyed by
  // `${plane}:${x},${y}` so stacking on the same tile is OK; we keep
  // a count for transparency. (Tile shape is reconstructed during
  // render.)
  const damageZones = new Map();
  // Round 8 — per-neutral hypnotize/rebound state, keyed by partyId.
  // Updated by hypnotize-attempted (success), hypnotize-rebound-started
  // events. We track turns approximately for outline color.
  const neutralHypno = new Map();
  // Round 14 — undiscovered item markers. Keyed by `${plane}:${x},${y}`
  // because at most one item can occupy a tile (spawn places taken-
  // tiles list prevents collision). Item-spawned adds; item-discovered
  // removes; item-dropped re-adds. Older replays without item events
  // leave this map empty (graceful fallback).
  const undiscoveredItems = new Map();
  // Per-party unit-level snapshot, keyed by partyId. Each value is
  // { faction, location, leaderId, posture, jellyDoses, units: Map<unitId, {...}> }.
  // Hydrated from scenario-start.parties; HP updates from battle-
  // resolved (rounds[].actions[].damage) and unit-died events.
  const partyUnits = new Map();
  // Unit-template digest from scenario-start.unitTemplates. Keyed by id.
  const unitTemplates = new Map();
  let turn = 0;
  let queenCharge = 0;
  // Round 12 — running per-faction gold totals. Replays without
  // `gold-earned` events leave these at 0 (backwards-compat).
  let antGold = 0;
  let spiderGold = 0;
  let winner = null;
  // Round 19 — per-faction score breakdown attached to a timeout-
  // resolved scenario-end. Null when the win was decisive (queen
  // kill / spider-web capture / field-force wipe). Surfaced in the
  // parties JSON viewer panel for inspection.
  let scoreBreakdown = null;
  for (const e of events) {
    // scenario-start carries the initial map state. Its emit tick (1)
    // is technically AFTER targetTick=0 (the initial frame the viewer
    // first shows), so don't gate this event on the tick window —
    // otherwise the renderer never sees per-seed POST/obstacle data
    // and falls back to the canonical SPEC_POSTS layout.
    if (e.kind === 'scenario-start') {
      if (Array.isArray(e.posts)) {
        initialPosts = e.posts.map((p) => ({
          id: p.id,
          plane: p.location.plane,
          x: p.location.x,
          y: p.location.y,
          owner: p.owner,
        }));
      }
      if (Array.isArray(e.obstacles)) obstacles = e.obstacles;
      if (Array.isArray(e.unitTemplates)) {
        for (const t of e.unitTemplates) unitTemplates.set(t.id, t);
      }
      if (Array.isArray(e.parties)) {
        for (const p of e.parties) {
          const units = new Map();
          for (const u of p.units) {
            units.set(u.id, {
              id: u.id,
              templateId: u.templateId,
              currentHp: u.currentHp,
              level: u.level,
              xp: u.xp,
            });
          }
          partyUnits.set(p.id, {
            id: p.id,
            faction: p.faction,
            location: p.location,
            leaderId: p.leaderId,
            posture: p.posture,
            jellyDoses: p.jellyDoses,
            units,
          });
        }
      }
      continue;
    }
    if (e.tick > targetTick) break;
    switch (e.kind) {
      case 'turn-start':
        turn = e.turn;
        break;
      case 'party-moved': {
        const p = parties.get(e.partyId);
        if (p) {
          p.plane = e.to.plane;
          p.x = e.to.x;
          p.y = e.to.y;
        }
        const pu = partyUnits.get(e.partyId);
        if (pu) pu.location = e.to;
        break;
      }
      case 'post-captured': {
        // Round 17 — flipping ownership clears any in-progress
        // capture (the prior `post-capture-progressed` chain is now
        // over). Preserve any existing `owner` map shape.
        const live = posts.get(e.postId) ?? {};
        posts.set(e.postId, {
          ...live,
          owner: e.newOwner,
          capturingFaction: null,
          captureTurnsRemaining: null,
        });
        break;
      }
      case 'post-capture-started': {
        // Round 17 — a fresh hold begins. Owner stays unchanged
        // (visible flip happens later via `post-captured`); we
        // record the capturer so the renderer can pulse a border
        // in their faction color.
        const live = posts.get(e.postId) ?? { owner: e.fromOwner };
        posts.set(e.postId, {
          ...live,
          capturingFaction: e.capturingFaction,
          captureTurnsRemaining: 2,
        });
        break;
      }
      case 'post-capture-progressed': {
        // Round 17 — decremented this turn.
        const live = posts.get(e.postId) ?? {};
        posts.set(e.postId, {
          ...live,
          capturingFaction: e.capturingFaction,
          captureTurnsRemaining: e.turnsRemaining,
        });
        break;
      }
      case 'post-capture-aborted': {
        // Round 17 — capture failed. Per spec, the engine resets
        // the POST to neutral when the holder leaves mid-capture
        // (drops any prior ownership). The viewer mirrors that.
        const live = posts.get(e.postId) ?? {};
        posts.set(e.postId, {
          ...live,
          owner: 'neutral',
          capturingFaction: null,
          captureTurnsRemaining: null,
        });
        break;
      }
      case 'queen-ultimate-charged':
        queenCharge = e.charge;
        break;
      case 'battle-resolved':
        applyBattleHpDeltas(partyUnits, e.result);
        break;
      case 'unit-died':
        markUnitDead(partyUnits, e.unitId);
        break;
      case 'web-spun':
        webs.set(`${e.coord.plane}:${e.coord.x},${e.coord.y}`, {
          plane: e.coord.plane,
          x: e.coord.x,
          y: e.coord.y,
        });
        break;
      case 'web-broken':
        webs.delete(`${e.coord.plane}:${e.coord.x},${e.coord.y}`);
        break;
      case 'damage-zone-spawned': {
        const k = `${e.center.plane}:${e.center.x},${e.center.y}`;
        damageZones.set(k, {
          plane: e.center.plane,
          x: e.center.x,
          y: e.center.y,
          tiles: e.tiles ?? null,
        });
        break;
      }
      case 'damage-zone-expired': {
        const k = `${e.center.plane}:${e.center.x},${e.center.y}`;
        damageZones.delete(k);
        break;
      }
      case 'hypnotize-attempted':
        if (e.success) {
          neutralHypno.set(e.targetId, { state: 'hypnotized' });
        }
        break;
      case 'hypnotize-rebound-started':
        neutralHypno.set(e.partyId, { state: 'rebound' });
        break;
      case 'recruit-attempted-neutral':
        if (e.success) {
          // Convert the party display faction to ant.
          const p = parties.get(e.targetId);
          if (p) p.faction = 'ant';
          const pu = partyUnits.get(e.targetId);
          if (pu) pu.faction = 'ant';
          neutralHypno.delete(e.targetId);
        }
        break;
      case 'gold-earned':
        if (e.faction === 'ant') antGold = e.newTotal;
        else if (e.faction === 'spider') spiderGold = e.newTotal;
        break;
      case 'item-spawned': {
        const k = `${e.location.plane}:${e.location.x},${e.location.y}`;
        undiscoveredItems.set(k, {
          plane: e.location.plane,
          x: e.location.x,
          y: e.location.y,
          itemId: e.itemId,
          buried: !!e.buried,
        });
        break;
      }
      case 'item-discovered': {
        const k = `${e.location.plane}:${e.location.x},${e.location.y}`;
        undiscoveredItems.delete(k);
        // Track the equipped item on the partyUnits slot for the
        // parties JSON panel.
        const pu = partyUnits.get(e.partyId);
        if (pu) pu.item = e.itemId;
        break;
      }
      case 'item-consumed': {
        // Slot stays empty; clear any prior item flag for the party.
        const pu = partyUnits.get(e.partyId);
        if (pu) pu.item = null;
        break;
      }
      case 'item-dropped': {
        const k = `${e.location.plane}:${e.location.x},${e.location.y}`;
        undiscoveredItems.set(k, {
          plane: e.location.plane,
          x: e.location.x,
          y: e.location.y,
          itemId: e.itemId,
          buried: false,
        });
        const pu = partyUnits.get(e.partyId);
        if (pu) pu.item = null;
        break;
      }
      case 'battle-fled': {
        // Round 15 — fleer's location moved to the knockback tile
        // without a `party-moved` event firing. Mirror the engine's
        // post-battle relocation so the viewer renders the new
        // position immediately after the flee.
        const p = parties.get(e.partyId);
        if (p) {
          p.plane = e.knockbackTo.plane;
          p.x = e.knockbackTo.x;
          p.y = e.knockbackTo.y;
        }
        const pu = partyUnits.get(e.partyId);
        if (pu) pu.location = e.knockbackTo;
        break;
      }
      case 'scenario-end':
        winner = e.winner;
        // Round 19 — capture score-resolved win telemetry (mechanics
        // memo §1.6). Decisive wins leave the field undefined and we
        // keep `scoreBreakdown` null so the parties panel doesn't
        // render it for capture-path wins.
        if (e.scoreBreakdown) scoreBreakdown = e.scoreBreakdown;
        break;
      default:
        break;
    }
  }
  return {
    parties,
    posts,
    initialPosts,
    obstacles,
    webs,
    damageZones,
    neutralHypno,
    partyUnits,
    unitTemplates,
    undiscoveredItems,
    turn,
    queenCharge,
    antGold,
    spiderGold,
    winner,
    scoreBreakdown,
  };
}

/**
 * Apply a battle-resolved event's per-action damage to the running
 * unit HPs. participants[] reflects HP at the START of the battle, and
 * each action's `damage` reduces that. We honor `killed` so units that
 * the engine marked dead end up at currentHp=0 even if rounding /
 * thorns nudged things.
 */
function applyBattleHpDeltas(partyUnits, result) {
  if (!result || !Array.isArray(result.participants)) return;
  // Seed each unit's running HP from the participant snapshot, in case
  // the partyUnits map is missing entries (e.g., spawned mid-game).
  const running = new Map();
  for (const p of result.participants) {
    running.set(p.unitId, p.hp);
  }
  for (const round of result.rounds ?? []) {
    for (const action of round.actions ?? []) {
      const cur = running.get(action.defenderId) ?? 0;
      running.set(action.defenderId, Math.max(0, cur - action.damage));
    }
  }
  for (const [unitId, hp] of running) {
    const owner = findPartyForUnit(partyUnits, unitId);
    if (!owner) continue;
    const u = owner.units.get(unitId);
    if (!u) continue;
    u.currentHp = hp;
  }
}

function markUnitDead(partyUnits, unitId) {
  const owner = findPartyForUnit(partyUnits, unitId);
  if (!owner) return;
  const u = owner.units.get(unitId);
  if (u) u.currentHp = 0;
}

function findPartyForUnit(partyUnits, unitId) {
  for (const pu of partyUnits.values()) {
    if (pu.units.has(unitId)) return pu;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Spec-locked POSTs (id -> default location). Used to seed the post
// rendering when no post-captured event has fired yet for that id.
// ---------------------------------------------------------------------------

const SPEC_POSTS = {
  'storm-drain': { plane: 'floor', x: 0, y: 0, owner: 'ant' },
  'soap-dish': { plane: 'floor', x: 5, y: 5, owner: 'neutral' },
  'towel-rack': { plane: 'floor', x: 8, y: 4, owner: 'neutral' },
  'wall-crack': { plane: 'north-wall', x: 8, y: 5, owner: 'neutral' },
  'spider-web': { plane: 'ceiling', x: 9, y: 9, owner: 'spider' },
};

function planeGridPosition(plane) {
  for (let r = 0; r < PLANE_GRID.length; r++) {
    const row = PLANE_GRID[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === plane) return { row: r, col: c };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rendering.
// ---------------------------------------------------------------------------

// Resolve a plane's on-canvas rectangle for the current view mode.
//
// In the default 6-grid layout the planes sit at fixed offsets with
// 30 px cells. When `FOCUSED_PLANE` is set (focus mode), only that
// plane renders — it occupies the full canvas at the largest cell size
// that still leaves room for the header label.
//
// Returned shape: `{ ox, oy, cellSize, visible }`. `visible: false`
// signals that the plane should be skipped entirely this frame (used
// by the renderer + click handler to keep the 6-grid math the same in
// focus mode).
function planeRenderArea(plane, canvas) {
  if (FOCUSED_PLANE) {
    if (plane !== FOCUSED_PLANE) return { ox: 0, oy: 0, cellSize: 0, visible: false };
    const w = canvas?.width ?? 990;
    const h = canvas?.height ?? 720;
    const cellSize = Math.floor(Math.min(w / GRID, (h - HEADER_H) / GRID));
    const boardW = cellSize * GRID;
    const boardH = cellSize * GRID;
    const ox = Math.floor((w - boardW) / 2);
    const oy = HEADER_H + Math.floor((h - HEADER_H - boardH) / 2);
    return { ox, oy, cellSize, visible: true };
  }
  const pos = planeGridPosition(plane);
  if (!pos) return { ox: 0, oy: HEADER_H, cellSize: CELL, visible: true };
  return {
    ox: pos.col * (PLANE_W + PLANE_GAP),
    oy: HEADER_H + pos.row * (PLANE_W + HEADER_H + PLANE_GAP),
    cellSize: CELL,
    visible: true,
  };
}

function drawPlane(ctx, plane, area) {
  const { ox, oy, cellSize } = area;
  // Plane label.
  ctx.fillStyle = '#aaa';
  ctx.font = '12px ui-sans-serif';
  ctx.fillText(plane, ox + 4, oy - 8);
  // Grid.
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(ox + i * cellSize + 0.5, oy + 0.5);
    ctx.lineTo(ox + i * cellSize + 0.5, oy + GRID * cellSize + 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox + 0.5, oy + i * cellSize + 0.5);
    ctx.lineTo(ox + GRID * cellSize + 0.5, oy + i * cellSize + 0.5);
    ctx.stroke();
  }
}

/** Pick the per-seed POST list if the replay included one, else fall
 * back to the canonical SPEC_POSTS layout. Returns the unified array
 * shape `{id, plane, x, y, owner}`. */
function postSource(initialPosts) {
  if (initialPosts) return initialPosts;
  return Object.entries(SPEC_POSTS).map(([id, def]) => ({
    id,
    plane: def.plane,
    x: def.x,
    y: def.y,
    owner: def.owner,
  }));
}

function drawObstacles(ctx, plane, obstacles, area) {
  if (!obstacles || obstacles.length === 0) return;
  const { ox, oy, cellSize } = area;
  ctx.fillStyle = '#3a2a18';
  ctx.strokeStyle = '#5a3f22';
  ctx.lineWidth = 1;
  for (const o of obstacles) {
    if (o.plane !== plane) continue;
    const x = ox + o.x * cellSize;
    const y = oy + o.y * cellSize;
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
  }
}

/**
 * Round 8 — render active damage zones as a semi-transparent yellow
 * plus shape. Each zone is the center tile + N/S/W/E neighbors,
 * clamped to map bounds (we re-derive in case the replay event
 * didn't carry the explicit `tiles` array).
 */
function drawDamageZones(ctx, plane, zones, area) {
  if (!zones || zones.size === 0) return;
  const { ox, oy, cellSize } = area;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 230, 80, 0.28)';
  ctx.strokeStyle = 'rgba(255, 230, 80, 0.7)';
  ctx.lineWidth = 1;
  for (const z of zones.values()) {
    if (z.plane !== plane) continue;
    const tiles =
      z.tiles && z.tiles.length > 0
        ? z.tiles
        : [
            { plane: z.plane, x: z.x, y: z.y },
            { plane: z.plane, x: z.x, y: z.y - 1 },
            { plane: z.plane, x: z.x, y: z.y + 1 },
            { plane: z.plane, x: z.x - 1, y: z.y },
            { plane: z.plane, x: z.x + 1, y: z.y },
          ].filter((t) => t.x >= 0 && t.x <= 9 && t.y >= 0 && t.y <= 9);
    for (const t of tiles) {
      if (t.plane !== plane) continue;
      const x = ox + t.x * cellSize;
      const y = oy + t.y * cellSize;
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
    }
  }
  ctx.restore();
}

/**
 * Round 14 — render undiscovered item markers as a small muted "?"
 * inside the tile. Once an item-discovered event fires, the reducer
 * removes the marker and the tile renders empty. Replays predating
 * item-spawned events leave `undiscoveredItems` empty so the canvas
 * is unchanged for older runs.
 */
function drawItemMarkers(ctx, plane, items, area) {
  if (!items || items.size === 0) return;
  const { ox, oy, cellSize } = area;
  const fontPx = Math.max(10, Math.floor(cellSize * 0.5));
  ctx.save();
  ctx.fillStyle = '#9aa0a6';
  ctx.strokeStyle = '#3a3a3a';
  ctx.font = `bold ${String(fontPx)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  for (const m of items.values()) {
    if (m.plane !== plane) continue;
    const cx = ox + m.x * cellSize + cellSize / 2;
    const cy = oy + m.y * cellSize + cellSize / 2 + Math.floor(fontPx / 3);
    ctx.fillText('?', cx, cy);
  }
  ctx.restore();
}

function drawWebs(ctx, plane, webs, area) {
  if (!webs || webs.size === 0) return;
  const { ox, oy, cellSize } = area;
  // Light translucent spider-purple square with a small "X" so the web
  // reads at a glance against both open and obstacle backgrounds.
  ctx.save();
  ctx.fillStyle = 'rgba(192, 38, 211, 0.25)';
  ctx.strokeStyle = '#c026d3';
  ctx.lineWidth = 1;
  for (const w of webs.values()) {
    if (w.plane !== plane) continue;
    const x = ox + w.x * cellSize;
    const y = oy + w.y * cellSize;
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    // Diagonal silk strands. Inset is proportional so the X stays
    // visible whether tiles are 30 px (6-grid) or ~70 px (focused).
    const inset = Math.max(2, Math.floor(cellSize * 0.13));
    ctx.beginPath();
    ctx.moveTo(x + inset, y + inset);
    ctx.lineTo(x + cellSize - inset, y + cellSize - inset);
    ctx.moveTo(x + cellSize - inset, y + inset);
    ctx.lineTo(x + inset, y + cellSize - inset);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPosts(ctx, plane, postsState, initialPosts, area) {
  const { ox, oy, cellSize } = area;
  // POST badge scales with cell size so it stays legible in focus mode.
  const badge = Math.max(12, Math.floor(cellSize * 0.8));
  const half = Math.floor(badge / 2);
  const fontPx = Math.max(9, Math.floor(cellSize * 0.32));
  for (const def of postSource(initialPosts)) {
    if (def.plane !== plane) continue;
    const live = postsState.get(def.id);
    const owner = live?.owner ?? def.owner;
    const capturingFaction = live?.capturingFaction ?? null;
    const cx = ox + def.x * cellSize + cellSize / 2;
    const cy = oy + def.y * cellSize + cellSize / 2;
    ctx.fillStyle = FACTION_COLOR[owner] ?? '#888';
    ctx.fillRect(cx - half, cy - half, badge, badge);
    // Round 17 — capture-in-progress: render a thicker outline in the
    // CAPTURING faction's color (NOT the current owner's). Lets the
    // viewer call out POSTs that are mid-flip from a glance. The
    // post-captured event will retire this state when ownership
    // actually changes.
    if (capturingFaction !== null && capturingFaction !== owner) {
      ctx.strokeStyle = FACTION_COLOR[capturingFaction] ?? '#fff';
      ctx.lineWidth = Math.max(2.5, Math.floor(cellSize * 0.12));
      ctx.strokeRect(cx - half - 1, cy - half - 1, badge + 2, badge + 2);
    }
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - half, cy - half, badge, badge);
    ctx.fillStyle = '#fff';
    ctx.font = `${String(fontPx)}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(shortPostName(def.id), cx, cy + Math.floor(fontPx / 3));
    ctx.textAlign = 'start';
  }
}

// Type-prefix labels: per-seed map gen emits IDs like `soap-dish-1`,
// `soap-dish-2`. Show the type label for the prefix and append the
// instance number when there are extras.
function shortPostName(id) {
  const labels = {
    'storm-drain': 'SD',
    'soap-dish': 'SOAP',
    'towel-rack': 'TWL',
    'wall-crack': 'WC',
    'spider-web': 'WEB',
  };
  if (labels[id]) return labels[id];
  // Try suffix-stripped match: `soap-dish-2` -> `soap-dish` -> 'SOAP'.
  const m = id.match(/^([a-z-]+)-(\d+)$/);
  if (m && labels[m[1]]) {
    return `${labels[m[1]]}${m[2]}`;
  }
  return id.slice(0, 4);
}

function drawParties(ctx, plane, parties, neutralHypno, area, followPartyId) {
  const { ox, oy, cellSize } = area;
  // Party-circle radius scales with cell size; fan-out distance does too.
  const radius = Math.max(6, Math.floor(cellSize * 0.22));
  const fanRadius = Math.max(6, Math.floor(cellSize * 0.22));
  // Bucket parties by tile so we can fan them out if multiple share a cell.
  const byTile = new Map();
  for (const [id, p] of parties) {
    if (!p.plane || p.plane !== plane) continue;
    const key = `${p.x},${p.y}`;
    const bucket = byTile.get(key) ?? [];
    bucket.push({ id, ...p });
    byTile.set(key, bucket);
  }
  for (const [key, bucket] of byTile) {
    const [x, y] = key.split(',').map(Number);
    const cx = ox + x * cellSize + cellSize / 2;
    const cy = oy + y * cellSize + cellSize / 2;
    bucket.forEach((p, i) => {
      // Fan out concentric.
      const angle = (i / bucket.length) * Math.PI * 2;
      const dx = bucket.length > 1 ? Math.cos(angle) * fanRadius : 0;
      const dy = bucket.length > 1 ? Math.sin(angle) * fanRadius : 0;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, radius, 0, Math.PI * 2);
      ctx.fillStyle = FACTION_COLOR[p.faction] ?? '#888';
      ctx.fill();
      // Round 8 — outline color flags hypnotize state for neutrals:
      //   hypnotized: bright purple ring (spider-controlled).
      //   rebound:    cyan ring (spider-immune, fleeing).
      //   default:    white ring.
      const hypno = neutralHypno?.get(p.id);
      if (hypno?.state === 'hypnotized') {
        ctx.strokeStyle = '#c026d3';
        ctx.lineWidth = 2;
      } else if (hypno?.state === 'rebound') {
        ctx.strokeStyle = '#22c5e8';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
      }
      ctx.stroke();
      // Follow-mode marker: bright yellow ring 2 px wider than the
      // party circle so the followed party is easy to spot when zoomed
      // in. Drawn on top of the faction/hypno stroke so it always wins.
      if (followPartyId && p.id === followPartyId) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }
}

/**
 * While the battle play-by-play panel is open, draw a 4-px yellow
 * outline on the attacker's tile (the battle tile) so the user can
 * locate the action on the canvas at a glance. Disappears when the
 * battle panel closes (BATTLE_STATE = null).
 */
function drawBattleHighlight(ctx, plane, state, area) {
  if (!BATTLE_STATE) return;
  const attackerId = BATTLE_STATE.event.result.attackerPartyId;
  const attacker = state.parties.get(attackerId);
  if (!attacker || attacker.plane !== plane) return;
  const { ox, oy, cellSize } = area;
  // Place the outline 2px outside the cell so it doesn't blend with
  // the grid lines or any party circle stroked in the same tile.
  const x = ox + attacker.x * cellSize - 2;
  const y = oy + attacker.y * cellSize - 2;
  const size = cellSize + 4;
  ctx.save();
  // Drop-shadow behind the stroke gives extra pop against the dark bg
  // and the orange-red ant circles.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, size, size);
  ctx.restore();
}

function render(canvas, state) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const plane of PLANES) {
    const area = planeRenderArea(plane, canvas);
    if (!area.visible) continue;
    drawPlane(ctx, plane, area);
    drawObstacles(ctx, plane, state.obstacles, area);
    drawDamageZones(ctx, plane, state.damageZones, area);
    drawItemMarkers(ctx, plane, state.undiscoveredItems, area);
    drawWebs(ctx, plane, state.webs, area);
    drawPosts(ctx, plane, state.posts, state.initialPosts, area);
    drawParties(ctx, plane, state.parties, state.neutralHypno, area, FOLLOW_PARTY);
    drawBattleHighlight(ctx, plane, state, area);
  }
  // HUD: queen charge, turn, winner banner.
  ctx.fillStyle = '#888';
  ctx.font = '11px ui-sans-serif';
  ctx.fillText(`turn ${state.turn} · queen ult charge ${state.queenCharge}`, 8, canvas.height - 8);
  if (state.winner) {
    // Ant-POV banner: read clearly even with no map context. Green
    // for ANTS WIN, red for ANTS LOSE.
    const antsWon = state.winner === 'ant';
    ctx.fillStyle = antsWon ? '#7c4' : '#e63';
    ctx.font = 'bold 18px ui-sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(antsWon ? 'ANTS WIN' : 'ANTS LOSE', canvas.width / 2, canvas.height - 12);
    ctx.textAlign = 'start';
  }
}

// ---------------------------------------------------------------------------
// Event log panel.
// ---------------------------------------------------------------------------

function renderLog(events, currentTick) {
  const list = document.getElementById('log-list');
  list.innerHTML = '';
  // Show the 25 events ending at currentTick (older ones above).
  const slice = events.filter((e) => e.tick <= currentTick).slice(-25);
  for (const e of slice) {
    const li = document.createElement('li');
    if (e.tick === currentTick) li.className = 'current';
    li.innerHTML = `<span class="tick">t${e.tick}</span><span class="kind">${e.kind}</span>${describeEvent(e)}`;
    list.appendChild(li);
  }
  list.scrollTop = list.scrollHeight;
}

// ---------------------------------------------------------------------------
// POSTs side-panel.
//
// Lists every POST on the board with its location, defensive bonus, and
// live owner (which advances as `post-captured` events fire — already
// tracked by the reducer in `state.posts`). Static info comes from
// `data/level-1/map.json`; the values are inlined here to avoid an
// extra fetch in the in-browser viewer.
// ---------------------------------------------------------------------------

// Defensive-bonus per POST type prefix. Per-seed map-gen suffixes the
// id with an instance number (e.g., `soap-dish-2`); the lookup falls
// back to the prefix match so duplicates inherit the type's bonus.
const POST_DEFENSIVE_BONUS = {
  'storm-drain': 4,
  'soap-dish': 2,
  'towel-rack': 2,
  'wall-crack': 2,
  'spider-web': 2,
};

function postDefensiveBonus(id) {
  if (POST_DEFENSIVE_BONUS[id] !== undefined) return POST_DEFENSIVE_BONUS[id];
  const m = id.match(/^([a-z-]+)-(\d+)$/);
  if (m && POST_DEFENSIVE_BONUS[m[1]] !== undefined) return POST_DEFENSIVE_BONUS[m[1]];
  return 0;
}

function renderPostsPanel(state) {
  const sources = postSource(state.initialPosts);
  document.getElementById('posts-count').textContent = String(sources.length);
  const rows = sources.map((def) => {
    const live = state.posts.get(def.id);
    const owner = live?.owner ?? def.owner;
    const bonus = postDefensiveBonus(def.id);
    // Round 17 — append a "capture: <faction> in N turns" status when
    // a hold is in progress. Visible alongside the owner badge so the
    // reader can see who currently holds the POST AND who's
    // contesting it.
    const capturingFaction = live?.capturingFaction ?? null;
    const turnsRemaining = live?.captureTurnsRemaining ?? null;
    const captureHtml =
      capturingFaction !== null && turnsRemaining !== null
        ? `<span class="post-capture ${capturingFaction}">cap:${capturingFaction} in ${String(turnsRemaining)}</span>`
        : '';
    return (
      `<div class="post-row">` +
      `<span class="post-id">${escapeHtml(def.id)}</span>` +
      `<span class="post-loc">${escapeHtml(def.plane)} (${String(def.x)},${String(def.y)})</span>` +
      `<span class="post-bonus">+${String(bonus)}</span>` +
      `<span class="post-owner ${owner}">${owner}</span>` +
      captureHtml +
      `</div>`
    );
  });
  document.getElementById('posts-content').innerHTML = rows.join('');
}

// ---------------------------------------------------------------------------
// Parties + units side-panel (raw JSON dump).
//
// Hydrated from `scenario-start.parties` (engine extension) and updated
// every render frame from the reducer's `partyUnits` map. If a replay
// is older and missing the field, we fall back to the position-only
// info the reducer already tracks. The unit-template digest is shown
// once at the top so the reader can map templateId -> baseStats.
// ---------------------------------------------------------------------------

function renderPartiesPanel(state) {
  const partyUnits = state.partyUnits;
  const templates = state.unitTemplates;
  const partyCount = partyUnits.size > 0 ? partyUnits.size : state.parties.size;
  document.getElementById('parties-count').textContent = String(partyCount);
  let snapshot;
  if (partyUnits.size === 0) {
    // Fallback: replay predates the engine extension, so we only have
    // position-level info.
    snapshot = {
      note: 'unit-level state requires the scenario-start engine extension; falling back to position-only data',
      parties: [...state.parties.entries()].map(([id, p]) => ({
        id,
        faction: p.faction,
        location: { plane: p.plane, x: p.x, y: p.y },
        ...(p.neutralKind ? { neutralKind: p.neutralKind } : {}),
        alive: p.alive,
      })),
    };
  } else {
    snapshot = {
      unitTemplates: [...templates.values()].map((t) => ({
        id: t.id,
        name: t.name,
        faction: t.faction,
        baseStats: t.baseStats,
        abilities: t.abilities,
        tags: t.tags,
      })),
      parties: [...partyUnits.values()].map((p) => ({
        id: p.id,
        faction: p.faction,
        location: p.location,
        leaderId: p.leaderId,
        posture: p.posture,
        jellyDoses: p.jellyDoses,
        // Round 14 — equipped persistent item, or null when slot empty.
        item: p.item ?? null,
        units: [...p.units.values()].map((u) => ({
          id: u.id,
          templateId: u.templateId,
          currentHp: u.currentHp,
          level: u.level,
          xp: u.xp,
        })),
      })),
    };
    // Round 19 — surface the score breakdown for timeout-resolved
    // wins (mechanics memo §1.6) so a viewer-side reader can verify
    // the awarded faction and per-component points without reading
    // the raw JSONL. Decisive wins leave the field absent.
    if (state.scoreBreakdown) {
      snapshot.scoreBreakdown = state.scoreBreakdown;
    }
  }
  document.getElementById('parties-content').textContent = JSON.stringify(snapshot, null, 2);
}

// ---------------------------------------------------------------------------
// Click-to-inspect: map a canvas click to (plane, x, y), show details for
// any parties + post at that tile.
// ---------------------------------------------------------------------------

let SELECTED_TILE = null;

function tileAtClick(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const cx = ((evt.clientX - rect.left) * canvas.width) / rect.width;
  const cy = ((evt.clientY - rect.top) * canvas.height) / rect.height;
  for (const plane of PLANES) {
    const area = planeRenderArea(plane, canvas);
    if (!area.visible) continue;
    const { ox, oy, cellSize } = area;
    if (cx < ox || cx >= ox + GRID * cellSize) continue;
    if (cy < oy || cy >= oy + GRID * cellSize) continue;
    const x = Math.floor((cx - ox) / cellSize);
    const y = Math.floor((cy - oy) / cellSize);
    return { plane, x, y };
  }
  return null;
}

function partiesAtTile(state, tile) {
  const out = [];
  for (const [id, p] of state.parties) {
    if (p.plane === tile.plane && p.x === tile.x && p.y === tile.y) {
      out.push({ id, ...p });
    }
  }
  return out;
}

function postAtTile(state, tile) {
  for (const def of postSource(state.initialPosts)) {
    if (def.plane !== tile.plane || def.x !== tile.x || def.y !== tile.y) continue;
    const live = state.posts.get(def.id);
    return { ...def, owner: live?.owner ?? def.owner };
  }
  return null;
}

function eventsForParty(events, partyId, currentTick, limit = 8) {
  const out = [];
  for (const e of events) {
    if (e.tick > currentTick) break;
    let touches = false;
    if ('partyId' in e && e.partyId === partyId) touches = true;
    if (e.kind === 'battle-resolved') {
      if (e.result.attackerPartyId === partyId || e.result.defenderPartyId === partyId)
        touches = true;
    }
    if (touches) out.push(e);
  }
  return out.slice(-limit);
}

function renderInspect(state, events, tick) {
  const panel = document.getElementById('inspect-content');
  if (!SELECTED_TILE) {
    panel.className = 'empty';
    panel.textContent = 'no tile selected';
    return;
  }
  const { plane, x, y } = SELECTED_TILE;
  const parties = partiesAtTile(state, SELECTED_TILE);
  const post = postAtTile(state, SELECTED_TILE);
  panel.className = '';

  let html = `<div><span class="label">tile</span> <span class="value">${plane} (${x}, ${y})</span></div>`;
  if (post) {
    html += `\n<div><span class="label">post</span> <span class="value">${post.id}</span> owner=<span class="${post.owner}">${post.owner}</span></div>`;
  }
  if (parties.length === 0 && !post) {
    html += '\n<div class="label">(no parties or post here)</div>';
  }
  for (const p of parties) {
    html += `\n<hr style="border-color:#444;margin:8px 0">`;
    html += `\n<div><span class="label">party</span> <span class="value">${p.id}</span> <span class="${p.faction}">${p.faction}</span></div>`;
    const recent = eventsForParty(events, p.id, tick);
    if (recent.length > 0) {
      html += `\n<div class="label" style="margin-top:6px">recent events:</div>`;
      for (const e of recent) {
        html += `\n<div style="padding-left:8px">t${e.tick} ${e.kind}${describeEvent(e) ? ' — ' + escapeHtml(describeEvent(e)) : ''}</div>`;
      }
    }
    // Raw JSON (truncated for readability).
    const rawJson = JSON.stringify(
      { id: p.id, faction: p.faction, location: { plane: p.plane, x: p.x, y: p.y } },
      null,
      2,
    );
    html += `\n<details style="margin-top:6px"><summary class="label">raw json</summary><pre style="margin:4px 0">${escapeHtml(rawJson)}</pre></details>`;
  }
  panel.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Battle play-by-play panel.
//
// Auto-shows when the main scrubber lands on a tick matching a
// battle-resolved event. The panel walks the event's rounds[].actions[]
// step-by-step, tracking running HP from each participant's snapshot.
// While the panel is showing a battle, main playback is paused.
// ---------------------------------------------------------------------------

// Currently-displayed battle's state. null = panel hidden.
//   event       — the battle-resolved event
//   actions     — flattened list of {round, action} entries
//   index       — how many actions have resolved so far
//                 (-1 = pre-battle, len-1 = final action shown,
//                  len   = battle complete, outcome shown)
//   playing     — auto-advance through actions
//   timer       — interval id when playing
let BATTLE_STATE = null;

// Focus mode: when set to a plane name, the canvas renders only that
// plane at the largest cell size that fits. Click a plane to focus it,
// click the focused plane again (or the "back to 6-grid" button) to
// return to the default 3×2 layout.
let FOCUSED_PLANE = null;

// Follow mode: when set to a partyId, each render frame slaves
// FOCUSED_PLANE to that party's current plane so the camera tracks the
// party as it crosses planes. Setting it via the header dropdown.
// Cleared automatically on replay load if the party isn't in the new
// replay; otherwise persists across runs/replays.
let FOLLOW_PARTY = null;

function flattenActions(rounds) {
  const flat = [];
  for (const r of rounds) {
    for (const a of r.actions) flat.push({ round: r.index, action: a });
  }
  return flat;
}

/**
 * Round 15 — pull the flee-attempt events that bracket a given
 * battle-resolved event. The engine emits all `battle-flee-attempted`
 * (and the optional `battle-flee-failed` / `battle-fled`) entries
 * BEFORE the corresponding `battle-resolved` in tick order, so we
 * walk back from the battle's tick and collect any flee rows whose
 * partyId matches one of the battle's two participants. Used by the
 * play-by-play log to render "X attempts flee (NN% chance, rolled R)
 * — success/failure" rows alongside the normal action rows.
 */
function fleeEventsForBattle(events, battle) {
  const out = [];
  const atk = battle.result.attackerPartyId;
  const def = battle.result.defenderPartyId;
  const battleIdx = events.indexOf(battle);
  if (battleIdx < 0) return out;
  // Walk backward from the battle event collecting consecutive flee
  // events on the same tick. Stop once we hit any non-flee event so
  // we don't attribute a previous battle's flees to this one.
  for (let i = battleIdx - 1; i >= 0; i--) {
    const e = events[i];
    if (e.tick !== battle.tick) break;
    if (e.kind === 'battle-flee-attempted' || e.kind === 'battle-flee-failed') {
      if (e.partyId === atk || e.partyId === def) out.unshift(e);
      continue;
    }
    if (e.kind === 'battle-resolved') break;
  }
  return out;
}

/** Locate the battle-resolved event whose tick is exactly `tick`, if any. */
function battleAtTick(events, tick) {
  for (const e of events) {
    if (e.tick > tick) break;
    if (e.tick === tick && e.kind === 'battle-resolved') return e;
  }
  return null;
}

/** Compute every participant's HP after `actionsApplied` actions have
 * resolved. Returns Map<unitId, {hp, dead}>. */
function deriveRunningHps(participants, allActions, actionsApplied) {
  const out = new Map();
  for (const p of participants) {
    out.set(p.unitId, { hp: p.hp, maxHp: p.maxHp, dead: p.hp <= 0 });
  }
  for (let i = 0; i < actionsApplied && i < allActions.length; i++) {
    const a = allActions[i].action;
    const cur = out.get(a.defenderId);
    if (!cur) continue;
    const next = Math.max(0, cur.hp - a.damage);
    out.set(a.defenderId, { hp: next, maxHp: cur.maxHp, dead: next <= 0 || a.killed });
  }
  return out;
}

function templateOf(unitId) {
  // Unit ids are like "u0017-ant-footman". Strip the "u####-" prefix.
  const m = /^u\d+-(.+)$/.exec(unitId);
  return m ? m[1] : unitId;
}

/** Pretty proper-case name for a unit template ("ant-mage" -> "Ant Mage"). */
function prettyTemplate(templateId) {
  const labels = {
    'ant-queen': 'Ant Queen',
    'ant-footman': 'Ant Footman',
    'ant-archer': 'Ant Archer',
    'ant-mage': 'Ant Mage',
    'ant-scout': 'Ant Scout',
    'ant-worker': 'Ant Worker',
    'ant-potato-bug': 'Ant Potato-bug',
    'ant-tank': 'Ant Tank',
    'spider-queen': 'Spider Queen',
    'spider-elite': 'Spider Elite',
    'spider-soldier': 'Spider Soldier',
    'spider-spinner': 'Spider Spinner',
    'spider-scout': 'Spider Scout',
    spiderling: 'Spiderling',
  };
  return labels[templateId] ?? templateId;
}

/** Lowercase shorthand for the compact roster column. */
function shortTemplate(templateId) {
  const labels = {
    'ant-queen': 'queen',
    'ant-footman': 'footman',
    'ant-archer': 'archer',
    'ant-mage': 'mage',
    'ant-scout': 'scout',
    'ant-worker': 'worker',
    'ant-potato-bug': 'potato-bug',
    'ant-tank': 'tank',
    'spider-queen': 'queen',
    'spider-elite': 'elite',
    'spider-soldier': 'soldier',
    'spider-spinner': 'spinner',
    'spider-scout': 'scout',
    spiderling: 'spiderling',
  };
  return labels[templateId] ?? templateId;
}

/** Verb that reads as the unit's basic-attack flavor. Kept short so
 * the play-by-play stays scannable. */
function attackVerb(templateId) {
  const verbs = {
    'ant-queen': 'strikes',
    'ant-footman': 'attacks',
    'ant-archer': 'shoots',
    'ant-mage': 'casts at',
    'ant-scout': 'ambushes',
    'ant-worker': 'swings at',
    'ant-potato-bug': 'rams',
    'ant-tank': 'rams',
    'spider-queen': 'lashes',
    'spider-elite': 'claws',
    'spider-soldier': 'bites',
    'spider-spinner': 'tangles',
    'spider-scout': 'darts at',
    spiderling: 'nips at',
  };
  return verbs[templateId] ?? 'hits';
}

function hpBar(hp, maxHp) {
  const filled = Math.max(0, Math.min(maxHp, hp));
  const empty = maxHp - filled;
  return (
    `<span class="hp-bar"><span class="hp-filled">${'■'.repeat(filled)}</span>` +
    `<span>${'·'.repeat(empty)}</span></span>`
  );
}

function renderRoster(side, partyId, participants, hps, currentAction) {
  const sideUnits = participants.filter((p) => p.side === side);
  const lines = sideUnits.map((p) => {
    const live = hps.get(p.unitId) ?? { hp: p.hp, maxHp: p.maxHp, dead: p.hp <= 0 };
    const cls = ['roster-unit'];
    if (live.dead) cls.push('dead');
    if (currentAction && currentAction.attackerId === p.unitId) cls.push('acting');
    if (currentAction && currentAction.defenderId === p.unitId) cls.push('targeted');
    const leaderCls = p.isLeader ? 'unit-leader' : '';
    const name = shortTemplate(p.templateId);
    const idShort = p.unitId.slice(0, 5);
    return (
      `<div class="${cls.join(' ')}">` +
      `<span class="${leaderCls}">${idShort}</span> ` +
      `<span>${escapeHtml(name)}</span> ` +
      `${hpBar(live.hp, live.maxHp)} ` +
      `<span style="color:#888">${live.hp}/${live.maxHp}</span>` +
      `</div>`
    );
  });
  const sideClass = side === 'attacker' ? 'attackers' : 'defenders';
  return (
    `<div class="roster-side ${sideClass}">` +
    `<h3>${side} — ${escapeHtml(partyId)}</h3>` +
    lines.join('\n') +
    `</div>`
  );
}

function renderBattleLog(state) {
  const items = [];
  // Round 15 — flee-attempt rows precede the per-round action rows.
  // They reflect engine-side decisions made before any combat fires
  // (or, on a failed flee, before the bonus round). Each row reads
  // as "X attempts flee (NN% chance, rolled R) — success/failure".
  for (const fe of state.fleeEvents ?? []) {
    if (fe.kind === 'battle-flee-attempted') {
      const pct = Math.round((fe.successProbability ?? 0) * 100);
      const roll = (fe.roll ?? 0).toFixed(3);
      const tag = fe.success ? 'success' : 'failure';
      const cls = fe.success ? 'flee-ok' : 'flee-fail';
      const msg = `${fe.partyId} attempts flee (${pct}% chance, rolled ${roll}) — ${tag}`;
      items.push(`<li class="${cls}">${escapeHtml(msg)}</li>`);
    } else if (fe.kind === 'battle-flee-failed') {
      items.push(
        `<li class="flee-fail">${escapeHtml(`${fe.partyId} flee blocked — bonus round for opponent`)}</li>`,
      );
    }
  }
  let lastRound = -1;
  for (let i = 0; i < state.actions.length && i <= state.index; i++) {
    const { round, action } = state.actions[i];
    if (round !== lastRound) {
      items.push(`<li class="round-header">— round ${round + 1} —</li>`);
      lastRound = round;
    }
    const atkTpl = templateOf(action.attackerId);
    const defTpl = templateOf(action.defenderId);
    const verb = attackVerb(atkTpl);
    const cls = action.killed ? 'kill' : '';
    const tail = action.killed ? ' (killed)' : '';
    const msg = `${prettyTemplate(atkTpl)} ${verb} ${prettyTemplate(defTpl)} for ${String(action.damage)} damage.${tail}`;
    items.push(`<li class="${cls}">${escapeHtml(msg)}</li>`);
  }
  if (state.index >= state.actions.length) {
    const e = state.event;
    const r = e.result;
    let outcome;
    // Round 15 — a successful flee ends the battle as a draw with
    // `retreatTo` populated; surface that distinctly from a normal
    // tie so the reader sees "FLED" rather than the generic "DRAW".
    const fled = (state.fleeEvents ?? []).some(
      (fe) => fe.kind === 'battle-flee-attempted' && fe.success,
    );
    if (fled) {
      outcome = 'FLED';
    } else if (r.winner === 'draw') {
      outcome = 'DRAW';
    } else {
      outcome = `${r.winner} wins (${r.attackerCasualties.length} attacker / ${r.defenderCasualties.length} defender casualties)`;
    }
    items.push(`<li class="outcome">▸ ${escapeHtml(outcome)}</li>`);
  }
  return items.join('');
}

function renderBattlePanel() {
  const panel = document.getElementById('battle-panel');
  if (!BATTLE_STATE) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  const e = BATTLE_STATE.event;
  const r = e.result;
  document.getElementById('battle-title').textContent =
    `${r.attackerPartyId} vs ${r.defenderPartyId}` +
    ` — action ${Math.min(BATTLE_STATE.index + 1, BATTLE_STATE.actions.length)}` +
    ` / ${BATTLE_STATE.actions.length}`;

  const hps = deriveRunningHps(r.participants ?? [], BATTLE_STATE.actions, BATTLE_STATE.index + 1);
  const currentAction =
    BATTLE_STATE.index >= 0 && BATTLE_STATE.index < BATTLE_STATE.actions.length
      ? BATTLE_STATE.actions[BATTLE_STATE.index].action
      : null;
  const rosters = document.getElementById('battle-rosters');
  rosters.innerHTML =
    renderRoster('attacker', r.attackerPartyId, r.participants ?? [], hps, currentAction) +
    renderRoster('defender', r.defenderPartyId, r.participants ?? [], hps, currentAction);

  document.getElementById('battle-log').innerHTML = renderBattleLog(BATTLE_STATE);
  document.getElementById('battle-toggle').textContent = BATTLE_STATE.playing ? '⏸' : '▶';
}

function stopBattlePlayback() {
  if (BATTLE_STATE && BATTLE_STATE.timer) {
    clearInterval(BATTLE_STATE.timer);
    BATTLE_STATE.timer = null;
  }
  if (BATTLE_STATE) BATTLE_STATE.playing = false;
}

function startBattlePlayback() {
  if (!BATTLE_STATE) return;
  stopBattlePlayback();
  BATTLE_STATE.playing = true;
  const speed = Number(document.getElementById('speed').value);
  const intervalMs = Math.max(120, 800 / speed);
  BATTLE_STATE.timer = setInterval(() => {
    if (!BATTLE_STATE) return;
    if (BATTLE_STATE.index >= BATTLE_STATE.actions.length) {
      stopBattlePlayback();
      renderBattlePanel();
      return;
    }
    BATTLE_STATE.index += 1;
    renderBattlePanel();
  }, intervalMs);
  renderBattlePanel();
}

function openBattlePanel(event) {
  // Pause main playback when a battle is in view.
  if (PLAY_TIMER) {
    clearInterval(PLAY_TIMER);
    PLAY_TIMER = null;
    document.getElementById('play-btn').textContent = '▶ play';
  }
  stopBattlePlayback();
  const actions = flattenActions(event.result.rounds);
  // Round 15 — pull any flee events bracketing this battle so the log
  // renders the "X attempts flee" rows above the action list.
  const fleeEvents = fleeEventsForBattle(CURRENT_EVENTS, event);
  BATTLE_STATE = {
    event,
    actions,
    fleeEvents,
    // No actions (e.g., opening volley wiped one side): jump straight
    // to the outcome line. Otherwise start at -1 so the first
    // auto-advance reveals action 0 with a beat of suspense.
    index: actions.length === 0 ? 0 : -1,
    playing: false,
    timer: null,
  };
  renderBattlePanel();
  if (actions.length > 0) startBattlePlayback();
}

function closeBattlePanel() {
  stopBattlePlayback();
  BATTLE_STATE = null;
  renderBattlePanel();
}

function maybeUpdateBattlePanelForTick(events, tick) {
  const battle = battleAtTick(events, tick);
  if (!battle) {
    closeBattlePanel();
    return;
  }
  if (BATTLE_STATE && BATTLE_STATE.event === battle) return; // already showing
  openBattlePanel(battle);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function describeEvent(e) {
  switch (e.kind) {
    case 'party-moved':
      return `${e.partyId} ${e.from.plane}(${e.from.x},${e.from.y})→${e.to.plane}(${e.to.x},${e.to.y})`;
    case 'battle-resolved':
      return `${e.result.attackerPartyId} vs ${e.result.defenderPartyId} → ${e.result.winner}`;
    case 'post-captured':
      return `${e.postId} → ${e.newOwner}`;
    case 'post-capture-started':
      return `${e.postId} capture started by ${e.capturingFaction} (was ${e.fromOwner})`;
    case 'post-capture-progressed':
      return `${e.postId} ${e.capturingFaction} hold: ${String(e.turnsRemaining)} left`;
    case 'post-capture-aborted':
      return `${e.postId} capture aborted (was ${e.previousOwner} → neutral)`;
    case 'leader-died':
      return e.partyId;
    case 'unit-died':
      return e.unitId;
    case 'ability-used':
      return `${e.partyId} ${e.abilityId}`;
    case 'queen-ultimate-fired':
      return '';
    case 'scenario-end': {
      // Round 19 — score-resolved wins carry a per-faction breakdown.
      // Render the totals inline so the reader can see at a glance
      // why the score awarded the win.
      if (e.scoreBreakdown) {
        const a = e.scoreBreakdown.ant;
        const s = e.scoreBreakdown.spider;
        return `winner=${e.winner} (score: ant=${String(a.total)} [posts=${String(a.posts)} queen=${String(a.queen)} web=${a.webProgress.toFixed(1)} hp=${String(a.hp)}] spider=${String(s.total)} [posts=${String(s.posts)} queen=${String(s.queen)} hp=${String(s.hp)}])`;
      }
      return `winner=${e.winner}`;
    }
    case 'turn-start':
      return `turn ${e.turn}`;
    case 'neutral-spawned':
      return `${e.neutralKind} @ ${e.location.plane}(${e.location.x},${e.location.y})`;
    case 'hypnotize-attempted':
      return `${e.partyId}→${e.targetId} ${e.success ? 'OK' : 'FAIL'} (caster ${e.casterHpBefore}→${e.casterHpAfter})`;
    case 'hypnotize-rebound-started':
      return `${e.partyId} rebound`;
    case 'recruit-attempted-neutral':
      return `${e.partyId}→${e.targetId} (${e.targetType}) ${e.success ? 'OK' : 'FAIL'}`;
    case 'damage-zone-spawned':
      return `${e.center.plane}(${e.center.x},${e.center.y})`;
    case 'damage-zone-tick':
      return `${e.center.plane}(${e.center.x},${e.center.y}) dmg=${e.damage} units=${e.affectedUnits.length}`;
    case 'damage-zone-expired':
      return `${e.center.plane}(${e.center.x},${e.center.y})`;
    case 'gold-earned':
      return `${e.faction} +${String(e.amount)} (${e.source}: ${e.sourceId}) → ${String(e.newTotal)}`;
    case 'item-spawned':
      return `${e.itemId}${e.buried ? ' (buried)' : ''} @ ${e.location.plane}(${e.location.x},${e.location.y})`;
    case 'item-discovered':
      return `${e.partyId} found ${e.itemId} @ ${e.location.plane}(${e.location.x},${e.location.y})`;
    case 'item-consumed':
      return `${e.partyId} consumed ${e.itemId} (${e.effect})`;
    case 'item-dropped':
      return `${e.partyId} dropped ${e.itemId} @ ${e.location.plane}(${e.location.x},${e.location.y})`;
    case 'battle-flee-attempted': {
      const pct = Math.round((e.successProbability ?? 0) * 100);
      const roll = (e.roll ?? 0).toFixed(3);
      return `${e.partyId} flee ${pct}% (rolled ${roll}) → ${e.success ? 'OK' : 'FAIL'}`;
    }
    case 'battle-fled':
      return `${e.partyId} fled ${e.knockbackFrom.plane}(${e.knockbackFrom.x},${e.knockbackFrom.y})→${e.knockbackTo.plane}(${e.knockbackTo.x},${e.knockbackTo.y})`;
    case 'battle-flee-failed':
      return `${e.partyId} flee failed`;
    case 'web-mended':
      return `${e.partyId} +${String(e.hpHealed)} HP (${String(e.perUnit?.length ?? 0)} units)`;
    case 'flee-queued': {
      // Round 16 — AI-side flee intent. `reason` distinguishes the
      // round-15 HP-threshold trigger from the round-16 threat
      // prediction; threat-prediction emits include the predicted
      // enemy and Lanchester loss probability for transparency.
      if (e.reason === 'threat-prediction') {
        const pct = Math.round((e.lossProbability ?? 0) * 100);
        return `${e.partyId} queues flee vs ${e.enemyPartyId} (loss ${pct}%)`;
      }
      return `${e.partyId} queues flee (low HP)`;
    }
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Replay loading + UI wiring.
//
// Two modes:
//   - "manifest" mode (production / Netlify): we fetch a static
//     `replays/manifest.json` describing the available runs, and load each
//     replay as a static asset. No server needed.
//   - "api" mode (local dev): the `pnpm viewer` Node server serves
//     /api/runs, /api/replays, /api/replay endpoints that read from out/.
//
// We try manifest mode first; if `replays/manifest.json` 404s, we fall
// back to the dev API. That keeps a single `main.js` working in both.
// ---------------------------------------------------------------------------

let CURRENT_EVENTS = [];
let MAX_TICK = 0;
let PLAY_TIMER = null;

let MANIFEST = null; // populated when manifest.json loads

async function loadRuns() {
  // Try static manifest first.
  try {
    const res = await fetch('./replays/manifest.json');
    if (res.ok) {
      MANIFEST = await res.json();
      const sel = document.getElementById('run-select');
      sel.innerHTML = '';
      for (const r of MANIFEST.runs) {
        const opt = document.createElement('option');
        opt.value = r.name;
        opt.textContent = r.label ?? r.name;
        sel.appendChild(opt);
      }
      return MANIFEST.runs.map((r) => r.name);
    }
  } catch {
    // Network error or 404 → fall back to API.
  }
  // Dev API.
  const res = await fetch('/api/runs');
  const runs = await res.json();
  const sel = document.getElementById('run-select');
  sel.innerHTML = '';
  for (const r of runs) {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  }
  return runs;
}

// Normalize a replay entry to { name, outcome }. Tolerant of older
// manifests / API responses that returned bare strings.
function normalizeReplayEntry(r) {
  if (typeof r === 'string') return { name: r, outcome: null };
  return { name: r.name, outcome: r.outcome ?? null };
}

const OUTCOME_TAG = {
  ant: 'ANT WIN',
  spider: 'SPIDER WIN',
  timeout: 'TIMEOUT',
};

async function loadReplaysForRun(run) {
  let raw;
  if (MANIFEST) {
    const found = MANIFEST.runs.find((r) => r.name === run);
    raw = found ? found.replays : [];
  } else {
    const res = await fetch(`/api/replays?run=${encodeURIComponent(run)}`);
    raw = await res.json();
  }
  const replays = raw.map(normalizeReplayEntry);
  const sel = document.getElementById('replay-select');
  sel.innerHTML = '';
  for (const r of replays) {
    const opt = document.createElement('option');
    opt.value = r.name;
    const tag = r.outcome ? ` — ${OUTCOME_TAG[r.outcome] ?? r.outcome}` : '';
    opt.textContent = `${r.name}${tag}`;
    sel.appendChild(opt);
  }
  return replays.map((r) => r.name);
}

async function loadReplay(run, name) {
  const url = MANIFEST
    ? `./replays/${encodeURIComponent(run)}/${encodeURIComponent(name)}`
    : `/api/replay?run=${encodeURIComponent(run)}&file=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  const text = await res.text();
  CURRENT_EVENTS = text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  MAX_TICK = CURRENT_EVENTS.length > 0 ? CURRENT_EVENTS[CURRENT_EVENTS.length - 1].tick : 0;
  const scrubber = document.getElementById('scrubber');
  scrubber.max = MAX_TICK;
  scrubber.value = 0;
  rebuildFollowDropdown();
  setTick(0);
  document.getElementById('status').textContent =
    `${CURRENT_EVENTS.length} events, ${MAX_TICK} ticks${MANIFEST ? ' · static' : ' · dev'}`;
}

// Rebuild the "follow" header dropdown from the parties present in the
// just-loaded replay. If a party was being followed and is still in the
// new replay we keep the selection; otherwise we drop back to "(none)".
function rebuildFollowDropdown() {
  const parties = hydrateInitialPositions(CURRENT_EVENTS);
  const select = document.getElementById('follow-select');
  // Sort by faction then id so ants are grouped together — easier to
  // scan in-game.
  const ids = [...parties.entries()]
    .sort((a, b) => {
      const fa = a[1].faction ?? 'neutral';
      const fb = b[1].faction ?? 'neutral';
      if (fa !== fb) return fa.localeCompare(fb);
      return a[0].localeCompare(b[0]);
    })
    .map(([id, p]) => ({ id, faction: p.faction ?? 'neutral' }));
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '(none)';
  select.appendChild(none);
  for (const { id, faction } of ids) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${id} [${faction}]`;
    select.appendChild(opt);
  }
  // Drop the follow target if it's not in this replay. We also drop
  // the focused plane in that case so the new replay opens in the
  // 6-grid view, not on whatever plane the previous followed party
  // happened to be on.
  if (FOLLOW_PARTY && !parties.has(FOLLOW_PARTY)) {
    FOLLOW_PARTY = null;
    FOCUSED_PLANE = null;
  }
  select.value = FOLLOW_PARTY ?? '';
}

function setTick(tick) {
  const t = Math.max(0, Math.min(MAX_TICK, tick));
  document.getElementById('scrubber').value = t;
  const state = reduceWithInitial(CURRENT_EVENTS, t);
  // Follow mode: if a party is being followed, slave the focused plane
  // to wherever that party is right now. Dead parties keep their last
  // known plane (we only update when we have a current location).
  if (FOLLOW_PARTY) {
    const followed = state.parties.get(FOLLOW_PARTY);
    if (followed?.plane) FOCUSED_PLANE = followed.plane;
  }
  render(document.getElementById('board'), state);
  renderLog(CURRENT_EVENTS, t);
  renderInspect(state, CURRENT_EVENTS, t);
  renderPostsPanel(state);
  renderPartiesPanel(state);
  maybeUpdateBattlePanelForTick(CURRENT_EVENTS, t);
  const winnerText = state.winner ? (state.winner === 'ant' ? ' — ANTS WIN' : ' — ANTS LOSE') : '';
  document.getElementById('tick-label').textContent =
    `tick ${t} / ${MAX_TICK} — turn ${state.turn}${winnerText}`;
  // Round 12 — gold counters in the header. Reducer tracks `antGold` /
  // `spiderGold` from `gold-earned` events; on a fresh replay both are
  // 0 until the first POST capture or kill.
  document.getElementById('gold-ant').textContent = String(state.antGold ?? 0);
  document.getElementById('gold-spider').textContent = String(state.spiderGold ?? 0);
}

function togglePlay() {
  const btn = document.getElementById('play-btn');
  if (PLAY_TIMER) {
    clearInterval(PLAY_TIMER);
    PLAY_TIMER = null;
    btn.textContent = '▶ play';
    return;
  }
  const speed = Number(document.getElementById('speed').value);
  const intervalMs = Math.max(20, 200 / speed);
  PLAY_TIMER = setInterval(() => {
    const cur = Number(document.getElementById('scrubber').value);
    if (cur >= MAX_TICK) {
      clearInterval(PLAY_TIMER);
      PLAY_TIMER = null;
      btn.textContent = '▶ play';
      return;
    }
    setTick(cur + 1);
  }, intervalMs);
  btn.textContent = '⏸ pause';
}

async function init() {
  document
    .getElementById('scrubber')
    .addEventListener('input', (e) => setTick(Number(e.target.value)));
  document.getElementById('play-btn').addEventListener('click', togglePlay);
  const board = document.getElementById('board');
  board.addEventListener('click', (e) => {
    const tile = tileAtClick(board, e);
    SELECTED_TILE = tile;
    // Clicking a plane toggles focus on that plane. Clicking the
    // already-focused plane returns to the 6-grid view. Clicks in the
    // gutters (no tile under the cursor) leave focus state alone.
    if (tile) {
      FOCUSED_PLANE = FOCUSED_PLANE === tile.plane ? null : tile.plane;
    }
    setTick(Number(document.getElementById('scrubber').value));
  });
  document.getElementById('focus-reset').addEventListener('click', () => {
    // Clearing focus also exits follow mode — otherwise the next render
    // would immediately re-focus the followed party's plane.
    if (FOCUSED_PLANE === null && FOLLOW_PARTY === null) return;
    FOCUSED_PLANE = null;
    FOLLOW_PARTY = null;
    document.getElementById('follow-select').value = '';
    setTick(Number(document.getElementById('scrubber').value));
  });
  document.getElementById('follow-select').addEventListener('change', (e) => {
    FOLLOW_PARTY = e.target.value || null;
    if (FOLLOW_PARTY === null) {
      // Exiting follow returns to whatever view was up before — i.e.,
      // we drop the auto-focus too. The user can still click a plane
      // afterward to focus manually.
      FOCUSED_PLANE = null;
    }
    setTick(Number(document.getElementById('scrubber').value));
  });
  document.getElementById('speed').addEventListener('input', (e) => {
    document.getElementById('speed-val').textContent = `${e.target.value}×`;
  });
  document.getElementById('run-select').addEventListener('change', async (e) => {
    const replays = await loadReplaysForRun(e.target.value);
    if (replays.length > 0) await loadReplay(e.target.value, replays[0]);
  });
  document.getElementById('replay-select').addEventListener('change', (e) => {
    const run = document.getElementById('run-select').value;
    loadReplay(run, e.target.value);
  });

  // Battle panel step controls.
  document.getElementById('battle-prev').addEventListener('click', () => {
    if (!BATTLE_STATE) return;
    stopBattlePlayback();
    BATTLE_STATE.index = Math.max(-1, BATTLE_STATE.index - 1);
    renderBattlePanel();
  });
  document.getElementById('battle-next').addEventListener('click', () => {
    if (!BATTLE_STATE) return;
    stopBattlePlayback();
    BATTLE_STATE.index = Math.min(BATTLE_STATE.actions.length, BATTLE_STATE.index + 1);
    renderBattlePanel();
  });
  document.getElementById('battle-toggle').addEventListener('click', () => {
    if (!BATTLE_STATE) return;
    if (BATTLE_STATE.playing) stopBattlePlayback();
    else startBattlePlayback();
    renderBattlePanel();
  });
  document.getElementById('battle-jump-end').addEventListener('click', () => {
    if (!BATTLE_STATE) return;
    stopBattlePlayback();
    BATTLE_STATE.index = BATTLE_STATE.actions.length;
    renderBattlePanel();
  });

  const runs = await loadRuns();
  if (runs.length === 0) {
    document.getElementById('status').textContent =
      'no replays found in out/. Run `pnpm harness:run` first.';
    return;
  }
  const replays = await loadReplaysForRun(runs[0]);
  if (replays.length > 0) await loadReplay(runs[0], replays[0]);
}

init();
