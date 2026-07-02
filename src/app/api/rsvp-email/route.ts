// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/rsvp-email/route.ts
// AI-generated personalized RSVP confirmation email
// Called after a guest submits their RSVP
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import { emailThemeFromSuite, emailLayout, button } from '@/lib/email-sequences';
import { htmlToText, listUnsubHeaders } from '@/lib/email/deliverability';
import { buildSiteUrl } from '@/lib/site-urls';
import { getEventType } from '@/lib/event-os/event-types';
import { isSoloSubject } from '@/lib/event-os/solo-occasions';
import type { StoryManifest } from '@/types';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`rsvp-email:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!apiKey || !resendKey) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
  }

  try {
    const { siteId, guestName, guestEmail, status, events } = await req.json() as {
      siteId: string;
      guestName: string;
      guestEmail: string;
      status: 'attending' | 'declined' | 'pending';
      events?: string[];
    };

    if (!siteId || !guestName || !guestEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch site manifest for couple context.
    // NB: the column is `ai_manifest` and names live in `site_config`
    // (see 20260617_drop_manifest_renderer.sql schema note) — the old
    // `manifest, names` select errored and silently 404'd every send.
    const supabase = getSupabase();
    const { data: site } = await supabase
      .from('sites')
      .select('id, ai_manifest, site_config, subdomain')
      .eq('subdomain', siteId)
      .single();

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // The guest's personal link — their /g/[token] page lets them
    // view or CHANGE this RSVP (YourRsvpCard). Look up the token by
    // (site, email) so the confirmation can send them straight back
    // to it. Best-effort: no token → we just link the public site.
    let manageToken: string | null = null;
    try {
      const { data: g } = await supabase
        .from('guests')
        .select('passport_token, guest_token')
        .eq('site_id', (site as { id: string }).id)
        .ilike('email', String(guestEmail).trim())
        .maybeSingle();
      manageToken = (g as { passport_token?: string; guest_token?: string } | null)?.passport_token
        ?? (g as { guest_token?: string } | null)?.guest_token
        ?? null;
    } catch { /* link the site instead */ }

    const manifest = (site.ai_manifest || {}) as Record<string, unknown>;
    const siteConfig = (site.site_config || {}) as {
      names?: string[]; coupleNames?: [string, string];
    };
    const names = (Array.isArray(siteConfig.names) && siteConfig.names.length
      ? siteConfig.names
      : Array.isArray(siteConfig.coupleNames) && siteConfig.coupleNames.length
        ? siteConfig.coupleNames
        : []) as string[];
    const [name1 = '', name2 = ''] = names;
    /* Occasion routing — solo honorees carry one name (never
       "Eleanor & "); solemn occasions (memorial / funeral) write as
       the family, gently, and never in the celebratory register. */
    const occasion = (manifest.occasion as string) || 'wedding';
    const eventType = getEventType(occasion);
    const occasionNoun = (eventType?.label ?? 'celebration').split(' / ')[0].toLowerCase();
    const solemn = eventType?.voice === 'solemn';
    const solo = isSoloSubject(manifest as { occasion?: string; subject?: { kind?: string } });
    const hostDisplay =
      (solo ? [name1] : names).map((n) => String(n ?? '').trim()).filter(Boolean).join(' & ')
      || 'Your hosts';
    const sender = solemn ? `the family of ${hostDisplay}` : hostDisplay;
    const logistics = manifest.logistics as Record<string, unknown> | undefined;
    const vibeString = (manifest.vibeString as string) || '';

    // Generate personalized email via AI
    const prompt = `Write a short, warm RSVP confirmation email from ${sender} to ${guestName}, a guest who just replied for their ${occasionNoun}.

Guest RSVP status: ${status === 'attending' ? 'ATTENDING (they said yes!)' : status === 'declined' ? 'DECLINED (they can\'t make it)' : 'PENDING'}
${events?.length ? `Events they're attending: ${events.join(', ')}` : ''}
Event date: ${logistics?.date || 'coming soon'}
Venue: ${logistics?.venue || ''}
Dress code: ${logistics?.dresscode || ''}
The hosts' vibe: ${vibeString}

