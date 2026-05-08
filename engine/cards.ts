/**
 * engine/cards — round 25 commander cards (mechanics memo §1.3,
 * Risk 2210 inspired gold sink).
 *
 * Cards are one-shot tactical effects bought from a public 6-card
 * market with `state.playerGold` (round 12) and held in a per-faction
 * hand (cap 3) until played. Both factions see the same market and
 * can race for the same card; the deck is shuffled deterministically
 * once at scenario start by a seeded RNG fork (`cards-deck`) so the
 * shop ordering is reproducible.
 *
 * The 8-template pool keeps card effects bounded so cards complement
 * rather than overshadow other systems (R14 items are persistent buffs;
 * cards are spike one-shots — see memo §1.3 conflict note). Quick-
 * strike caps single-card damage at 8 hp; mass-heal caps single-card
 * heal at 4 hp/unit; buff cards cap at +2 stat. Nothing on this list
 * crosses planes, captures POSTs, or kills the queen outright.
 *
 * Determinism: deck shuffle, market draw order, and target selection
 * are all RNG-fork driven. Resolution is fully data-driven from the
 * `CARD_POOL` table, so adding a card requires no engine wiring beyond
 * a new `applyCardEffect` switch arm.
 *
 * Imports allowed: `engine/coord`, `engine/rng`, `engine/types`.
 */

