import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Parse hex → [r, g, b] (0–255)
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const n = parseInt(full.slice(0, 6), 16);
  if (isNaN(n)) return [43, 37, 32];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Darken a hex color for cinematic background
function darkenForHero(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.round(r * 0.13)}, ${Math.round(g * 0.11)}, ${Math.round(b * 0.10)})`;
}

const OCCASION_TAG: Record<string, string> = {
  birthday:    'celebrating',
  wedding:     'forever begins',
  anniversary: 'still us',
  engagement:  'she said yes',
  story:       'our story',
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const n1       = (searchParams.get('n1') || 'Celebrating').slice(0, 36);
  const n2       = (searchParams.get('n2') || '').slice(0, 36);
  const occasion = searchParams.get('occasion') || 'birthday';
  const accent   = searchParams.get('accent') || '#5C6B3F';
  const bg       = searchParams.get('bg') || '#F5F1E8';

  // Deep cinematic background derived from site bg color
  const darkBg = darkenForHero(bg);

  // Names to display
  const names = [n1, ...(n2 && n2 !== n1 ? [n2] : [])];
  const isOne = names.length === 1;

  // Adaptive font size — shorter name = bigger type
  const len0 = names[0]?.length || 8;
  const fontSize = isOne
    ? (len0 <= 5 ? 260 : len0 <= 7 ? 210 : len0 <= 10 ? 165 : 130)
    : (len0 <= 6 ? 165 : len0 <= 9 ? 135 : 110);

  const tag = OCCASION_TAG[occasion] || 'celebrating';

  // Load Playfair Display Italic — cached at edge, non-fatal fallback
  let font: ArrayBuffer | null = null;
  try {
    const res = await fetch(
      'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDYbtY.woff'
    );
    if (res.ok) font = await res.arrayBuffer();
  } catch { /* use system serif if unavailable */ }

  const serif = font ? 'Playfair Display' : 'Georgia';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1440px',
          height: '960px',
          background: darkBg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Accent glow — top-left */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: '680px', height: '680px', borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}2a 0%, transparent 68%)`,
          display: 'flex',
        }} />
        {/* Accent glow — bottom-right */}
        <div style={{
          position: 'absolute', bottom: '-100px', right: '-60px',
          width: '560px', height: '560px', borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}1e 0%, transparent 68%)`,
          display: 'flex',
        }} />

        {/* Dot-grid texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.35,
          backgroundImage: `radial-gradient(circle, ${accent}30 1px, transparent 1px)`,
          backgroundSize: '52px 52px',
          display: 'flex',
        }} />

        {/* Ghost name watermark */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <span style={{
            fontFamily: serif,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: '640px',
            color: accent,
            opacity: 0.035,
            letterSpacing: '-0.06em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            display: 'flex',
          }}>
            {names[0]}
          </span>
        </div>

        {/* ── Top ornament ── */}
        <div style={{
          position: 'absolute', top: '72px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '18px',
          }}>
            <div style={{ width: '90px', height: '1px', background: accent, opacity: 0.28, display: 'flex' }} />
            <span style={{ color: accent, fontSize: '16px', opacity: 0.55, display: 'flex', fontFamily: serif }}>✦</span>
            <div style={{ width: '90px', height: '1px', background: accent, opacity: 0.28, display: 'flex' }} />
          </div>
          <span style={{
            fontFamily: serif,
            fontStyle: 'normal',
            fontSize: '11px',
            letterSpacing: '0.52em',
            textTransform: 'uppercase',
            color: accent,
            opacity: 0.6,
            display: 'flex',
          }}>
            {tag}
          </span>
        </div>

        {/* ── Names ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          position: 'relative',
          zIndex: 10,
        }}>
          {names.map((name, i) => (
            <span
              key={i}
              style={{
                fontFamily: serif,
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: `${fontSize}px`,
                color: '#F5EFE6',
                lineHeight: 0.88,
                letterSpacing: '-0.025em',
                display: 'flex',
              }}
            >
              {name}
            </span>
          ))}

          {/* Ampersand separator for two names */}
          {!isOne && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '24px',
              marginTop: '10px',
            }}>
              <div style={{ width: '72px', height: '1px', background: accent, opacity: 0.4, display: 'flex' }} />
              <span style={{
                fontFamily: serif, fontStyle: 'italic',
                fontSize: '22px', color: accent, opacity: 0.85,
                letterSpacing: '0.04em', display: 'flex',
              }}>
                &amp;
              </span>
              <div style={{ width: '72px', height: '1px', background: accent, opacity: 0.4, display: 'flex' }} />
            </div>
          )}
        </div>

        {/* ── Bottom mark ── */}
        <div style={{
          position: 'absolute', bottom: '72px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ width: '56px', height: '1px', background: accent, opacity: 0.22, display: 'flex' }} />
          <span style={{
            fontFamily: serif,
            fontSize: '9px',
            letterSpacing: '0.52em',
            textTransform: 'uppercase',
            color: accent,
            opacity: 0.42,
            display: 'flex',
          }}>
            pearloom
          </span>
          <div style={{ width: '56px', height: '1px', background: accent, opacity: 0.22, display: 'flex' }} />
        </div>
      </div>
    ),
    {
      width: 1440,
      height: 960,
      fonts: font
        ? [{ name: 'Playfair Display', data: font, style: 'italic', weight: 400 }]
        : [],
    }
  );
}
