import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Pearloom / lib/realtime-collab.ts
// Supabase Realtime presence utilities for collaborative site editing.
// ─────────────────────────────────────────────────────────────────────────────

export interface CollabUser {
  userId: string;
  name: string;
  color: string;     // assigned from COLLAB_COLORS
  cursor?: string;   // which section/tab they're currently viewing
  lastSeen: number;  // Unix timestamp (ms)
}

const COLLAB_COLORS = ['#A3B18A', '#D6C6A8', '#C4A882', '#8BA888', '#B5A99A'];

/**
 * Assign a consistent color to a user based on their userId.
 * The same userId always gets the same color.
 */
export function assignCollabColor(userId: string): string {
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLLAB_COLORS[hash % COLLAB_COLORS.length];
}

/**
 * Create a Supabase Realtime channel for collaborative editing of a site.
 * Uses the presence feature to track who is currently editing.
 */
export function createCollabChannel(
  siteId: string,
  supabase: ReturnType<typeof createClient>
) {
  return supabase.channel(`collab:${siteId}`, {
    config: { presence: { key: 'userId' } },
  });
}

/**
 * Get initials from a display name for the avatar circle.
 * e.g. "Sarah Johnson" → "SJ", "Alice" → "Al"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Filter out stale collaborators not seen within the given threshold.
 */
export function filterActiveUsers(users: CollabUser[], maxAgeMs = 30_000): CollabUser[] {
  const cutoff = Date.now() - maxAgeMs;
  return users.filter(u => u.lastSeen > cutoff);
}
