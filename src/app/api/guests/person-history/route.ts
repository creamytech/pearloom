// ─────────────────────────────────────────────────────────────
// GET /api/guests/person-history?siteId=<uuid>&email=<addr>
//   (or ?siteSlug=<subdomain> in place of siteId)
//
// "Returning guest" lookup for hosts — has this email celebrated
// with THIS HOST before, and what do we already know about them
// (dietary)? Powers the recognition chip in the Add-guest dialog.
//
// Privacy boundary (lib/people.ts contract): history only spans
// sites owned by the requesting session's email. A host can never
// learn which OTHER hosts' events someone attended — only their
// own shared history with that person.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { normalizePersonEmail, personHistoryForHost } from '@/lib/people';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hostEmail = session.user.email.toLowerCase().trim();

    // Typed-as-you-go from the Add-guest dialog — keep it sane.
    const rate = checkRateLimit(`person-history:${hostEmail}`, { max: 60, windowMs: 60_000 });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Slow down a moment.' }, { status: 429 });
    }

    const email = normalizePersonEmail(req.nextUrl.searchParams.get('email'));
    const siteId = req.nextUrl.searchParams.get('siteId');
    const siteSlug = req.nextUrl.searchParams.get('siteSlug');
    if (!email) {
      return NextResponse.json({ known: false, history: [], dietary: null });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ known: false, history: [], dietary: null });
    }

    // Resolve + verify ownership of the site the host is looking at,
    // so excludeSiteId can't be used to probe arbitrary site ids.
    let excludeSiteId: string | undefined;
    if (siteId || siteSlug) {
      const q = supabase.from('sites').select('id, site_config, creator_email');
      const { data: site } = await (siteId
        ? q.eq('id', siteId)
        : q.eq('subdomain', siteSlug)
      ).maybeSingle();
      if (site) {
        const owner = String(
          (site as { creator_email?: string }).creator_email
          ?? (site as { site_config?: { creator_email?: string } }).site_config?.creator_email
          ?? '',
        ).toLowerCase().trim();
        if (owner !== hostEmail) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        excludeSiteId = String((site as { id: string }).id);
      }
    }

    const { history, dietary } = await personHistoryForHost(supabase, {
      email,
      hostEmail,
      excludeSiteId,
    });

    return NextResponse.json({
      known: history.length > 0 || dietary != null,
      history,
      dietary,
    });
  } catch (err) {
    console.error('[person-history] failed:', err);
    return NextResponse.json({ known: false, history: [], dietary: null });
  }
}
