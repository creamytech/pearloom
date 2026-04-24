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

export function applyTemplateToManifest(
  manifest: StoryManifest,
  templateId: string | null | undefined,
): StoryManifest {
  if (!templateId) return manifest;
  const tpl = SITE_TEMPLATES.find((t) => t.id === templateId);
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
