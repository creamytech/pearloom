'use client';
/* eslint-disable no-restricted-syntax */
/* Story section variants. Currently exports only StoryZigzag —
   the sidebyside / stacked / quote / timeline / letter variants
   are already shipped inline in ThemedSite.tsx. */

import type { CSSProperties } from 'react';
import type { StoryVariantCtx, PhotoTone } from './types';

const TONE_BG: Record<string, string> = {
  lavender: 'linear-gradient(135deg, #D7CCE5, #B7A4D0)',
  peach: 'linear-gradient(135deg, #F7DDC2, #EAB286)',
  sage: 'linear-gradient(135deg, #E3E6C8, #8B9C5A)',
  cream: 'linear-gradient(135deg, #F3E9D4, #E0D3B3)',
  warm: 'linear-gradient(135deg, #F0C9A8, #C4B5D9)',
  dusk: 'linear-gradient(200deg, #C4B5D9 0%, #F0C9A8 70%, #CBD29E 100%)',
  gold: 'linear-gradient(135deg, #EBD49A, #C29A4A)',
  ink: 'linear-gradient(135deg, #2E2A24, #0E0D0B)',
  rose: 'linear-gradient(135deg, #F2C9CE, #C97A8A)',
};

function SectionHead({ eyebrow, title, italic }: { eyebrow: string; title: string; italic?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 26 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 'var(--t-eyebrow-ls)',
          textTransform: 'uppercase',
          color: 'var(--t-accent-ink)',
          marginBottom: 10,
          fontFamily: 'var(--t-mono)',
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: 'var(--t-display)',
          fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
          fontSize: 40,
          margin: 0,
          lineHeight: 1.0,
          letterSpacing: '-0.01em',
          color: 'var(--t-ink)',
        }}
      >
        {title}
        {italic && (
          <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}> {italic}</span>
        )}
      </h2>
    </div>
  );
}

export function StoryZigzag({ ctx }: { ctx: StoryVariantCtx }) {
  const { C, pad } = ctx;
  const tones: PhotoTone[] = ['warm', 'sage', 'dusk'];
  const fallbackChips = ['01', '02', '03'];
  const bodyText = C.body || 'A short, friendly answer goes here.';

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: `${48 * pad}px 72px` }}>
      <SectionHead eyebrow={C.eyebrow} title={C.title} italic={C.italic} />
      {[0, 1, 2].map((i) => {
        const reverse = i % 2 === 1;
        const eyebrow = C.chips?.[i] ?? fallbackChips[i];
        return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 32,
              marginBottom: 36,
              alignItems: 'center',
              direction: reverse ? 'rtl' : 'ltr',
            }}
          >
            <div style={{ direction: 'ltr' }}>
              <div
                style={{
                  fontFamily: 'var(--t-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  color: 'var(--t-ink-muted)',
                  letterSpacing: '0.22em',
                  marginBottom: 10,
                }}
              >
                {eyebrow}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--t-display)',
                  fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
                  fontSize: 24,
                  margin: '0 0 12px',
                  lineHeight: 1.1,
                  color: 'var(--t-ink)',
                }}
              >
                {C.title}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--t-body)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--t-ink-soft)',
                  margin: 0,
                }}
              >
                {bodyText}
              </p>
            </div>
            <div style={{ direction: 'ltr' }}>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 5',
                  background: TONE_BG[tones[i]],
                  borderRadius: 'var(--t-radius)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
