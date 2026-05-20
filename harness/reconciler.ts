/**
 * Cross-file validation for Phase 1 data files.
 *
 * Runs the cross-file rules listed in CONTRACTS.md ("Reconciler cross-file
 * checks"). Per-file schema validation lives in
 * `harness/data-validation.test.ts`; this script runs only the cross-file
 * rules. It exits non-zero if any rule is violated.
 *
 * Usage: `pnpm reconcile` (also runs as part of `pnpm check`).
 */

import fs from 'node:fs';
import path from 'node:path';

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

const SPEC_LOCKED_POSTS = ['storm-drain', 'soap-dish', 'towel-rack', 'wall-crack', 'spider-web'];

interface Finding {
  rule: string;
  file: string;
  detail: string;
}

const findings: Finding[] = [];
const record = (rule: string, file: string, detail: string): void => {
  findings.push({ rule, file, detail });
};

const readJson = <T>(file: string, parse: (v: unknown) => T): T => {
  const data: unknown = JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
  return parse(data);
};

const units = readJson('units.json', (v) => unitsFileSchema.parse(v));
const abilities = readJson('abilities.json', (v) => abilitiesFileSchema.parse(v));
const leaders = readJson('leaders.json', (v) => leadersFileSchema.parse(v));
const map = readJson('map.json', (v) => mapFileSchema.parse(v));
const queen = readJson('queen.json', (v) => queenFileSchema.parse(v));
const rosterAnts = readJson('roster-ants.json', (v) => rosterFileSchema.parse(v));
const rosterSpiders = readJson('roster-spiders.json', (v) => rosterFileSchema.parse(v));
const shop = readJson('shop.json', (v) => shopFileSchema.parse(v));

// Surface-level reads to ensure these schemas still load (smoke check); otherwise unused here.
readJson('jelly.json', (v) => jellyFileSchema.parse(v));
readJson('formations.json', (v) => formationsFileSchema.parse(v));
readJson('dialogue.json', (v) => dialogueFileSchema.parse(v));

const unitIds = new Set(units.templates.map((t) => t.id));
const abilityIds = new Set(abilities.abilities.map((a) => a.id));
const leaderIds = new Set(leaders.classes.map((c) => c.id));
const postIds = new Set(map.posts.map((p) => p.id));

// Rule: every templateId in a roster exists in units.json.
for (const [file, roster] of [
  ['roster-ants.json', rosterAnts],
  ['roster-spiders.json', rosterSpiders],
] as const) {
  for (const party of roster.parties) {
    for (const u of party.units) {
      if (!unitIds.has(u.templateId)) {
        record(
          'roster.templateId-exists',
          file,
          `party '${party.id}' references unknown templateId '${u.templateId}'`,
        );
      }
    }
  }
}

// Rule: every ability referenced on a unit template exists in abilities.json.
for (const t of units.templates) {
  for (const a of t.abilities) {
    if (!abilityIds.has(a)) {
      record(
        'units.ability-exists',
        'units.json',
        `template '${t.id}' references unknown ability '${a}'`,
      );
    }
  }
}

// Rule: every leaderClass in a roster exists in leaders.json.
for (const [file, roster] of [
  ['roster-ants.json', rosterAnts],
  ['roster-spiders.json', rosterSpiders],
] as const) {
  for (const party of roster.parties) {
    if (!leaderIds.has(party.leaderClass)) {
      record(
        'roster.leaderClass-exists',
        file,
        `party '${party.id}' references unknown leaderClass '${party.leaderClass}'`,
      );
    }
  }
}

// Rule: producedTemplateId in queen.json exists in units.json.
if (!unitIds.has(queen.production.producedTemplateId)) {
  record(
    'queen.producedTemplateId-exists',
    'queen.json',
    `producedTemplateId '${queen.production.producedTemplateId}' not in units.json`,
  );
}

