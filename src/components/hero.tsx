'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/hero.tsx
// Ultra-Premium Cinematic Hero — full-bleed parallax, editorial
// typography, date/venue badge, poetry tagline
// ─────────────────────────────────────────────────────────────

import { motion, useScroll, useTransform, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { CountdownWidget } from '@/components/countdown-widget';
import { VibeParticles } from '@/components/vibe/VibeParticles';

import type { VibeSkin } from '@/lib/vibe-engine';
import { parseLocalDate } from '@/lib/date';
import { smartNameFontSize, getImageBrightness, textColorForBrightness } from '@/lib/smart-features';

interface HeroProps {
  names: [string, string];
  anniversaryLabel?: string;
  subtitle?: string;
  date?: string;
  venue?: string;
  coverPhoto?: string;
  weddingDate?: string;
  vibeSkin?: VibeSkin;
  heroTagline?: string; // from manifest.poetry?.heroTagline
  photos?: string[];
  editMode?: boolean;
  heroBadgeStyle?: 'pill' | 'outlined' | 'card' | 'minimal';
  heroCountdownStyle?: 'cards' | 'minimal' | 'large';
  heroTextColorOverride?: string;
}

// Letter-by-letter staggered name reveal
function AnimatedName({ text, delay = 0, color }: { text: string; delay?: number; color?: string }) {
  return (
    <motion.span
      style={{ display: 'inline-block', overflow: 'visible' }}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.04, delayChildren: delay } } }}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          style={{ display: 'inline-block', color }}
          variants={{
            hidden: { opacity: 0, y: 48, rotateX: -50, filter: 'blur(8px)' },
            visible: {
              opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)',
              transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
            },
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Animated film grain overlay via SVG turbulence
function FilmGrain() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.035, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}

