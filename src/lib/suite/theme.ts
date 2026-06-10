// ─────────────────────────────────────────────────────────────
// Pearloom / lib/suite/theme.ts
//
// THE SUITE CONTRACT (docs/SUITE-STRATEGY.md §2).
//
// One derivation of "the couple's look" that every guest-facing
// artifact consumes: Studio cards, OG/share cards, themed emails,
// the save-the-date reveal page, RSVP confirmation moments, QR
// posters, share-kit images, and print PDFs. If an artifact
// renders theme values it didn't get from here, it will drift —
// route it through this file instead.
//
// Sources, in priority order:
//   1. manifest.themeVars  — the full --t-* var bag a Theme-Store
//      pack writes via applyPackToManifest (authoritative when set)
//   2. manifest.theme.colors / theme.fonts — wizard + editor picks
//   3. Brand defaults (cream/ink/olive/gold + Fraunces/Inter)
//
// Pure + server-safe: no React, no DOM, no fetches.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { deriveInitials } from '@/components/pearloom/site/Monogram';
import { isSoloSubject } from '@/lib/event-os/solo-occasions';

export interface SuitePalette {
  paper: string;
  section: string;
  card: string;
  ink: string;
  inkSoft: string;
  accent: string;
  accentSoft: string;
  gold: string;
  line: string;
}

export interface SuiteTheme {
  palette: SuitePalette;
  /** Email-safe palette — light paper guaranteed, ink readable.
   *  Dark packs flip onto their card color (clients butcher dark
   *  bgs in dark mode + forced-color situations). */
  emailPalette: SuitePalette;
  fonts: {
    /** CSS font-family stacks, e.g. "'Bodoni Moda', Georgia, serif". */
    display: string;
    body: string;
    /** Bare family names for font loaders (OG route, css2 links). */
    displayFamily: string;
    bodyFamily: string;
    /** Ready-made Google Fonts css2 href for both families. */
    googleHref: string;
  };
  /** Motif glyph id (MotifScatter MotifKind) or null. */
  motif: string | null;
  monogram: { initials: string; initA: string; initB: string; frame: string };
  kitId: string;
  edition: string | null;
  occasion: string;
  names: [string, string];
  eventDate: string | null;
  venue: string | null;
  photos: { cover: string | null; gallery: string[] };
  /** AI-stylized hero artwork, once the host has made one. */
  stylizedArt: { url: string; style: string } | null;
}

// ─── Internals ───────────────────────────────────────────────

const BRAND: SuitePalette = {
  paper: '#F5EFE2',
  section: '#EBE3D2',
  card: '#FBF7EE',
  ink: '#0E0D0B',
  inkSoft: '#3A332C',
  accent: '#5C6B3F',
  accentSoft: '#A4B57A',
  gold: '#B8935A',
  line: '#D8CFB8',
};

