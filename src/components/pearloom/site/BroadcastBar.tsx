'use client';

/* ========================================================================
   BroadcastBar — slim banner that appears on a published site when the
   host posts a live update via /api/sites/live-updates. Reads the latest
   message every 30s while the site is open. Auto-dismisses 4 hours after
   posting so a stale "Cocktails by the pool" doesn't linger after the
   event ends.
   ======================================================================== */

import { useEffect, useState } from 'react';

type LiveUpdate = {
  id: string;
  message: string;
  type?: string;
  photo_url?: string | null;
  created_at: string;
};

interface Props {
  subdomain: string;
}

const STALE_MS = 4 * 60 * 60 * 1000;       // hide updates older than 4h
const POLL_MS = 30 * 1000;                  // refresh every 30s
const DISMISS_KEY_PREFIX = 'pl-bcast-dismissed:';

export function BroadcastBar({ subdomain }: Props) {
  const [latest, setLatest] = useState<LiveUpdate | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = window.sessionStorage.getItem(DISMISS_KEY_PREFIX + subdomain);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    let cancel = false;
    async function fetchLatest() {
      try {
        const res = await fetch(`/api/sites/live-updates?subdomain=${encodeURIComponent(subdomain)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { updates?: LiveUpdate[] };
        if (cancel) return;
        const newest = (data.updates ?? [])
          .filter((u) => Date.now() - new Date(u.created_at).getTime() < STALE_MS)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        setLatest(newest ?? null);
      } catch {}
    }
    fetchLatest();
    const id = setInterval(fetchLatest, POLL_MS);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [subdomain]);

  if (!latest) return null;
  if (dismissedIds.has(latest.id)) return null;

  const dismiss = () => {
    const next = new Set(dismissedIds);
    next.add(latest.id);
    setDismissedIds(next);
    try {
      window.sessionStorage.setItem(DISMISS_KEY_PREFIX + subdomain, JSON.stringify([...next]));
    } catch {}
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: 'var(--peach-ink, #C6703D)',
        color: 'var(--cream, #FDFAF0)',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontSize: 14,
        fontWeight: 500,
        boxShadow: '0 2px 12px rgba(14,13,11,0.18)',
        animation: 'pl-bcast-in 380ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--cream, #FDFAF0)',
          animation: 'pl-bcast-pulse 1.6s ease-in-out infinite',
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, lineHeight: 1.4 }}>{latest.message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: 'rgba(255,255,255,0.18)',
          border: 'none',
          color: 'inherit',
          padding: '4px 10px',
          borderRadius: 999,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Dismiss
      </button>
      <style jsx>{`
        @keyframes pl-bcast-in {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pl-bcast-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes pl-bcast-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes pl-bcast-pulse {
            0%, 100% { opacity: 0.85; transform: none; }
          }
        }
      `}</style>
    </div>
  );
}
