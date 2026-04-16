import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Parse hex → [r, g, b] (0–255)
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const n = parseInt(full.slice(0, 6), 16);
  if (isNaN(n)) return [43, 43, 43];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// WCAG relative luminance (0 = black, 1 = white)
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Try to load a Google Font as ArrayBuffer for Satori rendering */
async function loadGoogleFont(family: string, weight = 400): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
    const cssRes = await fetch(cssUrl, {
      headers: {
        // Request woff format — lighter and supported by Satori
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      },
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    // Extract the first src url from the CSS
    const match = css.match(/src:\s*url\(([^)]+)\)/);
    if (!match?.[1]) return null;
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

/** Format a date string into a nice display format */
function formatDate(raw: string): string {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return raw;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // ── Parse params (support both legacy and new param names) ────────────
  // New format: ?names=Name1,Name2   Legacy: ?n1=Name1&n2=Name2
  const namesParam = searchParams.get('names');
  let name1: string;
  let name2: string;
  if (namesParam) {
    const parts = namesParam.split(',');
    name1 = (parts[0] || 'Together').trim().slice(0, 60);
    name2 = (parts[1] || 'Forever').trim().slice(0, 60);
  } else {
    name1 = (searchParams.get('n1') || 'Together').slice(0, 60);
    name2 = (searchParams.get('n2') || 'Forever').slice(0, 60);
  }

  const occasion = (searchParams.get('occasion') || 'wedding').slice(0, 30);
  const rawDate  = (searchParams.get('date') || '').slice(0, 30);
  const tagline  = (searchParams.get('tagline') || searchParams.get('tag') || '').slice(0, 120);
  const bgRaw    = searchParams.get('bg') || 'F5F1E8';
  const fgRaw    = searchParams.get('fg') || '';
  const accentRaw = searchParams.get('accent') || 'A3B18A';
  const headingFont = (searchParams.get('heading') || 'Playfair Display').slice(0, 60);
  const symbol   = (searchParams.get('symbol') || '✦').slice(0, 4);
  // Couple photo (cover image). Allowed protocols: https only.
  const photoRaw = searchParams.get('photo') || '';
  const photoUrl = photoRaw.startsWith('https://') ? photoRaw.slice(0, 1024) : '';

  // Normalize colors — ensure they have # prefix
  const bg     = bgRaw.startsWith('#') ? bgRaw : `#${bgRaw}`;
  const accent = accentRaw.startsWith('#') ? accentRaw : `#${accentRaw}`;

  // Derive fg from bg luminance if not provided
  const lum = luminance(bg);
  const isLight = lum > 0.35;
  const fg = fgRaw
    ? (fgRaw.startsWith('#') ? fgRaw : `#${fgRaw}`)
    : (isLight ? '#1a1816' : '#ffffff');

  const textSecondary = isLight ? 'rgba(30,25,20,0.55)' : 'rgba(255,255,255,0.58)';
  const textMuted     = isLight ? 'rgba(30,25,20,0.30)' : 'rgba(255,255,255,0.30)';

  // Format occasion label nicely
  const occasionLabels: Record<string, string> = {
    wedding: 'WEDDING', anniversary: 'ANNIVERSARY',
    birthday: 'BIRTHDAY', engagement: 'ENGAGEMENT', story: 'OUR STORY',
  };
  const occasionLabel = occasionLabels[occasion.toLowerCase()] || occasion.toUpperCase();

  // Format date
  const displayDate = formatDate(rawDate);

  // ── Load heading font from Google Fonts ──────────────────────────────
  const fonts: { name: string; data: ArrayBuffer; weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900; style: 'normal' | 'italic' }[] = [];
  const [headingRegular, headingItalic] = await Promise.all([
    loadGoogleFont(headingFont, 400),
    loadGoogleFont(headingFont, 400), // italic fallback — we'll style via CSS
  ]);
  if (headingRegular) {
    fonts.push({ name: headingFont, data: headingRegular, weight: 400, style: 'normal' });
  }
  if (headingItalic) {
    fonts.push({ name: headingFont, data: headingItalic, weight: 400, style: 'italic' });
  }

  // Accent color with reduced opacity for frame/border
  const [ar, ag, ab] = hexToRgb(accent);
  const accentFaded = `rgba(${ar},${ag},${ab},0.25)`;
  const accentMedium = `rgba(${ar},${ag},${ab},0.50)`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Couple photo as soft full-bleed background — preserves the
            invitation feel by sitting behind a tinted overlay. */}
        {photoUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt=""
              width={1200}
              height={630}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.85,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: isLight
                  ? `linear-gradient(180deg, ${bg}d0 0%, ${bg}c0 100%)`
                  : `linear-gradient(180deg, ${bg}c0 0%, ${bg}d8 100%)`,
                display: 'flex',
              }}
            />
          </>
        )}

        {/* Subtle accent-colored border/frame — inset */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            right: '20px',
            bottom: '20px',
            border: `1px solid ${accentFaded}`,
            display: 'flex',
          }}
        />
        {/* Inner frame — double border effect */}
        <div
          style={{
            position: 'absolute',
            top: '28px',
            left: '28px',
            right: '28px',
            bottom: '28px',
            border: `1px solid ${accentFaded}`,
            display: 'flex',
          }}
        />

        {/* Corner accent flourishes */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            width: '40px',
            height: '40px',
            borderTop: `2px solid ${accentMedium}`,
            borderLeft: `2px solid ${accentMedium}`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '40px',
            height: '40px',
            borderTop: `2px solid ${accentMedium}`,
            borderRight: `2px solid ${accentMedium}`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            width: '40px',
            height: '40px',
            borderBottom: `2px solid ${accentMedium}`,
            borderLeft: `2px solid ${accentMedium}`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            width: '40px',
            height: '40px',
            borderBottom: `2px solid ${accentMedium}`,
            borderRight: `2px solid ${accentMedium}`,
            display: 'flex',
          }}
        />

        {/* Main content — centered invitation card layout */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '60px 80px',
            width: '100%',
            height: '100%',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Decorative accent symbol at top */}
          <div
            style={{
              fontSize: '32px',
              color: accent,
              marginBottom: '20px',
              display: 'flex',
              opacity: 0.8,
            }}
          >
            {symbol}
          </div>

          {/* Occasion label — small uppercase tracked text */}
          <div
            style={{
              fontSize: '13px',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: textSecondary,
              fontWeight: 400,
              marginBottom: '28px',
              display: 'flex',
              fontFamily: headingRegular ? headingFont : 'serif',
            }}
          >
            {occasionLabel}
          </div>

          {/* Names in heading font — large, centered */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: 1.0,
              gap: '0px',
              fontFamily: headingRegular ? headingFont : 'serif',
            }}
          >
            <span
              style={{
                fontSize: '72px',
                fontWeight: 400,
                color: fg,
                display: 'flex',
              }}
            >
              {name1}
            </span>
            {/* "&" symbol in accent color */}
            <span
              style={{
                fontSize: '40px',
                color: accent,
                fontWeight: 400,
                fontStyle: 'italic',
                margin: '4px 0',
                display: 'flex',
              }}
            >
              &amp;
            </span>
            <span
              style={{
                fontSize: '72px',
                fontWeight: 400,
                color: fg,
                display: 'flex',
              }}
            >
              {name2}
            </span>
          </div>

          {/* Decorative divider */}
          <div
            style={{
              width: '50px',
              height: '1px',
              background: accent,
              margin: '24px 0',
              display: 'flex',
              opacity: 0.6,
            }}
          />

          {/* Date — formatted nicely */}
          {displayDate && (
            <div
              style={{
                fontSize: '15px',
                letterSpacing: '0.18em',
                color: textSecondary,
                fontWeight: 400,
                marginBottom: '12px',
                display: 'flex',
                fontFamily: headingRegular ? headingFont : 'serif',
              }}
            >
              {displayDate}
            </div>
          )}

          {/* Tagline — italic body font */}
          {tagline && (
            <div
              style={{
                fontSize: '18px',
                color: textSecondary,
                fontStyle: 'italic',
                fontWeight: 400,
                maxWidth: '500px',
                lineHeight: 1.5,
                marginTop: '8px',
                display: 'flex',
                textAlign: 'center',
                fontFamily: headingRegular ? headingFont : 'serif',
              }}
            >
              &ldquo;{tagline}&rdquo;
            </div>
          )}

          {/* Bottom branding */}
          <div
            style={{
              position: 'absolute',
              bottom: '36px',
              left: '0',
              right: '0',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: textMuted,
                fontWeight: 400,
                display: 'flex',
              }}
            >
              pearloom.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fonts.length > 0 ? fonts : undefined,
    }
  );
}
