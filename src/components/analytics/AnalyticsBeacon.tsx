'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/analytics/AnalyticsBeacon.tsx
// Invisible component that tracks per-section engagement
// using IntersectionObserver on [data-section-id] elements.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';

interface AnalyticsBeaconProps {
  siteId: string;
}

export function AnalyticsBeacon({ siteId }: AnalyticsBeaconProps) {
  useEffect(() => {
    if (!siteId) return;

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