function hexLuminance(hex: string): number {
  const m = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return 0.5;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** First concrete hex in a value (skips var()/color-mix soup). */
function pickHex(value: string | undefined | null): string | null {
  if (!value) return null;
  const m = value.match(/#[0-9a-fA-F]{6}\b/);
  return m ? m[0] : /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : null;
}

/** "'Bodoni Moda', Georgia, serif" → "Bodoni Moda". */
export function familyFromStack(stack: string | undefined | null, fallback: string): string {
  if (!stack) return fallback;
  const m = stack.match(/^['"]?([^'",]+)/);
  return m ? m[1].trim() : fallback;
}

export function googleFontsHrefFor(displayFamily: string, bodyFamily: string): string {
  const enc = (f: string) => f.trim().replace(/ /g, '+');
  return (
    'https://fonts.googleapis.com/css2' +
    `?family=${enc(displayFamily)}:ital,wght@0,400;0,500;0,600;0,700;1,400` +
    `&family=${enc(bodyFamily)}:wght@400;500;600` +
    '&display=swap'
  );
}

// ─── The derivation ──────────────────────────────────────────

export function suiteThemeFromManifest(
  manifest: StoryManifest,
  namesIn?: [string, string],
): SuiteTheme {
  const loose = manifest as unknown as Record<string, unknown>;
  const vars = (manifest.themeVars ?? {}) as Record<string, string>;
  const themeColors =
    ((loose.theme as { colors?: Record<string, string> } | undefined)?.colors) ?? {};
  const themeFonts =
    ((loose.theme as { fonts?: Record<string, string> } | undefined)?.fonts) ?? {};

  const v = (key: string, legacy: string | undefined, fallback: string): string =>
    pickHex(vars[key]) ?? pickHex(legacy) ?? fallback;

  const palette: SuitePalette = {
    paper: v('--t-paper', themeColors.background, BRAND.paper),
    section: v('--t-section', undefined, BRAND.section),
    card: v('--t-card', themeColors.card, BRAND.card),
    ink: v('--t-ink', themeColors.foreground, BRAND.ink),
    inkSoft: v('--t-ink-soft', undefined, BRAND.inkSoft),
    accent: v('--t-accent', themeColors.accent, BRAND.accent),
    accentSoft: v('--t-accent-2', themeColors.accentLight, BRAND.accentSoft),
    gold: v('--t-gold', undefined, BRAND.gold),
    line: v('--t-line', undefined, BRAND.line),
  };

  /* Email-safe: dark paper flips to the card (or brand cream) and
     ink flips dark. Accent/gold survive — they read on light. */
  const emailPalette: SuitePalette =
    hexLuminance(palette.paper) < 0.45
      ? {
          ...palette,
          paper: hexLuminance(palette.card) >= 0.45 ? palette.card : BRAND.paper,
          section: BRAND.section,
          card: BRAND.card,
          ink: hexLuminance(palette.ink) >= 0.45 ? BRAND.ink : palette.ink,
          inkSoft: BRAND.inkSoft,
          line: BRAND.line,
        }
      : palette;

  const displayStack = vars['--t-display'] ?? themeFonts.heading ?? "'Fraunces', Georgia, serif";
  const bodyStack = vars['--t-body'] ?? themeFonts.body ?? "'Inter', sans-serif";
  const displayFamily = familyFromStack(displayStack, 'Fraunces');
  const bodyFamily = familyFromStack(bodyStack, 'Inter');

  const names = (namesIn ??
    ((loose.names as [string, string] | undefined) ?? ['', ''])) as [string, string];
  /* Solo honoree (memorial, birthday, shower, …) — a derived full
     name ('Eleanor Rose Thompson') crests as ONE initial, never a
     couple-style pair. Host-typed monogram initials win verbatim.
     The stored `initials` string is pre-formatted from the derived
     pieces so downstream <Monogram> consumers (save-the-date reveal,
     address form, first pressing) can't re-split a full name. */
  const solo = isSoloSubject(manifest);
  const explicitMono =
    (manifest.monogram?.initials && manifest.monogram.initials.trim()) || '';
  const monoSource =
    explicitMono || names.filter(Boolean).join(' & ') || (solo ? 'A' : 'A & B');
  const { initA, initB } = deriveInitials(monoSource, { solo: solo && !explicitMono });
  const monoInitials = explicitMono || (initB ? `${initA} & ${initB}` : initA);

  const logistics =
    (loose.logistics as { date?: string; venue?: string } | undefined) ?? {};

  const stylized = loose.stylizedArt as { url?: string; style?: string } | undefined;

  return {
    palette,
    emailPalette,
    fonts: {
      display: displayStack,
      body: bodyStack,
      displayFamily,
      bodyFamily,
      googleHref: googleFontsHrefFor(displayFamily, bodyFamily),
    },
    motif: ((loose.motifKind as string | undefined) ?? null),
    monogram: {
      initials: monoInitials,
      initA,
      initB,
      frame: manifest.monogram?.frame ?? 'ring',
    },
    kitId: ((loose.kitId as string | undefined) ?? 'classic'),
    edition: ((loose.edition as string | undefined) ?? null),
    occasion: ((loose.occasion as string | undefined) ?? 'wedding'),
    names,
    eventDate: logistics.date ?? null,
    venue: logistics.venue ?? null,
    photos: {
      cover: ((loose.coverPhoto as string | undefined) ?? null),
      gallery: ((loose.galleryImages as string[] | undefined) ?? []).filter(
        (u) => typeof u === 'string' && u.length > 0,
      ),
    },
    stylizedArt:
      stylized?.url ? { url: stylized.url, style: stylized.style ?? 'custom' } : null,
  };
}
