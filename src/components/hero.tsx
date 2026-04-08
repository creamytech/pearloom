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

export function Hero({ names, anniversaryLabel, subtitle, date, venue, coverPhoto, weddingDate, vibeSkin, heroTagline, photos, editMode }: HeroProps) {
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

  // Memory Film: multi-photo cycling
  const [photoIdx, setPhotoIdx] = useState(0);
  const photoList = photos && photos.length > 1 ? photos : [coverPhoto].filter(Boolean) as string[];
  useEffect(() => {
    if (photoList.length <= 1) return;
    const interval = setInterval(() => setPhotoIdx(i => (i + 1) % photoList.length), 4500);
    return () => clearInterval(interval);
  }, [photoList.length]);

  // Cover photo parallax: moves at ~0.4x scroll speed
  // In editor mode, use static values (no parallax)
  const yImage = useTransform(scrollYProgress, [0, 1], isEditor ? ['0%', '0%'] : ['0%', '40%']);
  const opacityImage = useTransform(scrollYProgress, [0, 1], isEditor ? [1, 1] : [1, 0.1]);

  // Text layer fades out as user scrolls
  const yText = useTransform(scrollYProgress, [0, 1], isEditor ? ['0%', '0%'] : ['0%', '45%']);
  const opacityText = useTransform(scrollYProgress, [0, 0.45], isEditor ? [1, 1] : [1, 0]);

  const hasBadge = !!(date || weddingDate || venue);
  const badgeDateStr = weddingDate || date;
  // True when any photo is displayed — drives text/overlay color choices
  const hasPhoto = !!(coverPhoto || photoList.length > 0);

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

  // Resolved text color: brightness-aware when photo analyzed, fallback to hasPhoto logic
  const heroTextColor = hasPhoto
    ? (photoBrightness === 'dark' ? '#1C1C1C' : '#ffffff')
    : 'var(--pl-ink)';
  const heroSecondaryColor = hasPhoto
    ? (photoBrightness === 'dark' ? 'var(--pl-ink-soft)' : 'rgba(255,255,255,0.75)')
    : 'var(--pl-olive)';

  return (
    <section
      ref={ref}
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
      {/* ── Corner Flourish Decorations (personalized SVG art) ── */}
      {vibeSkin?.cornerFlourishSvg && (
        <>
          {/* Top-left corner */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', top: 0, left: 0, zIndex: 2,
              width: 'min(35vw, 280px)', height: 'min(35vw, 280px)',
              pointerEvents: 'none',
              opacity: 0.7,
            }}
            dangerouslySetInnerHTML={{ __html: vibeSkin.cornerFlourishSvg }}
          />
          {/* Top-right corner (mirrored) */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', top: 0, right: 0, zIndex: 2,
              width: 'min(35vw, 280px)', height: 'min(35vw, 280px)',
              pointerEvents: 'none',
              opacity: 0.7,
              transform: 'scaleX(-1)',
            }}
            dangerouslySetInnerHTML={{ __html: vibeSkin.cornerFlourishSvg }}
          />
          {/* Bottom-left corner (flipped vertically) */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', bottom: 0, left: 0, zIndex: 2,
              width: 'min(30vw, 240px)', height: 'min(30vw, 240px)',
              pointerEvents: 'none',
              opacity: 0.5,
              transform: 'scaleY(-1)',
            }}
            dangerouslySetInnerHTML={{ __html: vibeSkin.cornerFlourishSvg }}
          />
          {/* Bottom-right corner (flipped both) */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', bottom: 0, right: 0, zIndex: 2,
              width: 'min(30vw, 240px)', height: 'min(30vw, 240px)',
              pointerEvents: 'none',
              opacity: 0.5,
              transform: 'scale(-1, -1)',
            }}
            dangerouslySetInnerHTML={{ __html: vibeSkin.cornerFlourishSvg }}
          />
        </>
      )}

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
            }}
          >
            <AnimatePresence mode="sync">
              <motion.img
                key={photoIdx}
                src={photoList[photoIdx]}
                alt=""
                initial={isEditor ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2 }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '110%', objectFit: 'cover', objectPosition: 'center top' }}
              />
            </AnimatePresence>
          </motion.div>

          {/* Dark gradient: transparent top → rgba(43,30,20,0.3) bottom — text readability */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(43,30,20,0.1) 0%, transparent 30%, rgba(43,30,20,0.3) 100%)',
          }} />
          {/* Top vignette */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(43,30,20,0.45) 0%, transparent 22%)',
          }} />
          {/* Radial vignette for cinematic frame */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, transparent 38%, rgba(43,30,20,0.4) 100%)',
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
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1.2px, transparent 0)',
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
              color: hasPhoto ? 'var(--pl-ink)' : 'var(--pl-olive)',
            }}
          >
            {anniversaryLabel}
          </motion.div>
        )}

        {/* Names — smart-scaled cinematic typography */}
        <h1
          data-pe-editable="true"
          data-pe-field="names"
          style={{
            fontFamily: 'var(--pl-font-heading)',
            fontSize: smartNameFontSize(
              names[1] ? [names[0], names[1]].reduce((a, b) => a.length > b.length ? a : b) : names[0]
            ),
            lineHeight: 0.88,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: '-0.04em',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: heroTextColor,
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
                  margin: '-1.6rem 0 -1.4rem',
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

        {/* Date + venue pill badge */}
        {hasBadge && (
          <motion.div
            initial={isEditor ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.6 }}
            style={{ marginTop: '3.5rem', display: 'flex', justifyContent: 'center' }}
          >
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5em',
              padding: '0.6rem 1.75rem',
              borderRadius: '100px',
              background: hasPhoto ? 'rgba(255,255,255,0.12)' : 'rgba(163,177,138,0.12)',
              backdropFilter: 'blur(12px)',
              border: hasPhoto ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(163,177,138,0.22)',
              fontSize: '0.7rem',
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
        )}

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
            data-pe-field="heroTagline"
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
          <CountdownWidget targetDate={weddingDate} onPhoto={!!coverPhoto} />
        )}
      </motion.div>

      {/* ── Animated Scroll Indicator ── */}
      <motion.div
        initial={isEditor ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1.2 }}
        style={{
          position: 'absolute',
          bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.6rem',
          color: heroSecondaryColor,
          zIndex: 20,
        }}
      >
        {/* Mouse-scroll icon */}
        <div style={{
          width: '22px', height: '34px', borderRadius: '11px',
          border: `1.5px solid ${coverPhoto ? 'rgba(255,255,255,0.28)' : 'currentColor'}`,
          display: 'flex', justifyContent: 'center', paddingTop: '6px',
          opacity: 0.55,
        }}>
          <motion.div
            animate={{ y: [0, 8, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: '3px', height: '6px', borderRadius: '2px',
              background: coverPhoto ? 'var(--pl-ink)' : 'currentColor',
            }}
          />
        </div>
        <span style={{
          fontSize: '0.55rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          fontWeight: 600,
          opacity: 0.45,
        }}>
          Scroll
        </span>
      </motion.div>
    </section>
  );
}
