// Shared answer shape + step props for the new wizard design.
// Keeps types in one place so step files stay compact.

import type { CategoryKey, StepKey } from './wizardSpec';

export type StoryLayout =
  | 'auto'
  | 'parallax'
  | 'filmstrip'
  | 'magazine'
  | 'timeline'
  | 'kenburns'
  | 'bento';

export interface MoodboardDrop {
  id: string;
  url: string;
  palette?: string[];
}

export interface Palette {
  id: string;
  name: string;
  colors: string[];
}

export interface PhotoEntry {
  // GooglePhotoMetadata-compatible — these flow straight to the
  // /api/generate/stream clustering + pipeline. `baseUrl` must be
  // a stable URL (R2 upload or Google Photos picker URL); blob:
  // URLs break server-side clustering.
  id: string;
  baseUrl: string;
  filename: string;
  mimeType: string;
  creationTime: string; // ISO 8601 — critical for cluster date math
  width: number;
  height: number;
  description?: string;
  source?: 'upload' | 'google';
  // User-provided overlays from the Review step
  note?: string;
  location?: string;
  date?: string;
}

export interface WizardAnswers {
  category?: CategoryKey;
  occasion?: string;
  nameA?: string;
  nameB?: string;
  hostRole?: 'principal' | 'co-host' | 'family' | 'organizer';

  // Date — dateMode lets the user stay vague
  dateMode?: 'specific' | 'season' | 'year' | 'tba';
  date?: string;          // ISO YYYY-MM-DD when dateMode='specific'
  dateSeason?: string;    // "late summer 2026" when dateMode='season'
  dateYear?: number;      // when dateMode='year'

  venue?: string;
  guestCount?: number | 'small' | 'medium' | 'large';

  eventDetails?: {
    days?: number;
    livestreamUrl?: string;
    inMemoryOf?: string;
    school?: string;
  };

  photos?: PhotoEntry[];

  // Fact sheet — anchors Pass 1 and grounds Pass 1.5
  factSheet?: {
    howWeMet?: string;
    why?: string;
    favorite?: string;
  };

  // Vibe — raw user words + derived bits
  vibeName?: string;           // untouched user phrase
  vibe?: string;               // longer description
  moodboard?: MoodboardDrop[];
  palette?: Palette;

  storyLayout?: StoryLayout;
  storyLayoutPreference?: StoryLayout;

  songUrl?: string;
  songMeta?: { title: string; artist?: string };

  visibility?: 'public' | 'unlisted' | 'private';
  tonePolicy?: 'celebratory' | 'reflective' | 'mixed';

  optInAILogo?: boolean;
}

export interface StepProps {
  answers: WizardAnswers;
  set: (patch: Partial<WizardAnswers>) => void;
  next: () => void;
  back: () => void;
  skip?: () => void;
  goTo?: (k: StepKey) => void;
  dark?: boolean;
}
