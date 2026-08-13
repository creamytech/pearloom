// ─────────────────────────────────────────────────────────────
// Pearloom / lib/notifications/prefs.ts
//
// THE notification taxonomy + per-host channel preferences.
//
// Five categories, three email modes each ('instant' | 'digest'
// | 'off') + one push toggle. Missing DB rows fall back to the
// defaults below — the prefs table only ever stores deviations.
//
// The design rule (notification flow spec, 2026-06-11): email is
// for what changes the host's plans; the bell is for everything.
// So declines / gifts / co-host events default to instant email,
// while the volume categories (replies, guest content) default
// to the daily digest.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationCategory =
  | 'replies'   // RSVP yes / general replies
  | 'declines'  // RSVP regrets — these change plans
  | 'gifts'     // registry claims
  | 'content'   // photos, guestbook, walls, songs, whispers, toasts
  | 'cohost';   // co-host accepted / collaboration events

export type EmailMode = 'instant' | 'digest' | 'off';

export interface CategoryPref {
  emailMode: EmailMode;
  pushEnabled: boolean;
}

export type NotificationPrefs = Record<NotificationCategory, CategoryPref>;

export const NOTIFICATION_CATEGORIES: ReadonlyArray<{
  id: NotificationCategory;
  label: string;
  desc: string;
}> = [
  { id: 'replies',  label: 'Replies',       desc: 'Guests saying yes' },
  { id: 'declines', label: 'Regrets',       desc: 'Guests who can’t make it' },
  { id: 'gifts',    label: 'Gifts',         desc: 'Registry claims' },
  { id: 'content',  label: 'Guest content', desc: 'Photos, notes, songs, toasts' },
  { id: 'cohost',   label: 'Co-hosts',      desc: 'Invites accepted, collaboration' },
];

export const DEFAULT_PREFS: NotificationPrefs = {
  replies:  { emailMode: 'digest',  pushEnabled: false },
  declines: { emailMode: 'instant', pushEnabled: false },
  gifts:    { emailMode: 'instant', pushEnabled: false },
  content:  { emailMode: 'digest',  pushEnabled: false },
  cohost:   { emailMode: 'instant', pushEnabled: false },
};

export function isNotificationCategory(v: string): v is NotificationCategory {
  return v in DEFAULT_PREFS;
}

/** Resolve a host's full pref set — DB rows layered over defaults.
 *  Fails open to the defaults so a prefs-table hiccup never
 *  silences (or floods) anyone unexpectedly. */
export async function getNotificationPrefs(
  supabase: SupabaseClient,
  userEmail: string,
): Promise<NotificationPrefs> {
  const prefs: NotificationPrefs = structuredClone(DEFAULT_PREFS);
  try {
    const { data } = await supabase
      .from('user_notification_prefs')
      .select('category, email_mode, push_enabled')
      .eq('user_email', userEmail.toLowerCase().trim());
    for (const row of (data ?? []) as Array<{ category: string; email_mode: string; push_enabled: boolean }>) {
      if (!isNotificationCategory(row.category)) continue;
      prefs[row.category] = {
        emailMode: (['instant', 'digest', 'off'].includes(row.email_mode) ? row.email_mode : DEFAULT_PREFS[row.category].emailMode) as EmailMode,
        pushEnabled: Boolean(row.push_enabled),
      };
    }
  } catch {
    // fall through with defaults
  }
  return prefs;
}
