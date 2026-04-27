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
import { resolveTemplateDesign, hasTemplateDesign } from '@/components/pearloom/marketplace/template-themes';

// Marketplace tile ids → SITE_TEMPLATES ids. Marketplace tiles and
// SITE_TEMPLATES grew as separate registries with different naming
// conventions; this table lets the user click a tile on /templates
// and actually receive that template's motifs/poetry/theme at
// generation time. Keep in sync with
// src/components/pearloom/marketplace/template-matcher.ts.
// Marketplace tile id → SITE_TEMPLATE id. Keep in sync with
// src/components/pearloom/marketplace/template-matcher.ts. Every
// occasion-specific tile must point to the SITE_TEMPLATE that ships
// with the right blocks (itinerary, advice wall, etc) so the
// generated site reflects the actual template promise.
const MARKETPLACE_ALIASES: Record<string, string> = {
  'wildflower-barn': 'ethereal-garden',
  'pearl-district': 'midnight-luxe',
  'cannon-beach': 'coastal-breeze',
  'olive-gold-wedding': 'tuscan-villa',
  'finnish-cottage': 'enchanted-forest',
  'the-yes': 'blush-bloom',
  'springtime-engagement': 'blush-bloom',
  'the-rehearsal': 'the-night-before',
  'night-before': 'the-night-before',
  'welcome-weekend': 'warm-threshold',
  'morning-after': 'one-more-round',
  'still-us': 'saying-it-again',
  'big-sur-bach': 'last-weekend-in',
  'nashville-bach': 'last-weekend-in',
  'garden-shower': 'gentle-gathering',
  'ceremony-70s': 'y2k-reloaded',
};

export function applyTemplateToManifest(
  manifest: StoryManifest,
  templateId: string | null | undefined,
): StoryManifest {
  if (!templateId) return manifest;

  // ── Priority 1: full SITE_TEMPLATE match (rich motifs + poetry) ──
  const resolvedId = MARKETPLACE_ALIASES[templateId] ?? templateId;
  const tpl = SITE_TEMPLATES.find((t) => t.id === resolvedId);

  // ── Priority 2: bespoke marketplace design spec ──
  // When the marketplace id has a curated palette + font pair in
  // template-themes.ts but no SITE_TEMPLATE match, we still seed
  // the theme so the editor renders in the same style the user
  // saw in the preview modal.
  const hasDesign = hasTemplateDesign(templateId);

  if (!tpl && !hasDesign) return manifest;

  if (tpl) {
    return {
      ...manifest,
      templateId: tpl.id,
      motifs: tpl.motifs,
      // Per-template signature decor (illustrated SVG in the hero).
      signatureDecor: tpl.signatureDecor,
      blockOrder: tpl.blockOrder,
      hiddenBlocks: tpl.hiddenBlocks,
      vibeString: manifest.vibeString || tpl.vibeString,
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
      poetry: manifest.poetry ?? {
        heroTagline: tpl.poetry.heroTagline,
        closingLine: tpl.poetry.closingLine,
        rsvpIntro: tpl.poetry.rsvpIntro,
        welcomeStatement: tpl.poetry.welcomeStatement,
      },
    };
  }

  // Fallback — marketplace-only template: seed just the theme.
  const design = resolveTemplateDesign(templateId);
  return {
    ...manifest,
    templateId,
    theme: manifest.theme ?? {
      name: templateId,
      colors: {
        background: design.theme.background,
        foreground: design.theme.foreground,
        accent: design.theme.accent,
        accentLight: design.theme.accentLight,
        muted: design.theme.muted,
        cardBg: design.theme.cardBg ?? design.theme.background,
      },
      fonts: { heading: design.fonts.heading, body: design.fonts.body },
      borderRadius: '0.75rem',
    },
  };
}

/** Lookup only — no merge. */
export function getTemplate(templateId: string | null | undefined): SiteTemplate | null {
  if (!templateId) return null;
  return SITE_TEMPLATES.find((t) => t.id === templateId) ?? null;
}
