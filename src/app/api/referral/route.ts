// -----------------------------------------------------------------
// Pearloom / api/referral/route.ts
// GET  — Return the current user's referral code + stats
// POST — Process a referral signup (new user signed up with a code)
// -----------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  getReferralStats,
  ensureReferralCode,
  processReferralSignup,
} from '@/lib/referrals';

export const dynamic = 'force-dynamic';

// --- GET: current user's referral code + stats -------------------

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;

    // Ensure the code is seeded in the DB so future signups can
    // discover the referrer
    await ensureReferralCode(email);

    const stats = await getReferralStats(email);

    return NextResponse.json(stats);
  } catch (err: unknown) {
    console.error('[Referral] GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// --- POST: process a referral signup -----------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { referralCode, email } = body as {
      referralCode?: string;
      email?: string;
    };

    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid referralCode' },
        { status: 400 },
      );
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid email' },
        { status: 400 },
      );
    }

    // Rate limit: 10 referral signups per hour per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const rateCheck = checkRateLimit(`referral-signup:${ip}`, {
      max: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    await processReferralSignup(referralCode, email);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Referral] POST error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
