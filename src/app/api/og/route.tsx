import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Only allow photos from trusted domains to prevent SSRF
const ALLOWED_PHOTO_HOSTS = [
  'lh3.googleusercontent.com',
  'googleusercontent.com',
  'supabase.co',
  'r2.cloudflarestorage.com',
  'pub-', // Cloudflare R2 public bucket pattern
];
function isTrustedPhotoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'https:') return false;
    return ALLOWED_PHOTO_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h) || hostname.startsWith('pub-'));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name1 = (searchParams.get('n1') || 'Together').slice(0, 60);
  const name2 = (searchParams.get('n2') || 'Forever').slice(0, 60);
  const date = (searchParams.get('date') || '').slice(0, 30);
  const tagline = (searchParams.get('tag') || 'A love story beautifully told.').slice(0, 120);
  const bg = searchParams.get('bg') || '#2B2B2B';
  const accent = searchParams.get('accent') || '#A3B18A';
  const rawPhoto = searchParams.get('photo') || '';
  // Only use photo URL if it points to a trusted host
  const photo = isTrustedPhotoUrl(rawPhoto) ? rawPhoto : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg,
          overflow: 'hidden',
        }}
      >
        {/* Background photo */}
        {photo && (
          <img
            src={photo}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.35,
              filter: 'brightness(0.5) saturate(1.2)',
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${bg}ee 0%, ${bg}99 50%, transparent 100%)`,
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
            width: '6px',
            background: accent,
            display: 'flex',
          }}
        />

        {/* Pearloom watermark — intertwined thread curves */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '60px',
            width: '200px',
            height: '80px',
            opacity: 0.12,
            display: 'flex',
          }}
        >
          <svg viewBox="0 0 100 40" width="200" height="80">
            <path d="M 12 28 C 12 12, 30 8, 50 20 C 70 32, 88 28, 88 12" stroke={accent} strokeWidth="2" fill="none" />
            <path d="M 12 12 C 12 28, 30 32, 50 20 C 70 8, 88 12, 88 28" stroke={accent} strokeWidth="2" fill="none" opacity="0.6" />
          </svg>
        </div>

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '0 100px',
            gap: '0px',
          }}
        >
          {/* Pearloom brand */}
          <div
            style={{
              fontSize: '14px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: accent,
              fontWeight: 700,
              marginBottom: '40px',
              display: 'flex',
            }}
          >
            ✦ PEARLOOM
          </div>

          {/* Names */}
          <div
            style={{
              fontSize: '96px',
              fontWeight: 400,
              color: '#ffffff',
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>{name1}</span>
            <span style={{ color: accent, fontSize: '60px', margin: '-4px 0' }}>&amp;</span>
            <span>{name2}</span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: '60px',
              height: '2px',
              background: accent,
              margin: '32px 0',
              display: 'flex',
            }}
          />

          {/* Tagline */}
          <div
            style={{
              fontSize: '22px',
              color: 'rgba(255,255,255,0.7)',
              fontStyle: 'italic',
              fontWeight: 300,
              maxWidth: '600px',
              lineHeight: 1.4,
              display: 'flex',
            }}
          >
            {tagline}
          </div>

          {/* Date */}
          {date && (
            <div
              style={{
                marginTop: '24px',
                fontSize: '16px',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)',
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
    {
      width: 1200,
      height: 630,
    }
  );
}
