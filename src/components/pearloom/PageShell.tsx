'use client';

import type { ReactNode } from 'react';
import { Footbar, TopNav } from './chrome';

/**
 * PageShell — wraps any page in the v8 TopNav + Footbar so marketing
 * surfaces inherit the warm sage/cream design system without each page
 * having to be rebuilt from scratch.
 *
 * Usage:
 *   <PageShell>
 *     <YourExistingContent />
 *   </PageShell>
 */
export function PageShell({
  children,
  background = 'var(--cream)',
  hideFooter = false,
  ctaText,
  ctaHref,
}: {
  children: ReactNode;
  background?: string;
  hideFooter?: boolean;
  ctaText?: string;
  ctaHref?: string;
}) {
  return (
    <div className="pl8" style={{ minHeight: '100vh', background, display: 'flex', flexDirection: 'column' }}>
      <TopNav ctaText={ctaText} ctaHref={ctaHref} />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      {!hideFooter && <Footbar />}
    </div>
  );
}
