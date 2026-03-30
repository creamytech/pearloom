// Server Component wrapper — forces dynamic rendering so useSession()
// inside the client component always has a live SessionProvider context.
// `export const dynamic` only works in Server Components, not 'use client' files.
export const dynamic = 'force-dynamic';

import DashboardClient from './DashboardClient';

export default function Page() {
  return <DashboardClient />;
}
