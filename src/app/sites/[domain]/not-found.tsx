import Link from 'next/link';

// ─────────────────────────────────────────────────────────────
// Sites domain-scoped 404.
//
// A guest landed on a /sites/<slug> URL that doesn't exist (the
// host typo'd their invite link, the site was unpublished, or
// the slug was guessed). The root /not-found.tsx says "back
// home" which lands a stranger on the Pearloom marketing site —
// confusing. This one explains the situation gently and points
// at pearloom.com without assuming the visitor is the host.
// ─────────────────────────────────────────────────────────────

export default function SiteNotFound() {
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
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#C6703D',
          marginBottom: 18,
        }}
      >
        404 · Site not found
      </div>
      <h1
        style={{
          fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
          fontWeight: 600,
          fontSize: 'clamp(40px, 7vw, 64px)',
          color: 'var(--pl-ink, #0E0D0B)',
          margin: '0 0 16px',
          letterSpacing: '-0.02em',
          lineHeight: 1.0,
        }}
      >
        Nothing{' '}
        <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#C6703D' }}>woven here</span>.
      </h1>
      <p
        style={{
          color: 'var(--pl-ink-soft, #3A332C)',
          fontSize: 17,
          maxWidth: 480,
          lineHeight: 1.6,
          margin: '0 0 28px',
          fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
          fontStyle: 'italic',
        }}
      >
        This invitation link might be mistyped, or the host hasn&rsquo;t pressed publish
        yet. If a friend sent it, ask them to share the link again.
      </p>
      {/* Gold hairline — Pearloom signature */}
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
          color: 'var(--pl-cream-card, #FBF7EE)',
          fontWeight: 700,
          fontSize: 13.5,
          textDecoration: 'none',
          letterSpacing: '0.02em',
        }}
      >
        Visit Pearloom
      </Link>
      <div
        style={{
          marginTop: 26,
          fontSize: 11,
          color: 'var(--pl-muted, #6F6557)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
        }}
      >
        A craft house for memory
      </div>
    </div>
  );
}
