/**
 * Coevolution-loop proposal schema. Designer agents return JSON
 * matching one of these envelopes; the orchestrator validates with
 * Zod before applying.
 *
 * Two designer roles per faction (firepower + strategy = 4 total).
 * Each role can only emit certain proposal kinds — enforced at apply
 * time, not schema time, since the same JSON shape is reused.
 */

import { z } from 'zod';

import { abilityDefinitionSchema } from '../engine/schemas/abilities.ts';
import { factionSchema, statsSchema, unitSizeSchema } from '../engine/schemas/common.ts';

// ---------------------------------------------------------------------------
// Firepower proposals (data-only)
// ---------------------------------------------------------------------------

const setUnitStatSchema = z.object({
  kind: z.literal('set-unit-stat'),
  templateId: z.string().min(1),
  stat: z.enum(['hp', 'attack', 'agility', 'armor', 'intelligence', 'constitution']),
  value: z.number(),
  rationale: z.string().min(20),
});

const addAbilityToUnitSchema = z.object({
  kind: z.literal('add-ability-to-unit'),
  templateId: z.string().min(1),
  abilityId: z.string().min(1),
  rationale: z.string().min(20),
});

const removeAbilityFromUnitSchema = z.object({
  kind: z.literal('remove-ability-from-unit'),
  templateId: z.string().min(1),
  abilityId: z.string().min(1),
  rationale: z.string().min(20),
});

const addAbilitySchema = z.object({
  kind: z.literal('add-ability'),
  ability: abilityDefinitionSchema,
  rationale: z.string().min(20),
});

const removeAbilitySchema = z.object({
  kind: z.literal('remove-ability'),
  abilityId: z.string().min(1),
  rationale: z.string().min(20),
});

// Roster party schema: keep it loose; the harness already validates against
// the full roster schema after apply.
const rosterPartySchema = z.object({
  id: z.string(),
  leaderClass: z.string(),
  leaderIndex: z.number().int().nonnegative(),
  slotCapacity: z.number().int().positive(),
  units: z.array(z.object({ templateId: z.string(), count: z.number().int().positive() })),
  startingLocation: z.object({
    plane: z.string(),
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
  }),
  posture: z.enum(['fight', 'defend', 'run']),
});

const setRosterPartySchema = z.object({
  kind: z.literal('set-roster-party'),
  partyId: z.string().min(1),
  party: rosterPartySchema,
  rationale: z.string().min(20),
});

// Unit template schema reuses statsSchema/factionSchema/unitSizeSchema
// from engine/schemas/common.ts to avoid duplicating field definitions.
const unitTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  faction: factionSchema,
  size: unitSizeSchema,
  slotCost: z.number().int().positive(),
  movement: z.enum(['ground', 'climbing', 'flying']),
  baseStats: statsSchema,
  abilities: z.array(z.string()),
  tags: z.array(z.string()),
});

const addUnitTemplateSchema = z.object({
  kind: z.literal('add-unit-template'),
  template: unitTemplateSchema,
  rationale: z.string().min(20),
});

const removeUnitTemplateSchema = z.object({
  kind: z.literal('remove-unit-template'),
  templateId: z.string().min(1),
  rationale: z.string().min(20),
});

const firepowerProposalSchema = z.discriminatedUnion('kind', [
  setUnitStatSchema,
  addAbilityToUnitSchema,
  removeAbilityFromUnitSchema,
  addAbilitySchema,
  removeAbilitySchema,
  setRosterPartySchema,
  addUnitTemplateSchema,
  removeUnitTemplateSchema,
]);

// ---------------------------------------------------------------------------
// Strategy proposals (AI-code edits)
// ---------------------------------------------------------------------------

const replaceFileSchema = z.object({
  kind: z.literal('replace-file'),
  path: z.string().min(1),
  content: z.string().min(1),
  rationale: z.string().min(20),
});

const addFileSchema = z.object({
  kind: z.literal('add-file'),
  path: z.string().min(1),
  content: z.string().min(1),
  rationale: z.string().min(20),
});

const removeFileSchema = z.object({
  kind: z.literal('remove-file'),
  path: z.string().min(1),
  rationale: z.string().min(20),
});

const strategyProposalSchema = z.discriminatedUnion('kind', [
  replaceFileSchema,
  addFileSchema,
  removeFileSchema,
]);

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export const designerEnvelopeSchema = z.object({
  designer: z.enum(['ant-firepower', 'spider-firepower', 'ant-strategy', 'spider-strategy']),
  round: z.number().int().nonnegative(),
  proposals: z.array(z.union([firepowerProposalSchema, strategyProposalSchema])).max(3),
});

export type FirepowerProposal = z.infer<typeof firepowerProposalSchema>;
export type StrategyProposal = z.infer<typeof strategyProposalSchema>;
export type Proposal = FirepowerProposal | StrategyProposal;
export type DesignerEnvelope = z.infer<typeof designerEnvelopeSchema>;
export type DesignerRole = DesignerEnvelope['designer'];

export const isFirepowerKind = (kind: string): boolean =>
  [
    'set-unit-stat',
    'add-ability-to-unit',
    'remove-ability-from-unit',
    'add-ability',
    'remove-ability',
    'set-roster-party',
    'add-unit-template',
    'remove-unit-template',
  ].includes(kind);

export const isStrategyKind = (kind: string): boolean =>
  ['replace-file', 'add-file', 'remove-file'].includes(kind);
