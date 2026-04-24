'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/MediaLibraryPanel.tsx
//
// Unified media surface — every image referenced anywhere in the
// manifest is listed here: cover photo, hero slideshow, chapter
// images, background pattern art. The audit called out that
// photo management was scattered across five separate pickers
// with no single 'where are all my photos' view.
//
// Each asset row shows where it's used (source label + deep-link
// back to the owning panel) so 'delete this photo' and 'swap
// this photo' are one-click actions.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, ExternalLink, Library, Hash } from 'lucide-react';
import type { StoryManifest } from '@/types';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import {
  PanelRoot,
  PanelSection,
  PanelEmptyState,
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
  panelFont,
} from './panel';

interface AssetRow {
  url: string;
  source: string;
  sourceDetail?: string;
  tab: EditorTab;
  chapterId?: string;
}

function collectAssets(m: StoryManifest | null | undefined): AssetRow[] {
  if (!m) return [];
  const rows: AssetRow[] = [];

  if (m.coverPhoto) {
    rows.push({ url: m.coverPhoto, source: 'Cover photo', tab: 'story' });
  }
  (m.heroSlideshow || []).forEach((u, i) => {
    if (!u) return;
    rows.push({
      url: u,
      source: 'Hero slideshow',
      sourceDetail: `Frame ${i + 1}`,
      tab: 'story',
    });
  });

  (m.chapters || []).forEach((ch, ci) => {
    (ch.images || []).forEach((img, ii) => {
      if (!img?.url) return;
      rows.push({
        url: img.url,
        source: `Chapter ${ci + 1}: ${ch.title || 'Untitled'}`,
        sourceDetail: `Image ${ii + 1}`,
        tab: 'story',
        chapterId: ch.id,
      });
    });
  });

  (m.anniversaryPhotos || []).forEach((img, i) => {
    if (!img?.url) return;
    rows.push({
      url: img.url,
      source: 'Anniversary photos',
      sourceDetail: `Image ${i + 1}`,
      tab: 'story',
    });
  });

  return rows;
}

function extractHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'local';
  }
}

export function MediaLibraryPanel() {
  const { manifest, actions } = useEditor();
  const assets = useMemo(() => collectAssets(manifest), [manifest]);

  // Group by source.
  const grouped = useMemo(() => {
    const map = new Map<string, AssetRow[]>();
    for (const a of assets) {
      const list = map.get(a.source) || [];
      list.push(a);
      map.set(a.source, list);
    }
    return Array.from(map.entries());
  }, [assets]);

  const totalCount = assets.length;
  const uniqueUrls = new Set(assets.map((a) => a.url)).size;
  const duplicates = totalCount - uniqueUrls;

  return (
    <PanelRoot>
      <PanelSection
        title="Media library"
        icon={Library}
        badge={totalCount || undefined}
        hint="Every image referenced by the manifest. Deep-link to the panel that owns each asset."
      >
        {/* Stat strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            marginBottom: 14,
            borderTop: '1px solid var(--pl-chrome-border)',
            borderBottom: '1px solid var(--pl-chrome-border)',
            paddingBlock: 10,
          }}
        >
          <Stat label="Total" value={String(totalCount)} />
          <Stat label="Unique" value={String(uniqueUrls)} divider />
          <Stat label="Reused" value={String(duplicates)} divider />
        </div>

        {totalCount === 0 ? (
          <PanelEmptyState
            icon={<ImageIcon size={18} strokeWidth={1.5} />}
            title="No photos yet"
            description="Once you upload photos to chapters, the hero slideshow, or the cover, they'll show up here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {grouped.map(([group, items]) => (
              <div key={group}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: panelFont.mono,
                      fontSize: '0.58rem',
                      letterSpacing: panelTracking.widest,
                      textTransform: 'uppercase',
                      color: 'var(--pl-chrome-text-faint)',
                      fontWeight: panelWeight.bold,
                    }}
                  >
                    {group}
                  </span>
                  <button
                    type="button"
                    onClick={() => actions.handleTabChange(items[0].tab)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--pl-chrome-accent)',
                      fontFamily: panelFont.mono,
                      fontSize: '0.56rem',
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      fontWeight: panelWeight.bold,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Open the owning panel"
                  >
                    Open <ExternalLink size={9} />
                  </button>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 6,
                  }}
                >
                  {items.map((a, i) => (
                    <AssetTile key={`${a.url}-${i}`} asset={a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelSection>
    </PanelRoot>
  );
}

// ── Helpers ─────────────────────────────────────────────────
function Stat({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        borderLeft: divider ? '1px solid var(--pl-chrome-border)' : 'none',
      }}
    >
      <span
        style={{
          fontFamily: panelFont.display,
          fontSize: '1.4rem',
          color: 'var(--pl-chrome-text)',
          lineHeight: 1,
          fontStyle: 'italic',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: panelFont.mono,
          fontSize: '0.54rem',
          letterSpacing: panelTracking.widest,
          textTransform: 'uppercase',
          color: 'var(--pl-chrome-text-muted)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function AssetTile({ asset }: { asset: AssetRow }) {
  const host = extractHost(asset.url);
  return (
    <motion.div
      whileHover={{ y: -1 }}
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 'var(--pl-radius-sm)',
        overflow: 'hidden',
        background: 'var(--pl-chrome-bg)',
        border: '1px solid var(--pl-chrome-border)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.url}
        alt={asset.source}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, transparent 60%, rgba(14,13,11,0.72))',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 4,
          bottom: 4,
          right: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          pointerEvents: 'none',
          fontFamily: panelFont.mono,
          fontSize: '0.52rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--pl-cream, #FDFAF0)',
          lineHeight: panelLineHeight.tight,
        }}
      >
        <Hash size={8} style={{ opacity: 0.7 }} />
        {host}
      </div>
      {asset.sourceDetail && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            padding: '2px 5px',
            borderRadius: 3,
            background: 'rgba(14,13,11,0.55)',
            color: 'var(--pl-cream, #FDFAF0)',
            fontFamily: panelFont.mono,
            fontSize: '0.5rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: panelWeight.bold,
          }}
        >
          {asset.sourceDetail}
        </div>
      )}
    </motion.div>
  );
}
