// ─────────────────────────────────────────────────────────────
// Pearloom / lib/planner/reusable-structure.ts
//
// A planner's PROVEN SHAPE, carried to the next client.
//
// The thing a planner actually accumulates is not content — it's a
// structure that works: which sections a wedding needs in what
// order, which layouts read well, the look they've refined over
// fifteen events. Today they'd rebuild that per client. This lifts
// the shape off a finished site so the next one starts from it.
//
// THE RULE THIS FILE EXISTS TO ENFORCE: a template carries
// STRUCTURE and LOOK, never CONTENT. A planner reusing last
// wedding's site must not accidentally ship Emma & James's story,
// their venue, their guest list, or their photographs to the next
// couple. That failure would be catastrophic and quiet — it would
// look like a working site.
//
// So the transform is an ALLOWLIST, not a blocklist. Anything not
// explicitly named as structural is dropped, which means a field
// added to the manifest later is excluded by default rather than
// leaking on its first day.
//
// Pure + testable.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

/**
 * Manifest keys that describe SHAPE or LOOK and carry no client
 * information. Everything else is dropped.
 *
 * Adding to this list is a privacy decision: ask "could this field
 * ever contain a person's name, words, photo, address, or guest?"
 * If yes — or if unsure — it doesn't belong here.
 */
export const STRUCTURAL_KEYS: readonly string[] = [
  // Shape
  'blockOrder',
  'hiddenSections',
  'blockVariants',
  'siteMode',
  'siteLayout',
  // Look
  'themeId',
  'themeVars',
  'theme',
  'kitId',
  'texture',
  'textureIntensity',
  'motifLayout',
  'motifs',
  'density',
  'edition',
  'appliedPackId',
  'arrival',
  // Occasion shapes the defaults; it identifies no one.
  'occasion',
];

export interface ReusableStructure {
  /** Planner's own label for this shape. */
  name: string;
  /** The structural subset — safe to apply to any new site. */
  manifest: Partial<StoryManifest>;
  /** Keys deliberately dropped, so the UI can say what won't carry
   *  rather than letting a planner assume the content came too. */
  dropped: string[];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Lift the reusable shape off a finished site.
 *
 * Allowlist-based: an unrecognized key is dropped, always. The
 * `dropped` list is returned so the surface can be honest about it.
 */
export function extractReusableStructure(
  source: StoryManifest | Record<string, unknown> | null | undefined,
  name: string,
): ReusableStructure {
  const src = isPlainObject(source) ? source : {};
  const manifest: Record<string, unknown> = {};
  const dropped: string[] = [];

  for (const key of Object.keys(src)) {
    if (STRUCTURAL_KEYS.includes(key)) {
      const v = src[key];
      if (v !== undefined && v !== null) manifest[key] = v;
    } else {
      dropped.push(key);
    }
  }

  return {
    name: (name ?? '').trim().slice(0, 80) || 'Untitled shape',
    manifest: manifest as Partial<StoryManifest>,
    dropped: dropped.sort(),
  };
}

/**
 * Apply a saved shape to a new (or in-progress) manifest.
 *
 * The structure NEVER overwrites content — it can't, since it holds
 * none — and it never clobbers a choice the new host has already
 * made: existing values win, so applying a template to a
 * half-configured site is additive rather than destructive.
 */
export function applyReusableStructure(
  target: StoryManifest | Record<string, unknown> | null | undefined,
  structure: ReusableStructure | null | undefined,
): StoryManifest {
  const base = isPlainObject(target) ? { ...target } : {};
  const shape = isPlainObject(structure?.manifest) ? structure!.manifest : {};

  for (const [key, value] of Object.entries(shape)) {
    if (!STRUCTURAL_KEYS.includes(key)) continue;   // belt and braces
    if (base[key] === undefined || base[key] === null) {
      base[key] = value;
    }
  }
  return base as unknown as StoryManifest;
}

/** Plain sentence naming what a shape carries — for the UI, so a
 *  planner is never surprised by what didn't come across. */
export function structureSummary(structure: ReusableStructure): string {
  const m = structure.manifest as Record<string, unknown>;
  const bits: string[] = [];
  if (Array.isArray(m.blockOrder)) bits.push(`${(m.blockOrder as unknown[]).length} sections in order`);
  if (m.themeId) bits.push('the look');
  if (m.kitId || m.texture) bits.push('paper and cards');
  if (m.edition) bits.push('the layout set');
  if (bits.length === 0) return 'Nothing to carry over yet.';
  const last = bits[bits.length - 1];
  const head = bits.slice(0, -1);
  return `Carries ${head.length ? `${head.join(', ')} and ${last}` : last}. No names, words, photos or guests.`;
}
