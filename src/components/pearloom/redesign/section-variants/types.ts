
import type { ReactNode } from 'react';

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

export interface ScheduleRow {
  t: string; l: string; s: string; m?: string; day?: number;
  /** Street address → the "Directions" link on the row. */
  addr?: string;
}
export interface ScheduleCopy {
  eyebrow: string; title: string; italic?: string;
  rows: ScheduleRow[];
}

export interface Hotel {
  name: string; price: string; rating: number; reviews: number;
  dist: string; tone: PhotoTone; blurb: string; amenities: string[];
  /** Real Google Places photo URL (or any host-supplied image).
   *  When present, variants render this instead of the tone
   *  gradient placeholder. */
  photoUrl?: string;
  /** Booking link → the explicit "Book now" button. */
  bookingUrl?: string;
  /** Group/room-block code — rendered as a tap-to-copy chip. */
  groupRate?: string;
  /** Real coordinates (Google Places / wizard autocomplete).
   *  When ≥2 points carry coords, TravelMap plots them at their
   *  true relative positions instead of the decorative pins. */
  lat?: number;
  lng?: number;
}
export interface TravelCopy {
  eyebrow: string; title: string; italic?: string;
  /** Host-authored intro line (TravelPanel "Getting there" field
   *  → manifest.travelInfo.directions). Rendered above the hotel
   *  list in EVERY variant. */
  intro?: string;
  /** Shuttle note (manifest.travelInfo.shuttle) — rendered as a
   *  callout after the hotel list in EVERY variant. */
  shuttle?: string;
  hotels: Hotel[];
  /** The venue's pin (manifest.logistics.venueLat/venueLng) —
   *  anchors the TravelMap projection so hotel pins read as
   *  "near the venue", not floating in abstract space. */
  venuePin?: { name: string; lat: number; lng: number };
}

export interface RegistryStore {
  name: string; url?: string;
  /** Host note under the store ("for the honeymoon fund"). */
  note?: string;
}
export interface RegistryCopy {
  eyebrow: string; title: string; italic?: string;
  body: string; stores: RegistryStore[];
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
export interface RegistryVariantCtx extends BaseCtx {
  C: RegistryCopy;
  /** Native registry item grid (RegistryItemsGrid) — rendered by
   *  every registry variant between the intro body and the
   *  linked-store pills. Built once in ThemedSite's RegistryBlock
   *  so variants can't drift on fetch/claim behaviour. */
  itemsSlot?: ReactNode;
}
export interface GalleryVariantCtx extends BaseCtx { C: GalleryCopy }
export interface FaqVariantCtx extends BaseCtx { C: FaqCopy }
export interface StoryVariantCtx extends BaseCtx { C: StoryCopy }
