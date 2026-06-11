'use client';

// ─────────────────────────────────────────────────────────────
// NotificationBell — single aggregated "what's new" surface for
// the dashboard topbar. Replaces scanning multiple widgets to
// see if anything happened.
//
// Polls /api/dashboard/notifications every 60s with the current
// site id. The bell badge = items newer than the host's stored
// "last seen" timestamp (kept in localStorage). Click opens a
// dropdown showing the consolidated feed; opening also marks
// everything seen.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';

type NotificationKind = 'rsvp' | 'photo' | 'guestbook' | 'whisper' | 'message' | 'registry';

interface Notification {
  id: string;
  kind: NotificationKind;
  label: string;
  preview?: string;
  href: string;
  createdAt: string;
}

const SEEN_KEY = 'pl-notif-seen';
const POLL_MS = 60_000;

function readSeenAt(siteId: string): number {
  try {
    const raw = localStorage.getItem(`${SEEN_KEY}:${siteId}`);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}
function writeSeenAt(siteId: string, ts: number) {
  try {
    localStorage.setItem(`${SEEN_KEY}:${siteId}`, String(ts));
  } catch {
    // ignore
  }
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

const KIND_ICON: Record<NotificationKind, string> = {
  rsvp: 'mail',
  photo: 'image',
  guestbook: 'text',
  whisper: 'sparkles',
  message: 'mail',
  registry: 'gift',
};
const KIND_TINT: Record<NotificationKind, string> = {
  rsvp: 'var(--sage-tint)',
  photo: 'var(--lavender-bg)',
  guestbook: 'var(--peach-bg)',
  whisper: 'var(--peach-bg)',
  message: 'var(--cream-2)',
  registry: 'var(--peach-bg)',
};
const KIND_INK: Record<NotificationKind, string> = {
  rsvp: 'var(--sage-deep)',
  photo: 'var(--lavender-ink)',
  guestbook: 'var(--peach-ink)',
  whisper: 'var(--peach-ink)',
  message: 'var(--ink-soft)',
  registry: 'var(--peach-ink)',
};

export function NotificationBell() {
  const { site } = useSelectedSite();
  const [open, setOpen] = useState(false);
  // Tag the items with the siteId they came from so a siteId
  // change reads correctly as "loading new bell" without a
  // setState-in-effect cascade. seenAt rolls into the same
  // tagged state.
  const [bell, setBell] = useState<{ siteId: string; items: Notification[]; seenAt: number } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  // Poll for new activity every 60s. The bell badge derives from
  // items newer than seenAt. Read state is server-side
  // (notification_reads — survives across devices); localStorage
  // is kept as the offline/legacy fallback.
  useEffect(() => {
    if (!site?.id) return;
    const currentSiteId = site.id;
    const localSeenAt = readSeenAt(currentSiteId);
    let cancelled = false;
    async function pull() {
      try {
        const res = await fetch(`/api/dashboard/notifications?siteId=${encodeURIComponent(currentSiteId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: Notification[]; seenAt?: string | null };
        if (cancelled) return;
        const serverSeenAt = data.seenAt ? new Date(data.seenAt).getTime() : 0;
        setBell({
          siteId: currentSiteId,
          items: data.items ?? [],
          seenAt: Math.max(serverSeenAt, localSeenAt),
        });
      } catch {
        // ignore — bell stays empty until next tick
      }
    }
    void pull();
    const id = setInterval(pull, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [site?.id]);

  // Derive items + seenAt for the current site only.
  const items = bell?.siteId === site?.id ? (bell?.items ?? []) : [];
  const seenAt = bell?.siteId === site?.id ? (bell?.seenAt ?? 0) : 0;

  // Click-outside + Escape to close.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unreadCount = items.filter((i) => new Date(i.createdAt).getTime() > seenAt).length;

  // Narrow-viewport clamp. The bell sits LEFT of the avatar/CTA in
  // the topbar action cluster, so a right-anchored 360px dropdown
  // can run past the LEFT viewport edge on phones. Measure on open
  // and shift the dropdown rightwards (negative `right`) just enough
  // to keep a 16px gutter on both sides. DOM-measurement positioning
  // — useLayoutEffect is the right hook; the lint rule is over-strict.
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    if (!open) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(360, window.innerWidth - 32);
    // Push right until the dropdown's left edge clears 16px…
    let next = Math.max(0, 16 - (r.right - width));
    // …but never push its right edge past vw - 16.
    next = Math.min(next, Math.max(0, window.innerWidth - 16 - r.right));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShift(next);
  }, [open]);

  const handleOpen = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      // Opening marks everything currently visible as seen — both
      // locally (instant) and server-side (cross-device).
      if (next && site?.id) {
        const now = Date.now();
        writeSeenAt(site.id, now);
        setBell((prev) => prev && prev.siteId === site.id ? { ...prev, seenAt: now } : prev);
        void fetch('/api/dashboard/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: site.id }),
        }).catch(() => { /* server state catches up on next poll */ });
      }
      return next;
    });
  }, [site?.id]);

  if (!site) return null;

  return (
    // Wrapper carries its own stacking context above the page's
    // card grid. Without an explicit z-index here, cards with
    // position:relative + will-change paint over our absolutely-
    // positioned dropdown even though we set zIndex on the
    // dropdown itself — stacking is bounded by the parent's own
    // stacking context. zIndex on the wrapper lifts the whole
    // popover tree above page content.
    <div ref={ref} style={{ position: 'relative', zIndex: 100 }}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} new)` : 'Notifications'}
        title="Notifications"
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 999,
          background: open ? 'var(--cream-2)' : 'transparent',
          border: '1px solid transparent',
          color: 'var(--ink-soft)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          transition: 'background 160ms ease, border-color 160ms ease',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'var(--cream-2)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <Icon name="bell" size={16} />
        {unreadCount > 0 && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 14,
              height: 14,
              padding: '0 4px',
              borderRadius: 999,
              background: 'var(--peach-ink, #C6703D)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 0 2px var(--cream)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Recent activity"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: -shift,
            width: 'min(360px, calc(100vw - 32px))',
            background: 'var(--card)',
            border: '1px solid var(--card-ring)',
            borderRadius: 14,
            boxShadow: '0 24px 48px rgba(14,13,11,0.20), 0 4px 12px rgba(14,13,11,0.10)',
            // Bump above the page's card stacking contexts. Cards
            // with position:relative + transitions create their own
            // stacking contexts that were occluding the dropdown
            // at the previous zIndex of 60. Modal-tier (300) is
            // safely above everything except toast.
            zIndex: 300,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 480,
            overflow: 'hidden',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <div
            style={{
              padding: '14px 16px 12px',
              borderBottom: '1px solid var(--line-soft)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <h3 className="display" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              Activity
            </h3>
            <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
              Last 7 days
            </span>
          </div>
          {items.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
              All quiet. Pear&apos;ll let you know the moment something happens.
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {items.map((n) => {
                const isUnread = new Date(n.createdAt).getTime() > seenAt;
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 16px',
                      textDecoration: 'none',
                      color: 'var(--ink)',
                      borderBottom: '1px solid var(--line-soft)',
                      background: isUnread ? 'rgba(198,112,61,0.04)' : 'transparent',
                      transition: 'background 140ms ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isUnread ? 'rgba(198,112,61,0.04)' : 'transparent';
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: KIND_TINT[n.kind],
                        color: KIND_INK[n.kind],
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Icon name={KIND_ICON[n.kind]} size={13} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                          alignItems: 'baseline',
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: isUnread ? 700 : 600, color: 'var(--ink)' }}>
                          {n.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ink-muted)', flexShrink: 0 }}>
                          {relativeTime(n.createdAt)}
                        </span>
                      </div>
                      {n.preview && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--ink-soft)',
                            marginTop: 3,
                            lineHeight: 1.4,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {n.preview}
                        </div>
                      )}
                    </div>
                    {isUnread && (
                      <span
                        aria-hidden
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: 'var(--peach-ink, #C6703D)',
                          flexShrink: 0,
                          marginTop: 8,
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
