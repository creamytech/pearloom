import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResetClient } from '@/components/auth/ManualAuthPages';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Set a new password · Pearloom',
  description: 'Choose a new password for your Pearloom account.',
};

export default async function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Tokens are 32 random bytes hex — anything else is a dead link.
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  return <ResetClient token={token} />;
}
