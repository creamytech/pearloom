// ─────────────────────────────────────────────────────────────
// Pearloom / lib/theme-art.ts
// Hand-crafted SVG art per theme: corner flourishes, hero
// patterns, section dividers, and decorative accents.
// Each theme gets unique visual identity beyond just colors.
// ─────────────────────────────────────────────────────────────

export interface ThemeArt {
  cornerSvg?: string;
  heroPatternSvg?: string;
  dividerPath?: string;
  accentSvg?: string;
}

export const THEME_ART: Record<string, ThemeArt> = {

  // ── Ethereal Garden ─────────────────────────────────────
  'ethereal-garden': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M5 95 Q5 50 30 35 Q15 60 20 80 M15 90 Q20 55 45 30 Q25 50 28 75 M25 85 Q35 45 60 25 Q40 45 38 70" fill="none" stroke="#6A8F5A" stroke-width="1.5" opacity="0.5"/><circle cx="30" cy="35" r="2" fill="#6A8F5A" opacity="0.4"/><circle cx="45" cy="28" r="1.5" fill="#6A8F5A" opacity="0.3"/><circle cx="60" cy="22" r="2.5" fill="#6A8F5A" opacity="0.35"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 Q15 30 10 25 Q5 30 10 40Z" fill="#6A8F5A" opacity="0.06"/><path d="M35 15 Q40 5 35 0 Q30 5 35 15Z" fill="#6A8F5A" opacity="0.04"/><circle cx="25" cy="25" r="1" fill="#6A8F5A" opacity="0.08"/></svg>',
    dividerPath: 'M0,25 Q25,10 50,20 T100,25 Q125,15 150,22 T200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="35" fill="none" stroke="#6A8F5A" stroke-width="1" opacity="0.3"/><path d="M50 15 Q65 25 60 40 Q55 30 50 15Z M85 50 Q75 65 60 60 Q70 55 85 50Z M50 85 Q35 75 40 60 Q45 70 50 85Z M15 50 Q25 35 40 40 Q30 45 15 50Z" fill="#6A8F5A" opacity="0.2"/></svg>',
  },

  // ── Midnight Luxe ───────────────────────────────────────
  'midnight-luxe': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L30 0 L0 30Z" fill="none" stroke="#C4A96A" stroke-width="1" opacity="0.4"/><path d="M0 0 L20 0 L0 20Z" fill="#C4A96A" opacity="0.08"/><line x1="0" y1="40" x2="40" y2="0" stroke="#C4A96A" stroke-width="0.5" opacity="0.2"/><line x1="0" y1="50" x2="50" y2="0" stroke="#C4A96A" stroke-width="0.5" opacity="0.15"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 0 L50 25 L25 50 L0 25Z" fill="none" stroke="#C4A96A" stroke-width="0.5" opacity="0.06"/><path d="M25 10 L40 25 L25 40 L10 25Z" fill="none" stroke="#C4A96A" stroke-width="0.3" opacity="0.04"/></svg>',
    dividerPath: 'M0,25 L20,25 L25,15 L30,25 L50,25 L55,20 L60,25 L70,25 L75,15 L80,25 L100,25 L120,25 L125,15 L130,25 L150,25 L155,20 L160,25 L170,25 L175,15 L180,25 L200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 10 L55 45 L90 50 L55 55 L50 90 L45 55 L10 50 L45 45Z" fill="none" stroke="#C4A96A" stroke-width="1.5" opacity="0.4"/><circle cx="50" cy="50" r="5" fill="#C4A96A" opacity="0.15"/></svg>',
  },

  // ── Coastal Breeze ──────────────────────────────────────
  'coastal-breeze': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0 80 Q20 60 10 40 Q30 55 25 75 M0 90 Q30 70 20 45 Q40 60 35 80" fill="none" stroke="#3A7CA8" stroke-width="1.5" opacity="0.3"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M0 30 Q12.5 20 25 30 Q37.5 40 50 30" fill="none" stroke="#3A7CA8" stroke-width="0.8" opacity="0.06"/><path d="M0 40 Q12.5 30 25 40 Q37.5 50 50 40" fill="none" stroke="#3A7CA8" stroke-width="0.6" opacity="0.04"/></svg>',
    dividerPath: 'M0,25 Q25,5 50,25 Q75,45 100,25 Q125,5 150,25 Q175,45 200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 20 Q70 20 75 40 Q80 60 65 70 Q50 80 40 65 Q30 50 35 35 Q40 20 50 20Z" fill="none" stroke="#3A7CA8" stroke-width="1.5" opacity="0.3"/><path d="M50 30 Q60 30 63 40 Q66 50 58 55 Q50 60 45 52 Q40 44 43 37 Q46 30 50 30Z" fill="#3A7CA8" opacity="0.08"/></svg>',
  },

  // ── Art Deco Glamour ────────────────────────────────────
  'art-deco-glamour': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L40 0 L40 5 L5 5 L5 40 L0 40Z" fill="#C9A84C" opacity="0.3"/><path d="M10 0 L10 30 M20 0 L20 20 M30 0 L30 10" stroke="#C9A84C" stroke-width="1" opacity="0.15"/><path d="M0 10 L30 10 M0 20 L20 20 M0 30 L10 30" stroke="#C9A84C" stroke-width="1" opacity="0.15"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 0 Q35 12 25 25 Q15 12 25 0Z" fill="#C9A84C" opacity="0.04"/><path d="M0 25 Q12 15 25 25 Q12 35 0 25Z" fill="#C9A84C" opacity="0.03"/><path d="M25 25 Q35 37 25 50 Q15 37 25 25Z" fill="#C9A84C" opacity="0.04"/><path d="M25 25 Q37 15 50 25 Q37 35 25 25Z" fill="#C9A84C" opacity="0.03"/></svg>',
    dividerPath: 'M0,25 L15,25 L20,15 L25,25 L30,15 L35,25 L50,25 L65,25 L70,15 L75,25 L80,15 L85,25 L100,25 L115,25 L120,15 L125,25 L130,15 L135,25 L150,25 L165,25 L170,15 L175,25 L180,15 L185,25 L200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="20" width="60" height="60" fill="none" stroke="#C9A84C" stroke-width="1.5" opacity="0.3"/><rect x="30" y="30" width="40" height="40" fill="none" stroke="#C9A84C" stroke-width="1" opacity="0.2"/><path d="M50 20 L50 80 M20 50 L80 50" stroke="#C9A84C" stroke-width="0.5" opacity="0.15"/></svg>',
  },

  // ── Enchanted Forest ────────────────────────────────────
  'enchanted-forest': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M5 95 Q8 60 25 45 M10 90 Q18 55 40 35 M2 80 Q5 70 15 60" fill="none" stroke="#2E7D52" stroke-width="1.5" opacity="0.4"/><circle cx="25" cy="42" r="3" fill="#2E7D52" opacity="0.2"/><circle cx="40" cy="32" r="2" fill="#2E7D52" opacity="0.15"/><circle cx="12" cy="58" r="1.5" fill="#4AE080" opacity="0.3"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 45 L25 20 M20 30 L25 25 M30 35 L25 30" fill="none" stroke="#2E7D52" stroke-width="0.8" opacity="0.06"/><circle cx="10" cy="10" r="1" fill="#4AE080" opacity="0.1"/><circle cx="40" cy="40" r="0.8" fill="#4AE080" opacity="0.08"/></svg>',
    dividerPath: 'M0,30 Q10,20 20,28 Q30,10 45,25 Q55,15 65,22 Q80,8 95,20 Q110,28 120,18 Q135,10 150,25 Q160,15 175,22 Q185,30 200,20',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="#2E7D52" opacity="0.08"/><circle cx="50" cy="50" r="32" fill="none" stroke="#2E7D52" stroke-width="0.5" opacity="0.2"/><path d="M50 18 L50 82 M40 35 Q50 28 60 35 M38 45 Q50 38 62 45" fill="none" stroke="#2E7D52" stroke-width="1" opacity="0.15"/></svg>',
  },

  // ── Desert Boho ─────────────────────────────────────────
  'desert-boho': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 90 L10 60 L15 55 L10 50 L15 45 L10 40" fill="none" stroke="#C4622D" stroke-width="1.5" opacity="0.3"/><path d="M20 95 L30 75 L25 70 L35 50" fill="none" stroke="#C4622D" stroke-width="1" opacity="0.2"/><circle cx="35" cy="48" r="3" fill="none" stroke="#C4622D" stroke-width="1" opacity="0.25"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 40 L20 25 L25 10 L30 25Z" fill="none" stroke="#C4622D" stroke-width="0.5" opacity="0.06"/><circle cx="25" cy="25" r="1" fill="#C4622D" opacity="0.04"/></svg>',
    dividerPath: 'M0,25 L10,25 L15,20 L20,25 L25,20 L30,25 L40,25 L50,25 L60,25 L65,20 L70,25 L75,20 L80,25 L90,25 L100,25 L110,25 L115,20 L120,25 L125,20 L130,25 L140,25 L150,25 L160,25 L165,20 L170,25 L175,20 L180,25 L190,25 L200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="25" fill="none" stroke="#C4622D" stroke-width="1" opacity="0.25"/><path d="M50 25 L55 45 L50 50 L45 45Z M75 50 L55 55 L50 50 L55 45Z M50 75 L45 55 L50 50 L55 55Z M25 50 L45 45 L50 50 L45 55Z" fill="none" stroke="#C4622D" stroke-width="0.8" opacity="0.2"/></svg>',
  },

  // ── Tropical Paradise ───────────────────────────────────
  'tropical-paradise': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0 70 Q15 50 10 30 Q25 45 20 65 M5 80 Q25 55 20 30 Q35 50 30 70" fill="none" stroke="#E87461" stroke-width="2" opacity="0.3"/><path d="M15 25 Q20 20 25 25 Q20 30 15 25Z" fill="#E87461" opacity="0.2"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 5 Q35 15 30 30 Q25 20 25 5Z M25 5 Q15 15 20 30 Q25 20 25 5Z" fill="#E87461" opacity="0.04"/></svg>',
    dividerPath: 'M0,25 Q15,10 30,25 Q45,40 60,25 Q75,10 90,25 Q105,40 120,25 Q135,10 150,25 Q165,40 180,25 Q195,10 200,20',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 20 Q65 30 60 50 Q55 35 50 20Z M50 20 Q35 30 40 50 Q45 35 50 20Z M55 50 Q70 55 65 70 Q58 60 55 50Z M45 50 Q30 55 35 70 Q42 60 45 50Z M50 50 Q50 70 50 80" fill="none" stroke="#E87461" stroke-width="1.2" opacity="0.25"/></svg>',
  },

  // ── Winter Wonderland ───────────────────────────────────
  'winter-wonderland': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M20 20 L20 5 M20 20 L5 20 M20 20 L10 10 M20 20 L30 10 M20 20 L10 30" stroke="#6BA3BE" stroke-width="1" opacity="0.3"/><circle cx="20" cy="5" r="2" fill="#6BA3BE" opacity="0.2"/><circle cx="5" cy="20" r="2" fill="#6BA3BE" opacity="0.2"/><circle cx="10" cy="10" r="1.5" fill="#6BA3BE" opacity="0.15"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 15 L25 35 M18 20 L32 30 M32 20 L18 30" stroke="#6BA3BE" stroke-width="0.5" opacity="0.05"/><circle cx="25" cy="25" r="1" fill="#6BA3BE" opacity="0.04"/></svg>',
    dividerPath: 'M0,25 L15,25 L20,20 L25,25 L30,20 L35,25 L40,20 L45,25 L60,25 L75,25 L80,20 L85,25 L90,20 L95,25 L100,20 L105,25 L120,25 L135,25 L140,20 L145,25 L150,20 L155,25 L160,20 L165,25 L180,25 L200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 10 L50 90 M10 50 L90 50 M22 22 L78 78 M78 22 L22 78" stroke="#6BA3BE" stroke-width="1" opacity="0.2"/><circle cx="50" cy="10" r="3" fill="#6BA3BE" opacity="0.15"/><circle cx="50" cy="90" r="3" fill="#6BA3BE" opacity="0.15"/><circle cx="10" cy="50" r="3" fill="#6BA3BE" opacity="0.15"/><circle cx="90" cy="50" r="3" fill="#6BA3BE" opacity="0.15"/><circle cx="50" cy="50" r="8" fill="none" stroke="#6BA3BE" stroke-width="1" opacity="0.2"/></svg>',
  },

  // ── Celestial Night ─────────────────────────────────────
  'celestial-night': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M15 30 Q5 15 20 10 Q10 20 15 30Z" fill="#C8A84A" opacity="0.3"/><circle cx="30" cy="15" r="1.5" fill="#C8A84A" opacity="0.4"/><circle cx="10" cy="40" r="1" fill="#C8A84A" opacity="0.3"/><circle cx="40" cy="8" r="0.8" fill="#C8A84A" opacity="0.25"/><circle cx="22" cy="22" r="0.5" fill="#C8A84A" opacity="0.35"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="0.8" fill="#C8A84A" opacity="0.08"/><circle cx="35" cy="20" r="0.5" fill="#C8A84A" opacity="0.06"/><circle cx="20" cy="40" r="1" fill="#C8A84A" opacity="0.05"/><circle cx="45" cy="45" r="0.6" fill="#C8A84A" opacity="0.04"/></svg>',
    dividerPath: 'M0,25 Q20,20 40,25 Q50,22 60,25 Q80,30 100,25 Q120,20 140,25 Q150,22 160,25 Q180,30 200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="20" fill="none" stroke="#C8A84A" stroke-width="1" opacity="0.25"/><path d="M30 50 Q40 35 50 50 Q60 35 70 50 Q60 65 50 50 Q40 65 30 50Z" fill="#C8A84A" opacity="0.08"/><circle cx="35" cy="30" r="1.5" fill="#C8A84A" opacity="0.3"/><circle cx="65" cy="25" r="1" fill="#C8A84A" opacity="0.25"/><circle cx="70" cy="70" r="0.8" fill="#C8A84A" opacity="0.2"/></svg>',
  },
};

/** Get art for a theme, falling back to empty object */
export function getThemeArt(themeId: string): ThemeArt {
  return THEME_ART[themeId] || {};
}
