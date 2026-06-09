// ─────────────────────────────────────────────────────────────
// Pearloom / lib/suite/proofs.ts
//
// SUITE PHASE 3 (docs/SUITE-STRATEGY.md §3) — "Pear pressed six
// proofs." The composition pass behind the Studio's proof sheet:
// ONE Claude call (sonnet, forced tool_use) reads the SuiteTheme
// + event info and arranges 4–6 complete save-the-date / invite
// proofs out of REAL catalog ids — Studio layouts, MotifScatter
// MotifKinds, Monogram frames. AI arranges real components; it
// never hallucinates pixels, so every proof renders crisp through
// the existing StudioCard system and stays fully editable.
//
// Also home to `stylizeStyleForSuite` — the pack-character →
// photo-stylize-style mapping that keys the hero-art style off
// the couple's theme (Gilded Coupe → gilded deco; Noël Press →
// letterpress; Sakura Drift → watercolor; …).
//
// Server-only (imports the Anthropic client). Client surfaces
// must import ONLY types from this module (`import type`).
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { SuiteTheme } from '@/lib/suite/theme';
import type { MotifKind } from '@/components/pearloom/site/MotifScatter';
import type { MonogramFrame } from '@/components/pearloom/site/Monogram';
import { LAYOUTS, PALETTES, MOTIFS, FONT_PAIRS, COPY_TONES } from '@/components/pearloom/studio/studio-constants';
import { studioDefaultsFromLook } from '@/components/pearloom/studio/studio-defaults-from-look';
import { getEventType, type EventVoice } from '@/lib/event-os/event-types';
import { cached } from '@/lib/claude/client';
import { generateJson } from '@/lib/claude/structured';

// ─── Stylize style mapping (pack character → /api/photos/stylize id) ──

/** Couple-subject style ids accepted by /api/photos/stylize.
 *  KEEP IN SYNC with STYLES_COUPLE in
 *  src/app/api/photos/stylize/route.ts — route files can't export
 *  non-handler values, so the id list is mirrored here. */
export const SUITE_STYLIZE_STYLE_IDS = [
  'paper-craft',
  'watercolor',
  'embroidery',
  'botanical',
  'gilded-deco',
  'letterpress',
  'oil-portrait',
  'linocut',
  'dusk-pastel',
] as const;
export type SuiteStylizeStyleId = (typeof SUITE_STYLIZE_STYLE_IDS)[number];

