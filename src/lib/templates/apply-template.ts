// ─────────────────────────────────────────────────────────────
// Pearloom / lib/templates/apply-template.ts
//
// Merge a rich SITE_TEMPLATE (wedding-templates.ts) into an
// existing manifest. Used by the wizard's site-generation pipeline
// so the template's motifs, block order, hidden blocks, theme
// palette, and seeded poetry/vibeString get applied to the user's
// new site instead of being dead data on the marketplace tile.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { SITE_TEMPLATES, type SiteTemplate } from './wedding-templates';

// Marketplace tile ids → SITE_TEMPLATES ids. Marketplace tiles and
// SITE_TEMPLATES grew as separate registries with different naming
// conventions; this table lets the user click a tile on /templates
// and actually receive that template's motifs/poetry/theme at
// generation time. Keep in sync with
// src/components/pearloom/marketplace/template-matcher.ts.
const MARKETPLACE_ALIASES: Record<string, string> = {
  'wildflower-barn': 'ethereal-garden',
  'pearl-district': 'midnight-luxe',
  'cannon-beach': 'coastal-breeze',
  'olive-gold-wedding': 'tuscan-villa',
  'finnish-cottage': 'enchanted-forest',
  'the-yes': 'blush-bloom',
  'night-before': 'midnight-luxe',
  'welcome-weekend': 'coastal-breeze',
  'morning-after': 'golden-hour',
  'still-us': 'rustic-romance',
  'big-sur-bach': 'desert-boho',
  'ceremony-70s': 'y2k-reloaded',
  'springtime-engagement': 'blush-bloom',
  'the-rehearsal': 'minimalist-white',
};

export function applyTemplateToManifest(
  manifest: StoryManifest,
  templateId: string | null | undefined,
): StoryManifest {
  if (!templateId) return manifest;
  // Resolve marketplace tile id → rich SITE_TEMPLATE id when needed.
  const resolvedId = MARKETPLACE_ALIASES[templateId] ?? templateId;
  const tpl = SITE_TEMPLATES.find((t) => t.id === resolvedId);
  if (!tpl) return manifest;

  return {
    ...manifest,
    templateId: tpl.id,
    motifs: tpl.motifs,
    blockOrder: tpl.blockOrder,
    hiddenBlocks: tpl.hiddenBlocks,
    // Keep user-supplied vibeString, but fall back to the template's.
    vibeString: manifest.vibeString || tpl.vibeString,
    // Seed the palette if the manifest doesn't already have a theme.
    theme: manifest.theme ?? {
      name: tpl.id,
      colors: {
        background: tpl.theme.colors.background,
        foreground: tpl.theme.colors.foreground,
        accent: tpl.theme.colors.accent,
        accentLight: tpl.theme.colors.accentLight,
        muted: tpl.theme.colors.muted,
        cardBg: tpl.theme.colors.cardBg,
      },
      fonts: { heading: tpl.theme.fonts.heading, body: tpl.theme.fonts.body },
      borderRadius: '0.5rem',
    },
    // Seed poetry only when the manifest doesn't already have one —
    // the AI pass writes better poetry from the user's content, so
    // never overwrite what's there.
    poetry: manifest.poetry ?? {
      heroTagline: tpl.poetry.heroTagline,
      closingLine: tpl.poetry.closingLine,
      rsvpIntro: tpl.poetry.rsvpIntro,
      welcomeStatement: tpl.poetry.welcomeStatement,
    },
  };
}

/** Lookup only — no merge. */
export function getTemplate(templateId: string | null | undefined): SiteTemplate | null {
  if (!templateId) return null;
  return SITE_TEMPLATES.find((t) => t.id === templateId) ?? null;
}
