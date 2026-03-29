'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/generation-progress.tsx
// Cinematic generation experience — live photo collage + AI thought stream
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GooglePhotoMetadata } from '@/types';

// ── Pass descriptors ──────────────────────────────────────────
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

// ── Build dynamic AI thought lines from real user inputs ──────
function buildThoughtLines(
  passIdx: number,
  names: [string, string],
  vibeString: string,
  occasion: string,
  photoCount: number,
  elapsed: number,
): string[] {
  const [n1, n2] = names;
  const vibeWords = vibeString
    .split(/[,;.]+/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 2)
    .slice(0, 8);

  const displayOccasion = occasion === 'wedding' ? 'wedding'
    : occasion === 'engagement' ? 'engagement'
    : occasion === 'anniversary' ? 'anniversary'
    : occasion === 'birthday' ? 'birthday'
    : 'celebration';

  const lines: string[] = [];

  if (passIdx === 0) {
    lines.push(`reading ${photoCount} photo${photoCount !== 1 ? 's' : ''} — scanning dates, cameras, locations`);
    if (n1) lines.push(`names detected: ${n1}${n2 ? ` & ${n2}` : ''}`);
    if (vibeWords[0]) lines.push(`vibe signal: "${vibeWords[0]}"${vibeWords[1] ? ` · "${vibeWords[1]}"` : ''}`);
    lines.push(`occasion: ${displayOccasion} — calibrating narrative tone`);
  } else if (passIdx === 1) {
    lines.push(`constructing story arc for ${n1}${n2 ? ` & ${n2}` : ''}`);
    lines.push(`${photoCount} moments → organising into chapters`);
    if (vibeWords[0]) lines.push(`"${vibeWords[0]}" → setting chapter one atmosphere`);
    if (vibeWords[1]) lines.push(`threading "${vibeWords[1]}" through the narrative`);
    lines.push(`generating opening lines...`);
  } else if (passIdx === 2) {
    lines.push(`reviewing each chapter for specificity and depth`);
    if (n1) lines.push(`cross-checking: does this feel like ${n1}${n2 ? ` & ${n2}` : ''}?`);
    lines.push(`rewriting any lines that feel too generic`);
    if (vibeWords[2]) lines.push(`amplifying "${vibeWords[2]}" through the prose`);
  } else if (passIdx === 3) {
    lines.push(`extracting couple DNA — motifs, habits, places`);
    if (n1) lines.push(`building ${n1}'s character signature`);
    if (n2) lines.push(`building ${n2}'s character signature`);
    lines.push(`mapping shared moments to visual symbols`);
    if (vibeWords[3]) lines.push(`motif candidate: "${vibeWords[3]}"`);
  } else if (passIdx === 4) {
    if (vibeWords[0]) lines.push(`colour palette seeded from "${vibeWords[0]}"`);
    if (vibeWords[1]) lines.push(`typography mood: "${vibeWords[1]}"`);
    lines.push(`generating visual identity — fonts, spacing, palette`);
    lines.push(`crafting layout structure for ${displayOccasion} format`);
  } else if (passIdx === 5) {
    lines.push(`generating hero illustration`);
    lines.push(`rendering ambient background art`);
    if (vibeWords[0]) lines.push(`art direction: "${vibeWords[0]}"${vibeWords[4] ? ` meets "${vibeWords[4]}"` : ''}`);
    lines.push(`compositing accent layers`);
  } else if (passIdx === 6) {
    lines.push(`colour harmony check — all ${Math.floor(Math.random() * 6) + 8} palette values`);
    lines.push(`proportion audit — section spacing`);
    lines.push(`emotional calibration: does it feel right?`);
    lines.push(`micro-adjustments applied`);
  } else {
    if (n1) lines.push(`writing ${n1}${n2 ? ` & ${n2}` : ''}'s hero tagline`);
    lines.push(`composing RSVP welcome message`);
    lines.push(`finding the closing line...`);
    if (vibeWords[5]) lines.push(`final note: "${vibeWords[5]}"`);
  }

  if (elapsed > 90) lines.push(`deep generation — ${elapsed}s · still going strong`);

  return lines;
}

