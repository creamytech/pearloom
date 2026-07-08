'use client';

// ─────────────────────────────────────────────────────────────
// The Reel — every photograph across every site the host has made,
// aggregated by /api/dashboard/reel. Restyled to the design-handoff
// "Gallery" screen (kits/dashboard/ScreensStudio → Gallery):
//   · a three-beat intake ribbon (guests add → your nod → the wall)
//   · the moderation queue + a "guests can add" share card, side by side
//   · album/source filter chips + a masonry/strip/slideshow view switch
//   · the masonry wall itself, real photos, tinted-tile fallback
//
// Every value is real: photos from the reel endpoint, pending photos
// from /api/guest-photos/moderate, the upload link from the selected
// site's real /sites/{slug}/upload route. Nothing is invented — the
// counts, the queue, and the wall all reflect the host's own data,
// and each surface has an honest empty state. NO stock photography:
// a real <img> per item, a warm tinted tile with the Pear glyph when
// a url is missing or fails to load.
//
// Tokens: the .pl8 dashboard chrome aliases (--ink / --cream* /
// --card / --line + the sage / peach / lavender / gold accents),
// NOT the editor-only --pl-chrome-* family.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { useIsMobile } from '@/components/pearloom/redesign/use-nav-hooks';
import { Icon, PearloomGlyph } from '@/components/pearloom/motifs';
import { buildSiteUrl, formatSiteDisplayUrl } from '@/lib/site-urls';
import { useSelectedSite, useUserSites, type SiteSummary } from './hooks';
import { EmptyState } from '@/components/shell/EmptyState';
import { COVER_FOCUS } from '@/lib/cover-crop';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

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

// Deterministic warm tint per photo — the tile shows while a real
// <img> loads and stays if it fails, so a broken url degrades to a
// paper tile with the Pear glyph, never a stock image or a dead box.
const TINTS = ['var(--sage-tint)', 'var(--peach-bg)', 'var(--lavender-bg)'];
function tintFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

