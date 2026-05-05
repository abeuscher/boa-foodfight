import { describe, expect, it } from 'vitest';

import { edgeAnchor, edgeNeighbor, isOnPlaneEdge } from './edges.ts';

describe('edges: floor ↔ wall mappings', () => {
  it('floor north edge maps to north-wall bottom row', () => {
    expect(edgeNeighbor({ plane: 'floor', x: 5, y: 0 }, 'north-wall')).toEqual({
      plane: 'north-wall',
      x: 5,
      y: 9,
    });
  });
  it('floor south edge maps to south-wall bottom row', () => {
    expect(edgeNeighbor({ plane: 'floor', x: 3, y: 9 }, 'south-wall')).toEqual({
      plane: 'south-wall',
      x: 3,
      y: 9,
    });
  });
  it('floor west edge maps to west-wall bottom row (with axis swap)', () => {
    expect(edgeNeighbor({ plane: 'floor', x: 0, y: 4 }, 'west-wall')).toEqual({
      plane: 'west-wall',
      x: 4,
      y: 9,
    });
  });
  it('floor east edge maps to east-wall bottom row (with axis swap)', () => {
    expect(edgeNeighbor({ plane: 'floor', x: 9, y: 7 }, 'east-wall')).toEqual({
      plane: 'east-wall',
      x: 7,
      y: 9,
    });
  });
});

describe('edges: ceiling ↔ wall mappings', () => {
  it('ceiling north edge maps to north-wall top row', () => {
    expect(edgeNeighbor({ plane: 'ceiling', x: 5, y: 0 }, 'north-wall')).toEqual({
      plane: 'north-wall',
      x: 5,
      y: 0,
    });
  });
  it('ceiling east edge maps to east-wall top row (with axis swap)', () => {
    expect(edgeNeighbor({ plane: 'ceiling', x: 9, y: 3 }, 'east-wall')).toEqual({
      plane: 'east-wall',
      x: 3,
      y: 0,
    });
  });
});

describe('edges: wall corner traversals', () => {
  it('north-wall west edge ↔ west-wall east edge (NW corner)', () => {
    expect(edgeNeighbor({ plane: 'north-wall', x: 0, y: 5 }, 'west-wall')).toEqual({
      plane: 'west-wall',
      x: 9,
      y: 5,
    });
    expect(edgeNeighbor({ plane: 'west-wall', x: 9, y: 5 }, 'north-wall')).toEqual({
      plane: 'north-wall',
      x: 0,
      y: 5,
    });
  });
  it('south-wall east edge ↔ east-wall west edge (SE corner)', () => {
    expect(edgeNeighbor({ plane: 'south-wall', x: 9, y: 7 }, 'east-wall')).toEqual({
      plane: 'east-wall',
      x: 0,
      y: 7,
    });
  });
});

describe('edges: non-adjacent planes', () => {
  it('floor and ceiling do NOT share an edge', () => {
    expect(edgeNeighbor({ plane: 'floor', x: 5, y: 5 }, 'ceiling')).toBeUndefined();
  });
  it('opposite walls do NOT share an edge (north and south)', () => {
    expect(edgeNeighbor({ plane: 'north-wall', x: 5, y: 5 }, 'south-wall')).toBeUndefined();
  });
});

describe('isOnPlaneEdge', () => {
  it('returns true for boundary tiles', () => {
    expect(isOnPlaneEdge({ plane: 'floor', x: 0, y: 5 })).toBe(true);
    expect(isOnPlaneEdge({ plane: 'floor', x: 5, y: 9 })).toBe(true);
  });
  it('returns false for interior tiles', () => {
    expect(isOnPlaneEdge({ plane: 'floor', x: 5, y: 5 })).toBe(false);
  });
});

describe('edgeAnchor', () => {
  it('finds the closest edge tile that connects to the target plane', () => {
    // From floor (5, 5) heading to north-wall: closest edge is (5, 0).
    expect(edgeAnchor({ plane: 'floor', x: 5, y: 5 }, 'north-wall')).toEqual({
      plane: 'floor',
      x: 5,
      y: 0,
    });
  });
  it('returns undefined for non-adjacent target planes', () => {
    expect(edgeAnchor({ plane: 'floor', x: 5, y: 5 }, 'ceiling')).toBeUndefined();
  });
});
