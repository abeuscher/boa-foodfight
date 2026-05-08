/**
 * Round 25 — shared AI helpers for commander cards (mechanics memo §1.3).
 *
 * Both `baseline.ts` and `spider-l1.ts` use the same heuristics for
 * deciding when to buy and when to play a card. Centralizing the
 * helpers here keeps the per-policy file diffs small and avoids
 * duplicating the cost / matchup tables across two AIs (jscpd's
 * threshold-0 gate would otherwise flag the buy/play closures).
 *
 * Determinism: helpers are pure read-only functions of GameState; they
 * compose into per-faction decisions inside the `decide()` closures
 * which already run inside the deterministic policy RNG fork.
 *
 * Imports allowed: `engine/cards`, `engine/types`.
 */

import { livingHpFraction } from '../engine/parties.ts';
import type {
  BuyCardOrder,
  CardId,
  GameState,
  Party,
  PartyId,
  PlayCardOrder,
} from '../engine/types.ts';

/** Hand-cap is enforced engine-side, but the AI shortcuts the
 * decision when it's already at or above the cap. */
const HAND_CAP = 3;

const FRENZY: CardId = 'frenzy' as CardId;
const QUICK_STRIKE: CardId = 'quick-strike' as CardId;
const BULWARK: CardId = 'bulwark' as CardId;
const MASS_HEAL: CardId = 'mass-heal' as CardId;
const EXTRA_CHARGE: CardId = 'extra-charge' as CardId;
const FORCED_MARCH: CardId = 'forced-march' as CardId;
const MP_REFRESH: CardId = 'mp-refresh' as CardId;
const INTEL_BURST: CardId = 'intel-burst' as CardId;

/** Priority order for AI buys. Earlier entries are preferred when
 * available and affordable. The list deliberately puts spike-damage
 * (quick-strike) and matchup-shaping buffs (frenzy) first; raw
 * tempo (extra-charge / forced-march) at the back. */
const BUY_PRIORITY: readonly CardId[] = [
  QUICK_STRIKE,
  FRENZY,
  BULWARK,
  MASS_HEAL,
  MP_REFRESH,
  EXTRA_CHARGE,
  FORCED_MARCH,
  INTEL_BURST,
];

/** Get the count of cards in `faction`'s hand from state, treating a
 * missing hand field as empty (legacy / pre-round-25 states). */
const handCountFor = (state: GameState, faction: 'ant' | 'spider'): number => {
  const hand = state.cardHand;
  if (!hand) return 0;
  return faction === 'ant' ? hand.ant.length : hand.spider.length;
};

const handFor = (state: GameState, faction: 'ant' | 'spider'): readonly CardId[] => {
  const hand = state.cardHand;
  if (!hand) return [];
  return faction === 'ant' ? hand.ant : hand.spider;
};

/**
 * Pick the highest-priority card the faction can afford right now.
 * Returns the card id + cost when an affordable, in-market card is
 * available; otherwise undefined.
 */
export const pickBuyableCard = (
  state: GameState,
  faction: 'ant' | 'spider',
): { cardId: CardId; cost: number } | undefined => {
  const market = state.cardMarket ?? [];
  if (market.length === 0) return undefined;
  const gold = state.playerGold[faction];
  if (handCountFor(state, faction) >= HAND_CAP) return undefined;
  for (const cardId of BUY_PRIORITY) {
    const slot = market.find((m) => m.cardId === cardId);
    if (!slot) continue;
    if (gold < slot.cost) continue;
    return { cardId: slot.cardId, cost: slot.cost };
  }
  return undefined;
};

/**
 * Round 25 — build a `buy-card` order if one is appropriate this
 * turn. Caller appends to any party's order list (the order carries
 * its own faction so it doesn't matter which party hosts it).
 */
export const buyCardOrderFor = (
  state: GameState,
  faction: 'ant' | 'spider',
): BuyCardOrder | undefined => {
  const choice = pickBuyableCard(state, faction);
  if (!choice) return undefined;
  return { kind: 'buy-card', cardId: choice.cardId, faction };
};

const friendlyParties = (state: GameState, faction: 'ant' | 'spider'): readonly Party[] => {
  const out: Party[] = [];
  for (const party of state.parties.values()) {
    if (party.faction !== faction) continue;
    if (party.units.every((u) => u.currentHp <= 0)) continue;
    out.push(party);
  }
  return out;
};

const enemyParties = (state: GameState, faction: 'ant' | 'spider'): readonly Party[] => {
  const out: Party[] = [];
  for (const party of state.parties.values()) {
    if (party.faction === faction) continue;
    if (party.faction === 'neutral') continue;
    if (party.units.every((u) => u.currentHp <= 0)) continue;
    out.push(party);
  }
  return out;
};

