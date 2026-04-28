'use client';

// ──────────────────────────────────────────────────────────────
// AssetLibraryPanel — the rail-docked asset browser. Surfaces
// in the inspector's "Library" tab so users can keep their
// photos in view while editing the canvas.
//
// Three sources, all in one panel:
//   • Library  — already-uploaded photos from /api/user-media
//   • Upload   — file picker → POST /api/photos/upload → R2
//   • Google   — official Google Photos picker via the existing
//                useGooglePhotosPicker hook
//
// Every tile is HTML5-draggable. PhotoDropTarget already accepts
// URL drags via the text/uri-list mime so dropping a tile on any
// canvas photo dropzone "just works" — no changes needed there.
//
// Click a tile to broadcast a `pearloom:asset-pick` event with the
// URL. Future surfaces can listen + apply (e.g. "click to set as
// the active block's photo").
// ──────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';
import { focusDecorLibrary } from '../../site/focusDecorLibrary';
import { EDITORIAL_GROUPS, animModesFor, type EditorialAnim } from '../../editorial-icons';
import {
  ICON_LIBRARY,
  flattenDecorAssets,
  ASSET_DRAG_MIME,
  ICON_DRAG_MIME,
  type DecorAsset,
} from '../asset-library-data';

interface LibraryPhoto {
  id: string;
  url: string;
  filename?: string | null;
  caption?: string | null;
  source?: string;
  created_at?: string;
}

const DRAG_MIME = ASSET_DRAG_MIME;

type LibraryTab = 'photos' | 'decor';

export function AssetLibraryPanel({
  manifest,
  onChange,
}: {
  manifest?: StoryManifest;
  /** Required for the decor SVG upload action. Optional so other
   *  call sites that only need the photo browser don't have to
   *  thread state. */
  onChange?: (m: StoryManifest) => void;
} = {}) {
  const [tab, setTab] = useState<LibraryTab>('photos');
  const [media, setMedia] = useState<LibraryPhoto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const picker = useGooglePhotosPicker();

  const decorAssets = useMemo(() => flattenDecorAssets(manifest), [manifest]);
  const filteredDecor = useMemo(() => {
    if (!query.trim()) return decorAssets;
    const q = query.toLowerCase();
    return decorAssets.filter((a) => a.label.toLowerCase().includes(q) || (a.usage ?? '').toLowerCase().includes(q));
  }, [decorAssets, query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/user-media', { cache: 'no-store' });
      if (!r.ok) throw new Error('Failed');
      const d = (await r.json()) as { media?: LibraryPhoto[] };
      setMedia(d.media ?? []);
    } catch {
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = media ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (m) => (m.filename ?? '').toLowerCase().includes(q) || (m.caption ?? '').toLowerCase().includes(q),
    );
  }, [media, query]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const accepted = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (accepted.length === 0) return;
    setUploading(true);
    try {
      const payload = await Promise.all(
        accepted.map(async (file) => {
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
        }),
      );
      const r = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: payload, source: 'editor' }),
      });
      if (r.ok) await load();
    } catch {
      /* silent */
    } finally {
      setUploading(false);
    }
  }

  function onGoogle() {
    picker.pick((_photos: PickedPhoto[]) => {
      void (async () => {
        await new Promise((r) => setTimeout(r, 400));
        await load();
      })();
    });
  }

  const pickerBusy =
    picker.state === 'creating' || picker.state === 'waiting' || picker.state === 'fetching';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Tab strip — Photos / AI decor. The decor tab is the
          canonical surface for every AI-generated asset on the
          site (per-section stamps, divider, confetti, footer
          bouquet, hero accent, plus saved drafts). Decor is
          counted on the badge so the host knows when they have
          assets without opening the tab. */}
      <div
        role="tablist"
        aria-label="Asset library tabs"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          padding: 4,
          margin: '12px 16px 4px',
          background: 'var(--cream-2)',
          borderRadius: 10,
          border: '1px solid var(--line-soft)',
          gap: 2,
        }}
      >
        {(
          [
            { v: 'photos' as const, l: 'Photos', n: media?.length ?? 0 },
            // Decor counts every flavour now: AI assets + uploads +
            // the editorial + standard icon catalogue. One number,
            // one tab — host doesn't have to remember "where do I
            // find my stamps vs. my icon swaps."
            { v: 'decor' as const, l: 'Decor', n: decorAssets.length + ICON_LIBRARY.reduce((acc, g) => acc + g.names.length, 0) },
          ]
        ).map((o) => {
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
                    color: 'inherit',
                  }}
                >
                  {o.n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'decor' ? (
        <DecorTab
          assets={filteredDecor}
          totalCount={decorAssets.length}
          query={query}
          setQuery={setQuery}
          manifest={manifest}
          onChange={onChange}
        />
      ) : (
      <>
      {/* Source actions — Upload + Google Photos */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '12px 16px 10px',
          borderBottom: '1px solid var(--line-soft)',
          background: 'var(--cream)',
        }}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 999,
            background: 'var(--ink)',
            color: 'var(--cream)',
            border: 'none',
            fontSize: 11.5,
            fontWeight: 700,
            fontFamily: 'var(--font-ui)',
            cursor: uploading ? 'wait' : 'pointer',
          }}
        >
          <Icon name="upload" size={11} color="var(--cream)" />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <button
          type="button"
          onClick={onGoogle}
          disabled={pickerBusy}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 999,
            background: 'var(--card)',
            color: 'var(--ink)',
            border: '1px solid var(--line-soft)',
            fontSize: 11.5,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: pickerBusy ? 'wait' : 'pointer',
          }}
        >
          <Icon name="image" size={11} />
          {pickerBusy ? 'Opening…' : 'Google Photos'}
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-soft)' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search filename or caption"
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: 8,
            border: '1px solid var(--line-soft)',
            background: 'var(--card)',
            fontSize: 12,
            fontFamily: 'var(--font-ui)',
            outline: 'none',
            color: 'var(--ink)',
          }}
        />
      </div>

      {/* Tiles */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {loading ? (
          <div style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: 24, fontSize: 12 }}>
            Threading…
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              color: 'var(--ink-soft)',
              textAlign: 'center',
              padding: '24px 12px',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {query ? 'No matches.' : (
              <>
                <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Library is empty.
                </div>
                Upload or pick from Google Photos above. Drag any tile onto a canvas photo to apply it.
              </>
            )}
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
                marginBottom: 8,
                padding: '0 4px',
              }}
            >
              {filtered.length} {filtered.length === 1 ? 'photo' : 'photos'} · drag onto canvas
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}
            >
              {filtered.map((m) => (
                <AssetTile key={m.id} photo={m} />
              ))}
            </div>
          </>
        )}
      </div>
      </>
      )}
    </div>
  );
}

