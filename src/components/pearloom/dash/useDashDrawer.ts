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
/* Shared scroll-lock bookkeeping — the body-lock effect below has
   multiple consumers, so the FIRST lock snapshots the real
   overflow value and the LAST unlock restores it. */
let lockCount = 0;
let prevOverflow = '';
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
  // Lock body scroll while the drawer is open. COUNTED, because
  // this hook has multiple consumers (DashSidebar + the mobile
  // bar both mount it): with a naive per-consumer lock, the
  // second consumer snapshots prev='hidden' and its cleanup
  // restored 'hidden' — the page stayed unscrollable after the
  // drawer closed or a nav tap changed routes.
  useEffect(() => {
    if (!open) return;
    lockCount += 1;
    if (lockCount === 1) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [open]);
  return { open, setOpen: setDashDrawerOpen, toggle: toggleDashDrawer };
}
