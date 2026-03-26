'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/hero.tsx
// Ultra-Premium Editorial Hero 
// ─────────────────────────────────────────────────────────────

import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useRef } from 'react';

interface HeroProps {
  names: [string, string];
  anniversaryLabel?: string;
  subtitle?: string;
  date?: string;
  coverPhoto?: string;
}

export function Hero({ names, anniversaryLabel = 'Two Years', subtitle, date, coverPhoto }: HeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  
  // Parallax effects
  const yImage = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacityText = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const yText = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  return (
    <section 
      ref={ref}
      style={{
        position: 'relative',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--eg-bg)'
      }}
    >
      {/* Editorial Full-Viewport Background */}
      {coverPhoto ? (
        <motion.div
          style={{
            position: 'absolute',
            inset: -20, // prevents edges showing during bounce
            y: yImage,
            backgroundImage: `url(${coverPhoto})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.7) contrast(1.1)',
          }}
        />
      ) : (
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            y: yImage,
            background: 'linear-gradient(to bottom right, var(--eg-accent-light), var(--eg-bg))',
          }}
        />
      )}

      {/* Noise Overlay for Film Aesthetic */}
      <div 
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.15,
          pointerEvents: 'none',
          mixBlendMode: 'overlay'
        }}
      />

      {/* Dark Vignette Overlay */}
      <div 
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Typography Content */}
      <motion.div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          opacity: opacityText,
          y: yText,
          padding: '0 2rem',
          color: coverPhoto ? '#ffffff' : 'var(--eg-fg)'
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
          style={{ 
            fontSize: '0.85rem', 
            letterSpacing: '0.3em', 
            textTransform: 'uppercase',
            marginBottom: '2rem',
            opacity: 0.8
          }}
        >
          {anniversaryLabel}
        </motion.div>

        <h1 
          style={{ 
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(3rem, 10vw, 7rem)',
            lineHeight: 1,
            fontWeight: 400,
            letterSpacing: '-0.03em',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <motion.span 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {names[0]}
          </motion.span>
          <motion.span 
            initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 1 }}
            style={{ 
              fontFamily: 'var(--eg-font-heading)',
              fontStyle: 'italic',
              fontSize: 'clamp(2rem, 6vw, 4rem)',
              color: coverPhoto ? 'rgba(255,255,255,0.7)' : 'var(--eg-accent)',
              margin: '-1rem 0'
            }}
          >
            &
          </motion.span>
          <motion.span 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {names[1]}
          </motion.span>
        </h1>

        {(subtitle || date) && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            style={{
              marginTop: '3rem',
              fontSize: '1rem',
              fontWeight: 300,
              letterSpacing: '0.05em',
              opacity: 0.9,
              fontFamily: 'var(--eg-font-body)'
            }}
          >
            {date && <span style={{ display: 'block', marginBottom: '0.5rem' }}>{date}</span>}
            {subtitle && <span>{subtitle}</span>}
          </motion.p>
        )}
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        style={{
          position: 'absolute',
          bottom: '3rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          color: coverPhoto ? 'rgba(255,255,255,0.6)' : 'var(--eg-muted)',
          zIndex: 20
        }}
      >
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Scroll down
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={18} strokeWidth={1.5} />
        </motion.div>
      </motion.div>
    </section>
  );
}
