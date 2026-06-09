'use client';

// ─────────────────────────────────────────────────────────────
// ThemedSiteRenderer — THE Pearloom site renderer. Direct port
// of the Editor Redesign prototype's themed-site.jsx, augmented
// with full Pearloom production features (RSVP form + backend +
// urgency tiers, Guestbook, Day-of broadcast, inline edit mode,
// photo lightbox, decor library, multi-page routing, Event-OS
// custom blocks, etc.).
//
// As of 2026-06-01, this is the ONLY site renderer. The prior
// dual-renderer system (SiteV8Renderer + manifest.renderer
// dispatch) was consolidated away — see CLAUDE-PRODUCT.md §10
// for the migration narrative.
// ─────────────────────────────────────────────────────────────

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { StoryManifest, PageBlock } from '@/types';
/* Event-OS custom blocks — ported from ThemedSiteRenderer's
   CustomBlocksRail. Each block is a standalone component under
   src/components/site/* that reads its own config off the
   PageBlock.config payload. The ThemedCustomBlocks rail below
   recognizes these block types as it iterates manifest.blocks,
   wraps each in a ThemedSectionHead (eyebrow + title from
   block.config), and mounts the matching component. Any
   manifest block whose type isn't recognized falls through to
   the default-case "coming soon" placeholder in edit mode. */
import { ActivityVoteBlock } from '@/components/site/ActivityVoteBlock';
import { AdviceWallBlock } from '@/components/site/AdviceWallBlock';
import { CostSplitterBlock } from '@/components/site/CostSplitterBlock';
import { ItineraryBlock } from '@/components/site/ItineraryBlock';
import { LivestreamBlock } from '@/components/site/LivestreamBlock';
import { ObituaryBlock } from '@/components/site/ObituaryBlock';
import { PackingListBlock } from '@/components/site/PackingListBlock';
import { PrivacyGateBlock } from '@/components/site/PrivacyGateBlock';
import { ProgramBlock } from '@/components/site/ProgramBlock';
import { ToastSignupBlock } from '@/components/site/ToastSignupBlock';
import { Icon } from '../motifs';
import { NavBrandIcon } from './NavBrandIcon';
import { Motif, MotifScatter, WatercolorBloom, type MotifKind } from './MotifScatter';
import { getTheme, themeRootStyle, type Density as ThemeDensity } from './themes';
import { TextureFilters } from './TextureFilters';
import { resolveEdition } from '@/lib/site-editions/resolve';
import { getEventType } from '@/lib/event-os/event-types';
import { EditionSectionOpener } from './edition-openers';
import { EditionDivider } from './edition-dividers';
import {
  DEFAULT_BLOCK_ORDER,
  readHomePageBlocks,
  readSiteMode,
  type SiteBlockKey,
  type SiteMode,
} from '@/lib/site-mode';
import { PresetRsvpForm } from '@/components/PresetRsvpForm';
import { parseLocalDate } from '@/lib/date-utils';
import { Guestbook } from '@/components/guestbook';
import { DayOfBanner } from './DayOfBanner';
import { BroadcastBar } from './BroadcastBar';
import { GuestPearChat } from './GuestPearChat';
import { GuestRsvpModal } from './GuestRsvpModal';
/* Per-section background overlay (paper / wash / mesh / atmosphere /
   none) — reads manifest.blockStyles[sectionId].background with a
   fallback to legacy manifest.sectionBackgrounds[sectionId]. Mounts
   as the first absolutely-positioned child of every <section> with
   an id so hosts can flip the background of any individual section
   from the editor without touching the global paper. */
import { SectionBackground } from './SectionBackground';
/* Scroll-reveal driver — sets data-pl-reveal="pending" on every
   <section> at mount, then flips each to "shown" as it crosses the
   viewport via IntersectionObserver. The actual fade-rise + filigree
   stroke draw-on transitions live in pearloom.css. Honors
   prefers-reduced-motion (sets shown immediately) and skips the hero
   (#top) — already visible on load. Public-site only; never on the
   editor canvas. */
import { ScrollReveal } from './ScrollReveal';
import { computeDayOfState } from '@/lib/day-of/state';
import { EditableText } from '../editor/canvas/EditableText';
import { EditableField } from '../editor/canvas/EditableField';
import { EditorCanvasProvider } from '../editor/canvas/EditorCanvasContext';
import { PhotoLightbox, usePhotoLightbox } from './GuestKit2';
import { PhotoActionMenu } from '../editor/canvas/PhotoActionMenu';
import {
  LivingAtmosphere,
  defaultAtmosphereForOccasion,
  type AtmosphereKind,
  type AtmosphereIntensity,
} from './LivingAtmosphere';
import { useHeroParallax } from './useHeroParallax';
import { getBlockStyle } from '@/lib/block-engine/block-styles';
import { FooterBouquet } from './FooterBouquet';
/* V8 Decor system — layered on TOP of MotifScatter as an additive
   atmospheric layer. Three pieces port over from ThemedSiteRenderer:
   • OccasionDecor    — per-occasion decorative SVG shapes (rings
                        for weddings, candles for memorial, etc.).
                        Mounted once in the hero behind the variant
                        content (z-index 0). Renders only when
                        decorMode === 'occasion'.
   • DecorDivider     — AI-generated horizontal banner art (lives
                        on manifest.decorLibrary.divider). Wraps
                        the existing EditionDivider so Almanac sites
                        can opt in to a custom AI band between
                        sections; other Editions keep their
                        thread/sprocket/stitch/hairline/whitespace
                        rhythm.
   • TemplateSignatureDecor — bespoke per-template illustrations
                              (citrus for Lake Como, monolith for
                              Marfa). Section-anchored above the
                              hero variant. */
import { OccasionDecor } from './OccasionDecor';
import { DecorDivider } from './DecorDivider';
import { TemplateSignatureDecor, type SignatureDecorKind } from './TemplateSignatureDecor';
import { Monogram, deriveInitials, type MonogramFrame } from './Monogram';
/* Side-effect import — registers strip / wall / mosaic gallery
   variants with the block-styles registry. The variant dispatch
   in ThemedGallery reads manifest.blockVariants?.gallery?.style
   and branches between layouts; this import is what makes the
   variant ids available in editor pickers + ensures parity with
   ThemedSiteRenderer's GallerySection. */
import './gallery-variants';
/* Side-effect import — registers all 5 hero variants (postcard,
   photo-first, split, carousel, minimal) with the block-styles
   registry. The variants already ship with the gradient fallback
   (heroFallbackGradient) used when no cover photo is set. Just
   importing the barrel is what makes getBlockStyle('hero', id)
   resolve when ThemedSiteRenderer dispatches the hero variant. */
import './hero-variants';
/* Side-effect imports — register the prototype's per-section
   layout variants (48 across 9 sections; see
   src/lib/site-layouts/registry.ts). The picker in the editor's
   Layout tab uses getBlockStyles(section) to discover these; the
   renderer falls back to its existing default layout when an
   unwired variant id is picked. Adding a new variant ships by
   extending the per-section file + wiring its renderer; existing
   sites are unaffected. */
import './story-variants';
import './schedule-variants';
import { getDetailsVariantComponent } from './details-variants';
import './travel-variants';
import './registry-variants';
import { renderRegistryVariant } from './registry-variants';
import './rsvp-variants';
import './faq-variants';

/** Patch function the editor passes down so deep fields can ship
 *  their edits through a single channel. Matches ThemedSiteRenderer. */
type FieldEditor = (patch: (m: StoryManifest) => StoryManifest) => void;

interface Props {
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  /** Display URL for share previews + canonical URL hints
   *  (e.g. "pearloom.com/wedding/anna-liam"). Optional —
   *  consumers that don't have a published URL yet (template
   *  preview modal, wizard) omit it. */
  prettyUrl?: string;
  /** When true, sections with empty data render an editable
   *  placeholder ("Add your first chapter →") instead of
   *  returning null. Editor canvas passes true; the public site
   *  passes false / undefined so guests never see scaffolding. */
  editMode?: boolean;
  /** Manifest patcher — when provided, inline edit affordances
   *  light up across the canvas. Each editable field passes a
   *  pure `(manifest) => newManifest` patch back to the editor.
   *  Mirrors ThemedSiteRenderer's contract. */
  onEditField?: FieldEditor;
  /** Name changes ship outside the manifest (they live on the
   *  editor state), so they get their own callback. */
  onEditNames?: (next: [string, string]) => void;
  /** Multi-page filter. When set to a SiteBlockKey, the renderer
   *  shows only that block (sub-page route). When set to 'home',
   *  it shows the hero plus the homePageBlocks subset (multi-page
   *  home). Undefined = scroll mode (render everything). Mirrors
   *  ThemedSiteRenderer's contract. */
  pageFilter?: SiteBlockKey | 'home';
  /** Layout mode. When omitted, falls back to readSiteMode(manifest)
   *  so callers that don't thread the prop still get correct
   *  behaviour. Both reads come from @/lib/site-mode so there's no
   *  drift. */
  siteMode?: SiteMode;
  /** Home-page block subset. When omitted, falls back to
   *  readHomePageBlocks(manifest). */
  homePageBlocks?: SiteBlockKey[];
}

/* Per-Edition motif kind — mirrors HeroPostcard / ThemedSiteRenderer
   mapping. Source of truth for which decoration each Edition
   wears. */
const EDITION_MOTIF: Record<string, MotifKind> = {
  almanac: 'pressed',
  cinema: 'none',
  'postcard-box': 'olive',
  'linen-folder': 'olive',
  quiet: 'none',
};

// ─────────────────────────────────────────────────────────────
// useChapterTones — re-implementation of the same hook that
// ships in src/components/blocks/StoryLayouts.tsx. We re-declare
// here because the StoryLayouts copy is module-private. The
// process-wide cache key is the photo URL so two callers
// sampling the same image share the result; both copies of
// the hook will hit the same cache.
//
// Returns a record keyed by URL: a CSS rgb() string when the
// dominant tone resolved, null when the canvas was tainted or
// the image failed to load. Callers fall back to their default
// palette for null / undefined entries so the unaltered render
// is byte-for-byte unchanged for existing sites.
// ─────────────────────────────────────────────────────────────
const CHAPTER_TONE_CACHE = new Map<string, string | null>();
const CHAPTER_TONE_INFLIGHT = new Map<string, Promise<string | null>>();

function dominantTone(url: string): Promise<string | null> {
  if (CHAPTER_TONE_CACHE.has(url)) {
    return Promise.resolve(CHAPTER_TONE_CACHE.get(url) ?? null);
  }
  const existing = CHAPTER_TONE_INFLIGHT.get(url);
  if (existing) return existing;
  if (typeof window === 'undefined') return Promise.resolve(null);
  // Skip data URLs + the hero-art endpoint (synthetic
  // illustrations) — they read off-brand against actual photos.
  if (url.startsWith('data:') || url.includes('/api/hero-art')) {
    CHAPTER_TONE_CACHE.set(url, null);
    return Promise.resolve(null);
  }
  const p = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 32;
        const ctx = c.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n++;
        }
        if (n === 0) {
          resolve(null);
          return;
        }
        resolve(`rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`);
      } catch {
        // Canvas tainted (cross-origin without CORS) — fall back.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  }).then((tone) => {
    CHAPTER_TONE_CACHE.set(url, tone);
    CHAPTER_TONE_INFLIGHT.delete(url);
    return tone;
  });
  CHAPTER_TONE_INFLIGHT.set(url, p);
  return p;
}

function useChapterTones(
  urls: Array<string | undefined>,
): Record<string, string | null> {
  const [tones, setTones] = useState<Record<string, string | null>>(() => {
    const seed: Record<string, string | null> = {};
    for (const u of urls) {
      if (u && CHAPTER_TONE_CACHE.has(u)) {
        seed[u] = CHAPTER_TONE_CACHE.get(u) ?? null;
      }
    }
    return seed;
  });
  const signature = urls.filter(Boolean).join('|');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const targets = urls.filter((u): u is string => !!u);
    for (const url of targets) {
      if (CHAPTER_TONE_CACHE.has(url)) continue;
      void dominantTone(url).then((tone) => {
        if (cancelled) return;
        setTones((prev) => {
          if (prev[url] === tone) return prev;
          return { ...prev, [url]: tone };
        });
      });
    }
    return () => {
      cancelled = true;
    };
    // signature collapses array identity into a stable string key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return tones;
}

// ─────────────────────────────────────────────────────────────
// FAQ category mapping — ported verbatim from ThemedSiteRenderer's
// FaqSection. Powers the inline CTA chip beneath each expanded
// answer (RSVP → #rsvp, Hotels → #travel, Gifts → #registry,
// Schedule → #schedule). Informational categories return null.
// Suppression rules: chips hide on very short answers (< 24
// chars) and when the answer already mentions the affordance.
// ─────────────────────────────────────────────────────────────
const FAQ_CATEGORY_RULES: Array<[RegExp, string]> = [
  [/\b(schedule|timeline|ceremony\s*(start|begin|time)|reception\s*(start|begin|time)|day[\s-]?of|what\s*time|start\s*time|run[\s-]?of[\s-]?show|order\s*of\s*events|when\s*does\s*(the|it))/i, 'Schedule'],
  [/\b(airport|airline|flight|drive|driving|park|parking|direction|address|map|where is|how to get|car)/i, 'Travel'],
  [/\b(dress|wear|attire|black\s*tie|cocktail|formal|outfit|tie|tux|gown|shoes|heels)/i, 'Dress code'],
  [/\b(food|meal|dietary|allerg|vegan|vegetarian|gluten|menu|drink|bar|alcohol|kosher|halal)/i, 'Food + drink'],
  [/\b(kid|child|children|baby|toddler|family|stroller|nanny)/i, 'Kids'],
  [/\b(rsvp|reply|deadline|when do|how do i|let you know)/i, 'RSVP'],
  [/\b(gift|registr|present|honey\s*moon\s*fund|cash)/i, 'Gifts'],
  [/\b(hotel|stay|lodging|sleep|rooms|airbnb)/i, 'Hotels'],
  [/\b(plus[\s-]?one|guest|invit|alone|date|partner)/i, 'Plus-ones'],
  [/\b(photo|video|post|social|hashtag|instagram|share)/i, 'Photos'],
];
function categorizeFaq(question: string): string {
  for (const [rx, label] of FAQ_CATEGORY_RULES) {
    if (rx.test(question)) return label;
  }
  return 'Other';
}
function getFaqCta(
  category: string,
): { label: string; href: string; matchWord: RegExp } | null {
  switch (category) {
    case 'RSVP':
    case 'Plus-ones':
      return { label: 'RSVP now', href: '#rsvp', matchWord: /\brsvp\b/i };
    case 'Travel':
    case 'Hotels':
      return { label: 'Book hotel', href: '#travel', matchWord: /\b(hotel|travel|book)\b/i };
    case 'Gifts':
      return { label: 'View registry', href: '#registry', matchWord: /\bregistr/i };
    case 'Schedule':
      return { label: 'See schedule', href: '#schedule', matchWord: /\bschedul/i };
    default:
      return null;
  }
}
function shouldShowFaqCta(
  answer: string,
  cta: { matchWord: RegExp } | null,
): cta is { label: string; href: string; matchWord: RegExp } {
  if (!cta) return false;
  const trimmed = (answer ?? '').trim();
  if (trimmed.length < 24) return false;
  if (cta.matchWord.test(trimmed)) return false;
  return true;
}

export function ThemedSiteRenderer({
  manifest,
  names,
  siteSlug,
  prettyUrl,
  editMode = false,
  onEditField,
  onEditNames,
  pageFilter,
  siteMode: siteModeProp,
  homePageBlocks: homePageBlocksProp,
}: Props) {
  // prettyUrl is accepted for parity with the old ThemedSiteRenderer
  // contract (used by share previews + canonical hints) but is not
  // currently consumed in the render tree. Threading it from
  // PublishedSiteShell / TemplatePreviewModal callers keeps the API
  // stable; downstream sections that need it can read this prop.
  void prettyUrl;
  const [n1, n2] = names;
  /* Memoized names tuple — the `names` prop is freshly destructured
     by callers (e.g. PublishedSiteShell passing [first, last]) so
     downstream components like ThemedNav/Hero/Footer would receive
     a new tuple identity every render. Stabilize once here so any
     React.memo on those children short-circuits when names are
     unchanged. */
  const namesTuple = useMemo<[string, string]>(() => [n1, n2], [n1, n2]);
  /* Multi-page resolution — mirrors ThemedSiteRenderer. The caller can
     override either field; otherwise we read from the manifest via
     the canonical helpers in @/lib/site-mode so the two renderers
     can never drift. */
  const siteMode: SiteMode = siteModeProp ?? readSiteMode(manifest);
  const homePageBlocks: SiteBlockKey[] = homePageBlocksProp ?? readHomePageBlocks(manifest);

  /* shouldRenderBlock — single decision point for whether each
     canonical SiteBlockKey section renders, given the current
     pageFilter. Matches the V8 fullBlockOrder filter:
       • no pageFilter  → render everything (scroll mode)
       • 'home'         → render only homePageBlocks ∪ {'details'}
       • specific key   → render only that key
     Non-SiteBlockKey sections (countdown / weddingParty / map /
     spotify / hashtag / guestbook) follow their own home-only rule
     below (see showHomeExtras).

     Memoized — homePageBlocks identity is stable across renders
     unless the manifest's blocks order actually changes, so the
     Set + closure are reused. Prevents new Set/closure identities
     from invalidating any downstream memoization. */
  const homeBlockSet = useMemo(
    () => new Set<SiteBlockKey>([...homePageBlocks, 'details']),
    [homePageBlocks],
  );
  const shouldRenderBlock = useCallback(
    (key: SiteBlockKey): boolean => {
      if (!pageFilter) return true;
      if (pageFilter === 'home') return homeBlockSet.has(key);
      return key === pageFilter;
    },
    [pageFilter, homeBlockSet],
  );

  /* Hero / non-SiteBlockKey extras render on scroll mode and on the
     multi-page home — never on sub-pages, which are focused single-
     block views. */
  const showHero = !pageFilter || pageFilter === 'home';
  const showHomeExtras = !pageFilter || pageFilter === 'home';

  /* Divider visibility — only show a divider between two sections
     that are both rendering. Prevents orphan dividers at the top or
     bottom of a sub-page (where only one section actually renders).
     Mirrors V8's "skip before first" rule but applied here against
     the per-section render decision so a sub-page with just one
     block has no surrounding dividers. */
  const showDividerBefore = (key: SiteBlockKey | 'countdown' | 'weddingParty' | 'map' | 'spotify' | 'hashtag' | 'guestbook'): boolean => {
    if (!pageFilter) return true;
    if (pageFilter === 'home') {
      // On home, only the canonical SiteBlockKey home-blocks render;
      // the extras (countdown / weddingParty / map / spotify /
      // hashtag / guestbook) follow showHomeExtras. So show the
      // divider only when the section itself will render.
      if (key === 'countdown' || key === 'weddingParty' || key === 'map' || key === 'spotify' || key === 'hashtag' || key === 'guestbook') {
        return showHomeExtras;
      }
      return homeBlockSet.has(key as SiteBlockKey);
    }
    // Sub-page: divider only when this exact section renders.
    if (key === 'countdown' || key === 'weddingParty' || key === 'map' || key === 'spotify' || key === 'hashtag' || key === 'guestbook') {
      return false;
    }
    return key === pageFilter;
  };
  /* Edit mode is active when the editor passes onEditField AND we
     aren't in preview-as-guest mode. The editMode prop alone
     (from CanvasStage's !previewMode) controls scaffolding; the
     inline-edit affordances additionally require onEditField so
     the published-site mounts (which never pass it) stay read-only. */
  const canEdit = editMode && Boolean(onEditField);
  const edition = manifest.edition ?? 'almanac';
  const occasion = manifest.occasion ?? 'wedding';
  const eventType = getEventType(occasion);
  const voice = eventType?.voice ?? 'celebratory';
  /* Memoized — resolveEdition() walks the Edition registry + theme
     defaults on every call. Stable identity here is critical: the
     same activeEdition object flows to every <ThemedDecorDivider>
     (13 mounts) so any React.memo on those dividers can short-
     circuit when the edition/occasion/voice triple is unchanged. */
  const activeEdition = useMemo(
    () => resolveEdition({ edition, occasion, voice }),
    [edition, occasion, voice],
  );
  /* Motifs honor the Fine-tune toggle. When motifsEnabled is
     explicitly false, every section's MotifScatter receives
     'none' so no decorative shapes render. Default = true so
     existing sites are unchanged. */
  const motifsOn = manifest.motifsEnabled ?? true;
  /* Motif resolution priority (matches integration guide §3 — Decor
     Library lives-applies motifs):
       1. host explicitly picked one via Decor Library → manifest.motifKind
       2. active prototype theme defines a motif → theme.motif (resolved
          inline by calling getTheme on the host's themeId; same call we
          already make below for the theme overlay)
       3. active Edition default → EDITION_MOTIF[edition]
       4. fallback → 'pressed'
     'none' kills decoration entirely. */
  const _themeForMotif = getTheme(
    ((manifest as unknown as { themeId?: string }).themeId)
    ?? ((manifest as unknown as { theme?: { id?: string; themeId?: string } }).theme?.id)
    ?? ((manifest as unknown as { theme?: { id?: string; themeId?: string } }).theme?.themeId),
  );
  const motifFromHost = ((manifest as unknown as { motifKind?: MotifKind }).motifKind);
  const motifFromTheme = (_themeForMotif?.motif === 'none' ? null : _themeForMotif?.motif) as MotifKind | null | undefined;
  const motif: MotifKind = !motifsOn
    ? 'none'
    : motifFromHost ?? motifFromTheme ?? EDITION_MOTIF[edition] ?? 'pressed';
  const texture = manifest.texture ?? 'smooth';
  const density = manifest.density ?? 'comfortable';
  const intensity = manifest.textureIntensity ?? 1;

  /* Site Layout — port of the prototype's `siteLayout` field on
     ThemedSite (themed-site.jsx). Three frames: 'stacked' (default,
     full scroll), 'boxed' (whole site as a card on a mat), 'split'
     (sticky-sidebar lockup). Resolution order:
       1. Explicit manifest.siteLayout (prototype-native naming) WINS
       2. Legacy manifest.pageLayout — mapped via LEGACY_PAGE_LAYOUT
          (classic→stacked, invitation→boxed, split→split). Existing
          published sites keep their look.
       3. activeEdition.recommendedLayout — Edition default
       4. 'stacked' — universal fallback */
  const siteLayout: NonNullable<typeof manifest.siteLayout> = (() => {
    if (manifest.siteLayout) return manifest.siteLayout;
    const legacy = manifest.pageLayout;
    if (legacy === 'invitation') return 'boxed';
    if (legacy === 'split') return 'split';
    if (legacy === 'classic') return 'stacked';
    if (activeEdition.recommendedLayout) return activeEdition.recommendedLayout;
    return 'stacked';
  })();

  /* Themed shell — emits the same data attributes ThemedSiteRenderer
     does so all the per-Edition / per-texture / per-kit CSS
     already shipped applies here too.

     CRITICAL: the activeEdition.recommendedTheme is STAMPED onto
     the root as CSS variables. Without this, every Edition
     rendered the same default cream-and-peach because the CSS
     was reading from fallbacks that never flipped. Now Cinema
     gets dark paper + gold accent, Coastal Ink gets navy + sea-
     glass, etc. Host's manifest.theme.colors WINS over the
     Edition defaults when set (per the read-time fallback
     contract). */
  const recTheme = activeEdition.recommendedTheme ?? {};
  const recColors = recTheme.colors ?? {};
  const recFonts = recTheme.fonts ?? {};
  /* Read host theme overrides — they win over the Edition. */
  const hostColors =
    ((manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors) ?? {};
  const hostFonts =
    ((manifest as unknown as { theme?: { fonts?: Record<string, string> } }).theme?.fonts) ?? {};
  /* Final values: host > Edition recommended > prototype default */
  const paper = hostColors.background ?? recColors.background ?? '#F5EFE2';
  const ink = hostColors.foreground ?? recColors.foreground ?? '#0E0D0B';
  const accent = hostColors.accent ?? recColors.accent ?? '#C6703D';
  const accentLight = hostColors.accentLight ?? recColors.accentLight ?? 'rgba(198,112,61,0.10)';
  const inkSoft = hostColors.muted ?? recColors.muted ?? '#3A332C';
  const cardBg = hostColors.cardBg ?? recColors.cardBg ?? '#FBF7EE';
  const displayFamily = hostFonts.heading ?? recFonts.heading ?? 'Fraunces';
  const bodyFamily = hostFonts.body ?? recFonts.body ?? 'Inter';
  /* Map cardRadius enum to actual px — matches the prototype's
     theme registry where each value reads as a distinct shape. */
  const cardRadiusPx = (() => {
    switch (recTheme.cardRadius) {
      case 'sharp': return '3px';
      case 'soft': return '8px';
      case 'rounded': return '14px';
      case 'pillow': return '24px';
      default: return '12px';
    }
  })();
  const displayWeight = recTheme.displayWeight ?? 600;
  const heroScale = recTheme.heroScale ?? 1;
  const eyebrowLs = recTheme.eyebrowSpacing ?? '0.22em';
  const cardShadow = recTheme.cardShadow ?? '0 4px 14px rgba(75,65,52,0.10)';

  /* Prototype theme overlay (integration guide §0 + handoff/shared/themes.jsx).
     When the manifest carries a themeId from the prototype catalog
     (santorini / tuscan / garden / editorial / midnight / coastal),
     the renderer emits the FULL --t-* token set via themeRootStyle()
     so every var(--t-paper), var(--t-section), var(--t-accent),
     var(--t-display) etc. throughout the site re-skins per theme.
     This is THE primary visual fix the guide calls out as "the one
     rule for visually spot-on." */
  const protoThemeId =
    ((manifest as unknown as { themeId?: string }).themeId)
    ?? ((manifest as unknown as { theme?: { id?: string; themeId?: string } }).theme?.id)
    ?? ((manifest as unknown as { theme?: { id?: string; themeId?: string } }).theme?.themeId);
  const protoTheme = getTheme(protoThemeId);

  /* Theme-Store packs apply their full --t-* token bag to
     manifest.themeVars (see src/lib/theme-store/apply.ts).
     When present, that bag wins over the 6-base-theme catalog so
     premium packs paint their exact look (shadow, radius, gold,
     rsvp, script, accent-2 etc.) — not just the 6-colour subset
     theme.colors carries. */
  const packThemeVars = (manifest as unknown as { themeVars?: Record<string, string> }).themeVars;
  const protoThemeStyle = useMemo(
    () => themeRootStyle(protoTheme, density as ThemeDensity, packThemeVars ?? null),
    [protoTheme, density, packThemeVars],
  );

  /* Memoized — shellStyle is the root <div> style prop. Without
     this, every render produces a new object reference, which
     forces React to diff every CSS var and breaks downstream
     style-equality optimizations. The CSS values (paper / ink /
     accent / etc.) only change when the host edits theme / edition
     / texture / density — not on every keystroke in a chapter. */
  const shellStyle: React.CSSProperties = useMemo(
    () => ({
      background: paper,
      color: ink,
      minHeight: '100vh',
      position: 'relative',
      fontFamily: bodyFamily,
      /* Edition-driven CSS vars — every section reads these. */
      ['--paper' as string]: paper,
      ['--ink' as string]: ink,
      ['--ink-soft' as string]: inkSoft,
      ['--ink-muted' as string]: '#6F6557',
      ['--peach-ink' as string]: accent,
      ['--peach-bg' as string]: accentLight,
      ['--card' as string]: cardBg,
      ['--cream' as string]: paper,
      ['--cream-2' as string]: cardBg,
      ['--line' as string]: 'rgba(14,13,11,0.16)',
      ['--line-soft' as string]: 'rgba(14,13,11,0.08)',
      ['--gold' as string]: '#B8935A',
      ['--font-display' as string]: `"${displayFamily}", Georgia, serif`,
      ['--font-ui' as string]: `"${bodyFamily}", system-ui, sans-serif`,
      /* Per-edition typography + chrome multipliers */
      ['--pl-display-wght' as string]: String(displayWeight),
      ['--pl-hero-scale' as string]: String(heroScale),
      ['--pl-eyebrow-ls' as string]: eyebrowLs,
      ['--pl-card-radius' as string]: cardRadiusPx,
      ['--pl-card-shadow' as string]: cardShadow,
      /* Density + texture multipliers */
      ['--pl-texture-intensity' as string]: String(intensity),
      ['--pl-density-scale' as string]: String(
        density === 'cozy' ? 0.7 : density === 'spacious' ? 1.3 : 1,
      ),
      /* Prototype theme overlay: when the host has selected a theme
         from the prototype catalog, its --t-* + shadowed base vars
         take precedence over the Edition defaults above. Spread LAST
         so the theme wins. */
      ...protoThemeStyle,
    }),
    [
      paper,
      ink,
      inkSoft,
      accent,
      accentLight,
      cardBg,
      displayFamily,
      bodyFamily,
      displayWeight,
      heroScale,
      eyebrowLs,
      cardRadiusPx,
      cardShadow,
      intensity,
      density,
      protoThemeStyle,
    ],
  );

  /* Editor canvas context — every <EditableText> / <EditableField>
     beneath this renderer reads `editMode` and `onEditField` from
     this provider, so we never have to prop-drill through every
     section component. Identical pattern to ThemedSiteRenderer. */
  const canvasCtxValue = useMemo(
    () => ({ editMode: canEdit, onEditField }),
    [canEdit, onEditField],
  );

  return (
    <EditorCanvasProvider value={canvasCtxValue}>
    <div
      className={`pl8-guest${siteLayout !== 'stacked' ? ` pl8-layout-${siteLayout}` : ''}`}
      data-pl-edition={activeEdition.id}
      data-pl-texture={texture}
      data-pl-density={density}
      data-pl-kit={manifest.kitId ?? 'classic'}
      /* Both attributes live on the root — data-pl-site-layout is the
         prototype-native naming (stacked / boxed / split) that all
         new CSS reads; data-pl-page-layout preserves the legacy
         classic / invitation / split CSS already in pearloom.css so
         existing surfaces keep working. The class hooks
         (pl8-layout-boxed / pl8-layout-split) give CSS a second
         selector axis matching the prototype's class-based scope. */
      data-pl-site-layout={siteLayout}
      data-pl-page-layout={
        manifest.pageLayout ??
        (siteLayout === 'boxed' ? 'invitation' : siteLayout === 'split' ? 'split' : 'classic')
      }
      data-pl-pattern={manifest.pattern ?? 'none'}
      data-pl-edit-mode={canEdit ? 'true' : undefined}
      style={shellStyle}
    >
      {/* PatternLayer — direct port of prototype themes.jsx §3b.
          MUST be the first child so it sits BEHIND everything
          (zIndex 0, pointer-events: none). CSS lives in
          pearloom.css under the "── PatternLayer ──" section.
          Renders an empty transparent layer when pattern is
          'none' / undefined so the DOM node is stable. */}
      <div
        className="pl8-pattern-layer"
        data-pl-pattern={manifest.pattern ?? 'none'}
        aria-hidden="true"
      />
      <TextureFilters />

      {/* Day-of broadcast chrome — ports the ThemedSiteRenderer mount
          pattern verbatim. All three gated on !editMode so the
          editor canvas stays clean.

          DayOfBanner is the sticky day-of state strip (pre / live
          / post — pulls from manifest.eventDate). It renders
          before the nav so its sticky top:0 / zIndex:240 stacks
          above ThemedNav's sticky top:0 / zIndex:40.

          BroadcastBar is the sticky "live update" peach strip
          fed by /api/sites/live-updates polling every 30s.
          Suppressed when computeDayOfState(manifest).active so
          the day-of banner owns the sticky top during the
          highest-attention window — stacking both creates
          competing colored bars guests can't parse.

          GuestPearChat is floating chrome (bottom-right pill).
          Order in the tree doesn't affect layout — it self-
          positions fixed. */}
      {!editMode && <GuestPearChat manifest={manifest} coupleNames={namesTuple} domain={siteSlug} />}
      {!editMode && <GuestRsvpModal siteSlug={siteSlug} manifest={manifest} />}
      {!editMode && <DayOfBanner manifest={manifest} />}
      {!editMode && !computeDayOfState(manifest).active && <BroadcastBar subdomain={siteSlug} />}
      {/* Scroll-reveal driver — published site only. Sets
          data-pl-reveal="pending" on every <section> at mount and
          flips each to "shown" as it crosses the viewport; the
          actual fade-rise transition lives in pearloom.css. Skipped
          in editMode so the editor canvas never starts sections
          hidden (would block click targeting + edit affordances).
          Honors prefers-reduced-motion internally. */}
      {!editMode && <ScrollReveal />}

      {/* Sub-nav — port of the prototype's themed-site.jsx nav.
          Sticky at top with brand left, section links center,
          RSVP pill right. Reads manifest to auto-hide links
          whose target section is empty. */}
      <ThemedNav manifest={manifest} names={namesTuple} />

      {/* Section stack — prototype's ThemedSite renders sections
          in event.sections order. For the scaffold pass we render
          the canonical 8 in the prototype's default order.

          Hero only renders when showHero is true (i.e. scroll mode
          or multi-page home). Sub-page routes get a focused single-
          block view with no hero — matches ThemedSiteRenderer. */}
      {showHero && (
        <ThemedHero manifest={manifest} names={namesTuple} motif={motif} onEditField={onEditField} onEditNames={onEditNames} />
      )}

      {/* ── V8 Decor system — additive layer over MotifScatter ──
          Three pieces from ThemedSiteRenderer port over here. The
          AI-banner + per-template signature illustration is mounted
          per-section (see below) so each section can resolve its
          own visibility. OccasionDecor is mounted inside the hero
          variant via ThemedHero's own decorMode branch. */}

      {/* Section stack in the prototype's default order. Each
          section returns null when its data is empty AND we're
          not in editMode. In editMode, an editable placeholder
          renders instead so the host sees scaffolding for every
          section they could fill.

          Multi-page filter — every canonical SiteBlockKey section
          is gated on shouldRenderBlock(); the non-key extras
          (countdown / weddingParty / map / spotify / hashtag /
          guestbook) are gated on showHomeExtras so they appear on
          scroll-mode + multi-page home, but never on a focused
          sub-page. Dividers between two suppressed neighbours are
          themselves suppressed via showDividerBefore() so a sub-
          page doesn't render orphan dividers around its single
          block.

          Edition divider rhythm — between each pair of sections we
          mount an <EditionDivider> styled by the active Edition
          (thread / sprocket / stitch / gold-hairline / whitespace).
          The dividers self-reveal on scroll via the useScrollReveal
          hook inside edition-dividers/index.tsx. Matches V8's
          inter-section rhythm. */}
      {showHomeExtras && <ThemedCountdown manifest={manifest} editMode={editMode} />}
      {showDividerBefore('story') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="story" index={0} />
      )}
      {shouldRenderBlock('story') && (
        <ThemedStory manifest={manifest} motif={motif} editMode={editMode} onEditField={onEditField} />
      )}
      {showDividerBefore('weddingParty') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="weddingParty" index={1} />
      )}
      {/* PullQuote removed — not in the design prototype; the
          story chapters carry the editorial rhythm on their own. */}
      {showHomeExtras && <ThemedWeddingParty manifest={manifest} />}
      {showDividerBefore('details') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="details" index={2} />
      )}
      {shouldRenderBlock('details') && (
        <ThemedDetails manifest={manifest} motif={motif} editMode={editMode} onEditField={onEditField} />
      )}
      {showDividerBefore('schedule') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="schedule" index={3} />
      )}
      {shouldRenderBlock('schedule') && (
        <ThemedSchedule manifest={manifest} editMode={editMode} onEditField={onEditField} />
      )}
      {showDividerBefore('map') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="map" index={4} />
      )}
      {showHomeExtras && <ThemedMap manifest={manifest} />}
      {showDividerBefore('travel') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="travel" index={5} />
      )}
      {shouldRenderBlock('travel') && (
        <ThemedTravel manifest={manifest} motif={motif} editMode={editMode} onEditField={onEditField} />
      )}
      {showDividerBefore('registry') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="registry" index={6} />
      )}
      {shouldRenderBlock('registry') && (
        <ThemedRegistry manifest={manifest} editMode={editMode} onEditField={onEditField} />
      )}
      {showDividerBefore('gallery') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="gallery" index={7} />
      )}
      {shouldRenderBlock('gallery') && (
        <ThemedGallery manifest={manifest} editMode={editMode} onEditField={onEditField} />
      )}
      {showDividerBefore('spotify') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="spotify" index={8} />
      )}
      {showHomeExtras && <ThemedSpotify manifest={manifest} />}
      {showDividerBefore('hashtag') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="hashtag" index={9} />
      )}
      {showHomeExtras && <ThemedHashtag manifest={manifest} />}
      {showDividerBefore('rsvp') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="rsvp" index={10} />
      )}
      {shouldRenderBlock('rsvp') && (
        <ThemedRsvp manifest={manifest} siteSlug={siteSlug} />
      )}
      {showDividerBefore('faq') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="faq" index={11} />
      )}
      {shouldRenderBlock('faq') && (
        <ThemedFaq manifest={manifest} editMode={editMode} onEditField={onEditField} />
      )}
      {showDividerBefore('guestbook') && (
        <ThemedDecorDivider manifest={manifest} activeEdition={activeEdition} sectionKey="guestbook" index={12} />
      )}
      {showHomeExtras && <ThemedGuestbook manifest={manifest} names={namesTuple} siteSlug={siteSlug} />}

      {/* Event-OS custom blocks — itinerary, costSplitter,
          activityVote, toastSignup, adviceWall/tributeWall,
          obituary, livestream, privacyGate, packingList, program.
          Mounted after the canonical section stack and before
          the footer. Only renders on scroll mode + multi-page
          home (sub-page routes get a focused single-section view
          and skip the rail). Unknown block types fall through to
          a "coming soon" placeholder in edit mode only. */}
      {showHomeExtras && (
        <ThemedCustomBlocks manifest={manifest} siteSlug={siteSlug} editMode={canEdit} />
      )}

      <ThemedFooter siteSlug={siteSlug} names={namesTuple} manifest={manifest} />
    </div>
    </EditorCanvasProvider>
  );
}