import { healUnits } from './parties.ts';
import type {
  CardId,
  Faction,
  GameState,
  Party,
  PartyId,
  ReplayEvent,
  Rng,
  Unit,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

/** Round 25 — flat per-party stat offsets contributed by active card
 * buffs. Frenzy adds attack; bulwark adds armor. Movement comes from
 * extra-charge (additive +N tiles) or forced-march (a separate
 * doubling flag exposed via `cardMovementMultiplier`). The shape
 * mirrors `ItemStatOffset` so call sites can stack item + card
 * offsets in the same lane (additive, before the multiplicative
 * posture/jelly/queen stack). */
export interface CardStatOffset {
  readonly attack: number;
  readonly armor: number;
  readonly extraMovement: number;
}

const ZERO_CARD_OFFSET: CardStatOffset = { attack: 0, armor: 0, extraMovement: 0 };

/** Round 25 — read the active card-buff offset off a party. Returns
 * the zero offset when no buffs are active. Combat / movement call
 * sites fold this into the per-unit stat lane the same way item
 * offsets do. */
export const partyCardOffset = (party: Party): CardStatOffset => {
  const buffs = party.cardBuffs;
  if (!buffs) return ZERO_CARD_OFFSET;
  return {
    attack: buffs.attackBonus,
    armor: buffs.armorBonus,
    extraMovement: buffs.extraMovement,
  };
};

/** Round 25 — true iff the party should get a second movement action
 * this turn (forced-march). Read once per turn in `engine/movement.ts`
 * to gate the bonus action. */
export const partyForcedMarch = (party: Party): boolean => party.cardBuffs?.forcedMarch === true;

/** A card template entry: pool id + base cost. */
export interface CardTemplate {
  readonly id: CardId;
  readonly cost: number;
  /** Short description for replay-event summaries. */
  readonly description: string;
}

/** Round 25 — fixed pool of 8 card templates. The deck draws 6 of
 * these into the market at scenario start; the remaining 2 sit in
 * `cardDeck` waiting to refill bought slots. */
export const CARD_POOL: readonly CardTemplate[] = [
  {
    id: 'extra-charge' as CardId,
    cost: 30,
    description: '+2 movement allowance for 3 turns',
  },
  {
    id: 'frenzy' as CardId,
    cost: 40,
    description: '+2 attack to all party units this turn',
  },
  {
    id: 'bulwark' as CardId,
    cost: 35,
    description: '+2 armor to all party units for 3 turns',
  },
  {
    id: 'mp-refresh' as CardId,
    cost: 50,
    description: 'Refill caster tier-2 MP slots',
  },
  {
    id: 'intel-burst' as CardId,
    cost: 25,
    description: 'Reveal all enemy party positions for 1 turn',
  },
  {
    id: 'quick-strike' as CardId,
    cost: 60,
    description: 'Deal 8 damage to a chosen enemy party',
  },
  {
    id: 'mass-heal' as CardId,
    cost: 45,
    description: 'Heal all party units by 4 hp',
  },
  {
    id: 'forced-march' as CardId,
    cost: 35,
    description: '2 movement actions this turn',
  },
];

/** Market size at scenario start. Re-filled lazily as cards are bought. */
export const MARKET_SIZE = 6;
/** Per-faction hand cap. Buys past this silently fail. */
export const HAND_CAP = 3;
/** Bonus duration for buff cards (extra-charge, bulwark). Frenzy uses 1. */
const BUFF_TURNS = 3;
const FRENZY_TURNS = 1;
const MP_REFRESH_TIER2 = 2;
const QUICK_STRIKE_DAMAGE = 8;
const MASS_HEAL_AMOUNT = 4;
const EXTRA_CHARGE_MOVEMENT = 2;
const FRENZY_ATTACK = 2;
const BULWARK_ARMOR = 2;

const findCardTemplate = (cardId: CardId): CardTemplate | undefined =>
  CARD_POOL.find((c) => c.id === cardId);

/** Lookup the cost of a card from the pool table. Returns undefined
 * for unknown ids. */
export const costForCard = (cardId: CardId): number | undefined => findCardTemplate(cardId)?.cost;

/**
 * Round 25 — Fisher-Yates shuffle of the full pool by a seeded RNG.
 * The first `MARKET_SIZE` ids go to the market; the remainder become
 * the deck (drawn from to refill bought slots). Returns both as
 * separate arrays. Pure helper; no state.
 */
export const shuffleDeck = (rng: Rng): readonly CardId[] => {
  const ids = CARD_POOL.map((c) => c.id);
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
};

export interface InitialMarket {
  readonly cardMarket: readonly { readonly cardId: CardId; readonly cost: number }[];
  readonly cardDeck: readonly CardId[];
}

/** Build the initial market + deck split from a seeded RNG fork. */
export const buildInitialMarket = (rng: Rng): InitialMarket => {
  const shuffled = shuffleDeck(rng);
  const market: { cardId: CardId; cost: number }[] = [];
  for (let i = 0; i < MARKET_SIZE && i < shuffled.length; i++) {
    const id = shuffled[i]!;
    const cost = costForCard(id);
    if (cost === undefined) continue;
    market.push({ cardId: id, cost });
  }
  const deck = shuffled.slice(MARKET_SIZE);
  return { cardMarket: market, cardDeck: deck };
};

const findLowestHpEnemyParty = (state: GameState, attackerFaction: Faction): Party | undefined => {
  let best: { party: Party; hp: number } | undefined;
  for (const party of state.parties.values()) {
    if (party.faction === attackerFaction) continue;
    if (party.faction === 'neutral') continue;
    let total = 0;
    for (const u of party.units) total += Math.max(0, u.currentHp);
    if (total <= 0) continue;
    if (best === undefined || total < best.hp || (total === best.hp && party.id < best.party.id)) {
      best = { party, hp: total };
    }
  }
  return best?.party;
};

const findLowestHpFriendlyParty = (state: GameState, faction: Faction): Party | undefined => {
  let best: { party: Party; hp: number; max: number } | undefined;
  for (const party of state.parties.values()) {
    if (party.faction !== faction) continue;
    let total = 0;
    let max = 0;
    for (const u of party.units) {
      total += Math.max(0, u.currentHp);
      const tmpl = state.unitTemplates.get(u.templateId);
      if (tmpl) max += tmpl.baseStats.hp;
    }
    if (total <= 0 || max <= 0) continue;
    const fraction = total / max;
    const bestFraction = best ? best.hp / best.max : Number.POSITIVE_INFINITY;
    if (
      best === undefined ||
      fraction < bestFraction ||
      (fraction === bestFraction && party.id < best.party.id)
    ) {
      best = { party, hp: total, max };
    }
  }
  return best?.party;
};

interface ApplyCardOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
  /** True iff the card actually fired (effect applied). False means the
   * card was a no-op (target missing, etc.) and should NOT be removed
   * from the hand by the caller's bookkeeping. */
  readonly fired: boolean;
  readonly summary: string;
}

