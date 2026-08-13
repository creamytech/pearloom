import type { Metadata } from 'next';
import { SignupClient } from '@/components/auth/ManualAuthPages';

export const metadata: Metadata = {
  title: 'Create an account · Pearloom',
  description: 'Create a beautiful website for your wedding, birthday, reunion, or any day worth keeping. Free to start.',
};

export default function SignupPage() {
  return <SignupClient />;
}