/* ─── ThemedNav — sticky sub-nav.
 *
 * Dispatches on `manifest.nav?.style` (9 desktop variants) and
 * `manifest.nav?.mobileStyle` (4 mobile variants). CSS for every
 * variant lives in pearloom.css.
 *
 * Default classic variant retains the prototype's dotted-underline
 * link treatment with the peach RSVP pill so existing themed sites
 * keep their look. The other 8 desktop variants and all 4 mobile
 * variants reuse the same pl8-nav-* class hooks as ThemedSiteRenderer. */

type ThemedNavLink = { label: string; href: string };

interface ThemedNavBodyProps {
  navStyle: string;
  scrolled: boolean;
  coupleLabel: string;
  links: ThemedNavLink[];
  rsvpHref: string;
  brandHref: string;
  manifest: StoryManifest;
}

const THEMED_NAV_LINK_STYLE: React.CSSProperties = {
  fontSize: 13.5,
  color: 'var(--nav-ink-soft, var(--ink-soft, #3A332C))',
  fontWeight: 500,
  textDecoration: 'none',
  position: 'relative',
  paddingBottom: 4,
  transition: 'color var(--pl-dur-fast) var(--pl-ease-out)',
};

function ThemedNavLinks({ links, gap = 22 }: { links: ThemedNavLink[]; gap?: number }) {
  return (
    <nav style={{ display: 'flex', gap, alignItems: 'center' }} className="pl8-site-nav-links">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          style={THEMED_NAV_LINK_STYLE}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--peach-ink, var(--pl-olive, #C6703D))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '';
          }}
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}

function ThemedNavBrand({ manifest, label, size, href }: { manifest: StoryManifest; label: string; size: number; href: string }) {
  return (
    <a
      href={href}
      className="pl8-site-nav-brand"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        textDecoration: 'none',
        transition: 'transform var(--pl-dur-slow) var(--pl-ease-spring)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(-2deg) translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
    >
      <NavBrandIcon manifest={manifest} size={size} />
      <span
        className="display-italic"
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontStyle: 'italic',
          fontSize: Math.max(16, Math.round(size * 0.78)),
          color: 'var(--nav-ink, var(--ink, #0E0D0B))',
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </span>
    </a>
  );
}

/* Themed-flavoured RSVP pill — peach-on-cream to keep the prototype
   identity even on the new desktop variants. */
function ThemedRsvpPill({ href, compact }: { href: string; compact?: boolean }) {
  return (
    <a
      href={href}
      onClick={() => {
        // Progressive enhancement: dispatch the modal-open event but
        // do NOT preventDefault — the anchor still scrolls to #rsvp
        // as a fallback when the modal isn't mounted (e.g. JS-off
        // browsers, scrape-style previews, an old PublishedSiteShell
        // build). Modal listeners read window events synchronously
        // so the modal opens at the same paint as the scroll begins;
        // when both fire, the modal wins visually because it's fixed
        // overlay above the page.
        try {
          window.dispatchEvent(new CustomEvent('pl-open-rsvp'));
        } catch {
          /* noop */
        }
      }}
      className="pl8-nav-rsvp"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '6px 12px' : '7px 16px',
        borderRadius: 999,
        background: 'var(--peach-ink, var(--pl-olive, #C6703D))',
        color: 'var(--cream, #FBF7EE)',
        fontSize: compact ? 11 : 11.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textDecoration: 'none',
      }}
    >
      RSVP <Icon name="arrow-right" size={11} />
    </a>
  );
}

function ThemedNavBody({ navStyle, scrolled, coupleLabel, links, rsvpHref, brandHref, manifest }: ThemedNavBodyProps) {
  const innerPadding = scrolled ? '10px 32px' : '14px 32px';

  // ── Centered: brand centered, links split left/right around it. ──
  if (navStyle === 'centered') {
    const half = Math.ceil(links.length / 2);
    const left = links.slice(0, half);
    const right = links.slice(half);
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: innerPadding, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 28, transition: 'padding var(--pl-dur-slow) var(--pl-ease-out)' }}>
        <ThemedNavLinks links={left} gap={22} />
        <ThemedNavBrand manifest={manifest} label={coupleLabel} size={28} href={brandHref} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 18 }}>
          <ThemedNavLinks links={right} gap={22} />
          <ThemedRsvpPill href={rsvpHref} />
        </div>
      </div>
    );
  }

  // ── Minimal: brand only, no inline links. ──
  if (navStyle === 'minimal') {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: innerPadding, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28, transition: 'padding var(--pl-dur-slow) var(--pl-ease-out)' }}>
        <ThemedNavBrand manifest={manifest} label={coupleLabel} size={26} href={brandHref} />
        <ThemedRsvpPill href={rsvpHref} />
      </div>
    );
  }

  // ── Stacked: brand on its own row, links underneath. ──
  if (navStyle === 'stacked') {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: innerPadding, display: 'flex', flexDirection: 'column', gap: 8, transition: 'padding var(--pl-dur-slow) var(--pl-ease-out)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <ThemedNavBrand manifest={manifest} label={coupleLabel} size={32} href={brandHref} />
          <ThemedRsvpPill href={rsvpHref} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--nav-divider, rgba(14,13,11,0.08))', paddingTop: 8 }}>
          <ThemedNavLinks links={links} gap={26} />
        </div>
      </div>
    );
  }

  // ── Hairline horizontal: single thin row, maximum restraint. ──
  if (navStyle === 'hairline-horizontal') {
    return (
      <div className="pl8-nav-hairline" style={{ maxWidth: 1240, margin: '0 auto', padding: scrolled ? '8px 32px' : '11px 32px', display: 'flex', alignItems: 'center', gap: 24, transition: 'padding var(--pl-dur-slow) var(--pl-ease-out)' }}>
        <ThemedNavBrand manifest={manifest} label={coupleLabel} size={22} href={brandHref} />
        <div style={{ marginLeft: 'auto' }}>
          <ThemedNavLinks links={links} gap={20} />
        </div>
        <a
          href={rsvpHref}
          onClick={() => { try { window.dispatchEvent(new CustomEvent('pl-open-rsvp')); } catch { /* noop */ } }}
          className="pl8-nav-rsvp-hairline"
          style={{
            fontSize: 12,
            padding: '6px 14px',
            borderRadius: 0,
            border: '1px solid var(--nav-ink, var(--ink, #0E0D0B))',
            color: 'var(--nav-ink, var(--ink, #0E0D0B))',
            textDecoration: 'none',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
          }}
        >
          RSVP
        </a>
      </div>
    );
  }

  // ── Centered lockup: names + glyph centred, two links flanking each side. ──
  if (navStyle === 'centered-lockup') {
    const half = Math.ceil(links.length / 2);
    const left = links.slice(0, half);
    const right = links.slice(half);
    return (
      <div className="pl8-nav-centered-lockup" style={{ maxWidth: 1240, margin: '0 auto', padding: innerPadding, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 32, transition: 'padding var(--pl-dur-slow) var(--pl-ease-out)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <ThemedNavLinks links={left} gap={26} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <ThemedNavBrand manifest={manifest} label={coupleLabel} size={30} href={brandHref} />
          <span aria-hidden style={{ display: 'block', width: 32, height: 1, background: 'var(--pl-gold, #B8935A)', opacity: 0.6 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 18 }}>
          <ThemedNavLinks links={right} gap={26} />
          <ThemedRsvpPill href={rsvpHref} />
        </div>
      </div>
    );
  }

  // ── Stacked editorial: large names on top, hairline rule, mono link row. ──
  if (navStyle === 'stacked-editorial') {
    return (
      <div className="pl8-nav-stacked-editorial" style={{ maxWidth: 1240, margin: '0 auto', padding: scrolled ? '12px 32px' : '18px 32px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'padding var(--pl-dur-slow) var(--pl-ease-out)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <ThemedNavBrand manifest={manifest} label={coupleLabel} size={34} href={brandHref} />
          <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
            <ThemedRsvpPill href={rsvpHref} />
          </div>
        </div>
        <div className="pl8-nav-editorial-rule" style={{ height: 1, background: 'var(--nav-divider, rgba(14,13,11,0.12))', margin: '0 auto', width: '100%', maxWidth: 920 }} />
        <nav className="pl8-site-nav-links pl8-nav-editorial-links" style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              style={{
                fontSize: 10.5,
                fontFamily: 'var(--font-ui, var(--pl-font-mono, monospace))',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--nav-ink-soft, var(--ink-soft, #3A332C))',
                textDecoration: 'none',
                transition: 'color var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    );
  }

  // ── Folio page-number: mono-uppercased section labels with leading gold dot. ──
  if (navStyle === 'folio-page-number') {
    return (
      <div className="pl8-nav-folio" style={{ maxWidth: 1240, margin: '0 auto', padding: innerPadding, display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: 24, transition: 'padding var(--pl-dur-slow) var(--pl-ease-out)' }}>
        <ThemedNavBrand manifest={manifest} label={coupleLabel} size={26} href={brandHref} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 22, flexWrap: 'wrap' }}>
          <nav style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {links.map((l, i) => (
              <a
                key={l.label}
                href={l.href}
                className="pl8-nav-folio-link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 10.5,
                  fontFamily: 'var(--font-ui, var(--pl-font-mono, monospace))',
                  fontWeight: 600,
                  letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color: 'var(--nav-ink-soft, var(--ink-soft, #3A332C))',
                  textDecoration: 'none',
                }}
              >
                <span aria-hidden style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: 'var(--pl-gold, #B8935A)' }} />
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                {l.label}
              </a>
            ))}
          </nav>
          <ThemedRsvpPill href={rsvpHref} />
        </div>
      </div>
    );
  }

  // ── Floating pill: sticky centred pill, compacts on scroll. ──
  if (navStyle === 'floating-pill') {
    return (
      <div className="pl8-nav-floating-pill-wrap" style={{ maxWidth: 1280, margin: '0 auto', padding: scrolled ? '8px 16px' : '14px 16px', display: 'flex', justifyContent: 'center', transition: 'padding var(--pl-dur-slow) var(--pl-ease-out)' }}>
        <div
          className="pl8-nav-floating-pill"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: scrolled ? 14 : 22,
            padding: scrolled ? '8px 14px' : '10px 18px',
            borderRadius: 999,
            background: 'var(--nav-pill-bg, rgba(244,236,216,0.86))',
            border: '1px solid var(--nav-pill-border, rgba(14,13,11,0.10))',
            backdropFilter: 'blur(14px) saturate(1.1)',
            WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
            boxShadow: scrolled ? '0 10px 24px -14px rgba(40,28,12,0.20)' : '0 8px 20px -16px rgba(40,28,12,0.14)',
            transition: 'padding var(--pl-dur-slow) var(--pl-ease-out), gap var(--pl-dur-slow) var(--pl-ease-out), box-shadow var(--pl-dur-slow) var(--pl-ease-out)',
            maxWidth: '100%',
          }}
        >
          <ThemedNavBrand manifest={manifest} label={coupleLabel} size={scrolled ? 22 : 26} href={brandHref} />
          <span aria-hidden style={{ display: 'inline-block', width: 1, height: 18, background: 'var(--nav-divider, rgba(14,13,11,0.18))' }} />
          <ThemedNavLinks links={links} gap={scrolled ? 14 : 18} />
          <ThemedRsvpPill href={rsvpHref} compact />
        </div>
      </div>
    );
  }

  // ── Classic (default): brand left, links centre, peach RSVP right.
  //    Keeps the Themed prototype's signature dotted-underline links. ──
  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: innerPadding, display: 'flex', alignItems: 'center', gap: 18, transition: 'padding var(--pl-dur-slow) var(--pl-ease-out)' }}>
      <ThemedNavBrand manifest={manifest} label={coupleLabel} size={26} href={brandHref} />
      <nav
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          gap: 22,
          opacity: 0.95,
        }}
      >
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            style={{
              color: 'var(--ink-soft, #3A332C)',
              textDecoration: 'none',
              padding: '4px 2px',
              fontSize: 12.5,
              borderBottom: '1px dotted transparent',
              transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderBottomColor = 'var(--peach-ink, #C6703D)';
              e.currentTarget.style.color = 'var(--peach-ink, #C6703D)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderBottomColor = 'transparent';
              e.currentTarget.style.color = '';
            }}
          >
            {l.label}
          </a>
        ))}
      </nav>
      <ThemedRsvpPill href={rsvpHref} />
    </div>
  );
}

/* ───── Mobile nav body — ports MobileNavBody's 4 variants. ───── */
interface ThemedMobileNavBodyProps {
  mobileStyle: 'drawer-hamburger' | 'sticky-bottom-pill' | 'hairline-collapsing' | 'folded-expand';
  coupleLabel: string;
  links: ThemedNavLink[];
  rsvpHref: string;
  brandHref: string;
  manifest: StoryManifest;
  scrolled: boolean;
}

function ThemedMobileNavBody({ mobileStyle, coupleLabel, links, rsvpHref, brandHref, manifest, scrolled }: ThemedMobileNavBodyProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  function onLinkTap() { setMenuOpen(false); }

  // ── Drawer hamburger ──
  if (mobileStyle === 'drawer-hamburger') {
    return (
      <>
        <div className="pl8-mnav-bar pl8-mnav-drawer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', minHeight: 56 }}>
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            style={{ width: 36, height: 36, padding: 0, border: 'none', background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--nav-ink, var(--ink, #0E0D0B))' }}
          >
            <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, alignItems: 'stretch', width: 18 }}>
              <span style={{ height: 1.5, background: 'currentColor', transition: 'transform var(--pl-dur-fast) var(--pl-ease-out)', transform: menuOpen ? 'translateY(2.75px) rotate(45deg)' : undefined }} />
              <span style={{ height: 1.5, background: 'currentColor', opacity: menuOpen ? 0 : 1, transition: 'opacity var(--pl-dur-fast) var(--pl-ease-out)' }} />
              <span style={{ height: 1.5, background: 'currentColor', transition: 'transform var(--pl-dur-fast) var(--pl-ease-out)', transform: menuOpen ? 'translateY(-2.75px) rotate(-45deg)' : undefined }} />
            </span>
          </button>
          <ThemedNavBrand manifest={manifest} label={coupleLabel} size={20} href={brandHref} />
          <ThemedRsvpPill href={rsvpHref} compact />
        </div>
        <div
          aria-hidden={!menuOpen}
          className="pl8-mnav-drawer-sheet"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'var(--paper, rgba(247,242,228,0.98))',
            borderBottom: '1px solid var(--nav-divider, rgba(14,13,11,0.10))',
            maxHeight: menuOpen ? '70vh' : 0,
            overflow: 'hidden',
            opacity: menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? 'auto' : 'none',
            transition: 'max-height var(--pl-dur-slow) var(--pl-ease-out), opacity var(--pl-dur-fast) var(--pl-ease-out)',
            backdropFilter: 'blur(16px) saturate(140%)',
            WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', padding: '12px 20px 24px' }}>
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={onLinkTap}
                style={{
                  padding: '14px 4px',
                  fontSize: 18,
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontStyle: 'italic',
                  color: 'var(--nav-ink, var(--ink, #0E0D0B))',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--nav-divider, rgba(14,13,11,0.08))',
                }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </>
    );
  }

  // ── Sticky bottom pill ──
  if (mobileStyle === 'sticky-bottom-pill') {
    return (
      <>
        <div className="pl8-mnav-bar pl8-mnav-sticky-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px', minHeight: 44 }}>
          <ThemedNavBrand manifest={manifest} label={coupleLabel} size={18} href={brandHref} />
        </div>
        <div
          className="pl8-mnav-bottom-pill-mount"
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 'max(14px, env(safe-area-inset-bottom))',
            zIndex: 42,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ position: 'relative', pointerEvents: 'auto', maxWidth: 480, width: '100%' }}>
            <div
              aria-hidden={!menuOpen}
              style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
                background: 'var(--paper, rgba(247,242,228,0.98))',
                border: '1px solid var(--nav-divider, rgba(14,13,11,0.10))',
                borderRadius: 16,
                boxShadow: '0 16px 32px -10px rgba(40,28,12,0.25)',
                maxHeight: menuOpen ? '60vh' : 0,
                overflow: 'hidden',
                opacity: menuOpen ? 1 : 0,
                pointerEvents: menuOpen ? 'auto' : 'none',
                transition: 'max-height var(--pl-dur-slow) var(--pl-ease-out), opacity var(--pl-dur-fast) var(--pl-ease-out)',
                backdropFilter: 'blur(16px) saturate(140%)',
                WebkitBackdropFilter: 'blur(16px) saturate(140%)',
              }}
            >
              <nav style={{ display: 'flex', flexDirection: 'column', padding: '6px 0' }}>
                {links.map((l) => (
                  <a key={l.label} href={l.href} onClick={onLinkTap} style={{ padding: '14px 22px', fontSize: 16, color: 'var(--nav-ink, var(--ink, #0E0D0B))', textDecoration: 'none' }}>
                    {l.label}
                  </a>
                ))}
              </nav>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 6,
                borderRadius: 999,
                background: 'var(--nav-pill-bg, rgba(244,236,216,0.94))',
                border: '1px solid var(--nav-pill-border, rgba(14,13,11,0.12))',
                boxShadow: '0 12px 28px -10px rgba(40,28,12,0.22)',
                backdropFilter: 'blur(14px) saturate(140%)',
                WebkitBackdropFilter: 'blur(14px) saturate(140%)',
              }}
            >
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none', background: 'transparent',
                  fontSize: 13, fontWeight: 600,
                  fontFamily: 'inherit',
                  color: 'var(--nav-ink, var(--ink, #0E0D0B))',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 999,
                }}
              >
                {menuOpen ? 'Close' : 'Chapters'}
              </button>
              <ThemedRsvpPill href={rsvpHref} compact />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Hairline collapsing ──
  if (mobileStyle === 'hairline-collapsing') {
    return (
      <div className="pl8-mnav-bar pl8-mnav-hairline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', minHeight: 44 }}>
        <ThemedNavBrand manifest={manifest} label={coupleLabel} size={16} href={brandHref} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href={rsvpHref} onClick={() => { try { window.dispatchEvent(new CustomEvent('pl-open-rsvp')); } catch { /* noop */ } }} className="pl8-mnav-rsvp-chip" style={{ fontSize: 10.5, padding: '5px 10px', borderRadius: 999, border: '1px solid var(--nav-ink-soft, var(--ink-soft, #3A332C))', color: 'var(--nav-ink, var(--ink, #0E0D0B))', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>RSVP</a>
          <button
            type="button"
            aria-label={menuOpen ? 'Close chapter menu' : 'Open chapter menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            style={{ width: 36, height: 36, padding: 0, border: 'none', background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--nav-ink, var(--ink, #0E0D0B))' }}
          >
            <span style={{ display: 'inline-block', width: 12, height: 12, position: 'relative' }}>
              <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'inline-block', borderLeft: '1.5px solid currentColor', borderBottom: '1.5px solid currentColor', width: 8, height: 8, top: 1, left: 2, transform: menuOpen ? 'rotate(135deg)' : 'rotate(-45deg)', transition: 'transform var(--pl-dur-fast) var(--pl-ease-out)' }} />
            </span>
          </button>
        </div>
        <div
          aria-hidden={!menuOpen}
          className="pl8-mnav-hairline-sheet"
          style={{
            position: 'absolute', top: '100%', right: 12, minWidth: 200,
            background: 'var(--paper, rgba(247,242,228,0.98))',
            border: '1px solid var(--nav-divider, rgba(14,13,11,0.12))',
            borderRadius: 12,
            boxShadow: '0 12px 32px -12px rgba(40,28,12,0.20)',
            maxHeight: menuOpen ? '60vh' : 0,
            overflow: 'hidden',
            opacity: menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? 'auto' : 'none',
            transition: 'max-height var(--pl-dur-slow) var(--pl-ease-out), opacity var(--pl-dur-fast) var(--pl-ease-out)',
            backdropFilter: 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            marginTop: 4,
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', padding: '6px 0' }}>
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={onLinkTap}
                style={{ padding: '12px 18px', fontSize: 14, color: 'var(--nav-ink, var(--ink, #0E0D0B))', textDecoration: 'none' }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    );
  }

  // ── Folded expand: hidden until scrolled past hero. ──
  return (
    <div
      className="pl8-mnav-bar pl8-mnav-folded"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        minHeight: 40,
        opacity: scrolled ? 1 : 0,
        transform: scrolled ? 'translateY(0)' : 'translateY(-100%)',
        pointerEvents: scrolled ? 'auto' : 'none',
        transition: 'opacity var(--pl-dur-base) var(--pl-ease-out), transform var(--pl-dur-base) var(--pl-ease-out)',
      }}
    >
      <ThemedNavBrand manifest={manifest} label={coupleLabel} size={16} href={brandHref} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          style={{ width: 32, height: 32, padding: 0, border: 'none', background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--nav-ink, var(--ink, #0E0D0B))' }}
        >
          <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, alignItems: 'stretch', width: 16 }}>
            <span style={{ height: 1.5, background: 'currentColor' }} />
            <span style={{ height: 1.5, background: 'currentColor' }} />
            <span style={{ height: 1.5, background: 'currentColor' }} />
          </span>
        </button>
      </div>
      <div
        aria-hidden={!menuOpen}
        style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--paper, rgba(247,242,228,0.98))',
          maxHeight: menuOpen ? '70vh' : 0,
          overflow: 'hidden',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'max-height var(--pl-dur-slow) var(--pl-ease-out), opacity var(--pl-dur-fast) var(--pl-ease-out)',
          borderBottom: '1px solid var(--nav-divider, rgba(14,13,11,0.10))',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        }}
      >
        <nav style={{ display: 'flex', flexDirection: 'column', padding: '12px 20px 18px' }}>
          {links.map((l) => (
            <a key={l.label} href={l.href} onClick={onLinkTap} style={{ padding: '12px 4px', fontSize: 16, fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontStyle: 'italic', color: 'var(--nav-ink, var(--ink, #0E0D0B))', textDecoration: 'none', borderBottom: '1px solid var(--nav-divider, rgba(14,13,11,0.08))' }}>
              {l.label}
            </a>
          ))}
          <a
            href={rsvpHref}
            onClick={() => {
              try { window.dispatchEvent(new CustomEvent('pl-open-rsvp')); } catch { /* noop */ }
              onLinkTap();
            }}
            style={{ marginTop: 12, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, background: 'var(--peach-ink, #C6703D)', color: 'var(--cream, #FBF7EE)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textDecoration: 'none' }}
          >
            RSVP
          </a>
        </nav>
      </div>
    </div>
  );
}

/* React.memo — nav owns its own scroll + ResizeObserver state and
   only its rendered links/branding change when the manifest's
   nav config or names change. Wrapping in memo lets it skip
   re-render on every keystroke deep in a chapter/event edit. */
