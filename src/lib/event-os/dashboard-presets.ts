// Dashboard-level presets that turn the event-types registry into
// meaningful surface copy. Pages import these instead of hardcoding
// wedding-shaped strings.

import type { SiteOccasion } from '@/lib/site-urls';
import { getEventType, type EventType } from './event-types';

export interface KickoffCard {
  title: string;
  body: string;
  cta: string;
  href: string;
  tone: 'lavender' | 'peach' | 'sage' | 'cream';
  icon: 'pear' | 'image' | 'grid' | 'bell' | 'users' | 'heart' | 'mic' | 'gift' | 'pin';
}

// Per-occasion "what would help you most next?" kickoff cards.
// Everything else falls through to the default wedding-y trio.
const KICKOFF_BY_OCCASION: Partial<Record<SiteOccasion, KickoffCard[]>> = {
  memorial: [
    {
      title: 'Write the obituary',
      body: 'A few paragraphs about a life — Pear will help if you want.',
      cta: 'Open the editor',
      href: '/editor',
      tone: 'lavender',
      icon: 'heart',
    },
    {
      title: 'Open the tribute wall',
      body: 'Let guests submit memories and photos. Moderated before they appear.',
      cta: 'Set up tributes',
      href: '/dashboard/submissions',
      tone: 'cream',
      icon: 'users',
    },
    {
      title: 'Share the livestream',
      body: 'Add a livestream URL so family far away can be present.',
      cta: 'Add livestream',
      href: '/editor',
      tone: 'sage',
      icon: 'bell',
    },
  ],
  funeral: [
    {
      title: 'Write the obituary',
      body: 'A few paragraphs about a life — Pear will help if you want.',
      cta: 'Open the editor',
      href: '/editor',
      tone: 'lavender',
      icon: 'heart',
    },
    {
      title: 'Service details',
      body: 'Location, time, dress notes, and how to find the right room.',
      cta: 'Add details',
      href: '/editor',
      tone: 'cream',
      icon: 'pin',
    },
    {
      title: 'In lieu of flowers',
      body: 'Link a donation fund or a charity — or leave it out entirely.',
      cta: 'Add a link',
      href: '/editor',
      tone: 'sage',
      icon: 'gift',
    },
  ],
  'bachelor-party': [
    {
      title: 'Plan the itinerary',
      body: 'Block the days. Drag to reorder. Guests only see what you want them to.',
      cta: 'Open itinerary',
      href: '/editor',
      tone: 'peach',
      icon: 'pin',
    },
    {
      title: 'Split the cost',
      body: 'Line items, per-person share, Venmo link. Nobody argues later.',
      cta: 'Set up splits',
      href: '/editor',
      tone: 'lavender',
      icon: 'gift',
    },
    {
      title: 'Vote on the night',
      body: 'Ask the group which bar, which activity. Tally updates live.',
      cta: 'Add a vote',
      href: '/editor',
      tone: 'sage',
      icon: 'users',
    },
  ],
  'bachelorette-party': [
    {
      title: 'Plan the itinerary',
      body: 'Block the days. Drag to reorder. Guests only see what you want them to.',
      cta: 'Open itinerary',
      href: '/editor',
      tone: 'peach',
      icon: 'pin',
    },
    {
      title: 'Split the cost',
      body: 'Line items, per-person share, Venmo link. Nobody argues later.',
      cta: 'Set up splits',
      href: '/editor',
      tone: 'lavender',
      icon: 'gift',
    },
    {
      title: 'Packing list',
      body: 'One checklist everyone can tick off.',
      cta: 'Add a list',
      href: '/editor',
      tone: 'sage',
      icon: 'grid',
    },
  ],
  'baby-shower': [
    {
      title: 'Set up the registry',
      body: 'Link one or many — Pear prefills the top-picked items from each.',
      cta: 'Add registry',
      href: '/editor',
      tone: 'peach',
      icon: 'gift',
    },
    {
      title: 'Open the advice wall',
      body: "Guests leave a note for the new parents. You moderate before it's live.",
      cta: 'Open advice wall',
      href: '/dashboard/submissions',
      tone: 'lavender',
      icon: 'heart',
    },
    {
      title: 'Name vote',
      body: 'Optional — collect suggestions the parents might love.',
      cta: 'Start a vote',
      href: '/editor',
      tone: 'sage',
      icon: 'users',
    },
  ],
  'bridal-shower': [
    {
      title: 'Registry, gently',
      body: 'Link the gift registries — Pear keeps the copy light.',
      cta: 'Add registry',
      href: '/editor',
      tone: 'peach',
      icon: 'gift',
    },
    {
      title: 'Advice for the couple',
      body: 'Ask guests for one line. Print them into a keepsake card.',
      cta: 'Open advice wall',
      href: '/dashboard/submissions',
      tone: 'lavender',
      icon: 'heart',
    },
    {
      title: 'Invite the circle',
      body: 'Design a save-the-date that matches the shower.',
      cta: 'Open invite designer',
      href: '/dashboard/invite',
      tone: 'sage',
      icon: 'image',
    },
  ],
  reunion: [
    {
      title: 'Room assignments',
      body: 'Who sleeps where. Drag guests to beds.',
      cta: 'Open rooms',
      href: '/editor',
      tone: 'peach',
      icon: 'pin',
    },
    {
      title: 'Then & now photos',
      body: 'One of each guest — past and present. A quiet highlight.',
      cta: 'Add photos',
      href: '/editor',
      tone: 'lavender',
      icon: 'image',
    },
    {
      title: 'Who’s who board',
      body: 'Face cards with names and roles so the newer cousins can keep up.',
      cta: 'Open who’s who',
      href: '/editor',
      tone: 'sage',
      icon: 'users',
    },
  ],
  'rehearsal-dinner': [
    {
      title: 'Toast signups',
      body: 'Open slots so the best man + parents + cousin all know where they stand.',
      cta: 'Open toast slots',
      href: '/editor',
      tone: 'peach',
      icon: 'mic',
    },
    {
      title: 'The menu',
      body: 'Courses, dietary flags, wine notes — all in one card.',
      cta: 'Add menu',
      href: '/editor',
      tone: 'cream',
      icon: 'grid',
    },
    {
      title: 'Intimate RSVP',
      body: 'Only the core group. Small list, simple fields.',
      cta: 'Check replies',
      href: '/dashboard/rsvp',
      tone: 'sage',
      icon: 'users',
    },
  ],
  graduation: [
    {
      title: 'School years recap',
      body: 'A short timeline — elementary through to today.',
      cta: 'Open story',
      href: '/editor',
      tone: 'lavender',
      icon: 'grid',
    },
    {
      title: 'Thank-you-to-teachers',
      body: 'A block guests can sign with a note.',
      cta: 'Open advice wall',
      href: '/dashboard/submissions',
      tone: 'peach',
      icon: 'heart',
    },
    {
      title: 'Open-house hours',
      body: 'Let people drop by on their own time — publish the window.',
      cta: 'Set hours',
      href: '/editor',
      tone: 'sage',
      icon: 'pin',
    },
  ],
  retirement: [
    {
      title: 'Career timeline',
      body: 'The milestones that got them here, told briefly.',
      cta: 'Open timeline',
      href: '/editor',
      tone: 'lavender',
      icon: 'grid',
    },
    {
      title: 'Tribute wall',
      body: 'Colleagues and family leave a note you can print as a keepsake.',
      cta: 'Open tributes',
      href: '/dashboard/submissions',
      tone: 'peach',
      icon: 'heart',
    },
    {
      title: 'Toast signups',
      body: 'The order for speeches. No one steps on the boss.',
      cta: 'Open toast slots',
      href: '/editor',
      tone: 'sage',
      icon: 'mic',
    },
  ],
  anniversary: [
    {
      title: 'Next chapter',
      body: 'Pear drafts a new chapter each year looking back and forward.',
      cta: 'Preview this year',
      href: '/dashboard/keepsakes',
      tone: 'peach',
      icon: 'heart',
    },
    {
      title: 'Year-by-year story',
      body: 'Edit how the story has grown since you started.',
      cta: 'Open story',
      href: '/editor',
      tone: 'lavender',
      icon: 'grid',
    },
    {
      title: 'Save-the-date',
      body: 'A vow renewal? A quiet dinner? Send a note either way.',
      cta: 'Design invite',
      href: '/dashboard/invite',
      tone: 'sage',
      icon: 'image',
    },
  ],
  'bar-mitzvah': [
    {
      title: 'Service program',
      body: 'Order of the ceremony, aliyot, and who’s doing what.',
      cta: 'Open program',
      href: '/editor',
      tone: 'lavender',
      icon: 'grid',
    },
    {
      title: 'Candle-lighting order',
      body: 'Name the thirteen, in the order they’ll be called.',
      cta: 'Open order',
      href: '/editor',
      tone: 'peach',
      icon: 'users',
    },
    {
      title: 'Dress code + map',
      body: 'So no one shows up in jeans at the synagogue.',
      cta: 'Add details',
      href: '/editor',
      tone: 'sage',
      icon: 'pin',
    },
  ],
  'bat-mitzvah': [
    {
      title: 'Service program',
      body: 'Order of the ceremony, aliyot, and who’s doing what.',
      cta: 'Open program',
      href: '/editor',
      tone: 'lavender',
      icon: 'grid',
    },
    {
      title: 'Candle-lighting order',
      body: 'Name the thirteen, in the order they’ll be called.',
      cta: 'Open order',
      href: '/editor',
      tone: 'peach',
      icon: 'users',
    },
    {
      title: 'Dress code + map',
      body: 'So no one shows up in jeans at the synagogue.',
      cta: 'Add details',
      href: '/editor',
      tone: 'sage',
      icon: 'pin',
    },
  ],
  quinceanera: [
    {
      title: 'Court of honor',
      body: 'Damas y chambelanes — the names, the pairings.',
      cta: 'Open court',
      href: '/editor',
      tone: 'lavender',
      icon: 'users',
    },
    {
      title: 'Waltz + traditions',
      body: 'Last doll, heels ceremony, father-daughter waltz.',
      cta: 'Open traditions',
      href: '/editor',
      tone: 'peach',
      icon: 'grid',
    },
    {
      title: 'Dress code',
      body: 'Gown and suit palette — guests need to know.',
      cta: 'Add dress code',
      href: '/editor',
      tone: 'sage',
      icon: 'pin',
    },
  ],
  'milestone-birthday': [
    {
      title: 'Year-in-review',
      body: 'The decade, told as a story.',
      cta: 'Open story',
      href: '/editor',
      tone: 'peach',
      icon: 'grid',
    },
    {
      title: 'Toast signups',
      body: 'Slots for the speech order — keep it short and sweet.',
      cta: 'Open toast slots',
      href: '/editor',
      tone: 'lavender',
      icon: 'mic',
    },
    {
      title: 'Photo timeline',
      body: 'One photo per year. Invite the circle to submit too.',
      cta: 'Open gallery',
      href: '/dashboard/gallery',
      tone: 'sage',
      icon: 'image',
    },
  ],
};

