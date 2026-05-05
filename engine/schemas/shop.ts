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
  /** Post id at which this shop is located. Validated by reconciler. */
  locationPostId: idSchema,
  inventory: z.array(shopItemSchema).min(1),
});

export type ShopFile = z.infer<typeof shopFileSchema>;
