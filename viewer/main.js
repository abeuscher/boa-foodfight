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
  let turn = 0;
  let queenCharge = 0;
  let winner = null;
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
        break;
      }
      case 'post-captured':
        posts.set(e.postId, { owner: e.newOwner });
        break;
      case 'queen-ultimate-charged':
        queenCharge = e.charge;
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
      case 'scenario-end':
        winner = e.winner;
        break;
      default:
        break;
    }
  }
  return { parties, posts, initialPosts, obstacles, webs, turn, queenCharge, winner };
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

function planeOrigin(plane) {
  const pos = planeGridPosition(plane);
  if (!pos) return { ox: 0, oy: HEADER_H };
  return {
    ox: pos.col * (PLANE_W + PLANE_GAP),
    oy: HEADER_H + pos.row * (PLANE_W + HEADER_H + PLANE_GAP),
  };
}

function drawPlane(ctx, plane) {
  const { ox, oy } = planeOrigin(plane);
  // Plane label.
  ctx.fillStyle = '#aaa';
  ctx.font = '12px ui-sans-serif';
  ctx.fillText(plane, ox + 4, oy - 8);
  // Grid.
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(ox + i * CELL + 0.5, oy + 0.5);
    ctx.lineTo(ox + i * CELL + 0.5, oy + GRID * CELL + 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox + 0.5, oy + i * CELL + 0.5);
    ctx.lineTo(ox + GRID * CELL + 0.5, oy + i * CELL + 0.5);
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

function drawObstacles(ctx, plane, obstacles) {
  if (!obstacles || obstacles.length === 0) return;
  const { ox, oy } = planeOrigin(plane);
  ctx.fillStyle = '#3a2a18';
  ctx.strokeStyle = '#5a3f22';
  ctx.lineWidth = 1;
  for (const o of obstacles) {
    if (o.plane !== plane) continue;
    const x = ox + o.x * CELL;
    const y = oy + o.y * CELL;
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
  }
}

function drawWebs(ctx, plane, webs) {
  if (!webs || webs.size === 0) return;
  const { ox, oy } = planeOrigin(plane);
  // Light translucent spider-purple square with a small "X" so the web
  // reads at a glance against both open and obstacle backgrounds.
  ctx.save();
  ctx.fillStyle = 'rgba(192, 38, 211, 0.25)';
  ctx.strokeStyle = '#c026d3';
  ctx.lineWidth = 1;
  for (const w of webs.values()) {
    if (w.plane !== plane) continue;
    const x = ox + w.x * CELL;
    const y = oy + w.y * CELL;
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    // Diagonal silk strands.
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + CELL - 4, y + CELL - 4);
    ctx.moveTo(x + CELL - 4, y + 4);
    ctx.lineTo(x + 4, y + CELL - 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPosts(ctx, plane, postsState, initialPosts) {
  const { ox, oy } = planeOrigin(plane);
  for (const def of postSource(initialPosts)) {
    if (def.plane !== plane) continue;
    const live = postsState.get(def.id);
    const owner = live?.owner ?? def.owner;
    const cx = ox + def.x * CELL + CELL / 2;
    const cy = oy + def.y * CELL + CELL / 2;
    ctx.fillStyle = FACTION_COLOR[owner] ?? '#888';
    ctx.fillRect(cx - 12, cy - 12, 24, 24);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 12, cy - 12, 24, 24);
    ctx.fillStyle = '#fff';
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(shortPostName(def.id), cx, cy + 3);
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

function drawParties(ctx, plane, parties) {
  const { ox, oy } = planeOrigin(plane);
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
    const cx = ox + x * CELL + CELL / 2;
    const cy = oy + y * CELL + CELL / 2;
    bucket.forEach((p, i) => {
      // Fan out concentric.
      const angle = (i / bucket.length) * Math.PI * 2;
      const dx = bucket.length > 1 ? Math.cos(angle) * 6 : 0;
      const dy = bucket.length > 1 ? Math.sin(angle) * 6 : 0;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 6, 0, Math.PI * 2);
      ctx.fillStyle = FACTION_COLOR[p.faction] ?? '#888';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }
}

function render(canvas, state) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const plane of PLANES) {
    drawPlane(ctx, plane);
    drawObstacles(ctx, plane, state.obstacles);
    drawWebs(ctx, plane, state.webs);
    drawPosts(ctx, plane, state.posts, state.initialPosts);
    drawParties(ctx, plane, state.parties);
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
// Click-to-inspect: map a canvas click to (plane, x, y), show details for
// any parties + post at that tile.
// ---------------------------------------------------------------------------

let SELECTED_TILE = null;

function tileAtClick(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const cx = ((evt.clientX - rect.left) * canvas.width) / rect.width;
  const cy = ((evt.clientY - rect.top) * canvas.height) / rect.height;
  for (const plane of PLANES) {
    const { ox, oy } = planeOrigin(plane);
    if (cx < ox || cx >= ox + GRID * CELL) continue;
    if (cy < oy || cy >= oy + GRID * CELL) continue;
    const x = Math.floor((cx - ox) / CELL);
    const y = Math.floor((cy - oy) / CELL);
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

function flattenActions(rounds) {
  const flat = [];
  for (const r of rounds) {
    for (const a of r.actions) flat.push({ round: r.index, action: a });
  }
  return flat;
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
    const outcome =
      r.winner === 'draw'
        ? 'DRAW'
        : `${r.winner} wins (${r.attackerCasualties.length} attacker / ${r.defenderCasualties.length} defender casualties)`;
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
  BATTLE_STATE = {
    event,
    actions,
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
    case 'leader-died':
      return e.partyId;
    case 'unit-died':
      return e.unitId;
    case 'ability-used':
      return `${e.partyId} ${e.abilityId}`;
    case 'queen-ultimate-fired':
      return '';
    case 'scenario-end':
      return `winner=${e.winner}`;
    case 'turn-start':
      return `turn ${e.turn}`;
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

async function loadReplaysForRun(run) {
  let replays;
  if (MANIFEST) {
    const found = MANIFEST.runs.find((r) => r.name === run);
    replays = found ? found.replays : [];
  } else {
    const res = await fetch(`/api/replays?run=${encodeURIComponent(run)}`);
    replays = await res.json();
  }
  const sel = document.getElementById('replay-select');
  sel.innerHTML = '';
  for (const r of replays) {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  }
  return replays;
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
  setTick(0);
  document.getElementById('status').textContent =
    `${CURRENT_EVENTS.length} events, ${MAX_TICK} ticks${MANIFEST ? ' · static' : ' · dev'}`;
}

function setTick(tick) {
  const t = Math.max(0, Math.min(MAX_TICK, tick));
  document.getElementById('scrubber').value = t;
  const state = reduceWithInitial(CURRENT_EVENTS, t);
  render(document.getElementById('board'), state);
  renderLog(CURRENT_EVENTS, t);
  renderInspect(state, CURRENT_EVENTS, t);
  maybeUpdateBattlePanelForTick(CURRENT_EVENTS, t);
  const winnerText = state.winner ? (state.winner === 'ant' ? ' — ANTS WIN' : ' — ANTS LOSE') : '';
  document.getElementById('tick-label').textContent =
    `tick ${t} / ${MAX_TICK} — turn ${state.turn}${winnerText}`;
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
