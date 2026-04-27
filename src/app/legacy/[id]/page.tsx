// ─────────────────────────────────────────────────────────────
// Pearloom / app/legacy/[id]/page.tsx — Memory Vault
//
// One Life Hub URL per celebration group. Renders every event
// in that celebration as a chronological reading experience —
// the wedding, the engagement party, the first anniversary, the
// baby shower, the first birthday — all stitched into one
// continuous timeline.
//
// The celebration is set on each site's manifest via
// /api/celebrations PATCH. Once two sites share the same id,
// they appear here.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { VaultEntry } from '@/app/api/celebrations/[id]/route';

export const dynamic = 'force-dynamic';

async function fetchVault(id: string): Promise<{ celebration: { id: string; name?: string } | null; entries: VaultEntry[] } | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/celebrations/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.ok) return null;
    return { celebration: data.celebration ?? null, entries: data.entries ?? [] };
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchVault(id);
  const name = data?.celebration?.name ?? 'A Pearloom celebration';
  return {
    title: `${name} · Memory Vault`,
    description: 'Every event from this celebration, stitched into one timeline.',
    other: { robots: 'noindex, nofollow' },
  };
}

export default async function LegacyVaultPage(
  { params, searchParams }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ print?: string }>;
  },
) {
  const { id } = await params;
  const sp = await searchParams;
  const printMode = sp.print === '1';
  const data = await fetchVault(id);
  if (!data || data.entries.length === 0) notFound();

  const { celebration, entries } = data;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8F1E4',
        color: '#0E0D0B',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <header
        style={{
          padding: printMode ? '32px 24px 24px' : '64px clamp(20px, 5vw, 48px) 32px',
          maxWidth: 880,
          margin: '0 auto',
          textAlign: 'center',
          borderBottom: '1px solid rgba(14,13,11,0.08)',
        }}
      >
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.24em',
          textTransform: 'uppercase', color: '#C6703D', marginBottom: 14,
        }}>
          Pearloom · Memory Vault
        </div>
        <h1 style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          margin: '0 0 16px',
        }}>
          {celebration?.name ?? 'A Pearloom celebration'}
        </h1>
        <p style={{ color: 'rgba(14,13,11,0.7)', fontSize: 15, lineHeight: 1.55, margin: '0 0 18px', maxWidth: 560, marginInline: 'auto' }}>
          {entries.length} {entries.length === 1 ? 'event' : 'events'} stitched together — the way you actually lived through them.
        </p>
        {!printMode && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`/legacy/${id}?print=1`}
              style={{
                padding: '9px 18px',
                background: '#0E0D0B',
                color: '#F8F1E4',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: 'none',
              }}
              prefetch={false}
            >
              Print as a memory book
            </Link>
          </div>
        )}
      </header>

      <main
        className={printMode ? '' : 'pl8-dash-stagger'}
        style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: printMode ? '24px' : 'clamp(32px, 5vw, 56px) clamp(20px, 5vw, 48px) 80px',
        }}
      >
        {entries.map((entry, idx) => (
          <VaultEntryCard key={entry.domain} entry={entry} index={idx} printMode={printMode} />
        ))}
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '24px',
          fontSize: 11.5,
          color: 'rgba(14,13,11,0.5)',
          borderTop: '1px solid rgba(14,13,11,0.06)',
        }}
      >
        Stitched by <a href="https://pearloom.com" style={{ color: 'inherit', fontWeight: 600 }}>Pearloom</a>
      </footer>
    </div>
  );
}

function VaultEntryCard({ entry, index, printMode }: { entry: VaultEntry; index: number; printMode: boolean }) {
  return (
    <article
      style={{
        position: 'relative',
        marginTop: index === 0 ? 0 : printMode ? 24 : 36,
        paddingTop: index === 0 ? 0 : printMode ? 24 : 36,
        borderTop: index === 0 ? 'none' : '1px solid rgba(14,13,11,0.08)',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        marginBottom: 14,
      }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#C6703D',
          padding: '4px 10px', borderRadius: 999, background: 'rgba(198,112,61,0.1)',
        }}>
          {entry.kindLabel}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(14,13,11,0.55)' }}>
          {entry.dateLabel}
        </span>
      </div>
      <h2 style={{
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: 'clamp(26px, 3vw, 38px)',
        fontWeight: 500,
        letterSpacing: '-0.015em',
        margin: '0 0 14px',
      }}>
        {entry.title}
      </h2>
      {entry.summary && (
        <p style={{ color: 'rgba(14,13,11,0.78)', fontSize: 15, lineHeight: 1.65, margin: '0 0 18px', maxWidth: 620 }}>
          {entry.summary}
        </p>
      )}
      {entry.coverUrl && (
        <div style={{
          marginBottom: 14,
          aspectRatio: '16 / 9',
          background: '#EDE0C5',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.coverUrl}
            alt={entry.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
      {entry.photos.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(entry.photos.length, 3)}, 1fr)`,
          gap: 8,
          marginBottom: 14,
        }}>
          {entry.photos.slice(0, 3).map((p, i) => (
            <div key={i} style={{ aspectRatio: '1 / 1', background: '#EDE0C5', borderRadius: 6, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
        </div>
      )}
      {!printMode && (
        <Link
          href={entry.sitePath}
          style={{
            fontSize: 12.5, fontWeight: 700, color: '#C6703D',
            textDecoration: 'none', letterSpacing: '0.04em',
          }}
        >
          Open the site →
        </Link>
      )}
    </article>
  );
}
