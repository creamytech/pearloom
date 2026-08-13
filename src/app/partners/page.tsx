// ─────────────────────────────────────────────────────────────
// Pearloom / app/partners/page.tsx
//
// The honest version (T.5/T.6 — NEW-USER-REVAMP L40). The old
// page promised commission tiers to hundreds of supposedly
// active earners with a registration form wired
// to nothing — the program does not exist yet, and fabricated
// social proof on a money surface is the fastest way to lose the
// exact professionals it courts. Until the program is real, this
// page says what's true and offers one door that actually goes
// somewhere: the team's inbox.
// ─────────────────────────────────────────────────────────────

export default function PartnersPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--pl-cream, #F5EFE2)',
        color: 'var(--pl-ink, #0E0D0B)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
      }}
    >
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)',
            fontSize: '0.64rem',
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            color: 'var(--pl-muted, #6F6557)',
            margin: '0 0 16px',
          }}
        >
          For photographers, planners &amp; venues
        </p>
        <h1
          style={{
            fontFamily: 'var(--pl-font-display, Fraunces, Georgia, serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(30px, 6vw, 44px)',
            fontWeight: 600,
            lineHeight: 1.15,
            margin: '0 0 18px',
          }}
        >
          A partner program, in the making
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--pl-ink-soft, #3A332C)', margin: '0 0 12px' }}>
          We&rsquo;re building a way for wedding professionals to share
          Pearloom with their clients and be rewarded for it. It
          isn&rsquo;t live yet — and we&rsquo;d rather tell you that plainly
          than show you a signup that goes nowhere.
        </p>
        <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--pl-ink-soft, #3A332C)', margin: '0 0 28px' }}>
          If you&rsquo;d like to be first in line when it opens, write to
          us — a person reads every note.
        </p>
        <a
          href="mailto:hello@pearloom.com?subject=Partner%20program"
          style={{
            display: 'inline-block',
            padding: '13px 26px',
            borderRadius: 999,
            background: 'var(--pl-ink, #0E0D0B)',
            color: 'var(--pl-cream, #F5EFE2)',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          Write to hello@pearloom.com
        </a>
        <p style={{ marginTop: 26, fontSize: 12.5, color: 'var(--pl-muted, #6F6557)' }}>
          Woven with care by Pearloom.
        </p>
      </div>
    </main>
  );
}
