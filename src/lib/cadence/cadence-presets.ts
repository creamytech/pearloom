// ─────────────────────────────────────────────────────────────
// Pearloom / lib/cadence/cadence-presets.ts
//
// Communication timeline presets per event category. Every event
// has a known rhythm — wedding save-the-dates ship 6–8 months
// out, memorial announcements compress to days, bachelor-party
// hosts share the itinerary the week before. Pearloom turns
// that rhythm into a *plan* the host approves once and Pear
// executes against.
//
// daysBefore is relative to manifest.logistics.date:
//   negative = before the event (e.g. -180 = 6 months prior)
//   positive = after the event (e.g. +7 = thank-you a week later)
//
// Each phase has a draftPrompt that Pear uses when the host
// clicks "Draft this one." All copy goes through claude/haiku
// using the host's voiceDNA (when set) so messages stay in their
// voice.
// ─────────────────────────────────────────────────────────────

import type { SiteOccasion } from '@/lib/site-urls';

export type CadenceChannel = 'email' | 'mail' | 'sms' | 'push';

export type CadenceProduct =
  | 'save-the-date'
  | 'invitation'
  | 'reminder'
  | 'final-reminder'
  | 'day-before'
  | 'morning-of'
  | 'thank-you'
  | 'milestone';

export interface CadencePhase {
  /** Stable id within the preset — used to dedupe scheduled rows. */
  id: string;
  /** Display label for the timeline. */
  label: string;
  /** Description shown in the host UI under the label. */
  description: string;
  /** Days relative to manifest.logistics.date. Negative = before. */
  daysBefore: number;
  /** Channel(s) where this phase typically goes out. */
  channels: CadenceChannel[];
  /** Product slug — picks an invite-designer kind if there is one. */
  product: CadenceProduct;
  /** Prompt Pear uses to draft the copy. */
  draftPrompt: string;
  /** When set, the phase only applies to non-RSVPers. */
  audience?: 'all' | 'pending-rsvp' | 'attending' | 'declined';
}

const FULL_LEAD = (): CadencePhase[] => [
  {
    id: 'save-the-date',
    label: 'Save the date',
    description: '6–8 months before — gives guests time to plan travel.',
    daysBefore: -180,
    channels: ['mail', 'email'],
    product: 'save-the-date',
    draftPrompt: 'Write a warm 1-sentence save-the-date headline + a 2-sentence body for {names} on {date} at {venue}. Tone: announcing, excited, not stuffy. Sign with {names}.',
  },
  {
    id: 'invitation',
    label: 'Formal invitation',
    description: '8–10 weeks before — formal invite with all the details.',
    daysBefore: -70,
    channels: ['mail', 'email'],
    product: 'invitation',
    draftPrompt: 'Write a formal wedding invitation for {names} on {date} at {venue}. Include hosting line, ceremony time, reception line, dress code, RSVP deadline. Tone: warm, classic.',
  },
  {
    id: 'reminder',
    label: 'RSVP reminder',
    description: '4 weeks before — gentle nudge for guests who haven\'t replied.',
    daysBefore: -28,
    channels: ['email', 'sms'],
    product: 'reminder',
    audience: 'pending-rsvp',
    draftPrompt: 'Write a 2-3 sentence friendly nudge to guests who haven\'t RSVP\'d yet for {names}\' celebration on {date}. Mention the deadline if known. Warm, not pushy.',
  },
  {
    id: 'final-reminder',
    label: 'Final RSVP nudge',
    description: '7 days before deadline — one last friendly bump.',
    daysBefore: -10,
    channels: ['email', 'sms'],
    product: 'final-reminder',
    audience: 'pending-rsvp',
    draftPrompt: 'Write a short, warm "last chance to RSVP" message for {names}\' event on {date}. Mention the deadline is days away. Two sentences max.',
  },
  {
    id: 'day-before',
    label: 'Day-before reminder',
    description: '24 hours before — venue, time, parking, weather.',
    daysBefore: -1,
    channels: ['email', 'sms', 'push'],
    product: 'day-before',
    audience: 'attending',
    draftPrompt: 'Write a 3-sentence day-before reminder for guests attending {names}\' celebration tomorrow at {venue}. Include: arrival time, parking note, what to wear if dress code is set. Warm, useful, no fluff.',
  },
  {
    id: 'morning-of',
    label: 'Morning of',
    description: 'Day-of — a thank-you in advance + final logistics.',
    daysBefore: 0,
    channels: ['email', 'push'],
    product: 'morning-of',
    audience: 'attending',
    draftPrompt: 'Write a 2-sentence "we can\'t wait to see you today" message from {names} for guests attending {names}\' celebration today. Warm, intimate, signed.',
  },
  {
    id: 'thank-you',
    label: 'Thank-you note',
    description: '1 week after — a personal thank-you with a few photos.',
    daysBefore: 7,
    channels: ['mail', 'email'],
    product: 'thank-you',
    audience: 'attending',
    draftPrompt: 'Write a warm 3-sentence thank-you note from {names} for guests who came to their celebration. Reference the day generally, sign with {names}. Don\'t mention specific gifts.',
  },
];

