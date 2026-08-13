// ─────────────────────────────────────────────────────────────
// Pearloom / lib/notifications/notify.ts
//
// notifyHost() — the one entry point event routes call when
// something instant-worthy happens (a decline, a registry claim,
// a co-host accepting). It resolves the host's preferences and
// fans out:
//   • email  — when the category's mode is 'instant', via the
//     branded buildHostAlertEmail template
//   • push   — when the host enabled push for the category
//
// 'digest'-mode categories do nothing here — the daily digest
// cron derives them from the activity feed, so volume events
// never need a notify() call at all.
//
// Every send is deduped through notification_log (channel +
// dedupe_key unique), so a retried webhook or double-submitted
// form can't double-notify. The whole function is fail-safe:
// notifications must never break the event that triggered them.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';
import { getNotificationPrefs, type NotificationCategory } from './prefs';
import { sendHostPush } from './push';
import { buildHostAlertEmail } from '@/lib/email/brand-emails';

export interface NotifyHostArgs {
  /** Site identifier (slug or uuid) — for the log + email eyebrow. */
  siteId: string;
  /** Display label for the site (couple names or slug). */
  siteLabel: string;
  ownerEmail: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  /** Dashboard path the CTA opens. */
  href: string;
  /** Stable key per event so retries can't double-send. */
  dedupeKey: string;
  /** Send the instant email even when the category defaults to
   *  'digest' — for time-sensitive events (e.g. a guest photo
   *  waiting for moderation). Still respects an explicit 'off'. */
  forceInstantEmail?: boolean;
}

/** Claim a (channel, dedupeKey) slot. True exactly once. */
async function claim(
  supabase: SupabaseClient,
  channel: string,
  args: NotifyHostArgs,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('notification_log')
      .upsert(
        {
          channel,
          dedupe_key: args.dedupeKey,
          site_id: args.siteId,
          recipient_email: args.ownerEmail.toLowerCase(),
          category: args.category,
        },
        { onConflict: 'channel,dedupe_key', ignoreDuplicates: true },
      )
      .select('id');
    return !error && Array.isArray(data) && data.length > 0;
  } catch {
    return false; // can't dedupe → don't risk a repeat
  }
}

export async function notifyHost(
  supabase: SupabaseClient,
  args: NotifyHostArgs,
): Promise<void> {
  try {
    const ownerEmail = args.ownerEmail.toLowerCase().trim();
    if (!ownerEmail) return;
    const prefs = await getNotificationPrefs(supabase, ownerEmail);
    const pref = prefs[args.category];

    // ── Email (instant mode, or a forced time-sensitive send) ──
    const resendKey = process.env.RESEND_API_KEY;
    const sendInstant =
      pref.emailMode === 'instant' ||
      (Boolean(args.forceInstantEmail) && pref.emailMode !== 'off');
    if (sendInstant && resendKey) {
      if (await claim(supabase, 'email', args)) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
        const fromEmail = process.env.EMAIL_FROM || 'Pearloom <noreply@pearloom.com>';
        const { subject, html } = buildHostAlertEmail({
          siteLabel: args.siteLabel,
          title: args.title,
          body: args.body,
          ctaUrl: `${baseUrl}${args.href}`,
        });
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: fromEmail,
            to: [ownerEmail],
            subject,
            html,
            tags: [
              { name: 'channel', value: 'host-alert' },
              { name: 'category', value: args.category },
            ],
          }),
        }).catch((err) => console.warn('[notify] alert email failed:', err));
      }
    }

    // ── Push (opt-in per category) ───────────────────────────
    if (pref.pushEnabled) {
      if (await claim(supabase, 'push', args)) {
        await sendHostPush(supabase, ownerEmail, {
          title: args.title,
          body: args.body,
          url: args.href,
        });
      }
    }
  } catch (err) {
    console.warn('[notify] notifyHost failed (non-fatal):', err);
  }
}