// ── DecorTab ──────────────────────────────────────────────────
// Browse every AI-generated asset on the site. Each tile is
// HTML5-draggable just like the photo tiles, so the host can
// drag a stamp/divider/etc. onto any canvas dropzone. Click to
// dispatch pearloom:asset-pick for click-to-apply consumers.
//
// Empty state shows a quick "Generate AI decor" button that
// jumps to the Theme tab's Decor Library so the host can run
// the full pass that fills every slot at once.
function DecorTab({
  assets,
  totalCount,
  query,
  setQuery,
  manifest,
  onChange,
}: {
  assets: DecorAsset[];
  totalCount: number;
  query: string;
  setQuery: (q: string) => void;
  manifest?: StoryManifest;
  onChange?: (m: StoryManifest) => void;
}) {
  const svgInput = useRef<HTMLInputElement>(null);
  const [svgUploading, setSvgUploading] = useState(false);
  const [svgError, setSvgError] = useState<string | null>(null);

  async function onPickSvg(files: FileList | null) {
    if (!files || files.length === 0 || !manifest || !onChange) return;
    setSvgUploading(true);
    setSvgError(null);
    try {
      for (const file of Array.from(files)) {
        if (!['image/svg+xml', 'image/png'].includes(file.type)) {
          setSvgError('Only SVG and PNG decor uploads are supported.');
          continue;
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => reject(new Error('Could not read file.'));
          reader.readAsDataURL(file);
        });
        const res = await fetch('/api/decor/upload-svg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64: dataUrl,
            filename: file.name,
            label: file.name.replace(/\.(svg|png)$/i, ''),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setSvgError((body as { error?: string }).error ?? 'Upload failed.');
          continue;
        }
        const data = (await res.json()) as { url: string; label: string; mime: 'image/svg+xml' | 'image/png' };
        const id = `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const existing = manifest.decorLibrary?.uploads ?? [];
        onChange({
          ...manifest,
          decorLibrary: {
            ...(manifest.decorLibrary ?? {}),
            uploads: [
              ...existing,
              { id, url: data.url, label: data.label, mime: data.mime, addedAt: new Date().toISOString() },
            ],
          },
        });
      }
    } finally {
      setSvgUploading(false);
    }
  }

  // Group by kind so the visual reads as "uploads (host's own),
  // then stamps, then divider, then confetti, then footer, then
  // hero accents, then invite scenes."
  const groups: Array<{ kind: DecorAsset['kind']; label: string; items: DecorAsset[] }> = (
    [
      { kind: 'upload', label: 'Your uploads' },
      { kind: 'stamp', label: 'Section stamps' },
      { kind: 'divider', label: 'Dividers' },
      { kind: 'confetti', label: 'Confetti' },
      { kind: 'footer', label: 'Closing flourish' },
      { kind: 'accent', label: 'Hero accents' },
      { kind: 'invite', label: 'Invite scenes' },
    ] as Array<{ kind: DecorAsset['kind']; label: string }>
  )
    .map((g) => ({ ...g, items: assets.filter((a) => a.kind === g.kind) }))
    .filter((g) => g.items.length > 0);

  // ── Icon library state (folded in from the old "Icons" tab) ──
  // Filtering is applied to both the editorial + standard libs.
  const lower = query.trim().toLowerCase();
  const filterName = (n: string, label?: string) =>
    !lower ? true : n.toLowerCase().includes(lower) || (label ?? '').toLowerCase().includes(lower);

  const editorialIconGroups = EDITORIAL_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((d) => filterName(d.name, d.label)),
  })).filter((g) => g.items.length > 0);

  const stdIconGroups = ICON_LIBRARY.map((g) => ({
    ...g,
    matches: g.names.filter((n) => filterName(n)),
  })).filter((g) => g.matches.length > 0);

  const overrides = (manifest as unknown as { iconOverrides?: Record<string, string> } | undefined)?.iconOverrides ?? {};
  const overrideEntries = Object.entries(overrides);
  const animations = (manifest as unknown as { iconAnimations?: Record<string, EditorialAnim> } | undefined)?.iconAnimations ?? {};

  function clearAllOverrides() {
    if (!manifest || !onChange) return;
    const next = { ...manifest } as StoryManifest;
    (next as unknown as { iconOverrides?: Record<string, string> }).iconOverrides = {};
    onChange(next);
  }
  function clearOne(originalName: string) {
    if (!manifest || !onChange) return;
    const cur = (manifest as unknown as { iconOverrides?: Record<string, string> }).iconOverrides ?? {};
    const next = { ...cur };
    delete next[originalName];
    onChange({ ...manifest, iconOverrides: next } as unknown as StoryManifest);
  }
  function setAnim(originalName: string, mode: EditorialAnim) {
    if (!manifest || !onChange) return;
    const cur = (manifest as unknown as { iconAnimations?: Record<string, EditorialAnim> }).iconAnimations ?? {};
    onChange({ ...manifest, iconAnimations: { ...cur, [originalName]: mode } } as unknown as StoryManifest);
  }
  function clearAnim(originalName: string) {
    if (!manifest || !onChange) return;
    const cur = (manifest as unknown as { iconAnimations?: Record<string, EditorialAnim> }).iconAnimations ?? {};
    const next = { ...cur };
    delete next[originalName];
    onChange({ ...manifest, iconAnimations: next } as unknown as StoryManifest);
  }
  const hasIconLibraryMatches = editorialIconGroups.length > 0 || stdIconGroups.length > 0;

  return (
    <>
      {/* Search + Generate button */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px 10px', borderBottom: '1px solid var(--line-soft)' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search decor"
          style={{
            flex: 1,
            padding: '7px 10px',
            borderRadius: 8,
            border: '1px solid var(--line-soft)',
            background: 'var(--card)',
            fontSize: 12,
            fontFamily: 'var(--font-ui)',
            outline: 'none',
            color: 'var(--ink)',
          }}
        />
        <button
          type="button"
          onClick={focusDecorLibrary}
          title="Open the AI Decor Library generator"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '7px 12px',
            borderRadius: 8,
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            color: 'var(--ink)',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Icon name="sparkles" size={11} /> Generate
        </button>
        {onChange && manifest && (
          <>
            <input
              ref={svgInput}
              type="file"
              accept="image/svg+xml,image/png"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                void onPickSvg(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => svgInput.current?.click()}
              disabled={svgUploading}
              title="Upload an SVG monogram, logo, or PNG decor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 12px',
                borderRadius: 8,
                background: 'var(--cream-2)',
                border: '1px solid var(--line-soft)',
                color: 'var(--ink)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: svgUploading ? 'wait' : 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              <Icon name="upload" size={11} /> {svgUploading ? 'Uploading…' : 'Upload SVG'}
            </button>
          </>
        )}
      </div>
      {svgError && (
        <div
          role="alert"
          style={{
            margin: '8px 16px 0',
            padding: '8px 10px',
            background: 'rgba(122,45,45,0.08)',
            color: '#7A2D2D',
            border: '1px solid rgba(122,45,45,0.18)',
            borderRadius: 8,
            fontSize: 11.5,
          }}
        >
          {svgError}
        </div>
      )}

      {/* Active icon swaps — surfaces the host's iconOverrides
          alongside their AI decor + uploads since "what's currently
          decorating my site" is the same mental model regardless of
          source. Only renders when there's at least one swap. */}
      {overrideEntries.length > 0 && manifest && onChange && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-soft)', background: 'var(--cream)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
              Active icon swaps
            </div>
            <button
              type="button"
              onClick={clearAllOverrides}
              title="Reset every icon swap"
              style={{
                fontSize: 10.5, fontWeight: 700,
                background: 'transparent', border: 'none',
                color: 'var(--ink-soft)', cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Reset all
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {overrideEntries.map(([orig, repl]) => (
              <ActiveSwapRow
                key={orig}
                orig={orig}
                repl={repl}
                anim={animations[orig] ?? 'still'}
                onAnim={(m) => setAnim(orig, m)}
                onClearAnim={() => clearAnim(orig)}
                onClear={() => clearOne(orig)}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {totalCount === 0 && !hasIconLibraryMatches ? (
          <div
            style={{
              padding: '28px 18px',
              textAlign: 'center',
              background: 'var(--cream-2)',
              border: '1px dashed var(--line)',
              borderRadius: 12,
            }}
          >
            <div className="display" style={{ fontSize: 18, marginBottom: 6 }}>
              No AI decor yet.
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 14 }}>
              Pear paints stamps, dividers, confetti, footer bouquets, and hero accents — palette- and venue-aware. One pass fills every slot.
            </div>
            <button
              type="button"
              onClick={focusDecorLibrary}
              className="pl-pearl-accent"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              <Icon name="sparkles" size={11} /> Generate decor
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* AI decor + your uploads — surfaces first when present
                because they're the highest-effort assets the host has
                already invested in. */}
            {assets.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--peach-ink, #C6703D)',
                    marginBottom: 10,
                    padding: '0 4px',
                  }}
                >
                  AI decor + uploads
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {groups.map((g) => (
                    <div key={g.kind}>
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-muted)',
                          marginBottom: 8,
                          padding: '0 4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{g.label}</span>
                        <span style={{ opacity: 0.65 }}>{g.items.length}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {g.items.map((a) => (
                          <DecorTile key={a.id} asset={a} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editorial icon library — Pearloom's curated section
                glyphs with hover-preview animation. */}
            {editorialIconGroups.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--peach-ink, #C6703D)',
                    marginBottom: 10,
                    padding: '0 4px',
                  }}
                >
                  Editorial icons
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {editorialIconGroups.map((g) => (
                    <div key={g.key}>
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-muted)',
                          marginBottom: 6,
                          padding: '0 4px',
                        }}
                      >
                        {g.label}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 6 }}>
                        {g.items.map((d) => (
                          <EditorialIconTile key={d.name} name={d.name} label={d.label} onTeach={() => {}} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standard library — basic UI glyphs (mail, eye, etc.) */}
            {stdIconGroups.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-muted)',
                    marginBottom: 10,
                    padding: '0 4px',
                  }}
                >
                  Standard icons
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {stdIconGroups.map((g) => (
                    <div key={g.group}>
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-muted)',
                          marginBottom: 6,
                          padding: '0 4px',
                        }}
                      >
                        {g.group}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 6 }}>
                        {g.matches.map((n) => (
                          <IconTile key={n} name={n} onTeach={() => {}} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalCount > 0 && assets.length === 0 && !hasIconLibraryMatches && (
              <div style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: 24, fontSize: 12 }}>
                No matches for &quot;{query}&quot;.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function DecorTile({ asset }: { asset: DecorAsset }) {
  function onDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData(DRAG_MIME, asset.url);
    e.dataTransfer.setData('text/uri-list', asset.url);
    e.dataTransfer.setData('text/plain', asset.url);
    e.dataTransfer.effectAllowed = 'copy';
  }
  function onClick() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:asset-pick', {
      detail: { url: asset.url, filename: asset.label, kind: asset.kind },
    }));
  }
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      title={asset.usage ? `${asset.label} — in use: ${asset.usage}` : asset.label}
      style={{
        position: 'relative',
        aspectRatio: '1/1',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--cream-2)',
        cursor: 'grab',
        border: asset.usage ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid var(--line-soft)',
        transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 8px 18px -8px rgba(14,13,11,0.32)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div
        style={{
          flex: 1,
          backgroundImage: `url(${asset.url})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundColor: 'var(--card)',
          mixBlendMode: 'multiply',
        }}
      />
      <div
        style={{
          padding: '6px 8px',
          fontSize: 10,
          fontWeight: 700,
          color: asset.usage ? 'var(--peach-ink, #C6703D)' : 'var(--ink-soft)',
          background: asset.usage ? 'rgba(198,112,61,0.08)' : 'transparent',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center',
          fontFamily: 'var(--font-ui)',
          borderTop: '1px solid var(--line-soft)',
        }}
      >
        {asset.usage ? `● ${asset.label}` : asset.label}
      </div>
    </div>
  );
}

