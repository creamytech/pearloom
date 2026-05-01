'use client';

// ─────────────────────────────────────────────────────────────
// useDashDrawer — module-level pub/sub for the mobile sidebar
// drawer. The DashTopbar's hamburger toggles it; the DashSidebar
// reads it to apply translateX on mobile widths. Module state
// (not React Context) so any component anywhere in the dashboard
// tree can subscribe without a provider wrap.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

let isOpen = false;
const subs = new Set<() => void>();
function notify() {
  subs.forEach((fn) => fn());
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
  const [, tick] = useState(0);
  useEffect(() => {
    const sub = () => tick((n) => n + 1);
    subs.add(sub);
    return () => {
      subs.delete(sub);
    };
  }, []);
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
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  });
  return { open: isOpen, setOpen: setDashDrawerOpen, toggle: toggleDashDrawer };
}
