import type { Metadata } from 'next';
import { LoginClient } from './LoginClient';

export const metadata: Metadata = {
  title: 'Sign in · Pearloom',
  description: 'Sign in to your Pearloom dashboard.',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return <LoginClient searchParamsPromise={searchParams} />;
}