const DEFAULT_KICKOFF: KickoffCard[] = [
  {
    title: 'Let Pear draft it',
    body: 'Answer a few questions and Pear will build your site.',
    cta: 'Try Pear Assistant',
    href: '/wizard/new?mode=pear',
    tone: 'lavender',
    icon: 'pear',
  },
  {
    title: 'Start with photos',
    body: "Upload a few favorites and we'll build a beautiful first draft.",
    cta: 'Upload photos',
    href: '/dashboard/gallery',
    tone: 'peach',
    icon: 'image',
  },
  {
    title: 'Browse templates',
    body: 'Explore beautifully designed starting points.',
    cta: 'Browse templates',
    href: '/templates',
    tone: 'sage',
    icon: 'grid',
  },
];

export function getKickoffCards(occasion?: string | null): KickoffCard[] {
  if (!occasion) return DEFAULT_KICKOFF;
  const preset = KICKOFF_BY_OCCASION[occasion as SiteOccasion];
  return preset ?? DEFAULT_KICKOFF;
}

// Pear's voice shifts per occasion — this is the headline the
// dashboard uses in the "Let's get you going" eyebrow.
export function getKickoffEyebrow(occasion?: string | null): string {
  const e = getEventType(occasion as SiteOccasion | null | undefined);
  if (!e) return "Let's get you going";
  switch (e.voice) {
    case 'solemn':
      return 'A gentle start';
    case 'intimate':
      return 'Where to begin';
    case 'ceremonial':
      return "Today's next steps";
    case 'playful':
      return 'The good stuff';
    case 'celebratory':
    default:
      return "Let's get you going";
  }
}

