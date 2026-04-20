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
        background: 'var(--pl-cream, #F5EFE2)',
        fontFamily: 'var(--pl-font-body, system-ui, sans-serif)',
        color: 'var(--pl-ink, #0E0D0B)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 22,
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: '0.6rem',
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: 'var(--pl-muted, #6F6557)',
        }}
      >
        <span style={{ width: 20, height: 1, background: 'var(--pl-gold, #B8935A)' }} />
        Something went sideways
        <span style={{ width: 20, height: 1, background: 'var(--pl-gold, #B8935A)' }} />
      </div>
      <h1
        style={{
          fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(2rem, 6vw, 3rem)',
          color: 'var(--pl-ink, #18181B)',
          margin: '0 0 12px',
          letterSpacing: '-0.014em',
          lineHeight: 1.1,
        }}
      >
        Pear hit a snag.
      </h1>
      <p
        style={{
          color: 'var(--pl-ink-soft, #3A332C)',
          fontSize: '1rem',
          maxWidth: 440,
          lineHeight: 1.6,
          marginBottom: 32,
          fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
          fontStyle: 'italic',
        }}
      >
        Something unexpected happened. Your work is safe — let&rsquo;s try that again.
      </p>
      <button
        onClick={() => unstable_retry()}
        style={{
          padding: '13px 28px',
          borderRadius: 'var(--pl-radius-xs)',
          background: 'var(--pl-ink, #0E0D0B)',
          color: 'var(--pl-cream, #FAF7F2)',
          border: 'none',
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
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
            color: 'var(--pl-muted, #6F6557)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          }}
        >
          Reference · {error.digest}
        </p>
      )}
    </div>
  );
}
