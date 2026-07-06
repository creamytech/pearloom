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
  kind: 'rsvp' | 'photo' | 'guestbook' | 'whisper' | 'message' | 'registry' | 'vendor' | 'split';
  category: NotificationCategory;
  label: string;
  preview?: string;
  href: string;
  createdAt: string;
}

// ── Money helpers ──────────────────────────────────────────────
// Integer cents → "$1,200" / "$12.50" (matches the Vendor Book +
// split ledger fmt). Shared by the vendor-due + shared-expense
// sources below.
function fmtCents(cents: number): string {
  const whole = cents % 100 === 0;
  return '$' + (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

// "today" / "tomorrow" / "Fri" for the week ahead; "Jul 9" beyond.
function vendorDueLabel(due: string, todayIso: string): string {
  if (due === todayIso) return 'today';
  const dueMs = Date.parse(`${due}T00:00:00Z`);
  const days = Math.round((dueMs - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
  if (days === 1) return 'tomorrow';
  const d = new Date(dueMs);
  if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
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
  // Unlike every other source here, guest_photos.site_id is the
  // SUBDOMAIN string (see the 20260614 migration), while the bell
  // passes the site uuid. Resolve the subdomain first so uploads
  // actually reach the bell + digest. A pending photo is the
  // host's cue to moderate, so we surface pending too (not just
  // approved) and point the CTA at the moderation queue.
  try {
    const { data: siteRow } = await supabase
      .from('sites')
      .select('subdomain')
      .eq('id', siteId)
      .maybeSingle();
    const subdomain = (siteRow as { subdomain?: string } | null)?.subdomain;
    if (subdomain) {
      const { data: photos } = await supabase
        .from('guest_photos')
        .select('id, uploader_name, status, created_at')
        .eq('site_id', subdomain)
        .neq('status', 'rejected')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);
      for (const p of (photos ?? []) as Array<{ id: string; uploader_name: string | null; status: string; created_at: string }>) {
        const who = p.uploader_name ?? 'A guest';
        items.push({
          id: `photo-${p.id}`,
          kind: 'photo',
          category: 'content',
          label: p.status === 'pending' ? `${who} shared a photo — review it` : `${who} dropped a photo`,
          href: `/dashboard/gallery`,
          createdAt: p.created_at,
        });
      }
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

  // ── Vendor payments coming due ─────────────────────────
  // Derived reminders, not stored events: an unpaid deposit or
  // balance in the Vendor Book (site_vendors) due within the next
  // 7 days — or past due — surfaces as a feed item. `createdAt` is
  // the deterministic moment the reminder FIRES: 7 days before the
  // due date, then the due date itself once it's past. So the
  // bell's read-state semantics hold (the same due date never
  // re-badges after the host has seen it, though going past due
  // re-fires once as escalation) and the 24h digest picks each due
  // date up at most twice. Paid rows never surface; marking paid
  // removes the item on the next pull.
  try {
    const { data: vendorRows } = await supabase
      .from('site_vendors')
      .select('id, name, category, cost_cents, deposit_cents, deposit_due, balance_due, deposit_paid, balance_paid')
      .eq('site_id', siteId)
      .or('deposit_due.not.is.null,balance_due.not.is.null')
      .limit(120);
    const todayIso = new Date().toISOString().slice(0, 10);
    const horizonIso = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    for (const v of (vendorRows ?? []) as Array<{
      id: string; name: string; category: string;
      cost_cents: number | null; deposit_cents: number | null;
      deposit_due: string | null; balance_due: string | null;
      deposit_paid: boolean; balance_paid: boolean;
    }>) {
      const dues: Array<{ kind: 'deposit' | 'balance'; due: string; amountCents: number | null }> = [];
      if (v.deposit_due && !v.deposit_paid) {
        dues.push({ kind: 'deposit', due: v.deposit_due, amountCents: v.deposit_cents });
      }
      if (v.balance_due && !v.balance_paid) {
        const remaining = v.cost_cents == null ? null : Math.max(0, v.cost_cents - (v.deposit_cents ?? 0));
        dues.push({ kind: 'balance', due: v.balance_due, amountCents: remaining });
      }
      for (const d of dues) {
        if (d.due > horizonIso) continue; // not near yet
        const pastDue = d.due < todayIso;
        const firedAt = pastDue
          ? `${d.due}T00:00:00.000Z`
          : new Date(Date.parse(`${d.due}T00:00:00.000Z`) - 7 * 86_400_000).toISOString();
        if (firedAt < since) continue; // already surfaced in an earlier window
        const amount = d.amountCents != null ? ` · ${fmtCents(d.amountCents)}` : '';
        items.push({
          id: `vendor-${v.id}-${d.kind}-${d.due}`,
          kind: 'vendor',
          category: 'gifts',
          label: pastDue
            ? `${v.category} ${d.kind} past due${amount}`
            : `${v.category} ${d.kind} due ${vendorDueLabel(d.due, todayIso)}${amount}`,
          preview: v.name,
          href: `/dashboard/vendors`,
          createdAt: firedAt,
        });
      }
    }
  } catch { /* table missing on this deployment — silent skip */ }

  // ── Shared split expenses ──────────────────────────────────
  // The collaborative split (participants / expenses,
  // 20260706_group_split.sql): a new group expense on a
  // bachelor/ette / reunion site surfaces to the host's bell.
  // Owner-scoped: this pass already runs per the host's OWN site.
  // Unlike the vendor reminders above, an expense is a STORED row,
  // so its own immutable created_at IS the deterministic fire
  // moment — read-state sticks the same way an RSVP's does, no
  // synthesized timestamp needed. Paid / settle-up is derived in
  // lib/budget/split.ts; the bell only announces the new line.
  try {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, description, amount_cents, payer_id, created_at')
      .eq('site_id', siteId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20);
    const rows = (expenses ?? []) as Array<{
      id: string; description: string; amount_cents: number;
      payer_id: string | null; created_at: string;
    }>;
    if (rows.length > 0) {
      // Resolve payer first names in one read (id → first name).
      const payerIds = Array.from(
        new Set(rows.map((e) => e.payer_id).filter((x): x is string => !!x)),
      );
      const nameById = new Map<string, string>();
      if (payerIds.length > 0) {
        const { data: parts } = await supabase
          .from('participants')
          .select('id, display_name')
          .eq('site_id', siteId)
          .in('id', payerIds);
        for (const p of (parts ?? []) as Array<{ id: string; display_name: string | null }>) {
          const first = String(p.display_name ?? '').trim().split(/\s+/)[0];
          if (first) nameById.set(p.id, first);
        }
      }
      for (const e of rows) {
        const who = e.payer_id ? nameById.get(e.payer_id) : null;
        const amount = Number.isFinite(e.amount_cents) ? ` · ${fmtCents(e.amount_cents)}` : '';
        const desc = String(e.description ?? '').trim().slice(0, 60) || 'an expense';
        items.push({
          id: `split-${e.id}`,
          kind: 'split',
          // The money category (like vendor + gifts). Defaults to
          // instant → bell-only unless the host routes gifts to digest.
          category: 'gifts',
          label: `New shared expense: ${desc}${amount}${who ? ` by ${who}` : ''}`,
          href: `/dashboard/budget`,
          createdAt: e.created_at,
        });
      }
    }
  } catch { /* table missing on this deployment — silent skip */ }

  // Sort all sources together so the timeline reads naturally.
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}
