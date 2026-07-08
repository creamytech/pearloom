'use client';

/* ========================================================================
   PEARLOOM — WIZARD (v8 handoff port)
   Functional 6-step wizard posting to /api/sites. Matches the handoff
   progress-thread + Pear helper shell.
   ======================================================================== */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, Pear, PearloomLogo, Sparkle, Sprig } from '../motifs';
import { OccasionGlyph } from '../icons/OccasionGlyph';
import { Motif, type MotifKind } from '../site/MotifScatter';
import { Pearl } from '@/components/brand/Pearl';
import { letterpressShadow, FoilGradient } from '@/components/brand/pressed';
import { useSession } from 'next-auth/react';
import { applyVibeLook, vibeLookSummary, VIBE_LOOKS } from '@/lib/site-look/vibe-look';
import { Reveal } from '../motion';
import { formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { parseLocalDate } from '@/lib/date-utils';
import { TEMPLATES_BY_ID } from '../marketplace/templates-data';
import { EVENT_TYPES, getEventType, recommendTextureFor, lookDefaultsFor, type EventCategory, type EventVoice } from '@/lib/event-os/event-types';
import { nameModeFor, nameModeIsValid } from '@/lib/event-os/name-mode';
import { previewFrameFor, orderPalettesForOccasion, defaultPaletteIdFor } from '@/lib/event-os/preview-frame';
import { questionsFor } from '@/lib/event-os/wizard-questions';
import { NumberInput } from '../editor/v8-forms';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';
import { WeaveLoader } from '@/components/brand/WeaveLoader';
import { WizardLocationAutocomplete } from '../wizard/WizardLocationAutocomplete';
import { WizardDatePicker } from '../wizard/WizardDatePicker';
import { WizardTimePicker } from '../wizard/WizardTimePicker';
import { GeneratingScreen } from '../wizard/GeneratingScreen';
import { StoryListen } from '../wizard/StoryListen';
import { AmbientSprig } from '../ambient';
import { useBackgroundCook, readCookedDecor } from '../wizard/useBackgroundCook';
import { BackgroundCookPill } from '../wizard/BackgroundCookPill';
import { usePhotoPalette } from '../wizard/usePhotoPalette';
import {
  normalizeImageFile,
  blobToDataUrl,
  filenameForOutput,
  isHeicLike,
  normalizeErrorMessage,
} from '@/lib/image/normalize-image';
import { WizardMomentCard } from '../wizard/WizardMomentCard';
import { useDialog } from '@/components/ui/confirm-dialog';
import { scheduleEventSuggestions, dressCodeSuggestions, typicalTimeFor } from '@/components/pearloom/editor/panels/_suggestions';
import { seedSectionsFromWizard, suggestRsvpDeadline } from '@/lib/wizard-seed';
import { draftFirstPressing, FIRST_PRESSING_ENABLED } from '@/lib/first-pressing/client';
import { mergeDraft } from '@/lib/first-pressing/merge';
import { applySectionPicks, essentialSectionsFor } from '@/lib/event-os/wizard-sections';
import { WizardSectionChooser } from './wizard-sections';
import { trackEvent } from '@/lib/analytics/beacon';
import { applyWizardLook } from '@/lib/site-look/wizard-look';
import { lookRecipesFor } from '@/lib/site-look/look-recipes';
import { WizardStructureSection } from './wizard-structure';
import { WizardFittingRoom, type PaletteChoice } from './wizard-fitting-room';
import type { StoryManifest } from '@/types';

// Layout step removed 2026-05-30 — superseded again 2026-06-10:
// Editions are no longer host-facing anywhere; layout variants now
// stamp via applyWizardLook at generation, so making the
// host pick a layout in the wizard then potentially have it
// overwritten by an Edition was double work + confusing. Default
// layout 'timeline' stays seeded as st.layout for backward compat
// with the generation pipeline which still reads layoutFormat.
const STEPS = ['Occasion', 'Basics', 'Details', 'Day', 'Photos', 'Sections', 'Vibe', 'Palette', 'Review'] as const;
type StepKey = (typeof STEPS)[number];

// 8 steps grouped into 4 phases. Pearloom's wizard now reads as
// "you're on Story · 2 of 3" rather than "step 2 of 8" — the
// phase name carries the meaning, the step count is supporting
// chrome. PhaseHeader renders this above the canvas.
type PhaseKey = 'Story' | 'Photos' | 'Look' | 'Review';
const PHASES: Array<{ key: PhaseKey; steps: readonly StepKey[] }> = [
  { key: 'Story', steps: ['Occasion', 'Basics', 'Details', 'Day'] },
  { key: 'Photos', steps: ['Photos'] },
  { key: 'Look', steps: ['Sections', 'Vibe', 'Palette'] },
  { key: 'Review', steps: ['Review'] },
];
function phaseFor(step: StepKey): PhaseKey {
  return PHASES.find((p) => p.steps.includes(step))?.key ?? 'Story';
}

// Draw occasion list from the Event OS registry (all 28 supported
// events), grouped by category with a friendly icon + tone per card.
interface OccasionCard {
  id: string;
  label: string;
  icon: string;
  tone: 'peach' | 'sage' | 'lavender' | 'cream';
  category: EventCategory;
}
const CATEGORY_LABELS: Record<EventCategory, string> = {
  'wedding-arc': 'Wedding arc',
  family: 'Family & home',
  milestone: 'Milestones',
  cultural: 'Ceremonies & faith',
  commemoration: 'Memorials & reunions',
};
function iconFor(id: string): string {
  if (id === 'wedding' || id === 'engagement' || id === 'vow-renewal' || id === 'anniversary' || id === 'bridal-shower' || id === 'bridal-luncheon') return 'heart-icon';
  if (id === 'memorial' || id === 'funeral') return 'leaf';
  if (id === 'baby-shower' || id === 'gender-reveal' || id === 'sip-and-see' || id === 'first-birthday') return 'sparkles';
  if (id === 'bar-mitzvah' || id === 'bat-mitzvah' || id === 'quinceanera' || id === 'baptism' || id === 'first-communion' || id === 'confirmation') return 'sparkles';
  if (id === 'reunion' || id === 'housewarming' || id === 'welcome-party' || id === 'brunch') return 'users';
  if (id === 'retirement' || id === 'graduation') return 'leaf';
  if (id === 'bachelor-party' || id === 'bachelorette-party') return 'compass';
  if (id === 'birthday' || id === 'milestone-birthday' || id === 'sweet-sixteen' || id === 'rehearsal-dinner') return 'gift';
  if (id === 'story') return 'sparkles';
  return 'sparkles';
}
function toneFor(id: string): 'peach' | 'sage' | 'lavender' | 'cream' {
  const e = getEventType(id as never);
  const voice = e?.voice;
  if (voice === 'solemn') return 'lavender';
  if (voice === 'ceremonial') return 'cream';
  if (voice === 'playful') return 'peach';
  if (voice === 'intimate') return 'sage';
  return 'peach';
}
// "a wedding" / "an engagement" — the Sections subhead noun, drawn
// from the registry label with a naive article.
function occasionArticleLabel(id: string): string {
  const label = (getEventType(id as never)?.label ?? 'celebration').toLowerCase();
  const article = /^[aeiou]/.test(label) ? 'an' : 'a';
  return `${article} ${label}`;
}

const OCCASIONS: OccasionCard[] = EVENT_TYPES
  .filter((e) => e.status === 'shipping' || e.status === 'beta')
  .map((e) => ({ id: e.id, label: e.label, icon: iconFor(e.id), tone: toneFor(e.id), category: e.category }));

// Brand-family tints per card tone (BRAND.md §5). The prototype's
// pastel peach/lavender chips are retired — every tone resolves to
// a cream-deep / olive-mist surface with an olive or ink glyph.
type CardTone = OccasionCard['tone'];
const TONE_BG: Record<CardTone, string> = {
  peach: 'var(--pl-cream-deep, #EBE3D2)',
  lavender: 'var(--pl-olive-mist, #E0DDC9)',
  sage: 'var(--sage-tint, #E3E6C8)',
  cream: 'var(--cream-2, #FBF7EE)',
};
const TONE_INK: Record<CardTone, string> = {
  peach: 'var(--pl-olive, #5C6B3F)',
  lavender: 'var(--pl-ink, #0E0D0B)',
  sage: 'var(--sage-deep, #5C6B3F)',
  cream: 'var(--pl-ink, #0E0D0B)',
};

// Master vibe-chip catalog. Ids are free strings — they flow into
// generation verbatim as the vibeString (st.vibes.join(', ')) — so
// the only contract is that existing ids stay stable. Which chips
// SHOW per occasion is voice-aware: see VOICE_VIBES below.
const VIBES = [
  { id: 'romantic', label: 'Romantic', icon: '♥', tone: 'peach' as const },
  { id: 'joyful', label: 'Joyful', icon: '✦', tone: 'peach' as const },
  { id: 'intimate', label: 'Intimate', icon: '◉', tone: 'lavender' as const },
  { id: 'playful', label: 'Playful', icon: '✿', tone: 'peach' as const },
  { id: 'quiet', label: 'Quiet', icon: '⟐', tone: 'sage' as const },
  { id: 'editorial', label: 'Editorial', icon: '❖', tone: 'cream' as const },
  { id: 'groovy', label: 'Groovy', icon: '\u2600\uFE0E', tone: 'peach' as const },
  { id: 'outdoorsy', label: 'Outdoorsy', icon: '\u2618\uFE0E', tone: 'sage' as const },
  { id: 'modern', label: 'Modern', icon: '■', tone: 'lavender' as const },
  // Voice-specific chips — same free-string contract as the originals.
  { id: 'gentle', label: 'Gentle', icon: '✾', tone: 'sage' as const },
  { id: 'reflective', label: 'Reflective', icon: '☾', tone: 'lavender' as const },
  { id: 'warm', label: 'Warm', icon: '✺', tone: 'peach' as const },
  { id: 'classic', label: 'Classic', icon: '❦', tone: 'cream' as const },
  { id: 'traditional', label: 'Traditional', icon: '⚜', tone: 'cream' as const },
  { id: 'elegant', label: 'Elegant', icon: '⚘', tone: 'lavender' as const },
  { id: 'formal', label: 'Formal', icon: '◆', tone: 'cream' as const },
  { id: 'bold', label: 'Bold', icon: '▲', tone: 'peach' as const },
  { id: 'retro', label: 'Retro', icon: '✶', tone: 'peach' as const },
  { id: 'whimsical', label: 'Whimsical', icon: '✩', tone: 'lavender' as const },
];

/* Each chip wears its own vibe — the typography IS the preview.
   'Elegant' is set in airy italic serif, 'Formal' in letterspaced
   caps, 'Bold' heavy, so picking a vibe means picking a feeling
   you can already see, not a word. */
const VIBE_FACE: Record<string, CSSProperties> = {
  romantic:    { fontFamily: 'var(--font-display, Georgia, serif)', fontStyle: 'italic', fontWeight: 500, fontSize: 15 },
  elegant:     { fontFamily: 'var(--font-display, Georgia, serif)', fontStyle: 'italic', fontWeight: 400, letterSpacing: '0.08em', fontSize: 15 },
  classic:     { fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 600, fontSize: 14.5 },
  traditional: { fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 600, letterSpacing: '0.03em', fontSize: 14.5 },
  formal:      { textTransform: 'uppercase', letterSpacing: '0.22em', fontSize: 11, fontWeight: 700 },
  editorial:   { textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 11.5, fontWeight: 700 },
  modern:      { letterSpacing: '0.05em', fontWeight: 700 },
  quiet:       { fontWeight: 400, letterSpacing: '0.14em', fontSize: 13.5 },
  gentle:      { fontFamily: 'var(--font-display, Georgia, serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 14.5 },
  reflective:  { fontFamily: 'var(--font-display, Georgia, serif)', fontStyle: 'italic', fontWeight: 400, letterSpacing: '0.04em', fontSize: 14.5 },
  intimate:    { fontFamily: 'var(--font-display, Georgia, serif)', fontStyle: 'italic', fontWeight: 500, fontSize: 14.5 },
  bold:        { fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 13 },
  groovy:      { fontWeight: 800, fontStyle: 'italic', fontSize: 14.5 },
  retro:       { fontWeight: 800, letterSpacing: '0.1em', fontSize: 13.5 },
  playful:     { fontWeight: 700, fontSize: 14.5 },
  whimsical:   { fontFamily: 'var(--font-display, Georgia, serif)', fontStyle: 'italic', fontWeight: 500, fontSize: 14.5 },
  joyful:      { fontWeight: 700, fontSize: 14.5 },
  warm:        { fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 500, fontSize: 14.5 },
  outdoorsy:   { fontWeight: 600, letterSpacing: '0.03em' },
};
/* A hand-placed tilt on the inherently crooked ones. */
const VIBE_TILT: Record<string, number> = {
  playful: -1.6, whimsical: 1.6, groovy: -1.1, joyful: 1.1, retro: -0.8,
};

// Per-voice chip sets (EVENT_TYPES[occasion].voice drives which
// chips the Vibe step offers). 'Romantic' and 'Playful' have no
// business on a memorial site; each voice keeps ~8 coherent
// options. Celebratory keeps the original default nine.
const VOICE_VIBES: Record<EventVoice, string[]> = {
  celebratory: ['romantic', 'joyful', 'intimate', 'playful', 'quiet', 'editorial', 'groovy', 'outdoorsy', 'modern'],
  intimate: ['romantic', 'intimate', 'quiet', 'warm', 'editorial', 'outdoorsy', 'classic', 'modern'],
  ceremonial: ['elegant', 'classic', 'traditional', 'intimate', 'formal', 'editorial', 'warm', 'modern'],
  playful: ['playful', 'groovy', 'bold', 'modern', 'outdoorsy', 'joyful', 'retro', 'whimsical'],
  solemn: ['gentle', 'reflective', 'warm', 'classic', 'quiet', 'outdoorsy', 'editorial', 'traditional'],
};

/** Vibe chips offered for an occasion, in voice order. Unknown /
 *  unset occasions fall back to the celebratory (default) set. */
function vibesForOccasion(occasion: string) {
  const voice = getEventType(occasion)?.voice ?? 'celebratory';
  const ids = VOICE_VIBES[voice] ?? VOICE_VIBES.celebratory;
  return ids
    .map((id) => VIBES.find((v) => v.id === id))
    .filter((v): v is (typeof VIBES)[number] => Boolean(v));
}

/** Palette-picker id for the photo-derived option ("From your photos"). */
const PHOTO_PALETTE_ID = 'from-your-photos';

const PALETTES = [
  { id: 'groovy-garden', name: 'Groovy Garden', colors: ['#F0C9A8', '#8B9C5A', '#CBD29E', '#3D4A1F'] },
  { id: 'dusk-meadow', name: 'Dusk Meadow', colors: ['#C4B5D9', '#B7A4D0', '#CBD29E', '#6B5A8C'] },
  { id: 'warm-linen', name: 'Warm Linen', colors: ['#F3E9D4', '#EAB286', '#F0C9A8', '#8B4720'] },
  { id: 'olive-gold', name: 'Olive & Gold', colors: ['#6d7d3f', '#D4A95D', '#F3E9D4', '#3D4A1F'] },
];

const LAYOUTS = [
  { id: 'timeline', name: 'Memory Thread', body: 'A vertical story, chapter by chapter.', icon: '⏳' },
  { id: 'magazine', name: 'Editorial Spread', body: 'Headlines, features, quiet pages.', icon: '▤' },
  { id: 'filmstrip', name: 'Filmstrip', body: 'Photos first, words second.', icon: '▥' },
  { id: 'bento', name: 'Bento Stack', body: 'Card grid — schedule, people, gifts.', icon: '⊞' },
];

interface WizardPhoto {
  id: string;
  /** Permanent URL (R2 or Google CDN) — what gets sent to generate. */
  url: string;
  /** Local preview — data URL for uploads before they finish, or Google baseUrl. */
  previewUrl: string;
  name?: string;
  caption?: string;
  takenAt?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  source: 'upload' | 'google';
  uploading?: boolean;
  error?: string;
}

interface SmartPalette {
  id: string;
  name: string;
  rationale: string;
  colors: [string, string, string, string];
  tone: string;
  source: string;
  /** Decor-library ornament the advisor paired with this palette. */
  motif?: string;
  /** MotifLayer placement the advisor paired with this palette. */
  motifLayout?: string;
}

interface WizardState {
  occasion: string;
  names: [string, string];
  eventDate: string;
  location: string;
  vibes: string[];
  palette: string;
  /** Hex colors from the currently-selected palette — flows to /api/generate/stream
   *  as `selectedPaletteColors` so Pass 2 honors them. */
  paletteColors?: string[];
  layout: string;
  subdomain: string;
  templateId?: string;
  // factSheet — anchors for the AI story pass
  howWeMet?: string;
  whyCelebrate?: string;
  favoriteMemory?: string;
  /** The host's story, told once in their own words ("tell me
   *  about it"). Rides the factSheet verbatim — the richest
   *  grounding source the pipeline gets. */
  storyText?: string;
  /** Named personal specifics Pear heard in the story
   *  (/api/wizard/listen). The copy passes are required to spend
   *  these — the dog, the bar in Lisbon, grandma's lemon cake. */
  anchors?: string[];
  /** Mood words Pear heard in HOW they told it — appended to the
   *  vibeString at generation. */
  heardVibes?: string[];
  /** "The Day" step — tap-built schedule + dress code + RSVP
   *  deadline. Stamped onto the manifest at finish (beats any
   *  generated content) and seeds Details/RSVP. */
  dayEvents?: Array<{ name: string; time: string }>;
  dressCode?: string;
  rsvpDeadline?: string;
  /** "Guests will ask" quick-collect — seeds Travel / Details /
   *  FAQ at finish so the editor opens with real answers. Lat/lng
   *  ride along from the autocomplete → Travel map pins. */
  hotels?: Array<{ name: string; address: string; lat?: number; lng?: number }>;
  kidsPolicy?: string;
  parkingNote?: string;
  /** Venue coordinates captured when the host picks a Places
   *  suggestion in Basics — biases the hotel search to the venue
   *  and rides logistics.venueLat/Lng so hotel-suggest + maps
   *  work without re-geocoding. */
  venueLat?: number;
  venueLng?: number;
  /** "The extras" — component picks that seed real sections:
   *  countdown block, music embed, RSVP meal choices, registry
   *  link. All optional, all fill-missing at finish. */
  wantsCountdown?: boolean;
  playlistUrl?: string;
  meals?: string[];
  registryUrl?: string;
  /** Co-planning — "Planning this with someone?" on Review. At
   *  finish, fires the existing co-host invite for the new site
   *  so the partner can edit from minute one. */
  coHostEmail?: string;
  /** Celebration linkage — set when the wizard opened from the
   *  dashboard's sibling-event card (?from=…). At finish, both
   *  sites get the shared manifest.celebration so they appear on
   *  each other's LinkedEventsStrip. */
  linkFromSlug?: string;
  linkCelebId?: string;
  linkCelebName?: string;
  /** "The structure" — explicit layout picks. undefined = Pear
   *  decides (look-recipe / edition defaults ride). Stamped onto
   *  manifest.siteMode + manifest.layouts at finish. */
  siteMode?: 'scroll' | 'multi-page';
  kitId?: string;
  /** Explicit paper texture from the fitting room — beats the
   *  look recipe's texture at finish. */
  texture?: string;
  /** Explicit ornament placement + breathing room from the
   *  fitting room — same beats-the-recipe contract. */
  motifLayoutPick?: string;
  densityPick?: string;
  navVariant?: string;
  /** Phone menu pick (layouts.navMobile) — set from the fitting
   *  room on phone viewports, where the desktop nav is invisible. */
  navMobileVariant?: string;
  heroVariant?: string;
  /** Whole-page feel (manifest.edition) — the fitting room's
   *  "Feel" rail. */
  editionPick?: string;
  /** Plus-ones policy → rsvpConfig.plusOnes + the FAQ answer.
   *  undefined = not asked / host skipped. */
  plusOnes?: boolean;
  /** The honor list — wedding party / court of honor / candle
   *  lighters, by name. Becomes manifest.weddingParty + the
   *  honorList section. */
  partyNames?: string[];
  /** Section chooser (§3.1) — which sections the site starts with +
   *  the layout variant each landed on. undefined = host skipped
   *  ("Let Pear decide"), which today is every run (no chooser UI
   *  yet — Wave 2). At finish, when unset, it's seeded silently to
   *  the occasion's essentials so blockOrder lands explicit. */
  sectionPicks?: {
    /** Selected canvas SectionIds, in the host's on/off state. */
    on: string[];
    /** Per-section layout variant the host landed on. */
    layouts: Record<string, string>;
  };
  // Occasion-specific details (consumed by /api/generate/stream as eventDetails)
  detailDays?: number;
  detailLivestreamUrl?: string;
  detailInMemoryOf?: string;
  detailSchool?: string;
  // Photos
  photos: WizardPhoto[];
  // AI-suggested palettes (from /api/wizard/smart-palette)
  smartPalettes?: SmartPalette[];
  smartPalettesLoading?: boolean;
  smartPalettesError?: string;
  /** Ornament + placement riding along with the picked smart
   *  palette — stamped onto the manifest at generation. Cleared
   *  when the host picks a preset/photo palette instead. */
  suggestedMotif?: string;
  suggestedMotifLayout?: string;
  /** The unbroken thread (PERSONA-PLAN S3): "Weave my site" hit the
   *  signed-out 401 — the click is honored after sign-in. Set by the
   *  401 branch (persisted with the draft), consumed once by the
   *  resume-press effect when the host returns authenticated. */
  pendingPress?: boolean;
}

const defaultState: WizardState = {
  occasion: '',
  names: ['', ''],
  eventDate: '',
  location: '',
  vibes: [],
  palette: PALETTES[0].id,
  layout: LAYOUTS[0].id,
  subdomain: '',
  photos: [],
};

/** Fold a background-cooked decor library (useBackgroundCook result)
 *  into a manifest's `decorLibrary` so the editor opens with decor
 *  already populated. No-ops when the cooked shape doesn't match. */
function foldCookedDecorInto(manifest: Record<string, unknown>, decorRaw: unknown): void {
  if (!decorRaw || typeof decorRaw !== 'object') return;
  const lib: Record<string, unknown> = {
    ...((manifest.decorLibrary as Record<string, unknown> | undefined) ?? {}),
    updatedAt: new Date().toISOString(),
  };
  const d = decorRaw as Record<string, unknown>;
  if (typeof d.divider === 'string') lib.divider = d.divider;
  if (typeof d.confetti === 'string') lib.confetti = d.confetti;
  if (typeof d.footerBouquet === 'string') lib.footerBouquet = d.footerBouquet;
  if (d.sectionStamps && typeof d.sectionStamps === 'object') {
    const stamps: Record<string, string> = {};
    for (const [k, v] of Object.entries(d.sectionStamps as Record<string, unknown>)) {
      if (typeof v === 'string') stamps[k] = v;
    }
    if (Object.keys(stamps).length) lib.sectionStamps = stamps;
  }
  manifest.decorLibrary = lib;
}

// User-friendly upload failure messages keyed on HTTP status.
function humanizeUploadStatus(status: number): string {
  if (status === 401) return 'Please sign back in and try uploading again.';
  if (status === 413) return 'Those files are too large. Try smaller photos (under 12MB each).';
  if (status === 429) return "You've uploaded a lot recently — take a breath and try again in a minute.";
  if (status >= 500) return "Pearloom's servers are hiccuping. Try again in a moment.";
  return `Upload failed (${status}). Try again, or contact hello@pearloom.com.`;
}

// ── Photo upload (device + Google Photos) ────────────────────
// Both sources produce the same WizardPhoto shape so downstream
// code doesn't care where the photos came from.
const MAX_WIZARD_PHOTOS = 24;

function WizardPhotoUpload({
  photos,
  onChange,
}: {
  photos: WizardPhoto[];
  onChange: (next: WizardPhoto[]) => void;
}) {
  const inputId = 'pl8-wizard-photo-input';
  const picker = useGooglePhotosPicker();
  // Latest photos ref — patched into async mirror callbacks so they
  // don't clobber intermediate edits (deletes, reorders, captions).
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_WIZARD_PHOTOS - photos.length;
    const accepted = Array.from(files).slice(0, Math.max(0, remaining)).filter((f) => f.type.startsWith('image/') || isHeicLike(f));
    if (accepted.length === 0) return;

    // Normalize every file the instant it's picked: downscale huge
    // iPhone photos under the budget, transcode HEIC→JPEG so it
    // renders (no grey broken tiles), and read the bytes NOW so a
    // stale Google-Photos/gallery File reference can't break later.
    // The normalized data URL doubles as the preview thumbnail AND
    // the upload payload — one read, web-safe everywhere.
    const settled = await Promise.all(
      accepted.map(async (file): Promise<WizardPhoto | null> => {
        try {
          const normalized = await normalizeImageFile(file);
          const dataUrl = await blobToDataUrl(normalized.blob);
          return {
            id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            url: '', // filled in after upload
            previewUrl: dataUrl,
            name: filenameForOutput(file.name, normalized.mimeType),
            mimeType: normalized.mimeType,
            width: normalized.width,
            height: normalized.height,
            takenAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
            source: 'upload' as const,
            uploading: true,
          };
        } catch (e) {
          // A file that genuinely can't be decoded (e.g. HEIC on
          // Chrome) surfaces as an errored, non-uploading tile with
          // a clear message — never a silent grey tile.
          return {
            id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            url: '',
            previewUrl: '',
            name: file.name,
            source: 'upload' as const,
            uploading: false,
            error: normalizeErrorMessage(e),
          };
        }
      }),
    );
    const staged = settled.filter((p): p is WizardPhoto => p !== null && p.uploading === true);
    const failedTiles = settled.filter((p): p is WizardPhoto => p !== null && p.uploading !== true);
    // Show previews (and any decode-failure tiles) immediately.
    onChange([...photos, ...staged, ...failedTiles]);
    if (staged.length === 0) return;

    // Batch-upload to R2 via /api/photos/upload (max 25 per request).
    try {
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: staged.map((p) => ({
            id: p.id,
            filename: p.name ?? p.id,
            mimeType: p.mimeType ?? 'image/jpeg',
            base64: p.previewUrl,
            width: p.width,
            height: p.height,
            capturedAt: p.takenAt,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as { error?: string }).error ?? humanizeUploadStatus(res.status);
        throw new Error(msg);
      }
      const data = await res.json() as { photos?: Array<{ id: string; baseUrl: string; width?: number; height?: number }> };
      const byId = new Map(data.photos?.map((p) => [p.id, p]) ?? []);
      // Patch by id against the freshest state so concurrent edits
      // (deletes/reorders) and any decode-failure tiles are preserved.
      const stagedIds = new Set(staged.map((s) => s.id));
      onChange(photosRef.current.map((p) => {
        if (!stagedIds.has(p.id)) return p;
        const hit = byId.get(p.id);
        if (!hit?.baseUrl) return { ...p, uploading: false, error: 'Upload failed' };
        return {
          ...p,
          uploading: false,
          error: undefined,
          url: hit.baseUrl,
          width: hit.width ?? p.width,
          height: hit.height ?? p.height,
        };
      }));
    } catch (err) {
      // Keep the previews but mark them as errored so the user can retry,
      // with a friendly message they can actually act on.
      const friendly = err instanceof Error ? err.message : 'Upload failed — try again';
      const stagedIds = new Set(staged.map((s) => s.id));
      onChange(photosRef.current.map((p) =>
        stagedIds.has(p.id) ? { ...p, uploading: false, error: friendly } : p,
      ));
    }
  }

  function handleGoogle() {
    picker.pick(async (picked: PickedPhoto[]) => {
      const remaining = MAX_WIZARD_PHOTOS - photos.length;
      const accepted = picked.slice(0, Math.max(0, remaining));
      if (accepted.length === 0) return;

      // 1. Stage immediately so the thumbnails paint while the server
      //    mirrors in the background. Picker baseUrls require OAuth —
      //    the browser can't load them in <img> tags directly — so we
      //    route the preview through our authenticated proxy. Once the
      //    R2 mirror lands below, we swap the preview to the permanent
      //    URL and the proxy request goes away.
      const previewFor = (baseUrl: string) =>
        `/api/photos/proxy?url=${encodeURIComponent(baseUrl)}&w=600&h=600`;
      const staged: WizardPhoto[] = accepted.map((g) => ({
        id: g.id,
        url: g.baseUrl,
        previewUrl: previewFor(g.baseUrl),
        name: g.filename,
        mimeType: g.mimeType,
        width: g.width,
        height: g.height,
        source: 'google' as const,
        uploading: true,
      }));
      onChange([...photos, ...staged]);

      // 2. Mirror each Google URL to R2 via /api/photos/upload. The
      //    server fetches each URL with the session's OAuth token and
      //    writes the bytes to R2 — same path as device uploads. This
      //    guarantees the photo survives past Google's ~1h CDN expiry.
      try {
        const res = await fetch('/api/photos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photos: staged.map((p, i) => ({
              id: p.id,
              filename: p.name ?? `google-${i}.jpg`,
              mimeType: p.mimeType ?? 'image/jpeg',
              sourceUrl: p.previewUrl,
              capturedAt: p.takenAt,
              width: p.width,
              height: p.height,
            })),
          }),
        });
        if (!res.ok) throw new Error(`mirror ${res.status}`);
        const data = (await res.json()) as {
          photos?: Array<{ id: string; baseUrl: string; width?: number; height?: number }>;
        };
        const byId = new Map(data.photos?.map((p) => [p.id, p]) ?? []);
        // Use the freshest photos array from state to avoid racing
        // with other edits. We match staged entries by id so if the
        // user deleted or reordered photos while the mirror was in
        // flight, we only touch the ones that still exist.
        // Patch by id against whatever state is current — respects
        // any deletes/reorders the user made during the round trip.
        const patched = photosRef.current.map((p) => {
          const hit = byId.get(p.id);
          if (!hit?.baseUrl) {
            if (p.source === 'google' && p.uploading) return { ...p, uploading: false };
            return p;
          }
          return {
            ...p,
            uploading: false,
            url: hit.baseUrl,
            previewUrl: hit.baseUrl,
            width: hit.width ?? p.width,
            height: hit.height ?? p.height,
          };
        });
        onChange(patched);
      } catch (err) {
        console.warn('[wizard] Google mirror failed:', err);
        // Keep the previews but flip off uploading state, using the
        // latest photos array so concurrent edits aren't clobbered.
        onChange(photosRef.current.map((p) => (p.uploading ? { ...p, uploading: false } : p)));
      }
    });
  }

  function remove(id: string) {
    onChange(photos.filter((p) => p.id !== id));
  }
  function setCaption(id: string, caption: string) {
    onChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  const pickerBusy = picker.state === 'creating' || picker.state === 'waiting' || picker.state === 'fetching';

  return (
    <div>
      {/* Photo sources — the handoff's horizontal picker cards: a
          round icon chip beside a Fraunces title + one-line blurb.
          The device tile stays a <label> over the hidden file input;
          the Google tile keeps its button wiring. */}
      <div
        className="pl8-photo-sources"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <label
          htmlFor={inputId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '20px 22px',
            border: '1px solid var(--line)',
            borderRadius: 16,
            background: 'var(--card)',
            cursor: 'pointer',
            minHeight: 96,
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              flexShrink: 0,
              background: 'var(--pl-olive, #5C6B3F)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
            }}
          >
            <Icon name="upload" size={22} />
          </span>
          <span style={{ display: 'block' }}>
            <span className="display" style={{ display: 'block', fontSize: 18, color: 'var(--ink)' }}>Upload from device</span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-muted)' }}>Choose photos from your computer.</span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>JPG, PNG, HEIC · up to {MAX_WIZARD_PHOTOS}</span>
          </span>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => void handleFiles(e.target.files)}
        />

        <button
          type="button"
          onClick={handleGoogle}
          disabled={pickerBusy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '20px 22px',
            border: '1px solid var(--line)',
            borderRadius: 16,
            background: pickerBusy ? 'var(--cream-2)' : 'var(--card)',
            cursor: pickerBusy ? 'wait' : 'pointer',
            minHeight: 96,
            textAlign: 'left',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              flexShrink: 0,
              background: 'var(--cream-2)',
              border: '1px solid var(--line-soft)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c-3.54 0-6.72 1.22-9.2 3.22l-5.36-5.36C13.26 3.89 18.37 2 24 2c8.27 0 15.26 4.59 19 11.27l-5.9 4.58C34.96 13.31 29.89 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.35l-7.73-6c-2.15 1.45-4.92 2.3-6.84 2.3-5.89 0-10.87-3.81-12.65-8.85l-7.98 6.19C6.73 41.41 13.73 46 24 46z" />
            </svg>
          </span>
          <span style={{ display: 'block' }}>
            <span className="display" style={{ display: 'block', fontSize: 18, color: 'var(--ink)' }}>
              {pickerBusy ? 'Opening Google Photos…' : 'Pick from Google Photos'}
            </span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-muted)' }}>Choose photos from your library.</span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>Nothing leaves Google unless you pick it.</span>
          </span>
        </button>
      </div>

      {/* Pear's smart insight — the honest strip that names what she
          does with the photos (cover, mood, palette). No mockups. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 18px',
          borderRadius: 14,
          background: 'var(--cream-2)',
          border: '1px solid var(--line-soft)',
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 220 }}>
          <Pear size={22} tone="sage" sparkle shadow={false} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>Pear&apos;s smart insight</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
              From these photos, Pear pulls a cover, reads the mood, and mixes your palette.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {([['image', 'Find a cover'], ['sun', 'Infer mood'], ['grid', 'Build palette']] as const).map(([i, l]) => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-soft)' }}>
              <Icon name={i} size={14} color="var(--pl-olive, #5C6B3F)" /> {l}
            </span>
          ))}
        </div>
      </div>

      {picker.error && (
        <div style={{ fontSize: 12, color: 'var(--pl-warning, #A14A2C)', marginBottom: 10 }}>{picker.error}</div>
      )}

      {photos.length > 0 && (
        <div
          style={{
            marginTop: 6,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 10,
          }}
        >
          {photos.map((p) => (
            <div key={p.id} className="pl8-chip-pop" style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', minHeight: 130 }}>
              {p.previewUrl ? (
                <img
                  src={p.previewUrl}
                  alt={p.name ?? ''}
                  style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block', opacity: p.uploading ? 0.6 : 1, transition: 'opacity var(--pl-dur-base) var(--pl-ease-out)' }}
                />
              ) : (
                /* No decodable preview (e.g. HEIC on Chrome) — a calm
                   paper panel carries the error badge instead of a
                   broken-image glyph. */
                <div style={{ width: '100%', height: 130, background: 'var(--cream-2)' }} />
              )}
              {p.uploading && (
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    padding: '2px 8px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    fontSize: 10,
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {/* WeaveLoader + the house verb — "uploading…" was
                      the one un-branded busy state in the flow. */}
                  <WeaveLoader size="xs" inline />
                  Threading…
                </div>
              )}
              {p.error && !p.uploading && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 6,
                    padding: '8px 10px',
                    background: 'rgba(122,45,45,0.92)',
                    color: '#fff',
                    fontSize: 10.5,
                    lineHeight: 1.35,
                    borderRadius: 8,
                    display: 'grid',
                    alignContent: 'center',
                    overflow: 'auto',
                  }}
                >
                  {p.error}
                </div>
              )}
              {p.source === 'google' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    padding: '2px 8px',
                    background: 'rgba(66,133,244,0.85)',
                    color: '#fff',
                    fontSize: 10,
                    borderRadius: 999,
                  }}
                >
                  Google
                </div>
              )}
              <input
                value={p.caption ?? ''}
                onChange={(e) => setCaption(p.id, e.target.value)}
                placeholder="Caption (optional)"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  border: 0,
                  padding: '6px 8px',
                  fontSize: 11,
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label="Remove photo"
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 0,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-muted)' }}>
        {photos.length === 0
          ? 'No photos yet — Pear will start with an empty canvas.'
          : `${photos.length} photo${photos.length === 1 ? '' : 's'} ready. Pear clusters them into chapters.`}
      </div>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// The acquisition shelf (PERSONA-PLAN S5). Seven plates + the
