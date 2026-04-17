'use client';

import { useEffect } from 'react';

// global-error renders OUTSIDE the root layout, so none of the CSS
// variables from globals.css are available. We inline the Pearloom
// colour + font tokens here, and preload Fraunces + Geist Mono so
// this page still reads as Pearloom even when everything else has
// failed.
const INK = '#0E0D0B';
const INK_SOFT = '#3A332C';
const CREAM = '#F5EFE2';
const GOLD = '#B8935A';
const MUTED = '#6F6557';

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
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400&family=Fraunces:ital,opsz,wght@1,9..144,400&family=Geist+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <title>Pear hit a snag · Pearloom</title>
      </head>
      <body
        style={{
          margin: 0,
          fontFamily:
            '"Geist", "Geist Mono", "Helvetica Neue", Arial, sans-serif',
          background: CREAM,
          color: INK,
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 22,
              fontFamily: '"Geist Mono", ui-monospace, monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            <span style={{ width: 20, height: 1, background: GOLD }} />
            Something went sideways
            <span style={{ width: 20, height: 1, background: GOLD }} />
          </div>
          <h1
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              color: INK,
              margin: '0 0 12px',
              letterSpacing: '-0.014em',
              lineHeight: 1.1,
            }}
          >
            Pear hit a snag.
          </h1>
          <p
            style={{
              color: INK_SOFT,
              fontSize: '1rem',
              maxWidth: 440,
              lineHeight: 1.6,
              marginBottom: 32,
              fontFamily: '"Fraunces", Georgia, serif',
              fontStyle: 'italic',
            }}
          >
            Something unexpected happened. Your work is safe — let&rsquo;s try that again.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              padding: '13px 28px',
              borderRadius: 2,
              background: INK,
              color: CREAM,
              border: 'none',
              fontFamily: '"Geist Mono", ui-monospace, monospace',
              fontWeight: 700,
              fontSize: '0.66rem',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: 26,
                fontSize: '0.58rem',
                color: MUTED,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontFamily: '"Geist Mono", ui-monospace, monospace',
              }}
            >
              Reference · {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
