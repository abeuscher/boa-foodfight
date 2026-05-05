import { z } from 'zod';

import {
  factionSchema,
  idSchema,
  movementModeSchema,
  statsSchema,
  unitSizeSchema,
} from './common.ts';

const slotCostBySize = {
  small: 1,
  medium: 2,
  large: 3,
  huge: [4, 5],
} as const;

export const unitTemplateSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    faction: factionSchema,
    size: unitSizeSchema,
    slotCost: z.number().int().min(1).max(5),
    movement: movementModeSchema,
    baseStats: statsSchema,
    abilities: z.array(idSchema).default([]),
    tags: z.array(z.string()).default([]),
  })
  .refine(
    (u) => {
      if (u.size === 'huge') {
        return slotCostBySize.huge.includes(u.slotCost as 4 | 5);
      }
      return u.slotCost === slotCostBySize[u.size];
    },
    { message: 'slotCost must match size (small=1, medium=2, large=3, huge=4 or 5)' },
  );

export const unitsFileSchema = z
  .object({
    version: z.literal(1),
    templates: z.array(unitTemplateSchema).min(1),
  })
  .refine((file) => new Set(file.templates.map((t) => t.id)).size === file.templates.length, {
    message: 'unit template ids must be unique',
  });

export type UnitTemplateData = z.infer<typeof unitTemplateSchema>;
export type UnitsFile = z.infer<typeof unitsFileSchema>;
