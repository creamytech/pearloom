// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/memory-weave/invite/route.ts
//
// Email every guest (who has an email on file) their personal
// memory prompt + a link back to their Passport. Uses the same
// Resend client as email-sequences.ts but keeps the template
// local so we don't need to extend the fixed EmailType enum.
//
// POST { siteId } — host-triggered bulk send.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSiteConfig } from '@/lib/db';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
}

function emailHtml({
  guestFirstName,
  names,
  prompt,
  passportUrl,
}: {
  guestFirstName: string;
  names: string;
  prompt: string;
  passportUrl: string;
}): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F5EFE2;font-family:Inter,system-ui,-apple-system,sans-serif;color:#0E0D0B;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#F5EFE2;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" width="560" style="background:#FBF7EE;border-radius:16px;padding:36px 32px;">
        <tr><td style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#B8935A;margin-bottom:12px;">
          A story they asked for
        </td></tr>
        <tr><td style="padding-top:6px;font-family:Fraunces,Georgia,serif;font-size:28px;line-height:1.2;color:#0E0D0B;">
          ${escape(guestFirstName)}, would you share a memory?
        </td></tr>
        <tr><td style="padding-top:16px;font-size:15px;line-height:1.65;color:#3A332C;">
          ${escape(names)} are gathering memories for their celebration. Pear wrote you a prompt:
        </td></tr>
        <tr><td style="padding-top:16px;font-style:italic;font-size:15px;line-height:1.6;color:#3A332C;border-left:2px solid #B8935A;padding-left:14px;">
          ${escape(prompt)}
        </td></tr>
        <tr><td style="padding-top:24px;">
          <a href="${passportUrl}" style="display:inline-block;padding:12px 22px;background:#5C6B3F;color:#F5EFE2;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;">
            Open your passport
          </a>
        </td></tr>
        <tr><td style="padding-top:24px;font-size:12px;color:#6F6557;line-height:1.55;">
          Your response flows into the toast, the reel, and the keepsake book. Write as much or as little as you'd
          like — Pear weaves the best lines in.
        </td></tr>
      </table>
      <div style="max-width:560px;margin:18px auto 0;font-size:11px;color:#6F6557;text-align:center;">
        Sent from Pearloom on behalf of ${escape(names)}.
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = sb();
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Email not configured' }, { status: 503 });
  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM ?? 'Pearloom <pear@pearloom.com>';

  const body = await req.json().catch(() => null);
  const siteId: string | null = body?.siteId ?? null;
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const cfg = await getSiteConfig(siteId).catch(() => null);
  if (!cfg?.manifest) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const names = Array.isArray(cfg.names) && cfg.names.length >= 2
    ? cfg.names.filter(Boolean).join(' & ')
    : 'Your hosts';

  // Join memory_prompts to pearloom_guests to get emails.
  const { data: prompts } = await supabase
    .from('memory_prompts')
    .select('id, guest_id, guest_name, prompt, response, pearloom_guests!inner(email, guest_token)')
    .eq('site_id', siteId)
    .is('response', null);

  if (!Array.isArray(prompts) || prompts.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, error: 'No prompts to send' }, { status: 400 });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const p of prompts) {
    const guest = (p as unknown as { pearloom_guests: { email?: string | null; guest_token: string } }).pearloom_guests;
    if (!guest?.email) {
      skipped += 1;
      continue;
    }
    const first = (p.guest_name ?? '').split(/\s+/)[0] ?? 'Friend';
    const passportUrl = `${appOrigin()}/g/${guest.guest_token}`;
    try {
      await resend.emails.send({
        from,
        to: guest.email,
        subject: `A memory for ${names}`,
        html: emailHtml({ guestFirstName: first, names, prompt: p.prompt, passportUrl }),
      });
      sent += 1;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return NextResponse.json({ sent, skipped, errors: errors.slice(0, 5) });
}
