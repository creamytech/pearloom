import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function buildEmailHtml(coupleName: string, body: string): string {
  const escapedBody = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #2B2B2B; background: #FAFAF8;">
  <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid rgba(0,0,0,0.08);">
    <p style="font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: #9A9488; margin: 0 0 8px;">A message from</p>
    <h2 style="font-size: 24px; font-weight: 400; font-style: italic; margin: 0; color: #2B2B2B;">${coupleName}</h2>
  </div>
  <div style="font-size: 16px; line-height: 1.8; color: #3D3530; white-space: pre-wrap;">${escapedBody}</div>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(0,0,0,0.06); text-align: center;">
    <p style="font-size: 11px; color: #9A9488; margin: 0;">Sent via <a href="https://pearloom.com" style="color: #A3B18A; text-decoration: none;">Pearloom</a></p>
  </div>
</div>`;
}

// POST /api/messaging/send
export async function POST(req: NextRequest) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 3 sends per hour per user
  const rl = checkRateLimit(`messaging:${session.user.email}`, {
    max: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. You can send up to 3 messages per hour.' },
      { status: 429 },
    );
  }

  let body: {
    siteId?: string;
    subject?: string;
    body?: string;
    segment?: 'all' | 'attending' | 'pending' | 'declined';
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { siteId, subject, body: messageBody, segment } = body;

  if (!siteId || !subject || !messageBody || !segment) {
    return NextResponse.json(
      { error: 'siteId, subject, body, and segment are required' },
      { status: 400 },
    );
  }

  const validSegments = ['all', 'attending', 'pending', 'declined'];
  if (!validSegments.includes(segment)) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Verify ownership
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, creator_email, site_config')
    .eq('id', siteId)
    .single();

  if (siteError || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  if (site.creator_email !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Derive couple name from site_config.names
  const siteConfig = site.site_config as Record<string, unknown> | null;
  const names: string[] = Array.isArray(siteConfig?.names)
    ? (siteConfig!.names as string[])
    : ['', ''];
  const coupleName =
    names.filter(Boolean).join(' & ') || 'The Couple';

  // Fetch RSVPs
  const { data: rsvps, error: rsvpError } = await supabase
    .from('rsvps')
    .select('*')
    .eq('site_id', siteId);

  if (rsvpError) {
    return NextResponse.json({ error: 'Failed to fetch guest list' }, { status: 500 });
  }

  // Filter by segment — only guests with email
  type RsvpRow = { email?: string | null; attending?: boolean | null };
  const allRsvps: RsvpRow[] = (rsvps ?? []) as RsvpRow[];

  const filtered = allRsvps.filter((r) => {
    if (!r.email) return false;
    if (segment === 'all') return true;
    if (segment === 'attending') return r.attending === true;
    if (segment === 'pending') return r.attending == null;
    if (segment === 'declined') return r.attending === false;
    return false;
  });

  if (filtered.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: allRsvps.length });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
  }

  const resend = new Resend(resendKey);
  const html = buildEmailHtml(coupleName, messageBody);

  // Send individually to avoid spam flags
  const results = await Promise.allSettled(
    filtered.map((r) =>
      resend.emails.send({
        from: 'Pearloom <noreply@pearloom.com>',
        to: r.email!,
        subject,
        html,
      }),
    ),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  const skipped = allRsvps.length - filtered.length;

  return NextResponse.json({ sent, failed, skipped });
}