// ── Typewriter component ──────────────────────────────────────
function TypewriterText({ text, speed = 22 }: { text: string; speed?: number }) {
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
          style={{ display: 'inline-block', width: '1px', height: '1em', background: 'rgba(163,177,138,0.7)', marginLeft: '1px', verticalAlign: 'text-bottom' }}
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
        filter: isActive
          ? [`blur(0px) brightness(1.1)`, `blur(0px) brightness(1.2)`, `blur(0px) brightness(1.1)`]
          : [`blur(${blurAmount}px) brightness(0.7)`, `blur(${blurAmount * 0.8}px) brightness(0.8)`, `blur(${blurAmount}px) brightness(0.7)`],
      }}
      transition={{
        opacity: { duration: isActive ? 2.5 : 8, repeat: Infinity, ease: 'easeInOut', delay },
        scale: { duration: isActive ? 2.5 : 12, repeat: Infinity, ease: 'easeInOut', delay },
        y: { duration: 14 + delay * 2, repeat: Infinity, ease: 'easeInOut', delay },
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
        boxShadow: isActive
          ? '0 8px 40px rgba(163,177,138,0.35), 0 0 0 1px rgba(163,177,138,0.25)'
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
      {/* Scan line animation */}
      {isActive && (
        <motion.div
          initial={{ top: '-8%' }}
          animate={{ top: ['−8%', '108%'] }}
          transition={{ duration: 1.6, ease: 'linear', repeat: Infinity, repeatDelay: 1.2 }}
          style={{
            position: 'absolute',
            left: 0, right: 0,
            height: '22%',
            background: 'linear-gradient(180deg, transparent 0%, rgba(163,177,138,0.35) 40%, rgba(200,220,170,0.5) 50%, rgba(163,177,138,0.35) 60%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* Corner brackets on active */}
      {isActive && (
        <>
          {[
            { top: 4, left: 4, borderTop: '1.5px solid rgba(163,177,138,0.8)', borderLeft: '1.5px solid rgba(163,177,138,0.8)' },
            { top: 4, right: 4, borderTop: '1.5px solid rgba(163,177,138,0.8)', borderRight: '1.5px solid rgba(163,177,138,0.8)' },
            { bottom: 4, left: 4, borderBottom: '1.5px solid rgba(163,177,138,0.8)', borderLeft: '1.5px solid rgba(163,177,138,0.8)' },
            { bottom: 4, right: 4, borderBottom: '1.5px solid rgba(163,177,138,0.8)', borderRight: '1.5px solid rgba(163,177,138,0.8)' },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 10, height: 10, ...s }} />
          ))}
        </>
      )}
    </motion.div>
  );
}

// ── AI Thought Stream ─────────────────────────────────────────
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
    const t = setTimeout(() => setVisibleCount(c => c + 1), 900 + Math.random() * 600);
    return () => clearTimeout(t);
  }, [visibleCount, lines.length]);

  return (
    <div style={{
      fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
      fontSize: '0.7rem',
      lineHeight: 1.9,
      color: 'rgba(163,177,138,0.6)',
      textAlign: 'left',
      maxWidth: 340,
      margin: '0 auto',
      padding: '0.75rem 1rem',
      background: 'rgba(163,177,138,0.04)',
      border: '1px solid rgba(163,177,138,0.1)',
      borderRadius: 8,
      minHeight: 80,
      overflow: 'hidden',
    }}>
      <AnimatePresence initial={false}>
        {lines.slice(0, visibleCount).map((line, i) => (
          <motion.div
            key={`${line}-${i}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: i === visibleCount - 1 ? 1 : 0.45, x: 0 }}
            transition={{ duration: 0.35 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}
          >
            <span style={{ color: 'rgba(163,177,138,0.4)', flexShrink: 0 }}>›</span>
            {i === visibleCount - 1
              ? <TypewriterText text={line} speed={18} />
              : <span>{line}</span>
            }
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Photo layout — deterministic scatter positions ────────────
const PHOTO_SLOTS = [
  // left column
  { x: '2%',  y: '8%',  size: 180, rot: -4,  blur: 4, delay: 0 },
  { x: '1%',  y: '42%', size: 140, rot: 3,   blur: 6, delay: 1.2 },
  { x: '4%',  y: '70%', size: 160, rot: -2,  blur: 5, delay: 2.4 },
  // right column
  { x: '78%', y: '6%',  size: 170, rot: 4,   blur: 5, delay: 0.6 },
  { x: '81%', y: '38%', size: 145, rot: -3,  blur: 4, delay: 1.8 },
  { x: '76%', y: '68%', size: 165, rot: 2,   blur: 6, delay: 3.0 },
  // scattered extras
  { x: '15%', y: '5%',  size: 120, rot: -6,  blur: 7, delay: 0.9 },
  { x: '64%', y: '78%', size: 125, rot: 5,   blur: 7, delay: 1.5 },
  { x: '18%', y: '80%', size: 110, rot: 3,   blur: 8, delay: 2.1 },
  { x: '60%', y: '4%',  size: 115, rot: -5,  blur: 8, delay: 2.7 },
];

// ── Main component ─────────────────────────────────────────────
export function GenerationProgress({
  step = 0,
  onCancel,
  photos = [],
  names = ['', ''],
  vibeString = '',
  occasion = 'wedding',
}: {
  step?: number;
  onCancel?: () => void;
  photos?: GooglePhotoMetadata[];
  names?: [string, string];
  vibeString?: string;
  occasion?: string;
}) {
  const idx = Math.min(step, PASSES.length - 1);
  const pass = PASSES[idx];
  const [elapsed, setElapsed] = useState(0);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Cycle active photo every 3s
  useEffect(() => {
    if (photos.length === 0) return;
    const t = setInterval(() => {
      setActivePhotoIdx(i => (i + 1) % Math.min(photos.length, PHOTO_SLOTS.length));
    }, 3000);
    return () => clearTimeout(t);
  }, [photos.length]);

  // Build photo tiles — pick up to 10 photos
  const photoTiles = useMemo(() => {
    if (photos.length === 0) return [];
    const picked = [...photos].sort(() => Math.random() - 0.5).slice(0, PHOTO_SLOTS.length);
    return picked.map((p, i) => ({
      src: `${p.baseUrl}=w400-h400-c`,
      slot: PHOTO_SLOTS[i % PHOTO_SLOTS.length],
      idx: i,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length]);

  // AI thought lines for current pass
  const thoughtLines = useMemo(
    () => buildThoughtLines(idx, names, vibeString, occasion, photos.length, elapsed),
    // rebuild on pass change or every 30s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx, elapsed > 0 && Math.floor(elapsed / 30)],
  );

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

      {/* ── Photo collage (only when photos provided) ── */}
      <AnimatePresence>
        {photoTiles.map(({ src, slot, idx: tileIdx }) => (
          <PhotoTile
            key={src}
            src={src}
            x={slot.x} y={slot.y}
            size={slot.size}
            rotation={slot.rot}
            delay={slot.delay}
            blurAmount={slot.blur}
            isActive={tileIdx === activePhotoIdx}
          />
        ))}
      </AnimatePresence>

      {/* ── Core content ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center', maxWidth: '580px', padding: '0 2rem', width: '100%',
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
        <div style={{ position: 'relative', width: 68, height: 82, margin: '0 auto 2.25rem' }}>
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
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              fontSize: 'clamp(2.1rem, 5.5vw, 3.2rem)',
              fontWeight: 400,
              fontStyle: 'italic',
              color: '#FAF7F2',
              lineHeight: 1.18,
              margin: '0 0 1rem',
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
              fontSize: '0.95rem',
              color: 'rgba(250,247,242,0.45)',
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
        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.07)', borderRadius: 100, overflow: 'hidden', marginBottom: '1rem' }}>
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
              <span style={{ opacity: 0.45, marginLeft: '1.2em' }}>{elapsed}s</span>
            )}
          </motion.p>
        </AnimatePresence>

        {/* ── Long-running warnings ── */}
        <AnimatePresence>
          {elapsed >= 120 && elapsed < 200 && (
            <motion.p
              key="slow-warning"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                marginTop: '1rem',
                fontSize: '0.75rem',
                color: 'rgba(250,247,242,0.3)',
                fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
                fontStyle: 'italic',
              }}
            >
              This is taking a little longer than usual — still working…
            </motion.p>
          )}
          {elapsed >= 200 && (
            <motion.p
              key="very-slow-warning"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                marginTop: '1rem',
                fontSize: '0.75rem',
                color: 'rgba(250,200,100,0.45)',
                fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
                fontStyle: 'italic',
              }}
            >
              Still going — complex stories take time. Please don&apos;t close this tab.
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Cancel button (shown after 30s) ── */}
        <AnimatePresence>
          {onCancel && elapsed >= 30 && (
            <motion.button
              key="cancel-btn"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              onClick={onCancel}
              style={{
                marginTop: '1.75rem',
                background: 'transparent',
                border: '1px solid rgba(250,247,242,0.2)',
                borderRadius: '8px',
                padding: '0.5rem 1.25rem',
                color: 'rgba(250,247,242,0.4)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
                letterSpacing: '0.06em',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(250,247,242,0.4)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(250,247,242,0.65)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(250,247,242,0.2)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(250,247,242,0.4)';
              }}
            >
              Cancel generation
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
