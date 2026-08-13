// Bare /wizard has no surface of its own — the flow lives at
// /wizard/new. Redirect so the natural URL doesn't 404.

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function WizardIndex() {
  redirect('/wizard/new');
}