// Rule: if locationPostId is set in shop.json, it resolves to a post in map.json.
if (shop.locationPostId !== undefined && !postIds.has(shop.locationPostId)) {
  record(
    'shop.locationPostId-exists',
    'shop.json',
    `locationPostId '${shop.locationPostId}' not in map.json`,
  );
}

// Rule: any shop-inventory effect carrying a `templateId` field must resolve
// in units.json. Mercenary items typically encode the unit they hire this way.
for (const item of shop.inventory) {
  const tmplRef = item.effect.templateId;
  if (typeof tmplRef === 'string' && !unitIds.has(tmplRef)) {
    record(
      'shop.inventory.templateId-exists',
      'shop.json',
      `inventory item '${item.id}' references unknown templateId '${tmplRef}'`,
    );
  }
}

// Rule: every starting location in a roster falls within plane bounds.
const planeDims = new Map<string, { width: number; height: number }>();
for (const p of map.planes) {
  planeDims.set(p.plane, { width: p.width, height: p.height });
}
for (const [file, roster] of [
  ['roster-ants.json', rosterAnts],
  ['roster-spiders.json', rosterSpiders],
] as const) {
  for (const party of roster.parties) {
    const dim = planeDims.get(party.startingLocation.plane);
    if (!dim) {
      record(
        'roster.location.plane-exists',
        file,
        `party '${party.id}' on unknown plane '${party.startingLocation.plane}'`,
      );
      continue;
    }
    const { x, y } = party.startingLocation;
    if (x < 0 || x >= dim.width || y < 0 || y >= dim.height) {
      record(
        'roster.location.in-bounds',
        file,
        `party '${party.id}' at (${String(x)},${String(y)}) outside plane '${party.startingLocation.plane}' (${String(dim.width)}x${String(dim.height)})`,
      );
    }
  }
}

// Rule: Queen's party in roster-ants.json totals exactly 12 slot capacity, and
// the Queen unit therein has slotCost === 4.
const queenParty = rosterAnts.parties.find((p) =>
  p.units.some((u) => {
    const tmpl = units.templates.find((t) => t.id === u.templateId);
    return tmpl?.tags.includes('queen') ?? false;
  }),
);
if (!queenParty) {
  record(
    'roster.queen-party-exists',
    'roster-ants.json',
    "no party contains a unit tagged 'queen'",
  );
} else {
  if (queenParty.slotCapacity !== 12) {
    record(
      'roster.queen-party-capacity',
      'roster-ants.json',
      `queen-bearing party '${queenParty.id}' has slotCapacity ${String(queenParty.slotCapacity)}, expected 12`,
    );
  }
  // Queen slotCost is enforced as 4 by the units schema (size huge = slotCost 4 or 5),
  // but here we additionally pin it to exactly 4 for Tier 1.
  const queenUnit = queenParty.units.find((u) => {
    const tmpl = units.templates.find((t) => t.id === u.templateId);
    return tmpl?.tags.includes('queen') ?? false;
  });
  if (queenUnit) {
    const tmpl = units.templates.find((t) => t.id === queenUnit.templateId);
    if (tmpl && tmpl.slotCost !== 4) {
      record(
        'units.queen-slot-cost',
        'units.json',
        `queen-tagged template '${tmpl.id}' has slotCost ${String(tmpl.slotCost)}, expected 4`,
      );
    }
  }
  // Verify total slot usage in the queen-bearing party fits its capacity.
  let used = 0;
  for (const u of queenParty.units) {
    const tmpl = units.templates.find((t) => t.id === u.templateId);
    if (tmpl) used += tmpl.slotCost * u.count;
  }
  if (used !== queenParty.slotCapacity) {
    record(
      'roster.queen-party-fill',
      'roster-ants.json',
      `queen-bearing party '${queenParty.id}' uses ${String(used)} slots, capacity ${String(queenParty.slotCapacity)} (must be exactly equal for the queen guard)`,
    );
  }
}