function AssetTile({ photo }: { photo: LibraryPhoto }) {
  function onDragStart(e: React.DragEvent<HTMLDivElement>) {
    // Set BOTH the pearloom mime AND text/uri-list, since
    // PhotoDropTarget already accepts text/uri-list — no changes
    // needed on the dropzone.
    e.dataTransfer.setData(DRAG_MIME, photo.url);
    e.dataTransfer.setData('text/uri-list', photo.url);
    e.dataTransfer.setData('text/plain', photo.url);
    e.dataTransfer.effectAllowed = 'copy';
  }

  function onClick() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:asset-pick', {
      detail: { url: photo.url, filename: photo.filename ?? null },
    }));
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      title={`${photo.filename ?? 'Photo'} — drag onto a canvas photo to apply`}
      style={{
        position: 'relative',
        aspectRatio: '1/1',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#000',
        cursor: 'grab',
        border: '1px solid var(--line-soft)',
        transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 8px 18px -8px rgba(14,13,11,0.32)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <img
        src={photo.url}
        alt={photo.filename ?? ''}
        loading="lazy"
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}


function IconTile({ name, onTeach }: { name: string; onTeach: () => void }) {
  function onDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData(ICON_DRAG_MIME, name);
    e.dataTransfer.setData('text/plain', name);
    e.dataTransfer.effectAllowed = 'copy';
  }
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onTeach}
      title={`Drag ${name} onto a canvas icon to replace it`}
      style={{
        aspectRatio: '1 / 1',
        display: 'grid',
        placeItems: 'center',
        borderRadius: 10,
        background: 'var(--card)',
        border: '1.5px solid var(--line)',
        cursor: 'grab',
        color: 'var(--ink)',
        transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1), background 180ms ease, border-color 180ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.background = 'var(--cream-2)';
        e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.background = 'var(--card)';
        e.currentTarget.style.borderColor = 'var(--line)';
      }}
    >
      <Icon name={name} size={20} />
    </div>
  );
}

