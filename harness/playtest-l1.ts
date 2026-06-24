/**
 * L1 playability rubric — automated measurement script.
 *
 *   pnpm tsx harness/playtest-l1.ts [--seeds 1..10] [--out <path>]
 *
 * Runs L1 with the baseline ant player + spider-l1 AI across a small
 * seed sweep, and computes every AUTO metric from the L1-iteration
 * rubric (`docs/drafts/l1-iteration-design-brief.md` §3) plus the
 * new **M-NEW action-visibility ratio** added in `docs/drafts/
 * l1-ui-compression-brief.md` §3.
 *
 * Output is a markdown report; the script prints the markdown to
 * stdout, which the caller pipes to a doc under `docs/drafts/`. No
 * file writes from the script itself — keeps it pure / re-runnable
 * with different seed sets without leaving fixture files behind.
 *
 * The OBS metrics (M1.3 player-action-density, M2.4 decision-pull,
 * M3.4 combat legibility, M4.5 counter-pick, M5.3 recall) are listed
 * in the report as "OBS — requires player session" so the playtest
 * doc surface is consistent with the rubric without manufacturing
 * data this script can't measure.
 */

import path from 'node:path';

import type { BattleResult, GameState, Plane, ReplayEvent } from '../engine/types.ts';

import { L1_SWEEP_AIS, runL1Seed } from './l1-sweep.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

interface RunMetrics {
  readonly seed: number;
  readonly turnsPlayed: number;
  readonly winner: string;
  // P1
  readonly p11TemporalSpread: number;
  readonly p12TilesUsed: number;
  readonly p12PlanesUsed: number;
  readonly p12WallPlanesUsed: number;
  readonly p14FirstAntAction: number; // turn index, -1 if none
  // P2
  readonly p21PostCount: number;
  readonly p22PostsByPlane: Readonly<Record<Plane, number>>;
  readonly p23MeanAntCapGap: number; // -1 if no caps
  // P3
  readonly p31AnimatedRatio: number;
  readonly p32MedianRounds: number;
  readonly p33ModifiersVisible: boolean;
  // P4
  readonly p41AntTemplates: number;
  readonly p41SpiderTemplates: number;
  readonly p42MovementClasses: number;
  readonly p44AntUtilization: number;
  readonly p44SpiderUtilization: number;
  // P5
  readonly p51ScriptedBeats: number;
  readonly p52BeatsFirstHalf: number;
  readonly p52BeatsSecondHalf: number;
  // M-NEW
  readonly mNewVisibilityRatio: number;
  // L1-iteration chunks 5-6 surfacing
  readonly statEvents: number;
  readonly unitPromotions: number;
  readonly maxAntAggression: number;
  readonly maxAntDiscipline: number;
}

const WALL_PLANES: ReadonlySet<Plane> = new Set([
  'north-wall',
  'south-wall',
  'east-wall',
  'west-wall',
]);

const median = (xs: readonly number[]): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

