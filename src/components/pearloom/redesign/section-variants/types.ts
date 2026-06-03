/* eslint-disable no-restricted-syntax */
/* Shared types for the per-section layout variant components in
   src/components/pearloom/redesign/section-variants/*.tsx.

   Each variant component takes one prop, `ctx`, with the minimal
   slice of ThemedSite's internal Ctx + Copy that the variant
   needs. Kept tight so a new variant can't accidentally reach
   into editor-only state. */

export type Density = 'cozy' | 'comfortable' | 'spacious';

/* Must stay in sync with the PhotoTone alias in ThemedSite.tsx
   (line ~1065). Adding tones here without adding them there will
   break the variant dispatch typecheck. */
export type PhotoTone =
  | 'lavender' | 'peach' | 'sage' | 'cream' | 'warm' | 'field' | 'dusk';

export interface VariantTheme {
  /** Used by RSVP banner / details-bento / registry-progress
   *  variants to detect "is this a foil-finish theme" and switch
   *  on a gradient accent. */
  foil?: boolean;
}

/* The variants share a small slice of Copy. Each section's
   variant only consumes its own slice. */

export interface RsvpCopy {
  eyebrow: string;
  title: string;
  body: string;
}

export interface DetailsItem { l: string; v: string; icon: string; s?: string }
export interface DetailsCopy {
  eyebrow: string; title: string; italic?: string;
  items: DetailsItem[];
}

export interface ScheduleRow { t: string; l: string; s: string; m?: string; day?: number }
export interface ScheduleCopy {
  eyebrow: string; title: string; italic?: string;
  rows: ScheduleRow[];
}

export interface Hotel {
  name: string; price: string; rating: number; reviews: number;
  dist: string; tone: PhotoTone; blurb: string; amenities: string[];
}
export interface TravelCopy {
  eyebrow: string; title: string; italic?: string;
  /** Host-authored intro line (TravelPanel "Getting there" field
   *  → manifest.travelInfo.directions). Rendered above the hotel
   *  list. Variants that don't display it ignore the field. */
  intro?: string;
  hotels: Hotel[];
}

export interface RegistryStore { name: string; url?: string }
export interface RegistryCopy {
  eyebrow: string; title: string; italic?: string;
  body: string; stores: RegistryStore[];
  fundPct?: number; fundSub?: string;
}

export interface GalleryCopy {
  eyebrow: string; title: string; italic?: string;
  tones: PhotoTone[];
  /** Host-uploaded photo URLs. When non-empty, variants render
   *  these instead of the tone gradients. Source: manifest.galleryImages. */
  photos?: string[];
}

export interface FaqQA { q: string; a?: string }
export interface FaqCopy {
  eyebrow: string; title: string; italic?: string;
  questions: string[];
  qa?: FaqQA[];
}

export interface StoryCopy {
  eyebrow: string; title: string; italic?: string;
  body: string; chips?: string[];
  /** Up to 3 host-uploaded chapter photos. Variants that render
   *  per-chapter cards read these instead of the gradient
   *  placeholder when set. Source: manifest.chapters[i].images[0]. */
  chapterImages?: (string | undefined)[];
  /** Per-chapter titles + bodies. When set, multi-chapter variants
   *  use them instead of the shared title / body across each card. */
  chapterTitles?: (string | undefined)[];
  chapterBodies?: (string | undefined)[];
}

export interface BaseCtx {
  /** Density is derivable from pad (cozy 0.74 / comfortable 1 /
   *  spacious 1.32) — kept optional so dispatch sites can omit it
   *  when only pad matters. */
  density?: Density;
  pad: number;
  editable: boolean;
  cta: string;
  theme?: VariantTheme;
  /** Optional edit callbacks — when present, the variant's
   *  VariantSectionHead becomes click-to-edit. Mirrors what the
   *  default section paths feed TSectionHead. */
  onEditEyebrow?: (v: string) => void;
  onEditTitle?: (v: string) => void;
  /** Placeholder strings for empty eyebrow / title slots. */
  eyebrowPlaceholder?: string;
  titlePlaceholder?: string;
}

export interface RsvpVariantCtx extends BaseCtx { C: RsvpCopy }
export interface DetailsVariantCtx extends BaseCtx { C: DetailsCopy }
export interface ScheduleVariantCtx extends BaseCtx { C: ScheduleCopy }
export interface TravelVariantCtx extends BaseCtx { C: TravelCopy }
export interface RegistryVariantCtx extends BaseCtx { C: RegistryCopy }
export interface GalleryVariantCtx extends BaseCtx { C: GalleryCopy }
export interface FaqVariantCtx extends BaseCtx { C: FaqCopy }
export interface StoryVariantCtx extends BaseCtx { C: StoryCopy }
