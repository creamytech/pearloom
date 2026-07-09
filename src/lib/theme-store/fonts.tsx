'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / lib/theme-store/fonts.tsx
//
// The Theme Store's webfont loader. The pack catalog (packs.ts)
// sells typography — Cormorant, Playfair, Italiana, Bodoni and
// friends — but until 2026-06-09 nothing ever LOADED those
// families: pearloom.css only imports Fraunces + Caveat + Inter,
// so every non-Fraunces pack silently rendered Georgia. People
// were buying type they never saw.
//
// <StoreFonts /> injects one cached Google-Fonts stylesheet
// covering every family the catalog references (display=swap, so
// text renders in the fallback serif until the face arrives).
// Mounted on: the store, the published-site shell, and the
// in-editor theme shop. Idempotent — dedupes by element id.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';

const FAMILIES = [
  // Display serifs the catalog has always referenced.
  'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500',
  'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500',
  'DM+Serif+Display:ital@0;1',
  'Marcellus',
  'Cinzel:wght@400;500;600;700',
  'Italiana',
  'EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400',
  // Sans families.
  'Space+Grotesk:wght@400;500;600;700',
  'Tenor+Sans',
  'DM+Sans:wght@400;500;600;700',
  // 2026-06-09 premium additions.
  'Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;1,400',
  'Prata',
  'Gilda+Display',
  'Jost:wght@400;500;600',
  // Scripts.
  'Dancing+Script:wght@400;500;600;700',
  'Pinyon+Script',
  'Great+Vibes',
  'Parisienne',
] as const;

export const STORE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  FAMILIES.map((f) => `family=${f}`).join('&') +
  '&display=swap';

const LINK_ID = 'pl-store-fonts';

/** Idempotently mount the catalog stylesheet. Renders nothing. */
export function StoreFonts() {
  useEffect(() => {
    if (document.getElementById(LINK_ID)) return;
    const link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    link.href = STORE_FONTS_HREF;
    document.head.appendChild(link);
    // Deliberately never removed — fonts stay cached for the session.
  }, []);
  return null;
}
