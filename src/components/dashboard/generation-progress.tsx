'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / GenerationProgress.tsx
// The Loom — radial visualization with step sidebar.
// Mobile-first: stacks vertically on mobile, split layout on desktop.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GooglePhotoMetadata } from '@/types';

// ── Loom passes ──────────────────────────────────────────────
const PASSES = [
  { headline: 'Semantic Anchoring', copy: 'Scanning dates, places, and faces.', pct: 2 },
  { headline: 'Atmospheric Synthesis', copy: 'Turning memories into chapters.', pct: 15 },
  { headline: 'Chromatic Weaving', copy: 'Colors, fonts, shapes from your vibe.', pct: 40 },
  { headline: 'Memory Granulation', copy: 'The inside moments that make you, you.', pct: 55 },
  { headline: 'Ethereal Depth Pass', copy: 'Designing your world with care.', pct: 68 },
  { headline: 'Textural Cohesion', copy: 'One-of-a-kind artwork for your site.', pct: 82 },
  { headline: 'Final Polish', copy: 'The tagline and the closing line.', pct: 96 },
];

const SIDEBAR_STEPS = [
  { id: 'neural',    label: 'Neural Thread',    passes: [0, 1] },
  { id: 'chromatic', label: 'Chromatic Weave',  passes: [2, 3] },
  { id: 'pattern',   label: 'Pattern Loft',     passes: [4, 5] },
  { id: 'final',     label: 'Final Curation',   passes: [6] },
];

