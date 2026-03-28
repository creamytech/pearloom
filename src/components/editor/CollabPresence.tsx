'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  createCollabChannel,
  assignCollabColor,
  getInitials,
  filterActiveUsers,
  type CollabUser,
} from '@/lib/realtime-collab';

interface CollabPresenceProps {
  siteId: string;
  currentUser: { id: string; name: string };
  /** Optional: which section/tab this user is currently viewing */
  cursor?: string;
}

const MAX_VISIBLE_AVATARS = 4;
const BROADCAST_INTERVAL_MS = 10_000;
const STALE_THRESHOLD_MS = 30_000;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── Avatar Component ──────────────────────────────────────────────────────────
function Avatar({ user, showPulse }: { user: CollabUser; showPulse: boolean }) {
  const [hovered, setHovered] = useState(false);
  const initials = getInitials(user.name);
  const isRecent = Date.now() - user.lastSeen < 15_000;

  return (
    <div
      style={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Pulse ring for recently active */}
      {showPulse && isRecent && (
        <div
          style={{
            position: 'absolute',
            inset: '-3px',
            borderRadius: '50%',
            border: `2px solid ${user.color}`,
            opacity: 0.5,
            animation: 'collab-pulse 2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          background: user.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#1e1b16',
          border: '2px solid rgba(30,27,22,0.8)',
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        {initials}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(30,27,22,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '0.4rem',
            padding: '0.35rem 0.6rem',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <span style={{ color: '#f5f0e8', fontSize: '0.75rem', fontWeight: 500 }}>
            {user.name}
            {user.cursor ? ` · ${user.cursor}` : ''}
          </span>
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid rgba(30,27,22,0.95)',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── CollabPresence Component ──────────────────────────────────────────────────
export function CollabPresence({ siteId, currentUser, cursor }: CollabPresenceProps) {
  const [others, setOthers] = useState<CollabUser[]>([]);
  const channelRef = useRef<ReturnType<typeof createCollabChannel> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return; // Graceful: no Supabase configured
    supabaseRef.current = supabase;

    let channel: ReturnType<typeof createCollabChannel>;

    try {
      channel = createCollabChannel(siteId, supabase);
      channelRef.current = channel;

      const myPresence: CollabUser = {
        userId: currentUser.id,
        name: currentUser.name,
        color: assignCollabColor(currentUser.id),
        cursor: cursor,
        lastSeen: Date.now(),
      };

      // Track presence changes
      channel.on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState<CollabUser>();
          const allUsers: CollabUser[] = Object.values(state).flat();
          const active = filterActiveUsers(
            allUsers.filter(u => u.userId !== currentUser.id),
            STALE_THRESHOLD_MS
          );
          setOthers(active);
        } catch {
          // Ignore state read errors
        }
      });

      channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        const joined = (newPresences as CollabUser[]).filter(u => u.userId !== currentUser.id);
        if (joined.length === 0) return;
        setOthers(prev => {
          const ids = new Set(prev.map(u => u.userId));
          const merged = [...prev, ...joined.filter(u => !ids.has(u.userId))];
          return filterActiveUsers(merged, STALE_THRESHOLD_MS);
        });
      });

      channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftIds = new Set((leftPresences as CollabUser[]).map(u => u.userId));
        setOthers(prev => prev.filter(u => !leftIds.has(u.userId)));
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(myPresence);
        }
      });

      // Re-broadcast own presence every BROADCAST_INTERVAL_MS
      intervalRef.current = setInterval(async () => {
        try {
          await channel.track({
            ...myPresence,
            cursor: cursor,
            lastSeen: Date.now(),
          });

          // Also prune stale users from local state
          setOthers(prev => filterActiveUsers(prev, STALE_THRESHOLD_MS));
        } catch {
          // Ignore broadcast errors
        }
      }, BROADCAST_INTERVAL_MS);
    } catch {
      // Graceful: if Realtime setup fails, render nothing
      return;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      try {
        channelRef.current?.unsubscribe();
        supabase.removeChannel(channelRef.current!);
      } catch {
        // Ignore cleanup errors
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, currentUser.id]);

  // Update cursor in presence when it changes
  useEffect(() => {
    if (!channelRef.current) return;
    try {
      channelRef.current.track({
        userId: currentUser.id,
        name: currentUser.name,
        color: assignCollabColor(currentUser.id),
        cursor,
        lastSeen: Date.now(),
      });
    } catch {
      // Ignore
    }
  }, [cursor, currentUser.id, currentUser.name]);

  // Show nothing if no one else is editing
  if (others.length === 0) return null;

  const visible = others.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = others.length - MAX_VISIBLE_AVATARS;

  return (
    <>
      {/* Pulse keyframe injection */}
      <style>{`
        @keyframes collab-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.25); opacity: 0.2; }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
        aria-label={`${others.length} other${others.length !== 1 ? 's' : ''} editing`}
      >
        {visible.map(user => (
          <Avatar key={user.userId} user={user} showPulse />
        ))}
        {overflow > 0 && (
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 600,
              color: 'rgba(245,240,232,0.7)',
            }}
          >
            +{overflow}
          </div>
        )}
      </div>
    </>
  );
}
