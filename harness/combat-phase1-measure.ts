/**
 * Combat-rework Phase 1 — measurement harness.
 *
 *   pnpm tsx harness/combat-phase1-measure.ts
 *
 * Establishes the baseline for the four Phase-1 accumulators called out
 * in the engagement-density brief follow-up:
 *
 *   1. Collision-outcome distribution — HP-loss fraction per battle,
 *      bucketed (0-10/10-25/25-50/50-75/75-100), per faction-side.
 *   2. Re-attack cadence — for each pair of parties that battle each
 *      other more than once, the mean turn-gap between consecutive
 *      collisions.
 *   3. Units lost — total casualty counts per faction (from
 *      attackerCasualties / defenderCasualties on each battle result).
 *   4. Recovery utilization — home-heal-applied event count + total HP
 *      healed, spider-break-off event count + mean trigger fraction.
 *
 * Same seed sweep + AI pairing as `harness/playtest-l1.ts`. Pure-stdout
 * markdown report; no file writes from the script itself. The compute
 * functions are exported and exercised by
 * `harness/combat-phase1-measure.test.ts` against synthetic events.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BattleResult, Faction, GameState, PartyId, ReplayEvent } from '../engine/types.ts';

import { L1_SWEEP_AIS, runL1Seed } from './l1-sweep.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

// ---------------------------------------------------------------------------
// Bucket definitions
// ---------------------------------------------------------------------------

export const HP_LOSS_BUCKETS = ['0-10', '10-25', '25-50', '50-75', '75-100'] as const;
export type HpLossBucket = (typeof HP_LOSS_BUCKETS)[number];

export const bucketHpLoss = (fraction: number): HpLossBucket => {
  if (fraction < 0.1) return '0-10';
  if (fraction < 0.25) return '10-25';
  if (fraction < 0.5) return '25-50';
  if (fraction < 0.75) return '50-75';
  return '75-100';
};

// ---------------------------------------------------------------------------
// Faction lookup (parties may spawn mid-scenario)
// ---------------------------------------------------------------------------

const buildFactionLookup = (
  initialState: GameState,
  finalState: GameState,
): ((id: PartyId) => Faction | undefined) => {
  const lookup = new Map<PartyId, Faction>();
  for (const p of initialState.parties.values()) lookup.set(p.id, p.faction);
  for (const p of finalState.parties.values()) lookup.set(p.id, p.faction);
  return (id) => lookup.get(id);
};

// ---------------------------------------------------------------------------
// Pure computation — collision-outcome distribution
// ---------------------------------------------------------------------------

/**
 * Compute per-side HP-loss fraction from a single BattleResult.
 *
 * Sums `actions.damage` per defender-side over all rounds; divides by
 * the pre-battle living HP sum on that side (the `participants[i].hp`
 * snapshot the engine writes at battle start). Mirrors the value
 * `engine/battle.ts` writes onto `recentBattleOutcome.hpLossFraction`,
 * but recomputed from the public BattleResult so the measurement
 * doesn't depend on a private engine field. Bounded to [0,1].
 */
export const computeSideHpLossFraction = (
  battle: BattleResult,
): { attacker: number; defender: number } => {
  let preAtkHp = 0;
  let preDefHp = 0;
  const sideById = new Map<string, 'attacker' | 'defender'>();
  for (const p of battle.participants) {
    if (p.side === 'attacker') preAtkHp += p.hp;
    else preDefHp += p.hp;
    sideById.set(String(p.unitId), p.side);
  }
  let dmgToAtk = 0;
  let dmgToDef = 0;
  for (const round of battle.rounds) {
    for (const action of round.actions) {
      const side = sideById.get(String(action.defenderId));
      if (side === 'attacker') dmgToAtk += action.damage;
      else if (side === 'defender') dmgToDef += action.damage;
    }
  }
  const clamp = (x: number): number => Math.max(0, Math.min(1, x));
  return {
    attacker: preAtkHp <= 0 ? 0 : clamp(dmgToAtk / preAtkHp),
    defender: preDefHp <= 0 ? 0 : clamp(dmgToDef / preDefHp),
  };
};

export type CollisionDistribution = Readonly<
  Record<'ant' | 'spider', Readonly<Record<HpLossBucket, number>>>
>;

const emptyDistribution = (): Record<'ant' | 'spider', Record<HpLossBucket, number>> => ({
  ant: { '0-10': 0, '10-25': 0, '25-50': 0, '50-75': 0, '75-100': 0 },
  spider: { '0-10': 0, '10-25': 0, '25-50': 0, '50-75': 0, '75-100': 0 },
});

