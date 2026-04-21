'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/design/WizardShell.tsx
//
// Shell primitives for the new wizard design:
//   · Scene       — full-viewport frame every step lives in
//   · StepHead    — animated Pear + speech + title
//   · StepNav     — back / skip / continue row
//   · ProgressThread — fixed, clickable knotted-thread progress
//   · ReturnPill  — top-left return button
//   · ContinuingStrip — chip row of prior answers
//   · SceneDeco   — background flourish presets
//
// Tokens come from DesignAtoms. These are all pure presentational;
// state + routing live in the page.
// ─────────────────────────────────────────────────────────────

import { type CSSProperties, type ReactNode } from 'react';
import { Bloom, Swirl } from '@/components/brand/groove';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear, Leaf } from '../../marketing/design/DesignAtoms';
import type { StepKey, StepSpec } from './wizardSpec';
import { PEAR_COPY } from './wizardSpec';

// ── Scene ──────────────────────────────────────────────────────
export function Scene({
  children,
  bg = PD.paper,
  deco,
  dark,
}: {
  children: ReactNode;
  bg?: string;
  deco?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: dark ? PD.ink : bg,
        color: dark ? PD.paper : PD.ink,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 40px 80px',
        overflow: 'hidden',
        transition: 'background 240ms ease, color 240ms ease',
      }}
    >
      {deco}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 1080,
          animation: 'pl-enter-up 520ms cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── StepHead ───────────────────────────────────────────────────
export function StepHead({
  stepKey,
  title,
  italic,
  dark,
}: {
  stepKey: StepKey;
  title?: ReactNode;
  italic?: ReactNode;
  dark?: boolean;
}) {
  const copy = PEAR_COPY[stepKey] ?? PEAR_COPY.category;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 36, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Pear size={56} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
        <span
          style={{
            position: 'absolute',
            right: -3,
            bottom: 0,
            width: 12,
            height: 12,
            borderRadius: 99,
            background: PD.olive,
            border: `2px solid ${dark ? PD.ink : PD.paper}`,
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.olive, marginBottom: 6, opacity: 0.85 }}>
          PEAR
        </div>
        <div
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(28px, 3.4vw, 44px)',
            lineHeight: 1.05,
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
        >
          {title ?? copy.headline}
          {italic && (
            <>
              {' '}
              <span
                style={{
                  fontStyle: 'italic',
                  color: PD.olive,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                {italic}
              </span>
            </>
          )}
        </div>
        <div
          style={{
            fontSize: 15,
            color: dark ? 'rgba(244,236,216,0.72)' : PD.inkSoft,
            marginTop: 10,
            maxWidth: 560,
            lineHeight: 1.5,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          {copy.tail}
        </div>
      </div>
    </div>
  );
}

// ── StepNav ────────────────────────────────────────────────────
export function StepNav({
  onBack,
  onNext,
  onSkip,
  nextLabel,
  nextDisabled,
  hint,
}: {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hint?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 36, flexWrap: 'wrap' }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '1px solid rgba(31,36,24,0.15)',
            borderRadius: 999,
            padding: '12px 18px',
            fontSize: 13,
            fontWeight: 500,
            color: PD.ink,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ← Back
        </button>
      )}
      {onSkip && (
        <button
          onClick={onSkip}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6A6A56',
            fontSize: 13,
            padding: '12px 14px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Skip this, Pear
        </button>
      )}
      <div style={{ flex: 1 }} />
      {hint && <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>{hint}</span>}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          background: nextDisabled ? PD.stone : PD.ink,
          color: PD.paper,
          border: 'none',
          borderRadius: 999,
          padding: '14px 26px',
          fontSize: 14,
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          transition: 'all 180ms',
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          opacity: nextDisabled ? 0.7 : 1,
          fontFamily: 'inherit',
        }}
      >
        {nextLabel ?? 'Continue'}
        <span style={{ fontSize: 16 }}>→</span>
      </button>
    </div>
  );
}

// ── ReturnPill ─────────────────────────────────────────────────
export function ReturnPill({ onClick, dark }: { onClick: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        top: 24,
        left: 24,
        zIndex: 30,
        background: dark ? 'rgba(31,36,24,0.82)' : 'rgba(244,236,216,0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${dark ? 'rgba(244,236,216,0.12)' : 'rgba(31,36,24,0.1)'}`,
        borderRadius: 999,
        padding: '9px 16px',
        fontSize: 11,
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        color: dark ? PD.paper : PD.ink,
        cursor: 'pointer',
        fontFamily: 'var(--pl-font-mono)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      ← RETURN
    </button>
  );
}

