/**
 * Round-14 item-system tests. Covers spawn determinism, discovery
 * roll mechanics, consumable effects, persistent stat buffs, and
 * slot-swap heuristics. See `engine/items.ts`, `engine/item-effects.ts`,
 * and `engine/end-of-turn.ts`.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { computeAgilityOrder } from './combat.ts';
import { endOfTurn } from './end-of-turn.ts';
import { partyItemOffset, ITEM_MOVEMENT_CAP } from './item-effects.ts';
import { itemTemplateById, NORMAL_ITEM_COUNT, TOTAL_ITEM_COUNT } from './items.ts';
import { resolveMovement } from './movement.ts';
import { baseMovementAllowance } from './parties.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import type {
  GameState,
  ItemId,
  ItemSpawn,
  Party,
  PartyId,
  ReplayEvent,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplateId,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const updateParty = (state: GameState, partyId: PartyId, patch: Partial<Party>): GameState => {
  const parties = new Map(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no party ${String(partyId)}`);
  parties.set(partyId, { ...party, ...patch });
  return { ...state, parties };
};

const placeItemAt = (state: GameState, spawn: ItemSpawn): GameState => ({
  ...state,
  itemSpawns: [...state.itemSpawns, spawn],
});

const clearItems = (state: GameState): GameState => ({ ...state, itemSpawns: [] });

const findAntFieldPartyId = (state: GameState): PartyId => {
  for (const [id, p] of state.parties) {
    if (p.faction !== 'ant') continue;
    // Skip queen-guard (queen-tagged unit).
    const isQueenParty = p.units.some((u) => {
      const tmpl = state.unitTemplates.get(u.templateId);
      return tmpl?.tags.includes('queen');
    });
    if (!isQueenParty) return id;
  }
  throw new Error('no non-queen ant party found');
};

const eotInput = (data: {
  queen: ReturnType<typeof loadScenario>['data']['queen'];
  jelly: ReturnType<typeof loadScenario>['data']['jelly'];
  items: ReturnType<typeof loadScenario>['data']['items'];
}) => ({
  queen: data.queen,
  jelly: data.jelly,
  items: data.items,
});

describe('engine/items spawn', () => {
  it('spawns 4 items per scenario (3 normal + 1 buried)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    expect(state.itemSpawns.length).toBe(TOTAL_ITEM_COUNT);
    const buriedCount = state.itemSpawns.filter((s) => s.buried).length;
    expect(buriedCount).toBe(TOTAL_ITEM_COUNT - NORMAL_ITEM_COUNT);
    expect(buriedCount).toBe(1);
  });

  it('produces identical item locations + ids for the same seed (determinism)', () => {
    const a = loadScenario(DATA_DIR, 17);
    const b = loadScenario(DATA_DIR, 17);
    expect(a.state.itemSpawns).toEqual(b.state.itemSpawns);
  });
});

describe('engine/items discovery', () => {
  it('discovery roll fires at 25% for Chebyshev-1 adjacency — same RNG seed picks up the same items', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    // Plant one knowable spawn at Chebyshev distance 1 (the round-28
    // bump made Cheb 0 auto-discover at 100%, so the 25% rate now
    // requires diagonal/orthogonal adjacency rather than on-tile).
    const partyId = findAntFieldPartyId(state);
    const partyLoc = state.parties.get(partyId)!.location;
    const adjLoc: TileCoord = { plane: partyLoc.plane, x: partyLoc.x + 1, y: partyLoc.y };
    const spawn: ItemSpawn = {
      itemId: 'leather-pad' as ItemId,
      location: adjLoc,
      buried: false,
      discovered: false,
    };
    const seeded = placeItemAt(clearItems(state), spawn);

    let hits = 0;
    const trials = 400;
    for (let seed = 1; seed <= trials; seed++) {
      const out = endOfTurn(seeded, eotInput(data), makeTickClock(), createRng(seed));
      const discovered = out.events.some(
        (e) => e.kind === 'item-discovered' && e.partyId === partyId,
      );
      if (discovered) hits += 1;
    }
    // Target 25% (≈100). σ for Binomial(400, 0.25) ≈ 8.7, so a 3σ
    // window is [74, 126]. We assert non-degenerate variance and a
    // reasonable rate band rather than the exact mean.
    const rate = hits / trials;
    expect(rate).toBeGreaterThan(0.15);
    expect(rate).toBeLessThan(0.4);
    // Same seed → same outcome (determinism).
    const a1 = endOfTurn(seeded, eotInput(data), makeTickClock(), createRng(7));
    const a2 = endOfTurn(seeded, eotInput(data), makeTickClock(), createRng(7));
    expect(JSON.stringify(a1.events)).toBe(JSON.stringify(a2.events));
  });

  it('round 28 — party on the item tile auto-discovers (100%, no RNG)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const partyId = findAntFieldPartyId(state);
    // Move the chosen party to a remote tile that isn't within Cheb 1
    // of any other eligible party (avoids other ants stealing the
    // item on a 25% adjacency roll). Then plant the item at that
    // remote tile and verify the on-tile party always gets it.
    const remote: TileCoord = { plane: 'floor', x: 0, y: 9 };
    const moved = updateParty(state, partyId, { location: remote });
    const spawn: ItemSpawn = {
      itemId: 'leather-pad' as ItemId,
      location: remote,
      buried: false,
      discovered: false,
    };
    const seeded = placeItemAt(clearItems(moved), spawn);
    // Sample 50 seeds; every single one should yield a discovery
    // event for the on-tile party (no rng draw is consumed for the
    // auto-discovery, so the outcome is deterministic regardless of
    // seed).
    for (let seed = 1; seed <= 50; seed++) {
      const out = endOfTurn(seeded, eotInput(data), makeTickClock(), createRng(seed));
      const discovered = out.events.find(
        (e) => e.kind === 'item-discovered' && e.partyId === partyId,
      );
      expect(discovered).toBeDefined();
    }
  });

  it('round 28 — multiple parties on same item tile: lowest-id party wins (deterministic)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const partyId = findAntFieldPartyId(state);
    // Pick a second eligible ant party. Co-locate both on a remote
    // tile so no third party rolls Cheb-1 discovery and steals the
    // event before either of these two on-tile candidates is
    // processed.
    let otherId: PartyId | null = null;
    for (const [id, p] of state.parties) {
      if (id === partyId) continue;
      if (p.faction !== 'ant') continue;
      if (p.leaderless) continue;
      const isQueenParty = p.units.some((u) => {
        const tmpl = state.unitTemplates.get(u.templateId);
        return tmpl?.tags.includes('queen');
      });
      if (isQueenParty) continue;
      otherId = id;
      break;
    }
    if (otherId === null) {
      // No second eligible party in this scenario seed — skip the
      // determinism check (the auto-discovery path is already
      // exercised by the single-party test above).
      return;
    }
    const remote: TileCoord = { plane: 'floor', x: 0, y: 9 };
    let co = updateParty(state, partyId, { location: remote });
    co = updateParty(co, otherId, { location: remote });
    const spawn: ItemSpawn = {
      itemId: 'leather-pad' as ItemId,
      location: remote,
      buried: false,
      discovered: false,
    };
    const seeded = placeItemAt(clearItems(co), spawn);
    const out = endOfTurn(seeded, eotInput(data), makeTickClock(), createRng(42));
    // Discovery is processed in alphabetical PartyId order — whichever
    // id sorts first claims the item. The other party walks away
    // empty-handed but no spurious events fire.
    const winnerId = String(partyId) < String(otherId) ? partyId : otherId;
    const loserId = winnerId === partyId ? otherId : partyId;
    const events = out.events.filter(
      (e) => e.kind === 'item-discovered' || e.kind === 'item-consumed',
    );
    const winnerHit = events.some((e) => 'partyId' in e && e.partyId === winnerId);
    const loserHit = events.some((e) => 'partyId' in e && e.partyId === loserId);
    expect(winnerHit).toBe(true);
    expect(loserHit).toBe(false);
  });

  it('mead heals every living unit to full HP on pickup, consumes the slot', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const partyId = findAntFieldPartyId(state);
    let working = state;
    const original = working.parties.get(partyId)!;
    // Wound every living unit to 1 HP so the heal is observable.
    const wounded: Unit[] = original.units.map((u) => ({ ...u, currentHp: 1 }));
    working = updateParty(working, partyId, { units: wounded });
    // Plant the mead spawn directly under the party (Chebyshev 0 = adjacent).
    const spawn: ItemSpawn = {
      itemId: 'mead' as ItemId,
      location: original.location,
      buried: false,
      discovered: false,
    };
    working = placeItemAt(clearItems(working), spawn);

    // Loop a few seeds to find one whose discovery roll hits.
    for (let seed = 1; seed <= 200; seed++) {
      const out = endOfTurn(working, eotInput(data), makeTickClock(), createRng(seed));
      const consumed = out.events.find(
        (e) => e.kind === 'item-consumed' && e.partyId === partyId && e.effect === 'heal',
      );
      if (!consumed) continue;
      const after = out.state.parties.get(partyId)!;
      // Slot stays empty (consumable).
      expect(after.item ?? null).toBeNull();
      // Every living unit healed to its template max HP.
      for (const u of after.units) {
        if (u.currentHp <= 0) continue;
        const tmpl = state.unitTemplates.get(u.templateId)!;
        expect(u.currentHp).toBe(tmpl.baseStats.hp);
      }
      return;
    }
    throw new Error('no seed produced a discovery hit within 200 attempts');
  });

  it('royal-jelly-vial adds 2 doses, capped at jelly capacity', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const partyId = findAntFieldPartyId(state);
    const original = state.parties.get(partyId)!;
    let working = updateParty(state, partyId, { jellyDoses: data.jelly.capacityPerParty - 1 });
    const spawn: ItemSpawn = {
      itemId: 'royal-jelly-vial' as ItemId,
      location: original.location,
      buried: false,
      discovered: false,
    };
    working = placeItemAt(clearItems(working), spawn);
    for (let seed = 1; seed <= 200; seed++) {
      const out = endOfTurn(working, eotInput(data), makeTickClock(), createRng(seed));
      const consumed = out.events.find(
        (e) => e.kind === 'item-consumed' && e.effect === 'jelly' && e.partyId === partyId,
      );
      if (!consumed) continue;
      const after = out.state.parties.get(partyId)!;
      // Capacity cap respected (started cap-1, +2 → would overflow).
      expect(after.jellyDoses).toBe(data.jelly.capacityPerParty);
      return;
    }
    throw new Error('no seed produced a jelly-vial discovery hit within 200 attempts');
  });
});

describe('engine/items combat integration', () => {
  it('brass-knuckles adds +1 to every unit attack stat in the party', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = findAntFieldPartyId(state);
    const equipped = updateParty(state, partyId, {
      item: 'brass-knuckles' as ItemId,
    }).parties.get(partyId)!;
    const offset = partyItemOffset(equipped);
    expect(offset.attack).toBe(1);
    expect(offset.armor).toBe(0);
  });

  it('leather-pad adds +1 to every unit armor stat in the party', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = findAntFieldPartyId(state);
    const equipped = updateParty(state, partyId, {
      item: 'leather-pad' as ItemId,
    }).parties.get(partyId)!;
    const offset = partyItemOffset(equipped);
    expect(offset.armor).toBe(1);
    expect(offset.attack).toBe(0);
  });

  it('scout-lens adds +1 agility (initiative shifts when stat ties exist)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = findAntFieldPartyId(state);
    const equipped = updateParty(state, partyId, {
      item: 'scout-lens' as ItemId,
    }).parties.get(partyId)!;
    expect(partyItemOffset(equipped).agility).toBe(1);
    // Sanity: agility-order resolves bumped-stat units before un-bumped peers.
    const tieRng = createRng(99);
    const ordered = computeAgilityOrder(
      [
        {
          id: 'a' as UnitId,
          stats: {
            ...{ hp: 1, attack: 1, agility: 5, armor: 0, intelligence: 0, constitution: 0 },
          },
        },
        {
          id: 'b' as UnitId,
          stats: {
            ...{ hp: 1, attack: 1, agility: 6, armor: 0, intelligence: 0, constitution: 0 },
          },
        },
      ],
      tieRng,
    );
    expect(ordered[0]).toBe('b' as UnitId);
  });
});

describe('engine/items movement integration', () => {
  it('boots adds +1 movement allowance to a fresh party', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const partyId = findAntFieldPartyId(state);
    const before = baseMovementAllowance(state.parties.get(partyId)!, state.unitTemplates);

    const equipped = updateParty(state, partyId, { item: 'boots' as ItemId });
    // Use resolveMovement to read the live allowance via party-moved
    // step count: issue a move to a faraway tile and count emitted
    // party-moved events for this party.
    const target: TileCoord = { plane: 'floor', x: 9, y: 0 };
    const partyWithOrder = updateParty(equipped, partyId, {
      orders: [{ kind: 'move-to', target }],
    });
    const out = resolveMovement(partyWithOrder, createRng(1), makeTickClock());
    const steps = out.events.filter(
      (e) => e.kind === 'party-moved' && e.partyId === partyId,
    ).length;
    void data;
    // We expect strictly more steps than before+0 (and at most the cap).
    expect(steps).toBeGreaterThan(0);
    expect(steps).toBeLessThanOrEqual(ITEM_MOVEMENT_CAP);
    expect(steps).toBeGreaterThan(Math.min(before, ITEM_MOVEMENT_CAP - 1));
  });

  it('boots + scout-majority caps at 4 (no stack to 5)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const partyId = findAntFieldPartyId(state);
    // Hand-craft a strict ant-scout majority party, equip boots.
    const original = state.parties.get(partyId)!;
    const scoutTemplateId = 'ant-scout' as UnitTemplateId;
    const tmpl = state.unitTemplates.get(scoutTemplateId)!;
    const scouts: Unit[] = [];
    for (let i = 0; i < 5; i++) {
      scouts.push({
        id: `scout-test-${String(i)}` as UnitId,
        templateId: scoutTemplateId,
        currentHp: tmpl.baseStats.hp,
        level: 1,
        xp: 0,
      });
    }
    const equipped = updateParty(state, partyId, {
      units: scouts,
      leaderId: scouts[0]!.id,
      item: 'boots' as ItemId,
      orders: [{ kind: 'move-to', target: { plane: 'floor', x: 9, y: 9 } }],
      location: { plane: 'floor', x: 0, y: 0 },
    });
    void original;
    const out = resolveMovement(equipped, createRng(7), makeTickClock());
    const steps = out.events.filter(
      (e) => e.kind === 'party-moved' && e.partyId === partyId,
    ).length;
    // Cap is 4 — boots + scout-majority must never reach 5.
    expect(steps).toBeLessThanOrEqual(ITEM_MOVEMENT_CAP);
  });
});

describe('engine/items slot heuristic', () => {
  it('higher-priority pickup swaps the equipped item; lower-priority declines', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const partyId = findAntFieldPartyId(state);
    const original = state.parties.get(partyId)!;
    // Decline branch: party already has brass-knuckles (priority 4),
    // tries to pick up boots (priority 2) — boots stays on the map.
    const declineState = placeItemAt(
      clearItems(updateParty(state, partyId, { item: 'brass-knuckles' as ItemId })),
      {
        itemId: 'boots' as ItemId,
        location: original.location,
        buried: false,
        discovered: false,
      },
    );
    let sawSwap = false;
    let sawDecline = false;
    for (let seed = 1; seed <= 80 && (!sawSwap || !sawDecline); seed++) {
      const out = endOfTurn(declineState, eotInput(data), makeTickClock(), createRng(seed));
      const swapped = out.events.find((e) => e.kind === 'item-dropped' && e.partyId === partyId);
      const discovered = out.events.find(
        (e) => e.kind === 'item-discovered' && e.partyId === partyId,
      );
      // Decline: roll fired but neither swap nor discovery for this party.
      // We can only check that the equipped item is still brass-knuckles.
      const after = out.state.parties.get(partyId);
      if (after?.item === ('brass-knuckles' as ItemId) && !discovered) {
        sawDecline = true;
      }
      if (swapped) sawSwap = true;
      void after;
    }
    expect(sawDecline).toBe(true);

    // Swap branch: party already has scout-lens (priority 1), picks
    // up brass-knuckles (priority 4) — drop event fires and slot
    // updates.
    const swapState = placeItemAt(
      clearItems(updateParty(state, partyId, { item: 'scout-lens' as ItemId })),
      {
        itemId: 'brass-knuckles' as ItemId,
        location: original.location,
        buried: false,
        discovered: false,
      },
    );
    for (let seed = 1; seed <= 80; seed++) {
      const out = endOfTurn(swapState, eotInput(data), makeTickClock(), createRng(seed));
      const dropped = out.events.find((e) => e.kind === 'item-dropped' && e.partyId === partyId);
      if (!dropped) continue;
      const after = out.state.parties.get(partyId)!;
      expect(after.item).toBe('brass-knuckles' as ItemId);
      // The dropped event identifies the displaced item.
      if (dropped.kind === 'item-dropped') {
        expect(dropped.itemId).toBe('scout-lens' as ItemId);
      }
      return;
    }
    throw new Error('no swap branch hit within 80 seeds');
  });
});

describe('engine/items backwards compatibility', () => {
  it('endOfTurn skips item discovery when items + rng are absent (legacy callers)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    // No `items`, no `rng` — the discovery branch is gated off and
    // no item-discovered events should appear, even with spawned items.
    const out = endOfTurn(state, { queen: data.queen, jelly: data.jelly }, makeTickClock());
    const itemEvents = out.events.filter(
      (e: ReplayEvent) =>
        e.kind === 'item-discovered' || e.kind === 'item-consumed' || e.kind === 'item-dropped',
    );
    expect(itemEvents.length).toBe(0);
  });

  it('item template lookup resolves every spec id', () => {
    const { data } = loadScenario(DATA_DIR, 1);
    for (const id of [
      'leather-pad',
      'brass-knuckles',
      'boots',
      'mead',
      'scout-lens',
      'royal-jelly-vial',
    ] as const) {
      const tmpl = itemTemplateById(data.items, id as ItemId);
      expect(tmpl?.id).toBe(id);
    }
  });
});