RULES:
- Write as ${sender} speaking together
${solemn
  ? `- This is a ${occasionNoun} — gentle and grateful, never celebratory. No exclamation marks.
- If attending: "it will mean a great deal to have you with us"
- If declined: gracious, understanding, "you'll be in our thoughts"`
  : `- If attending: excited, grateful, maybe mention dress code or a fun detail
- If declined: gracious, understanding, "we'll miss you"`}
- Keep it SHORT — 3-5 sentences max
- Warm, personal tone — not corporate
- Do NOT include a subject line
- Do NOT include greeting (we'll add "Dear ${guestName},")
- Do NOT include sign-off (we'll add "${sender}")

Just write the body paragraph(s).`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 200 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    let bodyText = solemn
      ? (status === 'attending'
          ? `Thank you — it will mean a great deal to have you with us.`
          : `Thank you for letting us know. You'll be in our thoughts.`)
      : status === 'attending'
        ? `We're so excited you'll be there! It means the world to us.`
        : `We completely understand and will miss you so much.`;

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const generated = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (generated) bodyText = generated;
    }

    // Build and send the email — themed through the SuiteTheme
    // contract so the confirmation wears the couple's exact look
    // (email-safe palette + display face + monogrammed hairline).
    const resend = new Resend(resendKey);
    const subject = solemn
      ? (status === 'attending'
          ? `Thank you — we look forward to gathering with you`
          : `Thank you for letting us know`)
      : status === 'attending'
        ? `We can't wait to celebrate with you! - ${hostDisplay}`
        : `Thanks for letting us know - ${hostDisplay}`;

    const suite = suiteThemeFromManifest(
      manifest as unknown as StoryManifest,
      [String(name1 ?? ''), String(name2 ?? '')],
    );
    const t = emailThemeFromSuite(suite);
    const headingStack = `'${t.headingFont}',Georgia,serif`;
    const bodyStack = `'${t.bodyFont}',Georgia,serif`;
    const safeBody = esc(bodyText).replace(/\n/g, '<br/>');
    const hostSig = esc(sender);
    const headline = solemn
      ? (status === 'attending'
          ? `We're grateful you'll be with us.`
          : `Thank you for letting us know.`)
      : status === 'attending'
        ? `We're thrilled you'll be there!`
        : status === 'declined'
          ? `We'll miss you.`
          : `Thank you for responding.`;
    const siteUrl = buildSiteUrl(String(site.subdomain), '', undefined, suite.occasion);

    const dateVenueBlock = (logistics?.date || logistics?.venue)
      ? `<tr><td style="padding:0 36px 8px">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${t.accentLight};border-radius:12px">
            <tr><td style="padding:18px 24px;text-align:center">
              ${logistics?.date ? `<p style="font-size:15px;color:${t.foreground};margin:0 0 4px;font-weight:600;font-family:${headingStack};font-style:italic">${esc(String(logistics.date))}</p>` : ''}
              ${logistics?.venue ? `<p style="font-size:13px;color:${t.muted};margin:0;font-family:${bodyStack}">${esc(String(logistics.venue))}</p>` : ''}
            </td></tr>
          </table>
        </td></tr>`
      : '';

    const htmlBody = emailLayout(`
      <tr><td style="padding:44px 36px 8px;text-align:center">
        <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${t.accent};margin:0 0 16px;font-family:${bodyStack}">RSVP ${status === 'attending' ? 'Confirmed' : 'Received'}</p>
        <h1 style="font-family:${headingStack};font-size:28px;font-weight:400;font-style:italic;color:${t.foreground};margin:0 0 8px;line-height:1.3">${headline}</h1>
        <div style="width:48px;height:1px;background-color:${t.accent};opacity:0.6;margin:18px auto"></div>
      </td></tr>
      <tr><td style="padding:4px 36px 20px;text-align:center">
        <p style="font-size:14px;color:${t.foreground};line-height:1.7;margin:0 0 12px">Dear ${esc(guestName)},</p>
        <p style="font-size:14px;color:${t.foreground};line-height:1.7;margin:0">${safeBody}</p>
        <p style="font-size:14px;color:${t.foreground};font-style:italic;margin:20px 0 0;line-height:1.6;font-family:${headingStack}">${solemn ? 'With gratitude,' : 'With love,'}<br><strong>${hostSig}</strong></p>
      </td></tr>
      ${dateVenueBlock}
      <tr><td style="padding:14px 36px ${manageToken ? 8 : 40}px;text-align:center">
        ${manageToken
          ? button('View or change your RSVP', `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com'}/g/${manageToken}`, t)
          : button('View the site', siteUrl, t)}
      </td></tr>
      ${manageToken ? `<tr><td style="padding:0 36px 36px;text-align:center">
        <a href="${siteUrl}" style="font-size:12px;color:${t.muted};text-decoration:underline;font-family:${bodyStack}">Or view the site</a>
      </td></tr>` : ''}
    `, t);

    await resend.emails.send({
      from: 'Pearloom <noreply@pearloom.com>',
      to: guestEmail,
      subject,
      html: htmlBody,
      text: htmlToText(htmlBody),
      headers: listUnsubHeaders(),
      tags: [
        { name: 'channel', value: 'rsvp-confirmation' },
        { name: 'site_id', value: String(siteId) },
        // No guest_id here — this endpoint is fire-and-forget after
        // an RSVP submit and the webhook can match by (site,email).
      ],
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('[rsvp-email] Error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
