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

  // ── Tuscan Villa ─────────────────────────────────────────
  'tuscan-villa': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M5 90 Q10 70 8 50 Q12 65 15 80 M8 85 Q18 60 15 35 Q22 55 20 75" fill="none" stroke="#B8693D" stroke-width="1.5" opacity="0.35"/><circle cx="8" cy="48" r="3" fill="#B8693D" opacity="0.15"/><circle cx="15" cy="33" r="2.5" fill="#B8693D" opacity="0.12"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="25" height="25" fill="none" stroke="#B8693D" stroke-width="0.3" opacity="0.04"/><rect x="25" y="25" width="25" height="25" fill="none" stroke="#B8693D" stroke-width="0.3" opacity="0.04"/></svg>',
    dividerPath: 'M0,30 Q20,22 40,28 Q60,18 80,26 Q100,22 120,28 Q140,18 160,26 Q180,22 200,28',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M45 80 L45 30 Q45 15 50 10 Q55 15 55 30 L55 80" fill="none" stroke="#B8693D" stroke-width="1.5" opacity="0.2"/><path d="M42 80 L42 35 Q42 18 50 8 Q58 18 58 35 L58 80" fill="none" stroke="#B8693D" stroke-width="0.8" opacity="0.12"/></svg>',
  },

  // ── French Chateau ──────────────────────────────────────
  'french-chateau': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M20 5 Q15 15 20 25 Q25 15 20 5Z M20 25 L15 35 L20 30 L25 35Z" fill="#6B8CAE" opacity="0.25"/><path d="M5 5 L35 5 L35 8 L8 8 L8 35 L5 35Z" fill="none" stroke="#6B8CAE" stroke-width="0.8" opacity="0.15"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 5 Q30 15 25 25 Q20 15 25 5Z" fill="#6B8CAE" opacity="0.03"/><path d="M10 30 Q15 40 10 50 Q5 40 10 30Z" fill="#6B8CAE" opacity="0.025"/><path d="M40 30 Q45 40 40 50 Q35 40 40 30Z" fill="#6B8CAE" opacity="0.025"/></svg>',
    dividerPath: 'M0,25 Q10,18 20,25 Q30,32 40,25 Q50,18 60,25 Q70,32 80,25 Q90,18 100,25 Q110,32 120,25 Q130,18 140,25 Q150,32 160,25 Q170,18 180,25 Q190,32 200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="30" ry="38" fill="none" stroke="#6B8CAE" stroke-width="1.5" opacity="0.2"/><ellipse cx="50" cy="50" rx="22" ry="30" fill="none" stroke="#6B8CAE" stroke-width="0.8" opacity="0.12"/><path d="M50 12 L50 88 M20 50 L80 50" stroke="#6B8CAE" stroke-width="0.5" opacity="0.08"/></svg>',
  },

  // ── Southern Charm ──────────────────────────────────────
  'southern-charm': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M15 30 Q10 20 18 12 Q26 20 20 28 Q14 22 15 30Z" fill="#E8A87C" opacity="0.25"/><path d="M18 15 Q22 8 28 12" fill="none" stroke="#E8A87C" stroke-width="1" opacity="0.2"/><circle cx="30" cy="10" r="1.5" fill="#E8A87C" opacity="0.2"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 20 Q22 15 25 10 Q28 15 25 20Z" fill="#E8A87C" opacity="0.04"/><circle cx="25" cy="10" r="1" fill="#E8A87C" opacity="0.03"/></svg>',
    dividerPath: 'M0,25 Q15,15 30,25 Q45,35 60,25 Q75,15 90,25 Q105,35 120,25 Q135,15 150,25 Q165,35 180,25 Q195,15 200,22',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 25 Q60 30 62 42 Q64 54 55 60 Q46 66 38 58 Q30 50 35 40 Q40 30 50 25Z" fill="none" stroke="#E8A87C" stroke-width="1.5" opacity="0.25"/><path d="M50 30 Q56 34 57 42 Q58 50 52 54 Q46 58 42 52 Q38 46 41 40 Q44 34 50 30Z" fill="#E8A87C" opacity="0.06"/></svg>',
  },

  // ── Industrial Chic ─────────────────────────────────────
  'industrial-chic': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="30" height="3" fill="#B87333" opacity="0.3"/><rect x="5" y="5" width="3" height="30" fill="#B87333" opacity="0.3"/><circle cx="8" cy="8" r="3" fill="none" stroke="#B87333" stroke-width="1.5" opacity="0.25"/><circle cx="8" cy="8" r="1.5" fill="#B87333" opacity="0.15"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="24" width="50" height="0.5" fill="#B87333" opacity="0.04"/><rect x="24" y="0" width="0.5" height="50" fill="#B87333" opacity="0.04"/></svg>',
    dividerPath: 'M0,25 L200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="25" fill="none" stroke="#B87333" stroke-width="2" opacity="0.2"/><path d="M50 25 L53 47 L75 50 L53 53 L50 75 L47 53 L25 50 L47 47Z" fill="none" stroke="#B87333" stroke-width="1" opacity="0.15"/></svg>',
  },

  // ── Modern Glam ─────────────────────────────────────────
  'modern-glam': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><line x1="5" y1="5" x2="40" y2="5" stroke="#E84393" stroke-width="2" opacity="0.3"/><line x1="5" y1="5" x2="5" y2="40" stroke="#E84393" stroke-width="2" opacity="0.3"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><circle cx="25" cy="25" r="0.8" fill="#E84393" opacity="0.06"/></svg>',
    dividerPath: 'M0,25 L85,25 L90,20 L95,25 L100,20 L105,25 L110,20 L115,25 L200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 20 L60 45 L85 50 L60 55 L50 80 L40 55 L15 50 L40 45Z" fill="none" stroke="#E84393" stroke-width="1.5" opacity="0.2"/></svg>',
  },

  // ── Vintage Romance ─────────────────────────────────────
  'vintage-romance': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 Q5 25 15 15 Q25 25 20 35 Q15 28 10 40Z" fill="#C48B8B" opacity="0.2"/><path d="M5 50 Q8 30 20 20 Q12 35 10 48" fill="none" stroke="#C48B8B" stroke-width="1" opacity="0.2"/><path d="M15 50 Q20 35 30 28" fill="none" stroke="#C48B8B" stroke-width="0.8" opacity="0.15"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><circle cx="25" cy="25" r="8" fill="none" stroke="#C48B8B" stroke-width="0.3" opacity="0.04" stroke-dasharray="2 2"/></svg>',
    dividerPath: 'M0,25 Q10,20 20,25 Q25,22 30,25 Q40,30 50,25 Q60,20 70,25 Q75,22 80,25 Q90,30 100,25 Q110,20 120,25 Q125,22 130,25 Q140,30 150,25 Q160,20 170,25 Q175,22 180,25 Q190,30 200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="28" ry="35" fill="none" stroke="#C48B8B" stroke-width="1.5" opacity="0.2"/><path d="M35 20 Q50 15 65 20 M35 80 Q50 85 65 80" fill="none" stroke="#C48B8B" stroke-width="1" opacity="0.15"/></svg>',
  },

  // ── Rustic Romance ──────────────────────────────────────
  'rustic-romance': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M5 60 L8 30 L5 5 M8 60 L12 28 L8 5 M12 55 L15 30 L12 8" fill="none" stroke="#C97C30" stroke-width="1" opacity="0.2"/><circle cx="5" cy="5" r="2" fill="#C97C30" opacity="0.15"/><circle cx="8" cy="3" r="1.5" fill="#C97C30" opacity="0.1"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="50" y2="50" stroke="#C97C30" stroke-width="0.3" opacity="0.03"/><line x1="50" y1="0" x2="0" y2="50" stroke="#C97C30" stroke-width="0.3" opacity="0.03"/></svg>',
    dividerPath: 'M0,22 Q5,28 10,25 Q15,22 20,28 Q25,22 30,25 Q35,28 40,22 Q45,28 50,25 Q55,22 60,28 Q65,22 70,25 Q75,28 80,22 Q85,28 90,25 Q95,22 100,28 Q105,22 110,25 Q115,28 120,22 Q125,28 130,25 Q135,22 140,28 Q145,22 150,25 Q155,28 160,22 Q165,28 170,25 Q175,22 180,28 Q185,22 190,25 Q195,28 200,22',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M30 70 L30 40 Q30 30 40 25 L50 20 L60 25 Q70 30 70 40 L70 70" fill="none" stroke="#C97C30" stroke-width="1.5" opacity="0.2"/><path d="M40 55 Q50 48 60 55" fill="none" stroke="#C97C30" stroke-width="1" opacity="0.15"/><circle cx="50" cy="42" r="3" fill="#C97C30" opacity="0.1"/></svg>',
  },

  // ── Dark Romance ────────────────────────────────────────
  'dark-romance': {
    cornerSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M15 35 Q8 20 18 10 Q28 20 22 32 Q16 24 15 35Z" fill="#8B2040" opacity="0.3"/><path d="M25 25 Q30 15 38 18" fill="none" stroke="#8B2040" stroke-width="1" opacity="0.2"/></svg>',
    heroPatternSvg: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 20 Q22 15 25 10 Q28 15 25 20Z" fill="#8B2040" opacity="0.04"/></svg>',
    dividerPath: 'M0,25 Q25,15 50,25 Q75,35 100,25 Q125,15 150,25 Q175,35 200,25',
    accentSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 25 Q60 30 62 45 Q64 60 50 65 Q36 60 38 45 Q40 30 50 25Z" fill="none" stroke="#8B2040" stroke-width="1.5" opacity="0.25"/><path d="M50 30 Q45 42 50 55 Q55 42 50 30Z" fill="#8B2040" opacity="0.08"/></svg>',
  },
};

/** Get art for a theme, falling back to empty object */
export function getThemeArt(themeId: string): ThemeArt {
  return THEME_ART[themeId] || {};
}
