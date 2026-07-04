import React from 'react';
import { PearloomLogo } from 'pearloom';

/** The full lockup — pear glyph beside the wordmark, the primary brand signature. */
export function Lockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
      <PearloomLogo size={24} />
      <PearloomLogo size={36} />
    </div>
  );
}

/** Reversed to cream for the footer of a dark, editorial-midnight surface. */
export function Reversed() {
  return (
    <div style={{ background: 'var(--pl-ink)', padding: 28, borderRadius: 12 }}>
      <PearloomLogo size={32} color="var(--pl-cream)" />
    </div>
  );
}
