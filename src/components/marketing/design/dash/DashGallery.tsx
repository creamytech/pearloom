'use client';

// The Reel — real photos aggregated across all user sites via
// /api/dashboard/reel. Masonry / strip / slideshow views.

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, EmptyShell, btnInk } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { useUserSites } from './hooks';

interface ReelPhoto {
  id: string;
  url: string;
  siteDomain: string;
  siteName: string | null;
  alt: string | null;
  source: 'cover' | 'hero' | 'chapter' | 'guest';
  uploadedBy?: string | null;
  uploadedAt?: string | null;
}

type View = 'masonry' | 'strip' | 'slideshow';
type Filter = 'all' | 'cover' | 'hero' | 'chapter' | 'guest';

function proxied(url: string, w: number) {
  if (url.includes('googleusercontent') || url.includes('ggpht.com')) {
    return `/api/photos/proxy?url=${encodeURIComponent(url)}&w=${w}&h=${w}`;
  }
  return url;
}

export function DashGallery() {
  const { sites, loading: sitesLoading } = useUserSites();
  const [photos, setPhotos] = useState<ReelPhoto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('masonry');
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState<ReelPhoto | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/dashboard/reel?limit=300', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { photos?: ReelPhoto[] }) => {
        if (cancelled) return;
        setPhotos(data.photos ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!photos) return [];
    if (filter === 'all') return photos;
    return photos.filter((p) => p.source === filter);
  }, [photos, filter]);

  if (!sitesLoading && (!sites || sites.length === 0)) {
    return (
      <DashLayout active="gallery" title="The Reel" subtitle="Create a site and upload a photo — your Reel fills up as you go.">
        <EmptyShell message="Create a site and upload a photo — your Reel fills up as you go." />
      </DashLayout>
    );
  }

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, cover: 0, hero: 0, chapter: 0, guest: 0 };
    if (!photos) return c;
    c.all = photos.length;
    for (const p of photos) c[p.source] += 1;
    return c;
  }, [photos]);

  return (
    <DashLayout
      active="gallery"
      title={
        counts.all > 0 ? (
          <span>
            Every frame,{' '}
            <i style={{ color: PD.plum, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              in one place.
            </i>
          </span>
        ) : (
          <span>
            Your Reel is{' '}
            <i style={{ color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              empty.
            </i>
          </span>
        )
      }
      subtitle="Every photograph across every site you've made — covers, heroes, chapters, guest submissions. Tap any to open full-size."
      actions={
        <div
          style={{
            display: 'flex',
            background: PD.paper3,
            borderRadius: 999,
            padding: 3,
            border: '1px solid rgba(31,36,24,0.1)',
          }}
        >
          {(['masonry', 'strip', 'slideshow'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                borderRadius: 999,
                background: view === v ? PD.ink : 'transparent',
                color: view === v ? PD.paper : PD.ink,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
                fontWeight: 500,
              }}
            >
              {v}
            </button>
          ))}
        </div>
      }
    >

      <main style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto' }}>
        {error && (
          <Panel bg="#F1D7CE" style={{ padding: 14, marginBottom: 16, color: PD.terra, fontSize: 13 }}>
            {error}
          </Panel>
        )}

        {/* Source filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {([
            { k: 'all', l: `All · ${counts.all}` },
            { k: 'cover', l: `Covers · ${counts.cover}` },
            { k: 'hero', l: `Hero · ${counts.hero}` },
            { k: 'chapter', l: `Chapters · ${counts.chapter}` },
            { k: 'guest', l: `Guests · ${counts.guest}` },
          ] as const).map((t) => (
            <button
              key={t.k}
              onClick={() => setFilter(t.k)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                borderRadius: 999,
                background: filter === t.k ? PD.ink : 'transparent',
                color: filter === t.k ? PD.paper : PD.ink,
                border: `1px solid ${filter === t.k ? PD.ink : 'rgba(31,36,24,0.15)'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              {t.l}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingGrid />
        ) : filtered.length === 0 ? (
          <EmptyReel sitesCount={sites?.length ?? 0} />
        ) : view === 'masonry' ? (
          <MasonryGrid photos={filtered} onOpen={setActive} />
        ) : view === 'strip' ? (
          <StripRow photos={filtered} onOpen={setActive} />
        ) : (
          <Slideshow photos={filtered} />
        )}
      </main>

      {active && <Lightbox photo={active} onClose={() => setActive(null)} />}
    </DashLayout>
  );
}

function MasonryGrid({ photos, onOpen }: { photos: ReelPhoto[]; onOpen: (p: ReelPhoto) => void }) {
  const cols = 4;
  const split: ReelPhoto[][] = Array.from({ length: cols }, () => []);
  photos.forEach((p, i) => split[i % cols].push(p));
  return (
    <div
      className="pd-gallery-masonry"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}
    >
      {split.map((col, ci) => (
        <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {col.map((p) => (
            <Thumb key={p.id} p={p} onOpen={onOpen} />
          ))}
        </div>
      ))}
    </div>
  );
}

function StripRow({ photos, onOpen }: { photos: ReelPhoto[]; onOpen: (p: ReelPhoto) => void }) {
  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 20 }}>
      {photos.map((p) => (
        <div key={p.id} style={{ flexShrink: 0, width: 260 }}>
          <Thumb p={p} onOpen={onOpen} fixedHeight={220} />
        </div>
      ))}
    </div>
  );
}

function Slideshow({ photos }: { photos: ReelPhoto[] }) {
  const [i, setI] = useState(0);
  const p = photos[i];
  if (!p) return null;
  return (
    <Panel bg={PD.ink} style={{ padding: 0, overflow: 'hidden', border: 'none' }}>
      <div
        style={{
          height: 520,
          background: `url(${proxied(p.url, 1400)}) center/cover`,
          position: 'relative',
        }}
      >
        {p.alt && (
          <div
            style={{
              position: 'absolute',
              bottom: 18,
              left: 24,
              color: PD.paper,
              background: 'rgba(31,36,24,0.55)',
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 13,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            {p.alt}
          </div>
        )}
      </div>
      <div
        style={{
          padding: '14px 20px',
          color: PD.paper,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <button
          onClick={() => setI((v) => (v === 0 ? photos.length - 1 : v - 1))}
          style={{
            background: PD.paper,
            color: PD.ink,
            border: 'none',
            borderRadius: 999,
            width: 38,
            height: 38,
            fontSize: 16,
            cursor: 'pointer',
          }}
          aria-label="Previous"
        >
          ←
        </button>
        <button
          onClick={() => setI((v) => (v + 1) % photos.length)}
          style={{
            background: PD.paper,
            color: PD.ink,
            border: 'none',
            borderRadius: 999,
            width: 38,
            height: 38,
            fontSize: 16,
            cursor: 'pointer',
          }}
          aria-label="Next"
        >
          →
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{p.siteName ?? p.siteDomain}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {p.source} · {p.uploadedAt ? new Date(p.uploadedAt).toLocaleDateString() : ''}
          </div>
        </div>
        <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55 }}>
          {i + 1} OF {photos.length}
        </div>
      </div>
    </Panel>
  );
}

function Thumb({ p, onOpen, fixedHeight }: { p: ReelPhoto; onOpen: (p: ReelPhoto) => void; fixedHeight?: number }) {
  const h = fixedHeight ?? 180 + ((p.id.length * 47) % 180);
  return (
    <button
      onClick={() => onOpen(p)}
      style={{
        display: 'block',
        width: '100%',
        height: h,
        background: `#${(parseInt(p.id.slice(-6), 16) % 0xffffff).toString(16).padStart(6, '0')}`,
        backgroundImage: `url(${proxied(p.url, 600)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: 14,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 180ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '18px 12px 10px',
          background: 'linear-gradient(to top, rgba(31,36,24,0.7), transparent)',
          color: PD.paper,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.75 }}>
          {p.source.toUpperCase()}
        </div>
        {p.siteName && (
          <div
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 12,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p.siteName}
          </div>
        )}
      </div>
    </button>
  );
}

function LoadingGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {[200, 280, 220, 300, 260, 240, 200, 320].map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            borderRadius: 14,
            background: `linear-gradient(120deg, ${PD.paper3} 40%, ${PD.paper2} 50%, ${PD.paper3} 60%)`,
            backgroundSize: '300% 100%',
            animation: 'pl-pearl-shimmer 2.4s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

function EmptyReel({ sitesCount }: { sitesCount: number }) {
  return (
    <Panel bg={PD.paperCard} style={{ padding: 60, textAlign: 'center' }}>
      <div
        style={{
          ...DISPLAY_STYLE,
          fontSize: 30,
          fontStyle: 'italic',
          color: PD.olive,
          marginBottom: 12,
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}
      >
        Nothing yet.
      </div>
      <p style={{ fontSize: 14, color: PD.inkSoft, maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.55 }}>
        {sitesCount === 0
          ? "Create your first site and upload some photos — they'll collect here."
          : "Your sites have no photos yet. Open any site to add a cover, hero, or chapter images."}
      </p>
      <Link href="/dashboard" style={{ ...btnInk, textDecoration: 'none' }}>
        ← Back to Sites
      </Link>
    </Panel>
  );
}

function Lightbox({ photo, onClose }: { photo: ReelPhoto; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(31,36,24,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={proxied(photo.url, 1600)}
          alt={photo.alt ?? ''}
          style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }}
        />
        <div
          style={{
            color: PD.paper,
            fontSize: 13,
            fontFamily: 'var(--pl-font-body)',
            textAlign: 'center',
          }}
        >
          {photo.siteName ?? photo.siteDomain} · {photo.source}
          {photo.uploadedAt && ` · ${new Date(photo.uploadedAt).toLocaleDateString()}`}
        </div>
        <button
          onClick={onClose}
          style={{
            background: PD.paper,
            color: PD.ink,
            border: 'none',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Inline style tags for responsive
const _style: CSSProperties = {};
void _style;