const setCardBuffs = (party: Party, patch: Partial<NonNullable<Party['cardBuffs']>>): Party => {
  const current = party.cardBuffs ?? {
    attackBonus: 0,
    armorBonus: 0,
    extraMovement: 0,
    forcedMarch: false,
    bonusTurnsRemaining: 0,
  };
  return { ...party, cardBuffs: { ...current, ...patch } };
};

/**
 * Helper for the friendly-target buff cards (extra-charge / frenzy /
 * bulwark / forced-march / mp-refresh / mass-heal). Each card looks
 * up `partyId`, validates the faction match, mutates the party via
 * `mutate(target)`, and returns a uniform outcome. Centralizes the
 * "no friendly target" early-return + parties-map write so each card
 * arm is just a 2-line patch.
 */
const applyFriendlyMutation = (
  state: GameState,
  faction: Faction,
  partyId: PartyId | undefined,
  cardName: string,
  mutate: (target: Party) => { party: Party; summary: string },
): ApplyCardOutcome => {
  const target = partyId ? state.parties.get(partyId) : undefined;
  if (target?.faction !== faction) {
    return { state, events: [], fired: false, summary: `${cardName}: no friendly target` };
  }
  const { party: updated, summary } = mutate(target);
  const parties = new Map(state.parties);
  parties.set(target.id, updated);
  return { state: { ...state, parties }, events: [], fired: true, summary };
};

/**
 * Round 25 — apply a single card's effect against the working state.
 * Returns the mutated state, any subsidiary events (per-card type),
 * a `fired` flag (true when the effect resolved against a valid
 * target), and a short human-readable summary used in the
 * `card-played` replay event.
 *
 * Targeting rules per card:
 *   - extra-charge / frenzy / bulwark / forced-march / mass-heal:
 *     friendly target via `partyId`. If absent or invalid, the
 *     caller's heuristic should pick a fallback.
 *   - mp-refresh: friendly party with at least one caster (mpSlots
 *     unit). Refills tier-2 to MP_REFRESH_TIER2.
 *   - intel-burst: faction-wide reveal — no party target needed; we
 *     simply flag every fog tile as visible/seen. (For determinism
 *     the engine doesn't need to roll back the reveal — fog isn't
 *     consulted by combat math; it's a viewer/critic surface.)
 *   - quick-strike: enemy `targetPartyId`; fallback is the lowest-HP
 *     enemy party. Deals QUICK_STRIKE_DAMAGE distributed to the
 *     first living unit (front-row shape).
 */