const ThemedNav = memo(function ThemedNav({ manifest, names }: { manifest: StoryManifest; names: [string, string] }) {
  const [n1, n2] = names;
  const coupleLabel = n1 && n2 ? `${n1} & ${n2}` : (n1 || n2 || 'Our celebration');
  const baseLinks: ThemedNavLink[] = [
    { label: 'Story',    href: '#our-story' },
    { label: 'Details',  href: '#details' },
    { label: 'Schedule', href: '#schedule' },
    { label: 'Travel',   href: '#travel' },
    { label: 'Registry', href: '#registry' },
    { label: 'Gallery',  href: '#gallery' },
    { label: 'FAQ',      href: '#faq' },
  ];
  const rsvpHref = '#rsvp';
  const brandHref = '#top';

  const navStyle = manifest.nav?.style ?? 'classic';
  const mobileStyle = manifest.nav?.mobileStyle;

  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Container-aware mobile switch.
  //
  // We can't use window.matchMedia('(max-width: 720px)') here because
  // the editor renders the site inside `.pl8-canvas-device-frame`,
  // which is a CSS container (container-type: inline-size, name
  // pl-site) whose width is driven by the editor's device picker
  // (390 / 820 / 1280px), not the browser window. matchMedia reads
  // the actual viewport, so it never flipped to mobile in the editor
  // — the Look Engine could pick a mobile nav variant and the canvas
  // would silently keep rendering the desktop nav.
  //
  // Instead we observe the rendered width of the nearest .pl8-guest
  // ancestor with a ResizeObserver. On the published site .pl8-guest
  // spans the viewport, so this still flips at 720px just like the
  // old matchMedia path. In the editor it flips when the device-frame
  // container narrows past 720px (i.e. when the host picks phone). The
  // 720px threshold matches pearloom.css site responsive rules.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const header = headerRef.current;
    if (!header) return;
    const guest = header.closest('.pl8-guest') as HTMLElement | null;
    const target: HTMLElement = guest ?? header;
    if (typeof ResizeObserver === 'undefined') {
      // Fallback for environments without ResizeObserver — read once.
      setIsMobile(target.getBoundingClientRect().width < 720);
      return;
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setIsMobile(w < 720);
      }
    });
    ro.observe(target);
    return () => ro.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className={`pl8-themed-nav pl8-site-nav${scrolled ? ' pl8-site-nav-scrolled' : ''}`}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: scrolled ? 'var(--paper, #F5EFE2)' : 'rgba(245,239,226,0.86)',
        borderBottom: scrolled
          ? '1px solid var(--line-soft, rgba(14,13,11,0.08))'
          : '1px solid transparent',
        fontSize: 12.5,
        color: 'var(--ink-soft, #3A332C)',
        backdropFilter: scrolled ? 'blur(18px) saturate(160%)' : 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(160%)' : 'blur(12px) saturate(140%)',
        transition: 'background var(--pl-dur-slow) var(--pl-ease-out), backdrop-filter var(--pl-dur-slow) var(--pl-ease-out), border-color var(--pl-dur-slow) var(--pl-ease-out)',
      }}
    >
      {isMobile && mobileStyle ? (
        <ThemedMobileNavBody
          mobileStyle={mobileStyle}
          coupleLabel={coupleLabel}
          links={baseLinks}
          rsvpHref={rsvpHref}
          brandHref={brandHref}
          manifest={manifest}
          scrolled={scrolled}
        />
      ) : (
        <ThemedNavBody
          navStyle={navStyle}
          scrolled={scrolled}
          coupleLabel={coupleLabel}
          links={baseLinks}
          rsvpHref={rsvpHref}
          brandHref={brandHref}
          manifest={manifest}
        />
      )}
    </header>
  );
});

/* ───── EmptyStateCallout ──────────────────────────────────
   Editorial-but-clearly-scaffolding placeholder rendered in
   editMode for sections whose data is empty. Tells the host
   what would appear here and how to add it. Public site never
   sees this — it's gated on the editMode prop in each section. */
function EmptyStateCallout({
  eyebrow,
  title,
  italic,
  body,
  cta,
  background = 'var(--paper, #F5EFE2)',
  id,
}: {
  eyebrow: string;
  title: string;
  italic?: string;
  body: string;
  cta: string;
  background?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        background,
        position: 'relative',
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '36px 32px',
          background: 'var(--card, #FBF7EE)',
          border: '1.5px dashed var(--line, rgba(14,13,11,0.20))',
          borderRadius: 'var(--pl-card-radius, 14px)',
          textAlign: 'center',
        }}
      >
        <div
          className="eyebrow"
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
            textTransform: 'uppercase',
            color: 'var(--peach-ink, #C6703D)',
            marginBottom: 12,
          }}
        >
          {eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontSize: 'clamp(28px, 4cqw, 38px)',
            fontWeight: 'var(--pl-display-wght, 600)',
            margin: 0,
            lineHeight: 1.04,
            letterSpacing: '-0.015em',
          }}
        >
          {title}
          {italic && (
            <>
              {' '}
              <span style={{ fontStyle: 'italic', color: 'var(--ink-soft, #3A332C)' }}>{italic}</span>
            </>
          )}
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontStyle: 'italic',
            fontSize: 15,
            color: 'var(--ink-soft, #3A332C)',
            margin: '16px auto 22px',
            maxWidth: 460,
            lineHeight: 1.55,
          }}
        >
          {body}
        </p>
        <span
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 999,
            background: 'var(--peach-bg, rgba(198,112,61,0.10))',
            color: 'var(--peach-ink, #C6703D)',
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {cta} →
        </span>
      </div>
    </section>
  );
}

/* ─── ThemedDecorDivider — V8 decor + EditionDivider combo.
 *
 * Mirrors the ThemedSiteRenderer dispatch around DecorDivider:
 *
 *   1. Read manifest.decorVisibility[`divider-<sectionKey>`].
 *      Editor "× Hide" pill writes false here — when present
 *      the divider returns null entirely so the inter-section
 *      gap collapses to whatever section padding allows.
 *   2. Read manifest.decorLibrary.divider — when set AND we're
 *      on the Almanac Edition (the only Edition without a
 *      bespoke EditionDivider), render <DecorDivider> with the
 *      AI-generated PNG banner. Honours decorLibrary.dividerStrength.
 *   3. Otherwise fall through to <EditionDivider> with the
 *      active Edition's divider style (thread / sprocket / stitch
 *      / gold-hairline / whitespace). This is the existing Themed
 *      behaviour, preserved as the default.
 *
 * The suppress-banner-on-non-Almanac rule matches V8: stacking the
 * AI banner ON TOP of a Cinema sprocket strip creates the "row of
 * sun glyphs" double-decor problem the host flagged.
 *
 * Honours prefers-reduced-motion via the underlying DecorDivider's
 * weave keyframe + global reduced-motion blocks (the existing
 * <EditionDivider> reveal animation already honours this too). */
type ActiveEdition = ReturnType<typeof resolveEdition>;

/* React.memo — divider is called 13 times in the main render. With
   activeEdition memoized upstream, manifest stable across non-divider
   edits, and sectionKey/index being primitives, this short-circuits
   on any unrelated edit (e.g. a chapter title change). */
const ThemedDecorDivider = memo(function ThemedDecorDivider({
  manifest,
  activeEdition,
  sectionKey,
  index,
}: {
  manifest: StoryManifest;
  activeEdition: ActiveEdition;
  sectionKey: string;
  index: number;
}) {
  const decorVis = (manifest as unknown as { decorVisibility?: Record<string, boolean> }).decorVisibility;
  /* Host hid this specific divider via the editor — return null
     so the gap between sections collapses naturally. */
  const dividerHidden = decorVis?.[`divider-${sectionKey}`] === false;
  if (dividerHidden) return null;

  const dividerUrl = manifest.decorLibrary?.divider;
  const dividerStrength =
    ((manifest as unknown as { decorLibrary?: { dividerStrength?: 'subtle' | 'standard' | 'tall' } })
      .decorLibrary?.dividerStrength) ?? 'standard';

  /* AI banner only renders on Almanac — every other Edition has
     its own bespoke divider that owns the rhythm. */
  const showAiBanner = !!dividerUrl && activeEdition.id === 'almanac';
  if (showAiBanner) {
    return <DecorDivider url={dividerUrl} index={index} strength={dividerStrength} />;
  }
  return <EditionDivider style={activeEdition.divider} />;
});

/* ─── ThemedHero — Edition + variant-aware hero.
 *
 * Resolution order (matches ThemedSiteRenderer's HeroSection):
 *   1. Living atmosphere — explicit manifest.atmosphere >
 *      active Edition's atmospherePreset > occasion default >
 *      'standard'. Mounted as an absolute-positioned layer
 *      behind the variant, with subtle cursor parallax drift.
 *   2. Variant dispatch — manifest.blockVariants.hero.style >
 *      active Edition's heroVariantId > 'postcard'. Looked up
 *      via getBlockStyle('hero', id). When the registry has
 *      the variant, its Component renders (postcard, photo-
 *      first, split, carousel, minimal — all already ship the
 *      gradient fallback via heroFallbackGradient when no
 *      cover photo is set).
 *   3. Legacy 3-arch fallback — when no variant is registered
 *      (registry didn't initialise) we render the prototype's
 *      original 3-arch composition so a Themed site without
 *      block-styles still has a hero.
 *
 * The variant components handle their own composition (eyebrow,
 * names, date/venue, CTAs, decoration). MotifScatter wraps the
 * <section> so per-Edition motifs read through every variant.
 * Atmosphere sits below the variant via z-index so it reads as
 * paper lit from behind, not on top of the type. */
