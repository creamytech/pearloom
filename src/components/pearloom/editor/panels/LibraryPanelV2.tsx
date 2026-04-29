'use client';

// ─────────────────────────────────────────────────────────────
// LibraryPanelV2 — the unified asset drawer.
//
// Replaces the old two-panel split (Decor tab + Library tab)
// with one cabinet that has three tabs:
//
//   Your stuff  — photos + AI-painted marks + saved drafts +
//                 SVG uploads. Everything the host owns.
//   Editorial   — Pearloom's curated motif catalog (line +
//                 fill icon set, signature glyphs).
//   Iconify     — IconifyBrowser long-tail search.
//
// Visual-first: every tile is a thumbnail, drag- + click-able.
// "Use as …" floats on hover so the host can apply directly
// to a decor slot (divider / stamp / confetti / footer / accent)
// without leaving the panel. Atelier (the prompt composer) lives
// behind a small "Paint with Pear" pill on Your stuff, not as a
// front-and-center form.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';
import { EDITORIAL_GROUPS } from '../../editorial-icons';
import {
  ICON_LIBRARY,
  flattenDecorAssets,
  ASSET_DRAG_MIME,
  ICON_DRAG_MIME,
  type DecorAsset,
} from '../asset-library-data';
import { IconifyBrowser } from '../IconifyBrowser';
import { startDecorJob, completeDecorJob } from '@/lib/decor-bus';
import { pushDraft, pushSectionStampsDraft, buildAutoSummary } from './decor-shared';
import type { DecorDraft, SectionStampsDraft } from '@/types';

interface LibraryPhoto {
  id: string;
  url: string;
  filename?: string | null;
  caption?: string | null;
  source?: string;
  created_at?: string;
}

type LibraryTab = 'mine' | 'editorial' | 'iconify';

// Decor "slots" — the manifest fields the host can apply a piece
// to. Each tile's hover overlay surfaces the right list of
// "Use as …" actions; clicking one writes the piece's URL to
// the matching manifest field.
type DecorSlot = 'divider' | 'sectionStamps:hero' | 'sectionStamps:our-story' | 'sectionStamps:details' | 'sectionStamps:schedule' | 'sectionStamps:travel' | 'sectionStamps:registry' | 'sectionStamps:gallery' | 'sectionStamps:rsvp' | 'sectionStamps:faq' | 'confetti' | 'footerBouquet' | 'accent';

const SLOT_LABEL: Record<DecorSlot, string> = {
  divider: 'Section divider',
  'sectionStamps:hero': 'Hero stamp',
  'sectionStamps:our-story': 'Story stamp',
  'sectionStamps:details': 'Details stamp',
  'sectionStamps:schedule': 'Schedule stamp',
  'sectionStamps:travel': 'Travel stamp',
  'sectionStamps:registry': 'Registry stamp',
  'sectionStamps:gallery': 'Gallery stamp',
  'sectionStamps:rsvp': 'RSVP stamp',
  'sectionStamps:faq': 'FAQ stamp',
  confetti: 'Confetti',
  footerBouquet: 'Closing flourish',
  accent: 'Hero accent',
};

const COMMON_SLOTS: DecorSlot[] = ['divider', 'footerBouquet', 'accent', 'confetti'];

