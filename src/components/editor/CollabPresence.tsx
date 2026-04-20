'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/CollabPresence.tsx
//
// Real-time presence bar — shows avatars of every collaborator
// currently editing, plus a cursor overlay that paints a labelled
// pointer for every peer. Uses Supabase Realtime presence +
// broadcast on a channel keyed by siteId.
//
// Drop-in: <CollabPresence siteId={...} userEmail={...} />.
// Safe to mount anywhere in the editor shell; it owns its own
// channel lifecycle.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { assignCollabColor, getInitials, type CollabUser } from '@/lib/realtime-collab';

interface Props {
  siteId: string;
  userEmail: string;
  userName?: string;
  /** Optional DOM node the cursor broadcaster uses as 0,0 — defaults to window. */
  rootRef?: React.RefObject<HTMLElement>;
}

interface PresencePayload {
  userId: string;
  email: string;
  name: string;
  color: string;
  joinedAt: number;
}

interface CursorPayload {
  userId: string;
  x: number;
  y: number;
  ts: number;
}

export function CollabPresence({ siteId, userEmail, userName }: Props) {
  const [peers, setPeers] = useState<Record<string, CollabUser>>({});
  const [cursors, setCursors] = useState<
    Record<string, { x: number; y: number; color: string; name: string; ts: number }>
  >({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const myUserId = useRef<string>(
    (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const myColor = assignCollabColor(userEmail);
  const myName = userName || userEmail.split('@')[0] || 'Guest';

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    if (!url || !key || !siteId) return;

    const supabase = createClient(url, key);
    const ch = supabase.channel(`collab:${siteId}`, {
      config: {
        presence: { key: myUserId.current },
        broadcast: { self: false },
      },
    });
    channelRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<PresencePayload>();
      const active: Record<string, CollabUser> = {};
      for (const [id, arr] of Object.entries(state)) {
        const first = Array.isArray(arr) ? arr[0] : arr;
        if (!first) continue;
        active[id] = {
          userId: id,
          name: first.name,
          color: first.color,
          lastSeen: Date.now(),
        };
      }
      setPeers(active);
    });

    ch.on('broadcast', { event: 'cursor' }, ({ payload }: { payload: CursorPayload }) => {
      if (!payload || payload.userId === myUserId.current) return;
      const peer = channelRef.current
        ? (channelRef.current.presenceState<PresencePayload>()[payload.userId] as
            | PresencePayload[]
            | undefined)?.[0]
        : undefined;
      if (!peer) return;
      setCursors((prev) => ({
        ...prev,
        [payload.userId]: {
          x: payload.x,
          y: payload.y,
          color: peer.color,
          name: peer.name,
          ts: payload.ts,
        },
      }));
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({
          userId: myUserId.current,
          email: userEmail,
          name: myName,
          color: myColor,
          joinedAt: Date.now(),
        } satisfies PresencePayload);
      }
    });

    // Broadcast cursor position — throttled to 20 Hz via rAF batching.
    let pending: { x: number; y: number } | null = null;
    let raf: number | null = null;
    const onMove = (e: MouseEvent) => {
      pending = { x: e.clientX, y: e.clientY };
      if (raf != null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        if (!pending || !channelRef.current) return;
        channelRef.current.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            userId: myUserId.current,
            x: pending.x,
            y: pending.y,
            ts: Date.now(),
          } satisfies CursorPayload,
        });
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    // Sweep stale cursors every 2 s (peer closed their tab → no more broadcasts).
    const sweep = setInterval(() => {
      const cutoff = Date.now() - 4000;
      setCursors((prev) => {
        const next: typeof prev = {};
        for (const [id, c] of Object.entries(prev)) {
          if (c.ts > cutoff) next[id] = c;
        }
        return next;
      });
    }, 2000);

    return () => {
      window.removeEventListener('mousemove', onMove);
      clearInterval(sweep);
      if (raf != null) cancelAnimationFrame(raf);
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [siteId, userEmail, myName, myColor]);

  // Filter self from the avatar list.
  const peerList = Object.values(peers).filter((p) => p.userId !== myUserId.current);

  return (
    <>
      {/* Avatar row — mounts wherever the parent places it. */}
      {peerList.length > 0 && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0,
            paddingLeft: 6,
          }}
          aria-label={`${peerList.length} collaborator${peerList.length === 1 ? '' : 's'} online`}
        >
          {peerList.slice(0, 5).map((p, i) => (
            <div
              key={p.userId}
              title={`${p.name} (online)`}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: p.color,
                color: '#0E0D0B',
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.58rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--pl-cream-card)',
                marginLeft: i === 0 ? 0 : -8,
                zIndex: 10 + i,
                boxShadow: '0 2px 4px rgba(14,13,11,0.14)',
              }}
            >
              {getInitials(p.name)}
            </div>
          ))}
          {peerList.length > 5 && (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--pl-cream-deep)',
                color: 'var(--pl-ink-soft)',
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.54rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--pl-cream-card)',
                marginLeft: -8,
              }}
            >
              +{peerList.length - 5}
            </div>
          )}
        </div>
      )}

      {/* Floating cursors — one per peer. */}
      <AnimatePresence>
        {Object.entries(cursors).map(([id, c]) => (
          <motion.div
            key={id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: c.x, y: c.y }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 480, damping: 40 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 9995,
              pointerEvents: 'none',
              willChange: 'transform',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ display: 'block' }}>
              <path
                d="M3 2L17 9L10 11L8 18L3 2Z"
                fill={c.color}
                stroke="#0E0D0B"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: 18,
                left: 14,
                padding: '2px 8px',
                background: c.color,
                color: '#0E0D0B',
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.58rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 700,
                borderRadius: 'var(--pl-radius-xs)',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(14,13,11,0.2)',
              }}
            >
              {c.name}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}
