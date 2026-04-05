'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/mood-decorator.tsx
// Context-Driven Animated SVG Decorators
// The AI's mood + location tags drive unique, hand-crafted
// SVG animations baked into each chapter — our key differentiator.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';

type MoodDecoratorProps = {
  mood?: string;
  location?: string;
  light?: boolean; // dark/light background context
};

// ── Mood → category mapping ──
function getMoodCategory(mood: string, location: string): string {
  const m = (mood + ' ' + location).toLowerCase();

  if (/beach|ocean|sea|coast|island|tropical|surf|wave/.test(m)) return 'coastal';
  if (/winter|snow|cold|ice|christmas|holiday|frost/.test(m)) return 'winter';
  if (/golden|sunset|sunrise|dusk|dawn|hour|glow/.test(m)) return 'golden-hour';
  if (/forest|garden|nature|floral|botanical|bloom|flower|spring|park/.test(m)) return 'nature';
  if (/city|urban|rooftop|skyline|street|downtown|metro/.test(m)) return 'urban';
  if (/romantic|love|intimate|candlelight|dinner|proposal|anniversary/.test(m)) return 'romantic';
  if (/adventure|hike|mountain|travel|road|explore|journey/.test(m)) return 'adventure';
  if (/cozy|home|warm|fireside|rainy|sunday|morning|coffee/.test(m)) return 'cozy';
  if (/dance|music|celebration|party|laugh|joy|festival/.test(m)) return 'festive';
  return 'default';
}

// ── COASTAL: Animated sine waves ──
function CoastalDecorator({ light }: { light: boolean }) {
  return (
    <svg
      viewBox="0 0 800 80"
      style={{ width: '100%', height: '40px', overflow: 'visible', opacity: light ? 0.15 : 0.12 }}
      preserveAspectRatio="none"
    >
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d="M0 40 Q100 20 200 40 T400 40 T600 40 T800 40"
          fill="none"
          stroke={light ? 'white' : 'var(--pl-olive)'}
          strokeWidth={1.5 - i * 0.4}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2 + i * 0.5, ease: 'easeInOut', delay: i * 0.3 }}
          style={{ translateY: i * 8 }}
        />
      ))}
      <motion.circle
        cx="400" cy="40" r="3"
        fill={light ? 'white' : 'var(--pl-olive)'}
        animate={{ cx: [0, 800], cy: [40, 20, 40, 60, 40] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        opacity={0.4}
      />
    </svg>
  );
}

// ── WINTER: Particle snowflakes ──
const SNOWFLAKE_PATHS = ['M0,-6 L0,6 M-6,0 L6,0 M-4,-4 L4,4 M-4,4 L4,-4', 'M0,-5 L0,5 M-5,0 L5,0 M-3,-3 L3,3 M-3,3 L3,-3'];
function WinterDecorator({ light }: { light: boolean }) {
  const flakes = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      x: (i * 67 + 20) % 100,
      delay: i * 0.4,
      size: 6 + (i % 4) * 2,
      path: SNOWFLAKE_PATHS[i % 2],
      duration: 3 + (i % 5),
    })), []
  );
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {flakes.map((f, i) => (
        <motion.svg
          key={i}
          viewBox="-8 -8 16 16"
          width={f.size}
          height={f.size}
          style={{ position: 'absolute', left: `${f.x}%`, top: '-20px' }}
          animate={{ y: ['0vh', '110%'], rotate: [0, 360], opacity: [0, 0.6, 0] }}
          transition={{ duration: f.duration, delay: f.delay, repeat: Infinity, ease: 'linear' }}
        >
          <path d={f.path} stroke={light ? 'var(--pl-ink-soft)' : 'var(--pl-olive)'} strokeWidth="1" fill="none" />
        </motion.svg>
      ))}
    </div>
  );
}

