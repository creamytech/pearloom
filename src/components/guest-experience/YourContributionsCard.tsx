'use client';

// ─────────────────────────────────────────────────────────────
// YourContributionsCard — surfaces what THIS guest has done
// for this couple. Three layers:
//
//   • Photos uploaded via /sites/[domain]/upload?t=token
//     (tagged with guest_id at insert time)
//   • Registry claims via /api/registry-link-claims
//     (matched by claimer_email = guest.email)
//   • Words: memory-prompt responses, whispers, song requests,
//     time-capsule notes — anything keyed to the guest's
//     pearloom_guests.id where the guest typed the content.
//
// Renders only when there's at least one contribution. Below
// the YourRsvpCard on /g/[token] so the personal page reads as
// a hub: "what you said + what you brought + what you sent +
// what you wrote."
//
// All feeds are read-only on the guest side. The host can
// revoke a claim or moderate a photo from their dashboard;
// changes propagate through normal channels.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';

interface ContribPhoto {
  id: string;
  url: string;
  caption: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface ContribClaim {
  id: string;
  entryUrl: string;
  entryLabel: string;
  message: string | null;
  createdAt: string;
}

/** A single moment-of-words: response to a memory prompt, a
 *  whisper sent during the event, a song request, a time-capsule
 *  note. The card renders them in a unified "Words you wrote"
 *  strip with a small kind label so the guest can tell at a
 *  glance which conversation each came from. */
export interface ContribMoment {
  id: string;
  kind: 'memory' | 'whisper' | 'song' | 'timeCapsule';
  /** Short heading the row leads with — the prompt question for
   *  memory; song title + artist for songs; "you whispered" for
   *  whispers; "Letter to your future self" for time-capsule. */
  heading: string;
  /** The body the guest typed — the response, the whisper, the
   *  song note, the time-capsule body. Empty allowed when the
   *  contribution is a fact (a song without a note). */
  body: string;
  /** ISO timestamp; the row renders relative time. */
  createdAt: string;
}

interface Props {
  photos: ContribPhoto[];
  claims: ContribClaim[];
  moments?: ContribMoment[];
  accent?: string;
  headingFont?: string;
}

export function YourContributionsCard({
  photos,
  claims,
  moments = [],
  accent = '#5C6B3F',
  headingFont = 'Playfair Display',
}: Props) {
  if (photos.length === 0 && claims.length === 0 && moments.length === 0) return null;

  return (
    <div
      style={{
        padding: '1.25rem 1.5rem',
        background: 'var(--card, #ffffff)',
        borderRadius: '0.75rem',
        border: `1px solid ${accent}33`,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            fontWeight: 700,
            color: accent,
          }}
        >
          What you&apos;ve added
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontFamily: headingFont,
            fontWeight: 500,
            letterSpacing: '-0.005em',
            color: 'var(--ink, #2B2B2B)',
          }}
        >
          {summary(photos.length, claims.length, moments.length)}
        </h3>
      </div>

      {/* Photos strip — square thumbs, scrollable horizontal on
          phones, max 8 visible. Pending ones get a soft "in
          review" badge so guests see their photo landed even
          before host moderation. */}
      {photos.length > 0 && (
        <Section label="Photos you sent" count={photos.length}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
              gap: 6,
            }}
          >
            {photos.slice(0, 12).map((p) => (
              <div
                key={p.id}
                title={p.caption ?? ''}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  borderRadius: 8,
                  background: `var(--cream-2, #F5EFE2) center/cover no-repeat url(${p.url})`,
                  border: p.status === 'approved'
                    ? '1.5px solid rgba(139,156,90,0.45)'
                    : '1px dashed rgba(14,13,11,0.18)',
                  opacity: p.status === 'rejected' ? 0.4 : 1,
                }}
              >
                {p.status === 'pending' && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 3,
                      left: 3,
                      right: 3,
                      padding: '1px 6px',
                      background: 'rgba(14,13,11,0.7)',
                      color: '#FFFFFF',
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      borderRadius: 999,
                      textAlign: 'center',
                    }}
                  >
                    In review
                  </span>
                )}
              </div>
            ))}
          </div>
          {photos.length > 12 && (
            <div style={{ fontSize: 11, color: 'var(--ink-muted, #9A9488)', textAlign: 'center', marginTop: 4 }}>
              + {photos.length - 12} more
            </div>
          )}
        </Section>
      )}

      {claims.length > 0 && (
        <Section label="Gifts you got them" count={claims.length}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {claims.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(139,156,90,0.10)',
                  border: '1px solid rgba(139,156,90,0.25)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #2B2B2B)' }}>
                  {c.entryLabel}
                </span>
                {c.message && (
                  <span style={{ fontSize: 11.5, color: 'var(--ink-soft, #3A332C)', fontStyle: 'italic' }}>
                    you wrote: &ldquo;{c.message}&rdquo;
                  </span>
                )}
                <span style={{ fontSize: 10.5, color: 'var(--ink-muted, #9A9488)' }}>
                  {relativeTime(c.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {moments.length > 0 && (
        <Section label="Words you wrote" count={moments.length}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {moments.slice(0, 8).map((m) => (
              <div
                key={`${m.kind}-${m.id}`}
                style={{
                  padding: '8px 10px',
                  background: 'var(--cream-2, #F5EFE2)',
                  border: '1px solid rgba(14,13,11,0.06)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <span style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: accent,
                }}>
                  {kindLabel(m.kind)}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--ink, #2B2B2B)', fontWeight: 500 }}>
                  {m.heading}
                </span>
                {m.body && (
                  <span style={{
                    fontSize: 12,
                    color: 'var(--ink-soft, #3A332C)',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                    borderLeft: `2px solid ${accent}55`,
                    paddingLeft: 8,
                    marginTop: 1,
                  }}>
                    &ldquo;{m.body.length > 200 ? m.body.slice(0, 200) + '…' : m.body}&rdquo;
                  </span>
                )}
                <span style={{ fontSize: 10.5, color: 'var(--ink-muted, #9A9488)' }}>
                  {relativeTime(m.createdAt)}
                </span>
              </div>
            ))}
            {moments.length > 8 && (
              <div style={{ fontSize: 11, color: 'var(--ink-muted, #9A9488)', textAlign: 'center', marginTop: 2 }}>
                + {moments.length - 8} more
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function kindLabel(kind: ContribMoment['kind']): string {
  switch (kind) {
    case 'memory': return 'Memory';
    case 'whisper': return 'Whisper';
    case 'song': return 'Song request';
    case 'timeCapsule': return 'Time capsule';
  }
}

function summary(photoCount: number, claimCount: number, momentCount: number = 0): string {
  const parts: string[] = [];
  if (photoCount > 0) parts.push(`${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`);
  if (claimCount > 0) parts.push(`${claimCount} ${claimCount === 1 ? 'gift' : 'gifts'}`);
  if (momentCount > 0) parts.push(`${momentCount} ${momentCount === 1 ? 'moment' : 'moments'}`);
  if (parts.length === 0) return 'You haven\'t added anything yet.';
  if (parts.length === 1) return parts[0] + '. Thank you, truly.';
  if (parts.length === 2) return parts.join(' & ') + '. Thank you, truly.';
  return parts.slice(0, -1).join(', ') + ' & ' + parts[parts.length - 1] + '. Thank you, truly.';
}

function Section({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted, #9A9488)',
        }}
      >
        {label} · {count}
      </span>
      {children}
    </div>
  );
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const delta = Date.now() - t;
  const min = Math.round(delta / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
