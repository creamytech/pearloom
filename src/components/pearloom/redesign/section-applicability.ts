/* ─────────────────────────────────────────────────────────────
   Core-section occasion applicability — leaf module.

   The nine CORE sections (hero / story / details / schedule /
   travel / registry / gallery / rsvp / faq) historically rendered
   for every occasion. These helpers gate them against the
   EVENT_TYPES registry the same way isBlockApplicable gates the
   ten Event-OS blocks.

   Lives in its own leaf module (not EditorRedesign.tsx) because
   BOTH EditorRedesign and ThemedSite need it, and ThemedSite is
   imported BY EditorRedesign — importing back out of
   EditorRedesign would cycle. EditorRedesign re-exports these for
   compat with its existing helper imports.
   ───────────────────────────────────────────────────────────── */

import type { StoryManifest } from '@/types';
import { getEventType } from '@/lib/event-os/event-types';

/* Core section id → the EVENT_TYPES BlockType id(s) that gate it.
   A section is applicable when ANY of its mapped blocks appear in
   the occasion's defaultBlocks ∪ optionalBlocks (hiddenBlocks are
   excluded by construction — a block listed only there never
   appears in that union).

   null = always applicable:
     hero    — every site has a hero, full stop.
     details — dress code / parking / kids has no BlockType
               equivalent in the registry; every occasion has
               logistics. */
const CORE_SECTION_BLOCK_GATES: Record<string, readonly string[] | null> = {
  hero: null,
  details: null,
  story: ['story'],
  schedule: ['event'],
  travel: ['travel'],
  registry: ['registry'],
  /* The canvas Gallery serves both the curated grid ('gallery')
     and the universal photo strip ('photos') — applicable when
     EITHER appears. */
  gallery: ['gallery', 'photos'],
  rsvp: ['rsvp'],
  faq: ['faq'],
};

/** Is this CORE section a fit for the occasion, per the
 *  EVENT_TYPES registry? Unknown occasion (or a non-core id) →
 *  true — never strand a host whose manifest predates the
 *  registry, and never gate the Event-OS blocks here (they have
 *  their own gate, isBlockApplicable). */
export function isCoreSectionApplicable(sectionId: string, occasion?: string): boolean {
  const gates = CORE_SECTION_BLOCK_GATES[sectionId];
  if (gates === undefined || gates === null) return true;
  const event = getEventType(occasion);
  if (!event) return true;
  const allowed = [...event.defaultBlocks, ...event.optionalBlocks] as readonly string[];
  return gates.some((g) => allowed.includes(g));
}

/** Does this core section carry REAL host content? Reads the same
 *  stores SectionRail's liveDesc reads. Content always wins over
 *  applicability — we never hide a host's work, on the rail or on
 *  the rendered site. */
export function sectionHasContent(sectionId: string, manifest: StoryManifest): boolean {
  const loose = manifest as unknown as {
    galleryImages?: string[];
    registryStores?: Array<string | { name?: string; url?: string }>;
    registryFunds?: { venmo?: string; paypal?: string; cashapp?: string; zelle?: string };
  };
  switch (sectionId) {
    case 'story':
      return (Array.isArray(manifest.chapters) ? manifest.chapters : []).length > 0;
    case 'schedule':
      return (manifest.events ?? []).length > 0;
    case 'faq':
      return (manifest.faqs ?? []).some((f) => (f.answer ?? '').trim().length > 0);
    case 'gallery':
      return (loose.galleryImages ?? []).filter(Boolean).length > 0;
    case 'registry': {
      if ((loose.registryStores ?? []).length > 0) return true;
      /* R2-lite fund handles count as registry content too — a
         host may set ONLY "Give directly" P2P handles. */
      const f = loose.registryFunds;
      return Boolean(f && (f.venmo?.trim() || f.paypal?.trim() || f.cashapp?.trim() || f.zelle?.trim()));
    }
    case 'travel':
      return (manifest.travelInfo?.hotels ?? []).length > 0;
    default:
      return false;
  }
}
