'use client';

/* Then & now section — before/after photo pairs (reunions,
   milestone birthdays, retirements, graduations).

   Data: manifest.thenAndNow[] (typed on StoryManifest) — written by
   ThenAndNowPanel:
     { id, then?: url, now?: url, caption? }
   Pairs render side by side inside one hairline frame (BRAND §10:
   photography wears a frame) with mono THEN / NOW labels. A pair
   missing one side renders the photo it has — the host is often
   still hunting the old print.

   Variants (layouts.ts): pairs (single variant). */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface ThenAndNowPair { id?: string; then?: string; now?: string; caption?: string }

export function readThenAndNow(manifest: BlockSectionProps['manifest']): ThenAndNowPair[] {
  const pairs = manifest.thenAndNow;
  if (!Array.isArray(pairs)) return [];
  return pairs.filter((p) => (p.then ?? '').trim() || (p.now ?? '').trim());
}

const MONO = 'var(--t-mono, var(--pl-font-mono, ui-monospace, monospace))';

function SideLabel({ children }: { children: string }) {
  return (
    <span
      style={{
        position: 'absolute', left: 10, bottom: 8,
        padding: '3px 9px', borderRadius: 999,
        background: 'color-mix(in oklab, var(--t-ink) 72%, transparent)',
        color: 'var(--t-paper)',
        fontFamily: MONO, fontSize: 9, fontWeight: 700,
        letterSpacing: '0.22em', textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

function PairPhoto({ url, label, alt }: { url?: string; label: string; alt: string }) {
  if (!url?.trim()) return null;
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <img
        src={url}
        alt={alt}
        style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', display: 'block' }}
      />
      <SideLabel>{label}</SideLabel>
    </div>
  );
}

function PairCard({ pair, index }: { pair: ThenAndNowPair; index: number }) {
  const hasBoth = !!pair.then?.trim() && !!pair.now?.trim();
  return (
    <figure
      style={{
        margin: 0,
        background: 'var(--t-card)',
        /* Hairline frame — BRAND §10. */
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius-lg, 14px)',
        overflow: 'hidden',
        boxShadow: 'var(--t-shadow-sm, none)',
      }}
    >
      <div style={{ display: 'flex', gap: 2, background: 'var(--t-line-soft)' }}>
        <PairPhoto url={pair.then} label="Then" alt={pair.caption ? `${pair.caption} — then` : `Then, pair ${index + 1}`} />
        <PairPhoto url={pair.now} label="Now" alt={pair.caption ? `${pair.caption} — now` : `Now, pair ${index + 1}`} />
      </div>
      {(pair.caption?.trim() || !hasBoth) && (
        <figcaption style={{ padding: '11px 14px 13px', textAlign: 'center' }}>
          {pair.caption?.trim() ? (
            <span style={{ fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--t-ink-soft)' }}>
              {pair.caption.trim()}
            </span>
          ) : (
            <span style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--t-ink-muted)' }}>
              {pair.then?.trim() ? 'Now photo on its way' : 'Then photo on its way'}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

export function ThenAndNowSection({ manifest, pad, editable, onEditCopy }: BlockSectionProps) {
  const pairs = readThenAndNow(manifest);
  const empty = pairs.length === 0;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'thenAndNowEyebrow', 'A little time travel')}
        title={blockCopy(manifest, 'thenAndNowTitle', 'Then & now')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('thenAndNowEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('thenAndNowTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add a then-photo and a now-photo in the Then & now panel." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 18, maxWidth: 720, margin: '0 auto' }}>
          {pairs.map((pair, i) => <PairCard key={pair.id ?? i} pair={pair} index={i} />)}
        </div>
      )}
    </BlockFrame>
  );
}
