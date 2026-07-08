// ─────────────────────────────────────────────────────────────
// studio-defaults-from-look.ts — bridge from the Site Look
// Engine (manifest.edition / kitId / theme.colors / voiceOverride)
// to Studio's own dial registry (palette / fontPair / layout /
// motif / tone). Called from useStudioState.readInitialState
// when manifest.studio is undefined — first-time Studio opens
// inherit the host's site look so the stationery matches the
// site. Subsequent opens read manifest.studio as before.
//
// Why this exists: the brief's §6 names "Matched stationery
// suite — extend the Save-the-Date generator to invitation,
// menu, place cards, program, thank-you, signage — all from
// the same SiteLook." Until this file, Studio had its own
// independent dials with no link to the site's chosen Edition
// or palette — opening Studio gave you a blank lavender card
// even if your site was Cinema + Letterpress + olive.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { hexToRgb, rgbToHsl } from '@/lib/look-engine/palette-from-photo';
import { lookDefaultsFor } from '@/lib/event-os/event-types';
import { getTheme, themeRootStyle } from '@/components/pearloom/site/themes';
import type { StudioPalette, StudioFontPair } from './studio-constants';

type EditionId = NonNullable<StoryManifest['edition']>;
type KitId = NonNullable<StoryManifest['kitId']>;
type VoiceOverride = NonNullable<StoryManifest['voiceOverride']>;

export interface StudioLookDefaults {
  palette: string;   // PALETTES.id (or 'site') — the card's colors
  fontPair: string;  // FONT_PAIRS.id (or 'site')
  layout: string;    // LAYOUTS.id — classic|asym|photo|script|minimal
  motif: string;     // MOTIFS.id — none|stamp|leaves|tape|monogram|wax|doodle
  tone: string;      // COPY_TONES.id — formal|warm|playful|spare
  /** The site's own paper grain, inherited on first open. */
  texture?: string | null;
}

// ─────────────────────────────────────────────────────────────
// "Wear the site's look" (ATELIER-PLAN ST.1) — the card renders
// from the site's ACTUAL --t-* theme bag instead of a nearest-hue
// preset. The palette/font below are var() references; they
// resolve because the card root carries siteThemeRootStyle() and
// the .pl8-guest scope. Custom color overrides still win on top.
// ─────────────────────────────────────────────────────────────

/** The sentinel id for the site-derived palette/fontPair. */
export const SITE_LOOK_ID = 'site';

export const SITE_PALETTE: StudioPalette = {
  id: SITE_LOOK_ID,
  name: 'Your site',
  paper: 'var(--t-paper)',
  ink: 'var(--t-ink)',
  accent: 'var(--t-accent)',
  accent2: 'var(--t-accent-bg, var(--t-section))',
  sub: 'cut from the site',
};

export const SITE_FONT: StudioFontPair = {
  id: SITE_LOOK_ID,
  name: 'Your site',
  display: 'var(--t-display)',
  ui: 'var(--t-body)',
  weight: 600,
  italic: false,
  sub: 'the site’s faces',
};

/** Does this site have a look worth wearing? (A theme, a pack,
 *  or at least legacy colors.) */
export function siteLookAvailable(manifest: StoryManifest | null | undefined): boolean {
  if (!manifest) return false;
  const loose = manifest as unknown as { themeId?: string; themeVars?: unknown; theme?: { colors?: unknown } };
  return Boolean(loose.themeId || loose.themeVars || loose.theme?.colors);
}

/**
 * The site's resolved --t-* bag as a style object for the card
 * root — the EXACT chain ThemedSite uses (themeId → themeVars),
 * with the legacy theme.colors overlaid for pre-redesign
 * manifests that never got a themeId backfilled.
 */
export function siteThemeRootStyle(manifest: StoryManifest): React.CSSProperties {
  const loose = manifest as unknown as {
    themeId?: string;
    themeVars?: Record<string, string>;
    theme?: { colors?: { background?: string; foreground?: string; accent?: string; cardBg?: string } };
  };
  const vars: Record<string, string> = { ...(loose.themeVars ?? {}) };
  const legacy = loose.theme?.colors;
  if (legacy && !loose.themeVars && !loose.themeId) {
    if (legacy.background) vars['--t-paper'] = legacy.background;
    if (legacy.foreground) vars['--t-ink'] = legacy.foreground;
    if (legacy.accent) vars['--t-accent'] = legacy.accent;
    if (legacy.cardBg) vars['--t-card'] = legacy.cardBg;
  }
  return themeRootStyle(getTheme(loose.themeId), 'comfortable', Object.keys(vars).length > 0 ? vars : null);
}

