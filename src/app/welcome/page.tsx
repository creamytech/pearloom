// ─────────────────────────────────────────────────────────────
// Pearloom / app/welcome/page.tsx — the Welcome flow gate.
//
// Post-sign-in landing (SigninV8 + AuthModal default their
// callback here). First-time accounts get the full-screen
// onboarding experience (WelcomeFlowClient): name → mark →
// occasion → the agreement → begin. Finished accounts pass
// straight through to their destination — the gate costs one
// indexed read at login time and nothing afterwards.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';
import { WelcomeFlowClient } from './WelcomeFlowClient';

export const metadata: Metadata = {
  title: 'Welcome · Pearloom',
  description: 'A few threads before we begin.',
};

export const dynamic = 'force-dynamic';

/** Same-origin paths only — never bounce through external URLs. */
function safeNext(raw: string | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const explicitNext = safeNext(sp.next);

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login?next=/welcome');

  // Already onboarded → pass through. Missing Supabase env (local
  // dev) renders the flow rather than blocking — completing it is
  // a no-op there.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    try {
      const supabase = createClient(url, key);
      const { data } = await supabase
        .from('user_preferences')
        .select('onboarded_at')
        .eq('email', session.user.email)
        .maybeSingle();
      if (data?.onboarded_at) redirect(explicitNext ?? '/dashboard');

      // Grandfather clause — accounts that predate the Welcome flow
      // have no onboarded_at but already own sites. Without this,
      // every login funnels them through onboarding and out into
      // the wizard. Existing hosts go straight to their dashboard.
      const { count } = await supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .ilike('site_config->>creator_email', session.user.email);
      if (count && count > 0) redirect(explicitNext ?? '/dashboard');
    } catch (err) {
      // Next's redirect() throws by design — let it through.
      if (err && typeof err === 'object' && 'digest' in err) throw err;
      console.warn('[welcome] onboarded check failed — showing flow:', err);
    }
  }

  const fullName = (session.user.name ?? '').trim();
  return (
    <WelcomeFlowClient
      sessionFirstName={fullName.split(/\s+/)[0] || ''}
      nextHref={explicitNext}
    />
  );
}
