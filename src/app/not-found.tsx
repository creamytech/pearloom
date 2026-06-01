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
      {/* Eyebrow — peach kicker matching ThemedSectionHead */}
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
        404 · Page not found
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
        This page isn&rsquo;t{' '}
        <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#C6703D' }}>here</span>.
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
        Either it moved, or it was never written. Let&rsquo;s get you back to somewhere real.
      </p>
      {/* Gold hairline above the CTA */}
      <div
        aria-hidden
        style={{
          width: 120,
          height: 1,
          margin: '0 auto 28px',
          background: 'linear-gradient(90deg, transparent, #B8935A 50%, transparent)',
          opacity: 0.55,
        }}
      />
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '13px 28px',
          borderRadius: 999,
          background: '#C6703D',
          color: '#FBF7EE',
          fontWeight: 700,
          fontSize: 13.5,
          textDecoration: 'none',
          letterSpacing: '0.02em',
        }}
      >
        Back home →
      </Link>
    </div>
  );
}
