'use client';
 
/* Registry section variants — alternatives to the default 'cards'
   layout. Dispatched via readVariant(manifest, 'registry') against
   the LAYOUTS registry.

   Variants return *content-only* JSX — the dispatch's outer <div>
   in ThemedSite is the single source of section padding /
   background. */

import { Icon } from '../../motifs';
import type { RegistryVariantCtx } from './types';
import { VariantSectionHead } from './_section-head';

/* (a) Chips — denser version of the default cards layout. */
export function RegistryChips({ ctx }: { ctx: RegistryVariantCtx }) {
  const { C, editable, onEditEyebrow, onEditTitle, eyebrowPlaceholder, titlePlaceholder } = ctx;
  return (
    <>
      <VariantSectionHead
        eyebrow={C.eyebrow} title={C.title} italic={C.italic}
        editable={editable} onEditEyebrow={onEditEyebrow} onEditTitle={onEditTitle}
        eyebrowPlaceholder={eyebrowPlaceholder} titlePlaceholder={titlePlaceholder}
      />
      <div style={{ fontSize: 14.5, color: 'var(--t-ink-soft)', maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 }}>
        {C.body}
      </div>
      {ctx.itemsSlot}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 560, marginInline: 'auto' }}>
        {C.stores.map((s, i) => {
          const style = {
            padding: '6px 12px',
            borderRadius: s.note ? 14 : 999,
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--t-ink)',
            textDecoration: 'none' as const,
            display: 'inline-flex',
            flexDirection: 'column' as const,
            alignItems: 'center' as const,
            gap: 2,
            maxWidth: 220,
          };
          const body = (
            <>
              {s.name}
              {/* Host note — parity with the default cards layout
                  ("for the honeymoon fund"). */}
              {s.note && (
                <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--t-ink-soft)', lineHeight: 1.35, textAlign: 'center' }}>
                  {s.note}
                </span>
              )}
            </>
          );
          return s.url
            ? <a key={`${s.name}-${i}`} href={s.url} target="_blank" rel="noopener noreferrer" style={style}>{body}</a>
            : <span key={`${s.name}-${i}`} style={style}>{body}</span>;
        })}
      </div>
    </>
  );
}

/* (b) Progress ("Fund") — the fund-forward layout. The REAL
   pledge-driven RegistryFundCard (inside itemsSlot, fed by the
   honor ledger — "as shared by guests") is the hero; linked
   stores follow as a quiet single-column ledger. The old version
   rendered a host-invented `fundPct` bar directly above the real
   one — two progress bars, one fabricated. That bar (and the
   panel slider that set it) is gone; nothing invents a number on
   the money surface. */
export function RegistryProgress({ ctx }: { ctx: RegistryVariantCtx }) {
  const { C, editable, onEditEyebrow, onEditTitle, eyebrowPlaceholder, titlePlaceholder } = ctx;
  return (
    <>
      <VariantSectionHead
        eyebrow={C.eyebrow} title={C.title} italic={C.italic}
        editable={editable} onEditEyebrow={onEditEyebrow} onEditTitle={onEditTitle}
        eyebrowPlaceholder={eyebrowPlaceholder} titlePlaceholder={titlePlaceholder}
      />
      <div style={{ fontSize: 14.5, color: 'var(--t-ink-soft)', maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 }}>
        {C.body}
      </div>
      {ctx.itemsSlot}
      {C.stores.length > 0 && (
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {C.stores.map((s, i) => {
            const rowStyle = {
              padding: '13px 18px',
              borderRadius: 'var(--t-radius)',
              background: 'var(--t-card)',
              border: '1px solid var(--t-line)',
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center' as const,
              gap: 3,
              textDecoration: 'none' as const,
              color: 'var(--t-ink)',
            };
            const body = (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600 }}>
                  {s.name} {s.url && <Icon name="arrow-ur" size={12} color="var(--t-accent-ink)" />}
                </span>
                {s.note && (
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--t-ink-soft)', lineHeight: 1.4, textAlign: 'center' }}>
                    {s.note}
                  </span>
                )}
              </>
            );
            return s.url
              ? <a key={`${s.name}-${i}`} href={s.url} target="_blank" rel="noopener noreferrer" style={rowStyle}>{body}</a>
              : <span key={`${s.name}-${i}`} style={rowStyle}>{body}</span>;
          })}
        </div>
      )}
    </>
  );
}