export const applyCardEffect = (
  state: GameState,
  cardId: CardId,
  faction: Faction,
  opts: { partyId?: PartyId; targetPartyId?: PartyId },
): ApplyCardOutcome => {
  switch (cardId) {
    case 'extra-charge' as CardId:
      return applyFriendlyMutation(state, faction, opts.partyId, 'extra-charge', (target) => ({
        party: setCardBuffs(target, {
          extraMovement: EXTRA_CHARGE_MOVEMENT,
          bonusTurnsRemaining: Math.max(target.cardBuffs?.bonusTurnsRemaining ?? 0, BUFF_TURNS),
        }),
        summary: `+${String(EXTRA_CHARGE_MOVEMENT)} movement to ${String(target.id)} for ${String(BUFF_TURNS)} turns`,
      }));
    case 'frenzy' as CardId:
      return applyFriendlyMutation(state, faction, opts.partyId, 'frenzy', (target) => ({
        party: setCardBuffs(target, {
          attackBonus: (target.cardBuffs?.attackBonus ?? 0) + FRENZY_ATTACK,
          bonusTurnsRemaining: Math.max(target.cardBuffs?.bonusTurnsRemaining ?? 0, FRENZY_TURNS),
        }),
        summary: `+${String(FRENZY_ATTACK)} attack to ${String(target.id)} this turn`,
      }));
    case 'bulwark' as CardId:
      return applyFriendlyMutation(state, faction, opts.partyId, 'bulwark', (target) => ({
        party: setCardBuffs(target, {
          armorBonus: (target.cardBuffs?.armorBonus ?? 0) + BULWARK_ARMOR,
          bonusTurnsRemaining: Math.max(target.cardBuffs?.bonusTurnsRemaining ?? 0, BUFF_TURNS),
        }),
        summary: `+${String(BULWARK_ARMOR)} armor to ${String(target.id)} for ${String(BUFF_TURNS)} turns`,
      }));
    case 'forced-march' as CardId:
      return applyFriendlyMutation(state, faction, opts.partyId, 'forced-march', (target) => ({
        party: setCardBuffs(target, { forcedMarch: true }),
        summary: `forced march on ${String(target.id)}`,
      }));
    case 'mp-refresh' as CardId:
      return applyFriendlyMutation(state, faction, opts.partyId, 'mp-refresh', (target) => {
        const newUnits: Unit[] = target.units.map((u) => {
          if (!u.mpSlots) return u;
          return { ...u, mpSlots: { ...u.mpSlots, tier2: MP_REFRESH_TIER2 } };
        });
        return {
          party: { ...target, units: newUnits },
          summary: `tier-2 MP refilled on ${String(target.id)}`,
        };
      });
    case 'intel-burst' as CardId: {
      // Mark all fog tiles visible+seen. The reveal lasts until the
      // next fog update; combat doesn't gate on fog so the impact is
      // primarily a viewer/AI-input surface.
      const newFog = new Map(state.fog);
      for (const [k, t] of newFog) {
        newFog.set(k, { ...t, visible: true, seen: true });
      }
      return {
        state: { ...state, fog: newFog },
        events: [],
        fired: true,
        summary: 'enemy positions revealed for 1 turn',
      };
    }
    case 'quick-strike' as CardId: {
      const explicit = opts.targetPartyId ? state.parties.get(opts.targetPartyId) : undefined;
      const target =
        explicit && explicit.faction !== faction && explicit.faction !== 'neutral'
          ? explicit
          : findLowestHpEnemyParty(state, faction);
      if (!target) {
        return { state, events: [], fired: false, summary: 'quick-strike: no enemy target' };
      }
      // Distribute QUICK_STRIKE_DAMAGE across the front-most living
      // units (front-row shape). Apply to one unit at a time until
      // damage is exhausted or no living units remain.
      let remaining = QUICK_STRIKE_DAMAGE;
      const newUnits = target.units.map((u) => {
        if (remaining <= 0) return u;
        if (u.currentHp <= 0) return u;
        const dealt = Math.min(remaining, u.currentHp);
        remaining -= dealt;
        return { ...u, currentHp: u.currentHp - dealt };
      });
      const totalDealt = QUICK_STRIKE_DAMAGE - remaining;
      const events: ReplayEvent[] = [];
      for (let i = 0; i < newUnits.length; i++) {
        const before = target.units[i]!;
        const after = newUnits[i]!;
        if (before.currentHp > 0 && after.currentHp <= 0) {
          events.push({ kind: 'unit-died', turn: state.turn, tick: 0, unitId: after.id });
        }
      }
      const parties = new Map(state.parties);
      parties.set(target.id, {
        ...target,
        units: newUnits,
        leaderless: newUnits.every((u) => u.currentHp <= 0),
      });
      return {
        state: { ...state, parties },
        events,
        fired: true,
        summary: `${String(totalDealt)} damage to ${String(target.id)}`,
      };
    }
    case 'mass-heal' as CardId: {
      const fallback = opts.partyId ?? findLowestHpFriendlyParty(state, faction)?.id;
      return applyFriendlyMutation(state, faction, fallback, 'mass-heal', (target) => {
        const { units, totalHealed } = healUnits(target, state.unitTemplates, MASS_HEAL_AMOUNT);
        return {
          party: { ...target, units },
          summary: `${String(totalHealed)} hp healed on ${String(target.id)}`,
        };
      });
    }
    default:
      return { state, events: [], fired: false, summary: `unknown card ${String(cardId)}` };
  }
};

export interface BuyCardOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
  readonly bought: boolean;
}

/**
 * Round 25 — resolve a single buy-card order. Validation:
 *   - Card must be present in the market.
 *   - Faction must hold >= cost gold.
 *   - Faction's hand must have < HAND_CAP cards.
 * On success: deduct gold, append card to hand, refill the slot from
 * the deck, emit `card-bought` (+ `market-refreshed` when the deck
 * had a card to draw). On failure the order silently no-ops.
 */
