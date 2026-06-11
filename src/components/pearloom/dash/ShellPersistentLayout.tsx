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
import { Blob } from '../motifs';
import { DashSidebar, DashMobileBar } from './DashShell';
import { DashSubNav } from './DashSubNav';
import { DashCommandPalette } from './DashCommandPalette';
import { UserSettingsProvider } from './UserSettingsModal';
import { DialogProvider } from '@/components/ui/confirm-dialog';

const ShellPresentContext = createContext<boolean>(false);

export function useIsInsideShell(): boolean {
  return useContext(ShellPresentContext);
}

export function ShellPersistentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ShellPresentContext.Provider value={true}>
      <DialogProvider>
      <UserSettingsProvider>
      <div className="pl8 pl8-dashshell">
        <DashCommandPalette />
        <DashSidebar />
        <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {/* Mobile-only nav strip (hamburger / wordmark / account).
              Without it, pages on the PLChrome chrome had no drawer
              trigger on phones — no section nav, no sign-out. */}
          <DashMobileBar />
          {/* Paper grain — BRAND.md §3's fixed warm underlay, shared
              with DashLayout's standalone shell. */}
          <div aria-hidden className="pl-grain" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.5 }} />
          <div style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none', zIndex: 0 }}>
            <Blob tone="peach" size={380} opacity={0.35} style={{ position: 'absolute', top: -120, right: -120 }} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Section sub-nav — mounted ABOVE the page-enter
                wrapper so it stays put across tab swaps within
                the same section (Guests > Roster → Cadence
                doesn't re-fire the heavy slide+stagger). */}
            <DashSubNav />
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
      </UserSettingsProvider>
      </DialogProvider>
    </ShellPresentContext.Provider>
  );
}
