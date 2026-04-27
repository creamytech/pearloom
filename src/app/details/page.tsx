// Legacy demo route — event details now live inside the v8 published-site
// renderer at /dev/site#details.

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function LegacyDetailsDemo() {
  redirect('/dev/site#details');
}