export const computeCollisionDistribution = (
  events: readonly ReplayEvent[],
  faction: (id: PartyId) => Faction | undefined,
): CollisionDistribution => {
  const dist = emptyDistribution();
  for (const ev of events) {
    if (ev.kind !== 'battle-resolved') continue;
    const losses = computeSideHpLossFraction(ev.result);
    const atkFaction = faction(ev.result.attackerPartyId);
    const defFaction = faction(ev.result.defenderPartyId);
    if (atkFaction === 'ant' || atkFaction === 'spider') {
      dist[atkFaction][bucketHpLoss(losses.attacker)] += 1;
    }
    if (defFaction === 'ant' || defFaction === 'spider') {
      dist[defFaction][bucketHpLoss(losses.defender)] += 1;
    }
  }
  return dist;
};

// ---------------------------------------------------------------------------
// Pure computation — re-attack cadence
// ---------------------------------------------------------------------------

export interface ReattackCadence {
  /** Distinct ordered party-pairs (a,b with a<b lexicographically) that
   * battled at least once across the scenario. */
  readonly pairsEngaged: number;
  /** Subset of `pairsEngaged` where the same pair battled twice or more. */
  readonly pairsReattacking: number;
  /** Mean turn-gap between consecutive battles for each re-attacking
   * pair, averaged across all such pairs. 0 when `pairsReattacking` =
   * 0 — the report flags that case explicitly. */
  readonly meanGapTurns: number;
}

const pairKey = (a: PartyId, b: PartyId): string => {
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? `${sa}|${sb}` : `${sb}|${sa}`;
};

export const computeReattackCadence = (events: readonly ReplayEvent[]): ReattackCadence => {
  const byPair = new Map<string, number[]>();
  for (const ev of events) {
    if (ev.kind !== 'battle-resolved') continue;
    const k = pairKey(ev.result.attackerPartyId, ev.result.defenderPartyId);
    const arr = byPair.get(k) ?? [];
    arr.push(ev.turn);
    byPair.set(k, arr);
  }
  const pairsEngaged = byPair.size;
  let pairsReattacking = 0;
  const gapMeans: number[] = [];
  for (const turns of byPair.values()) {
    if (turns.length < 2) continue;
    pairsReattacking += 1;
    const sorted = [...turns].sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((sorted[i] ?? 0) - (sorted[i - 1] ?? 0));
    }
    gapMeans.push(gaps.reduce((s, g) => s + g, 0) / gaps.length);
  }
  const meanGapTurns =
    gapMeans.length === 0 ? 0 : gapMeans.reduce((s, g) => s + g, 0) / gapMeans.length;
  return { pairsEngaged, pairsReattacking, meanGapTurns };
};

// ---------------------------------------------------------------------------
// Pure computation — units lost
// ---------------------------------------------------------------------------

export interface UnitsLost {
  readonly ant: number;
  readonly spider: number;
  readonly neutral: number;
}

export const computeUnitsLost = (
  events: readonly ReplayEvent[],
  faction: (id: PartyId) => Faction | undefined,
): UnitsLost => {
  let ant = 0;
  let spider = 0;
  let neutral = 0;
  const add = (f: Faction | undefined, n: number): void => {
    if (f === 'ant') ant += n;
    else if (f === 'spider') spider += n;
    else if (f === 'neutral') neutral += n;
  };
  for (const ev of events) {
    if (ev.kind !== 'battle-resolved') continue;
    add(faction(ev.result.attackerPartyId), ev.result.attackerCasualties.length);
    add(faction(ev.result.defenderPartyId), ev.result.defenderCasualties.length);
  }
  return { ant, spider, neutral };
};

// ---------------------------------------------------------------------------
// Pure computation — recovery utilization (C-1 surface area)
// ---------------------------------------------------------------------------

export interface RecoveryUtilization {
  readonly homeHealEvents: number;
  readonly homeHealHpTotal: number;
  readonly breakOffEvents: number;
  /** Mean `hpLossFraction` recorded on spider-break-off events. 0 if
   * no break-offs fired (the report flags that case explicitly).
   * Useful as a sanity check against the threshold (BREAKOFF_HP_FRACTION
   * = 0.25 in C-1) — every observed break-off MUST be above it. */
  readonly meanBreakOffLossFraction: number;
}

export const computeRecoveryUtilization = (events: readonly ReplayEvent[]): RecoveryUtilization => {
  let homeHealEvents = 0;
  let homeHealHpTotal = 0;
  let breakOffEvents = 0;
  let breakOffLossSum = 0;
  for (const ev of events) {
    if (ev.kind === 'home-heal-applied') {
      homeHealEvents += 1;
      homeHealHpTotal += ev.amount;
    } else if (ev.kind === 'spider-break-off') {
      breakOffEvents += 1;
      breakOffLossSum += ev.hpLossFraction;
    }
  }
  return {
    homeHealEvents,
    homeHealHpTotal,
    breakOffEvents,
    meanBreakOffLossFraction: breakOffEvents === 0 ? 0 : breakOffLossSum / breakOffEvents,
  };
};

