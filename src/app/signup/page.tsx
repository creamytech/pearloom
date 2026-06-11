import type { Metadata } from 'next';
import { SignupClient } from '@/components/auth/ManualAuthPages';

export const metadata: Metadata = {
  title: 'Create an account · Pearloom',
  description: 'Begin your own thread — no Google account required.',
};

export default function SignupPage() {
  return <SignupClient />;
}
