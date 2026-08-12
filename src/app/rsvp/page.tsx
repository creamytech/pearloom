// Legacy route. This used to hard-redirect every visitor to
// /dev/site#rsvp — the DEVELOPER HARNESS rendering a fictional
// demo couple — which meant a real guest tapping "RSVP" on their
// passport landed on someone else's wedding (NEW-USER-REVAMP L4).
// Now: when the caller carries a real site (?site=<slug>), forward
// to that site's own RSVP anchor, preserving the guest token; with
// nothing to go on, land on the Pearloom home rather than a demo.

import { redirect } from 'next/navigation';
import { buildSitePath } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

export default async function LegacyRsvpRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const site = typeof sp.site === 'string' ? sp.site : undefined;
  const guestToken = typeof sp.g === 'string' ? sp.g : undefined;

  if (site) {
    const path = buildSitePath(site, '', undefined);
    const qs = guestToken ? `?g=${encodeURIComponent(guestToken)}` : '';
    redirect(`${path}${qs}#rsvp`);
  }
  redirect('/');
}
