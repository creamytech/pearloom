'use client';

// ─────────────────────────────────────────────────────────────
// LinkedEventsStrip — the guest-facing payoff for linked sites.
// When a published site belongs to a "celebration" (the Weekend
// Builder, or sites linked in /dashboard/connections), this strip
// shows the other events in the weekend so guests can hop between
// them. Fetches /api/celebrations/siblings; renders nothing until
// there's at least one published sibling. Themed with --t-* so it
// wears the site's look. Published-only (needs a siteSlug).
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { buildSitePath } from '@/lib/site-urls';

interface Sibling {
  domain: string;
  names: [string, string] | null;
  occasion: string | null;
  title: string;
}

function occasionLabel(occasion: string | null): string {
  if (!occasion) return 'Celebration';
  return occasion
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function LinkedEventsStrip({ siteSlug }: { siteSlug?: string }) {
  const [celebration, setCelebration] = useState<{ name?: string } | null>(null);
  const [siblings, setSiblings] = useState<Sibling[]>([]);

  useEffect(() => {
    if (!siteSlug) return;
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/celebrations/siblings?siteId=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { celebration?: { name?: string } | null; siblings?: Sibling[] } | null) => {
          if (cancelled || !d) return;
          const sibs = (d.siblings ?? []).filter((s) => s?.domain);
          if (sibs.length > 0) {
            setSiblings(sibs);
            setCelebration(d.celebration ?? null);
          }
        })
        .catch(() => { /* no strip on failure */ });
    }, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [siteSlug]);

  if (siblings.length === 0) return null;

  return (
    <div style={{ background: 'var(--t-section)', padding: '52px clamp(16px, 4vw, 32px)' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--t-script, "Caveat", cursive)',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'var(--t-accent)', marginBottom: 6,
          }}
        >
          {celebration?.name ? `Part of ${celebration.name}` : 'The whole weekend'}
        </div>
        <div
          style={{
            fontFamily: 'var(--t-display, "Fraunces", Georgia, serif)',
            fontStyle: 'italic', fontWeight: 500,
            fontSize: 'clamp(24px, 4vw, 36px)', color: 'var(--t-ink)', lineHeight: 1.1,
            marginBottom: 22,
          }}
        >
          The rest of the celebration
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {siblings.map((s) => (
            <a
              key={s.domain}
              href={buildSitePath(s.domain, '', s.occasion ?? undefined)}
              style={{
                display: 'block',
                padding: '16px 18px',
                borderRadius: 'var(--t-radius, 12px)',
                background: 'var(--t-card)',
                border: '1px solid var(--t-line)',
                textDecoration: 'none',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--t-accent)', marginBottom: 6,
                }}
              >
                {occasionLabel(s.occasion)}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t-ink)', lineHeight: 1.2 }}>
                {s.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t-accent)', marginTop: 8, fontWeight: 600 }}>
                Open →
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LinkedEventsStrip;
