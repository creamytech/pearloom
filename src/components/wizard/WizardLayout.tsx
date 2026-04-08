'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / WizardLayout.tsx — Glass-Over-Gradient Wizard
// Frosted glass card floating over warm abstract background
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Check, Menu } from 'lucide-react';
import type { WizardStep } from '@/lib/wizard-state';

const STEPS = [
  { id: 'photos',     label: 'Photos',  num: 1, matchSteps: ['photos', 'upload', 'clusters'] },
  { id: 'vibe',       label: 'Style',   num: 2, matchSteps: ['vibe'] },
  { id: 'generating', label: 'Build',   num: 3, matchSteps: ['generating'] },
] as const;

function getStepIndex(step: WizardStep): number {
  if (step === 'photos' || step === 'upload' || step === 'clusters') return 0;
  if (step === 'vibe') return 1;
  if (step === 'generating') return 2;
  return 0;
}

// ── Abstract silk gradient background ─────────────────────────
function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Base warm gradient */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #E8D5C4 0%, #F2E6D9 20%, #D4B8A0 40%, #E8CDB8 60%, #F0DFD0 80%, #DCC4AE 100%)',
      }} />
      {/* Silk wave overlays */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 80% 60% at 20% 50%, rgba(232,195,168,0.7) 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 80% 30%, rgba(210,180,160,0.6) 0%, transparent 55%),
          radial-gradient(ellipse 90% 40% at 50% 80%, rgba(220,200,180,0.5) 0%, transparent 50%),
          radial-gradient(ellipse 60% 80% at 70% 60%, rgba(240,220,200,0.4) 0%, transparent 50%)
        `,
      }} />
      {/* Warm light wash */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 120% 80% at 30% 20%, rgba(255,240,220,0.4) 0%, transparent 60%)',
      }} />
      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
      }} />
    </div>
  );
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
    <div className="min-h-dvh flex flex-col relative">
      <AmbientBackground />

      {/* ── Top nav — floats over the gradient ── */}
      <header className="shrink-0 z-20 relative">
        <div className="h-12 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer"
              style={{ color: 'rgba(80,60,40,0.5)' }}
            >
              <Menu size={18} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="hidden md:flex items-center gap-1.5 text-[0.72rem] font-medium bg-transparent border-none cursor-pointer transition-colors"
                style={{ color: 'rgba(80,60,40,0.45)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(80,60,40,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(80,60,40,0.45)')}
              >
                <ArrowLeft size={13} />
                Dashboard
              </button>
            )}
          </div>

          {/* Center: progress stepper */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const isActive = i === currentIdx;
              const isComplete = i < currentIdx;
              const isClickable = i < currentIdx && !!onStepClick;

              return (
                <div key={s.id} className="flex items-center">
                  {i > 0 && (
                    <div className="w-8 md:w-14 h-[1.5px] mx-1" style={{
                      background: i <= currentIdx ? 'var(--pl-olive)' : 'rgba(0,0,0,0.08)',
                      borderRadius: '1px',
                    }} />
                  )}
                  <button
                    onClick={() => isClickable && onStepClick!(s.matchSteps[0] as string)}
                    disabled={!isClickable}
                    className="flex items-center gap-1.5 rounded-full border-none transition-all"
                    style={{
                      padding: isActive ? '5px 14px' : '5px 10px',
                      background: isActive ? 'rgba(163,177,138,0.18)' : 'transparent',
                      border: isActive ? '1.5px solid rgba(163,177,138,0.3)' : '1.5px solid transparent',
                      cursor: isClickable ? 'pointer' : 'default',
                    }}
                  >
                    <span className="flex items-center justify-center rounded-full text-[0.5rem] font-bold" style={{
                      width: '18px', height: '18px',
                      background: isComplete ? 'var(--pl-olive)' : isActive ? 'rgba(163,177,138,0.25)' : 'rgba(0,0,0,0.06)',
                      color: isComplete ? 'white' : isActive ? 'var(--pl-olive-deep)' : 'rgba(80,60,40,0.3)',
                    }}>
                      {isComplete ? <Check size={9} strokeWidth={3} /> : s.num}
                    </span>
                    <span className={`text-[0.65rem] font-semibold tracking-[0.03em] ${isActive ? '' : 'hidden sm:inline'}`} style={{
                      color: isActive ? 'var(--pl-olive-deep)' : isComplete ? 'rgba(80,60,40,0.6)' : 'rgba(80,60,40,0.25)',
                    }}>
                      {s.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {onClose ? (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer transition-colors"
              style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(80,60,40,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = 'rgba(80,60,40,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = 'rgba(80,60,40,0.35)'; }}
            >
              <X size={13} />
            </button>
          ) : <div className="w-7" />}
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/15 md:hidden" onClick={() => setMobileMenuOpen(false)} />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-[260px] flex flex-col md:hidden"
              style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 4px 20px rgba(43,30,20,0.06)', borderRight: '1px solid rgba(255,255,255,0.5)' } as React.CSSProperties}
            >
              <div className="p-5 border-b border-[rgba(0,0,0,0.04)]">
                <span className="font-heading italic text-lg text-[var(--pl-ink-soft)]">Pearloom</span>
              </div>
              <nav className="flex flex-col gap-1 p-4 flex-1">
                {STEPS.map((s, i) => {
                  const isActive = i === currentIdx;
                  const isComplete = i < currentIdx;
                  return (
                    <button key={s.id} onClick={() => { if (i <= currentIdx && onStepClick) onStepClick(s.matchSteps[0] as string); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border-none w-full text-left cursor-pointer text-[0.85rem] transition-all"
                      style={{ background: isActive ? 'rgba(163,177,138,0.1)' : 'transparent', color: isActive ? 'var(--pl-olive-deep)' : isComplete ? 'var(--pl-ink-soft)' : 'var(--pl-muted)', fontWeight: isActive ? 600 : 400 }}>
                      {isComplete ? <Check size={15} className="text-[var(--pl-olive)]" /> : <span className="text-[0.7rem] font-bold w-4">{s.num}</span>}
                      {s.label}
                    </button>
                  );
                })}
              </nav>
              {onClose && (
                <div className="p-4 border-t border-[rgba(0,0,0,0.04)]">
                  <button onClick={onClose} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-none w-full text-left text-[0.82rem] text-[var(--pl-muted)] bg-transparent cursor-pointer">
                    <ArrowLeft size={14} /> Dashboard
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content — frosted glass card ── */}
      <div className="flex-1 flex relative z-10 overflow-hidden">
        <div className="flex-1 overflow-auto flex justify-center px-4 md:px-8 py-6 md:py-10">
          <div className="w-full max-w-[960px] flex flex-col lg:flex-row gap-5">
            {/* Glass card */}
            <div
              className="pl-enter-scale flex-1 min-w-0"
              style={{
                background: 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
                overflow: 'hidden',
              } as React.CSSProperties}
            >
              {/* Inner content with padding */}
              <div className="p-4 sm:p-6 md:p-10">
                {/* Step label + progress */}
                {title && step !== 'dashboard' && step !== 'generating' && (
                  <div className="pl-enter pl-enter-d1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[0.6rem] font-bold tracking-[0.14em] uppercase text-[var(--pl-olive-deep)]">
                        {STEPS[currentIdx]?.label?.toUpperCase() || 'STEP'}
                      </span>
                      <div className="flex-1 h-[1.5px] rounded-full" style={{
                        background: 'linear-gradient(90deg, var(--pl-olive) 0%, rgba(163,177,138,0.15) 100%)',
                      }} />
                      <span className="text-[0.6rem] font-bold text-[var(--pl-muted)] tabular-nums">
                        {currentIdx + 1} / {STEPS.length}
                      </span>
                    </div>

                    <h2 className="font-heading leading-[1.15] tracking-tight m-0 mt-5" style={{
                      fontSize: 'clamp(1.5rem, 3.5vw, 2.4rem)',
                      color: 'var(--pl-ink-soft)',
                      fontWeight: 400,
                    }}>
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="max-w-[480px] text-[var(--pl-muted)] text-[0.88rem] leading-relaxed mt-2">
                        {subtitle}
                      </p>
                    )}

                    <div className="mt-8" />
                  </div>
                )}

                {/* Step content */}
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Right panel — floats beside the glass card on lg+ */}
            {rightPanel && (
              <div className="pl-enter pl-enter-d2 hidden lg:block w-[240px] shrink-0">
                {rightPanel}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
