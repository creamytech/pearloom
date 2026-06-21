'use client';

import { useState } from 'react';
import { DecorShop } from '@/components/pearloom/store/DecorShop';
import type { DecorItem } from '@/lib/theme-store/decor-items';

export function DevDecorShopClient() {
  const [owned, setOwned] = useState<ReadonlySet<string>>(new Set());
  const [applied, setApplied] = useState<string>('—');
  return (
    <div className="pl8" style={{ minHeight: '100dvh', background: 'var(--cream)', padding: '32px clamp(16px,4vw,40px) 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)' }}>The store</div>
          <h1 className="display" style={{ fontStyle: 'italic', color: 'var(--lavender-ink)', fontSize: 32, margin: '4px 0 0' }}>Decor, à la carte.</h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 6 }}>Last applied: <strong>{applied}</strong></p>
        </div>
        <DecorShop
          owned={owned}
          onApply={(i: DecorItem) => setApplied(`${i.kind} · ${i.name}`)}
          onBuy={(i: DecorItem) => setOwned((prev) => new Set(prev).add(i.id))}
        />
      </div>
    </div>
  );
}
