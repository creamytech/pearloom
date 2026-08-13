'use client';

// ─────────────────────────────────────────────────────────────
// The weave cut — Pearloom's one route transition (COHESION N.2).
//
// Inside the product, navigation never reloads the document and
// never CUTS: when a navigation crosses a ZONE boundary (landing →
// wizard, dashboard → editor, editor → store…), the route swap is
// wrapped in the native View Transitions API so the old surface
// breathes out and the new one settles in (CSS in globals.css,
// ≤240ms, --pl-ease-out). Three laws:
//
//   · The shell stays still — /dashboard/* → /dashboard/* pairs
//     bypass the transition entirely ((shell)/loading.tsx's "one
//     page, different content" decision).
//   · Reduced motion = no motion — startViewTransition is skipped,
//     navigation is plain.
//   · No experimental flags — this is document.startViewTransition
//     directly (Next 16's experimental.viewTransition is advised
//     against in its own docs); browsers without it just navigate.
//
// Two consumers:
//   · useSoftRouter() — push/replace for programmatic navigation
//     (the N.1 conversions use this instead of window.location).
//   · <SoftNavigation/> — mounted ONCE in the root layout; a
//     capture-phase click listener that upgrades ordinary internal
//     anchor clicks (plain left-click, same origin, no target/
//     download, not [data-pl-hard]) into the same wrapped push.
//     preventDefault() runs before Next's own Link handler (which
//     bails on defaultPrevented), so <Link> keeps prefetching and
//     accessibility while the navigation itself gets the cut.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** First path segment = the zone. The whole dashboard is ONE zone
 *  (the shell law); everything else falls out naturally: '' the
 *  landing, wizard, editor, store, upgrade, demo, sites/occasion
 *  prefixes on published pages… */
export function zoneOf(pathname: string): string {
  return pathname.split('/').filter(Boolean)[0] ?? '';
}

type DocWithVT = Document & {
  startViewTransition?: (cb: () => Promise<void> | void) => unknown;
};

function motionAllowed(): boolean {
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** The pathname-change resolver: startViewTransition holds the old
 *  frame until its callback's promise settles, so the callback
 *  resolves when the router has actually swapped routes (watched by
 *  <SoftNavigation/> below) — with a hard 1.2s cap so a slow
 *  stream can never freeze the page on a snapshot. */
let pendingArrival: (() => void) | null = null;

declare global {
  interface Window {
    /** Telemetry for the cohesion fence: how many navigations ran
     *  through the weave cut this document. */
    __plWeaveCuts?: number;
  }
}

function navigateSoft(
  go: () => void,
  fromPath: string,
  toHref: string,
): void {
  const doc = document as DocWithVT;
  let toPath = fromPath;
  try {
    toPath = new URL(toHref, window.location.href).pathname;
  } catch {}
  const crossesZone = zoneOf(fromPath) !== zoneOf(toPath);
  if (!doc.startViewTransition || !motionAllowed() || !crossesZone) {
    go();
    return;
  }
  window.__plWeaveCuts = (window.__plWeaveCuts ?? 0) + 1;
  doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        pendingArrival = resolve;
        // The cap: if the new route streams slowly, release the
        // transition and let content arrive plainly after.
        setTimeout(resolve, 1200);
        go();
      }),
  );
}

/** Programmatic navigation with the weave cut. Drop-in for the
 *  places that used window.location.assign on internal routes. */
export function useSoftRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const push = useCallback(
    (href: string) => navigateSoft(() => router.push(href), pathname, href),
    [router, pathname],
  );
  const replace = useCallback(
    (href: string) => navigateSoft(() => router.replace(href), pathname, href),
    [router, pathname],
  );
  return { push, replace };
}

function upgradeableAnchor(e: MouseEvent): HTMLAnchorElement | null {
  if (e.defaultPrevented) return null;
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const path = e.composedPath();
  for (const el of path) {
    if (!(el instanceof HTMLAnchorElement)) continue;
    const href = el.getAttribute('href');
    if (!href || href.startsWith('#')) return null;
    if (el.target && el.target !== '_self') return null;
    if (el.hasAttribute('download')) return null;
    // Opt-out for deliberate hard/handled links ("View your site"
    // opens the guest context in a new tab; auth flows re-run the
    // document on purpose).
    if (el.closest('[data-pl-hard]')) return null;
    let url: URL;
    try {
      url = new URL(el.href, window.location.href);
    } catch {
      return null;
    }
    if (url.origin !== window.location.origin) return null;
    // Same-path hash/anchor moves are scrolls, not navigations.
    if (url.pathname === window.location.pathname && url.hash) return null;
    return el;
  }
  return null;
}

/** Mounted once in the root layout. Watches arrivals (releasing the
 *  held transition) and upgrades eligible anchor clicks. */
export function SoftNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    pendingArrival?.();
    pendingArrival = null;
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = upgradeableAnchor(e);
      if (!a) return;
      const from = window.location.pathname;
      const to = new URL(a.href, window.location.href);
      const crossesZone = zoneOf(from) !== zoneOf(to.pathname);
      const doc = document as DocWithVT;
      if (!crossesZone || !doc.startViewTransition || !motionAllowed()) {
        // In-zone (incl. every shell tab switch) and no-support
        // paths stay exactly as they are: Next's own Link handling.
        return;
      }
      e.preventDefault();
      navigateSoft(
        () => router.push(to.pathname + to.search + to.hash),
        from,
        a.href,
      );
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

  return null;
}
