'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/generation-progress.tsx
// "The Darkroom" — cinematic film-development loading experience
// Photos develop like Polaroids; AI thoughts scroll like credits
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GooglePhotoMetadata } from '@/types';
import { colors as C, text } from '@/lib/design-tokens';

// ── Pass descriptors ──────────────────────────────────────────
const PASSES = [
  { headline: 'Developing...', copy: 'Loading your memories into the darkroom.', pct: 5 },
  { headline: 'Writing your story', copy: 'Each photo becomes a chapter only you could have lived.', pct: 20 },
  { headline: 'Refining every word', copy: 'Making sure it sounds like you, not anyone else.', pct: 34 },
  { headline: 'Learning your DNA', copy: 'The pets, the places, the inside jokes.', pct: 47 },
  { headline: 'Designing your world', copy: 'Colors, fonts, and shapes — born from your vibe.', pct: 61 },
  { headline: 'Painting custom art', copy: 'AI-generated imagery that belongs to no one else.', pct: 74 },
  { headline: 'Critiquing the design', copy: 'A second opinion on every detail.', pct: 86 },
  { headline: 'Final poetry', copy: 'The tagline. The closing line. The welcome in your voice.', pct: 95 },
];

// ── Build dynamic thought lines from user inputs ──────────────
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
      `A story is forming — uniquely ${who}`,
      'Each chapter is its own small universe',
      vibeWords[0] ? `"${vibeWords[0]}" woven through every line` : 'Every word chosen with intention',
    ],
    2: [
      'Reading back every line',
      `Does this feel like ${who}? Truly?`,
      'Replacing anything that sounds generic',
    ],
    3: [
      'The habits, the places, the inside moments',
      `Building a portrait of ${who}`,
      vibeWords[1] ? `"${vibeWords[1]}" keeps surfacing` : 'Details that make this irreplaceable',
    ],
    4: [
      vibeWords[0] ? `A palette born from "${vibeWords[0]}"` : 'Designing a visual world from scratch',
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
      "This is the part that can't be rushed",
    ],
  };

  return lines[passIdx] ?? lines[0];
}

// ── Polaroid developing photo ─────────────────────────────────
function DevelopingPhoto({
  src,
  isActive,
  position,
}: {
  src: string;
  isActive: boolean;
  position: 'current' | 'prev' | 'next' | 'far';
}) {
  const transforms: Record<string, { x: number; scale: number; rotateY: number; opacity: number; z: number }> = {
    far: { x: 0, scale: 0.5, rotateY: 0, opacity: 0, z: -200 },
    prev: { x: -260, scale: 0.65, rotateY: 12, opacity: 0.3, z: -100 },
    current: { x: 0, scale: 1, rotateY: 0, opacity: 1, z: 0 },
    next: { x: 260, scale: 0.65, rotateY: -12, opacity: 0.3, z: -100 },
  };

  const t = transforms[position];

  return (
    <motion.div
      animate={{
        x: t.x,
        scale: t.scale,
        rotateY: t.rotateY,
        opacity: t.opacity,
        z: t.z,
      }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        width: 'min(420px, 75vw)',
        aspectRatio: '4/3',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: isActive
          ? '0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(163,177,138,0.08)'
          : '0 8px 30px rgba(0,0,0,0.4)',
        border: isActive ? '1px solid rgba(255,255,255,0.08)' : 'none',
        transformStyle: 'preserve-3d',
        willChange: 'transform, opacity',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        loading="lazy"
      />
      {/* Film grain overlay */}
      {isActive && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-conic-gradient(rgba(255,255,255,0.01) 0% 25%, transparent 0% 50%) 0 0 / 3px 3px',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }} />
      )}
      {/* Developing reveal mask — wipes down */}
      {isActive && (
        <motion.div
          initial={{ height: '100%' }}
          animate={{ height: '0%' }}
          transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            background: C.darkBg,
            pointerEvents: 'none',
          }}
        />
      )}
    </motion.div>
  );
}

