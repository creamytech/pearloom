// ─────────────────────────────────────────────────────────────
// Pearloom / app/(shell)/layout.tsx
//
// Shared shell for the dashboard, templates, and vendors routes.
// Renders the DashSidebar + main wrapper PERSISTENTLY across all
// child route navigations — when you click between tabs, only the
// inner content re-renders. The sidebar stays mounted, no flash.
//
// Auth is now enforced in src/proxy.ts (middleware) so this layout
// can render statically. That eliminates the per-tab SSR roundtrip
// that was reading as a 'fade' — pages now serve from prerendered
// HTML and hydrate client-side instantly.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';

// Opt every (shell) route out of static prerendering. The sidebar
// site picker uses useSearchParams() internally; without dynamic
// rendering, Next 16 requires a Suspense boundary on every page
// that descendants might call useSearchParams from. Marking the
// layout dynamic is the single switch that keeps the picker
// working everywhere without per-page boundaries.
export const dynamic = 'force-dynamic';

export default function ShellLayout({ children }: { children: ReactNode }) {
  return <ShellPersistentLayout>{children}</ShellPersistentLayout>;
}
