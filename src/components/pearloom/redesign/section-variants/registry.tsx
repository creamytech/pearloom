'use client';
/* eslint-disable no-restricted-syntax */
/* Registry section variants — alternatives to the default 'cards'
   layout that ships inline inside ThemedSite. Dispatched via
   readVariant(manifest, 'registry') against the LAYOUTS registry. */

import { Icon } from '../../motifs';
import type { RegistryVariantCtx } from './types';

/* Shared section head — mirrors TSectionHead in ThemedSite so the
   variants line up visually with the default. */
function SectionHead({ eyebrow, title, italic }: { eyebrow: string; title: string; italic?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 26 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}>
        {eyebrow}
      </div>
      <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 40, margin: 0, lineHeight: 1.0, letterSpacing: '-0.01em', color: 'var(--t-ink)' }}>
        {title}
        {italic && <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}> {italic}</span>}
      </h2>
    </div>
  );
}

/* (a) Chips — denser version of the default cards layout. */
export function RegistryChips({ ctx }: { ctx: RegistryVariantCtx }) {
  const { pad, C } = ctx;
  return (
    <div style={{ padding: `${48 * pad}px 40px`, textAlign: 'center', background: 'var(--t-paper)' }}>
      <SectionHead eyebrow={C.eyebrow} title={C.title} italic={C.italic} />
      <div style={{ fontSize: 14.5, color: 'var(--t-ink-soft)', maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 }}>
        {C.body}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 560, marginInline: 'auto' }}>
        {C.stores.map((s, i) => {
          const style = {
            padding: '6px 10px',
            borderRadius: 999,
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--t-ink)',
            textDecoration: 'none' as const,
            display: 'inline-block',
          };
          return s.url
            ? <a key={`${s.name}-${i}`} href={s.url} target="_blank" rel="noopener noreferrer" style={style}>{s.name}</a>
            : <span key={`${s.name}-${i}`} style={style}>{s.name}</span>;
        })}
      </div>
    </div>
  );
}

/* (b) Progress — hero card with a honeymoon-fund progress bar. */
export function RegistryProgress({ ctx }: { ctx: RegistryVariantCtx }) {
  const { pad, C } = ctx;
  const fundName =
    (C.stores.find((s) => /fund|honeymoon/i.test(s.name))?.name)
      ?? C.stores[0]?.name
      ?? 'Honeymoon fund';
  const pct = Math.max(0, Math.min(100, C.fundPct ?? 0));
  const sub = C.fundSub ?? `${pct}% funded`;
  return (
    <div style={{ padding: `${48 * pad}px 40px`, textAlign: 'center', background: 'var(--t-paper)' }}>
      <SectionHead eyebrow={C.eyebrow} title={C.title} italic={C.italic} />
      <div style={{ fontSize: 14.5, color: 'var(--t-ink-soft)', maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 }}>
        {C.body}
      </div>
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          background: 'var(--t-card)',
          border: '1px solid var(--t-line)',
          borderRadius: 'var(--t-radius)',
          padding: 22,
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 18, color: 'var(--t-ink)', marginBottom: 6 }}>
          {fundName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--t-ink-soft)', marginBottom: 14 }}>
          {sub}
        </div>
        <div style={{ height: 18, borderRadius: 999, background: 'var(--t-section)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`,
              background: 'var(--t-accent)',
              height: '100%',
              borderRadius: 999,
              transition: 'width 600ms',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* (c) Logo wall — grid of square-ish gift cards, one per store. */
export function RegistryLogoWall({ ctx }: { ctx: RegistryVariantCtx }) {
  const { pad, C } = ctx;
  return (
    <div style={{ padding: `${48 * pad}px 40px`, textAlign: 'center', background: 'var(--t-paper)' }}>
      <SectionHead eyebrow={C.eyebrow} title={C.title} italic={C.italic} />
      <div style={{ fontSize: 14.5, color: 'var(--t-ink-soft)', maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 }}>
        {C.body}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          maxWidth: 640,
          margin: '0 auto',
        }}
      >
        {C.stores.map((s, i) => {
          const cardStyle = {
            padding: 22,
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 'var(--t-radius)',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            gap: 10,
            textDecoration: 'none' as const,
            color: 'inherit',
          };
          const body = (
            <>
              <Icon name="gift" size={28} color="var(--t-accent-ink)" />
              <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 14, color: 'var(--t-ink)', textAlign: 'center', lineHeight: 1.2 }}>
                {s.name}
              </div>
            </>
          );
          return s.url
            ? <a key={`${s.name}-${i}`} href={s.url} target="_blank" rel="noopener noreferrer" style={cardStyle}>{body}</a>
            : <div key={`${s.name}-${i}`} style={cardStyle}>{body}</div>;
        })}
      </div>
    </div>
  );
}
