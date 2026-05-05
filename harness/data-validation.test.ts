import fs from 'node:fs';
import path from 'node:path';

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
} from '../engine/schemas/index.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data', 'level-1');

const readJson = (file: string): unknown =>
  JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));

describe('per-file schema validation', () => {
  it('units.json validates', () => {
    expect(unitsFileSchema.safeParse(readJson('units.json')).success).toBe(true);
  });
  it('abilities.json validates', () => {
    expect(abilitiesFileSchema.safeParse(readJson('abilities.json')).success).toBe(true);
  });
  it('leaders.json validates', () => {
    expect(leadersFileSchema.safeParse(readJson('leaders.json')).success).toBe(true);
  });
  it('map.json validates', () => {
    expect(mapFileSchema.safeParse(readJson('map.json')).success).toBe(true);
  });
  it('jelly.json validates', () => {
    expect(jellyFileSchema.safeParse(readJson('jelly.json')).success).toBe(true);
  });
  it('queen.json validates', () => {
    expect(queenFileSchema.safeParse(readJson('queen.json')).success).toBe(true);
  });
  it('formations.json validates', () => {
    expect(formationsFileSchema.safeParse(readJson('formations.json')).success).toBe(true);
  });
  it('roster-ants.json validates', () => {
    expect(rosterFileSchema.safeParse(readJson('roster-ants.json')).success).toBe(true);
  });
  it('roster-spiders.json validates', () => {
    expect(rosterFileSchema.safeParse(readJson('roster-spiders.json')).success).toBe(true);
  });
  it('shop.json validates', () => {
    expect(shopFileSchema.safeParse(readJson('shop.json')).success).toBe(true);
  });
  it('dialogue.json validates', () => {
    expect(dialogueFileSchema.safeParse(readJson('dialogue.json')).success).toBe(true);
  });
});
