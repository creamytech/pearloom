'use client';

/* ========================================================================
   ShellPersistentLayout — the persistent dashboard chrome that wraps
   every (shell) route. Client component because DashSidebar uses
   usePathname/useSession.

   The sidebar mounts ONCE and stays mounted across navigations
   between /dashboard, /dashboard/*, /templates, /vendors. Only the
   inner content re-renders when the user clicks a tab — no flash.

   A React context (ShellPresentContext) tells nested DashLayout
   instances "the shell is already provided — just render content".

   Polish 2026-04-26: top-edge progress bar driven by pathname
   change detection. Whenever the pathname changes, the bar
   pulses for 480ms. Combined with the delay-show loading.tsx,
   tab clicks read as instant for fast pages and "something is
   coming" for slow pages — never as "the page is fading".
   ======================================================================== */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Blob, Squiggle } from '../motifs';
import { DashSidebar } from './DashShell';

const ShellPresentContext = createContext<boolean>(false);

export function useIsInsideShell(): boolean {
  return useContext(ShellPresentContext);
}

export function ShellPersistentLayout({ children }: { children: ReactNode }) {
  // Re-keying on pathname means each route swap remounts the inner
  // content with a fresh CSS animation tick. The shell + sidebar
  // (outside this key) stay mounted across navigations — no flash,
  // no sidebar repaint.
  const pathname = usePathname();
  const lastPathRef = useRef(pathname);
  const [pending, setPending] = useState(false);

  // Pulse the top progress bar whenever the pathname changes.
  // Held visible for 480ms so users see the strip even on
  // sub-200ms transitions. Auto-clears so the bar isn't a
  // permanent fixture.
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    setPending(true);
    const id = window.setTimeout(() => setPending(false), 480);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return (
    <ShellPresentContext.Provider value={true}>
      <div className="pl8 pl8-dashshell">
        {/* Persistent sidebar — stays mounted across nav. */}
        <DashSidebar />
        <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {/* Top progress bar — peach gradient crawls across the top
              edge whenever a tab is mid-navigation. Visual feedback
              that arrives instantly on click. */}
          <div className="pl8-top-progress" data-pending={pending ? '1' : undefined} aria-hidden />
          {/* Atmospheric background — also persistent. */}
          <div style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none', zIndex: 0 }}>
            <Blob tone="peach" size={380} opacity={0.35} style={{ position: 'absolute', top: -120, right: -120 }} />
            <Squiggle variant={1} width={180} style={{ position: 'absolute', top: 40, right: 200, transform: 'rotate(-15deg)', opacity: 0.6 }} />
          </div>
          <div key={pathname} className="pl8-tab-swipe" style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </div>
        </main>
      </div>
    </ShellPresentContext.Provider>
  );
}