function ThemedHero({ manifest, names, motif, onEditField, onEditNames }: { manifest: StoryManifest; names: [string, string]; motif: MotifKind; onEditField?: FieldEditor; onEditNames?: (next: [string, string]) => void }) {
  /* Name resolution — fall back through (provided → coupleId
     split → 'Your' / 'Celebration') so a freshly-generated site
     without explicit names doesn't render with empty placeholders
     in the middle of the H1.

     IMPORTANT: a coupleId of the form `couple-1716234567890` or
     `f7d9a3b2-1c4e-...` (UUID) MUST NOT be used as a name source —
     splitting it on `-` gives hex segments that render as
     "F7d9a3b2 and 1c4e" in the hero (real bug, surfaced 2026-06).
     Skip segments that look numeric, hex-only, or 'couple'. */
  const isUuidLike = (s: string): boolean => /^[0-9a-f]+$/i.test(s) || /^\d+$/.test(s) || s.toLowerCase() === 'couple';
  const coupleSplit = ((manifest as unknown as { coupleId?: string }).coupleId ?? '')
    .split(/[-_]/)
    .filter(Boolean)
    .filter((s) => !isUuidLike(s))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  const n1 = (names[0] && names[0] !== 'Your' ? names[0] : (coupleSplit[0] ?? names[0] ?? 'Your'));
  const n2 = (names[1] && names[1] !== 'Partner' ? names[1] : (coupleSplit[1] ?? names[1] ?? 'Celebration'));

  /* Resolve the active Edition once — drives both the atmosphere
     preset and the hero variant fallback. */
  /* Cast occasion to satisfy EditionContext's SiteOccasion union —
     getEventType + resolveEdition both validate the string at runtime
     so an unknown value just falls back to the default. */
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const eventType = occasion ? getEventType(occasion) : null;
  const voice = eventType?.voice;
  const activeEdition = resolveEdition({
    edition: manifest.edition,
    occasion: occasion as Parameters<typeof resolveEdition>[0]['occasion'],
    voice,
  });

  /* Atmosphere config — explicit host pick > Edition preset >
     occasion default. Editions are read-time defaults; an
     explicit host setting always wins. */
  const atmosphereCfg = (manifest as unknown as {
    atmosphere?: { kind?: string; intensity?: string; sections?: string[]; accent?: string }
  }).atmosphere;
  const atmosphereKind = (atmosphereCfg?.kind as AtmosphereKind | undefined)
    ?? (activeEdition.atmospherePreset.kind as AtmosphereKind | undefined)
    ?? defaultAtmosphereForOccasion(occasion);
  const atmosphereIntensity = (atmosphereCfg?.intensity as AtmosphereIntensity | undefined)
    ?? (activeEdition.atmospherePreset.intensity as AtmosphereIntensity | undefined)
    ?? 'standard';
  const atmosphereAccent = atmosphereCfg?.accent
    ?? (manifest as unknown as { theme?: { colors?: { accent?: string } } }).theme?.colors?.accent;
  /* Cursor parallax — subtle drift on the atmosphere layer
     (max 8px). Honours prefers-reduced-motion via the hook. */
  const { ref: parallaxRef, style: parallaxStyle } = useHeroParallax(8);

  /* Variant resolution — host pick > Edition default > postcard.
     Side-effect-imported ./hero-variants populates the registry,
     so getBlockStyle('hero', id) reliably returns a component. */
  const styleId =
    (manifest.blockVariants?.hero?.style as string | undefined) ?? activeEdition.heroVariantId;
  const variant =
    getBlockStyle('hero', styleId)
    ?? getBlockStyle('hero', activeEdition.heroVariantId)
    ?? getBlockStyle('hero', 'postcard');

  /* V8 decor resolution — additive layer over MotifScatter:
     • signatureDecor (per-template bespoke illustration like
       citrus / monolith / brushstroke). When set, suppresses the
       generic OccasionDecor rings — the bespoke art IS the
       template identity.
     • decorMode: 'occasion' (per-event shape library — rings,
       candles, balloons), 'classic' (legacy v8 atmosphere),
       'off'. Falls through V8's resolution chain. Honours
       prefers-reduced-motion via the underlying SVG / CSS layer.
     • aiAccentUrl: when set, mounts a full-bleed cover image as
       a multiply/screen blend overlay (decor-blend var swaps
       between paper Editions and Cinema dark). */
  const signatureDecorKind = (manifest as unknown as { signatureDecor?: string }).signatureDecor;
  const decorMode: 'occasion' | 'classic' | 'off' =
    ((manifest as unknown as { decorStyle?: 'classic' | 'occasion' | 'off' }).decorStyle) ??
    (signatureDecorKind && signatureDecorKind !== 'none' ? 'off' : 'occasion');
  const aiAccentUrl = (manifest as unknown as { aiAccentUrl?: string }).aiAccentUrl;
  /* Decor visibility — host can hide the hero OccasionDecor via
     the editor's decor visibility map. Key matches the V8
     convention: `hero-occasion-decor`. */
  const decorVis = (manifest as unknown as { decorVisibility?: Record<string, boolean> }).decorVisibility;
  const occasionDecorVisible = decorVis?.['hero-occasion-decor'] !== false;
  const signatureDecorVisible = decorVis?.['hero-signature-decor'] !== false;
  const aiAccentVisible = decorVis?.['hero-ai-accent'] !== false;

  /* Hero context — built once and passed into every variant.
     Mirrors HeroVariantDispatch's `sharedProps.context` in
     ThemedSiteRenderer so the same variant components plug in
     unchanged. */
  const dateIsoRaw = manifest.logistics?.date ?? '';
  const dateDate = parseLocalDate(dateIsoRaw);
  const dateInfo = dateDate
    ? {
        pretty: dateDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        weekday: dateDate.toLocaleDateString('en-US', { weekday: 'long' }),
      }
    : null;
  const venue = manifest.logistics?.venue ?? '';
  const rsvpDeadline = manifest.logistics?.rsvpDeadline;
  const deadlineDate = parseLocalDate(rsvpDeadline);
  const deadlineStr = deadlineDate
    ? deadlineDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null;
  const heroCopy =
    (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ??
    "We'd love you there. Come celebrate with us — the day will be better for it.";
  const coverPhoto = manifest.coverPhoto;
  const photos =
    (manifest as unknown as { heroSlideshow?: string[] }).heroSlideshow ??
    (manifest.chapters?.flatMap((c) => (c.images ?? []).slice(0, 1).map((i) => i.url)) ?? []);
  const heroKicker =
    (manifest as unknown as { heroKicker?: string }).heroKicker ??
    (dateInfo ? `together, ${dateInfo.weekday.toLowerCase()}` : 'save the date');

  const sharedProps = {
    manifest,
    names: [n1, n2] as [string, string],
    onEditField,
    onEditNames,
    context: {
      n1, n2,
      coverPhoto,
      photos,
      venue,
      rsvpDeadline,
      deadlineStr,
      heroCopy,
      dateInfo,
      heroKicker,
      signatureDecor: (manifest as unknown as { signatureDecor?: string }).signatureDecor,
      occasion,
    },
  };

  /* Variant rendering path. Postcard / Split / Carousel / Minimal
     render inside a centred maxWidth wrapper; PhotoFirst owns its
     full-bleed outer wrapper. The atmosphere layer + MotifScatter
     wrap both paths. */
  if (variant) {
    const Variant = variant.Component as React.ComponentType<typeof sharedProps>;
    return (
      <section
        ref={parallaxRef as React.RefObject<HTMLElement>}
        id="top"
        style={{
          position: 'relative',
          padding: 'calc(56px * var(--pl-density-scale, 1)) 32px calc(48px * var(--pl-density-scale, 1))',
          background: 'var(--t-section)',
          overflow: 'hidden',
        }}
      >
        {/* Living atmosphere underlay — drifts with cursor. */}
        <div style={{ position: 'absolute', inset: 0, ...parallaxStyle, zIndex: 0 }} aria-hidden>
          <LivingAtmosphere
            kind={atmosphereKind}
            intensity={atmosphereIntensity}
            accent={atmosphereAccent}
          />
        </div>
        <MotifScatter motif={motif} density="generous" />
        {/* V8 OccasionDecor — per-event SVG shapes painted into
            the hero. Sits above MotifScatter (which paints subtle
            background motifs) but below the hero variant content
            so the names + CTAs always read on top. */}
        {decorMode === 'occasion' && occasionDecorVisible && (
          <OccasionDecor occasion={occasion} variant="hero" />
        )}
        {/* V8 aiAccentUrl — when the host has run /api/decor/library
            and the result includes a hero accent, mount it as a
            cover image with Edition-aware blend mode. The decor-blend
            CSS var swaps between multiply (paper Editions) and
            screen (Cinema dark) so the wash reads correctly on
            both. */}
        {aiAccentUrl && aiAccentVisible && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${aiAccentUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              mixBlendMode: 'var(--decor-blend, multiply)' as 'multiply',
              opacity: 0.38,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}
        {/* V8 TemplateSignatureDecor — bespoke per-template
            illustration (citrus for Lake Como, monolith for Marfa,
            brushstroke for Tokyo Modern, etc.). Anchored to the
            section's top-right, hidden on mobile via pl8-hide-mobile
            so the signature art doesn't compete with the name lockup
            on small screens. */}
        {signatureDecorKind && signatureDecorKind !== 'none' && signatureDecorVisible && (
          <div
            className="pl8-hide-mobile"
            style={{
              position: 'absolute',
              top: 0,
              right: 'max(0px, calc((100cqw - 1160px) / 2))',
              width: 240,
              height: 240,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <TemplateSignatureDecor
              kind={signatureDecorKind as SignatureDecorKind}
              position="top-right"
              size={220}
            />
          </div>
        )}
        {/* Monogram watermark — direct port of the prototype's
            MonogramTab crest, mounted as a hero top-right watermark
            when manifest.monogram is set. Falls back to manifest.names
            when initials are absent. Sits above OccasionDecor (z 2)
            but well below the variant's name lockup (z 5+). Hidden
            on mobile so it never competes with the H1. The crest
            itself is static — `prefers-reduced-motion` is moot. */}
        {(() => {
          const mono = (manifest as unknown as { monogram?: { initials?: string; frame?: MonogramFrame } }).monogram;
          if (!mono) return null;
          const frame: MonogramFrame = mono.frame ?? 'laurel';
          const subject = mono.initials?.trim() || `${n1} & ${n2}`;
          const { initA, initB } = deriveInitials(subject);
          const initialsForMono = subject.includes('&') || /\s/.test(subject)
            ? `${initA} & ${initB}`
            : subject;
          return (
            <div
              className="pl8-hide-mobile"
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 24,
                right: 'max(16px, calc((100cqw - 1160px) / 2 + 16px))',
                width: 120,
                height: 120,
                pointerEvents: 'none',
                zIndex: 2,
                opacity: 0.88,
              }}
            >
              <Monogram
                initials={initialsForMono}
                frame={frame}
                size={120}
                withCard={false}
                ariaHidden
              />
            </div>
          );
        })()}
        {styleId === 'photo-first' ? (
          <Variant {...sharedProps} />
        ) : (
          <div className="pl-hero-enter" style={{ maxWidth: 1160, margin: '0 auto', position: 'relative' }}>
            <Variant {...sharedProps} />
          </div>
        )}
      </section>
    );
  }

  /* ── Legacy 3-arch fallback. Only reached when the variant
        registry didn't initialise (the side-effect import above
        guarantees it does in production — this branch is here so
        a Themed site without block-styles still renders a hero). ── */
  const dateStr = dateIsoRaw;
  const place = manifest.logistics?.venueAddress ?? '';
  const heroKickerLegacy =
    (manifest as unknown as { heroKicker?: string }).heroKicker?.trim() || 'Save the date';
  const heroCopyFull =
    (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ?? '';
  const tagline = heroCopyFull.split(/[.!?]\s/, 2)[0];
  const archPhotos = (manifest.chapters ?? [])
    .flatMap((c) => (c.images ?? []).map((i) => i.url))
    .filter((u): u is string => !!u)
    .slice(0, 3);
  const archFallbackTones: [string, string, string] = ['var(--peach-bg, rgba(198,112,61,0.18))', 'var(--peach-ink, #C6703D)', 'var(--peach-bg, rgba(198,112,61,0.10))'];

  return (
    <section
      ref={parallaxRef as React.RefObject<HTMLElement>}
      id="top"
      style={{
        position: 'relative',
        textAlign: 'center',
        padding: 'calc(64px * var(--pl-density-scale, 1)) 40px calc(52px * var(--pl-density-scale, 1))',
        background: 'var(--t-section)',
        overflow: 'hidden',
      }}
    >
      {/* Living atmosphere underlay — drifts with cursor. */}
      <div style={{ position: 'absolute', inset: 0, ...parallaxStyle, zIndex: 0 }} aria-hidden>
        <LivingAtmosphere
          kind={atmosphereKind}
          intensity={atmosphereIntensity}
          accent={atmosphereAccent}
        />
      </div>
      <MotifScatter motif={motif} density="generous" />
      {/* Prototype L353: a WatercolorBloom wash centered above the hero
          glyphs adds soft painterly depth without competing with the
          atmosphere shader. Sits on the section layer below the names. */}
      <WatercolorBloom
        size={520}
        tone="var(--t-accent-bg)"
        tone2="rgba(138,154,107,0.3)"
        style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', opacity: 0.7, pointerEvents: 'none' }}
      />
      {/* V8 OccasionDecor / aiAccentUrl / TemplateSignatureDecor —
          mirror the variant-branch mounts so the legacy 3-arch
          fallback gets the same atmospheric layer when reached. */}
      {decorMode === 'occasion' && occasionDecorVisible && (
        <OccasionDecor occasion={occasion} variant="hero" />
      )}
      {aiAccentUrl && aiAccentVisible && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${aiAccentUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            mixBlendMode: 'var(--decor-blend, multiply)' as 'multiply',
            opacity: 0.38,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      {signatureDecorKind && signatureDecorKind !== 'none' && signatureDecorVisible && (
        <div
          className="pl8-hide-mobile"
          style={{
            position: 'absolute',
            top: 0,
            right: 'max(0px, calc((100cqw - 1160px) / 2))',
            width: 240,
            height: 240,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <TemplateSignatureDecor
            kind={signatureDecorKind as SignatureDecorKind}
            position="top-right"
            size={220}
          />
        </div>
      )}
      <div style={{ position: 'relative', maxWidth: 980, margin: '0 auto' }}>
        <EditableText
          as="div"
          className="eyebrow"
          value={heroKickerLegacy}
          onSave={(v) => onEditField?.((m) => ({ ...m, heroKicker: v } as unknown as StoryManifest))}
          ariaLabel="Hero eyebrow"
          maxLength={60}
          placeholder="Save the date"
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
            textTransform: 'uppercase',
            color: 'var(--peach-ink, #C6703D)',
            marginBottom: 14,
          }}
        />
        <EditableField
          as="div"
          context="hero tagline"
          value={tagline}
          onSave={(v) =>
            onEditField?.(
              (m) =>
                ({
                  ...m,
                  poetry: { ...((m as unknown as { poetry?: object }).poetry ?? {}), heroTagline: v },
                } as unknown as StoryManifest),
            )
          }
          placeholder="Add a tagline…"
          ariaLabel="Hero tagline"
          maxLength={200}
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontStyle: 'italic',
            fontSize: 19,
            color: 'var(--ink-soft, #3A332C)',
            margin: '0 0 18px',
          }}
        />
        <h1
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontSize: 'calc(74px * var(--pl-hero-scale, 1))',
            fontWeight: 'var(--pl-display-wght, 600)',
            lineHeight: 0.96,
            margin: '0 0 22px',
            letterSpacing: '-0.02em',
          }}
        >
          <EditableText
            as="span"
            value={n1}
            onSave={(v) => onEditNames?.([v, n2])}
            ariaLabel="First name"
            maxLength={60}
            placeholder="Name"
          />
          <span
            style={{
              fontStyle: 'italic',
              fontSize: '0.74em',
              color: 'var(--ink-soft, #3A332C)',
              margin: '0 0.18em',
              fontWeight: 400,
            }}
          >
            and
          </span>
          <EditableText
            as="span"
            value={n2}
            onSave={(v) => onEditNames?.([n1, v])}
            ariaLabel="Second name"
            maxLength={60}
            placeholder="Name"
          />
        </h1>
        <div
          style={{
            marginTop: 22,
            fontSize: 14,
            color: 'var(--ink-soft, #3A332C)',
            display: 'flex',
            gap: 22,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {dateStr && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="calendar" size={14} color="var(--peach-ink, #C6703D)" />
              <EditableText
                as="span"
                value={dateStr}
                onSave={(v) =>
                  onEditField?.(
                    (m) =>
                      ({
                        ...m,
                        logistics: { ...(m.logistics ?? {}), date: v },
                      } as unknown as StoryManifest),
                  )
                }
                ariaLabel="Event date"
                maxLength={80}
                placeholder="Add the date"
              />
            </span>
          )}
          {venue && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="pin" size={14} color="var(--peach-ink, #C6703D)" />
              <EditableText
                as="span"
                value={venue}
                onSave={(v) =>
                  onEditField?.(
                    (m) =>
                      ({
                        ...m,
                        logistics: { ...(m.logistics ?? {}), venue: v },
                      } as unknown as StoryManifest),
                  )
                }
                ariaLabel="Venue"
                maxLength={120}
                placeholder="Add the venue"
              />
              {place && ` · ${place}`}
            </span>
          )}
        </div>
        <div
          aria-hidden
          style={{
            marginTop: 22,
            marginInline: 'auto',
            width: 200,
            height: 1,
            background: 'linear-gradient(90deg, transparent, var(--gold, #B8935A) 50%, transparent)',
            opacity: 0.55,
          }}
        />
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <a
            href="#rsvp"
            onClick={() => { try { window.dispatchEvent(new CustomEvent('pl-open-rsvp')); } catch { /* noop */ } }}
            style={{
              padding: '12px 22px',
              borderRadius: 999,
              background: 'var(--ink, #0E0D0B)',
              color: 'var(--cream, #F5EFE2)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            RSVP →
          </a>
          <a
            href="#our-story"
            style={{
              padding: '12px 22px',
              borderRadius: 999,
              background: 'var(--card, transparent)',
              border: '1px solid var(--line, rgba(14,13,11,0.16))',
              color: 'var(--ink, #0E0D0B)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Read our story
          </a>
        </div>
        {/* 3-arch photo triptych — the prototype's hero signature.
            Always renders so the hero's composition is preserved.
            Uses real photos when available; otherwise falls back
            to three tone-blocks from the Edition's palette so the
            arches feel theme-coherent rather than empty. */}
        <div
          style={{
            marginTop: 44,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            maxWidth: 760,
            marginInline: 'auto',
          }}
        >
          {[0, 1, 2].map((i) => {
            const url = archPhotos[i];
            return (
              <div
                key={i}
                style={{
                  aspectRatio: '3/4',
                  ...(url
                    ? {
                        backgroundImage: `url(${url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {
                        background: archFallbackTones[i] ?? archFallbackTones[0],
                      }),
                  borderTopLeftRadius: '50% 35%',
                  borderTopRightRadius: '50% 35%',
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                  boxShadow: '0 10px 28px rgba(61,74,31,0.14)',
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── ThemedStory — dispatches to a per-Kit chapter renderer.
   Same shape as the schedule dispatch — each kit gives the
   chapter list a distinct visual identity (book-spread / index-
   card / scrapbook / etc.), not just a CSS skin. ─── */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/* Helper: patch a single chapter field. Used by every kit's
   chapter row so they all flow through the same onEditField
   channel. Mirrors ThemedSiteRenderer's patchChapter pattern. */
function makePatchChapter(onEditField: FieldEditor | undefined, chapterId: string | undefined, chapterIndex: number) {
  return (field: 'title' | 'description' | 'date') => (value: string) => {
    if (!onEditField) return;
    onEditField((m) => {
      const chapters = [...(m.chapters ?? [])];
      // Prefer id match — chapters can be reordered and the index
      // would drift. Fall back to index when an id isn't set.
      let idx = chapterId ? chapters.findIndex((c) => c.id === chapterId) : -1;
      if (idx < 0) idx = chapterIndex;
      if (idx < 0 || idx >= chapters.length) return m;
      chapters[idx] = { ...chapters[idx], [field]: value };
      return { ...m, chapters } as StoryManifest;
    });
  };
}

function ThemedStory({ manifest, motif, editMode, onEditField }: { manifest: StoryManifest; motif: MotifKind; editMode?: boolean; onEditField?: FieldEditor }) {
  const chapters = manifest.chapters ?? [];
  // Sample each chapter's first photo for its dominant tone, then
  // align by index so each kit renderer can read `tones[i]` and
  // tint its row border + year-glyph (numeral / date eyebrow).
  // When a tone hasn't resolved (SSR, pre-load, canvas tainted),
  // `tones[i]` is null and the kit falls back to the existing
  // peach-ink palette — keeping the unaltered default render
  // byte-for-byte unchanged. Mirrors the StoryLayouts hook.
  const chapterPhotoUrls = chapters.map((c) => c.images?.[0]?.url);
  const chapterTones = useChapterTones(chapterPhotoUrls);
  const tones: Array<string | null> = chapterPhotoUrls.map((u) =>
    u ? chapterTones[u] ?? null : null,
  );
  if (chapters.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="our-story"
        background="var(--cream-2, #EBE3D2)"
        eyebrow="Our story"
        title="How you got"
        italic="here"
        body="Open the Story panel on the right to add chapters — how you met, the proposal, the moments that matter."
        cta="Add a chapter"
      />
    );
  }
  const kit = (manifest.kitId ?? 'classic') as
    | 'classic' | 'ticket' | 'plate' | 'scrapbook' | 'index' | 'minimal'
    | 'arch' | 'stamp' | 'deco' | 'gallery' | 'menu';
  return (
    <section
      id="our-story"
      style={{
        padding: 'calc(48px * var(--pl-density-scale, 1)) 72px',
        background: 'var(--t-section)',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="our-story" />
      <MotifScatter motif={motif} density="sparse" />
      <ThemedSectionHead eyebrow="Our story" title="How we got" italic="here" manifest={manifest} sectionKey="story" />
      {kit === 'ticket'    && <StoryTicket chapters={chapters} tones={tones} onEditField={onEditField} />}
      {kit === 'plate'     && <StoryPlate chapters={chapters} tones={tones} onEditField={onEditField} />}
      {kit === 'scrapbook' && <StoryScrapbook chapters={chapters} tones={tones} onEditField={onEditField} />}
      {kit === 'index'     && <StoryIndex chapters={chapters} tones={tones} onEditField={onEditField} />}
      {kit === 'minimal'   && <StoryMinimal chapters={chapters} tones={tones} onEditField={onEditField} />}
      {/* Classic + arch / stamp / deco / gallery / menu fall through
          to StoryClassic; these CSS-only kits get their personality
          from per-kit CSS on the data-pl-kit attribute. */}
      {(kit === 'classic' || kit === 'arch' || kit === 'stamp' || kit === 'deco' || kit === 'gallery' || kit === 'menu' || !kit) && (
        <StoryClassic chapters={chapters} tones={tones} motif={motif} onEditField={onEditField} />
      )}
    </section>
  );
}

type Chapter = NonNullable<StoryManifest['chapters']>[number];

/* Classic — alternating photo-left / photo-right book spread. */
function StoryClassic({ chapters, tones, motif, onEditField }: { chapters: Chapter[]; tones?: Array<string | null>; motif?: MotifKind; onEditField?: FieldEditor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 72, maxWidth: 1080, margin: '0 auto' }}>
      {chapters.map((c, i) => {
        const left = i % 2 === 0;
        const photo = c.images?.[0]?.url;
        const numeral = ROMAN[i] ?? String(i + 1);
        // Photo-derived tone for this chapter — tints the year-glyph
        // (Roman numeral). Falls through to the manifest peach when
        // the sample hasn't resolved.
        const photoTone = tones?.[i] ?? null;
        const numeralColor = photoTone ?? 'var(--peach-ink, #C6703D)';
        return (
          <div key={c.id ?? i} className="pl8-chapter-row" style={{
            display: 'grid', gridTemplateColumns: left ? '5fr 1fr 6fr' : '6fr 1fr 5fr',
            alignItems: 'center',
            // Side accent rails — only render when the photo tone
            // resolved, so default chapters look unchanged.
            ...(photoTone ? { borderLeft: `2px solid ${photoTone}`, paddingLeft: 16 } : {}),
          }}>
            <div style={{ order: left ? 0 : 2, position: 'relative' }}>
              {photo ? (
                <div style={{
                  width: '100%', aspectRatio: '4/5',
                  backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center',
                  borderRadius: 'var(--pl-card-radius, 12px)',
                  boxShadow: 'var(--pl-card-shadow, 0 14px 36px rgba(61,74,31,0.16))',
                }} />
              ) : (
                <div style={{
                  width: '100%', aspectRatio: '4/5',
                  background: 'var(--cream, #FBF7EE)',
                  borderRadius: 'var(--pl-card-radius, 12px)',
                  display: 'grid', placeItems: 'center',
                  color: 'var(--ink-muted, #8A8275)',
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontSize: 64, fontStyle: 'italic', opacity: 0.25,
                }}>{numeral}</div>
              )}
              {/* Prototype L451: small motif glyph anchored to the
                  photo's bottom-right corner — decorative tie-in
                  between section and theme. */}
              {motif && motif !== 'none' && photo && (
                <div style={{ position: 'absolute', bottom: -18, right: -14, zIndex: 2 }} aria-hidden>
                  <Motif kind={motif} size={70} />
                </div>
              )}
            </div>
            <div style={{ order: 1 }} />
            <div style={{ order: left ? 2 : 0 }}>
              <div style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontStyle: 'italic', fontSize: 44, fontWeight: 400, color: numeralColor, opacity: 0.7, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.01em' }}>{numeral}.</div>
              {c.date && (
                <EditableText
                  as="div"
                  className="eyebrow"
                  value={c.date}
                  onSave={makePatchChapter(onEditField, c.id, i)('date')}
                  ariaLabel={`Chapter ${i + 1} date`}
                  maxLength={60}
                  placeholder="Date"
                  style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)', marginBottom: 14 }}
                />
              )}
              <EditableText
                as="h3"
                value={c.title}
                onSave={makePatchChapter(onEditField, c.id, i)('title')}
                ariaLabel={`Chapter ${i + 1} title`}
                maxLength={120}
                placeholder="Chapter title"
                style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 42, fontWeight: 'var(--pl-display-wght, 600)', margin: 0, lineHeight: 1.02, letterSpacing: '-0.015em' }}
              />
              <EditableField
                as="p"
                context={`chapter ${i + 1} description`}
                value={c.description ?? ''}
                onSave={makePatchChapter(onEditField, c.id, i)('description')}
                multiline
                maxLength={800}
                placeholder="Tell the story of this moment…"
                ariaLabel={`Chapter ${i + 1} description`}
                style={{ marginTop: 20, fontSize: 15.5, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.7 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Ticket — perforated stub cards in a 2-col grid, dashed border,
   monospace date, photo above body. */
function StoryTicket({ chapters, tones, onEditField }: { chapters: Chapter[]; tones?: Array<string | null>; onEditField?: FieldEditor }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, maxWidth: 920, margin: '0 auto' }}>
      {chapters.map((c, i) => {
        const photo = c.images?.[0]?.url;
        // Photo-derived tone — repaints the dashed border + date
        // eyebrow when the sample resolved. Falls back to the
        // existing ink-soft / peach-ink palette otherwise.
        const photoTone = tones?.[i] ?? null;
        const borderColor = photoTone ?? 'var(--ink-soft, #3A332C)';
        const dateColor = photoTone ?? 'var(--peach-ink, #C6703D)';
        return (
          <div key={c.id ?? i} className="pl8-chapter-row" style={{
            background: 'var(--card, #FBF7EE)',
            border: `1.5px dashed ${borderColor}`,
            borderRadius: 6, position: 'relative', overflow: 'hidden',
          }}>
            <span aria-hidden style={{ position: 'absolute', top: 6, left: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--paper, #F5EFE2)', border: `1px solid ${borderColor}` }} />
            <span aria-hidden style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--paper, #F5EFE2)', border: `1px solid ${borderColor}` }} />
            {photo && <div style={{ width: '100%', aspectRatio: '16/9', backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: `1.5px dashed ${borderColor}` }} />}
            <div style={{ padding: '20px 22px' }}>
              {c.date && (
                <EditableText
                  as="div"
                  value={c.date}
                  onSave={makePatchChapter(onEditField, c.id, i)('date')}
                  ariaLabel={`Chapter ${i + 1} date`}
                  maxLength={60}
                  placeholder="Date"
                  style={{ fontFamily: 'Courier New, ui-monospace, monospace', fontSize: 12, fontWeight: 700, color: dateColor, letterSpacing: '0.04em', marginBottom: 8, textTransform: 'uppercase' }}
                />
              )}
              <EditableText
                as="h3"
                value={c.title}
                onSave={makePatchChapter(onEditField, c.id, i)('title')}
                ariaLabel={`Chapter ${i + 1} title`}
                maxLength={120}
                placeholder="Chapter title"
                style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 22, fontWeight: 600, margin: 0, lineHeight: 1.1 }}
              />
              <EditableField
                as="p"
                context={`chapter ${i + 1} description`}
                value={c.description ?? ''}
                onSave={makePatchChapter(onEditField, c.id, i)('description')}
                multiline
                maxLength={800}
                placeholder="Tell the story…"
                ariaLabel={`Chapter ${i + 1} description`}
                style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.55 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Plate — vertical Roman-numeral list, photo as a small inset
   square on the left, italic display name, hairline separator. */
function StoryPlate({ chapters, tones, onEditField }: { chapters: Chapter[]; tones?: Array<string | null>; onEditField?: FieldEditor }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
      {chapters.map((c, i) => {
        const photo = c.images?.[0]?.url;
        const numeral = ROMAN[i] ?? String(i + 1);
        // Tint the Roman-numeral year-glyph from the chapter
        // photo's dominant tone (defaults to peach-ink). Separator
        // hairline stays a neutral muted line so the row read isn't
        // dominated by the accent.
        const photoTone = tones?.[i] ?? null;
        const numeralColor = photoTone ?? 'var(--peach-ink, #C6703D)';
        return (
          <div key={c.id ?? i} className="pl8-chapter-row" style={{
            display: 'grid', gridTemplateColumns: '60px 96px 1fr',
            alignItems: 'center', gap: 20,
            paddingBottom: 24,
            borderBottom: photoTone ? `1px solid ${photoTone}` : '1px solid var(--line-soft, rgba(14,13,11,0.10))',
          }}>
            <span style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontStyle: 'italic', fontWeight: 400, fontSize: 38,
              color: numeralColor, textAlign: 'right',
              lineHeight: 1,
            }}>{numeral}.</span>
            <div style={{ width: 96, aspectRatio: '1/1', background: photo ? `center/cover no-repeat url(${photo})` : 'var(--cream, #FBF7EE)', borderRadius: 2, boxShadow: 'inset 0 0 0 1px rgba(14,13,11,0.20), inset 0 0 0 4px var(--card, #FBF7EE), inset 0 0 0 5px rgba(14,13,11,0.10)' }} />
            <div>
              {c.date && (
                <EditableText
                  as="div"
                  className="eyebrow"
                  value={c.date}
                  onSave={makePatchChapter(onEditField, c.id, i)('date')}
                  ariaLabel={`Chapter ${i + 1} date`}
                  maxLength={60}
                  placeholder="Date"
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)', marginBottom: 6 }}
                />
              )}
              <EditableText
                as="h3"
                value={c.title}
                onSave={makePatchChapter(onEditField, c.id, i)('title')}
                ariaLabel={`Chapter ${i + 1} title`}
                maxLength={120}
                placeholder="Chapter title"
                style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontStyle: 'italic', fontSize: 24, fontWeight: 500, margin: 0, lineHeight: 1.1, color: 'var(--ink, #0E0D0B)' }}
              />
              <EditableField
                as="p"
                context={`chapter ${i + 1} description`}
                value={c.description ?? ''}
                onSave={makePatchChapter(onEditField, c.id, i)('description')}
                multiline
                maxLength={800}
                placeholder="Tell the story…"
                ariaLabel={`Chapter ${i + 1} description`}
                style={{ marginTop: 8, fontSize: 13.5, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.55 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Scrapbook — tilted polaroid cards in a masonry grid with tape
   strips. Photo on top, handwritten-feel title underneath. */
function StoryScrapbook({ chapters, tones, onEditField }: { chapters: Chapter[]; tones?: Array<string | null>; onEditField?: FieldEditor }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 26, maxWidth: 960, margin: '0 auto' }}>
      {chapters.map((c, i) => {
        const photo = c.images?.[0]?.url;
        const tilt = i % 2 === 0 ? -1.6 : 1.6;
        // Tint the tape strip + handwritten date from the photo
        // tone — the polaroid itself stays neutral cream so the
        // photo reads cleanly, but the chrome inherits the mood.
        const photoTone = tones?.[i] ?? null;
        const tapeBg = photoTone
          ? `color-mix(in oklab, ${photoTone} 40%, transparent)`
          : 'color-mix(in oklab, var(--gold, #B8935A) 32%, transparent)';
        const dateColor = photoTone ?? 'var(--peach-ink, #C6703D)';
        return (
          <div key={c.id ?? i} className="pl8-chapter-row" style={{
            background: '#FFFDF7', padding: '12px 12px 22px',
            boxShadow: '0 14px 30px rgba(0,0,0,0.18)',
            borderRadius: 2, position: 'relative',
            transform: `rotate(${tilt}deg)`,
          }}>
            <span aria-hidden style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%) rotate(-3deg)', width: 70, height: 16, background: tapeBg }} />
            {photo && <div style={{ width: '100%', aspectRatio: '4/3', backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
            <div style={{ paddingTop: 14, textAlign: 'center' }}>
              {c.date && (
                <EditableText
                  as="div"
                  value={c.date}
                  onSave={makePatchChapter(onEditField, c.id, i)('date')}
                  ariaLabel={`Chapter ${i + 1} date`}
                  maxLength={60}
                  placeholder="Date"
                  style={{ fontFamily: 'var(--font-display, Caveat, cursive)', fontStyle: 'italic', fontSize: 16, color: dateColor }}
                />
              )}
              <EditableText
                as="h3"
                value={c.title}
                onSave={makePatchChapter(onEditField, c.id, i)('title')}
                ariaLabel={`Chapter ${i + 1} title`}
                maxLength={120}
                placeholder="Chapter title"
                style={{ fontFamily: 'var(--font-display, Caveat, cursive)', fontStyle: 'italic', fontSize: 26, fontWeight: 500, margin: '4px 0 0', color: 'var(--ink, #0E0D0B)', lineHeight: 1.1 }}
              />
              <EditableField
                as="p"
                context={`chapter ${i + 1} description`}
                value={c.description ?? ''}
                onSave={makePatchChapter(onEditField, c.id, i)('description')}
                multiline
                maxLength={800}
                placeholder="Tell the story…"
                ariaLabel={`Chapter ${i + 1} description`}
                style={{ marginTop: 8, fontSize: 12.5, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.5, padding: '0 8px' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Index — ruled index cards, red left margin, blue rule lines,
   numbered date in monospace. */
function StoryIndex({ chapters, tones, onEditField }: { chapters: Chapter[]; tones?: Array<string | null>; onEditField?: FieldEditor }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {chapters.map((c, i) => {
        // The Index kit's red left margin is the chapter's
        // year-glyph rail — repaint it from the photo tone when
        // the sample resolved. Numeral №NN also picks up the
        // tone so the eye links card identity to its image.
        const photoTone = tones?.[i] ?? null;
        const railColor = photoTone ?? 'rgba(199,80,80,0.55)';
        const numeralColor = photoTone ?? 'var(--ink, #0E0D0B)';
        return (
        <div key={c.id ?? i} className="pl8-chapter-row" style={{
          padding: '20px 24px',
          background: 'var(--card, #FBF7EE)',
          borderLeft: `2px solid ${railColor}`,
          backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 22px, rgba(74,118,196,0.10) 22px 23px)',
          borderRadius: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 10 }}>
            <span style={{ fontFamily: 'Courier New, ui-monospace, monospace', fontSize: 12, fontWeight: 700, color: numeralColor, minWidth: 36 }}>№{String(i + 1).padStart(2, '0')}</span>
            {c.date && (
              <EditableText
                as="span"
                value={c.date}
                onSave={makePatchChapter(onEditField, c.id, i)('date')}
                ariaLabel={`Chapter ${i + 1} date`}
                maxLength={60}
                placeholder="Date"
                style={{ fontFamily: 'Courier New, ui-monospace, monospace', fontSize: 12, color: 'var(--ink-muted, #6F6557)' }}
              />
            )}
          </div>
          <EditableText
            as="h3"
            value={c.title}
            onSave={makePatchChapter(onEditField, c.id, i)('title')}
            ariaLabel={`Chapter ${i + 1} title`}
            maxLength={120}
            placeholder="Chapter title"
            style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 22, fontWeight: 600, margin: 0, lineHeight: 1.15 }}
          />
          <EditableField
            as="p"
            context={`chapter ${i + 1} description`}
            value={c.description ?? ''}
            onSave={makePatchChapter(onEditField, c.id, i)('description')}
            multiline
            maxLength={800}
            placeholder="Tell the story…"
            ariaLabel={`Chapter ${i + 1} description`}
            style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.65 }}
          />
        </div>
        );
      })}
    </div>
  );
}

/* Minimal — oversized numeral + title only, hairline dividers,
   no photos in card. */
function StoryMinimal({ chapters, tones, onEditField }: { chapters: Chapter[]; tones?: Array<string | null>; onEditField?: FieldEditor }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
      {chapters.map((c, i) => {
        // Tint the oversized 01/02/03 numeral from the chapter
        // photo's dominant tone — Minimal has no photo in-card
        // so the numeral is the only place identity lands.
        const photoTone = tones?.[i] ?? null;
        const numeralColor = photoTone ?? 'var(--ink, #0E0D0B)';
        return (
        <div key={c.id ?? i} className="pl8-chapter-row" style={{
          display: 'grid', gridTemplateColumns: '90px 1fr',
          alignItems: 'baseline', gap: 28,
          paddingBottom: 40,
          borderBottom: i === chapters.length - 1 ? 'none' : '1px solid var(--line-soft, rgba(14,13,11,0.08))',
        }}>
          <span style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontSize: 56, fontWeight: 600,
            color: numeralColor, lineHeight: 0.92, letterSpacing: '-0.04em',
          }}>{String(i + 1).padStart(2, '0')}</span>
          <div style={{ paddingTop: 8 }}>
            {c.date && (
              <EditableText
                as="div"
                className="eyebrow"
                value={c.date}
                onSave={makePatchChapter(onEditField, c.id, i)('date')}
                ariaLabel={`Chapter ${i + 1} date`}
                maxLength={60}
                placeholder="Date"
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)', marginBottom: 10 }}
              />
            )}
            <EditableText
              as="h3"
              value={c.title}
              onSave={makePatchChapter(onEditField, c.id, i)('title')}
              ariaLabel={`Chapter ${i + 1} title`}
              maxLength={120}
              placeholder="Chapter title"
              style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1.1 }}
            />
            <EditableField
              as="p"
              context={`chapter ${i + 1} description`}
              value={c.description ?? ''}
              onSave={makePatchChapter(onEditField, c.id, i)('description')}
              multiline
              maxLength={800}
              placeholder="Tell the story…"
              ariaLabel={`Chapter ${i + 1} description`}
              style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.6 }}
            />
          </div>
        </div>
        );
      })}
    </div>
  );
}

/* ─── ThemedSectionHead — shared centered header (TSectionHead) ─── */
/* React.memo — section heads are called once per section (8-10
   times) with mostly primitive props (eyebrow/title/italic strings
   + sectionKey). manifest is a reference identity that stays stable
   across renders unless the host actually edits something, so this
   skips re-render on unrelated sibling-section edits. */
const ThemedSectionHead = memo(function ThemedSectionHead({
  eyebrow,
  title,
  italic,
  manifest,
  sectionKey,
}: {
  eyebrow: string;
  title: string;
  italic?: string;
  /** When provided alongside sectionKey, the section's Edition
   *  opener (chapter mark / slug line / stamp / mono label /
   *  overline) renders above the eyebrow. */
  manifest?: StoryManifest;
  sectionKey?: SiteBlockKey;
}) {
  /* Memoize opener — resolveEdition() is otherwise called on
     every render even though the inputs (manifest.edition,
     manifest.occasion, sectionKey) rarely change. */
  const opener = useMemo(() => {
    if (!manifest || !sectionKey) return null;
    const occasion = manifest.occasion ?? 'wedding';
    const eventType = getEventType(occasion);
    const voice = eventType?.voice ?? 'celebratory';
    const activeEdition = resolveEdition({ edition: manifest.edition, occasion, voice });
    const order = (manifest as unknown as { blockOrder?: SiteBlockKey[] }).blockOrder;
    const arr = (order && order.length > 0 ? order : DEFAULT_BLOCK_ORDER) as SiteBlockKey[];
    const idx = arr.indexOf(sectionKey);
    return (
      <EditionSectionOpener
        style={activeEdition.sectionOpener}
        index={idx < 0 ? 1 : idx + 1}
        title={eyebrow}
        kicker={eyebrow}
      />
    );
  }, [manifest, sectionKey, eyebrow]);
  return (
    <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative' }}>
      {opener}
      <div
        className="eyebrow"
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 'var(--pl-eyebrow-ls, 0.18em)',
          textTransform: 'uppercase',
          color: 'var(--peach-ink, #C6703D)',
          marginBottom: 12,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontSize: 'clamp(34px, 5cqw, 52px)',
          fontWeight: 'var(--pl-display-wght, 600)',
          margin: 0,
          lineHeight: 1.04,
        }}
      >
        {title}
        {italic && (
          <>
            {' '}
            <span style={{ fontStyle: 'italic', color: 'var(--ink-soft, #3A332C)' }}>{italic}</span>
          </>
        )}
      </h2>
    </div>
  );
});

/* ─── ThemedDetails — larger feature cards. Each card centers a
   sage-tint icon disc, a small eyebrow label, and the value in
   display font. The icon disc gives each card identity at a
   glance; the grid is tighter (3 cols on wide) so the cards feel
   like a magazine info-graphic, not a tight grid. ───

   Inline edit: each item carries a `field` key (`dresscode` /
   `kids` / `gifts` / `parking`) that maps back to its source
   manifest path. The kit variants below pass this key to
   makePatchDetail() so click-to-edit threads through the same
   onEditField patcher as Story/Schedule/FAQ. The label stays
   static (it's the schema field name, not user copy); only the
   value reads as editable. */
type DetailFieldKey = 'dresscode' | 'kids' | 'gifts' | 'parking';
type DetailItem = { icon: string; label: string; value: string; sub?: string; field: DetailFieldKey };

/* Helper: patch a single detail field. Routes the four detail
   field keys back to their canonical manifest paths so the kit
   variants below can stay layout-only. */
function makePatchDetail(onEditField: FieldEditor | undefined, field: DetailFieldKey) {
  return (value: string) => {
    if (!onEditField) return;
    onEditField((m) => {
      if (field === 'gifts') {
        const reg = (m as unknown as { registry?: { message?: string; entries?: unknown[] } }).registry ?? {};
        return {
          ...m,
          registry: { ...reg, message: value },
        } as unknown as StoryManifest;
      }
      const logistics = { ...(m.logistics ?? {}) } as Record<string, unknown>;
      logistics[field] = value;
      return { ...m, logistics } as StoryManifest;
    });
  };
}

function ThemedDetails({ manifest, motif, editMode, onEditField }: { manifest: StoryManifest; motif: MotifKind; editMode?: boolean; onEditField?: FieldEditor }) {
  const l = manifest.logistics ?? {};
  const dresscode = l.dresscode;
  const items: DetailItem[] = [];
  if (dresscode) items.push({ icon: 'sparkles', label: 'Dress code', value: dresscode, field: 'dresscode' });
  if ((l as { kids?: string }).kids) items.push({ icon: 'users', label: 'Kids', value: String((l as { kids?: string }).kids), field: 'kids' });
  if ((manifest as unknown as { registry?: { message?: string } }).registry?.message) {
    items.push({ icon: 'gift', label: 'Gifts', value: (manifest as unknown as { registry?: { message?: string } }).registry?.message ?? '', field: 'gifts' });
  }
  if ((l as { parking?: string }).parking) items.push({ icon: 'pin', label: 'Parking', value: String((l as { parking?: string }).parking), field: 'parking' });
  if (items.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="details"
        background="var(--cream-2, #EBE3D2)"
        eyebrow="What you need to know"
        title="The day,"
        italic="in details"
        body="Dress code · kids · parking · gifts. Open the Details panel to fill in what guests should know before the day."
        cta="Add details"
      />
    );
  }
  const kit = (manifest.kitId ?? 'classic') as
    | 'classic' | 'ticket' | 'plate' | 'scrapbook' | 'index' | 'minimal'
    | 'arch' | 'stamp' | 'deco' | 'gallery' | 'menu';
  /* Variant dispatch — host-pick wins over kit-based render. When
     manifest.blockVariants.details.style names a registered variant
     (tiles / iconrow / list / accordion / bento), render its
     dedicated Component; otherwise fall through to the kit dispatch
     so existing sites keep their current visual. */
  const detailsVariantId = (manifest.blockVariants?.details?.style as string | undefined);
  const DetailsVariant = getDetailsVariantComponent(detailsVariantId);
  return (
    <section
      id="details"
      style={{
        padding: 'calc(44px * var(--pl-density-scale, 1)) 40px',
        background: 'var(--t-section)',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="details" />
      <MotifScatter motif={motif} density="sparse" />
      <ThemedSectionHead eyebrow="What you need to know" title="The day," italic="in details" manifest={manifest} sectionKey="details" />
      {DetailsVariant ? (
        <DetailsVariant items={items} onEditField={onEditField} />
      ) : (
        <>
          {kit === 'ticket'    && <DetailsTicket items={items} onEditField={onEditField} />}
          {kit === 'plate'     && <DetailsPlate items={items} onEditField={onEditField} />}
          {kit === 'scrapbook' && <DetailsScrapbook items={items} onEditField={onEditField} />}
          {kit === 'index'     && <DetailsIndex items={items} onEditField={onEditField} />}
          {kit === 'minimal'   && <DetailsMinimal items={items} onEditField={onEditField} />}
          {/* Classic + arch / stamp / deco / gallery / menu → DetailsClassic with per-kit CSS. */}
          {(kit === 'classic' || kit === 'arch' || kit === 'stamp' || kit === 'deco' || kit === 'gallery' || kit === 'menu' || !kit) && (
            <DetailsClassic items={items} onEditField={onEditField} />
          )}
        </>
      )}
    </section>
  );
}

/* Shared editable detail-value primitive. `gifts` is the only
   prose-shaped value (registry message) — that one wears the
   AI-rewrite chip via EditableField. The other three keys
   (dresscode / kids / parking) are short labels; EditableText
   keeps the affordance quiet so the cards still read as a tight
   info-graphic, not a sea of rewrite chips. */
function DetailValue({
  item,
  onEditField,
  style,
  as = 'div',
}: {
  item: DetailItem;
  onEditField?: FieldEditor;
  style?: React.CSSProperties;
  as?: 'div' | 'span';
}) {
  const placeholder = `Add ${item.label.toLowerCase()}…`;
  if (item.field === 'gifts') {
    return (
      <EditableField
        as={as}
        context={`Details · ${item.label}`}
        value={item.value}
        onSave={makePatchDetail(onEditField, item.field)}
        multiline
        maxLength={400}
        placeholder={placeholder}
        ariaLabel={`${item.label} value`}
        style={style}
      />
    );
  }
  return (
    <EditableText
      as={as}
      value={item.value}
      onSave={makePatchDetail(onEditField, item.field)}
      maxLength={160}
      placeholder={placeholder}
      ariaLabel={`${item.label} value`}
      style={style}
    />
  );
}

/* DetailsClassic — tile grid. Port of KDetails default branch. */
function DetailsClassic({ items, onEditField }: { items: DetailItem[]; onEditField?: FieldEditor }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`,
        gap: 16,
        maxWidth: 800,
        margin: '0 auto',
      }}
    >
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            ...kitCardStyle('classic', i),
            padding: 20,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--peach-bg, rgba(198,112,61,0.10))',
              display: 'grid',
              placeItems: 'center',
              marginBottom: 12,
            }}
          >
            <Icon name={d.icon} size={18} color="var(--peach-ink, #C6703D)" />
          </div>
          <div
            className="eyebrow"
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted, #6F6557)',
              marginBottom: 4,
            }}
          >
            {d.label}
          </div>
          <DetailValue
            item={d}
            onEditField={onEditField}
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontWeight: 'var(--pl-display-wght, 600)',
              fontSize: 20,
              color: 'var(--ink, #0E0D0B)',
            }}
          />
          {d.sub && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-muted, #6F6557)', marginTop: 3 }}>{d.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* DetailsTicket — single dashed-bordered row spanning the page,
   each item a column separated by dashed verticals. Prototype's
   KDetails ticket branch. */
function DetailsTicket({ items, onEditField }: { items: DetailItem[]; onEditField?: FieldEditor }) {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        background: 'var(--card, #FBF7EE)',
        border: '1.5px dashed var(--ink-soft, rgba(14,13,11,0.30))',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            padding: '18px 14px',
            textAlign: 'center',
            borderRight: i < items.length - 1 ? '2px dashed var(--ink-soft, rgba(14,13,11,0.30))' : 'none',
          }}
        >
          <Icon name={d.icon} size={17} color="var(--peach-ink, #C6703D)" />
          <div
            style={{
              fontFamily: 'Courier New, ui-monospace, monospace',
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted, #6F6557)',
              margin: '8px 0 3px',
            }}
          >
            {d.label}
          </div>
          <DetailValue
            item={d}
            onEditField={onEditField}
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontWeight: 'var(--pl-display-wght, 600)',
              fontSize: 18,
              color: 'var(--ink, #0E0D0B)',
            }}
          />
          {d.sub && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>{d.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* DetailsPlate — vertical "dotted leader" list. Each row is
   label LEFT (uppercase eyebrow) + dotted leader stretching to
   value RIGHT (display font right-aligned). Prototype's
   KDetails plate branch. */
function DetailsPlate({ items, onEditField }: { items: DetailItem[]; onEditField?: FieldEditor }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            padding: '15px 4px',
            borderBottom:
              i < items.length - 1
                ? '1px solid var(--line-soft, rgba(14,13,11,0.10))'
                : 'none',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted, #6F6557)',
              minWidth: 96,
            }}
          >
            {d.label}
          </span>
          <span
            aria-hidden
            style={{
              flex: 1,
              borderBottom: '1px dotted var(--line-soft, rgba(14,13,11,0.20))',
              transform: 'translateY(-4px)',
            }}
          />
          <span
            style={{
              textAlign: 'right',
            }}
          >
            <DetailValue
              item={d}
              onEditField={onEditField}
              as="span"
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 18,
                color: 'var(--ink, #0E0D0B)',
              }}
            />
            {d.sub && (
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-ui, Inter, sans-serif)',
                  fontWeight: 400,
                  fontSize: 12,
                  color: 'var(--ink-muted, #6F6557)',
                }}
              >
                {d.sub}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/* DetailsScrapbook — tilted polaroid mini-cards arranged in a
   flex-wrap row. Tape strip above each, script-font label, then
   display-font value. Prototype's KDetails scrapbook branch. */
function DetailsScrapbook({ items, onEditField }: { items: DetailItem[]; onEditField?: FieldEditor }) {
  const tilts = [-2.5, 1.8, -1.2, 2.4];
  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, paddingTop: 8 }}>
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            width: 168,
            position: 'relative',
            background: '#fffdf7',
            boxShadow: '0 10px 22px rgba(0,0,0,0.12)',
            borderRadius: 2,
            padding: '20px 16px 16px',
            transform: `rotate(${tilts[i % 4]}deg)`,
            marginTop: i % 2 ? 14 : 0,
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -9,
              left: '50%',
              transform: 'translateX(-50%) rotate(-4deg)',
              width: 48,
              height: 16,
              background: 'color-mix(in oklab, var(--peach-ink, #C6703D) 32%, transparent)',
            }}
          />
          <Icon name={d.icon} size={18} color="var(--peach-ink, #C6703D)" />
          <div
            style={{
              fontFamily: 'var(--font-script, Caveat, cursive)',
              fontSize: 20,
              color: 'var(--peach-ink, #C6703D)',
              marginTop: 6,
            }}
          >
            {d.label}
          </div>
          <DetailValue
            item={d}
            onEditField={onEditField}
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontWeight: 'var(--pl-display-wght, 600)',
              fontSize: 18,
              marginTop: 2,
              color: 'var(--ink, #0E0D0B)',
            }}
          />
          {d.sub && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>{d.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* DetailsIndex — ruled index cards with red-margin + blue rule
   lines. Icon left, mono-uppercase label, then value + subtitle
   inline. Prototype's KDetails index branch. */
function DetailsIndex({ items, onEditField }: { items: DetailItem[]; onEditField?: FieldEditor }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((d) => (
        <div
          key={d.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'var(--card, #FBF7EE)',
            borderRadius: 2,
            borderLeft: '2px solid rgba(199,80,80,0.55)',
            padding: '14px 18px',
            backgroundImage:
              'repeating-linear-gradient(180deg, transparent 0 20px, rgba(74,118,196,0.10) 20px 21px)',
          }}
        >
          <Icon name={d.icon} size={18} color="var(--peach-ink, #C6703D)" />
          <div
            style={{
              minWidth: 96,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted, #6F6557)',
            }}
          >
            {d.label}
          </div>
          <div style={{ flex: 1 }}>
            <DetailValue
              item={d}
              onEditField={onEditField}
              as="span"
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 18,
                color: 'var(--ink, #0E0D0B)',
              }}
            />
            {d.sub && (
              <span style={{ fontSize: 12.5, color: 'var(--ink-muted, #6F6557)', marginLeft: 8 }}>
                {d.sub}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* DetailsMinimal — borderless columns separated by hairline
   verticals. Big display-font values centered. Prototype's
   KDetails minimal branch. */
function DetailsMinimal({ items, onEditField }: { items: DetailItem[]; onEditField?: FieldEditor }) {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      }}
    >
      {items.map((d, i) => (
        <div
          key={d.label}
          style={{
            padding: '4px 22px',
            borderLeft: i ? '1px solid var(--line-soft, rgba(14,13,11,0.10))' : 'none',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted, #6F6557)',
              marginBottom: 8,
            }}
          >
            {d.label}
          </div>
          <DetailValue
            item={d}
            onEditField={onEditField}
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontWeight: 'var(--pl-display-wght, 600)',
              fontSize: 26,
              lineHeight: 1.05,
              color: 'var(--ink, #0E0D0B)',
            }}
          />
          {d.sub && (
            <div style={{ fontSize: 12, color: 'var(--ink-muted, #6F6557)', marginTop: 6 }}>{d.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── ThemedSchedule — dispatches to a per-Kit renderer.
   Each kit gives Schedule a fundamentally different structure
   (not just a CSS skin on the same row layout):

     classic    — vertical timeline, peach dot on hairline rule
     ticket     — perforated stub grid (2-col, monospace times,
                  pinhole dots on the corners)
     plate      — vertical Roman-numeral list with dotted leaders
                  reaching to a right-aligned time column
     scrapbook  — masonry of tilted polaroid cards
     index      — ruled red-margin index cards
     minimal    — big oversized numeral + name list, no chrome ─── */
function ThemedSchedule({ manifest, editMode, onEditField }: { manifest: StoryManifest; editMode?: boolean; onEditField?: FieldEditor }) {
  const events = manifest.events ?? [];
  if (events.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="schedule"
        eyebrow="The day"
        title="In"
        italic="moments"
        body="Ceremony · cocktails · dinner · dancing. Open the Schedule panel to add your run of show."
        cta="Add an event"
      />
    );
  }
  const kit = (manifest.kitId ?? 'classic') as
    | 'classic' | 'ticket' | 'plate' | 'scrapbook' | 'index' | 'minimal'
    | 'arch' | 'stamp' | 'deco' | 'gallery' | 'menu';
  return (
    <section
      id="schedule"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="schedule" />
      <ThemedSectionHead eyebrow="The day" title="In" italic="moments" manifest={manifest} sectionKey="schedule" />
      {kit === 'ticket'    && <ScheduleTicket events={events} onEditField={onEditField} />}
      {kit === 'plate'     && <SchedulePlate events={events} onEditField={onEditField} />}
      {kit === 'scrapbook' && <ScheduleScrapbook events={events} onEditField={onEditField} />}
      {kit === 'index'     && <ScheduleIndex events={events} onEditField={onEditField} />}
      {kit === 'minimal'   && <ScheduleMinimal events={events} onEditField={onEditField} />}
      {/* Classic + arch / stamp / deco / gallery / menu → ScheduleClassic with per-kit CSS. */}
      {(kit === 'classic' || kit === 'arch' || kit === 'stamp' || kit === 'deco' || kit === 'gallery' || kit === 'menu' || !kit) && (
        <ScheduleClassic events={events} onEditField={onEditField} />
      )}
    </section>
  );
}

type ScheduleEvent = NonNullable<StoryManifest['events']>[number];

/* Helper: patch a single event field. Mirrors ThemedSiteRenderer's
   patchEvent — matches by id first (so reorders don't drift),
   then by index as fallback. */
function makePatchEvent(onEditField: FieldEditor | undefined, eventId: string | undefined, eventIndex: number) {
  return (field: 'name' | 'description' | 'time') => (value: string) => {
    if (!onEditField) return;
    onEditField((m) => {
      const events = [...(m.events ?? [])];
      let idx = eventId ? events.findIndex((e) => e.id === eventId) : -1;
      if (idx < 0) idx = eventIndex;
      if (idx < 0 || idx >= events.length) return m;
      events[idx] = { ...events[idx], [field]: value };
      return { ...m, events } as StoryManifest;
    });
  };
}

/* Split "4:00 PM" / "16:00" into {t, m} per the prototype's
   schema. The prototype uses .t = "4:00" + .m = "PM" so the
   meridian renders at a smaller size next to the time. Falls
   back gracefully on already-split or 24h values. */
function splitTime(raw: string | undefined | null): { t: string; m: string } {
  if (!raw) return { t: '', m: '' };
  const m = raw.match(/^(\d{1,2}:\d{2})\s*(AM|PM|am|pm)?$/);
  if (m) return { t: m[1], m: (m[2] ?? '').toUpperCase() };
  return { t: raw, m: '' };
}

function ScheduleClassic({ events, onEditField }: { events: ScheduleEvent[]; onEditField?: FieldEditor }) {
  /* Prototype's KSchedule 'list' variant — `92px 1fr` grid with
     display time + AM/PM eyebrow on the left, bold name + muted
     subtitle on the right, hairline border-bottom between rows. */
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '92px 1fr',
              gap: 18,
              alignItems: 'baseline',
              padding: '16px 0',
              borderBottom: i < events.length - 1 ? '1px solid var(--line-soft, rgba(14,13,11,0.08))' : 'none',
            }}
          >
            <div
              className="pl8-schedule-time"
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 24,
                color: 'var(--peach-ink, #C6703D)',
              }}
            >
              {t}
              {m && (
                <span style={{ fontSize: 11, marginLeft: 3, color: 'var(--ink-muted, #6F6557)' }}>
                  {m}
                </span>
              )}
            </div>
            <div>
              <EditableText
                as="div"
                value={e.name}
                onSave={makePatchEvent(onEditField, e.id, i)('name')}
                ariaLabel={`Schedule item ${i + 1} title`}
                maxLength={120}
                placeholder="Event name"
                style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}
              />
              <EditableField
                as="div"
                context={`Schedule item ${i + 1} description`}
                value={e.description ?? ''}
                onSave={makePatchEvent(onEditField, e.id, i)('description')}
                multiline
                placeholder="What guests can expect…"
                ariaLabel={`Schedule item ${i + 1} description`}
                style={{ fontSize: 13, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleTicket({ events, onEditField }: { events: ScheduleEvent[]; onEditField?: FieldEditor }) {
  /* Prototype's KSchedule ticket — single-column stack of perforated
     stubs. Each row is a 2-col grid with the time block stamped on
     the left (mono, dashed border-right as perforation) and the
     event detail on the right. Pinhole dots sit ON the perforation
     line, top and bottom, in the section paper color so they read
     as punched-through holes. */
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '116px 1fr',
              background: 'var(--card, #FBF7EE)',
              border: '1.5px dashed var(--ink-soft, rgba(14,13,11,0.30))',
              borderRadius: 7,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 10px',
                textAlign: 'center',
                borderRight: '2px dashed var(--ink-soft, rgba(14,13,11,0.30))',
                fontFamily: 'Courier New, ui-monospace, monospace',
              }}
            >
              <div className="pl8-schedule-time" style={{ fontSize: 21, fontWeight: 700, color: 'var(--peach-ink, #C6703D)' }}>
                {t}
              </div>
              {m && (
                <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)' }}>
                  {m}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 18px' }}>
              <EditableText
                as="div"
                value={e.name}
                onSave={makePatchEvent(onEditField, e.id, i)('name')}
                ariaLabel={`Schedule item ${i + 1} title`}
                maxLength={120}
                placeholder="Event name"
                style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}
              />
              <EditableField
                as="div"
                context={`Schedule item ${i + 1} description`}
                value={e.description ?? ''}
                onSave={makePatchEvent(onEditField, e.id, i)('description')}
                multiline
                placeholder="What guests can expect…"
                ariaLabel={`Schedule item ${i + 1} description`}
                style={{ fontSize: 12.5, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}
              />
            </div>
            {/* Pinholes on the perforation line, punched through to the
                section background. */}
            <span aria-hidden style={{ position: 'absolute', left: 110, top: -6, width: 12, height: 12, borderRadius: '50%', background: 'var(--cream-2, #EBE3D2)' }} />
            <span aria-hidden style={{ position: 'absolute', left: 110, bottom: -6, width: 12, height: 12, borderRadius: '50%', background: 'var(--cream-2, #EBE3D2)' }} />
          </div>
        );
      })}
    </div>
  );
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function SchedulePlate({ events, onEditField }: { events: ScheduleEvent[]; onEditField?: FieldEditor }) {
  /* Prototype's KSchedule plate — three-column row:
     italic Roman numeral · name + inline " — subtitle" · display
     time + AM/PM. Single hairline border between rows.
     Inline edits: name + description render as adjacent EditableText
     spans separated by an em-dash so the plate's inline rhythm is
     preserved. */
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '44px 1fr auto',
              alignItems: 'baseline',
              gap: 16,
              padding: '16px 4px',
              borderBottom:
                i < events.length - 1
                  ? '1px solid var(--line-soft, rgba(14,13,11,0.10))'
                  : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 20,
                color: 'var(--peach-ink, #C6703D)',
                fontStyle: 'italic',
              }}
            >
              {ROMAN_NUMERALS[i] ?? String(i + 1)}
            </span>
            <div>
              <EditableText
                as="span"
                value={e.name}
                onSave={makePatchEvent(onEditField, e.id, i)('name')}
                ariaLabel={`Schedule item ${i + 1} title`}
                maxLength={120}
                placeholder="Event name"
                style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}
              />
              {(e.description || onEditField) && (
                <>
                  <span style={{ fontSize: 13, color: 'var(--ink-muted, #6F6557)' }}>{' — '}</span>
                  <EditableField
                    as="span"
                    context={`Schedule item ${i + 1} description`}
                    value={e.description ?? ''}
                    onSave={makePatchEvent(onEditField, e.id, i)('description')}
                    placeholder="Add a detail…"
                    ariaLabel={`Schedule item ${i + 1} description`}
                    maxLength={240}
                    style={{ fontSize: 13, color: 'var(--ink-muted, #6F6557)' }}
                  />
                </>
              )}
            </div>
            <span
              className="pl8-schedule-time"
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 18,
                letterSpacing: '0.02em',
                color: 'var(--ink, #0E0D0B)',
                whiteSpace: 'nowrap',
              }}
            >
              {t}
              {m && (
                <span style={{ fontSize: 11, marginLeft: 2, color: 'var(--ink-muted, #6F6557)' }}>
                  {m}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleScrapbook({ events, onEditField }: { events: ScheduleEvent[]; onEditField?: FieldEditor }) {
  /* Prototype's KSchedule scrapbook — `repeat(N, 1fr)` grid up to
     4 columns of tilted polaroids. Tape strip above each card
     (translateY beyond the top edge). Time in script font centered
     at the top of the card content. */
  const cols = Math.min(events.length, 4);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 18,
        maxWidth: 880,
        margin: '0 auto',
        paddingTop: 8,
      }}
    >
      {events.map((e, i) => {
        const { t } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              position: 'relative',
              background: '#fffdf7',
              boxShadow: '0 10px 22px rgba(0,0,0,0.12)',
              borderRadius: 2,
              padding: '20px 14px 16px',
              textAlign: 'center',
              transform: `rotate(${i % 2 ? 1.6 : -1.6}deg)`,
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: -9,
                left: '50%',
                transform: 'translateX(-50%) rotate(-4deg)',
                width: 50,
                height: 16,
                background: 'color-mix(in oklab, var(--peach-ink, #C6703D) 32%, transparent)',
              }}
            />
            <div
              className="pl8-schedule-time"
              style={{
                fontFamily: 'var(--font-script, Caveat, cursive)',
                fontSize: 30,
                color: 'var(--peach-ink, #C6703D)',
                lineHeight: 1,
              }}
            >
              {t}
            </div>
            <EditableText
              as="div"
              value={e.name}
              onSave={makePatchEvent(onEditField, e.id, i)('name')}
              ariaLabel={`Schedule item ${i + 1} title`}
              maxLength={120}
              placeholder="Event name"
              style={{ fontSize: 14, fontWeight: 600, marginTop: 8, color: 'var(--ink, #0E0D0B)' }}
            />
            <EditableField
              as="div"
              context={`Schedule item ${i + 1} description`}
              value={e.description ?? ''}
              onSave={makePatchEvent(onEditField, e.id, i)('description')}
              multiline
              placeholder="What guests can expect…"
              ariaLabel={`Schedule item ${i + 1} description`}
              maxLength={240}
              style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}
            />
          </div>
        );
      })}
    </div>
  );
}

