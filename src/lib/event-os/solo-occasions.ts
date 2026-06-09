// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/solo-occasions.ts
//
// THE canonical solo-honoree registry. One person is being
// celebrated / remembered, so every surface that renders names
// must show a single name — no '&', no second-name field, no
// placeholder partner.
//
// Deliberately a LEAF module (type-only imports) so the edge-
// runtime OG route (`/api/og`) and the metadata emitters can
// import it without pulling the full EVENT_TYPES registry into
// an edge bundle. `event-types.ts` re-exports these for
// registry consumers — both paths read the same set.
//
// Consumers (keep in sync when adding one):
//   • /api/og/route.tsx          — centers one name, skips name2
//   • /sites/[domain]/page.tsx   — metadata emitter (OG params)
//   • /preview/[token]/page.tsx  — coupleId → names parsing
//   • lib/event-os/name-mode.ts  — wizard asks for ONE name
//   • pearloom/redesign/ThemedSite.tsx — subject.kind fallback
//   • pearloom/site/ThemedSiteRenderer.tsx — hero name lockup
//
// Decisions (2026-06-09 solo-honoree fix):
//   solo — birthday family, quinceañera, bar/bat mitzvah,
//          graduation, retirement, baptism, first communion,
//          confirmation, memorial, funeral;
//          baby-shower (honors the parent-to-be),
//          sip-and-see (the baby),
//          bridal-shower / bridal-luncheon (the bride),
//          bachelor / bachelorette (the guest of honor).
//   pair — gender-reveal (the parents), housewarming (one name
//          or two), and the whole wedding-couple arc.
//   group — reunion, story (host name optional).
// ─────────────────────────────────────────────────────────────

import type { SiteOccasion } from '@/lib/site-urls';

/** Occasions that honor exactly one person. */
export const SOLO_OCCASIONS: ReadonlySet<string> = new Set<SiteOccasion>([
  // Milestone
  'birthday',
  'milestone-birthday',
  'first-birthday',
  'sweet-sixteen',
  'retirement',
  'graduation',
  // Cultural
  'quinceanera',
  'bar-mitzvah',
  'bat-mitzvah',
  'baptism',
  'first-communion',
  'confirmation',
  // Commemoration
  'memorial',
  'funeral',
  // Family — one honoree even when parents host
  'baby-shower',
  'sip-and-see',
  // Wedding arc — hosted FOR one person
  'bridal-shower',
  'bridal-luncheon',
  'bachelor-party',
  'bachelorette-party',
]);

/** True when the occasion honors a single person. */
export function isSoloOccasion(
  occasion: SiteOccasion | string | null | undefined,
): boolean {
  return !!occasion && SOLO_OCCASIONS.has(occasion);
}
