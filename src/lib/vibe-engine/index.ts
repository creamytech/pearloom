// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Pearloom / lib/vibe-engine/index.ts
// Public API — re-exports all types, constants, and functions.
// ——————————————————————————————————————————————————————————————————————————————————————————————————

// Types
export type { VibeSkin, CoupleProfile, VibeSkinContext, SiteArtResult } from './types';

// SVG library
export { WAVE_PATHS, CORNER_STYLES, extractSvgFromField, isValidSvg, buildFallbackArt } from './svg-library';

// Fallback
export { deriveFallback } from './fallback';

// Generator (Gemini-powered)
export { extractCoupleProfile, generateVibeSkin, generateSiteArt } from './generator';

// -- Synchronous fallback for SSR/Server Components ----------------------------
import { deriveFallback } from './fallback';
import type { VibeSkin } from './types';

export function deriveVibeSkin(vibeString: string): VibeSkin {
  return deriveFallback(vibeString);
}

// -- React hook for client components -----------------------------------------
import { useMemo } from 'react';

export function useVibeSkin(vibeString: string | undefined, cached?: VibeSkin): VibeSkin {
  return useMemo(
    () => cached || deriveFallback(vibeString || ''),
    [vibeString, cached]
  );
}