function hexLuminance(hex: string): number {
  const m = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return 0.5;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const GARDEN_MOTIFS: ReadonlySet<string> = new Set([
  'olive', 'bloom', 'pressed', 'fern', 'laurel', 'vine', 'peony', 'magnolia',
  'gingko', 'wheat', 'rose', 'cherry-blossom', 'hummingbird', 'monstera', 'orchid',
]);
const PLAYFUL_MOTIFS: ReadonlySet<string> = new Set([
  'disco', 'starburst', 'butterfly', 'ribbon', 'arrows', 'champagne',
]);
const PLAYFUL_OCCASIONS: ReadonlySet<string> = new Set([
  'bachelor-party', 'bachelorette-party', 'sweet-sixteen', 'first-birthday',
  'birthday', 'milestone-birthday', 'gender-reveal',
]);

/**
 * Map a couple's theme character to the photo-stylize style that
 * suits it. Pure + deterministic — the proof sheet and the Photo
 * Style panel agree on the same answer for the same theme.
 *
 * Pass `texture` (manifest.texture) when you have the manifest in
 * hand — it's the strongest material signal and SuiteTheme doesn't
 * carry it.
 */
export function stylizeStyleForSuite(
  suite: SuiteTheme,
  texture?: StoryManifest['texture'],
): SuiteStylizeStyleId {
  const darkPaper = hexLuminance(suite.palette.paper) < 0.45;

  // Dark ground + foil character → gold-leaf deco illustration.
  if (texture === 'gilded' || texture === 'marble' || suite.kitId === 'deco') {
    return 'gilded-deco';
  }
  if (darkPaper && (suite.edition === 'cinema' || suite.kitId === 'plate')) {
    return 'gilded-deco';
  }
  // Velvet / evening character → classical warm oil portrait.
  if (texture === 'velvet' || darkPaper) return 'oil-portrait';
  // Pressed-paper materials → debossed two-tone letterpress.
  if (texture === 'kraft' || texture === 'paper' || texture === 'letterpress' || texture === 'newsprint') {
    return 'letterpress';
  }
  if (texture === 'watercolor') return 'watercolor';
  // Playful / whimsy character → bold carved linocut.
  if (
    (suite.motif && PLAYFUL_MOTIFS.has(suite.motif)) ||
    PLAYFUL_OCCASIONS.has(suite.occasion) ||
    suite.kitId === 'scrapbook'
  ) {
    return 'linocut';
  }
  // Garden character → botanical etching.
  if (suite.motif && GARDEN_MOTIFS.has(suite.motif)) return 'botanical';
  return 'watercolor';
}

// ─── Real catalogs (embedded in the prompt + used for validation) ──

const STUDIO_LAYOUT_IDS = LAYOUTS.map((l) => l.id);
const STUDIO_PALETTE_IDS = new Set(PALETTES.map((p) => p.id));
const STUDIO_MOTIF_IDS = new Set(MOTIFS.map((m) => m.id));
const STUDIO_FONT_IDS = new Set(FONT_PAIRS.map((f) => f.id));
const STUDIO_TONE_IDS = new Set(COPY_TONES.map((t) => t.id));

/** Full MotifScatter vocabulary. `satisfies` keeps this array from
 *  drifting when the MotifKind union grows — a missing/extra id is
 *  a type error here, not a silent prompt gap. */
const MOTIF_KINDS = [
  'olive', 'bloom', 'pressed', 'lemon', 'sun', 'wheat', 'fern', 'shell',
  'citrus', 'laurel', 'deco-fan', 'palm', 'mountain', 'wave-curl', 'rose',
  'crescent', 'dove', 'arrows', 'pinecone', 'butterfly', 'magnolia', 'gingko',
  'champagne', 'lantern', 'compass', 'peony', 'vine', 'starburst', 'ribbon',
  'hummingbird', 'orchid', 'monstera', 'holly', 'cherry-blossom', 'anchor',
  'disco', 'none',
] as const satisfies readonly MotifKind[];
const MOTIF_KIND_SET: ReadonlySet<string> = new Set(MOTIF_KINDS);

/** Full Monogram frame vocabulary (same `satisfies` guard). */
const MONOGRAM_FRAMES = [
  'ring', 'diamond', 'laurel', 'none', 'shield', 'oval', 'arch', 'sprig',
  'seal', 'banner', 'stitch', 'pearls', 'fan', 'garland', 'lozenge',
  'corners', 'wreath', 'gate', 'halo', 'tag',
] as const satisfies readonly MonogramFrame[];
const MONOGRAM_FRAME_SET: ReadonlySet<string> = new Set(MONOGRAM_FRAMES);

/** MotifKind → the Studio's coarser motif vocabulary, so a proof
 *  renders through the real MotifOverlay today. The fine-grained
 *  MotifKind is kept on the proof for the reveal page / print
 *  renderer, which draw the actual glyph. */
const MOTIFKIND_TO_STUDIO_MOTIF: Record<MotifKind, string> = {
  olive: 'leaves', bloom: 'leaves', pressed: 'leaves', fern: 'leaves',
  laurel: 'leaves', palm: 'leaves', wheat: 'leaves', rose: 'leaves',
  magnolia: 'leaves', gingko: 'leaves', peony: 'leaves', vine: 'leaves',
  holly: 'leaves', 'cherry-blossom': 'leaves', monstera: 'leaves', orchid: 'leaves',
  lemon: 'stamp', citrus: 'stamp', shell: 'stamp', mountain: 'stamp',
  compass: 'stamp', anchor: 'stamp', lantern: 'stamp', pinecone: 'stamp',
  crescent: 'stamp', dove: 'stamp',
  sun: 'doodle', starburst: 'doodle', disco: 'doodle', butterfly: 'doodle',
  hummingbird: 'doodle', champagne: 'doodle', arrows: 'doodle',
  'wave-curl': 'doodle', ribbon: 'doodle',
  'deco-fan': 'monogram',
  none: 'none',
};

// ─── The proof shape ─────────────────────────────────────────

export type ProofPaletteEmphasis = 'paper' | 'accent' | 'ink';
export type ProofStationeryType = 'std' | 'invite' | 'thanks';

export interface SuiteProofCopy {
  /** Top overline, e.g. "Save the evening of June 22". ≤48 chars. */
  eyebrow: string;
  /** Display headline in the event's voice. The Studio keeps the
   *  manifest names as the locked headline; this is carried for the
   *  reveal page + print renders. ≤64 chars. */
  headline: string;
  /** The body / date line, e.g. "are getting married" or "Join us
   *  in remembering a beautiful life". Maps to Studio line2. */
  dateLine: string;
  /** Footer line, e.g. "Formal invitation to follow". Maps to cta. */
  footer: string;
}

export interface SuiteProof {
  /** Stable kebab id, unique within the sheet. */
  id: string;
  /** 1–2 word display name ("Gilded Evening"). */
  name: string;
  /** Short style note ("gold · deco · evening"). */
  note: string;
  /** One of the real Studio layout ids. */
  layoutId: string;
  /** MotifScatter MotifKind — the suite-level glyph pick. */
  motif: MotifKind;
  /** Monogram frame id — consumed by the reveal page / print suite. */
  monogramFrame: MonogramFrame;
  paletteEmphasis: ProofPaletteEmphasis;
  /** True when this proof leads with the couple's AI-stylized photo
   *  art. The Studio renders the cover photo + a note chip until the
   *  host has actually pressed the art (we never auto-fire the image
   *  model from the proof flow — cost). */
  useStylizedArt: boolean;
  copy: SuiteProofCopy;
  /** Ready-to-apply Studio state patch — every id validated against
   *  the Studio catalogs server-side so the client can apply blind. */
  studio: {
    palette: string;
    layout: string;
    motif: string;
    fontPair: string;
    tone: string;
  };
}

// ─── Voice ───────────────────────────────────────────────────

const VOICE_GUIDANCE: Record<EventVoice, string> = {
  celebratory:
    'Warm and upbeat. Spoken-aloud register, contractions welcome. One exclamation across the whole sheet at most.',
  intimate:
    'Tender and quiet. Small words, close-in. No exclamation marks, nothing loud.',
  ceremonial:
    'Formal and ritual-aware — "request the pleasure" register. Spelled-out dates read right here.',
  playful:
    'Light and in on the joke. Contemporary, a wink — never sarcastic about the guest of honor.',
  solemn:
    'Gentle and respectful. "Join us in remembering", "We will gather to honor". NEVER "party", "celebrate big", "can\'t wait", or exclamation marks.',
};

function resolveVoice(manifest: StoryManifest, occasion: string): EventVoice {
  const eventVoice = getEventType(occasion)?.voice ?? 'celebratory';
  if (eventVoice === 'solemn') return 'solemn'; // somber occasions always win
  if (manifest.voiceOverride === 'playful') return 'playful';
  if (manifest.voiceOverride === 'poetic') return 'intimate';
  return eventVoice;
}

// ─── Deterministic seed (stable re-opens per site) ───────────

function seedFromSlug(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 10_000);
}

