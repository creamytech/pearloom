'use client';

// ─────────────────────────────────────────────────────────────
// DecorShop — the standalone-decor storefront (design-system v2).
//
// Renders DECOR_ITEMS grouped by kind (Motifs · Dividers ·
// Monograms · Component kits) as cards with a LIVE preview, blurb,
// and a buy / apply action. Reused by the Theme Store route and the
// in-editor shop; ownership rides the caller's `owned` set (free
// items are always owned).
// ─────────────────────────────────────────────────────────────

import { Motif, type MotifKind } from '../site/MotifScatter';
import { Divider as BrandDivider, DIVIDER_ORNAMENTS } from '@/components/brand/Divider';
import { Monogram, type MonogramFrame } from '../site/Monogram';
import {
  decorItemsByKind,
  type DecorItem,
  type DecorKind,
} from '@/lib/theme-store/decor-items';

const KIND_LABEL: Record<DecorKind, string> = {
  motif: 'Motifs',
  divider: 'Dividers',
  monogram: 'Monograms',
  kit: 'Component kits',
};
const ORDER: DecorKind[] = ['motif', 'divider', 'monogram', 'kit'];

function DecorPreview({ item }: { item: DecorItem }) {
  if (item.kind === 'motif') {
    return <Motif kind={item.value as MotifKind} size={44} />;
  }
  if (item.kind === 'divider') {
    const orn = item.value.startsWith('pl-') ? item.value.slice(3) : null;
    if (orn && (DIVIDER_ORNAMENTS as readonly string[]).includes(orn)) {
      return <BrandDivider ornament={orn} width={118} ink="var(--sage-deep)" accent="var(--gold)" color="var(--pl-chrome-border)" />;
    }
    // Built-in dividers — a representative thread + pearl.
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 118, justifyContent: 'center' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--sage-deep)', opacity: 0.5 }} />
        <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--gold)' }} />
        <span style={{ flex: 1, height: 1, background: 'var(--sage-deep)', opacity: 0.5 }} />
      </div>
    );
  }
  if (item.kind === 'monogram') {
    return <Monogram initials="M & J" frame={item.value as MonogramFrame} size={50} withCard={false} />;
  }
  // Component kit — a tiny representative card sample.
  return (
    <div style={{ width: 96, border: '1px solid var(--line)', borderRadius: item.value === 'minimal' ? 0 : 8, background: 'var(--card)', padding: '8px 10px', textAlign: item.value === 'classic' ? 'center' : 'left' }}>
      <div style={{ fontFamily: 'var(--pl-font-mono, monospace)', fontSize: 7.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Card</div>
      <div style={{ fontFamily: 'var(--pl-font-display, serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink)' }}>Aa</div>
    </div>
  );
}

export interface DecorShopProps {
  /** Ids the host owns (free items count as owned regardless). */
  owned: ReadonlySet<string>;
  onApply: (item: DecorItem) => void;
  onBuy: (item: DecorItem) => void;
}

export function DecorShop({ owned, onApply, onBuy }: DecorShopProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {ORDER.map((kind) => (
        <section key={kind}>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 12, margin: '0 0 12px' }}>{KIND_LABEL[kind]}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {decorItemsByKind(kind).map((item) => {
              const isOwned = item.price === 0 || owned.has(item.id);
              return (
                <div key={item.id} style={{ background: 'var(--card)', border: '1px solid var(--card-ring, var(--line))', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 66, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', borderRadius: 8, overflow: 'hidden' }}>
                    <DecorPreview item={item} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{item.name}</span>
                    {item.badges?.new ? <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--peach-ink)' }}>New</span> : null}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4, flex: 1 }}>{item.blurb}</div>
                  {isOwned ? (
                    <button type="button" onClick={() => onApply(item)} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>Apply</button>
                  ) : (
                    <button type="button" onClick={() => onBuy(item)} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>${item.price}</button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
