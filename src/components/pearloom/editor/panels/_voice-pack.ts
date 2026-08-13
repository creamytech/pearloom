 
/* Voice packs — per-occasion copy overrides for panel labels,
   placeholders, and CTAs.
   The editor is otherwise 95% wedding-shaped. This module is a
   string-table that re-skins panels for the 5 event voices
   (celebratory / intimate / ceremonial / playful / solemn) +
   solo-honoree mode. Cheapest universal lift — no schema change,
   no canvas change, just labels.

   Usage:
     import { useVoicePack } from './_voice-pack';
     const v = useVoicePack(manifest);
     <FGroup label={v.hero.subjectGroupLabel}>...</FGroup>
*/

import type { StoryManifest } from '@/types';
import { EVENT_TYPES, type EventVoice } from '@/lib/event-os/event-types';
import type { SiteOccasion } from '@/lib/site-urls';

/* ─── Voice → strings ───────────────────────────────────────── */

export interface VoicePack {
  hero: {
    /** Group label for the two-name (or single-name) section. */
    subjectGroupLabel: string;
    subjectHint?: string;
    nameAPlaceholder: string;
    nameBPlaceholder: string;
    leadPlaceholder: string;
    taglinePlaceholder: string;
    coverGroupHint: string;
    ctaPrimaryDefaultLabel: string;
    ctaSecondaryDefaultLabel: string;
  };
  rsvp: {
    sectionLabel: string;
    eyebrowPlaceholder: string;
    replyByLabel: string;
    buttonLabel: string;
    questionsLabel: string;
  };
  details: {
    sectionLabel: string;
    addCardLabel: string;
  };
  registry: {
    /** What we call "Registry" in this voice — Gifts, Donations,
     *  Wishlist, Tip jar, etc. */
    sectionLabel: string;
    introPlaceholder: string;
    listLabel: string;
    addLabel: string;
  };
  story: {
    sectionLabel: string;
    bodyPlaceholder: string;
    chapterLabel: string;
  };
  schedule: {
    sectionLabel: string;
    rowAddLabel: string;
  };
  gallery: {
    sectionLabel: string;
  };
  faq: {
    sectionLabel: string;
    addLabel: string;
  };
}

const WEDDING_PACK: VoicePack = {
  hero: {
    subjectGroupLabel: 'Names',
    subjectHint: 'Both names appear above the date on the canvas.',
    nameAPlaceholder: 'First name',
    nameBPlaceholder: 'Second name',
    leadPlaceholder: 'A small forever',
    taglinePlaceholder: 'A short line above the fold',
    coverGroupHint: 'Drag an image here, click to pick from your device, or reuse one already on the site.',
    ctaPrimaryDefaultLabel: 'RSVP',
    ctaSecondaryDefaultLabel: 'Learn more',
  },
  rsvp: {
    sectionLabel: 'RSVP',
    eyebrowPlaceholder: 'RSVP by April 28',
    replyByLabel: 'Reply by',
    buttonLabel: 'RSVP',
    questionsLabel: 'Questions to ask',
  },
  details: {
    sectionLabel: 'Details',
    addCardLabel: 'Add a detail card',
  },
  registry: {
    sectionLabel: 'Registry',
    introPlaceholder: 'Your presence is the gift, but if you insist…',
    listLabel: 'Linked registries',
    addLabel: 'Link a registry',
  },
  story: {
    sectionLabel: 'Our story',
    bodyPlaceholder: 'Start with how you met. A few sentences is plenty, Pear will help.',
    chapterLabel: 'Chapter',
  },
  schedule: {
    sectionLabel: 'Schedule',
    rowAddLabel: 'Add a moment',
  },
  gallery: {
    sectionLabel: 'Gallery',
  },
  faq: {
    sectionLabel: 'FAQ',
    addLabel: 'Add a question',
  },
};

const CELEBRATORY_PACK: VoicePack = {
  ...WEDDING_PACK,
  hero: {
    ...WEDDING_PACK.hero,
    leadPlaceholder: "Let's celebrate",
    taglinePlaceholder: 'A short line above the fold',
    ctaPrimaryDefaultLabel: 'RSVP',
    ctaSecondaryDefaultLabel: 'Details',
  },
  registry: {
    sectionLabel: 'Wishlist',
    introPlaceholder: 'No gifts needed, but if you insist…',
    listLabel: 'Wishlist',
    addLabel: 'Add to the wishlist',
  },
  story: {
    ...WEDDING_PACK.story,
    sectionLabel: 'About',
    bodyPlaceholder: "Tell guests a little about what they're coming to.",
  },
};

const INTIMATE_PACK: VoicePack = {
  ...WEDDING_PACK,
  hero: {
    ...WEDDING_PACK.hero,
    leadPlaceholder: 'Quietly together',
    taglinePlaceholder: 'A line that sets the tone',
    ctaPrimaryDefaultLabel: "I'll be there",
    ctaSecondaryDefaultLabel: 'Read more',
  },
  details: { sectionLabel: 'What to know', addCardLabel: 'Add a note' },
  story: {
    ...WEDDING_PACK.story,
    sectionLabel: 'A note from us',
    bodyPlaceholder: 'A few sentences in your own voice, what this gathering means.',
  },
};

