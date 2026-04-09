// ─────────────────────────────────────────────────────────────
// Pearloom / lib/card-illustrations.ts
// Bold, purpose-built SVG scene illustrations for template cards
// AND hero backgrounds. Each is a full scene (1200x800) with
// rich color that works at both card thumbnail and hero size.
// ─────────────────────────────────────────────────────────────

export function generateCardIllustration(themeId: string, colors: {
  background: string;
  accent: string;
  accent2: string;
  foreground: string;
}): string {
  const { background: bg, accent: ac, accent2: ac2, foreground: fg } = colors;
  const gen = CARD_GENERATORS[themeId];
  if (gen) return gen(bg, ac, ac2, fg);
  return fallbackCard(bg, ac, ac2, fg);
}

// Shared SVG wrapper
function svg(bg: string, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${bg}"/>${content}</svg>`;
}

const CARD_GENERATORS: Record<string, (bg: string, ac: string, ac2: string, fg: string) => string> = {

  'ethereal-garden': (bg, ac, ac2) => svg(bg, `
    <path d="M0 600q200-80 400-40t400-60 400 20v280H0z" fill="${ac}" opacity=".12"/>
    <path d="M0 650q150-40 300 0t300-30 300 10 300-20v170H0z" fill="${ac2}" opacity=".15"/>
    <path d="M200 600q20-80 10-200" stroke="${ac}" stroke-width="3" fill="none" opacity=".3"/>
    <path d="M210 400q-15-10-25 5t5 20 20-5z" fill="${ac}" opacity=".35"/>
    <path d="M195 440q-20-5-25 10t10 18 15-8z" fill="${ac2}" opacity=".3"/>
    <path d="M500 580q15-100 5-220" stroke="${ac}" stroke-width="2.5" fill="none" opacity=".25"/>
    <path d="M505 360q-12-8-20 5t5 16 15-5z" fill="${ac}" opacity=".3"/>
    <path d="M490 400q-15-5-20 8t8 14 12-6z" fill="${ac2}" opacity=".25"/>
    <path d="M900 570q-20-120-5-250" stroke="${ac}" stroke-width="3" fill="none" opacity=".3"/>
    <path d="M895 320q-15-10-22 8t8 18 14-8z" fill="${ac}" opacity=".35"/>
    <path d="M910 370q15-8 20 5t-5 16-15-5z" fill="${ac2}" opacity=".3"/>
    <circle cx="350" cy="350" r="5" fill="${ac}" opacity=".2"/>
    <circle cx="700" cy="300" r="4" fill="${ac2}" opacity=".18"/>
    <circle cx="1050" cy="380" r="6" fill="${ac}" opacity=".15"/>
  `),

  'midnight-luxe': (bg, ac, ac2) => svg(bg, `
    <path d="M600 0l600 800H0z" fill="${ac}" opacity=".06"/>
    <path d="M600 100l400 600H200z" fill="none" stroke="${ac}" stroke-width="2" opacity=".2"/>
    <path d="M600 200l250 400H350z" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".15"/>
    ${[0,1,2,3,4,5,6,7].map(i => `<line x1="600" y1="50" x2="${i*170}" y2="800" stroke="${ac}" stroke-width=".8" opacity=".08"/>`).join('')}
    <circle cx="600" cy="350" r="40" fill="none" stroke="${ac}" stroke-width="2" opacity=".25"/>
    <circle cx="600" cy="350" r="25" fill="${ac}" opacity=".08"/>
    <path d="M560 350l40-60 40 60-40 60z" fill="none" stroke="${ac2}" stroke-width="1.5" opacity=".2"/>
  `),

  'coastal-breeze': (bg, ac, ac2) => svg(bg, `
    <path d="M0 450q150-50 300 0t300-40 300 20 300-30v380H0z" fill="${ac}" opacity=".12"/>
    <path d="M0 500q200-30 400 10t400-20 400 10v310H0z" fill="${ac}" opacity=".08"/>
    <path d="M0 550q250-20 500 15t500-10 200 5v260H0z" fill="${ac2}" opacity=".1"/>
    <circle cx="900" cy="200" r="80" fill="${ac2}" opacity=".08"/>
    <path d="M850 400l20-60 5 20 15-40 5 30 10-20 5 25 15-35 5 15 10-25v90z" fill="white" opacity=".15"/>
    <path d="M860 340l40-100 40 100" fill="none" stroke="white" stroke-width="1" opacity=".12"/>
    <circle cx="200" cy="600" r="15" fill="${ac2}" opacity=".12"/>
    <circle cx="250" cy="610" r="10" fill="${ac2}" opacity=".1"/>
  `),

  'art-deco-glamour': (bg, ac, ac2) => svg(bg, `
    <rect x="100" y="100" width="1000" height="600" rx="8" fill="none" stroke="${ac}" stroke-width="3" opacity=".2"/>
    <rect x="130" y="130" width="940" height="540" rx="4" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".12"/>
    <path d="M600 130v540" stroke="${ac}" stroke-width="1" opacity=".1"/>
    <path d="M130 400h940" stroke="${ac}" stroke-width="1" opacity=".1"/>
    ${[0,1,2,3,4,5,6,7,8].map(i => `<path d="M600 400l${Math.cos(i*Math.PI/4.5)*200} ${Math.sin(i*Math.PI/4.5)*200}" stroke="${ac}" stroke-width="1.5" opacity=".15"/>`).join('')}
    <circle cx="600" cy="400" r="60" fill="none" stroke="${ac}" stroke-width="2" opacity=".2"/>
    <circle cx="600" cy="400" r="40" fill="none" stroke="${ac2}" stroke-width="1.5" opacity=".15"/>
    <circle cx="600" cy="400" r="15" fill="${ac}" opacity=".1"/>
    <path d="M500 150l100-50 100 50" fill="none" stroke="${ac}" stroke-width="2" opacity=".18"/>
    <path d="M500 650l100 50 100-50" fill="none" stroke="${ac}" stroke-width="2" opacity=".18"/>
  `),

  'tuscan-villa': (bg, ac, ac2) => svg(bg, `
    <path d="M0 500q200-60 400-80t400-20 400 40v360H0z" fill="${ac}" opacity=".1"/>
    <path d="M0 550q300-40 600-50t600 20v280H0z" fill="${ac2}" opacity=".12"/>
    <path d="M300 500v-180l15-20 15 20v180" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".25"/>
    <path d="M310 300v-100l5-10 5 10v100" fill="${ac}" opacity=".15"/>
    <path d="M800 480v-200l15-20 15 20v200" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".25"/>
    <path d="M810 260v-120l5-10 5 10v120" fill="${ac}" opacity=".15"/>
    <circle cx="150" cy="200" r="100" fill="${ac2}" opacity=".06"/>
    <path d="M500 520h200v-60q0-40-100-60-100 20-100 60z" fill="${ac}" opacity=".12"/>
    <rect x="570" y="480" width="60" height="40" rx="30" fill="${ac}" opacity=".08"/>
  `),

  'enchanted-forest': (bg, ac, ac2) => svg(bg, `
    <path d="M0 800v-400l80-200-30 100 60-250-20 150 50-180v380H0z" fill="${ac}" opacity=".2"/>
    <path d="M200 800v-350l60-180-20 80 50-200-15 120 40-150v330z" fill="${ac}" opacity=".15"/>
    <path d="M1000 800v-380l-70-220 25 100-55-230 18 140-45-170v380z" fill="${ac}" opacity=".2"/>
    <path d="M800 800v-300l-50-160 20 80-40-180 15 110-35-130v280z" fill="${ac}" opacity=".15"/>
    <circle cx="300" cy="350" r="4" fill="${ac2}" opacity=".5"/>
    <circle cx="500" cy="280" r="3" fill="${ac2}" opacity=".4"/>
    <circle cx="700" cy="320" r="5" fill="${ac2}" opacity=".45"/>
    <circle cx="450" cy="400" r="3" fill="${ac2}" opacity=".35"/>
    <circle cx="650" cy="250" r="4" fill="${ac2}" opacity=".4"/>
    <circle cx="850" cy="380" r="3" fill="${ac2}" opacity=".3"/>
    <circle cx="550" cy="450" r="2" fill="${ac2}" opacity=".5"/>
    <circle cx="350" cy="500" r="3" fill="${ac2}" opacity=".35"/>
    <path d="M580 600q-10-20 0-30t20 0-10 30z" fill="${ac}" opacity=".2"/>
    <path d="M620 580q-8-15 0-25t15 0-7 25z" fill="${ac2}" opacity=".18"/>
  `),

  'desert-boho': (bg, ac, ac2) => svg(bg, `
    <circle cx="900" cy="200" r="120" fill="${ac2}" opacity=".12"/>
    <path d="M0 600q300-100 600-60t600-40v300H0z" fill="${ac}" opacity=".1"/>
    <path d="M0 650q400-40 800-20t400-10v180H0z" fill="${ac2}" opacity=".08"/>
    <path d="M300 600v-250M280 400h40M270 450h60M285 350h30" stroke="${ac}" stroke-width="4" fill="none" opacity=".3" stroke-linecap="round"/>
    <path d="M750 580v-200M735 420h30M725 470h50" stroke="${ac}" stroke-width="3.5" fill="none" opacity=".25" stroke-linecap="round"/>
    <path d="M500 550v-150" stroke="${ac2}" stroke-width="3" fill="none" opacity=".2" stroke-linecap="round"/>
    <circle cx="500" cy="390" r="8" fill="${ac2}" opacity=".15"/>
    <path d="M1050 600v-120M1040 510h20M1035 540h30" stroke="${ac}" stroke-width="2.5" fill="none" opacity=".2" stroke-linecap="round"/>
  `),

  'tropical-paradise': (bg, ac, ac2) => svg(bg, `
    <path d="M200 800v-400q0-20 10-30l80 100-30-120 100 80-40-100 70 50v420z" fill="${ac}" opacity=".15"/>
    <path d="M950 800v-350q0-20-10-30l-70 90 25-110-90 70 35-90-60 40v380z" fill="${ac}" opacity=".12"/>
    <circle cx="600" cy="250" r="100" fill="${ac2}" opacity=".08"/>
    <path d="M0 550q200-30 400 10t400-20 400 15v250H0z" fill="${ac}" opacity=".1"/>
    <path d="M0 600q300-20 600 5t600-10v200H0z" fill="${ac2}" opacity=".08"/>
    <path d="M450 500q10-20 25-15t10 20-15 15-20-5z" fill="${ac}" opacity=".25"/>
    <path d="M460 480q8-15 18-12t8 16-12 12-14-4z" fill="${ac2}" opacity=".2"/>
    <path d="M700 480q12-18 22-14t10 18-14 14-18-4z" fill="${ac}" opacity=".2"/>
  `),

  'winter-wonderland': (bg, ac, ac2) => svg(bg, `
    <path d="M0 550q200-30 400 10t400-20 400 15v250H0z" fill="${ac}" opacity=".08"/>
    <path d="M100 800v-250l60-80-20 40 50-100-15 50 40-70v410z" fill="${ac2}" opacity=".1"/>
    <path d="M400 800v-200l50-70-15 30 40-80-12 40 30-50v330z" fill="${ac2}" opacity=".08"/>
    <path d="M900 800v-230l55-75-18 35 45-90-14 45 35-60v375z" fill="${ac2}" opacity=".1"/>
    ${[150,300,500,650,800,1000].map((x,i) => {
      const y = 150 + (i * 37) % 200;
      const s = 15 + i % 10;
      return `<path d="M${x} ${y-s}v${s*2}M${x-s} ${y}h${s*2}M${x-s*.7} ${y-s*.7}l${s*1.4} ${s*1.4}M${x+s*.7} ${y-s*.7}l${-s*1.4} ${s*1.4}" stroke="${ac}" stroke-width="1.5" opacity=".${15+i%10}" fill="none"/>`;
    }).join('')}
  `),

  'celestial-night': (bg, ac, ac2) => svg(bg, `
    <path d="M350 300q-60 0-80-60 40 20 80 0-20 40 0 60z" fill="${ac}" opacity=".2"/>
    <circle cx="350" cy="280" r="50" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".15"/>
    ${[200,400,550,700,850,1000,150,500,750,950,300,600,1100].map((x,i) => {
      const y = 100 + (i * 67) % 500;
      const r = 1.5 + i % 3;
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${ac}" opacity=".${20+i%20}"/>`;
    }).join('')}
    <path d="M700 200l800 250" stroke="${ac}" stroke-width=".5" opacity=".08"/>
    <path d="M700 200l200 400" stroke="${ac}" stroke-width=".5" opacity=".08"/>
    <path d="M900 450l800 250" stroke="${ac}" stroke-width=".5" opacity=".06"/>
    <path d="M200 500l550 200 400-100" stroke="${ac}" stroke-width=".5" opacity=".06"/>
    <circle cx="850" cy="350" r="3" fill="${ac}" opacity=".4"/>
    <circle cx="1000" cy="200" r="2.5" fill="${ac}" opacity=".35"/>
  `),

  'dark-romance': (bg, ac, ac2) => svg(bg, `
    <path d="M400 450q0-80 50-120t100 0 50 120-50 80-100 0-50-80z" fill="${ac}" opacity=".12"/>
    <path d="M420 440q0-60 40-90t80 0 40 90-40 60-80 0-40-60z" fill="${ac}" opacity=".08"/>
    <path d="M600 350q30-150 200-200" stroke="${ac}" stroke-width="2" fill="none" opacity=".15"/>
    <path d="M700 200q-8-12 5-18t15 5-5 18z" fill="${ac}" opacity=".2"/>
    <path d="M550 380q-40-120-180-180" stroke="${ac}" stroke-width="2" fill="none" opacity=".15"/>
    <path d="M380 210q-10-10 2-18t16 2-2 18z" fill="${ac}" opacity=".2"/>
    <path d="M400 600q-100 50-250 20" stroke="${ac}" stroke-width="1.5" fill="none" opacity=".1"/>
    <path d="M600 600q100 50 250 20" stroke="${ac}" stroke-width="1.5" fill="none" opacity=".1"/>
  `),

  'modern-glam': (bg, ac, ac2) => svg(bg, `
    <rect x="200" y="200" width="800" height="400" fill="none" stroke="${ac}" stroke-width="2" opacity=".15"/>
    <line x1="200" y1="200" x2="600" y2="400" stroke="${ac}" stroke-width="1" opacity=".08"/>
    <line x1="1000" y1="200" x2="600" y2="400" stroke="${ac}" stroke-width="1" opacity=".08"/>
    <line x1="200" y1="600" x2="600" y2="400" stroke="${ac}" stroke-width="1" opacity=".08"/>
    <line x1="1000" y1="600" x2="600" y2="400" stroke="${ac}" stroke-width="1" opacity=".08"/>
    <circle cx="600" cy="400" r="80" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".2"/>
    <circle cx="600" cy="400" r="40" fill="${ac}" opacity=".08"/>
    <path d="M600 320l30 50h-60z" fill="${ac}" opacity=".12"/>
    <path d="M600 480l30-50h-60z" fill="${ac}" opacity=".12"/>
  `),

  'industrial-chic': (bg, ac, ac2, fg) => svg(bg, `
    ${[0,1,2,3,4,5].map(i => `<line x1="${200*i}" y1="0" x2="${200*i}" y2="800" stroke="${fg}" stroke-width=".5" opacity=".06"/>`).join('')}
    ${[0,1,2,3,4].map(i => `<line x1="0" y1="${200*i}" x2="1200" y2="${200*i}" stroke="${fg}" stroke-width=".5" opacity=".06"/>`).join('')}
    <circle cx="400" cy="350" r="80" fill="none" stroke="${ac}" stroke-width="3" opacity=".2"/>
    <circle cx="400" cy="350" r="60" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".12"/>
    <path d="M400 270l10 15h-20zM400 430l10-15h-20z" fill="${ac}" opacity=".2"/>
    <circle cx="800" cy="450" r="60" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".18"/>
    <circle cx="800" cy="450" r="40" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".12"/>
    <path d="M800 390l8 12h-16zM800 510l8-12h-16z" fill="${ac}" opacity=".18"/>
    <rect x="550" y="250" width="100" height="15" rx="2" fill="${ac}" opacity=".1"/>
    <circle cx="550" cy="257" r="5" fill="${ac}" opacity=".15"/>
    <circle cx="650" cy="257" r="5" fill="${ac}" opacity=".15"/>
  `),

  'vintage-romance': (bg, ac, ac2) => svg(bg, `
    <ellipse cx="600" cy="400" rx="350" ry="280" fill="none" stroke="${ac}" stroke-width="2" opacity=".15"/>
    <ellipse cx="600" cy="400" rx="320" ry="250" fill="none" stroke="${ac}" stroke-width="1" opacity=".1" stroke-dasharray="8 4"/>
    <path d="M350 200q50-20 80 10t-10 60-70-10 0-60z" fill="${ac}" opacity=".15"/>
    <path d="M800 250q40-25 70 5t-8 55-62-5 0-55z" fill="${ac2}" opacity=".12"/>
    <path d="M400 550q45-18 72 8t-9 52-63-8 0-52z" fill="${ac}" opacity=".12"/>
    <path d="M750 520q35-20 60 5t-6 45-54-5 0-45z" fill="${ac2}" opacity=".1"/>
    <path d="M250 400h100M850 400h100" stroke="${ac}" stroke-width="1" opacity=".1"/>
    <path d="M600 120v60M600 620v60" stroke="${ac}" stroke-width="1" opacity=".1"/>
  `),

  'southern-charm': (bg, ac, ac2) => svg(bg, `
    <path d="M100 300q200-50 500-30t500-20" stroke="${ac}" stroke-width="3" fill="none" opacity=".2"/>
    <path d="M150 310q180-40 450-25t480-15" stroke="${ac2}" stroke-width="2" fill="none" opacity=".15"/>
    <path d="M300 270q0-30 25-35t25 35-25 25-25-25z" fill="${ac}" opacity=".2"/>
    <path d="M280 280q-15-5-20 10t10 15 15-10z" fill="${ac2}" opacity=".15"/>
    <path d="M340 275q15-8 20 8t-10 15-15-8z" fill="${ac2}" opacity=".15"/>
    <path d="M650 250q0-35 28-40t28 40-28 28-28-28z" fill="${ac}" opacity=".22"/>
    <path d="M628 262q-18-6-22 12t12 18 18-12z" fill="${ac2}" opacity=".15"/>
    <path d="M692 256q18-8 22 10t-12 16-18-8z" fill="${ac2}" opacity=".15"/>
    <path d="M950 280q0-25 20-30t20 30-20 20-20-20z" fill="${ac}" opacity=".18"/>
  `),
};

function fallbackCard(bg: string, ac: string, ac2: string, fg: string): string {
  return svg(bg, `
    <circle cx="600" cy="350" r="120" fill="none" stroke="${ac}" stroke-width="2" opacity=".15"/>
    <circle cx="600" cy="350" r="80" fill="none" stroke="${ac2}" stroke-width="1.5" opacity=".12"/>
    <circle cx="600" cy="350" r="40" fill="${ac}" opacity=".06"/>
    <path d="M600 230v240M480 350h240" stroke="${ac}" stroke-width="1" opacity=".08"/>
    <path d="M0 600q300-60 600-30t600-30v260H0z" fill="${ac}" opacity=".06"/>
  `);
}
