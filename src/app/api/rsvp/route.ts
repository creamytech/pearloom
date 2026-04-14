import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// POST /api/rsvp — submit a guest RSVP from the public site
export async function POST(req: NextRequest) {
  // Rate limit by IP — prevent RSVP spam
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`rsvp:${ip}`, RATE_LIMITS.rsvp);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const {
      siteId,
      guestName,
      email,
      status,
      plusOne,
      plusOneName,
      mealPreference,
      dietaryRestrictions,
      songRequest,
      message,
      selectedEvents,
      mailingAddress,
    } = body;

    if (!siteId || !guestName) {
      return NextResponse.json({ error: 'siteId and guestName required' }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Upsert by email+siteId so guests can update their RSVP
    const { data, error } = await supabase
      .from('guests')
      .upsert(
        {
          site_id: siteId,
          name: guestName,
          email: email || null,
          status: status || 'attending',
          plus_one: plusOne || false,
          plus_one_name: plusOne ? plusOneName : null,
          meal_preference: mealPreference || null,
          dietary_restrictions: dietaryRestrictions || null,
          song_request: songRequest || null,
          message: message || null,
          event_ids: selectedEvents || [],
          mailing_address: mailingAddress || null,
          responded_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'site_id,email',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[RSVP] Upsert failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        siteId,
        guestName,
      });
      // Surface a clear error to the client so the guest knows their RSVP did not save.
      // Postgres 42P01 = undefined_table — help operators diagnose missing schema quickly.
      const isMissingTable = error.code === '42P01';
      return NextResponse.json(
        {
          error: isMissingTable
            ? 'RSVP storage is not set up yet. Please contact the site owner.'
            : 'We could not save your RSVP. Please try again in a moment.',
          code: error.code || null,
        },
        { status: isMissingTable ? 503 : 500 }
      );
    }

    // Always log new RSVP responses
    console.log('[RSVP] New response from:', guestName, '| Status:', status, '| Site:', siteId);

    // Non-blocking notification via Resend — fire and forget
    const notifEmail = process.env.NOTIFICATION_EMAIL;
    const resendKey = process.env.RESEND_API_KEY;
    if (notifEmail && resendKey) {
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const resend = new Resend(resendKey);
      const fromEmail = process.env.EMAIL_FROM || 'noreply@pearloom.com';
      const emoji = status === 'attending' ? '🎉' : status === 'declined' ? '😢' : '⏳';
      const statusLabel = status === 'attending' ? 'is coming!' : status === 'declined' ? 'can\'t make it' : 'is pending';
      resend.emails.send({
        from: fromEmail,
        to: notifEmail,
        subject: `${emoji} ${String(guestName).slice(0, 100)} ${statusLabel} — ${String(siteId).slice(0, 60)}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
            <h2 style="margin:0 0 0.5rem">${emoji} New RSVP</h2>
            <p style="margin:0 0 1rem;color:#666">Someone responded to <strong>${esc(String(siteId))}</strong></p>
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
              <tr><td style="padding:0.4rem 0;color:#999;width:140px">Guest</td><td><strong>${esc(String(guestName))}</strong></td></tr>
              <tr><td style="padding:0.4rem 0;color:#999">Status</td><td style="text-transform:capitalize"><strong>${esc(String(status))}</strong></td></tr>
              ${email ? `<tr><td style="padding:0.4rem 0;color:#999">Email</td><td>${esc(String(email))}</td></tr>` : ''}
              ${plusOne ? `<tr><td style="padding:0.4rem 0;color:#999">+1</td><td>${esc(String(plusOneName || 'Yes'))}</td></tr>` : ''}
              ${mealPreference ? `<tr><td style="padding:0.4rem 0;color:#999">Meal</td><td>${esc(String(mealPreference))}</td></tr>` : ''}
              ${songRequest ? `<tr><td style="padding:0.4rem 0;color:#999">Song request</td><td style="font-style:italic">${esc(String(songRequest))}</td></tr>` : ''}
              ${message ? `<tr><td style="padding:0.4rem 0;color:#999">Message</td><td style="font-style:italic">"${esc(String(message))}"</td></tr>` : ''}
            </table>
            <p style="margin:1.5rem 0 0;font-size:0.8rem;color:#aaa">Sent by Pearloom · <a href="${esc(process.env.NEXT_PUBLIC_SITE_URL || '')}" style="color:#A3B18A">pearloom.com</a></p>
          </div>
        `,
      }).catch((e: unknown) => console.error('[RSVP] Resend error:', e));
    }

    // Non-blocking: send AI-personalized confirmation email to the guest
    if (email && resendKey) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
      fetch(`${baseUrl}/api/rsvp-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          guestName: String(guestName),
          guestEmail: String(email),
          status: String(status),
          events: selectedEvents,
        }),
      }).catch((e: unknown) => console.error('[RSVP] Confirmation email error:', e));
    }

    return NextResponse.json({
      success: true,
      guest: data,
      message: status === 'attending'
        ? "We can't wait to celebrate with you!"
        : "Thank you for letting us know. You'll be missed!",
    });
  } catch (err) {
    console.error('RSVP route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/rsvp?siteId=xxx — read RSVPs (used in dashboard)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const supabase = getSupabase();

    // Verify the session user owns the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('creator_email')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    if (site.creator_email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('site_id', siteId)
      .order('responded_at', { ascending: false });

    if (error) {
      console.error('[RSVP] GET query error:', error);
      return NextResponse.json({ error: 'Failed to load guests', guests: [] }, { status: 500 });
    }
    return NextResponse.json({ guests: data || [] });
  } catch (err) {
    console.error('[RSVP] GET error:', err);
    return NextResponse.json({ error: 'Internal server error', guests: [] }, { status: 500 });
  }
}
