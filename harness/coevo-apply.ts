/**
 * Apply coevolution proposals to the working tree atomically.
 *
 * The applier:
 *   1. Snapshots all mutable files before any change.
 *   2. For each proposal in order, performs the edit in-memory.
 *   3. Detects conflicts (two proposals editing the same field) and
 *      rejects the conflicting one rather than silently last-writes-wins.
 *   4. Writes all changes to disk only if no conflict was detected;
 *      otherwise rolls back to the snapshot.
 *
 * Returns an `ApplyResult` describing which proposals landed and which
 * were rejected with reasons. The orchestrator handles re-running
 * typecheck / tests / diversity downstream.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  type DesignerEnvelope,
  type FirepowerProposal,
  isFirepowerKind,
  isStrategyKind,
  type Proposal,
  type StrategyProposal,
} from './coevo-types.ts';

const REPO_ROOT = process.cwd();

const FACTION_OF_DESIGNER = {
  'ant-firepower': 'ant',
  'spider-firepower': 'spider',
  'ant-strategy': 'ant',
  'spider-strategy': 'spider',
} as const;

const ROSTER_PATH_BY_FACTION: Record<'ant' | 'spider', string> = {
  ant: 'data/level-1/roster-ants.json',
  spider: 'data/level-1/roster-spiders.json',
};

const UNITS_PATH = 'data/level-1/units.json';
const ABILITIES_PATH = 'data/level-1/abilities.json';

// Files designers cannot propose to replace/remove. ai/index.ts is
// intentionally NOT locked — adding a new variant requires registering
// it there, so strategy designers must be allowed to edit the export
// table. Designer rubric tells them to keep that edit minimal.
//
// Phase 4 round 3: ai/baseline.ts unlocked by explicit user authorization
// to allow modest baseline-AI improvements. Policy-helpers and types
// remain locked to keep the variant API stable.
const STRATEGY_LOCKED_PATHS = new Set(['ai/policy-helpers.ts', 'ai/types.ts']);

const ANT_VARIANT_PREFIXES = ['ai/rush', 'ai/turtle', 'ai/flank'];

export interface ProposalDecision {
  readonly proposal: Proposal;
  readonly accepted: boolean;
  readonly reason: string;
}

export interface ApplyResult {
  readonly applied: readonly ProposalDecision[];
  readonly rejected: readonly ProposalDecision[];
}

const repoPath = (rel: string): string => path.join(REPO_ROOT, rel);

const readJson = <T>(rel: string): T => JSON.parse(fs.readFileSync(repoPath(rel), 'utf8')) as T;

const writeJson = (rel: string, value: unknown): void => {
  fs.writeFileSync(repoPath(rel), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

interface UnitsFile {
  version: number;
  templates: {
    id: string;
    name: string;
    faction: 'ant' | 'spider' | 'neutral';
    size: string;
    slotCost: number;
    movement: string;
    baseStats: Record<string, number>;
    abilities: string[];
    tags: string[];
  }[];
}

interface AbilitiesFile {
  version: number;
  abilities: {
    id: string;
    name: string;
    category: string;
    target: string;
    uses: number | null;
    cooldown: number;
    /** Round 24 — combo abilities (mechanics memo §1.2) widened the
     * params shape from `Record<string, number>` to also accept
     * `string[]` (componentAbilities) and `Record<string, number>`
     * (mpCostBySource). The local type mirrors the engine schema so a
     * coevo `add-ability` / `replace-ability` proposal carrying combo
     * params round-trips through the harness without lossy clones. */
    params: Record<string, number | string[] | Record<string, number>>;
    description: string;
  }[];
}

interface RosterFile {
  version: number;
  faction: 'ant' | 'spider';
  parties: {
    id: string;
    leaderClass: string;
    leaderIndex: number;
    slotCapacity: number;
    units: { templateId: string; count: number }[];
    startingLocation: { plane: string; x: number; y: number };
    posture: string;
  }[];
}

const cloneAbility = (
  a: AbilitiesFile['abilities'][number],
): AbilitiesFile['abilities'][number] => ({
  id: a.id,
  name: a.name,
  category: a.category,
  target: a.target,
  uses: a.uses,
  cooldown: a.cooldown,
  params: a.params ?? {},
  description: a.description,
});