// ─── Coercion / validation ───────────────────────────────────

interface RawProof {
  name?: unknown;
  note?: unknown;
  layoutId?: unknown;
  motif?: unknown;
  monogramFrame?: unknown;
  paletteEmphasis?: unknown;
  useStylizedArt?: unknown;
  copy?: { eyebrow?: unknown; headline?: unknown; dateLine?: unknown; footer?: unknown };
}

export interface CoerceContext {
  suite: SuiteTheme;
  voice: EventVoice;
  type: ProofStationeryType;
  /** Look-derived Studio defaults — the 'accent' emphasis palette,
   *  fontPair, tone fallbacks. */
  lookDefaults: { palette: string; fontPair: string; layout: string; motif: string; tone: string };
  darkPaper: boolean;
  seed: number;
}

function str(v: unknown, max: number, fallback: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return (s || fallback).slice(0, max);
}

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function defaultCopy(ctx: CoerceContext): SuiteProofCopy {
  const { voice, type, suite } = ctx;
  const names = suite.names.filter(Boolean).join(' & ') || 'us';
  if (voice === 'solemn') {
    return {
      eyebrow: type === 'thanks' ? 'With gratitude' : 'Join us in remembering',
      headline: names,
      dateLine: type === 'thanks' ? 'for standing with us' : 'A gathering to honor a beautiful life',
      footer: type === 'invite' ? 'Details to follow gently' : 'We hope you can be with us',
    };
  }
  if (type === 'invite') {
    return {
      eyebrow: 'You are invited',
      headline: names,
      dateLine: 'request the pleasure of your company',
      footer: 'Kindly respond by the date on your card',
    };
  }
  if (type === 'thanks') {
    return {
      eyebrow: 'Thank you',
      headline: 'with all our love',
      dateLine: 'for celebrating with us',
      footer: 'Photos on the site',
    };
  }
  return {
    eyebrow: 'Save the date',
    headline: names,
    dateLine: voice === 'playful' ? "we're doing the thing" : 'are getting together',
    footer: 'Formal invitation to follow',
  };
}

