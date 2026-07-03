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

   Variants (layouts.ts):
     pairs — then / now side by side inside one hairline frame.
     stack — then above, now below in a single full-width column,
             joined by the two-strand thread; reads as a timeline
             of transformations rather than a grid of diptychs. */

import type { CSSProperties } from 'react';
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

/* ─── Stack — then over now, joined by the two-strand thread. ─── */

/** Full-width photo with a mono corner tag (top-left). */
function StackPhoto({ url, label, alt }: { url?: string; label: string; alt: string }) {
  if (!url?.trim()) {
    return (
      <div
        style={{
          aspectRatio: '16 / 10', display: 'grid', placeItems: 'center',
          background: 'var(--t-section)', border: '1px dashed var(--t-line)',
          borderRadius: 'var(--t-radius, 10px)',
          fontSize: 11.5, fontStyle: 'italic', color: 'var(--t-ink-muted)',
        }}
      >
        {label} photo on its way
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--t-radius, 10px)' }}>
      <img
        src={url}
        alt={alt}
        style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block' }}
      />
      <span
        style={{
          position: 'absolute', top: 10, left: 10,
          padding: '3px 10px', borderRadius: 999,
          background: 'color-mix(in oklab, var(--t-ink) 72%, transparent)',
          color: 'var(--t-paper)',
          fontFamily: MONO, fontSize: 9, fontWeight: 700,
          letterSpacing: '0.22em', textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
}

/** The brand's two-strand weave (accent + gold) between the two
 *  photos — the visual "and then, years later…". */
function ThreadJoin() {
  const strand: CSSProperties = {
    position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2,
    borderRadius: 2,
  };
  return (
    <div aria-hidden style={{ position: 'relative', height: 30, margin: '4px 0' }}>
      <span style={{ ...strand, transform: 'translateX(-3px)', background: 'var(--t-accent)', opacity: 0.7 }} />
      <span style={{ ...strand, transform: 'translateX(2px)', background: 'var(--t-gold)', opacity: 0.7 }} />
    </div>
  );
}

function StackCard({ pair, index }: { pair: ThenAndNowPair; index: number }) {
  return (
    <figure
      style={{
        margin: 0,
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius-lg, 14px)',
        padding: 'clamp(14px, 3vw, 20px)',
        boxShadow: 'var(--t-shadow-sm, none)',
      }}
    >
      <StackPhoto url={pair.then} label="Then" alt={pair.caption ? `${pair.caption} — then` : `Then, pair ${index + 1}`} />
      <ThreadJoin />
      <StackPhoto url={pair.now} label="Now" alt={pair.caption ? `${pair.caption} — now` : `Now, pair ${index + 1}`} />
      {pair.caption?.trim() && (
        <figcaption style={{ marginTop: 12, textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--t-ink-soft)' }}>
            {pair.caption.trim()}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

export function ThenAndNowSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const pairs = readThenAndNow(manifest);
  const empty = pairs.length === 0;
  if (empty && !editable) return null;
  const stack = variant === 'stack';

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
      ) : stack ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 460, margin: '0 auto' }}>
          {pairs.map((pair, i) => <StackCard key={pair.id ?? i} pair={pair} index={i} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 18, maxWidth: 720, margin: '0 auto' }}>
          {pairs.map((pair, i) => <PairCard key={pair.id ?? i} pair={pair} index={i} />)}
        </div>
      )}
    </BlockFrame>
  );
}
