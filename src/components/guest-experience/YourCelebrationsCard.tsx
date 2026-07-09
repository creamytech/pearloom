// ─────────────────────────────────────────────────────────────
// YourCelebrationsCard — the guest's own event graph.
//
// Mounted on /g/[token] when the guest's email appears on other
// PUBLISHED Pearloom sites: "Your celebrations on Pearloom" — a
// quiet list of every party this person is woven into, each
// linking to its public site. This is the guest's OWN data
// (their event memberships), gated by their passport token —
// it never exposes another guest's history.
//
// Server-safe: no hooks, plain markup, themed via the same
// accent/headingFont props the sibling passport cards take.
// ─────────────────────────────────────────────────────────────

export interface CelebrationEntry {
  /** "Emma & James" / "Eleanor" — falls back to the domain. */
  label: string;
  occasion: string | null;
  /** Display-ready date line, when the manifest has one. */
  dateDisplay: string | null;
  /** buildSitePath output — the public site. */
  href: string;
  /** This guest's reply on that event. */
  status: string | null;
}

function occasionLabel(o: string | null): string {
  if (!o) return 'Celebration';
  return o.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function statusLabel(s: string | null): string | null {
  if (s === 'attending' || s === 'yes') return 'Attending';
  if (s === 'declined' || s === 'no') return 'Declined';
  if (s === 'maybe') return 'Maybe';
  return null;
}

export function YourCelebrationsCard({
  entries, accent, headingFont,
}: {
  entries: CelebrationEntry[];
  accent: string;
  headingFont: string;
}) {
  if (entries.length === 0) return null;
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
        Your celebrations on Pearloom
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
        The thread runs through more than one party.
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft, #3A332C)', margin: '0 0 16px', lineHeight: 1.55 }}>
        You&apos;re woven into {entries.length === 1 ? 'another celebration' : `${entries.length} other celebrations`}, 
        everything you need for each lives on its own site.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map((e) => {
          const reply = statusLabel(e.status);
          return (
            <a
              key={e.href}
              href={e.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--cream-2, rgba(14,13,11,0.03))',
                border: '1px solid var(--line-soft, rgba(14,13,11,0.06))',
                textDecoration: 'none',
                color: 'var(--ink, #0E0D0B)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: accent, flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600 }}>{e.label}</span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--ink-soft, #3A332C)', marginTop: 1 }}>
                  {occasionLabel(e.occasion)}
                  {e.dateDisplay ? ` · ${e.dateDisplay}` : ''}
                </span>
              </span>
              {reply && (
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-soft, #3A332C)',
                    border: '1px solid var(--line, rgba(14,13,11,0.12))',
                    borderRadius: 999,
                    padding: '3px 9px',
                    flexShrink: 0,
                  }}
                >
                  {reply}
                </span>
              )}
              <span aria-hidden style={{ color: accent, fontSize: '0.9rem', flexShrink: 0 }}>→</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
