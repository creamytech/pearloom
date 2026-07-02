// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/weekend-arcs.ts
//
// The Weekend Builder's catalog: which celebrations span a
// weekend of linked sites, and which satellite events surround
// each one. One anchor date, one set of names — every event
// becomes its own draft site, linked via manifest.celebration.
//
// A leaf data module (types + literals only) shared by the
// builder page (client) and /api/celebrations/weekend (server)
// so the two can never disagree about what an anchor offers.
//
// Deliberately absent: memorial / funeral. Those days are one
// site with an order of service, not a weekend of linked sites.
// ─────────────────────────────────────────────────────────────

export interface WeekendEventDef {
  /** The SiteOccasion the created site gets. */
  kind: string;
  label: string;
  /** Plain host language: when it happens and who it's for. */
  description: string;
  /** Default position relative to the anchor date (days). */
  offsetDays: number;
  /** Slug suffix — '' means this IS the anchor site. */
  sluffix: string;
  recommended?: boolean;
}

export interface WeekendAnchor {
  /** Anchor occasion id (SiteOccasion). */
  id: string;
  /** Picker card label, e.g. "Wedding weekend". */
  label: string;
  blurb: string;
  /** Label for the anchor date field, e.g. "Wedding date". */
  dateLabel: string;
  events: WeekendEventDef[];
}

/* Satellites almost every big day shares — the night-before
   gathering for out-of-towners and the long-goodbye brunch. */
const WELCOME = (description: string): WeekendEventDef => ({
  kind: 'welcome-party',
  label: 'Welcome party',
  description,
  offsetDays: -1,
  sluffix: 'welcome',
  recommended: true,
});
const BRUNCH: WeekendEventDef = {
  kind: 'brunch',
  label: 'Morning-after brunch',
  description: 'The morning after, for everyone who stayed — coffee, bagels, long goodbyes.',
  offsetDays: 1,
  sluffix: 'brunch',
  recommended: true,
};

export const WEEKEND_ANCHORS: WeekendAnchor[] = [
  {
    id: 'wedding',
    label: 'Wedding weekend',
    blurb: 'The whole arc — shower to send-off brunch.',
    dateLabel: 'Wedding date',
    events: [
      { kind: 'engagement', label: 'Engagement party', description: 'Months ahead — friends and family meet the news.', offsetDays: -180, sluffix: 'engagement' },
      { kind: 'bridal-shower', label: 'Bridal shower', description: 'An afternoon for her, usually hosted by the maid of honor.', offsetDays: -45, sluffix: 'shower' },
      { kind: 'bachelor-party', label: 'Bachelor party', description: 'The trip with the groom’s people — own guest list, own site.', offsetDays: -30, sluffix: 'bach' },
      { kind: 'bachelorette-party', label: 'Bachelorette party', description: 'The trip with the bride’s people — own guest list, own site.', offsetDays: -30, sluffix: 'bachelorette' },
      { kind: 'rehearsal-dinner', label: 'Rehearsal dinner', description: 'The night before — family and wedding party only.', offsetDays: -1, sluffix: 'rehearsal', recommended: true },
      WELCOME('Friday-night drinks for everyone who traveled in.'),
      { kind: 'wedding', label: 'The wedding', description: 'The main event — this is your primary site.', offsetDays: 0, sluffix: '', recommended: true },
      BRUNCH,
    ],
  },
  {
    id: 'quinceanera',
    label: 'Quinceañera weekend',
    blurb: 'Mass, reception, and the family around it.',
    dateLabel: 'Quinceañera date',
    events: [
      WELCOME('Family dinner the night before — out-of-town relatives land here.'),
      { kind: 'quinceanera', label: 'The quinceañera', description: 'Mass and reception — this is your primary site.', offsetDays: 0, sluffix: '', recommended: true },
      BRUNCH,
    ],
  },
  {
    id: 'bar-mitzvah',
    label: 'Bar mitzvah weekend',
    blurb: 'Shabbat dinner, the service, the party.',
    dateLabel: 'Bar mitzvah date',
    events: [
      WELCOME('Shabbat dinner for out-of-town family, the night before the service.'),
      { kind: 'bar-mitzvah', label: 'The bar mitzvah', description: 'Service and celebration — this is your primary site.', offsetDays: 0, sluffix: '', recommended: true },
      BRUNCH,
    ],
  },
  {
    id: 'bat-mitzvah',
    label: 'Bat mitzvah weekend',
    blurb: 'Shabbat dinner, the service, the party.',
    dateLabel: 'Bat mitzvah date',
    events: [
      WELCOME('Shabbat dinner for out-of-town family, the night before the service.'),
      { kind: 'bat-mitzvah', label: 'The bat mitzvah', description: 'Service and celebration — this is your primary site.', offsetDays: 0, sluffix: '', recommended: true },
      BRUNCH,
    ],
  },
  {
    id: 'milestone-birthday',
    label: 'Big birthday weekend',
    blurb: 'A 30th, 50th, 75th — done properly.',
    dateLabel: 'The birthday',
    events: [
      WELCOME('Kick-off drinks the night before, for early arrivals.'),
      { kind: 'milestone-birthday', label: 'The party', description: 'The main event — this is your primary site.', offsetDays: 0, sluffix: '', recommended: true },
      BRUNCH,
    ],
  },
  {
    id: 'anniversary',
    label: 'Anniversary weekend',
    blurb: 'A milestone year, celebrated over days.',
    dateLabel: 'Anniversary date',
    events: [
      WELCOME('Drinks the night before, for family who traveled.'),
      { kind: 'anniversary', label: 'The celebration', description: 'The main event — this is your primary site.', offsetDays: 0, sluffix: '', recommended: true },
      BRUNCH,
    ],
  },
  {
    id: 'graduation',
    label: 'Graduation weekend',
    blurb: 'The ceremony and the open house around it.',
    dateLabel: 'Graduation day',
    events: [
      WELCOME('Family dinner the night before the ceremony.'),
      { kind: 'graduation', label: 'The graduation', description: 'Ceremony and open house — this is your primary site.', offsetDays: 0, sluffix: '', recommended: true },
      BRUNCH,
    ],
  },
  {
    id: 'retirement',
    label: 'Retirement send-off',
    blurb: 'A career toasted across a weekend.',
    dateLabel: 'Party date',
    events: [
      WELCOME('Early arrivals and old colleagues, the night before.'),
      { kind: 'retirement', label: 'The send-off', description: 'The main event — this is your primary site.', offsetDays: 0, sluffix: '', recommended: true },
      BRUNCH,
    ],
  },
  {
    id: 'reunion',
    label: 'Reunion weekend',
    blurb: 'Everyone back in one place for a few days.',
    dateLabel: 'Main day',
    events: [
      WELCOME('Arrival night — casual, come as you land.'),
      { kind: 'reunion', label: 'The reunion', description: 'The big day — cookout, group photo, this is your primary site.', offsetDays: 0, sluffix: '', recommended: true },
      { kind: 'brunch', label: 'Farewell brunch', description: 'The morning after — one more round of coffee before everyone drives home.', offsetDays: 1, sluffix: 'brunch', recommended: true },
    ],
  },
];

export function weekendArcFor(anchor: string | null | undefined): WeekendAnchor {
  return WEEKEND_ANCHORS.find((a) => a.id === anchor) ?? WEEKEND_ANCHORS[0];
}
