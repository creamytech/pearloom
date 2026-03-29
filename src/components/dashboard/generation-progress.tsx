'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/generation-progress.tsx
// Cinematic full-screen generation experience — The Atelier
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Pass descriptors (maps to engine passes 1–7 + init) ───────
const PASSES = [
  {
    headline: 'Listening...',
    copy: 'Reading every photo, every place, every quiet moment you shared.',
    meta: 'Memory Engine · Initialising',
    pct: 5,
  },
  {
    headline: 'Writing your story.',
    copy: 'Weaving your memories into an intimate narrative — chapters only you could have lived.',
    meta: 'Memory Engine · Pass 1 of 7 · Story generation',
    pct: 20,
  },
  {
    headline: 'Every word, considered.',
    copy: "Reading every line back — making sure it feels real, specific, and unmistakably yours.",
    meta: 'Memory Engine · Pass 2 of 7 · Quality refinement',
    pct: 34,
  },
  {
    headline: 'Learning who you are.',
    copy: 'Identifying the details that make you uniquely you — the little things that define a relationship.',
    meta: 'Memory Engine · Pass 3 of 7 · Couple DNA',
    pct: 47,
  },
  {
    headline: 'Designing your world.',
    copy: 'A colour palette, typography, and visual identity — crafted entirely around your vibe.',
    meta: 'Memory Engine · Pass 4 of 7 · Visual identity',
    pct: 61,
  },
  {
    headline: 'Painting your canvas.',
    copy: 'AI-generated imagery, made for this moment and no other.',
    meta: 'Memory Engine · Pass 5 of 7 · Custom artwork',
    pct: 74,
  },
  {
    headline: 'Refining the details.',
    copy: 'Colours balanced, proportions harmonised, emotions calibrated just right.',
    meta: 'Memory Engine · Pass 6 of 7 · Design critique',
    pct: 86,
  },
  {
    headline: 'Finding the words.',
    copy: 'A tagline, a closing line, a welcome in your own voice. The final poetry.',
    meta: 'Memory Engine · Pass 7 of 7 · Poetry',
    pct: 95,
  },
];

// ── Story glimpse lines — revealed typewriter-style per pass ──
const GLIMPSE_LINES = [
  '"It started with a glance — the kind neither of them could explain afterward."',
  '"They ordered the same thing. The universe was not being subtle."',
  '"She said yes. The world shifted quietly on its axis."',
  '"Some loves announce themselves loudly. Theirs arrived like a slow, golden afternoon."',
  '"Every photo holds a chapter. Every chapter holds the truth."',
  '"The small moments, it turns out, were never small at all."',
  '"Years later, they could still describe the exact quality of the light."',
  '"Home became less a place and more a person."',
];

// Typewriter component — streams text character by character
function TypewriterText({ text, speed = 24 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDisplayed(textRef.current.slice(0, i));
      if (i >= textRef.current.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]);

  return (
    <>
      {displayed}
      {displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ display: 'inline-block', width: '1px', height: '1em', background: 'rgba(250,247,242,0.4)', marginLeft: '1px', verticalAlign: 'text-bottom' }}
        />
      )}
    </>
  );
}

// ── Editorial words that drift across the screen ──────────────
const WORDS = [
  'forever', 'golden hour', 'together', 'laughter', 'home',
  'the look', 'our song', 'first dance', 'sunday morning', 'adventure',
  'love letters', 'dusk', 'honeymoon', 'wild', 'tender',
];

