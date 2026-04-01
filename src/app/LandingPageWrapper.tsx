'use client';

import { useSession, signIn } from 'next-auth/react';
import { LandingPage } from '@/components/landing-page';

export default function LandingPageWrapper() {
  const { status } = useSession();
  return <LandingPage handleSignIn={() => signIn('google')} status={status} />;
}
