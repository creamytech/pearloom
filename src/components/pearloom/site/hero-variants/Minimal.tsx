'use client';

// ──────────────────────────────────────────────────────────────
// Minimal — typography only. No photo, no atmosphere washes,
// just kicker → names → date → tagline → CTA. Reads as a
// letterpress wedding programme. Great for couples whose
// best asset is the names + the type itself.
//
// Ported to the prototype's primary+outline CTA pair (replaced
// the 3-link tray with Add-to-Calendar/Save-Contact). Matches
// Postcard / PhotoFirst / Split for hero CTA consistency.
// ──────────────────────────────────────────────────────────────

import {
  HeroKicker, HeroNames, HeroDateVenue, HeroTagline,
  HeroPrimaryCta,
} from './parts';
import type { HeroVariantProps } from './types';

export function HeroMinimal({ manifest, names: _names, siteSlug: _siteSlug, onEditField, onEditNames, context }: HeroVariantProps) {
  const { n1, n2, dateInfo, venue, deadlineStr } = context;
  return (
    <div className="pl-hero-enter" style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', padding: '40px 0' }}>
      <HeroKicker manifest={manifest} dateInfo={dateInfo} onEditField={onEditField} />
      <HeroNames n1={n1} n2={n2} solo={context.solo} onEditNames={onEditNames} scale={0.92} />
      <HeroDateVenue dateInfo={dateInfo} venue={venue} manifest={manifest} onEditField={onEditField} />
      <HeroTagline manifest={manifest} onEditField={onEditField} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
          marginTop: 22,
          flexWrap: 'wrap',
        }}
      >
        <HeroPrimaryCta deadlineStr={deadlineStr} />
        <a
          href="#our-story"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '12px 20px',
            borderRadius: 'var(--pl-card-radius, 999px)',
            background: 'var(--card, transparent)',
            border: '1px solid var(--line, rgba(14,13,11,0.16))',
            color: 'var(--ink)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Learn more
        </a>
      </div>
    </div>
  );
}