/* (c) Store cards — typographic plates, one per store (2026-07-02;
   replaces 'logowall', which showed the same gift glyph on every
   card — "a logo wall with no logos"). Real store presence WITHOUT
   fake logos: the store's initials as a display-type mark on a
   hairline plate, the name in mono small caps, the link's domain
   as the quiet ground line. Legacy layouts.registry='logowall'
   picks dispatch here too (alias in ThemedSite's RegistryBlock). */

/** "Crate & Barrel" → "CB", "Zola" → "Z" — at most two initials,
 *  articles skipped. Exported for the unit test. */
export function storeMark(name: string): string {
  const words = (name ?? '')
    .split(/[\s&+·]+/)
    .map((w) => w.trim())
    .filter((w) => w && !/^(the|and|of|for|a|an)$/i.test(w));
  const letters = words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
  return letters || '·';
}

/** Quiet ground line under the mark — the link's hostname. */
function storeDomain(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

export function RegistryStoreCards({ ctx }: { ctx: RegistryVariantCtx }) {
  const { C, editable, onEditEyebrow, onEditTitle, eyebrowPlaceholder, titlePlaceholder } = ctx;
  return (
    <>
      <VariantSectionHead
        eyebrow={C.eyebrow} title={C.title} italic={C.italic}
        editable={editable} onEditEyebrow={onEditEyebrow} onEditTitle={onEditTitle}
        eyebrowPlaceholder={eyebrowPlaceholder} titlePlaceholder={titlePlaceholder}
      />
      <div style={{ fontSize: 14.5, color: 'var(--t-ink-soft)', maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 }}>
        {C.body}
      </div>
      {ctx.itemsSlot}
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
          const domain = storeDomain(s.url);
          const cardStyle = {
            padding: '22px 16px 18px',
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 'var(--t-radius)',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center' as const,
            justifyContent: 'flex-start' as const,
            gap: 10,
            textDecoration: 'none' as const,
            color: 'inherit',
          };
          const body = (
            <>
              {/* The typographic mark — a small framed plate with
                  the store's initials in display italic + a gold
                  baseline rule. Never a fake logo. */}
              <span
                aria-hidden
                style={{
                  width: 52, height: 52,
                  display: 'grid', placeItems: 'center',
                  border: '1px solid var(--t-line)',
                  borderRadius: 'calc(var(--t-radius) * 0.6)',
                  background: 'var(--t-paper)',
                  position: 'relative',
                }}
              >
                <span style={{ fontFamily: 'var(--t-display)', fontStyle: 'italic', fontWeight: 'var(--t-display-wght)' as never, fontSize: 21, lineHeight: 1, color: 'var(--t-ink)' }}>
                  {storeMark(s.name)}
                </span>
                <span style={{ position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)', width: 16, height: 1, background: 'var(--t-gold)', opacity: 0.8 }} />
              </span>
              <span
                style={{
                  fontFamily: 'var(--t-mono, ui-monospace, monospace)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--t-ink)',
                  textAlign: 'center',
                  lineHeight: 1.45,
                }}
              >
                {s.name}
              </span>
              {domain && (
                <span style={{ fontSize: 10.5, color: 'var(--t-ink-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {domain} <Icon name="arrow-ur" size={10} color="var(--t-accent-ink)" />
                </span>
              )}
              {/* Host note — parity with the default cards layout. */}
              {s.note && (
                <span style={{ fontSize: 11, fontStyle: 'italic', fontWeight: 500, color: 'var(--t-ink-soft)', textAlign: 'center', lineHeight: 1.4 }}>
                  {s.note}
                </span>
              )}
            </>
          );
          return s.url
            ? <a key={`${s.name}-${i}`} href={s.url} target="_blank" rel="noopener noreferrer" style={cardStyle}>{body}</a>
            : <div key={`${s.name}-${i}`} style={cardStyle}>{body}</div>;
        })}
      </div>
    </>
  );
}
