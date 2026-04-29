// ─────────────────────────────────────────────────────────────
// Per-pass prompt registry.
//
// Each pass id (set by per-field pearAction or by the
// PearSuggestionsStrip) maps to a prompt template the advisor
// fires automatically when the host invokes it. Without this map
// the advisor opens scoped to the right block but with an empty
// prompt — defeating the point of the per-field glyph.
//
// Templates follow the same conventions as the slash-command
// templates in DesignAdvisor.tsx — verbatim prose Pear can run
// without further interpretation. Block context is added by the
// chat handler from the `intent.block` it receives, so templates
// don't need to repeat the block name.
//
// Adding a pass: register it here AND in panels/pear-suggestions.ts
// (or as a Field's pearAction). Otherwise the click opens an empty
// advisor.
// ─────────────────────────────────────────────────────────────

export const PEAR_PASS_PROMPTS: Record<string, string> = {
  // Hero
  'rewrite-tagline':
    'Rewrite my hero tagline three different ways. Each one warm, specific, in our voice — no "celebrate with us" cliché, no exclamation marks. Return them as `options` on a single patch at `poetry.heroTagline` with `optionLabels` like ["Warm", "Specific", "Quiet"] — I\'ll tap the one I like.',
  'suggest-cover':
    'Look at my photos and suggest the best one for the hero cover. Tell me why it works — composition, mood, what it says about the day.',

  // Story
  'tighten-prose':
    'Read my chapters and tighten the prose. Cut filler. Sharpen specifics. Keep my voice. Show me before/after for any chapter you change.',
  'suggest-chapter':
    'Suggest the next chapter I should add to my story — the moment I might be missing between the existing ones, or the one that opens the arc.',

  // Details
  'draft-faq':
    'Draft 5 FAQ items guests would actually ask about my event. Reference my venue, dress code, and arrival logistics.',
  'suggest-dress-code':
    'Suggest dress-code copy three different ways — formal but warm, each with one specific line about footwear or weather that fits my venue. Return them as `options` on a patch at `logistics.notes` with `optionLabels` like ["Formal", "Warm", "Brief"] — I\'ll tap one.',

  // Schedule
  'fill-schedule-gaps':
    'Look at my current schedule and tell me what\'s missing. Suggest realistic times for any gap. If the venue suggests a typical flow, lean on it.',
  'suggest-times':
    'Suggest realistic times for each event on my schedule based on the start time, dress code, and venue. Flag anything tight.',

  // Travel
  'suggest-hotels':
    'Suggest 3 hotels near my venue that fit different price points. Format each as a card — name, distance, why guests would like it.',
  'draft-travel-tips':
    'Draft a short travel-tips block for guests — getting to the venue, parking, and any local quirk a first-time visitor would want to know.',

  // Registry
  'suggest-registry-stores':
    'Look at my style + occasion and suggest 3-4 registry stores that match. Tell me what each is good for so I can pick.',
  'draft-registry-blurb':
    'Draft a short, warm blurb for the registry section three different ways — your presence is the gift, but if you want to add to our home, here\'s where to look. Avoid the cliché. Return them as `options` so I can tap one.',

  // Gallery
  'pick-best-photos':
    'Look at my photos and pick the 6 strongest for the gallery. Tell me why each one earns its slot. If two are too similar, flag the one to drop.',
  'suggest-captions':
    'Suggest a one-line caption for each photo in my gallery — quiet, specific, no clichés.',

  // RSVP
  'rewrite-rsvp-prompt':
    'Rewrite the RSVP prompt copy three different ways — short, warm, with the deadline. Plain language, no "kindly respond" stiffness. Return them as `options` so I can tap one.',
  'add-rsvp-questions':
    'Suggest 2-3 useful follow-up questions to add to the RSVP form for my event — meal preference, dietary, song request, or whatever fits.',

  // FAQ
  'draft-faq-answers':
    'Draft warm, specific answers to each unanswered FAQ. Reference my venue, date, and dress code where relevant.',
  'suggest-faq-question':
    'Suggest one more question guests often ask but I haven\'t added yet. Draft both the question and a draft answer.',

  // Universal
  translate:
    'I\'d like to add a translation. Ask me which language and which sections to translate, then draft the translated copy.',
};

export function pearPromptFor(pass: string): string | null {
  return PEAR_PASS_PROMPTS[pass] ?? null;
}
