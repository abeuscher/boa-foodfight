/**
 * Deterministic seeded random source. mulberry32 PRNG; forking derives a
 * child seed from the parent's state mixed with a label hash so unrelated
 * subsystems can each pull from independent streams without perturbing one
 * another (e.g., adding a new ability roll won't change battle outcomes).
 */

import type { Rng } from './types.ts';

const FNV_PRIME = 0x01000193;

const hashLabel = (seed: number, label: string): number => {
  let hash = seed >>> 0;
  for (let i = 0; i < label.length; i++) {
    hash = Math.imul(hash ^ label.charCodeAt(i), FNV_PRIME) >>> 0;
  }
  return hash;
};

export const createRng = (seed: number): Rng => {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (maxExclusive: number): number => {
    if (maxExclusive <= 0 || !Number.isInteger(maxExclusive)) {
      throw new Error(`int() requires a positive integer, got ${String(maxExclusive)}`);
    }
    return Math.floor(next() * maxExclusive);
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error('pick() called on empty array');
    }
    const item = items[int(items.length)];
    if (item === undefined) {
      throw new Error('pick() returned undefined (corrupt array?)');
    }
    return item;
  };

  const fork = (label: string): Rng => createRng(hashLabel(state, label));

  return { next, int, pick, fork };
};