const SOURCE_LABEL: Record<ReelPhoto['source'], string> = {
  cover: 'cover',
  hero: 'hero',
  chapter: 'chapter',
  guest: 'guest',
};

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
      .then((data: { photos?: Array<Partial<ReelPhoto>> }) => {
        if (cancelled) return;
        // Harden every row: an unknown `source` or a missing `id` on
        // ONE photo used to kill the whole page to the error boundary.
        // Unknown sources bucket as 'guest', the key falls back to the
        // url, and rows with no url at all are skipped.
        const KNOWN = new Set<ReelPhoto['source']>(['cover', 'hero', 'chapter', 'guest']);
        const photos: ReelPhoto[] = (data.photos ?? [])
          .filter((p): p is Partial<ReelPhoto> & { url: string } => typeof p?.url === 'string' && p.url.length > 0)
          .map((p) => ({
            id: typeof p.id === 'string' && p.id.length > 0 ? p.id : p.url,
            url: p.url,
            siteDomain: p.siteDomain ?? '',
            siteName: p.siteName ?? null,
            alt: p.alt ?? null,
            source: p.source && KNOWN.has(p.source) ? p.source : 'guest',
            uploadedBy: p.uploadedBy ?? null,
            uploadedAt: p.uploadedAt ?? null,
          }));
        setResult({ photos });
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

  // Empty state — AFTER the hooks so the order is stable on every
  // render (rules-of-hooks). One empty state: the header carries the
  // eyebrow + title, the card below carries the sentence + action.
  if (!sitesLoading && (!sites || sites.length === 0)) {
    return (
      <DashLayout active="gallery" hideTopbar>
        <main style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 60px', maxWidth: 1080, margin: '0 auto' }}>
          <ReelHeader />
          <NoSitesCard />
        </main>
      </DashLayout>
    );
  }

  const ALBUMS: Array<{ k: Filter; l: string }> = [
    { k: 'all', l: 'All' },
    { k: 'cover', l: 'Covers' },
    { k: 'hero', l: 'Hero' },
    { k: 'chapter', l: 'Chapters' },
    { k: 'guest', l: 'From guests' },
  ];

  return (
    <DashLayout active="gallery" hideTopbar>
      <main style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 60px', maxWidth: 1240, margin: '0 auto' }}>
        <ReelHeader />

        {/* The three-beat intake ribbon. */}
        <IntakeRibbon />

        {/* Moderation queue + the "guests can add" share card. */}
        <IntakeRow />

        {error && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: 16,
              borderRadius: 12,
              background: 'var(--peach-bg)',
              border: '1px solid var(--peach-ink)',
              color: 'var(--peach-ink)',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Album filter chips + view switch — ONE row, hscroll on
            phones. Counts are real; chips read {label} · {count}. */}
        <div className="pl-hscroll" style={{ gap: 8, marginBottom: 20, paddingBottom: 2, alignItems: 'center' }}>
          {ALBUMS.map((t) => (
            <Chip key={t.k} on={filter === t.k} onClick={() => setFilter(t.k)}>
              {t.l} · {counts[t.k]}
            </Chip>
          ))}
          <span aria-hidden style={{ width: 1, height: 22, background: 'var(--line)', flexShrink: 0 }} />
          {(['masonry', 'strip', 'slideshow'] as const).map((v) => (
            <Chip key={v} on={view === v} onClick={() => setView(v)} style={{ textTransform: 'capitalize' }}>
              {v}
            </Chip>
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

// ── Editorial header — mono eyebrow (gold tick) + letterpress title ─
function ReelHeader() {
  return (
    <header style={{ marginBottom: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: MONO,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
        }}
      >
        <span aria-hidden style={{ width: 14, height: 1, background: 'var(--pl-gold, #C19A4B)', flexShrink: 0 }} />
        The Reel
      </div>
      <h1
        className="pl-letterpress"
        style={{
          fontFamily: DISPLAY,
          fontSize: 'clamp(28px, 3.4vw, 40px)',
          fontWeight: 500,
          lineHeight: 1.04,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          margin: '6px 0 0',
        }}
      >
        Every frame, <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>gathered.</span>
      </h1>
    </header>
  );
}

// ── The intake ribbon ───────────────────────────────────────────
// A quiet explainer of the flow: guests add on the live site → the
// host approves → it joins the wall. Static, educational chrome; no
// data, so nothing to fabricate.
function IntakeRibbon() {
  const steps: Array<[icon: string, label: string, color: string]> = [
    ['image', 'Guests add on the site', 'var(--sage)'],
    ['check', 'Your nod', 'var(--peach-ink)'],
    ['sparkles', 'Live on the wall', 'var(--lavender-ink)'],
  ];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: '12px 18px',
        marginBottom: 20,
        borderRadius: 12,
        background: 'var(--cream-2)',
        border: '1px solid var(--line)',
      }}
    >
      {steps.map(([ic, l, c], i) => (
        <span key={l} style={{ display: 'contents' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--card)',
                color: c,
                border: `1px solid ${c}`,
              }}
            >
              <Icon name={ic} size={13} color={c} />
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{l}</span>
          </span>
          {i < steps.length - 1 ? (
            <span aria-hidden style={{ flex: 1, minWidth: 24, margin: '0 12px', height: 0, borderTop: '2px dashed var(--line)' }} />
          ) : null}
        </span>
      ))}
    </div>
  );
}

// ── The intake row: moderation queue + the share card ───────────
interface PendingPhoto {
  id: string;
  siteSubdomain: string;
  siteName: string;
  uploaderName: string;
  caption: string | null;
  url: string;
  createdAt: string;
}

function IntakeRow() {
  const [photos, setPhotos] = useState<PendingPhoto[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openUp, setOpenUp] = useState(true);
  const { site } = useSelectedSite();
  const isNarrow = useIsMobile(900);

  // Guests upload through /sites/[domain]/upload; each lands as
  // `pending` and waits here for the host's nod before it can show on
  // the live wall. (Explicit content is auto-rejected upstream.)
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

  const showShare = Boolean(site);
  const twoCol = showShare && openUp && !isNarrow;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: twoCol ? 'minmax(0, 1fr) 280px' : '1fr',
        gap: 20,
        marginBottom: 24,
        alignItems: 'flex-start',
      }}
    >
      {/* LEFT — the moderation queue (or its honest resting states). */}
      {photos === null ? (
        <QueueSkeleton />
      ) : photos.length === 0 ? (
        <CaughtUpCard />
      ) : (
        <ModerationQueueCard photos={photos} busy={busy} act={act} />
      )}

      {/* RIGHT — the "guests can add" share card, tied to the
          selected celebration. Collapses to a slim reopen strip. */}
      {showShare && site ? (
        openUp ? (
          <GuestUploadCard site={site} onCollapse={() => setOpenUp(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setOpenUp(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 12,
              background: 'var(--card)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 500,
              width: isNarrow ? '100%' : undefined,
              justifySelf: isNarrow ? 'stretch' : 'end',
            }}
          >
            <Icon name="image" size={14} color="var(--sage-deep)" /> Show the upload link
          </button>
        )
      ) : null}
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div style={cardStyle(20)}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ ...shimmer, width: 140, height: 12, borderRadius: 999 }} />
        <div style={{ ...shimmer, width: 24, height: 12, borderRadius: 999 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ ...shimmer, height: 168, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  );
}