function studioPaletteFor(emphasis: ProofPaletteEmphasis, ctx: CoerceContext): string {
  if (emphasis === 'accent') return ctx.lookDefaults.palette;
  if (emphasis === 'paper') return ctx.darkPaper ? 'twilight' : 'cream';
  // 'ink' — ink-on-paper letterpress read; on dark sites the
  // twilight palette is the only ink-forward option that matches.
  return ctx.darkPaper ? 'twilight' : 'cream';
}

/** Coerce one raw model proof into a fully-validated SuiteProof.
 *  Invalid ids fall back to suite/look defaults — never throws. */
function coerceProof(raw: RawProof, idx: number, ctx: CoerceContext): SuiteProof {
  const fallbackMotif: MotifKind =
    ctx.suite.motif && MOTIF_KIND_SET.has(ctx.suite.motif) ? (ctx.suite.motif as MotifKind) : 'olive';
  const fallbackFrame: MonogramFrame =
    MONOGRAM_FRAME_SET.has(ctx.suite.monogram.frame) ? (ctx.suite.monogram.frame as MonogramFrame) : 'ring';

  const layoutId =
    typeof raw.layoutId === 'string' && STUDIO_LAYOUT_IDS.includes(raw.layoutId)
      ? raw.layoutId
      : ctx.lookDefaults.layout;
  const motif: MotifKind =
    typeof raw.motif === 'string' && MOTIF_KIND_SET.has(raw.motif)
      ? (raw.motif as MotifKind)
      : fallbackMotif;
  const monogramFrame: MonogramFrame =
    typeof raw.monogramFrame === 'string' && MONOGRAM_FRAME_SET.has(raw.monogramFrame)
      ? (raw.monogramFrame as MonogramFrame)
      : fallbackFrame;
  const paletteEmphasis: ProofPaletteEmphasis =
    raw.paletteEmphasis === 'paper' || raw.paletteEmphasis === 'accent' || raw.paletteEmphasis === 'ink'
      ? raw.paletteEmphasis
      : 'accent';

  const fallback = defaultCopy(ctx);
  const copy: SuiteProofCopy = {
    eyebrow: str(raw.copy?.eyebrow, 48, fallback.eyebrow),
    headline: str(raw.copy?.headline, 64, fallback.headline),
    dateLine: str(raw.copy?.dateLine, 90, fallback.dateLine),
    footer: str(raw.copy?.footer, 80, fallback.footer),
  };

  const name = str(raw.name, 28, `Proof ${idx + 1}`);
  const studioMotif = MOTIFKIND_TO_STUDIO_MOTIF[motif] ?? ctx.lookDefaults.motif;

  return {
    id: `${kebab(name) || 'proof'}-${ctx.seed}-${idx + 1}`,
    name,
    note: str(raw.note, 48, `${layoutId} · ${motif}`),
    layoutId,
    motif,
    monogramFrame,
    paletteEmphasis,
    useStylizedArt: raw.useStylizedArt === true,
    copy,
    studio: {
      palette: studioPaletteFor(paletteEmphasis, ctx),
      layout: layoutId,
      motif: STUDIO_MOTIF_IDS.has(studioMotif) ? studioMotif : 'stamp',
      fontPair: STUDIO_FONT_IDS.has(ctx.lookDefaults.fontPair) ? ctx.lookDefaults.fontPair : 'editorial',
      tone: STUDIO_TONE_IDS.has(ctx.lookDefaults.tone) ? ctx.lookDefaults.tone : 'warm',
    },
  };
}