const computeMetrics = (
  seed: number,
  initialState: GameState,
  events: readonly ReplayEvent[],
  turnsPlayed: number,
  finalState: GameState,
): RunMetrics => {
  // ---- P1: engagement spread ----
  const battleTurns: number[] = [];
  const battlePlanes = new Set<Plane>();
  const battleTilesByPlane = new Map<Plane, Set<string>>();
  let firstAntAction = -1;
  for (const ev of events) {
    if (ev.kind === 'battle-resolved') {
      battleTurns.push(ev.turn);
      const plane = ev.result.modifierStack?.plane;
      if (plane) {
        battlePlanes.add(plane);
        const tileKey = `${plane}:${ev.turn}`;
        const set = battleTilesByPlane.get(plane) ?? new Set();
        set.add(tileKey);
        battleTilesByPlane.set(plane, set);
      }
      if (firstAntAction === -1) firstAntAction = ev.turn;
    } else if (ev.kind === 'post-captured' && ev.newOwner === 'ant') {
      if (firstAntAction === -1) firstAntAction = ev.turn;
    }
  }
  const firstBattleTurn = battleTurns[0] ?? 0;
  const lastBattleTurn = battleTurns[battleTurns.length - 1] ?? 0;
  const maxTurns = Math.max(1, turnsPlayed);
  const p11 = (lastBattleTurn - firstBattleTurn) / maxTurns;
  let p12Tiles = 0;
  for (const set of battleTilesByPlane.values()) p12Tiles += set.size;
  const p12WallCount = [...battlePlanes].filter((p) => WALL_PLANES.has(p)).length;

  // ---- P2: board density ----
  const postCount = initialState.posts.size;
  const postsByPlane: Record<Plane, number> = {
    floor: 0,
    ceiling: 0,
    'north-wall': 0,
    'south-wall': 0,
    'east-wall': 0,
    'west-wall': 0,
  };
  for (const post of initialState.posts.values()) {
    postsByPlane[post.location.plane] += 1;
  }
  const antCapTurns: number[] = [];
  for (const ev of events) {
    if (ev.kind === 'post-captured' && ev.newOwner === 'ant') {
      antCapTurns.push(ev.turn);
    }
  }
  let meanCapGap = -1;
  if (antCapTurns.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < antCapTurns.length; i++) {
      gaps.push((antCapTurns[i] ?? 0) - (antCapTurns[i - 1] ?? 0));
    }
    meanCapGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  }

  // ---- P3: combat legibility ----
  const battles: BattleResult[] = events
    .filter(
      (e): e is Extract<ReplayEvent, { kind: 'battle-resolved' }> => e.kind === 'battle-resolved',
    )
    .map((e) => e.result);
  const animated = battles.filter((b) => b.rounds.length > 0);
  const animatedRatio = battles.length === 0 ? 0 : animated.length / battles.length;
  const medianRounds = median(animated.map((b) => b.rounds.length));
  const modifiersVisible = battles.every((b) => b.modifierStack !== undefined);

  // ---- P4: roster utilization ----
  const antTemplateIds = new Set<string>();
  const spiderTemplateIds = new Set<string>();
  const movementProfiles = new Set<string>();
  for (const tmpl of initialState.unitTemplates.values()) {
    if (tmpl.faction === 'ant') antTemplateIds.add(tmpl.id);
    else if (tmpl.faction === 'spider') spiderTemplateIds.add(tmpl.id);
    // movement-class fingerprint: a sorted profile of plane affinities
    const entries: [string, number, number][] = [];
    const affinity: Record<string, { attack: number; armor: number } | undefined> =
      tmpl.planeAffinity as unknown as Record<
        string,
        { attack: number; armor: number } | undefined
      >;
    for (const planeKey of Object.keys(affinity)) {
      const row = affinity[planeKey];
      entries.push([planeKey, row?.attack ?? 0, row?.armor ?? 0]);
    }
    entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    movementProfiles.add(JSON.stringify(entries));
  }
  // Templates that participated in any battle
  const antSeenInBattle = new Set<string>();
  const spiderSeenInBattle = new Set<string>();
  for (const b of battles) {
    for (const p of b.participants) {
      if (p.side === 'attacker' && initialState.parties.get(b.attackerPartyId)?.faction === 'ant') {
        antSeenInBattle.add(p.templateId);
      } else if (
        p.side === 'attacker' &&
        initialState.parties.get(b.attackerPartyId)?.faction === 'spider'
      ) {
        spiderSeenInBattle.add(p.templateId);
      } else if (
        p.side === 'defender' &&
        initialState.parties.get(b.defenderPartyId)?.faction === 'ant'
      ) {
        antSeenInBattle.add(p.templateId);
      } else if (
        p.side === 'defender' &&
        initialState.parties.get(b.defenderPartyId)?.faction === 'spider'
      ) {
        spiderSeenInBattle.add(p.templateId);
      }
    }
  }
  const antUtil = antTemplateIds.size === 0 ? 0 : antSeenInBattle.size / antTemplateIds.size;
  const spiderUtil =
    spiderTemplateIds.size === 0 ? 0 : spiderSeenInBattle.size / spiderTemplateIds.size;

  // ---- P5: scripted beats ----
  const beatEvents = events.filter((e) => e.kind === 'scripted-beat');
  const halfTurn = Math.floor(turnsPlayed / 2);
  const beatsFirst = beatEvents.filter((e) => e.turn <= halfTurn).length;
  const beatsSecond = beatEvents.filter((e) => e.turn > halfTurn).length;

  // ---- M-NEW: action-visibility ratio ----
  // For each notable event with a known plane, "visible" iff at least
  // one ant party was on that plane on the same turn the event fired.
  // Ant parties are the player's perspective; the implicit camera
  // follows where their units are.
  const antPlanesByTurn = new Map<number, Set<Plane>>();
  // Walk events forward tracking ant party planes at each `turn-start`
  // boundary. Approximation: presence on plane = at start of that turn.
  // We replay turn-by-turn using `party-moved` events to update presence.
  const antPlaneState = new Map<string, Plane>(); // partyId → plane
  for (const party of initialState.parties.values()) {
    if (party.faction === 'ant') antPlaneState.set(String(party.id), party.location.plane);
  }
  // Seed turn 0
  antPlanesByTurn.set(0, new Set(antPlaneState.values()));
  let lastTurnSeen = 0;
  for (const ev of events) {
    if (ev.turn !== lastTurnSeen) {
      antPlanesByTurn.set(ev.turn, new Set(antPlaneState.values()));
      lastTurnSeen = ev.turn;
    }
    if (ev.kind === 'party-moved') {
      const party = initialState.parties.get(ev.partyId);
      if (party?.faction === 'ant') {
        antPlaneState.set(String(ev.partyId), ev.to.plane);
        antPlanesByTurn.set(ev.turn, new Set(antPlaneState.values()));
      }
    }
  }
  let notable = 0;
  let visible = 0;
  for (const ev of events) {
    let plane: Plane | undefined;
    if (ev.kind === 'battle-resolved') plane = ev.result.modifierStack?.plane;
    else if (ev.kind === 'reinforcement-spawned') {
      // arrivalPostId locality — look up arrival POST plane
      const post = finalState.posts.get(ev.arrivalPostId);
      plane = post?.location.plane;
    } else if (ev.kind === 'post-captured') {
      const post = finalState.posts.get(ev.postId);
      plane = post?.location.plane;
    } else if (ev.kind === 'unit-promoted') {
      // Promotion location = the party's plane at event time
      const party = finalState.parties.get(ev.partyId);
      plane = party?.location.plane;
    } else if (ev.kind === 'scripted-beat') {
      // Beats are global UI — always visible via the notif strip
      plane = undefined;
    } else {
      continue;
    }
    notable += 1;
    if (ev.kind === 'scripted-beat') {
      visible += 1;
      continue;
    }
    if (!plane) continue;
    const presentPlanes = antPlanesByTurn.get(ev.turn);
    if (presentPlanes?.has(plane)) visible += 1;
  }
  const mNew = notable === 0 ? 1 : visible / notable;

  // ---- L1-iteration #5/6/8/9 surfacing ----
  const statEvents = events.filter((e) => e.kind === 'stat-earned').length;
  const unitPromotions = events.filter((e) => e.kind === 'unit-promoted').length;
  let maxAggression = 0;
  let maxDiscipline = 0;
  for (const party of finalState.parties.values()) {
    if (party.faction !== 'ant') continue;
    if ((party.aggression ?? 0) > maxAggression) maxAggression = party.aggression ?? 0;
    if ((party.discipline ?? 0) > maxDiscipline) maxDiscipline = party.discipline ?? 0;
  }

  return {
    seed,
    turnsPlayed,
    winner: typeof finalState.winner === 'string' ? finalState.winner : 'none',
    p11TemporalSpread: p11,
    p12TilesUsed: p12Tiles,
    p12PlanesUsed: battlePlanes.size,
    p12WallPlanesUsed: p12WallCount,
    p14FirstAntAction: firstAntAction,
    p21PostCount: postCount,
    p22PostsByPlane: postsByPlane,
    p23MeanAntCapGap: meanCapGap,
    p31AnimatedRatio: animatedRatio,
    p32MedianRounds: medianRounds,
    p33ModifiersVisible: modifiersVisible,
    p41AntTemplates: antTemplateIds.size,
    p41SpiderTemplates: spiderTemplateIds.size,
    p42MovementClasses: movementProfiles.size,
    p44AntUtilization: antUtil,
    p44SpiderUtilization: spiderUtil,
    p51ScriptedBeats: beatEvents.length,
    p52BeatsFirstHalf: beatsFirst,
    p52BeatsSecondHalf: beatsSecond,
    mNewVisibilityRatio: mNew,
    statEvents,
    unitPromotions,
    maxAntAggression: maxAggression,
    maxAntDiscipline: maxDiscipline,
  };
};

