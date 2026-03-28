'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/seating/page.tsx
// 2D seating chart page — full-height split layout
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SeatingCanvas } from '@/components/seating/SeatingCanvas';
import { ArrowLeft, Sparkles } from 'lucide-react';

function SeatingPageInner() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId') ?? 'demo';
  const spaceId = searchParams.get('spaceId') ?? undefined;
  const [siteName, setSiteName] = useState<string>('');

  // Load site name if available
  useEffect(() => {
    if (siteId && siteId !== 'demo') {
      fetch(`/api/site?siteId=${encodeURIComponent(siteId)}`)
        .then(r => r.json())
        .then((d: { site?: { names?: string[] } }) => {
          if (d?.site?.names) {
            setSiteName(d.site.names.join(' & '));
          }
        })
        .catch(() => null);
    }
  }, [siteId]);

  const handleAIArrange = async () => {
    // Stub: could call /api/ai-blocks or a wedding-graph endpoint
    alert('AI Arrange coming soon! It will automatically seat guests based on your constraints and relationships.');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: 'var(--eg-bg)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid var(--eg-divider)',
          background: 'rgba(245,241,232,0.95)',
          backdropFilter: 'blur(12px)',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Back to dashboard */}
        <Link
          href={siteId !== 'demo' ? `/dashboard?siteId=${siteId}` : '/dashboard'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: 'var(--eg-muted)',
            textDecoration: 'none',
            fontFamily: 'var(--eg-font-body)',
            transition: 'color 0.15s',
          }}
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        {/* Divider */}
        <span style={{ color: 'var(--eg-divider)', fontSize: '1rem' }}>|</span>

        {/* Page title */}
        <h1
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--eg-fg)',
            fontFamily: 'var(--eg-font-heading)',
            margin: 0,
          }}
        >
          Seating Chart
        </h1>

        {siteName && (
          <span style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', fontFamily: 'var(--eg-font-body)' }}>
            — {siteName}
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* AI Arrange button */}
        <button
          onClick={handleAIArrange}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '0.75rem',
            border: '1.5px solid var(--eg-accent)',
            background: 'transparent',
            color: 'var(--eg-accent)',
            fontSize: '0.8rem',
            fontFamily: 'var(--eg-font-body)',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--eg-accent)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--eg-accent)';
          }}
        >
          <Sparkles size={14} />
          AI Arrange
        </button>
      </header>

      {/* ── Canvas + Panel ──────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <SeatingCanvas siteId={siteId} spaceId={spaceId} />
      </div>
    </div>
  );
}

export default function SeatingPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', background: 'var(--eg-bg)',
        fontFamily: 'var(--eg-font-body)', color: 'var(--eg-muted)', fontSize: '0.9rem',
      }}>
        Loading seating chart…
      </div>
    }>
      <SeatingPageInner />
    </Suspense>
  );
}
