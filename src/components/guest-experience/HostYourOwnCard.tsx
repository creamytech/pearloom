// ─────────────────────────────────────────────────────────────
// HostYourOwnCard — the guest → host growth loop.
//
// Mounted on every /g/[token] passport (unlike YourCelebrationsCard,
// which only shows when the guest is already on other sites). A guest
// who tapped their invite is one warm step from making their own —
// this is the single highest-leverage acquisition surface, so it's
// always here, quiet and on-brand.
//
// Server-safe: no hooks, plain markup, themed via the same
// accent / headingFont props the sibling passport cards take.
// ─────────────────────────────────────────────────────────────

export function HostYourOwnCard({
  accent,
  headingFont,
  hostFirstName,
}: {
  accent: string;
  headingFont: string;
  /** The host of the event this guest is visiting, when known —
   *  personalises the invitation ("like Emma did"). */
  hostFirstName?: string | null;
}) {
  return (
    <div
      style={{
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--line, rgba(14,13,11,0.10))',
        borderRadius: 18,
        padding: 'clamp(20px, 4vw, 28px)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: '0.6rem',
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: accent,
          marginBottom: 8,
        }}
      >
        Your own day
      </div>
      <div
        style={{
          fontFamily: `"${headingFont}", Georgia, serif`,
          fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--ink, #0E0D0B)',
          marginBottom: 4,
        }}
      >
        A day worth remembering of your own?
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft, #3A332C)', margin: '0 0 18px', lineHeight: 1.55 }}>
        You&apos;ve seen how it&apos;s made
        {hostFirstName ? `, the way ${hostFirstName} wove this one` : ''}. When your
        own celebration comes, Pearloom drafts it with you in a few minutes.
      </p>
      <a
        href="/wizard/new"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 20px',
          borderRadius: 999,
          background: 'var(--ink, #0E0D0B)',
          color: 'var(--cream, #FBF7EE)',
          textDecoration: 'none',
          fontSize: '0.86rem',
          fontWeight: 600,
        }}
      >
        Create your own site
        <span aria-hidden style={{ fontSize: '0.9rem' }}>→</span>
      </a>
    </div>
  );
}
