// ─────────────────────────────────────────────────────────────
// Site Editions — read-time resolver.
//
// resolveEdition() is the ONLY function the renderer should call.
// It reads manifest.edition (if explicit), otherwise picks a
// default via recommendEdition() based on the occasion + voice.
// It never writes back to the manifest — Editions are read-time
// defaults, not persisted state.
//
// This contract is critical for backward compat: every existing
// published site renders identically after Editions ship, because
// the explicit per-block overrides (heroVariant, atmosphere,
// blockOrder) win over Edition defaults.
// ─────────────────────────────────────────────────────────────

import type { SiteOccasion } from '@/lib/site-urls';
import type { EventVoice } from '@/lib/event-os/event-types';
import { EDITIONS_BY_ID, DEFAULT_EDITION_ID, EDITIONS } from './editions';
import type { EditionDefinition, EditionId } from './types';

/** Picks a recommended Edition for a given (occasion, voice) pair.
 *  Used as the fallback when the manifest doesn't carry an explicit
 *  edition, AND as the wizard's pre-selected option.
 *
 *  Logic:
 *  1. If the occasion is recommendedFor any Edition, pick that one
 *     (first match wins — Editions are ordered by primary fit).
 *  2. Otherwise use voice as a secondary signal:
 *     - solemn       → quiet
 *     - ceremonial   → linen-folder
 *     - playful      → postcard-box
 *     - intimate     → quiet
 *     - celebratory  → DEFAULT_EDITION_ID (almanac)
 *  3. Fall back to DEFAULT_EDITION_ID if neither matches. */
export function recommendEdition(
  occasion: SiteOccasion | undefined,
  voice: EventVoice | undefined,
): EditionId {
  if (occasion) {
    const match = EDITIONS.find((ed) => ed.recommendedFor.includes(occasion));
    if (match) return match.id;
  }
  if (voice === 'solemn' || voice === 'intimate') return 'quiet';
  if (voice === 'ceremonial') return 'linen-folder';
  if (voice === 'playful') return 'postcard-box';
  return DEFAULT_EDITION_ID;
}

/** The shape resolveEdition() needs out of a manifest. Loose by
 *  design so SiteV8Renderer can call this without coupling to the
 *  full StoryManifest type. */
export interface EditionContext {
  /** Explicit host pick — manifest.edition. */
  edition?: EditionId;
  /** Occasion from the manifest — drives the recommended default. */
  occasion?: SiteOccasion;
  /** Voice from EVENT_TYPES[occasion].voice — drives the recommended
   *  default when occasion alone doesn't pin an Edition. */
  voice?: EventVoice;
}

/** Resolves the active EditionDefinition for a manifest. Returns
 *  the recommended default when the manifest doesn't carry one.
 *  NEVER writes back into the manifest. */
export function resolveEdition(ctx: EditionContext): EditionDefinition {
  const explicit = ctx.edition;
  if (explicit && EDITIONS_BY_ID[explicit]) return EDITIONS_BY_ID[explicit];
  const recommended = recommendEdition(ctx.occasion, ctx.voice);
  return EDITIONS_BY_ID[recommended];
}

/** Convenience — same as resolveEdition() but takes the
 *  recommended-edition id rather than the full context. */
export function editionById(id: EditionId | undefined | null): EditionDefinition {
  if (!id) return EDITIONS_BY_ID[DEFAULT_EDITION_ID];
  return EDITIONS_BY_ID[id] ?? EDITIONS_BY_ID[DEFAULT_EDITION_ID];
}
