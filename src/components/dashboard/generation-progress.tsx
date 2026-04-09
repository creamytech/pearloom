'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / GenerationProgress.tsx
// Cinematic generation experience — watch your site come alive.
// Uses CSS animations for preview elements (no hydration issues),
// Framer Motion only for page-level entrance.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Camera } from 'lucide-react';
import type { GooglePhotoMetadata } from '@/types';

// ── Phase definitions ──────────────────────────────────────────
const PHASES = [
  { headline: 'Understanding Your Story', pct: 2 },
  { headline: 'Setting the Mood', pct: 15 },
  { headline: 'Choosing Your Colors', pct: 40 },
  { headline: 'Selecting Best Photos', pct: 55 },
  { headline: 'Creating Your Design', pct: 68 },
  { headline: 'Writing Your Story', pct: 82 },
  { headline: 'Final Touches', pct: 96 },
];

// ── Encouraging messages ───────────────────────────────────────
const MESSAGES = [
  'This usually takes about a minute...',
  'AI is crafting something special for you...',
  'Almost there \u2014 adding the finishing touches...',
  'Your guests are going to love this...',
  'Weaving your memories into something beautiful...',
  'Every detail is being placed with care...',
];

// ── Color palette for phase 3 ──────────────────────────────────
const PREVIEW_COLORS = ['#A3B18A', '#C4A96A', '#6D597A', '#E8D5C4', '#3D3530'];