function getActiveSidebarStep(passIdx: number): string {
  for (const step of SIDEBAR_STEPS) {
    if (step.passes.includes(passIdx)) return step.id;
  }
  return SIDEBAR_STEPS[SIDEBAR_STEPS.length - 1].id;
}

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
  const activeSidebar = isComplete ? 'final' : getActiveSidebarStep(idx);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isComplete || !onComplete) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [isComplete, onComplete]);

  const displayName = names[1]?.trim() && occasion !== 'birthday'
    ? `${names[0]} & ${names[1]}`
    : names[0] || 'your site';

  const pct = isComplete ? 100 : pass.pct;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--pl-cream)]" style={{ fontFamily: 'var(--pl-font-body)' }}>

      {/* ── Top bar ── */}
      <header className="h-[52px] shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-[var(--pl-divider)] bg-white z-10">
        <span className="font-heading italic text-[1rem] font-semibold text-[var(--pl-ink-soft)]">
          Pearloom
        </span>
        <span className="text-[0.82rem] text-[var(--pl-ink)]">The Loom</span>
        <motion.span
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="text-[16px]"
        >
          ✦
        </motion.span>
      </header>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ── Left sidebar — hidden on mobile ── */}
        <aside className="hidden md:flex w-[220px] shrink-0 flex-col p-5 pt-6 border-r border-[var(--pl-divider)] bg-[var(--pl-cream)]">
          <h2 className="font-heading italic text-[1.1rem] text-[var(--pl-ink-soft)] mb-1">
            The Loom
          </h2>
          <p className="text-[0.62rem] font-semibold tracking-[0.1em] uppercase text-[var(--pl-muted)] mb-6">
            Building your celebration site...
          </p>

          <nav className="flex flex-col gap-1 flex-1">
            {SIDEBAR_STEPS.map((s) => {
              const isActive = activeSidebar === s.id;
              const isPast = SIDEBAR_STEPS.findIndex(x => x.id === activeSidebar) > SIDEBAR_STEPS.findIndex(x => x.id === s.id);
              return (
                <div key={s.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] transition-colors ${isActive ? 'bg-[rgba(163,177,138,0.12)]' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${isPast || isActive ? 'bg-[var(--pl-olive-deep)] text-white' : 'bg-[var(--pl-cream-deep)] text-[var(--pl-muted)]'}`}>
                    {isPast ? '✓' : '⚙'}
                  </div>
                  <span className={`text-[0.75rem] font-semibold uppercase tracking-[0.04em] ${isActive ? 'text-[var(--pl-olive-deep)]' : 'text-[var(--pl-muted)]'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </nav>

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-[10px] border-none bg-[var(--pl-olive-deep)] text-white cursor-pointer text-[0.72rem] font-bold tracking-[0.1em] uppercase mt-auto"
            >
              New Generation
            </button>
          )}
        </aside>

        {/* ── Center — mobile-first stacked layout ── */}
        <div className="flex-1 flex flex-col overflow-auto">

          {/* Active generation header */}
          <div className="text-center px-4 pt-6 pb-4 md:pt-8 md:pb-6" style={{
            background: 'linear-gradient(180deg, rgba(163,177,138,0.06) 0%, transparent 100%)',
          }}>
            <p className="text-[0.6rem] font-bold tracking-[0.14em] uppercase text-[var(--pl-muted)] mb-2">
              Active Generation
            </p>
            <h1 className="font-heading italic text-[clamp(1.3rem,4vw,2.2rem)] font-medium text-[var(--pl-ink)] m-0">
              {occasion === 'birthday' ? `Crafting ${displayName}'s celebration` : occasion === 'anniversary' ? `Celebrating ${displayName}` : `Building: ${displayName}`}
            </h1>
          </div>

          {/* Radial loom visualization */}
          <div className="flex-1 flex items-center justify-center relative min-h-[200px] md:min-h-[300px]">
            {/* Concentric circles */}
            {[200, 150, 100].map((size, i) => (
              <motion.div
                key={size}
                animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                transition={{ duration: 30 + i * 10, repeat: Infinity, ease: 'linear' }}
                className="absolute rounded-full"
                style={{
                  width: `min(${size}px, ${size * 0.6}vw)`,
                  height: `min(${size}px, ${size * 0.6}vw)`,
                  border: `1px solid rgba(163,177,138,${0.12 - i * 0.03})`,
                }}
              />
            ))}
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[rgba(163,177,138,0.15)] backdrop-blur-sm flex items-center justify-center z-5 text-[18px]"
            >
              ✦
            </motion.div>
          </div>

          {/* ── Step list — mobile: horizontal pills, desktop: right panel ── */}
          <div className="px-4 pb-3 md:hidden">
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
              {PASSES.map((p, i) => {
                const isActive = i === idx;
                const isPast = i < idx;
                return (
                  <div
                    key={i}
                    className={`shrink-0 px-3 py-2 rounded-full text-[0.62rem] font-bold uppercase tracking-[0.06em] whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[var(--pl-olive-deep)] text-white'
                        : isPast
                          ? 'bg-[rgba(163,177,138,0.15)] text-[var(--pl-olive-deep)]'
                          : 'bg-[var(--pl-cream-deep)] text-[var(--pl-muted)]'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')} {p.headline}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop right step list */}
          <div className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 w-[260px] bg-white/60 backdrop-blur-md rounded-[16px] p-5 border border-[rgba(0,0,0,0.06)]">
            {PASSES.map((p, i) => {
              const isActive = i === idx;
              const isPast = i < idx;
              return (
                <div key={i} className={`flex items-center gap-3 py-2 ${isPast ? 'opacity-50' : isActive ? 'opacity-100' : 'opacity-40'}`}>
                  <span className={`text-[0.72rem] font-bold min-w-[20px] ${isActive ? 'text-[var(--pl-olive-deep)]' : 'text-[var(--pl-muted)]'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className={`transition-all ${isActive ? 'w-6' : 'w-4'} h-[2px] ${isActive ? 'bg-[var(--pl-ink)]' : 'bg-[var(--pl-divider)]'}`} />
                  <span className={`transition-all ${isActive ? 'text-[1rem] font-heading font-semibold italic text-[var(--pl-ink)]' : 'text-[0.82rem] text-[var(--pl-muted)]'}`}>
                    {p.headline}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Bottom progress ── */}
          <div className="shrink-0 px-4 py-3 md:px-8 md:py-4 border-t border-[var(--pl-divider)] bg-white/50">
            <div className="flex items-start md:items-center justify-between gap-3 mb-2">
              <div className="min-w-0">
                <span className="text-[0.58rem] font-bold tracking-[0.1em] uppercase text-[var(--pl-muted)] block">
                  Weaving Progress
                </span>
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={idx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="font-heading italic text-[clamp(0.9rem,2.5vw,1.1rem)] font-medium text-[var(--pl-ink)] mt-0.5 m-0"
                  >
                    {isComplete ? 'Complete' : `Refining ${pass.headline}`}
                  </motion.h3>
                </AnimatePresence>
              </div>
              <span className="text-[clamp(1rem,3vw,1.2rem)] font-semibold text-[var(--pl-olive-deep)] shrink-0">
                {pct}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-[var(--pl-cream-deep)] overflow-hidden mb-2">
              <motion.div
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-[var(--pl-olive-deep)]"
              />
            </div>

            {/* Status line */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[0.52rem] md:text-[0.58rem] font-semibold tracking-[0.06em] uppercase text-[var(--pl-muted)]">
                AI Engine: <strong className="text-[var(--pl-ink-soft)]">Loom v2.4</strong>
                {' // '}Latency: <strong className="text-[var(--pl-ink-soft)]">14ms</strong>
                {' // '}Entropy: <strong className="text-[var(--pl-ink-soft)]">0.82</strong>
              </span>
              {onCancel && !isComplete && (
                <button
                  onClick={onCancel}
                  className="text-[0.58rem] font-bold tracking-[0.06em] uppercase text-[var(--pl-warning)] bg-transparent border-none cursor-pointer flex items-center gap-1"
                >
                  ✕ Abort
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
