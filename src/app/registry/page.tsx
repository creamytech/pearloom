// ─────────────────────────────────────────────────────────────
// Pearloom / app/registry/page.tsx
// Dashboard: Registry management page
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import type { Metadata } from 'next';
import { RegistryManager } from '@/components/registry/RegistryManager';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Registry — Pearloom',
  description: 'Add and manage all your registry links in one place.',
};

interface RegistryPageProps {
  searchParams: Promise<{ siteId?: string; domain?: string }>;
}

export default async function RegistryPage({ searchParams }: RegistryPageProps) {
  const params = await searchParams;
  const siteId = params.siteId || params.domain || 'demo';

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #f5ead6 0%, #F5F1E8 30%, #F5F1E8 100%)',
        paddingBottom: '5rem',
      }}
    >
      {/* Top nav bar */}
      <header
        style={{
          padding: '1.25rem 2rem',
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #EDE8E0',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <Link
          href="/sites"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: '#6B6660',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            transition: 'color 0.15s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Dashboard
        </Link>

        <span
          style={{ color: '#DDD8D0', fontSize: '1rem', fontFamily: 'Inter, sans-serif' }}
          aria-hidden="true"
        >
          /
        </span>

        <span
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '1rem',
            color: '#2B2B2B',
            fontWeight: 600,
          }}
        >
          Registry
        </span>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem 0' }}>
        {/* Page heading */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              margin: '0 0 0.5rem',
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 700,
              color: '#1C1C1C',
              lineHeight: 1.2,
            }}
          >
            Your Registry
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: 'Inter, sans-serif',
              fontSize: '1rem',
              color: '#6B6660',
              lineHeight: 1.6,
            }}
          >
            Add all your registry links — guests will see them beautifully on your site.
          </p>
        </div>

        {/* Manager */}
        <RegistryManager siteId={siteId} />

        {/* Bottom tip card */}
        <div
          style={{
            marginTop: '3rem',
            background: 'linear-gradient(135deg, #FFFBEB, #FFF8EE)',
            border: '1px solid #F5D87C55',
            borderRadius: '1rem',
            padding: '1.5rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{ fontSize: '1.75rem', lineHeight: 1, flexShrink: 0 }}
            aria-hidden="true"
          >
            💛
          </span>
          <div>
            <p
              style={{
                margin: '0 0 0.4rem',
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#92710B',
              }}
            >
              Tip: Add a Cash Fund
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                color: '#78610F',
                lineHeight: 1.6,
              }}
            >
              Many couples include a Honeymoon Fund or Cash Fund via Venmo, PayPal, or Honeyfund.
              Just paste the link and set the category to &ldquo;Cash Fund&rdquo; — we&apos;ll
              style it beautifully with a heart icon.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