// ── ProgressThread ─────────────────────────────────────────────
export function ProgressThread({
  current,
  visible,
  goTo,
  dark,
}: {
  current: StepKey;
  visible: StepSpec[];
  goTo: (k: StepKey) => void;
  dark?: boolean;
}) {
  const knots = visible.length;
  const activeIdx = visible.findIndex((s) => s.k === current);
  const label = visible[activeIdx]?.l ?? '';
  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        zIndex: 30,
        maxWidth: 'calc(100vw - 220px)',
        background: dark ? 'rgba(31,36,24,0.82)' : 'rgba(244,236,216,0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '10px 22px',
        borderRadius: 999,
        border: `1px solid ${dark ? 'rgba(244,236,216,0.12)' : 'rgba(31,36,24,0.1)'}`,
        color: dark ? PD.paper : PD.ink,
      }}
    >
      <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginRight: 14, whiteSpace: 'nowrap' }}>
        {activeIdx + 1}/{knots}
      </span>
      <svg
        width={knots * 22 + 8}
        height="20"
        viewBox={`0 0 ${knots * 22 + 8} 20`}
        style={{ display: 'block' }}
      >
        <path
          d={`M 4 10 ${Array.from({ length: knots - 1 }, (_, i) => `Q ${14 + i * 22} ${i % 2 ? 4 : 16}, ${26 + i * 22} 10`).join(' ')}`}
          stroke={PD.gold}
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="3 3"
          strokeOpacity="0.5"
        />
        {visible.map((s, i) => {
          const x = 4 + i * 22;
          const active = s.k === current;
          const done = activeIdx > i;
          return (
            <g
              key={s.k}
              style={{ cursor: done ? 'pointer' : 'default' }}
              onClick={() => done && goTo(s.k)}
            >
              <circle
                cx={x}
                cy="10"
                r={active ? 6 : 4}
                fill={active ? PD.ink : done ? PD.olive : PD.line}
                stroke={active ? PD.paper : 'none'}
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>
      <span
        style={{
          ...MONO_STYLE,
          marginLeft: 14,
          whiteSpace: 'nowrap',
        }}
      >
        {label.toUpperCase()}
      </span>
    </div>
  );
}

// ── ContinuingStrip ────────────────────────────────────────────
export function ContinuingStrip({
  chips,
  onReset,
  onGoTo,
}: {
  chips: Array<{ k: StepKey; l: string; v: string }>;
  onReset: () => void;
  onGoTo: (k: StepKey) => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        zIndex: 25,
        flexWrap: 'wrap',
        maxWidth: '80vw',
        justifyContent: 'center',
      }}
    >
      {chips.map((c) => (
        <button
          key={c.k}
          onClick={() => onGoTo(c.k)}
          style={{
            background: PD.paperCard,
            border: '1px solid rgba(31,36,24,0.12)',
            borderRadius: 999,
            padding: '5px 12px 5px 10px',
            fontSize: 11.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: PD.ink,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>{c.l.toUpperCase()}</span>
          <span style={{ fontWeight: 500 }}>{c.v}</span>
          <Leaf size={10} color={PD.olive} />
        </button>
      ))}
      <button
        onClick={() => {
          if (confirm('Clear everything and start over?')) onReset();
        }}
        style={{
          ...MONO_STYLE,
          background: 'transparent',
          border: 'none',
          color: PD.terra,
          fontSize: 9,
          padding: '5px 8px',
          cursor: 'pointer',
        }}
      >
        START FRESH
      </button>
    </div>
  );
}

// ── Scene decoration presets ──────────────────────────────────
export function SceneDeco({ variant }: { variant: 'bloom-tl' | 'rose-br' | 'ink' }) {
  const morph = (radius: string): CSSProperties => ({
    borderRadius: radius,
    animation: 'pl-blob-morph 18s ease-in-out infinite',
  });

  if (variant === 'bloom-tl')
    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: -80,
            left: -60,
            width: 360,
            height: 360,
            background: PD.pear,
            opacity: 0.22,
            filter: 'blur(40px)',
            ...morph('62% 38% 54% 46% / 49% 58% 42% 51%'),
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            right: -40,
            width: 280,
            height: 280,
            background: PD.butter,
            opacity: 0.22,
            filter: 'blur(34px)',
            ...morph('55% 45% 38% 62% / 38% 52% 48% 62%'),
            animationDelay: '-4s',
          }}
        />
        <div
          style={{ position: 'absolute', top: '20%', right: '12%', opacity: 0.28 }}
          aria-hidden
        >
          <Swirl size={180} color={PD.olive} strokeWidth={1.5} />
        </div>
      </>
    );
  if (variant === 'rose-br')
    return (
      <>
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            right: -80,
            width: 420,
            height: 420,
            background: PD.rose,
            opacity: 0.28,
            filter: 'blur(40px)',
            ...morph('62% 38% 54% 46% / 49% 58% 42% 51%'),
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -80,
            left: -60,
            width: 260,
            height: 260,
            background: PD.gold,
            opacity: 0.18,
            filter: 'blur(40px)',
            ...morph('38% 62% 42% 58% / 62% 39% 61% 38%'),
            animationDelay: '-3s',
          }}
        />
      </>
    );
  // ink
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -40,
          opacity: 0.3,
        }}
        aria-hidden
      >
        <Bloom size={220} color={PD.butter} centerColor={PD.terra} speed={10} />
      </div>
      <div style={{ position: 'absolute', bottom: 40, left: 60, opacity: 0.25 }} aria-hidden>
        <Swirl size={160} color={PD.butter} strokeWidth={1.4} />
      </div>
    </>
  );
}

// Helper used by the continuing strip
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}
