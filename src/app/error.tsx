'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // TODO: replace with Sentry.captureException(error) once integrated
    console.error('[Pearloom] Unhandled error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        background: '#FAF7F2',
        fontFamily: "'Lora', Georgia, serif",
      }}
    >
      <div
        style={{
          fontSize: '2.5rem',
          color: '#A3B18A',
          marginBottom: '1.25rem',
          letterSpacing: '0.1em',
        }}
      >
        &#10022;
      </div>
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 400,
          fontSize: '2rem',
          color: '#3D3530',
          marginBottom: '0.75rem',
          letterSpacing: '-0.01em',
        }}
      >
        Pear hit a snag
      </h1>
      <p
        style={{
          color: '#6B665F',
          fontSize: '1rem',
          maxWidth: '420px',
          lineHeight: 1.7,
          marginBottom: '2rem',
        }}
      >
        Something unexpected happened, but your data is safe. Let&rsquo;s try
        that again.
      </p>
      <button
        onClick={() => unstable_retry()}
        style={{
          padding: '0.7rem 1.75rem',
          borderRadius: '100px',
          background: '#A3B18A',
          color: '#fff',
          border: 'none',
          fontFamily: "'Lora', Georgia, serif",
          fontWeight: 600,
          fontSize: '0.9rem',
          cursor: 'pointer',
          letterSpacing: '0.04em',
        }}
      >
        Try again
      </button>
      {error.digest && (
        <p
          style={{
            marginTop: '1.5rem',
            fontSize: '0.7rem',
            color: '#C4A96A',
            letterSpacing: '0.06em',
            fontFamily: 'monospace',
          }}
        >
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
