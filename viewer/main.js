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
const FACTION_COLOR = { ant: '#e85d4a', spider: '#1f1f1f', neutral: '#888' };

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
  let turn = 0;
  let queenCharge = 0;
  let winner = null;
  for (const e of events) {
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
      case 'scenario-end':
        winner = e.winner;
        break;
      default:
        break;
    }
  }
  return { parties, posts, turn, queenCharge, winner };
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

function drawPosts(ctx, plane, postsState) {
  const { ox, oy } = planeOrigin(plane);
  for (const [id, def] of Object.entries(SPEC_POSTS)) {
    if (def.plane !== plane) continue;
    const live = postsState.get(id) ?? def;
    const owner = live.owner ?? def.owner;
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
    ctx.fillText(shortPostName(id), cx, cy + 3);
    ctx.textAlign = 'start';
  }
}

function shortPostName(id) {
  return (
    {
      'storm-drain': 'SD',
      'soap-dish': 'SOAP',
      'towel-rack': 'TWL',
      'wall-crack': 'WC',
      'spider-web': 'WEB',
    }[id] ?? id.slice(0, 4)
  );
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
    drawPosts(ctx, plane, state.posts);
    drawParties(ctx, plane, state.parties);
  }
  // HUD: queen charge, turn, winner banner.
  ctx.fillStyle = '#888';
  ctx.font = '11px ui-sans-serif';
  ctx.fillText(`turn ${state.turn} · queen ult charge ${state.queenCharge}`, 8, canvas.height - 8);
  if (state.winner) {
    ctx.fillStyle = state.winner === 'ant' ? '#7c4' : '#e63';
    ctx.font = 'bold 18px ui-sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${state.winner.toUpperCase()} VICTORY`, canvas.width / 2, canvas.height - 12);
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
  document.getElementById('tick-label').textContent =
    `tick ${t} / ${MAX_TICK} — turn ${state.turn}${state.winner ? ` — ${state.winner.toUpperCase()} WINS` : ''}`;
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
