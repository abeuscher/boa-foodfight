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
