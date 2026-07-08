import type { Metadata } from 'next';
import { LoginClient } from './LoginClient';

export const metadata: Metadata = {
  title: 'Sign in · Pearloom',
  description: 'Step back into the loom — your celebrations are where you left them.',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return <LoginClient searchParamsPromise={searchParams} />;
}