// ---------------------------------------------------------------------------
// Per-seed runner
// ---------------------------------------------------------------------------

interface RunMetrics {
  readonly seed: number;
  readonly turnsPlayed: number;
  readonly winner: string;
  readonly battlesTotal: number;
  readonly collision: CollisionDistribution;
  readonly reattack: ReattackCadence;
  readonly unitsLost: UnitsLost;
  readonly recovery: RecoveryUtilization;
}

const runSeed = (seed: number): RunMetrics => {
  const sweep = runL1Seed(seed, DATA_DIR);
  const faction = buildFactionLookup(sweep.initialState, sweep.finalState);
  const battlesTotal = sweep.events.filter((e) => e.kind === 'battle-resolved').length;
  return {
    seed,
    turnsPlayed: sweep.turnsPlayed,
    winner: typeof sweep.winner === 'string' ? sweep.winner : 'none',
    battlesTotal,
    collision: computeCollisionDistribution(sweep.events, faction),
    reattack: computeReattackCadence(sweep.events),
    unitsLost: computeUnitsLost(sweep.events, faction),
    recovery: computeRecoveryUtilization(sweep.events),
  };
};

// ---------------------------------------------------------------------------
// Markdown report
// ---------------------------------------------------------------------------

const avg = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

const fmt = (n: number): string => n.toFixed(2);

const sumDistribution = (
  runs: readonly RunMetrics[],
): Record<'ant' | 'spider', Record<HpLossBucket, number>> => {
  const totals = emptyDistribution();
  for (const r of runs) {
    for (const f of ['ant', 'spider'] as const) {
      for (const b of HP_LOSS_BUCKETS) {
        totals[f][b] += r.collision[f][b];
      }
    }
  }
  return totals;
};

const distributionRow = (
  label: string,
  buckets: Readonly<Record<HpLossBucket, number>>,
): string => {
  const total = HP_LOSS_BUCKETS.reduce((s, b) => s + buckets[b], 0);
  const pct = (n: number): string => (total === 0 ? '0%' : `${((n / total) * 100).toFixed(0)}%`);
  return `| ${label} | ${String(buckets['0-10'])} (${pct(buckets['0-10'])}) | ${String(
    buckets['10-25'],
  )} (${pct(buckets['10-25'])}) | ${String(buckets['25-50'])} (${pct(buckets['25-50'])}) | ${String(
    buckets['50-75'],
  )} (${pct(buckets['50-75'])}) | ${String(buckets['75-100'])} (${pct(buckets['75-100'])}) | ${String(
    total,
  )} |`;
};

const SEEDS = [1, 2, 3, 4, 5] as const;