export function getEventTypeOrNull(occasion?: string | null): EventType | null {
  return getEventType(occasion as SiteOccasion | null | undefined);
}

// ── Director timeline stages ─────────────────────────────────
// Every occasion has its own cadence. Weddings plan 6 months out;
// bachelor parties 4–8 weeks; memorials are almost always under
// two weeks. Stages are declared in days-before-event.

export interface TimelineStage {
  off: number;    // days before event
  label: string;
  p: number;      // percent along the rail (0-100) for visual placement
  accent: 'olive' | 'gold' | 'terra' | 'plum' | 'stone' | 'ink';
}

const WEDDING_TIMELINE: TimelineStage[] = [
  { p: 4,  off: 180, label: 'Start here',       accent: 'olive' },
  { p: 22, off: 120, label: 'Save the dates',   accent: 'olive' },
  { p: 42, off: 90,  label: 'Invitations out',  accent: 'olive' },
  { p: 62, off: 45,  label: 'Menu + seating',   accent: 'terra' },
  { p: 82, off: 14,  label: 'Rehearsal week',   accent: 'stone' },
  { p: 96, off: 0,   label: 'The day',          accent: 'ink' },
];

const BACHELOR_TIMELINE: TimelineStage[] = [
  { p: 4,  off: 60, label: 'Set the dates',      accent: 'olive' },
  { p: 22, off: 42, label: 'Lock accommodations',accent: 'olive' },
  { p: 42, off: 28, label: 'Invite the crew',    accent: 'olive' },
  { p: 62, off: 14, label: 'Activity votes in',  accent: 'gold' },
  { p: 82, off: 3,  label: 'Cost split settled', accent: 'terra' },
  { p: 96, off: 0,  label: 'Weekend starts',     accent: 'ink' },
];

