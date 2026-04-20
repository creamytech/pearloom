// ─────────────────────────────────────────────────────────────
// Pearloom / editor/block-presets.ts
//
// Hand-authored "look" presets for each block type. When a user
// adds a new section from the Library or the "+" button, they're
// offered 3 starting variants (Minimalist / Cinematic / Playful)
// so every new block lands with an intentional aesthetic instead
// of a blank default. Saves ~3 clicks-in-the-Design-panel per
// insertion and makes the editor feel smart out of the gate.
//
// Each preset contributes a `config` object that's merged onto
// the new PageBlock; SiteRenderer already honors every key we
// set here (bgColor, verticalPadding, maxWidth, borderRadius,
// boxShadow, etc — see SiteRenderer.tsx ~line 1492).
// ─────────────────────────────────────────────────────────────

export interface BlockPreset {
  id: 'minimalist' | 'cinematic' | 'playful';
  name: string;
  /** Short italic line shown under the name. */
  tagline: string;
  /** Patch merged into `PageBlock.config`. */
  config: Record<string, unknown>;
  /** CSS gradient for the visual tile. */
  swatch: string;
  /** Accent color shown on the tile — drives the mini mock-up ink. */
  ink: string;
  /** Paper color for the mini mock-up. */
  paper: string;
}

export type BlockPresetMap = Record<string, BlockPreset[]>;

const GENERIC_PRESETS: BlockPreset[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    tagline: 'hushed paper, generous air',
    config: {
      bgColor: '#FAF7F2',
      verticalPadding: '120px',
      maxWidth: '960px',
      margin: '0 auto',
    },
    swatch: 'linear-gradient(180deg, #FAF7F2 0%, #F0ECE3 100%)',
    ink: '#18181B',
    paper: '#FAF7F2',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    tagline: 'widescreen, full bleed, bold',
    config: {
      bgColor: '#161006',
      verticalPadding: '160px',
      maxWidth: '100%',
      color: '#FAF7F2',
      boxShadow: 'inset 0 0 140px rgba(0,0,0,0.55)',
    },
    swatch: 'linear-gradient(180deg, #161006 0%, #2a1f10 100%)',
    ink: '#F0D484',
    paper: '#161006',
  },
  {
    id: 'playful',
    name: 'Playful',
    tagline: 'warm, animated, alive',
    config: {
      bgColor: '#F7E9D2',
      verticalPadding: '100px',
      maxWidth: '1100px',
      margin: '0 auto',
      borderRadius: 'var(--pl-radius-2xl)',
    },
    swatch: 'linear-gradient(135deg, #F7E9D2 0%, #F2C5A0 60%, #E5B0C8 100%)',
    ink: '#8B2D2D',
    paper: '#F7E9D2',
  },
];

const HERO_PRESETS: BlockPreset[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    tagline: 'names, a line, a rule',
    config: {
      bgColor: '#FAF7F2',
      verticalPadding: '140px',
      maxWidth: '100%',
      heroStyle: 'minimal',
    },
    swatch: 'linear-gradient(180deg, #FAF7F2 0%, #F0ECE3 100%)',
    ink: '#18181B',
    paper: '#FAF7F2',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    tagline: 'full-bleed portrait, slow reveal',
    config: {
      bgColor: '#100A04',
      verticalPadding: '0px',
      maxWidth: '100%',
      color: '#FAF7F2',
      heroStyle: 'cinematic',
      boxShadow: 'inset 0 -80px 180px rgba(0,0,0,0.65)',
    },
    swatch: 'linear-gradient(180deg, #100A04 0%, #2a1f10 100%)',
    ink: '#F0D484',
    paper: '#100A04',
  },
  {
    id: 'playful',
    name: 'Playful',
    tagline: 'sunrise gradient, hand-drawn',
    config: {
      bgColor: '#F7E9D2',
      verticalPadding: '120px',
      heroStyle: 'playful',
      color: '#8B2D2D',
    },
    swatch: 'linear-gradient(135deg, #F7E9D2 0%, #F5C78C 50%, #E5B0C8 100%)',
    ink: '#8B2D2D',
    paper: '#F7E9D2',
  },
];

const STORY_PRESETS: BlockPreset[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    tagline: 'one column, quiet rhythm',
    config: {
      bgColor: '#FAF7F2',
      verticalPadding: '120px',
      maxWidth: '780px',
      margin: '0 auto',
      storyLayoutHint: 'single-column',
    },
    swatch: 'linear-gradient(180deg, #FAF7F2 0%, #F0ECE3 100%)',
    ink: '#18181B',
    paper: '#FAF7F2',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    tagline: 'big photos, thin captions',
    config: {
      bgColor: '#161006',
      verticalPadding: '140px',
      maxWidth: '100%',
      color: '#FAF7F2',
      storyLayoutHint: 'parallax',
    },
    swatch: 'linear-gradient(180deg, #1a1207 0%, #3a2a14 100%)',
    ink: '#F0D484',
    paper: '#161006',
  },
  {
    id: 'playful',
    name: 'Playful',
    tagline: 'collage, rotations, warmth',
    config: {
      bgColor: '#FBEFDD',
      verticalPadding: '110px',
      maxWidth: '1100px',
      margin: '0 auto',
      borderRadius: 'var(--pl-radius-2xl)',
      storyLayoutHint: 'collage',
    },
    swatch: 'linear-gradient(135deg, #FBEFDD 0%, #F2C5A0 100%)',
    ink: '#8B2D2D',
    paper: '#FBEFDD',
  },
];

