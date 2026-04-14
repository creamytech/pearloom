'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/blocks/StoryLayouts.tsx
// Six chapter layouts for storytelling pages, plus a picker.
// All use inline styles and follow the Organic Glass design system.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, radius, shadow, ease, text as textScale } from '@/lib/design-tokens';
import { formatLocalDate } from '@/lib/date';
import { getImageBrightness, textColorForBrightness } from '@/lib/smart-features';

// ── Shared Style Helpers ──────────────────────────────────────

// Default fallbacks — used only when no vibeSkin fonts are provided
const DEFAULT_HEADING_FONT =
  "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const DEFAULT_BODY_FONT =
  "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/** Build font-family string from a vibeSkin font name (Google Font). */
function fontStack(fontName: string | undefined, fallback: string): string {
  if (!fontName) return fallback;
  return `'${fontName}', ${fallback}`;
}

type CardStyle = 'glass' | 'solid' | 'outlined' | 'minimal' | 'elevated';

/** Build card CSS based on the vibeSkin cardStyle. */
function buildCardStyle(style: CardStyle | undefined): React.CSSProperties {
  switch (style) {
    case 'glass':
      return {
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        border: '1px solid #E4E4E7',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      };
    case 'outlined':
      return {
        background: 'transparent',
        border: '1px solid #E4E4E7',
        borderRadius: '12px',
      };
    case 'minimal':
      return {
        background: 'transparent',
        border: 'none',
        borderRadius: '12px',
      };
    case 'elevated':
      return {
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      };
    case 'solid':
    default:
      return {
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      };
  }
}

// Legacy aliases — consumed by the individual layout components via props
// These are overridden at render time when themeFonts is provided.
let headingFont = DEFAULT_HEADING_FONT;
let bodyFont = DEFAULT_BODY_FONT;
let glassCard: React.CSSProperties = buildCardStyle('solid');

// ── Shared Props ──────────────────────────────────────────────

export interface StoryLayoutProps {
  photos: Array<{
    url: string;
    alt?: string;
    caption?: string;
  }>;
  title: string;
  subtitle?: string;
  body?: string;
  date?: string;
  /** Optional human-readable location label for the chapter badge. */
  location?: string | null;
  /** Index of the current chapter (for alternating layouts) */
  index?: number;
  /**
   * Optional Intl date-format override. When set we format `date` via
   * `formatLocalDate`; otherwise the raw `date` string passes through
   * so callers can format it themselves.
   */
  dateFormat?: Intl.DateTimeFormatOptions;
  /**
   * When true, wire `data-pe-editable="true"` + `data-pe-field="title|
   * subtitle|description"` onto the relevant text nodes so the editor's
   * EditBridge can upgrade them to contentEditable. Off by default so
   * public renders stay read-only.
   */
  editable?: boolean;
  /** VibeSkin font names — override the default heading/body fonts. */
  themeFonts?: { heading?: string; body?: string };
  /** VibeSkin cardStyle — override the default card appearance. */
  themeCardStyle?: CardStyle;
}

// ── Shared rendering helpers ──────────────────────────────────

/** Format a date string using the layout's preferred format (or pass through). */
function formatChapterDate(
  date: string | undefined,
  dateFormat: Intl.DateTimeFormatOptions | undefined,
): string {
  if (!date) return '';
  if (dateFormat) return formatLocalDate(date, dateFormat);
  return date;
}

type EditableAttrs = {
  'data-pe-editable'?: 'true';
  'data-pe-field'?: 'title' | 'subtitle' | 'description';
};
function editAttrs(
  enabled: boolean | undefined,
  field: 'title' | 'subtitle' | 'description',
): EditableAttrs {
  if (!enabled) return {};
  return {
    'data-pe-editable': 'true',
    'data-pe-field': field,
    // Leave contentEditable for EditBridge to toggle at runtime — declaring
    // it here would suppress React's text diffing when the user types.
  };
}

/**
 * Shared location pill renderer. Shows a small rounded badge with a pin
 * icon + label. Returns null when no location is present.
 */
interface LocationBadgeProps {
  label?: string | null;
  /** Text color inside the pill. */
  color?: string;
  /** Pill background — if omitted a translucent backdrop is used. */
  background?: string;
  style?: React.CSSProperties;
}
function LocationBadge({ label, color, background, style }: LocationBadgeProps) {
  if (!label) return null;
  const fg = color || colors.inkSoft;
  const bg = background || 'rgba(255,255,255,0.82)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '4px 10px',
        borderRadius: '999px',
        background: bg,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `1px solid ${fg}33`,
        fontFamily: bodyFont,
        fontSize: textScale.xs,
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: fg,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      {label}
    </span>
  );
}

/**
 * Hook that samples a photo URL client-side to decide whether text
 * overlaid on it should be light or dark. Returns a text color + a
 * recommended dark-overlay opacity. While the sample is in flight it
 * returns the `light` defaults so layouts render safely on SSR too.
 */
function useAutoTextColor(
  photoUrl: string | undefined,
  options: { light?: string; dark?: string } = {},
): { textColor: string; overlayOpacity: number } {
  const { light = '#F5F1E8', dark = '#1A1A1A' } = options;
  const [choice, setChoice] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    setChoice(null);
    if (!photoUrl || typeof window === 'undefined') return;
    // Skip data URLs and hero-art endpoints — they're synthetic illustrations,
    // not photographs, and the detector often mis-reads them.
    if (photoUrl.startsWith('data:') || photoUrl.includes('/api/hero-art')) return;

    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const brightness = getImageBrightness(img);
      if (brightness !== null) setChoice(textColorForBrightness(brightness));
    };
    img.onerror = () => {
      if (!cancelled) setChoice(null);
    };
    img.src = photoUrl;
    return () => {
      cancelled = true;
    };
  }, [photoUrl]);

  if (choice === 'dark') {
    return { textColor: dark, overlayOpacity: 0.12 };
  }
  // Default to light text (with a strong dark overlay) on SSR and for any
  // photo we couldn't sample — this is the safer fallback for hero photos.
  return { textColor: light, overlayOpacity: 0.55 };
}

