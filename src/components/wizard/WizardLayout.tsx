'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / WizardLayout.tsx — The Loom's Progress
// Split layout matching Stitch: left sidebar nav (Photos/Mood/Vibe/Weave),
// center stage, top progress bar, bottom action bar.
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';
import { Image, Sparkles, Palette, Compass, X } from 'lucide-react';
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

  return (
    <main className="min-h-dvh flex flex-col bg-[var(--pl-cream)]">

      {/* ── Top bar ── */}
      <header style={{
        height: '52px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid var(--pl-divider)',
        background: 'white',
      }}>
        <span style={{
          fontSize: '1rem', fontWeight: 600,
          fontFamily: 'var(--pl-font-heading)',
          fontStyle: 'italic',
          color: 'var(--pl-ink-soft)',
        }}>
          Pearloom
        </span>
        <span style={{
          fontSize: '0.82rem', fontWeight: 500,
          fontFamily: 'var(--pl-font-body)',
          color: 'var(--pl-ink)',
        }}>
          The Loom&rsquo;s Progress
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '0.62rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--pl-muted)',
          }}>
            Curating
            <br />
            <strong style={{ color: 'var(--pl-ink)', fontStyle: 'italic' }}>
              {step === 'photos' || step === 'upload' || step === 'clusters'
                ? 'Selection Stage'
                : step === 'vibe'
                  ? 'Mood Stage'
                  : 'Weaving Stage'}
            </strong>
          </span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '1px solid var(--pl-divider)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--pl-muted)',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {/* ── Body: sidebar + content + optional right panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left sidebar */}
        <aside style={{
          width: '180px', flexShrink: 0,
          background: 'var(--pl-cream)',
          borderRight: '1px solid var(--pl-divider)',
          padding: '24px 12px',
          display: 'flex', flexDirection: 'column',
          gap: '0',
        }}>
          <div style={{ marginBottom: '20px', padding: '0 8px' }}>
            <h2 style={{
              fontSize: '1.1rem', fontWeight: 500,
              fontFamily: 'var(--pl-font-heading)',
              fontStyle: 'italic',
              color: 'var(--pl-ink-soft)',
              margin: 0,
            }}>
              The Atelier
            </h2>
            <p style={{
              fontSize: '0.62rem', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--pl-muted)',
              marginTop: '2px',
            }}>
              Curating your digital legacy
            </p>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = activeSidebar === item.id;
              const Icon = item.Icon;
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    if (item.steps.length > 0 && onStepClick) {
                      onStepClick(item.steps[0] as string);
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive ? 'rgba(163,177,138,0.12)' : 'transparent',
                    color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 600 : 500,
                    fontFamily: 'var(--pl-font-body)',
                    textAlign: 'left',
                    transition: 'background 0.15s, color 0.15s',
                    width: '100%',
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </motion.button>
              );
            })}
          </nav>
        </aside>

        {/* Center content */}
        <div style={{
          flex: 1, overflow: 'auto',
          padding: 'clamp(24px, 4vw, 48px) clamp(20px, 3vw, 40px)',
          position: 'relative',
        }}>
          {/* Step header */}
          {title && step !== 'dashboard' && step !== 'generating' && (
            <div style={{ marginBottom: '32px' }}>
              {step !== 'vibe' && (
                <p style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--pl-olive-deep)',
                  marginBottom: '8px',
                }}>
                  {step === 'photos' || step === 'upload' || step === 'clusters'
                    ? 'Chapter One'
                    : 'Stage Two of Four'}
                </p>
              )}
              <h2 style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                fontWeight: 500,
                fontFamily: 'var(--pl-font-heading)',
                color: 'var(--pl-ink-soft)',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                margin: 0,
              }}>
                {title}
              </h2>
              {subtitle && (
                <p style={{
                  maxWidth: '520px',
                  color: 'var(--pl-muted)',
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  marginTop: '12px',
                }}>
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
        </div>

        {/* Right panel — glass advisor (optional, shown when rightPanel is provided) */}
        {rightPanel && (
          <aside style={{
            width: '300px', flexShrink: 0,
            padding: '20px 16px',
            overflow: 'auto',
          }}>
            {rightPanel}
          </aside>
        )}
      </div>
    </main>
  );
}
