// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Pearloom / lib/vibe-engine/svg-library.ts
// Wave paths, curves, SVG art, and SVG-related constants/functions.
// ——————————————————————————————————————————————————————————————————————————————————————————————————

import type { VibeSkin } from './types';

// — SVG Wave Paths Library ——————————————————————————————————————————————————————————————————————————
export const WAVE_PATHS: Record<VibeSkin['curve'], { d: string; di: string }> = {
  organic: {
    d: 'M0,60 C150,120 350,0 500,60 C650,120 850,0 1000,60 L1000,150 L0,150 Z',
    di: 'M0,90 C150,30 350,150 500,90 C650,30 850,150 1000,90 L1000,0 L0,0 Z',
  },
  arch: {
    d: 'M0,80 Q250,0 500,80 Q750,160 1000,80 L1000,150 L0,150 Z',
    di: 'M0,70 Q250,150 500,70 Q750,-10 1000,70 L1000,0 L0,0 Z',
  },
  wave: {
    d: 'M0,100 C100,20 200,120 300,100 C400,80 500,20 600,100 C700,180 800,80 900,100 L900,150 L0,150 Z',
    di: 'M0,50 C100,130 200,30 300,50 C400,70 500,130 600,50 C700,-30 800,70 900,50 L900,0 L0,0 Z',
  },
  petal: {
    d: 'M0,120 Q100,20 200,100 Q300,180 400,100 Q500,20 600,100 Q700,180 800,100 Q900,20 1000,80 L1000,150 L0,150 Z',
    di: 'M0,30 Q100,130 200,50 Q300,-30 400,50 Q500,130 600,50 Q700,-30 800,50 Q900,130 1000,70 L1000,0 L0,0 Z',
  },
  geometric: {
    d: 'M0,60 L200,120 L400,40 L600,120 L800,40 L1000,80 L1000,150 L0,150 Z',
    di: 'M0,90 L200,30 L400,110 L600,30 L800,110 L1000,70 L1000,0 L0,0 Z',
  },
  cascade: {
    d: 'M0,40 C100,80 150,10 250,60 C350,110 400,20 500,70 C600,120 650,30 750,80 C850,130 900,40 1000,90 L1000,150 L0,150 Z',
    di: 'M0,110 C100,70 150,140 250,90 C350,40 400,130 500,80 C600,30 650,120 750,70 C850,20 900,110 1000,60 L1000,0 L0,0 Z',
  },
  ribbon: {
    d: 'M0,75 C200,20 300,130 500,75 C700,20 800,130 1000,75 L1000,150 L0,150 Z',
    di: 'M0,75 C200,130 300,20 500,75 C700,130 800,20 1000,75 L1000,0 L0,0 Z',
  },
  mountain: {
    d: 'M0,130 L150,40 L300,100 L450,20 L600,80 L750,10 L900,70 L1000,50 L1000,150 L0,150 Z',
    di: 'M0,20 L150,110 L300,50 L450,130 L600,70 L750,140 L900,80 L1000,100 L1000,0 L0,0 Z',
  },
};

export const CORNER_STYLES: Record<VibeSkin['curve'], string> = {
  organic: '2rem 4rem 2rem 4rem',
  arch: '50% 50% 1.5rem 1.5rem / 3rem 3rem 1.5rem 1.5rem',
  geometric: '0',
  wave: '1.5rem',
  petal: '40% 40% 2rem 2rem / 3rem 3rem 2rem 2rem',
  cascade: '1rem 3rem 1rem 3rem',
  ribbon: '3rem',
  mountain: '0.5rem',
};