const MEMORIAL_TIMELINE: TimelineStage[] = [
  { p: 6,  off: 10, label: 'Gather details',      accent: 'olive' },
  { p: 26, off: 7,  label: 'Write the obituary',  accent: 'olive' },
  { p: 46, off: 5,  label: 'Share with family',   accent: 'olive' },
  { p: 66, off: 3,  label: 'Confirm service',     accent: 'stone' },
  { p: 86, off: 1,  label: 'Final touches',       accent: 'stone' },
  { p: 96, off: 0,  label: 'The service',         accent: 'ink' },
];

const SHOWER_TIMELINE: TimelineStage[] = [
  { p: 4,  off: 60, label: 'Pick a date',         accent: 'olive' },
  { p: 22, off: 42, label: 'Send invites',        accent: 'olive' },
  { p: 42, off: 28, label: 'Menu + decor',        accent: 'olive' },
  { p: 62, off: 14, label: 'RSVPs close',         accent: 'gold' },
  { p: 82, off: 7,  label: 'Confirm details',     accent: 'terra' },
  { p: 96, off: 0,  label: 'Party day',           accent: 'ink' },
];

const REUNION_TIMELINE: TimelineStage[] = [
  { p: 4,  off: 120, label: 'Pick the weekend',   accent: 'olive' },
  { p: 20, off: 90,  label: 'Venue + rooms',      accent: 'olive' },
  { p: 40, off: 60,  label: 'Invites + RSVPs',    accent: 'olive' },
  { p: 60, off: 30,  label: 'Room assignments',   accent: 'gold' },
  { p: 80, off: 14,  label: 'T-shirts + merch',   accent: 'terra' },
  { p: 96, off: 0,   label: 'First arrival',      accent: 'ink' },
];

const BIRTHDAY_TIMELINE: TimelineStage[] = [
  { p: 4,  off: 60, label: 'Start planning',      accent: 'olive' },
  { p: 22, off: 30, label: 'Invite the circle',   accent: 'olive' },
  { p: 42, off: 21, label: 'Venue + catering',    accent: 'olive' },
  { p: 62, off: 10, label: 'RSVPs close',         accent: 'gold' },
  { p: 82, off: 3,  label: 'Final touches',       accent: 'terra' },
  { p: 96, off: 0,  label: 'The day',             accent: 'ink' },
];

const RETIREMENT_TIMELINE: TimelineStage[] = [
  { p: 4,  off: 45, label: 'Plan the tribute',    accent: 'olive' },
  { p: 22, off: 30, label: 'Invite colleagues',   accent: 'olive' },
  { p: 42, off: 21, label: 'Collect stories',     accent: 'olive' },
  { p: 62, off: 10, label: 'Toast signups',       accent: 'gold' },
  { p: 82, off: 3,  label: 'Final touches',       accent: 'terra' },
  { p: 96, off: 0,  label: 'The celebration',     accent: 'ink' },
];

