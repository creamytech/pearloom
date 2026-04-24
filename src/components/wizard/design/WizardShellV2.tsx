'use client';

// ─────────────────────────────────────────────────────────────
// Wizard shell v2: top-bar with Pearloom mark + save/preview,
// progress thread with 6 knotted phases, breadcrumb chip row
// of collected fields, 2-column body (main card + right Pear
// sidebar), voice-first strip at the bottom.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { type ReactNode } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../../marketing/design/DesignAtoms';
import { PHASES, type PhaseKey } from './wizardSpec';

// ── Topbar ────────────────────────────────────────────────────
export function WizardTopbar({
  title,
  draft = true,
  onBackHome,
  onSave,
  onPreview,
}: {
  title: string;
  draft?: boolean;
  onBackHome: () => void;
  onSave?: () => void;
  onPreview?: () => void;
}) {
  return (
    <div
      className="pl-wizard-topbar"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(244,236,216,0.9)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(31,36,24,0.06)',
        padding: '14px clamp(16px, 4vw, 32px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      <button
        onClick={onBackHome}
        aria-label="Back to dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: PD.ink,
          fontFamily: 'inherit',
          padding: 0,
        }}
      >
        <Pear size={28} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
        <span style={{ ...DISPLAY_STYLE, fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em' }}>
          Pearloom
        </span>
      </button>
      <div
        className="pl-wizard-topbar-title"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 0,
          flex: 1,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: PD.ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 280,
          }}
        >
          {title}
        </span>
        {draft && (
          <span
            style={{
              fontSize: 11,
              color: PD.inkSoft,
              background: PD.paperCard,
              padding: '2px 8px',
              borderRadius: 999,
              flexShrink: 0,
            }}
          >
            Draft
          </span>
        )}
      </div>
      {onSave && (
        <button
          className="pl-wizard-topbar-save"
          onClick={onSave}
          style={{
            background: 'transparent',
            border: '1px solid rgba(31,36,24,0.15)',
            borderRadius: 999,
            padding: '8px 14px',
            fontSize: 12.5,
            cursor: 'pointer',
            fontFamily: 'inherit',
            color: PD.ink,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          ☁ Save draft
        </button>
      )}
      {onPreview && (
        <button
          onClick={onPreview}
          style={{
            background: PD.oliveDeep,
            color: '#FFFEF7',
            border: 'none',
            borderRadius: 999,
            padding: '9px 16px',
            fontSize: 12.5,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          Preview
        </button>
      )}
      <style jsx>{`
        @media (max-width: 640px) {
          :global(.pl-wizard-topbar-save) {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Progress thread (6 knots) ────────────────────────────────
export function ProgressThread6({
  current,
  completed,
  onJump,
}: {
  current: PhaseKey;
  completed: Set<PhaseKey>;
  onJump: (k: PhaseKey) => void;
}) {
  const activeIdx = PHASES.findIndex((p) => p.k === current);
  return (
    <div
      className="pl-wizard-thread"
      style={{
        padding: '22px clamp(16px, 4vw, 32px) 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: PD.paper,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          maxWidth: 900,
          width: '100%',
          position: 'relative',
        }}
      >
        {PHASES.map((p, i) => {
          const done = completed.has(p.k);
          const active = p.k === current;
          const clickable = done || i <= activeIdx;
          return (
            <div
              key={p.k}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                minWidth: 0,
              }}
            >
              <button
                onClick={() => clickable && onJump(p.k)}
                disabled={!clickable}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: clickable ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: 0,
                  fontFamily: 'inherit',
                  color: PD.ink,
                }}
              >
                <span
                  style={{
                    width: active ? 30 : 26,
                    height: active ? 30 : 26,
                    borderRadius: 999,
                    background: done ? PD.olive : active ? '#6E5BA8' : 'rgba(31,36,24,0.08)',
                    color: done || active ? '#FFFEF7' : PD.inkSoft,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    transition: 'all 200ms',
                    boxShadow: active ? '0 4px 12px rgba(110,91,168,0.3)' : 'none',
                  }}
                >
                  {done ? '✓' : p.n}
                </span>
                <span
                  className="pl-wizard-thread-label"
                  style={{
                    fontSize: 12,
                    color: active ? PD.ink : PD.inkSoft,
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {p.l}
                </span>
              </button>
              {i < PHASES.length - 1 && (
                <span
                  aria-hidden
                  className="pl-wizard-thread-line"
                  style={{
                    flex: 1,
                    height: 1.5,
                    minWidth: 20,
                    margin: '0 10px',
                    background: done
                      ? PD.olive
                      : `repeating-linear-gradient(to right, ${PD.olive} 0 3px, transparent 3px 8px)`,
                    opacity: done ? 1 : 0.5,
                    marginTop: -22,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @media (max-width: 680px) {
          :global(.pl-wizard-thread-label) {
            display: none !important;
          }
          :global(.pl-wizard-thread-line) {
            min-width: 10px !important;
            margin: 0 6px !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Breadcrumb chips ─────────────────────────────────────────
export interface BreadcrumbChip {
  label: string;
  value: string;
  onEdit?: () => void;
}

export function BreadcrumbChips({
  chips,
  onEditAll,
}: {
  chips: BreadcrumbChip[];
  onEditAll?: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        padding: '0 32px 12px',
        background: PD.paper,
      }}
    >
      <div
        style={{
          display: 'flex',
          flex: 1,
          background: '#FFFEF7',
          border: '1px solid rgba(31,36,24,0.06)',
          borderRadius: 14,
          padding: '6px 14px',
          overflowX: 'auto',
          gap: 0,
          alignItems: 'stretch',
        }}
      >
        {chips.map((c, i) => (
          <div
            key={c.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '8px 18px',
              borderRight:
                i < chips.length - 1 ? '1px solid rgba(31,36,24,0.06)' : 'none',
              minWidth: 120,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                ...MONO_STYLE,
                fontSize: 9,
                color: PD.inkSoft,
                opacity: 0.7,
                letterSpacing: '0.18em',
                marginBottom: 4,
              }}
            >
              {c.label.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 13,
                color: PD.ink,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {c.value || '—'}
            </span>
          </div>
        ))}
        {onEditAll && (
          <button
            onClick={onEditAll}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: PD.ink,
              fontSize: 12,
              fontWeight: 500,
              padding: '0 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ✎ Edit
          </button>
        )}
      </div>
    </div>
  );
}

// ── Body grid (main + Pear sidebar) ───────────────────────────
export function WizardBody({
  main,
  sidebar,
}: {
  main: ReactNode;
  sidebar?: ReactNode;
}) {
  return (
    <div
      style={{
        padding: '20px 32px 140px',
        display: 'grid',
        gridTemplateColumns: sidebar ? 'minmax(0, 1fr) 320px' : 'minmax(0, 1fr)',
        gap: 24,
        maxWidth: 1240,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
      className="pl-wizard-v2-body"
    >
      <div style={{ minWidth: 0 }}>{main}</div>
      {sidebar && <aside style={{ minWidth: 0 }}>{sidebar}</aside>}

      <style jsx>{`
        @media (max-width: 960px) {
          :global(.pl-wizard-v2-body) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Main step card ────────────────────────────────────────────
export function StepCard({
  number,
  of,
  title,
  subtitle,
  why,
  onWhy,
  children,
}: {
  number: number;
  of: number;
  title: ReactNode;
  subtitle?: string;
  why?: string;
  onWhy?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: '#FFFEF7',
        borderRadius: 22,
        border: '1px solid rgba(31,36,24,0.06)',
        padding: 'clamp(28px, 3vw, 40px)',
        boxShadow: '0 20px 50px rgba(31,36,24,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 20,
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10.5,
              color: PD.inkSoft,
              letterSpacing: '0.24em',
              marginBottom: 10,
            }}
          >
            STEP {number} OF {of}
          </div>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(32px, 3.4vw, 44px)',
              fontWeight: 400,
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: 14.5,
                color: PD.inkSoft,
                lineHeight: 1.55,
                margin: '12px 0 0',
                maxWidth: 520,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {why && onWhy && (
          <button
            onClick={onWhy}
            style={{
              background: 'transparent',
              border: '1px solid rgba(31,36,24,0.12)',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 12.5,
              color: PD.ink,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            ⓘ Why we ask
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Right Pear sidebar ───────────────────────────────────────
export function PearSidebar({
  why,
  tip,
  progress,
  progressText,
}: {
  why: string;
  tip?: string;
  progress: number;
  progressText: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'sticky',
        top: 140,
      }}
    >
      {/* Pear greeting card */}
      <div
        style={{
          background: '#FFFEF7',
          borderRadius: 18,
          padding: 20,
          border: '1px solid rgba(31,36,24,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <Pear size={48} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
          <div
            style={{
              fontFamily: '"Caveat", "Fraunces", cursive',
              fontSize: 22,
              fontStyle: 'italic',
              color: PD.ink,
              lineHeight: 1.2,
            }}
          >
            Hi, I&rsquo;m Pear.
            <br />
            Here to help.
            <span style={{ color: '#6E5BA8', marginLeft: 6 }}>♡</span>
          </div>
        </div>

        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10,
            color: '#6E5BA8',
            letterSpacing: '0.22em',
            marginBottom: 10,
            marginTop: 4,
          }}
        >
          WHY WE&rsquo;RE ASKING
        </div>
        <p
          style={{
            fontSize: 13,
            color: PD.inkSoft,
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {why}
        </p>

        {tip && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: PD.paperCard,
              borderRadius: 10,
              fontSize: 12.5,
              color: PD.ink,
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                ...MONO_STYLE,
                fontSize: 9,
                color: '#C19A4B',
                marginBottom: 4,
                letterSpacing: '0.22em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ✦ TIP FROM PEAR
            </div>
            {tip}
          </div>
        )}
      </div>

      {/* Progress ring */}
      <div
        style={{
          background: '#FFFEF7',
          borderRadius: 18,
          padding: 18,
          border: '1px solid rgba(31,36,24,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10,
            color: PD.inkSoft,
            letterSpacing: '0.22em',
            flex: 1,
          }}
        >
          YOUR PROGRESS
        </div>
      </div>
      <div
        style={{
          background: '#FFFEF7',
          borderRadius: 18,
          padding: 18,
          border: '1px solid rgba(31,36,24,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <ProgressRing value={progress} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: PD.ink }}>{progressText}</div>
          <div style={{ fontSize: 11.5, color: PD.inkSoft, marginTop: 2 }}>
            You&rsquo;re doing great!
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const offset = c - value * c;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} stroke={PD.paperCard} strokeWidth="4" fill="none" />
      <circle
        cx="26"
        cy="26"
        r={r}
        stroke={PD.olive}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 26 26)"
        style={{ transition: 'stroke-dashoffset 300ms' }}
      />
    </svg>
  );
}

// ── Bottom voice-first strip ──────────────────────────────────
export function VoiceStrip({ onVoice }: { onVoice: () => void }) {
  return (
    <div
      style={{
        margin: '18px 0 0',
        padding: '16px 22px',
        background: '#FFFEF7',
        borderRadius: 14,
        border: '1px solid rgba(31,36,24,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Pear size={32} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
        <div>
          <div
            style={{
              ...DISPLAY_STYLE,
              fontSize: 16,
              fontStyle: 'italic',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              color: PD.ink,
            }}
          >
            Prefer to talk it out?
          </div>
          <div style={{ fontSize: 12, color: PD.inkSoft, marginTop: 2 }}>
            Tell Pear how you want your day to feel. We&rsquo;ll capture the vibe for you.
          </div>
        </div>
      </div>
      <button
        onClick={onVoice}
        style={{
          background: 'transparent',
          border: '1px solid rgba(31,36,24,0.15)',
          borderRadius: 999,
          padding: '10px 18px',
          fontSize: 12.5,
          color: PD.ink,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        🎙 Use voice instead
        <span style={{ fontSize: 10, color: PD.inkSoft }}>Takes about 60 seconds</span>
      </button>
    </div>
  );
}

// ── Bottom nav row ────────────────────────────────────────────
export function WizardNav({
  onBack,
  onNext,
  nextDisabled,
  hint = 'You can change these anytime.',
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  hint?: string;
}) {
  return (
    <div
      style={{
        marginTop: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '1px solid rgba(31,36,24,0.15)',
            borderRadius: 999,
            padding: '11px 18px',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
            color: PD.ink,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          ← Back
        </button>
      )}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: PD.inkSoft }}>{hint}</span>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          background: nextDisabled ? '#C8B3D9' : '#6E5BA8',
          color: '#FFFEF7',
          border: 'none',
          borderRadius: 999,
          padding: '12px 24px',
          fontSize: 13.5,
          fontWeight: 500,
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          opacity: nextDisabled ? 0.7 : 1,
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 8px 20px rgba(110,91,168,0.25)',
        }}
      >
        Continue <span style={{ fontSize: 15 }}>→</span>
      </button>
    </div>
  );
}

export function WizardFooterCrumb({ to }: { to: string }) {
  return (
    <div style={{ padding: '14px 32px', textAlign: 'center' }}>
      <Link
        href={to}
        style={{
          ...MONO_STYLE,
          fontSize: 10,
          color: PD.inkSoft,
          textDecoration: 'none',
          letterSpacing: '0.22em',
        }}
      >
        ← BACK TO DASHBOARD
      </Link>
    </div>
  );
}