// ── GOLDEN HOUR: Sunburst ray animation ──
function GoldenHourDecorator({ light }: { light: boolean }) {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <div style={{ position: 'absolute', top: '-60px', right: light ? '5%' : '8%', pointerEvents: 'none', zIndex: 0 }}>
      <motion.svg
        viewBox="-80 -80 160 160"
        style={{ width: '160px', height: '160px', opacity: light ? 0.12 : 0.08 }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        {rays.map((angle, i) => (
          <motion.line
            key={i}
            x1="0" y1="18"
            x2="0" y2={30 + (i % 3) * 8}
            stroke={light ? 'white' : 'var(--pl-olive)'}
            strokeWidth={i % 3 === 0 ? 1.5 : 0.8}
            transform={`rotate(${angle})`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: [0.4, 1, 0.4] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
          />
        ))}
        <circle cx="0" cy="0" r="12" fill={light ? 'var(--pl-muted)' : 'rgba(201,168,124,0.2)'} />
      </motion.svg>
    </div>
  );
}

// ── NATURE: Floating petals/leaves ──
const LEAF_PATHS = [
  'M0,0 C5,-10 15,-8 10,0 C15,8 5,10 0,0Z',
  'M0,-12 C8,-8 10,0 0,12 C-10,0 -8,-8 0,-12Z',
];
function NatureDecorator({ light }: { light: boolean }) {
  const petals = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    x: (i * 13 + 10) % 90,
    delay: i * 0.7,
    scale: 0.4 + (i % 3) * 0.3,
    path: LEAF_PATHS[i % 2],
    dur: 8 + (i % 4) * 2,
  })), []);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {petals.map((p, i) => (
        <motion.svg
          key={i}
          viewBox="-15 -15 30 30"
          width={20}
          height={20}
          style={{ position: 'absolute', left: `${p.x}%`, top: '-30px', transformOrigin: 'center' }}
          animate={{ y: ['0', '120%'], x: [0, 20, -20, 10, 0], rotate: [0, 180, 360], opacity: [0, 0.5, 0.3, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d={p.path} fill={light ? 'var(--pl-ink-soft)' : 'var(--pl-olive)'} opacity={0.5} scale={p.scale} />
        </motion.svg>
      ))}
    </div>
  );
}

// ── URBAN: Grid scan lines + data glyphs ──
function UrbanDecorator({ light }: { light: boolean }) {
  const lines = Array.from({ length: 6 }, (_, i) => i);
  return (
    <svg
      viewBox="0 0 800 60"
      style={{ width: '100%', height: '30px', opacity: light ? 0.1 : 0.07 }}
      preserveAspectRatio="none"
    >
      {lines.map((i) => (
        <motion.line
          key={i}
          x1={i * 140}
          y1="0"
          x2={i * 140}
          y2="60"
          stroke={light ? 'white' : 'var(--pl-ink)'}
          strokeWidth="0.5"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: [0, 1, 0] }}
          transition={{ duration: 2, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <motion.line
        x1="0" y1="30" x2="800" y2="30"
        stroke={light ? 'white' : 'var(--pl-olive)'}
        strokeWidth="0.8"
        strokeDasharray="4 8"
        animate={{ strokeDashoffset: [0, -48] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

// ── ROMANTIC: Floating hearts ──
const HEART = 'M0,-4 C0,-8 -6,-10 -8,-6 C-12,0 -6,4 0,10 C6,4 12,0 8,-6 C6,-10 0,-8 0,-4Z';
function RomanticDecorator({ light }: { light: boolean }) {
  const hearts = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    x: (i * 14 + 5) % 90, size: 8 + (i % 3) * 4, delay: i * 0.9, dur: 5 + (i % 3) * 2,
  })), []);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {hearts.map((h, i) => (
        <motion.svg key={i} viewBox="-14 -14 28 28" width={h.size} height={h.size}
          style={{ position: 'absolute', left: `${h.x}%`, bottom: '-10px' }}
          animate={{ y: [0, -120], opacity: [0, 0.4, 0], scale: [0.5, 1, 0.8] }}
          transition={{ duration: h.dur, delay: h.delay, repeat: Infinity, ease: 'easeOut' }}
        >
          <path d={HEART} fill={light ? 'var(--pl-ink-soft)' : 'var(--pl-olive)'} />
        </motion.svg>
      ))}
    </div>
  );
}

// ── ADVENTURE: Animated topographic lines ──
function AdventureDecorator({ light }: { light: boolean }) {
  const contours = [
    'M0 50 Q200 30 400 50 T800 50',
    'M0 40 Q200 20 400 40 T800 40',
    'M0 60 Q200 45 400 60 T800 60',
  ];
  return (
    <svg viewBox="0 0 800 80" style={{ width: '100%', height: '40px', opacity: light ? 0.15 : 0.1 }} preserveAspectRatio="none">
      {contours.map((d, i) => (
        <motion.path
          key={i} d={d} fill="none"
          stroke={light ? 'white' : 'var(--pl-olive)'}
          strokeWidth={0.8}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 2.5 + i * 0.5, delay: i * 0.4, ease: 'easeInOut' }}
        />
      ))}
    </svg>
  );
}

// ── COZY: Smoke/steam curl ──
function CozyDecorator({ light }: { light: boolean }) {
  return (
    <div style={{ position: 'absolute', top: 0, right: '10%', pointerEvents: 'none' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            right: i * 10,
            bottom: 0,
            width: '2px',
            height: '40px',
            background: `linear-gradient(to top, ${light ? 'var(--pl-muted)' : 'rgba(201,168,124,0.3)'}, transparent)`,
            borderRadius: '2px',
            transformOrigin: 'bottom',
          }}
          animate={{ scaleY: [0.4, 1, 0.4], x: [0, i % 2 === 0 ? 8 : -8, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── FESTIVE: Confetti burst ──
const CONFETTI_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
function FestiveDecorator({ light }: { light: boolean }) {
  const pieces = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    x: (i * 7 + 3) % 96, color: CONFETTI_COLORS[i % 5], delay: i * 0.3, dur: 4 + (i % 4),
    shape: i % 3 === 0 ? 'circle' : 'rect',
  })), []);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', opacity: light ? 0.5 : 0.35 }}>
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute', left: `${p.x}%`, top: '-10px',
            width: p.shape === 'circle' ? '6px' : '8px',
            height: p.shape === 'circle' ? '6px' : '4px',
            borderRadius: p.shape === 'circle' ? '50%' : '1px',
            background: p.color,
          }}
          animate={{ y: ['0', '120%'], rotate: [0, 360 * (i % 2 === 0 ? 1 : -1)], opacity: [0, 1, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

// ── DEFAULT: Animated ink stroke divider ──
function DefaultDecorator({ light }: { light: boolean }) {
  return (
    <svg viewBox="0 0 400 20" style={{ width: '100%', maxWidth: '300px', height: '12px', opacity: light ? 0.2 : 0.15, display: 'block', margin: '0 auto' }}>
      <motion.path
        d="M0 10 C80 4 160 16 240 10 C280 7 320 13 400 10"
        fill="none"
        stroke={light ? 'white' : 'var(--pl-olive)'}
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
      />
    </svg>
  );
}

// ── Main Decorator ──
export function MoodDecorator({ mood = '', location = '', light = false }: MoodDecoratorProps) {
  const category = useMemo(() => getMoodCategory(mood, location), [mood, location]);

  const props = { light };

  switch (category) {
    case 'coastal': return <CoastalDecorator {...props} />;
    case 'winter': return <WinterDecorator {...props} />;
    case 'golden-hour': return <GoldenHourDecorator {...props} />;
    case 'nature': return <NatureDecorator {...props} />;
    case 'urban': return <UrbanDecorator {...props} />;
    case 'romantic': return <RomanticDecorator {...props} />;
    case 'adventure': return <AdventureDecorator {...props} />;
    case 'cozy': return <CozyDecorator {...props} />;
    case 'festive': return <FestiveDecorator {...props} />;
    default: return <DefaultDecorator {...props} />;
  }
}

// ── Chapter Section Header with Mood Decorator ──
export function MoodDecoratedHeader({
  title,
  subtitle,
  mood,
  location,
  date,
  light = false,
}: {
  title: string;
  subtitle?: string;
  mood?: string;
  location?: string;
  date?: string;
  light?: boolean;
}) {
  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
  const textColor = light ? 'var(--pl-ink)' : 'var(--pl-ink)';
  const mutedColor = light ? 'var(--pl-ink-soft)' : 'var(--pl-muted)';

  return (
    <div style={{ position: 'relative', marginBottom: '2rem' }}>
      {/* Date badge */}
      {formattedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: light ? 'var(--pl-ink-soft)' : 'var(--pl-olive)',
            marginBottom: '1rem', display: 'block',
          }}
        >
          {formattedDate}
        </motion.div>
      )}

      {/* Mood badge + decorator */}
      {mood && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ marginBottom: '0.75rem' }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', padding: '0.25rem 0.75rem',
            borderRadius: '100px',
            background: light ? 'rgba(0,0,0,0.06)' : 'var(--pl-plum-mist)',
            color: light ? 'var(--pl-ink)' : 'var(--pl-plum)',
            border: light ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(109,89,122,0.12)',
          }}>
            {mood}
          </span>
        </motion.div>
      )}

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        style={{
          fontFamily: 'var(--pl-font-heading)',
          fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
          fontWeight: 400,
          letterSpacing: '-0.025em',
          color: textColor,
          lineHeight: 1.05,
          marginBottom: subtitle ? '1rem' : '1.5rem',
        }}
      >
        {title}
      </motion.h2>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.25 }}
          style={{
            fontFamily: 'var(--pl-font-body)',
            fontSize: '1.05rem',
            fontStyle: 'italic',
            color: mutedColor,
            lineHeight: 1.7,
            marginBottom: '1.5rem',
          }}
        >
          {subtitle}
        </motion.p>
      )}

      {/* Context-driven line decorator */}
      <MoodDecorator mood={mood} location={location} light={light} />
    </div>
  );
}
