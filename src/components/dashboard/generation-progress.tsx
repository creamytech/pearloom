'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / generation-progress.tsx — "The Weave"
//
// Photos are sliced into thin horizontal strips that shuttle
// left ↔ right through vertical warp threads — exactly like a
// real loom. Each AI pass weaves more photos into the tapestry
// until the full collage is complete.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GooglePhotoMetadata } from '@/types';
import { colors as C, text } from '@/lib/design-tokens';

// ── Pass descriptors ──────────────────────────────────────────
const PASSES = [
  { headline: 'Reading your photos\u2026', copy: 'Scanning dates, places, and faces from your gallery.', pct: 2 },
  { headline: 'Writing your story', copy: 'Turning each memory into a chapter only you could have lived.', pct: 15 },
  { headline: 'Refining every word', copy: 'Scoring each chapter and rewriting anything below a 9/10.', pct: 40 },
  { headline: 'Learning your DNA', copy: 'The pets, the places, the inside jokes that make you, you.', pct: 50 },
  { headline: 'Designing your world', copy: 'Choosing colors, fonts, and shapes born from your vibe.', pct: 65 },
  { headline: 'Painting custom art', copy: 'Illustrating one-of-a-kind artwork for your site.', pct: 78 },
  { headline: 'Uploading your photos', copy: 'Saving images to permanent storage so they never expire.', pct: 88 },
  { headline: 'Final poetry', copy: 'Writing the tagline, the welcome, and the closing line.', pct: 96 },
];

// How many photo cells to activate per pass
const ACTIVE_COUNTS = [2, 3, 4, 6, 7, 8, 9, 9];

// Warp thread palette — olive, gold, plum cycling
const WARP_COLORS = [
  C.olive, C.gold, C.plum, C.olive, C.gold,
  C.plum, C.olive, C.gold, C.plum, C.olive,
];

// ── Build dynamic thought lines ───────────────────────────────
function buildThoughts(
  passIdx: number,
  names: [string, string],
  vibeString: string,
  occasion: string,
  photoCount: number,
): string[] {
  const [n1, n2] = names;
  const isCouple = n2?.trim().length > 0;
  const who = isCouple ? `${n1} & ${n2}` : n1 || 'you';
  const vibeWords = vibeString.split(/[,;.]+/).map(s => s.trim()).filter(s => s.length > 2).slice(0, 6);

  const lines: Record<number, string[]> = {
    0: [
      `${photoCount} memories loaded`,
      `Getting to know ${who}`,
      vibeWords[0] ? `Feeling something ${vibeWords[0].toLowerCase()}` : 'Reading the quiet details',
    ],
    1: [
      `A story is forming \u2014 uniquely ${who}`,
      'Each chapter is its own small universe',
      vibeWords[0] ? `\u201c${vibeWords[0]}\u201d woven through every line` : 'Every word chosen with intention',
    ],
    2: [
      'Reading back every line',
      `Does this feel like ${who}? Truly?`,
      'Replacing anything that sounds generic',
    ],
    3: [
      'The habits, the places, the inside moments',
      `Building a portrait of ${who}`,
      vibeWords[1] ? `\u201c${vibeWords[1]}\u201d keeps surfacing` : 'Details that make this irreplaceable',
    ],
    4: [
      vibeWords[0] ? `A palette born from \u201c${vibeWords[0]}\u201d` : 'Designing a visual world from scratch',
      'Typography that feels like the story itself',
      'Every colour chosen with intention',
    ],
    5: [
      'Painting the atmosphere',
      vibeWords[0] ? `Art direction: ${vibeWords[0]}${vibeWords[1] ? ` meets ${vibeWords[1]}` : ''}` : 'Custom imagery for this moment only',
      'Something no one else will ever have',
    ],
    6: [
      'Does it feel balanced?',
      'Adjusting the light, the weight, the silence between sections',
      'Almost there',
    ],
    7: [
      `A final line written just for ${who}`,
      'The words that arrive when everything else is ready',
      "This is the part that can\u2019t be rushed",
    ],
  };

  return lines[passIdx] ?? lines[0];
}

