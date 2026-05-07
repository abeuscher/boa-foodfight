/**
 * Round 12 — gold tracking tables.
 *
 * Two static tables drive the gold mechanic:
 *
 *   POST_CAPTURE_GOLD: how much gold a faction earns when it captures a
 *     POST. Faction-locked POSTs (storm-drain, spider-web) are 0 — they
 *     can't actually change hands during a normal scenario. Mid-POSTs
 *     (soap-dish / towel-rack / wall-crack) pay an increasing reward
 *     that mirrors the spec's "type chain" progression.
 *
 *   KILL_GOLD: how much gold a faction earns when one of its battle
 *     actions kills an enemy unit. Keyed by the dead unit's templateId.
 *     Unknown templates default to 0 (so a future unit type doesn't
 *     silently inflate gold totals).
 *
 * The capturing-faction-vs-POST-type lookup is a prefix match on the
 * POST id (the map generator emits ids of the form `<type>-<n>`); this
 * mirrors the `postOfType` helper in `ai/policy-helpers.ts` but lives
 * here so the engine doesn't have to import from the AI module. Gold
 * itself is a pure tracking value with no in-scenario effect — it does
 * not affect AI policies, combat math, or scenario outcomes.
 */

import type { PostId, UnitTemplateId } from './types.ts';

/** Gold awarded for each POST type when captured. */
const POST_CAPTURE_GOLD_BY_TYPE: ReadonlyMap<string, number> = new Map([
  ['storm-drain', 0],
  ['spider-web', 0],
  ['soap-dish', 10],
  ['towel-rack', 15],
  ['wall-crack', 20],
]);

/**
 * Match a POST id against the gold table by exact id or `<type>-<n>`
 * prefix. Returns 0 for unknown types.
 */
export const goldForPostCapture = (postId: PostId): number => {
  const id = String(postId);
  const exact = POST_CAPTURE_GOLD_BY_TYPE.get(id);
  if (exact !== undefined) return exact;
  for (const [type, value] of POST_CAPTURE_GOLD_BY_TYPE) {
    if (id.startsWith(`${type}-`)) return value;
  }
  return 0;
};

/** Gold awarded to the winning faction for each killed unit template. */
const KILL_GOLD_BY_TEMPLATE: ReadonlyMap<UnitTemplateId, number> = new Map<UnitTemplateId, number>([
  ['spider-scout' as UnitTemplateId, 3],
  ['spider-soldier' as UnitTemplateId, 5],
  ['spider-elite' as UnitTemplateId, 12],
  ['spider-spinner' as UnitTemplateId, 8],
  ['spider-queen' as UnitTemplateId, 50],
  ['spiderling' as UnitTemplateId, 1],
  ['mouse-merc' as UnitTemplateId, 4],
  ['mouse' as UnitTemplateId, 4],
  ['cockroach' as UnitTemplateId, 2],
  ['stinkbug' as UnitTemplateId, 5],
  ['ant-footman' as UnitTemplateId, 5],
  ['ant-archer' as UnitTemplateId, 4],
  ['ant-mage' as UnitTemplateId, 10],
  ['ant-worker' as UnitTemplateId, 3],
  ['ant-scout' as UnitTemplateId, 4],
  ['ant-tank' as UnitTemplateId, 12],
  ['ant-potato-bug' as UnitTemplateId, 6],
  ['ant-queen' as UnitTemplateId, 50],
]);

/** Returns the kill bounty for a unit template; 0 for unknown templates. */
export const goldForKill = (templateId: UnitTemplateId): number =>
  KILL_GOLD_BY_TEMPLATE.get(templateId) ?? 0;
