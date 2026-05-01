// Demo route — showcase example site now rendered via the v8 published-site
// renderer. Redirects to /dev/site so the same warm sage + cream wedding
// site serves as the canonical showcase.

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function LegacyDemoSite() {
  redirect('/dev/site');
}
