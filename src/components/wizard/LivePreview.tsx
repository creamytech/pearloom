'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/wizard/LivePreview.tsx
// Live preview sidebar — shows the site building in real-time
// as the user fills out the wizard. Makes the process feel
// magical instead of like filling out a form.
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { ProgressiveState } from '@/lib/progressive-generation';

interface LivePreviewProps {
  state: ProgressiveState;
  names?: [string, string];
  occasion?: string;
}

export function LivePreview({ state, names, occasion }: LivePreviewProps) {
  const displayName = names?.[1]?.trim() && occasion !== 'birthday'
    ? `${names[0]} & ${names[1]}`
    : names?.[0] || 'Your Site';

  return (
    <div className="rounded-[16px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 20px rgba(43,30,20,0.06)' } as React.CSSProperties}>
      {/* Mini browser chrome */}
      <div className="h-7 bg-[var(--pl-cream-deep)] border-b border-[var(--pl-divider)] flex items-center px-3 gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[rgba(0,0,0,0.08)]" />
        <div className="w-2 h-2 rounded-full bg-[rgba(0,0,0,0.08)]" />
        <div className="w-2 h-2 rounded-full bg-[rgba(0,0,0,0.08)]" />
        <div className="flex-1 mx-4 h-3.5 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center">
          <span className="text-[0.45rem] text-[var(--pl-muted)]">pearloom.com</span>
        </div>
      </div>

      {/* Preview content */}
      <div className="p-4 min-h-[300px] flex flex-col">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1 rounded-full bg-[var(--pl-cream-deep)] overflow-hidden">
            <motion.div
              animate={{ width: `${state.progress}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-[var(--pl-olive)]"
            />
          </div>
          <span className="text-[0.55rem] font-bold text-[var(--pl-olive-deep)] tabular-nums">
            {state.progress}%
          </span>
        </div>

        {/* Current task */}
        <AnimatePresence mode="popLayout">
          <motion.p
            key={state.currentTask}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[0.62rem] text-[var(--pl-muted)] mb-4 italic"
          >
            {state.currentTask || 'Waiting for your input...'}
          </motion.p>
        </AnimatePresence>

        {/* Hero preview */}
        <div className="rounded-[16px] p-6 mb-3 text-center relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 20px rgba(43,30,20,0.06)' } as React.CSSProperties}>
          {state.results.style?.palette && (
            <div className="absolute inset-0 opacity-20" style={{
              background: `linear-gradient(135deg, ${state.results.style.palette.accent}20, transparent)`,
            }} />
          )}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: state.progress >= 25 ? 1 : 0.2 }}
            className="font-heading italic text-[clamp(1rem,2vw,1.4rem)] text-[var(--pl-ink-soft)] mb-1"
          >
            {displayName}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: state.progress >= 70 ? 1 : 0.15 }}
            className="text-[0.68rem] text-[var(--pl-muted)] italic"
          >
            {state.results.content?.heroTagline || 'Your tagline will appear here'}
          </motion.p>
        </div>

        {/* Chapter previews */}
        <div className="flex flex-col gap-1.5">
          {(state.results.identity?.chapterTitles || ['Chapter 1', 'Chapter 2', 'Chapter 3']).slice(0, 4).map((title, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{
                opacity: state.progress >= 30 + i * 10 ? 1 : 0.1,
                x: state.progress >= 30 + i * 10 ? 0 : -8,
              }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2 px-3 py-2 rounded-[12px]"
              style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '12px' } as React.CSSProperties}
            >
              <div className="w-6 h-6 rounded-md bg-[var(--pl-cream-deep)]" />
              <div className="flex-1 min-w-0">
                <div className="text-[0.65rem] font-semibold text-[var(--pl-ink-soft)] truncate">
                  {state.progress >= 35 ? title : ''}
                </div>
                <div className="h-1.5 rounded-full bg-[var(--pl-cream-deep)] mt-0.5 w-3/4" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Color palette preview */}
        {state.results.style?.palette && state.progress >= 50 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-1 mt-3 justify-center"
          >
            {Object.values(state.results.style.palette).slice(0, 5).map((color, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border border-[rgba(0,0,0,0.06)]"
                style={{ background: color as string }}
              />
            ))}
          </motion.div>
        )}

        {/* Font preview */}
        {state.results.style?.fontPair && state.progress >= 45 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-2"
          >
            <span className="text-[0.52rem] text-[var(--pl-muted)]">
              {state.results.style.fontPair[0]} + {state.results.style.fontPair[1]}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Quick Start Button ───────────────────────────────────────

interface QuickStartProps {
  onQuickStart: () => void;
}

export function QuickStartBanner({ onQuickStart }: QuickStartProps) {
  return (
    <button
      onClick={onQuickStart}
      className="w-full p-4 rounded-2xl cursor-pointer text-left transition-all hover:-translate-y-0.5 active:scale-[0.99]"
      style={{
        background: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
        borderRadius: '16px',
      } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(163,177,138,0.12)', border: '1px solid rgba(163,177,138,0.2)' }}>
          <Sparkles size={18} className="text-[var(--pl-olive)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.82rem] font-semibold text-[var(--pl-ink)] m-0">
            Start from a Template
          </p>
          <p className="text-[0.68rem] text-[var(--pl-muted)] m-0">
            Skip photos — pick a pre-designed theme and customize it
          </p>
        </div>
        <span className="text-[0.58rem] font-bold uppercase tracking-[0.08em] shrink-0 px-2 py-1 rounded-full text-[var(--pl-olive-deep)]"
          style={{ background: 'rgba(163,177,138,0.1)' }}>
          60 sec
        </span>
      </div>
    </button>
  );
}
