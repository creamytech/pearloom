'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Blob } from '../motifs';
import { AmbientThread } from '../ambient';
import { DesignNav } from '@/components/marketing/design/DesignNav';
import { DesignCTAFooter } from '@/components/marketing/design/DesignCTAFooter';

export function LegalPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const router = useRouter();
  const onGetStarted = () => router.push('/wizard/new');
  return (
    <div className="pl8" style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Same nav as the marketing site (was a different chrome nav). */}
      <DesignNav onGetStarted={onGetStarted} />
      <section style={{ position: 'relative', padding: '64px 24px 28px', overflow: 'hidden' }}>
        <Blob tone="lavender" size={320} opacity={0.4} style={{ position: 'absolute', top: -60, left: -80 }} />
        <Blob tone="peach" size={240} opacity={0.35} style={{ position: 'absolute', top: 40, right: -60 }} />
        <AmbientThread size={190} style={{ position: 'absolute', top: 110, right: 110, opacity: 0.08 }} />
        {/* Centered hero. */}
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 10 }}>Pearloom</div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 6vw, 76px)', margin: 0, lineHeight: 1.02 }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: 17, color: 'var(--ink-soft)', margin: '18px auto 0', lineHeight: 1.6, maxWidth: 600 }}>{subtitle}</p>
          )}
        </div>
      </section>
      <article
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '0 24px 80px',
          fontSize: 15.5,
          lineHeight: 1.75,
          color: 'var(--ink-soft)',
        }}
        className="pl8-prose"
      >
        {children}
      </article>
      {/* Same footer as the marketing site. */}
      <DesignCTAFooter onGetStarted={onGetStarted} />
    </div>
  );
}
