// Dev-only visual harness for the wizard chrome (stepper, headings,
// gold Continue, phone preview). Mounts the REAL WizardV8 without an
// auth session so the redesigned chrome can be screenshot-verified.
// Hidden in production; not linked from the product.
import { notFound } from 'next/navigation';
import { WizardV8 } from '@/components/pearloom/pages/WizardV8';

export const dynamic = 'force-dynamic';

export default function DevWizardPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <WizardV8 />;
}
