import { describe, expect, it } from 'vitest';

import {
  abilitiesFileSchema,
  dialogueFileSchema,
  formationsFileSchema,
  jellyFileSchema,
  leadersFileSchema,
  mapFileSchema,
  queenFileSchema,
  rosterFileSchema,
  shopFileSchema,
  unitsFileSchema,
} from './index.ts';

describe('units schema', () => {
  it('accepts a minimal valid file', () => {
    const result = unitsFileSchema.safeParse({
      version: 1,
      templates: [
        {
          id: 'ant-footman',
          name: 'Ant Footman',
          faction: 'ant',
          size: 'small',
          slotCost: 1,
          movement: 'ground',
          baseStats: { hp: 8, attack: 6, agility: 5, armor: 1, intelligence: 1, constitution: 7 },
          abilities: [],
          tags: [],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched size and slotCost', () => {
    const result = unitsFileSchema.safeParse({
      version: 1,
      templates: [
        {
          id: 'ant-footman',
          name: 'Ant Footman',
          faction: 'ant',
          size: 'small',
          slotCost: 3,
          movement: 'ground',
          baseStats: { hp: 8, attack: 6, agility: 5, armor: 1, intelligence: 1, constitution: 7 },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate template ids', () => {
    const tmpl = {
      id: 'ant-footman',
      name: 'Ant Footman',
      faction: 'ant',
      size: 'small',
      slotCost: 1,
      movement: 'ground',
      baseStats: { hp: 8, attack: 6, agility: 5, armor: 1, intelligence: 1, constitution: 7 },
    };
    const result = unitsFileSchema.safeParse({ version: 1, templates: [tmpl, tmpl] });
    expect(result.success).toBe(false);
  });
});

describe('abilities schema', () => {
  it('accepts a minimal valid file', () => {
    const result = abilitiesFileSchema.safeParse({
      version: 1,
      abilities: [
        {
          id: 'pheroblast',
          name: 'PheroBlast',
          category: 'information',
          target: 'area',
          uses: 1,
          cooldown: 0,
          params: { radius: 3 },
          description: 'Reveals fog around the party.',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts the hypnotize ability with at-will uses', () => {
    const result = abilitiesFileSchema.safeParse({
      version: 1,
      abilities: [
        {
          id: 'hypnotize',
          name: 'Hypnotize',
          category: 'special-attack',
          target: 'party',
          uses: null,
          cooldown: 0,
          params: {
            successRate: 0.8,
            minControlTurns: 5,
            maxControlTurns: 10,
            reboundImmunityTurns: 10,
          },
          description: 'Spider hypnosis on a neutral party.',
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('neutral unit templates', () => {
  const baseTmpl = {
    abilities: [],
    tags: [],
    planeAffinity: {
      floor: { attack: 0, armor: 0 },
      ceiling: { attack: 0, armor: 0 },
      wall: { attack: 0, armor: 0 },
    },
  };

  it('parses the mouse / cockroach / stinkbug templates', () => {
    const result = unitsFileSchema.safeParse({
      version: 1,
      templates: [
        {
          ...baseTmpl,
          id: 'mouse',
          name: 'Mouse',
          faction: 'neutral',
          size: 'medium',
          slotCost: 2,
          movement: 'ground',
          baseStats: { hp: 14, attack: 5, agility: 4, armor: 1, intelligence: 2, constitution: 7 },
          tags: ['large', 'mercenary'],
        },
        {
          ...baseTmpl,
          id: 'cockroach',
          name: 'Cockroach',
          faction: 'neutral',
          size: 'small',
          slotCost: 1,
          movement: 'ground',
          baseStats: { hp: 6, attack: 6, agility: 7, armor: 0, intelligence: 1, constitution: 5 },
          tags: ['swarm', 'ferocious'],
        },
        {
          ...baseTmpl,
          id: 'stinkbug',
          name: 'Stinkbug',
          faction: 'neutral',
          size: 'small',
          slotCost: 1,
          movement: 'ground',
          baseStats: { hp: 8, attack: 3, agility: 3, armor: 1, intelligence: 2, constitution: 6 },
          tags: ['damage-zone'],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('map schema', () => {
  it('accepts a minimal 1x1x1 plane', () => {
    const result = mapFileSchema.safeParse({
      version: 1,
      name: 'Test Map',
      planes: [
        {
          plane: 'floor',
          width: 1,
          height: 1,
          tiles: [[{ kind: 'open', movementCost: 1, defenseModifier: 0 }]],
        },
      ],
      posts: [
        {
          id: 'storm-drain',
          name: 'The Storm Drain',
          location: { plane: 'floor', x: 0, y: 0 },
          owner: 'ant',
          defensiveBonus: 2,
          healingRate: 2,
          tags: ['home-base'],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects pairedWith referencing a non-existent post', () => {
    const result = mapFileSchema.safeParse({
      version: 1,
      name: 'Test Map',
      planes: [
        {
          plane: 'floor',
          width: 1,
          height: 1,
          tiles: [[{ kind: 'open', movementCost: 1, defenseModifier: 0 }]],
        },
      ],
      posts: [
        {
          id: 'a',
          name: 'A',
          location: { plane: 'floor', x: 0, y: 0 },
          owner: 'neutral',
          defensiveBonus: 0,
          healingRate: 0,
          pairedWith: 'does-not-exist',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched grid dimensions', () => {
    const result = mapFileSchema.safeParse({
      version: 1,
      name: 'Test Map',
      planes: [
        {
          plane: 'floor',
          width: 2,
          height: 1,
          tiles: [[{ kind: 'open', movementCost: 1, defenseModifier: 0 }]],
        },
      ],
      posts: [
        {
          id: 'a',
          name: 'A',
          location: { plane: 'floor', x: 0, y: 0 },
          owner: 'neutral',
          defensiveBonus: 0,
          healingRate: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('roster schema', () => {
  it('accepts a minimal valid file', () => {
    const result = rosterFileSchema.safeParse({
      version: 1,
      faction: 'ant',
      parties: [
        {
          id: 'queen-guard',
          leaderClass: 'queen',
          leaderIndex: 0,
          slotCapacity: 12,
          units: [
            { templateId: 'ant-queen', count: 1 },
            { templateId: 'ant-footman', count: 4 },
          ],
          startingLocation: { plane: 'floor', x: 0, y: 0 },
          posture: 'defend',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects out-of-bounds leaderIndex', () => {
    const result = rosterFileSchema.safeParse({
      version: 1,
      faction: 'ant',
      parties: [
        {
          id: 'p',
          leaderClass: 'sergeant',
          leaderIndex: 5,
          slotCapacity: 8,
          units: [{ templateId: 'ant-footman', count: 1 }],
          startingLocation: { plane: 'floor', x: 0, y: 0 },
          posture: 'fight',
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('leaders schema', () => {
  it('accepts a minimal valid file', () => {
    const result = leadersFileSchema.safeParse({
      version: 1,
      classes: [
        {
          id: 'sergeant',
          name: 'Sergeant',
          description: 'Veteran field commander.',
          modifiers: [{ stat: 'attack', delta: 1, appliesTo: 'party' }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('jelly schema', () => {
  it('accepts a minimal valid file', () => {
    const result = jellyFileSchema.safeParse({
      version: 1,
      productionPerTurn: 1,
      capacityPerParty: 3,
      dosesPerApplication: 1,
      durationTurns: 2,
      attackMultiplier: 1.25,
      resilienceMultiplier: 1.15,
    });
    expect(result.success).toBe(true);
  });
});

describe('queen schema', () => {
  it('accepts a minimal valid file', () => {
    const result = queenFileSchema.safeParse({
      version: 1,
      proximity: { radius: 2, attackMultiplier: 1.25, resilienceMultiplier: 1.15 },
      ultimate: {
        chargeMax: 100,
        chargePerTurn: 5,
        chargeOnHomeAttack: 10,
        radius: 5,
        damage: 50,
        usesPerScenario: 1,
      },
      production: { turnsPerUnit: 3, producedTemplateId: 'ant-footman' },
    });
    expect(result.success).toBe(true);
  });
});

describe('formations schema', () => {
  it('accepts a minimal valid file', () => {
    const result = formationsFileSchema.safeParse({
      version: 1,
      formations: [
        {
          id: 'phalanx',
          name: 'Phalanx',
          minUnits: 3,
          attackMultiplier: 1.0,
          defenseMultiplier: 1.25,
          description: 'Tight formation increases defense.',
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('shop schema', () => {
  it('accepts a minimal valid file', () => {
    const result = shopFileSchema.safeParse({
      version: 1,
      shopId: 'shoebox',
      shopName: 'The Forgotten Shoebox',
      proprietor: 'Grasshopper',
      locationPostId: 'shoebox-post',
      inventory: [
        {
          id: 'mouse-merc',
          name: 'Mouse Mercenary',
          kind: 'mercenary',
          price: 500,
          stock: 1,
          description: 'A grumpy mouse, available for hire.',
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('dialogue schema', () => {
  it('accepts a minimal valid file', () => {
    const result = dialogueFileSchema.safeParse({
      version: 1,
      lines: [
        {
          id: 'antonio-briefing',
          speaker: 'Sgt. Antonio',
          trigger: 'scenario-start',
          text: 'Listen up, soldiers. The spiders are dug in.',
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
