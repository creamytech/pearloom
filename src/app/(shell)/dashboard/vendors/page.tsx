import type { Metadata } from 'next';
import { VendorBookClient } from './VendorBookClient';

export const metadata: Metadata = {
  title: 'The Vendor Book · Pearloom',
  description: 'Everyone you’ve hired, what they cost, and when they arrive, one book.',
};

export default function Page() {
  return <VendorBookClient />;
}
