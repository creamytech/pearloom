// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/email/send/route.ts
// Send a specific email immediately via the email sequence
// system. Supports all template types: rsvp_confirmation,
// rsvp_reminder, event_reminder, post_wedding_thank_you.
//
// POST { type, to, context }
// Auth required. Rate limited per user.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmailNow, type EmailType, type EmailContext } from '@/lib/email-sequences';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_EMAIL_SEND = { max: 30, windowMs: 60 * 60 * 1000 }; // 30 per hour

const VALID_TYPES: EmailType[] = [
  'rsvp_confirmation',
  'rsvp_reminder',
  'event_reminder',
  'post_wedding_thank_you',
];

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by user email
    const rateCheck = checkRateLimit(`email-send:${session.user.email}`, RATE_LIMIT_EMAIL_SEND);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', resetAt: rateCheck.resetAt },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { type, to, context } = body as {
      type?: string;
      to?: string;
      context?: EmailContext;
    };

    // Validate required fields
    if (!type || !to) {
      return NextResponse.json(
        { error: 'Missing required fields: type, to' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type as EmailType)) {
      return NextResponse.json(
        { error: `Invalid email type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { error: 'Invalid recipient email format' },
        { status: 400 }
      );
    }

    const result = await sendEmailNow(type as EmailType, to, context || {});

    if (!result.success) {
      console.error('[email/send] Send failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (err) {
    console.error('[email/send] Route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