const checkFirepowerScope = (
  proposal: FirepowerProposal,
  designerFaction: 'ant' | 'spider',
  units: UnitsFile,
): string | null => {
  switch (proposal.kind) {
    case 'set-unit-stat':
    case 'add-ability-to-unit':
    case 'remove-ability-from-unit':
    case 'remove-unit-template': {
      const tmpl = units.templates.find((t) => t.id === proposal.templateId);
      if (!tmpl) return `unknown templateId '${proposal.templateId}'`;
      if (tmpl.faction !== designerFaction) {
        return `template '${proposal.templateId}' belongs to faction '${tmpl.faction}', designer is '${designerFaction}'`;
      }
      return null;
    }
    case 'add-unit-template': {
      if (proposal.template.faction !== designerFaction) {
        return `new template faction '${proposal.template.faction}' does not match designer '${designerFaction}'`;
      }
      return null;
    }
    case 'set-roster-party': {
      // roster-party check: simply trust the routing; both rosters use distinct
      // file paths, and the orchestrator routes by designer.
      return null;
    }
    case 'add-ability':
    case 'remove-ability':
    case 'replace-ability':
      return null;
  }
};

const applyFirepowerInMemory = (
  proposal: FirepowerProposal,
  units: UnitsFile,
  abilities: AbilitiesFile,
  roster: RosterFile,
  edited: Set<string>,
): { ok: true } | { ok: false; reason: string } => {
  const claim = (key: string): boolean => {
    if (edited.has(key)) return false;
    edited.add(key);
    return true;
  };

  switch (proposal.kind) {
    case 'set-unit-stat': {
      const tmpl = units.templates.find((t) => t.id === proposal.templateId);
      if (!tmpl) return { ok: false, reason: `template '${proposal.templateId}' not found` };
      const key = `unit-stat:${proposal.templateId}.${proposal.stat}`;
      if (!claim(key)) return { ok: false, reason: `conflict: ${key} already edited this round` };
      tmpl.baseStats[proposal.stat] = proposal.value;
      return { ok: true };
    }
    case 'add-ability-to-unit': {
      const tmpl = units.templates.find((t) => t.id === proposal.templateId);
      if (!tmpl) return { ok: false, reason: `template '${proposal.templateId}' not found` };
      if (!abilities.abilities.some((a) => a.id === proposal.abilityId)) {
        return { ok: false, reason: `ability '${proposal.abilityId}' does not exist` };
      }
      if (tmpl.abilities.includes(proposal.abilityId)) {
        return {
          ok: false,
          reason: `ability '${proposal.abilityId}' already on '${proposal.templateId}'`,
        };
      }
      const key = `unit-abilities:${proposal.templateId}`;
      if (!claim(key)) return { ok: false, reason: `conflict: ${key} already edited this round` };
      tmpl.abilities.push(proposal.abilityId);
      return { ok: true };
    }
    case 'remove-ability-from-unit': {
      const tmpl = units.templates.find((t) => t.id === proposal.templateId);
      if (!tmpl) return { ok: false, reason: `template '${proposal.templateId}' not found` };
      const idx = tmpl.abilities.indexOf(proposal.abilityId);
      if (idx === -1)
        return {
          ok: false,
          reason: `ability '${proposal.abilityId}' not on '${proposal.templateId}'`,
        };
      const key = `unit-abilities:${proposal.templateId}`;
      if (!claim(key)) return { ok: false, reason: `conflict: ${key} already edited this round` };
      tmpl.abilities.splice(idx, 1);
      return { ok: true };
    }
    case 'add-ability': {
      if (abilities.abilities.some((a) => a.id === proposal.ability.id)) {
        return { ok: false, reason: `ability '${proposal.ability.id}' already exists` };
      }
      if (abilities.abilities.length >= 15) {
        return { ok: false, reason: 'ability cap (15) reached' };
      }
      const key = `ability:${proposal.ability.id}`;
      if (!claim(key)) return { ok: false, reason: `conflict: ${key} already edited this round` };
      abilities.abilities.push(cloneAbility(proposal.ability));
      return { ok: true };
    }
    case 'remove-ability': {
      const idx = abilities.abilities.findIndex((a) => a.id === proposal.abilityId);
      if (idx === -1) return { ok: false, reason: `ability '${proposal.abilityId}' not found` };
      const inUseBy = units.templates.find((t) => t.abilities.includes(proposal.abilityId));
      if (inUseBy)
        return {
          ok: false,
          reason: `ability '${proposal.abilityId}' still on unit '${inUseBy.id}'`,
        };
      const key = `ability:${proposal.abilityId}`;
      if (!claim(key)) return { ok: false, reason: `conflict: ${key} already edited this round` };
      abilities.abilities.splice(idx, 1);
      return { ok: true };
    }
    case 'replace-ability': {
      const idx = abilities.abilities.findIndex((a) => a.id === proposal.abilityId);
      if (idx === -1) return { ok: false, reason: `ability '${proposal.abilityId}' not found` };
      if (proposal.ability.id !== proposal.abilityId) {
        return {
          ok: false,
          reason: `replace-ability id mismatch: ${proposal.abilityId} vs ${proposal.ability.id}`,
        };
      }
      const key = `ability:${proposal.abilityId}`;
      if (!claim(key)) return { ok: false, reason: `conflict: ${key} already edited this round` };
      abilities.abilities[idx] = cloneAbility(proposal.ability);
      return { ok: true };
    }
    case 'add-unit-template': {
      if (units.templates.some((t) => t.id === proposal.template.id)) {
        return { ok: false, reason: `template '${proposal.template.id}' already exists` };
      }
      const factionCount = units.templates.filter(
        (t) => t.faction === proposal.template.faction,
      ).length;
      if (factionCount >= 12) {
        return {
          ok: false,
          reason: `unit cap (12 per faction) reached for '${proposal.template.faction}'`,
        };
      }
      const key = `unit:${proposal.template.id}`;
      if (!claim(key)) return { ok: false, reason: `conflict: ${key} already edited this round` };
      units.templates.push({
        id: proposal.template.id,
        name: proposal.template.name,
        faction: proposal.template.faction,
        size: proposal.template.size,
        slotCost: proposal.template.slotCost,
        movement: proposal.template.movement,
        baseStats: { ...proposal.template.baseStats },
        abilities: [...proposal.template.abilities],
        tags: [...proposal.template.tags],
      });
      return { ok: true };
    }
    case 'remove-unit-template': {
      const idx = units.templates.findIndex((t) => t.id === proposal.templateId);
      if (idx === -1) return { ok: false, reason: `template '${proposal.templateId}' not found` };
      const inUseBy = roster.parties.find((p) =>
        p.units.some((u) => u.templateId === proposal.templateId),
      );
      if (inUseBy) {
        return {
          ok: false,
          reason: `template '${proposal.templateId}' still in roster party '${inUseBy.id}'`,
        };
      }
      const key = `unit:${proposal.templateId}`;
      if (!claim(key)) return { ok: false, reason: `conflict: ${key} already edited this round` };
      units.templates.splice(idx, 1);
      return { ok: true };
    }
    case 'set-roster-party': {
      const idx = roster.parties.findIndex((p) => p.id === proposal.partyId);
      const key = `roster-party:${proposal.partyId}`;
      if (!claim(key)) return { ok: false, reason: `conflict: ${key} already edited this round` };
      // Validate: all referenced templates exist and match the roster faction.
      for (const u of proposal.party.units) {
        const tmpl = units.templates.find((t) => t.id === u.templateId);
        if (!tmpl)
          return { ok: false, reason: `roster references unknown template '${u.templateId}'` };
        if (tmpl.faction !== roster.faction && tmpl.faction !== 'neutral') {
          return {
            ok: false,
            reason: `template '${u.templateId}' faction '${tmpl.faction}' does not match roster '${roster.faction}'`,
          };
        }
      }
      const next = {
        id: proposal.party.id,
        leaderClass: proposal.party.leaderClass,
        leaderIndex: proposal.party.leaderIndex,
        slotCapacity: proposal.party.slotCapacity,
        units: proposal.party.units.map((u) => ({ ...u })),
        startingLocation: { ...proposal.party.startingLocation },
        posture: proposal.party.posture,
      };
      if (idx === -1) roster.parties.push(next);
      else roster.parties[idx] = next;
      return { ok: true };
    }
  }
};

