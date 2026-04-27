// Legacy demo route — guest RSVP UI now lives inside the v8
// published-site renderer at /dev/site#rsvp.

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function LegacyRsvpDemo() {
  redirect('/dev/site#rsvp');
}
