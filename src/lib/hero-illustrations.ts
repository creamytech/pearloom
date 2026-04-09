// ─────────────────────────────────────────────────────────────
// Pearloom / lib/hero-illustrations.ts
// Generates unique illustrated SVG hero backgrounds for each
// wedding theme. Each SVG uses the theme's actual colors and
// is self-contained, atmospheric, and under 2KB.
// ─────────────────────────────────────────────────────────────

export interface HeroColors {
  background: string;
  accent: string;
  accent2: string;
  foreground: string;
}

// ── Shared gradient overlay for text readability ─────────────
function gradientOverlay(bg: string): string {
  return `<defs><linearGradient id="fo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}" stop-opacity=".7"/><stop offset=".4" stop-color="${bg}" stop-opacity=".15"/><stop offset=".6" stop-color="${bg}" stop-opacity=".15"/><stop offset="1" stop-color="${bg}" stop-opacity=".7"/></linearGradient></defs><rect width="1200" height="800" fill="url(#fo)"/>`;
}

// ── SVG wrapper ──────────────────────────────────────────────
function wrap(bg: string, content: string, overlay: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${bg}"/>${content}${overlay}</svg>`;
}

// ── Theme-specific illustration generators ───────────────────

function etherealGarden(c: HeroColors): string {
  const art = `<g opacity=".18" fill="none" stroke="${c.accent}" stroke-width="1.5"><path d="M0 700q150-80 200-250t100-200"/><path d="M50 750q120-60 180-220t80-180"/><ellipse cx="200" cy="250" rx="18" ry="28" fill="${c.accent}" opacity=".3"/><ellipse cx="150" cy="350" rx="14" ry="22" fill="${c.accent2}" opacity=".25"/><path d="M1200 700q-150-80-200-250t-100-200"/><path d="M1150 750q-120-60-180-220t-80-180"/><ellipse cx="1000" cy="280" rx="16" ry="25" fill="${c.accent}" opacity=".3"/><ellipse cx="1050" cy="380" rx="12" ry="20" fill="${c.accent2}" opacity=".25"/><circle cx="220" cy="300" r="8" fill="${c.accent2}" opacity=".2"/><circle cx="980" cy="320" r="7" fill="${c.accent2}" opacity=".2"/></g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function midnightLuxe(c: HeroColors): string {
  const art = `<g opacity=".15"><g stroke="${c.accent}" stroke-width="1" fill="none">${[...Array(9)].map((_, i) => `<line x1="600" y1="400" x2="${600 + 500 * Math.cos((i * Math.PI) / 4.5)}" y2="${400 + 500 * Math.sin((i * Math.PI) / 4.5)}"/>`).join('')}</g><g fill="${c.accent2}" opacity=".2">${[...Array(6)].map((_, i) => `<rect x="${200 + i * 160}" y="${350 + (i % 2) * 40}" width="12" height="12" transform="rotate(45 ${206 + i * 160} ${356 + (i % 2) * 40})"/>`).join('')}</g></g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function coastalBreeze(c: HeroColors): string {
  const art = `<g opacity=".18"><path d="M0 520q200-40 400 20t400-20 400 20v280H0z" fill="${c.accent}" opacity=".25"/><path d="M0 560q200-30 400 15t400-15 400 15v240H0z" fill="${c.accent}" opacity=".2"/><path d="M0 600q200-20 400 10t400-10 400 10v200H0z" fill="${c.accent2}" opacity=".15"/><g fill="${c.foreground}" opacity=".12"><path d="M900 300l-8 40h16z"/><path d="M892 340h16v-30q-8 8-16 0z"/></g></g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function artDecoGlamour(c: HeroColors): string {
  const art = `<g opacity=".16" fill="none" stroke="${c.accent}" stroke-width="1.2"><path d="M300 800v-500a300 300 0 0 1 600 0v500"/><path d="M350 800v-460a250 250 0 0 1 500 0v460"/><path d="M400 800v-420a200 200 0 0 1 400 0v420"/>${[...Array(5)].map((_, i) => `<path d="M${540 + i * 30} 200q${15 + i * 5}-${40 + i * 10} ${30 + i * 10} 0" fill="${c.accent2}" opacity=".2"/>`).join('')}<line x1="300" y1="750" x2="900" y2="750"/><line x1="300" y1="740" x2="900" y2="740"/></g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function tuscanVilla(c: HeroColors): string {
  const art = `<g opacity=".18"><path d="M0 550q100-30 250-80t200-10 200-60 250-20 300 40v380H0z" fill="${c.accent}" opacity=".25"/><path d="M0 600q150-20 300-50t250 10 250-30 400 20v250H0z" fill="${c.accent2}" opacity=".2"/>${[350, 500, 820, 950].map((x) => `<path d="M${x} ${520 - Math.abs(x - 600) * 0.08}v-60l4-20 4 20v60" stroke="${c.accent}" stroke-width="1.5" fill="none" opacity=".35"/>`).join('')}</g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function frenchChateau(c: HeroColors): string {
  const art = `<g opacity=".14" fill="none" stroke="${c.accent}" stroke-width="1"><rect x="200" y="100" width="800" height="600" rx="20"/><rect x="220" y="120" width="760" height="560" rx="16"/><g fill="${c.accent2}" opacity=".25">${[[350, 130], [600, 130], [850, 130], [350, 670], [600, 670], [850, 670]].map(([x, y]) => `<path d="M${x} ${y}q-8 10 0 20t0 20q8-10 0-20t0-20z"/>`).join('')}</g><path d="M260 400q40-60 80 0t80 0" stroke="${c.accent}" opacity=".2"/><path d="M780 400q40-60 80 0t80 0" stroke="${c.accent}" opacity=".2"/></g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function enchantedForest(c: HeroColors): string {
  const trees = [80, 200, 340, 860, 1000, 1120].map((x) => {
    const h = 180 + (x % 7) * 20;
    return `<path d="M${x} 700l${30}-${h}l${30} ${h}z" fill="${c.accent}" opacity=".2"/>`;
  }).join('');
  const dots = [...Array(15)].map((_, i) => {
    const x = 100 + (i * 73) % 1000;
    const y = 200 + (i * 47) % 400;
    return `<circle cx="${x}" cy="${y}" r="2" fill="${c.accent2}" opacity=".4"/>`;
  }).join('');
  const mushrooms = `<g fill="${c.accent2}" opacity=".15"><ellipse cx="450" cy="680" rx="14" ry="8"/><rect x="446" y="680" width="8" height="14" rx="2"/><ellipse cx="760" cy="690" rx="12" ry="6"/><rect x="757" y="690" width="6" height="12" rx="2"/></g>`;
  const art = `<g opacity=".18">${trees}${dots}${mushrooms}</g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function desertBoho(c: HeroColors): string {
  const art = `<g opacity=".18"><circle cx="900" cy="200" r="60" fill="${c.accent2}" opacity=".25"/><path d="M0 600q200-100 400-60t400-40 400 30v270H0z" fill="${c.accent}" opacity=".2"/><path d="M700 500l100-150 100 150z" fill="${c.accent}" opacity=".15"/><path d="M800 480l60-90 60 90z" fill="${c.accent2}" opacity=".12"/><g stroke="${c.accent}" stroke-width="1.5" fill="none" opacity=".3"><path d="M200 600v-120m0-10v-30"/><ellipse cx="200" cy="440" rx="20" ry="8"/><path d="M180 470q20-15 40 0"/><path d="M350 620v-80m0-10v-20"/><ellipse cx="350" cy="510" rx="15" ry="6"/></g></g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function tropicalParadise(c: HeroColors): string {
  const art = `<g opacity=".18"><g stroke="${c.accent}" stroke-width="1.5" fill="none" opacity=".3"><path d="M100 700v-350"/><path d="M100 350q-60-30-80 40"/><path d="M100 350q-40-50-20 60"/><path d="M100 370q60-30 80 40"/><path d="M100 370q40-50 20 60"/><path d="M1100 700v-300"/><path d="M1100 400q-50-25-70 35"/><path d="M1100 400q50-25 70 35"/><path d="M1100 420q-35-45-15 50"/><path d="M1100 420q35-45 15 50"/></g><g fill="${c.accent2}" opacity=".2"><circle cx="500" cy="650" r="20"/><circle cx="520" cy="645" r="18"/><circle cx="510" cy="635" r="12"/><path d="M505 650l5-30" stroke="${c.accent}" stroke-width="1" fill="none"/><circle cx="750" cy="670" r="16"/><circle cx="765" cy="665" r="14"/><circle cx="755" cy="658" r="10"/></g></g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function winterWonderland(c: HeroColors): string {
  const snowflakes = [...Array(8)].map((_, i) => {
    const x = 100 + (i * 137) % 1000;
    const y = 80 + (i * 83) % 550;
    const s = 10 + (i % 3) * 5;
    return `<g transform="translate(${x},${y})" stroke="${c.accent}" stroke-width=".8" opacity=".25"><line y1="${-s}" y2="${s}"/><line x1="${-s}" x2="${s}"/></g>`;
  }).join('');
  const trees = [150, 900, 1050].map((x) => `<path d="M${x} 750l25-100-50 0z" fill="${c.accent2}" opacity=".15"/>`).join('');
  const art = `<g opacity=".18">${snowflakes}${trees}</g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function celestialNight(c: HeroColors): string {
  const stars = [...Array(20)].map((_, i) => {
    const x = 50 + (i * 59) % 1100;
    const y = 40 + (i * 37) % 500;
    const r = 1 + (i % 3);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.accent}" opacity=".3"/>`;
  }).join('');
  const constellations = `<g stroke="${c.accent}" stroke-width=".6" opacity=".2"><polyline points="300,150 350,200 400,180 450,220" fill="none"/><polyline points="700,100 750,160 800,130 830,180" fill="none"/></g>`;
  const moon = `<g opacity=".2"><circle cx="950" cy="150" r="45" fill="${c.accent2}"/><circle cx="935" cy="140" r="42" fill="${c.background}"/></g>`;
  const art = `<g opacity=".18">${stars}${constellations}${moon}</g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function darkRomance(c: HeroColors): string {
  function rose(cx: number, cy: number, s: number): string {
    return `<g transform="translate(${cx},${cy}) scale(${s})"><circle r="8" fill="${c.accent2}" opacity=".3"/><circle r="5" fill="${c.accent}" opacity=".25"/><circle r="2.5" fill="${c.accent2}" opacity=".3"/></g>`;
  }
  const roses = [rose(200, 150, 1.2), rose(350, 100, 0.9), rose(500, 130, 1), rose(700, 110, 1.1), rose(850, 140, 0.8), rose(1000, 120, 1)].join('');
  const vines = `<g stroke="${c.accent}" stroke-width="1" fill="none" opacity=".2"><path d="M100 0q50 80 100 120t80 100"/><path d="M1100 0q-50 80-100 120t-80 100"/><path d="M150 0q60 100 150 180"/><path d="M1050 0q-60 100-150 180"/></g>`;
  const thorns = `<g fill="${c.accent}" opacity=".12">${[180, 250, 330, 870, 950, 1020].map((x) => `<path d="M${x} ${40 + (x % 50)}l3-10 3 10z"/>`).join('')}</g>`;
  const art = `<g opacity=".18">${vines}${roses}${thorns}</g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function industrialChic(c: HeroColors): string {
  // Brick rows
  const bricks = `<g stroke="${c.accent}" stroke-width=".5" fill="none" opacity=".12">${[0, 28, 56].map((y) => {
    const off = (y / 28) % 2 === 0 ? 0 : 35;
    return [0, 1, 2].map((col) => `<rect x="${60 + off + col * 80}" y="${80 + y}" width="70" height="22" rx="1"/>`).join('');
  }).join('')}</g>`;
  // Gear silhouettes
  const gears = `<g fill="none" stroke="${c.accent2}" opacity=".2"><circle cx="950" cy="200" r="35" stroke-width="1.2"/><circle cx="950" cy="200" r="12" stroke-width=".8"/><circle cx="1020" cy="280" r="25" stroke-width="1"/><circle cx="1020" cy="280" r="9" stroke-width=".8"/></g>`;
  const art = `<g opacity=".18">${bricks}${gears}</g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function modernGlam(c: HeroColors): string {
  const shapes = `<g opacity=".15"><rect x="100" y="150" width="120" height="120" fill="none" stroke="${c.accent}" stroke-width="1.2" transform="rotate(15 160 210)"/><circle cx="900" cy="250" r="60" fill="none" stroke="${c.accent2}" stroke-width="1" opacity=".8"/><line x1="400" y1="100" x2="800" y2="700" stroke="${c.accent}" stroke-width=".8" opacity=".5"/><line x1="500" y1="80" x2="900" y2="680" stroke="${c.accent2}" stroke-width=".6" opacity=".4"/><polygon points="1050,500 1100,600 1000,600" fill="none" stroke="${c.accent}" stroke-width="1"/><rect x="200" y="500" width="80" height="80" fill="${c.accent2}" opacity=".08"/><circle cx="350" cy="300" r="25" fill="${c.accent}" opacity=".06"/></g>`;
  return wrap(c.background, shapes, gradientOverlay(c.background));
}

function vintageRomance(c: HeroColors): string {
  // Doily border scallops (fewer, spaced wider)
  const topScallops = [...Array(6)].map((_, i) => `<circle cx="${100 + i * 200}" cy="40" r="40" fill="none" stroke="${c.accent}" stroke-width=".8" opacity=".2"/>`).join('');
  const bottomScallops = [...Array(6)].map((_, i) => `<circle cx="${100 + i * 200}" cy="760" r="40" fill="none" stroke="${c.accent}" stroke-width=".8" opacity=".2"/>`).join('');
  // Rose silhouettes
  const roses = `<g fill="${c.accent2}" opacity=".12"><circle cx="400" cy="680" r="14"/><circle cx="414" cy="674" r="11"/><circle cx="800" cy="690" r="13"/><circle cx="812" cy="684" r="10"/></g>`;
  const art = `<g opacity=".18">${topScallops}${bottomScallops}${roses}</g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

function southernCharm(c: HeroColors): string {
  // Magnolia branch across the top
  const branch = `<path d="M100 200q200-60 500-40t500-20" stroke="${c.accent}" stroke-width="1.5" fill="none" opacity=".2"/>`;
  // Simplified magnolia blooms (3 petals each, fewer blooms)
  function bloom(cx: number, cy: number, s: number): string {
    return `<ellipse cx="${cx}" cy="${cy - 18 * s}" rx="${9 * s}" ry="${15 * s}" fill="${c.accent2}" opacity=".12"/><ellipse cx="${cx - 14 * s}" cy="${cy + 8 * s}" rx="${9 * s}" ry="${14 * s}" fill="${c.accent2}" opacity=".1"/><ellipse cx="${cx + 14 * s}" cy="${cy + 8 * s}" rx="${9 * s}" ry="${14 * s}" fill="${c.accent2}" opacity=".1"/><circle cx="${cx}" cy="${cy}" r="${4 * s}" fill="${c.accent}" opacity=".15"/>`;
  }
  const blooms = bloom(300, 175, 1) + bloom(600, 160, 1.1) + bloom(950, 180, 0.9);
  const art = `<g opacity=".18">${branch}${blooms}</g>`;
  return wrap(c.background, art, gradientOverlay(c.background));
}

// ── Generic / fallback illustration ──────────────────────────
function genericIllustration(themeId: string, c: HeroColors): string {
  // Create a deterministic seed from theme name
  let seed = 0;
  for (let i = 0; i < themeId.length; i++) seed = ((seed << 5) - seed + themeId.charCodeAt(i)) | 0;
  const abs = Math.abs(seed);

  // Choose organic vs geometric based on theme name hash
  const isOrganic = abs % 2 === 0;

  let shapes: string;
  if (isOrganic) {
    // Organic curves
    const curves = [...Array(5)].map((_, i) => {
      const y = 150 + ((abs + i * 137) % 500);
      const cp1 = 200 + ((abs + i * 89) % 400);
      const cp2 = 600 + ((abs + i * 53) % 400);
      return `<path d="M0 ${y}q${cp1}-80 600 0t600 0" fill="none" stroke="${i % 2 === 0 ? c.accent : c.accent2}" stroke-width="1" opacity=".15"/>`;
    }).join('');
    shapes = curves;
  } else {
    // Geometric shapes
    const rects = [...Array(6)].map((_, i) => {
      const x = 80 + ((abs + i * 191) % 1000);
      const y = 100 + ((abs + i * 127) % 550);
      const size = 40 + ((abs + i * 67) % 80);
      const rot = (abs + i * 43) % 45;
      return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="none" stroke="${i % 2 === 0 ? c.accent : c.accent2}" stroke-width=".8" transform="rotate(${rot} ${x + size / 2} ${y + size / 2})" opacity=".14"/>`;
    }).join('');
    shapes = rects;
  }

  return wrap(c.background, `<g opacity=".18">${shapes}</g>`, gradientOverlay(c.background));
}

// ── Theme → generator map ────────────────────────────────────
const GENERATORS: Record<string, (c: HeroColors) => string> = {
  'ethereal-garden': etherealGarden,
  'midnight-luxe': midnightLuxe,
  'coastal-breeze': coastalBreeze,
  'art-deco-glamour': artDecoGlamour,
  'tuscan-villa': tuscanVilla,
  'french-chateau': frenchChateau,
  'enchanted-forest': enchantedForest,
  'desert-boho': desertBoho,
  'tropical-paradise': tropicalParadise,
  'winter-wonderland': winterWonderland,
  'celestial-night': celestialNight,
  'dark-romance': darkRomance,
  'industrial-chic': industrialChic,
  'modern-glam': modernGlam,
  'vintage-romance': vintageRomance,
  'southern-charm': southernCharm,
};

/**
 * Generate an illustrated SVG hero background for a Pearloom theme.
 * Returns a complete SVG string (viewBox 1200x800) using the theme's
 * actual colors. Each illustration is atmospheric, self-contained,
 * and designed to sit behind text.
 */
export function generateHeroIllustration(
  themeId: string,
  colors: HeroColors,
): string {
  const generator = GENERATORS[themeId];
  if (generator) return generator(colors);
  return genericIllustration(themeId, colors);
}

/**
 * Returns the hero illustration as a data URL suitable for use as
 * a coverPhoto or CSS background-image value.
 */
export function getHeroIllustrationDataUrl(
  themeId: string,
  colors: HeroColors,
): string {
  const svg = generateHeroIllustration(themeId, colors);
  const base64 = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