// Format date for the badge: "June 14, 2025"
function formatDateBadge(dateStr: string): string {
  try {
    return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

export function Hero({ names, anniversaryLabel, subtitle, date, venue, coverPhoto, weddingDate, vibeSkin, heroTagline, photos, editMode, heroBadgeStyle, heroCountdownStyle, heroTextColorOverride }: HeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Editor mode: prefer explicit prop, fall back to DOM check (for legacy callers)
  const isEditorRef = useRef<boolean | null>(editMode ?? null);
  if (isEditorRef.current === null && typeof document !== 'undefined') {
    isEditorRef.current = !!document.querySelector('.pl-site-scope');
  }
  const isEditor = editMode ?? isEditorRef.current ?? false;

  // Scroll-based parallax — only works outside editor (viewport scroll)
  // In editor, the scroll container is different, so we disable parallax
  const { scrollYProgress } = useScroll({
    target: isEditor ? undefined : ref,
    offset: ['start start', 'end start'],
  });

  // Memory Film: multi-photo cycling with Ken Burns
  const [photoIdx, setPhotoIdx] = useState(0);
  const photoList = photos && photos.length > 1 ? photos : [coverPhoto].filter(Boolean) as string[];
  useEffect(() => {
    if (photoList.length <= 1) return;
    const interval = setInterval(() => setPhotoIdx(i => (i + 1) % photoList.length), 6500);
    return () => clearInterval(interval);
  }, [photoList.length]);

  // Ken Burns variations — each photo picks a different zoom/pan direction
  // so no two adjacent slides have the same movement
  const kenBurnsVariants = [
    { from: { scale: 1.0, x: '0%', y: '0%' }, to: { scale: 1.15, x: '-2%', y: '-1%' } },   // zoom in, drift up-left
    { from: { scale: 1.15, x: '0%', y: '0%' }, to: { scale: 1.0, x: '2%', y: '2%' } },     // zoom out, drift down-right
    { from: { scale: 1.08, x: '-2%', y: '0%' }, to: { scale: 1.2, x: '2%', y: '0%' } },    // pan right
    { from: { scale: 1.08, x: '2%', y: '0%' }, to: { scale: 1.2, x: '-2%', y: '0%' } },    // pan left
    { from: { scale: 1.0, x: '0%', y: '2%' }, to: { scale: 1.18, x: '0%', y: '-2%' } },    // pan up
  ];

  // Cover photo parallax: moves at ~0.4x scroll speed
  // In editor mode or reduced motion, use static values (no parallax)
  const disableParallax = isEditor || !!prefersReduced;
  const yImage = useTransform(scrollYProgress, [0, 1], disableParallax ? ['0%', '0%'] : ['0%', '40%']);
  const opacityImage = useTransform(scrollYProgress, [0, 1], disableParallax ? [1, 1] : [1, 0.1]);

  // Text layer fades out as user scrolls
  const yText = useTransform(scrollYProgress, [0, 1], disableParallax ? ['0%', '0%'] : ['0%', '45%']);
  const opacityText = useTransform(scrollYProgress, [0, 0.45], disableParallax ? [1, 1] : [1, 0]);

  const hasBadge = !!(date || weddingDate || venue);
  const badgeDateStr = weddingDate || date;
  // True when any photo is displayed — drives text/overlay color choices
  const hasPhoto = !!(coverPhoto || photoList.length > 0);
  // Illustrated hero (SVG data URI or API-generated) needs lighter overlay than real photos
  const isIllustratedHero = !!(coverPhoto && (coverPhoto.startsWith('data:image/svg') || coverPhoto.includes('/api/hero-art')));

  // Smart brightness detection: analyze cover photo to pick optimal text color
  const [photoBrightness, setPhotoBrightness] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    if (!coverPhoto || coverPhoto.startsWith('data:') || coverPhoto.includes('/api/hero-art')) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const brightness = getImageBrightness(img);
      if (brightness !== null) setPhotoBrightness(textColorForBrightness(brightness));
    };
    img.src = coverPhoto;
  }, [coverPhoto]);

  // Text color: override > auto (white on photos, theme ink on illustrated/no-photo hero)
  const heroTextColor = heroTextColorOverride || (hasPhoto && !isIllustratedHero ? '#ffffff' : 'var(--pl-ink)');
  const heroSecondaryColor = heroTextColorOverride
    ? `${heroTextColorOverride}cc`
    : hasPhoto ? 'rgba(255,255,255,0.8)' : 'var(--pl-olive)';

  return (
    <section
      ref={ref}
      aria-label="Hero"
      data-pe-section="hero"
      data-pe-label="Hero"
      style={{
        position: 'relative',
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--pl-cream)',
      }}
    >
      {/* Corner flourishes are rendered + wired to the inline editor by
          the SiteRenderer wrapper (see cornerFlourishSvg toolbar block).
          Keeping them here would duplicate the art and bypass the
          editor's edit/remove controls — so we intentionally omit them. */}

      {/* ── Visual Backdrop ── */}
      {(coverPhoto || photoList.length > 0) ? (
        <>
          {/* Full-bleed parallax cover photo at 0.4x scroll speed */}
          <motion.div
            className="pl-scroll-parallax"
            style={{
              position: 'absolute',
              inset: 0,
              y: yImage,
              willChange: 'transform',
              overflow: 'hidden',
            }}
          >
            {/* Render ALL photos stacked — each one crossfades in/out with its own Ken Burns */}
            {photoList.map((photo, i) => {
              const isActive = i === photoIdx;
              const variant = kenBurnsVariants[i % kenBurnsVariants.length];
              return (
                <motion.div
                  key={`${photo}-${i}`}
                  initial={false}
                  animate={{ opacity: isActive ? 1 : 0 }}
                  transition={{
                    opacity: { duration: prefersReduced ? 0 : 1.8, ease: [0.4, 0, 0.2, 1] },
                  }}
                  style={{
                    position: 'absolute', inset: 0,
                    willChange: 'opacity',
                  }}
                >
                  <motion.img
                    src={photo}
                    alt={names.join(' & ') + ' celebration'}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    initial={variant.from}
                    animate={isActive && !prefersReduced ? variant.to : variant.from}
                    transition={{
                      duration: 7,
                      ease: 'linear',
                    }}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '110%',
                      objectFit: 'cover', objectPosition: 'center top',
                      willChange: 'transform',
                    }}
                  />
                </motion.div>
              );
            })}
          </motion.div>

          {/* Slideshow progress indicators — only visible if multiple photos */}
          {photoList.length > 1 && (
            <div style={{
              position: 'absolute', bottom: 'clamp(24px, 5vh, 48px)', left: '50%',
              transform: 'translateX(-50%)', zIndex: 5,
              display: 'flex', gap: 8, alignItems: 'center',
              padding: '8px 14px', borderRadius: 100,
              background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              {photoList.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === photoIdx ? 24 : 6,
                    height: 6, borderRadius: 100,
                    background: i === photoIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                    transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Dark overlay — lighter for illustrated SVGs, stronger for real photos */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: isIllustratedHero
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.04) 35%, rgba(0,0,0,0.04) 55%, rgba(0,0,0,0.12) 100%)'
              : 'linear-gradient(to bottom, rgba(43,30,20,0.5) 0%, rgba(43,30,20,0.3) 35%, rgba(43,30,20,0.25) 55%, rgba(43,30,20,0.55) 100%)',
          }} />
          {/* Radial vignette for cinematic frame */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: isIllustratedHero
              ? 'radial-gradient(ellipse at center, transparent 50%, rgba(43,30,20,0.1) 100%)'
              : 'radial-gradient(ellipse at center, transparent 38%, rgba(43,30,20,0.4) 100%)',
          }} />
          <FilmGrain />
        </>
      ) : (
        /* No-photo fallback: gradient + orbs + ambient particles */
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 20% 60%, var(--pl-olive-mist) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, color-mix(in srgb, var(--pl-olive) 15%, transparent) 0%, transparent 55%), var(--pl-cream)',
          }} />
          <FilmGrain />

          {/* Soft orbs — static when reduced motion preferred */}
          <motion.div
            animate={prefersReduced ? {} : { x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', width: 'clamp(300px, 70vw, 700px)', height: 'clamp(300px, 70vw, 700px)', borderRadius: '50%',
              background: 'radial-gradient(circle, color-mix(in srgb, var(--pl-olive) 18%, transparent) 0%, transparent 70%)',
              top: '-15%', left: '-10%', filter: 'blur(60px)', zIndex: 0,
              willChange: 'transform', transform: 'translateZ(0)',
            }}
          />
          <motion.div
            animate={prefersReduced ? {} : { x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
            style={{
              position: 'absolute', width: 'clamp(260px, 60vw, 600px)', height: 'clamp(260px, 60vw, 600px)', borderRadius: '50%',
              background: 'radial-gradient(circle, color-mix(in srgb, var(--pl-olive) 10%, transparent) 0%, transparent 70%)',
              bottom: '-10%', right: '-10%', filter: 'blur(80px)', zIndex: 0,
              willChange: 'transform', transform: 'translateZ(0)',
            }}
          />

          {/* Fine dot grid */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(43,30,20,0.04) 1.2px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />

          {/* Vibe ambient particles */}
          {vibeSkin && <VibeParticles particle={vibeSkin.particle} />}

          {/* Subtle accent orb — bottom-right, no cover photo only */}
          <motion.div
            animate={prefersReduced ? {} : { scale: [1, 1.08, 1], opacity: [0.06, 0.09, 0.06] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', bottom: '-40px', right: '-40px',
              width: '300px', height: '300px', borderRadius: '50%',
              background: 'radial-gradient(circle, var(--pl-olive) 0%, transparent 70%)',
              zIndex: 1, pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* ── Typographic Core ── */}
      <motion.div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          opacity: opacityText,
          y: yText,
          padding: '0 clamp(1rem, 5vw, 2rem)',
          color: heroTextColor,
          width: '100%',
          maxWidth: '1300px',
        }}
        initial={isEditor ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: isEditor ? 0 : 1.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Eyebrow label */}
        {anniversaryLabel && (
          <motion.div
            initial={isEditor ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: isEditor ? 0 : 1, delay: isEditor ? 0 : 0.2 }}
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.45em',
              textTransform: 'uppercase',
              marginBottom: '3.5rem',
              opacity: hasPhoto ? 0.75 : 0.65,
              fontWeight: 700,
              color: hasPhoto ? heroTextColor : 'var(--pl-olive)',
            }}
          >
            {anniversaryLabel}
          </motion.div>
        )}

        {/* Names — smart-scaled cinematic typography */}
        <h1
          data-pe-editable="true"
          data-pe-field="names"
          className="pl-name-glow"
          style={{
            fontFamily: 'var(--pl-font-heading)',
            fontSize: smartNameFontSize(
              names[1] ? [names[0], names[1]].reduce((a, b) => a.length > b.length ? a : b) : names[0]
            ),
            lineHeight: 0.95,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: '-0.04em',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: heroTextColor,
            textShadow: hasPhoto ? '0 2px 20px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)' : 'none',
            animationDelay: '1.2s',
          }}>
          <AnimatedName
            text={names[0]}
            delay={0.35}
            color={hasPhoto ? heroTextColor : undefined}
          />

          {/* "&" and second name — only for two-person occasions (not birthday/solo) */}
          {names[1] && (
            <>
              <motion.div
                initial={isEditor ? false : { opacity: 0, scale: 0.3, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.9 }}
                style={{
                  fontFamily: 'var(--pl-font-heading)',
                  fontStyle: 'italic',
                  fontWeight: 300,
                  fontSize: 'clamp(2.2rem, 5.5vw, 5rem)',
                  color: heroSecondaryColor,
                  margin: '-0.5rem 0 -0.3rem',
                  display: 'block',
                  letterSpacing: '0.02em',
                }}
              >
                &amp;
              </motion.div>

              <AnimatedName
                text={names[1]}
                delay={names[0].length * 0.04 + 0.6}
                color={hasPhoto ? heroTextColor : undefined}
              />
            </>
          )}
        </h1>

        {/* Date + venue badge — style variants */}
        {hasBadge && (() => {
          const bs = heroBadgeStyle ?? 'pill';
          const badgeStyles: Record<string, React.CSSProperties> = {
            pill: {
              display: 'inline-flex', alignItems: 'center', gap: '0.5em',
              padding: '0.6rem 1.75rem', borderRadius: '100px',
              background: hasPhoto ? 'rgba(0,0,0,0.25)' : 'rgba(163,177,138,0.12)',
              backdropFilter: 'blur(16px)',
              border: hasPhoto ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(163,177,138,0.22)',
            },
            outlined: {
              display: 'inline-flex', alignItems: 'center', gap: '0.5em',
              padding: '0.55rem 1.5rem', borderRadius: '100px',
              background: 'transparent',
              border: `1.5px solid ${heroTextColor}`,
            },
            card: {
              display: 'inline-flex', alignItems: 'center', gap: '0.75em',
              padding: '0.75rem 2rem', borderRadius: '12px',
              background: hasPhoto ? 'rgba(0,0,0,0.35)' : 'rgba(245,241,232,0.7)',
              backdropFilter: 'blur(20px)',
              border: 'none',
              boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
            },
            minimal: {
              display: 'inline-flex', alignItems: 'center', gap: '0.6em',
              padding: '0',
              background: 'transparent', border: 'none',
            },
          };
          return (
            <motion.div
              initial={isEditor ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.6 }}
              style={{ marginTop: '3.5rem', display: 'flex', justifyContent: 'center' }}
            >
              <span style={{
                ...badgeStyles[bs],
                fontSize: 'clamp(0.7rem, 2vw, 0.8rem)',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: heroTextColor,
                fontFamily: 'var(--pl-font-body)',
              }}>
                {badgeDateStr && <><span style={{ opacity: 0.5 }}>·</span> <span data-pe-badge-date="true">{formatDateBadge(badgeDateStr)}</span> </>}
                {venue && <><span style={{ opacity: 0.5 }}>·</span> <span data-pe-badge-venue="true">{venue}</span> </>}
                {(badgeDateStr || venue) && <span style={{ opacity: 0.5 }}>·</span>}
              </span>
            </motion.div>
          );
        })()}

        {/* Poetry tagline — word-by-word stagger reveal */}
        {heroTagline && (
          <motion.p
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.12, delayChildren: 2.1 } } }}
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontStyle: 'italic',
              fontSize: '1.1rem',
              lineHeight: 1.65,
              color: heroSecondaryColor,
              marginTop: '1.25rem',
              letterSpacing: '0.02em',
            }}
            data-pe-editable="true"
            data-pe-path="poetry.heroTagline"
            data-pe-section="hero"
          >
            {heroTagline.split(' ').map((word, i) => (
              <motion.span
                key={i}
                style={{ display: 'inline-block', marginRight: '0.28em' }}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
                }}
              >
                {word}
              </motion.span>
            ))}
          </motion.p>
        )}

        {/* Legacy subtitle */}
        {subtitle && !heroTagline && (
          <motion.p
            initial={isEditor ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.9 }}
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontStyle: 'italic',
              fontSize: '1.1rem',
              lineHeight: 1.65,
              color: heroSecondaryColor,
              marginTop: '1.25rem',
              letterSpacing: '0.02em',
            }}
          >
            <span data-pe-editable="true" data-pe-field="subtitle">{subtitle}</span>
          </motion.p>
        )}

        {/* Ornamental divider — shown if any text below names */}
        {(hasBadge || heroTagline || subtitle) && (
          <motion.div
            initial={isEditor ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 2.1 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginTop: '2rem' }}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 2.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '40px', height: '1px', background: heroSecondaryColor, opacity: 0.5, transformOrigin: 'right' }}
            />
            <motion.div
              initial={{ scale: 0, rotate: 90 }}
              animate={{ scale: 1, rotate: 45 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 2.45 }}
              style={{
                width: '5px', height: '5px', borderRadius: '0',
                background: heroSecondaryColor,
                opacity: 0.65,
              }}
            />
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 2.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '40px', height: '1px', background: heroSecondaryColor, opacity: 0.5, transformOrigin: 'left' }}
            />
          </motion.div>
        )}

        {/* Countdown widget — live ticker to wedding day */}
        {weddingDate && (
          <CountdownWidget
            targetDate={weddingDate}
            onPhoto={!!coverPhoto}
            countdownStyle={heroCountdownStyle}
          />
        )}
      </motion.div>

    </section>
  );
}
