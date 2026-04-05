'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / WizardLayout.tsx — The Loom's Progress
// Responsive split layout: sidebar hidden on mobile,
// center stage fills screen, right panel stacks below on mobile.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Sparkles, Palette, Compass, X, Menu } from 'lucide-react';
import { layout } from '@/lib/design-tokens';
import type { WizardStep } from '@/lib/wizard-state';

const SIDEBAR_ITEMS = [
  { id: 'photos',  label: 'Photos', Icon: Image,    steps: ['photos', 'upload', 'clusters'] },
  { id: 'mood',    label: 'Mood',   Icon: Sparkles,  steps: ['vibe'] },
  { id: 'vibe',    label: 'Vibe',   Icon: Palette,   steps: [] },
  { id: 'weave',   label: 'Weave',  Icon: Compass,   steps: ['generating'] },
] as const;

const STEP_TO_SIDEBAR: Record<string, string> = {
  photos: 'photos',
  upload: 'photos',
  clusters: 'photos',
  vibe: 'mood',
  generating: 'weave',
};

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
  const activeSidebar = STEP_TO_SIDEBAR[step] || 'photos';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const stageLabel = step === 'photos' || step === 'upload' || step === 'clusters'
    ? 'Photos'
    : step === 'vibe'
      ? 'Style'
      : 'Building';

  return (
    <main className="min-h-dvh flex flex-col bg-[var(--pl-cream)]">

      {/* ── Top bar ── */}
      <header className="h-[52px] shrink-0 flex items-center justify-between px-4 md:px-5 border-b border-[var(--pl-divider)] bg-white">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-[var(--pl-muted)] cursor-pointer"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="font-heading italic text-[1rem] font-semibold text-[var(--pl-ink-soft)]">
            Pearloom
          </span>
        </div>
        <span className="text-[0.82rem] font-medium text-[var(--pl-ink)] hidden sm:block">
          The Loom&rsquo;s Progress
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[0.62rem] font-bold tracking-[0.1em] uppercase text-[var(--pl-muted)] hidden sm:block">
            Stage: <strong className="text-[var(--pl-ink)] italic">{stageLabel}</strong>
          </span>
          {/* Mobile stage pill */}
          <span className="sm:hidden text-[0.58rem] font-bold tracking-[0.08em] uppercase px-2 py-1 rounded-full bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)]">
            {stageLabel}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[var(--pl-divider)] bg-transparent cursor-pointer flex items-center justify-center text-[var(--pl-muted)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Left sidebar — hidden on mobile, shown on md+ */}
        <aside className="hidden md:flex w-[180px] shrink-0 flex-col bg-[var(--pl-cream)] border-r border-[var(--pl-divider)] p-6 pt-6 pb-4">
          <div className="mb-5 px-2">
            <h2 className="font-heading italic text-[1.1rem] text-[var(--pl-ink-soft)] m-0">
              The Studio
            </h2>
            <p className="text-[0.62rem] font-semibold tracking-[0.1em] uppercase text-[var(--pl-muted)] mt-0.5">
              Step-by-step site builder
            </p>
          </div>

          <nav className="flex flex-col gap-0.5">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = activeSidebar === item.id;
              const Icon = item.Icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.steps.length > 0 && onStepClick) {
                      onStepClick(item.steps[0] as string);
                    }
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border-none w-full text-left cursor-pointer text-[0.85rem] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[rgba(163,177,138,0.12)] text-[var(--pl-olive-deep)] font-semibold'
                      : 'bg-transparent text-[var(--pl-muted)] hover:bg-[rgba(0,0,0,0.02)]'
                  }`}
                  style={{ fontFamily: 'var(--pl-font-body)' }}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile sidebar drawer */}
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
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                className="fixed top-[52px] left-0 bottom-0 z-50 w-[240px] bg-white border-r border-[var(--pl-divider)] p-5 flex flex-col md:hidden shadow-xl"
              >
                <h2 className="font-heading italic text-lg text-[var(--pl-ink-soft)] mb-1">
                  The Studio
                </h2>
                <p className="text-[0.62rem] font-semibold tracking-[0.1em] uppercase text-[var(--pl-muted)] mb-5">
                  Step-by-step site builder
                </p>
                <nav className="flex flex-col gap-1">
                  {SIDEBAR_ITEMS.map((item) => {
                    const isActive = activeSidebar === item.id;
                    const Icon = item.Icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.steps.length > 0 && onStepClick) {
                            onStepClick(item.steps[0] as string);
                          }
                          setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-none w-full text-left cursor-pointer text-[0.92rem] transition-all duration-150 ${
                          isActive
                            ? 'bg-[rgba(163,177,138,0.12)] text-[var(--pl-olive-deep)] font-semibold'
                            : 'bg-transparent text-[var(--pl-muted)]'
                        }`}
                        style={{ fontFamily: 'var(--pl-font-body)' }}
                      >
                        <Icon size={18} />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Center content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 lg:p-12 relative">
          {/* Step header */}
          {title && step !== 'dashboard' && step !== 'generating' && (
            <div className="mb-6 md:mb-8">
              <p className="text-[0.62rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-olive-deep)] mb-2 hidden md:block">
                {step === 'photos' || step === 'upload' || step === 'clusters'
                  ? 'Chapter One'
                  : 'Stage Two of Four'}
              </p>
              <h2 className="text-[clamp(1.4rem,4vw,2.6rem)] font-medium font-heading text-[var(--pl-ink-soft)] leading-tight tracking-tight m-0">
                {title}
              </h2>
              {subtitle && (
                <p className="max-w-[520px] text-[var(--pl-muted)] text-[0.88rem] md:text-[0.95rem] leading-relaxed mt-2 md:mt-3">
                  {subtitle}
                </p>
              )}
            </div>
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

          {/* Right panel — stacks below on mobile, floats on lg+ */}
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