/* ── Edition → Studio Layout ──
   Each Pearloom Edition has a strong layout personality. Match
   it to Studio's nearest-feel layout so a Cinema site doesn't
   open Studio on Classic centered cards. */
const EDITION_TO_LAYOUT: Record<EditionId, string> = {
  almanac: 'classic',          // book / chapter feel → centered classic
  cinema: 'asym',              // letterboxed / off-center
  'postcard-box': 'photo',     // photo-led tilted polaroids → photo
  'linen-folder': 'minimal',   // hotel stationery formal → minimal two-line
  quiet: 'minimal',            // whitespace + restraint
  coastal: 'minimal',          // deckled paper / hotel-formal feel
};

/* ── Edition → Studio FontPair ──
   editorial (Fraunces+Inter) is the default; modern lives on
   Quiet/Cinema where sans display works; garden (italic) lives
   on Postcard Box where playful italic suits the polaroid feel. */
const EDITION_TO_FONT_PAIR: Record<EditionId, string> = {
  almanac: 'editorial',
  cinema: 'editorial',
  'postcard-box': 'garden',
  'linen-folder': 'editorial',
  quiet: 'modern',
  coastal: 'editorial',
};

/* ── Kit → Studio Motif ──
   Each Kit has a signature decorative element. Map to the
   closest Studio motif. */
const KIT_TO_MOTIF: Record<KitId, string> = {
  /* Pack-exclusive kits (2026-06-13) — Studio's coarse motif
     vocabulary maps each to its nearest sibling. */
  gilt: 'monogram',
  atelier: 'tape',
  cabinet: 'monogram',
  scallop: 'stamp',
  noir: 'none',
  classic: 'stamp',
  ticket: 'stamp',
  plate: 'monogram',
  scrapbook: 'tape',
  index: 'none',
  minimal: 'none',
  /* Arched cards live close to wax-seal monograms — soft domes
     pair with the curved monogram cartouche. */
  arch: 'monogram',
  /* Stamp is literally a postage frame — the stamp motif is its
     direct visual sibling. */
  stamp: 'stamp',
  /* Deco's gold geometric frames echo the monogram cartouche
     more than tape or stamps; pair with monogram. */
  deco: 'monogram',
  /* Gallery's museum-placard restraint reads like index/minimal —
     no decorative motif on the stationery. */
  gallery: 'none',
  /* Tasting Menu's fine-dining card carries a crest the way real
     menus do — pair with the monogram cartouche. */
  menu: 'monogram',
  /* Glass panes carry no paper motif — light is the ornament. */
  glass: 'none',
  /* Extended event-tuned static kits (v2 site-renderer port) —
     each maps to its nearest Studio motif sibling. */
  'boarding-pass': 'stamp',     // pass stub / ticket lineage → stamp
  marquee: 'stamp',             // bulb frame reads festive → stamp
  chalkboard: 'none',           // slate board, chalk ink, no paper motif
  nursery: 'tape',              // soft pastel scrapbook feel → tape
  kraft: 'tape',                // field-notes / taped kraft → tape
  memoriam: 'none',             // quiet mourning keyline, no ornament
  certificate: 'monogram',      // gold engraved frame + seal → monogram
  'luggage-tag': 'stamp',       // manila travel tag → stamp
  'linen-press': 'none',        // woven inset, material is the ornament
  'wax-seal': 'monogram',       // literal wax seal → monogram cartouche
  pennant: 'stamp',             // festive banner → stamp
  embossed: 'monogram',         // raised relief crest → monogram
  /* Atelier · Motion kits — coarse motif map to nearest sibling. */
  neon: 'none',                 // light is the ornament
  'marquee-live': 'stamp',      // animated bulb frame → stamp
  'aurora-glass': 'none',       // frosted light, no paper motif
  'gold-foil': 'monogram',      // foil sheen / deco lineage → monogram
  confetti: 'stamp',            // festive flecks → stamp
  candlelight: 'none',          // gentle flame, no ornament
  'pressed-bloom': 'tape',      // pressed flower / scrapbook → tape
  vinyl: 'stamp',               // record label disc → stamp
};

/* ── Voice override → Studio CopyTone ──
   Voice drives stationery copy register. classic = warm (the
   default), playful = playful (1:1), poetic = spare (lyrical
   restraint reads as two-line minimalism in stationery). */
