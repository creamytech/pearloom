'use client';

// ─────────────────────────────────────────────────────────────
// useDashDrawer — module-level store for the mobile sidebar
// drawer. The DashMobileBar hamburger toggles it; the DashSidebar
// reads it to apply translateX on mobile widths. Module state
// (not React Context) so any component anywhere in the dashboard
// tree can subscribe without a provider wrap.
//
// MUST be useSyncExternalStore, not a useState-tick pub/sub.
// This repo compiles with the React Compiler (next.config.ts
// `reactCompiler: true`): the old hook read the mutable module
// variable during render and bumped a counter whose value was
// never consumed, so the compiler memoized every consumer's
// output and the drawer state never reached the DOM — the
// hamburger looked wired but the drawer never opened, on any
// page. useSyncExternalStore is the compiler-sanctioned way to
// read an external store.
// ─────────────────────────────────────────────────────────────

import { useEffect, useSyncExternalStore } from 'react';

let isOpen = false;
const subs = new Set<() => void>();
function notify() {
  subs.forEach((fn) => fn());
}
function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}
function getSnapshot(): boolean {
  return isOpen;
}
function getServerSnapshot(): boolean {
  return false;
}

export function setDashDrawerOpen(open: boolean) {
  if (isOpen === open) return;
  isOpen = open;
  notify();
}
export function toggleDashDrawer() {
  setDashDrawerOpen(!isOpen);
}

export function useDashDrawer(): { open: boolean; setOpen: (v: boolean) => void; toggle: () => void } {
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Auto-close when crossing back to desktop width so the drawer
  // doesn't strand "open" on resize.
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 960 && isOpen) setDashDrawerOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  return { open, setOpen: setDashDrawerOpen, toggle: toggleDashDrawer };
}
