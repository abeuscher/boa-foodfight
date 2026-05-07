/**
 * harness/critic-interest — programmatic "is this fun to watch" critic.
 *
 * Computes per-replay scores from the JSONL event stream and averages
 * them across all replays in `out/diversity/`. Designed to be cheap
 * (no LLM calls) and run after every coevolution round so the
 * orchestrator gets an instant interestingness signal alongside
 * win-rate metrics.
 *
 *   pnpm tsx harness/critic-interest.ts [<directory> ...]
 *
 * Default scans `out/diversity/<variant>/`.
 *
 * Output: prints a per-variant breakdown + writes
 * `out/critic-interest/report.json`.
 *
 * Scoring axes (each 0-100, then averaged):
 *
 *   actionDensity   — events per turn. More events per turn = denser
 *                     play. Scale: 5/turn = 50, 10/turn = 100.
 *   battleDrama     — average rounds per battle. 1-round wipes are
 *                     boring; 4-round attrition is dramatic. Scale:
 *                     1 round = 0, 4 rounds = 100.
 *   abilityVariety  — distinct ability ids fired per replay. More
 *                     varied = more interesting. Scale: 0 abilities
 *                     = 0, 6+ = 100.
 *   outcomeArc      — does the loser get to do something before
 *                     losing? Proxy: median battle has at least 2
 *                     attacker AND 2 defender actions. Scale binary
 *                     0 / 100 per replay then averaged.
 *   liveTurnRatio   — fraction of turns that emitted at least one
 *                     non-turn-start event. High = no dead air.
 *                     Scale: linear 0..1 → 0..100.
 *
 * Composite is the simple average of the 5 axes.
 */

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_ROOT = path.join(process.cwd(), 'out', 'diversity');

interface ReplayEvent {
  readonly kind: string;
  readonly turn: number;
  readonly tick: number;
  readonly result?: {
    readonly rounds?: readonly { readonly actions?: readonly unknown[] }[];
  };
  readonly abilityId?: string;
}

interface ReplayScore {
  readonly seed: number;
  readonly actionDensity: number;
  readonly battleDrama: number;
  readonly abilityVariety: number;
  readonly outcomeArc: number;
  readonly liveTurnRatio: number;
  readonly composite: number;
}

interface VariantSummary {
  readonly variant: string;
  readonly replays: number;
  readonly mean: ReplayScore;
}

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

const scoreActionDensity = (events: readonly ReplayEvent[], turns: number): number => {
  if (turns <= 0) return 0;
  const perTurn = events.length / turns;
  // 5/turn = 50; 10/turn = 100. Linear, capped 100.
  return clamp((perTurn / 10) * 100, 0, 100);
};

const scoreBattleDrama = (events: readonly ReplayEvent[]): number => {
  const battles = events.filter((e) => e.kind === 'battle-resolved');
  if (battles.length === 0) return 0;
  const avgRounds =
    battles.reduce((s, b) => s + (b.result?.rounds?.length ?? 0), 0) / battles.length;
  // 1 round = 0, 4 rounds = 100. Linear.
  return clamp(((avgRounds - 1) / 3) * 100, 0, 100);
};

const scoreAbilityVariety = (events: readonly ReplayEvent[]): number => {
  const abilities = new Set<string>();
  for (const e of events) {
    if (e.kind === 'ability-used' && typeof e.abilityId === 'string') abilities.add(e.abilityId);
  }
  // 0 = 0, 6+ = 100.
  return clamp((abilities.size / 6) * 100, 0, 100);
};

const scoreOutcomeArc = (events: readonly ReplayEvent[]): number => {
  const battles = events.filter((e) => e.kind === 'battle-resolved');
  if (battles.length === 0) return 0;
  // For each battle: count actions on each side. 2-on-2 = both sides
  // got to swing. Median across battles.
  const flags = battles.map((b) => {
    const rounds = b.result?.rounds ?? [];
    let actionsCount = 0;
    for (const r of rounds) actionsCount += r.actions?.length ?? 0;
    return actionsCount >= 4 ? 1 : 0;
  });
  flags.sort((a, b) => a - b);
  const mid = flags[Math.floor(flags.length / 2)] ?? 0;
  return mid * 100;
};

const scoreLiveTurnRatio = (events: readonly ReplayEvent[], turns: number): number => {
  if (turns <= 0) return 0;
  const liveTurns = new Set<number>();
  for (const e of events) {
    if (e.kind === 'turn-start') continue;
    liveTurns.add(e.turn);
  }
  return clamp((liveTurns.size / turns) * 100, 0, 100);
};