// — SVG art helpers —————————————————————————————————————————————————————————————————————————————————
export function extractSvgFromField(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  // Strip markdown code fences aggressively
  let cleaned = raw
    .replace(/^```(?:svg|xml|html)?\s*\n?/gim, '')
    .replace(/\n?\s*```\s*$/gim, '')
    .trim();

  // Strip XML declarations that Gemini sometimes prepends
  cleaned = cleaned.replace(/<\?xml[^?]*\?>\s*/gi, '');

  // Fix escaped quotes (Gemini sometimes double-escapes)
  cleaned = cleaned.replace(/\\"/g, '"');

  // Try to extract the <svg>...</svg> block
  const match = cleaned.match(/<svg[\s\S]*?<\/svg>/i);
  if (match) return match[0];

  // Last resort: if the whole string looks like SVG content but missing wrapper
  if (cleaned.includes('<path') || cleaned.includes('<circle') || cleaned.includes('<rect')) {
    const wrappedAttempt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${cleaned}</svg>`;
    if (wrappedAttempt.includes('</svg>')) return wrappedAttempt;
  }

  return null;
}

export function isValidSvg(svg: string): boolean {
  if (!svg.includes('<svg') || !svg.includes('</svg>')) return false;
  // Must contain at least one actual drawing element
  const hasContent = /<(path|circle|rect|line|ellipse|polygon|polyline|g)\s/i.test(svg);
  return hasContent && svg.length > 60;
}


export function buildFallbackArt(accent: string, curve: VibeSkin['curve']): {
  heroPatternSvg: string; sectionBorderSvg: string; cornerFlourishSvg: string; medallionSvg: string;
  heroBlobSvg: string; accentBlobSvg: string; sectionBlobPath: string;
} {
  const a = accent || '#A3B18A';

  // Pattern varies by curve type for more visual variety across sites
  const HERO_PATTERNS: Record<VibeSkin['curve'], string> = {
    organic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.11"><path d="M20,100 C60,40 140,40 180,100 C140,160 60,160 20,100 Z"/><circle cx="100" cy="100" r="45"/><circle cx="100" cy="100" r="22"/></g><g fill="${a}" opacity="0.08"><circle cx="100" cy="55" r="2.5"/><circle cx="100" cy="145" r="2.5"/><circle cx="55" cy="100" r="2"/><circle cx="145" cy="100" r="2"/><circle cx="100" cy="100" r="2"/></g></svg>`,
    arch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.12"><path d="M30,130 Q100,20 170,130"/><path d="M50,150 Q100,60 150,150"/><line x1="100" y1="20" x2="100" y2="170"/></g><g fill="${a}" opacity="0.08"><circle cx="100" cy="20" r="3"/><circle cx="30" cy="130" r="2"/><circle cx="170" cy="130" r="2"/></g></svg>`,
    geometric: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.12"><rect x="40" y="40" width="120" height="120"/><rect x="70" y="70" width="60" height="60" transform="rotate(45 100 100)"/><line x1="40" y1="40" x2="160" y2="160"/><line x1="160" y1="40" x2="40" y2="160"/></g><g fill="${a}" opacity="0.08"><circle cx="100" cy="100" r="3"/><circle cx="40" cy="40" r="2"/><circle cx="160" cy="40" r="2"/><circle cx="40" cy="160" r="2"/><circle cx="160" cy="160" r="2"/></g></svg>`,
    wave: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.7" opacity="0.11"><path d="M0,60 C40,40 80,80 120,60 C160,40 180,70 200,55"/><path d="M0,100 C40,80 80,120 120,100 C160,80 180,110 200,95"/><path d="M0,140 C40,120 80,160 120,140 C160,120 180,150 200,135"/></g><g fill="${a}" opacity="0.07"><circle cx="40" cy="40" r="2"/><circle cx="120" cy="60" r="2"/><circle cx="40" cy="80" r="2"/><circle cx="120" cy="100" r="2"/></g></svg>`,
    petal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.12"><path d="M100,100 Q100,50 130,70 Q110,100 100,100 Z"/><path d="M100,100 Q150,100 130,130 Q100,110 100,100 Z"/><path d="M100,100 Q100,150 70,130 Q90,100 100,100 Z"/><path d="M100,100 Q50,100 70,70 Q100,90 100,100 Z"/><circle cx="100" cy="100" r="15"/></g><circle cx="100" cy="100" r="3" fill="${a}" opacity="0.18"/></svg>`,
    cascade: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.11"><path d="M20,40 C50,20 80,60 110,40 C140,20 170,60 190,40"/><path d="M20,80 C50,60 80,100 110,80 C140,60 170,100 190,80"/><path d="M20,120 C50,100 80,140 110,120 C140,100 170,140 190,120"/><path d="M20,160 C50,140 80,180 110,160 C140,140 170,180 190,160"/></g><g fill="${a}" opacity="0.08"><circle cx="110" cy="40" r="2"/><circle cx="110" cy="80" r="2"/><circle cx="110" cy="120" r="2"/><circle cx="110" cy="160" r="2"/></g></svg>`,
    ribbon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.7" opacity="0.10"><path d="M0,100 C67,40 133,160 200,100"/><path d="M0,80 C67,20 133,140 200,80"/><path d="M0,120 C67,60 133,180 200,120"/></g><g fill="${a}" opacity="0.08"><circle cx="100" cy="100" r="2.5"/><circle cx="33" cy="70" r="1.5"/><circle cx="167" cy="130" r="1.5"/></g></svg>`,
    mountain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.11"><path d="M0,160 L50,80 L80,120 L110,50 L140,100 L170,60 L200,90"/><path d="M0,180 L50,110 L80,145 L110,80 L140,125 L170,90 L200,115"/></g><g fill="${a}" opacity="0.08"><circle cx="50" cy="80" r="2.5"/><circle cx="110" cy="50" r="3"/><circle cx="170" cy="60" r="2.5"/></g></svg>`,
  };

  const heroPatternSvg = HERO_PATTERNS[curve] || HERO_PATTERNS.organic;

  const curvePaths: Record<VibeSkin['curve'], string> = {
    organic:   'M0,20 C50,5 100,35 150,20 C200,5 250,35 300,20 C350,5 400,35 450,20 C500,5 550,35 600,20 C650,5 700,35 750,20 C800,5 800,20 800,20',
    arch:      'M0,20 Q100,5 200,20 Q300,35 400,20 Q500,5 600,20 Q700,35 800,20',
    wave:      'M0,20 C80,5 120,35 200,20 C280,5 320,35 400,20 C480,5 520,35 600,20 C680,5 720,35 800,20',
    petal:     'M0,20 Q50,0 100,20 Q150,40 200,20 Q250,0 300,20 Q350,40 400,20 Q450,0 500,20 Q550,40 600,20 Q650,0 700,20 Q750,40 800,20',
    geometric: 'M0,20 L100,8 L200,32 L300,8 L400,32 L500,8 L600,32 L700,8 L800,20',
    cascade:   'M0,10 C60,25 100,5 160,18 C220,30 260,8 320,22 C380,35 420,10 480,24 C540,38 580,12 640,20 C700,28 740,8 800,18',
    ribbon:    'M0,20 C133,5 267,35 400,20 C533,5 667,35 800,20',
    mountain:  'M0,32 L100,12 L200,26 L300,6 L400,20 L500,4 L600,18 L700,8 L800,20',
  };
  const sectionBorderSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 40">
  <path d="${curvePaths[curve]}" fill="none" stroke="${a}" stroke-width="0.8" opacity="0.25"/>
  <path d="${curvePaths[curve]}" fill="none" stroke="${a}" stroke-width="0.4" stroke-dasharray="4,6" opacity="0.12" transform="translate(0,6)"/>
  <circle cx="400" cy="20" r="4" fill="${a}" opacity="0.3"/>
  <circle cx="400" cy="20" r="2" fill="${a}" opacity="0.5"/>
  <circle cx="200" cy="20" r="1.5" fill="${a}" opacity="0.2"/>
  <circle cx="600" cy="20" r="1.5" fill="${a}" opacity="0.2"/>
</svg>`;

  const cornerFlourishSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
  <g fill="none" stroke="${a}" opacity="0.2">
    <path d="M0,0 C80,10 120,60 140,140" stroke-width="1.5"/>
    <path d="M0,20 C60,28 100,70 120,150" stroke-width="1"/>
    <path d="M20,0 C28,60 70,100 150,120" stroke-width="1"/>
    <path d="M0,60 C40,65 70,90 90,160" stroke-width="0.8" opacity="0.15"/>
    <path d="M60,0 C65,40 90,70 160,90" stroke-width="0.8" opacity="0.15"/>
    <circle cx="50" cy="50" r="12" stroke-width="0.8" opacity="0.12"/>
    <circle cx="50" cy="50" r="6" fill="${a}" opacity="0.08"/>
    <path d="M30,15 C35,25 45,30 30,40 C20,30 25,25 30,15Z" fill="${a}" opacity="0.1"/>
    <path d="M15,30 C25,35 30,45 40,30 C30,20 25,25 15,30Z" fill="${a}" opacity="0.1"/>
    <path d="M65,8 C70,18 80,22 65,32 C55,22 60,18 65,8Z" fill="${a}" opacity="0.08"/>
    <path d="M8,65 C18,70 22,80 32,65 C22,55 18,60 8,65Z" fill="${a}" opacity="0.08"/>
    <path d="M100,30 C105,45 115,55 100,65 C90,55 95,45 100,30Z" fill="${a}" opacity="0.06"/>
    <path d="M30,100 C45,105 55,115 65,100 C55,90 45,95 30,100Z" fill="${a}" opacity="0.06"/>
    <circle cx="30" cy="15" r="2" fill="${a}" opacity="0.15"/>
    <circle cx="15" cy="30" r="2" fill="${a}" opacity="0.15"/>
    <circle cx="75" cy="25" r="1.5" fill="${a}" opacity="0.12"/>
    <circle cx="25" cy="75" r="1.5" fill="${a}" opacity="0.12"/>
    <circle cx="110" cy="45" r="1" fill="${a}" opacity="0.1"/>
    <circle cx="45" cy="110" r="1" fill="${a}" opacity="0.1"/>
  </g>
</svg>`;

  const pts = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 * Math.PI) / 180;
    const x1 = (60 + 42 * Math.cos(angle)).toFixed(1);
    const y1 = (60 + 42 * Math.sin(angle)).toFixed(1);
    const x2 = (60 + 50 * Math.cos(angle)).toFixed(1);
    const y2 = (60 + 50 * Math.sin(angle)).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join('');

  const medallionSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <g fill="none" stroke="${a}" stroke-width="0.7" opacity="0.3">
    <circle cx="60" cy="60" r="50"/>
    <circle cx="60" cy="60" r="42"/>
    <circle cx="60" cy="60" r="30"/>
    ${pts}
  </g>
  <circle cx="60" cy="60" r="4" fill="${a}" opacity="0.3"/>
  <circle cx="60" cy="60" r="1.5" fill="${a}" opacity="0.6"/>
</svg>`;

  // — Large-format prominent art ———————————————————————————
  const heroBlobSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700">
  <g fill="none" stroke="${a}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M250,680 C240,580 260,480 240,380 C220,280 230,180 250,80" stroke-width="2" opacity="0.20"/>
    <path d="M247,520 C200,480 158,468 118,448" stroke-width="1.4" opacity="0.17"/>
    <path d="M244,420 C190,388 148,368 98,338" stroke-width="1.3" opacity="0.15"/>
    <path d="M253,560 C300,518 342,508 382,488" stroke-width="1.4" opacity="0.17"/>
    <path d="M256,460 C308,428 350,408 400,378" stroke-width="1.3" opacity="0.15"/>
    <path d="M248,320 C210,288 178,268 148,238" stroke-width="1.1" opacity="0.13"/>
    <path d="M252,280 C290,248 322,228 362,198" stroke-width="1.1" opacity="0.13"/>
  </g>
  <g fill="${a}">
    <path d="M118,448 Q93,426 109,404 Q134,426 118,448 Z" opacity="0.18"/>
    <path d="M145,488 Q120,463 138,438 Q162,463 145,488 Z" opacity="0.16"/>
    <path d="M98,338 Q73,315 90,293 Q116,315 98,338 Z" opacity="0.16"/>
    <path d="M382,488 Q406,465 390,442 Q365,465 382,488 Z" opacity="0.18"/>
    <path d="M400,378 Q424,354 407,332 Q383,354 400,378 Z" opacity="0.16"/>
    <path d="M148,238 Q125,218 140,198 Q163,218 148,238 Z" opacity="0.14"/>
    <path d="M362,198 Q385,176 368,155 Q344,176 362,198 Z" opacity="0.14"/>
    <circle cx="250" cy="75" r="16" opacity="0.14"/>
    <circle cx="250" cy="75" r="8" opacity="0.22"/>
    <circle cx="180" cy="350" r="2.5" opacity="0.28"/>
    <circle cx="320" cy="430" r="2.5" opacity="0.28"/>
    <circle cx="148" cy="458" r="2" opacity="0.22"/>
    <circle cx="370" cy="378" r="2" opacity="0.22"/>
    <circle cx="200" cy="250" r="2" opacity="0.20"/>
    <circle cx="300" cy="220" r="2" opacity="0.20"/>
    <circle cx="168" cy="580" r="1.5" opacity="0.16"/>
    <circle cx="332" cy="548" r="1.5" opacity="0.16"/>
  </g>
</svg>`;

  const accentBlobSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <path d="M480,200 L448,312 L358,374 L248,362 L162,290 L148,180 L206,98 L308,72 L408,112 Z" fill="${a}" opacity="0.07"/>
  <g fill="none" stroke="${a}">
    <circle cx="300" cy="200" r="96" opacity="0.13"/>
    <circle cx="300" cy="200" r="64" opacity="0.10"/>
    <circle cx="300" cy="200" r="32" opacity="0.08"/>
  </g>
  <g fill="${a}" opacity="0.20">
    <circle cx="300" cy="104" r="4"/>
    <circle cx="393" cy="152" r="4"/>
    <circle cx="393" cy="248" r="4"/>
    <circle cx="300" cy="296" r="4"/>
    <circle cx="207" cy="248" r="4"/>
    <circle cx="207" cy="152" r="4"/>
  </g>
  <circle cx="300" cy="200" r="9" fill="${a}" opacity="0.22"/>
  <circle cx="300" cy="200" r="3" fill="${a}" opacity="0.45"/>
</svg>`;

  const SECTION_BLOB_PATHS: Record<VibeSkin['curve'], string> = {
    organic:   'M0,80 C360,20 720,120 1080,50 C1260,15 1380,55 1440,40 L1440,500 L0,500 Z',
    arch:      'M0,60 Q360,0 720,60 Q1080,120 1440,60 L1440,500 L0,500 Z',
    wave:      'M0,80 C180,40 240,100 360,70 C480,40 600,90 720,65 C840,40 960,95 1080,70 C1200,45 1380,75 1440,60 L1440,500 L0,500 Z',
    petal:     'M0,60 Q180,10 360,60 Q540,110 720,60 Q900,10 1080,60 Q1260,110 1440,60 L1440,500 L0,500 Z',
    geometric: 'M0,40 L240,85 L480,20 L720,85 L960,20 L1200,85 L1440,40 L1440,500 L0,500 Z',
    cascade:   'M0,30 C240,80 360,10 480,55 C600,100 720,20 840,65 C960,110 1200,30 1440,50 L1440,500 L0,500 Z',
    ribbon:    'M0,70 C360,10 720,130 1080,70 C1260,40 1380,90 1440,65 L1440,500 L0,500 Z',
    mountain:  'M0,100 L200,30 L360,80 L520,15 L720,60 L900,10 L1080,50 L1260,20 L1440,45 L1440,500 L0,500 Z',
  };
  const sectionBlobPath = SECTION_BLOB_PATHS[curve];

  return { heroPatternSvg, sectionBorderSvg, cornerFlourishSvg, medallionSvg, heroBlobSvg, accentBlobSvg, sectionBlobPath };
}
