'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // TODO: replace with Sentry.captureException(error) once integrated
    console.error('[Pearloom] Global error caught in root layout:', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <title>Something went wrong - Pearloom</title>
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: "'Lora', Georgia, serif",
          background: '#FAF7F2',
          color: '#1A1A1A',
        }}
      >
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
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
            Something went wrong
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
            An unexpected error occurred. Your site data is safe &mdash; we just
            hit a snag displaying this page.
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
              transition: 'background 0.2s ease',
            }}
            onMouseOver={(e) =>
              ((e.target as HTMLButtonElement).style.background = '#8FA876')
            }
            onMouseOut={(e) =>
              ((e.target as HTMLButtonElement).style.background = '#A3B18A')
            }
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
      </body>
    </html>
  );
}