function ScheduleIndex({ events, onEditField }: { events: ScheduleEvent[]; onEditField?: FieldEditor }) {
  /* Prototype's KSchedule index — black mono time TAB on the
     left edge (positioned absolute, projects out of the card),
     red left border + blue rule lines as the card bg, content
     offset right to clear the tab. */
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              position: 'relative',
              background: 'var(--card, #FBF7EE)',
              borderRadius: 2,
              borderLeft: '2px solid rgba(199,80,80,0.55)',
              padding: '14px 16px 14px 64px',
              backgroundImage:
                'repeating-linear-gradient(180deg, transparent 0 21px, rgba(74,118,196,0.10) 21px 22px)',
            }}
          >
            <div
              className="pl8-schedule-time"
              style={{
                position: 'absolute',
                left: 0,
                top: 12,
                padding: '3px 8px',
                background: 'var(--peach-ink, #C6703D)',
                color: 'var(--paper, #F5EFE2)',
                fontFamily: 'Courier New, ui-monospace, monospace',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: '0 4px 4px 0',
              }}
            >
              {t}
              {m}
            </div>
            <EditableText
              as="div"
              value={e.name}
              onSave={makePatchEvent(onEditField, e.id, i)('name')}
              ariaLabel={`Schedule item ${i + 1} title`}
              maxLength={120}
              placeholder="Event name"
              style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}
            />
            <EditableField
              as="div"
              context={`Schedule item ${i + 1} description`}
              value={e.description ?? ''}
              onSave={makePatchEvent(onEditField, e.id, i)('description')}
              multiline
              placeholder="What guests can expect…"
              ariaLabel={`Schedule item ${i + 1} description`}
              maxLength={240}
              style={{ fontSize: 12.5, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}
            />
          </div>
        );
      })}
    </div>
  );
}