/** Lowest-living-HP friendly party (deterministic tiebreak by id).
 * Used as the mass-heal target. */
const lowestHpFriendly = (state: GameState, faction: 'ant' | 'spider'): Party | undefined => {
  let best: { party: Party; frac: number } | undefined;
  for (const party of friendlyParties(state, faction)) {
    const frac = livingHpFraction(party, state.unitTemplates);
    if (frac >= 1) continue;
    if (
      best === undefined ||
      frac < best.frac ||
      (frac === best.frac && party.id < best.party.id)
    ) {
      best = { party, frac };
    }
  }
  return best?.party;
};

/** Lowest-living-HP enemy party (deterministic tiebreak by id).
 * Used as the quick-strike target. */
const lowestHpEnemy = (state: GameState, faction: 'ant' | 'spider'): Party | undefined => {
  let best: { party: Party; hp: number } | undefined;
  for (const party of enemyParties(state, faction)) {
    let hp = 0;
    for (const u of party.units) hp += Math.max(0, u.currentHp);
    if (hp <= 0) continue;
    if (best === undefined || hp < best.hp || (hp === best.hp && party.id < best.party.id)) {
      best = { party, hp };
    }
  }
  return best?.party;
};

/** Highest-firepower friendly party — picks the largest by living
 * unit count as a proxy for "main attacker". Used as a fallback
 * frenzy / extra-charge / forced-march target. */
const highestPowerFriendly = (state: GameState, faction: 'ant' | 'spider'): Party | undefined => {
  let best: { party: Party; size: number } | undefined;
  for (const party of friendlyParties(state, faction)) {
    let size = 0;
    for (const u of party.units) if (u.currentHp > 0) size += 1;
    if (size <= 0) continue;
    if (
      best === undefined ||
      size > best.size ||
      (size === best.size && party.id < best.party.id)
    ) {
      best = { party, size };
    }
  }
  return best?.party;
};

/** Friendly party with at least one caster (mpSlots-bearing) unit. */
const friendlyCasterParty = (state: GameState, faction: 'ant' | 'spider'): Party | undefined => {
  for (const party of friendlyParties(state, faction)) {
    if (party.units.some((u) => u.currentHp > 0 && u.mpSlots !== undefined)) return party;
  }
  return undefined;
};

/**
 * Round 25 — pick the best play this turn from the faction's hand.
 * Returns a single `play-card` order or undefined. The heuristics:
 *   - quick-strike: lowest-HP enemy.
 *   - frenzy / forced-march / extra-charge: highest-power friendly.
 *   - bulwark: highest-power friendly (queen-guard or web-guard
 *     usually wins this).
 *   - mass-heal: lowest-HP friendly (skips full-HP parties).
 *   - mp-refresh: friendly caster party.
 *   - intel-burst: faction-wide; no party target.
 *
 * The picker walks the hand in insertion order and stops at the
 * first card it can resolve a target for, so a faction holding three
 * cards plays at most one per turn (matches the spec's
 * "one-shot, played individually" shape).
 */
export const playCardOrderFor = (
  state: GameState,
  faction: 'ant' | 'spider',
): PlayCardOrder | undefined => {
  const hand = handFor(state, faction);
  if (hand.length === 0) return undefined;
  for (const cardId of hand) {
    const order = pickPlayTarget(state, faction, cardId);
    if (order) return order;
  }
  return undefined;
};

const orderFor = (
  faction: 'ant' | 'spider',
  cardId: CardId,
  partyId?: PartyId,
  targetPartyId?: PartyId,
): PlayCardOrder => ({
  kind: 'play-card',
  cardId,
  faction,
  ...(partyId !== undefined ? { partyId } : {}),
  ...(targetPartyId !== undefined ? { targetPartyId } : {}),
});

const pickPlayTarget = (
  state: GameState,
  faction: 'ant' | 'spider',
  cardId: CardId,
): PlayCardOrder | undefined => {
  if (cardId === QUICK_STRIKE) {
    const target = lowestHpEnemy(state, faction);
    if (!target) return undefined;
    return orderFor(faction, cardId, undefined, target.id);
  }
  if (cardId === MASS_HEAL) {
    const target = lowestHpFriendly(state, faction);
    if (!target) return undefined;
    return orderFor(faction, cardId, target.id);
  }
  if (cardId === MP_REFRESH) {
    const target = friendlyCasterParty(state, faction);
    if (!target) return undefined;
    return orderFor(faction, cardId, target.id);
  }
  if (cardId === INTEL_BURST) {
    return orderFor(faction, cardId);
  }
  // Buff cards (frenzy / bulwark / extra-charge / forced-march) all
  // target the faction's main attacker.
  const target = highestPowerFriendly(state, faction);
  if (!target) return undefined;
  return orderFor(faction, cardId, target.id);
};
