'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/hero.tsx
// Ultra-Premium Cinematic Hero
// ─────────────────────────────────────────────────────────────

import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useRef } from 'react';

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
            visible: { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)',
              transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
}
import { CountdownWidget } from '@/components/countdown-widget';
import { VibeParticles } from '@/components/vibe/VibeParticles';
import type { VibeSkin } from '@/lib/vibe-engine';

interface HeroProps {
  names: [string, string];
  anniversaryLabel?: string;
  subtitle?: string;
  date?: string;
  coverPhoto?: string;
  weddingDate?: string;
  vibeSkin?: VibeSkin;
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

export function Hero({ names, anniversaryLabel, subtitle, date, coverPhoto, weddingDate, vibeSkin }: HeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const yImage = useTransform(scrollYProgress, [0, 1], ['0%', '28%']);
  const opacityImage = useTransform(scrollYProgress, [0, 1], [1, 0.1]);
  const yText = useTransform(scrollYProgress, [0, 1], ['0%', '45%']);
  const opacityText = useTransform(scrollYProgress, [0, 0.45], [1, 0]);

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--eg-bg)',
      }}
    >
      {/* ── Visual Backdrop ── */}
      {coverPhoto ? (
        <>
          <motion.div
            style={{
              position: 'absolute',
              inset: -80,
              y: yImage,
              opacity: opacityImage,
              backgroundImage: `url(${coverPhoto})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              filter: 'brightness(0.38) contrast(1.25) saturate(0.95)',
            }}
          />
          {/* Layered gradient system for deep editorial look */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 28%)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--eg-bg) 0%, rgba(0,0,0,0) 35%)', zIndex: 1, pointerEvents: 'none' }} />
          {/* Vignette — soft dark edges for a cinematic frame */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)', zIndex: 1, pointerEvents: 'none' }} />
          <FilmGrain />
        </>
      ) : (
        /* Stunning no-photo fallback: multi-tone gradient + noise + animated orbs */
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 20% 60%, var(--eg-accent-light) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, color-mix(in srgb, var(--eg-accent) 15%, transparent) 0%, transparent 55%), var(--eg-bg)',
          }} />
          <FilmGrain />
          {/* Animated soft orbs */}
          <motion.div
            animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', width: '700px', height: '700px', borderRadius: '50%',
              background: 'radial-gradient(circle, color-mix(in srgb, var(--eg-accent) 18%, transparent) 0%, transparent 70%)',
              top: '-15%', left: '-10%', filter: 'blur(60px)', zIndex: 0,
            }}
          />
          <motion.div
            animate={{ x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
            style={{
              position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
              background: 'radial-gradient(circle, color-mix(in srgb, var(--eg-accent) 10%, transparent) 0%, transparent 70%)',
              bottom: '-10%', right: '-10%', filter: 'blur(80px)', zIndex: 0,
            }}
          />
          {/* Fine dot grid */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1.2px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />
          {/* Vibe ambient particles over the no-photo gradient */}
          {vibeSkin && <VibeParticles particle={vibeSkin.particle} />}
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
          padding: '0 2rem',
          color: coverPhoto ? '#ffffff' : 'var(--eg-fg)',
          width: '100%',
          maxWidth: '1300px',
        }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Eyebrow label */}
        {anniversaryLabel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.45em',
              textTransform: 'uppercase',
              marginBottom: '3.5rem',
              opacity: coverPhoto ? 0.75 : 0.65,
              fontWeight: 700,
              color: coverPhoto ? 'rgba(255,255,255,0.9)' : 'var(--eg-accent)',
            }}
          >
            {anniversaryLabel}
          </motion.div>
        )}

        {/* Names */}
        <h1 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(4.5rem, 13vw, 10rem)',
          lineHeight: 0.88,
          fontWeight: 400,
          letterSpacing: '-0.025em',
          margin: '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <AnimatedName
            text={names[0]}
            delay={0.35}
            color={coverPhoto ? '#ffffff' : undefined}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.3, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.9 }}
            style={{
              fontFamily: 'var(--eg-font-heading)',
              fontStyle: 'italic',
              fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
              color: coverPhoto ? 'rgba(255,255,255,0.45)' : 'var(--eg-accent)',
              margin: '-1.8rem 0 -1.5rem',
              display: 'block',
            }}
          >
            &
          </motion.div>

          <AnimatedName
            text={names[1]}
            delay={names[0].length * 0.04 + 0.6}
            color={coverPhoto ? '#ffffff' : undefined}
          />
        </h1>

        {/* Subtitle / date row */}
        {(subtitle || date) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.6 }}
            style={{ marginTop: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}
          >
            {/* Ornamental divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '1px', background: coverPhoto ? 'rgba(255,255,255,0.3)' : 'var(--eg-accent)', opacity: 0.6 }} />
              <div style={{
                width: '5px', height: '5px', borderRadius: '0',
                background: coverPhoto ? 'rgba(255,255,255,0.5)' : 'var(--eg-accent)',
                transform: 'rotate(45deg)',
                opacity: 0.7,
              }} />
              <div style={{ width: '40px', height: '1px', background: coverPhoto ? 'rgba(255,255,255,0.3)' : 'var(--eg-accent)', opacity: 0.6 }} />
            </div>
            {subtitle && (
              <p style={{
                fontSize: '1.1rem',
                fontWeight: 300,
                letterSpacing: '0.08em',
                opacity: coverPhoto ? 0.88 : 0.75,
                fontFamily: 'var(--eg-font-body)',
                fontStyle: 'italic',
                margin: 0,
                lineHeight: 1.6,
              }}>
                {subtitle}
              </p>
            )}
            {date && (
              <span style={{
                display: 'block',
                fontSize: '0.72rem',
                opacity: 0.55,
                fontStyle: 'normal',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontWeight: 600,
                fontFamily: 'var(--eg-font-body)',
              }}>
                {date}
              </span>
            )}
          </motion.div>
        )}

        {/* Countdown widget — live ticker to wedding day */}
        {weddingDate && (
          <CountdownWidget targetDate={weddingDate} onPhoto={!!coverPhoto} />
        )}
      </motion.div>

      {/* ── Animated Scroll Indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
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
          color: coverPhoto ? 'rgba(255,255,255,0.38)' : 'var(--eg-muted)',
          zIndex: 20,
        }}
      >
        {/* Refined mouse-scroll icon */}
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
              background: coverPhoto ? 'rgba(255,255,255,0.8)' : 'currentColor',
            }}
          />
        </div>
        <span style={{ fontSize: '0.55rem', letterSpacing: '0.35em', textTransform: 'uppercase', fontWeight: 600, opacity: 0.45 }}>Scroll</span>
      </motion.div>
    </section>
  );
}
