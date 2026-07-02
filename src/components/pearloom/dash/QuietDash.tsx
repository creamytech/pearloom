'use client';

// ─────────────────────────────────────────────────────────────
// QuietDash — the shared primitives of "the quiet dashboard"
// (docs/DASHBOARD-LAYOUT-PLAN.md). Every dashboard page opens
// with these instead of a per-page editorial hero:
//
//   PageIntro — mono eyebrow + ONE display line (22–24px phone /
//               30–32px desktop) + optional meta slot + actions
//               row. ≤120px on phones. No body paragraph.
//   StatStrip — one horizontal row of 40px chips; zero-value
//               stats collapse into a single muted trailing chip.
//   HintChip  — a one-line hint with a ? affordance expanding an
//               inline detail; auto-collapsed after first visit
//               (localStorage).
//   RailCard  — right-rail wrapper (mono heading + padded card).
//               The PARENT decides placement — on phones it just
//               renders below the main object like any card.
//
// All styling rides the .pl8 handoff tokens (--cream/--ink/
// --line/--sage*/--peach*) so light + dark both work.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';

// ── PageIntro ────────────────────────────────────────────────

export function PageIntro({
  eyebrow,
  title,
  meta,
  actions,
  style,
}: {
  /** Mono uppercase eyebrow, e.g. "Guests" or "Good evening, Scott". */
  eyebrow?: ReactNode;
  /** ONE display line. Fraunces via inline font-family — NOT the
   *  `.display` class, whose ≤640px clamp inflates phone headers. */
  title: ReactNode;
  /** Optional slot under the title row — a one-line note or a StatStrip. */
  meta?: ReactNode;
  /** Page-level actions — one wrapping row, never a stacked block. */
  actions?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <header style={{ marginBottom: 16, ...style }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '10px 16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          {eyebrow ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
              }}
            >
              <span aria-hidden style={{ width: 14, height: 1, background: 'var(--gold, #C19A4B)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eyebrow}</span>
            </div>
          ) : null}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(22px, 2.6vw, 31px)',
              fontWeight: 600,
              lineHeight: 1.12,
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
              margin: eyebrow ? '4px 0 0' : 0,
            }}
          >
            {title}
          </h1>
        </div>
        {actions ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{actions}</div>
        ) : null}
      </div>
      {meta ? <div style={{ marginTop: 10 }}>{meta}</div> : null}
    </header>
  );
}

// ── StatStrip ────────────────────────────────────────────────

export interface StatStripItem {
  label: string;
  value: number;
  tone?: 'sage' | 'peach' | 'plum' | 'gold';
  href?: string;
}

const TONE_COLOR: Record<NonNullable<StatStripItem['tone']>, string> = {
  sage: 'var(--sage-deep, #5C6B3F)',
  peach: 'var(--peach-ink, #C6703D)',
  plum: 'var(--pl-plum, #7A2D40)',
  gold: 'var(--gold, #C19A4B)',
};

const CHIP_BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 40,
  padding: '0 14px',
  borderRadius: 999,
  background: 'var(--card, var(--cream-2))',
  border: '1px solid var(--line-soft)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

export function StatStrip({ items, style }: { items: StatStripItem[]; style?: CSSProperties }) {
  if (items.length === 0) return null;
  const live = items.filter((i) => i.value !== 0);
  const zeros = items.filter((i) => i.value === 0);
  return (
    <div className="pl-hscroll" style={{ gap: 8, alignItems: 'center', ...style }}>
      {live.map((i) => {
        const inner = (
          <>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 600,
                lineHeight: 1,
                color: i.tone ? TONE_COLOR[i.tone] : 'var(--ink)',
              }}
            >
              {i.value}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
              }}
            >
              {i.label}
            </span>
          </>
        );
        return i.href ? (
          <Link key={i.label} href={i.href} style={CHIP_BASE}>
            {inner}
          </Link>
        ) : (
          <span key={i.label} style={CHIP_BASE}>
            {inner}
          </span>
        );
      })}
      {zeros.length > 0 && (
        <span style={{ ...CHIP_BASE, background: 'transparent' }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            {zeros.map((z) => `0 ${z.label}`).join(' · ')}
          </span>
        </span>
      )}
    </div>
  );
}

// ── HintChip ─────────────────────────────────────────────────

export function HintChip({
  storageKey,
  hint,
  detail,
  style,
}: {
  /** localStorage key — the detail shows once, then stays collapsed. */
  storageKey: string;
  /** The one-line hint that is always visible. */
  hint: ReactNode;
  /** The full "how this works" text, behind the ? affordance. */
  detail: ReactNode;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  // First visit: show the full text once, stamp the key so every
  // later visit starts collapsed. setTimeout(0) keeps SSR + first
  // client paint in agreement and satisfies the compiler's
  // no-sync-setState-in-effect rule.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (!window.localStorage.getItem(storageKey)) {
          window.localStorage.setItem(storageKey, '1');
          setOpen(true);
        }
      } catch {
        /* collapsed is fine */
      }
    }, 0);
    return () => clearTimeout(t);
  }, [storageKey]);

  const toggle = () => {
    setOpen((o) => !o);
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      /* best-effort */
    }
  };

  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span
          style={{
            fontSize: 12,
            color: 'var(--ink-soft)',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {hint}
        </span>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? 'Hide the full hint' : 'Show the full hint'}
          style={{
            flexShrink: 0,
            width: 20,
            height: 20,
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: open ? 'var(--ink)' : 'transparent',
            color: open ? 'var(--cream)' : 'var(--ink-muted)',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'inline-grid',
            placeItems: 'center',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          ?
        </button>
      </div>
      {open && (
        <div
          style={{
            marginTop: 8,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            fontSize: 12.5,
            color: 'var(--ink-soft)',
            lineHeight: 1.55,
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}

// ── RailCard ─────────────────────────────────────────────────

export function RailCard({
  title,
  children,
  style,
}: {
  title: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line-soft)',
        borderRadius: 16,
        padding: '14px 16px',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: MONO,
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          marginBottom: 10,
        }}
      >
        <span aria-hidden style={{ width: 12, height: 1, background: 'var(--gold, #C19A4B)', flexShrink: 0 }} />
        {title}
      </div>
      {children}
    </section>
  );
}