const COUNTDOWN_PRESETS: BlockPreset[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    tagline: 'serif numbers, thin rules',
    config: {
      bgColor: '#FAF7F2',
      verticalPadding: '100px',
      maxWidth: '680px',
      margin: '0 auto',
      countdownStyle: 'serif',
    },
    swatch: 'linear-gradient(180deg, #FAF7F2 0%, #F0ECE3 100%)',
    ink: '#18181B',
    paper: '#FAF7F2',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    tagline: 'giant ticker, black plate',
    config: {
      bgColor: '#0E0803',
      verticalPadding: '140px',
      maxWidth: '100%',
      color: '#FAF7F2',
      countdownStyle: 'ticker',
    },
    swatch: 'linear-gradient(180deg, #0E0803 0%, #2a1f10 100%)',
    ink: '#F0D484',
    paper: '#0E0803',
  },
  {
    id: 'playful',
    name: 'Playful',
    tagline: 'bubbly digits, blush paper',
    config: {
      bgColor: '#FBE4E4',
      verticalPadding: '90px',
      maxWidth: '820px',
      margin: '0 auto',
      borderRadius: '28px',
      countdownStyle: 'bubble',
    },
    swatch: 'linear-gradient(135deg, #FBE4E4 0%, #F5C78C 100%)',
    ink: '#8B2D2D',
    paper: '#FBE4E4',
  },
];

const EVENT_PRESETS: BlockPreset[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    tagline: 'program card, gold rule',
    config: {
      bgColor: '#FAF7F2',
      verticalPadding: '100px',
      maxWidth: '760px',
      margin: '0 auto',
      eventStyle: 'program',
    },
    swatch: 'linear-gradient(180deg, #FAF7F2 0%, #F0ECE3 100%)',
    ink: '#18181B',
    paper: '#FAF7F2',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    tagline: 'photo behind, overlay text',
    config: {
      bgColor: '#161006',
      verticalPadding: '120px',
      maxWidth: '100%',
      color: '#FAF7F2',
      eventStyle: 'photo-overlay',
    },
    swatch: 'linear-gradient(180deg, #1a1207 0%, #3a2a14 100%)',
    ink: '#F0D484',
    paper: '#161006',
  },
  {
    id: 'playful',
    name: 'Playful',
    tagline: 'postcard stack, hand stamps',
    config: {
      bgColor: '#FCE8D4',
      verticalPadding: '100px',
      maxWidth: '1000px',
      margin: '0 auto',
      borderRadius: '22px',
      eventStyle: 'postcard',
    },
    swatch: 'linear-gradient(135deg, #FCE8D4 0%, #F2C5A0 100%)',
    ink: '#8B2D2D',
    paper: '#FCE8D4',
  },
];

const RSVP_PRESETS: BlockPreset[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    tagline: 'fields only, gold rule',
    config: {
      bgColor: '#FAF7F2',
      verticalPadding: '110px',
      maxWidth: '560px',
      margin: '0 auto',
      rsvpStyle: 'stripped',
    },
    swatch: 'linear-gradient(180deg, #FAF7F2 0%, #F0ECE3 100%)',
    ink: '#18181B',
    paper: '#FAF7F2',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    tagline: 'letterpress card, dark room',
    config: {
      bgColor: '#161006',
      verticalPadding: '140px',
      maxWidth: '100%',
      color: '#FAF7F2',
      rsvpStyle: 'letterpress',
    },
    swatch: 'linear-gradient(180deg, #1a1207 0%, #3a2a14 100%)',
    ink: '#F0D484',
    paper: '#161006',
  },
  {
    id: 'playful',
    name: 'Playful',
    tagline: 'stamp-and-seal, confetti edge',
    config: {
      bgColor: '#FBE4E4',
      verticalPadding: '100px',
      maxWidth: '620px',
      margin: '0 auto',
      borderRadius: '28px',
      rsvpStyle: 'confetti',
    },
    swatch: 'linear-gradient(135deg, #FBE4E4 0%, #F5C78C 100%)',
    ink: '#8B2D2D',
    paper: '#FBE4E4',
  },
];

export const BLOCK_PRESETS: BlockPresetMap = {
  hero: HERO_PRESETS,
  story: STORY_PRESETS,
  countdown: COUNTDOWN_PRESETS,
  event: EVENT_PRESETS,
  rsvp: RSVP_PRESETS,
};

export function presetsFor(blockType: string): BlockPreset[] {
  return BLOCK_PRESETS[blockType] ?? GENERIC_PRESETS;
}
