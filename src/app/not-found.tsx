import Link from 'next/link';

export default function NotFound() {
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
        <span style={{ width: 20, height: 1, background: 'var(--pl-gold, #C19A4B)' }} />
        404 · Not found
        <span style={{ width: 20, height: 1, background: 'var(--pl-gold, #C19A4B)' }} />
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
        This page isn&rsquo;t here.
      </h1>
      <p
        style={{
          color: 'var(--pl-ink-soft, #4A5642)',
          fontSize: '1rem',
          maxWidth: 440,
          lineHeight: 1.6,
          marginBottom: 32,
          fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
          fontStyle: 'italic',
        }}
      >
        Either it moved, or it was never written. Let&rsquo;s get you back to somewhere real.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '13px 28px',
          borderRadius: 'var(--pl-radius-xs)',
          background: 'var(--pl-ink, #0E0D0B)',
          color: 'var(--pl-cream, #FDFAF0)',
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontWeight: 700,
          fontSize: '0.66rem',
          textDecoration: 'none',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
        }}
      >
        Back home
      </Link>
    </div>
  );
}
