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
  const [showAIToast, setShowAIToast] = useState(false);

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

  const handleAIArrange = () => {
    setShowAIToast(true);
    setTimeout(() => setShowAIToast(false), 4000);
  };

  return (
    <div
      className="pl8"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: 'var(--cream)',
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
          borderBottom: '1px solid var(--line)',
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
            color: 'var(--ink-muted)',
            textDecoration: 'none',
            fontFamily: 'var(--pl-font-body)',
            transition: 'color var(--pl-dur-instant)',
          }}
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        {/* Divider */}
        <span style={{ color: 'var(--line)', fontSize: '1rem' }}>|</span>

        {/* Page title */}
        <h1
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--ink)',
            fontFamily: 'var(--pl-font-heading)',
            margin: 0,
          }}
        >
          Seating Chart
        </h1>

        {siteName && (
          <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontFamily: 'var(--pl-font-body)' }}>
            — {siteName}
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Undo / Redo buttons */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))}
          title="Undo (⌘Z)"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.4rem 0.75rem', borderRadius: '0.75rem',
            border: '1.5px solid var(--line)', background: 'transparent',
            color: 'var(--ink-muted)', fontSize: '0.78rem',
            fontFamily: 'var(--pl-font-body)', cursor: 'pointer',
          }}
        >
          ⌘Z
        </button>
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }))}
          title="Redo (⌘⇧Z)"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.4rem 0.75rem', borderRadius: '0.75rem',
            border: '1.5px solid var(--line)', background: 'transparent',
            color: 'var(--ink-muted)', fontSize: '0.78rem',
            fontFamily: 'var(--pl-font-body)', cursor: 'pointer',
          }}
        >
          ⌘⇧Z
        </button>

        <div style={{ width: '1px', height: '1.5rem', background: 'var(--line)' }} />

        {/* AI Arrange button — coming soon */}
        <button
          // onClick={handleAIArrange} — not yet available
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '0.75rem',
            border: '1.5px dashed var(--sage-deep)',
            background: 'transparent',
            color: 'var(--sage-deep)',
            fontSize: '0.8rem',
            fontFamily: 'var(--pl-font-body)',
            cursor: 'not-allowed',
            fontWeight: 500,
            opacity: 0.6,
          }}
        >
          <Sparkles size={14} />
          AI Arrange (Coming Soon)
        </button>
      </header>

      {/* ── Canvas + Panel ──────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <SeatingCanvas siteId={siteId} spaceId={spaceId} />
      </div>

      {/* ── AI Arrange coming-soon toast ─────────────────────── */}
      {showAIToast && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--sage-deep)', color: '#fff',
          padding: '0.9rem 1.5rem', borderRadius: '0.875rem',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          fontSize: '0.875rem', fontFamily: 'var(--pl-font-body)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          zIndex: 'var(--z-sticky)', maxWidth: 'calc(100vw - 3rem)',
          animation: 'fadeInUp 0.3s ease',
        }}>
          <Sparkles size={16} color="var(--pl-olive, #5C6B3F)" />
          <div>
            <span style={{ fontWeight: 700, color: '#5C6B3F' }}>AI Arrange</span>
            {' '}is coming soon — it will seat guests automatically based on your relationships and constraints.
          </div>
        </div>
      )}
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}

export default function SeatingPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', background: 'var(--cream)',
        fontFamily: 'var(--pl-font-body)', color: 'var(--ink-muted)', fontSize: '0.9rem',
      }}>
        Loading seating chart…
      </div>
    }>
      <SeatingPageInner />
    </Suspense>
  );
}
