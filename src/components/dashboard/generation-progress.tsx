'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/generation-progress.tsx
// Cinematic generation experience — live photo collage + AI thought stream
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GooglePhotoMetadata } from '@/types';
import { colors as C, text } from '@/lib/design-tokens';

// ── Pass descriptors ──────────────────────────────────────────
const PASSES = [
  {
    headline: 'Listening...',
    copy: 'Reading every photo, every place, every quiet moment you shared.',
    meta: 'The Loom · Initialising',
    pct: 5,
  },
  {
    headline: 'Writing your story.',
    copy: 'Weaving your memories into an intimate narrative — chapters only you could have lived.',
    meta: 'The Loom · Pass 1 of 7 · Story generation',
    pct: 20,
  },
  {
    headline: 'Every word, considered.',
    copy: "Reading every line back — making sure it feels real, specific, and unmistakably yours.",
    meta: 'The Loom · Pass 2 of 7 · Quality refinement',
    pct: 34,
  },
  {
    headline: 'Learning who you are.',
    copy: 'Identifying the details that make you uniquely you — the little things that define a relationship.',
    meta: 'The Loom · Pass 3 of 7 · Event DNA',
    pct: 47,
  },
  {
    headline: 'Designing your world.',
    copy: 'A colour palette, typography, and visual identity — crafted entirely around your vibe.',
    meta: 'The Loom · Pass 4 of 7 · Visual identity',
    pct: 61,
  },
  {
    headline: 'Painting your canvas.',
    copy: 'AI-generated imagery, made for this moment and no other.',
    meta: 'The Loom · Pass 5 of 7 · Custom artwork',
    pct: 74,
  },
  {
    headline: 'Refining the details.',
    copy: 'Colours balanced, proportions harmonised, emotions calibrated just right.',
    meta: 'The Loom · Pass 6 of 7 · Design critique',
    pct: 86,
  },
  {
    headline: 'Finding the words.',
    copy: 'A tagline, a closing line, a welcome in your own voice. The final poetry.',
    meta: 'The Loom · Pass 7 of 7 · Poetry',
    pct: 95,
  },
];

// ── Build dynamic AI thought lines from real user inputs ──────
function buildThoughtLines(
  passIdx: number,
  names: [string, string],
  vibeString: string,
  occasion: string,
  photoCount: number,
): string[] {
  const [n1, n2] = names;
  const vibeWords = vibeString
    .split(/[,;.]+/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 2)
    .slice(0, 8);

  const isCouple = n2 && n2.trim().length > 0;

  if (passIdx === 0) return [
    `${photoCount} ${photoCount === 1 ? 'memory' : 'memories'} — each one a small world to explore`,
    isCouple ? `Getting to know ${n1} & ${n2}...` : `Getting to know ${n1 || 'you'}...`,
    vibeWords[0] ? `Something ${vibeWords[0]} is already taking shape` : `Feeling the quiet details between the lines`,
  ];

  if (passIdx === 1) return [
    isCouple ? `A story is forming — uniquely ${n1} & ${n2}` : `A story is forming — uniquely ${n1 || 'yours'}`,
    `Each chapter is its own small universe`,
    vibeWords[0] ? `"${vibeWords[0]}" is woven through every line` : `Each word chosen with care`,
  ];

  if (passIdx === 2) return [
    `Reading back every line with fresh eyes`,
    isCouple ? `Does this feel like ${n1} & ${n2}? Truly?` : `Does this feel true?`,
    `Replacing anything that sounds like anyone else`,
  ];

  if (passIdx === 3) return [
    `The little details — habits, places, inside moments`,
    isCouple ? `Building a portrait of ${n1} & ${n2}` : `Building a portrait of ${n1 || 'you'}`,
    vibeWords[1] ? `"${vibeWords[1]}" keeps coming back` : `The details that make this story irreplaceable`,
  ];

  if (passIdx === 4) return [
    vibeWords[0] ? `A palette born from "${vibeWords[0]}"` : `Designing a visual world from scratch`,
    `Typography that feels like the story itself`,
    `Every colour, every curve, chosen with intention`,
  ];

  if (passIdx === 5) return [
    `Painting the atmosphere`,
    vibeWords[0] ? `Art direction: "${vibeWords[0]}"${vibeWords[1] ? ` meets "${vibeWords[1]}"` : ''}` : `Custom imagery made for this moment only`,
    `Something no one else will ever have`,
  ];

  if (passIdx === 6) return [
    `Does it feel balanced? Breathing?`,
    `Adjusting the light, the weight, the silence between sections`,
    `Almost there`,
  ];

  return [
    isCouple ? `A final line written just for ${n1} & ${n2}` : `The perfect closing line`,
    `The words that arrive when everything else is ready`,
    `This is the part that can't be rushed`,
  ];
}

