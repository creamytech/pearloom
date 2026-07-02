'use client';

// The Reel — real photos aggregated across all user sites via
// /api/dashboard/reel. Masonry / strip / slideshow views.

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, EmptyShell, btnInk } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';
import { useIsMobile } from '@/components/pearloom/redesign/use-nav-hooks';
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
  // Tagged result so loading + error + photos all derive from
  // a single state value — no setState-in-effect cascade.
  type ReelResult = { photos: ReelPhoto[] } | { error: string };
  const [result, setResult] = useState<ReelResult | null>(null);
  const [view, setView] = useState<View>('masonry');
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState<ReelPhoto | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/reel?limit=300', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { photos?: ReelPhoto[] }) => {
        if (cancelled) return;
        setResult({ photos: data.photos ?? [] });
      })
      .catch((e) => {
        if (cancelled) return;
        setResult({ error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived from the tagged result. `loading` is null-result;
  // `photos` is empty when erroring.
  const loading = result === null;
  const error = result && 'error' in result ? result.error : null;
  const photos: ReelPhoto[] | null = result && 'photos' in result ? result.photos : null;

  const filtered = useMemo(() => {
    if (!photos) return [];
    if (filter === 'all') return photos;
    return photos.filter((p) => p.source === filter);
  }, [photos, filter]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, cover: 0, hero: 0, chapter: 0, guest: 0 };
    if (!photos) return c;
    c.all = photos.length;
    for (const p of photos) c[p.source] += 1;
    return c;
  }, [photos]);

  // Empty state — moved AFTER the hooks so the order is the
  // same on every render (rules-of-hooks).
  if (!sitesLoading && (!sites || sites.length === 0)) {
    // ONE empty state (plan rule 5): the header never restates
    // emptiness — the card below carries the sentence + action.
    return (
      <DashLayout active="gallery" hideTopbar>
        <div style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 60px', maxWidth: 1080, margin: '0 auto' }}>
          <PageIntro eyebrow="The Reel" title="Every frame, in one place." />
          <EmptyShell message="Create a site and upload a photo — your Reel fills up as you go." />
        </div>
      </DashLayout>
    );
  }

  const viewSwitcher = (
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
  );

  return (
    <DashLayout active="gallery" hideTopbar>
      <main style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 60px', maxWidth: 1240, margin: '0 auto' }}>
        {/* Quiet header (plan rule 1): one line, no paragraph — the
            grid explains itself. Never restates emptiness (rule 5). */}
        <PageIntro eyebrow="The Reel" title="Every frame, in one place." style={{ marginBottom: 14 }} />

        {/* View toggle + source filter — ONE row (plan rule 6),
            hscroll on phones. */}
        <div className="pl-hscroll" style={{ gap: 8, marginBottom: 20, paddingBottom: 2, alignItems: 'center' }}>
          {viewSwitcher}
          <span aria-hidden style={{ width: 1, height: 22, background: 'rgba(31,36,24,0.12)', flexShrink: 0 }} />
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

        {error && (
          <Panel bg="#F1D7CE" style={{ padding: 14, marginBottom: 16, color: PD.terra, fontSize: 13 }}>
            {error}
          </Panel>
        )}

        <PhotoModerationQueue />

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

// ── Pending guest-photo moderation ──────────────────────────────
// Guests upload through /sites/[domain]/upload; each lands as
// `pending` and waits here for the host's nod before it can show on
// the live wall. (Explicit content is auto-rejected upstream, so
// this queue should never carry anything unpleasant.)
interface PendingPhoto {
  id: string;
  siteSubdomain: string;
  siteName: string;
  uploaderName: string;
  caption: string | null;
  url: string;
  createdAt: string;
}

function PhotoModerationQueue() {
  const [photos, setPhotos] = useState<PendingPhoto[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/guest-photos/moderate?status=pending', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ photos: [] })))
      .then((data: { photos?: PendingPhoto[] }) => {
        if (!cancelled) setPhotos(data.photos ?? []);
      })
      .catch(() => {
        if (!cancelled) setPhotos([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const act = async (id: string, action: 'approved' | 'rejected') => {
    if (busy) return;
    setBusy(id);
    try {
      const r = await fetch('/api/guest-photos/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: id, action }),
      });
      if (r.ok) setPhotos((prev) => (prev ?? []).filter((p) => p.id !== id));
    } catch {
      /* leave the card; the host can retry */
    } finally {
      setBusy(null);
    }
  };

  // Nothing pending (or still loading) → render nothing. The queue
  // only appears when the host actually has photos to review.
  if (!photos || photos.length === 0) return null;

  return (
    <Panel bg={PD.paperCard} style={{ padding: 20, marginBottom: 24, border: `1px solid ${PD.gold}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ ...MONO_STYLE, fontSize: 10, color: PD.olive }}>NEEDS YOUR NOD</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: PD.gold,
            color: PD.ink,
            borderRadius: 999,
            padding: '1px 8px',
          }}
        >
          {photos.length}
        </span>
        <span style={{ fontSize: 13, color: PD.inkSoft }}>
          Guest photos waiting to join the wall.
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        {photos.map((p) => (
          <div
            key={p.id}
            style={{
              borderRadius: 14,
              overflow: 'hidden',
              border: `1px solid ${PD.line ?? 'rgba(31,36,24,0.15)'}`,
              background: PD.paper3,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                aspectRatio: '4/5',
                background: `url(${proxied(p.url, 480)}) center/cover`,
              }}
            />
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: PD.ink }}>{p.uploaderName}</div>
                <div style={{ fontSize: 11, color: PD.inkSoft }}>{p.siteName}</div>
                {p.caption && (
                  <div style={{ fontSize: 11.5, color: PD.inkSoft, marginTop: 2, fontStyle: 'italic' }}>
                    “{p.caption}”
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => void act(p.id, 'approved')}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    borderRadius: 999,
                    background: PD.ink,
                    color: PD.paper,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    opacity: busy === p.id ? 0.5 : 1,
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => void act(p.id, 'rejected')}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 999,
                    background: 'transparent',
                    color: PD.terra,
                    border: `1px solid ${PD.terra}`,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    opacity: busy === p.id ? 0.5 : 1,
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MasonryGrid({ photos, onOpen }: { photos: ReelPhoto[]; onOpen: (p: ReelPhoto) => void }) {
  // 4-up was hardcoded — at 390px that's four 75px slivers. Follow
  // the viewport instead: 2-up on phones, 3-up on tablets.
  const isPhone = useIsMobile(640);
  const isTablet = useIsMobile(1024);
  const cols = isPhone ? 2 : isTablet ? 3 : 4;
  const split: ReelPhoto[][] = Array.from({ length: cols }, () => []);
  photos.forEach((p, i) => split[i % cols].push(p));
  return (
    <div
      className="pd-gallery-masonry pl8-dash-stagger"
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
          height: 'clamp(260px, 60vw, 520px)',
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
        boxShadow: '0 2px 8px rgba(40,28,12,0.06)',
        transition: 'transform 360ms cubic-bezier(0.16,1,0.3,1), box-shadow 360ms cubic-bezier(0.16,1,0.3,1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        // 1px gold ring (BRAND: gold is the punctuation hairline) +
        // a deeper lift shadow — matches the templates card language.
        e.currentTarget.style.boxShadow = `0 0 0 1px ${PD.gold}, 0 18px 40px rgba(40,28,12,0.16)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(40,28,12,0.06)';
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px, 100%), 1fr))', gap: 14 }}>
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
      <Link href="/dashboard" className="pl8-btnfx" style={{ ...btnInk, textDecoration: 'none' }}>
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
