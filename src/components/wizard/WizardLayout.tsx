'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / WizardLayout.tsx — Glass-styled wizard shell
// Progress stepper, glass header, responsive layout
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Sparkles, Palette, Compass, X, Menu, ArrowLeft, Check } from 'lucide-react';
import type { WizardStep } from '@/lib/wizard-state';

const STEPS = [
  { id: 'photos',     label: 'Photos',  Icon: Image,    matchSteps: ['photos', 'upload', 'clusters'] },
  { id: 'vibe',       label: 'Style',   Icon: Palette,  matchSteps: ['vibe'] },
  { id: 'generating', label: 'Build',   Icon: Compass,  matchSteps: ['generating'] },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-dvh flex flex-col bg-[var(--pl-cream)]">

      {/* ── Glass header ── */}
      <header
        className="shrink-0 z-20 border-b border-[rgba(0,0,0,0.06)]"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        } as React.CSSProperties}
      >
        {/* Top row */}
        <div className="h-12 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-[var(--pl-muted)] cursor-pointer"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="hidden md:flex items-center gap-1.5 text-[0.72rem] font-medium text-[var(--pl-muted)] bg-transparent border-none cursor-pointer hover:text-[var(--pl-ink)] transition-colors"
              >
                <ArrowLeft size={13} />
                Dashboard
              </button>
            )}
          </div>

          {/* Center: Pearloom branding */}
          <span className="font-heading italic text-[1rem] font-semibold text-[var(--pl-ink-soft)]">
            Pearloom
          </span>

          {/* Right: close button */}
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-[rgba(0,0,0,0.06)] bg-white/50 cursor-pointer flex items-center justify-center text-[var(--pl-muted)] hover:text-[var(--pl-ink)] hover:bg-white transition-all"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Progress stepper — desktop */}
        <div className="hidden md:flex items-center justify-center gap-0 pb-3 px-6">
          {STEPS.map((s, i) => {
            const Icon = s.Icon;
            const isActive = i === currentIdx;
            const isComplete = i < currentIdx;
            const isClickable = i < currentIdx && onStepClick;

            return (
              <div key={s.id} className="flex items-center">
                {i > 0 && (
                  <div
                    className="w-12 h-[2px] mx-1"
                    style={{
                      background: i <= currentIdx
                        ? 'var(--pl-olive)'
                        : 'rgba(0,0,0,0.08)',
                      borderRadius: '1px',
                    }}
                  />
                )}
                <button
                  onClick={() => isClickable && onStepClick(s.matchSteps[0] as string)}
                  disabled={!isClickable}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border-none transition-all"
                  style={{
                    background: isActive
                      ? 'var(--pl-olive)'
                      : isComplete
                        ? 'rgba(163,177,138,0.15)'
                        : 'rgba(0,0,0,0.03)',
                    color: isActive
                      ? 'white'
                      : isComplete
                        ? 'var(--pl-olive-deep)'
                        : 'var(--pl-muted)',
                    cursor: isClickable ? 'pointer' : isActive ? 'default' : 'default',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                >
                  {isComplete ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <Icon size={13} />
                  )}
                  {s.label}
                </button>
              </div>
            );
          })}
        </div>

        {/* Progress stepper — mobile pill */}
        <div className="md:hidden flex items-center justify-center gap-1.5 pb-2.5 px-4">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className="h-1 rounded-full flex-1 transition-all"
              style={{
                background: i <= currentIdx ? 'var(--pl-olive)' : 'rgba(0,0,0,0.08)',
                maxWidth: '80px',
              }}
            />
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Mobile step drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/20 md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.aside
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                className="fixed top-0 left-0 bottom-0 z-50 w-[260px] flex flex-col md:hidden overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  boxShadow: '4px 0 24px rgba(43,30,20,0.08)',
                } as React.CSSProperties}
              >
                <div className="p-5 pb-3 border-b border-[rgba(0,0,0,0.06)]">
                  <span className="font-heading italic text-lg text-[var(--pl-ink-soft)]">
                    Pearloom
                  </span>
                  <p className="text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)] mt-0.5">
                    Site Builder
                  </p>
                </div>
                <nav className="flex flex-col gap-1 p-4">
                  {STEPS.map((s, i) => {
                    const Icon = s.Icon;
                    const isActive = i === currentIdx;
                    const isComplete = i < currentIdx;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (i <= currentIdx && onStepClick) {
                            onStepClick(s.matchSteps[0] as string);
                          }
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border-none w-full text-left cursor-pointer text-[0.88rem] transition-all"
                        style={{
                          background: isActive ? 'rgba(163,177,138,0.12)' : 'transparent',
                          color: isActive ? 'var(--pl-olive-deep)' : isComplete ? 'var(--pl-ink-soft)' : 'var(--pl-muted)',
                          fontWeight: isActive ? 600 : 400,
                          fontFamily: 'var(--pl-font-body)',
                        }}
                      >
                        {isComplete ? <Check size={16} className="text-[var(--pl-olive)]" /> : <Icon size={16} />}
                        {s.label}
                      </button>
                    );
                  })}
                </nav>
                {onClose && (
                  <div className="mt-auto p-4 border-t border-[rgba(0,0,0,0.06)]">
                    <button
                      onClick={onClose}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-none w-full text-left text-[0.82rem] text-[var(--pl-muted)] bg-transparent cursor-pointer hover:bg-[rgba(0,0,0,0.03)] transition-colors"
                    >
                      <ArrowLeft size={14} />
                      Back to Dashboard
                    </button>
                  </div>
                )}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Center content */}
        <div className="flex-1 overflow-auto p-5 md:p-10 lg:p-14 relative">
          {/* Step header */}
          {title && step !== 'dashboard' && step !== 'generating' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 md:mb-10 max-w-[640px]"
            >
              <h2 className="text-[clamp(1.5rem,4vw,2.4rem)] font-medium font-heading text-[var(--pl-ink-soft)] leading-tight tracking-tight m-0">
                {title}
              </h2>
              {subtitle && (
                <p className="max-w-[480px] text-[var(--pl-muted)] text-[0.88rem] md:text-[0.92rem] leading-relaxed mt-2">
                  {subtitle}
                </p>
              )}
            </motion.div>
          )}

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>

          {/* Right panel — stacks below on mobile */}
          {rightPanel && (
            <div className="mt-8 lg:hidden">
              {rightPanel}
            </div>
          )}
        </div>

        {/* Right panel — visible on lg+ as sidebar */}
        {rightPanel && (
          <aside className="hidden lg:block w-[300px] shrink-0 p-5 overflow-auto">
            {rightPanel}
          </aside>
        )}
      </div>
    </main>
  );
}