// ── TypewriterText ────────────────────────────────────────────
function TypewriterText({ text: displayText, speed = 18 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const textRef = useRef(displayText);
  textRef.current = displayText;

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const advance = () => {
      i++;
      setDisplayed(textRef.current.slice(0, i));
      if (i >= textRef.current.length) return;
      const ch = textRef.current[i - 1];
      const delay = /[.,;:!?\u2014\u2013]/.test(ch) ? speed + 70 : speed;
      setTimeout(advance, delay);
    };
    const t = setTimeout(advance, speed);
    return () => clearTimeout(t);
  }, [displayText, speed]);

  return (
    <>
      {displayed}
      {displayed.length < displayText.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{
            display: 'inline-block', width: '1px', height: '0.9em',
            background: `${C.gold}88`, marginLeft: '1px', verticalAlign: 'text-bottom',
          }}
        />
      )}
    </>
  );
}

// ── ThoughtStream ─────────────────────────────────────────────
function ThoughtStream({ lines }: { lines: string[] }) {
  const [visibleCount, setVisibleCount] = useState(1);
  const prevRef = useRef<string[]>([]);

  useEffect(() => {
    if (lines.join('|') !== prevRef.current.join('|')) {
      prevRef.current = lines;
      setVisibleCount(1);
    }
  }, [lines]);

  useEffect(() => {
    if (visibleCount >= lines.length) return;
    const t = setTimeout(() => setVisibleCount(c => c + 1), 1800);
    return () => clearTimeout(t);
  }, [visibleCount, lines.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', minHeight: '3.5rem' }}>
      <AnimatePresence initial={false}>
        {lines.slice(0, visibleCount).map((line, i) => (
          <motion.p
            key={`${line}-${i}`}
            initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
            animate={{ opacity: i === visibleCount - 1 ? 0.65 : 0.22, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              margin: 0,
              fontFamily: 'var(--eg-font-heading, Georgia, serif)',
              fontStyle: 'italic', fontWeight: 400,
              fontSize: '0.82rem', color: C.darkHeading,
              letterSpacing: '0.01em', lineHeight: 1.5, textAlign: 'center',
            }}
          >
            {i === visibleCount - 1 ? <TypewriterText text={line} speed={18} /> : line}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── WovenPhoto ────────────────────────────────────────────────
// Slices the photo into STRIP_COUNT horizontal bands.
// Each band enters from alternating sides (left ↔ right) with a
// short stagger — mimicking the weft shuttle on a real loom.
const STRIP_COUNT = 18;

function WovenPhoto({ src, active }: { src: string; active: boolean }) {
  const [woven, setWoven] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    // Small delay so consecutive photos don't all fire at once
    const t = setTimeout(() => setWoven(true), 80);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '4/3',
      borderRadius: '2px',
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.025)',
    }}>
      {Array.from({ length: STRIP_COUNT }).map((_, i) => {
        const fromLeft = i % 2 === 0;
        const topPct    = (i / STRIP_COUNT) * 100;
        const heightPct = 100 / STRIP_COUNT;

        return (
          <motion.div
            key={i}
            initial={{ x: fromLeft ? '-101%' : '101%' }}
            animate={{ x: woven ? '0%' : (fromLeft ? '-101%' : '101%') }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.038 }}
            style={{
              position: 'absolute',
              top: `${topPct}%`,
              left: 0, right: 0,
              height: `${heightPct}%`,
              overflow: 'hidden',
            }}
          >
            {/* Image offset so each strip shows its correct vertical slice */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              loading="lazy"
              style={{
                position: 'absolute',
                width: '100%',
                height: `${STRIP_COUNT * 100}%`,
                top: `${-i * 100}%`,
                left: 0,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </motion.div>
        );
      })}

      {/* Gold sheen that wipes across right after weaving completes */}
      <motion.div
        initial={{ opacity: 0, x: '-100%' }}
        animate={woven ? { opacity: [0, 0.22, 0], x: ['−100%', '0%', '100%'] } : {}}
        transition={{ duration: 1.1, delay: STRIP_COUNT * 0.038 + 0.15, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, transparent 0%, rgba(196,169,106,0.35) 50%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

// ── EmptyCell — unactivated loom slot ─────────────────────────
function EmptyCell() {
  return (
    <div style={{
      width: '100%', aspectRatio: '4/3',
      borderRadius: '2px',
      background: 'rgba(255,255,255,0.018)',
      border: '1px solid rgba(255,255,255,0.04)',
    }} />
  );
}

// ── WarpThreads — vertical threads over the grid ──────────────
// Threads overlap photos (high z-index, low opacity) to create the
// over/under illusion that photos are woven into the cloth.
// On completion they dissolve away to reveal the clean tapestry.
function WarpThreads({ visible }: { visible: boolean }) {
  const COUNT = 10;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', zIndex: 20,
    }}>
      {Array.from({ length: COUNT }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 0.3 : 0 }}
          transition={{
            duration: visible ? 0.6 : 1.6,
            delay: visible ? i * 0.05 : (COUNT - i) * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: `${((i + 0.5) / COUNT) * 100}%`,
            width: '1.5px',
            background: `linear-gradient(180deg,
              transparent 0%,
              ${WARP_COLORS[i % WARP_COLORS.length]} 6%,
              ${WARP_COLORS[i % WARP_COLORS.length]} 94%,
              transparent 100%)`,
            transform: 'translateX(-50%)',
          }}
        />
      ))}
    </div>
  );
}

// ── LoomBed — 3×3 grid + warp threads ────────────────────────
function LoomBed({
  photoUrls,
  activeCount,
  threadsVisible,
}: {
  photoUrls: string[];
  activeCount: number;
  threadsVisible: boolean;
}) {
  const TOTAL = 9;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 3×3 photo grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '3px',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        {Array.from({ length: TOTAL }).map((_, i) => {
          const isActive = i < activeCount;
          const src = photoUrls.length > 0
            ? photoUrls[i % photoUrls.length]
            : null;
          return isActive && src
            ? <WovenPhoto key={i} src={src} active />
            : <EmptyCell key={i} />;
        })}
      </div>

      {/* Warp threads overlay */}
      <WarpThreads visible={threadsVisible} />
    </div>
  );
}

// ── PassDots ──────────────────────────────────────────────────
function PassDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            background: i < current
              ? C.olive
              : i === current
                ? C.gold
                : 'rgba(255,255,255,0.1)',
            scale: i === current ? 1.4 : 1,
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '5px', height: '5px', borderRadius: '50%' }}
        />
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
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
  const idx  = Math.min(step, PASSES.length - 1);
  const pass = PASSES[idx];
  const [elapsed, setElapsed] = useState(0);

  // How many cells to show (capped at available photos and 9)
  const activeCount = Math.min(ACTIVE_COUNTS[idx], photos.length, 9);

  // Completion callback
  useEffect(() => {
    if (!isComplete || !onComplete) return;
    const t = setTimeout(onComplete, 2000);
    return () => clearTimeout(t);
  }, [isComplete, onComplete]);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Photo URLs — proxy Google CDN images, cap at 9
  const photoUrls = useMemo(() => {
    return photos.slice(0, 9).map(p =>
      p.baseUrl.includes('googleusercontent.com')
        ? `/api/photos/proxy?url=${encodeURIComponent(p.baseUrl)}&w=600&h=450`
        : p.baseUrl
    );
  }, [photos]);

  const thoughts = useMemo(
    () => buildThoughts(idx, names, vibeString, occasion, photos.length),
    [idx, names, vibeString, occasion, photos.length]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isComplete ? 0 : 1 }}
      transition={{ duration: isComplete ? 0.8 : 0.5 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: C.darkBg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        padding: '1.5rem',
        gap: '1.25rem',
      }}
    >
      {/* Ambient glow behind the loom */}
      <div style={{
        position: 'absolute', top: '45%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '65vw', height: '55vh', borderRadius: '50%',
        background: `radial-gradient(ellipse, ${C.olive}0B 0%, transparent 70%)`,
        pointerEvents: 'none', filter: 'blur(80px)',
      }} />
      <div style={{
        position: 'absolute', top: '25%', left: '25%',
        width: '30vw', height: '30vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${C.plum}07 0%, transparent 70%)`,
        pointerEvents: 'none', filter: 'blur(60px)',
      }} />

      {/* ── Headline ── */}
      <div style={{ textAlign: 'center', zIndex: 10, flexShrink: 0 }}>
        <AnimatePresence mode="wait">
          <motion.h1
            key={isComplete ? 'done' : idx}
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--eg-font-heading, Georgia, serif)',
              fontSize: 'clamp(1.5rem, 3.8vw, 2.4rem)',
              fontWeight: 400, fontStyle: 'italic',
              color: C.darkHeading, letterSpacing: '-0.02em', margin: 0,
            }}
          >
            {isComplete ? 'Your story is ready.' : pass.headline}
          </motion.h1>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.p
            key={isComplete ? 'done-copy' : idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.45, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              color: C.darkText, fontSize: text.sm,
              maxWidth: '340px', margin: '0.5rem auto 0', lineHeight: 1.65,
            }}
          >
            {isComplete ? 'Opening the editor\u2026' : pass.copy}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ── The Loom Bed ── */}
      <div style={{
        width: '100%',
        maxWidth: 'min(560px, 94vw)',
        zIndex: 10, flexShrink: 0,
      }}>
        <LoomBed
          photoUrls={photoUrls}
          activeCount={activeCount}
          threadsVisible={!isComplete}
        />
      </div>

      {/* ── Thought stream ── */}
      <div style={{ zIndex: 10, flexShrink: 0, padding: '0 1rem' }}>
        <ThoughtStream lines={thoughts} />
      </div>

      {/* ── Progress ── */}
      <div style={{
        zIndex: 10, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem',
      }}>
        <PassDots current={idx} total={PASSES.length} />

        {/* Smooth progress bar */}
        <div style={{ width: 'min(280px, 70vw)', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${pass.pct}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%', borderRadius: '2px', background: `linear-gradient(90deg, ${C.olive}, ${C.gold})` }}
          />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase',
          color: C.darkText, fontWeight: 600,
        }}>
          <span>{pass.pct}%</span>
          <span style={{ width: '2px', height: '2px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
          <span>Step {idx + 1} of {PASSES.length}</span>
          {elapsed > 10 && (
            <>
              <span style={{ width: '2px', height: '2px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
              <span style={{ opacity: 0.4 }}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
            </>
          )}
        </div>

        {/* Time hints */}
        {idx === 0 && elapsed < 20 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 2 }}
            style={{ fontSize: '0.75rem', fontStyle: 'italic', color: C.darkText, margin: 0 }}
          >
            This usually takes 2\u20134 minutes
          </motion.p>
        )}
        {elapsed >= 90 && elapsed < 150 && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 0.45 }}
            style={{ fontSize: '0.8rem', fontStyle: 'italic', color: C.darkText, margin: 0 }}
          >
            Taking a moment \u2014 still weaving your story\u2026
          </motion.p>
        )}
        {elapsed >= 150 && elapsed < 270 && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 0.55 }}
            style={{ fontSize: '0.8rem', fontStyle: 'italic', color: `${C.gold}88`, margin: 0 }}
          >
            Almost there \u2014 please don\u2019t close this tab.
          </motion.p>
        )}
        {elapsed >= 270 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center' }}
          >
            <p style={{ fontSize: '0.85rem', color: 'rgba(220,120,120,0.8)', margin: '0 0 0.75rem' }}>
              This is taking longer than usual.
            </p>
            <button
              onClick={onCancel}
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '100px',
                border: '1px solid rgba(220,120,120,0.3)', background: 'rgba(220,120,120,0.08)',
                color: 'rgba(220,120,120,0.9)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Stop and try again
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Cancel ── */}
      {onCancel && elapsed < 270 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          onClick={onCancel}
          style={{
            position: 'absolute',
            bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
            left: '50%', transform: 'translateX(-50%)',
            background: 'none',
            border: elapsed > 30 ? `1px solid ${C.darkBorder}` : 'none',
            padding: elapsed > 30 ? '0.5rem 1.25rem' : '0.25rem',
            borderRadius: '100px',
            color: C.darkText, fontSize: '0.76rem', cursor: 'pointer',
            textDecoration: elapsed > 30 ? 'none' : 'underline',
            textUnderlineOffset: '2px',
            transition: 'all 0.3s ease',
            zIndex: 20,
          }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = C.darkHeading; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = C.darkText; }}
        >
          Cancel
        </motion.button>
      )}
    </motion.div>
  );
}