const main = (): void => {
  const runs = SEEDS.map((s) => runSeed(s));
  const today = new Date().toISOString().slice(0, 10);
  const out: string[] = [
    '# Combat-rework Phase 1 — measurement baseline',
    '',
    `**Generated:** ${today} via \`pnpm tsx harness/combat-phase1-measure.ts\`.`,
    '',
    `**Run config:** ${String(SEEDS.length)} seeds (${SEEDS.join(', ')}), ant policy \`${L1_SWEEP_AIS.player.name}\` vs spider policy \`${L1_SWEEP_AIS.enemy.name}\` (which inherits the C-1 break-off branch via \`spider-l1\`). Each scenario capped at 100 turns.`,
    '',
  ];
  out.push(
    'These four accumulators are the Phase-1 surface area for the combat-rework arc. They establish the pre-Phase-2 baseline so subsequent chunks (mobile healer, mend, resurrect) can be A/B tested against engagement-density goals.',
  );
  out.push('');
  out.push('## Per-seed outcomes');
  out.push('');
  out.push('| Seed | Turns | Winner | Battles | Home-heal evts | Break-off evts |');
  out.push('| --- | --- | --- | --- | --- | --- |');
  for (const r of runs) {
    out.push(
      `| ${String(r.seed)} | ${String(r.turnsPlayed)} | ${r.winner} | ${String(r.battlesTotal)} | ${String(r.recovery.homeHealEvents)} | ${String(r.recovery.breakOffEvents)} |`,
    );
  }
  out.push('');

  // ---- 1. Collision-outcome distribution ----
  out.push('## 1. Collision-outcome distribution');
  out.push('');
  out.push(
    'Per-battle HP-loss fraction, bucketed and rolled up by faction-side across all seeds. A side counts once per battle it participated in (attacker or defender). Reads as: "how often does a fight cost a faction X% of its standing HP?"',
  );
  out.push('');
  const totalDist = sumDistribution(runs);
  out.push('| Faction-side | 0-10% | 10-25% | 25-50% | 50-75% | 75-100% | Total battles |');
  out.push('| --- | --- | --- | --- | --- | --- | --- |');
  out.push(distributionRow('Ant', totalDist.ant));
  out.push(distributionRow('Spider', totalDist.spider));
  out.push('');

  // ---- 2. Re-attack cadence ----
  out.push('## 2. Re-attack cadence');
  out.push('');
  out.push(
    'For each unordered pair of parties that battled at least twice, the mean turn-gap between consecutive collisions. Low values = same parties grind into each other turn after turn; high values (or `pairsReattacking = 0`) = parties separate after a fight.',
  );
  out.push('');
  out.push('| Metric | Value (avg across seeds) |');
  out.push('| --- | --- |');
  const avgPairsEngaged = avg(runs.map((r) => r.reattack.pairsEngaged));
  const avgPairsReattacking = avg(runs.map((r) => r.reattack.pairsReattacking));
  const reattackingRuns = runs.filter((r) => r.reattack.pairsReattacking > 0);
  const avgGap = avg(reattackingRuns.map((r) => r.reattack.meanGapTurns));
  out.push(`| Distinct party-pairs that engaged | ${fmt(avgPairsEngaged)} |`);
  out.push(`| Pairs that re-attacked (≥2 battles) | ${fmt(avgPairsReattacking)} |`);
  out.push(
    `| Mean turn-gap between re-attacks | ${reattackingRuns.length === 0 ? 'n/a (no re-attacking pairs)' : `${fmt(avgGap)} turns`} |`,
  );
  out.push('');

  // ---- 3. Units lost ----
  out.push('## 3. Units lost');
  out.push('');
  out.push(
    "Cumulative casualty counts per faction across all seeds (`attackerCasualties` + `defenderCasualties` over all battles, attributed to the casualty's own faction).",
  );
  out.push('');
  out.push('| Faction | Units lost (total) | Per seed (avg) |');
  out.push('| --- | --- | --- |');
  const antLost = sum(runs.map((r) => r.unitsLost.ant));
  const spiderLost = sum(runs.map((r) => r.unitsLost.spider));
  const neutralLost = sum(runs.map((r) => r.unitsLost.neutral));
  out.push(`| Ant | ${String(antLost)} | ${fmt(antLost / runs.length)} |`);
  out.push(`| Spider | ${String(spiderLost)} | ${fmt(spiderLost / runs.length)} |`);
  out.push(`| Neutral | ${String(neutralLost)} | ${fmt(neutralLost / runs.length)} |`);
  out.push('');

  // ---- 4. Recovery utilization ----
  out.push('## 4. Recovery utilization');
  out.push('');
  out.push(
    'C-1 added two recovery primitives: home-anthill heal (`home-heal-applied`, +3 HP/unit/turn when a party occupies its faction home POST) and the spider break-off branch (`spider-break-off`, retreat order when a non-exempt party took >25% HP loss in a battle it lost or drew).',
  );
  out.push('');
  out.push('| Metric | Value (total / mean) |');
  out.push('| --- | --- |');
  const homeHealEvents = sum(runs.map((r) => r.recovery.homeHealEvents));
  const homeHealHp = sum(runs.map((r) => r.recovery.homeHealHpTotal));
  const breakOffEvents = sum(runs.map((r) => r.recovery.breakOffEvents));
  const breakOffRuns = runs.filter((r) => r.recovery.breakOffEvents > 0);
  const breakOffMeanFrac = avg(breakOffRuns.map((r) => r.recovery.meanBreakOffLossFraction));
  out.push(
    `| home-heal-applied events | ${String(homeHealEvents)} (${fmt(homeHealEvents / runs.length)}/seed) |`,
  );
  out.push(
    `| Total HP healed via home heal | ${String(homeHealHp)} (${fmt(homeHealHp / runs.length)}/seed) |`,
  );
  out.push(
    `| spider-break-off events | ${String(breakOffEvents)} (${fmt(breakOffEvents / runs.length)}/seed) |`,
  );
  out.push(
    `| Mean break-off trigger fraction | ${breakOffRuns.length === 0 ? 'n/a (no break-offs)' : fmt(breakOffMeanFrac)} |`,
  );
  out.push('');
  out.push(
    "Per the C-1 commit notes: the break-off branch is correct scaffolding but fires ~zero times at baseline (spider winners take 2-3% HP loss, far below the 25% trigger; spider losers usually wipe and can't act next turn). Phase 2's mobile healer is expected to extend spider party lifetimes through losing fights, at which point this counter should start to register and the threshold can be re-tuned.",
  );
  out.push('');
  console.log(out.join('\n'));
};

// Only run as a CLI when invoked directly (not when imported by tests).
const invokedPath = process.argv[1];
if (invokedPath !== undefined && fileURLToPath(import.meta.url) === path.resolve(invokedPath)) {
  main();
}
