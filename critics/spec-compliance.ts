/**
 * Spec compliance critic — verifies every player-locked spec rule is observably
 * exercised across a batch of replays.
 *
 *   pnpm critic:spec --in out/baseline-100 [--out critics/findings/spec-compliance.json]
 *
 * Each rule maps to a transcript-grep pattern. A rule is satisfied if at
 * least one replay across the batch contains the matching event(s).
 */

import fs from 'node:fs';
import path from 'node:path';

import { parseCriticArgs, summarizeFindings, writeFindings } from './io.ts';
import type { Finding } from './io.ts';

interface ReplayEvent {
  readonly kind: string;
  readonly turn: number;
  readonly tick: number;
  readonly [extra: string]: unknown;
}

const readReplay = (file: string): readonly ReplayEvent[] => {
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  return lines.map((l) => JSON.parse(l) as ReplayEvent);
};

interface Rule {
  readonly id: string;
  readonly description: string;
  readonly check: (events: readonly ReplayEvent[]) => boolean;
}

const RULES: readonly Rule[] = [
  {
    id: 'scenario-bookends',
    description: 'every run emits scenario-start (and the engine emits scenario-end on victory)',
    check: (events) => events.length > 0 && events[0]?.kind === 'scenario-start',
  },
  {
    id: 'turn-loop',
    description: 'every run emits at least one turn-start',
    check: (events) => events.some((e) => e.kind === 'turn-start'),
  },
  {
    id: 'movement-fires',
    description: 'parties actually move (party-moved events emitted)',
    check: (events) => events.some((e) => e.kind === 'party-moved'),
  },
  {
    id: 'battles-resolve',
    description: 'opposing-faction collisions trigger battles',
    check: (events) => events.some((e) => e.kind === 'battle-resolved'),
  },
  {
    id: 'posts-capturable',
    description: 'POSTs change ownership during the run',
    check: (events) => events.some((e) => e.kind === 'post-captured'),
  },
  {
    id: 'leader-death-tracked',
    description: 'leader-died fires when a battle kills a party leader',
    check: (events) => events.some((e) => e.kind === 'leader-died'),
  },
  {
    id: 'queen-ultimate-charges',
    description: 'queen ultimate charge accrues over the scenario',
    check: (events) => events.some((e) => e.kind === 'queen-ultimate-charged'),
  },
  {
    id: 'queen-ultimate-fires',
    description: 'queen ultimate is fired at least once across the batch',
    check: (events) => events.some((e) => e.kind === 'queen-ultimate-fired'),
  },
  {
    id: 'jelly-applied',
    description: 'royal jelly is consumed at least once across the batch',
    check: (events) => events.some((e) => e.kind === 'jelly-applied'),
  },
  {
    id: 'pheroblast-used',
    description: 'PheroBlast (or any ability) is used at least once across the batch',
    check: (events) => events.some((e) => e.kind === 'ability-used'),
  },
  {
    id: 'fog-revealed',
    description: 'fog of war reveals tiles as parties move',
    check: (events) => events.some((e) => e.kind === 'fog-revealed'),
  },
  {
    id: 'scenario-decisive',
    description: 'at least one run reaches scenario-end (a decisive outcome)',
    check: (events) => events.some((e) => e.kind === 'scenario-end'),
  },
];

const main = (): void => {
  const args = parseCriticArgs(process.argv.slice(2), {
    inDir: 'out/baseline-100',
    outFile: 'critics/findings/spec-compliance.json',
  });
  const replayFiles = fs
    .readdirSync(args.inDir)
    .filter((f) => f.startsWith('replay-') && f.endsWith('.jsonl'))
    .map((f) => path.join(args.inDir, f));

  if (replayFiles.length === 0) {
    console.error(`no replay-*.jsonl files in ${args.inDir}`);
    process.exit(1);
  }

  const ruleHits = new Map<string, number>();
  for (const rule of RULES) ruleHits.set(rule.id, 0);

  for (const file of replayFiles) {
    const events = readReplay(file);
    for (const rule of RULES) {
      if (rule.check(events)) {
        ruleHits.set(rule.id, (ruleHits.get(rule.id) ?? 0) + 1);
      }
    }
  }

  const findings: Finding[] = [];
  for (const rule of RULES) {
    const hits = ruleHits.get(rule.id) ?? 0;
    const ratio = hits / replayFiles.length;
    if (hits === 0) {
      findings.push({
        rule: rule.id,
        severity: 'high',
        observation: `${rule.description} — NEVER observed across ${String(replayFiles.length)} replays`,
        suggested_action:
          'either the rule is unimplemented, the rule is implemented but unreachable in current play, or the AIs never trigger the conditions that would fire it',
      });
    } else if (ratio < 0.1) {
      findings.push({
        rule: rule.id,
        severity: 'medium',
        observation: `${rule.description} — only ${String(hits)}/${String(replayFiles.length)} replays exercise this`,
      });
    } else {
      findings.push({
        rule: rule.id,
        severity: 'low',
        observation: `${rule.description} — exercised in ${String(hits)}/${String(replayFiles.length)} replays`,
      });
    }
  }

  writeFindings(args.outFile, args.inDir, findings);
  summarizeFindings('spec-compliance', args.outFile, findings);
  console.log(`  scanned ${String(replayFiles.length)} replays in ${args.inDir}`);
  for (const f of findings) {
    if (f.severity === 'high') console.log(`  [HIGH] ${f.rule}: ${f.observation}`);
  }
};

main();