export const buyCard = (
  state: GameState,
  faction: 'ant' | 'spider',
  cardId: CardId,
  turn: number,
  tick: () => number,
): BuyCardOutcome => {
  const market = state.cardMarket ?? [];
  const slotIndex = market.findIndex((m) => m.cardId === cardId);
  if (slotIndex < 0) return { state, events: [], bought: false };
  const slot = market[slotIndex]!;
  const gold = state.playerGold[faction];
  if (gold < slot.cost) return { state, events: [], bought: false };
  const hand = state.cardHand ?? { ant: [], spider: [] };
  const factionHand = faction === 'ant' ? hand.ant : hand.spider;
  if (factionHand.length >= HAND_CAP) return { state, events: [], bought: false };

  const newGold = gold - slot.cost;
  const playerGold =
    faction === 'ant'
      ? { ant: newGold, spider: state.playerGold.spider }
      : { ant: state.playerGold.ant, spider: newGold };
  const newFactionHand = [...factionHand, cardId];
  const newHand =
    faction === 'ant'
      ? { ant: newFactionHand, spider: hand.spider }
      : { ant: hand.ant, spider: newFactionHand };

  // Refill: draw the next card from the deck (if any) into the freed
  // market slot, preserving slot-index order.
  const deck = state.cardDeck ?? [];
  const events: ReplayEvent[] = [];
  let newMarket: { cardId: CardId; cost: number }[];
  let newDeck: CardId[];
  if (deck.length > 0) {
    const drawn = deck[0]!;
    const drawnCost = costForCard(drawn) ?? 0;
    newMarket = [
      ...market.slice(0, slotIndex),
      { cardId: drawn, cost: drawnCost },
      ...market.slice(slotIndex + 1),
    ];
    newDeck = deck.slice(1);
    events.push({
      kind: 'card-bought',
      turn,
      tick: tick(),
      faction,
      cardId,
      cost: slot.cost,
      newGold,
    });
    events.push({
      kind: 'market-refreshed',
      turn,
      tick: tick(),
      newCard: drawn,
      position: slotIndex,
    });
  } else {
    newMarket = [...market.slice(0, slotIndex), ...market.slice(slotIndex + 1)];
    newDeck = [];
    events.push({
      kind: 'card-bought',
      turn,
      tick: tick(),
      faction,
      cardId,
      cost: slot.cost,
      newGold,
    });
  }

  return {
    state: {
      ...state,
      playerGold,
      cardHand: newHand,
      cardMarket: newMarket,
      cardDeck: newDeck,
    },
    events,
    bought: true,
  };
};

export interface PlayCardOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
  readonly played: boolean;
}

/**
 * Round 25 — resolve a single play-card order. The card must be in
 * the faction's hand. On success the card is removed from the hand,
 * the effect is applied, and a `card-played` event fires. On no-op
 * (effect couldn't resolve a target), the card is STILL removed from
 * the hand — matches Risk 2210's "card commits regardless of impact"
 * shape and stops AI policies from spam-issuing the same play-order
 * across turns when the target is gone.
 */
export const playCard = (
  state: GameState,
  faction: 'ant' | 'spider',
  cardId: CardId,
  opts: { partyId?: PartyId; targetPartyId?: PartyId },
  turn: number,
  tick: () => number,
): PlayCardOutcome => {
  const hand = state.cardHand ?? { ant: [], spider: [] };
  const factionHand = faction === 'ant' ? hand.ant : hand.spider;
  const idx = factionHand.indexOf(cardId);
  if (idx < 0) return { state, events: [], played: false };
  const newFactionHand = [...factionHand.slice(0, idx), ...factionHand.slice(idx + 1)];
  const newHand =
    faction === 'ant'
      ? { ant: newFactionHand, spider: hand.spider }
      : { ant: hand.ant, spider: newFactionHand };
  const after = applyCardEffect(state, cardId, faction, opts);
  const events: ReplayEvent[] = [];
  events.push({
    kind: 'card-played',
    turn,
    tick: tick(),
    faction,
    cardId,
    ...(opts.partyId !== undefined ? { partyId: opts.partyId } : {}),
    ...(opts.targetPartyId !== undefined ? { targetPartyId: opts.targetPartyId } : {}),
    effectSummary: after.summary,
  });
  // Stamp engine ticks onto subsidiary events emitted by applyCardEffect
  // (e.g., quick-strike's unit-died has tick=0 placeholder).
  for (const e of after.events) {
    events.push({ ...e, tick: tick() });
  }
  return { state: { ...after.state, cardHand: newHand }, events, played: true };
};

