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
  searchParams: Promise<{ motifLayout?: string; motifKind?: string; kit?: string; atelier?: string; divider?: string; footer?: string; layouts?: string; occasion?: string; add?: string; long?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { motifLayout, motifKind, kit, atelier, divider, footer, layouts, occasion, add, long } = await searchParams;

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
