'use client';

// ──────────────────────────────────────────────────────────────
// Minimal — typography only. No photo, no atmosphere washes,
// just kicker → names → date → tagline → CTA. Reads as a
// letterpress wedding programme. Great for couples whose
// best asset is the names + the type itself.
// ──────────────────────────────────────────────────────────────

import {
  HeroKicker, HeroNames, HeroDateVenue, HeroTagline,
  HeroPrimaryCta, HeroLinkTray,
} from './parts';
import type { HeroVariantProps } from './types';

export function HeroMinimal({ manifest, names, siteSlug, onEditField, onEditNames, context }: HeroVariantProps) {
  const { n1, n2, dateInfo, venue, deadlineStr } = context;
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', padding: '40px 0' }}>
      <HeroKicker manifest={manifest} dateInfo={dateInfo} onEditField={onEditField} />
      <HeroNames n1={n1} n2={n2} onEditNames={onEditNames} scale={0.92} />
      <HeroDateVenue dateInfo={dateInfo} venue={venue} />
      <HeroTagline manifest={manifest} onEditField={onEditField} />
      <HeroPrimaryCta deadlineStr={deadlineStr} />
      <HeroLinkTray siteSlug={siteSlug} manifest={manifest} names={names} />
    </div>
  );
}
