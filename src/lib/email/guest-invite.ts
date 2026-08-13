// ─────────────────────────────────────────────────────────────
// Pearloom / lib/email/guest-invite.ts — the one add-a-guest
// invite send. Extracted from /api/guests POST so every door that
// creates a guest row (the Add Guest dialog, the circle weave-in
// via /api/guests/from-person) sends the SAME personal invite —
// same suppression checks, same unsubscribe headers, same
// email_sent_at stamp.
//
// CONTRACT: fire-and-forget and fully failure-tolerant — an email
// must never block or fail a guest add. Key-gated on
// RESEND_API_KEY; honors opt-outs and hard bounces.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';
import { isSuppressed } from '@/lib/email/suppression';
import { htmlToText, listUnsubHeaders } from '@/lib/email/deliverability';

export interface GuestInviteArgs {
  siteId: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  /** guests.guest_token — personalizes the link (?g=). */
  guestToken?: string | null;
}

/** Send the personal invite for a just-added guest and stamp
 *  email_sent_at. Never throws; returns true when a send was
 *  actually attempted. */
export async function sendGuestInviteEmail(
  supabase: SupabaseClient,
  args: GuestInviteArgs,
): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) return false;
    const email = (args.guestEmail ?? '').trim();
    if (!email) return false;
    if (await isSuppressed(supabase, email, args.siteId)) return false;

    const { data: site } = await supabase
      .from('sites')
      .select('subdomain, site_config, ai_manifest')
      .eq('id', args.siteId)
      .maybeSingle();
    if (!site) return false;

    const cfg = (site.site_config as { names?: [string, string]; occasion?: string } | null) ?? {};
    const occasion = (site.ai_manifest as { occasion?: string } | null)?.occasion ?? cfg.occasion;
    const names = (cfg.names ?? []).filter(Boolean);
    const coupleDisplay = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? 'Our celebration');

    const { buildSiteUrl } = await import('@/lib/site-urls');
    const base = buildSiteUrl(String(site.subdomain), '', undefined, occasion);
    const personalUrl = args.guestToken ? `${base}?g=${encodeURIComponent(args.guestToken)}` : base;

    const { buildGuestInviteEmail } = await import('@/lib/email/brand-emails');
    const { subject, html } = buildGuestInviteEmail({
      guestName: args.guestName,
      coupleDisplay,
      personalUrl,
    });

    const { Resend } = await import('resend');
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: `${coupleDisplay} <invites@pearloom.com>`,
      to: email,
      subject,
      html,
      text: htmlToText(html),
      headers: listUnsubHeaders({ email, siteId: args.siteId, channel: 'guest-invite' }),
      tags: [{ name: 'channel', value: 'guest-invite' }, { name: 'site_id', value: String(args.siteId) }],
    });
    await supabase.from('guests').update({ email_sent_at: new Date().toISOString() }).eq('id', args.guestId);
    return true;
  } catch (e) {
    console.warn('[guest-invite] send failed (non-fatal):', e);
    return false;
  }
}
