// ─────────────────────────────────────────────────────────────
// studio-theme-packs.ts — the Theme Store's packs, pressable in
// the Studio (STUDIO-PLAN SV.1: one look contract).
//
// A pack look rides the persisted manifest.studio.palette /
// .fontPair fields as 'pack:<packId>'. Resolution mirrors the
// 'site' sentinel exactly: the card root mounts the pack's full
// --t-* bag (packThemeRootStyle — the same stamp-every-var
// mechanism the store's PackPreview uses) and the palette /
// font pair are var() references that resolve against it, so
// the card wears the pack's REAL colors, faces, and paper —
// never a nearest-hue preset.
//
// Stale ids (a pack retired from the catalog) resolve to null
// and useStudioState falls back to the default palette — the
// same contract every other persisted Studio dial follows.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';
import { PACKS, type Pack } from '@/lib/theme-store/packs';
import type { StudioFontPair, StudioPalette } from './studio-constants';

export const PACK_LOOK_PREFIX = 'pack:';

export function isPackLookId(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.startsWith(PACK_LOOK_PREFIX);
}

export function packLookId(packId: string): string {
  return `${PACK_LOOK_PREFIX}${packId}`;
}

/** The catalog pack behind a 'pack:<id>' palette/font id — null
 *  for non-pack ids and for packs no longer in the catalog. */
export function packFromLookId(id: string | null | undefined): Pack | null {
  if (!isPackLookId(id)) return null;
  const packId = id.slice(PACK_LOOK_PREFIX.length);
  return PACKS.find((p) => p.id === packId) ?? null;
}

/** var()-based palette — resolves against packThemeRootStyle()
 *  mounted on the card root (the SITE_PALETTE mechanism). */
export function packPalette(pack: Pack): StudioPalette {
  return {
    id: packLookId(pack.id),
    name: pack.name,
    paper: 'var(--t-paper)',
    ink: 'var(--t-ink)',
    accent: 'var(--t-accent)',
    accent2: 'var(--t-accent-bg, var(--t-section))',
    sub: `${pack.name} · theme pack`,
  };
}

export function packFont(pack: Pack): StudioFontPair {
  return {
    id: packLookId(pack.id),
    name: pack.name,
    display: 'var(--t-display)',
    ui: 'var(--t-body)',
    weight: 600,
    italic: false,
    sub: `${pack.name}’s faces`,
  };
}

/** The pack's full --t-* bag as a card-root style. */
export function packThemeRootStyle(pack: Pack): CSSProperties {
  return { ...(pack.themeRef as unknown as CSSProperties) };
}

/** The paper grain a pack look brings with it (null = smooth).
 *  Pack textures share the site's [data-pl-texture] CSS, so the
 *  store-exclusive materials (silk / washi / …) render on the
 *  card exactly as they do on a site wearing the pack. */
export function packStudioTexture(pack: Pack): string | null {
  return pack.texture === 'none' ? null : pack.texture;
}
