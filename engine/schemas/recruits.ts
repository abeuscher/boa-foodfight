import { z } from 'zod';

import { idSchema } from './common.ts';

/**
 * Roadmap §7.10 — per-scenario Anthill recruit catalog
 * (`data/level-N/recruits.json`). The single authoritative source of
 * *what is recruitable*, *at what cost*, and *at which scenario* (the
 * file is per-level; absence of a template ⇒ not available that hub
 * visit). Loaded by the world-loop / UI layer and passed into
 * `recruitUnit`; deliberately NOT loaded on the static `loadScenario`
 * path (keeps gate-29 byte-identical — no scenario depends on it).
 */
export const recruitEntrySchema = z.object({
  /** ID into `units.json` (e.g. `ant-footman`). Must not be a queen
   * template — authoring rule, the catalog is the recruit gate. */
  templateId: idSchema,
  cost: z.number().int().nonnegative(),
});

export const recruitsFileSchema = z
  .object({
    version: z.literal(1),
    recruits: z.array(recruitEntrySchema),
  })
  .refine((file) => new Set(file.recruits.map((r) => r.templateId)).size === file.recruits.length, {
    message: 'recruit catalog templateIds must be unique',
  });

export type RecruitEntry = z.infer<typeof recruitEntrySchema>;
export type RecruitsFile = z.infer<typeof recruitsFileSchema>;