// Other-event tile fill a clean 4×2. Bachelorette is the roadmap's
// biggest funnel lever (CLAUDE-PRODUCT §7 B.1 — hosted by someone
// who isn't the couple, shared into group chats) and quinceañera is
// the fastest-growing cultural market (E.2); reunion moved to the
// directory (one keystroke away in search). Revisit with real
// traffic data once S8's funnel instrumentation lands.
const POPULAR_OCCASIONS: string[] = [
  'wedding',
  'birthday',
  'bachelorette-party',
  'anniversary',
  'baby-shower',
  'memorial',
  'quinceanera',
];

function OccasionPicker({
  selected,
  onPick,
  intentOccasion,
}: {
  selected: string;
  onPick: (id: string) => void;
  /** The occasion mapped from the account's signup intent — its
   *  tile leads the grid with a "For you" badge. */
  intentOccasion?: string | null;
}) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const q = query.trim().toLowerCase();

  let popular = POPULAR_OCCASIONS
    .map((id) => OCCASIONS.find((o) => o.id === id))
    .filter((o): o is OccasionCard => Boolean(o));
  /* The signup-intent occasion leads the grid — hoisted to the
     front (and added if it isn't in the popular set at all). */
  if (intentOccasion) {
    const intentCard = OCCASIONS.find((o) => o.id === intentOccasion);
    if (intentCard) {
      popular = [intentCard, ...popular.filter((o) => o.id !== intentOccasion)];
    }
  }

  const filtered = q
    ? OCCASIONS.filter((o) =>
        o.label.toLowerCase().includes(q)
        || o.id.includes(q)
        || (getEventType(o.id)?.tagline ?? '').toLowerCase().includes(q))
    : null;

  const showCategorised = showAll || filtered !== null;

  const tile = (o: OccasionCard) => {
    const on = selected === o.id;
    const isIntent = intentOccasion === o.id;
    const glyphColor = TONE_INK[o.tone];
    const desc = getEventType(o.id)?.tagline ?? '';
    return (
      <button
        key={o.id}
        type="button"
        onClick={() => onPick(o.id)}
        // Hover host — bespoke glyph anims fire on parent hover.
        className="pl8-glyph-host"
        style={{
          // Design handoff: big card — icon chip top-left, name + a
          // one-line description below. Selected = olive tint + olive
          // border + a check badge in the top-right corner.
          position: 'relative',
          padding: '20px 18px',
          borderRadius: 16,
          border: on
            ? '1.5px solid var(--pl-olive, #5C6B3F)'
            : '1px solid var(--line)',
          background: on ? 'var(--pl-olive-mist, #E0DDC9)' : 'var(--card)',
          boxShadow: on ? '0 0 0 4px var(--pl-olive-12, rgba(92,107,63,0.12))' : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 12,
          minHeight: 128,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-ui)',
          transition: 'border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease',
        }}
        onMouseEnter={(e) => {
          if (!on) e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          if (!on) e.currentTarget.style.transform = '';
        }}
      >
        {on && (
          <span
            aria-hidden
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 22, height: 22, borderRadius: 999,
              background: 'var(--pl-olive, #5C6B3F)',
              display: 'grid', placeItems: 'center', color: '#fff',
            }}
          >
            <Icon name="check" size={12} strokeWidth={3} />
          </span>
        )}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            flexShrink: 0,
            // Chip inverts to olive on select (cream glyph) — the
            // prototype's selected-tile signature.
            background: on ? 'var(--pl-olive, #5C6B3F)' : TONE_BG[o.tone],
            display: 'grid',
            placeItems: 'center',
            color: on ? 'var(--cream, #FDFAF0)' : glyphColor,
            transition: 'background 160ms ease, color 160ms ease',
          }}
        >
          <OccasionGlyph id={o.id} size={24} />
        </div>
        <div className="display" style={{ fontSize: 17, lineHeight: 1.15, color: 'var(--ink)' }}>
          {o.label}
        </div>
        {desc && (
          <div style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--ink-muted)', marginTop: -2 }}>
            {desc}
          </div>
        )}
        {isIntent && (
          <span
            style={{
              position: 'absolute', top: -8, left: 12,
              fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)', background: 'var(--peach-bg, #F4E3D3)',
              border: '1px solid var(--card, #fff)',
              padding: '2px 8px', borderRadius: 999,
            }}
          >
            ★ For you
          </span>
        )}
      </button>
    );
  };

  // The search field — prominent atop the full 31-event directory
  // (where scanning needs it), quiet and narrow beneath the popular
  // plates (RADICAL §D: the plates lead; search is the escape hatch,
  // never the first thing a host meets).
  const searchBlock = (quiet: boolean) => (
    <div
      style={{
        position: 'relative',
        marginBottom: quiet ? 14 : 18,
        maxWidth: quiet ? 340 : undefined,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--ink-muted)',
          display: 'inline-grid',
          placeItems: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </span>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value && !showAll) setShowAll(true);
        }}
        placeholder={`Search ${OCCASIONS.length} events…`}
        style={{
          width: '100%',
          padding: quiet ? '10px 14px 10px 38px' : '12px 14px 12px 38px',
          borderRadius: 12,
          border: quiet ? '1px solid var(--line-soft, var(--line))' : '1px solid var(--line)',
          background: quiet ? 'transparent' : 'var(--card)',
          fontSize: 14,
          fontFamily: 'inherit',
          color: 'var(--ink)',
          outline: 'none',
        }}
      />
    </div>
  );

  return (
    <>
      {/* The first question is a TITLE PAGE (RADICAL §D): one
          enormous line that presses into the paper on arrival. */}
      <h2
        className="display pl-type-press"
        style={{
          fontSize: 'clamp(40px, 6.5vw, 74px)',
          margin: '0 0 12px',
          lineHeight: 1.02,
          textShadow: letterpressShadow('var(--paper, #FDFAF0)', 'var(--ink, #0E0D0B)'),
        }}
      >
        What are we <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>celebrating?</span>
      </h2>
      <p
        style={{
          color: 'var(--ink-soft)',
          fontSize: 15,
          margin: '0 0 26px',
          maxWidth: 540,
        }}
      >
        Pick the closest — you can change it any time. Pearloom supports {OCCASIONS.length} event types.
        {intentOccasion && (
          <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: 'var(--peach-ink, #C6703D)', fontWeight: 600 }}>
            You mentioned this one when you joined — Pear put it up front.
          </span>
        )}
      </p>

      {/* Directory view keeps the prominent search on top — 31 tiles
          need scanning. The popular view leads with the plates. */}
      {showCategorised && searchBlock(false)}

      {!showCategorised && (
        <>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              marginBottom: 10,
            }}
          >
            Popular
          </div>
          <div
            className="pl8-occasion-grid pl-cascade-row"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 16 }}
          >
            {popular.map(tile)}
            {/* Other event — dashed tile; opens the full all-events view. */}
            <button
              type="button"
              onClick={() => setShowAll(true)}
              style={{
                position: 'relative',
                padding: '20px 18px',
                borderRadius: 16,
                border: '1.5px dashed var(--line)',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                minHeight: 128,
                cursor: 'pointer',
                textAlign: 'center',
                fontFamily: 'var(--font-ui)',
              }}
            >
              <span
                style={{
                  width: 44, height: 44, borderRadius: 999,
                  display: 'grid', placeItems: 'center',
                  border: '1.5px solid var(--line)', color: 'var(--ink-muted)',
                }}
              >
                <Icon name="plus" size={18} />
              </span>
              <div className="display" style={{ fontSize: 17, color: 'var(--ink)' }}>Other event</div>
              <div style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--ink-muted)' }}>
                Can&apos;t find your event? We&apos;ve got you.
              </div>
            </button>
          </div>
          {/* The quiet search — beneath the plates, never before them. */}
          {searchBlock(true)}
          {/* Soft note — the all-events view stays reachable via the
              Other-event tile and the search box above. */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              marginTop: 4, padding: '10px 16px', borderRadius: 999,
              background: 'var(--pl-gold-mist, #F4ECD6)',
              fontSize: 12.5, color: 'var(--ink-soft)', fontFamily: 'var(--font-ui)',
            }}
          >
            <Sparkle size={13} color="var(--gold)" /> Not sure? You can explore all {OCCASIONS.length} event types later.
          </div>
        </>
      )}

      {showCategorised && filtered === null && (
        <>
          {(['wedding-arc', 'family', 'milestone', 'cultural', 'commemoration'] as EventCategory[]).map((cat) => {
            const items = OCCASIONS.filter((o) => o.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-olive, #5C6B3F)',
                    marginBottom: 10,
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </div>
                <div className="pl8-occasion-grid pl-cascade-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
                  {items.map(tile)}
                </div>
              </div>
            );
          })}
        </>
      )}

      {filtered !== null && (
        <div className="pl8-occasion-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
          {filtered.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--ink-muted)',
                fontSize: 13,
                background: 'var(--cream-2)',
                borderRadius: 12,
              }}
            >
              Nothing matches "{query}". Try a different word, or{' '}
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--pl-olive, #5C6B3F)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                clear search
              </button>
              .
            </div>
          ) : (
            filtered.map(tile)
          )}
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   GuestsWillAsk — the Day step's quick-collect for the three
   questions every guest asks: where do I stay, can I bring the
   kids, where do I park. Each answer seeds the section guests
   actually read (Travel hotel cards / Details cards / FAQ
   answers) via seedSectionsFromWizard — thirty seconds here and
   the editor opens with those sections already true.
   Occasion-aware: hotels only show when the event type carries a
   travel block; the kids question skips bachelor weekends.
   ──────────────────────────────────────────────────────────── */
