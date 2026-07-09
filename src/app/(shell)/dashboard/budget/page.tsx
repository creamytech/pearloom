import type { Metadata } from 'next';
import { BudgetClient } from './BudgetClient';

export const metadata: Metadata = {
  title: 'The Budget · Pearloom',
  description: 'One ledger, planned, committed, and paid, with what your vendors cost woven in.',
};

export default function Page() {
  return <BudgetClient />;
}
