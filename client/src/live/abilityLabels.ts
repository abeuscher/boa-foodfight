import scenarioData from '../fixtures/scenario-l1-data.json';

interface AbilityDef {
  readonly id: string;
  readonly name: string;
  readonly category?: string;
}

const abilityMap = new Map<string, AbilityDef>();
for (const a of (scenarioData as { abilities: { abilities: AbilityDef[] } }).abilities.abilities) {
  abilityMap.set(a.id, a);
}

/** Engine-surfaced display name for an ability id (from abilities.json),
 * falling back to the raw id. The party-detail drill-down lists a unit's
 * template abilities by name; it does not invent abilities or show
 * scenario-unresolved magnitudes (§4g). */
export const abilityLabel = (id: string): string => abilityMap.get(id)?.name ?? id;
export const abilityCategory = (id: string): string | undefined => abilityMap.get(id)?.category;
