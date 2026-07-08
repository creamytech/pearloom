// Dev-only visual harness for the welcome flow ("The First
// Pressing of You") — mounts the REAL WelcomeFlowClient without an
// auth session so the movements can be screenshot-verified.
// Hidden in production; not linked from the product.
import { notFound } from 'next/navigation';
import { WelcomeFlowClient } from '@/app/welcome/WelcomeFlowClient';

export const dynamic = 'force-dynamic';

export default function DevWelcomePage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <WelcomeFlowClient sessionFirstName="Maya" nextHref={null} />;
}
