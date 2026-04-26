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
   ======================================================================== */

import { createContext, useContext, type ReactNode } from 'react';
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
  // no sidebar repaint. Combined with (shell)/loading.tsx, the
  // gap during the server-hop is filled by a paper-toned skeleton
  // instead of going blank.
  const pathname = usePathname();
  return (
    <ShellPresentContext.Provider value={true}>
      <div className="pl8 pl8-dashshell">
        {/* Persistent sidebar — stays mounted across nav. */}
        <DashSidebar />
        <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
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
