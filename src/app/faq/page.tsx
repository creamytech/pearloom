// Legacy demo route — the FAQ demo has been folded into the v8
// published-site renderer. Redirects to the v8 demo so old links still
// land somewhere useful.

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function LegacyFaqDemo() {
  redirect('/dev/site#rsvp');
}
