// ──────────────────────────────────────────────────────────────
// Hero variant barrel — registers all 5 with the block-style
// registry on first import. Importing this file (e.g. from
// SiteV8Renderer) is what makes the variants discoverable to the
// Inspector picker via getBlockStyles('hero').
// ──────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { HeroPostcard } from './Postcard';
import { HeroPhotoFirst } from './PhotoFirst';
import { HeroSplit } from './Split';
import { HeroCarousel } from './Carousel';
import { HeroMinimal } from './Minimal';
import type { HeroVariantProps } from './types';

export type { HeroVariantProps } from './types';

// ── Mini SVG previews — what the picker shows. ────────────────
// Each preview is a 64×40 abstract sketch of where the elements
// land. Reads at a glance even at thumbnail size.

const PostcardPreview = (
  <svg viewBox="0 0 64 40" width="100%" height="100%">
    <line x1="14" y1="11" x2="50" y2="11" stroke="#6F6557" strokeWidth="0.5" />
    <line x1="14" y1="13" x2="50" y2="13" stroke="#6F6557" strokeWidth="0.5" />
    <text x="32" y="22" textAnchor="middle" fontFamily="serif" fontSize="6" fontStyle="italic" fill="#0E0D0B">Anna · Liam</text>
    <line x1="20" y1="27" x2="44" y2="27" stroke="#6F6557" strokeWidth="0.4" />
    <rect x="6" y="30" width="6" height="7" rx="0.5" fill="#C49A6F" opacity="0.5" />
    <rect x="14" y="30" width="6" height="7" rx="0.5" fill="#5C6B3F" opacity="0.5" />
    <rect x="22" y="29" width="6" height="8" rx="0.5" fill="#8B6F8E" opacity="0.5" />
    <rect x="30" y="30" width="9" height="7" rx="0.5" fill="#C6703D" opacity="0.55" />
    <rect x="41" y="30" width="6" height="7" rx="0.5" fill="#C49A6F" opacity="0.5" />
    <rect x="49" y="30" width="6" height="7" rx="0.5" fill="#5C6B3F" opacity="0.5" />
  </svg>
);

const PhotoFirstPreview = (
  <svg viewBox="0 0 64 40" width="100%" height="100%">
    <rect x="0" y="0" width="64" height="40" fill="#0E0D0B" />
    <rect x="0" y="0" width="64" height="40" fill="url(#pf-grad)" />
    <defs>
      <linearGradient id="pf-grad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#0E0D0B" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#0E0D0B" stopOpacity="0" />
      </linearGradient>
    </defs>
    <text x="32" y="28" textAnchor="middle" fontFamily="serif" fontSize="6" fontStyle="italic" fill="#FBF7EE">Anna · Liam</text>
    <text x="32" y="34" textAnchor="middle" fontFamily="sans-serif" fontSize="3" fill="#FBF7EE" opacity="0.85">SEPT 12 · NEW YORK</text>
  </svg>
);

const SplitPreview = (
  <svg viewBox="0 0 64 40" width="100%" height="100%">
    <rect x="2" y="4" width="28" height="32" rx="0.5" fill="#C49A6F" opacity="0.6" />
    <text x="46" y="14" textAnchor="middle" fontFamily="serif" fontSize="5" fontStyle="italic" fill="#0E0D0B">Anna</text>
    <text x="46" y="20" textAnchor="middle" fontFamily="serif" fontSize="3" fontStyle="italic" fill="#6F6557">and</text>
    <text x="46" y="26" textAnchor="middle" fontFamily="serif" fontSize="5" fontStyle="italic" fill="#0E0D0B">Liam</text>
    <rect x="38" y="30" width="16" height="3" rx="1.5" fill="#0E0D0B" />
  </svg>
);

const CarouselPreview = (
  <svg viewBox="0 0 64 40" width="100%" height="100%">
    <rect x="2" y="4" width="14" height="14" rx="0.5" fill="#C49A6F" opacity="0.55" />
    <rect x="18" y="4" width="14" height="14" rx="0.5" fill="#8B6F8E" opacity="0.55" />
    <rect x="34" y="4" width="14" height="14" rx="0.5" fill="#5C6B3F" opacity="0.55" />
    <rect x="50" y="4" width="14" height="14" rx="0.5" fill="#C6703D" opacity="0.55" />
    <text x="32" y="28" textAnchor="middle" fontFamily="serif" fontSize="6" fontStyle="italic" fill="#0E0D0B">Anna · Liam</text>
    <line x1="20" y1="33" x2="44" y2="33" stroke="#6F6557" strokeWidth="0.5" />
  </svg>
);

const MinimalPreview = (
  <svg viewBox="0 0 64 40" width="100%" height="100%">
    <line x1="20" y1="14" x2="44" y2="14" stroke="#6F6557" strokeWidth="0.4" />
    <text x="32" y="23" textAnchor="middle" fontFamily="serif" fontSize="7" fontStyle="italic" fill="#0E0D0B">Anna · Liam</text>
    <line x1="22" y1="28" x2="42" y2="28" stroke="#6F6557" strokeWidth="0.4" />
    <text x="32" y="34" textAnchor="middle" fontFamily="sans-serif" fontSize="3" fill="#6F6557">SEPT 12 · NEW YORK</text>
  </svg>
);

// ── Register variants. Order matters — the first is the default. ──

registerBlockStyle<HeroVariantProps>({
  blockType: 'hero',
  id: 'postcard',
  label: 'Postcard',
  description: 'Editorial centered composition with a polaroid strip below.',
  preview: PostcardPreview,
  Component: HeroPostcard,
});

registerBlockStyle<HeroVariantProps>({
  blockType: 'hero',
  id: 'photo-first',
  label: 'Photo-first',
  description: 'Full-bleed cover photo with names overlaid — cinematic.',
  preview: PhotoFirstPreview,
  Component: HeroPhotoFirst,
});

registerBlockStyle<HeroVariantProps>({
  blockType: 'hero',
  id: 'split',
  label: 'Split',
  description: 'Photo on the left, names + details on the right.',
  preview: SplitPreview,
  Component: HeroSplit,
});

registerBlockStyle<HeroVariantProps>({
  blockType: 'hero',
  id: 'carousel',
  label: 'Carousel',
  description: 'Scrolling photo reel above the names.',
  preview: CarouselPreview,
  Component: HeroCarousel,
});

registerBlockStyle<HeroVariantProps>({
  blockType: 'hero',
  id: 'minimal',
  label: 'Minimal',
  description: 'Type only — no photo, no atmosphere. Just the names.',
  preview: MinimalPreview,
  Component: HeroMinimal,
});

// Ensure side-effect registration on import even if tree-shaking
// would otherwise strip this file. Re-export a marker so callers
// who import the barrel get a value rather than nothing.
export const HERO_VARIANTS_REGISTERED = true;
