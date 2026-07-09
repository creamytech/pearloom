// ─────────────────────────────────────────────────────────────
// Theme store — STANDALONE DECOR PRODUCTS (design-system v2)
//
// The store sells full theme Packs (packs.ts). This module adds the
// other half of the catalog: individual decor pieces a host can buy
// and apply on their own — a single motif, a divider, a monogram
// frame, or a component kit — without changing the rest of their
// look.
//
//   DecorItem  — one purchasable decor piece (kind + value + price).
//   DECOR_ITEMS — the curated catalog (basics free, fancier premium).
//   applyDecorItem(item, manifest) — writes the ONE manifest field
//     the piece controls (motifKind / dividerLook / monogram.frame /
//     kitId); never touches the rest of the look.
//
// Ownership rides the same `pl-store-owned` entitlement set as packs
// (keyed by item id). Free items are owned by default.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { Tier, PackBadges } from './packs';

export type DecorKind = 'motif' | 'divider' | 'monogram' | 'kit';

export interface DecorItem {
  /** Stable id — entitlement key + localStorage `pl-store-owned`. */
  id: string;
  kind: DecorKind;
  name: string;
  blurb: string;
  /** The canvas value written to the manifest: a MotifKind, a
   *  dividerLook id, a MonogramFrame, or a kitId. */
  value: string;
  /** 0 = free (owned by default). */
  price: number;
  tier: Tier;
  /** Up to four swatch hexes for the card chrome (optional). */
  swatches?: readonly string[];
  badges?: PackBadges;
  tags?: readonly string[];
}

function tierFor(price: number): Tier {
  return price === 0 ? 'free' : price >= 14 ? 'signature' : 'premium';
}

function it(o: Omit<DecorItem, 'tier'> & { tier?: Tier }): DecorItem {
  return { ...o, tier: o.tier ?? tierFor(o.price) };
}

/* ── Motifs — line ornaments + botanicals. The free Decor Library
   basics stay free here; the fancier marks carry a price. ── */
const MOTIFS: DecorItem[] = [
  it({ id: 'motif-olive', kind: 'motif', value: 'olive', name: 'Olive Sprig', blurb: 'The house mark, a quiet olive branch.', price: 0, tags: ['botanical', 'classic'] }),
  it({ id: 'motif-rings', kind: 'motif', value: 'pl-rings', name: 'Rings', blurb: 'Two interlocking rings, drawn by one line.', price: 0, tags: ['wedding', 'line'] }),
  it({ id: 'motif-orchid', kind: 'motif', value: 'orchid', name: 'Orchid', blurb: 'A single stem in fine line, patient and rare.', price: 6, tags: ['botanical', 'premium'] }),
  it({ id: 'motif-monstera', kind: 'motif', value: 'monstera', name: 'Monstera', blurb: 'Split-leaf green for a garden in full voice.', price: 6, tags: ['botanical', 'tropical'] }),
  it({ id: 'motif-peony', kind: 'motif', value: 'peony', name: 'Peony', blurb: 'A blowsy bloom at the height of June.', price: 6, tags: ['botanical', 'floral'] }),
  it({ id: 'motif-hummingbird', kind: 'motif', value: 'hummingbird', name: 'Hummingbird', blurb: 'A hovering wing, caught mid-note.', price: 8, tags: ['fauna', 'fine'] }),
  it({ id: 'motif-champagne', kind: 'motif', value: 'champagne', name: 'Champagne', blurb: 'A coupe and a rising bead, the toast.', price: 8, tags: ['celebration'] }),
  it({ id: 'motif-disco', kind: 'motif', value: 'disco', name: 'Disco Ball', blurb: 'A faceted glint for the late dancing.', price: 8, badges: { new: true }, tags: ['party', 'night'] }),
];

/* ── Dividers — the brand fleurons + special section rules. ── */
const DIVIDERS: DecorItem[] = [
  it({ id: 'divider-fleuron', kind: 'divider', value: 'pl-fleuron', name: 'Fleuron', blurb: 'A printer’s flower flanked by hairlines.', price: 0, tags: ['fleuron', 'classic'] }),
  it({ id: 'divider-sprig', kind: 'divider', value: 'sprig', name: 'Sprig', blurb: 'A small leaf, centered on the seam.', price: 0, tags: ['botanical'] }),
  it({ id: 'divider-pearl', kind: 'divider', value: 'pl-pearl', name: 'Pearl', blurb: 'A single gold bead between two rules.', price: 5, tags: ['fine', 'gold'] }),
  it({ id: 'divider-infinity', kind: 'divider', value: 'pl-infinity', name: 'Infinity', blurb: 'An unbroken loop, for the long view.', price: 5, tags: ['wedding'] }),
  it({ id: 'divider-thread', kind: 'divider', value: 'thread', name: 'Loom Thread', blurb: 'The two-strand olive-and-gold thread.', price: 5, badges: { best: true }, tags: ['brand', 'thread'] }),
  it({ id: 'divider-vine', kind: 'divider', value: 'vine', name: 'Vine', blurb: 'A trailing vine across the page.', price: 6, tags: ['botanical'] }),
  it({ id: 'divider-stars', kind: 'divider', value: 'stars', name: 'Stars', blurb: 'A scatter of small stars for evening.', price: 6, tags: ['celestial', 'night'] }),
];

