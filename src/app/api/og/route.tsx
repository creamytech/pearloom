import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import type { ReactElement } from 'react';
import { isSoloOccasion } from '@/lib/event-os/solo-occasions';

export const runtime = 'edge';

/** Strictly sanitize a hex query param (with or without '#').
 *  Returns '#RRGGBB' or null — never passes arbitrary strings into CSS. */
function cleanHex(raw: string | null): string | null {
  if (!raw) return null;
  const h = raw.replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(h)) return `#${h}`;
  if (/^[0-9a-fA-F]{3}$/.test(h)) return `#${h.split('').map(c => c + c).join('')}`;
  return null;
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

// ── Suite motif glyphs ────────────────────────────────────────
// The site's MotifScatter components are client React; the OG route
// renders via Satori, so the most iconic motifs get small bespoke
// inline-SVG twins here. Unknown ids fall back to the text symbol.
// Aliases map visually-close MotifKind ids onto the six glyphs.
const MOTIF_GLYPH_ALIAS: Record<string, string> = {
  olive: 'olive', laurel: 'olive', vine: 'olive', fern: 'olive',
  champagne: 'champagne',
  bloom: 'bloom', magnolia: 'bloom', peony: 'bloom', rose: 'bloom',
  'cherry-blossom': 'bloom',
  compass: 'compass',
  holly: 'holly', pinecone: 'holly',
  disco: 'disco', starburst: 'disco',
};