/** Deterministic pad — when the model returns fewer than `min`
 *  usable proofs, fill the sheet from the suite itself so the host
 *  always sees a complete press run. */
function padProofs(proofs: SuiteProof[], min: number, ctx: CoerceContext): SuiteProof[] {
  const PAD: Array<Partial<RawProof>> = [
    { name: 'Pressed classic', layoutId: 'classic', paletteEmphasis: 'accent', useStylizedArt: false },
    { name: 'Letterpress', layoutId: 'minimal', paletteEmphasis: 'ink', useStylizedArt: false },
    { name: 'Photo plate', layoutId: 'photo', paletteEmphasis: 'paper', useStylizedArt: true },
    { name: 'Editorial', layoutId: 'asym', paletteEmphasis: 'accent', useStylizedArt: false },
  ];
  const out = [...proofs];
  for (let i = 0; out.length < min && i < PAD.length; i++) {
    out.push(coerceProof(PAD[i] as RawProof, 90 + i, ctx));
  }
  return out;
}

/** Exported for unit tests — validates + coerces the raw model
 *  output against the real catalogs. */
export function coerceProofSheet(
  rawProofs: unknown,
  ctx: CoerceContext,
  count: number,
): SuiteProof[] {
  const arr = Array.isArray(rawProofs) ? (rawProofs as RawProof[]) : [];
  const coerced = arr
    .filter((p) => p && typeof p === 'object')
    .slice(0, count)
    .map((p, i) => coerceProof(p, i, ctx));
  return padProofs(coerced, Math.min(4, count), ctx);
}

/** Exported for unit tests. */
export function buildCoerceContext(args: {
  suite: SuiteTheme;
  manifest: StoryManifest;
  type: ProofStationeryType;
  seed: number;
}): CoerceContext {
  const { suite, manifest, type, seed } = args;
  return {
    suite,
    voice: resolveVoice(manifest, suite.occasion),
    type,
    lookDefaults: studioDefaultsFromLook(manifest),
    darkPaper: hexLuminance(suite.palette.paper) < 0.45,
    seed,
  };
}

// ─── The composition pass ────────────────────────────────────

const TYPE_LABEL: Record<ProofStationeryType, string> = {
  std: 'save-the-date',
  invite: 'invitation',
  thanks: 'thank-you card',
};

/* Static catalog half of the prompt — cached() so consecutive
   sheet presses within 5 minutes share one prompt-cache entry. */
const SYSTEM_PROMPT = `You are Pear, Pearloom's stationery press. You compose card proofs by arranging REAL components from the Studio's catalogs — you never invent component ids and you never describe pixels.

CARD LAYOUTS — layoutId must be exactly one of:
- classic — centered and airy; serif names stacked between hairline rules. The gallant default.
- asym — off-center editorial; oversized names upper-left, date/place in a footer band.
- photo — photo-led; the image carries the top two-thirds, caption block beneath. The natural home for stylized art.
- script — a handwritten letter in a casual hand; intimate and personal.
- minimal — names, one rule, the date. Spare and modern.

MOTIF GLYPHS — motif must be exactly one of:
${MOTIF_KINDS.join(', ')}

MONOGRAM FRAMES — monogramFrame must be exactly one of:
${MONOGRAM_FRAMES.join(', ')}

PALETTE EMPHASIS — paletteEmphasis is one of:
- paper — paper-led, quiet; the card is mostly ground.
- accent — accent-forward; the couple's accent color does the talking.
- ink — ink-on-paper letterpress read; high contrast, no wash.

For each proof return: name (1–2 words, e.g. "Gilded Evening"), note (short style note, e.g. "gold · deco · evening"), layoutId, motif, monogramFrame, paletteEmphasis, useStylizedArt (true = the card leads with the couple's photo made into art; pair it with the photo layout and use it on at most 2 proofs), and copy { eyebrow ≤ 42 chars, headline ≤ 60, dateLine ≤ 80, footer ≤ 70 }.

Compose proofs that read as ONE suite with range: vary layout and paletteEmphasis across the sheet. Keep most proofs on the couple's own motif; you may introduce at most TWO alternate motifs across the whole sheet, and they must be tasteful neighbours of the original (a garden stays botanical; an evening stays celestial), never novelty. Copy never says "AI", "generated", "powered", or "template".`;

