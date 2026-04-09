import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// ─────────────────────────────────────────────────────────────
// Pearloom / api/generate-pattern/route.ts
// Generates bespoke SVG background art for a couple using
// gemini-3.1-flash-lite-preview — the most capable Gemini model available
// as of March 2026 (Pro-level quality, Flash speed).
//
// Uses the same raw REST API pattern as memory-engine.ts to avoid
// npm SDK dependency issues.
// ─────────────────────────────────────────────────────────────

// gemini-3.1-flash-lite-preview: Pro-level intelligence at Flash speed.
// gemini-3.1-flash-lite-preview: faster/cheaper but less capable (lightweight tasks only).
// We use the full 3-flash-preview for creative SVG generation.
const MODEL = 'gemini-3.1-flash-image-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_INSTRUCTION = `You are a world-class SVG editorial illustrator creating BOLD, PROMINENT background art for luxury wedding websites. This art must be visually striking and immediately noticeable — NOT subtle watermarks.

RULES:
1. Output ONLY valid SVG code — no markdown, no explanations, no \`\`\` fences, no XML declaration.
2. The SVG must start with <svg and end with </svg>.
3. Use viewBox="0 0 800 600". Width and height attributes are optional.
4. Use ONLY the exact accent color provided. You may use it at varying opacities.
5. Use a BOLD opacity range: large background shapes at 0.06-0.12, main illustrated elements at 0.15-0.30, fine details and outlines at 0.08-0.18. Make it VISIBLE and STRIKING.
6. FILL THE ENTIRE CANVAS richly — no empty corners, no sparse placement. Compose like a magazine editorial illustration.
7. The art must be UNIQUE to this couple — reference their place, story, or vibe in the shapes you draw.
8. Create LARGE FEATURED ELEMENTS (200px+ in size) as anchors, then layer medium and small details around them:
   - Greece/Mediterranean: massive amphora (300px tall) with olive branch garlands, geometric meander borders, laurel wreath crowning the scene
   - Japan/Zen: full cherry blossom tree branch spanning the canvas, falling petals, ink-brush mountain silhouettes behind, koi fish details
   - Tuscany/Italy: sweeping vineyard hillscape with cypress tree row, large Roman arch as focal point, olive branch clusters
   - Paris/France: Art Nouveau frame with large floral corner flourishes, Haussmann roofline silhouette, intricate ironwork patterns
   - Beach/Coastal: large palm fronds arching from corners, oversized seashell spiral as centerpiece, wave pattern field, coral clusters
   - Forest/Mountains: dramatic mountain range silhouette spanning width, layered pine forest foreground, constellation above
   - Celestial/Dreamy: large crescent moon with star cluster radiating from it, constellation maps, wispy nebula cloud paths
   - Art Deco: bold sunburst radiating from center (200px radius rays), stepped geometric border, geometric fan motifs in corners
   - Garden/Botanical: full botanical illustration with large flower heads (roses/peonies), flowing stems and leaves composing a border frame
   - Romantic: large rose bouquet silhouette, ribbon swags connecting corners, heart motifs integrated into organic shapes
9. Use ORGANIC CUSTOM SHAPES with clipPath, complex polygon paths, and irregular bezier curves — not just simple circles and rectangles.
10. Include 20-35 distinct visual elements. Layer them: large base shapes → medium illustrated elements → small accent details.
11. Create a cohesive COMPOSITION — the eye should travel through the piece. Use asymmetry and tension.
12. The result must look like it belongs in Vogue or a luxury fashion magazine — dramatic, editorial, unforgettable.`;

function buildPrompt(params: {
  names: string[];
  vibeString: string;
  place: string;
  accent: string;
  bg: string;
  style: string;
}) {
  return `Create a unique background SVG illustration for a wedding website.

Couple: ${params.names.join(' & ')}
Their vibe / aesthetic: ${params.vibeString}
Favorite place or inspiration: ${params.place || 'not specified — derive inspiration from their vibe'}
Art direction: ${params.style}
Accent color to use (ONLY this): ${params.accent}
Background color (for reference, do not paint background): ${params.bg}

Create a BOLD, EDITORIAL illustration that would look at home in Vogue or a luxury print magazine. Make it VISUALLY STRIKING — large anchor elements (200-300px), rich layering, filling the full 800x600 canvas with artful composition. This must be immediately noticeable and beautiful, not a subtle watermark.

Output ONLY the raw <svg>...</svg> markup. Nothing else.`;
}