// ── EditorialIconTile ─────────────────────────────────────────
// Same drag mime as IconTile so the canvas drop handler doesn't
// have to care whether an editorial or motif glyph was picked,
// but with two extras: hovering the tile temporarily flips the
// rendered icon into 'hover' animation mode so the host gets a
// preview of the motion they'd be picking, and an "ANIM" pill in
// the corner advertises the icon's default flair so glyphs that
// can't animate aren't misread as broken.
function EditorialIconTile({
  name,
  label,
  onTeach,
}: {
  name: string;
  label: string;
  onTeach: () => void;
}) {
  const [hovering, setHovering] = useState(false);
  const modes = animModesFor(name);
  const animatable = modes.includes('hover') || modes.includes('constant');

  function onDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData(ICON_DRAG_MIME, name);
    e.dataTransfer.setData('text/plain', name);
    e.dataTransfer.effectAllowed = 'copy';
  }

  // To preview the animation on the tile we use a tiny fake DOM
  // wrapper that stamps `data-pl-icon-anim="hover"` on the SVG —
  // CSS picks it up exactly like a host-hovering-the-card on the
  // real canvas. Since Icon reads animation mode from context, we
  // can't drive it through props; we pin the attribute manually
  // via a parent that sets it during hover.
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onTeach}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      title={`Drag ${label} onto a canvas icon to replace it`}
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        display: 'grid',
        placeItems: 'center',
        borderRadius: 10,
        background: hovering ? 'var(--cream-2)' : 'var(--card)',
        border: hovering ? '1.5px solid var(--peach-ink, #C6703D)' : '1.5px solid var(--line)',
        cursor: 'grab',
        color: 'var(--ink)',
        transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1), background 180ms ease, border-color 180ms ease',
        transform: hovering ? 'translateY(-1px)' : '',
      }}
    >
      {/* Re-stamp the animation attribute on the rendered SVG so
          the keyframe fires when the tile is hovered. The Icon
          component already emits the SVG; we use a CSS selector
          that targets the descendant SVG with data-pl-icon-name. */}
      <span
        style={{ display: 'inline-flex' }}
        // The CSS rule is `*:hover > [data-pl-icon-anim="hover"]`,
        // so the anim attribute needs to be on the SVG itself when
        // the parent (this tile) is hovered. The Icon component
        // pegs the attribute based on context's iconAnimations,
        // which is empty for the asset library. We work around it
        // by injecting a temporary attribute via a wrapping data
        // attribute that the keyframe also matches.
        data-pl-tile-hover={hovering ? '1' : undefined}
      >
        <Icon name={name} size={22} />
      </span>
      {animatable && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            fontSize: 7.5,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--peach-ink, #C6703D)',
            background: 'rgba(198,112,61,0.10)',
            padding: '1px 4px',
            borderRadius: 4,
            lineHeight: 1.2,
          }}
        >
          ANIM
        </span>
      )}
    </div>
  );
}