function ScheduleMinimal({ events, onEditField }: { events: ScheduleEvent[]; onEditField?: FieldEditor }) {
  /* Prototype's KSchedule minimal — `auto 1fr` grid, 38px display
     time on the LEFT (line-height 0.9 so it sits tight), content
     RIGHT-ALIGNED on the right with the name + subtitle. Hairline
     border between rows. */
  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 22,
              alignItems: 'baseline',
              padding: '20px 0',
              borderBottom:
                i < events.length - 1
                  ? '1px solid var(--line-soft, rgba(14,13,11,0.10))'
                  : 'none',
            }}
          >
            <span
              className="pl8-schedule-time"
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 38,
                lineHeight: 0.9,
                letterSpacing: '-0.03em',
                color: 'var(--ink, #0E0D0B)',
              }}
            >
              {t}
              {m && (
                <span style={{ fontSize: 12, marginLeft: 4, color: 'var(--ink-muted, #6F6557)' }}>
                  {m}
                </span>
              )}
            </span>
            <div style={{ textAlign: 'right' }}>
              <EditableText
                as="div"
                value={e.name}
                onSave={makePatchEvent(onEditField, e.id, i)('name')}
                ariaLabel={`Schedule item ${i + 1} title`}
                maxLength={120}
                placeholder="Event name"
                style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}
              />
              <EditableField
                as="div"
                context={`Schedule item ${i + 1} description`}
                value={e.description ?? ''}
                onSave={makePatchEvent(onEditField, e.id, i)('description')}
                multiline
                placeholder="What guests can expect…"
                ariaLabel={`Schedule item ${i + 1} description`}
                maxLength={240}
                style={{ fontSize: 13, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Per-kit card chrome helper. Returns the row container
   style (background, border, radius, shadow, transform) for the
   active kit so Travel + other small-card sections share the
   same visual identity as Schedule/Story/FAQ without each one
   duplicating a 5-case switch. ─── */
function kitCardStyle(kit: string, index = 0): React.CSSProperties {
  switch (kit) {
    case 'ticket':
      return { background: 'var(--card, #FBF7EE)', border: '1.5px dashed var(--ink-soft, #3A332C)', borderRadius: 6, position: 'relative' };
    case 'plate':
      return { background: 'var(--card, #FBF7EE)', borderRadius: 1, boxShadow: 'inset 0 0 0 1px rgba(14,13,11,0.30), inset 0 0 0 4px var(--card, #FBF7EE), inset 0 0 0 5px rgba(14,13,11,0.15)', border: 'none' };
    case 'scrapbook':
      return { background: '#FFFDF7', boxShadow: '0 12px 26px rgba(0,0,0,0.14)', borderRadius: 2, transform: `rotate(${index % 2 === 0 ? -1.2 : 1.2}deg)`, border: 'none' };
    case 'index':
      return { background: 'var(--card, #FBF7EE)', borderLeft: '2px solid rgba(199,80,80,0.55)', backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 21px, rgba(74,118,196,0.10) 21px 22px)', borderRadius: 2, border: 'none' };
    case 'minimal':
      return { background: 'transparent', border: 'none', borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.08))', borderRadius: 0, padding: '20px 0 0' };
    default:
      return { background: 'var(--card, #FBF7EE)', borderRadius: 'var(--pl-card-radius, 14px)', border: '1px solid var(--line-soft, rgba(14,13,11,0.08))', boxShadow: 'var(--pl-card-shadow, 0 4px 14px rgba(75,65,52,0.10))' };
  }
}

/* ─── ThemedTravel — editorial hotel listing. Card chrome
   inherits from the active Kit via kitCardStyle so a "scrapbook"
   site has tilted polaroid hotels and a "ticket" site has
   perforated stubs — same as schedule. ─── */
/* Helper: patch a single hotel field. Matches by id first so
   reorders don't drift, then by index as fallback — mirrors the
   makePatchEvent/makePatchChapter pattern used elsewhere. */
function makePatchHotel(
  onEditField: FieldEditor | undefined,
  hotelId: string | undefined,
  hotelIndex: number,
) {
  return (field: 'name' | 'description' | 'address') => (value: string) => {
    if (!onEditField) return;
    onEditField((m) => {
      const travelInfo = (m.travelInfo ?? {}) as { hotels?: Array<Record<string, unknown>> };
      const hotels = [...((travelInfo.hotels ?? []) as Array<Record<string, unknown>>)];
      let idx = hotelId
        ? hotels.findIndex((h) => (h as { id?: string }).id === hotelId)
        : -1;
      if (idx < 0) idx = hotelIndex;
      if (idx < 0 || idx >= hotels.length) return m;
      hotels[idx] = { ...hotels[idx], [field]: value };
      return {
        ...m,
        travelInfo: { ...travelInfo, hotels },
      } as unknown as StoryManifest;
    });
  };
}

/* Shared hotel-card content used by `rows`, `map`, and `carousel`
 * variants. Encapsulates the photo block + name + rating /
 * price line + distance + blurb + amenity chips + Book CTA so each
 * variant just sets up the outer container (single column, 2-col
 * grid, or horizontal swipe) without re-deriving fields. */
function ThemedHotelCard({
  hotel,
  index,
  kit,
  onEditField,
  compact,
}: {
  hotel: NonNullable<StoryManifest['travelInfo']>['hotels'][number];
  index: number;
  kit: string;
  onEditField?: FieldEditor;
  /** `true` for carousel — narrower card, photo on top instead of left. */
  compact?: boolean;
}) {
  const extra = hotel as unknown as {
    distance?: string;
    photoUrl?: string;
    rating?: number;
    ratingCount?: number;
    amenities?: string;
    priceLevel?: string;
    description?: string;
    notes?: string;
  };
  const distance = extra.distance;
  const photoUrl = extra.photoUrl;
  const rating = typeof extra.rating === 'number' ? extra.rating : undefined;
  const ratingCount = extra.ratingCount;
  const priceTier = extra.priceLevel;
  const amenityChips = (extra.amenities ?? '')
    .split(/\s·\s|,\s?/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const blurb = extra.description || extra.notes;
  const tonePalette = [
    'var(--peach-bg, rgba(198,112,61,0.18))',
    'color-mix(in oklab, var(--peach-ink, #C6703D) 12%, var(--paper, #F5EFE2))',
    'color-mix(in oklab, var(--peach-ink, #C6703D) 22%, var(--paper, #F5EFE2))',
  ];
  const patch = makePatchHotel(onEditField, (hotel as { id?: string }).id, index);
  const photoStyle: React.CSSProperties = photoUrl
    ? { backgroundImage: `url(${photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: tonePalette[index % tonePalette.length] };
  return (
    <div
      className="pl8-hotel-row"
      style={{
        ...kitCardStyle(kit, index),
        padding: compact ? 0 : 14,
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 0 : 12,
        overflow: 'hidden',
      }}
    >
      {compact ? (
        // Carousel layout — photo banner on top, content below.
        <>
          <div style={{ aspectRatio: '16/9', width: '100%', ...photoStyle }} />
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <EditableText
                as="div"
                value={hotel.name ?? ''}
                onSave={patch('name')}
                ariaLabel={`Hotel ${index + 1} name`}
                maxLength={140}
                placeholder="Hotel name"
                style={{
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontWeight: 'var(--pl-display-wght, 600)',
                  fontSize: 19,
                  color: 'var(--ink, #0E0D0B)',
                  lineHeight: 1.15,
                  flex: 1,
                  minWidth: 0,
                }}
              />
              {priceTier && (
                <span style={{ fontSize: 12.5, color: 'var(--ink-muted, #6F6557)', fontWeight: 700 }}>
                  {priceTier}
                </span>
              )}
            </div>
            {(typeof rating === 'number' || distance) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 12,
                  color: 'var(--ink-soft, #3A332C)',
                  flexWrap: 'wrap',
                }}
              >
                {typeof rating === 'number' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Icon
                        key={n}
                        name="star"
                        size={11}
                        color={n <= Math.round(rating) ? 'var(--gold, #B8935A)' : 'var(--cream-3, #D8CFB8)'}
                      />
                    ))}
                    <b style={{ marginLeft: 4, color: 'var(--ink, #0E0D0B)' }}>{rating.toFixed(1)}</b>
                    {ratingCount ? (
                      <span style={{ color: 'var(--ink-muted, #6F6557)' }}> ({ratingCount.toLocaleString()})</span>
                    ) : null}
                  </span>
                )}
                {distance && typeof rating === 'number' && (
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-muted, #6F6557)' }} />
                )}
                {distance && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Icon name="pin" size={11} color="var(--peach-ink, #C6703D)" /> {distance}
                  </span>
                )}
              </div>
            )}
            {(blurb || onEditField) && (
              <EditableField
                as="div"
                context={`Hotel ${index + 1} description`}
                value={blurb ?? ''}
                onSave={patch('description')}
                multiline
                maxLength={500}
                placeholder="Add a short editorial line about this hotel…"
                ariaLabel={`Hotel ${index + 1} description`}
                style={{ fontSize: 12.5, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.5 }}
              />
            )}
            {amenityChips.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {amenityChips.map((a) => (
                  <span
                    key={a}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: 'var(--sage-deep, #5C6B3F)',
                      background: 'var(--sage-tint, rgba(92,107,63,0.10))',
                      padding: '3px 8px',
                      borderRadius: 999,
                      border: '1px solid rgba(92,107,63,0.18)',
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}
            {hotel.bookingUrl && (
              <a
                href={hotel.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--peach-ink, #C6703D)',
                  textDecoration: 'none',
                }}
              >
                Book <Icon name="arrow-ur" size={11} color="var(--peach-ink, #C6703D)" />
              </a>
            )}
          </div>
        </>
      ) : (
        // Default (rows / map) — 84x84 photo block on the left.
        <>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 84,
                height: 84,
                flexShrink: 0,
                borderRadius: 'var(--pl-card-radius, 8px)',
                ...photoStyle,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <EditableText
                as="div"
                value={hotel.name ?? ''}
                onSave={patch('name')}
                ariaLabel={`Hotel ${index + 1} name`}
                maxLength={140}
                placeholder="Hotel name"
                style={{
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontWeight: 'var(--pl-display-wght, 600)',
                  fontSize: 19,
                  color: 'var(--ink, #0E0D0B)',
                  lineHeight: 1.15,
                }}
              />
              {(typeof rating === 'number' || priceTier) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    marginTop: 4,
                    fontSize: 12,
                    color: 'var(--ink-soft, #3A332C)',
                    flexWrap: 'wrap',
                  }}
                >
                  {typeof rating === 'number' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Icon
                          key={n}
                          name="star"
                          size={11}
                          color={n <= Math.round(rating) ? 'var(--gold, #B8935A)' : 'var(--cream-3, #D8CFB8)'}
                        />
                      ))}
                      <b style={{ marginLeft: 4, color: 'var(--ink, #0E0D0B)' }}>{rating.toFixed(1)}</b>
                      {ratingCount ? (
                        <span style={{ color: 'var(--ink-muted, #6F6557)' }}>
                          {' '}({ratingCount.toLocaleString()})
                        </span>
                      ) : null}
                    </span>
                  )}
                  {priceTier && (
                    <>
                      {typeof rating === 'number' && <span style={{ color: 'var(--ink-muted, #6F6557)' }}>·</span>}
                      <span style={{ fontWeight: 700 }}>{priceTier}</span>
                    </>
                  )}
                </div>
              )}
              {(distance || hotel.address) && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-muted, #6F6557)',
                    marginTop: 3,
                    lineHeight: 1.4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Icon name="pin" size={10} color="var(--ink-muted, #6F6557)" />
                  {distance ?? hotel.address}
                </div>
              )}
              {hotel.bookingUrl && (
                <a
                  href={hotel.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 7,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--peach-ink, #C6703D)',
                    textDecoration: 'none',
                  }}
                >
                  Book <Icon name="arrow-ur" size={11} color="var(--peach-ink, #C6703D)" />
                </a>
              )}
            </div>
          </div>
          {(blurb || onEditField) && (
            <EditableField
              as="div"
              context={`Hotel ${index + 1} description`}
              value={blurb ?? ''}
              onSave={patch('description')}
              multiline
              maxLength={500}
              placeholder="Add a short editorial line about this hotel…"
              ariaLabel={`Hotel ${index + 1} description`}
              style={{ fontSize: 12.5, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.5 }}
            />
          )}
          {amenityChips.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {amenityChips.map((a) => (
                <span
                  key={a}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: 'var(--sage-deep, #5C6B3F)',
                    background: 'var(--sage-tint, rgba(92,107,63,0.10))',
                    padding: '3px 8px',
                    borderRadius: 999,
                    border: '1px solid rgba(92,107,63,0.18)',
                  }}
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Illustrated map strip used by the `map` and `carousel` travel
 * variants. Pure decorative CSS composition — checker grid + two
 * tilted accent "roads" + three teardrop pins, capped by a place
 * label in the corner. Mirrors the prototype's map block in
 * themed-site.jsx TravelBlock (lines 604-617). Honours the active
 * Edition's accent through var(--accent) / var(--peach-ink). */
function ThemedTravelMapStrip({ place }: { place: string }) {
  const pins: Array<{ left: string; top: string; icon: 'home' | 'heart-icon'; color: string }> = [
    { left: '28%', top: '30%', icon: 'heart-icon', color: 'var(--peach-ink, #C6703D)' },
    { left: '52%', top: '58%', icon: 'home', color: 'var(--accent, #5C6B3F)' },
    { left: '72%', top: '38%', icon: 'home', color: 'var(--accent, #5C6B3F)' },
  ];
  return (
    <div
      style={{
        position: 'relative',
        height: 150,
        borderRadius: 'var(--pl-card-radius, 14px)',
        overflow: 'hidden',
        border: '1px solid var(--line, var(--cream-3, #D8CFB8))',
        marginBottom: 18,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, color-mix(in oklab, var(--accent, #5C6B3F) 12%, var(--card, #FBF7EE)), color-mix(in oklab, var(--peach-ink, #C6703D) 16%, var(--card, #FBF7EE)))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, var(--line-soft, rgba(14,13,11,0.08)) 0 1px, transparent 1px 30px), repeating-linear-gradient(90deg, var(--line-soft, rgba(14,13,11,0.08)) 0 1px, transparent 1px 30px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: '18%',
          width: 130,
          height: 9,
          background: 'color-mix(in oklab, var(--accent, #5C6B3F) 35%, transparent)',
          borderRadius: 5,
          transform: 'rotate(16deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 34,
          right: '20%',
          width: 160,
          height: 9,
          background: 'color-mix(in oklab, var(--accent, #5C6B3F) 30%, transparent)',
          borderRadius: 5,
          transform: 'rotate(-10deg)',
        }}
      />
      {pins.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: p.left, top: p.top }}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 28,
              height: 28,
              borderRadius: '50% 50% 50% 0',
              background: p.color,
              transform: 'rotate(-45deg)',
              boxShadow: '0 3px 8px rgba(0,0,0,0.22)',
            }}
          >
            <span style={{ transform: 'rotate(45deg)', display: 'inline-flex' }}>
              <Icon name={p.icon} size={13} color="var(--paper, #F5EFE2)" />
            </span>
          </span>
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 12,
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--ink, #0E0D0B)',
          background: 'var(--card, #FBF7EE)',
          padding: '3px 10px',
          borderRadius: 999,
          boxShadow: '0 4px 10px rgba(0,0,0,0.10)',
        }}
      >
        {place}
      </div>
    </div>
  );
}

function ThemedTravel({ manifest, motif, editMode, onEditField }: { manifest: StoryManifest; motif: MotifKind; editMode?: boolean; onEditField?: FieldEditor }) {
  const hotels = manifest.travelInfo?.hotels ?? [];
  if (hotels.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="travel"
        background="var(--cream-2, #EBE3D2)"
        eyebrow="Getting there"
        title="Where to"
        italic="stay"
        body="Drop in hotels, group rates, transit notes. Pear can suggest places near your venue."
        cta="Add a hotel"
      />
    );
  }
  const kit = manifest.kitId ?? 'classic';
  // Travel-level metadata read off the legacy `manifest.travel`
  // shape (panel writes both). Block code renders as a small pill
  // under the section head when present.
  const travelMeta = (manifest as unknown as { travel?: { blockCode?: string } }).travel ?? {};

  /* Variant dispatch — reads manifest.blockVariants.travel.style
     with a `rows` default. Each variant lays out the hotels list
     differently using the shared ThemedHotelCard (rows / map /
     carousel) or a dedicated compact row (table). Mirrors the
     prototype's TravelBlock in themed-site.jsx (~line 572) which
     switches between 'table' and the card-grid layout with an
     optional map strip + carousel mode. */
  type TravelVariant = 'rows' | 'map' | 'table' | 'carousel';
  const travelVariant: TravelVariant = (() => {
    const raw = (manifest.blockVariants?.travel?.style as string | undefined) ?? 'rows';
    const known: TravelVariant[] = ['rows', 'map', 'table', 'carousel'];
    return (known.includes(raw as TravelVariant) ? raw : 'rows') as TravelVariant;
  })();

  /* Place label for the map strip. Prefer logistics city when set;
     falls through to venue + the first hotel's address so the pill
     never reads 'undefined'. */
  const placeLabel =
    ((manifest.logistics as unknown as { city?: string })?.city) ??
    manifest.logistics?.venue ??
    (hotels[0]?.address as string | undefined) ??
    'Find us here';

  return (
    <section
      id="travel"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--t-section)',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="travel" />
      <MotifScatter motif={motif} density="sparse" />
      <ThemedSectionHead eyebrow="Getting there" title="Where to" italic="stay" manifest={manifest} sectionKey="travel" />
      {/* Optional group block code — peach pill centred under the
          head. Surfaces the hotel block code Pear lets the host
          negotiate (TravelPanel "Group block code" field). */}
      {travelMeta.blockCode && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: '-4px 0 22px',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '5px 12px',
              borderRadius: 999,
              background: 'var(--peach-bg, rgba(198,112,61,0.10))',
              color: 'var(--peach-ink, #C6703D)',
              border: '1px solid rgba(198,112,61,0.20)',
            }}
          >
            Block code · {travelMeta.blockCode}
          </span>
        </div>
      )}

      {travelVariant === 'table' ? (
        // Comparison table — name+amenity sub | stars | price | distance.
        // 4-col grid, one row per hotel, hairline separators. No
        // photos — this variant reads as a quick at-a-glance
        // comparison sheet like a travel agent's printout. Port of
        // TravelBlock's table branch in themed-site.jsx (~line 579-596).
        <div style={{ maxWidth: 680, marginInline: 'auto' }}>
          {hotels.map((h, i) => {
            const extra = h as unknown as {
              distance?: string;
              rating?: number;
              amenities?: string;
              priceLevel?: string;
            };
            const amenitySub = (extra.amenities ?? '')
              .split(/\s·\s|,\s?/)
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 2)
              .join(' · ');
            const rating = typeof extra.rating === 'number' ? extra.rating : undefined;
            return (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr auto auto auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '14px 4px',
                  borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
                }}
              >
                <div>
                  <EditableText
                    as="div"
                    value={h.name ?? ''}
                    onSave={makePatchHotel(onEditField, (h as { id?: string }).id, i)('name')}
                    ariaLabel={`Hotel ${i + 1} name`}
                    maxLength={140}
                    placeholder="Hotel name"
                    style={{
                      fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                      fontWeight: 'var(--pl-display-wght, 600)',
                      fontSize: 18,
                      color: 'var(--ink, #0E0D0B)',
                      lineHeight: 1.15,
                    }}
                  />
                  {amenitySub && (
                    <div style={{ fontSize: 12, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>
                      {amenitySub}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <Icon name="star" size={12} color="var(--gold, #B8935A)" />
                  <b style={{ color: 'var(--ink, #0E0D0B)' }}>
                    {typeof rating === 'number' ? rating.toFixed(1) : '—'}
                  </b>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft, #3A332C)', fontWeight: 600 }}>
                  {extra.priceLevel ?? '—'}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--peach-ink, #C6703D)',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon name="pin" size={11} color="var(--peach-ink, #C6703D)" />
                  {extra.distance ?? (h.address ? 'On site' : '—')}
                </div>
              </div>
            );
          })}
        </div>
      ) : travelVariant === 'carousel' ? (
        // Horizontal swipe — fixed 300px slides flex-flowing past
        // the viewport edge. Photos sit on top of each card
        // (compact mode). The map strip sits ABOVE the carousel as
        // a banner — the intent mirrors the prototype's "map +
        // cards in a swipe" feel.
        <div style={{ position: 'relative', maxWidth: 820, marginInline: 'auto' }}>
          <ThemedTravelMapStrip place={placeLabel} />
          <div
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 6,
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {hotels.map((h, i) => (
              <div
                key={i}
                style={{
                  flex: '0 0 300px',
                  scrollSnapAlign: 'start',
                }}
              >
                <ThemedHotelCard hotel={h} index={i} kit={kit} onEditField={onEditField} compact />
              </div>
            ))}
          </div>
        </div>
      ) : travelVariant === 'map' ? (
        // Illustrated map strip with hotel cards underneath in a
        // 2-col grid. Map sits as the section anchor; the cards
        // are the "pin keys". Cards reuse the standard 84x84 photo
        // + side content layout so the section reads consistently
        // with rows.
        <div style={{ position: 'relative', maxWidth: 820, marginInline: 'auto' }}>
          <ThemedTravelMapStrip place={placeLabel} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {hotels.map((h, i) => (
              <ThemedHotelCard key={i} hotel={h} index={i} kit={kit} onEditField={onEditField} />
            ))}
          </div>
        </div>
      ) : (
        // Default 'rows' — port of prototype's TravelBlock
        // card-grid layout (themed-site.jsx ~line 619-644). 2-col
        // auto-fit grid, each card 14px padding flex layout with
        // an 84x84 photo placeholder + content block. Booking CTA
        // is INLINE (Book ↗) not a pill.
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16,
            maxWidth: 780,
            margin: '0 auto',
          }}
        >
          {hotels.map((h, i) => (
            <ThemedHotelCard key={i} hotel={h} index={i} kit={kit} onEditField={onEditField} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── ThemedRegistry — elegant card row. Each registry entry is
   a substantial card with a peach-tint gift glyph at the top,
   the registry name in display font, and an "Open ↗" pill. The
   message reads as the section's body copy in italic above the
   row. ─── */
function ThemedRegistry({ manifest, editMode, onEditField }: { manifest: StoryManifest; editMode?: boolean; onEditField?: FieldEditor }) {
  const reg = (manifest as unknown as { registry?: { entries?: Array<{ name?: string; label?: string; url: string }>; message?: string } }).registry;
  const entries = reg?.entries ?? [];
  if (entries.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="registry"
        eyebrow="If you're asking"
        title="Registry,"
        italic="gently"
        body="Paste links to your registry, or set up a cash fund. Pear will format the cards in your theme."
        cta="Link a registry"
      />
    );
  }

  /* Variant dispatcher — chips / progress / logowall live in
     registry-variants.ts. Unknown ids (or the default 'cards' id)
     fall through to the existing chip-row body below so the
     shipped layout stays byte-for-byte unchanged. */
  const variantId = (manifest.blockVariants?.registry?.style as string | undefined) ?? 'cards';
  const message = reg?.message ?? '';
  const variantNode =
    variantId === 'chips' || variantId === 'progress' || variantId === 'logowall'
      ? renderRegistryVariant(variantId, { manifest, entries, message, editMode, onEditField })
      : null;

  return (
    <section
      id="registry"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="registry" />
      <ThemedSectionHead eyebrow="If you're asking" title="Registry," italic="gently" manifest={manifest} sectionKey="registry" />
      {variantNode ?? (
        <>
          {(reg?.message || onEditField) && (
            <EditableField
              as="div"
              context="Registry note"
              value={reg?.message ?? ''}
              onSave={(v) =>
                onEditField?.((m) => {
                  const r = (m as unknown as { registry?: Record<string, unknown> }).registry ?? {};
                  return {
                    ...m,
                    registry: { ...r, message: v },
                  } as unknown as StoryManifest;
                })
              }
              multiline
              maxLength={400}
              placeholder="Add a gentle note about gifts…"
              ariaLabel="Registry note"
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontStyle: 'italic',
                fontSize: 17,
                color: 'var(--ink-soft, #3A332C)',
                maxWidth: 560,
                margin: '0 auto 32px',
                lineHeight: 1.55,
              }}
            />
          )}
          {/* Registry chips — port of prototype's RegistryBlock (themed-
              site.jsx ~line 412). Each entry is a small KChip-shaped
              row, NOT a substantial card; the prototype's intent is
              that the registry sits as a quiet footnote at the bottom
              of the site, not as a hero feature. Per-kit treatment
              inherits via kitCardStyle for chrome consistency. */}
          <div
            className="pl8-registry-chips"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
              maxWidth: 720,
              margin: '0 auto',
            }}
          >
            {entries.map((e, i) => (
              <a
                key={i}
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...kitCardStyle(manifest.kitId ?? 'classic', i),
                  padding: '11px 18px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'var(--ink, #0E0D0B)',
                }}
              >
                <span>{e.name ?? e.label ?? 'Registry'}</span>
                <Icon name="arrow-ur" size={11} color="var(--peach-ink, #C6703D)" />
              </a>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ─── Edition-aware tile frame helper — ported from
   ThemedSiteRenderer's tileFrameForEdition. Returns a style fragment
   applied to each gallery tile so the surrounding photo "frame"
   picks up the active Edition's design language. Mosaic / strip /
   wall all share the same per-Edition frame vocabulary so the
   gallery reads as one design idea regardless of layout choice.

   Cinema   — 2px sharp ink frame, no shadow (letterboxed film)
   Linen    — 1px gold hairline inset 5px (formal stationery)
   Postcard — pillow radius + lifted shadow (physical print)
   Almanac  — soft 8px frame + 1px hairline (bound-book editorial)
   Quiet    — borderless, no shadow (photos breathe)
   Coastal  — 10px rounded + cyan-tint hairline */
type ThemedTileFrame = {
  borderRadius: number | string;
  boxShadow: string;
  border?: string;
  padding?: number;
  background?: string;
};

function themedTileFrameForEdition(editionId: string): ThemedTileFrame {
  switch (editionId) {
    case 'cinema':
      return {
        borderRadius: 2,
        border: '2px solid var(--ink, #0E0D0B)',
        boxShadow: 'none',
      };
    case 'linen-folder':
      return {
        borderRadius: 4,
        padding: 5,
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--gold, #B8935A)',
        boxShadow: '0 1px 0 rgba(184,147,90,0.18)',
      };
    case 'postcard-box':
      return {
        borderRadius: 24,
        padding: 0,
        boxShadow: '0 18px 32px rgba(61,74,31,0.18), 0 4px 10px rgba(61,74,31,0.10)',
      };
    case 'quiet':
      return {
        borderRadius: 0,
        boxShadow: 'none',
      };
    case 'coastal':
      return {
        borderRadius: 10,
        border: '1px solid rgba(96, 144, 158, 0.45)',
        boxShadow: '0 6px 14px rgba(58, 102, 122, 0.16)',
      };
    case 'almanac':
    default:
      return {
        borderRadius: 8,
        border: '1px solid rgba(14, 13, 11, 0.10)',
        boxShadow: '0 8px 20px rgba(61,74,31,0.10)',
      };
  }
}

/* ─── ThemedGallery — variant-aware editorial photo grid.
   Dispatches on manifest.blockVariants?.gallery?.style:
     mosaic — bento grid (default). Row + col spans per tile so
              the wall reads as natural rather than uniform.
     wall   — uniform 1:1 tiles in auto-fit grid (180px min).
              Every tile the same aspect ratio so the section
              reads as wallpaper, not curated mix.
     strip  — horizontal snap-scroll filmstrip at 280px fixed
              width per tile, with desktop chevron affordances.

   Each tile gets a per-Edition frame (Cinema sharp 2px, Linen
   gold hairline, Postcard pillow lift, Almanac soft 8px, Quiet
   borderless, Coastal cyan-tint rounded) so the layout choice
   and the Edition's design language compound rather than
   conflict. Mirrors ThemedSiteRenderer's GallerySectionImpl. ─── */
function ThemedGallery({ manifest, editMode, onEditField }: { manifest: StoryManifest; editMode?: boolean; onEditField?: FieldEditor }) {
  /* Build (url, chapterIndex, imageIndex) sources so edits patch
     the real chapter that owns each photo — same pattern V8 uses
     in GallerySectionImpl. */
  const chapters = manifest.chapters ?? [];
  const photoSources = chapters
    .flatMap((c, ci) => (c.images ?? []).map((img, ii) => ({ url: img.url, chapterIndex: ci, imageIndex: ii })))
    .filter((x) => x.url);
  /* Cap at 12 to match the ThemedSiteRenderer cap — strip / wall
     variants need a few extra tiles vs the prior 11 to read as
     filled. PhotoActionMenu sources align by the same slice so
     index math stays consistent between display + edit. */
  const visibleSources = photoSources.slice(0, 12);
  const photos = visibleSources.map((p) => p.url);

  /* Lightbox state — only opens for real photos (no placeholders).
     Always mounted via hook so React's hook order stays stable
     regardless of edit mode. */
  const lightboxImages = useMemo(() => photos.map((url) => ({ url })), [photos]);
  const { index, open, close, next, prev } = usePhotoLightbox(lightboxImages);

  /* Resolve active edition once so per-tile frames + variant
     dispatch share the same source of truth. Mirrors the
     resolution chain used elsewhere in ThemedSiteRenderer. */
  const occasion = manifest.occasion ?? 'wedding';
  const eventType = getEventType(occasion);
  const voice = eventType?.voice ?? 'celebratory';
  const activeEdition = resolveEdition({
    edition: manifest.edition,
    occasion: occasion as Parameters<typeof resolveEdition>[0]['occasion'],
    voice,
  });
  const editionId = activeEdition.id;
  const frame = themedTileFrameForEdition(editionId);

  /* Variant dispatcher — supports all 7 gallery variants. Read
     once so all tiles share the same layout. Defaults to mosaic
     when blockVariants is unset or carries an unknown value.
     Variants:
       mosaic    — bento grid w/ row+col span pattern (default).
       wall      — uniform 1:1 tiles, auto-fit 180px min.
       strip     — horizontal snap-scroll filmstrip.
       grid      — 6-column uniform 1:1 — wider density than wall.
       masonry   — CSS-columns waterfall, varied tile heights.
       slideshow — hero photo on top + 6-up thumbnail strip.
       polaroid  — scattered tilted polaroid cards on a flex wrap. */
  type GalleryVariant = 'mosaic' | 'wall' | 'strip' | 'grid' | 'masonry' | 'slideshow' | 'polaroid';
  const galleryVariant: GalleryVariant = (() => {
    const raw = (manifest.blockVariants?.gallery?.style as string | undefined) ?? 'mosaic';
    const known: GalleryVariant[] = ['mosaic', 'wall', 'strip', 'grid', 'masonry', 'slideshow', 'polaroid'];
    return (known.includes(raw as GalleryVariant) ? raw : 'mosaic') as GalleryVariant;
  })();

  /* Filmstrip scroller state — desktop chevron affordances fade
     when at the edge of the scroll. Hook always runs to keep
     React hook order stable. */
  const stripScrollerRef = useRef<HTMLDivElement | null>(null);
  const [stripScroll, setStripScroll] = useState({ atStart: true, atEnd: false });
  useEffect(() => {
    if (galleryVariant !== 'strip') return;
    const el = stripScrollerRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setStripScroll({
        atStart: el.scrollLeft <= 4,
        atEnd: max <= 4 || el.scrollLeft >= max - 4,
      });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [galleryVariant, photos.length]);
  function scrollStrip(direction: 1 | -1) {
    const el = stripScrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * (el.clientWidth * 0.8), behavior: 'smooth' });
  }

  if (photos.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="gallery"
        background="var(--cream-2, #EBE3D2)"
        eyebrow="Along the way"
        title="A few"
        italic="favorites"
        body="Photos from your chapters land here automatically — or upload to the Gallery panel for a curated mosaic."
        cta="Add photos"
      />
    );
  }
  const tones = ['#E8C8B4', '#D8CFB8', '#C4B5D9', '#F4D5CD', '#F0C9A8', '#FBE8D6'];
  const canEdit = !!editMode && !!onEditField;

  /* Mosaic span pattern — every 3rd tile spans 2 rows; every 5th
     spans 2 columns. Pattern repeats so any-length gallery has
     visual rhythm. */
  const mosaicSpans = (i: number) => ({
    tallSpan: i % 5 === 0 || i % 5 === 3,
    wideSpan: i % 7 === 2,
  });

  /* Per-tile renderer — shared across all variants so every
     layout gets the same edition-frame + clickability + edit
     dispatch. tileKind drives the variant-specific geometry. */
  const renderTile = (
    i: number,
    tileKind: 'mosaic' | 'wall' | 'strip' | 'grid' | 'masonry' | 'slideshow-hero' | 'slideshow-thumb' | 'polaroid',
  ) => {
    const url = photos[i];
    const src = visibleSources[i];
    const onReplace = src && onEditField
      ? (nextUrl: string) => onEditField((m) => {
          const arr = [...(m.chapters ?? [])];
          const ch = arr[src.chapterIndex];
          if (!ch) return m;
          const imgs = [...(ch.images ?? [])];
          const orig = imgs[src.imageIndex];
          if (!orig) return m;
          imgs[src.imageIndex] = { ...orig, url: nextUrl };
          arr[src.chapterIndex] = { ...ch, images: imgs };
          return { ...m, chapters: arr };
        })
      : undefined;
    const onRemove = src && onEditField
      ? () => onEditField((m) => {
          const arr = [...(m.chapters ?? [])];
          const ch = arr[src.chapterIndex];
          if (!ch) return m;
          const imgs = [...(ch.images ?? [])];
          imgs.splice(src.imageIndex, 1);
          arr[src.chapterIndex] = { ...ch, images: imgs };
          return { ...m, chapters: arr };
        })
      : undefined;
    const clickable = !canEdit && !!url;
    /* Per-variant geometry. Mosaic respects the span hints; wall
       forces uniform 1:1 tiles via aspect-ratio; strip pins each
       tile to 280px width / 320px height so the row reads as a
       filmstrip with snap-scroll points. */
    const spans = mosaicSpans(i);
    /* Masonry uses a repeating aspect-ratio pattern so each tile
       takes its own height in the CSS-columns waterfall. Polaroid
       uses a per-tile rotation so the wall reads as scattered. */
    const masonryAspects = ['3 / 4', '1 / 1', '4 / 5', '1 / 1', '3 / 4', '1 / 1'];
    const polaroidRotations = [-3, 2, -1.5, 3, -2, 1.5, -2.5, 2];
    const variantStyle: React.CSSProperties = (() => {
      switch (tileKind) {
        case 'mosaic':
          return {
            gridRow: spans.tallSpan ? 'span 2' : 'span 1',
            gridColumn: spans.wideSpan ? 'span 2' : 'span 1',
          };
        case 'wall':
          return { aspectRatio: '1 / 1', width: '100%' };
        case 'grid':
          /* Uniform 6-col tighter density than wall — same square
             tile but at a denser packing. */
          return { aspectRatio: '1 / 1', width: '100%' };
        case 'masonry':
          /* Waterfall — each tile keeps its column width and
             takes the assigned aspect ratio. break-inside avoid
             keeps the tile intact across columns. */
          return {
            aspectRatio: masonryAspects[i % masonryAspects.length],
            width: '100%',
            breakInside: 'avoid',
            display: 'block',
            marginBottom: 9,
          };
        case 'slideshow-hero':
          return { aspectRatio: '16 / 9', width: '100%' };
        case 'slideshow-thumb':
          return { aspectRatio: '1 / 1', width: '100%' };
        case 'polaroid':
          /* Scattered tilted polaroid card — outer wrapper carries
             the cream "card" + tilt, the tile inside is the photo
             itself with a 1:1 aspect. */
          return { aspectRatio: '1 / 1', width: '100%' };
        case 'strip':
        default:
          return {
            flex: '0 0 280px',
            width: 280,
            height: 320,
            scrollSnapAlign: 'start',
          };
      }
    })();
    /* Polaroid: wrap the tile in a cream card with bottom-padding
       and rotation. Cards stack on a flex-wrap row so each polaroid
       sits beside its neighbor. */
    const polaroidWrap = tileKind === 'polaroid';
    const polaroidRot = polaroidRotations[i % polaroidRotations.length];
    /* Linen-folder frame has an inset cream-card "mat" with the
       photo sitting inside it (5px padding). For that case the
       frame's background paints the mat, and an inner element
       carries the photo. For all other Editions the tile div
       itself carries the photo bg-image + tone fallback. */
    const hasInsetMat = !!frame.padding && frame.padding > 0;
    const outerStyle: React.CSSProperties = {
      borderRadius: frame.borderRadius,
      border: frame.border,
      padding: frame.padding,
      background: frame.background,
      boxShadow: frame.boxShadow,
      cursor: clickable ? 'zoom-in' : 'default',
      position: 'relative',
      overflow: 'hidden',
      ...variantStyle,
      // When there's no inset mat, the outer div carries the photo
      // directly so the frame border hugs the image. When there
      // IS a mat (linen-folder), the photo lives in an inner div
      // and the outer keeps the frame's cream-card background.
      ...(hasInsetMat
        ? {}
        : {
            backgroundImage: url ? `url(${url})` : undefined,
            backgroundColor: url ? undefined : tones[i % tones.length],
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }),
    };
    const tile = (
      <div
        key={`${tileKind}-${i}`}
        onClick={clickable ? () => open(i) : undefined}
        className={`pl8-gallery-tile pl-edition-${editionId}`}
        data-pl-edition={editionId}
        style={outerStyle}
        role={clickable ? 'button' : undefined}
        aria-label={clickable ? `Open photo ${i + 1} of ${photos.length}` : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open(i);
              }
            }
          : undefined}
      >
        {hasInsetMat ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: url ? `url(${url})` : 'none',
              backgroundColor: url ? undefined : tones[i % tones.length],
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: Math.max(0, Number(frame.borderRadius) - 1),
            }}
          />
        ) : null}
      </div>
    );
    /* Polaroid: wrap the tile in a tilted cream card so each
       photo reads as a printed snapshot. Card carries the rotate
       transform + a subtle drop shadow + extra bottom padding for
       the "handwritten label" feel. */
    const wrapped = polaroidWrap ? (
      <div
        key={`${tileKind}-${i}-poly`}
        style={{
          width: 170,
          background: 'var(--card, #FBF7EE)',
          padding: '10px 10px 30px',
          boxShadow: '0 10px 22px rgba(14,13,11,0.16)',
          transform: `rotate(${polaroidRot}deg)`,
          transition: 'transform var(--pl-dur-base, 280ms) var(--pl-ease-out, cubic-bezier(0.22, 1, 0.36, 1))',
        }}
      >
        {tile}
      </div>
    ) : tile;
    /* In edit mode wrap with PhotoActionMenu so right-click /
       long-press / hover reveals replace + remove. */
    if (canEdit) {
      return (
        <PhotoActionMenu
          key={`${tileKind}-${i}`}
          imageUrl={url}
          onReplace={onReplace}
          onRemove={onRemove}
        >
          {wrapped}
        </PhotoActionMenu>
      );
    }
    if (polaroidWrap) return wrapped;
    return tile;
  };

  return (
    <section
      id="gallery"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--t-section)',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="gallery" />
      <ThemedSectionHead eyebrow="Along the way" title="A few" italic="favorites" manifest={manifest} sectionKey="gallery" />

      {galleryVariant === 'strip' && (
        /* Filmstrip — horizontal snap-scroll row. Photos at 280px
           fixed width, snap-x mandatory. Desktop chevrons fade at
           the scroll edges. */
        <div
          className="pl8-gallery-strip-wrap"
          style={{ position: 'relative', maxWidth: 1180, margin: '0 auto' }}
        >
          <div
            ref={stripScrollerRef}
            className="pl8-gallery-strip"
            style={{
              display: 'flex',
              gap: 14,
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollSnapType: 'x mandatory',
              paddingBottom: 8,
              scrollbarWidth: 'thin',
            }}
          >
            {photos.map((_, i) => renderTile(i, 'strip'))}
          </div>
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollStrip(-1)}
            className="pl8-gallery-strip-arrow pl8-gallery-strip-arrow--left"
            style={{
              position: 'absolute',
              top: '50%',
              left: -6,
              transform: 'translateY(-50%)',
              width: 40,
              height: 40,
              borderRadius: 999,
              border: '1px solid var(--ink-soft, #6F6557)',
              background: 'var(--card, #FBF7EE)',
              color: 'var(--ink, #0E0D0B)',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(14,13,11,0.12)',
              fontSize: 18,
              lineHeight: 1,
              opacity: stripScroll.atStart ? 0 : 1,
              pointerEvents: stripScroll.atStart ? 'none' : 'auto',
              transition: 'opacity var(--pl-dur-fast, 180ms) var(--pl-ease-out, cubic-bezier(0.22, 1, 0.36, 1))',
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollStrip(1)}
            className="pl8-gallery-strip-arrow pl8-gallery-strip-arrow--right"
            style={{
              position: 'absolute',
              top: '50%',
              right: -6,
              transform: 'translateY(-50%)',
              width: 40,
              height: 40,
              borderRadius: 999,
              border: '1px solid var(--ink-soft, #6F6557)',
              background: 'var(--card, #FBF7EE)',
              color: 'var(--ink, #0E0D0B)',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(14,13,11,0.12)',
              fontSize: 18,
              lineHeight: 1,
              opacity: stripScroll.atEnd ? 0 : 1,
              pointerEvents: stripScroll.atEnd ? 'none' : 'auto',
              transition: 'opacity var(--pl-dur-fast, 180ms) var(--pl-ease-out, cubic-bezier(0.22, 1, 0.36, 1))',
            }}
          >
            ›
          </button>
        </div>
      )}

      {galleryVariant === 'wall' && (
        /* Uniform photo wall. auto-fit grid at 180px min so the
           4-col desktop / 2-col mobile reads as wallpaper rather
           than a curated mix. 8px gap matches V8. */
        <div
          className="pl8-gallery-wall"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 8,
            maxWidth: 1180,
            margin: '0 auto',
          }}
        >
          {photos.map((_, i) => renderTile(i, 'wall'))}
        </div>
      )}

      {galleryVariant === 'mosaic' && (
        /* Bento mosaic — mixed sizes via the span pattern above.
           Max-width 940 so the grid reads as a tight editorial
           cluster vs. wallpaper. */
        <div
          className="pl8-gallery-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridAutoRows: '130px',
            gap: 10,
            maxWidth: 940,
            margin: '0 auto',
          }}
        >
          {photos.map((_, i) => renderTile(i, 'mosaic'))}
        </div>
      )}

      {galleryVariant === 'grid' && (
        /* Editorial 6-column 1:1 grid — denser than wall, no
           gridTemplateColumns auto-fit. Matches the prototype's
           default GalleryBlock dispatch (6-up uniform squares at
           ~940 max-width). Responsive: collapses to 3 columns on
           narrow viewports via auto-fit fallback. */
        <div
          className="pl8-gallery-grid-6"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 9,
            maxWidth: 940,
            margin: '0 auto',
          }}
        >
          {photos.map((_, i) => renderTile(i, 'grid'))}
        </div>
      )}

      {galleryVariant === 'masonry' && (
        /* CSS-columns waterfall — each tile takes its own
           aspect ratio so the layout reads as natural rather
           than uniform. 4-column desktop, fallback for narrow
           viewports via columnCount media. */
        <div
          className="pl8-gallery-masonry"
          style={{
            columnCount: 4,
            columnGap: 9,
            maxWidth: 940,
            margin: '0 auto',
          }}
        >
          {photos.map((_, i) => renderTile(i, 'masonry'))}
        </div>
      )}

      {galleryVariant === 'slideshow' && (
        /* Hero photo on top, 6-up thumbnail strip beneath.
           Max-width 760 so the hero reads as a cinema-frame
           rather than a wall. First photo is the hero; the
           remaining six form the strip. */
        <div
          className="pl8-gallery-slideshow"
          style={{ maxWidth: 760, margin: '0 auto' }}
        >
          {photos.length > 0 && (
            <div style={{ marginBottom: 9 }}>
              {renderTile(0, 'slideshow-hero')}
            </div>
          )}
          {photos.length > 1 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 8,
              }}
            >
              {photos.slice(1, 7).map((_, idx) => renderTile(idx + 1, 'slideshow-thumb'))}
            </div>
          )}
        </div>
      )}

      {galleryVariant === 'polaroid' && (
        /* Scattered tilted polaroids — flex-wrap so each card
           sits beside its neighbor with handwritten gap. The
           tile renderer wraps each photo in a cream "card" with
           per-tile rotation so the row reads as a casual
           snapshot collage. Capped at 8 to keep the wall
           legible. */
        <div
          className="pl8-gallery-polaroid"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 18,
            maxWidth: 940,
            margin: '0 auto',
          }}
        >
          {photos.slice(0, 8).map((_, i) => renderTile(i, 'polaroid'))}
        </div>
      )}

      {/* PhotoLightbox always mounts — it self-hides when index===null
          so guests in view mode get the full-screen viewer + keyboard
          + swipe nav for free, while edit mode never opens it (the
          tile click is short-circuited above). */}
      <PhotoLightbox
        images={lightboxImages}
        index={index}
        onClose={close}
        onNext={next}
        onPrev={prev}
      />
    </section>
  );
}

/* ─── ThemedRsvp — dark CTA section with a real PresetRsvpForm
   integrated against /api/rsvp.

   Visual identity: keeps the dark section + eyebrow + display
   heading so the kit-aware chrome (Edition opener, density,
   texture intensity) still reads. The form itself sits inset
   on the dark band as a cream card — the PresetRsvpForm
   surface — so the section becomes a working reply surface
   rather than a styled placeholder.

   Urgency tier: ports the ThemedSiteRenderer urgency system —
   computes daysUntilEvent from manifest.logistics.date and
   maps to muted (>30d) / normal (7-30d) / soon (3-7d) /
   urgent (<3d). Each tier shifts the deadline ribbon's
   color + emphasis as the event approaches. Theme-coherent
   colors (sage-deep / peach-ink / pl-plum) match the host's
   palette via the CSS vars on .pl8-guest. ─── */
function ThemedRsvp({ manifest, siteSlug }: { manifest: StoryManifest; siteSlug: string }) {
  const deadline = manifest.logistics?.rsvpDeadline;
  const occasion = manifest.occasion ?? 'wedding';
  const eventType = getEventType(occasion);
  const voice = eventType?.voice ?? 'celebratory';
  /* The form preset — drives which fields render. wedding /
     bachelor / shower / memorial / reunion / milestone /
     cultural / casual. */
  const rsvpPreset = eventType?.rsvpPreset ?? 'wedding';

  /* ── RSVP urgency tier (ported verbatim from ThemedSiteRenderer) ──
     Compute days-until-event from logistics.date. Map to a tier
     that shifts the deadline ribbon's color + emphasis as the
     day approaches:
       >30d → muted   (default, no urgency cue)
       7-30 → normal  (faint sage bg + sage ink)
       3-7d → soon    (peach pulsing border + peach text)
       <3d  → urgent  (plum glow + bold uppercase "RSVP TODAY")
     When no eventDate is set, falls back to 'muted'. */
  const eventIsoForUrgency = manifest.logistics?.date;
  const rsvpUrgencyTier: 'muted' | 'normal' | 'soon' | 'urgent' = (() => {
    if (!eventIsoForUrgency) return 'muted';
    const d = parseLocalDate(eventIsoForUrgency);
    if (!d) return 'muted';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = d.getTime() - today.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days > 30) return 'muted';
    if (days > 7) return 'normal';
    if (days >= 3) return 'soon';
    return 'urgent';
  })();

  /* Per-tier ribbon style. Theme-coherent — peach-ink + sage-deep
     come from .pl8-guest CSS vars so each Edition's palette
     drives the urgency cue automatically. The dark section
     inverts contrast: muted/normal use cream-ish tones; soon
     and urgent break through with warm peach + plum that read
     against the dark ink background. */
  const rsvpUrgencyStyle: React.CSSProperties = (() => {
    switch (rsvpUrgencyTier) {
      case 'normal':
        return {
          color: 'rgba(245,239,226,0.85)',
          background: 'rgba(245,239,226,0.08)',
          border: '1px solid rgba(245,239,226,0.18)',
        };
      case 'soon':
        return {
          color: 'var(--peach-ink, #C6703D)',
          background: 'color-mix(in oklab, var(--peach-ink, #C6703D) 14%, transparent)',
          border: '1px solid var(--peach-ink, #C6703D)',
          animation: 'pl-rsvp-soon-pulse 1800ms ease-in-out infinite',
        };
      case 'urgent':
        return {
          color: 'var(--pl-plum, #C46A6A)',
          background: 'color-mix(in oklab, var(--pl-plum, #C46A6A) 14%, transparent)',
          border: '1px solid var(--pl-plum, #C46A6A)',
          fontWeight: 800,
          textTransform: 'uppercase',
          boxShadow: '0 0 0 4px color-mix(in oklab, var(--pl-plum, #C46A6A) 18%, transparent)',
          animation: 'pl-rsvp-urgent-pulse 1200ms ease-in-out infinite',
        };
      default:
        return {};
    }
  })();
  const deadlineStr = deadline
    ? new Date(deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : 'soon';
  const urgentKickerCopy =
    rsvpUrgencyTier === 'urgent' ? 'RSVP TODAY' : (deadline ? `RSVP by ${deadlineStr}` : 'RSVP');

  /* Edition opener (chapter mark / slug line / stamp / mono /
     overline) above the dark section's eyebrow. Resolves the
     active Edition + index in the same order helper as the
     other ThemedSectionHead callers. */
  const openerNode = (() => {
    const activeEdition = resolveEdition({ edition: manifest.edition, occasion, voice });
    const order = (manifest as unknown as { blockOrder?: SiteBlockKey[] }).blockOrder;
    const arr = (order && order.length > 0 ? order : DEFAULT_BLOCK_ORDER) as SiteBlockKey[];
    const idx = arr.indexOf('rsvp');
    return (
      <EditionSectionOpener
        style={activeEdition.sectionOpener}
        index={idx < 0 ? 1 : idx + 1}
        title="RSVP"
        kicker={urgentKickerCopy}
      />
    );
  })();

  /* Custom meal options from the manifest — wedding hosts who
     wired the meal panel in the editor keep their menu rather
     than the preset defaults. */
  const customMealOptions = (manifest.mealOptions ?? []).map((m) => ({
    id: m.id ?? m.name,
    name: m.name,
    dietaryTags: m.dietaryTags,
  }));

  /* ── Variant dispatch — reads manifest.blockVariants.rsvp.style.
     Four variants registered in src/lib/site-layouts/registry.ts:
       centered (default) — dark CTA section with inset form
       split             — photo left, content + form right
       banner            — thin horizontal band w/ pill CTA
       minimal           — light cream, hairline CTA, no chrome
     Unknown ids fall through to centered. ── */
  type RsvpVariant = 'centered' | 'split' | 'banner' | 'minimal';
  const rsvpVariant: RsvpVariant = (() => {
    const raw = (manifest.blockVariants?.rsvp?.style as string | undefined) ?? 'centered';
    const known: RsvpVariant[] = ['centered', 'split', 'banner', 'minimal'];
    return (known.includes(raw as RsvpVariant) ? raw : 'centered') as RsvpVariant;
  })();

  /* First chapter photo, for the split variant's left column.
     Falls back to coverPhoto, then to a placeholder gradient
     when no imagery has been uploaded yet. */
  const firstChapterPhoto = manifest.chapters
    ?.flatMap((c) => (c.images ?? []).map((i) => i.url))
    .filter(Boolean)[0];
  const splitPhoto = firstChapterPhoto ?? manifest.coverPhoto ?? undefined;

  /* Foil flag — when on, banner variant promotes to a warm gold
     gradient (mirrors prototype RsvpBlock's foil branch). */
  const foil = Boolean((manifest as unknown as { foil?: boolean }).foil);

  /* ── Split variant — photo left, headline + CTA + form right.
     Lighter background (var(--paper)) so it reads as a cream
     reply panel against the dark ink coupon next to it. The
     form sits inline rather than inset so the right column
     remains the focus. ── */
  if (rsvpVariant === 'split') {
    return (
      <section
        id="rsvp"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          alignItems: 'stretch',
          background: 'var(--paper, #F5EFE2)',
          color: 'var(--ink, #0E0D0B)',
          position: 'relative',
          minHeight: 'calc(420px * var(--pl-density-scale, 1))',
        }}
      >
        <SectionBackground manifest={manifest} sectionId="rsvp" />
        {/* Left — photo column. Falls back to a soft accent
            gradient when no chapter imagery exists. */}
        <div
          style={{
            minHeight: 320,
            background: splitPhoto
              ? `center / cover no-repeat url("${splitPhoto}")`
              : 'linear-gradient(135deg, color-mix(in oklab, var(--t-accent, #5C6B3F) 35%, var(--paper, #F5EFE2)) 0%, var(--paper, #F5EFE2) 100%)',
            position: 'relative',
          }}
          aria-hidden={splitPhoto ? undefined : true}
        />
        {/* Right — content + form column. */}
        <div
          style={{
            padding: 'calc(52px * var(--pl-density-scale, 1)) clamp(20px, 4vw, 44px)',
            display: 'grid',
            alignContent: 'center',
            gap: 0,
            textAlign: 'left',
          }}
        >
          {openerNode}
          <div
            data-pl-rsvp-urgency={rsvpUrgencyTier}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
              textTransform: 'uppercase',
              color: 'var(--t-accent-ink, var(--ink, #0E0D0B))',
              marginBottom: 14,
              padding: rsvpUrgencyTier === 'muted' ? 0 : '8px 14px',
              borderRadius: rsvpUrgencyTier === 'muted' ? 0 : 'var(--pl-radius-full, 100px)',
              transition: 'all var(--pl-dur-base, 280ms) var(--pl-ease-out, cubic-bezier(0.22, 1, 0.36, 1))',
              alignSelf: 'start',
              ...rsvpUrgencyStyle,
            }}
          >
            {rsvpUrgencyTier === 'urgent' ? 'RSVP TODAY' : (deadline ? `RSVP by ${deadlineStr}` : 'RSVP')}
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontSize: 'clamp(34px, 4.5cqw, 48px)',
              fontWeight: 'var(--pl-display-wght, 600)',
              margin: '0 0 8px',
              color: 'var(--ink, #0E0D0B)',
              lineHeight: 1.02,
              letterSpacing: '-0.015em',
            }}
          >
            Save your <span style={{ fontStyle: 'italic', opacity: 0.85 }}>seat</span>
          </h2>
          <div
            style={{
              fontSize: 14,
              opacity: 0.78,
              marginBottom: 22,
              maxWidth: 440,
              color: 'var(--ink-soft, #3A332C)',
              fontStyle: 'italic',
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            }}
          >
            Ninety seconds. We&apos;ll follow up if anyone forgets.
          </div>
          <div style={{ maxWidth: 460 }}>
            <PresetRsvpForm
              siteId={siteSlug}
              preset={rsvpPreset}
              title=""
              customMealOptions={customMealOptions.length > 0 ? customMealOptions : undefined}
              manifest={manifest}
            />
          </div>
        </div>
      </section>
    );
  }

  /* ── Banner variant — thin horizontal strip. Eyebrow + title
     on the left, CTA pill on the right. No inline form — the
     pill fires the global 'pl-open-rsvp' event so the existing
     modal/sticky form picks up the request. Foil flag swaps the
     band to a warm gold gradient. ── */
  if (rsvpVariant === 'banner') {
    const fireRsvp = () => {
      if (typeof window !== 'undefined') {
        try { window.dispatchEvent(new CustomEvent('pl-open-rsvp')); } catch { /* noop */ }
      }
    };
    return (
      <section
        id="rsvp"
        style={{
          padding: 'calc(28px * var(--pl-density-scale, 1)) clamp(20px, 4vw, 40px)',
          background: foil
            ? 'linear-gradient(135deg, #B8893A 0%, #E6C877 28%, #C9A24B 52%, #F0DDA0 74%, #B8893A 100%)'
            : 'var(--ink, #0E0D0B)',
          color: foil ? '#3A2D08' : 'var(--cream, #F5EFE2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
          position: 'relative',
        }}
      >
        <SectionBackground manifest={manifest} sectionId="rsvp" />
        <div style={{ flex: '1 1 auto', minWidth: 220 }}>
          <div
            data-pl-rsvp-urgency={rsvpUrgencyTier}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: foil ? 0.85 : 0.7,
              marginBottom: 4,
              ...rsvpUrgencyStyle,
            }}
          >
            {rsvpUrgencyTier === 'urgent' ? 'RSVP TODAY' : (deadline ? `RSVP by ${deadlineStr}` : 'RSVP')}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
              fontWeight: 'var(--pl-display-wght, 600)',
              fontSize: 'clamp(24px, 3.4cqw, 32px)',
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
            }}
          >
            Save your <span style={{ fontStyle: 'italic', opacity: 0.85 }}>seat</span>
          </div>
        </div>
        <button
          type="button"
          onClick={fireRsvp}
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '13px 28px',
            borderRadius: 'var(--pl-radius-full, 100px)',
            background: foil ? '#3A2D08' : 'var(--cream, #F5EFE2)',
            color: foil ? '#F0DDA0' : 'var(--ink, #0E0D0B)',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            letterSpacing: '0.02em',
          }}
        >
          RSVP <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>→</span>
        </button>
      </section>
    );
  }

  /* ── Minimal variant — centered cream layout with a hairline
     divider above the CTA. No dark ground, no chrome — the
     reply is presented as quiet punctuation. The form is
     inlined below the headline for guests who do choose to
     reply directly from the page. ── */
  if (rsvpVariant === 'minimal') {
    return (
      <section
        id="rsvp"
        style={{
          padding: 'calc(56px * var(--pl-density-scale, 1)) 32px',
          textAlign: 'center',
          background: 'var(--paper, #F5EFE2)',
          color: 'var(--ink, #0E0D0B)',
          position: 'relative',
        }}
      >
        <SectionBackground manifest={manifest} sectionId="rsvp" />
        {openerNode}
        <div
          data-pl-rsvp-urgency={rsvpUrgencyTier}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
            textTransform: 'uppercase',
            color: 'var(--ink-muted, #6F6557)',
            marginBottom: 14,
            padding: rsvpUrgencyTier === 'muted' ? 0 : '8px 14px',
            borderRadius: rsvpUrgencyTier === 'muted' ? 0 : 'var(--pl-radius-full, 100px)',
            transition: 'all var(--pl-dur-base, 280ms) var(--pl-ease-out, cubic-bezier(0.22, 1, 0.36, 1))',
            ...rsvpUrgencyStyle,
          }}
        >
          {rsvpUrgencyTier === 'urgent' ? 'RSVP TODAY' : (deadline ? `RSVP by ${deadlineStr}` : 'RSVP')}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontSize: 'clamp(38px, 5.5cqw, 52px)',
            fontWeight: 'var(--pl-display-wght, 600)',
            margin: '0 0 12px',
            color: 'var(--ink, #0E0D0B)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
          }}
        >
          Save your <span style={{ fontStyle: 'italic', opacity: 0.85 }}>seat</span>
        </h2>
        {/* Hairline rule — gold accent, the minimal variant's
            signature visual punctuation. */}
        <div
          aria-hidden
          style={{
            width: 80,
            height: 1,
            margin: '20px auto',
            background: 'var(--t-accent, var(--gold, #B8935A))',
            opacity: 0.55,
          }}
        />
        <div
          style={{
            fontSize: 14,
            opacity: 0.7,
            marginBottom: 28,
            fontStyle: 'italic',
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            color: 'var(--ink-soft, #3A332C)',
          }}
        >
          Ninety seconds. We&apos;ll follow up if anyone forgets.
        </div>
        <div
          style={{
            maxWidth: 560,
            margin: '0 auto',
            textAlign: 'left',
          }}
        >
          <PresetRsvpForm
            siteId={siteSlug}
            preset={rsvpPreset}
            title=""
            customMealOptions={customMealOptions.length > 0 ? customMealOptions : undefined}
            manifest={manifest}
          />
        </div>
      </section>
    );
  }

  /* ── Centered variant (default) — original dark CTA section. ── */
  return (
    <section
      id="rsvp"
      style={{
        padding: 'calc(48px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        background: 'var(--ink, #0E0D0B)',
        color: 'var(--cream, #F5EFE2)',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="rsvp" />
      {openerNode}
      {/* Urgency-tiered deadline ribbon. Muted tier renders flat
          text; the other three tiers wrap in a pill with theme-
          coherent color + (soon/urgent) animation. */}
      <div
        data-pl-rsvp-urgency={rsvpUrgencyTier}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
          textTransform: 'uppercase',
          color: 'rgba(245,239,226,0.55)',
          marginBottom: 14,
          padding: rsvpUrgencyTier === 'muted' ? 0 : '8px 14px',
          borderRadius: rsvpUrgencyTier === 'muted' ? 0 : 'var(--pl-radius-full, 100px)',
          transition: 'all var(--pl-dur-base, 280ms) var(--pl-ease-out, cubic-bezier(0.22, 1, 0.36, 1))',
          ...rsvpUrgencyStyle,
        }}
      >
        {rsvpUrgencyTier === 'urgent' ? 'RSVP TODAY' : (deadline ? `RSVP by ${deadlineStr}` : 'RSVP')}
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontSize: 'clamp(38px, 5.5cqw, 52px)',
          fontWeight: 'var(--pl-display-wght, 600)',
          margin: '0 0 8px',
          color: 'var(--cream, #F5EFE2)',
          lineHeight: 1.02,
          letterSpacing: '-0.015em',
        }}
      >
        Save your <span style={{ fontStyle: 'italic', opacity: 0.85 }}>seat</span>
      </h2>
      <div
        style={{
          fontSize: 14,
          opacity: 0.7,
          marginBottom: 32,
          fontStyle: 'italic',
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
        }}
      >
        Ninety seconds. We&apos;ll follow up if anyone forgets.
      </div>
      {/* Real PresetRsvpForm — posts to /api/rsvp. Sits inset on
          the dark band as a cream card so guests see a working
          reply surface, not a flat preview. Wrapper inverts the
          inner palette so the form's pl-ink + pl-cream tokens
          read against its own card background, not the dark
          section. */}
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          textAlign: 'left',
          ['--pl-ink' as string]: 'var(--ink, #0E0D0B)',
          ['--pl-cream' as string]: 'var(--card, #FBF7EE)',
        } as React.CSSProperties}
      >
        <PresetRsvpForm
          siteId={siteSlug}
          preset={rsvpPreset}
          title=""
          customMealOptions={customMealOptions.length > 0 ? customMealOptions : undefined}
          manifest={manifest}
        />
      </div>
    </section>
  );
}

/* ─── ThemedFaq — dispatches to a per-Kit FAQ renderer. Each kit
   keeps the <details>/<summary> contract for accessibility and
   click behaviour but shapes the surrounding card distinctly. */
type FaqItem = NonNullable<StoryManifest['faqs']>[number];

/* Helper: patch a single FAQ field by index. Mirrors
   ThemedSiteRenderer's patchFaq pattern. */
function makePatchFaq(onEditField: FieldEditor | undefined, faqIndex: number) {
  return (field: 'question' | 'answer') => (value: string) => {
    if (!onEditField) return;
    onEditField((m) => {
      const faqs = [...(m.faqs ?? [])];
      if (faqIndex < 0 || faqIndex >= faqs.length) return m;
      faqs[faqIndex] = { ...faqs[faqIndex], [field]: value };
      return { ...m, faqs } as StoryManifest;
    });
  };
}

function ThemedFaq({ manifest, editMode, onEditField }: { manifest: StoryManifest; editMode?: boolean; onEditField?: FieldEditor }) {
  const faq = manifest.faqs ?? [];
  if (faq.length === 0) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="faq"
        eyebrow="Good to know"
        title="The little"
        italic="things"
        body="Open the FAQ panel to add the questions guests will ask. Pear can suggest 6 based on your event."
        cta="Add a question"
      />
    );
  }
  const kit = (manifest.kitId ?? 'classic') as
    | 'classic' | 'ticket' | 'plate' | 'scrapbook' | 'index' | 'minimal'
    | 'arch' | 'stamp' | 'deco' | 'gallery' | 'menu';

  /* Variant dispatcher — supports all 4 FAQ variants. Defaults to
     accordion when blockVariants is unset or carries an unknown
     value. Variants:
       accordion — tappable <details>/<summary> with chevron (default,
                   per-kit chrome via FaqList).
       twocol    — side-by-side Q&A pairs in a 2-column grid.
       numbered  — oversized 01/02/03 numerals down the left.
       cards     — each Q&A in its own padded card, 2-column grid. */
  type FaqVariant = 'accordion' | 'twocol' | 'numbered' | 'cards';
  const faqVariant: FaqVariant = (() => {
    const raw = (manifest.blockVariants?.faq?.style as string | undefined) ?? 'accordion';
    const known: FaqVariant[] = ['accordion', 'twocol', 'numbered', 'cards'];
    return (known.includes(raw as FaqVariant) ? raw : 'accordion') as FaqVariant;
  })();

  return (
    <section
      id="faq"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="faq" />
      <ThemedSectionHead eyebrow="Good to know" title="The little" italic="things" manifest={manifest} sectionKey="faq" />
      {faqVariant === 'twocol' ? (
        <FaqTwoCol faq={faq} editMode={editMode} onEditField={onEditField} />
      ) : faqVariant === 'numbered' ? (
        <FaqNumbered faq={faq} editMode={editMode} onEditField={onEditField} />
      ) : faqVariant === 'cards' ? (
        <FaqCards faq={faq} kit={kit} editMode={editMode} onEditField={onEditField} />
      ) : (
        <FaqList faq={faq} kit={kit} editMode={editMode} onEditField={onEditField} />
      )}
    </section>
  );
}

/* ─── FAQ variant: twocol — side-by-side Q&A pairs in a 2-column
   grid (collapses to 1 col on narrow viewports via auto-fit).
   Question in display type tinted with the accent ink; answer in
   ink-soft below. No chrome, no expand/collapse — every answer is
   surfaced inline. Source: ClaudeDesign/pages/themed-site.jsx
   FaqBlock variant === 'twocol'. */
function FaqTwoCol({ faq, editMode, onEditField }: { faq: FaqItem[]; editMode?: boolean; onEditField?: FieldEditor }) {
  void editMode;
  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px 32px',
      }}
    >
      {faq.map((item, i) => {
        const patch = makePatchFaq(onEditField, i);
        return (
          <div key={item.id ?? i}>
            <EditableText
              as="div"
              value={item.question}
              onSave={patch('question')}
              ariaLabel={`FAQ ${i + 1} question`}
              maxLength={240}
              placeholder="Question?"
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 16,
                color: 'var(--peach-ink, var(--ink, #0E0D0B))',
                lineHeight: 1.3,
              }}
            />
            <EditableField
              as="div"
              context={`FAQ ${i + 1} answer`}
              value={item.answer ?? ''}
              onSave={patch('answer')}
              multiline
              maxLength={800}
              placeholder="A short, friendly answer goes here."
              ariaLabel={`FAQ ${i + 1} answer`}
              style={{
                fontSize: 13,
                color: 'var(--ink-soft, #3A332C)',
                lineHeight: 1.55,
                marginTop: 4,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ─── FAQ variant: numbered — oversized 01/02/03 down the left,
   question to the right, hairline divider between rows. All answers
   visible inline (no toggle). Distinctly editorial — the numerals
   are display-italic and tinted ink-muted so the question gets the
   weight. Source: prototype FaqBlock variant === 'numbered'. */
function FaqNumbered({ faq, editMode, onEditField }: { faq: FaqItem[]; editMode?: boolean; onEditField?: FieldEditor }) {
  void editMode;
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {faq.map((item, i) => {
        const patch = makePatchFaq(onEditField, i);
        const isLast = i === faq.length - 1;
        return (
          <div
            key={item.id ?? i}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 18,
              alignItems: 'baseline',
              padding: '18px 0',
              borderBottom: isLast ? 'none' : '1px solid var(--line-soft, rgba(14,13,11,0.10))',
            }}
          >
            <span
              aria-hidden
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontStyle: 'italic',
                fontWeight: 'var(--pl-display-wght, 600)',
                fontSize: 26,
                color: 'var(--ink-muted, #6F6557)',
                minWidth: 42,
                lineHeight: 1,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <EditableText
                as="div"
                value={item.question}
                onSave={patch('question')}
                ariaLabel={`FAQ ${i + 1} question`}
                maxLength={240}
                placeholder="Question?"
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--ink, #0E0D0B)',
                  lineHeight: 1.35,
                }}
              />
              <EditableField
                as="p"
                context={`FAQ ${i + 1} answer`}
                value={item.answer ?? ''}
                onSave={patch('answer')}
                multiline
                maxLength={800}
                placeholder="Write the answer here…"
                ariaLabel={`FAQ ${i + 1} answer`}
                style={{
                  marginTop: 8,
                  fontSize: 13.5,
                  color: 'var(--ink-soft, #3A332C)',
                  lineHeight: 1.6,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── FAQ variant: cards — each Q&A as its own padded card in a
   2-column grid (auto-fits to a single column on narrow viewports).
   Question + answer always visible inline. Card chrome inherits
   from the active Kit via kitCardStyle so a "scrapbook" kit gets
   tape strips, "index" gets ruled lines, etc. Source: prototype
   FaqBlock variant === 'cards'. */
function FaqCards({ faq, kit, editMode, onEditField }: { faq: FaqItem[]; kit: string; editMode?: boolean; onEditField?: FieldEditor }) {
  void editMode;
  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 14,
      }}
    >
      {faq.map((item, i) => {
        const patch = makePatchFaq(onEditField, i);
        return (
          <div
            key={item.id ?? i}
            style={{
              ...kitCardStyle(kit, i),
              padding: 18,
            }}
          >
            <EditableText
              as="div"
              value={item.question}
              onSave={patch('question')}
              ariaLabel={`FAQ ${i + 1} question`}
              maxLength={240}
              placeholder="Question?"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink, #0E0D0B)',
                lineHeight: 1.35,
              }}
            />
            <EditableField
              as="div"
              context={`FAQ ${i + 1} answer`}
              value={item.answer ?? ''}
              onSave={patch('answer')}
              multiline
              maxLength={800}
              placeholder="A short, friendly answer goes here."
              ariaLabel={`FAQ ${i + 1} answer`}
              style={{
                fontSize: 12.5,
                color: 'var(--ink-soft, #3A332C)',
                marginTop: 6,
                lineHeight: 1.55,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function FaqList({ faq, kit, editMode, onEditField }: { faq: FaqItem[]; kit: string; editMode?: boolean; onEditField?: FieldEditor }) {
  /* Per-kit container + row styling. Summary/answer markup stays
     constant — only the chrome (background, border, numeral style,
     numeral color) varies. */
  const containerStyle: React.CSSProperties = (() => {
    switch (kit) {
      case 'ticket':    return { maxWidth: 720, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 };
      case 'minimal':   return { maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0 };
      default:          return { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720, margin: '0 auto' };
    }
  })();
  return (
    <div style={containerStyle}>
      {faq.map((item, i) => (
        <FaqRow key={item.id ?? i} item={item} index={i} kit={kit} totalCount={faq.length} editMode={editMode} onEditField={onEditField} />
      ))}
    </div>
  );
}

function FaqRow({ item, index, kit, totalCount, editMode, onEditField }: { item: FaqItem; index: number; kit: string; totalCount: number; editMode?: boolean; onEditField?: FieldEditor }) {
  /* Per-kit chrome + numeral pattern matches prototype's KFaq.
     The prototype's plate + minimal show a numeral; the other
     kits (ticket / scrapbook / index / classic) show just the
     question + chev with KCard-style chrome around the row. */

  const isPlate = kit === 'plate';
  const isMinimal = kit === 'minimal';

  // Wrapper chrome — for plate + minimal, hairline border between
  // rows; for other kits, kitCardStyle chrome.
  const wrapStyle: React.CSSProperties = isPlate
    ? {
        display: 'flex',
        gap: 16,
        alignItems: 'baseline',
        padding: '16px 4px',
        borderBottom: index < totalCount - 1 ? '1px solid var(--line-soft, rgba(14,13,11,0.10))' : 'none',
      }
    : isMinimal
      ? {
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: 18,
          alignItems: 'baseline',
          padding: '18px 0',
          borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
        }
      : {
          ...kitCardStyle(kit, index),
          padding: '14px 18px',
        };

  // Numeral content/style per kit (only plate + minimal render
  // a numeral per the prototype).
  let numeral: React.ReactNode = null;
  if (isPlate) {
    numeral = (
      <span
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontStyle: 'italic',
          fontWeight: 'var(--pl-display-wght, 600)',
          fontSize: 18,
          color: 'var(--peach-ink, #C6703D)',
          minWidth: 28,
        }}
      >
        {ROMAN_NUMERALS[index] ?? String(index + 1)}
      </span>
    );
  } else if (isMinimal) {
    numeral = (
      <span
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontWeight: 'var(--pl-display-wght, 600)',
          fontSize: 24,
          color: 'var(--ink-muted, #6F6557)',
          minWidth: 40,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
    );
  }

  return (
    <details className="pl8-faq-row" style={wrapStyle}>
      <summary
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--ink, #0E0D0B)',
          cursor: 'pointer',
          listStyle: 'none',
          display: 'flex',
          gap: 14,
          alignItems: 'baseline',
          flex: 1,
          width: '100%',
        }}
      >
        {numeral}
        <EditableText
          as="span"
          value={item.question}
          onSave={makePatchFaq(onEditField, index)('question')}
          ariaLabel={`FAQ ${index + 1} question`}
          maxLength={240}
          placeholder="Question?"
          style={{ flex: 1, lineHeight: 1.35, fontSize: isPlate || isMinimal ? 15 : 14 }}
        />
        <Icon name="chev-down" size={14} color="var(--ink-muted, #6F6557)" />
      </summary>
      <EditableField
        as="p"
        context={`FAQ ${index + 1} answer`}
        value={item.answer ?? ''}
        onSave={makePatchFaq(onEditField, index)('answer')}
        multiline
        maxLength={800}
        placeholder="Write the answer here…"
        ariaLabel={`FAQ ${index + 1} answer`}
        style={{
          marginTop: 12,
          marginLeft: isMinimal ? 58 : isPlate ? 44 : 0,
          fontSize: 13.5,
          color: 'var(--ink-soft, #3A332C)',
          lineHeight: 1.65,
        }}
      />
      {/* Inline CTA chip — the natural next action after reading
          the answer. Only renders for categories with a clear
          affordance (RSVP/Plus-ones → #rsvp, Travel/Hotels →
          #travel, Gifts → #registry, Schedule → #schedule).
          Informational categories (Dress code, Kids, Food, Photos,
          Other) show no chip. Suppressed on very short answers
          and when the answer text already mentions the affordance
          inline (avoids the chip duplicating the punchline).
          Hidden in edit mode so the host sees the raw answer
          surface without competing affordances. */}
      {(() => {
        if (editMode) return null;
        const cat = categorizeFaq(item.question ?? '');
        const cta = getFaqCta(cat);
        if (!shouldShowFaqCta(item.answer ?? '', cta)) return null;
        return (
          <div style={{ marginTop: 16, marginLeft: isMinimal ? 58 : isPlate ? 44 : 0 }}>
            <a
              href={cta.href}
              className="pl8-faq-cta-chip pl-pearl-border"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 14px',
                borderRadius: 999,
                background: 'var(--cream, #F5EFE2)',
                color: 'var(--peach-ink, #C6703D)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textDecoration: 'none',
                fontFamily: 'var(--font-ui, system-ui, sans-serif)',
                transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              {cta.label}
              <span aria-hidden style={{ fontSize: 11, marginLeft: 2 }}>→</span>
            </a>
          </div>
        );
      })()}
    </details>
  );
}

/* ─── ThemedCountdown — big-number countdown to the event date.
   Reads manifest.logistics.date. Shows 4 cells (days / hours /
   minutes / seconds) in display font with mono numerals,
   eyebrow labels beneath. The math is client-side (so SSR
   renders a stable placeholder then ticks once mounted). ─── */
function ThemedCountdown({ manifest, editMode }: { manifest: StoryManifest; editMode?: boolean }) {
  const dateStr = manifest.logistics?.date;
  if (!dateStr) {
    if (!editMode) return null;
    return (
      <EmptyStateCallout
        id="countdown"
        eyebrow="Until the day"
        title="Pick a"
        italic="date"
        body="Set the event date in the Hero panel — the countdown updates automatically."
        cta="Set the date"
      />
    );
  }
  const target = new Date(dateStr).getTime();
  if (!Number.isFinite(target)) return null;
  return <CountdownTimer target={target} manifest={manifest} />;
}

/* CountdownTimer — real React component (the prior version
   used <script dangerouslySetInnerHTML> which React doesn't
   execute when hydrated, so the cells stayed at em-dashes
   forever). useEffect + setInterval ticks the four cells.
   SSR-safe: server renders em-dashes, client takes over on
   mount and fills in live values.

   React.memo — the component ticks every second via internal
   state, but its parent (ThemedCountdown) re-renders on every
   manifest change. Without memo, every sibling-section edit
   would re-mount the setInterval. Wrapping lets the timer stay
   mounted and ticking independently. */
const CountdownTimer = memo(function CountdownTimer({ target, manifest }: { target: number; manifest: StoryManifest }) {
  const computeRemaining = useMemo(() => {
    return (now: number) => {
      const d = Math.max(0, target - now);
      const dd = Math.floor(d / 86400000);
      const hh = Math.floor((d % 86400000) / 3600000);
      const mm = Math.floor((d % 3600000) / 60000);
      const ss = Math.floor((d % 60000) / 1000);
      return {
        days: String(dd),
        hours: String(hh).padStart(2, '0'),
        minutes: String(mm).padStart(2, '0'),
        seconds: String(ss).padStart(2, '0'),
      };
    };
  }, [target]);
  const [tick, setTick] = useState<{ days: string; hours: string; minutes: string; seconds: string }>({
    days: '—', hours: '—', minutes: '—', seconds: '—',
  });
  useEffect(() => {
    const update = () => setTick(computeRemaining(Date.now()));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [computeRemaining]);
  const cells = [
    { value: tick.days, label: 'Days' },
    { value: tick.hours, label: 'Hours' },
    { value: tick.minutes, label: 'Minutes' },
    { value: tick.seconds, label: 'Seconds' },
  ];
  return (
    <section
      id="countdown"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        background: 'var(--paper, #F5EFE2)',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="countdown" />
      <div
        className="eyebrow"
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
          textTransform: 'uppercase',
          color: 'var(--peach-ink, #C6703D)',
          marginBottom: 22,
        }}
      >
        Until the day
      </div>
      <div
        data-pl-countdown
        data-target={target}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          maxWidth: 640,
          margin: '0 auto',
        }}
      >
        {cells.map((c, i) => (
          <div
            key={c.label}
            style={{
              padding: '12px 4px',
              borderLeft: i === 0 ? 'none' : '1px solid var(--line-soft, rgba(14,13,11,0.10))',
            }}
          >
            <div
              data-pl-countdown-cell={c.label.toLowerCase()}
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontSize: 'clamp(40px, 6cqw, 64px)',
                fontWeight: 'var(--pl-display-wght, 600)',
                color: 'var(--ink, #0E0D0B)',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {c.value}
            </div>
            <div
              className="eyebrow"
              style={{
                marginTop: 8,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
                textTransform: 'uppercase',
                color: 'var(--ink-muted, #6F6557)',
              }}
            >
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

/* ─── ThemedPullQuote — full-width italic display quote in the
   middle of the page. Reads manifest.poetry.heroTagline (full
   sentence, not the truncated one in Hero). The block has a
   gold open/close mark to read as a literal pull-quote. ─── */
function ThemedPullQuote({ manifest }: { manifest: StoryManifest }) {
  const heroCopyFull =
    (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ?? '';
  /* Use the SECOND sentence onwards if there is one (the first
     is in Hero). Otherwise skip — don't repeat the hero line. */
  const sentences = heroCopyFull.split(/(?<=[.!?])\s+/);
  const quote = sentences.length > 1 ? sentences.slice(1).join(' ').trim() : '';
  if (!quote) return null;
  return (
    <section
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div
        aria-hidden
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontStyle: 'italic',
          fontSize: 72,
          fontWeight: 400,
          color: 'var(--gold, #B8935A)',
          opacity: 0.45,
          lineHeight: 0.6,
          marginBottom: -8,
        }}
      >
        “
      </div>
      <blockquote
        style={{
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
          fontStyle: 'italic',
          fontSize: 'clamp(22px, 3cqw, 32px)',
          fontWeight: 400,
          color: 'var(--ink, #0E0D0B)',
          maxWidth: 720,
          margin: '0 auto',
          lineHeight: 1.35,
          letterSpacing: '-0.005em',
          padding: 0,
          border: 0,
        }}
      >
        {quote}
      </blockquote>
      <div
        aria-hidden
        style={{
          width: 80,
          height: 1,
          margin: '24px auto 0',
          background: 'var(--peach-ink, #C6703D)',
          opacity: 0.35,
        }}
      />
    </section>
  );
}

/* ─── ThemedWeddingParty — face cards for honor list. Reads
   manifest.weddingParty (array of { name, role, photo? }). 3-up
   on wide, 2-up on tablet, 1-up on phone. Each card: circular
   photo (or initial monogram), display-font name, eyebrow role.
   Section is hidden if no party is set. ─── */
function ThemedWeddingParty({ manifest }: { manifest: StoryManifest }) {
  const party =
    ((manifest as unknown as { weddingParty?: Array<{ name?: string; role?: string; photo?: string }> })
      .weddingParty) ?? [];
  if (party.length === 0) return null;
  return (
    <section
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--t-section)',
        position: 'relative',
      }}
    >
      <ThemedSectionHead eyebrow="By our side" title="The honor" italic="list" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 28,
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        {party.map((p, i) => {
          const name = p.name ?? '—';
          const initial = name.trim().charAt(0).toUpperCase() || '·';
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div
                aria-hidden
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  margin: '0 auto 14px',
                  backgroundImage: p.photo ? `url(${p.photo})` : 'none',
                  backgroundColor: p.photo ? 'transparent' : 'var(--peach-bg, rgba(198,112,61,0.10))',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: p.photo ? 'block' : 'grid',
                  placeItems: 'center',
                  border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
                  boxShadow: 'var(--pl-card-shadow, 0 8px 20px rgba(75,65,52,0.10))',
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontStyle: 'italic',
                  fontSize: 48,
                  color: 'var(--peach-ink, #C6703D)',
                  fontWeight: 400,
                }}
              >
                {p.photo ? null : initial}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontSize: 19,
                  fontWeight: 'var(--pl-display-wght, 600)',
                  color: 'var(--ink, #0E0D0B)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                }}
              >
                {name}
              </div>
              {p.role && (
                <div
                  className="eyebrow"
                  style={{
                    marginTop: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
                    textTransform: 'uppercase',
                    color: 'var(--peach-ink, #C6703D)',
                  }}
                >
                  {p.role}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── ThemedMap — venue strip with embedded map iframe and an
   "Open in Maps" CTA. Reads logistics.venueLat / venueLng for a
   precise pin; falls back to a search by venue + address when no
   coords. Uses the OpenStreetMap embed (no API key); production
   can swap to Mapbox if desired. ─── */
/* React.memo — map block is rare; props are a manifest reference
   that only changes when a venue address is edited. Skipping its
   re-render on chapter/event edits avoids re-mounting the iframe. */
const ThemedMap = memo(function ThemedMap({ manifest }: { manifest: StoryManifest }) {
  const l = manifest.logistics ?? {};
  const lat = (l as { venueLat?: number }).venueLat;
  const lng = (l as { venueLng?: number }).venueLng;
  const venue = l.venue;
  const address = l.venueAddress;
  if (!venue && !address && (lat == null || lng == null)) return null;
  /* Bounding box around the pin — small enough to read as
     "this exact spot." 0.005° ≈ 550m at the equator. */
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';
  const bbox = hasCoords
    ? `${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}`
    : null;
  const embed = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
    : null;
  const openLink = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [venue, address].filter(Boolean).join(' '),
      )}`;
  return (
    <section
      id="map"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        background: 'var(--paper, #F5EFE2)',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="map" />
      <ThemedSectionHead eyebrow="The place" title="Where it" italic="happens" />
      <div
        style={{
          maxWidth: 920,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 280px)',
          gap: 24,
          alignItems: 'center',
        }}
      >
        {/* Map frame */}
        <div
          style={{
            aspectRatio: '5/3',
            borderRadius: 'var(--pl-card-radius, 14px)',
            overflow: 'hidden',
            border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
            boxShadow: 'var(--pl-card-shadow, 0 4px 14px rgba(75,65,52,0.10))',
            background: 'var(--cream-2, #EBE3D2)',
          }}
        >
          {embed ? (
            <iframe
              title="Venue map"
              src={embed}
              loading="lazy"
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            /* No coords on the manifest — render a styled pin
               placeholder so the section reads as intentional
               instead of as an empty box. */
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background:
                  'radial-gradient(circle at 50% 60%, color-mix(in oklab, var(--peach-ink, #C6703D) 12%, var(--cream-2, #EBE3D2)) 0%, var(--cream-2, #EBE3D2) 60%)',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--peach-bg, rgba(198,112,61,0.12))',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name="pin" size={22} color="var(--peach-ink, #C6703D)" />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                  fontStyle: 'italic',
                  fontSize: 17,
                  color: 'var(--ink-soft, #3A332C)',
                }}
              >
                Find it on Maps
              </div>
            </div>
          )}
        </div>
        {/* Venue caption */}
        <div>
          <div
            className="eyebrow"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
              marginBottom: 8,
            }}
          >
            Venue
          </div>
          {venue && (
            <div
              style={{
                fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
                fontSize: 24,
                fontWeight: 'var(--pl-display-wght, 600)',
                color: 'var(--ink, #0E0D0B)',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}
            >
              {venue}
            </div>
          )}
          {address && (
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'var(--ink-soft, #3A332C)',
                lineHeight: 1.5,
              }}
            >
              {address}
            </div>
          )}
          <a
            href={openLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 16,
              padding: '8px 16px',
              borderRadius: 999,
              background: 'var(--peach-bg, rgba(198,112,61,0.10))',
              color: 'var(--peach-ink, #C6703D)',
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Icon name="pin" size={11} color="var(--peach-ink, #C6703D)" />
            Open in Maps ↗
          </a>
        </div>
      </div>
    </section>
  );
});

