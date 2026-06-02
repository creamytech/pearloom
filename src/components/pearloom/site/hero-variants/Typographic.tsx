'use client';

// ──────────────────────────────────────────────────────────────
// Typographic — ported from ClaudeDesign/pages/themed-site.jsx
// HeroBlock 'typographic' branch (lines 326-339).
//
// Visually distinct from Minimal:
//   - Minimal renders names on ONE line (n1 and n2 inline with
//     small italic "and") at 0.92× scale — reads as a single
//     compressed line of type.
//   - Typographic STACKS the names — n1 on line 1, connector
//     ("&" or "×") on line 2 in italic accent color, n2 on
//     line 3 — at 1.4× scale. The names BECOME the hero. No
//     tagline, no learn-more, no photo, no horizontal hairline.
//     Just oversized stacked typography + meta + primary CTA.
//
// Reads as the editorial-poster option for couples whose names
// alone deserve the spotlight.
// ──────────────────────────────────────────────────────────────

import { EditableText } from '@/components/pearloom/editor/canvas/EditableText';
import {
  HeroKicker, HeroDateVenue, HeroPrimaryCta,
} from './parts';
import type { HeroVariantProps } from './types';
import type { StoryManifest } from '@/types';

// Custom stacked-names component — local to this variant since
// the shared HeroNames renders inline. Three-line layout:
//   n1
//   &  (italic, accent color, smaller)
//   n2
// Type sizes use clamp+cqw so they breathe in the device frame
// and on the published viewport.
function StackedHeroNames({ n1, n2, onEditNames, edition }: {
  n1: string;
  n2: string;
  onEditNames?: (next: [string, string]) => void;
  edition?: string;
}) {
  // Cinema uses "×" connector (matches prototype's editorial
  // theme branch); every other edition uses "&".
  const connector = edition === 'cinema' ? '×' : '&';
  // 1.4× larger than the inline HeroNames so the stacked layout
  // doesn't look smaller despite using more vertical space.
  const main = 'clamp(72px, 18cqw, 192px)';
  const connectorSize = 'clamp(40px, 9cqw, 96px)';

  return (
    <h1
      className="display pl8-hero-names pl-letterpress"
      style={{
        fontSize: main,
        lineHeight: 0.88,
        margin: 0,
        letterSpacing: '-0.03em',
        textAlign: 'center',
      }}
    >
      <EditableText
        as="span"
        value={n1 || ''}
        onSave={(next) => onEditNames?.([next, n2])}
        placeholder="Your"
        ariaLabel="First host name"
        maxLength={80}
        style={{ display: 'block' }}
      />
      {(n2 || onEditNames) && (
        <>
          <span
            className="display-italic"
            aria-hidden={!!n2 && !!n1}
            style={{
              display: 'block',
              fontSize: connectorSize,
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--peach-ink, var(--pl-gold, #C6703D))',
              margin: '6px 0',
              letterSpacing: 0,
            }}
          >
            {connector}
          </span>
          <EditableText
            as="span"
            value={n2 || ''}
            onSave={(next) => onEditNames?.([n1, next])}
            placeholder="Partner"
            ariaLabel="Second host name"
            maxLength={80}
            style={{ display: 'block' }}
          />
        </>
      )}
    </h1>
  );
}

export function HeroTypographic({ manifest, names: _names, siteSlug: _siteSlug, onEditField, onEditNames, context }: HeroVariantProps) {
  const { n1, n2, dateInfo, venue, deadlineStr } = context;
  const edition = (manifest as StoryManifest).edition;
  return (
    <div
      className="pl-hero-enter"
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        textAlign: 'center',
        padding: '48px 0 32px',
        position: 'relative',
      }}
    >
      {/* Lead eyebrow — keeps the canonical "save the date" line.
          The whole variant philosophy is "the names ARE the
          hero", so we keep the kicker minimal + ditch tagline. */}
      <HeroKicker manifest={manifest} dateInfo={dateInfo} onEditField={onEditField} />

      {/* Stacked oversized names — the defining feature. */}
      <StackedHeroNames n1={n1} n2={n2} onEditNames={onEditNames} edition={edition} />

      {/* Meta below the names — no tagline, no divider. */}
      <HeroDateVenue dateInfo={dateInfo} venue={venue} manifest={manifest} onEditField={onEditField} />

      {/* Primary CTA only — keeps the visual focus on the type. */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 32,
        }}
      >
        <HeroPrimaryCta deadlineStr={deadlineStr} />
      </div>
    </div>
  );
}
