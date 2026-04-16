'use client';

// ─────────────────────────────────────────────────────────────
// AppShell — single primitive that all dashboard surfaces use.
//
// Slots:
//   nav     — left rail content (sidebar items)
//   header  — top bar slot (title, breadcrumb, actions)
//   children — main content area
//
// Replaces three different ad-hoc header patterns and the
// hand-rolled rail markup across dashboard pages.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

interface AppShellProps {
  nav?: ReactNode;
  navWidth?: number;
  title?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Suppress the default nav rail (e.g. for full-bleed editor) */
  bare?: boolean;
}

export function AppShell({
  nav,
  navWidth = 232,
  title,
  eyebrow,
  actions,
  children,
  bare = false,
}: AppShellProps) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--pl-cream)',
        color: 'var(--pl-ink)',
        display: 'grid',
        gridTemplateColumns: bare || !nav ? '1fr' : `${navWidth}px 1fr`,
        gridTemplateRows: 'auto 1fr',
        gridTemplateAreas: bare || !nav ? `"header" "main"` : `"nav header" "nav main"`,
      }}
    >
      {/* ── Left rail ─────────────────────────────────────── */}
      {!bare && nav && (
        <aside
          style={{
            gridArea: 'nav',
            background: 'var(--pl-cream-card)',
            borderRight: '1px solid var(--pl-divider)',
            position: 'sticky',
            top: 0,
            height: '100dvh',
            overflow: 'hidden auto',
            display: 'flex',
            flexDirection: 'column',
          }}
          className="pl-app-nav"
        >
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '20px 22px 16px',
              textDecoration: 'none',
              color: 'var(--pl-ink)',
            }}
          >
            <PearloomMark />
            <span
              style={{
                fontFamily: 'var(--pl-font-display)',
                fontSize: '1.12rem',
                fontWeight: 500,
                letterSpacing: '-0.015em',
                fontStyle: 'italic',
                fontVariationSettings: '"opsz" 144, "SOFT" 60, "WONK" 1',
              }}
            >
              Pearloom
            </span>
          </Link>
          <div style={{ flex: 1, padding: '4px 14px 24px', minHeight: 0 }}>{nav}</div>
        </aside>
      )}

      {/* ── Top header ─────────────────────────────────────── */}
      <header
        style={{
          gridArea: 'header',
          height: 60,
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'var(--pl-cream)',
          borderBottom: '1px solid var(--pl-divider-soft)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backdropFilter: 'blur(var(--pl-glass-blur))',
          WebkitBackdropFilter: 'blur(var(--pl-glass-blur))',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {eyebrow && (
            <div
              className="pl-overline"
              style={{ marginBottom: 2, fontSize: '0.62rem', letterSpacing: '0.18em' }}
            >
              {eyebrow}
            </div>
          )}
          {typeof title === 'string' ? (
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--pl-font-display)',
                fontWeight: 500,
                fontSize: '1.4rem',
                letterSpacing: '-0.018em',
                color: 'var(--pl-ink)',
                lineHeight: 1.05,
              }}
            >
              {title}
            </h1>
          ) : (
            title
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {actions}
          <ThemeToggle size="sm" />
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <main
        style={{
          gridArea: 'main',
          padding: 'clamp(20px, 3vw, 36px)',
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  );
}

// ─── Small Pearloom mark — a knotted ring (the "loom") ───────

function PearloomMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="var(--pl-olive)"
        strokeWidth="1.6"
      />
      <path
        d="M7.2 9c2 1.6 4.4 1.6 6.4 0M7.2 15c2-1.6 4.4-1.6 6.4 0"
        stroke="var(--pl-gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.4" fill="var(--pl-olive-deep)" />
    </svg>
  );
}

// ─── NavGroup primitive — renders one section of left rail ───

interface NavGroupProps {
  label?: string;
  children: ReactNode;
}

export function NavGroup({ label, children }: NavGroupProps) {
  return (
    <div style={{ marginBottom: 18 }}>
      {label && (
        <div
          className="pl-overline"
          style={{
            padding: '12px 10px 8px',
            fontSize: '0.6rem',
            color: 'var(--pl-muted)',
          }}
        >
          {label}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  );
}

interface NavItemProps {
  href: string;
  icon?: ReactNode;
  active?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}

export function NavItem({ href, icon, active, badge, children }: NavItemProps) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '8px 10px',
        borderRadius: 'var(--pl-radius-md)',
        textDecoration: 'none',
        fontSize: '0.88rem',
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--pl-ink)' : 'var(--pl-ink-soft)',
        background: active ? 'var(--pl-olive-mist)' : 'transparent',
        position: 'relative',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--pl-olive-5)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon && (
        <span
          style={{
            width: 16,
            height: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: active ? 'var(--pl-olive)' : 'var(--pl-muted)',
          }}
        >
          {icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{children}</span>
      {badge}
      {active && (
        <span
          style={{
            position: 'absolute',
            left: -14,
            top: 8,
            bottom: 8,
            width: 2,
            background: 'var(--pl-olive)',
            borderRadius: 2,
          }}
        />
      )}
    </Link>
  );
}
