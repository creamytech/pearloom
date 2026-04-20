'use client';

// ─────────────────────────────────────────────────────────────
// DashboardShell — shared chrome for every /dashboard/* subroute.
// Replaces the hand-rolled header + sidebar that each page used
// to inline. Keeps main /dashboard free to render its own frame
// (it owns the fullscreen editor + PearSpotlight hand-offs).
//
// Cohesion rule: this shell's header is the SAME shape as
// DashboardClient's top bar — wordmark on the left, theme
// toggle + UserNav on the right. Both inherit the root theme
// (pl-theme), no inner ThemeProvider, so dark-mode toggling
// flips every dashboard page together.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardSidebar } from './sidebar';
import { ThemeToggle } from '@/components/shell';
import { UserNav } from './user-nav';

interface DashboardShellProps {
  eyebrow: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  contentMaxWidth?: number | string;
}

export function DashboardShell({
  eyebrow,
  children,
  rightSlot,
  contentMaxWidth = 1180,
}: DashboardShellProps) {
  const { data: session } = useSession();
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pl-cream)',
      }}
    >
      <header
        style={{
          height: 60,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(16px, 4vw, 32px)',
          borderBottom: '1px solid var(--pl-divider)',
          background: 'color-mix(in oklab, var(--pl-cream) 88%, transparent)',
          backdropFilter: 'saturate(140%) blur(14px)',
          WebkitBackdropFilter: 'saturate(140%) blur(14px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/dashboard"
            style={{
              fontFamily: 'var(--pl-font-display)',
              fontSize: '1.05rem',
              color: 'var(--pl-groove-ink)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Pearloom
          </Link>
          <span
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.78rem',
              fontWeight: 500,
              color: 'var(--pl-groove-terra)',
              letterSpacing: '-0.005em',
            }}
          >
            {eyebrow}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {rightSlot}
          <ThemeToggle />
          {session?.user && <UserNav user={session.user} />}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>
        <main style={{ flex: 1, overflow: 'auto' }}>
          <div
            style={{
              maxWidth: contentMaxWidth,
              margin: '0 auto',
              padding: 'clamp(24px, 4vh, 48px) clamp(16px, 4vw, 40px)',
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
