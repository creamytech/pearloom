'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Pearloom] Unhandled error:', error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#faf9f6', color: '#2b2b2b' }}>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✦</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', marginBottom: '0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#888', fontSize: '1rem', maxWidth: '400px', lineHeight: 1.6, marginBottom: '2rem' }}>
            An unexpected error occurred. Your site data is safe — this was just a display issue.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.65rem 1.5rem', borderRadius: '100px',
              background: '#A3B18A', color: 'white', border: 'none',
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: '#bbb', letterSpacing: '0.05em' }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