const GRADUATION_TIMELINE: TimelineStage[] = [
  { p: 4,  off: 45, label: 'Mark the season',     accent: 'olive' },
  { p: 22, off: 30, label: 'Invite family',       accent: 'olive' },
  { p: 42, off: 21, label: 'Open-house hours',    accent: 'olive' },
  { p: 62, off: 10, label: 'RSVPs in',            accent: 'gold' },
  { p: 82, off: 3,  label: 'Prep the space',      accent: 'terra' },
  { p: 96, off: 0,  label: 'Graduation day',      accent: 'ink' },
];

const CEREMONY_TIMELINE: TimelineStage[] = [
  { p: 4,  off: 90, label: 'Secure the date',     accent: 'olive' },
  { p: 22, off: 60, label: 'Ceremony prep',       accent: 'olive' },
  { p: 42, off: 42, label: 'Invite guests',       accent: 'olive' },
  { p: 62, off: 21, label: 'Program + readings',  accent: 'gold' },
  { p: 82, off: 7,  label: 'Rehearsal week',      accent: 'stone' },
  { p: 96, off: 0,  label: 'The ceremony',        accent: 'ink' },
];

export function getDirectorTimeline(occasion?: string | null): TimelineStage[] {
  const e = getEventType(occasion as SiteOccasion | null | undefined);
  if (!e) return WEDDING_TIMELINE;
  switch (e.rsvpPreset) {
    case 'memorial':
      return MEMORIAL_TIMELINE;
    case 'bachelor':
      return BACHELOR_TIMELINE;
    case 'shower':
      return SHOWER_TIMELINE;
    case 'reunion':
      return REUNION_TIMELINE;
    case 'milestone':
      if (e.id === 'retirement') return RETIREMENT_TIMELINE;
      if (e.id === 'graduation') return GRADUATION_TIMELINE;
      return BIRTHDAY_TIMELINE;
    case 'cultural':
      return CEREMONY_TIMELINE;
    case 'casual':
      return BIRTHDAY_TIMELINE;
    case 'wedding':
    default:
      return WEDDING_TIMELINE;
  }
}

// ── Analytics copy ───────────────────────────────────────────

export function getAnalyticsCopy(occasion?: string | null): {
  title: string;
  italic: string;
  body: string;
} {
  const e = getEventType(occasion as SiteOccasion | null | undefined);
  const preset = e?.rsvpPreset ?? 'wedding';
  switch (preset) {
    case 'memorial':
      return {
        title: 'Quiet',
        italic: 'signals.',
        body: 'Who visited, which memories were read most. Nothing invasive — just enough to know the site reached the right people.',
      };
    case 'bachelor':
      return {
        title: 'Who clicked',
        italic: 'what.',
        body: 'Itinerary clicks, cost-split views, and activity-vote engagement. Know who’s paying attention before the group chat does.',
      };
    case 'shower':
      return {
        title: 'Gentle',
        italic: 'readings.',
        body: 'Registry clicks, advice submissions, and which pages guests linger on.',
      };
    case 'reunion':
      return {
        title: 'Who’s watching',
        italic: 'what.',
        body: 'Room-assignment pageviews, then-and-now engagement, and who’s clicked the itinerary most.',
      };
    case 'milestone':
    case 'casual':
      return {
        title: 'Quiet',
        italic: 'numbers.',
        body: 'Visits, devices, and which moments got the most attention.',
      };
    case 'cultural':
      return {
        title: 'Ceremony',
        italic: 'readings.',
        body: 'Program views, family details engagement, and travel-logistics clicks.',
      };
    case 'wedding':
    default:
      return {
        title: 'Quiet',
        italic: 'numbers,',
        body: 'Privacy-respecting signals — visits, devices, and the sections your guests dwell on. No creepy trackers.',
      };
  }
}