const COMPRESSED_LEAD = (): CadencePhase[] => [
  {
    id: 'announcement',
    label: 'Announcement',
    description: 'Send as soon as the date is set.',
    daysBefore: -14,
    channels: ['email', 'mail'],
    product: 'save-the-date',
    draftPrompt: 'Write a warm announcement for {names} on {date} at {venue}. 2-3 sentences. Tone matches the {voice} voice of the event.',
  },
  {
    id: 'reminder',
    label: 'RSVP reminder',
    description: '3 days before — short and warm.',
    daysBefore: -3,
    channels: ['email', 'sms'],
    product: 'reminder',
    audience: 'pending-rsvp',
    draftPrompt: 'Write a 2-sentence reminder to RSVP for {names}\' event in 3 days. Warm, brief.',
  },
  {
    id: 'day-before',
    label: 'Day-before reminder',
    description: '24 hours before — venue + time + arrival note.',
    daysBefore: -1,
    channels: ['email', 'sms'],
    product: 'day-before',
    audience: 'attending',
    draftPrompt: 'Write a 3-sentence day-before reminder for guests attending {names}\' event tomorrow at {venue}. Include arrival time + parking. Warm.',
  },
  {
    id: 'thank-you',
    label: 'Thank-you',
    description: '1 week after — gratitude and a couple of photos.',
    daysBefore: 7,
    channels: ['email'],
    product: 'thank-you',
    audience: 'attending',
    draftPrompt: 'Write a 3-sentence thank-you note from {names} for guests who came to {names}\' event. Warm, reflective, signed.',
  },
];

const MEMORIAL_LEAD = (): CadencePhase[] => [
  {
    id: 'announcement',
    label: 'Service announcement',
    description: 'Send as soon as service details are confirmed.',
    daysBefore: -7,
    channels: ['email', 'mail'],
    product: 'save-the-date',
    draftPrompt: 'Write a 3-sentence solemn announcement of a memorial service for {names} on {date} at {venue}. Tone: gentle, dignified, not festive. Mention donations in lieu of flowers if relevant.',
  },
  {
    id: 'day-before',
    label: 'Day-before',
    description: 'Service time, venue, parking.',
    daysBefore: -1,
    channels: ['email', 'sms'],
    product: 'day-before',
    audience: 'attending',
    draftPrompt: 'Write a brief 3-sentence day-before reminder for the memorial service of {names} tomorrow at {venue}. Include service time, parking. Tone: gentle, respectful.',
  },
  {
    id: 'thank-you',
    label: 'Thank you',
    description: '2 weeks after — thank guests + invite them to add memories.',
    daysBefore: 14,
    channels: ['email'],
    product: 'thank-you',
    draftPrompt: 'Write a 3-sentence quiet thank-you for those who attended the memorial of {names}. Invite them to leave a memory on the site. Tone: gentle, grateful.',
  },
];

