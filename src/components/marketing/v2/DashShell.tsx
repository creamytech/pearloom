'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/v2/DashShell.tsx
// Thin adapter — delegates chrome to the Pearloom v8 DashLayout.
// Preserved as an export so legacy call sites (e.g. /dashboard/remember)
// continue to work while the new warm sidebar is applied globally.
// ─────────────────────────────────────────────────────────────

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { DashLayout as PearloomDashLayout } from '@/components/pearloom/dash/DashShell';

function activeFor(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname.startsWith('/dashboard/day-of')) return 'timeline';
  if (pathname.startsWith('/dashboard/rsvp')) return 'guests';
  if (pathname.startsWith('/dashboard/analytics')) return 'analytics';
  if (pathname.startsWith('/dashboard/connections')) return 'connections';
  if (pathname.startsWith('/dashboard/profile')) return 'settings';
  if (pathname.startsWith('/dashboard/director')) return 'studio';
  if (pathname.startsWith('/dashboard/event')) return 'sites';
  if (pathname.startsWith('/dashboard/gallery')) return 'sites';
  if (pathname.startsWith('/dashboard/submissions')) return 'sites';
  if (pathname.startsWith('/dashboard/remember')) return 'sites';
  return undefined;
}

export function DashShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <PearloomDashLayout active={activeFor(pathname)} hideTopbar>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {children}
      </div>
    </PearloomDashLayout>
  );
}
