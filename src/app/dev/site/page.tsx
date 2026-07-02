// Dev-only preview of the published-site renderer using the shared
// showcase manifest (src/lib/demo-manifest.ts — same data /demo
// serves in production). Adds ?motifLayout= / ?motifKind= knobs for
// visual QA. Hidden in production so /demo is the public path.

import { notFound } from 'next/navigation';
import { PublishedSiteShell } from '@/components/pearloom/site/PublishedSiteShell';
import { DEMO_MANIFEST, DEMO_NAMES } from '@/lib/demo-manifest';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

/* ?add=nameVote,rooms,thenAndNow,honorList — appends Event-OS
   sections to blockOrder AND seeds each with QA fixture data (the
   demo manifest carries none; a published-mode section without
   data honestly renders nothing). Dev-only sample content — never
   part of DEMO_MANIFEST. */
const ADD_SECTION_SEEDS: Record<string, Record<string, unknown>> = {
  nameVote: {
    nameVote: { question: 'Help us pick the name', options: ['Juniper', 'Wren', 'August'], reveal: false },
  },
  rooms: {
    bachelor: {
      rooms: [
        { id: 'r1', name: 'Master suite', guests: 'Jane, Maya' },
        { id: 'r2', name: 'Garden room', guests: 'Priya, Soph' },
        { id: 'r3', name: 'The pull-out', guests: '' },
      ],
    },
  },
  thenAndNow: {
    thenAndNow: [
      { id: 't1', then: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600', now: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600', caption: 'Maya · 1998 / 2026' },
      { id: 't2', then: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600', now: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600', caption: 'The cousins, twenty summers apart' },
    ],
  },
  honorList: {
    weddingParty: [
      { id: 'p1', name: 'Maya Patel', role: 'other', relationship: 'Your cousin from Reno', order: 0 },
      { id: 'p2', name: 'Sam Ortiz', role: 'other', relationship: 'Organizer — ask him anything', order: 1 },
      { id: 'p3', name: 'June Bishop', role: 'other', relationship: 'The reason we all showed up', order: 2 },
    ],
  },
  groupChat: {
    bachelor: { groupChatUrl: 'https://chat.whatsapp.com/AbC123demo' },
  },
  itinerary: {
    itinerary: {
      days: [
        { id: 'd1', label: 'The arrival', date: 'Fri June 12', slots: [
          { id: 's1', time: '3:00 pm', title: 'Check in', detail: 'Keys at the front desk', location: 'The Lodge' },
          { id: 's2', time: '6:30 pm', title: 'Welcome drinks', location: 'The terrace' },
          { id: 's3', time: '9:00 pm', title: 'Bonfire', detail: 'Bring a layer' },
        ] },
        { id: 'd2', label: 'The big day', date: 'Sat June 13', slots: [
          { id: 's4', time: '10:00 am', title: 'Hike to the point', detail: 'Optional — 3 miles' },
          { id: 's5', time: '5:00 pm', title: 'Dinner', location: 'Under the oaks' },
        ] },
      ],
    },
  },
  menu: {
    menuSection: {
      intro: 'Dinner is served family-style under the oaks.',
      courses: [
        { id: 'c1', name: 'To begin', items: [
          { id: 'c1a', name: 'Garden greens', description: 'Shaved fennel, citrus, toasted seeds', tags: ['Vegan', 'GF'] },
          { id: 'c1b', name: 'Warm sourdough', description: 'Cultured butter, flaked salt', tags: ['Vegetarian'] },
        ] },
        { id: 'c2', name: 'The main', items: [
          { id: 'c2a', name: 'Roast chicken', description: 'Spring vegetables, pan jus', tags: ['GF'] },
          { id: 'c2b', name: 'Wild mushroom risotto', description: 'Parmesan, thyme', tags: ['Vegetarian'] },
        ] },
        { id: 'c3', name: 'To finish', items: [
          { id: 'c3a', name: 'Lemon olive-oil cake', description: 'Whipped mascarpone' },
        ] },
      ],
    },
  },
  dressCode: {
    dressCodeSection: {
      code: 'Garden formal',
      note: 'The ceremony is on a lawn — leave the stilettos home.',
      palette: ['#7A8A5C', '#C9BFA9', '#C19A4B'],
      examples: [
        { label: 'Linen suits', hint: 'light colors', photo: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600' },
        { label: 'Midi dresses', photo: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600' },
        { label: 'Block heels', hint: 'lawn-proof', photo: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600' },
        { label: 'No white' },
      ],
    },
  },
};

/* ?long=1 — stress fixture for the long-content paths: pads the
   FAQ past the twocol/cards clamp (8) and Day 1 past the stepper's
   5-per-line wrap. */
const LONG_FAQS = Array.from({ length: 7 }, (_, i) => ({
  id: `f-long-${i}`,
  question: `Stress question ${i + 1} — what about the thing nobody asked yet?`,
  answer: 'A short, real answer so the grid fills with believable copy instead of lorem.',
  order: 100 + i,
}));
const LONG_EVENTS = Array.from({ length: 8 }, (_, i) => ({
  id: `e-long-${i}`,
  name: `Moment ${i + 1}`,
  type: 'other',
  date: '',
  time: `${(9 + i) % 12 || 12}:00 ${9 + i < 12 ? 'am' : 'pm'}`,
  venue: 'The terrace',
  day: 1,
}));

export default async function SiteDevPreview({
  searchParams,
}: {
  searchParams: Promise<{ motifLayout?: string; motifKind?: string; kit?: string; atelier?: string; divider?: string; footer?: string; layouts?: string; occasion?: string; add?: string; long?: string; sub?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { motifLayout, motifKind, kit, atelier, divider, footer, layouts, occasion, add, long, sub } = await searchParams;

  /* ?layouts=rsvp:split,schedule:timeline — per-section variant
     overrides for visual QA of the alternate layouts. */
  const layoutOverrides: Record<string, string> = {};
  for (const pair of (layouts ?? '').split(',')) {
    const [section, variant] = pair.split(':').map((s) => s.trim());
    if (section && variant) layoutOverrides[section] = variant;
  }

  const demo = DEMO_MANIFEST as unknown as Record<string, unknown>;
  const added = (add ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const addedSeeds = added.reduce<Record<string, unknown>>(
    (acc, id) => ({ ...acc, ...(ADD_SECTION_SEEDS[id] ?? {}) }),
    {},
  );
  const manifest = {
    ...demo,
    ...(motifLayout ? { motifLayout } : {}),
    ...(motifKind ? { motifKind } : {}),
    ...(kit ? { kitId: kit } : {}),
    ...(atelier === '1' ? { atelier: true } : {}),
    ...(divider ? { dividerLook: divider } : {}),
    ...(footer ? { footerVariant: footer } : {}),
    ...(occasion ? { occasion } : {}),
    ...(added.length
      ? { ...addedSeeds, blockOrder: [...(demo.blockOrder as string[]), ...added] }
      : {}),
    /* ?sub=1 — details cards with the optional third-tuple subline
       (QA for the accordion/ledger/iconrow/bento subline paths). */
    ...(sub === '1'
      ? {
          detailsCards: [
            ['Dress code', 'Garden formal', 'Linen and light colors — the lawn is real grass.'],
            ['Parking', 'Valet on-site', 'Enter from Vine St; the lot opens at 3 pm.'],
            ['Kids welcome', 'Ages 10 +'],
            ['Gifts', 'Your presence is plenty', 'If you insist, the registry has ideas.'],
          ],
        }
      : {}),
    ...(long === '1'
      ? {
          faqs: [...(demo.faqs as unknown[]), ...LONG_FAQS],
          events: [...(demo.events as unknown[]), ...LONG_EVENTS],
        }
      : {}),
    ...(Object.keys(layoutOverrides).length
      ? { layouts: { ...(demo.layouts as Record<string, string>), ...layoutOverrides } }
      : {}),
  } as unknown as StoryManifest;

  return (
    <PublishedSiteShell
      manifest={manifest}
      names={DEMO_NAMES}
      siteSlug="demo"
      prettyUrl="pearloom.com/demo"
    />
  );
}
