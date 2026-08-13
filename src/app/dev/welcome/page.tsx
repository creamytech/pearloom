// Dev-only visual harness for the welcome flow ("The First
// Pressing of You") — mounts the REAL WelcomeFlowClient without an
// auth session so the movements can be screenshot-verified.
// `?people=1` seeds two waiting circle requests so the O3 sealed
// envelopes + addressed arrival are verifiable too.
// Hidden in production; not linked from the product.
import { notFound } from 'next/navigation';
import { WelcomeFlowClient } from '@/app/welcome/WelcomeFlowClient';

export const dynamic = 'force-dynamic';

export default async function DevWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ people?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { people } = await searchParams;
  return (
    <WelcomeFlowClient
      sessionFirstName="Maya"
      nextHref={null}
      previewIncoming={people === '1' ? [
        { firstName: 'Scott', otherId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
        { firstName: 'Shaun', otherId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
      ] : undefined}
    />
  );
}
