// ─────────────────────────────────────────────────────────────
// Per-block "Pear can help" registry.
//
// The Inspector mounts <PearSuggestionsStrip> at the bottom of
// every section panel and looks up the active block's suggestions
// here. Up to 3 entries per block — anything more crowds the strip.
//
// Curate carefully: each entry should map to a Pear pass that
// actually does something. A suggestion that opens an empty
// advisor is worse than no suggestion at all.
//
// Pass ids are verb-noun (`rewrite-tagline`, `suggest-cover`,
// `translate`). The advisor reads `event.detail.pass` and pre-
// loads the matching prompt template — when a new pass exists,
// add it to the advisor's pass map AND register it here.
// ─────────────────────────────────────────────────────────────

import type { PearSuggestion } from '../atoms';

export const PEAR_SUGGESTIONS: Record<string, PearSuggestion[]> = {
  hero: [
    { id: 'rewrite-tagline',  label: 'Rewrite tagline in 3 styles',     pass: 'rewrite-tagline' },
    { id: 'suggest-cover',    label: 'Suggest a cover photo from gallery', pass: 'suggest-cover' },
    { id: 'translate',        label: 'Translate to another language',   pass: 'translate' },
  ],
  story: [
    { id: 'tighten-prose',    label: 'Tighten the prose',                pass: 'tighten-prose' },
    { id: 'add-chapter',      label: 'Suggest the next chapter',         pass: 'suggest-chapter' },
    { id: 'translate',        label: 'Translate to another language',    pass: 'translate' },
  ],
  details: [
    { id: 'rewrite-faq',      label: 'Draft a friendly FAQ block',       pass: 'draft-faq' },
    { id: 'suggest-dress',    label: 'Suggest dress-code copy',          pass: 'suggest-dress-code' },
    { id: 'translate',        label: 'Translate to another language',    pass: 'translate' },
  ],
  schedule: [
    { id: 'fill-gaps',        label: 'Fill schedule gaps from venue',    pass: 'fill-schedule-gaps' },
    { id: 'suggest-times',    label: 'Suggest realistic times',          pass: 'suggest-times' },
    { id: 'translate',        label: 'Translate to another language',    pass: 'translate' },
  ],
  travel: [
    { id: 'suggest-hotels',   label: 'Suggest 3 nearby hotels',          pass: 'suggest-hotels' },
    { id: 'draft-tips',       label: 'Draft travel tips for guests',     pass: 'draft-travel-tips' },
    { id: 'translate',        label: 'Translate to another language',    pass: 'translate' },
  ],
  registry: [
    { id: 'suggest-stores',   label: 'Suggest stores by your style',     pass: 'suggest-registry-stores' },
    { id: 'draft-blurb',      label: 'Draft the registry blurb',         pass: 'draft-registry-blurb' },
  ],
  gallery: [
    { id: 'pick-best',        label: 'Pick the best from your photos',   pass: 'pick-best-photos' },
    { id: 'suggest-captions', label: 'Suggest captions',                 pass: 'suggest-captions' },
  ],
  rsvp: [
    { id: 'rewrite-prompt',   label: 'Rewrite the RSVP prompt',          pass: 'rewrite-rsvp-prompt' },
    { id: 'add-questions',    label: 'Add useful follow-up questions',   pass: 'add-rsvp-questions' },
    { id: 'translate',        label: 'Translate to another language',    pass: 'translate' },
  ],
  faq: [
    { id: 'draft-q',          label: 'Draft answers to common questions', pass: 'draft-faq-answers' },
    { id: 'add-q',            label: 'Add a question guests often ask',   pass: 'suggest-faq-question' },
    { id: 'translate',        label: 'Translate to another language',     pass: 'translate' },
  ],
};

/** Returns the suggestion list for a block, or [] if none registered. */
export function pearSuggestionsFor(block: string): PearSuggestion[] {
  return PEAR_SUGGESTIONS[block] ?? [];
}
