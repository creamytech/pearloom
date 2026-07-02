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
import { DashSidebar, DashMobileBar, DashUtilityBar } from './DashShell';
import { DashSubNav } from './DashSubNav';
import { DashCommandPalette } from './DashCommandPalette';
import { DashOrientation } from './DashOrientation';
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
        <DashOrientation />
        <DashSidebar />
        <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {/* Mobile-only nav strip (hamburger / wordmark / account).
              Without it, pages on the PLChrome chrome had no drawer
              trigger on phones — no section nav, no sign-out. */}
          <DashMobileBar />
          {/* Global control cluster (theme · notifications · account)
              — mounted once here so every dashboard page has it,
              desktop-only (mobile uses DashMobileBar above). */}
          <DashUtilityBar />
          {/* Linen paper texture — the v2 cockpit's default ground
              (ui_kits/dashboard/index.html, texture: 'linen'). Rides at
              0.55 over the warm --glow painted on the main, so the
              atmosphere reads exactly like the zip: warm peach + sage
              blooms, muted by a woven paper. Supersedes the old grain +
              peach Blob — the glow now carries the warm corner. */}
          <div aria-hidden className="pl-tx-linen" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.55 }} />
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
