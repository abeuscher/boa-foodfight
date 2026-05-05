/**
 * End-of-turn resolution for Food Fight Level 1.
 *
 * Pure transformation. Runs after movement and battle resolution. In order:
 *   1. Heal units on friendly POSTs (capped at template max HP).
 *   2. Increment Queen ultimate charge (capped at chargeMax); emit charge event.
 *   3. Accrue Royal Jelly doses at the Queen's home base (capped per-party).
 *   4. Produce a new ant unit at the configured cadence, if slot capacity allows.
 *   5. Check loss (Queen dead) before victory (spider-web owned by ants).
 *   6. Increment turn counter and emit turn-start for the new turn.
 *
 * Determinism: no randomness. The `tick()` callback is the only side-effect-ish
 * surface and is expected to come from the shared replay tick clock.
 */

import { sameCoord } from './coord.ts';
import type { JellyFile, QueenFile } from './schemas/index.ts';
import type {
  Faction,
  GameState,
  Party,
  PartyId,
  Post,
  PostId,
  ReplayEvent,
  Unit,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

export interface EndOfTurnInput {
  /** Tuning data, sourced from data/level-1/queen.json and jelly.json. */
  readonly queen: QueenFile;
  readonly jelly: JellyFile;
}

export interface EndOfTurnOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

const QUEEN_TAG = 'queen';
const SPIDER_WEB_POST_ID = 'spider-web' as PostId;
const QUEEN_PARTY_SLOT_CAPACITY = 12;

/** Sum of slotCost across all units in a party, by their template. */
const usedSlots = (party: Party, templates: ReadonlyMap<UnitTemplateId, UnitTemplate>): number => {
  let total = 0;
  for (const u of party.units) {
    const tmpl = templates.get(u.templateId);
    if (tmpl) total += tmpl.slotCost;
  }
  return total;
};

const isAntQueenUnit = (
  unit: Unit,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  const tmpl = templates.get(unit.templateId);
  if (!tmpl) return false;
  return tmpl.faction === 'ant' && tmpl.tags.includes(QUEEN_TAG);
};

const findQueenParty = (state: GameState): Party | undefined => {
  for (const party of state.parties.values()) {
    if (party.units.some((u) => isAntQueenUnit(u, state.unitTemplates))) {
      return party;
    }
  }
  return undefined;
};

const findQueenUnit = (state: GameState): Unit | undefined => {
  for (const party of state.parties.values()) {
    for (const u of party.units) {
      if (isAntQueenUnit(u, state.unitTemplates)) return u;
    }
  }
  return undefined;
};

/** Find a friendly POST occupied by `party`, if any. */
const friendlyPostUnder = (party: Party, posts: ReadonlyMap<PostId, Post>): Post | undefined => {
  for (const post of posts.values()) {
    if (post.owner === party.faction && sameCoord(post.location, party.location)) {
      return post;
    }
  }
  return undefined;
};

const healParty = (
  party: Party,
  amount: number,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): Party => {
  const healed = party.units.map((u) => {
    const tmpl = templates.get(u.templateId);
    if (!tmpl) return u;
    const max = tmpl.baseStats.hp;
    if (u.currentHp <= 0 || u.currentHp >= max) return u;
    const next = Math.min(max, u.currentHp + amount);
    return { ...u, currentHp: next };
  });
  return { ...party, units: healed };
};

const applyHealing = (state: GameState): GameState => {
  const next = new Map<PartyId, Party>();
  for (const [id, party] of state.parties) {
    const post = friendlyPostUnder(party, state.posts);
    if (post && post.healingRate > 0) {
      next.set(id, healParty(party, post.healingRate, state.unitTemplates));
    } else {
      next.set(id, party);
    }
  }
  return { ...state, parties: next };
};

const applyUltimateCharge = (
  state: GameState,
  queen: QueenFile,
): { state: GameState; charge: number } => {
  const charge = Math.min(
    queen.ultimate.chargeMax,
    state.queenUltimateCharge + queen.ultimate.chargePerTurn,
  );
  return { state: { ...state, queenUltimateCharge: charge }, charge };
};

const applyJellyProduction = (state: GameState, jelly: JellyFile): GameState => {
  const queenParty = findQueenParty(state);
  if (!queenParty) return state;
  const next = Math.min(jelly.capacityPerParty, queenParty.jellyDoses + jelly.productionPerTurn);
  if (next === queenParty.jellyDoses) return state;
  const updated: Party = { ...queenParty, jellyDoses: next };
  const parties = new Map(state.parties);
  parties.set(queenParty.id, updated);
  return { ...state, parties };
};

const applyUnitProduction = (state: GameState, queen: QueenFile, nextTurn: number): GameState => {
  const cadence = queen.production.turnsPerUnit;
  if (nextTurn <= 0 || nextTurn % cadence !== 0) return state;

  const queenParty = findQueenParty(state);
  if (!queenParty) return state;

  const templateId = queen.production.producedTemplateId as UnitTemplateId;
  const tmpl = state.unitTemplates.get(templateId);
  if (!tmpl) return state;

  const used = usedSlots(queenParty, state.unitTemplates);
  if (used + tmpl.slotCost > QUEEN_PARTY_SLOT_CAPACITY) return state;

  const newUnit: Unit = {
    id: `u-prod-${String(nextTurn)}-${templateId}` as UnitId,
    templateId,
    currentHp: tmpl.baseStats.hp,
    level: 1,
    xp: 0,
  };
  const updated: Party = { ...queenParty, units: [...queenParty.units, newUnit] };
  const parties = new Map(state.parties);
  parties.set(queenParty.id, updated);
  return { ...state, parties };
};

/** Determine winner. Loss is checked before victory. Returns null if neither. */
const checkWinner = (state: GameState): Faction | null => {
  const queenUnit = findQueenUnit(state);
  if (!queenUnit || queenUnit.currentHp <= 0) return 'spider';
  const web = state.posts.get(SPIDER_WEB_POST_ID);
  if (web?.owner === 'ant') return 'ant';
  return null;
};

export const endOfTurn = (
  state: GameState,
  input: EndOfTurnInput,
  tick: () => number,
): EndOfTurnOutcome => {
  const events: ReplayEvent[] = [];
  const currentTurn = state.turn;

  // 1. Healing.
  let working = applyHealing(state);

  // 2. Queen ultimate charge.
  const chargeStep = applyUltimateCharge(working, input.queen);
  working = chargeStep.state;
  events.push({
    kind: 'queen-ultimate-charged',
    turn: currentTurn,
    tick: tick(),
    charge: chargeStep.charge,
  });

  // 3. Royal Jelly production (silent).
  working = applyJellyProduction(working, input.jelly);

  // 4. Queen unit production (cadence keyed to the NEW turn number).
  const nextTurn = currentTurn + 1;
  working = applyUnitProduction(working, input.queen, nextTurn);

  // 5. Win/loss check (loss before victory).
  const winner = checkWinner(working);
  if (winner) {
    working = { ...working, winner };
    events.push({
      kind: 'scenario-end',
      turn: currentTurn,
      tick: tick(),
      winner,
    });
  }

  // 6. Increment turn counter; emit turn-start for the new turn.
  working = { ...working, turn: nextTurn };
  events.push({ kind: 'turn-start', turn: nextTurn, tick: tick() });

  return { state: working, events };
};
