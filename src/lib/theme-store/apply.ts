// ─────────────────────────────────────────────────────────────
// Pearloom / lib/theme-store/apply.ts
//
// `applyPackToManifest(pack, manifest)` — pure function that
// returns the next manifest with a Theme Store pack stamped onto
// it. Mirrors the legacy `pl-applied-pack` localStorage hand-off
// (id + vars + kit) but works directly on a StoryManifest so the
// editor can apply a pack to the open site without a redirect.
//
// What "applying a pack" means
// ────────────────────────────
// A pack (lib/theme-store/packs.ts) carries a full theme bag in
// `--t-*` CSS vars (paper, ink, accent, gold, line, …), a font
// family vocabulary, plus optional kit / texture / pattern /
// motif identity. Apply translates that into the manifest fields
// the renderer consumes:
//
//   • manifest.theme.colors.{background, foreground, accent,
//     accentLight, muted, cardBg} ← from --t-paper / --t-ink /
//     --t-accent / --t-accent-2 / --t-ink-muted / --t-card
//   • manifest.theme.fonts.{heading, body} ← stripped from the
//     pack's --t-display / --t-body CSS values (we read the first
//     family token so the renderer can resolve it to a loaded
//     font; the full CSS string lives on theme.fonts.* if the
//     pack uses an exotic stack)
//   • manifest.kitId ← pack.kit (when defined)
//   • manifest.texture ← pack.texture (when not 'none')
//   • manifest.pattern ← pack.pattern (when not 'none')
//
// What it does NOT do
// ───────────────────
// • Never writes the pack id itself to the manifest — packs are
//   ephemeral identity, not persistent state. The host's site
//   carries the resolved theme values, not "I used pack X".
//   (Future: we may add `manifest.appliedPackId` for analytics +
//   "Reset to pack defaults" affordances, but it's out of scope
//   for the apply path.)
// • Never mutates the input manifest. Returns a shallow-copied
//   next manifest so undo / autosave / React equality checks all
//   behave predictably.
// • Never touches manifest.edition, manifest.siteLayout, or any
//   other Look Engine axis that wasn't explicitly defined by the
//   pack. Packs are theme/kit/material picks; layout stays.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { Pack } from './packs';

/**
 * Translate one of the pack's `--t-*` CSS var values into a value
 * suitable for `manifest.theme.colors.*`. The renderer expects
 * either a hex / oklch / rgb literal — `color-mix()` strings are
 * a runtime feature, so we leave them as-is and trust the browser
 * to resolve them inside the CSS engine. Strips leading/trailing
 * whitespace so `' #fff '` still matches palette comparisons.
 */
function readVar(themeRef: Pack['themeRef'], key: string): string | undefined {
  const v = themeRef[key];
  return typeof v === 'string' ? v.trim() : undefined;
}

/**
 * The pack's `--t-display` / `--t-body` are full CSS font stacks
 * (e.g. `'Fraunces', Georgia, serif`). FontPicker writes plain
 * family names (e.g. `'Fraunces'`) — so we extract the first
 * family token here so picker round-trips still work. Falls back
 * to the full stack when extraction is ambiguous.
 */
function primaryFontFamily(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  const first = stack.split(',')[0]?.trim();
  if (!first) return undefined;
  // Strip surrounding quotes so 'Fraunces' → Fraunces (matches the
  // FontPicker preset values).
  return first.replace(/^['"]+|['"]+$/g, '');
}

/**
 * Apply a Theme Store pack to a manifest. Returns the next
 * manifest — pure, no side effects.
 *
 * The renderer reads:
 *   • theme.colors.* for the site palette
 *   • theme.fonts.heading / .body for typography
 *   • kitId for repeating-row personality
 *   • texture for paper grain
 *   • pattern for the PatternLayer behind content
 *
 * Anything the pack doesn't define stays as-is on the manifest.
 */
export function applyPackToManifest(pack: Pack, manifest: StoryManifest): StoryManifest {
  // Translate the --t-* var bag → the renderer's theme.colors
  // shape. We read each var with a sensible fallback so a pack
  // that omits one field (e.g. some signature dark packs share
  // `--t-card` with `--t-section`) still produces a valid theme.
  const paper = readVar(pack.themeRef, '--t-paper');
  const ink = readVar(pack.themeRef, '--t-ink');
  const accent = readVar(pack.themeRef, '--t-accent');
  const accent2 = readVar(pack.themeRef, '--t-accent-2');
  const accentBg = readVar(pack.themeRef, '--t-accent-bg');
  const inkMuted = readVar(pack.themeRef, '--t-ink-muted');
  const card = readVar(pack.themeRef, '--t-card');

  // Drop into the renderer's shape. accentLight prefers --t-accent-bg
  // (the pack's intentional wash) and falls back to --t-accent-2 so
  // every pack carries a usable hover/secondary tint.
  const nextColors = {
    background: paper ?? '#F5EFE2',
    foreground: ink ?? '#0E0D0B',
    accent: accent ?? '#5C6B3F',
    accentLight: accentBg ?? accent2 ?? '#E5DCC4',
    muted: inkMuted ?? '#6F6557',
    cardBg: card ?? paper ?? '#FBF7EE',
  };

  // Fonts — packs ship the prototype's `--t-display` / `--t-body`
  // CSS stacks; the renderer's font picker stores plain family
  // names. We keep the full stack as the secondary line so exotic
  // stacks survive even if the primary family fails to load.
  const display = primaryFontFamily(readVar(pack.themeRef, '--t-display'));
  const body = primaryFontFamily(readVar(pack.themeRef, '--t-body'));

  // Existing theme (we preserve unrelated fields like cardRadius,
  // headingTransform, etc., so the pack apply doesn't clobber
  // unrelated theme polish the host already dialed in).
  const existingTheme = ((manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {}) as Record<string, unknown>;
  const existingFonts = ((existingTheme.fonts as Record<string, string> | undefined) ?? {}) as Record<string, string>;

  const nextFonts: Record<string, string> = { ...existingFonts };
  if (display) nextFonts.heading = display;
  if (body) nextFonts.body = body;

  const nextTheme: Record<string, unknown> = {
    ...existingTheme,
    colors: nextColors,
    fonts: nextFonts,
  };

  // Build the next manifest. Each non-color axis is only written
  // when the pack defines it (so applying a pack never clears the
  // host's existing kit / texture / pattern unless the pack
  // intentionally swaps them).
  const next: Record<string, unknown> = {
    ...(manifest as unknown as Record<string, unknown>),
    theme: nextTheme,
  };

  if (pack.kit) {
    next.kitId = pack.kit;
  }
  if (pack.texture && pack.texture !== 'none') {
    next.texture = pack.texture;
  }
  if (pack.pattern && pack.pattern !== 'none') {
    next.pattern = pack.pattern;
  }

  return next as unknown as StoryManifest;
}
