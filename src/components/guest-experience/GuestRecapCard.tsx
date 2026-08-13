// ─────────────────────────────────────────────────────────────
// GuestRecapCard — the transfer moment, rendered.
//
// After the day, the guest's passport reflects what they were part
// of before it ever asks anything of them. The figures come from
// lib/passport/recap (pure, honest, occasion-aware); this file is
// only the surface.
//
// On solemn occasions `recap.inviteToHost` is false and the
// "plan your own" door is not rendered at all — that decision lives
// in the recap module so it can be tested, not in JSX where it
// could be quietly reordered.
//
// Server-safe: no hooks, plain markup, themed via the same accent /
// headingFont props the sibling passport cards take.
// ─────────────────────────────────────────────────────────────

import type { Recap } from '@/lib/passport/recap';

export function GuestRecapCard({
  recap,
  referralHref,
  accent,
  headingFont,
}: {
  recap: Recap;
  /** Where "start your own" goes, carrying site attribution. */
  referralHref: string;
  accent: string;
  headingFont: string;
}) {
  if (!recap.show) return null;
  // Nothing to look back on and nothing to offer — stay quiet
  // rather than render an empty ceremony.
  if (recap.lines.length === 0 && !recap.note && !recap.inviteToHost) return null;

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
        {recap.eyebrow}
      </div>

      <div
        style={{
          fontFamily: `"${headingFont}", Georgia, serif`,
          fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
          fontWeight: 600,
          lineHeight: 1.25,
          marginBottom: recap.lines.length > 0 ? 18 : 10,
        }}
      >
        {recap.headline}
      </div>

      {recap.lines.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(16px, 4vw, 28px)',
            marginBottom: 14,
          }}
        >
          {recap.lines.map((line) => (
            <div key={line.label} style={{ minWidth: 76 }}>
              <div
                style={{
                  fontFamily: `"${headingFont}", Georgia, serif`,
                  fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                  fontWeight: 600,
                  lineHeight: 1,
                  color: accent,
                }}
              >
                {line.value}
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  opacity: 0.7,
                  marginTop: 4,
                  lineHeight: 1.3,
                }}
              >
                {line.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {recap.note && (
        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.75, lineHeight: 1.5 }}>
          {recap.note}
        </p>
      )}

      {recap.inviteToHost && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: '1px solid var(--line, rgba(14,13,11,0.10))',
          }}
        >
          <p style={{ margin: '0 0 10px', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Planning something of your own?
          </p>
          <a
            href={referralHref}
            style={{
              display: 'inline-block',
              padding: '9px 16px',
              borderRadius: 999,
              border: `1px solid ${accent}`,
              color: accent,
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Start your own site
          </a>
        </div>
      )}
    </div>
  );
}
