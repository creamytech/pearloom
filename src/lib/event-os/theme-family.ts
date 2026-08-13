// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/theme-family.ts
//
// Which brand family does a published site render in?
//   'editorial' — timeless, letterpress, olive + gold thread.
//   'groove'    — warm, wavy, pear-and-loom organic.
//
// Default is picked by occasion VOICE:
//   ceremonial + solemn → editorial (dignity matters)
//   celebratory + playful + intimate → groove (warmth matters)
//
// Hosts can always override in the editor. This function is
// the ONE source of truth for the default — every other
// surface (wizard, generation, renderer) calls into it.
// ─────────────────────────────────────────────────────────────

import { EVENT_TYPES, type EventVoice } from './event-types';
import type { SiteOccasion } from '@/lib/site-urls';
import type { StoryManifest } from '@/types';

export type ThemeFamily = 'editorial' | 'groove';

/**
 * Map from occasion voice to default brand family. Conservative
 * by design: anything ceremonial or solemn stays editorial
 * regardless of how warm the rest of the product UI feels.
 */
const VOICE_TO_FAMILY: Record<EventVoice, ThemeFamily> = {
  ceremonial:  'editorial',
  solemn:      'editorial',
  intimate:    'editorial',  // weddings, anniversaries, showers
  celebratory: 'groove',
  playful:     'groove',
};

/**
 * Resolve the default theme family for a given occasion. Falls
 * back to 'editorial' for unknown occasions — the safe default.
 */
export function getDefaultThemeFamily(
  occasion: SiteOccasion | string | undefined | null,
): ThemeFamily {
  if (!occasion) return 'editorial';
  const entry = EVENT_TYPES.find((e) => e.id === occasion);
  if (!entry) return 'editorial';
  return VOICE_TO_FAMILY[entry.voice];
}

/**
 * Read the effective theme family for a manifest: explicit
 * override wins, otherwise fall back to the occasion's default.
 */
export function resolveThemeFamily(manifest: StoryManifest | null | undefined): ThemeFamily {
  if (!manifest) return 'editorial';
  if (manifest.themeFamily === 'groove' || manifest.themeFamily === 'editorial') {
    return manifest.themeFamily;
  }
  return getDefaultThemeFamily(manifest.occasion);
}