// Occasion-aware hints for which sections to watch. The Analytics
// page uses this to annotate the scroll-depth list.
export function getAnalyticsSectionsToWatch(occasion?: string | null): string[] {
  const e = getEventType(occasion as SiteOccasion | null | undefined);
  const preset = e?.rsvpPreset ?? 'wedding';
  switch (preset) {
    case 'memorial':
      return ['obituary', 'tributeWall', 'livestream', 'program'];
    case 'bachelor':
      return ['itinerary', 'costSplitter', 'activityVote', 'packingList'];
    case 'shower':
      return ['registry', 'adviceWall', 'rsvp', 'gallery'];
    case 'reunion':
      return ['itinerary', 'rooms', 'thenAndNow', 'whosWho'];
    case 'wedding':
      return ['story', 'rsvp', 'registry', 'travel', 'gallery'];
    case 'cultural':
      return ['program', 'event', 'travel', 'rsvp'];
    default:
      return ['story', 'rsvp', 'gallery', 'event'];
  }
}

// ── Remember page sections ───────────────────────────────────

export interface RememberSection {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  tone: 'sage' | 'peach' | 'lavender' | 'cream';
  icon: 'image' | 'mic' | 'heart' | 'gift' | 'grid' | 'users';
}

const REMEMBER_WEDDING: RememberSection[] = [
  { id: 'reel',    title: 'The highlight reel',  body: 'Pear cuts a short film from the photos guests shared.',     ctaLabel: 'Open reel',       ctaHref: '/dashboard/gallery', tone: 'peach',    icon: 'image' },
  { id: 'toasts',  title: 'Voice toasts',        body: 'Guests left spoken notes — an audio keepsake.',              ctaLabel: 'Listen',          ctaHref: '/dashboard/submissions?kind=toast', tone: 'lavender', icon: 'mic' },
  { id: 'thanks',  title: 'Thank-you notes',     body: 'Pear drafts a personal note for every guest who came.',       ctaLabel: 'Draft notes',     ctaHref: '/dashboard/keepsakes', tone: 'sage',    icon: 'heart' },
  { id: 'anniv',   title: 'Anniversary nudges',  body: 'A new chapter each year on the day. Looking back, looking forward.', ctaLabel: 'Preview',   ctaHref: '/dashboard/keepsakes', tone: 'cream',   icon: 'gift' },
];

const REMEMBER_MEMORIAL: RememberSection[] = [
  { id: 'tributes',title: 'Tribute wall',        body: 'Every memory guests shared — a living archive.',             ctaLabel: 'Open wall',       ctaHref: '/dashboard/submissions?kind=tribute', tone: 'lavender', icon: 'heart' },
  { id: 'reel',    title: 'Memorial reel',       body: 'A gentle montage of the photos and memories submitted.',     ctaLabel: 'Open reel',       ctaHref: '/dashboard/gallery', tone: 'sage',    icon: 'image' },
  { id: 'archive', title: 'Print the archive',   body: 'Export the obituary + tributes as a bound keepsake book.',   ctaLabel: 'Export book',     ctaHref: '/dashboard/keepsakes', tone: 'cream',   icon: 'grid' },
  { id: 'donations',title:'Donations summary',   body: 'A summary of donations made in memory, if any.',             ctaLabel: 'View summary',    ctaHref: '/dashboard/analytics', tone: 'peach',   icon: 'gift' },
];

const REMEMBER_BACHELOR: RememberSection[] = [
  { id: 'reel',    title: 'Weekend reel',        body: 'Every photo and clip the crew shared — one short film.',     ctaLabel: 'Open reel',       ctaHref: '/dashboard/gallery', tone: 'peach',    icon: 'image' },
  { id: 'costs',   title: 'Final cost split',    body: 'Settle up with the group — who owes what, who paid.',        ctaLabel: 'Open split',      ctaHref: '/editor', tone: 'lavender', icon: 'gift' },
  { id: 'votes',   title: 'The winners',         body: 'Which bar, which activity, which dare — the crew voted.',    ctaLabel: 'See results',     ctaHref: '/dashboard/submissions?kind=vote', tone: 'sage',    icon: 'users' },
  { id: 'thanks',  title: 'Thanks from the crew',body: 'Short notes the groom can send to each attendee.',           ctaLabel: 'Draft notes',     ctaHref: '/dashboard/keepsakes', tone: 'cream',   icon: 'heart' },
];