const runSeed = (seed: number): RunMetrics => {
  const sweep = runL1Seed(seed, DATA_DIR);
  return computeMetrics(
    seed,
    sweep.initialState,
    sweep.events,
    sweep.turnsPlayed,
    sweep.finalState,
  );
};

const avg = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const fmt = (n: number): string => n.toFixed(2);

const main = (): void => {
  const seeds = [1, 2, 3, 4, 5];
  const runs = seeds.map((s) => runSeed(s));
  const out: string[] = [];
  out.push('# L1 playtest measurement');
  out.push('');
  out.push(
    `**Generated:** ${new Date().toISOString().slice(0, 10)} via \`pnpm tsx harness/playtest-l1.ts\`.`,
  );
  out.push('');
  out.push(
    `**Run config:** ${String(seeds.length)} seeds (${seeds.join(', ')}), ant policy \`${L1_SWEEP_AIS.player.name}\` vs spider policy \`${L1_SWEEP_AIS.enemy.name}\`, neutral AI for non-aligned parties. Each scenario capped at 100 turns.`,
  );
  out.push('');
  out.push(
    'Compare against the original baseline in `docs/drafts/l1-iteration-design-brief.md` §4 (single-seed, pre-Chunks-1-6).',
  );
  out.push('');
  out.push('## Outcomes');
  out.push('');
  out.push('| Seed | Turns | Winner | First ant action | Aggression cap | Discipline cap |');
  out.push('| ---- | ----- | ------ | --------------- | -------------- | -------------- |');
  for (const r of runs) {
    out.push(
      `| ${String(r.seed)} | ${String(r.turnsPlayed)} | ${r.winner} | ${String(r.p14FirstAntAction)} | ${String(r.maxAntAggression)} | ${String(r.maxAntDiscipline)} |`,
    );
  }
  out.push('');
  out.push('## AUTO metrics (averaged across seeds)');
  out.push('');
  out.push('### P1 — Sparse engagement');
  out.push('');
  out.push('| Metric | Value | Target | Pass? |');
  out.push('| --- | --- | --- | --- |');
  const p11 = avg(runs.map((r) => r.p11TemporalSpread));
  const p12Tiles = avg(runs.map((r) => r.p12TilesUsed));
  const p12Planes = avg(runs.map((r) => r.p12PlanesUsed));
  const p12Walls = avg(runs.map((r) => r.p12WallPlanesUsed));
  const p14 = avg(runs.map((r) => r.p14FirstAntAction));
  out.push(`| **M1.1 temporal spread** | ${fmt(p11)} | ≥ 0.50 | ${p11 >= 0.5 ? '✓' : '✗'} |`);
  out.push(
    `| **M1.2 spatial spread** | ${fmt(p12Tiles)} tiles · ${fmt(p12Planes)} planes · ${fmt(p12Walls)} wall planes | ≥ 3 tiles · ≥ 2 planes · ≥ 1 wall | ${p12Tiles >= 3 && p12Planes >= 2 && p12Walls >= 1 ? '✓' : '✗'} |`,
  );
  out.push(
    `| **M1.4 first ant action** | turn ${fmt(p14)} | ≤ 15 | ${p14 > 0 && p14 <= 15 ? '✓' : '✗'} |`,
  );
  out.push('');
  out.push('### P2 — Empty board');
  out.push('');
  out.push('| Metric | Value | Target | Pass? |');
  out.push('| --- | --- | --- | --- |');
  const p21 = avg(runs.map((r) => r.p21PostCount));
  const p22Floor = avg(runs.map((r) => r.p22PostsByPlane.floor));
  const p22Ceiling = avg(runs.map((r) => r.p22PostsByPlane.ceiling));
  const p22North = avg(runs.map((r) => r.p22PostsByPlane['north-wall']));
  const p22South = avg(runs.map((r) => r.p22PostsByPlane['south-wall']));
  const p22East = avg(runs.map((r) => r.p22PostsByPlane['east-wall']));
  const p22West = avg(runs.map((r) => r.p22PostsByPlane['west-wall']));
  const p22Min = Math.min(p22Floor, p22Ceiling, p22North, p22South, p22East, p22West);
  const p23 = avg(runs.filter((r) => r.p23MeanAntCapGap >= 0).map((r) => r.p23MeanAntCapGap));
  out.push(
    `| **M2.1 POSTs per scenario** | ${fmt(p21)} | 12–16 | ${p21 >= 12 && p21 <= 16 ? '✓' : '✗'} |`,
  );
  out.push(
    `| **M2.2 POSTs per plane** | floor ${fmt(p22Floor)} · ceiling ${fmt(p22Ceiling)} · N ${fmt(p22North)} · S ${fmt(p22South)} · E ${fmt(p22East)} · W ${fmt(p22West)} | ≥ 2 every plane | ${p22Min >= 2 ? '✓' : '✗'} |`,
  );
  out.push(
    `| **M2.3 mean ant cap gap** | ${fmt(p23)} turns | ≤ 8 | ${p23 >= 0 && p23 <= 8 ? '✓' : '✗'} |`,
  );
  out.push('');
  out.push('### P3 — Opaque combat');
  out.push('');
  out.push('| Metric | Value | Target | Pass? |');
  out.push('| --- | --- | --- | --- |');
  const p31 = avg(runs.map((r) => r.p31AnimatedRatio));
  const p32 = avg(runs.map((r) => r.p32MedianRounds));
  const p33All = runs.every((r) => r.p33ModifiersVisible);
  out.push(`| **M3.1 animated ratio** | ${fmt(p31 * 100)}% | ≥ 70% | ${p31 >= 0.7 ? '✓' : '✗'} |`);
  out.push(`| **M3.2 median rounds** | ${fmt(p32)} | ≥ 3 | ${p32 >= 3 ? '✓' : '✗'} |`);
  out.push(
    `| **M3.3 modifiers visible** | ${p33All ? 'YES' : 'NO'} | YES (≥ 2 types) | ${p33All ? '✓' : '✗'} |`,
  );
  out.push('');
  out.push('### P4 — Flat roster');
  out.push('');
  out.push('| Metric | Value | Target | Pass? |');
  out.push('| --- | --- | --- | --- |');
  const p41Ant = avg(runs.map((r) => r.p41AntTemplates));
  const p41Spider = avg(runs.map((r) => r.p41SpiderTemplates));
  const p42 = avg(runs.map((r) => r.p42MovementClasses));
  const p44Ant = avg(runs.map((r) => r.p44AntUtilization));
  const p44Spider = avg(runs.map((r) => r.p44SpiderUtilization));
  out.push(
    `| **M4.1 templates per faction** | ant ${fmt(p41Ant)} · spider ${fmt(p41Spider)} | ant ≥ 6 · spider ≥ 4 | ${p41Ant >= 6 && p41Spider >= 4 ? '✓' : '✗'} |`,
  );
  out.push(`| **M4.2 movement classes** | ${fmt(p42)} | ≥ 3 | ${p42 >= 3 ? '✓' : '✗'} |`);
  out.push(
    `| **M4.4 template utilization** | ant ${fmt(p44Ant * 100)}% · spider ${fmt(p44Spider * 100)}% | ≥ 70% | ${p44Ant >= 0.7 && p44Spider >= 0.7 ? '✓' : '✗'} |`,
  );
  out.push('');
  out.push('### P5 — No drama');
  out.push('');
  out.push('| Metric | Value | Target | Pass? |');
  out.push('| --- | --- | --- | --- |');
  const p51 = avg(runs.map((r) => r.p51ScriptedBeats));
  const p52First = avg(runs.map((r) => r.p52BeatsFirstHalf));
  const p52Second = avg(runs.map((r) => r.p52BeatsSecondHalf));
  out.push(`| **M5.1 scripted beats** | ${fmt(p51)} | 1–2 | ${p51 >= 1 && p51 <= 2 ? '✓' : '✗'} |`);
  out.push(
    `| **M5.2 beat timing** | first half ${fmt(p52First)} · second half ${fmt(p52Second)} | ≥ 1 each half | ${p52First >= 1 && p52Second >= 1 ? '✓' : '✗'} |`,
  );
  out.push('');
  out.push('### M-NEW — Action-visibility ratio (NEW)');
  out.push('');
  out.push('| Metric | Value | Target | Pass? |');
  out.push('| --- | --- | --- | --- |');
  const mNew = avg(runs.map((r) => r.mNewVisibilityRatio));
  out.push(`| **M-NEW visibility ratio** | ${fmt(mNew)} | ≥ 0.80 | ${mNew >= 0.8 ? '✓' : '✗'} |`);
  out.push('');
  out.push('## OBS metrics (require player session)');
  out.push('');
  out.push('| Metric | Status |');
  out.push('| --- | --- |');
  out.push('| **M1.3 player action density** | OBS — measured during play session |');
  out.push('| **M2.4 decision-pull density** | OBS — measured during play session |');
  out.push('| **M3.4 combat legibility** | OBS — measured during play session |');
  out.push('| **M4.5 counter-pick** | OBS — measured during play session |');
  out.push('| **M5.3 recall test** | OBS — post-playthrough debrief |');
  out.push('');
  out.push('## L1-iteration chunk surfacing (Chunks 1–6 evidence)');
  out.push('');
  const statTotal = avg(runs.map((r) => r.statEvents));
  const promoTotal = avg(runs.map((r) => r.unitPromotions));
  const maxAgg = Math.max(...runs.map((r) => r.maxAntAggression));
  const maxDisc = Math.max(...runs.map((r) => r.maxAntDiscipline));
  out.push(`- Chunk 5b earned-stats events per run: **${fmt(statTotal)}** (avg).`);
  out.push(`- Unit promotions per run: **${fmt(promoTotal)}** (avg).`);
  out.push(`- Max ant Aggression observed: **${String(maxAgg)}** / 100 (threshold 30).`);
  out.push(`- Max ant Discipline observed: **${String(maxDisc)}** / 100.`);
  out.push('');
  out.push('## Per-seed metrics');
  out.push('');
  out.push(
    '| Seed | P1.1 | P1.2 tiles/planes/walls | P2.1 | P2.3 | P3.1 | P3.2 | P4.4 ant | P4.4 spi | P5.1 | M-NEW |',
  );
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of runs) {
    out.push(
      `| ${String(r.seed)} | ${fmt(r.p11TemporalSpread)} | ${String(r.p12TilesUsed)} / ${String(r.p12PlanesUsed)} / ${String(r.p12WallPlanesUsed)} | ${String(r.p21PostCount)} | ${fmt(r.p23MeanAntCapGap)} | ${fmt(r.p31AnimatedRatio)} | ${fmt(r.p32MedianRounds)} | ${fmt(r.p44AntUtilization)} | ${fmt(r.p44SpiderUtilization)} | ${String(r.p51ScriptedBeats)} | ${fmt(r.mNewVisibilityRatio)} |`,
    );
  }
  console.log(out.join('\n'));
};

main();