/* ─── ThemedSpotify — soundtrack strip. Reads manifest.spotifyUrl
   (playlist or track) + optional spotifyPlaylistName. Embeds the
   Spotify iframe in a compact card with a playlist eyebrow + the
   playlist name in display font. Renders nothing if no URL set.
   The iframe URL transform: open.spotify.com/playlist/X →
   open.spotify.com/embed/playlist/X. ─── */
/* React.memo — Spotify embed is heavy (iframe) and props rarely
   change; protect it from sibling-edit re-renders. */
const ThemedSpotify = memo(function ThemedSpotify({ manifest }: { manifest: StoryManifest }) {
  const url = manifest.spotifyUrl;
  const name = manifest.spotifyPlaylistName;
  if (!url) return null;
  /* Validate + transform the URL. Only known Spotify resource
     paths get the iframe treatment; anything else falls back to
     a "listen on Spotify" card with no embed (avoids the empty-
     iframe ghost we see when the URL is invalid or blocked). */
  const m = url.match(/open\.spotify\.com\/(playlist|track|album|show|episode)\/([A-Za-z0-9]+)/);
  const embedUrl = m
    ? url.replace(/open\.spotify\.com\/(playlist|track|album|show|episode)\//, 'open.spotify.com/embed/$1/')
    : null;
  return (
    <section
      id="soundtrack"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        background: 'var(--t-section)',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="soundtrack" />
      <ThemedSectionHead
        eyebrow="In the air"
        title={name ? 'Our' : 'The'}
        italic={name ?? 'soundtrack'}
      />
      <div
        style={{
          maxWidth: 600,
          margin: '0 auto',
          borderRadius: 'var(--pl-card-radius, 14px)',
          overflow: 'hidden',
          border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
          boxShadow: 'var(--pl-card-shadow, 0 4px 14px rgba(75,65,52,0.10))',
          background: 'var(--card, #FBF7EE)',
        }}
      >
        {embedUrl ? (
          <iframe
            title="Soundtrack"
            src={embedUrl}
            width="100%"
            height="232"
            frameBorder="0"
            loading="lazy"
            allow="encrypted-media; clipboard-write"
            style={{ display: 'block', border: 0 }}
          />
        ) : (
          /* Fallback — the URL didn't match a known Spotify
             resource pattern. Render a quiet "listen on Spotify"
             card so the section isn't an empty box. */
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '36px 24px',
              textDecoration: 'none',
              color: 'var(--ink, #0E0D0B)',
            }}
          >
            <Icon name="play" size={16} color="var(--peach-ink, #C6703D)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Listen on Spotify ↗</span>
          </a>
        )}
      </div>
    </section>
  );
});

