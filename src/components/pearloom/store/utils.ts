// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/store/utils.ts
//
// Shared helpers for the Theme Store surface. Mirrors the
// prototype's `priceLabel`, `fontName`, `collName`, and the
// rotating SAMPLE_NAMES array used by PackPreview vignettes.
// ─────────────────────────────────────────────────────────────

import { COLLECTIONS, type CollectionId, type Pack, type Tier } from '@/lib/theme-store/packs';

/** Eight rotating couple-name pairs used in pack preview vignettes. */
export const SAMPLE_NAMES: ReadonlyArray<readonly [string, string]> = [
  ['Ava', 'Liam'],
  ['Maya', 'Noah'],
  ['Elena', 'Theo'],
  ['Mei', 'Jonah'],
  ['Zoe', 'Kai'],
  ['Iris', 'Hugo'],
  ['Lucia', 'Sam'],
  ['Nora', 'Eli'],
];

export function priceLabel(cents: number): string {
  if (cents === 0) return 'Free';
  return '$' + Math.round(cents / 100);
}

export function tierLabel(tier: Tier): string {
  return tier === 'free' ? 'Free' : tier === 'premium' ? 'Premium' : 'Signature';
}

/** Lookup a collection display name; falls back to id string. */
export function collectionName(id: CollectionId | string): string {
  const c = COLLECTIONS.find((x) => x.id === id);
  return c ? c.name : String(id);
}

/** Extract a readable font name from a `font-family` declaration. */
export function fontName(value: string | undefined): string {
  if (!value) return 'Sans';
  const m = value.match(/['"]([^'"]+)['"]/);
  return m ? m[1] : 'Sans';
}

/** Map a Pack's motif to a divider-style hint. */
export type DividerStyle = 'sprig' | 'brush' | 'dot' | 'rule';

export function dividerForMotif(motif: Pack['motif']): DividerStyle {
  switch (motif) {
    case 'olive':
      return 'sprig';
    case 'bloom':
      return 'brush';
    case 'pressed':
      return 'dot';
    default:
      return 'rule';
  }
}

/** Map a Pack's kit to a human-readable label for the QuickLook strip. */
export function kitLabel(kit: Pack['kit']): string {
  switch (kit) {
    case 'classic':
      return 'Classic';
    case 'plate':
      return 'Plate';
    case 'scrapbook':
      return 'Scrapbook';
    case 'minimal':
      return 'Minimal';
    case 'ticket':
      return 'Ticket';
    case 'arch':
      return 'Arch';
    case 'stamp':
      return 'Stamp';
    case 'deco':
      return 'Deco';
    case 'gallery':
      return 'Gallery';
    case 'menu':
      return 'Tasting Menu';
    default:
      return kit;
  }
}

/** Human-readable label for a texture id (used in QuickLook "What's included"). */
export function textureLabel(texture: Pack['texture']): string {
  if (texture === 'none') return 'Flat matte finish';
  return texture.charAt(0).toUpperCase() + texture.slice(1) + ' texture';
}

/** Human-readable label for a motif id. */
export function motifLabel(motif: Pack['motif']): string {
  if (motif === 'none') return 'Clean, no motifs';
  return motif.charAt(0).toUpperCase() + motif.slice(1) + ' artwork';
}
