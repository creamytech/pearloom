// ─────────────────────────────────────────────────────────────
// Pearloom / lib/notifications/feed.ts
//
// THE activity feed derivation. One pass over every guest-action
// table for a site, returning a merged, time-sorted feed. Two
// consumers:
//   • /api/dashboard/notifications — the bell dropdown
//   • /api/cron/notification-digest — the daily host digest email
//
// Derived (not stored): the source tables are the truth, so the
// feed can never drift from the dashboards that render the same
// rows. Each item carries both a `kind` (visual style in the
// bell) and a `category` (the preference taxonomy in ./prefs).
// Every source is individually try/caught — a missing table on
// an older deployment silently drops that source, never the feed.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationCategory } from './prefs';

export interface FeedItem {
  id: string;
  kind: 'rsvp' | 'photo' | 'guestbook' | 'whisper' | 'message' | 'registry';
  category: NotificationCategory;
  label: string;
  preview?: string;
  href: string;
  createdAt: string;
}

export async function fetchNotificationFeed(
  supabase: SupabaseClient,
  siteId: string,
  since: string,
): Promise<FeedItem[]> {
  const items: FeedItem[] = [];

  // ── RSVPs ──────────────────────────────────────────────
  try {
    const { data: rsvps } = await supabase
      .from('guests')
      .select('id, name, status, responded_at, created_at')
      .eq('site_id', siteId)
      .not('responded_at', 'is', null)
      .gte('responded_at', since)
      .order('responded_at', { ascending: false })
      .limit(20);
    for (const r of (rsvps ?? []) as Array<{ id: string; name: string; status: string; responded_at: string }>) {
      const verb = r.status === 'attending' ? 'is in'
                 : r.status === 'declined' ? "can't make it"
                 : 'replied';
      items.push({
        id: `rsvp-${r.id}`,
        kind: 'rsvp',
        category: r.status === 'declined' ? 'declines' : 'replies',
        label: `${r.name} ${verb}`,
        href: `/dashboard/rsvp`,
        createdAt: r.responded_at,
      });
    }
  } catch {
    // table missing or RLS blocked — silently skip this source
  }

  // ── Guestbook messages ─────────────────────────────────
  // Canonical table is `guestbook` (api/guestbook/route.ts) with
  // column `guest_name`; `guestbook_messages` is the older wedding
  // OS writer — pick up both so no note is lost.
  try {
    const { data: notes } = await supabase
      .from('guestbook')
      .select('id, guest_name, message, created_at')
      .eq('site_id', siteId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20);
    for (const n of (notes ?? []) as Array<{ id: string; guest_name: string | null; message: string; created_at: string }>) {
      items.push({
        id: `note-${n.id}`,
        kind: 'guestbook',
        category: 'content',
        label: `${n.guest_name ?? 'A guest'} left a note`,
        preview: n.message.slice(0, 80),
        href: `/dashboard/submissions`,
        createdAt: n.created_at,
      });
    }
  } catch { /* skip */ }
  try {
    const { data: notes } = await supabase
      .from('guestbook_messages')
      .select('id, guest_name, message, created_at')
      .eq('site_id', siteId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20);
    for (const n of (notes ?? []) as Array<{ id: string; guest_name: string | null; message: string; created_at: string }>) {
      items.push({
        id: `note2-${n.id}`,
        kind: 'guestbook',
        category: 'content',
        label: `${n.guest_name ?? 'A guest'} left a note`,
        preview: (n.message ?? '').slice(0, 80),
        href: `/dashboard/submissions`,
        createdAt: n.created_at,
      });
    }
  } catch { /* table may not exist on this deployment — silent skip */ }

  // ── Whispers ───────────────────────────────────────────
  try {
    const { data: whispers } = await supabase
      .from('whispers')
      .select('id, message, created_at, read_at')
      .eq('site_id', siteId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20);
    for (const w of (whispers ?? []) as Array<{ id: string; message: string; created_at: string }>) {
      items.push({
        id: `whisper-${w.id}`,
        kind: 'whisper',
        category: 'content',
        label: 'A guest whispered',
        preview: w.message.slice(0, 80),
        href: `/dashboard/bridge`,
        createdAt: w.created_at,
      });
    }
  } catch { /* skip */ }

  // ── Guest photos ───────────────────────────────────────
  try {
    const { data: photos } = await supabase
      .from('guest_photos')
      .select('id, uploader_name, created_at')
      .eq('site_id', siteId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20);
    for (const p of (photos ?? []) as Array<{ id: string; uploader_name: string | null; created_at: string }>) {
      items.push({
        id: `photo-${p.id}`,
        kind: 'photo',
        category: 'content',
        label: `${p.uploader_name ?? 'A guest'} dropped a photo`,
        href: `/dashboard/gallery`,
        createdAt: p.created_at,
      });
    }
  } catch { /* skip */ }

  // ── Song requests (queued only — already-triaged rows are done) ──
  try {
    const { data: songs } = await supabase
      .from('song_requests')
      .select('id, guest_name, song_title, artist, state, created_at')
      .eq('site_id', siteId)
      .eq('state', 'queued')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20);
    for (const s of (songs ?? []) as Array<{ id: string; guest_name: string; song_title: string; artist: string | null; created_at: string }>) {
      const songLabel = s.artist ? `${s.song_title} — ${s.artist}` : s.song_title;
      items.push({
        id: `song-${s.id}`,
        kind: 'whisper',
        category: 'content',
        label: `${s.guest_name} added a song`,
        preview: songLabel.slice(0, 80),
        href: `/dashboard/music`,
        createdAt: s.created_at,
      });
    }
  } catch { /* skip */ }

  // ── Tribute / advice wall submissions ─────────────────
  try {
    const { data: tribs } = await supabase
      .from('tribute_submissions')
      .select('id, author_name, body, created_at, state')
      .eq('site_id', siteId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20);
    for (const t of (tribs ?? []) as Array<{ id: string; author_name: string; body: string; created_at: string; state: string }>) {
      if (t.state === 'hidden') continue;
      items.push({
        id: `trib-${t.id}`,
        kind: 'guestbook',
        category: 'content',
        label: `${t.author_name} added to the wall`,
        preview: (t.body ?? '').slice(0, 80),
        href: `/dashboard/submissions`,
        createdAt: t.created_at,
      });
    }
  } catch { /* table missing on this deployment — silent skip */ }

  // ── Toast signups ──────────────────────────────────────
  try {
    const { data: toasts } = await supabase
      .from('toast_signups')
      .select('id, claimed_by, slot_index, created_at')
      .eq('site_id', siteId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);
    for (const t of (toasts ?? []) as Array<{ id: string; claimed_by: string; slot_index: number; created_at: string }>) {
      items.push({
        id: `toast-${t.id}`,
        kind: 'whisper',
        category: 'content',
        label: `${t.claimed_by} signed up to toast`,
        href: `/dashboard/submissions`,
        createdAt: t.created_at,
      });
    }
  } catch { /* skip */ }

  // ── Registry link claims ───────────────────────────────
  try {
    const { data: claims } = await supabase
      .from('registry_link_claims')
      .select('id, claimer_name, entry_url, message, created_at')
      .eq('site_id', siteId)
      .is('revoked_at', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20);
    for (const c of (claims ?? []) as Array<{ id: string; claimer_name: string | null; entry_url: string; message: string | null; created_at: string }>) {
      const who = c.claimer_name?.split(/\s+/)[0] || 'A guest';
      items.push({
        id: `claim-${c.id}`,
        kind: 'registry',
        category: 'gifts',
        label: `${who} claimed a registry gift`,
        preview: c.message ? c.message.slice(0, 80) : undefined,
        href: `/dashboard/registry`,
        createdAt: c.created_at,
      });
    }
  } catch { /* table missing or RLS blocked — silently skip */ }

  // Sort all sources together so the timeline reads naturally.
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}