const scoreReplay = (replayPath: string, seed: number): ReplayScore => {
  const lines = fs
    .readFileSync(replayPath, 'utf8')
    .split('\n')
    .filter((l) => l.length > 0);
  const events = lines.map((l) => JSON.parse(l) as ReplayEvent);
  // Number of turns played: take max turn-start event.
  let maxTurn = 0;
  for (const e of events) {
    if (e.kind === 'turn-start' && e.turn > maxTurn) maxTurn = e.turn;
  }
  const actionDensity = scoreActionDensity(events, maxTurn);
  const battleDrama = scoreBattleDrama(events);
  const abilityVariety = scoreAbilityVariety(events);
  const outcomeArc = scoreOutcomeArc(events);
  const liveTurnRatio = scoreLiveTurnRatio(events, maxTurn);
  const composite = (actionDensity + battleDrama + abilityVariety + outcomeArc + liveTurnRatio) / 5;
  return {
    seed,
    actionDensity: Math.round(actionDensity),
    battleDrama: Math.round(battleDrama),
    abilityVariety: Math.round(abilityVariety),
    outcomeArc: Math.round(outcomeArc),
    liveTurnRatio: Math.round(liveTurnRatio),
    composite: Math.round(composite),
  };
};

const meanOf = (scores: readonly ReplayScore[]): ReplayScore => {
  if (scores.length === 0) {
    return {
      seed: -1,
      actionDensity: 0,
      battleDrama: 0,
      abilityVariety: 0,
      outcomeArc: 0,
      liveTurnRatio: 0,
      composite: 0,
    };
  }
  const sum = scores.reduce(
    (acc, s) => ({
      seed: -1,
      actionDensity: acc.actionDensity + s.actionDensity,
      battleDrama: acc.battleDrama + s.battleDrama,
      abilityVariety: acc.abilityVariety + s.abilityVariety,
      outcomeArc: acc.outcomeArc + s.outcomeArc,
      liveTurnRatio: acc.liveTurnRatio + s.liveTurnRatio,
      composite: acc.composite + s.composite,
    }),
    {
      seed: -1,
      actionDensity: 0,
      battleDrama: 0,
      abilityVariety: 0,
      outcomeArc: 0,
      liveTurnRatio: 0,
      composite: 0,
    },
  );
  const n = scores.length;
  return {
    seed: -1,
    actionDensity: Math.round(sum.actionDensity / n),
    battleDrama: Math.round(sum.battleDrama / n),
    abilityVariety: Math.round(sum.abilityVariety / n),
    outcomeArc: Math.round(sum.outcomeArc / n),
    liveTurnRatio: Math.round(sum.liveTurnRatio / n),
    composite: Math.round(sum.composite / n),
  };
};

const scoreVariant = (variantDir: string): VariantSummary => {
  const variant = path.basename(variantDir);
  const files = fs
    .readdirSync(variantDir)
    .filter((f) => /^replay-\d+\.jsonl$/.test(f))
    .sort();
  const scores: ReplayScore[] = [];
  for (const f of files) {
    const m = /^replay-(\d+)\.jsonl$/.exec(f);
    if (!m) continue;
    const seed = Number(m[1]);
    scores.push(scoreReplay(path.join(variantDir, f), seed));
  }
  return { variant, replays: scores.length, mean: meanOf(scores) };
};

const formatLine = (label: string, s: ReplayScore): string =>
  `  ${label.padEnd(14)} composite=${String(s.composite).padStart(3)}  ` +
  `density=${String(s.actionDensity).padStart(3)} drama=${String(s.battleDrama).padStart(3)} ` +
  `variety=${String(s.abilityVariety).padStart(3)} arc=${String(s.outcomeArc).padStart(3)} ` +
  `live=${String(s.liveTurnRatio).padStart(3)}`;

const main = (): void => {
  const roots = process.argv.slice(2).length > 0 ? process.argv.slice(2) : [DEFAULT_ROOT];
  const summaries: VariantSummary[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) {
      console.error(`no such directory: ${root}`);
      continue;
    }
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const sub = path.join(root, e.name);
      // Only scan dirs with replay-*.jsonl files.
      const hasReplays = fs.readdirSync(sub).some((f) => /^replay-\d+\.jsonl$/.test(f));
      if (!hasReplays) continue;
      summaries.push(scoreVariant(sub));
    }
  }
  console.log('interest critic — per-variant means (0-100):');
  for (const s of summaries) {
    console.log(formatLine(s.variant, s.mean));
  }
  if (summaries.length > 0) {
    const overall = meanOf(summaries.map((s) => s.mean));
    console.log(formatLine('OVERALL', overall));
    const outDir = path.join(process.cwd(), 'out', 'critic-interest');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, 'report.json'),
      `${JSON.stringify({ summaries, overall }, null, 2)}\n`,
      'utf8',
    );
  }
};

main();
