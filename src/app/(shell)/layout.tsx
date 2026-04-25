// ─────────────────────────────────────────────────────────────
// Pearloom / app/(shell)/layout.tsx
//
// Shared shell for the dashboard, templates, and vendors routes.
// Renders the DashSidebar + main wrapper PERSISTENTLY across all
// child route navigations — when you click between tabs, only the
// inner content re-renders. The sidebar stays mounted, no flash.
//
// This is a Next.js route group: the (shell) segment doesn't show
// in URLs. /dashboard, /templates, /vendors all live under here
// and share this layout.
//
// Auth is centralised here too — every (shell) route requires a
// signed-in user.
// ─────────────────────────────────────────────────────────────

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { ReactNode } from 'react';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';

export const dynamic = 'force-dynamic';

export default async function ShellLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    // Preserve the route the user was trying to reach.
    redirect('/login?next=/dashboard');
  }
  return <ShellPersistentLayout>{children}</ShellPersistentLayout>;
}
