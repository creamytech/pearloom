import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────
// Pearloom / api/generate-pattern/route.ts
// Generates bespoke SVG background art for a couple using
// gemini-3-flash-preview — the most capable Gemini model available
// as of March 2026 (Pro-level quality, Flash speed).
//
// Uses the same raw REST API pattern as memory-engine.ts to avoid
// npm SDK dependency issues.
// ─────────────────────────────────────────────────────────────

// gemini-3-flash-preview: Pro-level intelligence at Flash speed.
// gemini-3.1-flash-lite-preview: faster/cheaper but less capable (lightweight tasks only).
// We use the full 3-flash-preview for creative SVG generation.
const MODEL = 'gemini-3-flash-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_INSTRUCTION = `You are a world-class SVG artist and wedding designer. Your job is to create unique, beautiful, handcrafted SVG background art for wedding websites.

RULES:
1. Output ONLY valid SVG code — no markdown, no explanations, no \`\`\` fences, no XML declaration.
2. The SVG must start with <svg and end with </svg>.
3. Use viewBox="0 0 800 600". Width and height attributes are optional.
4. Use ONLY the exact accent color provided. Do not invent new colors or use hex values other than the accent.
5. All fills and strokes must use the accent color with LOW opacity (0.04 to 0.18 max) — subtle watermark effect.
6. The art must be UNIQUE to this couple — reference their place, story, or vibe in the shapes you draw.
7. Draw according to place/vibe:
   - Greece/Mediterranean: olive branches, amphora silhouettes, wave meanders, laurel wreaths, Ionic columns
   - Japan/Zen: cherry blossom branches with petals, koi silhouettes, ink-brush mountain lines, torii arches
   - Tuscany/Italy: cypress trees, vineyard rows, rolling hills, Roman arches, olive leaves
   - Paris/France: Eiffel tower silhouette, art nouveau curves, fleur-de-lis, Haussmann rooflines
   - Beach/Coastal: palm fronds, seashells, coral, gentle wave crests, starfish
   - Forest/Mountains: pine tree silhouettes, mountain peaks, river lines, ferns
   - Celestial/Dreamy: star clusters, constellations with connecting lines, crescent moons, wispy clouds
   - Art deco: geometric fan bursts, chevrons, sunburst rays, stepped arches
   - Garden/Botanical: pressed botanical illustration of leaves, stems, small flowers, vines
   - Romantic: roses with petals, ribbon swirls, heart motifs, script flourishes
8. Include 10-18 distinct visual elements spread thoughtfully across the 800x600 canvas.
9. Vary sizes, rotations, and positions — make it feel hand-crafted, not grid-like.
10. The result must look premium and artisanal — suitable for a luxury wedding brand.`;

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

Draw something truly original and specific to this couple. Reference the place and vibe in what you illustrate. Every element should feel intentional and handcrafted for them.

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

// Deterministic seed-based fallback SVG
function buildFallbackSvg(accent: string, vibeString: string, place: string): string {
  const text = (vibeString + place).toLowerCase();
  const seed = text.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  const rng = (min: number, max: number) => min + Math.abs((seed * 2654435761) % (max - min));

  const elements: string[] = [];

  // Organic blob shapes
  for (let i = 0; i < 6; i++) {
    const cx = rng(80 + i * 110, 120 + i * 110);
    const cy = rng(80 + (i % 3) * 160, 140 + (i % 3) * 160);
    const r = rng(30, 100);
    const opacity = 0.04 + (i % 4) * 0.025;
    elements.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}" opacity="${opacity.toFixed(2)}"/>`);
  }

  // Flowing path curves
  for (let i = 0; i < 4; i++) {
    const y = 100 + i * 130;
    const cp1x = rng(150, 350);
    const cp1y = y - rng(40, 80);
    const cp2x = rng(450, 650);
    const cp2y = y + rng(40, 80);
    elements.push(`<path d="M${rng(0, 100)} ${y} C${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${rng(700, 800)} ${y}" fill="none" stroke="${accent}" stroke-width="${(0.6 + i * 0.2).toFixed(1)}" opacity="${(0.08 + i * 0.02).toFixed(2)}"/>`);
  }

  // Dotted accent cluster
  for (let i = 0; i < 8; i++) {
    const x = rng(300 + i * 30, 340 + i * 30);
    const y = rng(200, 400);
    elements.push(`<circle cx="${x}" cy="${y}" r="${rng(1, 4)}" fill="${accent}" opacity="${(0.06 + (i % 3) * 0.03).toFixed(2)}"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  ${elements.join('\n  ')}
</svg>`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
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
      bg: bg || '#faf9f6',
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
        maxOutputTokens: 4096,
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
      (body as { accent?: string }).accent || '#b8926a',
      (body as { vibeString?: string }).vibeString || '',
      (body as { place?: string }).place || ''
    );
    return NextResponse.json({ svg: fallback, fallback: true });
  }
}
