'use client';

/* Route-level error boundary for published sites. Without this,
   any uncaught error on a guest's first paint fell through to
   global-error.tsx — Pearloom-branded, host-toned, and alarming
   for a GUEST who just tapped an invitation link. This fallback
   stays calm, names nothing technical, and offers the one action
   that almost always works (the 2026-06-12 hydration crash
   cleared on reload once the fix deployed). */

import { useEffect } from 'react';

export default function PublishedSiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[published-site error]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: '#FBF7EE',
        padding: 24,
        textAlign: 'center',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <div
          aria-hidden
          style={{
            width: 44, height: 1, background: '#C19A4B',
            margin: '0 auto 18px',
          }}
        />
        <h1
          style={{
            fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
            fontStyle: 'italic',
            fontWeight: 500,
            color: '#0E0D0B',
            margin: '0 0 10px',
            lineHeight: 1.15,
          }}
        >
          The page needs a moment.
        </h1>
        <p style={{ color: '#6F6557', fontSize: 15, lineHeight: 1.6, marginBottom: 26 }}>
          Something didn&rsquo;t load quite right. A refresh almost always clears it.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '12px 26px',
            borderRadius: 999,
            background: '#0E0D0B',
            color: '#F5EFE2',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
