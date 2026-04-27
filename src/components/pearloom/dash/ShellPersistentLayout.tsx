'use client';

/* ========================================================================
   ShellPersistentLayout — persistent dashboard chrome.
   • Sidebar + atmospheric background stay mounted across tab nav
     so there's no flash of empty layout between routes.
   • Inner content is wrapped in a pathname-keyed div with the
     `pl8-dash-page-enter` class so each tab navigation re-fires
     the 540ms slide+fade entry animation. The CSS keyframe
     respects prefers-reduced-motion automatically.
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
  const pathname = usePathname();
  return (
    <ShellPresentContext.Provider value={true}>
      <div className="pl8 pl8-dashshell">
        <DashSidebar />
        <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none', zIndex: 0 }}>
            <Blob tone="peach" size={380} opacity={0.35} style={{ position: 'absolute', top: -120, right: -120 }} />
            <Squiggle variant={1} width={180} style={{ position: 'absolute', top: 40, right: 200, transform: 'rotate(-15deg)', opacity: 0.6 }} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Pathname-keyed wrapper — remounts on every route
                change so the CSS animation re-triggers. Without
                this key, the animation only fires on initial
                mount. */}
            <div key={`shell:${pathname}`} className="pl8-dash-page-enter">
              {children}
            </div>
          </div>
        </main>
      </div>
    </ShellPresentContext.Provider>
  );
}
