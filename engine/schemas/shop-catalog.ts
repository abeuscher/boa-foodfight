import { z } from 'zod';

import { idSchema } from './common.ts';

/**
 * Roadmap §7.10 follow-on / §6.4 — the Grasshopper shop catalog
 * (`data/level-N/shop-catalog.json`). The single authoritative source
 * of *which R14 persistent items are for sale* and *at what cost* at a
 * given hub visit (per-level file; absence ⇒ not sold this visit).
 * Parallels the Anthill recruit catalog (`recruits.json`): loaded by
 * the world-loop / UI layer and passed into `buyItem`; deliberately
 * NOT loaded on the static `loadScenario` path (keeps gate-29
 * byte-identical — no scenario depends on it).
 *
 * Items-only by design (the Grasshopper trades items; the Anthill
 * nursery sells units). `itemId` references a `persistent` template in
 * `items.json`; the persistent-kind requirement is the buy-time gate
 * in `buyItem` (the catalog is data, the item file is the type source).
 */
export const shopCatalogEntrySchema = z.object({
  itemId: idSchema,
  cost: z.number().int().nonnegative(),
});

export const shopCatalogFileSchema = z
  .object({
    version: z.literal(1),
    items: z.array(shopCatalogEntrySchema),
  })
  .refine((file) => new Set(file.items.map((i) => i.itemId)).size === file.items.length, {
    message: 'shop catalog itemIds must be unique',
  });

export type ShopCatalogEntry = z.infer<typeof shopCatalogEntrySchema>;
export type ShopCatalogFile = z.infer<typeof shopCatalogFileSchema>;
