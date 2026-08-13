'use client';

import { SigninV8 } from '@/components/pearloom/pages/SigninV8';

interface Props {
  searchParamsPromise: Promise<{ next?: string; error?: string }>;
}

export function LoginClient({ searchParamsPromise }: Props) {
  return <SigninV8 searchParamsPromise={searchParamsPromise} />;
}