const BACHELOR_LEAD = (): CadencePhase[] => [
  {
    id: 'save-the-weekend',
    label: 'Save the weekend',
    description: '2 months out — get the dates locked.',
    daysBefore: -60,
    channels: ['email'],
    product: 'save-the-date',
    draftPrompt: 'Write a fun 2-sentence "save the weekend" for {names}\' bachelor/ette party on {date}. Playful, casual, hyped.',
  },
  {
    id: 'itinerary-share',
    label: 'Itinerary + cost share',
    description: '2 weeks before — final itinerary, costs, packing list.',
    daysBefore: -14,
    channels: ['email'],
    product: 'invitation',
    draftPrompt: 'Write a 2-sentence note sharing the final itinerary for {names}\' weekend on {date}. Mention checking the cost splitter + packing list. Casual.',
  },
  {
    id: 'day-before',
    label: 'Day-before',
    description: 'Arrival info + first activity.',
    daysBefore: -1,
    channels: ['sms', 'email'],
    product: 'day-before',
    audience: 'attending',
    draftPrompt: 'Write a 2-sentence "we leave tomorrow" pump-up for {names}\' bachelor/ette weekend. Include arrival window + first activity. Hyped.',
  },
];

const SHOWER_LEAD = (): CadencePhase[] => [
  {
    id: 'save-the-date',
    label: 'Save the date',
    description: '6 weeks before — give guests time for the registry.',
    daysBefore: -42,
    channels: ['mail', 'email'],
    product: 'save-the-date',
    draftPrompt: 'Write a warm 2-sentence save-the-date for a shower for {names} on {date} at {venue}. Mention the registry casually.',
  },
  {
    id: 'invitation',
    label: 'Invitation',
    description: '3 weeks before — full details + registry link.',
    daysBefore: -21,
    channels: ['mail', 'email'],
    product: 'invitation',
    draftPrompt: 'Write a warm shower invitation for {names} on {date} at {venue}. Mention the registry, dress code (if any), RSVP deadline. Tone: celebratory, soft.',
  },
  {
    id: 'reminder',
    label: 'RSVP reminder',
    description: '1 week before — last call.',
    daysBefore: -7,
    channels: ['email'],
    product: 'reminder',
    audience: 'pending-rsvp',
    draftPrompt: 'Write a 2-sentence "last chance to RSVP" reminder for {names}\' shower this weekend. Warm.',
  },
  {
    id: 'thank-you',
    label: 'Thank-you',
    description: '1 week after — personal thank-you for each guest.',
    daysBefore: 7,
    channels: ['mail', 'email'],
    product: 'thank-you',
    audience: 'attending',
    draftPrompt: 'Write a warm 3-sentence thank-you from {names} for guests who came to the shower. Mention the gift was generous (without naming it). Sign warmly.',
  },
];

/** Returns a defensive copy of the cadence preset for an occasion. */
export function getCadencePreset(occasion: SiteOccasion | string | undefined): CadencePhase[] {
  switch (occasion) {
    // Long-lead, traditional events
    case 'wedding':
    case 'engagement':
    case 'vow-renewal':
      return FULL_LEAD();

    // Compressed-lead casual events
    case 'birthday':
    case 'milestone-birthday':
    case 'first-birthday':
    case 'sweet-sixteen':
    case 'retirement':
    case 'graduation':
    case 'housewarming':
    case 'anniversary':
    case 'rehearsal-dinner':
    case 'welcome-party':
    case 'brunch':
    case 'gender-reveal':
    case 'sip-and-see':
    case 'bridal-luncheon':
    case 'reunion':
    case 'baby-shower':
      return COMPRESSED_LEAD();

    // Memorial / funeral
    case 'memorial':
    case 'funeral':
      return MEMORIAL_LEAD();

    // Bachelor / bachelorette
    case 'bachelor-party':
    case 'bachelorette-party':
      return BACHELOR_LEAD();

    // Showers
    case 'bridal-shower':
      return SHOWER_LEAD();

    // Cultural ceremonies — long lead like weddings
    case 'bar-mitzvah':
    case 'bat-mitzvah':
    case 'quinceanera':
    case 'baptism':
    case 'first-communion':
    case 'confirmation':
      return FULL_LEAD();

    case 'story':
    default:
      return COMPRESSED_LEAD();
  }
}

/** Convert a cadence phase + an event date into an absolute scheduled
 *  ISO timestamp (10:00am local on the day the phase fires). */
export function scheduledAtFor(eventDate: string | Date, daysBefore: number): string {
  const base = new Date(eventDate);
  if (Number.isNaN(base.getTime())) return new Date().toISOString();
  const target = new Date(base.getTime() + daysBefore * 24 * 60 * 60 * 1000);
  // Pin to 10:00am local time so emails don't ship at 3am.
  target.setHours(10, 0, 0, 0);
  return target.toISOString();
}