/* ─── ThemedHashtag — single-line callout for wedding hashtag.
   Reads manifest.hashtags[0]. Renders as a centered band: peach
   "#" prefix + the hashtag in display italic + a small "tap to
   copy" affordance.
   React.memo — single-line callout with no state of its own; its
   manifest.hashtags prop only changes on explicit hashtag edits. */
const ThemedHashtag = memo(function ThemedHashtag({ manifest }: { manifest: StoryManifest }) {
  const tag = (manifest.hashtags ?? [])[0];
  if (!tag) return null;
  const clean = tag.replace(/^#/, '');
  return (
    <section
      style={{
        padding: 'calc(36px * var(--pl-density-scale, 1)) 32px',
        textAlign: 'center',
        background: 'var(--paper, #F5EFE2)',
      }}
    >
      <div
        className="eyebrow"
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
          textTransform: 'uppercase',
          color: 'var(--peach-ink, #C6703D)',
          marginBottom: 14,
        }}
      >
        Tag your photos
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 4,
          padding: '14px 28px',
          borderRadius: 999,
          background: 'var(--card, #FBF7EE)',
          border: '1px solid var(--peach-ink, #C6703D)',
          fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
        }}
      >
        <span
          aria-hidden
          style={{
            fontStyle: 'italic',
            fontSize: 30,
            color: 'var(--peach-ink, #C6703D)',
            fontWeight: 400,
            lineHeight: 1,
          }}
        >
          #
        </span>
        <span
          style={{
            fontSize: 26,
            fontWeight: 'var(--pl-display-wght, 600)',
            color: 'var(--ink, #0E0D0B)',
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          {clean}
        </span>
      </div>
    </section>
  );
});

/* ─── ThemedFooter — editorial close. Gold hairline → italic
   brand → small "woven on Pearloom" colophon → date in mono
   eyebrow → back-to-top pill. Reads as the back-cover of a
   bound book rather than a copyright stripe. ─── */
/* ─── ThemedGuestbook — host-toggled in RsvpPanel ('Guestbook on
   published site'). Default off; flips on via
   manifest.features.guestbook = true. Mirrors ThemedSiteRenderer's
   gating + mount placement (after FAQ, before footer) so guests
   scroll past every section before being asked to leave a wish.

   The underlying <Guestbook /> component carries its own
   form / wall / featured-card chrome on a cream ground. We wrap
   it in a ThemedSectionHead so the section reads as a peer of
   Story / Details / FAQ on theme-coherent paper, and let the
   inner component render its own surface beneath. ─── */
function ThemedGuestbook({
  manifest,
  names,
  siteSlug,
}: {
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
}) {
  const features = (manifest as unknown as { features?: { guestbook?: boolean } }).features;
  if (!features?.guestbook) return null;
  const vibeSkin = (manifest as unknown as {
    vibeSkin?: import('@/lib/vibe-engine').VibeSkin;
  }).vibeSkin;
  return (
    <section
      id="guestbook"
      style={{
        padding: 'calc(40px * var(--pl-density-scale, 1)) 32px 0',
        background: 'var(--t-section)',
        position: 'relative',
      }}
    >
      <SectionBackground manifest={manifest} sectionId="guestbook" />
      {/* Guestbook isn't a SiteBlockKey (it's a feature toggle, not
          a block in the canonical order), so we render the head
          without a sectionKey — no Edition opener numeral, just the
          theme-coherent eyebrow + display title. */}
      <ThemedSectionHead
        eyebrow="Guestbook"
        title="Sign the"
        italic="book"
      />
      {/* The Guestbook component carries its own <section> + form
          + wall chrome; we let it render directly inside our
          themed section so its internal cream ground inherits
          the Edition's paper variable. */}
      <Guestbook siteId={siteSlug} coupleNames={names} vibeSkin={vibeSkin} />
    </section>
  );
}

/* ─── ThemedCustomBlocks — Event-OS block rail.
 *
 * Ports ThemedSiteRenderer's CustomBlocksRail/CustomBlockCase pair
 * into the Themed renderer. Each entry on manifest.blocks[] whose
 * `type` matches one of the 10 known Event-OS blocks
 * (itinerary, costSplitter, activityVote, toastSignup,
 *  adviceWall/tributeWall, obituary, livestream, privacyGate,
 *  packingList, program) gets mounted in order with a
 * ThemedSectionHead above it (eyebrow + title pulled from
 * block.config when set, with sensible per-type defaults).
 *
 * Any block.type that ISN'T recognized falls through to a
 * "coming soon" placeholder — but ONLY in edit mode so guests
 * never see a half-built block. Matches V8's default-case
 * pattern verbatim.
 *
 * The rail is mounted after the canonical section stack and
 * before the footer so Event-OS blocks read as additional
 * content beneath the host's main site flow. Hidden on sub-
 * page routes (pageFilter !== undefined && pageFilter !== 'home')
 * since Event-OS blocks are home-page content. */
const THEMED_CUSTOM_BLOCK_TYPES = new Set([
  'itinerary',
  'costSplitter',
  'activityVote',
  'toastSignup',
  'adviceWall',
  'tributeWall',
  'obituary',
  'livestream',
  'privacyGate',
  'packingList',
  'program',
]);

function ThemedCustomBlocks({
  manifest,
  siteSlug,
  editMode,
}: {
  manifest: StoryManifest;
  siteSlug: string;
  editMode?: boolean;
}) {
  const blocks = (manifest.blocks ?? []).filter(
    (b): b is PageBlock =>
      Boolean(b) && b.visible !== false && THEMED_CUSTOM_BLOCK_TYPES.has(b.type),
  );
  if (blocks.length === 0) return null;
  const ordered = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="pl8-custom-blocks">
      {ordered.map((block) => (
        <ThemedCustomBlockCase
          key={block.id}
          block={block}
          siteSlug={siteSlug}
          editMode={editMode}
          manifest={manifest}
        />
      ))}
    </div>
  );
}

/* Per-block-type default eyebrow + title labels — used when
   block.config doesn't override them. Mirrors the editorial
   tone of the rest of ThemedSiteRenderer's section heads. */
const THEMED_CUSTOM_BLOCK_DEFAULTS: Record<
  string,
  { eyebrow: string; title: string; italic?: string }
> = {
  itinerary:    { eyebrow: 'Itinerary', title: 'The', italic: 'plan' },
  costSplitter: { eyebrow: 'Shared costs', title: 'Splitting', italic: 'the tab' },
  activityVote: { eyebrow: 'Vote', title: 'Help us', italic: 'decide' },
  toastSignup:  { eyebrow: 'Toasts', title: 'Raise a', italic: 'glass' },
  adviceWall:   { eyebrow: 'Advice', title: 'Words for the', italic: 'road' },
  tributeWall:  { eyebrow: 'Tribute', title: 'A wall of', italic: 'memories' },
  obituary:     { eyebrow: 'In memory', title: 'A life', italic: 'remembered' },
  livestream:   { eyebrow: 'Livestream', title: 'Watch', italic: 'live' },
  privacyGate:  { eyebrow: 'For our guests', title: 'A note on', italic: 'privacy' },
  packingList:  { eyebrow: 'Packing list', title: 'Bring', italic: 'these' },
  program:      { eyebrow: 'Program', title: 'Order of', italic: 'events' },
};

function ThemedCustomBlockCase({
  block,
  siteSlug,
  editMode,
  manifest,
}: {
  block: PageBlock;
  siteSlug: string;
  editMode?: boolean;
  manifest: StoryManifest;
}) {
  const cfg = (block.config ?? {}) as Record<string, unknown>;
  const str = (k: string): string | undefined =>
    typeof cfg[k] === 'string' ? (cfg[k] as string) : undefined;
  const arr = <T,>(k: string): T[] => (Array.isArray(cfg[k]) ? (cfg[k] as T[]) : []);

  const defaults = THEMED_CUSTOM_BLOCK_DEFAULTS[block.type];
  /* Block.config.title / .eyebrow win over the per-type
     defaults. When neither is set we fall back to the defaults
     so every block reads with a coherent themed head. */
  const eyebrow = str('eyebrow') ?? defaults?.eyebrow ?? block.type;
  const title = str('title') ?? defaults?.title ?? '';
  const italic = str('italic') ?? defaults?.italic;
  const showHead = Boolean(eyebrow || title);

  const wrap = (node: ReactNode) => (
    <section
      data-pl-block={block.type}
      data-pl-block-id={block.id}
      data-pl-reveal="pending"
      style={{
        position: 'relative',
        padding: 'clamp(56px, 9vw, 96px) 24px',
        background: 'var(--cream, #F5EFE2)',
      }}
    >
      {showHead && (
        <ThemedSectionHead
          eyebrow={eyebrow}
          title={title}
          italic={italic}
        />
      )}
      <div style={{ maxWidth: 960, margin: '0 auto' }}>{node}</div>
    </section>
  );

  switch (block.type) {
    case 'itinerary': {
      const days = arr<{
        label: string;
        date?: string;
        slots: { time?: string; title: string; detail?: string; location?: string }[];
      }>('days');
      if (days.length === 0 && !editMode) return null;
      return wrap(
        <ItineraryBlock
          title={str('title')}
          subtitle={str('subtitle')}
          days={days.length ? days : [{ label: 'Day 1', slots: [] }]}
          accent="var(--peach-ink)"
        />,
      );
    }
    case 'costSplitter': {
      const lineItems = arr<{ label: string; amount: number; note?: string }>('lineItems');
      if (lineItems.length === 0 && !editMode) return null;
      return wrap(
        <CostSplitterBlock
          title={str('title')}
          subtitle={str('subtitle')}
          currency={str('currency') ?? 'USD'}
          headcount={typeof cfg.headcount === 'number' ? (cfg.headcount as number) : undefined}
          lineItems={lineItems}
          payoutHandle={str('payoutHandle')}
          accent="var(--peach-ink)"
        />,
      );
    }
    case 'activityVote': {
      const options = arr<{ id: string; label: string; detail?: string }>('options');
      if (options.length === 0 && !editMode) return null;
      return wrap(
        <ActivityVoteBlock
          title={str('title')}
          subtitle={str('subtitle')}
          question={str('question')}
          storageKey={siteSlug}
          options={options}
          showResults
          siteId={siteSlug}
          blockId={block.id}
          accent="var(--peach-ink)"
        />,
      );
    }
    case 'toastSignup': {
      const slots = arr<{ id: string; label: string; detail?: string }>('slots');
      if (slots.length === 0 && !editMode) return null;
      return wrap(
        <ToastSignupBlock
          title={str('title')}
          subtitle={str('subtitle')}
          slots={slots}
          storageKey={siteSlug}
          siteId={siteSlug}
          blockId={block.id}
          accent="var(--peach-ink)"
        />,
      );
    }
    case 'adviceWall':
    case 'tributeWall': {
      const rawSeeds = arr<{ id?: string; from?: string; name?: string; body: string; at?: string }>(
        'seeds',
      );
      const seeds = rawSeeds.map((s) => ({
        from: s.from ?? s.name ?? 'Anonymous',
        body: s.body,
        at: s.at,
      }));
      return wrap(
        <AdviceWallBlock
          title={
            str('title') ??
            (block.type === 'tributeWall' ? 'A tribute wall' : 'Advice for the road ahead')
          }
          subtitle={str('subtitle')}
          prompt={str('prompt')}
          seeds={seeds}
          storageKey={siteSlug}
          siteId={siteSlug}
          blockId={block.id}
          accent="var(--peach-ink)"
        />,
      );
    }
    case 'obituary': {
      const body = str('body');
      if (!body && !editMode) return null;
      return wrap(
        <ObituaryBlock
          name={str('name') ?? ''}
          dates={str('dates')}
          photoUrl={str('photoUrl')}
          body={body ?? ''}
          inMemoryOf={str('inMemoryOf')}
          accent="var(--peach-ink)"
        />,
      );
    }
    case 'livestream': {
      const url = str('url');
      if (!url && !editMode) return null;
      return wrap(
        <LivestreamBlock
          title={str('title')}
          subtitle={str('subtitle')}
          startsAt={str('startsAt')}
          url={url ?? ''}
          buttonLabel={str('buttonLabel')}
          accent="var(--peach-ink)"
        />,
      );
    }
    case 'privacyGate': {
      return wrap(
        <PrivacyGateBlock
          title={str('title')}
          subtitle={str('subtitle')}
          body={str('body')}
          rules={arr<string>('rules')}
          contact={str('contact')}
          accent="var(--peach-ink)"
        />,
      );
    }
    case 'packingList': {
      const items = arr<{ id: string; label: string; category?: string }>('items');
      if (items.length === 0 && !editMode) return null;
      return wrap(
        <PackingListBlock
          title={str('title')}
          subtitle={str('subtitle')}
          items={items}
          storageKey={siteSlug}
          accent="var(--peach-ink)"
        />,
      );
    }
    case 'program': {
      const items = arr<{ id: string; time?: string; title: string; detail?: string }>('items');
      if (items.length === 0 && !editMode) return null;
      return wrap(
        <ProgramBlock
          title={str('title')}
          subtitle={str('subtitle')}
          items={items}
          accent="var(--peach-ink)"
        />,
      );
    }
    default: {
      /* Block type declared in BlockType union but with no
         renderer case yet. Warn loudly (so dev + Sentry catch
         it) and surface a coming-soon placeholder in edit mode
         so the host knows the block is real but not yet
         shipped. Published view stays null so guests never see
         a half-built block. Matches V8's default-case pattern. */
      if (typeof console !== 'undefined') {
        console.warn(`[ThemedSiteRenderer] Unimplemented block type: ${block.type}`);
      }
      if (!editMode) return null;
      return (
        <section
          data-pl-block={block.type}
          data-pl-block-id={block.id}
          style={{
            padding: '32px 24px',
            background: 'var(--cream, #F5EFE2)',
          }}
        >
          <div
            style={{
              maxWidth: 640,
              margin: '0 auto',
              padding: '14px 18px',
              background: 'var(--cream-2, #FBF7EE)',
              border: '1px dashed var(--line, rgba(14,13,11,0.16))',
              borderRadius: 'var(--pl-card-radius, 12px)',
              color: 'var(--ink-soft, #3A332C)',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            Block type &ldquo;{block.type}&rdquo; is coming soon.
          </div>
        </section>
      );
    }
  }
}

/* Per-Edition footer palette — mirrors the EDITION_PALETTE table
   in FooterBouquet so the Themed footer reads as one continuous
   editorial close (share chips → bouquet → brand colophon) on a
   single themed surface. Cream-on-deep-ink for most Editions;
   cream-deep-on-ink for scrapbook Postcard Box. */
const THEMED_FOOTER_PALETTE: Record<string, { bg: string; ink: string; line: string }> = {
  'almanac':      { bg: '#3D4A1F', ink: '#F5EFE2', line: 'rgba(245,239,226,0.20)' },
  'cinema':       { bg: '#0E0D0B', ink: '#F1EBDC', line: 'rgba(241,235,220,0.18)' },
  'postcard-box': { bg: '#EBE3D2', ink: '#0E0D0B', line: 'rgba(14,13,11,0.16)' },
  'linen-folder': { bg: '#1B2A3A', ink: '#F0E9DA', line: 'rgba(240,233,218,0.20)' },
  'quiet':        { bg: '#0E0D0B', ink: '#F5EFE2', line: 'rgba(245,239,226,0.18)' },
  'coastal':      { bg: '#103B45', ink: '#F0EDE3', line: 'rgba(240,237,227,0.18)' },
};

/* React.memo — footer is the last block in the tree and rarely
   changes mid-session. Most edits don't touch logistics/date/venue
   or decorLibrary.footerBouquet, so this skips re-render on every
   keystroke deep in a chapter/event. namesTuple is memoized
   upstream so the prop identity is stable. */
const ThemedFooter = memo(function ThemedFooter({ siteSlug: _siteSlug, names, manifest }: { siteSlug: string; names: [string, string]; manifest: StoryManifest }) {
  const [n1, n2] = names;
  const date = manifest.logistics?.date;
  const venue = manifest.logistics?.venue;

  /* Resolve the active Edition once so the share chips + bouquet
     (FooterBouquet) and the colophon below all share the same
     palette. Mirrors the resolution chain used everywhere else
     in ThemedSiteRenderer. */
  const occasion = manifest.occasion ?? 'wedding';
  const eventType = getEventType(occasion);
  const voice = eventType?.voice ?? 'celebratory';
  const activeEdition = resolveEdition({
    edition: manifest.edition,
    occasion: occasion as Parameters<typeof resolveEdition>[0]['occasion'],
    voice,
  });
  const palette = THEMED_FOOTER_PALETTE[activeEdition.id] ?? THEMED_FOOTER_PALETTE['almanac'];
  const bouquetUrl = (manifest as unknown as { decorLibrary?: { footerBouquet?: string } }).decorLibrary?.footerBouquet;

  return (
    <footer
      data-pl-themed-footer
      style={{
        background: palette.bg,
        color: palette.ink,
        position: 'relative',
      }}
    >
      {/* FooterBouquet — share chip row + per-Edition palette wash +
          (optional) closing flourish bouquet image. Single source of
          truth for the share affordance + AI decor slot. Wrapped in
          its own root that sets --pl-footer-bg / --pl-footer-ink. */}
      <FooterBouquet url={bouquetUrl} manifest={manifest} />

      {/* Brand colophon — gold hairline → italic brand name → meta
          eyebrow → back-to-top pill → "woven on Pearloom" sign-off.
          Inherits the FooterBouquet palette via the wrapping footer
          element above so all three blocks read as one editorial
          close on the Edition's themed surface. */}
      <div
        style={{
          padding: '40px 32px 40px',
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 220,
            height: 1,
            margin: '0 auto 36px',
            background: `linear-gradient(90deg, transparent, var(--gold, #B8935A) 50%, transparent)`,
            opacity: 0.6,
          }}
        />
        <span
          className="display-italic"
          style={{
            fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
            fontStyle: 'italic',
            fontSize: 26,
            fontWeight: 500,
            color: palette.ink,
            letterSpacing: '-0.01em',
          }}
        >
          {n1 && n2 ? `${n1} & ${n2}` : 'Our celebration'}
        </span>
        {(date || venue) && (
          <div
            className="eyebrow"
            style={{
              marginTop: 14,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: 'var(--pl-eyebrow-ls, 0.22em)',
              textTransform: 'uppercase',
              color: palette.ink,
              opacity: 0.7,
            }}
          >
            {[date, venue].filter(Boolean).join(' · ')}
          </div>
        )}
        <div>
          <a
            href="#top"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 28,
              padding: '8px 18px',
              borderRadius: 999,
              background: 'transparent',
              border: `1px solid ${palette.line}`,
              color: palette.ink,
              fontSize: 11.5,
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '0.02em',
              opacity: 0.85,
            }}
          >
            ↑ back to top
          </a>
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 11,
            color: palette.ink,
            opacity: 0.6,
            fontStyle: 'italic',
          }}
        >
          woven on Pearloom
        </div>
      </div>
    </footer>
  );
});
