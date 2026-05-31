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

type EditionId = NonNullable<StoryManifest['edition']>;
type KitId = NonNullable<StoryManifest['kitId']>;
type VoiceOverride = NonNullable<StoryManifest['voiceOverride']>;

export interface StudioLookDefaults {
  palette: string;   // PALETTES.id — lavender|sage|peach|cream|twilight|rose
  fontPair: string;  // FONT_PAIRS.id — editorial|garden|modern|script
  layout: string;    // LAYOUTS.id — classic|asym|photo|script|minimal
  motif: string;     // MOTIFS.id — none|stamp|leaves|tape|monogram|wax|doodle
  tone: string;      // COPY_TONES.id — formal|warm|playful|spare
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
};

/* ── Kit → Studio Motif ──
   Each Kit has a signature decorative element. Map to the
   closest Studio motif. */
const KIT_TO_MOTIF: Record<KitId, string> = {
  classic: 'stamp',
  ticket: 'stamp',
  plate: 'monogram',
  scrapbook: 'tape',
  index: 'none',
  minimal: 'none',
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
  };
}
