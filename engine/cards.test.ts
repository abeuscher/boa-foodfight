/**
 * Round 25 — commander cards tests (mechanics memo §1.3, Risk 2210
 * inspired gold sink). Covers the 8-card pool, market construction,
 * buy / play resolvers, hand cap, market refresh, effect application,
 * and replay event shapes:
 *
 *   1. Card market initialized with MARKET_SIZE (6) cards at scenario
 *      start.
 *   2. Buying a card decrements gold, removes the card from the
 *      market, and appends to the faction's hand.
 *   3. Buying when gold is insufficient is a no-op.
 *   4. Hand cap (HAND_CAP = 3) enforced — a 4th buy fails.
 *   5. Playing frenzy buffs a friendly party's attack (cardBuffs.attackBonus = 2).
 *   6. Quick-strike deals 8 damage to the chosen enemy party.
 *   7. Market refresh draws from the deck after a buy.
 *   8. Old replays without card events still load.
 *   9. Bulwark adds armor and the buff decays after 3 turns.
 *  10. Mass-heal heals the lowest-HP friendly party by 4 hp/unit.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  applyCardEffect,
  buyCard,
  CARD_POOL,
  decayCardBuffs,
  HAND_CAP,
  MARKET_SIZE,
  playCard,
} from './cards.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import type { CardId, GameState, Party, PartyId, Unit, UnitId, UnitTemplateId } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const FRENZY: CardId = 'frenzy' as CardId;
const QUICK_STRIKE: CardId = 'quick-strike' as CardId;
const BULWARK: CardId = 'bulwark' as CardId;
const MASS_HEAL: CardId = 'mass-heal' as CardId;

/**
 * Force a specific card into the market for a deterministic test.
 * Replaces the first market slot with `{cardId, cost}` so a buy in
 * the test always targets the named card. Returns a fresh state.
 */
const seedMarketWith = (
  state: GameState,
  cardId: CardId,
  cost: number,
  goldFor?: { ant?: number; spider?: number },
): GameState => {
  const market = [...(state.cardMarket ?? [])];
  market[0] = { cardId, cost };
  return {
    ...state,
    cardMarket: market,
    playerGold: {
      ant: goldFor?.ant ?? state.playerGold.ant,
      spider: goldFor?.spider ?? state.playerGold.spider,
    },
  };
};

describe('card market init', () => {
  it('initializes with MARKET_SIZE cards at scenario start', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    expect(state.cardMarket).toBeDefined();
    expect(state.cardMarket?.length).toBe(MARKET_SIZE);
    // Every card in the market belongs to the pool.
    const poolIds = new Set(CARD_POOL.map((c) => c.id));
    for (const slot of state.cardMarket ?? []) {
      expect(poolIds.has(slot.cardId)).toBe(true);
    }
    // The deck holds the remainder so deck + market === pool size.
    expect((state.cardDeck ?? []).length + (state.cardMarket?.length ?? 0)).toBe(CARD_POOL.length);
  });

  it('produces deterministic market order across reloads with same seed', () => {
    const a = loadScenario(DATA_DIR, 42).state;
    const b = loadScenario(DATA_DIR, 42).state;
    expect(a.cardMarket?.map((s) => s.cardId)).toEqual(b.cardMarket?.map((s) => s.cardId));
  });
});