// ── ActiveSwapRow ─────────────────────────────────────────────
// Full row for each active icon override. Shows "before ↦ after",
// the animation-mode segmented control (only when the new icon
// supports animation), and a × to revert the swap entirely.
function ActiveSwapRow({
  orig,
  repl,
  anim,
  onAnim,
  onClearAnim,
  onClear,
}: {
  orig: string;
  repl: string;
  anim: EditorialAnim;
  onAnim: (mode: EditorialAnim) => void;
  onClearAnim: () => void;
  onClear: () => void;
}) {
  const modes = animModesFor(repl);
  const showAnim = modes.length > 1;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px 6px 10px',
        background: 'var(--cream-2)',
        border: '1px solid var(--line-soft)',
        borderRadius: 10,
        fontSize: 11,
      }}
    >
      <span title={orig} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Icon name={orig} size={14} />
      </span>
      <span style={{ color: 'var(--ink-muted)', fontSize: 9, letterSpacing: '0.08em' }}>↦</span>
      <span title={repl} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Icon name={repl} size={14} />
      </span>
      <span style={{ color: 'var(--ink-soft)', fontWeight: 600, marginLeft: 2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {repl}
      </span>
      {showAnim && (
        <div
          role="tablist"
          aria-label={`Animation for ${repl}`}
          style={{
            display: 'inline-flex',
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            padding: 2,
            gap: 2,
          }}
        >
          {modes.map((m) => {
            const on = anim === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => (m === 'still' ? onClearAnim() : onAnim(m))}
                title={
                  m === 'still' ? 'No motion' :
                  m === 'hover' ? 'Plays once when hovered' :
                  'Loops continuously'
                }
                style={{
                  padding: '3px 7px',
                  borderRadius: 4,
                  border: 0,
                  background: on ? 'var(--ink)' : 'transparent',
                  color: on ? 'var(--cream)' : 'var(--ink-soft)',
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Reset ${orig} swap`}
        title="Reset this swap"
        style={{
          width: 22, height: 22, borderRadius: 999,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