// Rule: every other party respects a 9-slot cap in Tier 1 (raised
// 8→9 per roadmap §7.5 — ceiling for legible 3×3 rendering).
for (const [file, roster] of [
  ['roster-ants.json', rosterAnts],
  ['roster-spiders.json', rosterSpiders],
] as const) {
  for (const party of roster.parties) {
    const isQueenParty = party.units.some((u) => {
      const tmpl = units.templates.find((t) => t.id === u.templateId);
      return tmpl?.tags.includes('queen') ?? false;
    });
    if (isQueenParty) continue;
    if (party.slotCapacity > 9) {
      record(
        'roster.tier1-cap',
        file,
        `non-queen party '${party.id}' has slotCapacity ${String(party.slotCapacity)}, max 9 in Tier 1`,
      );
    }
    let used = 0;
    for (const u of party.units) {
      const tmpl = units.templates.find((t) => t.id === u.templateId);
      if (tmpl) used += tmpl.slotCost * u.count;
    }
    if (used > party.slotCapacity) {
      record(
        'roster.slot-overuse',
        file,
        `party '${party.id}' uses ${String(used)} slots, capacity ${String(party.slotCapacity)}`,
      );
    }
  }
}

// Rule: spec-locked POST identities and ownerships.
const expectedOwners: Record<string, string> = {
  'storm-drain': 'ant',
  'soap-dish': 'neutral',
  'spider-web': 'spider',
  'towel-rack': 'neutral',
  'wall-crack': 'neutral',
};
for (const expectedId of SPEC_LOCKED_POSTS) {
  const post = map.posts.find((p) => p.id === expectedId);
  if (!post) {
    record('map.spec-locked-posts', 'map.json', `missing spec-locked POST '${expectedId}'`);
    continue;
  }
  const expectedOwner = expectedOwners[expectedId];
  if (expectedOwner && post.owner !== expectedOwner) {
    record(
      'map.spec-locked-owners',
      'map.json',
      `POST '${expectedId}' owner is '${post.owner}', expected '${expectedOwner}'`,
    );
  }
}

// Rule: map contains exactly the five Level-1 POSTs (no more, no fewer).
const extras = map.posts.filter((p) => !SPEC_LOCKED_POSTS.includes(p.id));
if (extras.length > 0) {
  record(
    'map.exact-five-posts',
    'map.json',
    `extra POSTs not in spec: ${extras.map((p) => p.id).join(', ')}`,
  );
}
if (map.posts.length !== SPEC_LOCKED_POSTS.length) {
  record(
    'map.exact-five-posts',
    'map.json',
    `expected ${String(SPEC_LOCKED_POSTS.length)} POSTs, found ${String(map.posts.length)}`,
  );
}

// Rule: paired POSTs are mutually paired and on different planes.
for (const post of map.posts) {
  if (post.pairedWith) {
    const partner = map.posts.find((p) => p.id === post.pairedWith);
    if (!partner) {
      record(
        'map.pairing-resolves',
        'map.json',
        `POST '${post.id}' paired with unknown '${post.pairedWith}'`,
      );
      continue;
    }
    if (partner.pairedWith !== post.id) {
      record(
        'map.pairing-mutual',
        'map.json',
        `POST '${post.id}' paired with '${partner.id}', but '${partner.id}' paired with '${String(partner.pairedWith ?? 'nothing')}'`,
      );
    }
    if (partner.location.plane === post.location.plane) {
      record(
        'map.pairing-cross-plane',
        'map.json',
        `paired POSTs '${post.id}' and '${partner.id}' on same plane '${post.location.plane}' (pairings should bridge planes)`,
      );
    }
  }
}

// Report
if (findings.length === 0) {
  console.log('reconciler: 0 cross-file findings');
  process.exit(0);
} else {
  console.log(`reconciler: ${String(findings.length)} cross-file findings:\n`);
  for (const f of findings) {
    console.log(`  [${f.rule}] ${f.file}: ${f.detail}`);
  }
  process.exit(1);
}