// ── Film strip progress bar ───────────────────────────────────
function FilmStrip({
  photos,
  activeIndex,
  progress,
}: {
  photos: string[];
  activeIndex: number;
  progress: number;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
      width: '100%', maxWidth: '600px',
    }}>
      {/* Thumbnail strip */}
      <div style={{
        display: 'flex', gap: '3px', justifyContent: 'center',
        padding: '0 1rem', overflow: 'hidden',
      }}>
        {photos.slice(0, 12).map((src, i) => (
          <motion.div
            key={i}
            animate={{
              opacity: i === activeIndex ? 1 : i < activeIndex ? 0.5 : 0.2,
              scale: i === activeIndex ? 1.1 : 1,
            }}
            transition={{ duration: 0.4 }}
            style={{
              width: 'clamp(28px, 5vw, 44px)',
              aspectRatio: '4/3',
              borderRadius: '2px',
              overflow: 'hidden',
              border: i === activeIndex ? `1.5px solid ${C.olive}` : '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
          </motion.div>
        ))}
      </div>
      {/* Progress bar */}
      <div style={{
        height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '1px',
        overflow: 'hidden', width: '100%',
      }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: '100%', background: C.olive, borderRadius: '1px' }}
        />
      </div>
    </div>
  );
}

// ── Ambient thought line ──────────────────────────────────────
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
      const delay = /[.,;:!?—–]/.test(ch) ? speed + 70 : speed;
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
          style={{ display: 'inline-block', width: '1px', height: '0.9em', background: `${C.gold}88`, marginLeft: '1px', verticalAlign: 'text-bottom' }}
        />
      )}
    </>
  );
}

