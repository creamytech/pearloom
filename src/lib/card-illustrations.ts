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

  'rustic-romance': (bg, ac, ac2) => svg(bg, `
    <path d="M0 550q300-60 600-30t600-40v320H0z" fill="${ac}" opacity=".08"/>
    <path d="M250 550v-200l5-15 5 15v200M260 350l-15-5 15-10 15 10-15 5" stroke="${ac}" stroke-width="2" fill="none" opacity=".25"/>
    <path d="M260 380l-12-4 12-8 12 8-12 4" stroke="${ac}" stroke-width="1.5" fill="none" opacity=".2"/>
    <path d="M700 530v-180l5-12 5 12v180M710 350l-12-4 12-8 12 8-12 4" stroke="${ac}" stroke-width="2" fill="none" opacity=".25"/>
    <path d="M500 560v-160l4-10 4 10v160" stroke="${ac2}" stroke-width="1.5" fill="none" opacity=".2"/>
    <rect x="400" y="600" width="400" height="8" rx="4" fill="${ac}" opacity=".06"/>
  `),

  'blush-bloom': (bg, ac, ac2) => svg(bg, `
    <circle cx="300" cy="300" r="60" fill="${ac}" opacity=".08"/>
    <circle cx="300" cy="300" r="45" fill="${ac}" opacity=".06"/>
    <circle cx="300" cy="300" r="30" fill="${ac2}" opacity=".1"/>
    <circle cx="700" cy="400" r="80" fill="${ac}" opacity=".07"/>
    <circle cx="700" cy="400" r="55" fill="${ac2}" opacity=".08"/>
    <circle cx="700" cy="400" r="35" fill="${ac}" opacity=".06"/>
    <circle cx="500" cy="250" r="40" fill="${ac2}" opacity=".06"/>
    <circle cx="900" cy="300" r="50" fill="${ac}" opacity=".05"/>
    <circle cx="200" cy="500" r="70" fill="${ac2}" opacity=".06"/>
    <path d="M0 600q300-40 600 0t600-20v220H0z" fill="${ac}" opacity=".06"/>
  `),

  'golden-hour': (bg, ac, ac2) => svg(bg, `
    <circle cx="600" cy="600" r="300" fill="${ac}" opacity=".06"/>
    <circle cx="600" cy="600" r="200" fill="${ac}" opacity=".04"/>
    ${[0,1,2,3,4,5,6,7,8,9,10,11].map(i => `<line x1="600" y1="600" x2="${600+Math.cos(i*Math.PI/6)*500}" y2="${600+Math.sin(i*Math.PI/6)*500}" stroke="${ac}" stroke-width="1.5" opacity=".08"/>`).join('')}
    <path d="M0 500q300-80 600-40t600-60v400H0z" fill="${ac2}" opacity=".08"/>
    <path d="M0 580q400-30 800 0t400-20v240H0z" fill="${ac}" opacity=".05"/>
  `),

  'lavender-dreams': (bg, ac, ac2) => svg(bg, `
    <ellipse cx="400" cy="350" rx="250" ry="180" fill="${ac}" opacity=".06"/>
    <ellipse cx="800" cy="400" rx="200" ry="150" fill="${ac2}" opacity=".05"/>
    ${[150,300,450,600,750,900,1050,200,500,800,350,650,950].map((x,i) => `<circle cx="${x}" cy="${100+(i*57)%500}" r="${2+i%3}" fill="${ac}" opacity=".${15+i%20}"/>`).join('')}
    <path d="M300 250l500 200" stroke="${ac}" stroke-width=".5" opacity=".06"/>
    <path d="M200 400l600 150" stroke="${ac2}" stroke-width=".5" opacity=".05"/>
  `),

  'minimalist-white': (bg, ac, ac2, fg) => svg(bg, `
    <line x1="200" y1="400" x2="1000" y2="400" stroke="${fg}" stroke-width="1" opacity=".08"/>
    <line x1="600" y1="200" x2="600" y2="600" stroke="${fg}" stroke-width="1" opacity=".08"/>
    <rect x="450" y="300" width="300" height="200" fill="none" stroke="${fg}" stroke-width="1.5" opacity=".06"/>
    <circle cx="600" cy="400" r="8" fill="${fg}" opacity=".08"/>
  `),

  'boho-wildflower': (bg, ac, ac2) => svg(bg, `
    ${[100,200,300,400,500,600,700,800,900,1000,1100].map((x,i) => `<path d="M${x} 800q${i%2?10:-10}-200 ${i%2?25:-25}-450" fill="none" stroke="${i%2?ac:ac2}" stroke-width="2" opacity=".15"/>`).join('')}
    <circle cx="125" cy="350" r="8" fill="${ac}" opacity=".2"/>
    <circle cx="300" cy="300" r="10" fill="${ac2}" opacity=".18"/>
    <circle cx="500" cy="280" r="12" fill="${ac}" opacity=".2"/>
    <circle cx="700" cy="320" r="9" fill="${ac2}" opacity=".18"/>
    <circle cx="900" cy="290" r="11" fill="${ac}" opacity=".2"/>
    <circle cx="1075" cy="340" r="8" fill="${ac2}" opacity=".18"/>
    <path d="M0 650q300-30 600 0t600-20v170H0z" fill="${ac}" opacity=".06"/>
  `),

  'classic-elegance': (bg, ac, ac2) => svg(bg, `
    <rect x="100" y="100" width="1000" height="600" rx="4" fill="none" stroke="${ac}" stroke-width="2" opacity=".12"/>
    <rect x="120" y="120" width="960" height="560" rx="2" fill="none" stroke="${ac}" stroke-width="1" opacity=".08"/>
    <path d="M200 120q100 30 200 0M500 120q100 30 200 0M800 120q100 30 200 0" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".12"/>
    <path d="M200 680q100-30 200 0M500 680q100-30 200 0M800 680q100-30 200 0" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".12"/>
    <circle cx="600" cy="400" r="40" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".1"/>
  `),

  'fairytale-castle': (bg, ac, ac2) => svg(bg, `
    <path d="M400 800v-350l10-30 10 30v350" fill="none" stroke="${ac}" stroke-width="2" opacity=".2"/>
    <path d="M410 420l-20-40h40z" fill="${ac}" opacity=".15"/>
    <path d="M500 800v-400l80-100 80 100v400" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".2"/>
    <path d="M580 300l-40-60h80z" fill="${ac}" opacity=".18"/>
    <path d="M700 800v-350l10-30 10 30v350" fill="none" stroke="${ac}" stroke-width="2" opacity=".2"/>
    <path d="M710 420l-20-40h40z" fill="${ac}" opacity=".15"/>
    <path d="M430 500h240" stroke="${ac}" stroke-width="1" opacity=".1"/>
    <rect x="545" y="550" width="70" height="100" rx="35" fill="${ac}" opacity=".06"/>
    ${[300,450,650,800,950].map((x,i) => `<circle cx="${x}" cy="${150+(i*37)%150}" r="${2+i%2}" fill="${ac2}" opacity=".2"/>`).join('')}
  `),

  'cottagecore': (bg, ac, ac2) => svg(bg, `
    <path d="M300 500l200-150 200 150" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".2"/>
    <rect x="350" y="500" width="300" height="200" fill="none" stroke="${ac}" stroke-width="2" opacity=".15"/>
    <rect x="460" y="550" width="80" height="100" rx="40" fill="${ac}" opacity=".06"/>
    <rect x="370" y="530" width="50" height="50" fill="none" stroke="${ac2}" stroke-width="1" opacity=".1"/>
    <rect x="580" y="530" width="50" height="50" fill="none" stroke="${ac2}" stroke-width="1" opacity=".1"/>
    ${[100,200,700,800,900,1000,1100].map((x,i) => `<path d="M${x} 700q${5+i%3}-${30+i*5} 0-${60+i*8}" fill="none" stroke="${i%2?ac:ac2}" stroke-width="1.5" opacity=".15"/><circle cx="${x}" cy="${640-i*8}" r="${4+i%3}" fill="${i%2?ac:ac2}" opacity=".12"/>`).join('')}
    <path d="M0 700q300-20 600 0t600-15v115H0z" fill="${ac2}" opacity=".06"/>
  `),

  'regency-romance': (bg, ac, ac2) => svg(bg, `
    <rect x="150" y="200" width="30" height="450" rx="15" fill="${ac}" opacity=".08"/>
    <rect x="1020" y="200" width="30" height="450" rx="15" fill="${ac}" opacity=".08"/>
    <path d="M180 200q420-200 840 0" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".15"/>
    <path d="M200 220q400-180 800 0" fill="none" stroke="${ac2}" stroke-width="1.5" opacity=".1"/>
    <path d="M250 250q150 40 300 0" fill="none" stroke="${ac}" stroke-width="1" opacity=".1"/>
    <path d="M650 250q150 40 300 0" fill="none" stroke="${ac}" stroke-width="1" opacity=".1"/>
    <circle cx="600" cy="400" r="50" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".12"/>
    <circle cx="600" cy="400" r="35" fill="${ac}" opacity=".04"/>
  `),

  'black-and-white': (bg, ac, ac2, fg) => svg(bg, `
    ${[0,1,2,3,4,5].map(i => `<rect x="${i*200}" y="0" width="100" height="800" fill="${fg}" opacity=".03"/>`).join('')}
    <line x1="0" y1="0" x2="1200" y2="800" stroke="${fg}" stroke-width="1.5" opacity=".06"/>
    <line x1="1200" y1="0" x2="0" y2="800" stroke="${fg}" stroke-width="1.5" opacity=".06"/>
    <circle cx="600" cy="400" r="100" fill="none" stroke="${fg}" stroke-width="2" opacity=".1"/>
    <rect x="500" y="300" width="200" height="200" fill="none" stroke="${fg}" stroke-width="1.5" opacity=".08"/>
  `),

  'gothic-cathedral': (bg, ac, ac2) => svg(bg, `
    ${[100,350,600,850].map(x => `<path d="M${x} 800v-400q0-120 125-180q125 60 125 180v400" fill="none" stroke="${ac}" stroke-width="2" opacity=".15"/>`).join('')}
    <path d="M600 180v250" stroke="${ac}" stroke-width="2" opacity=".12"/>
    <path d="M540 300h120" stroke="${ac}" stroke-width="2" opacity=".12"/>
    <circle cx="600" cy="250" r="30" fill="none" stroke="${ac}" stroke-width="1" opacity=".1"/>
    <path d="M0 700q300-30 600 0t600-20v120H0z" fill="${ac}" opacity=".05"/>
  `),

  'nautical-prep': (bg, ac, ac2) => svg(bg, `
    ${[0,1,2,3].map(i => `<path d="M0 ${450+i*80}q200-40 400 0t400-30 400 15" fill="none" stroke="${ac}" stroke-width="${2-i*.3}" opacity=".${12-i*2}"/>`).join('')}
    <circle cx="600" cy="300" r="50" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".18"/>
    <path d="M600 250v100M560 300h80" stroke="${ac}" stroke-width="2" opacity=".15"/>
    <path d="M600 350v30M590 380h20" stroke="${ac}" stroke-width="2" opacity=".12"/>
    <path d="M550 200l50-80 50 80" fill="none" stroke="${ac2}" stroke-width="1.5" opacity=".12"/>
  `),

  'mountain-lodge': (bg, ac, ac2) => svg(bg, `
    <path d="M0 600l200-300 100 80 200-350 150 200 100-150 200 280 250-200v440H0z" fill="${ac}" opacity=".08"/>
    <path d="M0 650l300-200 200 100 300-250 200 150 200-100v450H0z" fill="${ac2}" opacity=".06"/>
    ${[200,450,700,950].map((x,i) => `<path d="M${x} ${600-i*20}l-25-70 30 15-5-50 20 15 0-40 15 25-5-30 25-15-8 45 28-10z" fill="${ac}" opacity=".${8+i*2}"/>`).join('')}
    <path d="M0 700q400-30 800 0t400-15v115H0z" fill="${ac2}" opacity=".05"/>
  `),

  'japandi-zen': (bg, ac, ac2) => svg(bg, `
    <circle cx="600" cy="380" r="200" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".12" stroke-dasharray="8 0 8"/>
    <path d="M350 400q120-30 250 15" fill="none" stroke="${ac}" stroke-width="2" opacity=".15" stroke-linecap="round"/>
    <circle cx="620" cy="408" r="8" fill="${ac}" opacity=".12"/>
    <circle cx="580" cy="395" r="5" fill="${ac2}" opacity=".1"/>
    <line x1="200" y1="600" x2="1000" y2="600" stroke="${ac}" stroke-width="1" opacity=".06"/>
    <circle cx="600" cy="600" r="3" fill="${ac}" opacity=".1"/>
  `),

  'victorian-garden': (bg, ac, ac2) => svg(bg, `
    <rect x="80" y="80" width="1040" height="640" rx="8" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".12"/>
    <rect x="100" y="100" width="1000" height="600" rx="4" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".08"/>
    <path d="M80 80q40 40 80 0M1120 80q-40 40-80 0M80 720q40-40 80 0M1120 720q-40-40-80 0" fill="none" stroke="${ac}" stroke-width="2" opacity=".15"/>
    <path d="M500 200q50-40 100 0t100 0" fill="none" stroke="${ac2}" stroke-width="1.5" opacity=".1"/>
    <path d="M500 600q50 40 100 0t100 0" fill="none" stroke="${ac2}" stroke-width="1.5" opacity=".1"/>
  `),

  'fall-harvest': (bg, ac, ac2) => svg(bg, `
    ${[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map((i) => {
      const x = 80+(i*83)%1060, y = 100+(i*67)%550, rot = (i*47)%360;
      return `<path d="M${x} ${y}q12-20 0-35q-12 15 0 35" fill="${i%3===0?ac:ac2}" opacity=".${12+i%8}" transform="rotate(${rot} ${x} ${y})"/>`;
    }).join('')}
    <path d="M0 650q400-40 800 0t400-20v170H0z" fill="${ac}" opacity=".06"/>
  `),

  'dark-academia': (bg, ac, ac2) => svg(bg, `
    ${[0,1,2,3].map(i => `<line x1="150" y1="${200+i*150}" x2="1050" y2="${200+i*150}" stroke="${ac}" stroke-width="1.5" opacity=".08"/>`).join('')}
    ${[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => {
      const x = 170+i*75, shelf = Math.floor(i/4), y = 172+shelf*150;
      return `<rect x="${x}" y="${y}" width="${14+i%8}" height="26" rx="1" fill="${i%2?ac:ac2}" opacity=".${10+i%6}"/>`;
    }).join('')}
    <circle cx="800" cy="350" r="40" fill="none" stroke="${ac}" stroke-width="1" opacity=".08"/>
    <path d="M785 330h30M800 315v30" stroke="${ac}" stroke-width="1" opacity=".06"/>
  `),

  'old-money': (bg, ac, ac2) => svg(bg, `
    <rect x="150" y="150" width="900" height="500" rx="3" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".08"/>
    <circle cx="600" cy="400" r="80" fill="none" stroke="${ac}" stroke-width="1" opacity=".06"/>
    <circle cx="600" cy="400" r="60" fill="none" stroke="${ac2}" stroke-width=".5" opacity=".05"/>
    <line x1="300" y1="400" x2="520" y2="400" stroke="${ac}" stroke-width=".5" opacity=".05"/>
    <line x1="680" y1="400" x2="900" y2="400" stroke="${ac}" stroke-width=".5" opacity=".05"/>
  `),

  'maximalist-color': (bg, ac, ac2, fg) => svg(bg, `
    ${[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map((i) => {
      const x = 50+(i*87)%1100, y = 50+(i*73)%700, r = 25+i%40;
      const colors = [ac, ac2, '#4040FF', '#40C040', '#FFB800'];
      const c = colors[i%5];
      return i%3===0 ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".1"/>` : i%3===1 ? `<rect x="${x}" y="${y}" width="${r}" height="${r}" fill="${c}" opacity=".08" transform="rotate(${i*15} ${x} ${y})"/>` : `<polygon points="${x},${y-r} ${x+r},${y+r} ${x-r},${y+r}" fill="${c}" opacity=".07"/>`;
    }).join('')}
  `),

  'retro-disco': (bg, ac, ac2) => svg(bg, `
    <circle cx="600" cy="200" r="80" fill="none" stroke="${ac}" stroke-width="2" opacity=".2"/>
    <circle cx="600" cy="200" r="60" fill="none" stroke="${ac}" stroke-width="1" opacity=".12"/>
    <circle cx="600" cy="200" r="40" fill="${ac}" opacity=".06"/>
    <line x1="600" y1="0" x2="600" y2="120" stroke="${ac2}" stroke-width="1" opacity=".12"/>
    ${[0,1,2,3,4,5,6,7,8,9,10,11].map(i => `<line x1="600" y1="200" x2="${600+Math.cos(i*Math.PI/6)*400}" y2="${200+Math.sin(i*Math.PI/6)*400}" stroke="${ac}" stroke-width="1" opacity=".08"/>`).join('')}
    <rect x="100" y="650" width="1000" height="20" rx="2" fill="${ac}" opacity=".06"/>
    <rect x="100" y="680" width="1000" height="20" rx="2" fill="${ac2}" opacity=".05"/>
  `),

  'french-chateau': (bg, ac, ac2) => svg(bg, `
    <ellipse cx="600" cy="400" rx="350" ry="300" fill="none" stroke="${ac}" stroke-width="2" opacity=".12"/>
    <ellipse cx="600" cy="400" rx="300" ry="260" fill="none" stroke="${ac}" stroke-width="1" opacity=".08"/>
    <path d="M600 100l-15 20 15 10 15-10z" fill="${ac}" opacity=".15"/>
    <path d="M400 200q200-80 400 0" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".12"/>
    <path d="M400 600q200 80 400 0" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".12"/>
    <path d="M250 400h100M850 400h100" stroke="${ac}" stroke-width="1" opacity=".08"/>
    <rect x="200" y="250" width="20" height="300" rx="10" fill="${ac}" opacity=".06"/>
    <rect x="980" y="250" width="20" height="300" rx="10" fill="${ac}" opacity=".06"/>
  `),

  'country-barn': (bg, ac, ac2) => svg(bg, `
    <path d="M350 500l250-180 250 180" fill="none" stroke="${ac}" stroke-width="3" opacity=".15"/>
    <rect x="400" y="500" width="400" height="250" fill="none" stroke="${ac}" stroke-width="2" opacity=".12"/>
    <rect x="550" y="550" width="100" height="120" rx="50" fill="${ac}" opacity=".06"/>
    <line x1="600" y1="320" x2="600" y2="500" stroke="${ac}" stroke-width="1" opacity=".08"/>
    ${[100,200,800,900,1000,1100].map((x,i) => `<rect x="${x}" y="620" width="8" height="80" fill="${ac}" opacity=".06"/>`).join('')}
    <line x1="80" y1="660" x2="1120" y2="660" stroke="${ac}" stroke-width="1" opacity=".05"/>
  `),

  'western-ranch': (bg, ac, ac2) => svg(bg, `
    <circle cx="850" cy="250" r="100" fill="${ac2}" opacity=".08"/>
    <path d="M0 550l150-150h100l50 50h200l50-50h100l150 100 400-50v350H0z" fill="${ac}" opacity=".07"/>
    <path d="M300 550v-200M280 400h40M270 440h60" stroke="${ac}" stroke-width="3" fill="none" opacity=".2" stroke-linecap="round"/>
    <path d="M800 520v-150M785 410h30M778 440h44" stroke="${ac}" stroke-width="2.5" fill="none" opacity=".18" stroke-linecap="round"/>
  `),

  'romantic-blush': (bg, ac, ac2) => svg(bg, `
    ${[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => {
      const x = 100+(i*97)%1000, y = 100+(i*71)%600;
      return `<ellipse cx="${x}" cy="${y}" rx="${18+i%12}" ry="${22+i%15}" fill="${i%2?ac:ac2}" opacity=".${6+i%5}" transform="rotate(${i*30} ${x} ${y})"/>`;
    }).join('')}
    <path d="M0 600q300-30 600 0t600-20v220H0z" fill="${ac}" opacity=".05"/>
  `),

  'wildflower-meadow': (bg, ac, ac2) => svg(bg, `
    ${[80,180,280,380,480,580,680,780,880,980,1080].map((x,i) => `<path d="M${x} 800q${i%2?8:-8}-180 ${i%2?20:-20}-400" fill="none" stroke="${i%3===0?ac:ac2}" stroke-width="1.5" opacity=".15"/><circle cx="${x+(i%2?20:-20)}" cy="${400-(i*17)%100}" r="${6+i%5}" fill="${i%2?ac:ac2}" opacity=".18"/>`).join('')}
    <path d="M0 700q400-30 800 0t400-15v115H0z" fill="${ac}" opacity=".05"/>
  `),

  'whimsical-garden': (bg, ac, ac2) => svg(bg, `
    ${[200,400,600,800,1000].map((x,i) => `<circle cx="${x}" cy="${300+(i*50)%200}" r="${40+i*8}" fill="none" stroke="${i%2?ac:ac2}" stroke-width="1.5" opacity=".1" stroke-dasharray="6 4"/>`).join('')}
    ${[150,350,550,750,950,1100].map((x,i) => `<circle cx="${x}" cy="${200+(i*43)%400}" r="${3+i%4}" fill="${i%2?ac:ac2}" opacity=".15"/>`).join('')}
    <path d="M0 600q200-40 400 10t400-30 400 20v200H0z" fill="${ac}" opacity=".05"/>
  `),

  'nature-organic': (bg, ac, ac2) => svg(bg, `
    ${[0,1,2,3,4].map(i => `<path d="M0 ${400+i*80}q300-${40+i*10} 600 0t600 0" fill="none" stroke="${ac}" stroke-width="${2-i*.3}" opacity=".${10-i}"/>`).join('')}
    <path d="M300 350q20-35 0-55q-20 20 0 55" fill="${ac}" opacity=".12"/>
    <path d="M500 300q25-40 0-60q-25 20 0 60" fill="${ac2}" opacity=".1"/>
    <path d="M800 320q18-30 0-48q-18 18 0 48" fill="${ac}" opacity=".1"/>
    <path d="M650 370q15-25 0-40q-15 15 0 40" fill="${ac2}" opacity=".08"/>
  `),

  'y2k-reloaded': (bg, ac, ac2) => svg(bg, `
    ${[0,1,2,3,4,5,6,7,8,9].map((i) => `<circle cx="${100+(i*110)%1000}" cy="${100+(i*73)%600}" r="${20+i%20}" fill="none" stroke="${i%2?ac:ac2}" stroke-width="1.5" opacity=".12"/>`).join('')}
    ${[0,1,2,3,4,5].map((i) => `<path d="M${200+i*150} ${250+(i*47)%300}l5-15 5 15 15-5-15 5 5 15-5-15-15 5z" fill="${i%2?ac:ac2}" opacity=".18"/>`).join('')}
    <circle cx="600" cy="350" r="60" fill="${ac}" opacity=".05"/>
    <circle cx="600" cy="350" r="45" fill="${ac2}" opacity=".04"/>
  `),

  'aged-to-perfection': (bg, ac, ac2) => svg(bg, `
    <path d="M500 250l100 200h-200z" fill="none" stroke="${ac}" stroke-width="2" opacity=".15"/>
    <line x1="600" y1="450" x2="600" y2="600" stroke="${ac}" stroke-width="2" opacity=".12"/>
    <ellipse cx="600" cy="600" rx="50" ry="10" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".12"/>
    <circle cx="350" cy="400" r="80" fill="none" stroke="${ac2}" stroke-width="1" opacity=".08"/>
    <circle cx="850" cy="350" r="60" fill="none" stroke="${ac2}" stroke-width="1" opacity=".06"/>
    <path d="M0 650q400-30 800 0t400-20v170H0z" fill="${ac}" opacity=".05"/>
  `),

  'future-noir': (bg, ac, ac2) => svg(bg, `
    ${[0,1,2,3,4,5,6,7].map(i => `<line x1="${i*170}" y1="0" x2="${i*170}" y2="800" stroke="${ac}" stroke-width=".5" opacity=".1"/>`).join('')}
    ${[0,1,2,3,4,5].map(i => `<line x1="0" y1="${i*160}" x2="1200" y2="${i*160}" stroke="${ac}" stroke-width=".5" opacity=".08"/>`).join('')}
    <polygon points="600,250 680,310 680,420 600,480 520,420 520,310" fill="none" stroke="${ac}" stroke-width="2" opacity=".2"/>
    <polygon points="600,280 650,320 650,400 600,440 550,400 550,320" fill="${ac}" opacity=".04"/>
    <circle cx="600" cy="360" r="15" fill="${ac}" opacity=".08"/>
  `),

  'martini-hour': (bg, ac, ac2) => svg(bg, `
    <path d="M500 200l100 250h-200z" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".18"/>
    <line x1="600" y1="450" x2="600" y2="580" stroke="${ac}" stroke-width="2" opacity=".15"/>
    <line x1="540" y1="580" x2="660" y2="580" stroke="${ac}" stroke-width="2" opacity=".15"/>
    <circle cx="570" cy="280" r="4" fill="${ac}" opacity=".15"/>
    <circle cx="590" cy="310" r="3" fill="${ac}" opacity=".12"/>
    <circle cx="615" cy="260" r="3.5" fill="${ac}" opacity=".12"/>
    <circle cx="300" cy="350" r="60" fill="${ac2}" opacity=".04"/>
    <circle cx="900" cy="400" r="50" fill="${ac2}" opacity=".03"/>
  `),

  'gothic-masquerade': (bg, ac, ac2) => svg(bg, `
    <ellipse cx="600" cy="350" rx="150" ry="80" fill="none" stroke="${ac}" stroke-width="2.5" opacity=".18"/>
    <ellipse cx="600" cy="350" rx="120" ry="60" fill="${ac}" opacity=".04"/>
    <circle cx="530" cy="340" r="25" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".15"/>
    <circle cx="670" cy="340" r="25" fill="none" stroke="${ac}" stroke-width="1.5" opacity=".15"/>
    <path d="M460 320q-60-120-30-200" fill="none" stroke="${ac2}" stroke-width="1.5" opacity=".12"/>
    <path d="M740 320q60-120 30-200" fill="none" stroke="${ac2}" stroke-width="1.5" opacity=".12"/>
    <path d="M500 400q100 40 200 0" fill="none" stroke="${ac}" stroke-width="1" opacity=".1"/>
  `),

  'maximalist-fun-house': (bg, ac, ac2) => svg(bg, `
    <path d="M200 700l400-450 400 450" fill="none" stroke="${ac}" stroke-width="3" opacity=".15"/>
    <path d="M300 700l300-350 300 350" fill="none" stroke="${ac2}" stroke-width="2" opacity=".1"/>
    ${[250,370,490,610,730].map((x,i) => `<path d="M${x} 350l20 35-40 0z" fill="${['#FF4444','#FFB800','#4444FF','#40C040',ac][i]}" opacity=".12"/>`).join('')}
    <line x1="600" y1="0" x2="600" y2="250" stroke="${ac}" stroke-width="1" opacity=".08"/>
    <circle cx="600" cy="250" r="15" fill="${ac}" opacity=".06"/>
    ${[150,400,650,900,1050].map((x,i) => `<circle cx="${x}" cy="${600+(i*20)%100}" r="${8+i%5}" fill="${['#FF4444','#FFB800','#4444FF','#40C040',ac][i]}" opacity=".08"/>`).join('')}
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
