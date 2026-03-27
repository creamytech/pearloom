'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/generation-progress.tsx
// Cinematic Mood Board Loading Screen (#14 from audit)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { label: 'Clustering your photos by time & place...', pct: 12 },
  { label: 'Discovering your locations...', pct: 28 },
  { label: 'Analyzing your memories with the AI...', pct: 48 },
  { label: 'Crafting your intimate narrative...', pct: 65 },
  { label: 'Generating a theme that matches your vibe...', pct: 80 },
  { label: 'Assembling your editorial timeline...', pct: 92 },
  { label: 'Almost there — polishing the final details...', pct: 98 },
];

// Soft editorial words that float across the screen
const FLOATING_WORDS = [
  'memories', 'laughter', 'golden hour', 'home', 'together',
  'forever', 'first dance', 'sunday morning', 'adventure', 'love',
  'honeymoon', 'rooftop', 'winter', 'our song', 'the look',
];

interface GenerationProgressProps {
  step?: number;
}

export function GenerationProgress({ step = 0 }: GenerationProgressProps) {
  const currentStep = Math.min(step, STEPS.length - 1);
  const { label, pct } = STEPS[currentStep];
  const [words] = useState(() =>
    FLOATING_WORDS.sort(() => Math.random() - 0.5).slice(0, 10)
  );

  return (
    <div style={{
      position: 'relative',
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Ambient background orbs */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--eg-accent) 20%, transparent) 0%, transparent 70%)',
          top: '-20%', left: '-15%', filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--eg-accent) 12%, transparent) 0%, transparent 70%)',
          bottom: '-10%', right: '-10%', filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />

      {/* Floating editorial words */}
      {words.map((word, i) => (
        <motion.span
          key={word}
          initial={{ opacity: 0, y: 40 + i * 5 }}
          animate={{
            opacity: [0, 0.12, 0.08, 0],
            y: [40 + i * 5, -80 - i * 10],
          }}
          transition={{
            duration: 8 + i * 1.2,
            delay: i * 0.9,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            fontFamily: 'var(--eg-font-heading)',
            fontSize: `${1 + (i % 4) * 0.4}rem`,
            fontStyle: 'italic',
            color: 'var(--eg-fg)',
            left: `${10 + (i * 8) % 75}%`,
            top: `${20 + (i * 12) % 60}%`,
            userSelect: 'none',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {word}
        </motion.span>
      ))}

      {/* Core content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '520px', padding: '0 2rem' }}>
        {/* Pearloom logo mark — animated rings */}
        <motion.div
          style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 3rem' }}
        >
          {[1, 0.6, 0.3].map((opacity, i) => (
            <motion.div
              key={i}
              animate={{ rotate: i % 2 === 0 ? [0, 360] : [360, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 5 + i * 2, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', inset: `${i * 12}px`,
                borderRadius: '50%',
                border: `1.5px solid color-mix(in srgb, var(--eg-accent) ${Math.round(opacity * 80)}%, transparent)`,
              }}
            />
          ))}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'var(--eg-accent)', opacity: 0.85,
            }} />
          </div>
        </motion.div>

        {/* Step label */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: '1.5rem',
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'var(--eg-fg)',
              lineHeight: 1.5,
              marginBottom: '3rem',
            }}
          >
            {label}
          </motion.p>
        </AnimatePresence>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '2px', background: 'rgba(0,0,0,0.08)', borderRadius: '100px', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%', background: 'var(--eg-accent)', borderRadius: '100px' }}
          />
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem',
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--eg-muted)',
        }}>
          <span>Memory Engine</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}
