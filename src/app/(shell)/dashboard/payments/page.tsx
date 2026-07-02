import type { Metadata } from 'next';
import { PaymentsDashboardClient } from './PaymentsDashboardClient';

export const metadata: Metadata = {
  title: 'Gifts & payments · Pearloom',
  description: 'Stripe payments received through your Pearloom site.',
};

export default function PaymentsPage() {
  return <PaymentsDashboardClient />;
}