function CaughtUpCard() {
  // The shared EmptyState inside the route's card chrome — one
  // empty-state pattern product-wide (GRAND-PLAN-2 A.1).
  return (
    <div style={cardStyle(16)}>
      <EmptyState
        size="compact"
        title="All caught up."
        description="Nothing waiting. New guest photos land here."
      />
    </div>
  );
}

function ModerationQueueCard({
  photos,
  busy,
  act,
}: {
  photos: PendingPhoto[];
  busy: string | null;
  act: (id: string, action: 'approved' | 'rejected') => void;
}) {
  return (
    <div style={{ ...cardStyle(20), border: '1px solid var(--gold-line, var(--pl-gold))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', color: 'var(--peach-ink)' }}>AWAITING YOUR NOD</span>
        <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--pl-gold)', color: 'var(--pl-ink)', borderRadius: 999, padding: '1px 8px' }}>
          {photos.length}
        </span>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)', flex: 1, minWidth: 160 }}>Guests added these. Approve what fits the wall.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
        {photos.map((p) => (
          <div key={p.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--card)' }}>
            <PendingImage url={p.url} />
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>
                <strong>{p.uploaderName}</strong>
                {p.siteName ? <span style={{ color: 'var(--ink-muted)' }}> · {p.siteName}</span> : null}
              </div>
              {p.caption ? (
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2, fontStyle: 'italic' }}>“{p.caption}”</div>
              ) : null}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => void act(p.id, 'approved')}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    borderRadius: 999,
                    background: 'var(--ink)',
                    color: 'var(--cream)',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: busy === p.id ? 'wait' : 'pointer',
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
                    color: 'var(--peach-ink)',
                    border: '1px solid var(--peach-ink)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: busy === p.id ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: busy === p.id ? 0.5 : 1,
                  }}
                >
                  Hide
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingImage({ url }: { url: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div style={{ height: 110, position: 'relative', background: tintFor(url), display: 'grid', placeItems: 'center' }}>
      {broken ? (
        <PearloomGlyph size={28} color="var(--ink-soft)" />
      ) : (
        <img
          src={proxied(url, 480)}
          alt=""
          onError={() => setBroken(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: COVER_FOCUS, display: 'block' }}
        />
      )}
    </div>
  );
}