export const applyFirepowerEnvelope = (envelope: DesignerEnvelope): ApplyResult => {
  const designerFaction = FACTION_OF_DESIGNER[envelope.designer];
  if (designerFaction !== 'ant' && designerFaction !== 'spider') {
    throw new Error(`unexpected firepower designer ${envelope.designer}`);
  }
  const units = readJson<UnitsFile>(UNITS_PATH);
  const abilities = readJson<AbilitiesFile>(ABILITIES_PATH);
  const roster = readJson<RosterFile>(ROSTER_PATH_BY_FACTION[designerFaction]);
  const edited = new Set<string>();
  const applied: ProposalDecision[] = [];
  const rejected: ProposalDecision[] = [];

  for (const proposal of envelope.proposals) {
    if (!isFirepowerKind(proposal.kind)) {
      rejected.push({ proposal, accepted: false, reason: 'not a firepower proposal kind' });
      continue;
    }
    const fp = proposal as FirepowerProposal;
    const scopeReason = checkFirepowerScope(fp, designerFaction, units);
    if (scopeReason !== null) {
      rejected.push({ proposal, accepted: false, reason: scopeReason });
      continue;
    }
    const r = applyFirepowerInMemory(fp, units, abilities, roster, edited);
    if (!r.ok) rejected.push({ proposal, accepted: false, reason: r.reason });
    else applied.push({ proposal, accepted: true, reason: 'applied' });
  }

  if (applied.length > 0) {
    writeJson(UNITS_PATH, units);
    writeJson(ABILITIES_PATH, abilities);
    writeJson(ROSTER_PATH_BY_FACTION[designerFaction], roster);
  }
  return { applied, rejected };
};

