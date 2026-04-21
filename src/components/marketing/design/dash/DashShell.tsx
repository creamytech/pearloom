'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/dash/DashShell.tsx
//
// Shared dashboard chrome from the Claude Design bundle:
// sidebar (4 groups, Pear credits card at the bottom), global
// topbar (search + status + avatar), Topbar (per-page title),
// Panel + SectionTitle primitives. Uses the design's exact PD
// palette — nothing groove-token.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Bloom } from '@/components/brand/groove';
import { Pear, PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';

interface NavGroup {
  group: string;
  items: Array<{ k: string; l: string; i: string; href: string }>;
}

const NAV: NavGroup[] = [
  {
    group: 'YOUR LOOM',
    items: [
      { k: 'sites',    l: 'Sites',        i: '✦', href: '/dashboard' },
      { k: 'director', l: 'The Director', i: '❧', href: '/dashboard/director' },
    ],
  },
  {
    group: 'PER EVENT',
    items: [
      { k: 'dayof',       l: 'Day-of room', i: '◉', href: '/dashboard/day-of' },
      { k: 'guests',      l: 'Guests',      i: '☞', href: '/dashboard/rsvp' },
      { k: 'submissions', l: 'Submissions', i: '✢', href: '/dashboard/submissions' },
      { k: 'gallery',     l: 'The Reel',    i: '◎', href: '/dashboard/gallery' },
      { k: 'connections', l: 'Connections', i: '∞', href: '/dashboard/connections' },
    ],
  },
  {
    group: 'THE HOUSE',
    items: [
      { k: 'marketplace', l: 'Marketplace', i: '⛉', href: '/marketplace' },
      { k: 'analytics',   l: 'Analytics',   i: '▲', href: '/dashboard/analytics' },
    ],
  },
  {
    group: 'YOU',
    items: [
      { k: 'settings', l: 'Settings', i: '◇', href: '/dashboard/profile' },
    ],
  },
];

export function DashShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: PD.paper,
        color: PD.ink,
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopbarGlobal />
        {children}
      </div>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────
function Sidebar() {
  const pathname = usePathname() ?? '/dashboard';

  // Match by longest prefix so /dashboard/day-of doesn't also match /dashboard.
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside
      style={{
        width: 252,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        padding: '26px 18px 20px',
        background: PD.paper,
        borderRight: '1px solid rgba(31,36,24,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        overflowY: 'auto',
      }}
    >
      <Link
        href="/dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '2px 10px 22px',
          textDecoration: 'none',
          color: PD.ink,
        }}
      >
        <Pear size={34} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
        <div>
          <div
            style={{
              ...DISPLAY_STYLE,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            Pearloom
          </div>
          <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.5, marginTop: 3 }}>SCOTT&rsquo;S LOOM</div>
        </div>
      </Link>

      {NAV.map((g, gi) => (
        <div key={g.group} style={{ marginTop: gi === 0 ? 0 : 14 }}>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 9,
              opacity: 0.5,
              padding: '0 12px 8px',
            }}
          >
            {g.group}
          </div>
          {g.items.map((it) => {
            const active = isActive(it.href);
            return (
              <Link
                key={it.k}
                href={it.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '9px 12px',
                  background: active ? PD.ink : 'transparent',
                  color: active ? PD.paper : PD.ink,
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  marginBottom: 2,
                  transition: 'all 140ms',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'rgba(31,36,24,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    opacity: active ? 1 : 0.7,
                    fontFamily: '"Fraunces", Georgia, serif',
                  }}
                >
                  {it.i}
                </span>
                <span>{it.l}</span>
              </Link>
            );
          })}
        </div>
      ))}

      <div style={{ flex: 1 }} />
      {/* Pear credits card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${PD.paper2} 0%, ${PD.paper} 100%)`,
          border: '1px solid rgba(31,36,24,0.12)',
          borderRadius: 16,
          padding: '14px 14px 12px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -14, right: -14, opacity: 0.5 }} aria-hidden>
          <Bloom size={50} color={PD.butter} centerColor={PD.terra} speed={10} />
        </div>
        <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.6, marginBottom: 6 }}>PEAR CREDITS</div>
        <div
          style={{
            ...DISPLAY_STYLE,
            fontSize: 20,
            fontStyle: 'italic',
            lineHeight: 1,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          13 of 15 <span style={{ color: PD.olive }}>left</span>
        </div>
        <div
          style={{
            height: 5,
            background: PD.line,
            borderRadius: 99,
            marginTop: 8,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '87%',
              height: '100%',
              background: `linear-gradient(90deg, ${PD.olive}, ${PD.gold})`,
              borderRadius: 99,
            }}
          />
        </div>
        <button
          style={{
            marginTop: 10,
            width: '100%',
            background: PD.ink,
            color: PD.paper,
            border: 'none',
            borderRadius: 999,
            padding: '7px 10px',
            fontSize: 11.5,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Top up →
        </button>
      </div>
    </aside>
  );
}

// ── TopbarGlobal ─────────────────────────────────────────────
function TopbarGlobal() {
  const [focus, setFocus] = useState(false);
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(244,236,216,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(31,36,24,0.08)',
        padding: '10px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          flex: 1,
          maxWidth: 420,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: focus ? PD.paperCard : PD.paper3,
          border: `1px solid rgba(31,36,24,${focus ? 0.2 : 0.1})`,
          borderRadius: 999,
          padding: '8px 14px',
          transition: 'all 160ms',
        }}
      >
        <span style={{ fontSize: 13, opacity: 0.5, fontFamily: '"Fraunces", Georgia, serif' }}>✦</span>
        <input
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder="Ask Pear anything, or jump to a block..."
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 13,
            color: PD.ink,
          }}
        />
        <span
          style={{
            ...MONO_STYLE,
            fontSize: 9,
            opacity: 0.5,
            padding: '2px 6px',
            background: 'rgba(31,36,24,0.08)',
            borderRadius: 4,
          }}
        >
          ⌘K
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <button
        style={{
          border: '1px solid rgba(31,36,24,0.14)',
          background: 'transparent',
          borderRadius: 999,
          padding: '7px 12px',
          fontSize: 12.5,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'inherit',
          color: PD.ink,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 99, background: PD.olive }} />
        All quiet
      </button>
      <div style={{ position: 'relative', width: 34, height: 34, cursor: 'pointer' }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${PD.pear}, ${PD.olive})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: PD.paper,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: '"Fraunces", Georgia, serif',
            fontStyle: 'italic',
          }}
        >
          S
        </div>
        <span
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: 10,
            height: 10,
            borderRadius: 99,
            background: PD.olive,
            border: `2px solid ${PD.paper}`,
          }}
        />
      </div>
    </div>
  );
}

// ── Topbar (per-page) ────────────────────────────────────────
interface TopbarProps {
  subtitle?: string;
  title: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}
export function Topbar({ subtitle, title, actions, children }: TopbarProps) {
  return (
    <header
      style={{
        padding: '28px 40px 10px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
      }}
    >
      <div>
        {subtitle && (
          <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.6, marginBottom: 8, color: PD.olive }}>
            {subtitle}
          </div>
        )}
        <h1
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(32px, 3.4vw, 52px)',
            lineHeight: 1.08,
            margin: 0,
            fontWeight: 400,
            letterSpacing: '-0.025em',
            maxWidth: 820,
            textWrap: 'balance',
          }}
        >
          {title}
        </h1>
        {children && (
          <div
            style={{
              marginTop: 14,
              color: PD.inkSoft,
              fontSize: 15,
              lineHeight: 1.5,
              maxWidth: 620,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            {children}
          </div>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>}
    </header>
  );
}

// ── Panel ─────────────────────────────────────────────────────
interface PanelProps {
  children?: ReactNode;
  style?: CSSProperties;
  bg?: string;
  padding?: number | string;
  border?: boolean;
}
export function Panel({
  children,
  style,
  bg = PD.paper3,
  padding = 28,
  border = true,
}: PanelProps) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: 20,
        border: border ? '1px solid rgba(31,36,24,0.12)' : 'none',
        padding,
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── SectionTitle ─────────────────────────────────────────────
interface SectionTitleProps {
  eyebrow?: string;
  title: ReactNode;
  italic?: ReactNode;
  accent?: string;
  style?: CSSProperties;
}
export function SectionTitle({
  eyebrow,
  title,
  italic,
  accent = PD.olive,
  style,
}: SectionTitleProps) {
  return (
    <div style={{ marginBottom: 20, ...style }}>
      {eyebrow && (
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10,
            opacity: 0.6,
            marginBottom: 6,
            color: accent,
          }}
        >
          {eyebrow}
        </div>
      )}
      <div
        style={{
          ...DISPLAY_STYLE,
          fontSize: 22,
          lineHeight: 1.1,
          fontWeight: 400,
          letterSpacing: '-0.015em',
        }}
      >
        {title}{' '}
        {italic && (
          <span
            style={{
              fontStyle: 'italic',
              color: accent,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            {italic}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Button styles re-exported for pages ──────────────────────
export const btnInk: CSSProperties = {
  background: PD.ink,
  color: PD.paper,
  border: 'none',
  borderRadius: 999,
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
export const btnGhost: CSSProperties = {
  background: 'transparent',
  color: PD.ink,
  border: '1px solid rgba(31,36,24,0.2)',
  borderRadius: 999,
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
export const btnMini: CSSProperties = {
  border: 'none',
  borderRadius: 999,
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
export const btnMiniGhost: CSSProperties = {
  background: 'transparent',
  color: PD.ink,
  border: '1px solid rgba(31,36,24,0.18)',
  borderRadius: 999,
  padding: '7px 12px',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
