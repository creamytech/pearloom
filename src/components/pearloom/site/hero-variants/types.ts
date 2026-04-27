// ──────────────────────────────────────────────────────────────
// Shared types for hero variant components.
//
// All 5 hero variants (Postcard / PhotoFirst / Split / Carousel /
// Minimal) consume the same prop bundle. The parent HeroSection
// computes context once and dispatches based on
// manifest.blockStyles.hero.style.
// ──────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

export type HeroFieldEditor = (patch: (m: StoryManifest) => StoryManifest) => void;

export interface HeroVariantProps {
  manifest: StoryManifest;
  names: [string, string];
  siteSlug?: string;
  onEditField?: HeroFieldEditor;
  onEditNames?: (next: [string, string]) => void;
  /** Pre-computed context the dispatcher hands down so each variant
   *  doesn't re-derive the same fields. */
  context: {
    n1: string;
    n2: string;
    coverPhoto?: string;
    photos: string[];
    venue: string;
    rsvpDeadline?: string;
    deadlineStr: string | null;
    heroCopy: string;
    dateInfo: { pretty: string; weekday: string } | null;
    heroKicker: string;
    signatureDecor?: string;
    occasion?: string;
  };
}
