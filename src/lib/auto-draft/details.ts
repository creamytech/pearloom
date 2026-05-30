// ─────────────────────────────────────────────────────────────
// Details auto-drafter — fills logistics fields the wizard didn't
// collect with sensible occasion-aware copy: dress code, parking
// notes, host-side intro. Editors override anything.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { Drafter } from './types';

function dresscodeFor(occasion: string, voice: string): string {
  if (occasion === 'wedding' || occasion === 'vow-renewal') return 'Cocktail or whatever feels you. Wear what you\'ll dance in.';
  if (occasion === 'rehearsal-dinner') return 'Dressy casual.';
  if (occasion === 'memorial' || occasion === 'funeral') return 'What feels right. The family welcomes you in whatever you wear.';
  if (occasion === 'bar-mitzvah' || occasion === 'bat-mitzvah') return 'Cocktail attire. Bring comfortable shoes for dancing.';
  if (occasion === 'quinceanera') return 'Cocktail or formal — it\'s a big night.';
  if (occasion === 'bachelor-party' || occasion === 'bachelorette-party') return 'Comfortable for the day, something nicer for the big dinner.';
  if (occasion === 'baby-shower' || occasion === 'bridal-shower' || occasion === 'sip-and-see') return 'Casual. Whatever you\'d wear to brunch.';
  if (occasion === 'milestone-birthday' || occasion === 'birthday' || occasion === 'sweet-sixteen') return 'Festive. Whatever makes you feel like dancing.';
  if (voice === 'ceremonial') return 'Cocktail attire.';
  return 'Whatever feels right.';
}

function notesFor(occasion: string): string {
  if (occasion === 'memorial' || occasion === 'funeral') {
    return 'Please come as you are. The family will be greeting guests before the service.';
  }
  if (occasion === 'bachelor-party' || occasion === 'bachelorette-party') {
    return 'Plan to be present — phones in the bag for the dinner.';
  }
  if (occasion === 'reunion') {
    return 'Drop in for any part of the weekend; the schedule below is loose by design.';
  }
  return '';
}

export const draftDetails: Drafter = (ctx, existing) => {
  const logistics = existing.logistics ?? {};
  // Skip if the host already filled dresscode + notes
  if (logistics.dresscode && logistics.dresscode.length > 0) return null;

  const dresscode = dresscodeFor(ctx.occasion, ctx.voice);
  const notes = notesFor(ctx.occasion);

  return {
    logistics: {
      ...logistics,
      dresscode: logistics.dresscode || dresscode,
      notes: logistics.notes || notes || undefined,
    } as StoryManifest['logistics'],
  };
};
