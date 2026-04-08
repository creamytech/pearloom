// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/email/schedule/route.ts
// Schedule emails for future delivery. Stores in the
// `scheduled_emails` Supabase table for the cron job to pick up.
//
// POST { type, siteId, sendAt, recipients? }
//   - recipients: optional array of { email, name, context }
//   - If no recipients, schedules for all guests on the site
//     who haven't responded (for rsvp_reminder) or all
//     attending guests (for event_reminder/post_wedding_thank_you).
//
// Auth required — caller must own the site.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { scheduleEmailForSite, type EmailType, type EmailContext } from '@/lib/email-sequences';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_SCHEDULE = { max: 20, windowMs: 60 * 60 * 1000 }; // 20 per hour

const VALID_TYPES: EmailType[] = [
  'rsvp_confirmation',
  'rsvp_reminder',
  'event_reminder',
  'post_wedding_thank_you',
];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

interface Recipient {
  email: string;
  name?: string;
  context?: EmailContext;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit
    const rateCheck = checkRateLimit(`email-schedule:${session.user.email}`, RATE_LIMIT_SCHEDULE);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', resetAt: rateCheck.resetAt },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { type, siteId, sendAt, recipients, context: sharedContext } = body as {
      type?: string;
      siteId?: string;
      sendAt?: string;
      recipients?: Recipient[];
      context?: EmailContext;
    };

    // Validate required fields
    if (!type || !siteId || !sendAt) {
      return NextResponse.json(
        { error: 'Missing required fields: type, siteId, sendAt' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type as EmailType)) {
      return NextResponse.json(
        { error: `Invalid email type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate sendAt is a valid future date
    const sendAtDate = new Date(sendAt);
    if (isNaN(sendAtDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid sendAt date format. Use ISO 8601.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Verify the session user owns the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, creator_email, names, manifest')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    if (site.creator_email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build shared context from site data
    const names: string[] = (site.names as string[]) || [];
    const coupleNames = names.length >= 2 ? `${names[0]} & ${names[1]}` : names[0] || '';
    const manifest = (site.manifest || {}) as Record<string, unknown>;
    const logistics = manifest.logistics as Record<string, unknown> | undefined;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';

    const baseContext: EmailContext = {
      coupleNames,
      eventDate: (logistics?.date as string) || sharedContext?.eventDate || '',
      venueName: (logistics?.venue as string) || sharedContext?.venueName || '',
      siteUrl: sharedContext?.siteUrl || `${baseUrl}/s/${siteId}`,
      rsvpUrl: sharedContext?.rsvpUrl || `${baseUrl}/s/${siteId}#rsvp`,
      rsvpDeadline: sharedContext?.rsvpDeadline || '',
      guestbookUrl: sharedContext?.guestbookUrl || `${baseUrl}/s/${siteId}#guestbook`,
      galleryUrl: sharedContext?.galleryUrl || `${baseUrl}/s/${siteId}#gallery`,
      ...sharedContext,
    };

    let targetRecipients: Recipient[] = [];

    if (recipients && recipients.length > 0) {
      // Use explicitly provided recipients
      targetRecipients = recipients;
    } else {
      // Auto-resolve recipients from the guests table based on email type
      let statusFilter: string | undefined;

      if (type === 'rsvp_reminder') {
        statusFilter = 'pending';
      } else if (type === 'event_reminder' || type === 'post_wedding_thank_you') {
        statusFilter = 'attending';
      }

      let query = supabase
        .from('guests')
        .select('name, email')
        .eq('site_id', siteId)
        .not('email', 'is', null);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data: guests, error: guestsError } = await query;

      if (guestsError) {
        console.error('[email/schedule] Guests query error:', guestsError);
        return NextResponse.json({ error: 'Failed to load guests' }, { status: 500 });
      }

      targetRecipients = (guests || [])
        .filter((g: Record<string, unknown>) => g.email)
        .map((g: Record<string, unknown>) => ({
          email: g.email as string,
          name: g.name as string,
        }));
    }

    if (targetRecipients.length === 0) {
      return NextResponse.json(
        { success: true, scheduled: 0, message: 'No eligible recipients found.' },
      );
    }

    // Schedule each email
    let scheduled = 0;
    const errors: string[] = [];

    for (const recipient of targetRecipients) {
      // Validate email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
        errors.push(`Invalid email: ${recipient.email}`);
        continue;
      }

      const emailContext: EmailContext = {
        ...baseContext,
        guestName: recipient.name || recipient.email,
        ...(recipient.context || {}),
      };

      const result = await scheduleEmailForSite(
        type as EmailType,
        siteId,
        recipient.email,
        emailContext,
        sendAtDate.toISOString(),
      );

      if (result.success) {
        scheduled++;
      } else {
        errors.push(`${recipient.email}: ${result.error || 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      scheduled,
      total: targetRecipients.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[email/schedule] Route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