/* ── Monograms — ornate frames for the couple's crest. ── */
const MONOGRAMS: DecorItem[] = [
  it({ id: 'mono-ring', kind: 'monogram', value: 'ring', name: 'Ring', blurb: 'Initials inside a clean gold ring.', price: 0, tags: ['classic'] }),
  it({ id: 'mono-laurel', kind: 'monogram', value: 'laurel', name: 'Laurel', blurb: 'A victor’s laurel around the crest.', price: 0, tags: ['classic'] }),
  it({ id: 'mono-wreath', kind: 'monogram', value: 'wreath', name: 'Wreath', blurb: 'A full botanical wreath, hand-drawn.', price: 6, tags: ['botanical'] }),
  it({ id: 'mono-fan', kind: 'monogram', value: 'fan', name: 'Deco Fan', blurb: 'A jazz-age fan framing the initials.', price: 6, tags: ['deco'] }),
  it({ id: 'mono-seal', kind: 'monogram', value: 'seal', name: 'Wax Seal', blurb: 'A pressed wax seal, as if just stamped.', price: 8, badges: { best: true }, tags: ['letterpress', 'seal'] }),
  it({ id: 'mono-halo', kind: 'monogram', value: 'halo', name: 'Halo', blurb: 'A fine radiant halo behind the letters.', price: 6, tags: ['celestial'] }),
  it({ id: 'mono-gate', kind: 'monogram', value: 'gate', name: 'Deco Gate', blurb: 'An architectural deco gateway.', price: 8, tags: ['deco', 'architectural'] }),
];

/* ── Component kits — the repeating card / row personality. ── */
const KITS: DecorItem[] = [
  it({ id: 'kit-classic', kind: 'kit', value: 'classic', name: 'Classic', blurb: 'Framed cards, centered, the house default.', price: 0, tags: ['classic'] }),
  it({ id: 'kit-minimal', kind: 'kit', value: 'minimal', name: 'Minimal', blurb: 'Hairline rules, no card chrome at all.', price: 0, tags: ['modern'] }),
  it({ id: 'kit-ticket', kind: 'kit', value: 'ticket', name: 'Ticket', blurb: 'Perforated ticket stubs for every row.', price: 8, tags: ['playful'] }),
  it({ id: 'kit-plate', kind: 'kit', value: 'plate', name: 'Plate', blurb: 'Engraved plate cards with a pressed edge.', price: 8, tags: ['formal'] }),
  it({ id: 'kit-scrapbook', kind: 'kit', value: 'scrapbook', name: 'Scrapbook', blurb: 'Taped, tilted, hand-kept pages.', price: 10, badges: { new: true }, tags: ['warm', 'craft'] }),
  it({ id: 'kit-index', kind: 'kit', value: 'index', name: 'Index', blurb: 'Library index cards, ruled and tabbed.', price: 8, tags: ['editorial'] }),
];

export const DECOR_ITEMS: readonly DecorItem[] = [...MOTIFS, ...DIVIDERS, ...MONOGRAMS, ...KITS];

export function decorItemsByKind(kind: DecorKind): DecorItem[] {
  return DECOR_ITEMS.filter((d) => d.kind === kind);
}

export function getDecorItem(id: string): DecorItem | undefined {
  return DECOR_ITEMS.find((d) => d.id === id);
}

/** Ids of the free pieces — owned by default, no purchase needed. */
export const FREE_DECOR_IDS: readonly string[] = DECOR_ITEMS.filter((d) => d.price === 0).map((d) => d.id);

/**
 * Apply one decor piece to a manifest — writes ONLY the field it
 * controls, leaving the rest of the look untouched. Mirrors the
 * relevant branch of applyPackToManifest.
 */
export function applyDecorItem(item: DecorItem, manifest: StoryManifest): StoryManifest {
  const next = { ...(manifest as unknown as Record<string, unknown>) };
  switch (item.kind) {
    case 'motif':
      next.motifKind = item.value;
      break;
    case 'divider':
      next.dividerLook = item.value;
      break;
    case 'kit':
      next.kitId = item.value;
      break;
    case 'monogram': {
      const mono = (next.monogram as { initials?: string; frame?: string } | undefined) ?? {};
      next.monogram = { ...mono, frame: item.value };
      break;
    }
  }
  return next as unknown as StoryManifest;
}
