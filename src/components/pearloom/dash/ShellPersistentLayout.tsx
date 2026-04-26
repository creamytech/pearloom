'use client';

/* ========================================================================
   ShellPersistentLayout — persistent dashboard chrome.
   User explicitly does not want any motion on tab switch. So:
     - No key={pathname} on the children wrapper. React reconciles
       across nav instead of unmounting + remounting, eliminating
       the brief blank gap that read as a fade-in.
     - No tab-swipe animation class.
     - No top progress bar.
     - Sidebar persistent, atmospheric background persistent.
   ======================================================================== */

import { createContext, useContext, type ReactNode } from 'react';
import { Blob, Squiggle } from '../motifs';
import { DashSidebar } from './DashShell';

const ShellPresentContext = createContext<boolean>(false);

export function useIsInsideShell(): boolean {
  return useContext(ShellPresentContext);
}

export function ShellPersistentLayout({ children }: { children: ReactNode }) {
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
            {children}
          </div>
        </main>
      </div>
    </ShellPresentContext.Provider>
  );
}
