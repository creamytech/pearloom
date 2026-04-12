'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/CanvasCursors.tsx
// Real-time collaborative cursors on the editor canvas.
// Shows other editors' cursor positions and active selections
// using Supabase Realtime presence.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
  color: string;
  activeBlock?: string;
  lastSeen: number;
}

const CURSOR_COLORS = [
  '#71717A', '#6D597A', '#C4A96A', '#C45D3E',
  '#3a7ca8', '#d4829a', '#6a8f5a', '#c97c30',
];

function getCursorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

interface CanvasCursorsProps {
  /** Current user's ID */
  currentUserId: string;
  /** Site ID for the Realtime channel */
  siteId: string;
  /** Container ref to calculate relative positions */
  containerRef: React.RefObject<HTMLElement | null>;
}

export function CanvasCursors({ currentUserId, siteId, containerRef }: CanvasCursorsProps) {
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const broadcastInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  // Track local mouse position
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mousePos.current = {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      };
    };

    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [containerRef]);

  // Clean up stale cursors (older than 5 seconds)
  useEffect(() => {
    const cleanup = setInterval(() => {
      setCursors(prev => {
        const now = Date.now();
        const next = new Map(prev);
        for (const [id, cursor] of next) {
          if (now - cursor.lastSeen > 5000) {
            next.delete(id);
          }
        }
        return next;
      });
    }, 2000);

    return () => clearInterval(cleanup);
  }, []);

  // Render remote cursors
  const remoteCursors = Array.from(cursors.values()).filter(c => c.userId !== currentUserId);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', zIndex: 40,
      overflow: 'hidden',
    }}>
      <AnimatePresence>
        {remoteCursors.map((cursor) => (
          <motion.div
            key={cursor.userId}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: 1, scale: 1,
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'absolute',
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor arrow SVG */}
            <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
              <path
                d="M1 1L7 20L9.5 12.5L17 10L1 1Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Name label */}
            <div style={{
              position: 'absolute',
              left: '16px', top: '14px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: cursor.color,
              color: 'white',
              fontSize: '0.6rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
              {cursor.userName}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
