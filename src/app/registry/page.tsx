// ─────────────────────────────────────────────────────────────
// Pearloom / app/registry/page.tsx
// Registry management — wrapped in v8 PageShell.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { RegistryManager } from '@/components/registry/RegistryManager';
import { PageShell } from '@/components/pearloom/PageShell';
import { Icon, Sparkle } from '@/components/pearloom/motifs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Registry · Pearloom',
  description: 'Add and manage all your registry links in one place.',
};

interface RegistryPageProps {
  searchParams: Promise<{ siteId?: string; domain?: string }>;
}

export default async function RegistryPage({ searchParams }: RegistryPageProps) {
  const params = await searchParams;
  const siteId = params.siteId || params.domain || 'demo';

  return (
    <PageShell footerVariant="quiet">
      <div style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) 24px 60px' }}>
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--peach-ink)',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            <Sparkle size={11} /> Registry
          </div>
          <h1
            className="display"
            style={{
              margin: '0 0 8px',
              fontSize: 'clamp(36px, 5vw, 56px)',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            Your <span className="display-italic">registry</span>
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              color: 'var(--ink-soft)',
              lineHeight: 1.6,
              maxWidth: 560,
            }}
          >
            Add all your registry links — guests will see them beautifully on your site.
          </p>
        </div>

        <RegistryManager siteId={siteId} />

        <div
          style={{
            marginTop: 32,
            padding: '14px 18px',
            borderRadius: 14,
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            fontSize: 13,
            color: 'var(--ink-soft)',
            lineHeight: 1.5,
          }}
        >
          <Icon name="gift" size={18} color="var(--lavender-ink)" />
          <span>
            Adding a <strong style={{ color: 'var(--ink)' }}>Honeymoon or Cash Fund</strong>?
            Paste any Venmo / PayPal / Honeyfund link above and set the category to
            &ldquo;Cash Fund&rdquo; — we&apos;ll style it with a heart.
          </span>
        </div>
      </div>
    </PageShell>
  );
}