function extractSvg(raw: string): string | null {
  // Find complete SVG block
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  if (match) return match[0];

  // Strip code fences and retry
  const stripped = raw
    .replace(/```(?:svg|xml|html)?\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  if (stripped.startsWith('<svg') && stripped.includes('</svg>')) {
    const m2 = stripped.match(/<svg[\s\S]*?<\/svg>/i);
    return m2 ? m2[0] : null;
  }
  return null;
}

function isValidSvg(svg: string): boolean {
  return (
    svg.startsWith('<svg') &&
    svg.endsWith('</svg>') &&
    svg.length > 300 &&
    svg.includes('viewBox')
  );
}

// Theme-specific prominent fallback SVG
function buildFallbackSvg(accent: string, vibeString: string, place: string): string {
  const text = (vibeString + place).toLowerCase();

  // Detect theme
  const isJapan = /japan|japanese|kyoto|cherry|zen|sakura|blossom/.test(text);
  const isBeach = /beach|coastal|ocean|sea|tropical|hawaii|bali|maldive/.test(text);
  const isDeco = /deco|geometric|modern|minimalist|gatsby|twenties/.test(text);
  const isCelestial = /celestial|star|moon|galaxy|cosmic|night|mystic/.test(text);
  const isBotanical = /garden|botanical|floral|flower|rose|bloom|greenery|forest/.test(text);

  const a = accent;

  if (isJapan) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- Cherry blossom branch spanning canvas -->
  <path d="M-20,580 C100,480 200,350 350,200 C450,100 550,80 700,20" fill="none" stroke="${a}" stroke-width="3" opacity="0.22" stroke-linecap="round"/>
  <path d="M350,200 C320,160 280,140 250,120" fill="none" stroke="${a}" stroke-width="2" opacity="0.18" stroke-linecap="round"/>
  <path d="M350,200 C380,150 420,130 460,110" fill="none" stroke="${a}" stroke-width="2" opacity="0.18" stroke-linecap="round"/>
  <path d="M500,140 C530,110 560,100 590,90" fill="none" stroke="${a}" stroke-width="1.5" opacity="0.15" stroke-linecap="round"/>
  <!-- Blossom clusters -->
  ${[
    [250,120],[460,110],[590,90],[320,160],[420,140],[540,110],[380,240],[300,300],[200,380]
  ].map(([cx,cy],i) => `
  <circle cx="${cx}" cy="${cy}" r="18" fill="${a}" opacity="0.14"/>
  <circle cx="${cx-10}" cy="${cy+8}" r="12" fill="${a}" opacity="0.18"/>
  <circle cx="${cx+12}" cy="${cy-6}" r="10" fill="${a}" opacity="0.16"/>
  <circle cx="${cx+4}" cy="${cy+14}" r="8" fill="${a}" opacity="0.20"/>
  <circle cx="${cx-8}" cy="${cy-12}" r="7" fill="${a}" opacity="0.12"/>
  <circle cx="${cx}" cy="${cy}" r="3" fill="${a}" opacity="0.30"/>
  `).join('')}
  <!-- Mountain silhouette -->
  <path d="M0,600 L0,420 L120,280 L240,380 L360,220 L480,340 L600,200 L720,310 L800,260 L800,600 Z" fill="${a}" opacity="0.05"/>
  <!-- Scatter petals -->
  ${Array.from({length:20}, (_,i) => `<ellipse cx="${60+i*36}" cy="${150+Math.sin(i)*180}" rx="5" ry="8" fill="${a}" opacity="${(0.10+i%4*0.03).toFixed(2)}" transform="rotate(${i*23} ${60+i*36} ${150+Math.sin(i)*180})"/>`).join('\n  ')}
</svg>`;
  }

  if (isBeach) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- Large palm fronds from top-right -->
  <path d="M800,0 C700,80 600,60 500,150" fill="none" stroke="${a}" stroke-width="3" opacity="0.20" stroke-linecap="round"/>
  <path d="M800,0 C740,100 680,100 600,200" fill="none" stroke="${a}" stroke-width="2.5" opacity="0.18" stroke-linecap="round"/>
  <path d="M800,0 C780,120 760,140 700,250" fill="none" stroke="${a}" stroke-width="2" opacity="0.15" stroke-linecap="round"/>
  <!-- Frond leaves -->
  ${[
    [500,150,0],[600,200,15],[700,250,30],[560,120,-10],[640,170,20],[720,220,35]
  ].map(([x,y,r]) => `<ellipse cx="${x}" cy="${y}" rx="55" ry="18" fill="${a}" opacity="0.12" transform="rotate(${r} ${x} ${y})"/>
  <path d="M${x-40},${y} Q${x},${y-25} ${x+40},${y}" fill="${a}" opacity="0.08"/>`).join('\n  ')}
  <!-- Large seashell spiral centerpiece -->
  <path d="M400,400 C440,370 460,340 450,310 C440,280 410,270 390,285 C370,300 375,330 395,340 C415,350 430,335 425,315 C420,295 405,290 397,300 C389,310 392,325 400,330" fill="none" stroke="${a}" stroke-width="2.5" opacity="0.22" stroke-linecap="round"/>
  <!-- Wave fields -->
  ${Array.from({length:8}, (_,i) => `<path d="M0,${380+i*25} C200,${370+i*25} 400,${390+i*25} 600,${375+i*25} C700,${368+i*25} 750,${380+i*25} 800,${372+i*25}" fill="none" stroke="${a}" stroke-width="1" opacity="${(0.08+i*0.01).toFixed(2)}"/>`).join('\n  ')}
  <!-- Coral clusters bottom-left -->
  <path d="M80,580 C80,540 70,510 60,490 M80,540 C90,520 100,510 110,500 M80,540 C65,520 55,508 48,495 M60,490 C50,475 45,462 42,448 M60,490 C68,475 75,462 78,448" fill="none" stroke="${a}" stroke-width="2" opacity="0.18" stroke-linecap="round"/>
  <!-- Starfish -->
  ${[
    [150,520],[680,540],[300,560]
  ].map(([cx,cy]) => Array.from({length:5}, (_,i) => {
    const angle = i*72-90; const rad = angle*Math.PI/180;
    return `<line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(rad)*22}" y2="${cy+Math.sin(rad)*22}" stroke="${a}" stroke-width="3" opacity="0.16" stroke-linecap="round"/>`;
  }).join('\n  ')).join('\n  ')}
</svg>`;
  }

  if (isDeco) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- Central sunburst radiating from center -->
  ${Array.from({length:24}, (_,i) => {
    const angle = i*15; const rad = angle*Math.PI/180;
    const x2 = 400 + Math.cos(rad)*320; const y2 = 300 + Math.sin(rad)*260;
    return `<line x1="400" y1="300" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${a}" stroke-width="${i%3===0?1.5:0.8}" opacity="${i%3===0?0.16:0.09}"/>`;
  }).join('\n  ')}
  <!-- Concentric geometric rings -->
  <circle cx="400" cy="300" r="60" fill="none" stroke="${a}" stroke-width="1.5" opacity="0.18"/>
  <circle cx="400" cy="300" r="120" fill="none" stroke="${a}" stroke-width="1" opacity="0.14"/>
  <circle cx="400" cy="300" r="180" fill="none" stroke="${a}" stroke-width="1" opacity="0.10"/>
  <!-- Corner fan bursts -->
  ${[[0,0],[800,0],[0,600],[800,600]].map(([cx,cy]) => Array.from({length:7}, (_,i) => {
    const startAngle = (cx===0 ? (cy===0 ? 0 : -90) : (cy===0 ? 90 : 180));
    const angle = startAngle + i*12; const rad = angle*Math.PI/180;
    return `<line x1="${cx}" y1="${cy}" x2="${cx+(cx===0?1:-1)*Math.cos(rad)*160}" y2="${cy+(cy===0?1:-1)*Math.sin(rad)*130}" stroke="${a}" stroke-width="${i===3?1.5:0.8}" opacity="${(0.08+i*0.015).toFixed(2)}"/>`;
  }).join('\n  ')).join('\n  ')}
  <!-- Stepped arch border top -->
  <path d="M200,0 L200,40 L160,40 L160,80 L120,80 L120,40 L80,40 L80,0" fill="none" stroke="${a}" stroke-width="1.5" opacity="0.15"/>
  <path d="M600,0 L600,40 L640,40 L640,80 L680,80 L680,40 L720,40 L720,0" fill="none" stroke="${a}" stroke-width="1.5" opacity="0.15"/>
  <!-- Diamond grid -->
  ${Array.from({length:6}, (_,i) => Array.from({length:5}, (_,j) => {
    const cx = 100+i*120; const cy = 100+j*120;
    return `<path d="M${cx},${cy-15} L${cx+12},${cy} L${cx},${cy+15} L${cx-12},${cy} Z" fill="none" stroke="${a}" stroke-width="0.8" opacity="0.12"/>`;
  }).join('\n  ')).join('\n  ')}
