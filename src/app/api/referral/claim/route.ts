// -----------------------------------------------------------------
// Pearloom / api/referral/claim/route.ts
// POST — Claim a referral reward (free premium template).
// Body: { templateId: string }
// Validates the user has unclaimed (converted) rewards, then
// grants the template via marketplace_purchases.
// -----------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkOwnership } from '@/lib/marketplace';
import { SITE_TEMPLATES } from '@/lib/templates/wedding-templates';
import { getReferralStats, awardReferralReward } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    // 2. Rate limit — 10 claim attempts per hour
    const rateCheck = checkRateLimit(`referral-claim:${userEmail}`, {
      max: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    // 3. Parse body
    const body = await req.json();
    const { templateId } = body as { templateId?: string };

    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid templateId' },
        { status: 400 },
      );
    }

    // 4. Verify the template exists and is a premium template
    const template = SITE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 },
      );
    }
    if ((template.price ?? 0) === 0) {
      return NextResponse.json(
        { error: 'This template is already free' },
        { status: 400 },
      );
    }

    // 5. Check if user already owns the template
    const alreadyOwned = await checkOwnership(userEmail, templateId);
    if (alreadyOwned) {
      return NextResponse.json(
        { error: 'You already own this template' },
        { status: 400 },
      );
    }

    // 6. Verify the user has pending (unclaimed) rewards
    const stats = await getReferralStats(userEmail);
    if (stats.pendingRewards <= 0) {
      return NextResponse.json(
        { error: 'No unclaimed referral rewards available' },
        { status: 400 },
      );
    }

    // 7. Award the template
    await awardReferralReward(userEmail, templateId);

    return NextResponse.json({
      success: true,
      templateId,
      templateName: template.name,
    });
  } catch (err: unknown) {
    console.error('[Referral] Claim error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
