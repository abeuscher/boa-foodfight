import { z } from 'zod';

import { idSchema } from './common.ts';

export const shopItemKindSchema = z.enum(['healing', 'stat-boost', 'mercenary', 'equipment']);

export const shopItemSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  kind: shopItemKindSchema,
  /** Cost in buttons. */
  price: z.number().int().positive(),
  /** Stock available per scenario; null = unlimited. */
  stock: z.number().int().positive().nullable(),
  /** Free-form effect parameters (e.g., heal amount, stat target). */
  effect: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  description: z.string().min(1),
});

export const shopFileSchema = z.object({
  version: z.literal(1),
  shopId: idSchema,
  shopName: z.string().min(1),
  proprietor: z.string().min(1),
  /**
   * Post id at which this shop is located, if any. Optional because some
   * shops (e.g., the Level 1 shoebox) are between-scenario world-loop
   * features rather than in-scenario POSTs. When present, the reconciler
   * verifies it resolves to a post in `map.json`.
   */
  locationPostId: idSchema.optional(),
  inventory: z.array(shopItemSchema).min(1),
});

export type ShopFile = z.infer<typeof shopFileSchema>;
