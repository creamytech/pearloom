'use client';

/* Dev-only QA stage for the First Pressing reveal sequence —
   replays on demand with a couple + a solo honoree variant.
   Production-gated by the server page. */

import { useState } from 'react';
import { FirstPressing } from '@/components/pearloom/redesign/FirstPressing';
import { REFERENCE_MANIFEST } from '@/lib/theme-store/__fixtures__/reference-manifest';
import type { StoryManifest } from '@/types';

export function FirstPressingStage() {
  const [run, setRun] = useState<null | 'couple' | 'solo'>(null);
  const manifest = REFERENCE_MANIFEST as unknown as StoryManifest;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--pl-cream, #F5EFE2)',
        display: 'grid',
        placeItems: 'center',
        gap: 12,
        fontFamily: 'var(--pl-font-body, sans-serif)',
      }}
    >
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setRun('couple')}
          style={{ padding: '10px 18px', borderRadius: 100, border: 'none', background: 'var(--pl-ink, #0E0D0B)', color: 'var(--pl-cream, #F5EFE2)', fontWeight: 600, cursor: 'pointer' }}
        >
          Play — couple
        </button>
        <button
          onClick={() => setRun('solo')}
          style={{ padding: '10px 18px', borderRadius: 100, border: '1px solid var(--pl-divider, #D8CFB8)', background: 'var(--pl-cream-card, #FBF7EE)', color: 'var(--pl-ink, #0E0D0B)', fontWeight: 600, cursor: 'pointer' }}
        >
          Play — solo honoree
        </button>
      </div>
      {run === 'couple' && (
        <FirstPressing manifest={manifest} names={['Alex', 'Jamie']} onDone={() => setRun(null)} />
      )}
      {run === 'solo' && (
        <FirstPressing manifest={manifest} names={['Eleanor', '']} onDone={() => setRun(null)} />
      )}
    </main>
  );
}