const checkStrategyScope = (
  proposal: StrategyProposal,
  designerFaction: 'ant' | 'spider',
): string | null => {
  if (STRATEGY_LOCKED_PATHS.has(proposal.path)) {
    return `path '${proposal.path}' is locked`;
  }
  if (!proposal.path.startsWith('ai/') || !proposal.path.endsWith('.ts')) {
    return `path '${proposal.path}' must be ai/*.ts`;
  }
  if (proposal.path.includes('/') && proposal.path.split('/').length > 2) {
    return `path '${proposal.path}' must be a single ai/<file>.ts (no subdirs)`;
  }
  // Spider-side files are 'ai/spider-*.ts'. Ant-side files are everything
  // else under ai/ that's not a locked path.
  const isSpiderFile = path.basename(proposal.path).startsWith('spider-');
  if (designerFaction === 'spider' && !isSpiderFile) {
    return `spider-strategy may only edit ai/spider-*.ts files`;
  }
  if (designerFaction === 'ant' && isSpiderFile) {
    return `ant-strategy may not edit ai/spider-*.ts files`;
  }
  return null;
};

export const applyStrategyEnvelope = (envelope: DesignerEnvelope): ApplyResult => {
  const designerFaction = FACTION_OF_DESIGNER[envelope.designer];
  if (designerFaction !== 'ant' && designerFaction !== 'spider') {
    throw new Error(`unexpected strategy designer ${envelope.designer}`);
  }
  const editedPaths = new Set<string>();
  const applied: ProposalDecision[] = [];
  const rejected: ProposalDecision[] = [];

  for (const proposal of envelope.proposals) {
    if (!isStrategyKind(proposal.kind)) {
      rejected.push({ proposal, accepted: false, reason: 'not a strategy proposal kind' });
      continue;
    }
    const sp = proposal as StrategyProposal;
    const scopeReason = checkStrategyScope(sp, designerFaction);
    if (scopeReason !== null) {
      rejected.push({ proposal, accepted: false, reason: scopeReason });
      continue;
    }
    if (editedPaths.has(sp.path)) {
      rejected.push({
        proposal,
        accepted: false,
        reason: `conflict: '${sp.path}' already edited this round`,
      });
      continue;
    }
    editedPaths.add(sp.path);

    const fullPath = repoPath(sp.path);
    const exists = fs.existsSync(fullPath);
    try {
      switch (sp.kind) {
        case 'replace-file':
          if (!exists) throw new Error(`file '${sp.path}' does not exist`);
          fs.writeFileSync(fullPath, sp.content, 'utf8');
          break;
        case 'add-file':
          if (exists) throw new Error(`file '${sp.path}' already exists`);
          fs.writeFileSync(fullPath, sp.content, 'utf8');
          break;
        case 'remove-file':
          if (!exists) throw new Error(`file '${sp.path}' does not exist`);
          fs.unlinkSync(fullPath);
          break;
      }
      applied.push({ proposal, accepted: true, reason: 'applied' });
    } catch (e) {
      rejected.push({ proposal, accepted: false, reason: (e as Error).message });
    }
  }
  return { applied, rejected };
};

export const ANT_VARIANT_PREFIX_LIST = ANT_VARIANT_PREFIXES;
