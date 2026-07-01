'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/analytics/AnalyticsBeacon.tsx
// Invisible component that records the page visit and tracks
// per-section engagement using IntersectionObserver on
// [data-section-id] elements. `siteId` is the site's SUBDOMAIN —
// that's the key site_analytics rows carry.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';

interface AnalyticsBeaconProps {
  siteId: string;
}

/* One visit per page load per site — module-level so StrictMode's
   double effect run and SPA hops between a site's sub-pages don't
   inflate the count. A fresh document load resets it. */
let visitStamped: string | null = null;

export function AnalyticsBeacon({ siteId }: AnalyticsBeaconProps) {
  /* The visit row — this is the writer the dashboard's "Site
     visits" KPI, sources split and My-sites cards read. Fire-and-
     forget: analytics must never be the reason a guest sees an
     error. */
  useEffect(() => {
    if (!siteId || visitStamped === siteId) return;
    visitStamped = siteId;
    try {
      fetch('/api/analytics/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, referrer: document.referrer || null }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* ignore — see above */ }
  }, [siteId]);

  useEffect(() => {
    if (!siteId) return;
    /* Analytics must never be the reason a guest sees an error —
       environments without IntersectionObserver just skip it. */
    if (typeof IntersectionObserver === 'undefined') return;

    const observers: IntersectionObserver[] = [];

    document.querySelectorAll('[data-section-id]').forEach((el) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const sectionId = el.getAttribute('data-section-id');
            if (!sectionId) return;

            // Track the view event
            fetch('/api/analytics/section', {
              method: 'POST',
              body: JSON.stringify({ siteId, sectionId, eventType: 'view' }),
              headers: { 'Content-Type': 'application/json' },
            }).catch(() => {});

            // Track time spent
            const startTime = Date.now();
            const handleLeave = () => {
              const durationMs = Date.now() - startTime;
              if (durationMs > 2000) {
                fetch('/api/analytics/section', {
                  method: 'POST',
                  body: JSON.stringify({ siteId, sectionId, eventType: 'time_spent', durationMs }),
                  headers: { 'Content-Type': 'application/json' },
                }).catch(() => {});
              }
            };

            // Observe leaving — re-use same observer callback
            observer.disconnect();
            const leaveObserver = new IntersectionObserver(
              ([leaveEntry]) => {
                if (!leaveEntry.isIntersecting) {
                  handleLeave();
                  leaveObserver.disconnect();
                }
              },
              { threshold: 0.3 }
            );
            leaveObserver.observe(el);
            observers.push(leaveObserver);
          }
        },
        { threshold: 0.3 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [siteId]);

  return null;
}
