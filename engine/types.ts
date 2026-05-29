/**
 * Core types for Food Fight.
 *
 * This module is the type contract every other engine module imports from.
 * It defines no behavior — only shapes. Imports from this module are allowed
 * from anywhere; exports back into it are not.
 */

// ---------------------------------------------------------------------------
// Identifiers (branded strings to prevent cross-id mistakes)
// ---------------------------------------------------------------------------

export type UnitId = string & { readonly __brand: 'UnitId' };
export type PartyId = string & { readonly __brand: 'PartyId' };
export type PostId = string & { readonly __brand: 'PostId' };
export type AbilityId = string & { readonly __brand: 'AbilityId' };
export type UnitTemplateId = string & { readonly __brand: 'UnitTemplateId' };
/** Round 14 — items. Identifies one of the templates in items.json. */
export type ItemId = string & { readonly __brand: 'ItemId' };
/**
 * Round 25 — commander cards (mechanics memo §1.3, Risk 2210 inspired
 * gold sink). Identifies one of the card templates in `engine/cards.ts`
 * (`CARD_POOL`). Cards live in two places: the public `cardMarket`
 * (deterministic shop visible to both factions) and per-faction
 * `cardHand` slots (cap 3) until played.
 */
export type CardId = string & { readonly __brand: 'CardId' };

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export type Plane = 'floor' | 'ceiling' | 'north-wall' | 'south-wall' | 'east-wall' | 'west-wall';
export type Faction = 'ant' | 'spider' | 'neutral';

/**
 * Per-scenario win/loss objective. Loaded from scenario data (optional;
 * a scenario data set lacking it defaults to the L1 capture-the-web
 * objective, keeping L1 byte-identical). Consumed by `checkWinner`
 * (end-of-turn) which dispatches on `.kind`.
 *
 *  - `capture-post`: the historical L1 objective. The ants win when
 *    `postId` is ant-owned. Loss checks (queen dead / field force
 *    wiped) plus the round-19 timeout score-resolution are unchanged.
 *  - `escort`: the L2 (Pipe) objective. The ants win when a *living*
 *    unit of `escortUnitTemplateId` sits on the tile of `exitPostId`.
 *    The ants lose if every `escortUnitTemplateId` unit is dead OR the
 *    ant queen is dead. Timeout (turn cap) is an ant loss — the escort
 *    failed to make it through.
 *  - `eradicate`: the L6 (Stairs) objective. The ants win when every
 *    spider party has zero living units. Loss checks mirror
 *    `capture-post` (queen dead / field force wiped). Timeout (turn
 *    cap) is an ant loss — the spiders were not hunted down in time.
 *  - `recruit-count`: the L8 (Attic) objective. The ants win when at
 *    least `target` distinct ant-faction parties each hold ≥1 living
 *    unit of `unitTemplateId` (recruited cockroaches). Dual loss
 *    (§4.3.3): the ant queen dying, OR no living ant unit retaining
 *    the `recruit` ability (all recruiters dead → unreachable).
 *    Timeout (turn cap) is an ant loss — too few were recruited.
 */
export type VictoryCondition =
  | { readonly kind: 'capture-post'; readonly postId: PostId }
  | {
      readonly kind: 'escort';
      readonly escortUnitTemplateId: UnitTemplateId;
      readonly exitPostId: PostId;
    }
  | { readonly kind: 'eradicate' }
  | {
      readonly kind: 'recruit-count';
      readonly target: number;
      readonly unitTemplateId: UnitTemplateId;
    };

/**
 * The L1-equivalent default applied when scenario data omits
 * `victoryCondition`. Reproduces the historical hardcoded behavior
 * exactly (ants win on owning `spider-web`).
 */
export const DEFAULT_VICTORY_CONDITION: VictoryCondition = {
  kind: 'capture-post',
  postId: 'spider-web' as PostId,
};

export interface TileCoord {
  readonly plane: Plane;
  readonly x: number;
  readonly y: number;
}

export type TerrainKind = 'open' | 'wet' | 'path' | 'obstacle' | 'hazard';

export interface Terrain {
  readonly kind: TerrainKind;
  readonly movementCost: number;
  readonly defenseModifier: number;
  readonly hazardDamage?: number;
  readonly groundPathBonus?: number;
}