const KIDS_OPTIONS = ['All ages welcome', 'Adults only', 'Immediate family’s kids only'];


function GuestsWillAsk({
  st,
  setSt,
}: {
  st: WizardState;
  setSt: (updater: (s: WizardState) => WizardState) => void;
}) {
  const [hotelQuery, setHotelQuery] = useState('');
  const e = getEventType(st.occasion as never);
  const blocks = [...(e?.defaultBlocks ?? []), ...(e?.optionalBlocks ?? [])] as string[];
  const wantsHotels = blocks.includes('travel');
  const wantsKids = !st.occasion.startsWith('bachelor');
  const hotels = st.hotels ?? [];

  if (!wantsHotels && !wantsKids) return null;

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ ...sketchEyebrow, marginBottom: 4 }}>
        <span aria-hidden style={{ color: 'var(--pl-gold, #C19A4B)' }}>✦</span> Guests will ask
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 12 }}>
        Thirty seconds here fills the Travel, Details, and FAQ sections with real answers. All optional.
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        {wantsHotels && (
          <div>
            <label className="field-label">Where should they stay?</label>
            {hotels.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {hotels.map((h) => (
                  <span
                    key={h.name + h.address}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 8px 6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                      background: 'var(--sage-tint, #E3E6C8)', color: 'var(--ink)',
                    }}
                  >
                    {h.name}
                    <button
                      type="button"
                      aria-label={`Remove ${h.name}`}
                      onClick={() => setSt((s) => ({ ...s, hotels: (s.hotels ?? []).filter((x) => x !== h) }))}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-muted)', fontSize: 13, lineHeight: 1, padding: 0 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {hotels.length < 3 && (
              <WizardLocationAutocomplete
                value={hotelQuery}
                onChange={setHotelQuery}
                onSelect={(place) => {
                  const name = place.name || place.address;
                  if (!name) return;
                  setSt((s) => {
                    const cur = s.hotels ?? [];
                    if (cur.some((h) => h.name === name)) return s;
                    return { ...s, hotels: [...cur, { name, address: place.address ?? '', lat: place.lat, lng: place.lng }] };
                  });
                  setHotelQuery('');
                }}
                kind="hotel"
                near={st.venueLat != null && st.venueLng != null ? { lat: st.venueLat, lng: st.venueLng } : undefined}
                placeholder={hotels.length === 0 ? 'Search a hotel near the venue…' : 'Add another…'}
              />
            )}
          </div>
        )}
        {wantsKids && (
          <div>
            <label className="field-label">Kids?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {KIDS_OPTIONS.map((k) => {
                const on = st.kidsPolicy === k;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSt((s) => ({ ...s, kidsPolicy: on ? undefined : k }))}
                    className="wz-chip"
                    style={{
                      padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                      border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                      background: on ? 'var(--ink)' : 'var(--card)',
                      color: on ? 'var(--cream)' : 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <span>{k}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <label className="field-label">Parking, in one line (optional)</label>
          <input
            className="input"
            value={st.parkingNote ?? ''}
            onChange={(ev) => setSt((s) => ({ ...s, parkingNote: ev.target.value }))}
            placeholder="Free lot behind the venue, or: street parking only — rideshare is easiest"
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   THE EXTRAS — component picks, thirty seconds each.

   "Do you have a playlist? Know your menu? Want a countdown?"
   Each chip expands an inline mini-form; each answer seeds a
   REAL section at finish (music embed, RSVP meal choices, the
   countdown block, a registry card) so the editor opens with
   those parts of the site already alive. Occasion-aware:
   memorials don't count down, bachelor weekends don't register,
   menus only show for sit-down-shaped events.
   ──────────────────────────────────────────────────────────── */
const MEAL_CHIP_OPTIONS = ['Beef', 'Chicken', 'Fish', 'Vegetarian', 'Vegan', 'Kid’s plate'];
const MEAL_OCCASIONS = new Set([
  'wedding', 'vow-renewal', 'engagement', 'rehearsal-dinner', 'bridal-luncheon',
  'reunion', 'bar-mitzvah', 'bat-mitzvah', 'quinceanera', 'milestone-birthday',
  'retirement', 'brunch', 'anniversary',
]);

function TheExtras({
  st,
  setSt,
}: {
  st: WizardState;
  setSt: (updater: (s: WizardState) => WizardState) => void;
}) {
  const solemn = st.occasion === 'memorial' || st.occasion === 'funeral';
  const bachelor = st.occasion.startsWith('bachelor');
  const showCountdown = !solemn;
  const showMeals = MEAL_OCCASIONS.has(st.occasion);
  const showRegistry = !bachelor;
  const registryLabel = solemn ? 'Donations in lieu of flowers' : 'A registry';
  const showPlusOnes = !solemn && !bachelor;
  /* Honor list — only where the event type carries the
     weddingParty block (wedding, rehearsal, quinceañera court,
     bar/bat-mitzvah candle lighters…). */
  const eventType = getEventType(st.occasion as never);
  const showParty = [...(eventType?.defaultBlocks ?? []), ...(eventType?.optionalBlocks ?? [])]
    .includes('weddingParty' as never);
  const partyLabel = st.occasion === 'quinceanera'
    ? 'The court of honor'
    : st.occasion === 'bar-mitzvah' || st.occasion === 'bat-mitzvah'
      ? 'The candle lighters'
      : 'The wedding party';
  const partyRole = st.occasion === 'quinceanera'
    ? 'Court of honor'
    : st.occasion === 'bar-mitzvah' || st.occasion === 'bat-mitzvah'
      ? 'Candle lighter'
      : 'Wedding party';
  const [open, setOpen] = useState<'playlist' | 'meals' | 'registry' | 'plusones' | 'party' | null>(null);
  const [partyDraft, setPartyDraft] = useState('');

  const chip = (on: boolean, label: string, onClick: () => void, expandable = false) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="wz-chip"
      style={{
        padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
        border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
        background: on ? 'var(--ink)' : 'var(--card)',
        color: on ? 'var(--cream)' : 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <span>{label}{expandable && !on ? ' +' : ''}</span>
    </button>
  );

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ ...sketchEyebrow, marginBottom: 4 }}>
        <span aria-hidden style={{ color: 'var(--pl-gold, #C19A4B)' }}>✦</span> The extras
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 12 }}>
        Each one becomes a living part of the site. Skip anything — you can add them all later.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {showCountdown && chip(
          !!st.wantsCountdown,
          st.wantsCountdown ? 'Counting down ✓' : 'A countdown to the day',
          () => setSt((s) => ({ ...s, wantsCountdown: !s.wantsCountdown })),
        )}
        {chip(
          !!st.playlistUrl,
          st.playlistUrl ? 'Playlist linked ✓' : 'We have a playlist',
          () => setOpen(open === 'playlist' ? null : 'playlist'),
          true,
        )}
        {showMeals && chip(
          (st.meals ?? []).length > 0,
          (st.meals ?? []).length > 0 ? `Menu · ${(st.meals ?? []).length} choices` : 'We know the menu',
          () => setOpen(open === 'meals' ? null : 'meals'),
          true,
        )}
        {showRegistry && chip(
          !!st.registryUrl,
          st.registryUrl ? (solemn ? 'Donations linked ✓' : 'Registry linked ✓') : registryLabel,
          () => setOpen(open === 'registry' ? null : 'registry'),
          true,
        )}
        {showPlusOnes && chip(
          st.plusOnes !== undefined,
          st.plusOnes === true ? 'Plus-ones welcome ✓' : st.plusOnes === false ? 'Invited guests only ✓' : 'Plus-ones?',
          () => setOpen(open === 'plusones' ? null : 'plusones'),
          true,
        )}
        {showParty && chip(
          (st.partyNames ?? []).length > 0,
          (st.partyNames ?? []).length > 0 ? `${partyLabel} · ${(st.partyNames ?? []).length}` : partyLabel,
          () => setOpen(open === 'party' ? null : 'party'),
          true,
        )}
      </div>

      {open === 'playlist' && (
        <div style={{ marginTop: 10 }}>
          <label className="field-label">Playlist link — Spotify, Apple Music, or YouTube</label>
          <input
            className="input"
            inputMode="url"
            value={st.playlistUrl ?? ''}
            onChange={(ev) => setSt((s) => ({ ...s, playlistUrl: ev.target.value }))}
            placeholder="https://open.spotify.com/playlist/…"
          />
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 5 }}>
            It embeds as a Music section guests can play right on the site.
          </div>
        </div>
      )}

      {open === 'meals' && (
        <div style={{ marginTop: 10 }}>
          <label className="field-label">Meal choices guests pick from when they RSVP</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {MEAL_CHIP_OPTIONS.map((m) => {
              const on = (st.meals ?? []).includes(m);
              return (
                <button key={m} type="button" aria-pressed={on}
                  onClick={() => setSt((s) => {
                    const cur = s.meals ?? [];
                    return { ...s, meals: on ? cur.filter((x) => x !== m) : [...cur, m] };
                  })}
                  className="wz-chip"
                  style={{
                    padding: '7px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                    border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                    background: on ? 'var(--ink)' : 'var(--card)',
                    color: on ? 'var(--cream)' : 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span>{m}</span>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 5 }}>
            These appear as the meal question on your RSVP form. Rename or refine them in the editor.
          </div>
        </div>
      )}

      {open === 'plusones' && (
        <div style={{ marginTop: 10 }}>
          <label className="field-label">Can guests bring someone?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {([['Plus-ones welcome', true], ['Invited guests only', false]] as const).map(([label, val]) => {
              const on = st.plusOnes === val;
              return (
                <button key={label} type="button" aria-pressed={on}
                  onClick={() => setSt((s) => ({ ...s, plusOnes: on ? undefined : val }))}
                  style={{
                    padding: '7px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                    border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                    background: on ? 'var(--ink)' : 'var(--card)',
                    color: on ? 'var(--cream)' : 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 5 }}>
            Sets the RSVP form’s +1 behavior and answers the FAQ for you.
          </div>
        </div>
      )}

      {open === 'party' && (
        <div style={{ marginTop: 10 }}>
          <label className="field-label">{partyLabel} — first names are plenty</label>
          {(st.partyNames ?? []).length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {(st.partyNames ?? []).map((n) => (
                <span key={n} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 8px 6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                  background: 'var(--sage-tint, #E3E6C8)', color: 'var(--ink)',
                }}>
                  {n}
                  <button type="button" aria-label={`Remove ${n}`}
                    onClick={() => setSt((s) => ({ ...s, partyNames: (s.partyNames ?? []).filter((x) => x !== n) }))}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-muted)', fontSize: 13, lineHeight: 1, padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              const name = partyDraft.trim();
              if (!name) return;
              setSt((s) => {
                const cur = s.partyNames ?? [];
                if (cur.includes(name)) return s;
                return { ...s, partyNames: [...cur, name] };
              });
              setPartyDraft('');
            }}
            style={{ display: 'flex', gap: 8 }}
          >
            <input
              className="input"
              value={partyDraft}
              onChange={(ev) => setPartyDraft(ev.target.value)}
              placeholder="Add a name, press return…"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-ghost" style={{ flexShrink: 0 }}>Add</button>
          </form>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 5 }}>
            They get their own section — add roles, photos, and bios in the editor.
          </div>
        </div>
      )}

      {open === 'registry' && (
        <div style={{ marginTop: 10 }}>
          <label className="field-label">{solemn ? 'Donation link — a charity or fund in their name' : 'Registry link — Zola, Amazon, Babylist, anywhere'}</label>
          <input
            className="input"
            inputMode="url"
            value={st.registryUrl ?? ''}
            onChange={(ev) => setSt((s) => ({ ...s, registryUrl: ev.target.value }))}
            placeholder={solemn ? 'https://gofundme.com/…' : 'https://zola.com/registry/…'}
          />
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 5 }}>
            {solemn
              ? 'It appears as a gentle “in lieu of flowers” card.'
              : 'It becomes your Registry section — add more links in the editor.'}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PEAR'S QUESTIONS — Review-step gap filling, conversationally.

   Pear reads what the wizard collected and asks about what's
   missing — dress code, where to stay, the story — each with the
   answer control INLINE so the host never leaves Review. Cards
   retire as they're answered. Deterministic + occasion-aware
   (the same suggestion sets and visibility rules the steps use);
   at most three questions so it reads as care, not homework.
   ──────────────────────────────────────────────────────────── */
function PearsQuestions({
  st,
  setSt,
}: {
  st: WizardState;
  setSt: (updater: (s: WizardState) => WizardState) => void;
}) {
  const [hotelQuery, setHotelQuery] = useState('');
  const e = getEventType(st.occasion as never);
  const blocks = [...(e?.defaultBlocks ?? []), ...(e?.optionalBlocks ?? [])] as string[];
  const q = questionsFor(st.occasion);
  const solemn = st.occasion === 'memorial' || st.occasion === 'funeral';

  const cards: React.ReactNode[] = [];

  // 1. No story yet — the single highest-value gap.
  if (!(st.storyText ?? '').trim() && !(st.howWeMet ?? '').trim()) {
    cards.push(
      <div key="story">
        <div style={pearsQLabel}>{q.q1Label}?</div>
        <textarea
          className="input"
          rows={2}
          value={st.storyText ?? ''}
          onChange={(ev) => setSt((s) => ({ ...s, storyText: ev.target.value }))}
          placeholder={q.q1Placeholder}
          style={{ fontSize: 14, lineHeight: 1.5 }}
        />
      </div>,
    );
  }

  // 2. No dress code (skip bachelor weekends — anything goes).
  if (!st.dressCode && !st.occasion.startsWith('bachelor') && cards.length < 3) {
    const dresses = dressCodeSuggestions(st.occasion).options.slice(0, 5);
    cards.push(
      <div key="dress">
        <div style={pearsQLabel}>What should everyone wear?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {dresses.map((d) => (
            <button key={d} type="button"
              onClick={() => setSt((s) => ({ ...s, dressCode: d }))}
              className="wz-chip"
              style={{
                padding: '7px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                border: '1.5px solid var(--line)', background: 'var(--card)',
                color: 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span>{d}</span>
            </button>
          ))}
        </div>
      </div>,
    );
  }

  // 3. Travel-shaped event, venue known, no hotels yet.
  if (
    blocks.includes('travel') && st.location && (st.hotels ?? []).length === 0 && cards.length < 3
  ) {
    cards.push(
      <div key="hotels">
        <div style={pearsQLabel}>Where should out-of-towners stay?</div>
        <WizardLocationAutocomplete
          value={hotelQuery}
          onChange={setHotelQuery}
          onSelect={(place) => {
            const name = place.name || place.address;
            if (!name) return;
            setSt((s) => ({ ...s, hotels: [...(s.hotels ?? []), { name, address: place.address ?? '', lat: place.lat, lng: place.lng }] }));
            setHotelQuery('');
          }}
          kind="hotel"
          near={st.venueLat != null && st.venueLng != null ? { lat: st.venueLat, lng: st.venueLng } : undefined}
          placeholder="Search a hotel near the venue…"
        />
      </div>,
    );
  }

  if (cards.length === 0) return null;

  return (
    <div style={{ marginTop: 18, padding: 16, borderRadius: 14, background: 'var(--sage-tint, rgba(122,138,79,0.10))', border: '1px dashed var(--sage, #7A8A4F)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Pear size={16} tone="sage" shadow={false} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
          {solemn ? 'A few quiet questions before we press' : 'Pear noticed a few open threads'}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 12 }}>
        Answer here or skip — everything can be added in the editor.
      </div>
      <div style={{ display: 'grid', gap: 14 }}>{cards}</div>
    </div>
  );
}

const pearsQLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--ink)',
  marginBottom: 7,
  fontFamily: 'var(--font-display, Fraunces, serif)',
  fontStyle: 'italic',
};

function PhaseHeader({ active, hiddenSteps }: { active: number; hiddenSteps?: StepKey[] }) {
  // Horizontal 4-phase node stepper (v4 design): Story · Photos ·
  // Look · Review, all shown at once, connected by threads. Each
  // phase is a node + label; the current phase carries a "n of m"
  // step count. Template mode hides Vibe/Palette — but every phase
  // keeps at least one visible step, so all four nodes still show.
  const hidden = hiddenSteps ?? [];
  const phases = PHASES.filter((p) => p.steps.some((s) => !hidden.includes(s)));

  const currentPhase = phaseFor(STEPS[active]);
  const currentPhaseIndex = phases.findIndex((p) => p.key === currentPhase);

  // Step number within the active phase (e.g. 1 of 4).
  const phaseSteps = PHASES.find((p) => p.key === currentPhase)?.steps ?? [];
  const visiblePhaseSteps = phaseSteps.filter((s) => !hidden.includes(s));
  const phaseStepIndex = visiblePhaseSteps.indexOf(STEPS[active]);
  const phaseN = phaseStepIndex + 1;
  const phaseM = visiblePhaseSteps.length;

  const OLIVE = 'var(--pl-olive, #5C6B3F)';
  const DIVIDER = 'var(--pl-divider, var(--line-soft, #E4DCCB))';
  const MUTED = 'var(--pl-muted, var(--ink-muted))';

  return (
    <div
      className="pl8-wizard-progress"
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minWidth: 0,
      }}
    >
      {phases.map((p, i) => {
        const done = i < currentPhaseIndex;
        const on = i === currentPhaseIndex;
        return (
          <Fragment key={p.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
              <span
                aria-hidden
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  background: done || on ? OLIVE : 'transparent',
                  border: `1.5px solid ${done || on ? OLIVE : DIVIDER}`,
                  color: '#fff',
                  transition: 'all 280ms cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : on ? (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
                ) : null}
              </span>
              {/* data-step-label: the mobile CSS collapses these to
                  nodes-only on narrow screens (pearloom.css). */}
              <div data-step-label>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: on ? 700 : 500,
                    color: on || done ? 'var(--ink)' : MUTED,
                    fontFamily: 'var(--font-ui)',
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.key}
                </div>
                {on && (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                      fontSize: 10,
                      color: MUTED,
                      marginTop: 1,
                    }}
                  >
                    {phaseN} of {phaseM}
                  </div>
                )}
              </div>
            </div>
            {i < phases.length - 1 && (
              done ? (
                /* A completed phase is WOVEN to the next — the flat bar
                   becomes the two-strand thread (olive + foil), drawing
                   in the moment the phase completes. */
                <svg aria-hidden viewBox="0 0 54 10" style={{ width: 54, height: 10, margin: '0 4px', flexShrink: 0 }}>
                  <defs>
                    <FoilGradient id={`pl8-wzspine-${i}`} />
                  </defs>
                  <path
                    className="pl-thread-draw"
                    style={{ '--pl-draw-len': '60', '--pl-draw-dur': '0.6s', '--pl-draw-delay': '0s' } as CSSProperties}
                    d="M 1 5 C 8 1, 14 1, 20 5 S 33 9, 39 5 S 50 1, 53 5"
                    fill="none" stroke={OLIVE} strokeWidth="1.5" strokeLinecap="round" pathLength={60}
                  />
                  <path
                    className="pl-thread-draw"
                    style={{ '--pl-draw-len': '60', '--pl-draw-dur': '0.6s', '--pl-draw-delay': '0.12s' } as CSSProperties}
                    d="M 1 5 C 8 9, 14 9, 20 5 S 33 1, 39 5 S 50 9, 53 5"
                    fill="none" stroke={`url(#pl8-wzspine-${i})`} strokeWidth="1.5" strokeLinecap="round" pathLength={60}
                  />
                </svg>
              ) : (
                <span
                  aria-hidden
                  style={{
                    width: 54,
                    height: 2,
                    borderRadius: 2,
                    margin: '0 4px',
                    flexShrink: 0,
                    background: DIVIDER,
                    backgroundImage: `linear-gradient(90deg, ${DIVIDER} 60%, transparent 0)`,
                    backgroundSize: '7px 2px',
                    transition: 'background 280ms cubic-bezier(0.22,1,0.36,1)',
                  }}
                />
              )
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/* Mono phase eyebrow above each step heading — "STORY · STEP 2 OF 4"
   in olive, matching the design handoff's per-step header (the H
   component's `pre`). Computed from the live phase map so it always
   tracks template mode's hidden Vibe/Palette. The Occasion +
   Sections steps carry their own bespoke eyebrows, so they skip it. */
function StepEyebrow({ step, hiddenSteps = [] }: { step: StepKey; hiddenSteps?: StepKey[] }) {
  const phase = phaseFor(step);
  const phaseSteps = PHASES.find((p) => p.key === phase)?.steps ?? [];
  const visible = phaseSteps.filter((s) => !hiddenSteps.includes(s));
  const n = visible.indexOf(step) + 1;
  const m = visible.length;
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        fontSize: 11,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--pl-olive, #5C6B3F)',
        marginBottom: 12,
      }}
    >
      {phase} · Step {n} of {m}
    </div>
  );
}

/* Small olive check badge — the design handoff marks a Basics field
   as filled the moment it has content. */
function GreenCheck({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        flexShrink: 0,
        background: 'var(--pl-olive, #5C6B3F)',
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
      }}
    >
      <Icon name="check" size={Math.round(size * 0.6)} strokeWidth={3} />
    </span>
  );
}

/* Field label carrying the handoff's fill-check on the trailing edge. */
function CheckLabel({ children, done }: { children: ReactNode; done: boolean }) {
  return (
    <label
      className="field-label"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
    >
      <span>{children}</span>
      {done && <GreenCheck size={16} />}
    </label>
  );
}

/* The Day / "Sketch the day" section eyebrows — olive mono caps with
   a leading gold fleuron, per the handoff's ✦ SECTION headers. */
const sketchEyebrow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--pl-olive, #5C6B3F)',
  marginBottom: 10,
};

/* Relative luminance from a hex color (#rgb / #rrggbb). Returns
   null for anything unparseable (var() strings, named colors) so
   callers can keep their defaults. */
function hexLuminance(hex: string): number | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const chan = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(0) + 0.7152 * chan(2) + 0.0722 * chan(4);
}
/** Numeric hex blend (w = ink share) — lets the preview VERIFY a
 *  derived soft ink's contrast instead of hoping a color-mix()
 *  string lands right (PERSONA-PLAN S7). */
function mixHex(a: string, b: string, w: number): string | null {
  const pa = /^#?([0-9a-f]{6})$/i.exec(a.trim());
  const pb = /^#?([0-9a-f]{6})$/i.exec(b.trim());
  if (!pa || !pb) return null;
  const ca = pa[1], cb = pb[1];
  let out = '#';
  for (let i = 0; i < 6; i += 2) {
    const v = Math.round(parseInt(ca.slice(i, i + 2), 16) * w + parseInt(cb.slice(i, i + 2), 16) * (1 - w));
    out += v.toString(16).padStart(2, '0');
  }
  return out;
}

function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// Inline tips per step — replaces the floating PearHelper sidebar.
// PERSONAL + REACTIVE (2026-07-08): Pear's line under each question
// speaks to the host by name and reflects what they've already
// entered, so the wizard reads as a conversation, not a form.
function stepTipFor(step: StepKey, st: WizardState, firstName?: string): string {
  const names = st.names.filter((n) => n.trim());
  const nameLine =
    names.length >= 2 ? `${names[0]} & ${names[1]}` : names[0] ?? '';
  switch (step) {
    case 'Occasion':
      return firstName
        ? `Alright, ${firstName} — pick the closest. We can change it any time.`
        : 'Not sure? Pick the closest — we can change it any time.';
    case 'Basics':
      return 'Guests only see what you choose. First names work fine.';
    case 'Details':
      return nameLine
        ? `Anything you give Pear here becomes ${nameLine}'s story — skip freely, edit later.`
        : 'Skip any field — write it yourself later in the editor.';
    case 'Day':
      return nameLine
        ? `Everything here is optional — it pre-fills ${nameLine}'s sections.`
        : 'Everything here is optional — it pre-fills your sections.';
    case 'Photos':
      return '6 to 20 photos is the sweet spot. More = more chapters.';
    case 'Sections':
      return firstName
        ? `Pear pre-picked these for you, ${firstName} — glance, tweak, continue.`
        : 'Everything is pre-picked — glance, tweak, continue.';
    case 'Vibe':
      return 'These shape the real site — layouts, type, spacing. Pick 2 to 4.';
    case 'Palette':
      return 'Pick what you love — Pear builds matching gradients + accents.';
    case 'Review':
      return firstName
        ? `Nothing is public until you publish, ${firstName}. Keep editing as long as you like.`
        : 'Nothing is public until you publish. Keep editing as long as you like.';
  }
}

// Live save-the-date preview shown beside every step — a phone frame
// (dark bezel, drop shadow) holding a scrollable mini save-the-date
// site (design handoff: SiteBody + LiveSite). Ports the zip exactly:
// monogram / hamburger nav, save-the-date hero, photo cover, an Our
// Story band, three detail cards, and an RSVP block. It re-themes off
// the chosen palette — paper/ink/accent derive from the same robust
// ground/accent/ink chain as the inline vignette, so any palette
// (smart, photo, or classic) reads cleanly.
function WizardLivePreview({ st }: { st: WizardState }) {
  const nameSpec = nameModeFor(st.occasion);
  const couple = nameSpec.mode === 'couple';
  const names = st.names.filter((n) => n.trim());
  const a = names[0] || (couple ? 'Alex' : nameSpec.primaryPlaceholder);
  const b = couple ? (names[1] || 'Jamie') : '';
  const title = names.length ? names.join(couple ? ' & ' : ', ') : (couple ? `${a} & ${b}` : a);
  // Monogram mark for the phone's top-left corner.
  const initials = couple
    ? `${a[0] || 'A'}&${b[0] || 'J'}`.toUpperCase()
    : (a[0] || 'S').toUpperCase();
  // Occasion frame — eyebrow, verb line, story band, reply block all
  // route by occasion + name mode (PERSONA-PLAN S1: no more
  // "‹single name› are celebrating", no party frame on memorials).
  const frame = previewFrameFor(st.occasion);
  const verb = frame.verbLine;

  const paletteColors =
    st.paletteColors && st.paletteColors.length > 0
      ? st.paletteColors
      : PALETTES.find((p) => p.id === st.palette)?.colors;
  const accentRaw = paletteColors?.[1] || 'var(--sage-deep, #5C6B3F)';
  const ground = paletteColors?.[2] || 'var(--cream-2, #F0E8D6)';
  const inkRaw = paletteColors?.[3] || 'var(--ink, #2A2A2A)';
  // Same contrast guard the inline vignette uses — palettes carry no
  // contrast guarantee, so every card color derives from the ground.
  const groundLum = hexLuminance(ground);
  const baseInk = groundLum == null ? 'var(--ink, #2A2A2A)' : groundLum > 0.45 ? '#2A2418' : '#F5EFE2';
  const inkLum = hexLuminance(inkRaw);
  const ink = groundLum != null && inkLum != null && contrastRatio(inkLum, groundLum) >= 4.5 ? inkRaw : baseInk;
  const accentLum = hexLuminance(accentRaw);
  const accent = groundLum == null || (accentLum != null && contrastRatio(accentLum, groundLum) >= 3)
    ? accentRaw
    : `color-mix(in srgb, ${accentRaw} 45%, ${baseInk})`;
  const date = parseLocalDate(st.eventDate)?.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  // Mini-site tints derived from the theme so they read on any palette.
  // color-mix keeps both hex AND var() inputs valid.
  const paper = ground;
  const section = `color-mix(in srgb, ${ground} 90%, ${accent})`;
  const softInkFor = (w: number): string => {
    const m = groundLum != null ? mixHex(ink, ground, w) : null;
    if (!m) return `color-mix(in srgb, ${ink} ${Math.round(w * 100)}%, ${ground})`;
    const ml = hexLuminance(m);
    if (ml != null && groundLum != null && contrastRatio(ml, groundLum) >= 4.5) return m;
    // The ground is too mid for a softened ink — full ink, honestly.
    return ink;
  };
  const inkSoft = softInkFor(0.86);
  const inkMuted = softInkFor(0.76);
  /* Accent AS SMALL TEXT (the story-band eyebrow) needs 4.5:1 — the
     3:1 accent above stays for fills and large glyphs. */
  const accentText = groundLum == null || (accentLum != null && contrastRatio(accentLum, groundLum) >= 4.5)
    ? accentRaw
    /* It renders on the section band (a touch darker than ground),
       so a guessed mix can land a hair under — full ink instead. */
    : ink;
  const line = `color-mix(in srgb, ${ink} 16%, ${ground})`;
  const place = st.location;

  const mono = 'var(--font-mono, ui-monospace, monospace)';
  const display = 'var(--font-display, Fraunces, serif)';

  // The vibes RE-PRESS the preview live (2026-07-08): the same
  // first-vibe-wins axes applyVibeLook stamps at finish — display
  // weight, hero scale, density, hero arrangement — drive the mini
  // site, so a tap on "Editorial" visibly re-lays the phone.
  const vibeAxes = (() => {
    let weight: number | undefined;
    let scale: number | undefined;
    let density: string | undefined;
    let hero: string | undefined;
    for (const id of st.vibes) {
      const look = VIBE_LOOKS[id];
      if (!look) continue;
      weight ??= look.displayWeight;
      scale ??= look.heroScale;
      density ??= look.density;
      hero ??= look.layouts?.hero;
    }
    const pad = density === 'cozy' ? 0.85 : density === 'spacious' ? 1.2 : 1;
    const poster = hero === 'typographic' || hero === 'plate';
    const left = hero === 'minimal' || hero === 'spread';
    return { weight: weight ?? 600, scale: scale ?? 1, pad, poster, left };
  })();

  // The host's own first photo is the preview's cover the moment it
  // exists — THEIR site, not stock. No photo yet → a tonal block.
  const coverUrl = st.photos.find((p) => p.previewUrl || p.url)?.previewUrl
    || st.photos.find((p) => p.url)?.url;

  return (
    <aside
      className="pl8-wizard-preview"
      /* A decorative live thumbnail of the site being built — the
         real content is the form beside it. Hidden from the a11y
         tree: its 8px mini-site type is not meant to be read, and
         the derived palette inks can't guarantee contrast. */
      aria-hidden
      style={{ position: 'sticky', top: 96, alignSelf: 'start', justifySelf: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
    >
      {/* LIVE PREVIEW pill */}
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 13px', borderRadius: 999,
          border: '1px solid var(--line)', background: 'var(--card)',
          fontFamily: mono, fontSize: 9.5, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--ink-muted)',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pl-olive, #5C6B3F)' }} /> Live preview
      </span>

      {/* Phone frame — dark bezel + soft drop shadow. Re-keys on any
          look-shaping pick (palette, names, VIBES) so the whole phone
          presses in again — the pick is visibly a re-pressing. */}
      <div
        key={`${st.palette}${title}${st.vibes.join(',')}`}
        className="pl-press-in"
        style={{
          width: 300,
          boxSizing: 'border-box',
          borderRadius: 26,
          border: '8px solid #1A1712',
          background: '#1A1712',
          boxShadow: '0 34px 70px -30px rgba(60,50,20,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Scrollable mini save-the-date site (design handoff SiteBody). */}
        <div style={{ height: 540, overflow: 'auto', borderRadius: 18, background: paper, color: ink, fontFamily: 'var(--font-ui)' }}>
          {/* Nav row — monogram + menu */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
            <span style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${line}`, display: 'grid', placeItems: 'center', fontFamily: display, fontStyle: 'italic', fontSize: 12, color: ink }}>
              {initials}
            </span>
            <Icon name="list" size={16} color={inkMuted} />
          </div>
          {/* Hero — arrangement follows the picked vibes (poster =
              typographic/plate heroes stack the names bigger; left =
              minimal/spread heroes rag left). */}
          <div style={{ textAlign: vibeAxes.left ? 'left' : 'center', padding: `${Math.round(10 * vibeAxes.pad)}px 18px ${Math.round(22 * vibeAxes.pad)}px` }}>
            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: inkMuted }}>{frame.eyebrow}</div>
            <div style={{ fontFamily: display, fontWeight: vibeAxes.weight, fontSize: Math.round((vibeAxes.poster ? 34 : 28) * vibeAxes.scale), lineHeight: 1.02, color: ink, margin: '8px 0 2px' }}>
              {couple ? (
                vibeAxes.poster ? (
                  <>
                    {a}
                    <br />
                    <span style={{ fontStyle: 'italic', fontWeight: 400 }}>
                      <span style={{ color: accent, fontSize: '0.6em', verticalAlign: '0.2em' }}>&amp; </span>
                      {b}
                    </span>
                  </>
                ) : (
                  <>{a} <span style={{ fontStyle: 'italic', color: accent }}>&amp;</span> {b}</>
                )
              ) : title}
            </div>
            <div style={{ fontFamily: display, fontStyle: 'italic', fontSize: 13.5, color: accent }}>{verb}</div>
            <div style={{ fontSize: 10.5, color: inkSoft, marginTop: 10, lineHeight: 1.6 }}>
              {date || 'The date'}{place ? <><br />{place}</> : null}
            </div>
          </div>
          {/* Photo cover — the host's own first upload the moment it
              exists; a tonal band with a sprig until then (no stock
              photo pretending to be theirs). */}
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              style={{ width: '100%', height: 132, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              aria-hidden
              style={{
                width: '100%', height: 132,
                background: `linear-gradient(160deg, ${section}, color-mix(in srgb, ${accent} 30%, ${paper}))`,
                display: 'grid', placeItems: 'center',
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: inkMuted }}>
                Your photo lands here
              </span>
            </div>
          )}
          {/* Story band — eyebrow/heading/blurb follow the occasion
              ("Their story / A life remembered" on a memorial, never
              "Our story / Two people…"). */}
          <div style={{ padding: '22px 18px', background: section, textAlign: 'center' }}>
            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: accentText }}>{frame.storyEyebrow}</div>
            <div style={{ fontFamily: display, fontSize: 18, margin: '6px 0', color: ink }}>{frame.storyTitle}</div>
            <div style={{ fontSize: 10.5, color: inkSoft, lineHeight: 1.65 }}>{frame.storyBlurb}</div>
          </div>
          {/* Detail cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: 16 }}>
            {([['calendar', 'Date'], ['pin', 'Venue'], ['hanger', 'Attire']] as const).map(([icon, label]) => (
              <div key={label} style={{ textAlign: 'center', border: `1px solid ${line}`, borderRadius: 8, padding: '13px 6px' }}>
                <Icon name={icon} size={15} color={accent} />
                <div style={{ fontFamily: display, fontSize: 12, marginTop: 6, color: ink }}>{label}</div>
              </div>
            ))}
          </div>
          {/* Reply block — heading + button wear the occasion's own
              vocabulary ("Reply" on a memorial, "I'm in" on a
              bachelorette, "RSVP" for the rest). */}
          <div style={{ padding: '24px 18px', textAlign: 'center', background: ink, color: paper }}>
            <div style={{ fontFamily: display, fontSize: 20 }}>{frame.rsvpTitle}</div>
            <span style={{ display: 'inline-block', marginTop: 12, padding: '9px 22px', borderRadius: 6, background: paper, color: ink, fontSize: 11.5, fontWeight: 600 }}>{frame.rsvpCta}</span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>This preview updates as you choose.</div>
    </aside>
  );
}

export function WizardV8() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Pear addresses the host by first name (the /welcome flow already
  // asked "what should Pear call you?"; the session carries it).
  const { data: session, status: authStatus } = useSession();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] || undefined;
  /* Signed-out hosts still finish the whole wizard (GRAND-PLAN
     Phase 2) — but Pear's palette advisor is a signed-in nicety.
     Locked ≠ an error: the UI shows a quiet slat, never the API's
     "Sign in required." (PERSONA-PLAN S3, F4). */
  const pearPaletteLocked = authStatus === 'unauthenticated';
  const templateId = searchParams.get('template');
  /* ?occasion=rehearsal-dinner — deep link from the dashboard's
     "around your wedding" sibling-event card. Prefills the
     occasion (validated against the registry); explicit picks in
     the wizard always win. */
  const occasionParam = searchParams.get('occasion');
  /* ?names=Maya+%26+Jordan — the landing hero's typed names arrive
     here instead of evaporating (PERSONA-PLAN S5). Split on the
     same separators the hero's live preview parses (& / and / +);
     never overrides a resumed draft (drafts carry real progress). */
  const namesParam = searchParams.get('names');
  const prefillNames = ((): [string, string] | null => {
    const raw = (namesParam ?? '').trim().slice(0, 120);
    if (!raw) return null;
    const parts = raw.split(/\s*(?:&|\band\b|\+)\s*/i).map((x) => x.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    return [parts[0], parts.slice(1).join(' & ')];
  })();
  const linkFromParam = searchParams.get('from');
  const linkCidParam = searchParams.get('cid');
  const linkCnameParam = searchParams.get('cname');
  const dialog = useDialog();
  const [stepIndex, setStepIndex] = useState(0);
  // Persist wizard state across refreshes so users don't lose their
  // work if they accidentally reload mid-flow. Photos stay out of
  // storage (too big); they'd need to be re-picked.
  const STORAGE_KEY = 'pl-wizard-state-v1';
  const [st, setSt] = useState<WizardState>(() => {
    /* An explicit ?occasion= deep link means "start a NEW site of
       this kind" (the sibling-event card) — it wins over any stale
       in-flight draft, which would otherwise resume a different
       celebration entirely. */
    if (occasionParam && getEventType(occasionParam as never)) {
      return {
        ...defaultState,
        occasion: occasionParam,
        names: prefillNames ?? defaultState.names,
        linkFromSlug: linkFromParam ?? undefined,
        linkCelebId: linkCidParam ?? undefined,
        linkCelebName: linkCnameParam ?? undefined,
      } as WizardState;
    }
    /* Names typed into the landing hero (no occasion picked): a
       fresh visitor starts with them in place. A stored draft
       still wins below — it carries real progress. */
    if (prefillNames && typeof window !== 'undefined' && !window.localStorage.getItem(STORAGE_KEY)) {
      return { ...defaultState, names: prefillNames } as WizardState;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<WizardState>;
          if (parsed && typeof parsed === 'object') {
            return { ...defaultState, ...parsed, photos: [] } as WizardState;
          }
        }
      } catch {}
    }
    if (templateId) {
      const tpl = TEMPLATES_BY_ID[templateId];
      if (tpl) {
        return {
          ...defaultState,
          occasion: tpl.occasion,
          vibes: tpl.vibes.map((v) => v.toLowerCase()),
          palette: tpl.palette,
          layout: tpl.layout,
          templateId,
        } as WizardState;
      }
    }
    return defaultState;
  });

  // Debounced persistence — runs on every state change, but throttled
  // to one write per 400ms so we don't thrash localStorage on each
  // keystroke.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => {
      try {
        const { photos: _photos, ...persisted } = st;
        void _photos;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [st]);
  /* Welcome-flow intent → occasion prefill + the visible "For you"
     badge on the Occasion step. The onboarding flow stores what
     brought the user here (user_preferences.intent); when the
     wizard opens cold that answer preselects the occasion, and the
     matching tile leads the grid with a badge so it reads like
     Pear remembered — because it did. An explicit pick always wins
     (functional update re-checks). */
  const [intentOccasion, setIntentOccasion] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    fetch('/api/user/preferences', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { intent?: string | null; display_name?: string | null } | null) => {
        if (cancelled || !d?.intent) return;
        const INTENT_TO_OCCASION: Record<string, string> = {
          wedding: 'wedding',
          engagement: 'engagement',
          baby: 'baby-shower',
          birthday: 'birthday',
          reunion: 'reunion',
          memorial: 'memorial',
        };
        /* The Welcome flow already asked their name — a host who
           told Pear "call me Emma" shouldn't retype Emma in
           Basics. First name only; never clobbers typed input. */
        const first = (d.display_name ?? '').trim().split(/\s+/)[0] ?? '';
        if (first) {
          setSt((prev) => (prev.names[0] ? prev : { ...prev, names: [first, prev.names[1]] }));
        }
        const occ = INTENT_TO_OCCASION[d.intent];
        if (!occ) return;
        setIntentOccasion(occ);
        setSt((prev) => (prev.occasion ? prev : { ...prev, occasion: occ }));
      })
      .catch(() => { /* prefill is a nicety */ });
    return () => { cancelled = true; };
     
  }, []);
  const [busy, setBusy] = useState(false);
  /* The phone preview peek (S6) — the live preview in a bottom
     sheet, for viewports where the aside is hidden. */
  const [peekOpen, setPeekOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Live mirror of wizard state for async flows — handleFinish
  // captures a stale `st` in its closure, so the upload-wait loop
  // below reads through this ref to see fresh photo upload state.
  const stRef = useRef(st);
  stRef.current = st;

  // Palette colors that generation should honor. st.paletteColors
  // is only written when the host CLICKS a palette tile — a host
  // who keeps the pre-selected default (or restores an old draft)
  // would otherwise generate with no colors at all, silently
  // dropping their palette. Fall back to the selected preset's
  // swatches, exactly like the live vignette + Review step do.
  const resolvedPaletteColors = useMemo<string[] | undefined>(
    () =>
      st.paletteColors && st.paletteColors.length > 0
        ? st.paletteColors
        : PALETTES.find((p) => p.id === st.palette)?.colors,
    [st.paletteColors, st.palette],
  );

  // Background cook — kicks off the AI decor library generation
  // as soon as the host has occasion + palette + venue. The
  // result lands in sessionStorage so the editor's first paint
  // can read it instead of generating decor on demand. Saves
  // 60-120s after the wizard's main generate pass.
  // Memoized — a fresh object every render used to re-run the cook
  // effect per keystroke (see the fix note in useBackgroundCook).
  const cookVibe = st.vibes.join(', ');
  const cookSig = useMemo(
    () =>
      st.occasion && resolvedPaletteColors && resolvedPaletteColors.length > 0
        ? {
            occasion: st.occasion,
            paletteHex: resolvedPaletteColors,
            venue: st.location || undefined,
            vibe: cookVibe || undefined,
          }
        : null,
    [st.occasion, resolvedPaletteColors, st.location, cookVibe],
  );
  const cookStatus = useBackgroundCook(cookSig);

  // The speculative manifest pre-warm (background /api/generate
  // runs while the host finished the steps) was removed 2026-06-12
  // along with the synchronous AI pipeline — photos are content
  // now (cover + gallery), not story inputs, so there is nothing
  // slow left to pre-warm. Story drafting lives in the editor,
  // on demand, where Pear already works.
  const [genStep, setGenStep] = useState<string>('');
  /* The look the host is HOVERING at the end of the wizard — while
     it's set, the whole room wears that look's paper grain (the
     underlay below). Falls back to the picked look so the dressing
     persists through Review once they choose. */
  /* Full-screen fitting room (Palette step). */
  const [fittingOpen, setFittingOpen] = useState(false);
  const [generatedTagline, setGeneratedTagline] = useState<string>('');
  const [taglineState, setTaglineState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const step = STEPS[stepIndex];
  // Template mode folds the Vibe + Palette steps out of the Look
  // phase — the same set PhaseHeader hides. StepEyebrow reads this so
  // its "Look · Step n of m" count matches the header stepper.
  const hiddenSteps: StepKey[] = st.templateId ? ['Vibe', 'Palette'] : [];
  // The live save-the-date phone preview rides EVERY step (v4 design):
  // the two-column canvas grid appears beside the controls on Occasion,
  // Basics, Details, Day, Photos, Sections, Vibe, Palette and Review so
  // the host always watches their site take shape. WizardLivePreview
  // reads names/palette/occasion with sensible defaults, so it renders
  // safely before a palette is chosen. The one exception is the
  // full-bleed fitting room, which owns the screen while it's open.
  // Review inverts the stage — the full-width proof replaces the
  // phone aside there (two pressings would fight for authority).
  const showPreview = !fittingOpen && step !== 'Review';

  // ── "From your photos" palette ──────────────────────────────
  // Client-side extraction from the host's first uploaded photo
  // (the one the hero leads with). Computed lazily when the host
  // reaches the Palette step; cached per source URL by the hook,
  // so revisits are free and re-picked photos recompute. Fails
  // silently — no photos / tainted canvas / decode error just
  // means the tile doesn't render.
  const firstPhoto = st.photos[0];
  const photoPaletteSource = firstPhoto
    ? firstPhoto.previewUrl || firstPhoto.url || undefined
    : undefined;
  const photoPalette = usePhotoPalette(photoPaletteSource, step === 'Palette');
  const photoPaletteColors = useMemo<[string, string, string, string] | null>(
    () =>
      photoPalette
        ? [photoPalette.accent, photoPalette.gold, photoPalette.accentBg, photoPalette.accentInk]
        : null,
    [photoPalette],
  );
  // If the host picked the photo palette and then changed photos
  // (back-navigation), re-sync the selected hex tuple so the
  // generate pass honors the fresh extraction.
  useEffect(() => {
    if (!photoPaletteColors) return;
    setSt((s) =>
      s.palette === PHOTO_PALETTE_ID &&
      (s.paletteColors ?? []).join(',') !== photoPaletteColors.join(',')
        ? { ...s, paletteColors: photoPaletteColors }
        : s,
    );
  }, [photoPaletteColors]);

  // Fetch AI palette suggestions. Factored out so we can fire it
  // automatically on step enter AND from the "Re-read my event"
  // button.
  const fetchSmartPalettes = async () => {
    // Signed-out: never fire (the route 401s) — the Palette step
    // renders the honest slat instead of a raw auth error.
    if (authStatus !== 'authenticated') return;
    setSt((s) => ({ ...s, smartPalettesLoading: true, smartPalettesError: undefined }));
    try {
      const res = await fetch('/api/wizard/smart-palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: st.occasion,
          names: st.names,
          venue: st.location,
          city: st.location,
          vibes: st.vibes,
          howWeMet: st.howWeMet,
          whyCelebrate: st.whyCelebrate,
          // Colors actually present in their pictures (client-side
          // quantize of the lead photo) — the advisor builds one
          // suggestion from these instead of guessing from words.
          photoHexes: photoPalette?.swatches,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Palette advisor unavailable.');
      setSt((s) => ({
        ...s,
        smartPalettes: (data.palettes ?? []) as SmartPalette[],
        smartPalettesLoading: false,
      }));
    } catch (err) {
      setSt((s) => ({
        ...s,
        smartPalettesLoading: false,
        smartPalettesError: err instanceof Error ? err.message : 'Palette advisor failed.',
      }));
    }
  };

  // The photo-palette extraction races the auto-fire below: give it
  // a short beat so the advisor sees the photo colors, but fire
  // anyway after 2.5s so a failed extraction (tainted canvas, decode
  // error) never blocks the suggestions.
  const [photoWaitExpired, setPhotoWaitExpired] = useState(false);
  useEffect(() => {
    if (step !== 'Palette') {
      setPhotoWaitExpired(false);
      return;
    }
    const t = setTimeout(() => setPhotoWaitExpired(true), 2500);
    return () => clearTimeout(t);
  }, [step]);

  // Auto-fire palette suggestions the FIRST time the user lands on
  // the Palette step — no click required. Guards against re-firing
  // on step-navigation back-and-forth by checking existing results.
  useEffect(() => {
    if (step !== 'Palette') return;
    // Session still resolving → wait (the effect re-runs on status);
    // signed out → never fire, the step shows the slat instead.
    if (authStatus !== 'authenticated') return;
    if (st.smartPalettesLoading) return;
    if ((st.smartPalettes?.length ?? 0) > 0) return;
    // Don't auto-fire if the user hasn't given us enough to work with.
    if (!st.occasion) return;
    // Photos uploaded but colors not extracted yet → wait for the
    // extraction (or the 2.5s grace timer) before asking the advisor.
    if (st.photos.length > 0 && !photoPalette && !photoWaitExpired) return;
    void fetchSmartPalettes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, photoPalette, photoWaitExpired, authStatus]);

  // The unbroken thread (PERSONA-PLAN S3) — a "Weave my site" click
  // interrupted by the signed-out 401 resumes ITSELF: the 401 branch
  // flags the persisted draft (pendingPress), signup forwards back
  // here, the mount restore rehydrates the draft, and this effect
  // honors the click the host already made. Fires at most once.
  const resumedPressRef = useRef(false);
  useEffect(() => {
    if (resumedPressRef.current) return;
    if (!st.pendingPress) return;
    if (authStatus !== 'authenticated') return;
    if (busy) return;
    resumedPressRef.current = true;
    trackEvent('wizard_press_resumed', { occasion: st.occasion });
    setSt((s) => ({ ...s, pendingPress: false }));
    // A beat so the restored state settles (and the host sees the
    // wizard resume) before the press choreography takes over.
    window.setTimeout(() => { void handleFinish(); }, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.pendingPress, authStatus, busy]);

  // Steps that are redundant when a template is selected — the
  // template already picked the occasion, vibes, palette, and
  // layout. Skip them on forward navigation; still reachable via
  // the progress bar if the user wants to override.
  const isTemplateRedundant = (stepName: StepKey): boolean => {
    if (!st.templateId) return false;
    return stepName === 'Vibe' || stepName === 'Palette';
  };

  /** Next index, skipping template-redundant steps. */
  const nextStepIndex = (from: number): number => {
    let next = Math.min(from + 1, STEPS.length - 1);
    while (next < STEPS.length - 1 && isTemplateRedundant(STEPS[next])) next += 1;
    return next;
  };

  /** Previous index, also skipping template-redundant steps. */
  const prevStepIndex = (from: number): number => {
    let prev = Math.max(0, from - 1);
    while (prev > 0 && isTemplateRedundant(STEPS[prev])) prev -= 1;
    return prev;
  };

  // Auto-advance to the next step after a single-choice selection.
  // Small delay so the user sees the checkmark animation before the
  // step transitions. Skips Vibe/Palette/Layout when a template is
  // active since those are pre-set by the template itself.
  const autoAdvance = (ms = 380) => {
    window.setTimeout(() => {
      setStepIndex((i) => nextStepIndex(i));
    }, ms);
  };

  async function suggestTagline() {
    setTaglineState('running');
    try {
      const res = await fetch('/api/rewrite-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: `Write a warm 1-2 sentence hero tagline for a ${st.occasion} site for ${st.names.filter(Boolean).join(' & ') || 'the hosts'}${
            st.location ? ` at ${st.location}` : ''
          }${st.vibes.length ? `. Vibes: ${st.vibes.join(', ')}` : ''}. No exclamation marks, no cliches. Write like a friend.`,
          tone: 'warm',
        }),
      });
      if (!res.ok) throw new Error(`Pear couldn't write one (${res.status})`);
      const data = (await res.json()) as { text?: string; rewritten?: string; result?: string };
      const text = (data.text ?? data.rewritten ?? data.result ?? '').trim();
      if (!text) throw new Error('Empty tagline');
      setGeneratedTagline(text);
      setTaglineState('done');
      setTimeout(() => setTaglineState('idle'), 1800);
    } catch {
      setTaglineState('error');
    }
  }

  // When a template is pre-selected, start the user at the Basics step so
  // they don't re-confirm the occasion/vibe/palette/layout we already chose.
  useEffect(() => {
    if (templateId && TEMPLATES_BY_ID[templateId] && stepIndex === 0) {
      setStepIndex(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // Every step change returns the host to the top — after a long Day
  // or Occasion step, Continue used to land mid-page with the new
  // step's heading above the viewport (the Reveal entrance played
  // off-screen).
  useEffect(() => {
    if (stepIndex === 0) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [stepIndex]);

  // Activation instrumentation (Pillar 20) — wizard funnel beacons:
  // one on entry, one per step, so step-level drop-off is measurable
  // (it lived only in localStorage before). Non-blocking + SSR-guarded.
  useEffect(() => { trackEvent('wizard_started'); }, []);
  useEffect(() => { trackEvent('wizard_step', { step }); }, [step]);

  // Enter advances the step (the Welcome flow's established house
  // pattern). Guards: only when the step's gate is satisfied, never
  // from a textarea (multiline input), never when a popover already
  // handled the key (the location autocomplete preventDefaults its
  // Enter), and never on Review — the press is a deliberate tap.
  const enterAdvanceRef = useRef<() => void>(() => {});
  useEffect(() => {
    enterAdvanceRef.current = () => {
      if (!canContinue || busy || step === 'Review') return;
      setStepIndex((i) => nextStepIndex(i));
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      enterAdvanceRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const canContinue = useMemo(() => {
    switch (step) {
      case 'Occasion':
        return !!st.occasion;
      case 'Basics':
        return nameModeIsValid(st.occasion, st.names);
      case 'Vibe':
        // Optional (GRAND-PLAN Phase 2). A host can advance with no
        // vibe chosen: generation falls back to the occasion's own
        // voice + look when vibeString is empty (applyWizardLook and
        // lookRecipesFor key off occasion, not vibes), so an empty
        // Vibe step still assembles a valid manifest.
        return true;
      case 'Palette':
        // Never a forced stop (GRAND-PLAN Phase 2). A palette is
        // always resolved — the occasion default (defaultPaletteIdFor,
        // stamped on occasion pick), the
        // "from your photos" extraction, or a smart/classic pick — so
        // Continue is always enabled and the host is never made to
        // click a tile they are happy to leave. Picking one still
        // auto-advances.
        return true;
      case 'Review':
        return nameModeIsValid(st.occasion, st.names) && !!st.occasion;
      default:
        return true;
    }
  }, [step, st]);

  function toggleVibe(id: string) {
    setSt((s) => ({ ...s, vibes: s.vibes.includes(id) ? s.vibes.filter((v) => v !== id) : [...s.vibes, id] }));
  }

  async function handleFinish() {
    trackEvent('wizard_weave_clicked', { occasion: stRef.current.occasion });
    setBusy(true);
    setErr(null);
    setGenStep('starting…');
    /* ── Make-ready choreography ─────────────────────────────
       The skeleton (no photos) and pre-warmed-cache paths finish
       in a couple of seconds — the generating screen flashed and
       the moment read as cheap after an eight-step investment.
       Each path now declares a MINIMUM press duration and (for
       the fast paths) a measured label script; the route to the
       editor waits for whichever finishes last: the real work or
       the performance. The AI path is barely affected — its real
       stream almost always outlasts the floor. */
    const pressStartedAt = Date.now();
    let minPressMs = 4500;
    const scriptTimers: Array<ReturnType<typeof setTimeout>> = [];
    const pressScript = (labels: string[], dwell = 1300): number => {
      labels.forEach((label, i) => {
        scriptTimers.push(setTimeout(() => setGenStep(label), i * dwell));
      });
      return labels.length * dwell;
    };
    try {
      // Belt-and-braces: solo / group occasions carry exactly one
      // name into generation + the saved manifest. Placeholders
      // are never written; a partner name typed under a previous
      // occasion pick is dropped here even if state restoration
      // skipped the Occasion step.
      const submitNames: [string, string] =
        nameModeFor(st.occasion).mode === 'couple'
          ? [st.names[0].trim(), st.names[1].trim()]
          : [st.names[0].trim(), ''];
      const derivedSubdomain =
        st.subdomain ||
        slugify(submitNames.filter(Boolean).join('-and-')) ||
        slugify(st.occasion) ||
        `event-${Date.now().toString(36)}`;

      // Wait out in-flight uploads instead of silently dropping
      // them. Tapping "Build my site" while photos were still
      // uploading used to send ZERO photos into the pipeline —
      // the wizard fell through to the instant skeleton path and
      // the host landed in the editor with none of their photos
      // (and, before applyWizardLook below, none of their look).
      const uploadWaitStart = Date.now();
      while (
        stRef.current.photos.some((p) => p.uploading) &&
        Date.now() - uploadWaitStart < 90_000
      ) {
        setGenStep('Threading your photos in…');
        await new Promise((r) => setTimeout(r, 400));
      }

      // Only photos that have a resolvable URL reach the pipeline.
      // Uploads that failed (or timed out above) are dropped here.
      const readyPhotos = stRef.current.photos.filter((p) => p.url && !p.uploading);
      const hasPhotos = readyPhotos.length > 0;

      let manifest: Record<string, unknown>;

      // ── One fast path for everyone (2026-06-12) ─────────────
      // The synchronous AI pipeline (vision tagging → Opus story
      // passes → grounding → critique → poetry → vibeSkin) made
      // the photo path take minutes while the no-photos skeleton
      // took a second. Photos are CONTENT now — cover + gallery,
      // stamped from the R2 URLs that uploaded during the Photos
      // step — not story inputs. Story drafting lives in the
      // editor, on demand, where the host can see and steer it.
      /* The First Pressing draft (below, before the POST) waits on
         Claude. When it's enabled, the press script ends on the
         voiced "story" stage and HOLDS there — the moment lingers on
         the stage that's actually waiting on Pear — then advances to
         "Pressing the proof…" once the draft resolves (or the budget
         aborts). When it's off, the script is byte-identical to
         before (the full array incl. "Pressing the proof…"). */
      const storyStageLabel =
        (getEventType(st.occasion)?.voice === 'solemn')
          ? 'Gathering your words…'
          : 'Setting your story in type…';
      minPressMs = FIRST_PRESSING_ENABLED
        ? pressScript([
            'Setting your names in type…',
            'Mixing the palette…',
            ...(hasPhotos ? ['Placing your photographs…'] : []),
            'Cutting the component kit…',
            'Laying out the sections…',
            storyStageLabel,
          ]) + 600
        : pressScript([
            'Setting your names in type…',
            'Mixing the palette…',
            ...(hasPhotos ? ['Placing your photographs…'] : []),
            'Cutting the component kit…',
            'Laying out the sections…',
            'Pressing the proof…',
          ]) + 600;
      const seedTagline = st.templateId ? TEMPLATES_BY_ID[st.templateId]?.tagline : generatedTagline || undefined;
      manifest = {
        occasion: st.occasion,
        themeFamily: 'v8',
        templateId: st.templateId,
        vibeString: st.vibes.join(', '),
        names: submitNames,
        logistics: {
          date: st.eventDate || undefined,
          venue: st.location || undefined,
          // The host almost always builds from the event's own zone;
          // stamping it anchors countdowns + date formatting for
          // guests in other zones (editable in the editor's Hero
          // panel). Venue coords ride along for hotel-suggest + maps.
          timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
          venueLat: st.venueLat,
          venueLng: st.venueLng,
        },
        chapters: [],
        layoutFormat: st.layout,
        // The full fact sheet rides the manifest so Pear's editor
        // drafting (story rewrite, FAQ answers, speeches) can use
        // every word the host gave the wizard.
        factSheet: {
          howWeMet: st.howWeMet,
          why: st.whyCelebrate,
          favorite: st.favoriteMemory,
          anchors: st.anchors,
          story: st.storyText,
        },
        eventDetails: {
          days: st.detailDays,
          livestreamUrl: st.detailLivestreamUrl,
          inMemoryOf: st.detailInMemoryOf,
          school: st.detailSchool,
        },
        ...(seedTagline ? { poetry: { heroTagline: seedTagline } } : {}),
      };

      // Stamp the host's picked palette on the legacy theme.colors
      // contract so surfaces that still read theme.colors (hero
      // atmosphere accent, hydration fallback) see the pick too.
      if (resolvedPaletteColors && resolvedPaletteColors.length >= 3) {
        manifest.theme = {
          colors: {
            background: resolvedPaletteColors[0] ?? '#F5EFE2',
            foreground: resolvedPaletteColors[3] ?? '#0E0D0B',
            accent: resolvedPaletteColors[1] ?? '#5C6B3F',
            accentLight: resolvedPaletteColors[2] ?? '#E0DDC9',
            muted: resolvedPaletteColors[4] ?? '#6F6557',
            cardBg: resolvedPaletteColors[0] ?? '#F5EFE2',
          },
        };
      }

      // Canonical look wiring — themeVars / texture / kit / density
      // / motif / layout variants. Without this the editor opens on
      // the default theme and every wizard pick evaporates.
      manifest = applyWizardLook(manifest as unknown as StoryManifest, {
        selectedPaletteColors: resolvedPaletteColors,
        layoutFormat: st.layout,
        occasion: st.occasion,
        motifKind: st.suggestedMotif,
        motifLayout: st.suggestedMotifLayout,
      }) as unknown as Record<string, unknown>;

      // Photos as content — the renderer reads manifest.coverPhoto
      // for the hero and manifest.galleryImages (+ index-keyed
      // galleryCaptions) for the gallery. URLs are already durable:
      // /api/photos/upload mirrored them to R2 during the Photos
      // step.
      if (hasPhotos) {
        manifest.coverPhoto = readyPhotos[0].url;
        manifest.galleryImages = readyPhotos.map((p) => p.url);
        const captions: Record<string, string> = {};
        readyPhotos.forEach((p, i) => {
          const c = p.caption?.trim();
          if (c) captions[String(i)] = c;
        });
        if (Object.keys(captions).length > 0) manifest.galleryCaptions = captions;
      }

      // Fold in any background-cooked decor (the cook only needs
      // occasion + palette, so it runs with or without photos).
      if (cookSig) {
        foldCookedDecorInto(manifest, readCookedDecor(cookSig));
      }

      // ── Section seeding — stamp "The Day" picks (always win) and
      //    derive the rest (FAQ answers, travel intro, RSVP deadline)
      //    where the manifest is still empty. Both paths get this so
      //    a host lands in the editor with sections READY, not
      //    placeholder copy. Fill-missing only — AI content survives.
      manifest = seedSectionsFromWizard(manifest as unknown as StoryManifest, {
        events: st.dayEvents,
        dressCode: st.dressCode,
        rsvpDeadline: st.rsvpDeadline,
        hotels: st.hotels,
        kidsPolicy: st.kidsPolicy,
        parkingNote: st.parkingNote,
        wantsCountdown: st.wantsCountdown,
        playlistUrl: st.playlistUrl,
        meals: st.meals,
        registryUrl: st.registryUrl,
        plusOnes: st.plusOnes,
        partyNames: st.partyNames,
        partyRole:
          st.occasion === 'quinceanera' ? 'Court of honor'
          : st.occasion === 'bar-mitzvah' || st.occasion === 'bat-mitzvah' ? 'Candle lighter'
          : 'Wedding party',
      }) as unknown as Record<string, unknown>;

      // ── Section picks (§3.3) — write an explicit blockOrder (which
      //    sections, in the canonical order), plus hiddenSections for
      //    any essential the host set aside and manifest.layouts for
      //    the variant each landed on. Runs AFTER seedSectionsFromWizard
      //    so mergeBlockOrder unions in the seed's content sections
      //    (countdown / music / honorList) — content always wins, no
      //    entered data is ever dropped. The STRUCTURE / fitting-room
      //    nav+hero picks below still layer on top of layouts.
      //
      //    Wave 1: there's no chooser UI yet, so st.sectionPicks is
      //    unset on every run — seed it silently to the occasion's
      //    essentials (empty layout picks: the fitting room owns
      //    nav/hero and the recommended variants surface in Wave 2).
      const sectionPicks = st.sectionPicks ?? {
        on: essentialSectionsFor(st.occasion, st.editionPick),
        layouts: {} as Record<string, string>,
      };
      manifest = applySectionPicks(
        manifest as unknown as StoryManifest,
        st.occasion,
        sectionPicks,
        st.editionPick,
      ) as unknown as Record<string, unknown>;

      // ── Vibe → look (2026-07-08) — the Vibe step finally DOES
      //    something: the picked vibes fill edition / kit / density /
      //    per-section layouts / display type axes wherever nothing
      //    has set them yet. Fill-missing, first vibe loudest. Runs
      //    after section picks (their layouts stay) and before the
      //    explicit stamps below (which overwrite freely) — so host
      //    picks beat vibes, and vibes beat occasion defaults.
      manifest = applyVibeLook(
        manifest as unknown as StoryManifest,
        st.vibes,
      ) as unknown as Record<string, unknown>;

      // ── Explicit STRUCTURE picks — siteMode + kit + per-section
      //    layout variants, exactly the fields the editor's Layout
      //    tab, Theme panel, and SiteModeSection write. Unset =
      //    Pear decides (recipe / edition defaults ride). The kit
      //    stamp lands AFTER the look-recipe stamp below would —
      //    order here is before it, so re-stamp at the end too.
      if (st.siteMode) manifest.siteMode = st.siteMode;
      if (st.editionPick) manifest.edition = st.editionPick;
      if (st.navVariant || st.navMobileVariant || st.heroVariant) {
        manifest.layouts = {
          ...((manifest.layouts as Record<string, string> | undefined) ?? {}),
          ...(st.navVariant ? { nav: st.navVariant } : {}),
          ...(st.navMobileVariant ? { navMobile: st.navMobileVariant } : {}),
          ...(st.heroVariant ? { hero: st.heroVariant } : {}),
        };
      }

      // ── Look: applyWizardLook already stamped Pear's occasion
      //    defaults (the 'match' recipe the pressing previews).
      //    Explicit kit / texture / motif / density picks from the
      //    fitting room beat them — the host saw those live. (The
      //    old lookRecipeId card-picker died inside the dead-coded
      //    Layout branch and was removed 2026-07-01; the fitting
      //    room is its successor.)
      if (st.kitId) manifest.kitId = st.kitId;
      if (st.texture) manifest.texture = st.texture;
      if (st.motifLayoutPick) manifest.motifLayout = st.motifLayoutPick;
      if (st.densityPick) manifest.density = st.densityPick;

      // ── THE FIRST PRESSING ──────────────────────────────────
      //    One lean Sonnet call drafts real per-section copy (story,
      //    hero line, voiced FAQ answers, schedule blurbs, details
      //    sublines, registry intro) from the seeded manifest +
      //    fact-sheet + occasion voice, then mergeDraft folds it in
      //    FILL-ONLY (never clobbers host/Day-step content). Blocking
      //    merge-before-POST so the editor opens on a living draft and
      //    the FirstPressing reveal parts on real content.
      //
      //    STRICTLY ADDITIVE: draftFirstPressing is hard-capped
      //    (~9s AbortController ceiling) and resolves to {} on ANY
      //    failure/timeout/unconfigured/gated → mergeDraft is a no-op
      //    → the seeded manifest ships exactly as today. The press
      //    floor already covers the perceived time; the moment holds
      //    on the "story" stage while the draft is in flight.
      if (FIRST_PRESSING_ENABLED) {
        try {
          setGenStep(storyStageLabel);
          const drafted = await draftFirstPressing(manifest as unknown as StoryManifest, { budgetMs: 9000 });
          manifest = mergeDraft(manifest as unknown as StoryManifest, drafted) as unknown as Record<string, unknown>;
        } catch {
          /* Any throw falls through with the seeded manifest — the
             site always generates. */
        }
        // The stage that was waiting on Pear is done — press the proof.
        setGenStep('Pressing the proof…');
        // Guarantee the press beat is visible even if the draft ran
        // long (the end-of-run `remaining` wait enforces this floor).
        minPressMs = Math.max(minPressMs, (Date.now() - pressStartedAt) + 700);
      }

      // `create: true` — the server guarantees a FREE slug. If the
      // derived one (typed, or names-fallback) is already taken — by
      // anyone, including this host's own earlier site — the server
      // picks the next available variant and returns it. Without
      // this, a second site with the same names landed on the same
      // slug and silently overwrote the first.
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: derivedSubdomain, manifest, names: submitNames, create: true }),
      });
      const resData = await res.json().catch(() => null);
      // ── Logged-out finish line ──────────────────────────────
      // A host who filled every step while signed out used to hit a
      // raw "Failed to create site (401)" dead-end after nine steps.
      // Instead: stop the press choreography, flush their answers to
      // the SAME localStorage draft the wizard already mirrors and
      // restores on mount (photos stripped, exactly like the debounced
      // persister below), then send them to sign up with a return
      // path. They come back to /wizard/new and the mount-time restore
      // resumes them where they left off — no error, nothing lost.
      if (res.status === 401) {
        scriptTimers.forEach(clearTimeout);
        if (typeof window !== 'undefined') {
          try {
            const { photos: _photos, ...persisted } = stRef.current;
            void _photos;
            // pendingPress: the host DID press the seal — honor the
            // click the moment they return signed-in (resume-press
            // effect below the restore).
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...persisted, pendingPress: true }));
            // The claim card — the signup page carries the pressed
            // site through the gate (name, date, palette) so the
            // account wall never reads as "your work is gone."
            const cur = stRef.current;
            const claimNames = cur.names.filter((n) => n.trim());
            const claimTitle = claimNames.length
              ? claimNames.join(nameModeFor(cur.occasion).mode === 'couple' ? ' & ' : ', ')
              : '';
            window.localStorage.setItem('pl-wizard-claim', JSON.stringify({
              eyebrow: previewFrameFor(cur.occasion).eyebrow,
              title: claimTitle,
              occasion: cur.occasion,
              date: cur.eventDate,
              location: cur.location,
              colors: (cur.paletteColors && cur.paletteColors.length > 0
                ? cur.paletteColors
                : PALETTES.find((p) => p.id === cur.palette)?.colors ?? []).slice(0, 4),
              ts: Date.now(),
            }));
          } catch {}
        }
        trackEvent('wizard_claim_handoff', { occasion: stRef.current.occasion });
        router.push('/signup?next=/wizard/new');
        return;
      }
      if (!res.ok) {
        throw new Error(resData?.error ?? `Failed to create site (${res.status})`);
      }
      const finalSubdomain: string =
        (typeof resData?.subdomain === 'string' && resData.subdomain) || derivedSubdomain;

      // ── The weaving-in — the answers that connect this site to
      //    PEOPLE fire now, while the press choreography plays.
      //    All fire-and-forget: none of these may block or fail
      //    the site the host just built.
      void (async () => {
        // 1. Co-host invite — the partner can edit from minute one.
        const coHost = (st.coHostEmail ?? '').trim();
        if (coHost && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coHost)) {
          fetch('/api/co-host/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteSlug: finalSubdomain, email: coHost }),
          }).catch(() => { /* invite is re-sendable from Settings */ });
        }

        // 2. Celebration linkage — when this run came from the
        //    sibling-event card, both sites join one celebration so
        //    the LinkedEventsStrip lights up on each.
        if (st.linkFromSlug) {
          const celebId = st.linkCelebId || crypto.randomUUID();
          const celebName = (st.linkCelebName || submitNames.filter(Boolean).join(' & ') || 'Our celebration').slice(0, 80);
          const link = (slug: string) =>
            fetch('/api/celebrations', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ siteId: slug, celebration: { id: celebId, name: celebName } }),
            }).catch(() => { /* linkable later from /dashboard/connections */ });
          void link(finalSubdomain);
          // Only stamp the origin when it wasn't already in a
          // celebration — never rename one that exists.
          if (!st.linkCelebId) void link(st.linkFromSlug);
        }

        // 3. The honor list is also the first guest list — the
        //    people standing beside them are obviously invited.
        const party = (st.partyNames ?? []).map((n) => n.trim()).filter(Boolean).slice(0, 12);
        for (const name of party) {
          try {
            await fetch('/api/guests', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ siteSlug: finalSubdomain, name }),
            });
          } catch { /* the roster is editable in Guests */ }
        }
      })();

      // Invalidate the shared sites cache so the dashboard renders
      // this freshly-created site the next time the user lands on it.
      try {
        const { invalidateSitesCache } = await import('@/components/marketing/design/dash/hooks');
        invalidateSitesCache();
      } catch {}
      // Clear persisted wizard state — user has their site, no reason
      // to keep the draft. Prevents the wizard from showing yesterday's
      // answers if the user starts a second site later.
      if (typeof window !== 'undefined') {
        try { window.localStorage.removeItem(STORAGE_KEY); window.localStorage.removeItem('pl-wizard-claim'); } catch {}
        // Arm the First Pressing — the editor plays the reveal
        // sequence exactly once for this freshly-woven site.
        try {
          const { armFirstPressing } = await import('@/components/pearloom/redesign/FirstPressing');
          armFirstPressing(finalSubdomain);
        } catch {}
      }
      /* Hold the curtain until the press has had its minimum run —
         whichever finished last, the work or the performance. */
      const remaining = minPressMs - (Date.now() - pressStartedAt);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      router.push(`/editor/${finalSubdomain}`);
    } catch (e) {
      // A failed run must not keep narrating the script over the
      // error state.
      scriptTimers.forEach(clearTimeout);
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  /* DYE THE LOOM — the moment a palette exists, the wizard chrome
     itself takes the dye: two soft radial washes in the host's own
     colors bloom behind the canvas (700ms, honours the cream
     ground). The product wears your choice before the site does. */
  const dye = resolvedPaletteColors;
  /* The look the room wears: Pear's occasion-matched recipe — the
     same construction the pressing previews and the finished site
     opens with. (This underlay was written for the old look-card
     picker's hover; the picker died inside the removed dead-coded
     Layout branch, but the moment itself is worth keeping — the
     product wears the site's paper before the site does.) Only on
     the late steps; earlier steps keep the plain cream. */
  const roomLook = (step === 'Palette' || step === 'Review')
    ? lookRecipesFor(st.occasion).find((r) => r.id === 'match') ?? null
    : null;
  return (
    <div className="pl8" style={{ minHeight: '100vh', background: 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
      {/* THE ROOM WEARS THE LOOK — hovering a look card at the end
          dresses the entire wizard in that look's paper grain (the
          same [data-pl-texture] ::before the published site uses).
          The grain multiplies onto this layer's own theme-correct
          cream (the texture system isolates its blend), so light
          mode gains warm tooth and dark mode keeps its midnight.
          Painted BENEATH the dye washes so the palette stays vivid
          on top of the paper. */}
      <div
        aria-hidden
        className="pl8-guest"
        data-pl-texture={roomLook?.texture ?? 'paper'}
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          ['--pl-texture-intensity' as string]: String((roomLook?.textureIntensity ?? 1) * 1.2),
          opacity: roomLook ? 0.55 : 0,
          transition: 'opacity 600ms var(--pl-ease-out, ease-out)',
          background: 'var(--cream, #F5EFE2)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          opacity: dye && st.palette ? 1 : 0,
          transition: 'opacity 700ms var(--pl-ease-out, ease-out), background 700ms var(--pl-ease-out, ease-out)',
          background: dye
            ? `radial-gradient(560px 420px at 12% 8%, ${dye[1]}1f, transparent 70%), radial-gradient(640px 480px at 88% 92%, ${dye[2]}33, transparent 70%)`
            : 'none',
        }}
      />
      {/* Wizard mobile rules — scoped to wizard classnames.
          pearloom.css owns the ≤960px header wrap, but the progress
          strip's inline flex:1 (flex-basis: 0) meant it always fit
          on row 1 and got crushed between the logo + actions —
          basis 100% below makes the intended own-row wrap actually
          happen. ≤640px condenses further for a 390px canvas:
          glyph-only wordmark, no decorative sprigs, stacked grids. */}
      <style jsx global>{`
        @keyframes pl8-wiz-thread {
          to { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pl8-wizard-canvas svg path { animation: none !important; stroke-dashoffset: 0 !important; }
        }
        @keyframes wizard-skeleton-pulse {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 0.85; }
        }
        @media (max-width: 960px) {
          .pl8-wizard-header .pl8-wizard-progress {
            flex: 1 1 100% !important;
            max-width: none !important;
          }
        }
        @media (max-width: 640px) {
          .pl8-wizard-header {
            padding: 10px 14px !important;
          }
          /* Glyph-only wordmark — the "Pearloom" text + trailing gold
             spark crowd the Save draft / Exit buttons at 390px. */
          .pl8-wizard-header .logo > span {
            display: none !important;
          }
          .pl8-wizard-canvas {
            /* Bottom clearance for the floating cook pill + iOS
               Safari's toolbar so the step's nav buttons never sit
               behind either. */
            padding: 28px 18px calc(110px + env(safe-area-inset-bottom, 0px)) !important;
          }
          /* Decorative margin sprigs/sparkle crowd a phone canvas. */
          .pl8-wizard-atmosphere {
            display: none !important;
          }
          /* Upload-source cards stack one-up. */
          .pl8-photo-sources {
            grid-template-columns: 1fr !important;
          }
          /* Context strip: 2×2 grid instead of four crushed chips. */
          .pl8-context-chips {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
      {/* Botanical atmosphere — replaces the older Blob/Squiggle
          underlay with the prototype's subtle Sprig + flower glyphs.
          Reads as paper-grain garden, not AI-startup gradient mesh. */}
      <div
        aria-hidden
        className="pl8-wizard-atmosphere"
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, color: 'var(--sage, #5C6B3F)' }}
      >
        <div style={{ position: 'absolute', top: 90, left: -20, opacity: 0.10, transform: 'rotate(-12deg)' }}>
          <AmbientSprig size={220} color="var(--sage-deep, #5C6B3F)" />
        </div>
        <div style={{ position: 'absolute', bottom: 40, right: -30, opacity: 0.09, transform: 'rotate(8deg) scaleX(-1)' }}>
          <AmbientSprig size={260} color="var(--sage-deep, #5C6B3F)" />
        </div>
        <div style={{ position: 'absolute', top: '44%', right: '32%', opacity: 0.18 }}>
          <Sparkle size={28} color="var(--gold, #C19A4B)" />
        </div>
      </div>

      {/* Background cook indicator — surfaces "Pear is preparing
          things" while the speculative decor + warm-up runs in
          parallel to the wizard. Skipped on step 0 (occasion) so
          there's nothing to support yet. */}
      {stepIndex > 0 && <BackgroundCookPill cooking={cookStatus.cooking} ready={cookStatus.decorReady} />}

      {/* The preview peek (PERSONA-PLAN S6, F10) — under 960px the
          live preview aside is hidden, so phones built blind until
          Review. A floating glass pill opens the same preview in a
          bottom sheet: one tap in, one tap out. Hidden on Review
          (the proof IS the preview there) and while pressing. */}
      {stepIndex > 0 && step !== 'Review' && !busy && (
        <button
          type="button"
          className="pl8-preview-peek pl-glass-surface"
          onClick={() => setPeekOpen(true)}
          style={{
            position: 'fixed',
            right: 14,
            bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            zIndex: 60,
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--ink)',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Icon name="eye" size={14} /> See it so far
        </button>
      )}
      {peekOpen && (
        <div
          className="pl8-preview-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Your site so far"
          style={{ position: 'fixed', inset: 0, zIndex: 120 }}
          onClick={() => setPeekOpen(false)}
        >
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(20,17,10,0.44)' }} />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: 0, right: 0, bottom: 0,
              maxHeight: '88vh',
              overflowY: 'auto',
              background: 'var(--cream, #FDFAF0)',
              borderRadius: '20px 20px 0 0',
              padding: '10px 16px calc(20px + env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 -24px 60px -30px rgba(30,25,12,0.5)',
            }}
          >
            <div aria-hidden style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--line)', margin: '4px auto 10px' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPeekOpen(false)}
                aria-label="Close the preview"
                style={{
                  border: '1px solid var(--line)', background: 'var(--card)', borderRadius: 999,
                  padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Done
              </button>
            </div>
            <WizardLivePreview st={st} />
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className="pl8-wizard-header"
        style={{
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          // Theme-aware glass — the platform recipe (globals.css
          // --pl-glass tokens, [data-theme]-paired).
          background: 'var(--pl-glass)',
        backgroundImage: 'var(--pl-glass-sheen)',
          backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          borderBottom: '1px solid var(--line-soft)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Link href="/">
          <PearloomLogo />
        </Link>
        <PhaseHeader
          active={stepIndex}
          hiddenSteps={st.templateId ? ['Vibe', 'Palette'] : []}
        />
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center', flexShrink: 0 }}>
          <Link
            href="/dashboard"
            title="Your progress saves itself — this thread will be waiting on your dashboard."
            style={{
              padding: '7px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 999,
              background: 'transparent',
              border: '1px solid var(--line-soft)',
              color: 'var(--ink-soft)',
              textDecoration: 'none',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Save draft
          </Link>
          <Link
            href="/dashboard"
            style={{
              padding: '7px 10px',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--ink-muted)',
              textDecoration: 'none',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Exit
          </Link>
        </div>
      </header>

      <div
        className={`pl8-wizard-canvas${showPreview ? ' is-look' : ''}`}
        style={{
          // Single-column letterpress feel; on the Look + Review steps
          // it becomes a two-column layout with the live save-the-date
          // preview beside the controls (collapses to one column on mobile).
          // Review is the inverted stage — the proof wants real width.
          maxWidth: showPreview ? 1200 : step === 'Review' ? 1100 : 760,
          margin: '0 auto',
          padding: '40px 32px 80px',
          position: 'relative',
          zIndex: 2,
          ...(showPreview
            ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 48, alignItems: 'start' }
            : {}),
        }}
      >
        <div>
          {/* Active-template banner — shown whenever a template is
              selected, so the user always knows which design drives
              their site and can swap it without digging through
              the wizard back-buttons. */}
          {st.templateId && TEMPLATES_BY_ID[st.templateId] && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 'var(--r, 12px)',
                background: 'var(--sage-tint, #EDEFE1)',
                border: '1px solid var(--line-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
              }}
            >
              <Sparkle size={12} color="var(--gold)" />
              <span style={{ color: 'var(--ink-soft)' }}>
                Using template
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display, Fraunces, serif)',
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                  fontSize: 16,
                }}
              >
                {TEMPLATES_BY_ID[st.templateId].name}
              </span>
              <div style={{ flex: 1 }} />
              <Link
                href="/templates"
                style={{
                  fontSize: 12,
                  color: 'var(--ink-soft)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Change template
              </Link>
              <button
                type="button"
                onClick={async () => {
                  const ok = await dialog.confirm({
                    title: 'Start from scratch?',
                    message: "Keeps everything you've typed but drops the template’s palette + layout.",
                    confirmLabel: 'Drop the template',
                    cancelLabel: 'Keep the template',
                  });
                  if (ok) setSt((s) => ({ ...s, templateId: undefined }));
                }}
                style={{
                  fontSize: 12,
                  color: 'var(--ink-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Start blank
              </button>
            </div>
          )}

          {stepIndex > 0 && (
            <div style={{ marginBottom: 16 }}>
              <WizardMomentCard
                occasion={st.occasion}
                names={st.names}
                eventDate={st.eventDate}
                location={st.location}
              />
            </div>
          )}

          <Reveal y={14} key={step}>
            {/* The shuttle pass — a two-strand thread draws across
                as each step arrives (BRAND.md: things thread in,
                they don't fade in). */}
            <svg width="148" height="8" viewBox="0 0 148 8" aria-hidden style={{ display: 'block', marginBottom: 18 }}>
              <path d="M2 5 C 30 1, 60 7, 88 4 S 132 3, 146 4" fill="none" stroke="var(--sage-deep, #5C6B3F)" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" strokeDasharray="180" strokeDashoffset="180" style={{ animation: 'pl8-wiz-thread 720ms var(--pl-ease-out, ease-out) forwards' }} />
              <path d="M2 4 C 30 0, 60 6, 88 3 S 132 2, 146 3" fill="none" stroke="var(--pl-gold, #C19A4B)" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="180" strokeDashoffset="180" style={{ animation: 'pl8-wiz-thread 720ms var(--pl-ease-out, ease-out) 90ms forwards' }} />
            </svg>
            <div
              style={{
                position: 'relative',
                // Letterpress page feel — open paper, no card frame
                // competing with the question. Each step is its own
                // breath; the PhaseHeader carries the step name.
                padding: '8px 0 0',
              }}
            >
              {/* Pear's running commentary — a quiet italic line in Pear's
                  voice with the iridescent pearl (design system v2),
                  replacing the pill chip. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
                <Pearl size={11} iridescent />
                <span
                  className="display-italic"
                  style={{ fontSize: 14.5, color: 'var(--pl-olive, #5C6B3F)', lineHeight: 1.4 }}
                >
                  {stepTipFor(step, st, firstName)}
                </span>
              </div>

              {step === 'Occasion' && (
                <OccasionPicker
                  selected={st.occasion}
                  intentOccasion={intentOccasion}
                  onPick={(id) => {
                    // Solo / group occasions hide the second name
                    // field — clear any partner name typed under a
                    // previous occasion so it can't silently ride
                    // along into generation ("random names don't
                    // populate").
                    const keepSecond = nameModeFor(id).mode === 'couple';
                    // Voice-aware chip sets differ per occasion —
                    // drop any selected vibe the new occasion doesn't
                    // offer ('Romantic' can't ride from a wedding
                    // pick into a memorial). Template vibes are free
                    // strings outside the chip catalog and the Vibe
                    // step is hidden for templates, so leave those.
                    const allowedVibes = new Set(vibesForOccasion(id).map((v) => v.id));
                    setSt((s) => ({
                      ...s,
                      occasion: id,
                      names: keepSecond ? s.names : [s.names[0], ''],
                      vibes: s.templateId ? s.vibes : s.vibes.filter((v) => allowedVibes.has(v)),
                      // The section set is occasion-derived — a new
                      // occasion invalidates any picks made under the
                      // old one, so the chooser re-seeds from scratch.
                      sectionPicks: undefined,
                      // Untouched palette follows the occasion's own
                      // default (paletteColors set = an explicit pick
                      // — smart, photo, or classic — never moved).
                      palette: s.paletteColors ? s.palette : defaultPaletteIdFor(PALETTES, id),
                    }));
                    autoAdvance();
                  }}
                />
              )}

              {step === 'Basics' && (() => {
                const nameSpec = nameModeFor(st.occasion);
                const remembering = st.occasion === 'memorial' || st.occasion === 'funeral';
                return (
                <>
                  <StepEyebrow step="Basics" hiddenSteps={hiddenSteps} />
                  <h2 className="display pl-type-press" style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', margin: '0 0 10px', lineHeight: 1.03, textShadow: letterpressShadow('var(--paper, #FDFAF0)', 'var(--ink, #0E0D0B)') }}>
                    {nameSpec.mode === 'solo' ? (
                      remembering ? (
                        <>Who are we <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>remembering?</span></>
                      ) : (
                        <>Who are we <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>celebrating?</span></>
                      )
                    ) : (
                      <>Who, when, and <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>where.</span></>
                    )}
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    Just the bones — you can make anything optional later.
                  </p>
                  <div
                    className="pl8-basics-grid"
                    style={{
                      display: 'grid',
                      // Solo and group modes get a single-column name row;
                      // couple modes use the two-up layout.
                      gridTemplateColumns: nameSpec.mode === 'couple' ? '1fr 1fr' : '1fr',
                      gap: 16,
                    }}
                  >
                    <div style={{ gridColumn: nameSpec.mode === 'couple' ? 'auto' : 'span 1' }}>
                      <CheckLabel done={!!st.names[0].trim()}>{nameSpec.primaryLabel}</CheckLabel>
                      <input
                        className="input"
                        value={st.names[0]}
                        onChange={(e) => setSt((s) => ({ ...s, names: [e.target.value, s.names[1]] }))}
                        placeholder={nameSpec.primaryPlaceholder}
                        // autoComplete="name" lets iOS / Android offer the
                        // device contact name + Chrome / Safari autofill it
                        // for returning hosts. Skipping this means hosts
                        // type their own name from scratch on every wizard
                        // run, which is the most boring possible friction.
                        autoComplete="given-name"
                      />
                    </div>
                    {nameSpec.mode === 'couple' && (
                      <div>
                        <CheckLabel done={!!st.names[1].trim()}>{nameSpec.secondaryLabel ?? 'Second name'}</CheckLabel>
                        <input
                          className="input"
                          value={st.names[1]}
                          onChange={(e) => setSt((s) => ({ ...s, names: [s.names[0], e.target.value] }))}
                          placeholder={nameSpec.secondaryPlaceholder ?? ''}
                          autoComplete="off"
                        />
                      </div>
                    )}
                    {nameSpec.hint && (
                      <div
                        style={{
                          gridColumn: nameSpec.mode === 'couple' ? 'span 2' : 'auto',
                          fontSize: 12,
                          color: 'var(--ink-muted)',
                          marginTop: -6,
                          fontStyle: 'italic',
                        }}
                      >
                        {nameSpec.hint}
                      </div>
                    )}
                    <div>
                      <CheckLabel done={!!st.eventDate}>Date</CheckLabel>
                      <WizardDatePicker
                        value={st.eventDate}
                        onChange={(iso) => setSt((s) => ({ ...s, eventDate: iso }))}
                        placeholder="Pick a date"
                      />
                    </div>
                    <div>
                      <CheckLabel done={!!st.location}>Location</CheckLabel>
                      <WizardLocationAutocomplete
                        value={st.location}
                        onChange={(v) => setSt((s) => ({ ...s, location: v }))}
                        onSelect={(place) =>
                          setSt((s) => ({
                            ...s,
                            location: place.name ? `${place.name}${place.address ? ` · ${place.address}` : ''}` : place.address,
                            venueLat: place.lat,
                            venueLng: place.lng,
                          }))
                        }
                        placeholder="Madison Square Garden · New York"
                      />
                    </div>
                    <div style={{ gridColumn: nameSpec.mode === 'couple' ? 'span 2' : 'span 1' }}>
                      <CheckLabel done={!!st.subdomain.trim()}>Site link (optional)</CheckLabel>
                      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0 14px',
                            border: '1.5px solid var(--line)',
                            borderRight: 0,
                            borderTopLeftRadius: 'var(--r)',
                            borderBottomLeftRadius: 'var(--r)',
                            color: 'var(--ink-muted)',
                            fontSize: 13,
                            background: 'var(--cream-2)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          pearloom.com/{normalizeOccasion(st.occasion || 'wedding')}/
                        </div>
                        <input
                          className="input"
                          value={st.subdomain}
                          onChange={(e) => setSt((s) => ({ ...s, subdomain: slugify(e.target.value) }))}
                          placeholder={
                            nameSpec.mode === 'couple'
                              ? 'alex-and-jamie'
                              : nameSpec.mode === 'solo'
                              ? slugify(nameSpec.primaryPlaceholder) || 'eleanor'
                              : 'our-gathering'
                          }
                          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, flex: 1, minWidth: 160 }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 6 }}>
                        We&apos;ll derive this from your names if you leave it empty —
                        and if a link is already taken, we&apos;ll use the next available one.
                      </div>
                    </div>
                  </div>

                  {/* THE PRESS — the names set themselves in letterpress
                      as the host types, like type locked into a chase.
                      First taste of "this is being made FOR me". */}
                  {st.names[0].trim() && (
                    <div aria-hidden style={{ marginTop: 30, textAlign: 'center', overflow: 'hidden' }}>
                      <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9.5, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--pl-gold, #B8935A)', marginBottom: 8 }}>
                        Setting the type
                      </div>
                      <div
                        className="display pl-letterpress"
                        style={{ fontSize: 'clamp(34px, 7vw, 54px)', lineHeight: 1.02, color: 'var(--ink)', letterSpacing: '-0.02em', transition: 'opacity 280ms var(--pl-ease-out, ease-out)' }}
                      >
                        {st.names[0].trim()}
                        {nameSpec.mode === 'couple' && st.names[1].trim() && (
                          <>
                            {' '}
                            <span className="display-italic" style={{ fontSize: '0.72em', color: 'var(--ink-soft)' }}>and</span>{' '}
                            {st.names[1].trim()}
                          </>
                        )}
                      </div>
                      <svg width="148" height="6" viewBox="0 0 148 6" aria-hidden style={{ display: 'block', margin: '12px auto 0', opacity: 0.6 }}>
                        <path d="M2 3 C 40 1, 100 5, 146 3" fill="none" stroke="var(--pl-gold, #C19A4B)" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </>
                );
              })()}

              {step === 'Details' && (() => {
                const e = getEventType(st.occasion as never);
                const preset = e?.rsvpPreset ?? 'wedding';
                const isMemorial = preset === 'memorial';
                const isBachelor = preset === 'bachelor';
                const isReunion = preset === 'reunion';
                const isGrad = st.occasion === 'graduation';
                // Per-occasion question copy — labels + placeholders
                // tailored to the specific event (birthday no longer
                // asks "how did you meet in 2018").
                const q = questionsFor(st.occasion);
                return (
                  <>
                    <StepEyebrow step="Details" hiddenSteps={hiddenSteps} />
                    <h2 className="display pl-type-press" style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', margin: '0 0 10px', lineHeight: 1.03, textShadow: letterpressShadow('var(--paper, #FDFAF0)', 'var(--ink, #0E0D0B)') }}>
                      Tell me <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>about it.</span>
                    </h2>
                    <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                      Like you&rsquo;d tell a friend — how it started, who&rsquo;s coming, the detail that makes it
                      yours. Pear listens for the specifics and weaves them into the site itself.
                    </p>

                    <StoryListen st={st} setSt={setSt} />

                    <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
                      {/* One-by-one fallback — the old three prompts, tucked
                          away. Their answers still ride the factSheet. */}
                      <details>
                        <summary style={{ fontSize: 12.5, color: 'var(--ink-muted)', cursor: 'pointer' }}>
                          Prefer to answer one question at a time?
                        </summary>
                        <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
                          <div>
                            <label className="field-label">{q.q1Label}</label>
                            <textarea
                              className="input"
                              rows={2}
                              value={st.howWeMet ?? ''}
                              onChange={(ev) => setSt((s) => ({ ...s, howWeMet: ev.target.value }))}
                              placeholder={q.q1Placeholder}
                            />
                          </div>
                          <div>
                            <label className="field-label">{q.q2Label}</label>
                            <textarea
                              className="input"
                              rows={2}
                              value={st.whyCelebrate ?? ''}
                              onChange={(ev) => setSt((s) => ({ ...s, whyCelebrate: ev.target.value }))}
                              placeholder={q.q2Placeholder}
                            />
                          </div>
                          <div>
                            <label className="field-label">{q.q3Label}</label>
                            <textarea
                              className="input"
                              rows={2}
                              value={st.favoriteMemory ?? ''}
                              onChange={(ev) => setSt((s) => ({ ...s, favoriteMemory: ev.target.value }))}
                              placeholder={q.q3Placeholder}
                            />
                          </div>
                        </div>
                      </details>

                      {/* Occasion-specific fields */}
                      {isBachelor && (
                        <div>
                          <label className="field-label">How many days is this trip?</label>
                          <NumberInput
                            value={st.detailDays ?? 3}
                            onChange={(n) => setSt((s) => ({ ...s, detailDays: n }))}
                            min={1}
                            max={14}
                            unit="days"
                            width={140}
                            ariaLabel="Trip duration in days"
                          />
                        </div>
                      )}

                      {isReunion && (
                        <div>
                          <label className="field-label">The connection</label>
                          <input
                            className="input"
                            value={st.detailSchool ?? ''}
                            onChange={(ev) => setSt((s) => ({ ...s, detailSchool: ev.target.value }))}
                            placeholder="Jefferson High, class of 2005 · or · The Hernandez cousins"
                          />
                        </div>
                      )}

                      {isMemorial && (
                        <>
                          <div>
                            <label className="field-label">In memory of</label>
                            <input
                              className="input"
                              value={st.detailInMemoryOf ?? ''}
                              onChange={(ev) => setSt((s) => ({ ...s, detailInMemoryOf: ev.target.value }))}
                              placeholder="Eleanor Rose Thompson (1948–2026)"
                            />
                          </div>
                          <div>
                            <label className="field-label">Livestream link (optional)</label>
                            <input
                              className="input"
                              value={st.detailLivestreamUrl ?? ''}
                              onChange={(ev) => setSt((s) => ({ ...s, detailLivestreamUrl: ev.target.value }))}
                              placeholder="https://…"
                            />
                          </div>
                        </>
                      )}

                      {isGrad && (
                        <div>
                          <label className="field-label">School</label>
                          <input
                            className="input"
                            value={st.detailSchool ?? ''}
                            onChange={(ev) => setSt((s) => ({ ...s, detailSchool: ev.target.value }))}
                            placeholder="Portland State University · BS, Computer Science"
                          />
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {step === 'Day' && (() => {
                const moments = scheduleEventSuggestions(st.occasion).options;
                const picked = st.dayEvents ?? [];
                const has = (n: string) => picked.some((e) => e.name === n);
                const toggle = (n: string) => setSt((s) => {
                  const cur = s.dayEvents ?? [];
                  if (cur.some((e) => e.name === n)) return { ...s, dayEvents: cur.filter((e) => e.name !== n) };
                  const next = [...cur, { name: n, time: typicalTimeFor(n) ?? '5:00 pm' }];
                  next.sort((a, b) => Date.parse(`2000-01-01 ${a.time}`) - Date.parse(`2000-01-01 ${b.time}`));
                  return { ...s, dayEvents: next };
                });
                const setTime = (n: string, time: string) => setSt((s) => {
                  const next = (s.dayEvents ?? []).map((e) => (e.name === n ? { ...e, time } : e));
                  next.sort((a, b) => Date.parse(`2000-01-01 ${a.time}`) - Date.parse(`2000-01-01 ${b.time}`));
                  return { ...s, dayEvents: next };
                });
                const dresses = dressCodeSuggestions(st.occasion).options;
                const suggestedDl = suggestRsvpDeadline(st.eventDate || undefined);
                return (
                  <>
                    <StepEyebrow step="Day" hiddenSteps={hiddenSteps} />
                    <h2 className="display pl-type-press" style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', margin: '0 0 10px', lineHeight: 1.03, textShadow: letterpressShadow('var(--paper, #FDFAF0)', 'var(--ink, #0E0D0B)') }}>
                      Sketch <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>the day.</span>
                    </h2>
                    <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                      Three taps builds your schedule — times are typical, nudge them in the editor.
                      Skip anything you haven’t decided.
                    </p>

                    <div style={sketchEyebrow}>
                      <span aria-hidden style={{ color: 'var(--pl-gold, #C19A4B)' }}>✦</span> Moments
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
                      {moments.map((m) => {
                        const on = has(m);
                        const t = picked.find((e) => e.name === m)?.time ?? '5:00 pm';
                        /* ONE wrapper for both states — the chip used
                           to swap from <button> to <span> on select,
                           a full DOM replacement that made the ink
                           fill + time segment blink in. Now the fill
                           eases and only the time segment mounts. */
                        return (
                          <span key={m} style={{
                            display: 'inline-flex', alignItems: 'stretch', borderRadius: 999, overflow: 'hidden',
                            border: `1.5px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                            background: on ? 'var(--ink)' : 'var(--card)',
                            color: on ? 'var(--cream)' : 'var(--ink-soft)',
                            transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
                          }}>
                            <button type="button" onClick={() => toggle(m)} aria-pressed={on}
                              style={{
                                padding: on ? '8px 8px 8px 14px' : '8px 14px', border: 'none', background: 'transparent',
                                color: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                              }}>
                              {m}
                            </button>
                            {on && (
                              <span className="pl8-content-fade-in" style={{ display: 'inline-flex', alignItems: 'stretch' }}>
                                <WizardTimePicker value={t} onChange={(nt) => setTime(m, nt)} label={m} />
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                    {picked.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 18 }}>
                        {picked.length} {picked.length === 1 ? 'moment' : 'moments'} — tap a time to change it. They’ll arrive in your Schedule section, in order.
                      </div>
                    )}

                    <div style={{ ...sketchEyebrow, marginTop: 14 }}>
                      <span aria-hidden style={{ color: 'var(--pl-gold, #C19A4B)' }}>✦</span> Dress code
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 6 }}>
                      {dresses.map((d) => {
                        const on = st.dressCode === d;
                        return (
                          <button key={d} type="button" onClick={() => setSt((s) => ({ ...s, dressCode: on ? undefined : d }))} aria-pressed={on}
                            className="wz-chip"
                            style={{
                              padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                              border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                              background: on ? 'var(--ink)' : 'var(--card)',
                              color: on ? 'var(--cream)' : 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                            <span>{d}</span>
                          </button>
                        );
                      })}
                    </div>

                    <GuestsWillAsk st={st} setSt={setSt} />

                    <TheExtras st={st} setSt={setSt} />

                    {suggestedDl && (
                      <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 12, background: 'var(--cream-2)', border: '1px solid var(--line-soft)', fontSize: 13, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span>
                          RSVP deadline: <b style={{ color: 'var(--ink)' }}>{st.rsvpDeadline ?? suggestedDl}</b>
                          {!st.rsvpDeadline && ' (five weeks out — our suggestion)'}
                        </span>
                        {/* Brand date picker — the native input was
                            the one OS-chrome control in the flow. */}
                        <div style={{ minWidth: 180 }}>
                          <WizardDatePicker
                            value={st.rsvpDeadline ?? suggestedDl}
                            onChange={(iso) => setSt((s) => ({ ...s, rsvpDeadline: iso || undefined }))}
                            placeholder="Pick a deadline"
                          />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {step === 'Photos' && (
                <>
                  <StepEyebrow step="Photos" hiddenSteps={hiddenSteps} />
                  <h2 className="display pl-type-press" style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', margin: '0 0 10px', lineHeight: 1.03, textShadow: letterpressShadow('var(--paper, #FDFAF0)', 'var(--ink, #0E0D0B)') }}>
                    Give Pear <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>something to see.</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    Add a few favourite photos — the first becomes your cover, the rest fill the gallery,
                    and your palette can be pulled straight from them. Skip this if you&apos;d rather add them later.
                  </p>
                  <WizardPhotoUpload
                    photos={st.photos}
                    onChange={(next) => setSt((s) => ({ ...s, photos: next }))}
                  />
                </>
              )}

              {step === 'Sections' && (
                <WizardSectionChooser
                  occasion={st.occasion}
                  occasionLabel={occasionArticleLabel(st.occasion)}
                  edition={st.editionPick}
                  value={st.sectionPicks}
                  onChange={(next) => setSt((s) => ({ ...s, sectionPicks: next }))}
                  onSkip={() => {
                    // "Let Pear decide" — make the essentials explicit
                    // (identical to the handleFinish fallback) and move on.
                    setSt((s) => ({
                      ...s,
                      sectionPicks: {
                        on: essentialSectionsFor(s.occasion, s.editionPick),
                        layouts: {},
                      },
                    }));
                    setStepIndex((i) => nextStepIndex(i));
                  }}
                />
              )}

              {step === 'Vibe' && (
                <>
                  <StepEyebrow step="Vibe" hiddenSteps={hiddenSteps} />
                  <h2 className="display pl-type-press" style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', margin: '0 0 10px', lineHeight: 1.03, textShadow: letterpressShadow('var(--paper, #FDFAF0)', 'var(--ink, #0E0D0B)') }}>
                    Set the <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>vibe.</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 18px' }}>
                    Tap a few. The type and palette follow your mood.
                  </p>
                  {/* Live counter. The gate (canContinue) enables at
                      ONE vibe — the old copy demanded two while the
                      Continue button sat enabled, a straight
                      contradiction. Now it nudges ("2–4 feels right")
                      without lying about the floor. Muted ink when
                      empty — plum is destructive-only (BRAND §5). */}
                  <p
                    aria-live="polite"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: st.vibes.length >= 1 ? 'var(--sage-deep)' : 'var(--ink-muted)',
                      margin: '0 0 18px',
                      transition: 'color var(--pl-dur-fast) var(--pl-ease-out)',
                    }}
                  >
                    {st.vibes.length === 0
                      ? 'Optional — 2–4 feels right, or let Pear choose'
                      : `${st.vibes.length} of 4 selected`}
                  </p>
                  {/* Each chip wears its own vibe — the typography IS the
                      preview (design system v2). Picked = olive fill,
                      cream ink; unpicked = paper card. */}
                  <div className="pl-cascade-row" style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                    {vibesForOccasion(st.occasion).map((v) => {
                      const on = st.vibes.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleVibe(v.id)}
                          /* .wz-chip (pearloom.css) carries the fill/press
                             transitions — the tilt stays inline on the
                             button, the press-scale lives on the inner
                             span so the two transforms never fight. */
                          className="wz-chip"
                          style={{
                            background: on ? 'var(--pl-olive, #5C6B3F)' : 'var(--pl-cream-card, #FBF7EE)',
                            color: on ? 'var(--pl-cream, #FBF7EE)' : 'var(--pl-ink, #2A2A2A)',
                            border: `1px solid ${on ? 'var(--pl-olive, #5C6B3F)' : 'var(--line)'}`,
                            padding: '9px 16px',
                            borderRadius: 999,
                            cursor: 'pointer',
                            transform: `rotate(${VIBE_TILT[v.id] ?? 0}deg)`,
                            ...VIBE_FACE[v.id],
                          }}
                        >
                          <span>{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Live consequence line (2026-07-08): the vibes now
                      genuinely shape the pressed site, so say WHAT the
                      current picks will do — first vibe loudest. */}
                  {st.vibes.length > 0 && vibeLookSummary(st.vibes) && (
                    <div
                      style={{
                        marginTop: 16,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 14px',
                        borderRadius: 999,
                        background: 'var(--pl-gold-mist, #F4ECD6)',
                        fontSize: 12.5,
                        color: 'var(--ink-soft)',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      <Sparkle size={13} color="var(--gold)" />
                      <span>
                        Pear will press this as: <em style={{ fontStyle: 'italic', color: 'var(--pl-olive, #5C6B3F)' }}>{vibeLookSummary(st.vibes)}</em>
                      </span>
                    </div>
                  )}
                  {/* Skip affordance (GRAND-PLAN Phase 2). Vibe is
                      optional — a host with no mood in mind can hand it
                      to Pear (empty vibes resolve to the occasion's own
                      voice at generation). The bottom Continue is always
                      enabled too; this is the discoverable "skipping is
                      fine" signal, shown only while nothing is picked. */}
                  {st.vibes.length === 0 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 18 }}
                      onClick={() => setStepIndex((i) => nextStepIndex(i))}
                    >
                      Let Pear choose the vibe <Icon name="arrow-right" size={13} />
                    </button>
                  )}
                </>
              )}

              {step === 'Palette' && (
                <>
                  <StepEyebrow step="Palette" hiddenSteps={hiddenSteps} />
                  <h2 className="display pl-type-press" style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', margin: '0 0 10px', lineHeight: 1.03, textShadow: letterpressShadow('var(--paper, #FDFAF0)', 'var(--ink, #0E0D0B)') }}>
                    Choose your <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>colors.</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 18px' }}>
                    Pear read your venue and vibes and mixed three color sets just for you — or pick a classic below.
                  </p>
                  {/* Ready signal (GRAND-PLAN Phase 2). A palette is
                      always resolved (occasion default or your photos),
                      so the host is never stuck choosing — this removes
                      the "must I pick one?" beat. Mirrors the Vibe
                      counter's style; sage (never plum) for the calm
                      positive state. */}
                  <p
                    aria-live="polite"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--sage-deep)',
                      margin: '0 0 18px',
                    }}
                  >
                    Your palette is ready — continue whenever, or pick another
                  </p>
                  {/* The live save-the-date preview in the right rail
                      re-renders the moment a palette is tapped, so the
                      host sees their names in the chosen colours. */}

                  {/* ── Smart palettes header ──────────────────── */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                        fontSize: 11,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--pl-olive, #5C6B3F)',
                      }}
                    >
                      <Sparkle size={11} color="var(--gold)" /> Pear's picks for you
                    </div>
                    {!pearPaletteLocked && (
                      <button
                        type="button"
                        onClick={() => void fetchSmartPalettes()}
                        className="btn btn-outline btn-sm"
                        disabled={!!st.smartPalettesLoading}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <Icon name="wand" size={12} />{' '}
                        {st.smartPalettesLoading
                          ? 'Mixing palette…'
                          : (st.smartPalettes?.length ?? 0) > 0
                            ? 'Re-read my event'
                            : 'Ask Pear again'}
                      </button>
                    )}
                  </div>

                  {/* Signed-out: an honest slat, never an auth error —
                      the classics below work now; Pear's custom mixes
                      arrive with the account they're stored under. */}
                  {pearPaletteLocked && (
                    <div
                      style={{
                        fontFamily: 'var(--font-display, Fraunces, serif)',
                        fontStyle: 'italic',
                        fontSize: 14.5,
                        color: 'var(--ink-soft)',
                        marginBottom: 18,
                        lineHeight: 1.6,
                      }}
                    >
                      Pear mixes palettes from your story once you're signed in — after the press.
                      The classics below work beautifully now.
                    </div>
                  )}

                  {!pearPaletteLocked && st.smartPalettesError && (
                    <div style={{ fontSize: 12, color: 'var(--pl-warning, #A14A2C)', marginBottom: 10 }}>
                      {st.smartPalettesError}
                    </div>
                  )}

                  {/* Skeleton while Pear mixes the first set */}
                  {st.smartPalettesLoading && (st.smartPalettes?.length ?? 0) === 0 && (
                    <div
                      className="pl8-palette-grid"
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}
                    >
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            padding: 16,
                            borderRadius: 16,
                            background: 'var(--card, #fff)',
                            border: '1.5px solid var(--line)',
                            minHeight: 170,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[0, 1, 2, 3].map((k) => (
                              <div
                                key={k}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: 'var(--cream-2)',
                                  opacity: 0.7 - k * 0.12,
                                  animation: `wizard-skeleton-pulse 1.4s ease-in-out ${i * 0.15 + k * 0.08}s infinite`,
                                }}
                              />
                            ))}
                          </div>
                          <div
                            style={{
                              width: '70%',
                              height: 14,
                              background: 'var(--cream-2)',
                              borderRadius: 6,
                              marginTop: 12,
                              opacity: 0.6,
                              animation: `wizard-skeleton-pulse 1.4s ease-in-out ${i * 0.15}s infinite`,
                            }}
                          />
                          <div
                            style={{
                              width: '90%',
                              height: 10,
                              background: 'var(--cream-2)',
                              borderRadius: 5,
                              marginTop: 8,
                              opacity: 0.5,
                              animation: `wizard-skeleton-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {((st.smartPalettes?.length ?? 0) > 0 || photoPaletteColors) && (
                    <div
                      className="pl8-palette-grid pl-cascade-row"
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}
                    >
                      {/* "From your photos" — client-side extraction from
                          the first uploaded photo. Renders only when the
                          extraction succeeded; selecting it flows through
                          the same palette/paletteColors path as siblings. */}
                      {photoPaletteColors && (
                        <button
                          type="button"
                          onClick={() => {
                            setSt((s) => ({
                              ...s,
                              palette: PHOTO_PALETTE_ID,
                              paletteColors: photoPaletteColors,
                              // Not a smart-palette pick — drop its ornament.
                              suggestedMotif: undefined,
                              suggestedMotifLayout: undefined,
                            }));
                            autoAdvance();
                          }}
                          style={{
                            padding: 16,
                            borderRadius: 16,
                            background: 'var(--card)',
                            /* Constant 2px border (color-only change) —
                               the old 1.5→2px flip shifted the whole
                               card's layout by half a pixel on select. */
                            border: `2px solid ${st.palette === PHOTO_PALETTE_ID ? 'var(--ink)' : 'var(--line)'}`,
                            transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), box-shadow var(--pl-dur-fast) var(--pl-ease-out)',
                            boxShadow: st.palette === PHOTO_PALETTE_ID ? '0 4px 14px rgba(40,28,12,0.10)' : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            cursor: 'pointer',
                            position: 'relative',
                            textAlign: 'left',
                          }}
                        >
                          {st.palette === PHOTO_PALETTE_ID && (
                            <div
                              className="pl8-chip-pop"
                              style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: 'var(--ink)',
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              <Icon name="check" size={11} color="#fff" strokeWidth={3} />
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 4 }}>
                            {photoPaletteColors.map((c, i) => (
                              <div
                                key={i}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: c,
                                  border: '1.5px solid rgba(255,255,255,0.45)',
                                }}
                              />
                            ))}
                          </div>
                          <div
                            className="display"
                            style={{
                              fontSize: 18,
                              fontStyle: 'italic',
                              margin: 0,
                              lineHeight: 1.2,
                            }}
                          >
                            From your photos
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                            Accents drawn straight from the photographs you shared.
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                              fontSize: 9.5,
                              letterSpacing: '0.16em',
                              textTransform: 'uppercase',
                              color: 'var(--ink-muted)',
                            }}
                          >
                            Photo-matched
                          </div>
                        </button>
                      )}
                      {(st.smartPalettes ?? []).map((p) => {
                        const on = st.palette === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSt((s) => ({
                                ...s,
                                palette: p.id,
                                paletteColors: p.colors,
                                // The ornament rides with the palette pick.
                                suggestedMotif: p.motif,
                                suggestedMotifLayout: p.motifLayout,
                              }));
                              autoAdvance();
                            }}
                            style={{
                              padding: 16,
                              borderRadius: 16,
                              background: 'var(--card)',
                              border: `2px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                              transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), box-shadow var(--pl-dur-fast) var(--pl-ease-out)',
                              boxShadow: on ? '0 4px 14px rgba(40,28,12,0.10)' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 10,
                              cursor: 'pointer',
                              position: 'relative',
                              textAlign: 'left',
                            }}
                          >
                            {on && (
                              <div
                                className="pl8-chip-pop"
                                style={{
                                  position: 'absolute',
                                  top: 10,
                                  right: 10,
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  background: 'var(--ink)',
                                  display: 'grid',
                                  placeItems: 'center',
                                }}
                              >
                                <Icon name="check" size={11} color="#fff" strokeWidth={3} />
                              </div>
                            )}
                            <div
                              style={{
                                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                                fontSize: 9.5,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                color: 'var(--pl-olive, #5C6B3F)',
                              }}
                            >
                              {p.source === 'venue' ? 'From your venue'
                                : p.source === 'vibe' ? 'From your vibe'
                                : p.source === 'photos' ? 'From your photos'
                                : 'From the occasion'}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {p.colors.map((c, i) => (
                                <div
                                  key={i}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: c,
                                    border: '1.5px solid rgba(255,255,255,0.45)',
                                  }}
                                />
                              ))}
                            </div>
                            <div
                              className="display"
                              style={{
                                fontSize: 18,
                                fontStyle: 'italic',
                                margin: 0,
                                lineHeight: 1.2,
                              }}
                            >
                              {p.name}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                              {p.rationale}
                            </div>
                            {p.motif && (
                              /* The ornament that rides with this palette —
                                 drawn for real so the host sees the pairing,
                                 not a label. Accent color comes from the
                                 palette's own accent swatch. */
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, '--t-motif': p.colors[2] } as CSSProperties}>
                                <Motif kind={p.motif as MotifKind} size={30} />
                                <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                                  paired mark · {p.motif.replace(/-/g, ' ')}
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Classic presets ───────────────────────── */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-muted)',
                      marginBottom: 10,
                    }}
                  >
                    Classic presets
                  </div>
                  <div
                    className="pl8-palette-grid pl-cascade-row"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}
                  >
                    {orderPalettesForOccasion(PALETTES, st.occasion).map((p) => {
                      const on = st.palette === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSt((s) => ({
                              ...s,
                              palette: p.id,
                              paletteColors: p.colors,
                              // Not a smart-palette pick — drop its ornament.
                              suggestedMotif: undefined,
                              suggestedMotifLayout: undefined,
                            }));
                            autoAdvance();
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 12,
                            background: 'var(--card)',
                            border: on ? '1px solid var(--pl-gold, #C19A4B)' : '1px solid var(--line)',
                            boxShadow: on ? '0 0 0 2px var(--pl-gold-soft, #EAD9B0)' : 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'box-shadow 160ms ease, border-color 160ms ease',
                          }}
                        >
                          {/* Continuous swatch strip (design system v2). */}
                          <span style={{ display: 'flex', height: 30, borderRadius: 7, overflow: 'hidden', flex: 1 }}>
                            {p.colors.map((c, i) => (
                              <span key={i} style={{ flex: 1, background: c }} />
                            ))}
                          </span>
                          <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 'Review' && (
                <>
                  <StepEyebrow step="Review" hiddenSteps={hiddenSteps} />
                  <h2 className="display pl-type-press" style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', margin: '0 0 10px', lineHeight: 1.03, textShadow: letterpressShadow('var(--paper, #FDFAF0)', 'var(--ink, #0E0D0B)') }}>
                    Everything in <span className="display-italic" style={{ color: 'var(--pl-olive, #5C6B3F)' }}>order?</span>
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: '0 0 22px' }}>
                    This is the proof — the exact site Pear will press. Scroll it, then press the seal.
                  </p>

                  {/* THE PROOF (RADICAL §D, the inversion) — the real
                      site leads Review as a full-width stage, desktop
                      scale, with the wax seal floating over it as the
                      finish. The plan rows and Pear's questions follow
                      beneath as supporting matter. */}
                  {(() => {
                    const lookNameSpec = nameModeFor(st.occasion);
                    const lookCouple = lookNameSpec.mode === 'couple';
                    const lookNames = st.names.filter(Boolean);
                    const lookPalette = st.paletteColors && st.paletteColors.length > 0
                      ? st.paletteColors
                      : PALETTES.find((pp) => pp.id === st.palette)?.colors;
                    return (
                      <WizardStructureSection
                        occasion={st.occasion}
                        paletteColors={lookPalette}
                        names={[
                          lookNames[0] || (lookCouple ? 'Alex' : lookNameSpec.primaryPlaceholder),
                          lookCouple ? (lookNames[1] || 'Jamie') : '',
                        ]}
                        coverPhoto={st.photos.find((ph) => ph.url)?.url}
                        galleryImages={st.photos.filter((ph) => ph.url).map((ph) => ph.url)}
                        recipe={lookRecipesFor(st.occasion).find((r) => r.id === 'match') ?? null}
                        suggestedMotif={st.suggestedMotif}
                        suggestedMotifLayout={st.suggestedMotifLayout}
                        picks={{
                          siteMode: st.siteMode,
                          kitId: st.kitId,
                          texture: st.texture,
                          navVariant: st.navVariant,
                          heroVariant: st.heroVariant,
                          motifLayout: st.motifLayoutPick,
                          density: st.densityPick,
                        }}
                        sectionPicks={st.sectionPicks}
                        vibes={st.vibes}
                        stage
                        proof
                        eventDate={st.eventDate}
                        location={st.location}
                        seedPicks={{
                          events: st.dayEvents,
                          dressCode: st.dressCode,
                          rsvpDeadline: st.rsvpDeadline,
                          hotels: st.hotels,
                          kidsPolicy: st.kidsPolicy,
                          parkingNote: st.parkingNote,
                          wantsCountdown: st.wantsCountdown,
                          playlistUrl: st.playlistUrl,
                          meals: st.meals,
                          registryUrl: st.registryUrl,
                          plusOnes: st.plusOnes,
                          partyNames: st.partyNames,
                        }}
                        onPressSeal={() => { if (canContinue && !busy) void handleFinish(); }}
                        pressing={busy}
                        onExpand={() => setFittingOpen(true)}
                        title="Your site, pressed"
                        blurb="Scroll the proof. The fitting room changes any of it; the seal makes it real."
                      />
                    );
                  })()}

                  <div
                    style={{
                      fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-muted)',
                      margin: '26px 0 10px',
                    }}
                  >
                    Your plan
                  </div>
                  <div className="pl8-basics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Row label="Occasion" val={OCCASIONS.find((o) => o.id === st.occasion)?.label ?? '—'} />
                    <Row label="Names" val={st.names.filter(Boolean).join(' & ') || '—'} />
                    <Row label="Date" val={st.eventDate || '—'} />
                    <Row label="Location" val={st.location || '—'} />
                    <Row
                      label="Vibes"
                      val={
                        st.vibes
                          .map((id) => VIBES.find((v) => v.id === id)?.label ?? id)
                          .join(', ') || '—'
                      }
                    />
                    <Row
                      label="Palette"
                      val={
                        st.palette === PHOTO_PALETTE_ID
                          ? 'From your photos'
                          : PALETTES.find((p) => p.id === st.palette)?.name ??
                            st.smartPalettes?.find((p) => p.id === st.palette)?.name ??
                            (st.paletteColors && st.paletteColors.length > 0 ? 'Pear-picked palette' : '—')
                      }
                      swatches={
                        st.paletteColors && st.paletteColors.length > 0
                          ? st.paletteColors
                          : PALETTES.find((p) => p.id === st.palette)?.colors
                      }
                    />
                    {/* Layout row removed — layout variants stamp via applyWizardLook in
                        the editor; Pear seeds a sensible default at
                        generation time. Showing "Layout: Memory
                        Thread" in the review confused hosts who
                        hadn't been asked. */}
                    <Row
                      label="Site link"
                      val={formatSiteDisplayUrl(
                        st.subdomain || slugify(st.names.filter(Boolean).join('-and-')) || slugify(st.occasion),
                        '',
                        normalizeOccasion(st.occasion || 'wedding'),
                      )}
                    />
                  </div>

                  {/* Pear's first-draft Look preview — the per-event look
                      values applyWizardLook stamps onto the generated site
                      (texture / kit / density / voice / grain). Live-computed
                      from the occasion; no manifest writes here. Edition was
                      removed 2026-06-10 — it's an internal layout-defaults
                      signal now, not a host-facing concept (the v8
                      EditionPicker is long gone). */}
                  {st.occasion && (() => {
                    const eventType = getEventType(st.occasion as never);
                    const voice = eventType?.voice;
                    const occ = st.occasion as never;
                    void occ;
                    const tex = recommendTextureFor(st.occasion);
                    const ld = lookDefaultsFor(st.occasion);
                    /* Intensity label matches LookEnginePanel's
                       intensityLabel() thresholds so the wizard preview
                       reads the same way the editor pickers do. */
                    const intensityLabel =
                      ld.textureIntensity <= 0.01 ? 'Off'
                      : ld.textureIntensity < 0.6 ? 'Faint'
                      : ld.textureIntensity < 1.05 ? 'Natural'
                      : ld.textureIntensity < 1.35 ? 'Rich'
                      : 'Bold';
                    const items = [
                      { label: 'Texture', val: tex.charAt(0).toUpperCase() + tex.slice(1) },
                      { label: 'Cards',   val: ld.kitId.charAt(0).toUpperCase() + ld.kitId.slice(1) },
                      { label: 'Spacing', val: ld.density.charAt(0).toUpperCase() + ld.density.slice(1) },
                      { label: 'Voice',   val: voice ? voice.charAt(0).toUpperCase() + voice.slice(1) : 'Celebratory' },
                      { label: 'Grain',   val: intensityLabel },
                    ];
                    return (
                      <div
                        style={{
                          marginTop: 18,
                          padding: 16,
                          borderRadius: 14,
                          background: 'var(--cream-2)',
                          border: '1px solid var(--line-soft)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 10,
                          }}
                        >
                          <Pear size={22} tone="sage" sparkle shadow={false} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
                              Pear&apos;s first draft of your look
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>
                              Woven into your site from the start — reshape any of it with theme packs and layouts in the editor.
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                            gap: 8,
                          }}
                        >
                          {items.map((it) => (
                            <div
                              key={it.label}
                              style={{
                                padding: '8px 10px',
                                background: 'var(--card)',
                                borderRadius: 8,
                                border: '1px solid var(--line-soft)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: '0.06em',
                                  textTransform: 'uppercase',
                                  color: 'var(--ink-muted)',
                                }}
                              >
                                {it.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  color: 'var(--ink)',
                                }}
                              >
                                {it.val}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* PEAR'S QUESTIONS — the gaps she noticed, asked as
                      questions with the answer inline. Each card only
                      renders while its field is EMPTY (answering one
                      retires it), and every answer lands on the same
                      wizard state the steps write — no new plumbing,
                      no model call, occasion-aware by construction. */}
                  <PearsQuestions st={st} setSt={setSt} />

                  {/* CO-PLANNING — celebrations are almost never
                      planned alone (the MOH, the partner, a parent).
                      One email here and they can edit alongside the
                      host from the moment the site presses — the
                      same co-host machinery Settings offers, met at
                      the moment it's actually wanted. */}
                  <div style={{ marginTop: 18, padding: 16, borderRadius: 14, background: 'var(--cream-2)', border: '1px solid var(--line-soft)' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                      Planning this with someone?
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 10 }}>
                      They&rsquo;ll get an invite to edit alongside you the moment the site presses. Optional — you can add co-hosts later in Settings.
                    </div>
                    <input
                      className="input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={st.coHostEmail ?? ''}
                      onChange={(ev) => setSt((s2) => ({ ...s2, coHostEmail: ev.target.value }))}
                      placeholder="their@email.com"
                    />
                  </div>

                  {st.linkFromSlug && (
                    <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, background: 'var(--sage-tint, #E3E6C8)', border: '1px dashed var(--sage, #7A8A4F)', fontSize: 12, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span aria-hidden style={{ color: 'var(--pl-gold, #C19A4B)' }}>✦</span>
                      Part of {st.linkCelebName ? <b style={{ color: 'var(--ink)' }}>{st.linkCelebName}&rsquo;s celebration</b> : 'your celebration'} — both sites will link to each other.
                    </div>
                  )}

                  {/* Coverage checklist — what arrives woven vs. what
                      the host will add in the editor. Makes skipping a
                      conscious choice instead of a surprise. */}
                  {(() => {
                    const rows: Array<[string, boolean]> = [
                      ['Cover & gallery photos', st.photos.length > 0],
                      ['Schedule', (st.dayEvents?.length ?? 0) > 0],
                      ['Details · dress code', !!st.dressCode],
                      ['RSVP deadline', !!(st.rsvpDeadline || st.eventDate)],
                      ['Travel intro', !!st.location],
                      ['FAQ starters', true],
                    ];
                    return (
                      <div style={{ marginTop: 18, padding: 16, borderRadius: 14, background: 'var(--cream-2)', border: '1px solid var(--line-soft)' }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                          What arrives woven
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          {rows.map(([label, on]) => (
                            <div key={label} style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12, color: on ? 'var(--ink-soft)' : 'var(--ink-muted)' }}>
                              <span aria-hidden style={{ color: on ? 'var(--pl-olive, #5C6B3F)' : 'var(--ink-muted)', fontWeight: 700 }}>
                                {on ? '✓' : '—'}
                              </span>
                              {label}{!on && ' · add later'}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Let Pear draft a tagline */}
                  <div
                    style={{
                      marginTop: 22,
                      padding: 16,
                      borderRadius: 14,
                      background: 'var(--pl-olive-mist, #E0DDC9)',
                      border: '1px solid var(--pl-olive-20, rgba(92,107,63,0.20))',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Pear size={36} tone="sage" sparkle />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pl-olive-deep, #363F22)', marginBottom: 4 }}>
                        Want Pear to draft a hero tagline?
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 10 }}>
                        Pear reads your occasion, names, vibes, and venue and writes a warm one-liner. You can always edit it later in the editor.
                      </div>
                      {generatedTagline && (
                        <div
                          style={{
                            padding: '10px 12px',
                            background: 'var(--card)',
                            border: '1px solid var(--card-ring)',
                            borderRadius: 10,
                            fontSize: 14,
                            fontStyle: 'italic',
                            color: 'var(--ink)',
                            marginBottom: 10,
                            lineHeight: 1.5,
                          }}
                        >
                          {generatedTagline}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={taglineState === 'running'}
                          onClick={() => void suggestTagline()}
                        >
                          {taglineState === 'running'
                            ? 'Writing…'
                            : generatedTagline
                              ? 'Try another'
                              : 'Let Pear draft it'}
                          <Sparkle size={10} />
                        </button>
                        {taglineState === 'error' && (
                          <span style={{ fontSize: 11.5, color: '#7A2D2D', alignSelf: 'center' }}>
                            Pear couldn't write one. Try once more.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {err && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: 'var(--pl-warning-mist, rgba(161,74,44,0.10))',
                        border: '1px solid var(--pl-warning, #A14A2C)',
                        color: 'var(--pl-warning, #A14A2C)',
                        fontSize: 13,
                      }}
                    >
                      {err}
                    </div>
                  )}
                </>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 28,
                  paddingTop: 20,
                  borderTop: '1px solid var(--line-soft)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStepIndex((i) => prevStepIndex(i))}
                  disabled={stepIndex === 0}
                >
                  <Icon name="arrow-left" size={14} /> Back
                </button>
                {step !== 'Review' ? (
                  <button
                    type="button"
                    className="btn btn-pearl"
                    disabled={!canContinue}
                    onClick={() => setStepIndex((i) => nextStepIndex(i))}
                  >
                    Continue <Pearl size={8} />
                  </button>
                ) : (
                  <button type="button" className="btn btn-pearl btn-lg" disabled={!canContinue || busy} onClick={handleFinish}>
                    {busy ? 'Weaving your site…' : 'Weave my site'}
                    <Pearl size={9} />
                  </button>
                )}
              </div>
            </div>
          </Reveal>
        </div>
        {showPreview && <WizardLivePreview st={st} />}
      </div>

      {fittingOpen && (() => {
                        const lookNameSpec = nameModeFor(st.occasion);
                        const lookCouple = lookNameSpec.mode === 'couple';
                        const lookNames = st.names.filter(Boolean);
                        const fitPalettes: PaletteChoice[] = [];
                        for (const sp of st.smartPalettes ?? []) {
                          // The paired mark rides the palette into the room
                          // so the live press wears it, exactly like the
                          // pressing and generation do.
                          fitPalettes.push({ id: sp.id, name: sp.name, colors: sp.colors, motif: sp.motif, motifLayout: sp.motifLayout });
                        }
                        for (const pp of PALETTES) {
                          if (!fitPalettes.some((x) => x.id === pp.id)) {
                            fitPalettes.push({ id: pp.id, name: pp.name, colors: pp.colors });
                          }
                        }
                        if (st.palette && !fitPalettes.some((x) => x.id === st.palette) && st.paletteColors?.length) {
                          fitPalettes.unshift({ id: st.palette, name: 'Your palette', colors: st.paletteColors, motif: st.suggestedMotif, motifLayout: st.suggestedMotifLayout });
                        }
                        return (
                          <WizardFittingRoom
                            occasion={st.occasion}
                            names={[
                              lookNames[0] || (lookCouple ? 'Alex' : lookNameSpec.primaryPlaceholder),
                              lookCouple ? (lookNames[1] || 'Jamie') : '',
                            ]}
                            coverPhoto={st.photos.find((ph) => ph.url)?.url}
                            galleryImages={st.photos.filter((ph) => ph.url).map((ph) => ph.url)}
                            recipe={lookRecipesFor(st.occasion).find((r) => r.id === 'match') ?? null}
                            palettes={fitPalettes}
                            activePaletteId={st.palette}
                            onPalettePick={(c) => {
                              const smart = (st.smartPalettes ?? []).some((sp) => sp.id === c.id);
                              const sp = (st.smartPalettes ?? []).find((x) => x.id === c.id);
                              setSt((s2) => ({
                                ...s2,
                                palette: c.id,
                                paletteColors: c.colors,
                                suggestedMotif: smart ? sp?.motif : undefined,
                                suggestedMotifLayout: smart ? sp?.motifLayout : undefined,
                              }));
                            }}
                            picks={{
                              siteMode: st.siteMode,
                              kitId: st.kitId,
                              texture: st.texture,
                              navVariant: st.navVariant,
                              navMobile: st.navMobileVariant,
                              heroVariant: st.heroVariant,
                              motifLayout: st.motifLayoutPick,
                              density: st.densityPick,
                              edition: st.editionPick,
                            }}
                            sectionPicks={st.sectionPicks}
                            onChange={(next) => setSt((prev) => ({
                              ...prev,
                              ...('siteMode' in next ? { siteMode: next.siteMode } : {}),
                              ...('kitId' in next ? { kitId: next.kitId } : {}),
                              ...('texture' in next ? { texture: next.texture } : {}),
                              ...('navVariant' in next ? { navVariant: next.navVariant } : {}),
                              ...('navMobile' in next ? { navMobileVariant: next.navMobile } : {}),
                              ...('heroVariant' in next ? { heroVariant: next.heroVariant } : {}),
                              ...('motifLayout' in next ? { motifLayoutPick: next.motifLayout } : {}),
                              ...('density' in next ? { densityPick: next.density } : {}),
                              ...('edition' in next ? { editionPick: next.edition } : {}),
                            }))}
                            onClose={() => setFittingOpen(false)}
                          />
                        );
      })()}
      {busy && <GeneratingScreen genStep={genStep} photoCount={st.photos.length} />}
    </div>
  );
}

function Row({ label, val, swatches }: { label: string; val: string; swatches?: string[] }) {
  return (
    <div style={{ background: 'var(--cream-2)', borderRadius: 12, padding: '10px 14px' }}>
      <div className="eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{val}</div>
        {swatches && swatches.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {swatches.slice(0, 5).map((c, i) => (
              <div
                key={i}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: c,
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