const VOICE_TO_TONE: Record<VoiceOverride, string> = {
  classic: 'warm',
  playful: 'playful',
  poetic: 'spare',
};

/* ── theme.colors.accent → Studio Palette ──
   Nearest-neighbor by HSL hue. Each Studio palette has a
   characteristic hue:
     lavender = ~280° (purple)
     sage     = ~80°  (olive)
     peach    = ~25°  (warm orange)
     cream    = ~80°  saturation-low (neutral olive on cream)
     twilight = navy paper / lavender accent — dark-paper case
     rose     = ~10°  (pink-red)
   We pick whichever palette's hue is closest to the site's
   accent hue. Twilight is selected when the site palette is
   genuinely dark (ink luminance > paper luminance, i.e.
   editorial midnight mode). */
const PALETTE_HUE_TARGETS: Array<{ palette: string; targetHue: number }> = [
  { palette: 'lavender', targetHue: 280 },
  { palette: 'sage', targetHue: 80 },
  { palette: 'peach', targetHue: 25 },
  { palette: 'rose', targetHue: 10 },
  { palette: 'cream', targetHue: 80 },
];
function nearestPaletteForAccent(accentHex: string, paperHex: string | undefined): string {
  /* Dark-paper case → twilight regardless of accent hue. */
  if (paperHex) {
    const [pr, pg, pb] = hexToRgb(paperHex);
    const paperL = (0.2126 * pr + 0.7152 * pg + 0.0722 * pb) / 255;
    if (paperL < 0.35) return 'twilight';
  }
  const [h, s] = rgbToHsl(...hexToRgb(accentHex));
  /* Very desaturated accents (s < 0.15) read as neutral —
     cream is the right Studio palette for them. */
  if (s < 0.15) return 'cream';
  /* Circular hue distance — 0° and 359° are 1° apart, not 358°. */
  function hueDist(a: number, b: number): number {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }
  let best = PALETTE_HUE_TARGETS[0];
  let bestDist = hueDist(h, best.targetHue);
  for (const candidate of PALETTE_HUE_TARGETS) {
    const dist = hueDist(h, candidate.targetHue);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return best.palette;
}

/**
 * Build Studio defaults from a Site Look manifest. Every field
 * has a sensible fallback so a fresh / pre-Look-Engine manifest
 * still returns the safe Studio defaults.
 *
 * IMPORTANT: this is read-only. Studio's own state machine writes
 * to manifest.studio later — these defaults only seed the FIRST
 * time the host opens Studio on a site.
 */
export function studioDefaultsFromLook(manifest: StoryManifest): StudioLookDefaults {
  const edition: EditionId = manifest.edition ?? 'almanac';
  /* Kit falls back to the per-event default (lookDefaultsFor) when
     the host hasn't explicitly picked — same fallback the renderer
     uses, so Studio and the site agree on the active kit. */
  const kit: KitId = manifest.kitId ?? lookDefaultsFor(manifest.occasion).kitId;
  const voice: VoiceOverride = manifest.voiceOverride ?? 'classic';

  /* A site with a real look opens the Studio WEARING it — the
     --t-* bag itself (colors + faces) and the site's own paper
     grain, not a nearest-hue preset (ATELIER-PLAN ST.1). Layout /
     motif / tone still route through the edition/kit/voice maps —
     those are stationery decisions, not theme fields. */
  if (siteLookAvailable(manifest)) {
    return {
      palette: SITE_LOOK_ID,
      fontPair: SITE_LOOK_ID,
      layout: EDITION_TO_LAYOUT[edition],
      motif: KIT_TO_MOTIF[kit],
      tone: VOICE_TO_TONE[voice],
      texture: (manifest as unknown as { texture?: string }).texture ?? null,
    };
  }

  const themeColors =
    (manifest as unknown as { theme?: { colors?: { accent?: string; background?: string } } }).theme
      ?.colors;
  const accent = themeColors?.accent ?? '#5C6B3F'; // pl-olive fallback
  const paper = themeColors?.background;

  return {
    palette: nearestPaletteForAccent(accent, paper),
    fontPair: EDITION_TO_FONT_PAIR[edition],
    layout: EDITION_TO_LAYOUT[edition],
    motif: KIT_TO_MOTIF[kit],
    tone: VOICE_TO_TONE[voice],
    texture: null,
  };
}
