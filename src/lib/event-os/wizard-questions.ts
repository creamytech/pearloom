// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/wizard-questions.ts
//
// Per-occasion wording for the three fact-sheet prompts the
// wizard asks on the Details step. Previously every non-
// wedding/non-memorial/non-bachelor/non-reunion occasion fell
// through to a wedding-shaped placeholder ("Alex & Jamie met
// at a rooftop party in 2018…") — which made no sense on a
// birthday, baby shower, or graduation site.
//
// Returns labels + placeholders for three questions:
//   q1 → stored on `howWeMet`
//   q2 → stored on `whyCelebrate`
//   q3 → stored on `favoriteMemory` (optional)
//
// Each occasion re-purposes the three slots to whatever the
// story pass can actually use from them.
// ─────────────────────────────────────────────────────────────

import type { SiteOccasion } from '@/lib/site-urls';

export interface WizardQuestionSet {
  q1Label: string;
  q1Placeholder: string;
  q2Label: string;
  q2Placeholder: string;
  q3Label: string;
  q3Placeholder: string;
}

const DEFAULT_SET: WizardQuestionSet = {
  q1Label: 'How you got here',
  q1Placeholder: 'The story that brought everyone to this day — in your words.',
  q2Label: 'Why this celebration',
  q2Placeholder: 'Why it matters to you, and who you want around when you mark it.',
  q3Label: 'A favourite memory (optional)',
  q3Placeholder: 'One moment Pear can weave into the site.',
};