// ── Main component ─────────────────────────────────────────────
export function GenerationProgress({ step = 0 }: { step?: number }) {
  const idx = Math.min(step, PASSES.length - 1);
  const pass = PASSES[idx];
  const [elapsed, setElapsed] = useState(0);
  const [words] = useState(() => [...WORDS].sort(() => Math.random() - 0.5).slice(0, 9));

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#1C1916',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>

      {/* ── Ambient gradient orbs ── */}
      <motion.div
        animate={{ scale: [1, 1.35, 1], opacity: [0.18, 0.32, 0.18] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', width: '650px', height: '650px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(163,177,138,0.4) 0%, transparent 68%)',
          top: '-22%', left: '-20%', filter: 'blur(90px)', pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.22, 0.1] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        style={{
          position: 'absolute', width: '550px', height: '550px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(214,198,168,0.3) 0%, transparent 68%)',
          bottom: '-18%', right: '-12%', filter: 'blur(90px)', pointerEvents: 'none',
        }}
      />

      {/* ── Drifting editorial words ── */}
      {words.map((word, i) => (
        <motion.span
          key={word}
          initial={{ opacity: 0, y: 60 + i * 5 }}
          animate={{ opacity: [0, 0.055, 0.035, 0], y: [60 + i * 5, -110 - i * 8] }}
          transition={{
            duration: 11 + i * 1.4, delay: i * 1.3,
            repeat: Infinity, ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            fontFamily: 'var(--eg-font-heading, Georgia, serif)',
            fontSize: `${0.85 + (i % 4) * 0.38}rem`,
            fontStyle: 'italic',
            color: '#FAF7F2',
            left: `${8 + (i * 9) % 78}%`,
            top: `${15 + (i * 11) % 65}%`,
            userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap',
          }}
        >
          {word}
        </motion.span>
      ))}

      {/* ── Core content ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center', maxWidth: '600px', padding: '0 2rem', width: '100%',
      }}>

        {/* Pass progress dots */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '6px', marginBottom: '3.5rem',
        }}>
          {PASSES.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === idx ? 28 : 6,
                backgroundColor:
                  i < idx
                    ? 'rgba(163,177,138,0.55)'
                    : i === idx
                    ? '#A3B18A'
                    : 'rgba(255,255,255,0.13)',
              }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: 6, borderRadius: 100 }}
            />
          ))}
        </div>

        {/* ── Pear mark ── */}
        <div style={{ position: 'relative', width: 68, height: 82, margin: '0 auto 2.75rem' }}>
          {/* Pulse glow */}
          <motion.div
            animate={{ opacity: [0.25, 0.65, 0.25], scale: [1, 1.45, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: -22,
              borderRadius: '38% 38% 50% 50% / 28% 28% 50% 50%',
              background: 'radial-gradient(circle, rgba(163,177,138,0.4) 0%, transparent 70%)',
              filter: 'blur(14px)',
            }}
          />
          {/* Rotating rings */}
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ rotate: i % 2 === 0 ? [0, 360] : [360, 0] }}
              transition={{ duration: 7 + i * 2.8, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', inset: i * 10,
                borderRadius: '38% 38% 50% 50% / 28% 28% 50% 50%',
                border: `1.5px solid rgba(163,177,138,${0.75 - i * 0.22})`,
              }}
            />
          ))}
          {/* Core orb */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 20, height: 25,
                borderRadius: '38% 38% 50% 50% / 28% 28% 50% 50%',
                background: 'linear-gradient(160deg, #C4D4A8 0%, #8FA876 100%)',
              }}
            />
          </div>
        </div>

        {/* ── Headline ── */}
        <AnimatePresence mode="wait">
          <motion.h2
            key={`h-${idx}`}
            initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -14, filter: 'blur(5px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--eg-font-heading, Georgia, serif)',
              fontSize: 'clamp(2.1rem, 5.5vw, 3.4rem)',
              fontWeight: 400,
              fontStyle: 'italic',
              color: '#FAF7F2',
              lineHeight: 1.18,
              margin: '0 0 1.3rem',
              letterSpacing: '-0.01em',
            }}
          >
            {pass.headline}
          </motion.h2>
        </AnimatePresence>

        {/* ── Copy ── */}
        <AnimatePresence mode="wait">
          <motion.p
            key={`c-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.55, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: '1rem',
              color: 'rgba(250,247,242,0.48)',
              lineHeight: 1.75,
              maxWidth: '400px',
              margin: '0 auto 1.75rem',
              fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
            }}
          >
            {pass.copy}
          </motion.p>
        </AnimatePresence>

        {/* ── Story glimpse — typewriter ── */}
        <AnimatePresence mode="wait">
          {idx >= 1 && (
            <motion.p
              key={`glimpse-${idx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              style={{
                fontFamily: 'var(--eg-font-heading, Georgia, serif)',
                fontSize: 'clamp(0.85rem, 2vw, 1.0rem)',
                fontStyle: 'italic',
                color: 'rgba(250,247,242,0.32)',
                lineHeight: 1.8,
                maxWidth: '360px',
                margin: '0 auto 2.75rem',
                letterSpacing: '0.015em',
                minHeight: '1.8em',
              }}
            >
              <TypewriterText text={GLIMPSE_LINES[idx % GLIMPSE_LINES.length]} speed={26} />
            </motion.p>
          )}
          {idx < 1 && (
            <div key="spacer" style={{ marginBottom: '2.75rem' }} />
          )}
        </AnimatePresence>

        {/* ── Progress bar ── */}
        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.07)', borderRadius: 100, overflow: 'hidden', marginBottom: '1.25rem' }}>
          <motion.div
            animate={{ width: `${pass.pct}%` }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #8FA876, #C4D4A8)',
              borderRadius: 100,
              boxShadow: '0 0 10px rgba(163,177,138,0.7)',
            }}
          />
        </div>

        {/* ── Meta / pass label ── */}
        <AnimatePresence mode="wait">
          <motion.p
            key={`m-${idx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(163,177,138,0.55)',
              fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
              margin: 0,
            }}
          >
            {pass.meta}
            {elapsed > 10 && (
              <span style={{ opacity: 0.45, marginLeft: '1.2em' }}>
                {elapsed}s
              </span>
            )}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
