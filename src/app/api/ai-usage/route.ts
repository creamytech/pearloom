// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ai-usage/route.ts
// Returns the current user's Pear AI monthly usage stats.
// ─────────────────────────────────────────────────────────────

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { peekPearUsage, PEAR_MONTHLY_LIMIT } from '@/lib/rate-limit';
import { getUserPlan } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userEmail = session.user.email;
  const planRow = await getUserPlan(userEmail).catch(() => null);
  const plan = (planRow?.plan ?? 'free').toLowerCase();
  const isUnlimited = plan === 'pro' || plan === 'atelier' || plan === 'premium' || plan === 'legacy';

  if (isUnlimited) {
    return Response.json({
      plan,
      unlimited: true,
      used: 0,
      limit: PEAR_MONTHLY_LIMIT,
      remaining: PEAR_MONTHLY_LIMIT,
    }, {
      headers: { 'X-Pear-Remaining': 'unlimited' },
    });
  }

  const usage = peekPearUsage(userEmail);
  return Response.json({
    plan: 'free',
    unlimited: false,
    used: usage.used,
    limit: usage.limit,
    remaining: usage.remaining,
    month: usage.month,
  }, {
    headers: { 'X-Pear-Remaining': String(usage.remaining) },
  });
}
