import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Trusted photo hosts (SSRF prevention)
const ALLOWED_PHOTO_HOSTS = [
  'lh3.googleusercontent.com',
  'googleusercontent.com',
  'supabase.co',
  'r2.cloudflarestorage.com',
  'pearloom.com',
];
function isTrustedPhotoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'https:') return false;
    return ALLOWED_PHOTO_HOSTS.some(
      h => hostname === h || hostname.endsWith('.' + h) || hostname.startsWith('pub-')
    );
  } catch {
    return false;
  }
}

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

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const { searchParams } = req.nextUrl;

  const name1   = (searchParams.get('n1')    || 'Together').slice(0, 60);
  const name2   = (searchParams.get('n2')    || 'Forever').slice(0, 60);
  const date    = (searchParams.get('date')  || '').slice(0, 30);
  const tagline = (searchParams.get('tag')   || 'A love story beautifully told.').slice(0, 120);
  const bg      = searchParams.get('bg')     || 'var(--pl-ink-soft)';
  const accent  = searchParams.get('accent') || '#A3B18A';

  // Resolve relative /api/img/ URLs to absolute so external crawlers can fetch them
  const rawPhoto = searchParams.get('photo') || '';
  const resolvedPhoto = rawPhoto.startsWith('/') ? `${origin}${rawPhoto}` : rawPhoto;
  const photo = isTrustedPhotoUrl(resolvedPhoto) ? resolvedPhoto : '';

  // Adaptive text colours — dark text on light backgrounds, white on dark
  const lum    = luminance(bg);
  const isLight = lum > 0.35;
  const textPrimary   = isLight ? '#1a1816'               : '#ffffff';
  const textSecondary = isLight ? 'rgba(30,25,20,0.6)'    : 'rgba(255,255,255,0.62)';
  const textMuted     = isLight ? 'rgba(30,25,20,0.32)'   : 'rgba(255,255,255,0.32)';
  const overlayBg     = isLight
    ? `linear-gradient(108deg, ${bg}ff 0%, ${bg}f8 52%, ${bg}d0 72%, transparent 100%)`
    : `linear-gradient(108deg, ${bg}ff 0%, ${bg}f0 52%, ${bg}b0 72%, transparent 100%)`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          position: 'relative',
          display: 'flex',
          background: bg,
          overflow: 'hidden',
        }}
      >
        {/* Right: photo panel (55% width, full height) */}
        {photo && (
          <img
            src={photo}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: '55%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              opacity: isLight ? 0.92 : 0.88,
            }}
          />
        )}

        {/* Gradient overlay — fades photo into background on the left */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: overlayBg,
            display: 'flex',
          }}
        />

        {/* Left accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '5px',
            background: accent,
            display: 'flex',
          }}
        />

        {/* Watermark thread curves (bottom-left) */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '54px',
            opacity: 0.08,
            display: 'flex',
          }}
        >
          <svg viewBox="0 0 160 60" width="160" height="60">
            <path
              d="M 8 42 C 8 18, 44 12, 80 30 C 116 48, 152 42, 152 18"
              stroke={accent}
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d="M 8 18 C 8 42, 44 48, 80 30 C 116 12, 152 18, 152 42"
              stroke={accent}
              strokeWidth="2.5"
              fill="none"
              opacity="0.5"
            />
          </svg>
        </div>

        {/* Content column */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 82px',
            width: photo ? '640px' : '100%',
            height: '100%',
            gap: '0px',
          }}
        >
          {/* Pearloom brand */}
          <div
            style={{
              fontSize: '11px',
              letterSpacing: '0.46em',
              textTransform: 'uppercase',
              color: accent,
              fontWeight: 700,
              marginBottom: '44px',
              display: 'flex',
            }}
          >
            ✦ PEARLOOM
          </div>

          {/* Names */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              lineHeight: 0.88,
              letterSpacing: '-0.025em',
            }}
          >
            <span
              style={{
                fontSize: '90px',
                fontWeight: 400,
                color: textPrimary,
                display: 'flex',
              }}
            >
              {name1}
            </span>
            <span
              style={{
                color: accent,
                fontSize: '50px',
                margin: '0',
                display: 'flex',
                fontWeight: 300,
              }}
            >
              &amp;
            </span>
            <span
              style={{
                fontSize: '90px',
                fontWeight: 400,
                color: textPrimary,
                display: 'flex',
              }}
            >
              {name2}
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: '46px',
              height: '2px',
              background: accent,
              margin: '28px 0',
              display: 'flex',
              opacity: 0.7,
            }}
          />

          {/* Tagline */}
          <div
            style={{
              fontSize: '20px',
              color: textSecondary,
              fontStyle: 'italic',
              fontWeight: 300,
              maxWidth: '460px',
              lineHeight: 1.45,
              display: 'flex',
            }}
          >
            {tagline}
          </div>

          {/* Date */}
          {date && (
            <div
              style={{
                marginTop: '20px',
                fontSize: '13px',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: textMuted,
                fontWeight: 600,
                display: 'flex',
              }}
            >
              {date}
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