function motifGlyph(kind: string, color: string): ReactElement | null {
  const glyph = MOTIF_GLYPH_ALIAS[kind];
  if (!glyph) return null;
  const sw = 1.6;
  switch (glyph) {
    case 'olive': // sprig — stem, three leaves, one olive
      return (
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
          <path d="M20 36 C20 25 20 14 20 5" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <path d="M20 12 C15 11 11 8 10 4 C15 5 19 8 20 12 Z" fill={color} />
          <path d="M20 19 C25 18 29 15 30 11 C25 12 21 15 20 19 Z" fill={color} />
          <path d="M20 27 C15 26 11 23 10 19 C15 20 19 23 20 27 Z" fill={color} />
          <circle cx="25" cy="29" r="3" fill={color} />
        </svg>
      );
    case 'champagne': // coupe + rising bubbles
      return (
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
          <path d="M11 9 H29 C29 16 25 20 20 20 C15 20 11 16 11 9 Z" stroke={color} strokeWidth={sw} />
          <path d="M20 20 V33" stroke={color} strokeWidth={sw} />
          <path d="M13 35 H27" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <circle cx="16" cy="5.5" r="1.4" fill={color} />
          <circle cx="22" cy="3.6" r="1.1" fill={color} />
          <circle cx="26" cy="5.8" r="0.9" fill={color} />
        </svg>
      );
    case 'bloom': // generic four-petal bloom (magnolia / peony / rose)
      return (
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
          <path d="M20 20 C16 15 16 8 20 5 C24 8 24 15 20 20 Z" stroke={color} strokeWidth={sw} />
          <path d="M20 20 C25 16 32 16 35 20 C32 24 25 24 20 20 Z" stroke={color} strokeWidth={sw} />
          <path d="M20 20 C24 25 24 32 20 35 C16 32 16 25 20 20 Z" stroke={color} strokeWidth={sw} />
          <path d="M20 20 C15 24 8 24 5 20 C8 16 15 16 20 20 Z" stroke={color} strokeWidth={sw} />
          <circle cx="20" cy="20" r="3" fill={color} />
        </svg>
      );
    case 'compass': // compass rose
      return (
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="14" stroke={color} strokeWidth={sw} />
          <path d="M20 8 L23 20 L20 32 L17 20 Z" fill={color} />
          <path d="M8 20 L20 17 L32 20 L20 23 Z" stroke={color} strokeWidth="1.2" />
          <circle cx="20" cy="20" r="1.8" fill={color} />
        </svg>
      );
    case 'holly': // crossed leaves + berries
      return (
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
          <path d="M19 21 C13 20 8 16 7 9 C13 10 18 14 19 21 Z" stroke={color} strokeWidth={sw} />
          <path d="M21 21 C27 20 32 16 33 9 C27 10 22 14 21 21 Z" stroke={color} strokeWidth={sw} />
          <circle cx="20" cy="26" r="2.4" fill={color} />
          <circle cx="15.5" cy="28.5" r="2.4" fill={color} />
          <circle cx="24.5" cy="28.5" r="2.4" fill={color} />
        </svg>
      );
    case 'disco': // faceted ball on a hang line
      return (
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
          <path d="M20 3 V9" stroke={color} strokeWidth={sw} />
          <circle cx="20" cy="22" r="13" stroke={color} strokeWidth={sw} />
          <path d="M7 22 H33" stroke={color} strokeWidth="1.1" />
          <path d="M9.5 15.5 H30.5" stroke={color} strokeWidth="1.1" />
          <path d="M9.5 28.5 H30.5" stroke={color} strokeWidth="1.1" />
          <path d="M20 9 V35" stroke={color} strokeWidth="1.1" />
          <path d="M13.5 11.5 C11 18 11 26 13.5 32.5" stroke={color} strokeWidth="1.1" />
          <path d="M26.5 11.5 C29 18 29 26 26.5 32.5" stroke={color} strokeWidth="1.1" />
        </svg>
      );
    default:
      return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const occasion = (searchParams.get('occasion') || 'wedding').slice(0, 30);

  // Solo events centre a single honoree; duet events show two names
  // joined by an ampersand (weddings, anniversaries, etc.). The
  // canonical list lives in lib/event-os/solo-occasions.ts (a leaf
  // module — safe for this edge bundle).
  const isSolo = isSoloOccasion(occasion);

  // ── Parse params (support both legacy and new param names) ────────────
  // New format: ?names=Name1,Name2   Legacy: ?n1=Name1&n2=Name2
  const namesParam = searchParams.get('names');
  let name1: string;
  let name2: string;
  if (namesParam) {
    const parts = namesParam.split(',');
    name1 = (parts[0] || (isSolo ? '' : 'Together')).trim().slice(0, 60);
    name2 = (parts[1] || (isSolo ? '' : 'Forever')).trim().slice(0, 60);
  } else {
    name1 = (searchParams.get('n1') || (isSolo ? '' : 'Together')).slice(0, 60);
    name2 = (searchParams.get('n2') || (isSolo ? '' : 'Forever')).slice(0, 60);
  }
  const rawDate  = (searchParams.get('date') || '').slice(0, 30);
  const tagline  = (searchParams.get('tagline') || searchParams.get('tag') || '').slice(0, 120);
  const bgRaw    = searchParams.get('bg') || 'F5F1E8';
  const fgRaw    = searchParams.get('fg') || '';
  const accentRaw = searchParams.get('accent') || 'A3B18A';
  // ── Suite params (SuiteTheme contract, docs/SUITE-STRATEGY.md §6) ──
  // All optional. When present they win over the legacy bg/fg/heading
  // params so the link preview wears the couple's exact pack:
  //   paper  — card background        (hex, no '#')
  //   ink    — primary text           (hex, no '#')
  //   gold   — hairlines + divider    (hex, no '#')
  //   font   — display family name (Google Fonts)
  //   motif  — MotifKind id → small glyph accent (unknown ids skipped)
  // Absent params fall through to the existing behavior — zero
  // regression on previously-shipped cards.
  const suitePaper = cleanHex(searchParams.get('paper'));
  const suiteInk   = cleanHex(searchParams.get('ink'));
  const suiteGold  = cleanHex(searchParams.get('gold'));
  const suiteFont  = (searchParams.get('font') || '').slice(0, 60).trim();
  const motif      = (searchParams.get('motif') || '').toLowerCase().slice(0, 24);
  const headingFont = (suiteFont || searchParams.get('heading') || 'Playfair Display').slice(0, 60);
  const symbol   = (searchParams.get('symbol') || '✦').slice(0, 4);
  // Couple photo (cover image). Allowed protocols: https only.
  const photoRaw = searchParams.get('photo') || '';
  const photoUrl = photoRaw.startsWith('https://') ? photoRaw.slice(0, 1024) : '';
  // Theme family — drives the card layout.
  //   editorial (default): double-bordered invitation card
  //   groove:              warm radial gradient, wavy divider,
  //                        big italic names, no inset frames.
  const themeFamily = (searchParams.get('family') || 'editorial').toLowerCase() as 'editorial' | 'groove';
  // Site Edition — when set, tunes the share card to match the
  // active layout persona. Read by the metadata emitter from
  // manifest.edition. Values mirror src/lib/site-editions/types.ts
  // EditionId. 'editorial' family fallback when unset.
  const edition = (searchParams.get('edition') || '').toLowerCase() as
    | 'almanac'
    | 'cinema'
    | 'postcard-box'
    | 'linen-folder'
    | 'quiet'
    | '';

  // Normalize colors — ensure they have # prefix.
  // Suite paper/ink (sanitized) take precedence over legacy bg/fg.
  const bg     = suitePaper ?? (bgRaw.startsWith('#') ? bgRaw : `#${bgRaw}`);
  const accent = accentRaw.startsWith('#') ? accentRaw : `#${accentRaw}`;

  // Derive fg from bg luminance if not provided
  const lum = luminance(bg);
  const isLight = lum > 0.35;
  const fg = suiteInk
    ?? (fgRaw
      ? (fgRaw.startsWith('#') ? fgRaw : `#${fgRaw}`)
      : (isLight ? '#1a1816' : '#ffffff'));

  const textSecondary = isLight ? 'rgba(30,25,20,0.55)' : 'rgba(255,255,255,0.58)';
  const textMuted     = isLight ? 'rgba(30,25,20,0.30)' : 'rgba(255,255,255,0.30)';

  // Format occasion label nicely — covers the full EVENT_TYPES
  // registry so every share card has a human hero line, not a
  // raw slug (SIP-AND-SEE instead of sip-and-see).
  const occasionLabels: Record<string, string> = {
    wedding: 'WEDDING',
    anniversary: 'ANNIVERSARY',
    engagement: 'ENGAGEMENT',
    birthday: 'BIRTHDAY',
    story: 'OUR STORY',
    'bachelor-party': 'BACHELOR WEEKEND',
    'bachelorette-party': 'BACHELORETTE WEEKEND',
    'bridal-shower': 'BRIDAL SHOWER',
    'bridal-luncheon': 'BRIDAL LUNCHEON',
    'rehearsal-dinner': 'REHEARSAL DINNER',
    'welcome-party': 'WELCOME PARTY',
    brunch: 'THE MORNING AFTER',
    'vow-renewal': 'VOW RENEWAL',
    'baby-shower': 'BABY SHOWER',
    'gender-reveal': 'GENDER REVEAL',
    'sip-and-see': 'SIP & SEE',
    housewarming: 'HOUSEWARMING',
    'first-birthday': 'FIRST BIRTHDAY',
    'sweet-sixteen': 'SWEET SIXTEEN',
    'milestone-birthday': 'A MILESTONE',
    retirement: 'RETIREMENT',
    graduation: 'GRADUATION',
    'bar-mitzvah': 'BAR MITZVAH',
    'bat-mitzvah': 'BAT MITZVAH',
    quinceanera: 'QUINCEAÑERA',
    baptism: 'BAPTISM',
    'first-communion': 'FIRST COMMUNION',
    confirmation: 'CONFIRMATION',
    memorial: 'IN LOVING MEMORY',
    funeral: 'IN LOVING MEMORY',
    reunion: 'REUNION',
  };
  const occasionLabel = occasionLabels[occasion.toLowerCase()] || occasion.toUpperCase().replace(/-/g, ' ');

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

  // Suite gold drives hairlines when present; accent stands in otherwise.
  const hairline = suiteGold ?? accent;
  // Motif glyph — replaces the text symbol when the id maps to one of
  // the iconic glyphs; unknown ids gracefully keep the symbol.
  const glyph = motif ? motifGlyph(motif, suiteGold ?? accent) : null;

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

        {/* Groove-family sites get a warm radial wash + a big
            soft blob instead of the editorial double frame.
            Makes the share card itself feel part of the groove
            brand family. */}
        {themeFamily === 'groove' && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at 50% 0%, ${accent}28 0%, transparent 60%)`,
                display: 'flex',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: '-160px',
                top: '-100px',
                width: 520,
                height: 520,
                borderRadius: '42% 58% 70% 30%',
                background: accent,
                opacity: 0.22,
                display: 'flex',
              }}
            />
          </>
        )}
        {/* Cinema Edition — letterbox black bars top + bottom for
            a film-mag feel. Suppresses the editorial frame; the
            bars ARE the chrome. */}
        {edition === 'cinema' && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '72px',
                background: '#0E0D0B',
                display: 'flex',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '72px',
                background: '#0E0D0B',
                display: 'flex',
              }}
            />
          </>
        )}
        {/* Linen Folder — top + bottom gold hairlines, no border
            frame. Hotel stationery feel. */}
        {edition === 'linen-folder' && (
          <>
            <div
              style={{
                position: 'absolute',
                top: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '160px',
                height: '1px',
                background: suiteGold ?? '#B89244',
                display: 'flex',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '160px',
                height: '1px',
                background: suiteGold ?? '#B89244',
                display: 'flex',
              }}
            />
          </>
        )}
        {/* Subtle accent-colored border/frame — editorial default
            for everything that isn't groove, cinema, or linen.
            Almanac, Postcard Box, Quiet all wear the soft frame. */}
        {themeFamily !== 'groove' && edition !== 'cinema' && edition !== 'linen-folder' && (
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
        )}
        {/* Inner frame — double border effect (editorial only) */}
        {themeFamily !== 'groove' && (
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
        )}

        {/* Corner accent flourishes — editorial only */}
        {themeFamily !== 'groove' && (
        <>
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
        </>
        )}

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
          {/* Decorative accent at top — suite motif glyph when the
              site's pack carries an iconic motif, text symbol otherwise */}
          <div
            style={{
              fontSize: '32px',
              color: accent,
              marginBottom: '20px',
              display: 'flex',
              opacity: 0.8,
            }}
          >
            {glyph ?? symbol}
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

          {/* Names in heading font — large, centered. Solo events
              (birthday, memorial, graduation, etc.) show a single
              honoree without the "&" glyph. */}
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
                fontSize: isSolo ? '84px' : '72px',
                fontWeight: 400,
                color: fg,
                display: 'flex',
              }}
            >
              {name1}
            </span>
            {!isSolo && name2 && (
              <>
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
              </>
            )}
          </div>

          {/* Decorative divider — gold hairline when the suite carries one */}
          <div
            style={{
              width: '50px',
              height: '1px',
              background: hairline,
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
