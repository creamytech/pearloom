'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / WizardLayout.tsx — Cinematic wizard shell
// Dark, moody, film-like experience for site creation
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Palette, Compass, X, ArrowLeft, Check } from 'lucide-react';
import type { WizardStep } from '@/lib/wizard-state';

const STEPS = [
  { id: 'photos',     label: 'Memories',  num: '01', matchSteps: ['photos', 'upload', 'clusters'] },
  { id: 'vibe',       label: 'Vision',    num: '02', matchSteps: ['vibe'] },
  { id: 'generating', label: 'Weave',     num: '03', matchSteps: ['generating'] },
] as const;

function getStepIndex(step: WizardStep): number {
  if (step === 'photos' || step === 'upload' || step === 'clusters') return 0;
  if (step === 'vibe') return 1;
  if (step === 'generating') return 2;
  return 0;
}

interface WizardLayoutProps {
  step: WizardStep;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onStepClick?: (stepId: string) => void;
  rightPanel?: React.ReactNode;
  onClose?: () => void;
}

export function WizardLayout({ step, title, subtitle, children, onStepClick, rightPanel, onClose }: WizardLayoutProps) {
  const currentIdx = getStepIndex(step);

  return (
    <main className="min-h-dvh flex flex-col" style={{
      background: 'linear-gradient(180deg, #1a1814 0%, #2a2520 40%, #1e1b17 100%)',
    }}>

      {/* ── Cinematic header ── */}
      <header className="shrink-0 z-20 relative">
        {/* Subtle grain overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }} />

        <div className="flex items-center justify-between px-5 md:px-8 h-14">
          {/* Left: back */}
          {onClose && (
            <motion.button
              onClick={onClose}
              whileHover={{ x: -2 }}
              className="flex items-center gap-1.5 text-[0.72rem] font-medium bg-transparent border-none cursor-pointer"
              style={{ color: 'rgba(245,241,232,0.4)' }}
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Exit</span>
            </motion.button>
          )}
          {!onClose && <div />}

          {/* Center: progress indicators */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const isActive = i === currentIdx;
              const isComplete = i < currentIdx;
              const isClickable = i < currentIdx && !!onStepClick;

              return (
                <div key={s.id} className="flex items-center">
                  {i > 0 && (
                    <div className="w-8 md:w-14 h-px mx-1" style={{
                      background: i <= currentIdx
                        ? 'rgba(200,180,140,0.5)'
                        : 'rgba(245,241,232,0.08)',
                    }} />
                  )}
                  <button
                    onClick={() => isClickable && onStepClick!(s.matchSteps[0] as string)}
                    disabled={!isClickable}
                    className="flex items-center gap-2 border-none transition-all"
                    style={{
                      background: 'transparent',
                      cursor: isClickable ? 'pointer' : 'default',
                      padding: '6px 0',
                    }}
                  >
                    {/* Step number / check */}
                    <span
                      className="flex items-center justify-center rounded-full transition-all"
                      style={{
                        width: isActive ? '28px' : '22px',
                        height: isActive ? '28px' : '22px',
                        background: isActive
                          ? 'rgba(200,180,140,0.2)'
                          : isComplete
                            ? 'rgba(200,180,140,0.15)'
                            : 'rgba(245,241,232,0.05)',
                        border: isActive
                          ? '1.5px solid rgba(200,180,140,0.6)'
                          : isComplete
                            ? '1px solid rgba(200,180,140,0.3)'
                            : '1px solid rgba(245,241,232,0.08)',
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        color: isActive
                          ? 'rgba(220,200,160,1)'
                          : isComplete
                            ? 'rgba(200,180,140,0.8)'
                            : 'rgba(245,241,232,0.2)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {isComplete ? <Check size={10} strokeWidth={3} /> : s.num}
                    </span>
                    {/* Label — only on desktop or active */}
                    <span
                      className={`text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition-all ${isActive ? '' : 'hidden md:inline'}`}
                      style={{
                        color: isActive
                          ? 'rgba(220,200,160,0.9)'
                          : isComplete
                            ? 'rgba(200,180,140,0.5)'
                            : 'rgba(245,241,232,0.15)',
                      }}
                    >
                      {s.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right: close */}
          {onClose ? (
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer"
              style={{
                background: 'rgba(245,241,232,0.06)',
                color: 'rgba(245,241,232,0.3)',
                border: '1px solid rgba(245,241,232,0.06)',
              }}
            >
              <X size={14} />
            </motion.button>
          ) : <div className="w-8" />}
        </div>

        {/* Bottom accent line */}
        <div className="h-px" style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(200,180,140,0.2) 30%, rgba(200,180,140,0.3) 50%, rgba(200,180,140,0.2) 70%, transparent 100%)',
        }} />
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[30%] left-[10%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{
            background: 'radial-gradient(circle, rgba(200,180,140,1) 0%, transparent 70%)',
          }} />
          <div className="absolute -bottom-[20%] right-[5%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{
            background: 'radial-gradient(circle, rgba(163,177,138,1) 0%, transparent 70%)',
          }} />
        </div>

        {/* Center content */}
        <div className="flex-1 overflow-auto relative z-10">
          <div className="max-w-[900px] mx-auto px-5 md:px-10 py-8 md:py-12">
            {/* Step header */}
            {title && step !== 'dashboard' && step !== 'generating' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="mb-10 md:mb-14"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '40px' }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="h-[1px] mb-6"
                  style={{ background: 'rgba(200,180,140,0.5)' }}
                />
                <h2
                  className="font-heading font-normal leading-[1.1] tracking-tight m-0"
                  style={{
                    fontSize: 'clamp(1.8rem, 5vw, 3.2rem)',
                    color: 'rgba(245,241,232,0.92)',
                    fontStyle: 'italic',
                  }}
                >
                  {title}
                </h2>
                {subtitle && (
                  <p
                    className="max-w-[480px] leading-relaxed mt-4"
                    style={{
                      fontSize: 'clamp(0.85rem, 1.5vw, 0.95rem)',
                      color: 'rgba(245,241,232,0.35)',
                    }}
                  >
                    {subtitle}
                  </p>
                )}
              </motion.div>
            )}

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>

            {/* Right panel — stacks below on mobile */}
            {rightPanel && (
              <div className="mt-10 lg:hidden">
                {rightPanel}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — visible on lg+ as sidebar */}
        {rightPanel && (
          <aside className="hidden lg:block w-[280px] shrink-0 p-5 overflow-auto relative z-10">
            {rightPanel}
          </aside>
        )}
      </div>
    </main>
  );
}