// ── SVG Progress Ring constants ────────────────────────────────
const RING_SIZE = 160;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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
  const idx = Math.min(step, PHASES.length - 1);
  const phase = PHASES[idx];
  const pct = isComplete ? 100 : phase.pct;
  const strokeDashoffset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;

  const [elapsed, setElapsed] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Rotate encouraging messages every 5s
  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % MESSAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Completion callback
  useEffect(() => {
    if (!isComplete || !onComplete) return;
    const t = setTimeout(onComplete, 2000);
    return () => clearTimeout(t);
  }, [isComplete, onComplete]);

  const displayName = names[1]?.trim() && occasion !== 'birthday'
    ? `${names[0]} & ${names[1]}`
    : names[0] || 'Your Site';

  // Derive photo thumbnails (up to 4)
  const thumbs = useMemo(
    () => photos.slice(0, 4).map(p => p.baseUrl || ''),
    [photos],
  );

  // Sparkle positions for completion confetti
  const sparkles = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 1.5,
      size: 4 + Math.random() * 8,
    })), [],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-auto"
      style={{
        fontFamily: 'var(--pl-font-body)',
        background: 'linear-gradient(135deg, #E8D5C4 0%, #F2E6D9 25%, #D4B8A0 50%, #E8CDB8 75%, #F0DFD0 100%)',
      }}
    >
      {/* Ambient radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,240,220,0.5) 0%, transparent 60%)',
      }} />

      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes pl-typewriter {
          from { width: 0 }
          to { width: 100% }
        }
        @keyframes pl-typewriter-cursor {
          0%, 100% { border-color: var(--pl-ink-soft) }
          50% { border-color: transparent }
        }
        @keyframes pl-gradient-fill {
          0% { opacity: 0; transform: scale(0.95) }
          100% { opacity: 1; transform: scale(1) }
        }
        @keyframes pl-dot-in {
          0% { opacity: 0; transform: translateX(-12px) scale(0) }
          100% { opacity: 1; transform: translateX(0) scale(1) }
        }
        @keyframes pl-shimmer {
          0% { background-position: -200% 0 }
          100% { background-position: 200% 0 }
        }
        @keyframes pl-photo-in {
          0% { opacity: 0; filter: blur(8px) brightness(1.3) }
          100% { opacity: 1; filter: blur(0) brightness(1) }
        }
        @keyframes pl-font-morph {
          0% { font-family: sans-serif; letter-spacing: 0.1em; opacity: 0.4 }
          50% { font-family: serif; letter-spacing: 0; opacity: 0.7 }
          100% { font-family: var(--pl-font-heading); letter-spacing: -0.01em; opacity: 1 }
        }
        @keyframes pl-line-type {
          0% { width: 0; opacity: 0 }
          10% { opacity: 1 }
          100% { width: 100%; opacity: 1 }
        }
        @keyframes pl-sparkle {
          0% { opacity: 0; transform: scale(0) rotate(0deg) }
          50% { opacity: 1; transform: scale(1) rotate(180deg) }
          100% { opacity: 0; transform: scale(0) rotate(360deg) }
        }
        @keyframes pl-confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg) }
          100% { opacity: 0; transform: translateY(80px) rotate(720deg) }
        }
        @keyframes pl-ring-pulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(163,177,138,0)) }
          50% { transform: scale(1.06); filter: drop-shadow(0 0 20px rgba(163,177,138,0.4)) }
          100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(163,177,138,0)) }
        }
        @keyframes pl-fade-up {
          0% { opacity: 0; transform: translateY(8px) }
          100% { opacity: 1; transform: translateY(0) }
        }
        @keyframes pl-msg-swap {
          0% { opacity: 0; transform: translateY(6px) }
          15% { opacity: 1; transform: translateY(0) }
          85% { opacity: 1; transform: translateY(0) }
          100% { opacity: 0; transform: translateY(-6px) }
        }
      `}</style>

      {/* ── Main content area ── */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[680px] px-4 py-6 md:py-10 gap-6 md:gap-8">

        {/* ── Top branding ── */}
        <div className="text-center">
          <span className="font-heading italic text-[1rem] font-semibold text-[var(--pl-ink-soft)] opacity-60">
            Pearloom
          </span>
        </div>

        {/* ── Live Preview Canvas — browser frame ── */}
        <div
          className="w-full max-w-[480px] rounded-[20px] overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(24px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 12px 48px rgba(43,30,20,0.12), 0 4px 16px rgba(43,30,20,0.06)',
          } as React.CSSProperties}
        >
          {/* Browser chrome bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(0,0,0,0.06)]">
            <div className="flex gap-1.5">
              <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F57]" />
              <div className="w-[10px] h-[10px] rounded-full bg-[#FEBC2E]" />
              <div className="w-[10px] h-[10px] rounded-full bg-[#28C840]" />
            </div>
            <div className="flex-1 mx-4 py-1 px-3 rounded-md bg-[rgba(0,0,0,0.04)] text-center">
              <span className="text-[0.6rem] text-[var(--pl-muted)] tracking-wide">
                pearloom.co/{displayName.toLowerCase().replace(/\s+&\s+/g, '-and-').replace(/[^a-z0-9-]/g, '')}
              </span>
            </div>
          </div>

          {/* Preview content area */}
          <div className="relative min-h-[220px] md:min-h-[280px] p-5 md:p-7 flex flex-col gap-4 overflow-hidden" style={{
            background: idx >= 1 ? 'linear-gradient(180deg, #FAF7F2 0%, #F0EBE0 100%)' : '#FFFFFF',
            transition: 'background 1.2s ease',
          }}>

            {/* Phase 1: Couple names typewriter */}
            {idx >= 0 && (
              <div className="overflow-hidden">
                <h2
                  className="font-heading italic text-[clamp(1.2rem,3.5vw,1.6rem)] text-[var(--pl-ink-soft)] whitespace-nowrap overflow-hidden m-0"
                  style={{
                    animation: 'pl-typewriter 1.5s steps(30) forwards, pl-typewriter-cursor 0.6s step-end 4',
                    borderRight: '2px solid var(--pl-ink-soft)',
                    width: '0',
                  }}
                >
                  {displayName}
                </h2>
                {occasion !== 'birthday' && (
                  <p className="text-[0.7rem] text-[var(--pl-muted)] mt-1 uppercase tracking-[0.12em] font-semibold"
                    style={{ animation: 'pl-fade-up 0.8s ease 1.6s both' }}>
                    {occasion === 'anniversary' ? 'Anniversary' : occasion === 'engagement' ? 'Engagement' : 'Wedding'}
                  </p>
                )}
              </div>
            )}

            {/* Phase 2: Background gradient fill — handled by container bg transition above */}
            {idx >= 1 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(163,177,138,0.08) 0%, transparent 70%)',
                  animation: 'pl-gradient-fill 1.5s ease forwards',
                }}
              />
            )}

            {/* Phase 3: Color palette dots */}
            {idx >= 2 && (
              <div className="flex items-center gap-2.5 mt-1">
                {PREVIEW_COLORS.map((color, i) => (
                  <div
                    key={color}
                    className="rounded-full"
                    style={{
                      width: 24,
                      height: 24,
                      background: color,
                      animation: `pl-dot-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.12}s both`,
                      boxShadow: `0 2px 8px ${color}44`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Phase 4: Photo thumbnails shimmer in */}
            {idx >= 3 && (
              <div className="flex gap-2 mt-1">
                {(thumbs.length > 0 ? thumbs : [null, null, null, null]).map((url, i) => (
                  <div
                    key={i}
                    className="w-[56px] h-[56px] md:w-[64px] md:h-[64px] rounded-lg overflow-hidden flex-shrink-0"
                    style={{
                      animation: `pl-photo-in 0.8s ease ${i * 0.15}s both`,
                      background: url
                        ? undefined
                        : `linear-gradient(90deg, var(--pl-cream-deep) 25%, rgba(255,255,255,0.6) 50%, var(--pl-cream-deep) 75%)`,
                      backgroundSize: url ? undefined : '200% 100%',
                    }}
                  >
                    {url ? (
                      <img
                        src={`${url}=w128-h128-c`}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background: 'var(--pl-cream-deep)',
                        }}
                      >
                        <Camera size={20} style={{ color: 'var(--pl-muted)', opacity: 0.4 }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Phase 5: Font style morph */}
            {idx >= 4 && (
              <p
                className="text-[clamp(0.9rem,2.5vw,1.1rem)] font-semibold text-[var(--pl-ink)] m-0"
                style={{
                  animation: 'pl-font-morph 1.2s ease forwards',
                }}
              >
                Our Story Begins
              </p>
            )}

            {/* Phase 6: Lines of text typing in */}
            {idx >= 5 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {['A love story written in the stars', 'Every moment, a chapter worth reading', 'Welcome to our celebration'].map((line, i) => (
                  <div key={i} className="overflow-hidden h-[16px]">
                    <div
                      className="text-[0.68rem] text-[var(--pl-muted)] whitespace-nowrap overflow-hidden"
                      style={{
                        animation: `pl-line-type 1.2s ease ${i * 0.4}s both`,
                        width: '0',
                      }}
                    >
                      {line}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Phase 7 / Completion: Sparkle burst */}
            {(idx >= 6 || isComplete) && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {sparkles.map(s => (
                  <div
                    key={s.id}
                    className="absolute"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      width: s.size,
                      height: s.size,
                      animation: `pl-sparkle 1.8s ease ${s.delay}s both`,
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" width="100%" height="100%">
                      <path
                        d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6L12 0Z"
                        fill={isComplete ? 'var(--pl-gold)' : 'var(--pl-olive)'}
                        opacity="0.6"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            )}

            {/* Completion state overlay */}
            {isComplete && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center z-10"
                style={{
                  background: 'rgba(250,247,242,0.85)',
                  animation: 'pl-fade-up 0.6s ease both',
                }}
              >
                <div
                  className="text-[2rem] mb-2"
                  style={{ animation: 'pl-sparkle 2s ease infinite' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
                    <path
                      d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6L12 0Z"
                      fill="var(--pl-gold)"
                    />
                  </svg>
                </div>
                <h3 className="font-heading italic text-[1.4rem] text-[var(--pl-ink-soft)] m-0">
                  Your site is ready!
                </h3>
                <p className="text-[0.78rem] text-[var(--pl-muted)] mt-1">
                  Time to make it yours
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Progress Ring ── */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative"
            style={{
              width: RING_SIZE,
              height: RING_SIZE,
              animation: isComplete ? 'pl-ring-pulse 1.2s ease 0.3s both' : 'none',
            }}
          >
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              className="transform -rotate-90"
            >
              {/* Track */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="var(--pl-cream-deep)"
                strokeWidth={RING_STROKE}
              />
              {/* Fill */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={isComplete ? 'var(--pl-olive-deep)' : 'var(--pl-olive)'}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease',
                }}
              />
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-[0.62rem] font-bold tracking-[0.08em] uppercase text-[var(--pl-muted)] text-center max-w-[100px] leading-tight"
                key={idx}
                style={{ animation: 'pl-fade-up 0.4s ease both' }}
              >
                {isComplete ? 'Complete' : phase.headline}
              </span>
            </div>
          </div>

          {/* Percentage */}
          <span className="text-[2rem] font-bold text-[var(--pl-olive-deep)] tabular-nums">
            {pct}%
          </span>
        </div>

        {/* ── Encouraging message ── */}
        <div className="h-[24px] flex items-center justify-center overflow-hidden">
          <p
            className="text-[0.78rem] text-[var(--pl-muted)] text-center m-0 italic"
            key={msgIdx}
            style={{ animation: 'pl-msg-swap 5s ease both' }}
          >
            {MESSAGES[msgIdx]}
          </p>
        </div>

        {/* ── Phase steps — compact horizontal ── */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {PHASES.map((p, i) => {
            const isActive = i === idx && !isComplete;
            const isPast = i < idx || isComplete;
            return (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 rounded-full transition-all duration-300"
                style={{
                  minHeight: '36px',
                  background: isActive
                    ? 'var(--pl-olive-deep)'
                    : isPast
                      ? 'var(--pl-olive)'
                      : 'var(--pl-cream-deep)',
                }}
              >
                <span
                  className="font-bold flex items-center justify-center"
                  style={{
                    color: isActive || isPast ? '#fff' : 'var(--pl-muted)',
                    fontSize: '0.6rem',
                  }}
                >
                  {isPast ? <Check size={12} strokeWidth={3} /> : String(i + 1).padStart(2, '0')}
                </span>
                {/* Show label on active pill always, others on desktop */}
                <span
                  className={`text-[0.6rem] font-semibold tracking-[0.02em] whitespace-nowrap ${isActive ? '' : 'hidden md:inline'}`}
                  style={{
                    color: isActive || isPast ? '#fff' : 'var(--pl-muted)',
                  }}
                >
                  {p.headline}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Completion: Enter Editor button ── */}
        {isComplete && onComplete && (
          <button
            onClick={onComplete}
            className="mt-2 px-8 py-3.5 rounded-full border-none cursor-pointer text-[0.88rem] font-bold tracking-[0.06em] text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: 'var(--pl-olive-deep)',
              boxShadow: '0 4px 20px rgba(110,140,92,0.3)',
              animation: 'pl-fade-up 0.6s ease 0.5s both',
            }}
          >
            Enter Your Editor
          </button>
        )}

        {/* ── Bottom status bar ── */}
        <div className="flex items-center justify-between w-full max-w-[480px] mt-2">
          <span className="text-[0.52rem] font-semibold tracking-[0.06em] uppercase text-[var(--pl-muted)]">
            Powered by <strong className="text-[var(--pl-ink-soft)]">Pearloom AI</strong>
            {' \u00B7 '}
            <strong className="text-[var(--pl-ink-soft)]">{elapsed}s</strong>
          </span>
          {onCancel && !isComplete && (
            <button
              onClick={onCancel}
              className="text-[0.58rem] font-bold tracking-[0.06em] uppercase text-[var(--pl-warning)] bg-transparent border-none cursor-pointer flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
