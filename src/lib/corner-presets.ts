// ──────────────────────────────────────────────────────────────
// Pearloom / lib/corner-presets.ts
// Swappable corner decoration presets — hand-crafted SVG art
// for when AI generation isn't available or user wants to choose
// ──────────────────────────────────────────────────────────────

export interface CornerPreset {
  id: string;
  label: string;
  category: 'botanical' | 'geometric' | 'whimsical' | 'minimal' | 'cultural';
  tags: string[];
  /** SVG markup — viewBox 0 0 300 300, accent color as {{ACCENT}} placeholder */
  svg: string;
}

/** Replace {{ACCENT}} with a real hex color */
export function renderCornerSvg(preset: CornerPreset, accentColor: string): string {
  return preset.svg.replace(/\{\{ACCENT\}\}/g, accentColor);
}

export const CORNER_PRESETS: CornerPreset[] = [
  // ── Botanical ──────────────────────────────────────────────
  {
    id: 'roses',
    label: 'Garden Roses',
    category: 'botanical',
    tags: ['floral', 'romantic', 'classic', 'wedding'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="none" stroke="{{ACCENT}}" opacity="0.25"><path d="M0,0 C80,10 120,60 140,140" stroke-width="1.5"/><path d="M0,20 C60,28 100,70 120,150" stroke-width="1"/><path d="M20,0 C28,60 70,100 150,120" stroke-width="1"/><circle cx="45" cy="45" r="18" stroke-width="1.2" opacity="0.2"/><path d="M45,27 C50,35 55,40 45,50 C35,40 40,35 45,27Z" fill="{{ACCENT}}" opacity="0.12"/><path d="M27,45 C35,50 40,55 50,45 C40,35 35,40 27,45Z" fill="{{ACCENT}}" opacity="0.12"/><path d="M45,38 C48,42 50,45 45,50 C40,45 42,42 45,38Z" fill="{{ACCENT}}" opacity="0.18"/><path d="M90,20 C95,30 100,35 90,42 C80,35 85,30 90,20Z" fill="{{ACCENT}}" opacity="0.08"/><path d="M20,90 C30,95 35,100 42,90 C35,80 30,85 20,90Z" fill="{{ACCENT}}" opacity="0.08"/><path d="M120,50 C125,58 128,62 120,68 C112,62 115,58 120,50Z" fill="{{ACCENT}}" opacity="0.06"/><path d="M50,120 C58,125 62,128 68,120 C62,112 58,115 50,120Z" fill="{{ACCENT}}" opacity="0.06"/><circle cx="90" cy="20" r="2" fill="{{ACCENT}}" opacity="0.15"/><circle cx="20" cy="90" r="2" fill="{{ACCENT}}" opacity="0.15"/><circle cx="130" cy="55" r="1.5" fill="{{ACCENT}}" opacity="0.1"/><circle cx="55" cy="130" r="1.5" fill="{{ACCENT}}" opacity="0.1"/></g></svg>`,
  },
  {
    id: 'wildflowers',
    label: 'Wildflowers',
    category: 'botanical',
    tags: ['garden', 'natural', 'organic', 'meadow'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="none" stroke="{{ACCENT}}" opacity="0.22"><path d="M0,5 C30,8 60,25 80,60 C100,95 110,130 115,170" stroke-width="1.2"/><path d="M5,0 C8,30 25,60 60,80 C95,100 130,110 170,115" stroke-width="1.2"/><path d="M40,10 C42,20 38,28 32,22 C28,16 34,12 40,10Z" fill="{{ACCENT}}" opacity="0.12"/><path d="M40,10 C48,12 52,18 46,24 C40,28 38,20 40,10Z" fill="{{ACCENT}}" opacity="0.1"/><path d="M10,40 C20,42 28,38 22,32 C16,28 12,34 10,40Z" fill="{{ACCENT}}" opacity="0.12"/><path d="M10,40 C12,48 18,52 24,46 C28,40 20,38 10,40Z" fill="{{ACCENT}}" opacity="0.1"/><path d="M75,35 C78,42 76,48 70,44 C66,40 72,38 75,35Z" fill="{{ACCENT}}" opacity="0.08"/><path d="M35,75 C42,78 48,76 44,70 C40,66 38,72 35,75Z" fill="{{ACCENT}}" opacity="0.08"/><path d="M100,65 C102,72 98,76 94,72 C92,68 96,66 100,65Z" fill="{{ACCENT}}" opacity="0.06"/><path d="M65,100 C72,102 76,98 72,94 C68,92 66,96 65,100Z" fill="{{ACCENT}}" opacity="0.06"/><circle cx="40" cy="10" r="3" fill="{{ACCENT}}" opacity="0.15"/><circle cx="10" cy="40" r="3" fill="{{ACCENT}}" opacity="0.15"/><circle cx="75" cy="35" r="2" fill="{{ACCENT}}" opacity="0.12"/><circle cx="35" cy="75" r="2" fill="{{ACCENT}}" opacity="0.12"/><circle cx="55" cy="55" r="1.5" fill="{{ACCENT}}" opacity="0.1"/></g></svg>`,
  },
  {
    id: 'eucalyptus',
    label: 'Eucalyptus Vines',
    category: 'botanical',
    tags: ['greenery', 'organic', 'modern', 'sage'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="none" stroke="{{ACCENT}}" opacity="0.2"><path d="M0,10 C40,15 70,40 100,80 C130,120 145,160 150,210" stroke-width="1.5"/><path d="M10,0 C15,40 40,70 80,100 C120,130 160,145 210,150" stroke-width="1.5"/><ellipse cx="30" cy="20" rx="12" ry="7" transform="rotate(-30 30 20)" fill="{{ACCENT}}" opacity="0.1"/><ellipse cx="20" cy="30" rx="12" ry="7" transform="rotate(60 20 30)" fill="{{ACCENT}}" opacity="0.1"/><ellipse cx="55" cy="40" rx="14" ry="8" transform="rotate(-40 55 40)" fill="{{ACCENT}}" opacity="0.08"/><ellipse cx="40" cy="55" rx="14" ry="8" transform="rotate(50 40 55)" fill="{{ACCENT}}" opacity="0.08"/><ellipse cx="80" cy="65" rx="15" ry="8" transform="rotate(-35 80 65)" fill="{{ACCENT}}" opacity="0.07"/><ellipse cx="65" cy="80" rx="15" ry="8" transform="rotate(55 65 80)" fill="{{ACCENT}}" opacity="0.07"/><ellipse cx="105" cy="95" rx="13" ry="7" transform="rotate(-30 105 95)" fill="{{ACCENT}}" opacity="0.06"/><ellipse cx="95" cy="105" rx="13" ry="7" transform="rotate(60 95 105)" fill="{{ACCENT}}" opacity="0.06"/><ellipse cx="130" cy="130" rx="11" ry="6" transform="rotate(-25 130 130)" fill="{{ACCENT}}" opacity="0.05"/></g></svg>`,
  },

  // ── Whimsical / Interest-based ─────────────────────────────
  {
    id: 'paw-prints',
    label: 'Paw Prints',
    category: 'whimsical',
    tags: ['pets', 'cats', 'dogs', 'animals', 'fur babies'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="{{ACCENT}}" opacity="0.15"><ellipse cx="35" cy="40" rx="8" ry="10" transform="rotate(-20 35 40)"/><circle cx="22" cy="28" r="4"/><circle cx="32" cy="22" r="4"/><circle cx="44" cy="24" r="4"/><circle cx="50" cy="32" r="4"/><ellipse cx="80" cy="75" rx="7" ry="9" transform="rotate(-35 80 75)" opacity="0.12"/><circle cx="68" cy="64" r="3.5" opacity="0.12"/><circle cx="76" cy="58" r="3.5" opacity="0.12"/><circle cx="88" cy="60" r="3.5" opacity="0.12"/><circle cx="94" cy="68" r="3.5" opacity="0.12"/><ellipse cx="55" cy="110" rx="6" ry="8" transform="rotate(-15 55 110)" opacity="0.1"/><circle cx="44" cy="100" r="3" opacity="0.1"/><circle cx="52" cy="95" r="3" opacity="0.1"/><circle cx="62" cy="96" r="3" opacity="0.1"/><circle cx="68" cy="102" r="3" opacity="0.1"/><ellipse cx="120" cy="45" rx="5" ry="7" transform="rotate(-40 120 45)" opacity="0.08"/><circle cx="110" cy="36" r="2.5" opacity="0.08"/><circle cx="117" cy="31" r="2.5" opacity="0.08"/><circle cx="127" cy="33" r="2.5" opacity="0.08"/><circle cx="132" cy="39" r="2.5" opacity="0.08"/></g></svg>`,
  },
  {
    id: 'stars',
    label: 'Starlight',
    category: 'whimsical',
    tags: ['celestial', 'cosmic', 'night', 'stars', 'dreamy'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="{{ACCENT}}" opacity="0.18"><path d="M40,20 L42,28 L50,30 L42,32 L40,40 L38,32 L30,30 L38,28Z"/><path d="M80,50 L82,56 L88,58 L82,60 L80,66 L78,60 L72,58 L78,56Z" opacity="0.14"/><path d="M25,70 L26.5,75 L31.5,76.5 L26.5,78 L25,83 L23.5,78 L18.5,76.5 L23.5,75Z" opacity="0.12"/><path d="M110,30 L111.5,35 L116.5,36.5 L111.5,38 L110,43 L108.5,38 L103.5,36.5 L108.5,35Z" opacity="0.1"/><path d="M60,95 L61,99 L65,100 L61,101 L60,105 L59,101 L55,100 L59,99Z" opacity="0.09"/><path d="M130,70 L131,74 L135,75 L131,76 L130,80 L129,76 L125,75 L129,74Z" opacity="0.07"/><circle cx="15" cy="40" r="1.5" opacity="0.2"/><circle cx="50" cy="15" r="1" opacity="0.2"/><circle cx="95" cy="25" r="1" opacity="0.15"/><circle cx="45" cy="60" r="1" opacity="0.15"/><circle cx="70" cy="85" r="0.8" opacity="0.12"/><circle cx="100" cy="55" r="0.8" opacity="0.12"/><circle cx="140" cy="50" r="0.7" opacity="0.08"/></g></svg>`,
  },
  {
    id: 'music-notes',
    label: 'Musical',
    category: 'whimsical',
    tags: ['music', 'vinyl', 'jazz', 'festival', 'concert'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="none" stroke="{{ACCENT}}" opacity="0.2"><path d="M0,5 C50,10 90,40 120,90 C140,125 150,165 155,210" stroke-width="1.2"/><path d="M5,0 C10,50 40,90 90,120 C125,140 165,150 210,155" stroke-width="1.2"/><ellipse cx="35" cy="45" rx="8" ry="6" fill="{{ACCENT}}" opacity="0.15"/><line x1="43" y1="45" x2="43" y2="20" stroke-width="1.5" opacity="0.15"/><path d="M43,20 C50,18 52,22 48,25" stroke-width="1" fill="{{ACCENT}}" opacity="0.1"/><ellipse cx="75" cy="80" rx="7" ry="5" fill="{{ACCENT}}" opacity="0.12"/><line x1="82" y1="80" x2="82" y2="58" stroke-width="1.2" opacity="0.12"/><ellipse cx="90" cy="65" rx="7" ry="5" fill="{{ACCENT}}" opacity="0.1"/><line x1="97" y1="65" x2="97" y2="43" stroke-width="1.2" opacity="0.1"/><line x1="82" y1="58" x2="97" y2="43" stroke-width="1" opacity="0.1"/><ellipse cx="45" cy="100" rx="6" ry="4.5" fill="{{ACCENT}}" opacity="0.08"/><line x1="51" y1="100" x2="51" y2="80" stroke-width="1" opacity="0.08"/><circle cx="110" cy="40" r="2" fill="{{ACCENT}}" opacity="0.08"/><circle cx="30" cy="15" r="1.5" fill="{{ACCENT}}" opacity="0.12"/></g></svg>`,
  },
  {
    id: 'butterflies',
    label: 'Butterflies',
    category: 'whimsical',
    tags: ['nature', 'spring', 'garden', 'transformation', 'delicate'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="{{ACCENT}}" stroke="{{ACCENT}}" opacity="0.18"><path d="M40,35 C30,20 15,18 20,30 C25,42 35,38 40,35Z" fill="{{ACCENT}}" opacity="0.12" stroke="none"/><path d="M40,35 C50,20 65,18 60,30 C55,42 45,38 40,35Z" fill="{{ACCENT}}" opacity="0.1" stroke="none"/><path d="M40,35 C30,50 15,52 20,40 C25,28 35,32 40,35Z" fill="{{ACCENT}}" opacity="0.1" stroke="none"/><path d="M40,35 C50,50 65,52 60,40 C55,28 45,32 40,35Z" fill="{{ACCENT}}" opacity="0.08" stroke="none"/><line x1="40" y1="35" x2="40" y2="50" stroke-width="0.8" opacity="0.15"/><path d="M90,70 C83,58 72,57 75,66 C78,75 86,72 90,70Z" fill="{{ACCENT}}" opacity="0.08" stroke="none"/><path d="M90,70 C97,58 108,57 105,66 C102,75 94,72 90,70Z" fill="{{ACCENT}}" opacity="0.07" stroke="none"/><path d="M90,70 C83,82 72,83 75,74 C78,65 86,68 90,70Z" fill="{{ACCENT}}" opacity="0.07" stroke="none"/><path d="M90,70 C97,82 108,83 105,74 C102,65 94,68 90,70Z" fill="{{ACCENT}}" opacity="0.06" stroke="none"/><circle cx="20" cy="60" r="1" opacity="0.12"/><circle cx="60" cy="15" r="1" opacity="0.12"/><circle cx="115" cy="45" r="0.8" opacity="0.08"/></g></svg>`,
  },

  // ── Geometric / Modern ─────────────────────────────────────
  {
    id: 'art-deco',
    label: 'Art Deco',
    category: 'geometric',
    tags: ['deco', 'gatsby', 'luxury', '1920s', 'gold'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="none" stroke="{{ACCENT}}" opacity="0.2"><path d="M0,0 L150,0 L0,150Z" stroke-width="1.5"/><path d="M0,0 L120,0 L0,120Z" stroke-width="0.8" opacity="0.15"/><path d="M0,0 L90,0 L0,90Z" stroke-width="0.8" opacity="0.12"/><path d="M0,0 L60,0 L0,60Z" stroke-width="0.5" opacity="0.1"/><line x1="0" y1="0" x2="130" y2="130" stroke-width="0.8" opacity="0.12"/><line x1="30" y1="0" x2="0" y2="30" stroke-width="0.5" opacity="0.1"/><line x1="60" y1="0" x2="0" y2="60" stroke-width="0.5" opacity="0.1"/><line x1="90" y1="0" x2="0" y2="90" stroke-width="0.5" opacity="0.1"/><line x1="120" y1="0" x2="0" y2="120" stroke-width="0.5" opacity="0.08"/><path d="M20,10 L30,0 M40,10 L50,0 M60,10 L70,0" stroke-width="0.4" opacity="0.15"/><circle cx="75" cy="75" r="5" opacity="0.1"/><circle cx="75" cy="75" r="10" opacity="0.06"/></g></svg>`,
  },
  {
    id: 'diamonds',
    label: 'Diamond Grid',
    category: 'geometric',
    tags: ['modern', 'clean', 'editorial', 'minimal'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="none" stroke="{{ACCENT}}" opacity="0.15"><path d="M40,0 L80,40 L40,80 L0,40Z" stroke-width="0.8"/><path d="M40,10 L70,40 L40,70 L10,40Z" stroke-width="0.5" opacity="0.12"/><path d="M100,20 L130,50 L100,80 L70,50Z" stroke-width="0.6" opacity="0.1"/><path d="M20,100 L50,130 L20,160 L-10,130Z" stroke-width="0.6" opacity="0.1"/><path d="M70,70 L95,95 L70,120 L45,95Z" stroke-width="0.5" opacity="0.08"/><circle cx="40" cy="40" r="3" fill="{{ACCENT}}" opacity="0.12"/><circle cx="100" cy="50" r="2" fill="{{ACCENT}}" opacity="0.08"/><circle cx="50" cy="100" r="2" fill="{{ACCENT}}" opacity="0.08"/></g></svg>`,
  },

  // ── Minimal ────────────────────────────────────────────────
  {
    id: 'line-art',
    label: 'Fine Lines',
    category: 'minimal',
    tags: ['minimal', 'clean', 'modern', 'simple', 'elegant'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="none" stroke="{{ACCENT}}" opacity="0.2"><path d="M0,0 C100,5 140,60 150,150" stroke-width="1.5"/><path d="M0,0 C5,100 60,140 150,150" stroke-width="1.5"/><path d="M0,30 C70,35 110,80 120,160" stroke-width="0.6" opacity="0.12"/><path d="M30,0 C35,70 80,110 160,120" stroke-width="0.6" opacity="0.12"/><circle cx="0" cy="0" r="3" fill="{{ACCENT}}" opacity="0.2"/><circle cx="75" cy="75" r="2" fill="{{ACCENT}}" opacity="0.1"/></g></svg>`,
  },
  {
    id: 'dots',
    label: 'Scattered Dots',
    category: 'minimal',
    tags: ['minimal', 'modern', 'playful', 'confetti'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="{{ACCENT}}"><circle cx="15" cy="10" r="4" opacity="0.18"/><circle cx="45" cy="25" r="3" opacity="0.15"/><circle cx="10" cy="50" r="3.5" opacity="0.16"/><circle cx="70" cy="15" r="2.5" opacity="0.12"/><circle cx="30" cy="70" r="3" opacity="0.12"/><circle cx="80" cy="50" r="2" opacity="0.1"/><circle cx="55" cy="85" r="2.5" opacity="0.1"/><circle cx="100" cy="35" r="2" opacity="0.08"/><circle cx="40" cy="110" r="2" opacity="0.08"/><circle cx="110" cy="70" r="1.5" opacity="0.07"/><circle cx="70" cy="120" r="1.5" opacity="0.06"/><circle cx="130" cy="50" r="1.5" opacity="0.06"/><circle cx="90" cy="100" r="1" opacity="0.05"/><circle cx="140" cy="80" r="1" opacity="0.04"/></g></svg>`,
  },
  {
    id: 'none',
    label: 'None',
    category: 'minimal',
    tags: ['none', 'clean', 'no decoration'],
    svg: '',
  },

  // ── Cultural ───────────────────────────────────────────────
  {
    id: 'mandala',
    label: 'Mandala',
    category: 'cultural',
    tags: ['indian', 'spiritual', 'ornate', 'sacred', 'henna'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="none" stroke="{{ACCENT}}" opacity="0.18" transform="translate(0,0)"><circle cx="80" cy="80" r="40" stroke-width="1" opacity="0.1"/><circle cx="80" cy="80" r="30" stroke-width="0.8" opacity="0.12"/><circle cx="80" cy="80" r="20" stroke-width="0.6" opacity="0.15"/><circle cx="80" cy="80" r="8" fill="{{ACCENT}}" opacity="0.08"/><path d="M80,40 C90,55 95,65 80,80 C65,65 70,55 80,40Z" fill="{{ACCENT}}" opacity="0.06"/><path d="M120,80 C105,90 95,95 80,80 C95,65 105,70 120,80Z" fill="{{ACCENT}}" opacity="0.06"/><path d="M80,120 C70,105 65,95 80,80 C95,95 90,105 80,120Z" fill="{{ACCENT}}" opacity="0.06"/><path d="M40,80 C55,70 65,65 80,80 C65,95 55,90 40,80Z" fill="{{ACCENT}}" opacity="0.06"/><path d="M0,0 C30,5 55,25 65,55" stroke-width="1" opacity="0.1"/><path d="M0,0 C5,30 25,55 55,65" stroke-width="1" opacity="0.1"/></g></svg>`,
  },
  {
    id: 'olive-branch',
    label: 'Olive Branch',
    category: 'cultural',
    tags: ['mediterranean', 'greek', 'italian', 'tuscan', 'peace'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="none" stroke="{{ACCENT}}" opacity="0.2"><path d="M0,10 C50,15 90,45 120,90 C145,130 155,170 160,220" stroke-width="1.5"/><ellipse cx="25" cy="18" rx="10" ry="5" transform="rotate(-15 25 18)" fill="{{ACCENT}}" opacity="0.1"/><ellipse cx="50" cy="30" rx="12" ry="6" transform="rotate(-25 50 30)" fill="{{ACCENT}}" opacity="0.09"/><ellipse cx="75" cy="50" rx="13" ry="6" transform="rotate(-30 75 50)" fill="{{ACCENT}}" opacity="0.08"/><ellipse cx="95" cy="72" rx="12" ry="5.5" transform="rotate(-35 95 72)" fill="{{ACCENT}}" opacity="0.07"/><ellipse cx="112" cy="98" rx="11" ry="5" transform="rotate(-40 112 98)" fill="{{ACCENT}}" opacity="0.06"/><ellipse cx="125" cy="128" rx="10" ry="5" transform="rotate(-45 125 128)" fill="{{ACCENT}}" opacity="0.05"/><circle cx="25" cy="18" r="2" fill="{{ACCENT}}" opacity="0.08"/><circle cx="50" cy="30" r="2" fill="{{ACCENT}}" opacity="0.07"/><circle cx="75" cy="50" r="2" fill="{{ACCENT}}" opacity="0.06"/></g></svg>`,
  },
];

/** Get presets filtered by category */
export function getPresetsByCategory(category?: string): CornerPreset[] {
  if (!category || category === 'all') return CORNER_PRESETS;
  return CORNER_PRESETS.filter(p => p.category === category);
}

/** Search presets by keyword */
export function searchPresets(query: string): CornerPreset[] {
  const q = query.toLowerCase();
  return CORNER_PRESETS.filter(p =>
    p.label.toLowerCase().includes(q) ||
    p.tags.some(t => t.includes(q)) ||
    p.category.includes(q)
  );
}