</svg>`;
  }

  if (isCelestial) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- Large crescent moon -->
  <path d="M580,80 C560,60 530,55 505,65 C475,78 462,108 468,135 C475,165 500,185 528,185 C555,185 578,170 590,148 C570,155 548,152 532,140 C516,128 510,108 516,90 C522,72 540,63 558,66 Z" fill="${a}" opacity="0.20"/>
  <!-- Star cluster radiating from moon -->
  ${Array.from({length:30}, (_,i) => {
    const angle = i*12; const rad = angle*Math.PI/180;
    const dist = 80 + (i%5)*60;
    const cx = 548 + Math.cos(rad)*dist; const cy = 125 + Math.sin(rad)*dist*0.7;
    const size = i%7===0 ? 4 : i%3===0 ? 2.5 : 1.5;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${size}" fill="${a}" opacity="${(0.15+i%4*0.05).toFixed(2)}"/>`;
  }).join('\n  ')}
  <!-- Constellation lines -->
  <line x1="200" y1="150" x2="280" y2="120" stroke="${a}" stroke-width="0.8" opacity="0.12"/>
  <line x1="280" y1="120" x2="330" y2="180" stroke="${a}" stroke-width="0.8" opacity="0.12"/>
  <line x1="330" y1="180" x2="250" y2="200" stroke="${a}" stroke-width="0.8" opacity="0.12"/>
  <line x1="250" y1="200" x2="200" y2="150" stroke="${a}" stroke-width="0.8" opacity="0.12"/>
  <line x1="100" y1="300" x2="160" y2="260" stroke="${a}" stroke-width="0.8" opacity="0.10"/>
  <line x1="160" y1="260" x2="220" y2="290" stroke="${a}" stroke-width="0.8" opacity="0.10"/>
  ${[[200,150],[280,120],[330,180],[250,200],[100,300],[160,260],[220,290],[400,80],[450,100],[420,140],[350,50],[600,350],[650,320],[700,360]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${a}" opacity="0.22"/>`).join('\n  ')}
  <!-- Wispy nebula clouds -->
  <path d="M0,400 C100,380 200,420 300,395 C400,370 500,410 600,390 C700,370 750,405 800,385" fill="none" stroke="${a}" stroke-width="40" opacity="0.04" stroke-linecap="round"/>
  <path d="M0,450 C150,430 300,465 450,440 C600,415 700,455 800,435" fill="none" stroke="${a}" stroke-width="30" opacity="0.05" stroke-linecap="round"/>
  <!-- Scatter stars -->
  ${Array.from({length:40}, (_,i) => `<circle cx="${20+i*20}" cy="${20+(i*37)%560}" r="${i%5===0?2:1}" fill="${a}" opacity="${(0.10+i%6*0.03).toFixed(2)}"/>`).join('\n  ')}
</svg>`;
  }

  // Default: lush botanical garden
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- Large botanical frame: sweeping stems from corners -->
  <path d="M0,600 C40,500 80,420 120,340 C160,260 200,200 260,150 C310,108 370,90 420,80" fill="none" stroke="${a}" stroke-width="2.5" opacity="0.20" stroke-linecap="round"/>
  <path d="M800,600 C760,500 720,420 680,340 C640,260 600,200 540,150 C490,108 430,90 380,80" fill="none" stroke="${a}" stroke-width="2.5" opacity="0.20" stroke-linecap="round"/>
  <!-- Branch offshoots -->
  <path d="M180,380 C200,350 220,330 250,320" fill="none" stroke="${a}" stroke-width="1.8" opacity="0.16" stroke-linecap="round"/>
  <path d="M240,280 C265,255 290,245 320,240" fill="none" stroke="${a}" stroke-width="1.8" opacity="0.16" stroke-linecap="round"/>
  <path d="M620,380 C600,350 580,330 550,320" fill="none" stroke="${a}" stroke-width="1.8" opacity="0.16" stroke-linecap="round"/>
  <path d="M560,280 C535,255 510,245 480,240" fill="none" stroke="${a}" stroke-width="1.8" opacity="0.16" stroke-linecap="round"/>
  <!-- Large flower heads on branches -->
  ${[
    [250,320],[320,240],[420,80],[380,80],[550,320],[480,240]
  ].map(([cx,cy]) => `
  <!-- Flower petals -->
  ${Array.from({length:6}, (_,p) => {
    const angle = p*60; const rad = angle*Math.PI/180;
    const px = cx + Math.cos(rad)*20; const py = cy + Math.sin(rad)*20;
    return `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="12" ry="7" fill="${a}" opacity="0.16" transform="rotate(${angle} ${px.toFixed(1)} ${py.toFixed(1)})"/>`;
  }).join('\n  ')}
  <circle cx="${cx}" cy="${cy}" r="8" fill="${a}" opacity="0.24"/>
  `).join('')}
  <!-- Leaf clusters along stems -->
  ${[
    [120,340,-30],[160,280,-20],[200,220,-10],[680,340,30],[640,280,20],[600,220,10]
  ].map(([x,y,r]) => `<path d="M${x},${y} Q${x+(r>0?25:-25)},${y-25} ${x+(r>0?40:-40)},${y-10} Q${x+(r>0?20:-20)},${y+5} ${x},${y} Z" fill="${a}" opacity="0.14" transform="rotate(${r} ${x} ${y})"/>`).join('\n  ')}
  <!-- Tiny scattered seed dots -->
  ${Array.from({length:25}, (_,i) => `<circle cx="${60+i*28}" cy="${80+(i*53)%440}" r="${i%4===0?3:1.5}" fill="${a}" opacity="${(0.10+i%5*0.03).toFixed(2)}"/>`).join('\n  ')}
  <!-- Top arch of vines -->
  <path d="M200,0 C250,40 310,55 400,50 C490,55 550,40 600,0" fill="none" stroke="${a}" stroke-width="1.5" opacity="0.14"/>
</svg>`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`generate-pattern:${ip}`, { max: 10, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  try {
    const { names, vibeString, place, accent, bg, style } = await req.json();

    if (!accent) {
      return NextResponse.json({ error: 'accent color required' }, { status: 400 });
    }

    const prompt = buildPrompt({
      names: Array.isArray(names) ? names : ['the couple'],
      vibeString: vibeString || 'romantic and timeless',
      place: place || '',
      accent,
      bg: bg || '#F5F1E8',
      style: style || 'elegant botanical',
    });

    const requestBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        temperature: 1.2,   // High creativity for unique art
        topP: 0.95,
        maxOutputTokens: 8192,
        // No responseMimeType — we want raw text (SVG is text)
      },
    };

    const res = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[generate-pattern] Gemini API error:', res.status, errText);

      // If model not available, fall through to fallback
      if (res.status === 404 || res.status === 400) {
        const fallback = buildFallbackSvg(accent, vibeString || '', place || '');
        return NextResponse.json({ svg: fallback, fallback: true });
      }

      throw new Error(`Gemini API error ${res.status}`);
    }

    const data = await res.json();
    const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!rawText) {
      const fallback = buildFallbackSvg(accent, vibeString || '', place || '');
      return NextResponse.json({ svg: fallback, fallback: true });
    }

    const svg = extractSvg(rawText);

    if (!svg || !isValidSvg(svg)) {
      console.warn('[generate-pattern] SVG extraction failed, using fallback. Raw:', rawText.slice(0, 200));
      const fallback = buildFallbackSvg(accent, vibeString || '', place || '');
      return NextResponse.json({ svg: fallback, fallback: true });
    }

    return NextResponse.json({ svg });

  } catch (err) {
    console.error('[generate-pattern] Unexpected error:', err);
    // Always return something
    const body = await req.json().catch(() => ({}));
    const fallback = buildFallbackSvg(
      (body as { accent?: string }).accent || '#A3B18A',
      (body as { vibeString?: string }).vibeString || '',
      (body as { place?: string }).place || ''
    );
    return NextResponse.json({ svg: fallback, fallback: true });
  }
}