const REMEMBER_SHOWER: RememberSection[] = [
  { id: 'advice',  title: 'Advice for the couple',body: 'Every note guests left — printable as a keepsake card.',    ctaLabel: 'Open advice',     ctaHref: '/dashboard/submissions?kind=advice', tone: 'lavender', icon: 'heart' },
  { id: 'reel',    title: 'Shower reel',          body: 'Gentle montage of the afternoon.',                          ctaLabel: 'Open reel',       ctaHref: '/dashboard/gallery', tone: 'peach',    icon: 'image' },
  { id: 'thanks',  title: 'Thank-you notes',      body: 'One for each guest who brought something, and each who came.', ctaLabel: 'Draft notes', ctaHref: '/dashboard/keepsakes', tone: 'sage',    icon: 'mic' },
];

const REMEMBER_REUNION: RememberSection[] = [
  { id: 'reel',      title: 'Weekend reel',       body: 'Every reunion photo — the trip told in one montage.',        ctaLabel: 'Open reel',       ctaHref: '/dashboard/gallery', tone: 'peach',    icon: 'image' },
  { id: 'thenNow',   title: 'Then & now',          body: 'Past and present side by side — for the yearbook.',         ctaLabel: 'See pairs',       ctaHref: '/editor', tone: 'lavender', icon: 'grid' },
  { id: 'whosWho',   title: 'Who was there',       body: 'A printable roster of everyone who came, with notes.',      ctaLabel: 'Export roster',   ctaHref: '/dashboard/keepsakes', tone: 'sage',    icon: 'users' },
  { id: 'nextYear',  title: 'Lock next year',      body: 'Start the next reunion now while everyone’s in touch.',    ctaLabel: 'Start next',      ctaHref: '/wizard/new',   tone: 'cream',   icon: 'heart' },
];

export function getRememberSections(occasion?: string | null): RememberSection[] {
  const e = getEventType(occasion as SiteOccasion | null | undefined);
  const preset = e?.rsvpPreset ?? 'wedding';
  switch (preset) {
    case 'memorial': return REMEMBER_MEMORIAL;
    case 'bachelor': return REMEMBER_BACHELOR;
    case 'shower':   return REMEMBER_SHOWER;
    case 'reunion':  return REMEMBER_REUNION;
    case 'wedding':
    default:         return REMEMBER_WEDDING;
  }
}

export function getRememberHeadline(occasion?: string | null): { eyebrow: string; title: string; italic: string; body: string } {
  const e = getEventType(occasion as SiteOccasion | null | undefined);
  const preset = e?.rsvpPreset ?? 'wedding';
  switch (preset) {
    case 'memorial':
      return {
        eyebrow: 'After the service',
        title: 'A lasting',
        italic: 'keepsake.',
        body: 'The tribute wall lives on. Pear helps you print it, archive it, and share it with family who couldn’t be there.',
      };
    case 'bachelor':
      return {
        eyebrow: 'After the weekend',
        title: 'The',
        italic: 'receipts.',
        body: 'Reel, cost split, and short thank-yous for everyone who made it.',
      };
    case 'shower':
      return {
        eyebrow: 'After the shower',
        title: 'Keepsakes',
        italic: 'to send.',
        body: 'Print the advice wall, send thank-yous, share the reel with the couple.',
      };
    case 'reunion':
      return {
        eyebrow: 'After the reunion',
        title: 'The',
        italic: 'yearbook.',
        body: 'A reel, a roster, and the seed of next year’s gathering.',
      };
    case 'wedding':
    default:
      return {
        eyebrow: 'Remember the day',
        title: 'The',
        italic: 'keepsakes.',
        body: 'Voice toasts, thank-you notes, anniversary nudges — everything after the day.',
      };
  }
}

// ── Keepsakes tools ──────────────────────────────────────────

export interface KeepsakeTool {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
  tone: 'sage' | 'peach' | 'lavender' | 'cream';
}