// ── Typewriter component ──────────────────────────────────────
function TypewriterText({ text, speed = 14 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const advance = () => {
      i++;
      setDisplayed(textRef.current.slice(0, i));
      if (i >= textRef.current.length) return;
      // Variable speed: punctuation pauses longer
      const ch = textRef.current[i - 1];
      const delay = /[.,;:!?—–]/.test(ch) ? speed + 60 : speed;
      setTimeout(advance, delay);
    };
    const t = setTimeout(advance, speed);
    return () => clearTimeout(t);
  }, [text, speed]);

  return (
    <>
      {displayed}
      {displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ display: 'inline-block', width: '1px', height: '1em', background: `${C.gold}AA`, marginLeft: '1px', verticalAlign: 'text-bottom' }}
        />
      )}
    </>
  );
}

// ── Photo tile — floats, scans, and fades ─────────────────────
function PhotoTile({
  src,
  x, y,
  size,
  rotation,
  delay,
  blurAmount,
  isActive,
}: {
  src: string;
  x: string; y: string;
  size: number;
  rotation: number;
  delay: number;
  blurAmount: number;
  isActive: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: isActive ? [0.55, 0.85, 0.55] : [0.18, 0.32, 0.18],
        scale: isActive ? [1, 1.04, 1] : [1, 1.02, 1],
        y: [0, -12, 4, -8, 0],
      x: [0, 6, -6, 3, 0],
        filter: isActive
          ? [`blur(0px) brightness(1.1)`, `blur(0px) brightness(1.2)`, `blur(0px) brightness(1.1)`]
          : [`blur(${blurAmount}px) brightness(0.7)`, `blur(${blurAmount * 0.8}px) brightness(0.8)`, `blur(${blurAmount}px) brightness(0.7)`],
      }}
      transition={{
        opacity: { duration: isActive ? 2.5 : 8, repeat: Infinity, ease: 'easeInOut', delay },
        scale: { duration: isActive ? 2.5 : 12, repeat: Infinity, ease: 'easeInOut', delay },
        y: { duration: 14 + delay * 2, repeat: Infinity, ease: 'easeInOut', delay },
        x: { duration: 11 + delay * 1.5, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.5 },
        filter: { duration: isActive ? 2 : 8, repeat: Infinity, ease: 'easeInOut', delay },
      }}
      style={{
        position: 'absolute',
        left: x, top: y,
        width: size,
        height: size * 0.75,
        transform: `rotate(${rotation}deg)`,
        borderRadius: 6,
        overflow: 'hidden',
        border: isActive ? `1px solid ${C.darkBorder}` : 'none',
        boxShadow: isActive
          ? '0 4px 20px rgba(0,0,0,0.4)'
          : '0 4px 20px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        loading="lazy"
      />
    </motion.div>
  );
}