const CEREMONIAL_PACK: VoicePack = {
  ...WEDDING_PACK,
  hero: {
    ...WEDDING_PACK.hero,
    leadPlaceholder: 'A formal invitation',
    taglinePlaceholder: 'The line beneath the names',
    ctaPrimaryDefaultLabel: 'Reply',
    ctaSecondaryDefaultLabel: 'Programme',
  },
  rsvp: { ...WEDDING_PACK.rsvp, buttonLabel: 'Reply', eyebrowPlaceholder: 'Kindly reply by April 28' },
  details: { sectionLabel: 'The day', addCardLabel: 'Add a card' },
  registry: { ...WEDDING_PACK.registry, sectionLabel: 'Honoured gifts', listLabel: 'Receiving' },
  schedule: { sectionLabel: 'Programme', rowAddLabel: 'Add to the programme' },
};

const PLAYFUL_PACK: VoicePack = {
  ...WEDDING_PACK,
  hero: {
    subjectGroupLabel: 'Who this is for',
    nameAPlaceholder: 'Name of the honoree',
    nameBPlaceholder: '(blank if just one)',
    leadPlaceholder: 'WE ARE GOING',
    taglinePlaceholder: 'one weekend, one wild ride',
    coverGroupHint: 'Drag an image here, click to pick, or reuse one already on the site.',
    ctaPrimaryDefaultLabel: "I'm in",
    ctaSecondaryDefaultLabel: 'See the plan',
  },
  rsvp: { sectionLabel: 'Are you in?', eyebrowPlaceholder: 'Let us know by April 1', replyByLabel: 'Reply by', buttonLabel: "I'm in", questionsLabel: 'Ask each person' },
  details: { sectionLabel: 'The plan', addCardLabel: 'Add to the plan' },
  registry: { sectionLabel: 'Group costs', introPlaceholder: "Here's the cost-split if you want to chip in early.", listLabel: 'Cost links', addLabel: 'Add a cost link' },
  story: { sectionLabel: "Why we're doing this", bodyPlaceholder: 'Set the scene, who, where, why this weekend.', chapterLabel: 'Day' },
  schedule: { sectionLabel: 'Itinerary', rowAddLabel: 'Add to the itinerary' },
  gallery: { sectionLabel: 'Photo dump' },
  faq: { sectionLabel: 'What to ask', addLabel: 'Add a heads-up' },
};

const SOLEMN_PACK: VoicePack = {
  hero: {
    subjectGroupLabel: 'In memory of',
    subjectHint: 'The name (and dates, if you wish) appear in the hero.',
    nameAPlaceholder: 'Their name',
    nameBPlaceholder: '',
    leadPlaceholder: 'In loving memory',
    taglinePlaceholder: 'Born 1942, passed 2026',
    coverGroupHint: 'A favorite photograph. Drag an image here or pick from your device.',
    ctaPrimaryDefaultLabel: 'Attend the service',
    ctaSecondaryDefaultLabel: 'Read the obituary',
  },
  rsvp: { sectionLabel: 'Attendance', eyebrowPlaceholder: 'Service & reception', replyByLabel: 'Reply by', buttonLabel: "I'll be there", questionsLabel: 'Ask each guest' },
  details: { sectionLabel: 'Service details', addCardLabel: 'Add a detail' },
  registry: { sectionLabel: 'In lieu of flowers', introPlaceholder: 'In lieu of flowers, donations may be made to the charities below.', listLabel: 'Donation links', addLabel: 'Add a charity' },
  story: { sectionLabel: 'Their story', bodyPlaceholder: 'A short remembrance. Family details, what they loved, what they leave behind.', chapterLabel: 'Chapter of their life' },
  schedule: { sectionLabel: 'Order of service', rowAddLabel: 'Add to the order' },
  gallery: { sectionLabel: 'Photographs' },
  faq: { sectionLabel: 'For visitors', addLabel: 'Add a heads-up' },
};

const PACKS_BY_VOICE: Record<EventVoice, VoicePack> = {
  celebratory: CELEBRATORY_PACK,
  intimate: INTIMATE_PACK,
  ceremonial: CEREMONIAL_PACK,
  playful: PLAYFUL_PACK,
  solemn: SOLEMN_PACK,
};

/* Hard wedding override — keeps the historical wording for the
   default occasion since users in the wild expect it verbatim. */
const WEDDING_ID: SiteOccasion = 'wedding';

/** Resolve the active voice pack for a manifest. Reads
 *  manifest.occasion → EVENT_TYPES lookup → voice → pack. Wedding
 *  is hard-coded to the historical pack so existing hosts see
 *  zero change. Falls back to celebratory for unknown occasions. */
export function resolveVoicePack(manifest: StoryManifest): VoicePack {
  const loose = manifest as unknown as { occasion?: SiteOccasion; subject?: { kind?: 'couple' | 'solo' } };
  const occ = loose.occasion;
  if (occ === WEDDING_ID) return WEDDING_PACK;
  const entry = EVENT_TYPES.find((e) => e.id === occ);
  const voice = entry?.voice ?? 'celebratory';
  const base = PACKS_BY_VOICE[voice];
  /* Solo-honoree override — collapses second-name copy so panels
     don't show "(blank if just one)". */
  const isSolo = loose.subject?.kind === 'solo';
  if (isSolo) {
    return {
      ...base,
      hero: {
        ...base.hero,
        subjectGroupLabel: voice === 'solemn' ? 'In memory of' : 'Honoree',
        nameAPlaceholder: voice === 'solemn' ? 'Their name' : 'Name',
        nameBPlaceholder: '',
      },
    };
  }
  return base;
}

/** Convenience hook-style accessor. Resolves the pack each call
 *  — cheap, the pack is a literal. */
export function useVoicePack(manifest: StoryManifest): VoicePack {
  return resolveVoicePack(manifest);
}
