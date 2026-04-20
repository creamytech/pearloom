'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/LinkedEventsStrip.tsx
// A compact footer-adjacent strip shown on a published site
// when it is part of a celebration with ≥1 sibling events.
//
// Example: the bachelor-party site shows a quiet strip linking
// to the wedding + rehearsal dinner + brunch.
//
// Fetches siblings client-side from
// /api/celebrations/siblings?siteId=… so the strip stays empty
// until a sibling gets published.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { buildSitePath, type SiteOccasion } from '@/lib/site-urls';

interface Sibling {
  domain: string;
  occasion: SiteOccasion;
  title: string;
}

interface Props {
  siteId: string;
  celebrationName: string;
  accent?: string;
  foreground?: string;
  muted?: string;
  headingFont?: string;
  bodyFont?: string;
}

const OCCASION_LABEL: Record<SiteOccasion, string> = {
  wedding: 'Wedding',
  engagement: 'Engagement',
  anniversary: 'Anniversary',
  birthday: 'Birthday',
  story: 'Story',
  'bachelor-party': 'Bachelor party',
  'bachelorette-party': 'Bachelorette party',
  'bridal-shower': 'Bridal shower',
  'bridal-luncheon': 'Bridal luncheon',
  'rehearsal-dinner': 'Rehearsal dinner',
  'welcome-party': 'Welcome party',
  brunch: 'Morning-after brunch',
  'vow-renewal': 'Vow renewal',
  'baby-shower': 'Baby shower',
  'gender-reveal': 'Gender reveal',
  'sip-and-see': 'Sip & see',
  housewarming: 'Housewarming',
  'first-birthday': 'First birthday',
  'sweet-sixteen': 'Sweet sixteen',
  'milestone-birthday': 'Milestone birthday',
  retirement: 'Retirement',
  graduation: 'Graduation',
  'bar-mitzvah': 'Bar mitzvah',
  'bat-mitzvah': 'Bat mitzvah',
  quinceanera: 'Quinceañera',
  baptism: 'Baptism',
  'first-communion': 'First communion',
  confirmation: 'Confirmation',
  memorial: 'Memorial',
  funeral: 'Funeral',
  reunion: 'Reunion',
};

export function LinkedEventsStrip({
  siteId,
  celebrationName,
  accent = 'var(--pl-olive)',
  foreground = 'var(--pl-ink)',
  muted = 'var(--pl-muted)',
  headingFont = 'var(--pl-font-display, Georgia, serif)',
  bodyFont = 'var(--pl-font-body, system-ui, sans-serif)',
}: Props) {
  const [siblings, setSiblings] = useState<Sibling[] | null>(null);

  useEffect(() => {
    if (!siteId) return;
    const controller = new AbortController();
    fetch(`/api/celebrations/siblings?siteId=${encodeURIComponent(siteId)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : { siblings: [] }))
      .then((data) => {
        setSiblings((data?.siblings ?? []) as Sibling[]);
      })
      .catch(() => setSiblings([]));
    return () => controller.abort();
  }, [siteId]);

  if (!siblings || siblings.length === 0) return null;

  return (
    <section
      style={{
        padding: 'clamp(36px, 6vw, 64px) clamp(20px, 5vw, 48px)',
        borderTop: `1px solid color-mix(in oklab, ${accent} 22%, transparent)`,
        background: `color-mix(in oklab, ${accent} 3%, var(--pl-cream))`,
        fontFamily: bodyFont,
        color: foreground,
      }}
      aria-label={`Other events in ${celebrationName}`}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: accent,
            marginBottom: 10,
          }}
        >
          Part of {celebrationName}
        </div>
        <h3
          style={{
            margin: 0,
            fontFamily: headingFont,
            fontSize: 'clamp(1.4rem, 3.2vw, 2rem)',
            fontStyle: 'italic',
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            color: foreground,
            lineHeight: 1.1,
          }}
        >
          The other events
        </h3>
        <p
          style={{
            maxWidth: '52ch',
            margin: '10px auto 0',
            color: muted,
            fontSize: '0.92rem',
            lineHeight: 1.55,
          }}
        >
          Everything woven together for the same weekend.
        </p>

        <ul
          style={{
            margin: '32px 0 0',
            padding: 0,
            listStyle: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          {siblings.map((s) => (
            <li key={s.domain}>
              <a
                href={buildSitePath(s.domain, '', s.occasion)}
                style={{
                  display: 'block',
                  padding: '16px 18px',
                  borderRadius: 'var(--pl-radius-lg)',
                  border: '1px solid var(--pl-divider)',
                  background: 'var(--pl-cream-card)',
                  color: 'inherit',
                  textDecoration: 'none',
                  transition:
                    'transform var(--pl-dur-fast) var(--pl-ease-out),' +
                    ' border-color var(--pl-dur-fast) var(--pl-ease-out),' +
                    ' box-shadow var(--pl-dur-fast) var(--pl-ease-out)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.borderColor = accent;
                  e.currentTarget.style.boxShadow = 'var(--pl-shadow-sm)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.borderColor = 'var(--pl-divider)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: accent,
                    marginBottom: 6,
                  }}
                >
                  {OCCASION_LABEL[s.occasion] ?? s.occasion}
                </div>
                <div
                  style={{
                    fontFamily: headingFont,
                    fontStyle: 'italic',
                    fontSize: '1.1rem',
                    color: foreground,
                    lineHeight: 1.2,
                  }}
                >
                  {s.title}
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
