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

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export type Plane = 'floor' | 'ceiling' | 'north-wall' | 'south-wall' | 'east-wall' | 'west-wall';
export type Faction = 'ant' | 'spider' | 'neutral';

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
  readonly tags: readonly string[];
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

export type Order = MoveOrder | CaptureOrder | AbilityOrder | HoldOrder;

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

export type Posture = 'run' | 'fight' | 'defend';

export type StrategyModifier = 'offensive' | 'defensive' | 'protect-leader' | 'target-weakest';

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
  readonly winner: Faction | null;
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
      readonly kind: 'ability-used';
      readonly partyId: PartyId;
      readonly abilityId: AbilityId;
    })
  | (ReplayEventCommon & { readonly kind: 'unit-died'; readonly unitId: UnitId })
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
  | (ReplayEventCommon & { readonly kind: 'scenario-end'; readonly winner: Faction });

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
