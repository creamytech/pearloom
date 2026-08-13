// ─────────────────────────────────────────────────────────────
// Pearloom / lib/site-visibility.ts
//
// THE VISIBILITY SPINE (Sprint V.1 — REVAMP-EXECUTION-PLAN §7).
//
// One state machine for who can see a site. Before this module,
// four flags each told part of the story and no reader consulted
// them all: `published`/`publishedAt` (the W.3 draft gate),
// `privacyGate.password` (the client SiteGate), the legacy
// `comingSoon.{enabled,passwordProtected,password}` teaser wall
// (which gated nothing — NEW-USER-REVAMP H7), and the Event-OS
// registry's `privateByDefault` (declared for bachelor/ette per
// CLAUDE-PRODUCT §8 Q2, consumed by NOTHING — L32). The sitemap,
// meanwhile, listed every site with a manifest — drafts included,
// leaking slug existence the 404 gate was built to hide.
//
// The four states:
//
//   draft      — only the owner sees it; everyone else gets a 404
//                indistinguishable from a never-pressed slug.
//   link-only  — live for anyone WITH the link; never indexed,
//                never listed (sitemap, directories). The default
//                for private-by-default occasions.
//   public     — live, indexable, listed.
//   password   — live behind the shared-password gate; never
//                indexed, and metadata says nothing personal.
//
// Every reader resolves through `readSiteVisibility` — the site
// route (page + metadata), the sitemap, and the gate. Writers
// (PublishModal, PrivacyPanel, the wizard press) stamp
// `manifest.visibility` explicitly; manifests from before the
// spine resolve through the legacy read-migration below and get
// the same answer they always behaved as — except where the old
// behavior was the bug (drafts in the sitemap, bachelorettes
// indexed).
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { isManifestPublished } from '@/lib/next-step';
import { EVENT_TYPES } from '@/lib/event-os/event-types';

export type SiteVisibility = 'draft' | 'link-only' | 'public' | 'password';

export const SITE_VISIBILITIES: readonly SiteVisibility[] = [
  'draft',
  'link-only',
  'public',
  'password',
];

interface LooseVisibilityFields {
  visibility?: string;
  privacyGate?: { password?: string };
  comingSoon?: { enabled?: boolean; passwordProtected?: boolean; password?: string };
  occasion?: string;
}

/** The effective gate password, honoring the documented legacy
 *  precedence: `comingSoon.passwordProtected` + its password wins
 *  over `privacyGate.password` when both are set (the contract the
 *  old PasswordGate shipped with); otherwise privacyGate's. Empty
 *  string when the site has no password. */
export function gatePasswordFor(manifest: StoryManifest): string {
  const loose = manifest as unknown as LooseVisibilityFields;
  const legacy = loose.comingSoon;
  if (legacy?.passwordProtected && (legacy.password ?? '').trim()) {
    return (legacy.password ?? '').trim();
  }
  return (loose.privacyGate?.password ?? '').trim();
}

/** True when the occasion's registry entry declares it private by
 *  default (bachelor/ette — CLAUDE-PRODUCT §8 Q2). */
export function isPrivateByDefaultOccasion(occasion: string | null | undefined): boolean {
  if (!occasion) return false;
  return EVENT_TYPES.some((e) => e.id === occasion && e.privateByDefault);
}

/**
 * Resolve a manifest to its one visibility state.
 *
 * Order:
 *   1. Not pressed → `draft`, whatever any field says. "Nothing is
 *      public until you publish" (W.3) outranks every other flag.
 *   2. An explicit `manifest.visibility` wins. (`password` with no
 *      password set degrades to `public` — an empty gate would
 *      either lock everyone out or wave everyone through while
 *      claiming protection; neither is honest. Explicit `draft` on
 *      a pressed manifest is the host pulling it back — honored.)
 *   3. Legacy read-migration: a gate password → `password`; a
 *      private-by-default occasion → `link-only`; else `public`.
 */
export function readSiteVisibility(manifest: StoryManifest): SiteVisibility {
  if (!isManifestPublished(manifest)) return 'draft';

  const loose = manifest as unknown as LooseVisibilityFields;
  const explicit = loose.visibility;
  if (explicit === 'draft' || explicit === 'link-only' || explicit === 'public') {
    return explicit;
  }
  if (explicit === 'password') {
    return gatePasswordFor(manifest) ? 'password' : 'public';
  }
  // The field's PREVIOUS life: a wizard soft-signal
  // ('public'|'unlisted'|'private') written by the deleted
  // PearSpotlight pipeline and enforced by nothing. Honor the stated
  // intent with the closest enforceable state: both mean "don't
  // spread this" → link-only ('private' can't mean password — no
  // password exists to gate with, and locking guests out would be
  // worse than honoring the link they were sent).
  if (explicit === 'unlisted' || explicit === 'private') {
    return gatePasswordFor(manifest) ? 'password' : 'link-only';
  }

  // Pre-spine manifests: derive from the flags they actually carry.
  if (gatePasswordFor(manifest)) return 'password';
  if (isPrivateByDefaultOccasion(loose.occasion)) return 'link-only';
  return 'public';
}

/** Search engines may index only the one deliberately public state. */
export function visibilityAllowsIndexing(v: SiteVisibility): boolean {
  return v === 'public';
}

/** May an anonymous visitor (no owner session, no password) see the
 *  site's content at all? Draft hides entirely; password shows only
 *  the gate — which the shell handles — so both content-render
 *  states are the two link-reachable ones. */
export function visibilityRendersForAnon(v: SiteVisibility): boolean {
  return v === 'public' || v === 'link-only';
}
