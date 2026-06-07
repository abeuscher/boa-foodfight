/**
 * The player's "policy". The engine drives every faction through an
 * `AIPolicy.decide(state) => state` that writes orders onto that
 * faction's parties; the human player is no exception — the UI collects
 * intents and this builds the matching ant policy each turn.
 *
 * Chunk 24 (PM-directed) — the intent shape used to be a flat
 * `Map<PartyId, TileCoord | null>` (coord = march, null = hold, absent
 * = no opinion). That couldn't carry an ability invocation. Reshaped
 * to a tagged union `PartyIntent` so the player can also issue a
 * "use-ability/recruit" against a neutral party they're co-located
 * with. Move and hold are mechanically identical to before; the
 * recruit branch is new.
 */
import { buildAntPolicy, moveToOrHold } from '../../../ai/policy-helpers.ts';
import type { AIPolicy } from '../../../ai/types.ts';
import type { AbilityId, AbilityOrder, PartyId, TileCoord } from '../../../engine/types.ts';

const RECRUIT: AbilityId = 'recruit' as AbilityId;
const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;

/** Per-party player intent. Tagged union so the policy can branch on
 * `kind` and emit the matching engine `Order`. */
export type PartyIntent =
  /** March toward `dest`. The engine steps the party toward it each
   * turn and clears the order on arrival; this intent is sticky in
   * the UI map until the player changes it. */
  | { readonly kind: 'move'; readonly dest: TileCoord }
  /** Hold position — clear any in-flight orders this turn, posture
   * defends. */
  | { readonly kind: 'hold' }
  /** Try to recruit a same-tile neutral (`target` is the neutral's
   * `PartyId`). Engine rolls the 25%-per-attempt convert via
   * `recruitNeutral`; the intent is one-shot — `useLiveScenario`
   * prunes it after the turn resolves so we don't fire the ability
   * every turn until it lands. */
  | { readonly kind: 'recruit'; readonly target: PartyId }
  /** Chunk 31 — Cast Royal Jelly on `target` (current cut: always
   * `party.id`, i.e. self-buff). Engine increments target's
   * `jellyDoses` by 1 (capped at `jelly.capacityPerParty`), which
   * grants the +25% attack / +15% resilience buff for the
   * configured duration (2 turns on L1, per `jelly.json`).
   * One-shot like recruit — pruned after the turn resolves so the
   * mage doesn't auto-recast every turn until doses are full. */
  | { readonly kind: 'jelly-apply'; readonly target: PartyId };

export type PlayerIntents = ReadonlyMap<PartyId, PartyIntent>;

export const buildHumanPolicy = (intents: PlayerIntents): AIPolicy =>
  buildAntPolicy('human', () => (party) => {
    const intent = intents.get(party.id);
    if (intent === undefined) return null;
    if (intent.kind === 'hold') return { orders: [], posture: 'defend' };
    if (intent.kind === 'recruit') {
      const order: AbilityOrder = {
        kind: 'use-ability',
        abilityId: RECRUIT,
        target: intent.target,
      };
      return { orders: [order], posture: 'fight' };
    }
    if (intent.kind === 'jelly-apply') {
      const order: AbilityOrder = {
        kind: 'use-ability',
        abilityId: JELLY_APPLY,
        target: intent.target,
      };
      return { orders: [order], posture: 'fight' };
    }
    return { orders: moveToOrHold(party, intent.dest), posture: 'fight' };
  });