/**
 * One Claude call → 4–6 fully-validated proofs. Deterministic-ish:
 * the seed derives from the site slug and temperature stays low, so
 * re-opening the sheet on the same site presses the same proofs.
 *
 * Throws on model failure — the route translates that into a warm
 * 502. Invalid IDS inside an otherwise-successful response never
 * throw; they coerce to suite defaults.
 */
export async function generateProofSheet(args: {
  suite: SuiteTheme;
  manifest: StoryManifest;
  /** Stationery type the sheet is pressed for. Default 'std'. */
  type?: ProofStationeryType;
  /** 4–6. Default 6 — "Pear pressed six proofs". */
  count?: number;
  /** Seed source — pass the site slug. */
  siteSlug: string;
}): Promise<SuiteProof[]> {
  const type: ProofStationeryType = args.type ?? 'std';
  const count = Math.max(4, Math.min(6, args.count ?? 6));
  const seed = seedFromSlug(args.siteSlug);
  const ctx = buildCoerceContext({ suite: args.suite, manifest: args.manifest, type, seed });
  const { suite } = args;

  const voiceNote = VOICE_GUIDANCE[ctx.voice];
  const names = suite.names.filter(Boolean).join(' & ') || '(names not set)';

  const userPrompt = `Press ${count} proofs for a ${TYPE_LABEL[type]}.

THE EVENT
- Occasion: ${suite.occasion}
- Voice: ${ctx.voice} — ${voiceNote}
- Names: ${names}
- Date: ${suite.eventDate ?? '(not set)'}
- Venue: ${suite.venue ?? '(not set)'}

THE COUPLE'S LOOK (their site's live design system — the proofs must read as the same made object)
- Paper ${suite.palette.paper} · ink ${suite.palette.ink} · accent ${suite.palette.accent} · gold ${suite.palette.gold}${ctx.darkPaper ? ' (dark evening paper)' : ''}
- Display face: ${suite.fonts.displayFamily} · body: ${suite.fonts.bodyFamily}
- Their motif: ${suite.motif ?? '(none picked — choose one occasion-true glyph and stay on it)'}
- Their monogram frame: ${suite.monogram.frame} (initials ${suite.monogram.initials})
- Kit: ${suite.kitId} · edition: ${suite.edition ?? 'almanac'}
- Stylized photo art ${suite.stylizedArt ? `exists (style: ${suite.stylizedArt.style})` : 'not pressed yet (still mark 1–2 proofs useStylizedArt: true — the Studio handles the placeholder)'}

Sheet seed: ${seed}. Let the seed deterministically nudge which alternates and layouts you reach for, so the same seed always presses the same sheet.`;

  const result = await generateJson<{ proofs?: unknown }>({
    tier: 'sonnet',
    system: [cached(SYSTEM_PROMPT, '5m')],
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 2400,
    temperature: 0.3,
    schemaName: 'emit_proof_sheet',
    schemaDescription: 'Emit the composed stationery proof sheet.',
    schema: {
      type: 'object',
      required: ['proofs'],
      properties: {
        proofs: {
          type: 'array',
          minItems: 4,
          maxItems: 6,
          items: {
            type: 'object',
            required: ['name', 'layoutId', 'motif', 'monogramFrame', 'paletteEmphasis', 'useStylizedArt', 'copy'],
            properties: {
              name: { type: 'string' },
              note: { type: 'string' },
              layoutId: { type: 'string', enum: STUDIO_LAYOUT_IDS },
              motif: { type: 'string', enum: [...MOTIF_KINDS] },
              monogramFrame: { type: 'string', enum: [...MONOGRAM_FRAMES] },
              paletteEmphasis: { type: 'string', enum: ['paper', 'accent', 'ink'] },
              useStylizedArt: { type: 'boolean' },
              copy: {
                type: 'object',
                required: ['eyebrow', 'headline', 'dateLine', 'footer'],
                properties: {
                  eyebrow: { type: 'string' },
                  headline: { type: 'string' },
                  dateLine: { type: 'string' },
                  footer: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  });

  return coerceProofSheet(result.proofs, ctx, count);
}
