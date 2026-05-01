import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MarketplaceV8 } from '@/components/pearloom/marketplace/MarketplaceV8';
import { DashLayout } from '@/components/pearloom/dash/DashShell';

export const metadata: Metadata = {
  title: 'Templates · Pearloom',
  description:
    'Every template is a full site — pages, flow, tone, and type — ready for your people, photos, and moments.',
};

export default async function TemplatesPage() {
  // /templates lives inside the dashboard shell now (Dashboard
  // sidebar → Creative → Templates), so it requires sign-in like
  // every other dashboard surface.
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/login?next=/templates');
  }
  return (
    <DashLayout active="templates" title="Templates" subtitle="Every template is a full site — ready for your people, photos, and moments." hideTopbar>
      <MarketplaceV8 embedded />
    </DashLayout>
  );
}
