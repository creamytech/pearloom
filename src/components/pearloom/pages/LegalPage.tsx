'use client';

import type { ReactNode } from 'react';
import { Footbar, TopNav } from '../chrome';
import { Blob, Squiggle } from '../motifs';

export function LegalPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="pl8" style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <TopNav />
      <section style={{ position: 'relative', padding: '72px 32px 32px', overflow: 'hidden' }}>
        <Blob tone="lavender" size={320} opacity={0.4} style={{ position: 'absolute', top: -60, left: -80 }} />
        <Blob tone="peach" size={240} opacity={0.35} style={{ position: 'absolute', top: 40, right: -60 }} />
        <Squiggle variant={1} width={200} style={{ position: 'absolute', top: 120, right: 120, opacity: 0.5 }} />
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 10 }}>Pearloom</div>
          <h1 className="display" style={{ fontSize: 'clamp(44px, 6vw, 76px)', margin: 0, lineHeight: 1.02 }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: 17, color: 'var(--ink-soft)', margin: '18px 0 0', lineHeight: 1.6, maxWidth: 640 }}>{subtitle}</p>
          )}
        </div>
      </section>
      <article
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '0 32px 80px',
          fontSize: 15.5,
          lineHeight: 1.75,
          color: 'var(--ink-soft)',
        }}
        className="pl8-prose"
      >
        {children}
      </article>
      <Footbar />
    </div>
  );
}
