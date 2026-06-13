// ─────────────────────────────────────────────────────────────
// Schedule auto-drafter — templates a sensible run-of-show per
// occasion, anchored to manifest.logistics.time (or sensible
// occasion defaults). Returns null if events already exist.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest, WeddingEvent } from '@/types';
import type { Drafter } from './types';

/** Templates per occasion. Each template is a sequence of events
 *  with names + durations (minutes) + descriptions. The anchor
 *  hour comes from ctx.eventHour (or the occasion's typical
 *  default if unset). */
interface TemplateEvent {
  name: string;
  /** Minutes from the anchor (0 = anchor). */
  offsetMin: number;
  description: string;
}

interface OccasionTemplate {
  anchorHour: number;
  events: TemplateEvent[];
}

const TEMPLATES: Record<string, OccasionTemplate> = {
  wedding: {
    anchorHour: 16, // 4pm ceremony default
    events: [
      { name: 'Ceremony', offsetMin: 0, description: 'Vows, rings, the moment everything changes.' },
      { name: 'Cocktail hour', offsetMin: 60, description: 'Signature drinks, light bites, golden hour photos.' },
      { name: 'Dinner', offsetMin: 120, description: 'Seated meal with toasts between courses.' },
      { name: 'First dance', offsetMin: 210, description: 'The song you picked together.' },
      { name: 'Dancing', offsetMin: 240, description: 'The dance floor opens for everyone.' },
      { name: 'Send-off', offsetMin: 360, description: 'Sparklers, last hugs, a quiet exit.' },
    ],
  },
  engagement: {
    anchorHour: 18,
    events: [
      { name: 'Drinks & arrivals', offsetMin: 0, description: 'Welcome cocktails and hellos.' },
      { name: 'A few words', offsetMin: 60, description: 'The story of how we got here.' },
      { name: 'Dinner', offsetMin: 90, description: 'Family-style or plated, time to settle in.' },
      { name: 'Late drinks', offsetMin: 180, description: 'Stay as long as you like.' },
    ],
  },
  'rehearsal-dinner': {
    anchorHour: 18,
    events: [
      { name: 'Arrivals', offsetMin: 0, description: 'Family + wedding party gather.' },
      { name: 'Toasts', offsetMin: 45, description: 'The hosts and a few volunteers.' },
      { name: 'Dinner', offsetMin: 75, description: 'The seated meal.' },
      { name: 'Open mic', offsetMin: 180, description: 'Anyone else who wants to share.' },
    ],
  },
  'bachelor-party': {
    anchorHour: 19,
    events: [
      { name: 'Check-in', offsetMin: 0, description: 'Pick up keys + drop bags.' },
      { name: 'First dinner', offsetMin: 90, description: 'Reservation under the host name.' },
      { name: 'Out on the town', offsetMin: 210, description: 'The list of spots — we\'ll regroup at midnight.' },
    ],
  },
  'bachelorette-party': {
    anchorHour: 19,
    events: [
      { name: 'Welcome', offsetMin: 0, description: 'Drop bags, find your bunk, hug everyone.' },
      { name: 'Dinner', offsetMin: 90, description: 'The reservation that started this whole trip.' },
      { name: 'Dancing', offsetMin: 210, description: 'Spot two on the list — let\'s go.' },
    ],
  },
  'baby-shower': {
    anchorHour: 14,
    events: [
      { name: 'Welcome', offsetMin: 0, description: 'Arrivals, drinks, settle in.' },
      { name: 'Games & gifts', offsetMin: 30, description: 'A few games + opening presents.' },
      { name: 'Brunch', offsetMin: 90, description: 'Seated brunch and toasts.' },
    ],
  },
  'bridal-shower': {
    anchorHour: 14,
    events: [
      { name: 'Welcome', offsetMin: 0, description: 'Arrivals + brunch begins.' },
      { name: 'Gifts', offsetMin: 60, description: 'The bride opens presents.' },
      { name: 'Advice cards', offsetMin: 120, description: 'Everyone writes a piece of advice.' },
    ],
  },
  birthday: {
    anchorHour: 19,
    events: [
      { name: 'Drinks & arrivals', offsetMin: 0, description: 'Find a glass, find a chair.' },
      { name: 'Dinner', offsetMin: 60, description: 'The big meal.' },
      { name: 'Cake + speeches', offsetMin: 150, description: 'The toast, the candles, the song.' },
    ],
  },
  'milestone-birthday': {
    anchorHour: 19,
    events: [
      { name: 'Cocktails', offsetMin: 0, description: 'A glass in hand to start the evening.' },
      { name: 'Dinner + toasts', offsetMin: 60, description: 'A seated meal with stories between courses.' },
      { name: 'Cake', offsetMin: 180, description: 'The song. The candles. A wish.' },
      { name: 'Dancing', offsetMin: 210, description: 'The floor opens.' },
    ],
  },
  memorial: {
    anchorHour: 14,
    events: [
      { name: 'Gathering', offsetMin: 0, description: 'Friends and family arrive.' },
      { name: 'Service', offsetMin: 30, description: 'A celebration of their life.' },
      { name: 'Reception', offsetMin: 90, description: 'Food, drinks, and shared memories.' },
    ],
  },
  reunion: {
    anchorHour: 18,
    events: [
      { name: 'Welcome dinner', offsetMin: 0, description: 'Everyone settles in.' },
      { name: 'Group photo', offsetMin: 90, description: 'Out on the lawn before dark.' },
      { name: 'Late drinks', offsetMin: 150, description: 'Catch up by the fire.' },
    ],
  },
};

function hourToISO(hour: number, eventDateIso: string | null): string {
  // If we have a real date, anchor on it. Otherwise return a
  // bare HH:mm time string the renderer's fmtEventTime can parse.
  const hh = String(Math.floor(hour)).padStart(2, '0');
  const mm = String(Math.round((hour - Math.floor(hour)) * 60)).padStart(2, '0');
  if (eventDateIso) {
    return `${eventDateIso}T${hh}:${mm}:00`;
  }
  return `${hh}:${mm}`;
}

export const draftSchedule: Drafter = (ctx, existing) => {
  // Skip if events already exist — never overwrite host content.
  if (existing.events && existing.events.length > 0) return null;

  const template = TEMPLATES[ctx.occasion];
  if (!template) return null; // No template for this occasion → leave empty.

  const anchorHour = ctx.eventHour ?? template.anchorHour;

  const events: WeddingEvent[] = template.events.map((t, i) => {
    const totalMinutes = anchorHour * 60 + t.offsetMin;
    const hour = totalMinutes / 60;
    return {
      id: `pear-${i}-${t.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: t.name,
      description: t.description,
      time: hourToISO(hour, ctx.eventDate),
    } as WeddingEvent;
  });

  return { events };
};
