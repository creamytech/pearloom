// ─────────────────────────────────────────────────────────────
// Shared data helpers for the asset library + icon swap modal.
//
// AssetLibraryPanel and IconSwapModal both surface the same three
// groups of swappable visuals:
//   • AI decor + host uploads (URLs)
//   • Editorial icons (curated motif names)
//   • Standard icons (basic UI motif names)
//
// Keeping the data here means the icon swap modal reads from the
// exact same source as the rail-docked browser — pick from one
// surface, see the asset go live, and the rail tile reflects it
// (it already lives in iconOverrides). No second source of truth.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

export const ASSET_DRAG_MIME = 'application/x-pearloom-asset';
export const ICON_DRAG_MIME = 'text/x-pearloom-icon';

// Curated motif catalog — every glyph the editor ships with.
// Order is grouped by purpose so the picker doesn't read like a
// dictionary dump.
export const ICON_LIBRARY: Array<{ group: string; names: string[] }> = [
  { group: 'Action', names: ['arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'arrow-ur', 'send', 'upload', 'download', 'share', 'link', 'play', 'pause'] },
  { group: 'UI', names: ['plus', 'minus', 'check', 'close', 'dot', 'eye', 'eye-off', 'lock', 'undo', 'redo', 'search', 'filter', 'settings', 'sliders'] },
  { group: 'Content', names: ['image', 'gallery', 'camera', 'video', 'music', 'mic', 'mic-wave', 'mail', 'bell', 'page', 'file', 'folder', 'type', 'text'] },
  { group: 'Place', names: ['pin', 'map', 'compass', 'globe', 'home', 'clock', 'calendar', 'calendar-check', 'ticket'] },
  { group: 'People', names: ['user', 'users', 'user-plus', 'heart-icon'] },
  { group: 'Brand', names: ['leaf', 'sparkles', 'sun', 'moon', 'star', 'wand', 'gift', 'fleuron', 'asterism'] },
  { group: 'Layout', names: ['grid', 'list', 'layers', 'layout', 'section', 'block', 'phone', 'tablet', 'desktop'] },
];

export interface DecorAsset {
  id: string;
  url: string;
  /** Asset family — drives the badge label + filter group.
   *  'upload' is for host-supplied SVG/PNG monograms. */
  kind: 'stamp' | 'divider' | 'confetti' | 'footer' | 'accent' | 'invite' | 'upload';
  /** Where this asset is wired into the manifest right now —
   *  surfaces an "In use" badge on the tile. */
  usage?: string;
  /** Human-readable label shown in the tile caption. */
  label: string;
}

/**
 * Walk the manifest's decor library + drafts and produce a flat
 * list of every AI-generated asset with usage info. Per-section
 * stamps split into individual tiles. Drafts surface as "saved".
 */
export function flattenDecorAssets(manifest: StoryManifest | null | undefined): DecorAsset[] {
  if (!manifest) return [];
  const out: DecorAsset[] = [];
  const lib = manifest.decorLibrary as
    | {
        divider?: string;
        sectionStamps?: Record<string, string>;
        confetti?: string;
        footerBouquet?: string;
        uploads?: Array<{ id: string; url: string; label: string; mime?: string; addedAt?: string }>;
      }
    | undefined;
  const drafts = (manifest as unknown as { decorDrafts?: Record<string, unknown> }).decorDrafts ?? {};
  const aiAccentUrl = (manifest as unknown as { aiAccentUrl?: string }).aiAccentUrl;

  if (lib?.sectionStamps) {
    for (const [section, url] of Object.entries(lib.sectionStamps)) {
      if (!url) continue;
      out.push({
        id: `stamp-${section}`,
        url,
        kind: 'stamp',
        usage: `${section[0]?.toUpperCase()}${section.slice(1)} eyebrow`,
        label: `${section[0]?.toUpperCase()}${section.slice(1)} stamp`,
      });
    }
  }

  if (lib?.divider) {
    out.push({ id: 'divider', url: lib.divider, kind: 'divider', usage: 'Section divider', label: 'Divider band' });
  }
  if (lib?.confetti) {
    out.push({ id: 'confetti', url: lib.confetti, kind: 'confetti', usage: 'RSVP burst', label: 'Confetti burst' });
  }
  if (lib?.footerBouquet) {
    out.push({ id: 'footer', url: lib.footerBouquet, kind: 'footer', usage: 'Footer flourish', label: 'Closing bouquet' });
  }
  if (aiAccentUrl) {
    out.push({ id: 'accent', url: aiAccentUrl, kind: 'accent', usage: 'Hero flourish', label: 'Hero accent' });
  }

  type Draft = { id: string; url: string; prompt?: string };
  type StampsDraft = { id: string; stamps: Record<string, string>; prompt?: string };
  function pushDrafts(slot: 'divider' | 'confetti' | 'footerBouquet' | 'accent', label: string, kind: DecorAsset['kind']) {
    const list = (drafts as Record<string, Draft[] | undefined>)[slot] ?? [];
    for (const d of list) {
      const live =
        slot === 'divider' ? lib?.divider :
        slot === 'confetti' ? lib?.confetti :
        slot === 'footerBouquet' ? lib?.footerBouquet :
        aiAccentUrl;
      if (d.url === live) continue;
      out.push({ id: `${slot}-${d.id}`, url: d.url, kind, label: `${label} · saved`, usage: undefined });
    }
  }
  pushDrafts('divider', 'Divider', 'divider');
  pushDrafts('confetti', 'Confetti', 'confetti');
  pushDrafts('footerBouquet', 'Bouquet', 'footer');
  pushDrafts('accent', 'Accent', 'accent');

  const uploads = lib?.uploads ?? [];
  for (const u of uploads) {
    out.push({ id: `upload-${u.id}`, url: u.url, kind: 'upload', label: u.label });
  }
  const stampDrafts = (drafts as Record<string, StampsDraft[] | undefined>).sectionStamps ?? [];
  for (const set of stampDrafts) {
    for (const [section, url] of Object.entries(set.stamps)) {
      if (!url) continue;
      const live = lib?.sectionStamps?.[section];
      if (url === live) continue;
      out.push({
        id: `stamp-draft-${set.id}-${section}`,
        url,
        kind: 'stamp',
        label: `${section[0]?.toUpperCase()}${section.slice(1)} · saved`,
      });
    }
  }

  return out;
}

/** Detects values that should render as an <img> rather than via
 *  the motif Icon switch — http(s):// URLs, /-relative paths, and
 *  data: URIs (base64). Anything else is treated as a motif name. */
export function isAssetUrl(value: string): boolean {
  if (!value) return false;
  return value.startsWith('http://') ||
         value.startsWith('https://') ||
         value.startsWith('data:') ||
         value.startsWith('/');
}