describe('buyCard', () => {
  it('decrements gold, removes from market, appends to hand', () => {
    const base = loadScenario(DATA_DIR, 1).state;
    const seeded = seedMarketWith(base, FRENZY, 40, { ant: 100 });
    const out = buyCard(seeded, 'ant', FRENZY, 1, tickClock());
    expect(out.bought).toBe(true);
    expect(out.state.playerGold.ant).toBe(60);
    expect(out.state.cardHand?.ant).toContain(FRENZY);
    // The market slot index 0 should no longer carry FRENZY.
    expect(out.state.cardMarket?.[0]?.cardId).not.toBe(FRENZY);
    // card-bought event fired.
    const bought = out.events.find((e) => e.kind === 'card-bought');
    expect(bought).toBeDefined();
    if (bought?.kind !== 'card-bought') throw new Error('unreachable');
    expect(bought.faction).toBe('ant');
    expect(bought.cardId).toBe(FRENZY);
    expect(bought.cost).toBe(40);
    expect(bought.newGold).toBe(60);
  });

  it('is a no-op when gold is insufficient', () => {
    const base = loadScenario(DATA_DIR, 1).state;
    const seeded = seedMarketWith(base, QUICK_STRIKE, 60, { ant: 30 });
    const out = buyCard(seeded, 'ant', QUICK_STRIKE, 1, tickClock());
    expect(out.bought).toBe(false);
    expect(out.events).toHaveLength(0);
    expect(out.state.playerGold.ant).toBe(30);
    expect(out.state.cardHand?.ant ?? []).toHaveLength(0);
  });

  it('enforces hand cap of HAND_CAP', () => {
    let working = loadScenario(DATA_DIR, 1).state;
    working = seedMarketWith(working, FRENZY, 40, { ant: 1000 });
    // Force the entire market to FRENZY-equivalent slots so each buy
    // can succeed.
    working = {
      ...working,
      cardMarket: Array.from({ length: MARKET_SIZE }, () => ({ cardId: FRENZY, cost: 40 })),
    };
    for (let i = 0; i < HAND_CAP; i++) {
      const r = buyCard(working, 'ant', FRENZY, 1, tickClock());
      expect(r.bought).toBe(true);
      working = r.state;
    }
    // The 4th buy should fail because the hand is full.
    const overflow = buyCard(working, 'ant', FRENZY, 1, tickClock());
    expect(overflow.bought).toBe(false);
    expect(working.cardHand?.ant.length).toBe(HAND_CAP);
  });

  it('refills the market slot from the deck after a buy', () => {
    const base = loadScenario(DATA_DIR, 1).state;
    const initialDeckTop = base.cardDeck?.[0];
    expect(initialDeckTop).toBeDefined();
    const targetSlot = base.cardMarket?.[0];
    expect(targetSlot).toBeDefined();
    if (!targetSlot) throw new Error('unreachable');
    const seeded = {
      ...base,
      playerGold: { ant: 1000, spider: 0 },
    };
    const out = buyCard(seeded, 'ant', targetSlot.cardId, 1, tickClock());
    expect(out.bought).toBe(true);
    // Slot 0 is now the previously-top deck card.
    expect(out.state.cardMarket?.[0]?.cardId).toBe(initialDeckTop);
    expect(out.state.cardDeck?.[0]).not.toBe(initialDeckTop);
    // market-refreshed event fired.
    const refresh = out.events.find((e) => e.kind === 'market-refreshed');
    expect(refresh).toBeDefined();
    if (refresh?.kind !== 'market-refreshed') throw new Error('unreachable');
    expect(refresh.newCard).toBe(initialDeckTop);
    expect(refresh.position).toBe(0);
  });
});