export function getKeepsakeTools(occasion?: string | null): KeepsakeTool[] {
  const e = getEventType(occasion as SiteOccasion | null | undefined);
  const preset = e?.rsvpPreset ?? 'wedding';
  switch (preset) {
    case 'memorial':
      return [
        { id: 'memoriam',  title: 'In-memoriam card',   body: 'A printed keepsake with the obituary and favourite photos.',      actionLabel: 'Design card',    actionHref: '/dashboard/invite',    tone: 'lavender' },
        { id: 'donations', title: 'Donation letter',    body: 'A short letter of thanks for anyone who gave in their memory.',   actionLabel: 'Draft letter',   actionHref: '#donations',           tone: 'cream' },
        { id: 'anniversary-nudge', title: 'Anniversary remembrance', body: 'Pear writes a short note each year on the date.', actionLabel: 'Preview this year', actionHref: '#anniversary', tone: 'peach' },
      ];
    case 'bachelor':
      return [
        { id: 'thanks',     title: 'Thanks from the crew', body: 'Short notes from the groom — one per guest.',                   actionLabel: 'Draft notes',    actionHref: '#thanks',              tone: 'peach' },
        { id: 'settleup',   title: 'Final cost settle-up', body: 'A summary of who paid what, who owes what.',                    actionLabel: 'Settle up',      actionHref: '/editor',              tone: 'lavender' },
      ];
    case 'shower':
      return [
        { id: 'thanks',    title: 'Thank-you notes',      body: 'One for each guest, with the gift they brought (if you know).', actionLabel: 'Draft notes',    actionHref: '#thanks',              tone: 'peach' },
        { id: 'advicecard',title: 'Advice keepsake card', body: 'Every piece of advice, printed as a card for the couple.',      actionLabel: 'Design card',    actionHref: '/dashboard/invite',    tone: 'lavender' },
      ];
    case 'reunion':
      return [
        { id: 'thanks',    title: 'Thanks + save-the-date',body: 'Thank this year’s group + save the date for next year.',       actionLabel: 'Draft both',     actionHref: '#thanks',              tone: 'peach' },
        { id: 'yearbook',  title: 'Yearbook export',      body: 'Print the who’s-who and then-and-now as a PDF booklet.',        actionLabel: 'Export',         actionHref: '#yearbook',            tone: 'sage' },
      ];
    case 'wedding':
    default:
      return [
        { id: 'thanks',    title: 'Thank-you notes',      body: 'Paste a guest list — Pear drafts a personalized note for each.', actionLabel: 'Draft notes',    actionHref: '#thanks',              tone: 'peach' },
        { id: 'anniversary-nudge', title: 'Anniversary nudge', body: 'Pear writes a new chapter each year on the anniversary.', actionLabel: 'Preview',         actionHref: '#anniversary',         tone: 'lavender' },
      ];
  }
}

// ── Submissions moderation kinds ─────────────────────────────

export interface SubmissionKindInfo {
  kind: string;
  label: string;      // shown in the UI
  emptyTitle: string; // empty-state title
  emptyBody: string;  // empty-state body
}

export function getSubmissionKinds(occasion?: string | null): SubmissionKindInfo[] {
  const e = getEventType(occasion as SiteOccasion | null | undefined);
  const preset = e?.rsvpPreset ?? 'wedding';
  const ALL: SubmissionKindInfo[] = [
    { kind: 'advice',  label: 'Advice',   emptyTitle: 'No advice yet.',  emptyBody: 'Guests leave notes here. Approve before they appear on the site.' },
    { kind: 'tribute', label: 'Tributes', emptyTitle: 'No tributes yet.', emptyBody: 'Stories and memories from guests will appear here for your review.' },
    { kind: 'toast',   label: 'Toasts',   emptyTitle: 'No toast signups yet.', emptyBody: 'As guests claim a toast slot, they show up here.' },
    { kind: 'vote',    label: 'Votes',    emptyTitle: 'No votes yet.',   emptyBody: 'Activity and preference votes are summarised here once guests weigh in.' },
  ];
  switch (preset) {
    case 'memorial': return ALL.filter((k) => k.kind === 'tribute' || k.kind === 'toast');
    case 'bachelor': return ALL.filter((k) => k.kind === 'vote' || k.kind === 'toast');
    case 'shower':   return ALL.filter((k) => k.kind === 'advice' || k.kind === 'vote');
    case 'reunion':  return ALL.filter((k) => k.kind === 'advice' || k.kind === 'vote' || k.kind === 'toast');
    case 'milestone':
    case 'casual':
    case 'cultural': return ALL.filter((k) => k.kind === 'advice' || k.kind === 'toast');
    case 'wedding':
    default:         return ALL;
  }
}

// Single-line label for the occasion — used in topbars.
export function occasionLabel(occasion?: string | null): string {
  if (!occasion) return 'Event';
  const e = getEventType(occasion as SiteOccasion | null | undefined);
  return e?.label ?? occasion.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
