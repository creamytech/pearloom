// ─────────────────────────────────────────────────────────────
// /editor — no slug. The real editor lives at /editor/[siteSlug].
// Two cases:
//   1. Signed-in user with at least one site → /editor/{first slug}
//   2. Signed-in user with no sites → /dashboard/event (the site
//      picker / "create your first site" landing)
//   3. Unsigned → /login?next=/editor
// Resolving the redirect here means clicking "Open editor" anywhere
// in the app always lands the host somewhere useful, never on a 404.
// ─────────────────────────────────────────────────────────────

import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function EditorIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/login?next=' + encodeURIComponent('/editor'));
  }

  // Try to find the host's most recently created site. Supabase
  // may not be configured (local dev) — fall back to the dashboard
  // site picker in that case.
  const client = sb();
  if (!client) {
    redirect('/dashboard/event');
  }
  const { data } = await client!
    .from('sites')
    .select('subdomain, created_at')
    .eq('creator_email', session.user.email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.subdomain) {
    redirect(`/editor/${encodeURIComponent(data.subdomain)}`);
  }
  redirect('/dashboard/event');
}
