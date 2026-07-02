// ─────────────────────────────────────────────────────────────
// FAQ auto-drafter — fills the questions every host gets asked,
// with sensible answers the host can edit. Templates per occasion
// because (e.g.) a memorial has different questions than a
// bachelor party.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { Drafter } from './types';

interface FaqPair {
  question: string;
  answer: string;
}

/** Universal Q&A every event gets a starter for. */
const UNIVERSAL: FaqPair[] = [
  {
    question: 'When should I arrive?',
    answer: 'Please plan to arrive 15 minutes before the start time. The schedule on this site has the full run of the day.',
  },
  {
    question: 'What should I wear?',
    answer: 'Dressy or whatever feels you. If there\'s a specific dress code, the host will note it on the schedule or details below.',
  },
  {
    question: 'Can I bring a plus-one?',
    answer: 'Check the RSVP form — your invitation note will say whether your invite includes a plus-one.',
  },
];

const WEDDING_EXTRA: FaqPair[] = [
  {
    question: 'Are kids welcome?',
    answer: 'We love your little ones — please mention them on the RSVP so we can plan seating + a high chair if needed.',
  },
  {
    question: 'Where should I stay?',
    answer: 'The Travel section below has a few hotels near the venue with notes from us. Book early — wedding weekends fill up fast.',
  },
  {
    question: 'Is there parking at the venue?',
    answer: 'Yes — the venue has on-site parking and we\'ll have signage. Rideshare is also easy in/out.',
  },
];

const SHOWER_EXTRA: FaqPair[] = [
  {
    question: 'Should I bring a gift?',
    answer: 'Only if you want to. Your presence is the gift; the registry is below for anyone who wants to bring something.',
  },
];

const BACHELOR_EXTRA: FaqPair[] = [
  {
    question: 'How much should I budget?',
    answer: 'See the cost breakdown on the schedule — we\'ll have lodging + dinners pooled, and everything else is pay-as-you-go.',
  },
  {
    question: 'What should I pack?',
    answer: 'Comfortable shoes, one nicer outfit for the big dinner, and whatever you need to be your best self for 48 hours.',
  },
];

const MEMORIAL_EXTRA: FaqPair[] = [
  {
    question: 'Will the service be live-streamed?',
    answer: 'If a livestream is set up, the link will appear on this site closer to the date. Reach out to the family if you\'re unsure.',
  },
  {
    question: 'In lieu of flowers?',
    answer: 'The family has shared a charity below if you\'d like to give in their name. Anything you choose to do means a lot.',
  },
];

const REUNION_EXTRA: FaqPair[] = [
  {
    question: 'Are the days flexible?',
    answer: 'Most events have a set time, but the weekend is meant to be relaxed. Drop in and out as your schedule allows.',
  },
];

function pairsForOccasion(occasion: string): FaqPair[] {
  let extras: FaqPair[] = [];
  if (occasion === 'wedding' || occasion === 'vow-renewal' || occasion === 'anniversary') extras = WEDDING_EXTRA;
  else if (occasion === 'bridal-shower' || occasion === 'baby-shower') extras = SHOWER_EXTRA;
  else if (occasion === 'bachelor-party' || occasion === 'bachelorette-party') extras = BACHELOR_EXTRA;
  else if (occasion === 'memorial' || occasion === 'funeral') extras = MEMORIAL_EXTRA;
  else if (occasion === 'reunion') extras = REUNION_EXTRA;
  return [...UNIVERSAL, ...extras];
}

export const draftFaq: Drafter = (ctx, existing) => {
  const existingFaq = (existing as unknown as { faq?: Array<{ question?: string; answer?: string }> }).faq;
  if (existingFaq && existingFaq.length > 0) return null;
  const pairs = pairsForOccasion(ctx.occasion);
  if (pairs.length === 0) return null;
  return { faq: pairs } as unknown as Partial<StoryManifest>;
};
