// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/rsvp-email/route.ts
// AI-generated personalized RSVP confirmation email
// Called after a guest submits their RSVP
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

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

    // Fetch site manifest for couple context
    const supabase = getSupabase();
    const { data: site } = await supabase
      .from('sites')
      .select('manifest, names, subdomain')
      .eq('subdomain', siteId)
      .single();

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const manifest = (site.manifest || {}) as Record<string, unknown>;
    const names = Array.isArray(site.names) ? site.names : ['Us', 'Together'];
    const [name1, name2] = names;
    const logistics = manifest.logistics as Record<string, unknown> | undefined;
    const vibeString = (manifest.vibeString as string) || '';

    // Generate personalized email via AI
    const prompt = `Write a short, warm RSVP confirmation email from ${name1} & ${name2} to their wedding guest ${guestName}.

Guest RSVP status: ${status === 'attending' ? 'ATTENDING (they said yes!)' : status === 'declined' ? 'DECLINED (they can\'t make it)' : 'PENDING'}
${events?.length ? `Events they're attending: ${events.join(', ')}` : ''}
Wedding date: ${logistics?.date || 'coming soon'}
Venue: ${logistics?.venue || ''}
Dress code: ${logistics?.dresscode || ''}
Couple's vibe: ${vibeString}

RULES:
- Write as ${name1} & ${name2} speaking together
- Keep it SHORT — 3-5 sentences max
- If attending: excited, grateful, maybe mention dress code or a fun detail
- If declined: gracious, understanding, "we'll miss you"
- Warm, personal tone — not corporate
- Do NOT include a subject line
- Do NOT include greeting (we'll add "Dear ${guestName},")
- Do NOT include sign-off (we'll add "${name1} & ${name2}")

Just write the body paragraph(s).`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

    let bodyText = status === 'attending'
      ? `We're so excited you'll be there! It means the world to us.`
      : `We completely understand and will miss you so much.`;

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const generated = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (generated) bodyText = generated;
    }

    // Build and send the email
    const resend = new Resend(resendKey);
    const subject = status === 'attending'
      ? `We can't wait to celebrate with you! - ${name1} & ${name2}`
      : `Thanks for letting us know - ${name1} & ${name2}`;

    const htmlBody = `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 2rem; color: #2B2B2B;">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">Dear ${guestName},</p>
        <p style="font-size: 1rem; line-height: 1.7; color: #444;">${bodyText.replace(/\n/g, '<br/>')}</p>
        <p style="margin-top: 1.5rem; font-size: 1rem;">
          With love,<br/>
          <strong>${name1} & ${name2}</strong>
        </p>
        ${logistics?.date ? `<p style="font-size: 0.85rem; color: #9A9488; margin-top: 2rem; border-top: 1px solid #E6DFD2; padding-top: 1rem;">${logistics.date}${logistics.venue ? ` at ${logistics.venue}` : ''}</p>` : ''}
        <p style="font-size: 0.72rem; color: #B5AFA5; margin-top: 1rem;">Sent via <a href="https://pearloom.com" style="color: #A3B18A;">Pearloom</a></p>
      </div>
    `;

    await resend.emails.send({
      from: 'Pearloom <noreply@pearloom.com>',
      to: guestEmail,
      subject,
      html: htmlBody,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('[rsvp-email] Error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