/**
 * Round 25 — end-of-turn decay for card buffs. Frenzy (1-turn) drops
 * the attack bonus immediately; bulwark / extra-charge (3-turn)
 * decrement `bonusTurnsRemaining` by 1 and clear bonuses when it
 * hits 0. Forced-march clears unconditionally (single-turn). Returns
 * a new state only when at least one party's buffs changed (avoids
 * pointless allocation).
 *
 * Helper isolated so the end-of-turn module can call it without
 * knowing the specific shape of card buffs.
 */
export const decayCardBuffs = (state: GameState): GameState => {
  let changed = false;
  const next = new Map<PartyId, Party>();
  for (const [id, party] of state.parties) {
    if (!party.cardBuffs) {
      next.set(id, party);
      continue;
    }
    const remaining = party.cardBuffs.bonusTurnsRemaining;
    const newRemaining = Math.max(0, remaining - 1);
    if (newRemaining <= 0) {
      // Clear all buffs.
      const { cardBuffs: _drop, ...rest } = party;
      void _drop;
      next.set(id, rest);
      changed = true;
      continue;
    }
    next.set(id, {
      ...party,
      cardBuffs: { ...party.cardBuffs, bonusTurnsRemaining: newRemaining, forcedMarch: false },
    });
    changed = true;
  }
  return changed ? { ...state, parties: next } : state;
};

// Re-export for callers that need to count card-eligible casters.
export const hasCasterUnit = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  for (const u of party.units) {
    if (u.currentHp <= 0) continue;
    if (u.mpSlots) return true;
    const tmpl = templates.get(u.templateId);
    if (tmpl && tmpl.baseStats.intelligence >= 5) return true;
  }
  return false;
};

export interface CardOrderResolution {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

/**
 * Round 25 — scan every party's order queue for `buy-card` and
 * `play-card` orders, resolve them in queue order, and pop each from
 * its issuing party. Buy orders fire before play orders within a
 * single party so a buy-then-play in the same turn works.
 *
 * Determinism: parties are walked in their iteration order from
 * `state.parties`; orders within a party are walked left-to-right.
 * Both are stable across runs because `state.parties` is a Map
 * preserving insertion order.
 */
export const resolveCardOrders = (
  state: GameState,
  turn: number,
  tick: () => number,
): CardOrderResolution => {
  const events: ReplayEvent[] = [];
  let working = state;
  // Take a snapshot of the party ids up front; new parties created
  // mid-pass (none expected from card resolution today) won't be
  // visited.
  const partyIds = [...working.parties.keys()];
  for (const id of partyIds) {
    const party = working.parties.get(id);
    if (!party) continue;
    const orders = [...party.orders];
    const newOrders = orders.filter((o) => o.kind !== 'buy-card' && o.kind !== 'play-card');
    if (newOrders.length === orders.length) continue;
    // Update the issuing party's order list first so the resolver's
    // own state mutations don't accidentally re-visit popped orders.
    const newParties = new Map(working.parties);
    newParties.set(id, { ...party, orders: newOrders });
    working = { ...working, parties: newParties };
    // Now execute the popped orders in queue order.
    for (const order of orders) {
      if (order.kind === 'buy-card') {
        const out = buyCard(working, order.faction, order.cardId, turn, tick);
        working = out.state;
        events.push(...out.events);
      } else if (order.kind === 'play-card') {
        const out = playCard(
          working,
          order.faction,
          order.cardId,
          {
            ...(order.partyId !== undefined ? { partyId: order.partyId } : {}),
            ...(order.targetPartyId !== undefined ? { targetPartyId: order.targetPartyId } : {}),
          },
          turn,
          tick,
        );
        working = out.state;
        events.push(...out.events);
      }
    }
  }
  return { state: working, events };
};
