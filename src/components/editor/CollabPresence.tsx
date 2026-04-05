'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

function getSupabaseClient(): AnySupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  // Dynamic import to avoid bundling issues — use createClient from supabase-js
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js');
    return createClient(url, key);
  } catch {
    return null;
  }
}

// ── Avatar Component ──────────────────────────────────────────────────────────
function Avatar({ user, showPulse }: { user: CollabUser; showPulse: boolean }) {
  const [hovered, setHovered] = useState(false);
  const initials = getInitials(user.name);
  const isRecent = Date.now() - user.lastSeen < 15_000;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      style={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Pulse ring for recently active */}
      {showPulse && isRecent && (
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.15, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: '-3px',
            borderRadius: '50%',
            border: `2px solid ${user.color}`,
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
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.92 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(30,27,22,0.95)',
              border: '1px solid rgba(0,0,0,0.07)',
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── CollabPresence Component ──────────────────────────────────────────────────
export function CollabPresence({ siteId, currentUser, cursor }: CollabPresenceProps) {
  const [others, setOthers] = useState<CollabUser[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseRef = useRef<any>(null);

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
          const state = channel.presenceState() as Record<string, CollabUser[]>;
          const allUsers = Object.values(state).flat() as CollabUser[];
          const active = filterActiveUsers(
            allUsers.filter(u => u.userId !== currentUser.id),
            STALE_THRESHOLD_MS
          );
          setOthers(active);
        } catch {
          // Ignore state read errors
        }
      });

      channel.on('presence', { event: 'join' }, ({ newPresences }: { newPresences: CollabUser[] }) => {
        const joined = newPresences.filter(u => u.userId !== currentUser.id);
        if (joined.length === 0) return;
        setOthers(prev => {
          const ids = new Set(prev.map(u => u.userId));
          const merged = [...prev, ...joined.filter(u => !ids.has(u.userId))];
          return filterActiveUsers(merged, STALE_THRESHOLD_MS);
        });
      });

      channel.on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: CollabUser[] }) => {
        const leftIds = new Set(leftPresences.map(u => u.userId));
        setOthers(prev => prev.filter(u => !leftIds.has(u.userId)));
      });

      channel.subscribe(async (status: string) => {
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}
      aria-label={`${others.length} other${others.length !== 1 ? 's' : ''} editing`}
    >
      <AnimatePresence>
        {visible.map(user => (
          <Avatar key={user.userId} user={user} showPulse />
        ))}
      </AnimatePresence>
      {overflow > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 340, damping: 24 }}
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.06)',
            border: '2px solid rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            fontWeight: 600,
            color: 'rgba(245,240,232,0.7)',
          }}
        >
          +{overflow}
        </motion.div>
      )}
    </div>
  );
}