// ── Poetic Thought Stream ─────────────────────────────────────
function ThoughtStream({ lines }: { lines: string[] }) {
  const [visibleCount, setVisibleCount] = useState(1);
  const prevLinesRef = useRef<string[]>([]);

  useEffect(() => {
    if (lines.join('|') !== prevLinesRef.current.join('|')) {
      prevLinesRef.current = lines;
      setVisibleCount(1);
    }
  }, [lines]);

  useEffect(() => {
    if (visibleCount >= lines.length) return;
    const t = setTimeout(() => setVisibleCount(c => c + 1), 1400);
    return () => clearTimeout(t);
  }, [visibleCount, lines.length]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.6rem',
      minHeight: '4.5rem',
    }}>
      <AnimatePresence initial={false}>
        {lines.slice(0, visibleCount).map((line, i) => (
          <motion.p
            key={`${line}-${i}`}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{
              opacity: i === visibleCount - 1 ? 0.72 : 0.32,
              y: 0,
              filter: 'blur(0px)',
            }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              margin: 0,
              fontFamily: 'var(--eg-font-heading, Georgia, serif)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: '0.88rem',
              color: C.darkHeading,
              letterSpacing: '0.01em',
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            {i === visibleCount - 1 ? <TypewriterText text={line} speed={14} /> : line}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Seeded random for deterministic layouts per couple ────────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePhotoSlots(names: [string, string]) {
  // Seed from couple names — unique layout per user, deterministic per session
  const seedStr = `${names[0]}${names[1]}`.toLowerCase();
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = ((seed << 5) - seed + seedStr.charCodeAt(i)) | 0;
  if (seed === 0) seed = 42;
  const rand = seededRandom(Math.abs(seed));

  const slots: Array<{ x: string; y: string; size: number; rot: number; blur: number; delay: number }> = [];

  // Generate 10 positions: 3 left, 3 right, 4 scattered
  const zones = [
    // Left column (x: 1-16%)
    ...Array.from({ length: 3 }, (_, i) => ({
      x: `${1 + rand() * 15}%`,
      y: `${5 + i * 30 + rand() * 10}%`,
      size: 130 + Math.floor(rand() * 60),
      rot: -7 + rand() * 10,
      blur: 3 + Math.floor(rand() * 5),
      delay: rand() * 3,
    })),
    // Right column (x: 74-84%)
    ...Array.from({ length: 3 }, (_, i) => ({
      x: `${74 + rand() * 10}%`,
      y: `${4 + i * 30 + rand() * 12}%`,
      size: 130 + Math.floor(rand() * 55),
      rot: -6 + rand() * 12,
      blur: 3 + Math.floor(rand() * 5),
      delay: 0.5 + rand() * 2.5,
    })),
    // Scattered extras
    ...Array.from({ length: 4 }, () => ({
      x: `${10 + rand() * 55}%`,
      y: `${rand() < 0.5 ? 2 + rand() * 12 : 72 + rand() * 18}%`,
      size: 100 + Math.floor(rand() * 40),
      rot: -8 + rand() * 16,
      blur: 5 + Math.floor(rand() * 4),
      delay: rand() * 3.5,
    })),
  ];

  return zones;
}

// ── Main component ─────────────────────────────────────────────
export function GenerationProgress({
  step = 0,
  onCancel,
  photos = [],
  names = ['', ''],
  vibeString = '',
  occasion = 'wedding',
  isComplete = false,
  onComplete,
}: {
  step?: number;
  onCancel?: () => void;
  photos?: GooglePhotoMetadata[];
  names?: [string, string];
  vibeString?: string;
  occasion?: string;
  isComplete?: boolean;
  onComplete?: () => void;
}) {
  const idx = Math.min(step, PASSES.length - 1);
  const pass = PASSES[idx];
  const [elapsed, setElapsed] = useState(0);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Seeded photo slots based on couple names
  const photoSlots = useMemo(() => generatePhotoSlots(names), [names]);

  // Completion transition — after showing "ready" state, fade out
  useEffect(() => {
    if (!isComplete || !onComplete) return;
    const t = setTimeout(onComplete, 1800);
    return () => clearTimeout(t);
  }, [isComplete, onComplete]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Cycle active photo every 3s
  useEffect(() => {
    if (photos.length === 0) return;
    const t = setInterval(() => {
      setActivePhotoIdx(i => (i + 1) % Math.min(photos.length, photoSlots.length));
    }, 3000);
    return () => clearTimeout(t);
  }, [photos.length, photoSlots.length]);

  // Build photo tiles — pick up to 10 photos, route through proxy for Google Photos
  const photoTiles = useMemo(() => {
    if (photos.length === 0) return [];
    const picked = [...photos].sort(() => Math.random() - 0.5).slice(0, photoSlots.length);
    return picked.map((p, i) => {
      const src = p.baseUrl.includes('googleusercontent.com')
        ? `/api/photos/proxy?url=${encodeURIComponent(p.baseUrl)}&w=400&h=400`
        : p.baseUrl;
      return { src, slot: photoSlots[i % photoSlots.length], idx: i };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length, photoSlots]);

  // AI thought lines for current pass — rebuild when pass changes
  const thoughtLines = useMemo(
    () => buildThoughtLines(idx, names, vibeString, occasion, photos.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx],
  );

  return (
    <motion.div
      animate={isComplete ? { opacity: 0, scale: 1.02 } : { opacity: 1, scale: 1 }}
      transition={isComplete ? { duration: 0.6, delay: 1.2, ease: [0.16, 1, 0.3, 1] } : {}}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: C.darkBg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>

      {/* ── Photo collage (only when photos provided) ── */}
      <AnimatePresence>
        {photoTiles.map(({ src, slot, idx: tileIdx }) => (
          <PhotoTile
            key={src}
            src={src}
            x={slot.x} y={slot.y}
            size={slot.size}
            rotation={slot.rot as number}
            delay={slot.delay}
            blurAmount={slot.blur}
            isActive={tileIdx === activePhotoIdx}
          />
        ))}
      </AnimatePresence>

      {/* ── Core content ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center', maxWidth: 'min(680px, 90vw)', padding: '0 2rem', width: '100%',
      }}>

        {/* Pass progress dots */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '6px', marginBottom: '2.75rem',
        }}>
          {PASSES.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === idx ? 32 : 7,
                backgroundColor:
                  i < idx
                    ? `${C.olive}99`
                    : i === idx
                    ? C.olive
                    : C.darkBorder,
              }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: 7, borderRadius: 100 }}
            />
          ))}
        </div>

        {/* ── Pear mark ── */}
        <div style={{ position: 'relative', width: 48, height: 60, margin: '0 auto 2.5rem' }}>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 22, height: 28,
                borderRadius: '38% 38% 50% 50% / 28% 28% 50% 50%',
                background: C.olive,
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
              fontSize: 'clamp(2.1rem, 5.5vw, 3.2rem)',
              fontWeight: 400,
              fontStyle: 'italic',
              color: C.darkHeading,
              lineHeight: 1.18,
              margin: '0 0 1rem',
              letterSpacing: '-0.01em',
            }}
          >
            {isComplete ? 'Your story is ready.' : pass.headline}
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
              fontSize: text.base,
              color: C.darkText,
              lineHeight: 1.75,
              maxWidth: '380px',
              margin: '0 auto 1.5rem',
              fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
            }}
          >
            {pass.copy}
          </motion.p>
        </AnimatePresence>

        {/* ── AI Thought Stream ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`thoughts-${idx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ marginBottom: '1.75rem' }}
          >
            <ThoughtStream lines={thoughtLines} />
          </motion.div>
        </AnimatePresence>

        {/* ── Progress bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '2px', background: C.darkBorder, borderRadius: 100, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${pass.pct}%` }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: '100%',
                background: C.olive,
                borderRadius: 100,
              }}
            />
          </div>
          <span style={{ fontSize: text.xs, fontWeight: 700, color: C.darkText, fontFamily: 'var(--eg-font-body, system-ui, sans-serif)', minWidth: '28px', textAlign: 'right', letterSpacing: '0.06em' }}>
            {pass.pct}%
          </span>
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
              fontSize: text.xs,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: C.darkText,
              fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
              margin: 0,
            }}
          >
            {pass.meta}
            {elapsed > 10 && (
              <span style={{ opacity: 0.45, marginLeft: '1.2em' }}>{elapsed}s</span>
            )}
          </motion.p>
        </AnimatePresence>

        {/* ── Time expectation hint ── */}
        <AnimatePresence>
          {idx === 0 && elapsed < 20 && (
            <motion.p
              key="time-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
              style={{
                marginTop: '0.75rem', fontSize: text.xs,
                color: `${C.darkHeading}40`,
                fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
                fontStyle: 'italic', margin: '0.75rem 0 0',
              }}
            >
              This usually takes 2–4 minutes
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Long-running warnings ── */}
        <AnimatePresence>
          {elapsed >= 90 && elapsed < 150 && (
            <motion.p
              key="slow-warning"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                marginTop: '1rem',
                fontSize: text.sm,
                color: C.darkText,
                fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
                fontStyle: 'italic',
              }}
            >
              Taking a moment — still weaving your story…
            </motion.p>
          )}
          {elapsed >= 150 && elapsed < 270 && (
            <motion.p
              key="very-slow-warning"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                marginTop: '1rem',
                fontSize: text.sm,
                color: `${C.gold}88`,
                fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
                fontStyle: 'italic',
              }}
            >
              Almost there — please don&apos;t close this tab.
            </motion.p>
          )}
          {elapsed >= 270 && (
            <motion.div
              key="timeout-warning"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
            >
              <p style={{
                fontSize: text.sm, color: 'rgba(248,113,113,0.7)',
                fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
                fontStyle: 'italic', margin: 0,
              }}>
                This is taking unusually long — something may have gone wrong.
              </p>
              {onCancel && (
                <button
                  onClick={onCancel}
                  style={{
                    background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                    borderRadius: '8px', padding: '0.45rem 1.1rem',
                    color: 'rgba(248,113,113,0.75)', fontSize: text.sm, cursor: 'pointer',
                    fontFamily: 'var(--eg-font-body, system-ui, sans-serif)', letterSpacing: '0.05em',
                    transition: 'all 0.2s',
                  }}
                >
                  Stop and try again
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Cancel — shown as subtle text link from start, gains border at 30s ── */}
        {onCancel && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2 }}
            onClick={onCancel}
            style={{
              marginTop: '1.75rem',
              background: 'transparent',
              border: elapsed >= 30 ? `1px solid ${C.darkBorder}` : 'none',
              borderRadius: '8px',
              padding: elapsed >= 30 ? '0.5rem 1.25rem' : '0.25rem 0.5rem',
              color: C.darkText,
              fontSize: text.xs,
              cursor: 'pointer',
              fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
              letterSpacing: '0.06em',
              transition: 'all 0.3s',
              textDecoration: elapsed < 30 ? 'underline' : 'none',
              textUnderlineOffset: '3px',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.color = C.darkHeading;
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.color = C.darkText;
            }}
          >
            Cancel
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
