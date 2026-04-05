'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/session-provider.tsx
// Client wrapper for NextAuth SessionProvider
// ─────────────────────────────────────────────────────────────

import { SessionProvider as Provider } from 'next-auth/react';
import type { ReactNode } from 'react';

export function SessionProvider({ children }: { children: ReactNode }) {
  return <Provider>{children}</Provider>;
}