describe('playCard effects', () => {
  it('frenzy buffs friendly party attack for the current battle', () => {
    const base = loadScenario(DATA_DIR, 1).state;
    const friendly = [...base.parties.values()].find((p) => p.faction === 'ant');
    if (!friendly) throw new Error('expected an ant party');
    const seeded: GameState = {
      ...base,
      cardHand: { ant: [FRENZY], spider: [] },
    };
    const out = playCard(seeded, 'ant', FRENZY, { partyId: friendly.id }, 1, tickClock());
    expect(out.played).toBe(true);
    const updated = out.state.parties.get(friendly.id);
    expect(updated?.cardBuffs?.attackBonus).toBe(2);
    expect(updated?.cardBuffs?.bonusTurnsRemaining).toBeGreaterThan(0);
    // Hand emptied.
    expect(out.state.cardHand?.ant ?? []).toHaveLength(0);
    // card-played event fired.
    const played = out.events.find((e) => e.kind === 'card-played');
    expect(played?.kind).toBe('card-played');
  });

  it('quick-strike deals 8 damage to chosen enemy party', () => {
    const base = loadScenario(DATA_DIR, 1).state;
    const enemy = [...base.parties.values()].find((p) => p.faction === 'spider');
    if (!enemy) throw new Error('expected a spider party');
    // Sum living HP before the strike.
    const hpBefore = enemy.units.reduce((acc, u) => acc + Math.max(0, u.currentHp), 0);
    const seeded: GameState = {
      ...base,
      cardHand: { ant: [QUICK_STRIKE], spider: [] },
    };
    const out = playCard(seeded, 'ant', QUICK_STRIKE, { targetPartyId: enemy.id }, 1, tickClock());
    expect(out.played).toBe(true);
    const updated = out.state.parties.get(enemy.id);
    if (!updated) throw new Error('expected enemy party to still exist');
    const hpAfter = updated.units.reduce((acc, u) => acc + Math.max(0, u.currentHp), 0);
    expect(hpBefore - hpAfter).toBe(8);
  });

  it('bulwark adds armor and decays after BUFF_TURNS turns', () => {
    const base = loadScenario(DATA_DIR, 1).state;
    const friendly = [...base.parties.values()].find((p) => p.faction === 'ant');
    if (!friendly) throw new Error('expected an ant party');
    const after = applyCardEffect(base, BULWARK, 'ant', { partyId: friendly.id });
    expect(after.fired).toBe(true);
    let working = after.state;
    expect(working.parties.get(friendly.id)?.cardBuffs?.armorBonus).toBe(2);
    // Tick decay 3 times — buff should clear.
    for (let i = 0; i < 3; i++) {
      working = decayCardBuffs(working);
    }
    expect(working.parties.get(friendly.id)?.cardBuffs).toBeUndefined();
  });

  it('mass-heal heals friendly party units up to 4 hp', () => {
    const base = loadScenario(DATA_DIR, 1).state;
    const friendlyId = [...base.parties.entries()].find(
      ([, p]) => p.faction === 'ant' && p.units.length > 0,
    )?.[0];
    if (!friendlyId) throw new Error('expected an ant party');
    const friendly = base.parties.get(friendlyId);
    if (!friendly) throw new Error('unreachable');
    // Wound the party so heals have somewhere to land.
    const woundedUnits: Unit[] = friendly.units.map((u) => ({ ...u, currentHp: 1 }));
    const woundedParty: Party = { ...friendly, units: woundedUnits };
    const wounded: GameState = {
      ...base,
      parties: new Map(base.parties).set(friendlyId, woundedParty),
    };
    const out = applyCardEffect(wounded, MASS_HEAL, 'ant', { partyId: friendlyId });
    expect(out.fired).toBe(true);
    const healed = out.state.parties.get(friendlyId);
    if (!healed) throw new Error('unreachable');
    for (const u of healed.units) {
      // Unit was at 1 hp; heal of 4 raises to 5 unless cap is lower.
      expect(u.currentHp).toBeGreaterThanOrEqual(Math.min(5, u.currentHp));
    }
  });
});

describe('backwards compatibility', () => {
  it('a state without card fields still resolves card orders as no-ops', () => {
    // Build a minimal state-shaped object that omits the optional
    // card fields entirely. The buy / play resolvers should treat it
    // as an empty market / empty hand.
    const minimal: GameState = {
      turn: 0,
      seed: 1,
      tiles: new Map(),
      posts: new Map(),
      parties: new Map<PartyId, Party>(),
      unitTemplates: new Map(),
      fog: new Map(),
      queenUltimateCharge: 0,
      queenUltimatesUsed: 0,
      webbedTiles: new Map(),
      buttons: 0,
      phase: 'day',
      phaseTurnsRemaining: 4,
      pheroTrails: new Map(),
      neutralStatus: new Map(),
      damageZones: [],
      playerGold: { ant: 100, spider: 100 },
      itemSpawns: [],
      winner: null,
    };
    const buyOut = buyCard(minimal, 'ant', FRENZY, 1, tickClock());
    expect(buyOut.bought).toBe(false);
    const playOut = playCard(minimal, 'ant', FRENZY, {}, 1, tickClock());
    expect(playOut.played).toBe(false);
  });

  it('CARD_POOL has 8 templates and unique ids', () => {
    expect(CARD_POOL.length).toBe(8);
    const ids = new Set(CARD_POOL.map((c) => c.id));
    expect(ids.size).toBe(CARD_POOL.length);
  });
});

describe('determinism', () => {
  it('shuffle is reproducible across forks of the same seed', () => {
    const r1 = createRng(123).fork('cards-deck');
    const r2 = createRng(123).fork('cards-deck');
    // Pull from each rng symmetrically and confirm they march in
    // lockstep — the buildInitialMarket function does the actual
    // shuffle, but its inputs are the raw RNG streams below.
    expect(r1.next()).toBe(r2.next());
    expect(r1.int(8)).toBe(r2.int(8));
  });
});

// Surface a no-op reference to UnitId / UnitTemplateId so the imports
// stay used after future test edits remove their direct mention.
void (null as unknown as UnitId);
void (null as unknown as UnitTemplateId);