const SETS: Partial<Record<SiteOccasion, WizardQuestionSet>> = {
  // ─── Weddings + partner events ────────────────────────
  wedding: {
    q1Label: 'How you two got here',
    q1Placeholder: 'Alex and Jamie met at a rooftop party in 2018; seven summers and one patient dog later…',
    q2Label: 'Why this wedding, now',
    q2Placeholder: 'Because we want a long table, dancing until late, and everyone we love in one room.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'The drive home from their first apartment, or the afternoon we got the dog…',
  },
  engagement: {
    q1Label: 'The proposal',
    q1Placeholder: 'Where, how, who cried first. Or the quieter moment when we knew.',
    q2Label: 'Why this party',
    q2Placeholder: 'Because telling people one at a time would take forever and we’d rather hug you all at once.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'Something together that you want written into the story.',
  },
  'vow-renewal': {
    q1Label: 'How long you’ve been choosing each other',
    q1Placeholder: '25 years, two kids, three houses, and a garden we finally got right.',
    q2Label: 'Why now',
    q2Placeholder: 'Because we’ve earned this one. Same words, better wine, more stories to tell.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'The first vows, the anniversary that nearly didn’t happen, the kitchen dance…',
  },
  anniversary: {
    q1Label: 'How long this love has been going',
    q1Placeholder: 'Thirty-five years. Two kids, one house, too many dogs to count.',
    q2Label: 'Why throw something this year',
    q2Placeholder: 'Because the people who’ve watched us do this deserve to be in the room.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A road trip, a terrible holiday, the day the power went out and we played cards…',
  },

  // ─── Wedding-arc adjacents ────────────────────────────
  'bachelor-party': {
    q1Label: 'About the group',
    q1Placeholder: 'You’ve all been friends since college / work / the climbing gym — now we’re sending one of us off in style.',
    q2Label: 'The vibe',
    q2Placeholder: 'Low-key cabin weekend · or · Vegas suit-and-tie · or · surf, sun, cheap beer.',
    q3Label: 'Anything else we should know? (optional)',
    q3Placeholder: 'Matching shirts, a surprise activity, a playlist that must be honored.',
  },
  'bachelorette-party': {
    q1Label: 'About the group',
    q1Placeholder: 'The bride-to-be, her sisters, and the 8 people who’ve been there since high school.',
    q2Label: 'The vibe',
    q2Placeholder: 'Honky-tonks and matching jackets, or a slow Hamptons weekend — you decide.',
    q3Label: 'Anything else we should know? (optional)',
    q3Placeholder: 'Playlists, rituals, a photo prompt we shouldn’t miss.',
  },
  'rehearsal-dinner': {
    q1Label: 'The night before — who’s hosting?',
    q1Placeholder: 'The groom’s parents; 40 people at a long table; short toasts, longer laughs.',
    q2Label: 'What you want the night to feel like',
    q2Placeholder: 'Warm, quiet, familiar. A slow meal before tomorrow’s fireworks.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A family story everyone already knows the ending to.',
  },
  'welcome-party': {
    q1Label: 'Who’s coming in from out of town',
    q1Placeholder: 'Eighty people flying in Friday. Friends from every chapter of our lives.',
    q2Label: 'Why this welcome',
    q2Placeholder: 'A warm drink before the big day — so we get to actually see everyone.',
    q3Label: 'Anything else Pear should weave in? (optional)',
    q3Placeholder: 'Local spots, the neighborhood story, the thing you always do on Friday.',
  },
  brunch: {
    q1Label: 'Who’ll still be around',
    q1Placeholder: 'The people who stayed up too late and want eggs before flying home.',
    q2Label: 'What the morning should feel like',
    q2Placeholder: 'Slow, quiet, a little hungover. Mimosas optional, stories mandatory.',
    q3Label: 'Anything else Pear should weave in? (optional)',
    q3Placeholder: 'A dish that has to be there, a playlist for Sunday morning…',
  },
  'bridal-shower': {
    q1Label: 'About the bride-to-be',
    q1Placeholder: 'Jess loves gardens, fiction, and knows every song on Folklore.',
    q2Label: 'Why this shower',
    q2Placeholder: 'Because the people who shaped her deserve an afternoon that’s just about her.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'Something specific — a trip, a laugh, a Tuesday.',
  },
  'bridal-luncheon': {
    q1Label: 'The bridal party',
    q1Placeholder: 'Six friends who’ve been there since different chapters — now, all in one room.',
    q2Label: 'Why this lunch',
    q2Placeholder: 'A slow meal before the big day. A thank-you we won’t have time to say later.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'The origin story of the group.',
  },

  // ─── Milestones ───────────────────────────────────────
  birthday: {
    q1Label: 'About the birthday person',
    q1Placeholder: 'Sam turns 40. Works in architecture, plays tennis, has three siblings, refuses to nap.',
    q2Label: 'Why mark it this year',
    q2Placeholder: 'Because 40 feels worth it — and we want the people who love him in one room.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A story everyone tells about him that should end up on the site.',
  },
  'milestone-birthday': {
    q1Label: 'About the birthday person',
    q1Placeholder: 'Patricia turns 50 — three kids raised, two novels published, still writes every morning.',
    q2Label: 'Why a milestone party',
    q2Placeholder: 'Because fifty deserves more than a dinner. Because everyone should say it to her face.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A line Pear should put in the site. Something only the group would get.',
  },
  'first-birthday': {
    q1Label: 'About the baby',
    q1Placeholder: 'Sage was born in April; first word was "dog"; laughs at absolutely nothing.',
    q2Label: 'Why celebrate',
    q2Placeholder: 'Because year one was everything. Because the people who showed up should be here too.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'The first time they walked, the first time they said your name…',
  },
  'sweet-sixteen': {
    q1Label: 'About the birthday girl/guy',
    q1Placeholder: 'Valentina turns 16 — varsity soccer, paints in her sleep, has strong opinions on Taylor Swift eras.',
    q2Label: 'The vibe',
    q2Placeholder: 'Big type, a disco ball, the friends she actually wants there. No tables, mostly dancing.',
    q3Label: 'Anything else Pear should weave in? (optional)',
    q3Placeholder: 'Playlist must-haves, inside jokes, dress-code direction.',
  },
  retirement: {
    q1Label: 'About the retiree',
    q1Placeholder: 'Patricia, 35 years in public-school teaching, known for her red sweater and marginalia.',
    q2Label: 'What this party marks',
    q2Placeholder: 'An arc closing well. The people who watched it unfold, in one room.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A class she changed, a colleague she saved, the year she ran the district play.',
  },
  graduation: {
    q1Label: 'About the graduate',
    q1Placeholder: 'Kai — BS in Computer Science, Portland State; four years of all-nighters, worth it.',
    q2Label: 'What this celebration marks',
    q2Placeholder: 'Not just the diploma — the people who helped get it, the chapter that’s closing.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A professor, a late-night breakthrough, the sophomore-year low that turned around.',
  },

  // ─── Family / home / baby ─────────────────────────────
  'baby-shower': {
    q1Label: 'About the expecting parents',
    q1Placeholder: 'Alex and Jamie. Due in May. Baby is already a sprout in the group chat.',
    q2Label: 'Why a shower',
    q2Placeholder: 'Because the village starts now. And everyone wants to meet the bump.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'The day they told you. The names you’ve helped them rule out.',
  },
  'gender-reveal': {
    q1Label: 'About the parents-to-be',
    q1Placeholder: 'Alex and Jamie — both only children, both sure they want THREE kids.',
    q2Label: 'The vibe',
    q2Placeholder: 'No cake smash. Just the people you’d want in the room when you found out yourselves.',
    q3Label: 'Anything else Pear should weave in? (optional)',
    q3Placeholder: 'A prediction the group already made; a photo that tells the story.',
  },
  'sip-and-see': {
    q1Label: 'About the baby',
    q1Placeholder: 'Sage, eight weeks, already smirks like their dad.',
    q2Label: 'Why this afternoon',
    q2Placeholder: 'Come meet them. Stay for cake. No gift pressure — the people are the point.',
    q3Label: 'Anything else Pear should weave in? (optional)',
    q3Placeholder: 'Quiet hours, pet policies, what mom wishes people wouldn’t ask.',
  },
  housewarming: {
    q1Label: 'About the home',
    q1Placeholder: 'A 1920s Craftsman on Maple. The kitchen took a month, the garden will take years.',
    q2Label: 'Why a warming',
    q2Placeholder: 'Because it’s only a home once the people you love have been inside it.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'The day you got the keys; the first meal you cooked; the thing you got wrong.',
  },

  // ─── Cultural ─────────────────────────────────────────
  'bar-mitzvah': {
    q1Label: 'About the young person',
    q1Placeholder: 'Noah turns 13 — skateboards, reads about space, has never not finished a book.',
    q2Label: 'What this ceremony marks',
    q2Placeholder: 'The day he leads the service, in his own words, in front of everyone who matters.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A line from his Torah portion he keeps coming back to.',
  },
  'bat-mitzvah': {
    q1Label: 'About the young person',
    q1Placeholder: 'Maya turns 13 — plays violin, writes her own music, named the family dog.',
    q2Label: 'What this ceremony marks',
    q2Placeholder: 'The day she leads the service, in her own words, in front of everyone who matters.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A line from her Torah portion, a moment from rehearsal.',
  },
  quinceanera: {
    q1Label: 'About the quinceañera',
    q1Placeholder: 'Valentina turns 15 — dancer, painter, oldest of three, still sneaks into her mom’s closet.',
    q2Label: 'What this celebration marks',
    q2Placeholder: 'The moment she becomes a woman in her family’s eyes. Dress, dance, court of honor, the whole thing.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'The waltz she’s been practicing; the aunt who taught her the dress sizing.',
  },
  baptism: {
    q1Label: 'About the little one',
    q1Placeholder: 'River, three months. Named for her great-grandmother, who’d be here if she could.',
    q2Label: 'What this day marks',
    q2Placeholder: 'A quiet ceremony; a welcoming into a community she’ll grow up inside.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A prayer the family comes back to; the godparents’ story.',
  },
  'first-communion': {
    q1Label: 'About the child',
    q1Placeholder: 'Liam turns 8 this year; first communion in May; wants to bring his book.',
    q2Label: 'What this day marks',
    q2Placeholder: 'A step. The ceremony, then the lunch that tastes like every family gathering you can remember.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'Something Pear can weave in about the family, the church, the year they prepared.',
  },
  confirmation: {
    q1Label: 'About the young person',
    q1Placeholder: 'Ava, 14, chose Theresa as her confirmation name for a specific reason.',
    q2Label: 'What this day marks',
    q2Placeholder: 'A step she’s taking on her own terms. The people around her who helped her get here.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A conversation, a class, a moment when she decided.',
  },

  // ─── Commemoration ────────────────────────────────────
  memorial: {
    q1Label: 'One thing about them',
    q1Placeholder: 'Their laugh, their coffee order, how they sang in the car, the way they answered the phone.',
    q2Label: 'Why we’re gathering',
    q2Placeholder: 'To remember them out loud. To hold each other. To share one more story.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'One moment Pear can place into the site, in your words.',
  },
  funeral: {
    q1Label: 'One thing about them',
    q1Placeholder: 'Who they were on a Tuesday. The part of them only their people knew.',
    q2Label: 'Why we’re gathering',
    q2Placeholder: 'To grieve in the same room. To say it out loud. To begin the next part.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A story the family will want read back to them.',
  },
  reunion: {
    q1Label: 'The connection',
    q1Placeholder: 'Jefferson High, class of 2005 — or — the Hernandez cousins, all 22 of us.',
    q2Label: 'Why this reunion, now',
    q2Placeholder: 'Because the last one was a decade ago. Because everyone keeps saying we should.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'The year everyone still tells stories about.',
  },

  // ─── Story (no event) ─────────────────────────────────
  story: {
    q1Label: 'Whose story is this',
    q1Placeholder: 'A life, chaptered. Start with who this is for and why.',
    q2Label: 'What you want the site to hold',
    q2Placeholder: 'Photos, letters, a timeline — anything worth preserving.',
    q3Label: 'A favourite memory (optional)',
    q3Placeholder: 'A story that should sit near the top.',
  },
};

/** Returns the question copy appropriate for this occasion. Falls
 *  back to a generic set so unmapped occasions don't ship wedding
 *  placeholders. */
export function questionsFor(occasion: string | undefined): WizardQuestionSet {
  if (!occasion) return DEFAULT_SET;
  return SETS[occasion as SiteOccasion] ?? DEFAULT_SET;
}