// ── Thought stream ────────────────────────────────────────────
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', minHeight: '3.5rem' }}>
      <AnimatePresence initial={false}>
        {lines.slice(0, visibleCount).map((line, i) => (
          <motion.p
            key={`${line}-${i}`}
            initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
            animate={{ opacity: i === visibleCount - 1 ? 0.65 : 0.25, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              margin: 0, fontFamily: 'var(--eg-font-heading, Georgia, serif)',
              fontStyle: 'italic', fontWeight: 400, fontSize: '0.82rem',
              color: C.darkHeading, letterSpacing: '0.01em', lineHeight: 1.5, textAlign: 'center',
            }}
          >
            {i === visibleCount - 1 ? <TypewriterText text={line} speed={18} /> : line}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
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

  // Completion transition
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

  // Cycle featured photo every 4 seconds
  useEffect(() => {
    if (photos.length === 0) return;
    const t = setInterval(() => {
      setActivePhotoIdx(i => (i + 1) % photos.length);
    }, 4000);
    return () => clearInterval(t);
  }, [photos.length]);

  // Build photo URLs
  const photoUrls = useMemo(() => {
    return photos.slice(0, 20).map(p =>
      p.baseUrl.includes('googleusercontent.com')
        ? `/api/photos/proxy?url=${encodeURIComponent(p.baseUrl)}&w=600&h=450`
        : p.baseUrl
    );
  }, [photos]);

  const thoughts = useMemo(
    () => buildThoughts(idx, names, vibeString, occasion, photos.length),
    [idx, names, vibeString, occasion, photos.length]
  );

  const getPrevIdx = useCallback(() => (activePhotoIdx - 1 + photoUrls.length) % photoUrls.length, [activePhotoIdx, photoUrls.length]);
  const getNextIdx = useCallback(() => (activePhotoIdx + 1) % photoUrls.length, [activePhotoIdx, photoUrls.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isComplete ? 0 : 1 }}
      transition={{ duration: isComplete ? 0.8 : 0.5 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: C.darkBg,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Ambient radial glow behind the photo */}
      <div style={{
        position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '600px', height: '400px', borderRadius: '50%',
        background: `radial-gradient(ellipse, ${C.olive}0D 0%, transparent 70%)`,
        pointerEvents: 'none', filter: 'blur(60px)',
      }} />

      {/* ── Top: Pass headline + copy ── */}
      <div style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 4vh, 3rem)', zIndex: 10, padding: '0 1.5rem' }}>
        <AnimatePresence mode="wait">
          <motion.h1
            key={isComplete ? 'done' : idx}
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--eg-font-heading, Georgia, serif)',
              fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)',
              fontWeight: 400, fontStyle: 'italic',
              color: C.darkHeading,
              letterSpacing: '-0.02em', margin: 0,
            }}
          >
            {isComplete ? 'Your story is ready.' : pass.headline}
          </motion.h1>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.p
            key={isComplete ? 'done-copy' : idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.5, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              color: C.darkText, fontSize: text.base,
              maxWidth: '380px', margin: '0.75rem auto 0', lineHeight: 1.6,
            }}
          >
            {isComplete ? 'Opening the editor...' : pass.copy}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ── Center: Cinematic photo carousel ── */}
      {photoUrls.length > 0 && (
        <div style={{
          position: 'relative', width: '100%', height: 'clamp(200px, 35vh, 360px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          perspective: '1200px', zIndex: 5,
          marginBottom: 'clamp(1rem, 3vh, 2rem)',
        }}>
          {photoUrls.length >= 3 && (
            <DevelopingPhoto
              key={`prev-${getPrevIdx()}`}
              src={photoUrls[getPrevIdx()]}
              isActive={false}
              position="prev"
            />
          )}
          <AnimatePresence mode="sync">
            <DevelopingPhoto
              key={`active-${activePhotoIdx}`}
              src={photoUrls[activePhotoIdx]}
              isActive={true}
              position="current"
            />
          </AnimatePresence>
          {photoUrls.length >= 3 && (
            <DevelopingPhoto
              key={`next-${getNextIdx()}`}
              src={photoUrls[getNextIdx()]}
              isActive={false}
              position="next"
            />
          )}
        </div>
      )}

      {/* ── Thought stream ── */}
      <div style={{ zIndex: 10, marginBottom: 'clamp(1rem, 2vh, 1.5rem)', padding: '0 1.5rem' }}>
        <ThoughtStream lines={thoughts} />
      </div>

      {/* ── Bottom: Film strip progress ── */}
      <div style={{ zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '0 1.5rem' }}>
        {photoUrls.length > 0 && (
          <FilmStrip
            photos={photoUrls}
            activeIndex={activePhotoIdx}
            progress={pass.pct}
          />
        )}

        {/* Pass label + elapsed */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: C.darkText, fontWeight: 600,
        }}>
          <span>Pass {idx + 1} of {PASSES.length}</span>
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: C.darkBorder }} />
          <span>{Math.floor(pass.pct)}%</span>
          {elapsed > 10 && (
            <>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: C.darkBorder }} />
              <span style={{ opacity: 0.5 }}>{elapsed}s</span>
            </>
          )}
        </div>

        {/* Time hint on first pass */}
        {idx === 0 && elapsed < 20 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ delay: 2 }}
            style={{
              fontSize: '0.78rem', fontStyle: 'italic',
              color: C.darkText, margin: 0,
            }}
          >
            This usually takes 2-4 minutes
          </motion.p>
        )}

        {/* Long-running warnings */}
        {elapsed >= 90 && elapsed < 150 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            style={{ fontSize: '0.82rem', fontStyle: 'italic', color: C.darkText, margin: 0 }}
          >
            Taking a moment — still weaving your story...
          </motion.p>
        )}
        {elapsed >= 150 && elapsed < 270 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            style={{ fontSize: '0.82rem', fontStyle: 'italic', color: `${C.gold}88`, margin: 0 }}
          >
            Almost there — please don't close this tab.
          </motion.p>
        )}
        {elapsed >= 270 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
                color: 'rgba(220,120,120,0.9)', fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Stop and try again
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Cancel link ── */}
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
            background: 'none', border: elapsed > 30 ? `1px solid ${C.darkBorder}` : 'none',
            padding: elapsed > 30 ? '0.5rem 1.25rem' : '0.25rem',
            borderRadius: '100px',
            color: C.darkText, fontSize: '0.78rem', cursor: 'pointer',
            textDecoration: elapsed > 30 ? 'none' : 'underline',
            textUnderlineOffset: '2px',
            transition: 'all 0.3s ease',
            zIndex: 20,
          }}
          onMouseOver={e => { (e.target as HTMLElement).style.color = C.darkHeading; }}
          onMouseOut={e => { (e.target as HTMLElement).style.color = C.darkText; }}
        >
          Cancel
        </motion.button>
      )}
    </motion.div>
  );
}