export function LibraryPanelV2({
  manifest,
  onChange,
}: {
  manifest?: StoryManifest;
  onChange?: (m: StoryManifest) => void;
}) {
  const [tab, setTab] = useState<LibraryTab>('mine');
  const [query, setQuery] = useState('');
  const [media, setMedia] = useState<LibraryPhoto[] | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [atelierOpen, setAtelierOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const picker = useGooglePhotosPicker();

  const decorAssets = useMemo(() => flattenDecorAssets(manifest), [manifest]);

  const loadMedia = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const r = await fetch('/api/user-media', { cache: 'no-store' });
      if (!r.ok) throw new Error('Failed');
      const d = (await r.json()) as { media?: LibraryPhoto[] };
      setMedia(d.media ?? []);
    } catch {
      setMedia([]);
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  useEffect(() => { void loadMedia(); }, [loadMedia]);

  // ── Filtered counts per tab (for badges) ────────────────────
  const photoCount = media?.length ?? 0;
  const decorCount = decorAssets.length;
  const editorialCount = EDITORIAL_GROUPS.reduce((a, g) => a + g.items.length, 0);

  // ── Search filtering across all tabs ────────────────────────
  const q = query.trim().toLowerCase();
  const photosFiltered = useMemo(() => {
    if (!media) return [];
    if (!q) return media;
    return media.filter((m) => (m.filename ?? '').toLowerCase().includes(q) || (m.caption ?? '').toLowerCase().includes(q));
  }, [media, q]);

  const decorFiltered = useMemo(() => {
    if (!q) return decorAssets;
    return decorAssets.filter((a) => a.label.toLowerCase().includes(q) || (a.usage ?? '').toLowerCase().includes(q));
  }, [decorAssets, q]);

  const editorialFiltered = useMemo(() => {
    if (!q) return EDITORIAL_GROUPS;
    return EDITORIAL_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((d) => d.name.toLowerCase().includes(q) || d.label.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  // ── Apply a decor URL to a manifest slot ────────────────────
  function applyToSlot(url: string, slot: DecorSlot) {
    if (!manifest || !onChange) return;
    const lib = { ...(manifest.decorLibrary ?? {}) };
    if (slot.startsWith('sectionStamps:')) {
      const section = slot.slice('sectionStamps:'.length);
      lib.sectionStamps = { ...(lib.sectionStamps ?? {}), [section]: url };
    } else if (slot === 'accent') {
      // Hero accent lives at the top level, not inside decorLibrary.
      const next = { ...manifest, aiAccentUrl: url } as unknown as StoryManifest;
      onChange(next);
      return;
    } else {
      lib[slot as 'divider' | 'confetti' | 'footerBouquet'] = url;
    }
    onChange({ ...manifest, decorLibrary: lib } as StoryManifest);
  }

  // ── Photo upload → R2 ──────────────────────────────────────
  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const accepted = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (accepted.length === 0) return;
    setUploading(true);
    try {
      const payload = await Promise.all(accepted.map(async (file) => {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
        return {
          id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          filename: file.name,
          mimeType: file.type || 'image/jpeg',
          base64: dataUrl,
          capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
        };
      }));
      const r = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: payload, source: 'editor' }),
      });
      if (r.ok) await loadMedia();
    } catch { /* silent */ }
    finally { setUploading(false); }
  }

  function onGoogle() {
    picker.pick((_p: PickedPhoto[]) => {
      void (async () => {
        await new Promise((r) => setTimeout(r, 400));
        await loadMedia();
      })();
    });
  }
  const pickerBusy = picker.state === 'creating' || picker.state === 'waiting' || picker.state === 'fetching';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* ── Tab strip ──────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Library tabs"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          padding: 4,
          margin: '12px 16px 8px',
          background: 'var(--cream-2)',
          borderRadius: 10,
          border: '1px solid var(--line-soft)',
          gap: 2,
        }}
      >
        {([
          { v: 'mine' as const, l: 'Your stuff', n: photoCount + decorCount },
          { v: 'editorial' as const, l: 'Editorial', n: editorialCount },
          { v: 'iconify' as const, l: 'Browse more', n: 0 },
        ]).map((o) => {
          const on = tab === o.v;
          return (
            <button
              key={o.v}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(o.v)}
              style={{
                padding: '7px 8px',
                borderRadius: 7,
                border: 0,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {o.l}
              {o.n > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: on ? 'rgba(243,233,212,0.18)' : 'rgba(14,13,11,0.08)',
                  }}
                >
                  {o.n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Search bar (universal across tabs) ─────────────── */}
      <div style={{ padding: '0 16px 10px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tab === 'mine' ? 'Search your photos + AI marks…'
            : tab === 'editorial' ? 'Search editorial motifs…'
            : 'Search Iconify…'
          }
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'var(--cream-2)',
            fontSize: 12.5,
            fontFamily: 'var(--font-ui)',
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {tab === 'mine' && (
          <YourStuffTab
            photos={photosFiltered}
            decor={decorFiltered}
            loading={loadingMedia}
            uploading={uploading}
            pickerBusy={pickerBusy}
            onUpload={() => fileInput.current?.click()}
            onGoogle={onGoogle}
            onAtelier={() => setAtelierOpen(true)}
            onPickSlot={applyToSlot}
            manifest={manifest}
          />
        )}
        {tab === 'editorial' && (
          <EditorialTab
            groups={editorialFiltered}
            stdGroups={ICON_LIBRARY}
            onPickSlot={applyToSlot}
          />
        )}
        {tab === 'iconify' && (
          <IconifyBrowser
            onPick={(dataUrl) => {
              // Default landing for an Iconify pick: hero accent.
              // Hosts who want a specific slot grab the tile from
              // Your stuff after it lands as an iconOverride.
              applyToSlot(dataUrl, 'accent');
            }}
          />
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }}
      />

      {atelierOpen && manifest && onChange && (
        <AtelierModal
          manifest={manifest}
          onChange={onChange}
          onClose={() => setAtelierOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Your stuff tab
// ─────────────────────────────────────────────────────────────
function YourStuffTab({
  photos,
  decor,
  loading,
  uploading,
  pickerBusy,
  onUpload,
  onGoogle,
  onAtelier,
  onPickSlot,
  manifest,
}: {
  photos: LibraryPhoto[];
  decor: DecorAsset[];
  loading: boolean;
  uploading: boolean;
  pickerBusy: boolean;
  onUpload: () => void;
  onGoogle: () => void;
  onAtelier: () => void;
  onPickSlot: (url: string, slot: DecorSlot) => void;
  manifest?: StoryManifest;
}) {
  const decorByKind = useMemo(() => {
    const groups: Record<string, DecorAsset[]> = {};
    for (const a of decor) {
      const key = a.kind;
      groups[key] = groups[key] ?? [];
      groups[key].push(a);
    }
    return groups;
  }, [decor]);

  const sectionStampSections: DecorSlot[] = useMemo(() => {
    const blockOrder = (manifest as unknown as { blockOrder?: string[] })?.blockOrder ?? [
      'hero', 'our-story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'rsvp', 'faq',
    ];
    return blockOrder.map((id) => `sectionStamps:${id}` as DecorSlot);
  }, [manifest]);

  return (
    <>
      {/* Action row — Upload + Google + Atelier */}
      <div style={{ display: 'flex', gap: 6 }}>
        <ActionPill onClick={onUpload} disabled={uploading} icon="upload" primary>
          {uploading ? 'Uploading…' : 'Upload'}
        </ActionPill>
        <ActionPill onClick={onGoogle} disabled={pickerBusy} icon="image">
          {pickerBusy ? 'Loading…' : 'From Google'}
        </ActionPill>
        <ActionPill onClick={onAtelier} icon="sparkles" peach>
          Paint with Pear
        </ActionPill>
      </div>

      {/* Your photos */}
      <Section
        label="Your photos"
        count={photos.length}
        empty={loading ? 'Threading…' : 'No photos yet — upload some, or pick from Google Photos.'}
      >
        {photos.length > 0 && (
          <TileGrid>
            {photos.map((p) => (
              <PhotoTile key={p.id} url={p.url} caption={p.caption ?? p.filename ?? ''} />
            ))}
          </TileGrid>
        )}
      </Section>

      {/* AI marks (live) */}
      <Section
        label="Your AI marks"
        count={decorByKind['stamp']?.length || decorByKind['divider']?.length || decorByKind['accent']?.length || decorByKind['footer']?.length || decorByKind['confetti']?.length ? decor.filter((a) => a.kind !== 'upload').length : 0}
        empty="Nothing painted yet. Tap Paint with Pear to commission a piece."
      >
        {decor.filter((a) => a.kind !== 'upload').length > 0 && (
          <TileGrid>
            {decor.filter((a) => a.kind !== 'upload').map((a) => (
              <DecorTile
                key={a.id}
                asset={a}
                slots={slotsForKind(a.kind, sectionStampSections)}
                onPickSlot={onPickSlot}
              />
            ))}
          </TileGrid>
        )}
      </Section>

      {/* Uploaded SVGs */}
      <Section
        label="Your uploads"
        count={(decorByKind['upload'] ?? []).length}
        empty="Drop a custom SVG here to use it like a Pearloom mark."
      >
        {(decorByKind['upload'] ?? []).length > 0 && (
          <TileGrid>
            {(decorByKind['upload'] ?? []).map((a) => (
              <DecorTile
                key={a.id}
                asset={a}
                slots={[...COMMON_SLOTS, ...sectionStampSections]}
                onPickSlot={onPickSlot}
              />
            ))}
          </TileGrid>
        )}
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Editorial tab — the curated motif catalog
// ─────────────────────────────────────────────────────────────
function EditorialTab({
  groups,
  stdGroups,
  onPickSlot,
}: {
  groups: typeof EDITORIAL_GROUPS;
  stdGroups: typeof ICON_LIBRARY;
  onPickSlot: (url: string, slot: DecorSlot) => void;
}) {
  // Editorial icons render via the Icon motif system (name-based,
  // not URL-based). For the new library, we draft a dataURI from
  // the matching SVG so it can flow through the same applyToSlot
  // path as photos + AI marks. Keeps the tile system uniform.
  return (
    <>
      {groups.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13, fontStyle: 'italic' }}>
          No editorial matches.
        </div>
      ) : (
        groups.map((g) => (
          <Section key={g.key} label={g.label} count={g.items.length}>
            <TileGrid>
              {g.items.map((d) => (
                <IconTile
                  key={d.name}
                  name={d.name}
                  label={d.label}
                  onPickSlot={onPickSlot}
                />
              ))}
            </TileGrid>
          </Section>
        ))
      )}

      {/* Standard icons — secondary catalog */}
      {stdGroups.map((g) => (
        <Section key={g.group} label={g.group}>
          <TileGrid>
            {g.names.map((n) => (
              <IconTile
                key={n}
                name={n}
                label={n}
                onPickSlot={onPickSlot}
              />
            ))}
          </TileGrid>
        </Section>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────
function Section({
  label,
  count,
  empty,
  children,
}: {
  label: string;
  count?: number;
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 2px' }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {label}
        </span>
        {typeof count === 'number' && count > 0 && (
          <span style={{ fontSize: 10, color: 'var(--ink-muted)', opacity: 0.65 }}>{count}</span>
        )}
      </div>
      {children}
      {!children && empty && (
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--cream-2)',
            border: '1px dashed var(--line)',
            borderRadius: 10,
            fontSize: 12,
            color: 'var(--ink-soft)',
            fontStyle: 'italic',
            fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
            lineHeight: 1.45,
          }}
        >
          {empty}
        </div>
      )}
    </section>
  );
}

function TileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))',
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tiles
// ─────────────────────────────────────────────────────────────
function PhotoTile({ url, caption }: { url: string; caption: string }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(ASSET_DRAG_MIME, url);
        e.dataTransfer.setData('text/uri-list', url);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      title={caption}
      style={{
        aspectRatio: '1 / 1',
        borderRadius: 10,
        overflow: 'hidden',
        background: `var(--cream-2) center / cover no-repeat url(${url})`,
        border: '1px solid var(--line)',
        cursor: 'grab',
        transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    />
  );
}

function DecorTile({
  asset,
  slots,
  onPickSlot,
}: {
  asset: DecorAsset;
  slots: DecorSlot[];
  onPickSlot: (url: string, slot: DecorSlot) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 10,
        overflow: 'visible',
        background: 'var(--cream)',
        border: '1px solid var(--line)',
        transition: 'border-color 160ms ease, transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(ASSET_DRAG_MIME, asset.url);
          e.dataTransfer.setData('text/uri-list', asset.url);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onClick={() => setOpen((v) => !v)}
        title={asset.label}
        style={{
          position: 'absolute',
          inset: 0,
          padding: 8,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.url} alt={asset.label} loading="lazy" decoding="async" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>

      {/* Hover/click overlay — "Use as …" */}
      {open && (
        <SlotPicker
          slots={slots}
          onPick={(slot) => { onPickSlot(asset.url, slot); setOpen(false); }}
          onClose={() => setOpen(false)}
          label={asset.label}
        />
      )}
    </div>
  );
}

function IconTile({
  name,
  label,
  onPickSlot,
}: {
  name: string;
  label: string;
  onPickSlot: (url: string, slot: DecorSlot) => void;
}) {
  const [open, setOpen] = useState(false);
  // Editorial + standard icons need to ship as a URL (data URI of
  // the rendered SVG) so they flow through applyToSlot the same
  // way photos + AI marks do. Lazily compute on click.
  async function pickWithSlot(slot: DecorSlot) {
    // Lift the rendered icon out of the DOM. The renderer caches
    // these via the Icon motif; rather than re-rendering off-DOM,
    // we ship a tiny placeholder SVG that re-uses the icon name
    // through iconOverrides — manifest.iconOverrides[purpose] = name
    // works for editorial + standard icons. So instead of writing
    // to decorLibrary, we should write to iconOverrides.
    //
    // Pragmatic move: editorial icons ARE motif names, so
    // applyToSlot('icon-name', ...) doesn't quite work because
    // applyToSlot expects a URL. We synthesize a sentinel string
    // that renderer treats as a motif name (per asset-library-data
    // isAssetUrl helper). The decor renderer falls back to motif
    // rendering when the URL doesn't start with http/data/.
    onPickSlot(name, slot);
    setOpen(false);
  }
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 10,
        background: 'var(--cream)',
        border: '1px solid var(--line)',
        transition: 'border-color 160ms ease, transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(ICON_DRAG_MIME, name);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onClick={() => setOpen((v) => !v)}
        title={label}
        style={{
          position: 'absolute',
          inset: 0,
          padding: 12,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          color: 'var(--ink-soft)',
        }}
      >
        <Icon name={name} size={28} />
      </div>
      {open && (
        <SlotPicker
          slots={[...COMMON_SLOTS]}
          onPick={pickWithSlot}
          onClose={() => setOpen(false)}
          label={label}
        />
      )}
    </div>
  );
}

// Floating "Use as …" picker — renders absolutely above its tile
// so the rest of the grid keeps its rhythm.
function SlotPicker({
  slots,
  onPick,
  onClose,
  label,
}: {
  slots: DecorSlot[];
  onPick: (slot: DecorSlot) => void;
  onClose: () => void;
  label: string;
}) {
  // Click-outside / Escape close.
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Use ${label} as`}
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        zIndex: 60,
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(61,74,31,0.16))',
        borderRadius: 12,
        boxShadow: '0 12px 32px rgba(14,13,11,0.18)',
        padding: 6,
        minWidth: 180,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <div style={{ padding: '6px 10px 4px', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)', fontWeight: 700 }}>
        Use as
      </div>
      {slots.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          style={{
            textAlign: 'left',
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            color: 'var(--ink)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            borderRadius: 6,
            fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-2, #F5EFE2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {SLOT_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

function ActionPill({
  onClick,
  disabled,
  icon,
  children,
  primary,
  peach,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: string;
  children: React.ReactNode;
  primary?: boolean;
  peach?: boolean;
}) {
  const bg = primary ? 'var(--ink, #0E0D0B)' : peach ? 'transparent' : 'var(--cream-2, #F5EFE2)';
  const fg = primary ? 'var(--cream, #FBF7EE)' : peach ? 'var(--peach-ink, #C6703D)' : 'var(--ink-soft)';
  const border = peach ? '1px dashed var(--peach-ink, #C6703D)' : `1px solid ${primary ? 'var(--ink)' : 'var(--line)'}`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '7px 12px',
        borderRadius: 999,
        background: bg,
        color: fg,
        border,
        fontSize: 11.5,
        fontWeight: 700,
        fontFamily: 'var(--font-ui)',
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Icon name={icon} size={11} color={fg} />
      {children}
    </button>
  );
}

function slotsForKind(kind: DecorAsset['kind'], sectionStampSlots: DecorSlot[]): DecorSlot[] {
  switch (kind) {
    case 'stamp':    return sectionStampSlots;
    case 'divider':  return ['divider'];
    case 'confetti': return ['confetti'];
    case 'footer':   return ['footerBouquet'];
    case 'accent':   return ['accent'];
    case 'invite':   return [...COMMON_SLOTS];
    default:         return [...COMMON_SLOTS, ...sectionStampSlots];
  }
}

// ─────────────────────────────────────────────────────────────
// Atelier — modal "Paint with Pear" composer
// ─────────────────────────────────────────────────────────────
type AtelierSlot = 'divider' | 'sectionStamps' | 'confetti' | 'footerBouquet';
const ATELIER_SLOT_META: Record<AtelierSlot, { label: string; hint: string }> = {
  divider:       { label: 'Section divider', hint: 'Hand-drawn ornament between every section.' },
  sectionStamps: { label: 'Section stamps',  hint: 'Tiny wax-seal icons next to each block title.' },
  confetti:      { label: 'RSVP confetti',   hint: 'Plays once when a guest confirms.' },
  footerBouquet: { label: 'Closing flourish', hint: 'Bouquet above the footer.' },
};

function AtelierModal({
  manifest,
  onChange,
  onClose,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  onClose: () => void;
}) {
  const [slot, setSlot] = useState<AtelierSlot>('divider');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctx = useDecorContext(manifest);
  const autoSummary = buildAutoSummary(ctx);

  async function paint() {
    setBusy(true);
    setError(null);
    const jobId = startDecorJob(slot, ATELIER_SLOT_META[slot].label);
    try {
      const res = await fetch('/api/decor/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ctx,
          slots: [slot],
          customPrompts: prompt.trim() ? { [slot]: prompt.trim() } : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Failed (${res.status})`);
      }
      const data = (await res.json()) as { library?: Record<string, unknown>; prompts?: Record<string, string>; failures?: string[] };
      const lib = data.library ?? {};
      const ts = new Date().toISOString();
      const nextDrafts = { ...(manifest.decorDrafts ?? {}) };
      const incoming: Partial<NonNullable<StoryManifest['decorLibrary']>> = {};
      if (slot === 'sectionStamps' && typeof lib.sectionStamps === 'object' && lib.sectionStamps) {
        const stamps: Record<string, string> = {};
        for (const [k, v] of Object.entries(lib.sectionStamps as Record<string, unknown>)) {
          if (typeof v === 'string') stamps[k] = v;
        }
        incoming.sectionStamps = stamps;
        const draft: SectionStampsDraft = {
          id: `stamps-${Date.now()}`,
          stamps,
          prompt: data.prompts?.sectionStamps ?? '',
          customPrompt: prompt.trim() || undefined,
          createdAt: ts,
        };
        nextDrafts.sectionStamps = pushSectionStampsDraft(nextDrafts.sectionStamps, draft);
      } else if (slot !== 'sectionStamps' && typeof lib[slot] === 'string') {
        incoming[slot] = lib[slot] as string;
        const draft: DecorDraft = {
          id: `${slot}-${Date.now()}`,
          url: lib[slot] as string,
          prompt: data.prompts?.[slot] ?? '',
          customPrompt: prompt.trim() || undefined,
          createdAt: ts,
        };
        nextDrafts[slot] = pushDraft(nextDrafts[slot], draft);
      } else {
        throw new Error('Pear painted, but the result was empty.');
      }
      onChange({
        ...manifest,
        decorLibrary: { ...(manifest.decorLibrary ?? {}), ...incoming },
        decorDrafts: nextDrafts,
      });
      completeDecorJob(jobId, true);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setError(msg);
      completeDecorJob(jobId, false, msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Paint with Pear"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 350,
        background: 'rgba(14,13,11,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 100%)',
          background: 'var(--paper, #FBF7EE)',
          borderRadius: 16,
          boxShadow: '0 32px 60px rgba(14,13,11,0.4)',
          fontFamily: 'var(--font-ui)',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)', marginBottom: 4 }}>
            Atelier
          </div>
          <h2 style={{ fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)', fontStyle: 'italic', fontSize: 22, margin: 0, color: 'var(--ink)' }}>
            Paint with Pear
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Pick a slot, write a few words. Pear paints in your palette + style.
          </p>
        </div>

        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>
            Slot
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {(Object.keys(ATELIER_SLOT_META) as AtelierSlot[]).map((s) => {
              const on = slot === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  title={ATELIER_SLOT_META[s].hint}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: on ? 'var(--ink)' : 'var(--cream-2)',
                    color: on ? 'var(--cream)' : 'var(--ink)',
                    border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                    fontSize: 12,
                    fontWeight: on ? 700 : 600,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {ATELIER_SLOT_META[s].label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>
            Direction (optional)
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={autoSummary || 'e.g. trailing ivy with two bell-flowers'}
            rows={3}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--cream-2)',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              color: 'var(--ink)',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
            Pear wraps your direction in your palette + occasion automatically.
          </div>
        </div>

        {error && (
          <div role="alert" style={{ padding: '8px 12px', background: 'rgba(122,45,45,0.08)', border: '1px solid rgba(122,45,45,0.22)', borderRadius: 8, color: '#7A2D2D', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={paint}
            disabled={busy}
            className="pl-pearl-accent"
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 999,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {busy ? 'Pear is painting…' : 'Paint it'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--ink-soft)',
              border: '1px solid var(--line)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// useDecorContext — pulls the same context the legacy panel sent
// to /api/decor/library so the atelier inherits voice + palette.
// Mirror of the helper inside DecorLibraryPanel; kept local here
// so the v1 panel can be deleted later without breaking us.
// ─────────────────────────────────────────────────────────────
function useDecorContext(manifest: StoryManifest) {
  return useMemo(() => {
    const palette = (manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors ?? {};
    const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
    const vibes = ((manifest as unknown as { vibes?: string[] }).vibes ?? []).join(', ');
    const venue = manifest.logistics?.venue ?? '';
    const venueAddress = manifest.logistics?.venueAddress ?? '';
    return { palette, occasion, vibes, venue, venueAddress };
  }, [manifest]);
}