function GuestUploadCard({ site, onCollapse }: { site: SiteSummary; onCollapse: () => void }) {
  const [copied, setCopied] = useState(false);
  const displayUrl = formatSiteDisplayUrl(site.domain, 'upload');
  const fullUrl = buildSiteUrl(site.domain, 'upload');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the link is shown above to copy by hand */
    }
  };
  return (
    <div style={cardStyle(20)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: MONO,
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
          }}
        >
          <span aria-hidden style={{ width: 12, height: 1, background: 'var(--pl-gold, #C19A4B)' }} />
          Guests can add
        </span>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-muted)', display: 'inline-flex', padding: 2 }}
        >
          <Icon name="chev-up" size={14} />
        </button>
      </div>
      <div
        style={{
          width: 92,
          height: 92,
          margin: '4px auto 12px',
          borderRadius: 12,
          background: 'var(--cream-3)',
          border: '1px solid var(--line)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <PearloomGlyph size={40} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--ink-muted)', textAlign: 'center', marginBottom: 12, wordBreak: 'break-all' }}>
        {displayUrl}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--line-soft)' }}>
        <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)' }}>Review before posting</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--sage-deep)' }}>ON</span>
      </div>
      <button
        type="button"
        onClick={copy}
        style={{
          width: '100%',
          marginTop: 8,
          padding: '8px 12px',
          borderRadius: 999,
          background: 'transparent',
          border: '1px solid var(--line)',
          color: 'var(--ink)',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Icon name={copied ? 'check' : 'copy'} size={13} color={copied ? 'var(--sage-deep)' : 'var(--ink)'} />
        {copied ? 'Copied' : 'Copy upload link'}
      </button>
      <Link
        href="/dashboard/keepsakes"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--line-soft)',
          fontSize: 11.5,
          color: 'var(--ink-muted)',
          textDecoration: 'none',
          lineHeight: 1.4,
        }}
      >
        Weave the Reel into the memory book
        <Icon name="arrow-right" size={12} color="var(--peach-ink)" />
      </Link>
    </div>
  );
}

