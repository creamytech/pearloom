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
        className="eyebrow"
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#C6703D',
          marginBottom: 18,
        }}
      >
        Something went sideways
      </div>
      <h1
        style={{
          fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
          fontWeight: 600,
          fontSize: 'clamp(40px, 7vw, 64px)',
          color: '#0E0D0B',
          margin: '0 0 16px',
          letterSpacing: '-0.02em',
          lineHeight: 1.0,
        }}
      >
        Pear hit a{' '}
        <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#C6703D' }}>snag</span>.
      </h1>
      <p
        style={{
          color: '#3A332C',
          fontSize: 17,
          maxWidth: 460,
          lineHeight: 1.55,
          marginBottom: 28,
          fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
          fontStyle: 'italic',
        }}
      >
        Something unexpected happened. Your work is safe — let&rsquo;s try that again.
      </p>
      <div
        aria-hidden
        style={{
          width: 120,
          height: 1,
          margin: '0 auto 28px',
          background: 'linear-gradient(90deg, transparent, #C19A4B 50%, transparent)',
          opacity: 0.55,
        }}
      />
      <button
        onClick={() => unstable_retry()}
        style={{
          padding: '13px 28px',
          borderRadius: 999,
          background: '#C6703D',
          color: '#FBF7EE',
          border: 'none',
          fontWeight: 700,
          fontSize: 13.5,
          letterSpacing: '0.02em',
          cursor: 'pointer',
        }}
      >
        Try again →
      </button>
      {error.digest && (
        <p
          style={{
            marginTop: 26,
            fontSize: 10.5,
            color: '#6F6557',
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
