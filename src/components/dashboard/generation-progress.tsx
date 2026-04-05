'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/generation-progress.tsx
// Fluid generation progress screen with WebGL mesh gradient
// backdrop, smooth progress ring, and step-by-step updates.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MeshGradient } from '@paper-design/shaders-react';
import type { GooglePhotoMetadata } from '@/types';

// ── Pass descriptors ──────────────────────────────────────────
const PASSES = [
  { headline: 'Reading your photos', copy: 'Scanning dates, places, and faces.', pct: 2, peek: 'Discovering your story...' },
  { headline: 'Writing your story', copy: 'Turning memories into chapters.', pct: 15, peek: 'Chapter 1 taking shape...' },
  { headline: 'Refining every word', copy: 'Rewriting anything below a 9/10.', pct: 40, peek: 'Making every sentence sing...' },
  { headline: 'Learning your DNA', copy: 'The inside jokes that make you, you.', pct: 50, peek: 'Found something beautiful...' },
  { headline: 'Designing your world', copy: 'Colors, fonts, shapes from your vibe.', pct: 65, peek: 'Your palette is gorgeous...' },
  { headline: 'Painting custom art', copy: 'One-of-a-kind artwork for your site.', pct: 78, peek: 'Artwork coming to life...' },
  { headline: 'Uploading photos', copy: 'Saving to permanent storage.', pct: 88, peek: 'Almost ready to reveal...' },
  { headline: 'Final poetry', copy: 'The tagline and the closing line.', pct: 96, peek: 'Adding the finishing touch...' },
];

// ── Progress ring SVG ─────────────────────────────────────────
function ProgressRing({ progress, size = 120 }: { progress: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
      {/* Progress */}
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

// ── Photo mosaic ──────────────────────────────────────────────
function PhotoMosaic({ photos, activeCount }: { photos: GooglePhotoMetadata[]; activeCount: number }) {
  const visible = photos.slice(0, Math.min(activeCount, 6));
  if (visible.length === 0) return null;

  return (
    <div style={{
      display: 'flex', gap: '4px', justifyContent: 'center',
      opacity: 0.6, marginTop: '1.5rem',
    }}>
      {visible.map((photo, i) => (
        <motion.div
          key={photo.id || i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {photo.baseUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photos/proxy?url=${encodeURIComponent(photo.baseUrl)}&w=100&h=100`}
              alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.1)' }} />
          )}
        </motion.div>
      ))}
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

  const activeCount = Math.min(idx + 2, photos.length, 6);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Completion callback
  useEffect(() => {
    if (!isComplete || !onComplete) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [isComplete, onComplete]);

  // Mesh gradient colors derived from step
  const meshColors = useMemo(() => {
    const palettes = [
      ['#1a1510', '#2d2618', '#3a2f20', '#1a1510'],
      ['#1a1510', '#2d3a20', '#1a2d18', '#1a1510'],
      ['#1a1510', '#2d2618', '#3a3020', '#201a10'],
      ['#1a1510', '#1a2a28', '#2d2618', '#1a1510'],
    ];
    return palettes[idx % palettes.length];
  }, [idx]);

  const displayName = names[1]?.trim()
    ? `${names[0]} & ${names[1]}`
    : names[0] || 'your site';

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* WebGL mesh gradient backdrop */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MeshGradient
          colors={meshColors}
          speed={0.12}
          distortion={0.3}
          swirl={0.2}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Vignette overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '2rem',
        maxWidth: '460px', width: '100%',
      }}>
        {/* For label */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 0.4 }}
          style={{
            fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#fff', margin: '0 0 2rem', fontWeight: 600,
          }}
        >
          Creating {displayName}
        </motion.p>

        {/* Progress ring with percentage */}
        <div style={{ position: 'relative', marginBottom: '2rem' }}>
          <ProgressRing progress={isComplete ? 100 : pass.pct} size={120} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '2px',
          }}>
            <motion.span
              key={pass.pct}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}
            >
              {isComplete ? 100 : pass.pct}%
            </motion.span>
          </div>
        </div>

        {/* Step headline + copy */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isComplete ? 'complete' : idx}
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: '1.5rem' }}
          >
            <h2 style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: isComplete ? 'clamp(1.6rem, 4.5vw, 2.4rem)' : 'clamp(1.4rem, 4vw, 2rem)',
              fontWeight: 600, fontStyle: 'italic',
              color: '#fff', margin: '0 0 0.5rem',
              lineHeight: 1.2,
            }}>
              {isComplete ? 'Your story is ready ✨' : pass.headline}
            </h2>
            <p style={{
              fontSize: '0.9rem', color: isComplete ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)',
              margin: 0, lineHeight: 1.5,
            }}>
              {isComplete ? 'Opening the editor — prepare to be amazed' : pass.copy}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Sneak peek hint */}
        {!isComplete && idx >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '100px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '1rem',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', margin: 0, fontStyle: 'italic' }}
              >
                {pass.peek}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}

        {/* Step dots */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
          {PASSES.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === idx ? '20px' : '6px',
                background: i <= idx ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.15)',
              }}
              transition={{ duration: 0.3 }}
              style={{ height: '6px', borderRadius: '3px' }}
            />
          ))}
        </div>

        {/* Step counter + elapsed */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)', fontWeight: 600,
        }}>
          <span>Step {idx + 1} of {PASSES.length}</span>
          {elapsed > 5 && (
            <>
              <span style={{ opacity: 0.4 }}>&middot;</span>
              <span>{formatTime(elapsed)}</span>
            </>
          )}
        </div>

        {/* Photo mosaic */}
        <PhotoMosaic photos={photos} activeCount={activeCount} />

        {/* Time hints */}
        {idx === 0 && elapsed < 20 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 3 }}
            style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#fff', margin: '1.5rem 0 0' }}>
            This usually takes 2–4 minutes
          </motion.p>
        )}
        {elapsed >= 120 && elapsed < 240 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.4 }}
            style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', margin: '1.5rem 0 0' }}>
            Still working — almost there&hellip;
          </motion.p>
        )}
        {elapsed >= 240 && !isComplete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,200,100,0.7)', marginBottom: '0.75rem' }}>
              Taking longer than usual&hellip;
            </p>
            {onCancel && (
              <button onClick={onCancel} style={{
                padding: '0.5rem 1.25rem', borderRadius: '100px',
                border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              }}>
                Cancel
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