// ── Chip — the shared filter / view pill ────────────────────────
function Chip({
  on,
  onClick,
  children,
  style,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        fontSize: 12,
        borderRadius: 999,
        background: on ? 'var(--ink)' : 'transparent',
        color: on ? 'var(--cream)' : 'var(--ink)',
        border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── The wall ────────────────────────────────────────────────────
function MasonryGrid({ photos, onOpen }: { photos: ReelPhoto[]; onOpen: (p: ReelPhoto) => void }) {
  // Follow the viewport: 2-up on phones, 3-up on tablets, 4-up up top.
  const isPhone = useIsMobile(640);
  const isTablet = useIsMobile(1024);
  const cols = isPhone ? 2 : isTablet ? 3 : 4;
  const split: ReelPhoto[][] = Array.from({ length: cols }, () => []);
  photos.forEach((p, i) => split[i % cols].push(p));
  return (
    <div className="pl8-dash-stagger" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
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

function Thumb({ p, onOpen, fixedHeight }: { p: ReelPhoto; onOpen: (p: ReelPhoto) => void; fixedHeight?: number }) {
  const h = fixedHeight ?? 180 + ((p.id.length * 47) % 180);
  const [broken, setBroken] = useState(false);
  return (
    <button
      onClick={() => onOpen(p)}
      style={{
        display: 'block',
        width: '100%',
        height: h,
        background: tintFor(p.id),
        borderRadius: 14,
        border: '1px solid var(--line)',
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
        e.currentTarget.style.boxShadow = `0 0 0 1px var(--pl-gold, #C19A4B), 0 18px 40px rgba(40,28,12,0.16)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(40,28,12,0.06)';
      }}
    >
      {broken ? (
        <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 0.5 }}>
          <PearloomGlyph size={36} />
        </span>
      ) : (
        <img
          src={proxied(p.url, 600)}
          alt={p.alt ?? ''}
          onError={() => setBroken(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: COVER_FOCUS, display: 'block' }}
        />
      )}
      {p.source === 'cover' ? (
        <span
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            padding: '3px 9px',
            borderRadius: 999,
            background: 'var(--pl-gold)',
            color: 'var(--pl-ink)',
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: '0.12em',
          }}
        >
          COVER
        </span>
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 'auto 0 0 0',
          padding: '18px 12px 10px',
          background: 'linear-gradient(to top, rgba(24,24,27,0.7), transparent)',
          color: 'var(--pl-cream)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', opacity: 0.85 }}>
          {SOURCE_LABEL[p.source].toUpperCase()}
        </div>
        {p.siteName ? (
          <div
            style={{
              fontFamily: DISPLAY,
              fontStyle: 'italic',
              fontSize: 13,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p.siteName}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function Slideshow({ photos }: { photos: ReelPhoto[] }) {
  const [i, setI] = useState(0);
  const p = photos[i];
  if (!p) return null;
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--ink)', border: '1px solid var(--line)' }}>
      <div style={{ height: 'clamp(260px, 60vw, 520px)', background: tintFor(p.id), position: 'relative' }}>
        <img
          src={proxied(p.url, 1400)}
          alt={p.alt ?? ''}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: COVER_FOCUS, display: 'block' }}
        />
        {p.alt ? (
          <div
            style={{
              position: 'absolute',
              bottom: 18,
              left: 24,
              color: 'var(--pl-cream)',
              background: 'rgba(24,24,27,0.55)',
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 13,
            }}
          >
            {p.alt}
          </div>
        ) : null}
      </div>
      <div style={{ padding: '14px 20px', color: 'var(--pl-cream)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => setI((v) => (v === 0 ? photos.length - 1 : v - 1))}
          style={navBtn}
          aria-label="Previous"
        >
          ←
        </button>
        <button onClick={() => setI((v) => (v + 1) % photos.length)} style={navBtn} aria-label="Next">
          →
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.siteName ?? p.siteDomain}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {p.source}
            {p.uploadedAt ? ` · ${new Date(p.uploadedAt).toLocaleDateString()}` : ''}
          </div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, opacity: 0.55 }}>
          {i + 1} OF {photos.length}
        </div>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px, 100%), 1fr))', gap: 14 }}>
      {[200, 280, 220, 300, 260, 240, 200, 320].map((h, i) => (
        <div key={i} style={{ ...shimmer, height: h, borderRadius: 14 }} />
      ))}
    </div>
  );
}

function EmptyReel({ sitesCount }: { sitesCount: number }) {
  return (
    <div style={{ ...cardStyle(60), textAlign: 'center' }}>
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: 30,
          fontStyle: 'italic',
          color: 'var(--sage-deep)',
          marginBottom: 12,
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}
      >
        Nothing yet.
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.55 }}>
        {sitesCount === 0
          ? "Create your first site and upload some photos — they'll collect here."
          : 'Your sites have no photos yet. Open any site to add a cover, hero, or chapter images.'}
      </p>
      <Link href="/dashboard" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
        <Icon name="arrow-left" size={13} /> Back to Sites
      </Link>
    </div>
  );
}

function NoSitesCard() {
  return (
    <div style={cardStyle(16)}>
      <EmptyState
        icon={<PearloomGlyph size={28} />}
        title="Nothing on the reel yet."
        description="Create a site and upload a photo — your Reel fills up as you go."
        actions={
          <Link href="/wizard/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            Begin a thread <Icon name="sparkles" size={12} color="var(--cream)" />
          </Link>
        }
      />
    </div>
  );
}

function Lightbox({ photo, onClose }: { photo: ReelPhoto; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(24,24,27,0.85)',
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
        style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
      >
        <img
          src={proxied(photo.url, 1600)}
          alt={photo.alt ?? ''}
          style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }}
        />
        <div style={{ color: 'var(--pl-cream)', fontSize: 13, textAlign: 'center' }}>
          {photo.siteName ?? photo.siteDomain} · {photo.source}
          {photo.uploadedAt && ` · ${new Date(photo.uploadedAt).toLocaleDateString()}`}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'var(--pl-cream)',
            color: 'var(--pl-ink)',
            border: 'none',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ── shared style atoms ──────────────────────────────────────────
function cardStyle(padding: number): React.CSSProperties {
  return {
    background: 'var(--card)',
    border: '1px solid var(--line)',
    borderRadius: 16,
    padding,
  };
}

const shimmer: React.CSSProperties = {
  background: 'linear-gradient(120deg, var(--cream-3) 40%, var(--cream-2) 50%, var(--cream-3) 60%)',
  backgroundSize: '300% 100%',
  animation: 'pl-pearl-shimmer 2.4s ease-in-out infinite',
};

const navBtn: React.CSSProperties = {
  background: 'var(--pl-cream)',
  color: 'var(--pl-ink)',
  border: 'none',
  borderRadius: 999,
  width: 38,
  height: 38,
  fontSize: 16,
  cursor: 'pointer',
  flexShrink: 0,
};
