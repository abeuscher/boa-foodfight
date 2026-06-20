/**
 * Lucide-based role icons for unit cards + end-screen faction emblem.
 *
 * Chunk 40 — the playthrough flagged that PartyDetail rows full of
 * text-only unit cards crowd the rail (Chunk 39 added a `.pd-row-cramped`
 * flag for the worst case). Replacing the role name with a small icon
 * lets a row carry more units legibly; CSS hides the name text when
 * `.pd-row-cramped` is set so the icon stands in for the role.
 *
 * Lucide ships a generic `Bug` but no ant / spider — we use role-class
 * icons (Crown for queens, Sword for melee, Target for ranged, etc.)
 * which read more usefully than a single repeating bug glyph. The
 * faction color (ant amber vs spider red) carries the "which side"
 * signal at the card level via `.pd-unit-icon-ant` / `-spider` CSS.
 *
 * End-screen: the previous emoji placeholder (`🐜` / `🕷️`) is replaced
 * with a Lucide `Bug` rendered larger and faction-tinted.
 */
import { Bug, Crown, Eye, Hammer, Network, Shield, Sparkles, Sword, Target } from 'lucide-react';

import type { Unit, UnitTemplate } from '../../../engine/types.ts';

import type { ComponentType, SVGProps } from 'react';

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { readonly size?: number | string }>;

/** Map a unit's templateId → a role-class Lucide icon. */
export function roleIconFor(templateId: string): LucideIcon {
  if (templateId.includes('queen')) return Crown;
  if (templateId.includes('mage')) return Sparkles;
  if (templateId.includes('spinner') || templateId.includes('weaver')) return Network;
  if (templateId.includes('archer') || templateId.includes('sharpshooter')) return Target;
  if (templateId.includes('scout') || templateId.includes('stalker')) return Eye;
  if (templateId.includes('worker')) return Hammer;
  if (templateId.includes('tank') || templateId.includes('potato-bug')) return Shield;
  // ant-footman, spider-soldier, elite, knight, veteran-* etc. → melee
  if (
    templateId.includes('footman') ||
    templateId.includes('soldier') ||
    templateId.includes('elite') ||
    templateId.includes('knight')
  ) {
    return Sword;
  }
  // Neutrals / generic — cockroach, stinkbug, mouse, spiderling.
  return Bug;
}

/** Derive the ant/spider/neutral tint class from a templateId. */
export function factionClassFor(templateId: string): string {
  if (templateId.startsWith('ant-')) return 'pd-unit-icon-ant';
  if (templateId.startsWith('spider-') || templateId === 'spiderling') return 'pd-unit-icon-spider';
  return 'pd-unit-icon-neutral';
}

interface UnitRoleIconProps {
  readonly unit: Unit;
  readonly template: UnitTemplate | undefined;
  readonly size?: number;
}

/** Render the role icon for a unit, faction-colored. */
export function UnitRoleIcon({ unit, template, size = 14 }: UnitRoleIconProps): JSX.Element {
  const Icon = roleIconFor(unit.templateId);
  const tint = factionClassFor(unit.templateId);
  return (
    <Icon
      size={size}
      className={`pd-u-icon ${tint}`}
      aria-label={template?.name ?? unit.templateId}
    />
  );
}

/** End-screen faction emblem — Lucide Bug, tinted ant or spider. */
export function FactionEmblem({ winner }: { readonly winner: 'ant' | 'spider' }): JSX.Element {
  return (
    <Bug
      size={64}
      strokeWidth={1.5}
      className={`end-emblem-icon end-emblem-${winner}`}
      aria-label={winner === 'ant' ? 'Ants' : 'Spiders'}
    />
  );
}
