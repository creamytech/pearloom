// Legacy demo route — guest photo gallery now lives inside the v8
// published-site renderer at /dev/site#gallery.

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function LegacyPhotosDemo() {
  redirect('/dev/site#gallery');
}
