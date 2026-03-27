'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/SitePasswordWrapper.tsx
// Client-side password gate wrapper + PasswordGate dynamic import
// ─────────────────────────────────────────────────────────────

import dynamic from 'next/dynamic';
import type { VibeSkin } from '@/lib/vibe-engine';

const PasswordGate = dynamic(() => import('@/components/PasswordGate').then(m => ({ default: m.PasswordGate })), { ssr: false });

interface SitePasswordWrapperProps {
  siteId: string;
  coupleNames: [string, string];
  password: string;
  vibeSkin: VibeSkin;
  children: React.ReactNode;
}

export function SitePasswordWrapper({ siteId, coupleNames, password, vibeSkin, children }: SitePasswordWrapperProps) {
  return (
    <PasswordGate siteId={siteId} coupleNames={coupleNames} password={password} vibeSkin={vibeSkin}>
      {children}
    </PasswordGate>
  );
}
