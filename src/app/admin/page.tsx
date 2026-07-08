// ─────────────────────────────────────────────────────────────
// /admin — the comp desk.
//
// House admins (lib/admin.ts allowlist) can look up any user
// and grant plans or theme packs for free. Everyone else gets
// the 404 page — the desk doesn't advertise itself.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Pearloom',
};
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { AdminClient } from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) notFound();
  return <AdminClient adminEmail={session!.user!.email!} />;
}