export interface Tile {
  readonly coord: TileCoord;
  readonly terrain: Terrain;
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export type UnitSize = 'small' | 'medium' | 'large' | 'huge';
export type MovementMode = 'ground' | 'climbing' | 'flying' | 'restricted';

export interface Stats {
  readonly hp: number;
  readonly attack: number;
  readonly agility: number;
  readonly armor: number;
  readonly intelligence: number;
  readonly constitution: number;
}

/**
 * Per-plane offset to a unit's combat math. The attacker's plane
 * (the battle tile's plane) selects the row applied to both sides:
 * the `attack` of the attacker's affinity row stacks onto its
 * effective attack, the `armor` of the defender's affinity row stacks
 * onto its effective armor. Wall planes (north/south/east/west) all
 * use the same `wall` row.
 */
export interface PlaneAffinityRow {
  readonly attack: number;
  readonly armor: number;
}

export interface PlaneAffinity {
  readonly floor: PlaneAffinityRow;
  readonly ceiling: PlaneAffinityRow;
  readonly wall: PlaneAffinityRow;
}

export interface UnitTemplate {
  readonly id: UnitTemplateId;
  readonly name: string;
  readonly faction: Faction;
  readonly size: UnitSize;
  readonly slotCost: number;
  readonly movement: MovementMode;
  readonly baseStats: Stats;
  readonly abilities: readonly AbilityId[];
  readonly tags: readonly string[];
  readonly planeAffinity: PlaneAffinity;
}

/**
 * Round 21 — tiered MP pool (mechanics memo §1.1, FF3 magic-tier shape).
 * Each caster-eligible unit (template intelligence ≥ 5 OR tag `'caster'`)
 * is initialized at scenario start with `{ tier1: 4, tier2: 2, tier3: 1 }`.
 * Each ability cast decrements the slot for its declared tier; when the
 * caster has 0 slots at the ability's tier the cast silently fails (no
 * event, no effect) — same back-pressure shape as the old `uses: N` cap.
 *
 * Higher tiers cannot drain lower tiers (no spillover): a caster sitting
 * on 0 tier-3 slots cannot fire a tier-3 ability even if tier-1 and
 * tier-2 are full. The `uses: N` per-ability cap still applies on top
 * of MP — `spawn-spiderlings` is `uses: 1` AND tier 3, so the caster
 * fires it once per scenario AND consumes a tier-3 slot.
 *
 * Non-caster units don't carry an MpSlots field (undefined). Their
 * tier-1 abilities (`brace`, etc) fire freely without consuming a pool.
 */
export interface MpSlots {
  readonly tier1: number;
  readonly tier2: number;
  readonly tier3: number;
}

export interface Unit {
  readonly id: UnitId;
  readonly templateId: UnitTemplateId;
  readonly currentHp: number;
  readonly level: number;
  readonly xp: number;
  /** AbilityIds this unit has consumed in the current scenario. Used to
   * gate one-shot abilities like `volley` and `mend`. Absent or empty
   * means no abilities have fired yet. */
  readonly usedAbilities?: readonly AbilityId[];
  /**
   * Round 21 — per-unit tiered MP pool (mechanics memo §1.1). Set on
   * caster-eligible units at scenario start (`{4, 2, 1}`); undefined
   * for non-casters. Decremented per ability cast; the caster cannot
   * cast an ability whose tier slot is already 0.
   */
  readonly mpSlots?: MpSlots;
  /**
   * Round 24 — venom-storm combo debuff (mechanics memo §1.2). When
   * a venom-storm combo lands on the unit's party, every member is
   * tagged with `tangleTurnsRemaining = durationTurns` (2 by default
   * — matches the source `web-tangle` ability's `durationTurns`
   * param). End-of-turn decrements; reaches 0 → the field is dropped
   * on the next turn's working state. The tag mirrors web-tangle's
   * intent (movement + attack penalty) but doesn't yet alter combat
   * math — the engine surface is the per-unit field plus the
   * `combo-fired` event with `debuffApplied: 'venom-storm'`. Field is
   * optional / absent for unaffected units.
   */
  readonly tangleTurnsRemaining?: number;
  /**
   * Round 26 — charisma-gated promotion (mechanics memo §1.4, Ogre
   * Battle inspired). Per-unit dynamic stat (range [0, 100]) that
   * rises and falls based on the unit's engagement choices in
   * battle: +5 for engaging a larger party (underdog), +1 for
   * parity, -3 for engaging a smaller party (overdog), -5 for
   * fleeing, +20 for landing the killing blow on an enemy queen.
   * Initialized to 50 at scenario start for every promotable unit
   * (queens and specialty templates — workers, tanks, potato-bugs,
   * spiderlings, mice, cockroaches, stinkbugs — never carry charisma
   * since they can't promote). At `>= 70` the unit is eligible for
   * promotion; promotion fires automatically at end-of-turn when an
   * eligible unit is on its faction's home POST tile (storm-drain
   * for ants, spider-web for spiders). Optional for backwards
   * compatibility: a missing field is treated as "not eligible for
   * the promotion track" by the engine.
   */
  readonly charisma?: number;
  /**
   * Round 26 — set to `true` once the unit promotes via charisma
   * (mechanics memo §1.4). Each unit can promote at most once per
   * scenario; a second eligibility window is a no-op when this
   * field is set. Optional: a missing field is equivalent to
   * `false` (never promoted).
   */
  readonly promoted?: boolean;
  /**
   * Phase-B follow-up — per-unit, campaign-accumulated stat delta
   * from leveling up across scenarios. Set only by
   * `engine/world-inject` when a carried `WorldUnit` is rebuilt into
   * a scenario `Unit` (computed from the unit's `level` via
   * `engine/world-levelup`'s `cumulativeLevelBonus`). The static
   * `loadScenario` path (batch / diversity / coevo) never sets it, so
   * a missing field is treated as all-zero by combat — a strict
   * no-op that preserves byte-identical non-campaign replays. The
   * `attack` / `armor` / `agility` / `intelligence` lanes fold
   * additively into the same combat offset lane as
   * item / phase / plane-affinity / POST-occupation / card offsets;
   * the `hp` lane is realized at injection time as a larger spawn
   * HP pool (not in the per-hit damage roll). The curve never grants
   * `armor`, so that lane is always 0, but the field carries it for
   * shape parity with the other additive lanes.
   */
  readonly levelBonus?: {
    readonly attack: number;
    readonly armor: number;
    readonly hp: number;
    readonly agility: number;
    readonly intelligence: number;
  };
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface Post {
  readonly id: PostId;
  readonly name: string;
  readonly location: TileCoord;
  readonly owner: Faction;
  readonly defensiveBonus: number;
  readonly healingRate: number;
  readonly pairedWith?: PostId;
  /**
   * L8 (Attic) Skylight one-way plane transit (§3.4). When `true`,
   * paired-POST transitions may LEAVE this POST through its pair but
   * may not be used to ENTER it (the partner→this direction is
   * forbidden). Edge-adjacency and ant-plane-switch are unaffected.
   * With the Skylight as the floor-side post (`pairedWith` the
   * ceiling post, mutual for AI/viewer discoverability) this yields
   * exactly one-way floor→ceiling transit. Absent/false everywhere
   * today, so all shipped maps are byte-identical.
   */
  readonly oneWay?: boolean;
  /**
   * L5 (Bedroom) Under-Bed concealment / fog-immunity (§3.7,
   * Gameplay-owned per §4a). An ant party standing on a `concealment`
   * POST emits NO pheromone trail that turn and its existing trail is
   * cleared — it is invisible to the spider's trail-scouting (rec
   * 1.5 / TBS §1.5). Implemented purely at engine trail-emission;
   * the locked spider-AI visibility code (`getSpiderVisibleAntTrail`)
   * is untouched — it simply finds no entries for a concealed party.
   * Absent everywhere today, so all shipped maps are byte-identical.
   */
  readonly concealment?: boolean;
  /**
   * L4 (Hallway) Light-Switch flip-state POST → global combat
   * modifier (§3.8 / §4a boundary #1: Level owns the flip-state POST
   * node, Gameplay owns this combat payload — kept to a single
   * low-cognitive flat attack delta per the Gameplay ruling). The
   * switch is "lit" iff this POST is owned by `litOwner`; while
   * UNLIT (any other owner) every unit of `faction` gets `+attack`
   * effective attack engine-wide, folded into the same additive lane
   * as the POST-occupation bonus. Absent on every shipped map, so the
   * offset is identically zero and combat is byte-identical.
   */
  readonly combatModifier?: {
    readonly litOwner: Faction;
    readonly faction: Faction;
    readonly attack: number;
  };
  /**
   * L9 (Basement) dynamic-hazard surface (§3.6 / §4a boundaries #5
   * Sump-Pump + #6 Boiler — bundled: one shared engine surface). This
   * POST governs `tiles` as a dynamic hazard: at end-of-turn every
   * living unit standing on a governed tile takes `damage`. The field
   * is ACTIVE unless `suppressedWhenOwnedBy` is set AND this POST is
   * owned by that faction (the Sump-Pump "drain" toggle). A Boiler
   * (always-radiating) just omits `suppressedWhenOwnedBy`. Level owns
   * the tile region + pump/boiler node; Gameplay owns `damage`.
   * Distinct from (and does NOT activate) the latent static
   * `hazardDamage` terrain field — absent on every shipped map, so
   * the end-of-turn hazard tick is a no-op there (byte-identical).
   */
  readonly hazardField?: {
    readonly tiles: readonly TileCoord[];
    readonly damage: number;
    readonly suppressedWhenOwnedBy?: Faction;
  };
  /**
   * Engine dependency #9 — opt-in per-POST in-sim gold income
   * (roadmap §4a #3; closes the docs §4e "shop is not in-sim"
   * economy gap). When set `> 0` and `owner` is a real faction
   * (`ant`/`spider`, not `neutral`), the end-of-turn pipeline credits
   * the owning faction's `playerGold` by `goldPerTurn` each turn —
   * income for *controlling* the node, not for standing on it
   * (ownership-based by design, sidestepping the §4e co-located pause
   * race). This is the missing in-sim source the shipped card market
   * (`engine/cards.ts` `buyCard`) was always meant to spend. Absent
   * on every shipped map, so the sweep contributes exactly 0 there
   * and every shipped scenario (incl. the gate-29 locked baseline) is
   * byte-identical.
   */
  readonly goldPerTurn?: number;
  readonly tags: readonly string[];
  /**
   * Round 17 — POST hold mechanic. When a non-owner faction party walks
   * onto a capturable POST, it starts a 2-turn hold for that faction.
   * `capturingFaction` is the faction currently attempting capture
   * (null when no capture is in progress); `captureTurnsRemaining` is
   * the number of end-of-turn ticks left before ownership flips
   * (null when no capture is in progress). Storm-drain is excluded
   * from the mechanic (faction-locked); spider-web supports capture
   * (the ant win condition). Both fields are null on already-owned
   * and unowned POSTs at scenario start.
   */
  readonly capturingFaction: Faction | null;
  readonly captureTurnsRemaining: number | null;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface MoveOrder {
  readonly kind: 'move-to';
  readonly target: TileCoord;
}

export interface CaptureOrder {
  readonly kind: 'capture';
  readonly postId: PostId;
}

export interface AbilityOrder {
  readonly kind: 'use-ability';
  readonly abilityId: AbilityId;
  readonly target?: TileCoord | PartyId | PostId;
}

export interface HoldOrder {
  readonly kind: 'hold';
}

/**
 * Round 15 — flee order. Signals intent to retreat from any battle the
 * party finds itself in this turn. No target. The engine resolves the
 * flee attempt during battle: if the party has a `flee` order in its
 * orders list at battle time, an agility-weighted success roll is
 * attempted (defender first if both sides flee). Success ends the
 * battle as a `'draw'` and knocks the fleeing party one tile in the
 * opposite of its arrival direction; failure costs the fleer that
 * round's actions and the non-fleeing side gets one bonus round of
 * unopposed attacks. The order is consumed on either outcome — to
 * re-attempt, the AI must re-issue the order next turn.
 */
export interface FleeOrder {
  readonly kind: 'flee';
}

/**
 * Round 25 — commander cards (mechanics memo §1.3). Buy a card from the
 * public market for the issuing party's faction. Cost is deducted from
 * `state.playerGold[faction]`; the bought card is appended to that
 * faction's `cardHand` (cap 3). The market then refills the freed
 * slot from the deck. Issued by an AI policy at any turn-start;
 * resolved before movement / battle. If the faction can't afford the
 * card, the hand is full, or the card isn't in the market, the order
 * silently fails (no event, no gold deduction).
 */
export interface BuyCardOrder {
  readonly kind: 'buy-card';
  readonly cardId: CardId;
  /** Faction issuing the order. Preserved on the order so a single
   * resolver pass can dispatch by faction without scanning every
   * party's faction field at execution time. */
  readonly faction: 'ant' | 'spider';
}

/**
 * Round 25 — play a card from the issuing faction's hand. Effects vary
 * by card (see `engine/cards.ts`'s `applyCardEffect` switch). The
 * optional `partyId` carries a friendly target (e.g., the party
 * `frenzy` should buff); `targetPartyId` carries an enemy target
 * (e.g., `quick-strike`'s damage target). One-shot: the card is
 * removed from the hand on play.
 */
export interface PlayCardOrder {
  readonly kind: 'play-card';
  readonly cardId: CardId;
  readonly faction: 'ant' | 'spider';
  readonly partyId?: PartyId;
  readonly targetPartyId?: PartyId;
}

export type Order =
  | MoveOrder
  | CaptureOrder
  | AbilityOrder
  | HoldOrder
  | FleeOrder
  | BuyCardOrder
  | PlayCardOrder;

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

export type Posture = 'run' | 'fight' | 'defend';

export type StrategyModifier = 'offensive' | 'defensive' | 'protect-leader' | 'target-weakest';

/**
 * Round 11 — neutral-recruit "commit-or-abandon" decision attached to
 * an ant party. When set, the AI honors the decision for `turnsRemaining`
 * end-of-turn ticks: a `pursue` decision walks one tile toward
 * `targetPartyId` each turn; an `ignore` decision suppresses the detour
 * branch entirely. Co-located opportunistic recruit always fires
 * regardless of this field. The engine end-of-turn tick decrements the
 * counter and drops the field when it hits 0 or when a `pursue` target
 * disappears.
 */
export interface NeutralDecision {
  readonly kind: 'pursue' | 'ignore';
  readonly targetPartyId?: PartyId;
  readonly turnsRemaining: number;
}

/**
 * Round 20 — formation slot for a unit inside its party (mechanics
 * memo §1.5). Front row attacks first and absorbs damage first; back
 * row trails. Reserve units are off the active fighting layout — they
 * deal no damage and take no damage until promoted into front/back via
 * a casualty.
 */
export type FormationSlot = 'front' | 'back' | 'reserve';

/**
 * Round 20 — per-party formation: ordered unit-id lists for the three
 * slots. `front` capped at 3, `back` capped at 2; anything else is
 * `reserve`. Auto-assigned at scenario start by template tags + size
 * (see `engine/formation.ts`); promotion mid-battle moves a reserve
 * id into the row that just lost a unit, lowest unit-id first for
 * determinism.
 */
export interface Formation {
  readonly front: readonly UnitId[];
  readonly back: readonly UnitId[];
  readonly reserve: readonly UnitId[];
}

export interface Party {
  readonly id: PartyId;
  readonly faction: Faction;
  readonly units: readonly Unit[];
  readonly leaderId: UnitId;
  readonly location: TileCoord;
  readonly orders: readonly Order[];
  readonly posture: Posture;
  readonly strategyModifiers: readonly StrategyModifier[];
  readonly jellyDoses: number;
  readonly leaderless: boolean;
  /** Round 11 — optional 5-turn neutral-recruit commit/abandon
   * decision. Only meaningful for ant parties carrying both ant-scout
   * and ant-mage. */
  readonly neutralDecision?: NeutralDecision;
  /** Round 14 — equipped persistent item, or `null` if the slot is
   * empty. Consumable items fire on pickup and never occupy this slot.
   * Optional for backwards compatibility: a missing field is equivalent
   * to `null` (no equipped item). */
  readonly item?: ItemId | null;
  /** Round 20 — front/back/reserve slot layout (mechanics memo §1.5).
   * Optional for backwards compatibility: a missing field is treated
   * as "all units front" by combat resolution (legacy row-blind
   * behavior), so older replays / hand-built test parties still work. */
  readonly formation?: Formation;
  /**
   * Round 25 — transient card-driven buffs (mechanics memo §1.3). Set
   * by the corresponding `play-card` order (`extra-charge`, `frenzy`,
   * `bulwark`, `forced-march`) and decayed by the end-of-turn tick.
   * Optional for backwards compatibility: a missing field is treated
   * as "no active buff" by combat / movement.
   *
   * - `attackBonus` — flat per-unit attack add (frenzy: +2 for the
   *   current battle).
   * - `armorBonus` — flat per-unit armor add (bulwark: +2 for 3 turns).
   * - `extraMovement` — extra movement allowance per turn
   *   (extra-charge: +2 for 3 turns).
   * - `forcedMarch` — when true, the party may take 2 movement
   *   actions this turn (consumed at end-of-turn).
   * - `bonusTurnsRemaining` — turns left for attack/armor/movement
   *   bonuses; reaches 0 → buffs drop. Frenzy uses 1; bulwark/extra-
   *   charge use 3.
   */
  readonly cardBuffs?: {
    readonly attackBonus: number;
    readonly armorBonus: number;
    readonly extraMovement: number;
    readonly forcedMarch: boolean;
    readonly bonusTurnsRemaining: number;
  };
}

// ---------------------------------------------------------------------------
// Battle
// ---------------------------------------------------------------------------

export interface BattleAction {
  readonly attackerId: UnitId;
  readonly defenderId: UnitId;
  readonly damage: number;
  readonly killed: boolean;
}

export interface BattleRound {
  readonly index: number;
  readonly actions: readonly BattleAction[];
}

/**
 * Snapshot of a single unit's state at the moment a battle begins. Lets
 * the replay viewer render a play-by-play with running HP without
 * needing to load unit-template data or track HP across battles.
 */
export interface BattleParticipant {
  readonly unitId: UnitId;
  readonly templateId: UnitTemplateId;
  readonly side: 'attacker' | 'defender';
  readonly hp: number;
  readonly maxHp: number;
  readonly isLeader: boolean;
}

export interface BattleResult {
  readonly attackerPartyId: PartyId;
  readonly defenderPartyId: PartyId;
  readonly winner: PartyId | 'draw';
  readonly rounds: readonly BattleRound[];
  readonly attackerCasualties: readonly UnitId[];
  readonly defenderCasualties: readonly UnitId[];
  readonly retreatTo: TileCoord | null;
  /** Per-unit snapshots at battle start. The viewer subtracts each
   * action's damage from these values to produce a running HP for the
   * play-by-play panel. */
  readonly participants: readonly BattleParticipant[];
}

// ---------------------------------------------------------------------------
// Fog of war
// ---------------------------------------------------------------------------

export interface FogTile {
  readonly visible: boolean;
  readonly seen: boolean;
  readonly pheromone: boolean;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

/**
 * Day/night cycle state (rec 1.2). Phase flips on a fixed cadence
 * (4 turns each: day 1-4, night 5-8, day 9-12, ...). Combat math
 * applies a +1 attack / +1 agility bonus to spiders at night and a
 * -1 attack penalty to ant-archers at night; abilities can be gated
 * (scout-ping is suppressed at night). Bonuses are flat and stack
 * with plane affinity (rec 1.3) before the multiplicative posture/
 * jelly/queen stack.
 */
export type DayNightPhase = 'day' | 'night';

/**
 * One pheromone breadcrumb left behind by an ant party (rec 1.5).
 * Spiders see the trail of (plane, x, y, age) entries — they don't
 * see live positions; ants see everything. Decay is age-based: an
 * entry older than 3 turns is dropped from the trail at end-of-turn.
 */
export interface PheroTrailEntry {
  readonly plane: Plane;
  readonly x: number;
  readonly y: number;
  readonly ageInTurns: number;
}

/**
 * Neutral-party type tag (round 8). Used by the engine and AI to
 * dispatch type-specific behavior (mice never plane-switch, cockroaches
 * have friendly fire, stinkbugs spawn damage zones on failed
 * recruit/hypnotize).
 */
export type NeutralKind = 'mice' | 'cockroaches' | 'stinkbugs';

/**
 * Per-neutral-party control state (round 8). Empty/missing means the
 * neutral party is uncontrolled (default random walk). Spider hypnotize
 * sets `hypnotizedBy: 'spider'` and a control-turn counter; when that
 * runs out it transitions to `spiderImmunityRemaining: 10` for the
 * rebound window.
 */
export interface NeutralStatus {
  readonly hypnotizedBy: 'spider' | null;
  readonly hypnoticControlRemaining: number;
  readonly spiderImmunityRemaining: number;
  readonly kind: NeutralKind;
}

/**
 * One stinkbug damage zone (round 8). Spawned at the stinkbug's tile
 * on a failed recruit/hypnotize attempt. 5-tile plus shape (center +
 * 4 neighbors), shrunk by map bounds. Persists for 5 turns ticking
 * down at end-of-turn; deals 1 hp/turn to non-stinkbug units.
 */
export interface DamageZone {
  readonly plane: Plane;
  readonly centerX: number;
  readonly centerY: number;
  readonly turnsRemaining: number;
}

/**
 * Round 12 — per-player gold totals. Both factions start at 0 and earn
 * gold from POST captures and battle kills (see `engine/gold-table.ts`).
 * Gold is pure tracking — it has no in-scenario effect on combat math
 * or AI policy and is keyed per-faction (player-scoped), not per-party.
 */
export interface PlayerGold {
  readonly ant: number;
  readonly spider: number;
}

/**
 * Round 14 — one item dropped into the world at scenario start.
 * Hidden until discovered by an ant or spider party. The `discovered`
 * flag becomes true on pickup and the spawn is removed from the
 * undiscovered pool (consumed if the item is consumable, or carried
 * on `Party.item` if persistent).
 */
export interface ItemSpawn {
  readonly itemId: ItemId;
  readonly location: TileCoord;
  readonly buried: boolean;
  readonly discovered: boolean;
}

export interface GameState {
  readonly turn: number;
  readonly seed: number;
  readonly tiles: ReadonlyMap<string, Tile>;
  readonly posts: ReadonlyMap<PostId, Post>;
  readonly parties: ReadonlyMap<PartyId, Party>;
  readonly unitTemplates: ReadonlyMap<UnitTemplateId, UnitTemplate>;
  readonly fog: ReadonlyMap<string, FogTile>;
  readonly queenUltimateCharge: number;
  /** How many times the Queen ultimate has fired this scenario. Capped by
   * `queen.ultimate.usesPerScenario` in the data. */
  readonly queenUltimatesUsed: number;
  /** Tile coords currently holding a spider-spun web. Keyed by
   * `coordKey(coord)`. Ant parties stepping onto a webbed tile are
   * blocked for a turn and the web is consumed. Spiders pass through
   * freely. */
  readonly webbedTiles: ReadonlyMap<string, TileCoord>;
  readonly buttons: number;
  /** Current day/night phase. Starts at `'day'`; flips every
   * `PHASE_LENGTH` turns at the top of the turn loop. */
  readonly phase: DayNightPhase;
  /** Turns left in the current phase. Decremented at turn-start;
   * when it would hit 0, the phase flips and the counter resets to
   * `PHASE_LENGTH`. */
  readonly phaseTurnsRemaining: number;
  /** Per-ant-party pheromone trails (rec 1.5). Each entry is a
   * decaying breadcrumb of the party's recent location. End-of-turn
   * appends the current location with `ageInTurns: 0` and ages all
   * existing entries; entries older than 3 turns are dropped. The
   * spider AI consumes this as the *only* visibility into ant
   * positions. Ants see the world directly. */
  readonly pheroTrails: ReadonlyMap<PartyId, readonly PheroTrailEntry[]>;
  /**
   * Per-neutral-party control / immunity status (round 8). Keyed by
   * the neutral PartyId. Non-neutral parties never appear here. When a
   * neutral converts to ant via recruit, its entry is dropped.
   */
  readonly neutralStatus: ReadonlyMap<PartyId, NeutralStatus>;
  /**
   * Active stinkbug damage zones (round 8). Each is a 5-tile plus
   * (center + 4 neighbors). Multiple zones may stack on the same tile;
   * end-of-turn ticks each independently and damage is additive.
   */
  readonly damageZones: readonly DamageZone[];
  /**
   * Round 12 — per-faction gold totals (player-scoped). Earned by
   * capturing mid-POSTs and by winning battles (each casualty on the
   * losing side credits the winning faction). No in-scenario function
   * yet; pure tracking.
   */
  readonly playerGold: PlayerGold;
  /**
   * Round 14 — items dropped on the map at scenario start. 4 spawns
   * per scenario (3 normal + 1 buried). Hidden until an ant/spider
   * party rolls discovery within Chebyshev 1 at end-of-turn.
   * Persistent items become `Party.item`; consumables fire and
   * vanish. `discovered: true` entries are kept for replay
   * provenance but no longer eligible for pickup.
   */
  readonly itemSpawns: readonly ItemSpawn[];
  /**
   * Round 16 — sidecar buffer for replay events emitted by AI
   * policies during their `decide()` pass. The turn driver drains
   * this list each turn (after policies run, before movement) and
   * folds the entries into the main replay-event stream, then resets
   * the field to `[]` on the working state. Policies push events
   * here instead of being given a direct event sink so the
   * `AIPolicy.decide` signature (state -> state) stays unchanged.
   * Optional for backwards compatibility: a missing field is
   * equivalent to `[]`.
   */
  readonly pendingPolicyEvents?: readonly ReplayEvent[];
  /**
   * Round 25 — commander cards (mechanics memo §1.3, Risk 2210
   * inspired gold sink). Public 6-card market (visible to both
   * factions) seeded by a deterministic RNG fork at scenario start.
   * Each entry pairs a card id with its current cost (cost is
   * baked into the slot so reprice tweaks can be made without
   * changing the underlying card pool entry). Slots refill from
   * `cardDeck` after a buy. Optional for backwards compatibility:
   * older replays / hand-built test states without the field
   * behave as if no cards are available (buy orders silently fail).
   */
  readonly cardMarket?: readonly { readonly cardId: CardId; readonly cost: number }[];
  /**
   * Round 25 — per-faction card hand (cap 3). A bought card sits in
   * the hand until played; a played card is removed. Optional for
   * backwards compatibility (treated as empty hands).
   */
  readonly cardHand?: {
    readonly ant: readonly CardId[];
    readonly spider: readonly CardId[];
  };
  /**
   * Round 25 — undrawn cards in the deck. Drawn from to refill the
   * market after each buy, in deterministic order (the deck is
   * shuffled once at scenario start by a seeded RNG fork). Optional
   * for backwards compatibility.
   */
  readonly cardDeck?: readonly CardId[];
  /**
   * Round 29 — spider blitz mode (mechanics memo §1.7). Per-scenario
   * 5% coin flip rolled at scenario init via
   * `createRng(seed).fork('spider-blitz').next() < 0.05`. When true,
   * all non-queen-guard spider parties march directly at the storm-
   * drain (ant home base) for the entire scenario, ignoring POST
   * captures, patrols, and flee triggers. Adds variance to the
   * baseline win rate without altering the dominant-strategy median.
   * Optional for backwards compatibility: a missing field is
   * equivalent to `false` and old replays load unchanged.
   */
  readonly spiderBlitzMode?: boolean;
  /**
   * Per-scenario win/loss objective, resolved from scenario data at
   * load time (`engine/state.ts`). Optional for backwards
   * compatibility: hand-built test states / pre-L2 replays without the
   * field are read by `checkWinner` as the L1 default
   * (`DEFAULT_VICTORY_CONDITION` — capture spider-web), so the static
   * L1 path stays byte-identical.
   */
  readonly victoryCondition?: VictoryCondition;
  /**
   * Engine dependency #10 — opt-in scenario flag (resolved from
   * `map.json` at load time, `engine/state.ts`). When `true`, the
   * hypnotize + recruit handlers (and the rebound-immunity application
   * point in `end-of-turn.ts`) read their tuning params from the
   * loaded `abilities.json` def instead of the hardcoded module
   * constants — closing the docs §4g "abilities.json hypnotize/recruit
   * params are inert" finding. Optional for backwards compatibility:
   * absent / `false` (every shipped map + hand-built test state) ⇒ the
   * historical hardcoded constants are used on the identical code path,
   * so L1–L7 and the gate-29 locked baseline are byte-identical.
   */
  readonly abilityParamsAuthoritative?: boolean;
  /**
   * Roadmap §7.12 (Exchange #8) — reinforcement-at-POST. Scenario-data
   * configured parties that spawn when a designated POST completes
   * capture, keyed by the trigger POST id. The `party` is fully built
   * at load (`engine/state.ts`); the capture-complete hook in
   * `engine/post-capture.ts` inserts it at the arrival POST. Optional
   * and absent on every shipped scenario (no roster carries
   * `reinforcements`), so the hook is provably inert and gate-29 stays
   * byte-identical — same discipline as `victoryCondition` /
   * `abilityParamsAuthoritative`.
   */
  readonly reinforcements?: ReadonlyMap<PostId, ReinforcementConfig>;
  /**
   * Roadmap §7.12 — single-shot tracking: trigger POST ids whose
   * reinforcement has already fired this scenario. Absent/empty until
   * a reinforcement spawns.
   */
  readonly firedReinforcements?: ReadonlySet<PostId>;
  /**
   * L1-iteration #5 — single-shot tracking for scripted-beat ids that
   * have already fired this scenario. Absent/empty until the first beat
   * fires. Byte-identical for scenarios with no `beats` data.
   */
  readonly firedBeats?: ReadonlySet<string>;
  readonly winner: Faction | null;
}

/**
 * Roadmap §7.12 — a resolved reinforcement trigger. Built at scenario
 * load from the roster file's optional `reinforcements` block; the
 * `party` is a fully-constructed `Party` (units, leader, formation)
 * ready to insert, with its `location` overridden to the arrival
 * POST's tile at spawn time.
 */
export interface ReinforcementConfig {
  /** POST whose capture-complete fires this reinforcement. */
  readonly triggerPostId: PostId;
  /** Where the party arrives (defaults to the trigger POST at load). */
  readonly arrivalPostId: PostId;
  /** Pre-built party; `location` is set from the arrival POST on spawn. */
  readonly party: Party;
}

// ---------------------------------------------------------------------------
// Replay events (discriminated union)
// ---------------------------------------------------------------------------

export interface ReplayEventCommon {
  readonly turn: number;
  readonly tick: number;
}

export type ReplayEvent =
  | (ReplayEventCommon & {
      readonly kind: 'scenario-start';
      readonly scenario: string;
      /** Initial POST layout: id, location, owner. Lets the viewer
       * render per-seed randomized POSTs without re-loading data. */
      readonly posts?: readonly {
        readonly id: PostId;
        readonly location: TileCoord;
        readonly owner: Faction;
      }[];
      /** Per-seed obstacle tile coords (kind === 'obstacle'). Lets the
       * viewer render the random obstacle clusters. */
      readonly obstacles?: readonly TileCoord[];
      /** Final party positions after pre-game placement (round 7
       * feature 2). Optional: omitted means the parties spawned at
       * roster default positions. The viewer reads this to draw the
       * initial board correctly when an AI policy used the placement
       * hook. */
      readonly partyPositions?: readonly {
        readonly partyId: PartyId;
        readonly location: TileCoord;
      }[];
      /** Unit-template digest (id, name, faction, baseStats, abilities,
       * tags). Lets the viewer render unit-level state in the parties
       * panel without re-loading data files. Optional: older replays
       * omit this field and the viewer falls back to a name-only
       * display. */
      readonly unitTemplates?: readonly {
        readonly id: UnitTemplateId;
        readonly name: string;
        readonly faction: Faction;
        readonly baseStats: Stats;
        readonly abilities: readonly AbilityId[];
        readonly tags: readonly string[];
      }[];
      /** Initial party rosters: faction, location, leader, posture,
       * jelly doses, and per-unit (id, templateId, currentHp, level,
       * xp). Lets the viewer track unit-level HP/XP/level state across
       * the scrubber. Optional for backwards compatibility. */
      readonly parties?: readonly {
        readonly id: PartyId;
        readonly faction: Faction;
        readonly location: TileCoord;
        readonly leaderId: UnitId;
        readonly posture: Posture;
        readonly jellyDoses: number;
        readonly units: readonly {
          readonly id: UnitId;
          readonly templateId: UnitTemplateId;
          readonly currentHp: number;
          readonly level: number;
          readonly xp: number;
        }[];
      }[];
    })
  | (ReplayEventCommon & { readonly kind: 'turn-start' })
  | (ReplayEventCommon & {
      readonly kind: 'order-issued';
      readonly partyId: PartyId;
      readonly order: Order;
    })
  | (ReplayEventCommon & {
      readonly kind: 'party-moved';
      readonly partyId: PartyId;
      readonly from: TileCoord;
      readonly to: TileCoord;
    })
  | (ReplayEventCommon & {
      readonly kind: 'battle-resolved';
      readonly result: BattleResult;
    })
  | (ReplayEventCommon & {
      readonly kind: 'post-captured';
      readonly postId: PostId;
      readonly newOwner: Faction;
    })
  | (ReplayEventCommon & {
      /**
       * Round 17 — POST hold mechanic. Emitted when a party of a
       * non-owner faction first walks onto a capturable POST and
       * starts a 2-turn hold. `fromOwner` is the POST's owner at the
       * moment capture started ('neutral' for unowned mid-POSTs, or
       * the faction that previously held it). Subsequent reinforcing
       * arrivals by the same faction do NOT re-emit this event;
       * a swap (opposing-faction party arrives mid-capture) does emit
       * a new started event for the new capturer.
       */
      readonly kind: 'post-capture-started';
      readonly postId: PostId;
      readonly capturingFaction: Faction;
      readonly fromOwner: Faction;
    })
  | (ReplayEventCommon & {
      /**
       * Round 17 — emitted at end-of-turn each tick the holder's
       * party remains alone on the POST, before the final flip.
       * `turnsRemaining` is the count AFTER decrement (1 → "one
       * more turn", 0 → "ownership about to flip; post-captured
       * fires next").
       */
      readonly kind: 'post-capture-progressed';
      readonly postId: PostId;
      readonly capturingFaction: Faction;
      readonly turnsRemaining: number;
    })
  | (ReplayEventCommon & {
      /**
       * Round 17 — emitted when an in-progress capture is aborted
       * because the holder's party left the tile (without an enemy
       * present to pause the capture). On abort, the POST's owner
       * is reset to neutral — the user's directive is that failed/
       * abandoned mid-capture attempts strip prior ownership.
       * `previousOwner` is the owner BEFORE the abort (so 'spider'
       * appears when ants started capturing the spider-web but got
       * killed off before the hold completed).
       */
      readonly kind: 'post-capture-aborted';
      readonly postId: PostId;
      readonly previousOwner: Faction;
    })
  | (ReplayEventCommon & {
      readonly kind: 'ability-used';
      readonly partyId: PartyId;
      readonly abilityId: AbilityId;
    })
  | (ReplayEventCommon & {
      /**
       * Round 21 — per-cast MP-tier consumption (mechanics memo §1.1).
       * Emitted on every ability cast that drained a tier slot from a
       * caster's pool. Captures the firing party + caster unit, the
       * ability's tier, and the caster's slot totals after the
       * decrement (so a viewer can render running MP without
       * re-summing the stream). Non-caster casts (e.g., footman
       * `brace`) do NOT fire this event — they're outside the pool.
       */
      readonly kind: 'mp-spent';
      readonly partyId: PartyId;
      readonly unitId: UnitId;
      readonly abilityId: AbilityId;
      readonly tier: 1 | 2 | 3;
      readonly slotsRemaining: MpSlots;
    })
  | (ReplayEventCommon & { readonly kind: 'unit-died'; readonly unitId: UnitId })
  | (ReplayEventCommon & {
      /**
       * L1-iteration #5 — scripted-beat. Authored mid-scenario narrative
       * event keyed off a (turn, condition) trigger array on the scenario
       * data file. Carries the display copy directly so the UI can surface
       * it without re-reading the scenario data. Fires at most once per
       * beat per scenario; the engine tracks `firedBeats` to enforce this.
       */
      readonly kind: 'scripted-beat';
      readonly beatId: string;
      readonly title: string;
      readonly message: string;
    })
  | (ReplayEventCommon & { readonly kind: 'leader-died'; readonly partyId: PartyId })
  | (ReplayEventCommon & { readonly kind: 'queen-ultimate-charged'; readonly charge: number })
  | (ReplayEventCommon & { readonly kind: 'queen-ultimate-fired' })
  | (ReplayEventCommon & {
      readonly kind: 'jelly-applied';
      readonly partyId: PartyId;
      readonly doses: number;
    })
  | (ReplayEventCommon & { readonly kind: 'fog-revealed'; readonly coords: readonly TileCoord[] })
  | (ReplayEventCommon & {
      readonly kind: 'web-spun';
      readonly partyId: PartyId;
      readonly coord: TileCoord;
    })
  | (ReplayEventCommon & {
      readonly kind: 'web-broken';
      readonly partyId: PartyId;
      readonly coord: TileCoord;
    })
  | (ReplayEventCommon & {
      readonly kind: 'recruit-attempted';
      readonly partyId: PartyId;
      readonly targetUnitId: UnitId;
      readonly success: boolean;
    })
  | (ReplayEventCommon & {
      readonly kind: 'spiderlings-spawned';
      readonly fromPartyId: PartyId;
      readonly newPartyIds: readonly PartyId[];
    })
  | (ReplayEventCommon & {
      /** Roadmap §7.12 — a reinforcement party spawned because
       * `postId` completed capture; arrived at `arrivalPostId`. */
      readonly kind: 'reinforcement-spawned';
      readonly postId: PostId;
      readonly arrivalPostId: PostId;
      readonly newPartyIds: readonly PartyId[];
    })
  | (ReplayEventCommon & {
      /**
       * Round 18 — `web-mend` use-ability fires. Captures the per-unit
       * heal so the viewer / critics can attribute regeneration. The
       * existing `web-mend` battle-passive (engine/battle.ts) does NOT
       * emit this event; it only fires from `resolveAbilityOrders`.
       */
      readonly kind: 'web-mended';
      readonly partyId: PartyId;
      readonly hpHealed: number;
      readonly perUnit: readonly {
        readonly unitId: UnitId;
        readonly hpBefore: number;
        readonly hpAfter: number;
      }[];
    })
  | (ReplayEventCommon & {
      readonly kind: 'corner-crossed';
      readonly partyId: PartyId;
      readonly from: TileCoord;
      readonly to: TileCoord;
    })
  | (ReplayEventCommon & {
      readonly kind: 'phase-changed';
      readonly phase: DayNightPhase;
    })
  | (ReplayEventCommon & {
      readonly kind: 'ability-blocked-by-phase';
      readonly partyId: PartyId;
      readonly abilityId: AbilityId;
      readonly phase: DayNightPhase;
    })
  | (ReplayEventCommon & {
      readonly kind: 'neutral-spawned';
      readonly partyId: PartyId;
      readonly neutralKind: NeutralKind;
      readonly location: TileCoord;
    })
  | (ReplayEventCommon & {
      readonly kind: 'hypnotize-attempted';
      readonly partyId: PartyId;
      readonly targetId: PartyId;
      readonly success: boolean;
      readonly casterHpBefore: number;
      readonly casterHpAfter: number;
    })
  | (ReplayEventCommon & {
      readonly kind: 'hypnotize-rebound-started';
      readonly partyId: PartyId;
    })
  | (ReplayEventCommon & {
      readonly kind: 'recruit-attempted-neutral';
      readonly partyId: PartyId;
      readonly targetId: PartyId;
      readonly targetType: NeutralKind;
      readonly success: boolean;
    })
  | (ReplayEventCommon & {
      readonly kind: 'damage-zone-spawned';
      readonly center: TileCoord;
      readonly tiles: readonly TileCoord[];
    })
  | (ReplayEventCommon & {
      readonly kind: 'damage-zone-tick';
      readonly center: TileCoord;
      readonly damage: number;
      readonly affectedUnits: readonly UnitId[];
    })
  | (ReplayEventCommon & {
      readonly kind: 'damage-zone-expired';
      readonly center: TileCoord;
    })
  | (ReplayEventCommon & {
      /** L9 dynamic-hazard tick: an active `hazardField` POST dealt
       * `damage` to each unit in `affectedUnits` standing on one of
       * its governed tiles this end-of-turn. */
      readonly kind: 'hazard-field-tick';
      readonly postId: PostId;
      readonly damage: number;
      readonly affectedUnits: readonly UnitId[];
    })
  | (ReplayEventCommon & {
      /**
       * Round 12 — gold credited to a faction. Sources:
       *   - `'post'`: a `post-captured` event just fired and the
       *     captured POST's type pays a fixed gold amount. `sourceId`
       *     carries the captured PostId.
       *   - `'kill'`: a unit died during a battle and the battle's
       *     winning faction is credited the dead unit's bounty.
       *     `sourceId` carries the dead unit's UnitTemplateId.
       * `newTotal` reflects the faction's gold AFTER the gain so a
       * viewer can render the running total without re-summing the
       * stream.
       */
      readonly kind: 'gold-earned';
      readonly faction: 'ant' | 'spider';
      readonly source: 'post' | 'kill';
      readonly sourceId: PostId | UnitTemplateId;
      readonly amount: number;
      readonly newTotal: number;
    })
  | (ReplayEventCommon & {
      /**
       * Round 14 — emitted at scenario-start, one per spawned item.
       * Lets the viewer render the muted "?" markers for hidden items
       * and provides provenance for telemetry.
       */
      readonly kind: 'item-spawned';
      readonly itemId: ItemId;
      readonly location: TileCoord;
      readonly buried: boolean;
    })
  | (ReplayEventCommon & {
      /**
       * Round 14 — emitted when an ant or spider party rolls discovery
       * on a hidden item at end-of-turn. The viewer uses this to drop
       * the marker. For consumables, `item-consumed` follows in the
       * same tick; for persistents, `Party.item` is now set.
       */
      readonly kind: 'item-discovered';
      readonly partyId: PartyId;
      readonly itemId: ItemId;
      readonly location: TileCoord;
    })
  | (ReplayEventCommon & {
      /**
       * Round 14 — fired when a consumable item resolves its effect
       * on pickup (`heal` for mead, `jelly` for royal-jelly-vial).
       * No `Party.item` is set; the slot stays empty.
       */
      readonly kind: 'item-consumed';
      readonly partyId: PartyId;
      readonly itemId: ItemId;
      readonly effect: 'heal' | 'jelly';
    })
  | (ReplayEventCommon & {
      /**
       * Round 14 — emitted when a party with a full slot picks up a
       * higher-priority item and drops the previously-equipped one
       * back at the discovery tile (now discoverable again).
       */
      readonly kind: 'item-dropped';
      readonly partyId: PartyId;
      readonly itemId: ItemId;
      readonly location: TileCoord;
    })
  | (ReplayEventCommon & {
      /**
       * Round 15 — flee attempt fired during a battle. Emitted whether
       * the roll succeeds or fails so the viewer can render a "X
       * attempts flee (NN% chance, rolled R) — success/failure" row in
       * the play-by-play. `successProbability` is the clamped
       * [0.30, 0.80] band derived from the fleeing party's average
       * living agility; `roll` is the [0, 1) draw from the seeded
       * battle-flee rng fork.
       */
      readonly kind: 'battle-flee-attempted';
      readonly partyId: PartyId;
      readonly successProbability: number;
      readonly roll: number;
      readonly success: boolean;
    })
  | (ReplayEventCommon & {
      /**
       * Round 15 — successful flee. Battle ended as a draw, party was
       * knocked back to `knockbackTo` (opposite of arrival direction).
       * Fires once per successful flee, after the corresponding
       * `battle-flee-attempted` and the `battle-resolved` events.
       */
      readonly kind: 'battle-fled';
      readonly partyId: PartyId;
      readonly knockbackFrom: TileCoord;
      readonly knockbackTo: TileCoord;
    })
  | (ReplayEventCommon & {
      /**
       * Round 15 — flee attempt failed (either the roll missed or
       * knockback was blocked). Battle continues with one bonus round
       * where only the non-fleeing side acts. Fires once per failed
       * attempt, after the corresponding `battle-flee-attempted`.
       */
      readonly kind: 'battle-flee-failed';
      readonly partyId: PartyId;
    })
  | (ReplayEventCommon & {
      /**
       * Round 16 — emitted by an AI policy when it prepends a flee
       * order onto a party's order list, BEFORE battle resolution.
       * Captures the AI's prior intent to flee. The existing
       * `battle-flee-attempted` event still fires later when battle
       * resolution actually rolls; this event captures the upstream
       * decision with its rationale.
       *
       * `reason: 'low-hp'` is the round-15 HP-fraction trigger
       * (livingHpFraction < 0.30). `reason: 'threat-prediction'` is
       * the round-16 trigger: the party computed a Lanchester loss
       * probability against an enemy at the next-tile collision and
       * the seeded RNG draw fell under
       * `fleeChanceFromLossProb(lossProbability)`. For threat-
       * prediction emits, `enemyPartyId` and `lossProbability` are
       * filled in; for `'low-hp'` emits, both are omitted (no
       * specific enemy).
       */
      readonly kind: 'flee-queued';
      readonly partyId: PartyId;
      readonly reason: 'low-hp' | 'threat-prediction';
      readonly enemyPartyId?: PartyId;
      readonly lossProbability?: number;
    })
  | (ReplayEventCommon & {
      /**
       * Round 20 — per-party formation announcement (mechanics memo
       * §1.5). Emitted at scenario-start for every party once
       * formations are assigned by `assignFormation` from template
       * tags + size. `front` ≤ 3, `back` ≤ 2; everything overflowing
       * those caps lands in `reserve` and is excluded from battle
       * until promotion. Older replays without this event default
       * the viewer / consumers to "all units front" (legacy row-
       * blind behavior).
       */
      readonly kind: 'formation-assigned';
      readonly partyId: PartyId;
      readonly front: readonly UnitId[];
      readonly back: readonly UnitId[];
      readonly reserve: readonly UnitId[];
    })
  | (ReplayEventCommon & {
      /**
       * Round 20 — reserve unit promoted into front or back when the
       * corresponding row lost a unit during a battle. Promotion is
       * deterministic: lowest unit id from `reserve` first. Fires at
       * most once per casualty per battle round.
       */
      readonly kind: 'formation-promoted';
      readonly partyId: PartyId;
      readonly slot: 'front' | 'back';
      readonly unitId: UnitId;
    })
  | (ReplayEventCommon & {
      /**
       * Round 22 — `venom-blast` pre-battle ability fires. A spider
       * party with at least one living spider-spinner or spider-queen
       * sprays venom across the opposing front rank (or back rank when
       * front is empty), dealing flat per-unit damage. Captures the
       * targeted rank, the per-unit HP delta, and the total damage so
       * the viewer / critics can attribute the spike. Does not emit
       * when the cast fizzles (no eligible caster, no living target,
       * tier-2 MP exhausted, or `uses` exhausted).
       */
      readonly kind: 'venom-blasted';
      readonly partyId: PartyId;
      readonly targetPartyId: PartyId;
      readonly targetRank: 'front' | 'back';
      readonly damagedUnits: readonly {
        readonly unitId: UnitId;
        readonly hpBefore: number;
        readonly hpAfter: number;
      }[];
      readonly totalDamage: number;
    })
  | (ReplayEventCommon & {
      /**
       * Round 24 — combo-fired (mechanics memo §1.2). A pre-battle
       * combo ability resolved against the target party. `comboId`
       * is the combo's ability id (`royal-onslaught`, `venom-storm`).
       * `sourcePartyId` is the party currently engaged in battle that
       * initiated the combo; `partnerPartyId` is the adjacent same-
       * faction party that supplied the second component (and paid
       * its own MP cost). `targetPartyId` is the enemy party hit by
       * the combo. `totalDamage` is the sum of HP delta across the
       * full target party (combos are full-party AoE). When the
       * combo applies a status effect, `debuffApplied` carries the
       * shape's `kind` tag for replay readers (currently only
       * `'venom-storm'`'s movement+attack penalty); omitted for
       * pure-damage combos like `royal-onslaught`.
       */
      readonly kind: 'combo-fired';
      readonly comboId: AbilityId;
      readonly sourcePartyId: PartyId;
      readonly partnerPartyId: PartyId;
      readonly targetPartyId: PartyId;
      readonly totalDamage: number;
      readonly debuffApplied?: 'venom-storm';
    })
  | (ReplayEventCommon & {
      /**
       * Round 25 — commander cards (mechanics memo §1.3). Emitted when
       * a faction's `buy-card` order successfully resolves: gold is
       * deducted, the card moves from market to that faction's hand,
       * and the market draws a replacement (which fires its own
       * `market-refreshed` event in the same tick). `newGold` is the
       * faction's gold AFTER the deduction so a viewer can render the
       * running balance without re-summing.
       */
      readonly kind: 'card-bought';
      readonly faction: 'ant' | 'spider';
      readonly cardId: CardId;
      readonly cost: number;
      readonly newGold: number;
    })
  | (ReplayEventCommon & {
      /**
       * Round 25 — emitted when a faction plays a card from its hand.
       * `partyId` carries the friendly target (when applicable);
       * `targetPartyId` carries the enemy target (e.g.,
       * `quick-strike`). `effectSummary` is a short human-readable
       * description of the resolved effect (e.g., "+2 attack for 1
       * turn", "8 dmg to spider-soldier").
       */
      readonly kind: 'card-played';
      readonly faction: 'ant' | 'spider';
      readonly cardId: CardId;
      readonly partyId?: PartyId;
      readonly targetPartyId?: PartyId;
      readonly effectSummary: string;
    })
  | (ReplayEventCommon & {
      /**
       * Round 25 — emitted when a market slot is refilled from the
       * deck after a buy (or, in principle, after any other slot
       * vacancy). `position` is the 0-indexed slot in the market
       * being refilled. When the deck is exhausted the slot stays
       * empty and no event fires.
       */
      readonly kind: 'market-refreshed';
      readonly newCard: CardId;
      readonly position: number;
    })
  | (ReplayEventCommon & {
      /**
       * Round 26 — charisma-gated promotion (mechanics memo §1.4).
       * Emitted whenever a battle resolution adjusts a unit's charisma.
       * `oldCharisma` and `newCharisma` are the values BEFORE and AFTER
       * the clamp to [0, 100]. `reason` carries the trigger:
       *   - `'underdog'`: attacker engaged a larger party (≥2 slots)
       *   - `'parity'`: attacker engaged a same-size party (≤1 slot diff)
       *   - `'overdog'`: attacker engaged a smaller party (≥2 slots)
       *   - `'flee'`: party retreated via the round-15 flee mechanic
       *   - `'queen-kill'`: this unit landed the killing blow on the
       *     enemy queen
       */
      readonly kind: 'charisma-changed';
      readonly partyId: PartyId;
      readonly unitId: UnitId;
      readonly oldCharisma: number;
      readonly newCharisma: number;
      readonly reason: 'underdog' | 'parity' | 'overdog' | 'flee' | 'queen-kill';
    })
  | (ReplayEventCommon & {
      /**
       * Round 26 — charisma-gated promotion (mechanics memo §1.4). A
       * unit at home base with `charisma >= 70` promotes to its
       * paired template at end-of-turn. Single-step, one-time per
       * unit per scenario. The viewer / critics can attribute the
       * stat bump (+2 hp + per-template increments) by joining
       * `fromTemplate` and `toTemplate` against the templates digest.
       */
      readonly kind: 'unit-promoted';
      readonly partyId: PartyId;
      readonly unitId: UnitId;
      readonly fromTemplate: UnitTemplateId;
      readonly toTemplate: UnitTemplateId;
    })
  | (ReplayEventCommon & {
      /**
       * Round 28 — POST-occupation combat bonus summary (mechanics
       * spec §28). Emitted at the end of every resolved battle and
       * captures the active per-faction party-wide combat bonus
       * derived from owned non-base POSTs (every owned mid-POST grants
       * +1 attack / +1 armor; storm-drain and spider-web are excluded
       * as home bases). `posts` is the count of owned non-base POSTs
       * for that faction; `attack` and `armor` are the per-unit flat
       * offsets folded into the additive combat lane. Old replays
       * loading this event-less stream are unaffected — the viewer
       * treats a missing summary as "no bonus" and renders normally.
       */
      readonly kind: 'post-occupation-bonus-summary';
      readonly ant: {
        readonly posts: number;
        readonly attack: number;
        readonly armor: number;
      };
      readonly spider: {
        readonly posts: number;
        readonly attack: number;
        readonly armor: number;
      };
    })
  | (ReplayEventCommon & {
      /**
       * Round 29 — emitted at scenario-start (turn 0) when the per-
       * scenario blitz coin flip lands true (5% rate). When present,
       * the spider AI overrides per-party orders to march every non-
       * queen-guard party at the ant home base (storm-drain) for the
       * entire scenario. Carries the originating scenario seed so
       * downstream tooling (gate analyzers, the viewer) can attribute
       * the variance to the correct seed without scanning state. The
       * event is purely informational; the engine does not consume
       * it back from the replay log.
       */
      readonly kind: 'spider-blitz-activated';
      readonly seed: number;
    })
  | (ReplayEventCommon & {
      /**
       * Phase-B follow-up — emitted once at scenario-start (turn 0)
       * ONLY in world-loop-injected (campaign) scenarios that carry
       * at least one leveled unit (`level >= 2`). Lists every leveled
       * ant unit with its level and the per-unit `levelBonus` folded
       * into combat, so the viewer / critics can attribute the power
       * swing to leveling rather than to items / POSTs / cards. The
       * event is skipped entirely when no unit is leveled, which
       * keeps non-campaign (static `loadScenario`) replays byte-
       * identical. Purely informational; the engine never reads it
       * back from the replay log.
       */
      readonly kind: 'roster-levels-summary';
      readonly units: readonly {
        readonly unitId: UnitId;
        readonly level: number;
        readonly levelBonus: {
          readonly attack: number;
          readonly armor: number;
          readonly hp: number;
          readonly agility: number;
          readonly intelligence: number;
        };
      }[];
    })
  | (ReplayEventCommon & {
      readonly kind: 'scenario-end';
      readonly winner: Faction;
      /**
       * Round 19 — score breakdown for timeout-resolved scenarios
       * (mechanics memo §1.6). Present when the engine awarded the
       * win at `maxTurns` via `scoreScenario`; undefined for
       * decisive wins (queen kill, spider-web capture, field-force
       * wipe). The `total` per faction sums the per-component
       * fields (posts, queen, webProgress, hp, charisma); ties go
       * to spider per the defender-bias rule.
       */
      readonly scoreBreakdown?: {
        readonly ant: {
          readonly posts: number;
          readonly queen: number;
          readonly webProgress: number;
          readonly hp: number;
          readonly charisma: number;
          readonly total: number;
        };
        readonly spider: {
          readonly posts: number;
          readonly queen: number;
          readonly webProgress: number;
          readonly hp: number;
          readonly charisma: number;
          readonly total: number;
        };
      };
    });

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

export interface Rng {
  /** Returns a number in [0, 1). */
  next(): number;
  /** Returns an integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Picks a uniformly random element. Throws if the array is empty. */
  pick<T>(items: readonly T[]): T;
  /** Forks a labeled child stream so unrelated subsystems don't share entropy. */
  fork(label: string): Rng;
}