// ─────────────────────────────────────────────────────────────
// 1. ParallaxScroll
// ─────────────────────────────────────────────────────────────

export function ParallaxScroll({
  photos,
  title,
  subtitle,
  body,
  date,
  location,
  dateFormat,
  editable,
}: StoryLayoutProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const bgUrl = photos[0]?.url;
  const { textColor, overlayOpacity } = useAutoTextColor(bgUrl);
  const formattedDate = formatChapterDate(date, dateFormat);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const sectionStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundColor: colors.inkSoft,
    overflow: 'hidden',
  };

  // Overlay strength is driven by whether the photo reads as light or dark:
  // dark photos get a gentler overlay, bright photos need a stronger wash so
  // the light text stays legible.
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background:
      textColor === '#1A1A1A'
        ? `linear-gradient(180deg, rgba(245,241,232,${Math.max(0.35, overlayOpacity)}) 0%, rgba(245,241,232,${Math.max(0.55, overlayOpacity + 0.2)}) 100%)`
        : `linear-gradient(180deg, rgba(26,26,26,${Math.max(0.25, overlayOpacity - 0.3)}) 0%, rgba(26,26,26,${Math.max(0.55, overlayOpacity)}) 55%, rgba(26,26,26,${Math.max(0.78, overlayOpacity + 0.23)}) 100%)`,
    pointerEvents: 'none',
  };

  const contentStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    maxWidth: '760px',
    padding: '3rem 1.5rem',
    textAlign: 'center',
    color: textColor,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(36px)',
    transition:
      'opacity 900ms cubic-bezier(0.22, 1, 0.36, 1), transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <section ref={sectionRef} style={sectionStyle}>
      <div style={overlayStyle} />
      <div style={contentStyle}>
        {(formattedDate || location) && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {formattedDate && (
              <div
                style={{
                  fontFamily: bodyFont,
                  fontSize: textScale.xs,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  opacity: 0.85,
                }}
              >
                {formattedDate}
              </div>
            )}
            {location && (
              <LocationBadge
                label={location}
                color={textColor}
                background={
                  textColor === '#1A1A1A'
                    ? 'rgba(255,255,255,0.78)'
                    : 'rgba(0,0,0,0.28)'
                }
              />
            )}
          </div>
        )}
        <h2
          {...editAttrs(editable, 'title')}
          style={{
            fontFamily: headingFont,
            fontSize: textScale['3xl'],
            lineHeight: 1.08,
            fontWeight: 400,
            margin: '0 0 1rem 0',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <div
            {...editAttrs(editable, 'subtitle')}
            style={{
              fontFamily: headingFont,
              fontStyle: 'italic',
              fontSize: textScale.xl,
              opacity: 0.9,
              marginBottom: '1.25rem',
            }}
          >
            {subtitle}
          </div>
        )}
        {body && (
          <p
            {...editAttrs(editable, 'description')}
            style={{
              fontFamily: bodyFont,
              fontSize: textScale.md,
              lineHeight: 1.75,
              maxWidth: '620px',
              margin: '0 auto',
              opacity: 0.92,
            }}
          >
            {body}
          </p>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. FilmStrip
// ─────────────────────────────────────────────────────────────

export function FilmStrip({
  photos,
  title,
  subtitle,
  body,
  date,
  location,
  dateFormat,
  editable,
}: StoryLayoutProps) {
  const primary = photos[0];
  const formattedDate = formatChapterDate(date, dateFormat);

  const sprocketHoles = Array.from({ length: 14 }).map((_, i) => (
    <span
      key={i}
      style={{
        display: 'inline-block',
        width: '14px',
        height: '8px',
        borderRadius: '3px',
        background: colors.cream,
      }}
    />
  ));

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .pl-filmstrip-wrap {
            flex-direction: column !important;
          }
          .pl-filmstrip-photo, .pl-filmstrip-text {
            width: 100% !important;
          }
          .pl-filmstrip-photo {
            transform: rotate(0deg) !important;
          }
        }
      `}</style>
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: ease.smooth }}
        style={{
          padding: 'clamp(3rem, 6vw, 5rem) 1.5rem',
          background: colors.cream,
        }}
      >
        <div
          className="pl-filmstrip-wrap"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '3rem',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          <div
            className="pl-filmstrip-photo"
            style={{
              width: '55%',
              position: 'relative',
              transform: 'rotate(-2deg)',
              background: colors.ink,
              padding: '24px 10px',
              borderRadius: '6px',
              boxShadow: shadow.lg,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '20px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '0 8px',
              }}
            >
              {sprocketHoles}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '20px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '0 8px',
              }}
            >
              {sprocketHoles}
            </div>
            {primary ? (
              <img
                src={primary.url}
                alt={primary.alt || title}
                style={{
                  display: 'block',
                  width: '100%',
                  aspectRatio: '4 / 3',
                  objectFit: 'cover',
                  borderRadius: '2px',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  background: colors.inkSoft,
                  borderRadius: '2px',
                }}
              />
            )}
          </div>

          <div
            className="pl-filmstrip-text"
            style={{ width: '45%', fontFamily: bodyFont, color: colors.ink }}
          >
            {(formattedDate || location) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  marginBottom: '0.75rem',
                }}
              >
                {formattedDate && (
                  <div
                    style={{
                      fontSize: textScale.xs,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: colors.oliveDeep,
                      fontWeight: 500,
                    }}
                  >
                    {formattedDate}
                  </div>
                )}
                {location && (
                  <LocationBadge
                    label={location}
                    color={colors.oliveDeep}
                    background={'rgba(163,177,138,0.12)'}
                  />
                )}
              </div>
            )}
            <h2
              {...editAttrs(editable, 'title')}
              style={{
                fontFamily: headingFont,
                fontSize: textScale['2xl'],
                lineHeight: 1.1,
                fontWeight: 400,
                margin: '0 0 0.75rem 0',
                color: colors.ink,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <div
                {...editAttrs(editable, 'subtitle')}
                style={{
                  fontFamily: headingFont,
                  fontStyle: 'italic',
                  fontSize: textScale.lg,
                  color: colors.muted,
                  marginBottom: '1.25rem',
                }}
              >
                {subtitle}
              </div>
            )}
            {body && (
              <p
                {...editAttrs(editable, 'description')}
                style={{
                  fontSize: textScale.md,
                  lineHeight: 1.75,
                  color: colors.inkSoft,
                  margin: 0,
                }}
              >
                {body}
              </p>
            )}
          </div>
        </div>
      </motion.section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. MagazineSpread
// ─────────────────────────────────────────────────────────────

export function MagazineSpread({
  photos,
  title,
  subtitle,
  body,
  date,
  location,
  dateFormat,
  editable,
  index = 0,
}: StoryLayoutProps) {
  const isEven = index % 2 === 0;
  const primary = photos[0];
  const formattedDate = formatChapterDate(date, dateFormat);
  // Only the photo-overlay variant samples the photo — the two-column
  // variant already sits on a cream background so it doesn't need it.
  const { textColor, overlayOpacity } = useAutoTextColor(isEven ? primary?.url : undefined);

  // Even index: full-bleed photo with text overlay at bottom
  if (isEven) {
    const overlayBg = textColor === '#1A1A1A'
      ? `linear-gradient(180deg, rgba(245,241,232,0) 40%, rgba(245,241,232,${Math.max(0.65, overlayOpacity + 0.5)}) 100%)`
      : `linear-gradient(180deg, rgba(26,26,26,0) 40%, rgba(26,26,26,${Math.max(0.82, overlayOpacity + 0.3)}) 100%)`;
    return (
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: ease.smooth }}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '85vh',
          display: 'grid',
          gridTemplateRows: '1fr auto',
          overflow: 'hidden',
          background: colors.inkSoft,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
          }}
        >
          {primary && (
            <motion.img
              src={primary.url}
              alt={primary.alt || title}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.8, ease: ease.smooth }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: overlayBg,
              pointerEvents: 'none',
            }}
          />
        </div>
        <div
          style={{
            position: 'relative',
            gridRow: 2,
            padding: 'clamp(2rem, 5vw, 4rem)',
            color: textColor,
            maxWidth: '900px',
            fontFamily: bodyFont,
          }}
        >
          {(formattedDate || location) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '0.75rem',
              }}
            >
              {formattedDate && (
                <div
                  style={{
                    fontSize: textScale.xs,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    opacity: 0.88,
                  }}
                >
                  {formattedDate}
                </div>
              )}
              {location && (
                <LocationBadge
                  label={location}
                  color={textColor}
                  background={textColor === '#1A1A1A' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.28)'}
                />
              )}
            </div>
          )}
          <h2
            {...editAttrs(editable, 'title')}
            style={{
              fontFamily: headingFont,
              fontSize: textScale['3xl'],
              lineHeight: 1.05,
              fontWeight: 400,
              margin: '0 0 1rem 0',
              fontStyle: 'italic',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <div
              {...editAttrs(editable, 'subtitle')}
              style={{
                fontFamily: headingFont,
                fontStyle: 'italic',
                fontSize: textScale.xl,
                opacity: 0.88,
                margin: '0 0 1rem 0',
              }}
            >
              {subtitle}
            </div>
          )}
          {body && (
            <p
              {...editAttrs(editable, 'description')}
              style={{
                fontSize: textScale.md,
                lineHeight: 1.75,
                margin: 0,
                opacity: 0.92,
                maxWidth: '640px',
              }}
            >
              {body}
            </p>
          )}
        </div>
      </motion.section>
    );
  }

  // Odd index: two-column grid
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: ease.smooth }}
      style={{
        padding: 'clamp(3rem, 6vw, 5rem) 1.5rem',
        background: colors.cream,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '2rem',
          maxWidth: '1240px',
          margin: '0 auto',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            gridColumn: 'span 7',
            overflow: 'hidden',
            borderRadius: radius.lg,
            boxShadow: shadow.lg,
            aspectRatio: '4 / 5',
            background: colors.oliveMist,
          }}
        >
          {primary && (
            <motion.img
              src={primary.url}
              alt={primary.alt || title}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.8, ease: ease.smooth }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
        </div>
        <div
          style={{
            gridColumn: 'span 5',
            fontFamily: bodyFont,
            color: colors.ink,
          }}
        >
          {(formattedDate || location) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '0.75rem',
              }}
            >
              {formattedDate && (
                <div
                  style={{
                    fontSize: textScale.xs,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: colors.oliveDeep,
                    fontWeight: 500,
                  }}
                >
                  {formattedDate}
                </div>
              )}
              {location && (
                <LocationBadge
                  label={location}
                  color={colors.oliveDeep}
                  background={'rgba(163,177,138,0.12)'}
                />
              )}
            </div>
          )}
          <h2
            {...editAttrs(editable, 'title')}
            style={{
              fontFamily: headingFont,
              fontSize: textScale['2xl'],
              lineHeight: 1.1,
              fontWeight: 400,
              margin: '0 0 1rem 0',
              color: colors.ink,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <blockquote
              {...editAttrs(editable, 'subtitle')}
              style={{
                fontFamily: headingFont,
                fontStyle: 'italic',
                fontSize: textScale.xl,
                lineHeight: 1.3,
                color: colors.oliveDeep,
                borderLeft: `3px solid ${colors.olive}`,
                paddingLeft: '1rem',
                margin: '1rem 0',
              }}
            >
              {subtitle}
            </blockquote>
          )}
          {body && (
            <p
              {...editAttrs(editable, 'description')}
              style={{
                fontSize: textScale.md,
                lineHeight: 1.75,
                color: colors.inkSoft,
                margin: 0,
              }}
            >
              {body}
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. TimelineVine
// ─────────────────────────────────────────────────────────────

export function TimelineVine({
  photos,
  title,
  subtitle,
  body,
  date,
  location,
  dateFormat,
  editable,
  index = 0,
}: StoryLayoutProps) {
  const onRight = index % 2 === 0;
  const primary = photos[0];
  // TimelineVine's date node uses a short "MMM YYYY"-ish format even when
  // the user picks a long format, so the circle stays legible. The full
  // formatted date goes into the card body.
  const formattedDate = formatChapterDate(date, dateFormat);
  const nodeDate = date
    ? formatLocalDate(date, { month: 'short', year: 'numeric' })
    : '';

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: ease.smooth }}
      style={{
        position: 'relative',
        padding: '2.5rem 1.5rem',
        background: colors.cream,
      }}
    >
      {/* Central vine line */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '2px',
          background: `linear-gradient(180deg, ${colors.olive}00, ${colors.olive} 12%, ${colors.olive} 88%, ${colors.olive}00)`,
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          maxWidth: '1080px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'center',
          minHeight: '260px',
        }}
      >
        {/* Node circle with date */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: colors.olive,
            border: `4px solid ${colors.cream}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadow.md,
          }}
        >
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: textScale.xs,
              color: '#FFFFFF',
              textAlign: 'center',
              lineHeight: 1.1,
              fontWeight: 600,
              letterSpacing: '0.04em',
              padding: '4px',
            }}
          >
            {nodeDate || ''}
          </div>
        </div>

        {/* Connector line from card to vine */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: onRight ? '50%' : 'calc(50% - 60px)',
            width: '60px',
            height: '2px',
            background: colors.olive,
            transform: 'translateY(-50%)',
            zIndex: 1,
          }}
        />

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, x: onRight ? 40 : -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: ease.smooth }}
          style={{
            ...glassCard,
            gridColumn: onRight ? 2 : 1,
            marginLeft: onRight ? '64px' : 0,
            marginRight: onRight ? 0 : '64px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
            overflow: 'hidden',
          }}
        >
          {primary && (
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                overflow: 'hidden',
                borderRadius: radius.md,
                background: colors.oliveMist,
              }}
            >
              <img
                src={primary.url}
                alt={primary.alt || title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          )}
          <div style={{ fontFamily: bodyFont, color: colors.ink }}>
            {(formattedDate || location) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  marginBottom: '0.4rem',
                }}
              >
                {formattedDate && (
                  <span
                    style={{
                      fontSize: textScale.xs,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: colors.oliveDeep,
                      fontWeight: 500,
                    }}
                  >
                    {formattedDate}
                  </span>
                )}
                {location && (
                  <LocationBadge
                    label={location}
                    color={colors.oliveDeep}
                    background={'rgba(163,177,138,0.12)'}
                  />
                )}
              </div>
            )}
            <h3
              {...editAttrs(editable, 'title')}
              style={{
                fontFamily: headingFont,
                fontSize: textScale.xl,
                lineHeight: 1.2,
                fontWeight: 400,
                margin: '0 0 0.5rem 0',
                color: colors.ink,
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <div
                {...editAttrs(editable, 'subtitle')}
                style={{
                  fontFamily: headingFont,
                  fontStyle: 'italic',
                  fontSize: textScale.base,
                  color: colors.oliveDeep,
                  marginBottom: '0.5rem',
                }}
              >
                {subtitle}
              </div>
            )}
            {body && (
              <p
                {...editAttrs(editable, 'description')}
                style={{
                  fontSize: textScale.base,
                  lineHeight: 1.65,
                  color: colors.inkSoft,
                  margin: 0,
                }}
              >
                {body}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. KenBurns
// ─────────────────────────────────────────────────────────────

export function KenBurns({
  photos: rawPhotos,
  title,
  subtitle,
  body,
  date,
  location,
  dateFormat,
  editable,
}: StoryLayoutProps) {
  // Cap the slideshow at 6 so a cluster of 50 vacation photos doesn't
  // turn into a 6-minute rotation. The rest of the cluster still lives
  // in the manifest — it just isn't on the main stage. The dashboard
  // gallery, photos block, and other layouts can still use the tail.
  const photos = rawPhotos.slice(0, 6);
  const [activeIdx, setActiveIdx] = useState(0);
  const hasMultiple = photos.length > 1;
  const activePhoto = photos[activeIdx];
  const { textColor, overlayOpacity } = useAutoTextColor(activePhoto?.url);
  const formattedDate = formatChapterDate(date, dateFormat);

  useEffect(() => {
    if (!hasMultiple) return;
    const id = window.setInterval(() => {
      setActiveIdx((i) => (i + 1) % photos.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [hasMultiple, photos.length]);

  return (
    <>
      <style>{`
        @keyframes pl-kb-zoom {
          from { transform: scale(1); }
          to   { transform: scale(1.12); }
        }
      `}</style>
      <section
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '80vh',
          overflow: 'hidden',
          background: colors.inkSoft,
        }}
      >
        {photos.map((p, i) => (
          <div
            key={`${p.url}-${i}`}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: i === activeIdx ? 1 : 0,
              transition: 'opacity 1400ms cubic-bezier(0.22, 1, 0.36, 1)',
              overflow: 'hidden',
            }}
          >
            <img
              src={p.url}
              alt={p.alt || title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transformOrigin: 'center center',
                animation: 'pl-kb-zoom 12s ease-out forwards',
              }}
            />
          </div>
        ))}

        {/* Gradient overlay — light/dark depending on photo brightness */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              textColor === '#1A1A1A'
                ? `linear-gradient(180deg, rgba(245,241,232,0) 45%, rgba(245,241,232,${Math.max(0.55, overlayOpacity + 0.4)}) 100%)`
                : `linear-gradient(180deg, rgba(26,26,26,0) 45%, rgba(26,26,26,${Math.max(0.55, overlayOpacity)}) 80%, rgba(26,26,26,${Math.max(0.88, overlayOpacity + 0.3)}) 100%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Text */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: 'clamp(2rem, 5vw, 4rem)',
            color: textColor,
            fontFamily: bodyFont,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${title}-${activeIdx}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6, ease: ease.smooth }}
              style={{ maxWidth: '720px' }}
            >
              {(formattedDate || location) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    marginBottom: '0.75rem',
                  }}
                >
                  {formattedDate && (
                    <div
                      style={{
                        fontSize: textScale.xs,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        opacity: 0.88,
                      }}
                    >
                      {formattedDate}
                    </div>
                  )}
                  {location && (
                    <LocationBadge
                      label={location}
                      color={textColor}
                      background={textColor === '#1A1A1A' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.28)'}
                    />
                  )}
                </div>
              )}
              <h2
                {...editAttrs(editable, 'title')}
                style={{
                  fontFamily: headingFont,
                  fontSize: textScale['3xl'],
                  lineHeight: 1.08,
                  fontWeight: 400,
                  margin: '0 0 0.75rem 0',
                }}
              >
                {title}
              </h2>
              {subtitle && (
                <div
                  {...editAttrs(editable, 'subtitle')}
                  style={{
                    fontFamily: headingFont,
                    fontStyle: 'italic',
                    fontSize: textScale.xl,
                    opacity: 0.9,
                    marginBottom: '0.75rem',
                  }}
                >
                  {subtitle}
                </div>
              )}
              {body && (
                <p
                  {...editAttrs(editable, 'description')}
                  style={{
                    fontSize: textScale.md,
                    lineHeight: 1.7,
                    margin: 0,
                    opacity: 0.92,
                  }}
                >
                  {body}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. BentoGrid
// ─────────────────────────────────────────────────────────────

export function BentoGrid({
  photos,
  title,
  subtitle,
  body,
  date,
  location,
  dateFormat,
  editable,
}: StoryLayoutProps) {
  const count = photos.length;
  const formattedDate = formatChapterDate(date, dateFormat);

  const cellBase: React.CSSProperties = {
    borderRadius: '16px',
    overflow: 'hidden',
    background: colors.oliveMist,
    position: 'relative',
  };

  const photoCell = (
    p: { url: string; alt?: string },
    key: string,
    style: React.CSSProperties
  ) => (
    <motion.div
      key={key}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.35, ease: ease.smooth }}
      style={{ ...cellBase, ...style }}
    >
      <img
        src={p.url}
        alt={p.alt || ''}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </motion.div>
  );

  const textCard = (style: React.CSSProperties) => (
    <motion.div
      key="text-card"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.35, ease: ease.smooth }}
      style={{
        ...glassCard,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        ...style,
      }}
    >
      {(formattedDate || location) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginBottom: '0.5rem',
          }}
        >
          {formattedDate && (
            <span
              style={{
                fontFamily: bodyFont,
                fontSize: textScale.xs,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: colors.oliveDeep,
                fontWeight: 500,
              }}
            >
              {formattedDate}
            </span>
          )}
          {location && (
            <LocationBadge
              label={location}
              color={colors.oliveDeep}
              background={'rgba(163,177,138,0.12)'}
            />
          )}
        </div>
      )}
      <h3
        {...editAttrs(editable, 'title')}
        style={{
          fontFamily: headingFont,
          fontSize: textScale.xl,
          lineHeight: 1.15,
          fontWeight: 400,
          margin: '0 0 0.5rem 0',
          color: colors.ink,
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <div
          {...editAttrs(editable, 'subtitle')}
          style={{
            fontFamily: headingFont,
            fontStyle: 'italic',
            fontSize: textScale.base,
            color: colors.muted,
            marginBottom: '0.5rem',
          }}
        >
          {subtitle}
        </div>
      )}
      {body && (
        <p
          {...editAttrs(editable, 'description')}
          style={{
            fontFamily: bodyFont,
            fontSize: textScale.sm,
            lineHeight: 1.6,
            color: colors.inkSoft,
            margin: 0,
          }}
        >
          {body}
        </p>
      )}
    </motion.div>
  );

  // Layout selection based on number of photos
  let gridContent: React.ReactNode;

  if (count === 0) {
    gridContent = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '8px',
        }}
      >
        {textCard({ minHeight: '280px' })}
      </div>
    );
  } else if (count === 1) {
    gridContent = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, minmax(160px, 1fr))',
          gap: '8px',
        }}
      >
        {photoCell(photos[0], 'p0', {
          gridColumn: 'span 3',
          gridRow: 'span 2',
        })}
        {textCard({ gridColumn: 'span 1', gridRow: 'span 2' })}
      </div>
    );
  } else if (count === 2) {
    gridContent = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(2, minmax(160px, 1fr))',
          gap: '8px',
        }}
      >
        {photoCell(photos[0], 'p0', {
          gridColumn: 'span 2',
          gridRow: 'span 2',
        })}
        {photoCell(photos[1], 'p1', { gridColumn: 'span 1', gridRow: 'span 1' })}
        {textCard({ gridColumn: 'span 1', gridRow: 'span 1' })}
      </div>
    );
  } else {
    // 3+ photos
    const extras = photos.slice(1, 5);
    gridContent = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, minmax(160px, 1fr))',
          gap: '8px',
        }}
      >
        {photoCell(photos[0], 'p0', {
          gridColumn: 'span 2',
          gridRow: 'span 2',
        })}
        {extras.map((p, i) =>
          photoCell(p, `p${i + 1}`, {
            gridColumn: 'span 1',
            gridRow: 'span 1',
          })
        )}
        {textCard({ gridColumn: 'span 1', gridRow: 'span 1' })}
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: ease.smooth }}
      style={{
        padding: 'clamp(2rem, 5vw, 4rem) 1.5rem',
        background: colors.cream,
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>{gridContent}</div>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────
// Layout Picker
// ─────────────────────────────────────────────────────────────

export type StoryLayoutType =
  | 'parallax'
  | 'filmstrip'
  | 'magazine'
  | 'timeline'
  | 'kenburns'
  | 'bento';

const LAYOUT_OPTIONS: Array<{ type: StoryLayoutType; label: string; desc: string }> = [
  { type: 'parallax', label: 'Parallax', desc: 'Full-bleed photos with scroll depth' },
  { type: 'filmstrip', label: 'Film Strip', desc: 'Cinematic horizontal scroll' },
  { type: 'magazine', label: 'Magazine', desc: 'Editorial photo + text pairing' },
  { type: 'timeline', label: 'Timeline', desc: 'Chronological story flow' },
  { type: 'kenburns', label: 'Ken Burns', desc: 'Slow zoom with text overlays' },
  { type: 'bento', label: 'Bento', desc: 'Grid mosaic of photos & text' },
];

// Mini-diagram renderers — abstract representations of each layout
function MiniDiagram({ type }: { type: StoryLayoutType }) {
  const box: React.CSSProperties = {
    width: '100%',
    height: '72px',
    background: '#F4F4F5',
    borderRadius: '6px',
    position: 'relative',
    overflow: 'hidden',
  };
  const photoFill: React.CSSProperties = {
    background: '#A1A1AA',
    borderRadius: '3px',
  };
  const line: React.CSSProperties = {
    background: '#71717A',
    height: '2px',
    borderRadius: '1px',
    opacity: 0.55,
  };

  switch (type) {
    case 'parallax':
      return (
        <div style={box}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#A1A1AA',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '20%',
              right: '20%',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            <div
              style={{
                background: '#FAFAFA',
                height: '4px',
                width: '100%',
                borderRadius: '1px',
              }}
            />
            <div
              style={{
                background: '#FAFAFA',
                height: '2px',
                width: '70%',
                borderRadius: '1px',
                margin: '0 auto',
              }}
            />
          </div>
        </div>
      );

    case 'filmstrip':
      return (
        <div style={{ ...box, display: 'flex', padding: '8px', gap: '6px' }}>
          <div
            style={{
              ...photoFill,
              width: '55%',
              height: '100%',
              transform: 'rotate(-4deg)',
            }}
          />
          <div
            style={{
              width: '45%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <div style={{ ...line, width: '80%' }} />
            <div style={{ ...line, width: '60%' }} />
            <div style={{ ...line, width: '70%' }} />
          </div>
        </div>
      );

    case 'magazine':
      return (
        <div style={{ ...box, display: 'flex', padding: '6px', gap: '6px' }}>
          <div style={{ ...photoFill, width: '60%', height: '100%' }} />
          <div
            style={{
              width: '40%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <div style={{ ...line, width: '90%', height: '3px' }} />
            <div style={{ ...line, width: '70%' }} />
            <div style={{ ...line, width: '80%' }} />
          </div>
        </div>
      );

    case 'timeline':
      return (
        <div style={box}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '2px',
              background: '#A1A1AA',
              transform: 'translateX(-50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#A1A1AA',
              transform: 'translate(-50%, -50%)',
              border: '2px solid #FAFAFA',
            }}
          />
          <div
            style={{
              ...photoFill,
              position: 'absolute',
              left: '8px',
              top: '10px',
              width: '34%',
              height: '18px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '8px',
              bottom: '10px',
              width: '34%',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            <div style={{ ...line, width: '100%' }} />
            <div style={{ ...line, width: '70%' }} />
          </div>
        </div>
      );

    case 'kenburns':
      return (
        <div style={box}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#A1A1AA',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, transparent 50%, rgba(26,26,26,0.6) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '10%',
              right: '10%',
              bottom: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            <div
              style={{
                background: '#FAFAFA',
                height: '3px',
                width: '70%',
                borderRadius: '1px',
              }}
            />
            <div
              style={{
                background: '#FAFAFA',
                height: '2px',
                width: '50%',
                borderRadius: '1px',
              }}
            />
          </div>
        </div>
      );

    case 'bento':
      return (
        <div
          style={{
            ...box,
            background: 'transparent',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '3px',
          }}
        >
          <div
            style={{
              ...photoFill,
              gridColumn: 'span 2',
              gridRow: 'span 2',
            }}
          />
          <div style={{ ...photoFill, opacity: 0.75 }} />
          <div
            style={{
              background: 'rgba(255,255,255,0.82)',
              border: '1px solid #E4E4E7',
              borderRadius: '3px',
            }}
          />
        </div>
      );

    default:
      return <div style={box} />;
  }
}

// ─────────────────────────────────────────────────────────────
// StoryLayout dispatcher — picks a layout component by type
// ─────────────────────────────────────────────────────────────

export interface StoryLayoutDispatchProps extends StoryLayoutProps {
  type: StoryLayoutType;
}

export function StoryLayout({ type, ...props }: StoryLayoutDispatchProps) {
  switch (type) {
    case 'parallax':
      return <ParallaxScroll {...props} />;
    case 'filmstrip':
      return <FilmStrip {...props} />;
    case 'magazine':
      return <MagazineSpread {...props} />;
    case 'timeline':
      return <TimelineVine {...props} />;
    case 'kenburns':
      return <KenBurns {...props} />;
    case 'bento':
      return <BentoGrid {...props} />;
    default:
      return <ParallaxScroll {...props} />;
  }
}

// ─────────────────────────────────────────────────────────────
// Back-compat mapping — old `layoutFormat` → new `storyLayout`
// The legacy Story Style picker wrote `manifest.layoutFormat` with
// values like 'cascade'/'scrapbook'/'starmap'. We keep honoring them
// so existing saved sites don't break when they switch to the unified
// StoryLayout renderer.
// ─────────────────────────────────────────────────────────────
export function layoutFormatToStoryLayout(
  layoutFormat: string | undefined | null,
): StoryLayoutType {
  switch (layoutFormat) {
    case 'cascade':
      return 'parallax';
    case 'filmstrip':
      return 'filmstrip';
    case 'magazine':
      return 'magazine';
    case 'scrapbook':
      return 'bento';
    case 'chapters':
      return 'timeline';
    case 'starmap':
      return 'kenburns';
    default:
      return 'parallax';
  }
}

/**
 * Resolve the canonical StoryLayoutType from a manifest, preferring the
 * new `storyLayout` field and falling back to the legacy `layoutFormat`.
 */
export function resolveStoryLayout(
  storyLayout: string | undefined | null,
  layoutFormat: string | undefined | null,
): StoryLayoutType {
  const VALID: StoryLayoutType[] = ['parallax', 'filmstrip', 'magazine', 'timeline', 'kenburns', 'bento'];
  if (storyLayout && VALID.includes(storyLayout as StoryLayoutType)) {
    return storyLayout as StoryLayoutType;
  }
  return layoutFormatToStoryLayout(layoutFormat);
}

// ─────────────────────────────────────────────────────────────
// StorySection — the canonical story-block renderer.
// Used by the editor preview, public sites, and preview routes so
// there is a SINGLE rendering path for chapters across the app.
// ─────────────────────────────────────────────────────────────

export interface StorySectionProps {
  chapters: Array<{
    id?: string;
    title: string;
    subtitle?: string;
    description?: string;
    date?: string;
    location?: { label?: string | null } | null;
    images?: Array<{ url: string; alt?: string; caption?: string }>;
  }>;
  /** The canonical layout type. Prefer passing this. */
  storyLayout?: StoryLayoutType | string;
  /** Legacy field from older drafts — used only as fallback. */
  layoutFormat?: string;
  /** VibeSkin fields we render between chapters. */
  chapterIcons?: string[];
  sectionBorderSvg?: string;
  medallionSvg?: string;
  /** Accent hex for medallion / icon / divider tint. */
  accentColor?: string;
  /**
   * Transform a raw photo URL (e.g. googleusercontent.com →
   * /api/photos/proxy?…). If omitted the URL is passed through as-is.
   */
  transformUrl?: (url: string) => string;
  /**
   * Intl date format used to render each chapter's date. Default is
   * a long "Month Day, Year" format if no preference is set.
   */
  dateFormat?: Intl.DateTimeFormatOptions;
  /**
   * When true, layouts mark title/subtitle/description with
   * `data-pe-editable="true"` so the editor's EditBridge can make them
   * contentEditable in-place.
   */
  editable?: boolean;
  /** VibeSkin font names — override the default heading/body fonts. */
  themeFonts?: { heading?: string; body?: string };
  /** VibeSkin cardStyle — override the default card appearance. */
  themeCardStyle?: CardStyle;
}

// Default format used when no user preference is provided.
const DEFAULT_CHAPTER_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
};

// User-configurable date format presets. The wizard / editor picker
// writes one of these keys to `manifest.dateFormat`; StorySection maps
// it to an Intl.DateTimeFormatOptions object here. `undefined` falls
// back to DEFAULT_CHAPTER_DATE_FORMAT.
export type ChapterDateFormatKey =
  | 'long'
  | 'short'
  | 'numeric'
  | 'iso'
  | 'month-year';

export const CHAPTER_DATE_FORMATS: Record<
  ChapterDateFormatKey,
  { label: string; example: string; options: Intl.DateTimeFormatOptions }
> = {
  long: {
    label: 'Long',
    example: 'January 15, 2024',
    options: { month: 'long', day: 'numeric', year: 'numeric' },
  },
  short: {
    label: 'Short',
    example: 'Jan 15, 2024',
    options: { month: 'short', day: 'numeric', year: 'numeric' },
  },
  numeric: {
    label: 'Numeric',
    example: '01/15/2024',
    options: { month: '2-digit', day: '2-digit', year: 'numeric' },
  },
  iso: {
    label: 'ISO',
    example: '2024-01-15',
    options: { year: 'numeric', month: '2-digit', day: '2-digit' },
  },
  'month-year': {
    label: 'Month & Year',
    example: 'January 2024',
    options: { month: 'long', year: 'numeric' },
  },
};

/** Resolve a preset key from StoryManifest into an Intl options object. */
export function chapterDateFormatOptions(
  key: ChapterDateFormatKey | string | undefined,
): Intl.DateTimeFormatOptions {
  if (!key) return DEFAULT_CHAPTER_DATE_FORMAT;
  const preset = CHAPTER_DATE_FORMATS[key as ChapterDateFormatKey];
  return preset ? preset.options : DEFAULT_CHAPTER_DATE_FORMAT;
}

export function StorySection({
  chapters,
  storyLayout,
  layoutFormat,
  chapterIcons = [],
  sectionBorderSvg,
  medallionSvg,
  accentColor,
  transformUrl,
  dateFormat = DEFAULT_CHAPTER_DATE_FORMAT,
  editable,
  themeFonts,
  themeCardStyle,
}: StorySectionProps) {
  const layoutType = resolveStoryLayout(storyLayout, layoutFormat);
  const tint = accentColor || '#18181B';

  // Apply vibeSkin fonts and card style for this render pass.
  // These module-level variables are updated so all child layout
  // components pick them up without needing explicit prop drilling.
  headingFont = fontStack(themeFonts?.heading, DEFAULT_HEADING_FONT);
  bodyFont = fontStack(themeFonts?.body, DEFAULT_BODY_FONT);
  glassCard = buildCardStyle(themeCardStyle);

  // Track how many chapters were already visible on the previous
  // render. New arrivals animate in; previously-shown chapters
  // don't re-animate, so the preview doesn't thrash every time
  // the user tweaks a field in the editor.
  const previousCountRef = useRef(0);
  const previousCount = previousCountRef.current;
  useEffect(() => {
    previousCountRef.current = chapters.length;
  }, [chapters.length]);

  return (
    <>
      {medallionSvg && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
          animate={{ opacity: 0.72, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: 96,
            height: 96,
            margin: '2rem auto 0',
            pointerEvents: 'none',
            color: tint,
          }}
          dangerouslySetInnerHTML={{ __html: medallionSvg }}
        />
      )}
      {chapters.map((chapter, chapterIndex) => {
        const icon = chapterIcons[chapterIndex];
        const photos = (chapter.images || []).map((img) => ({
          url: transformUrl ? transformUrl(img.url) : img.url,
          alt: img.alt,
          caption: img.caption,
        }));
        const locationLabel = chapter.location?.label || null;

        // Only newly-added chapters get the reveal animation.
        // Previously rendered chapters stay still so edits don't
        // trigger a full re-animate on every keystroke.
        const isNew = chapterIndex >= previousCount;
        const enterDelay = isNew
          ? Math.min((chapterIndex - previousCount) * 0.28, 1.4)
          : 0;

        return (
          <motion.div
            key={chapter.id || chapterIndex}
            // data-pe-chapter lets EditBridge walk up from a contenteditable
            // element and attribute edits to the right chapter id on save.
            data-pe-chapter={chapter.id}
            data-pe-section="chapter"
            data-pe-label={`Chapter ${chapterIndex + 1}`}
            className="pe-chapter-wrap"
            initial={isNew ? { opacity: 0, y: 40, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.7,
              delay: enterDelay,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ position: 'relative' }}
          >
            {/* ── Inline photo replace button — editor only ── */}
            {editable && (
              <button
                className="pe-photo-replace-btn"
                onClick={async (e) => {
                  e.stopPropagation();
                  const btn = e.currentTarget as HTMLButtonElement;
                  const chId = chapter.id;
                  const hasPhoto = photos.length > 0;
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (ev) => {
                    const file = (ev.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    const prev = btn.innerHTML;
                    btn.innerHTML = '<span style="opacity:0.7">Uploading…</span>';
                    btn.disabled = true;
                    try {
                      const fd = new FormData();
                      fd.append('file', file);
                      const res = await fetch('/api/upload', { method: 'POST', body: fd });
                      const json = await res.json();
                      if (json.url) {
                        window.dispatchEvent(new CustomEvent('pearloom-photo-replaced', {
                          detail: { chapterId: chId, imgIndex: 0, newUrl: json.url, newAlt: file.name, append: !hasPhoto },
                        }));
                      }
                    } finally {
                      btn.innerHTML = prev;
                      btn.disabled = false;
                    }
                  };
                  input.click();
                }}
                style={{
                  position: 'absolute', top: '14px', right: '14px', zIndex: 20,
                  padding: '5px 10px', borderRadius: '20px', border: 'none',
                  background: 'rgba(24,24,27,0.72)', backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#fff', fontSize: '0.62rem', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)', pointerEvents: 'auto',
                  fontFamily: 'system-ui, sans-serif',
                } as React.CSSProperties}
              >
                📷 {photos.length > 0 ? 'Replace Photo' : 'Add Photo'}
              </button>
            )}
            {icon && (
              <motion.div
                aria-hidden="true"
                initial={isNew ? { opacity: 0, scale: 0.7 } : false}
                animate={{ opacity: 0.85, scale: 1 }}
                transition={{
                  duration: 0.6,
                  delay: enterDelay + 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: 56,
                  height: 56,
                  margin: '3rem auto 0.5rem',
                  pointerEvents: 'none',
                  color: tint,
                }}
                dangerouslySetInnerHTML={{ __html: icon }}
              />
            )}
            <StoryLayout
              type={layoutType}
              photos={photos}
              title={chapter.title}
              subtitle={chapter.subtitle}
              body={chapter.description}
              date={chapter.date}
              location={locationLabel}
              dateFormat={dateFormat}
              editable={editable}
              index={chapterIndex}
            />
            {sectionBorderSvg && chapterIndex < chapters.length - 1 && (
              <motion.div
                aria-hidden="true"
                initial={isNew ? { opacity: 0, scaleX: 0.6 } : false}
                animate={{ opacity: 0.5, scaleX: 1 }}
                transition={{
                  duration: 0.7,
                  delay: enterDelay + 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: 'min(520px, 80%)',
                  height: 32,
                  margin: '2.5rem auto',
                  pointerEvents: 'none',
                  color: tint,
                }}
                dangerouslySetInnerHTML={{ __html: sectionBorderSvg }}
              />
            )}
          </motion.div>
        );
      })}
    </>
  );
}

export function StoryLayoutPicker({
  selected,
  onSelect,
}: {
  selected: StoryLayoutType;
  onSelect: (layout: StoryLayoutType) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '10px',
        width: '100%',
        margin: '0 auto',
        fontFamily: bodyFont,
      }}
    >
      {LAYOUT_OPTIONS.map((opt) => {
        const isSelected = selected === opt.type;
        return (
          <motion.button
            key={opt.type}
            type="button"
            onClick={() => onSelect(opt.type)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2, ease: ease.smooth }}
            style={{
              width: '100%',
              padding: '10px',
              background: isSelected ? '#F4F4F5' : '#FFFFFF',
              border: `2px solid ${isSelected ? '#18181B' : '#E4E4E7'}`,
              borderRadius: '10px',
              boxShadow: isSelected ? '0 0 0 1px #18181B' : '0 1px 2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: '6px',
              textAlign: 'center',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
            aria-pressed={isSelected}
            aria-label={`Select ${opt.label} layout`}
          >
            <MiniDiagram type={opt.type} />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: isSelected ? 600 : 500,
                color: isSelected ? '#18181B' : '#71717A',
                letterSpacing: '0.01em',
              }}
            >
              {opt.label}
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                color: '#A1A1AA',
                lineHeight: 1.3,
              }}
            >
              {opt.desc}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
