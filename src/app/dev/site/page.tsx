// Dev-only preview of the v8 published site renderer with a rich mock manifest.
// Hidden in production so the /sites/[domain] real flow is used instead.

import { notFound } from 'next/navigation';
import { SiteV8Renderer } from '@/components/pearloom/site/SiteV8Renderer';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

export default function SiteDevPreview() {
  if (process.env.NODE_ENV === 'production') notFound();

  const manifest = {
    occasion: 'wedding',
    themeFamily: 'v8',
    vibeString: 'warm, groovy, garden',
    poetry: {
      heroTagline:
        "After seven summers, one big move, a very patient golden retriever, and more road trips than we can count — we're finally doing the thing. We'd love you there.",
    },
    logistics: {
      date: '2025-06-22',
      time: '4:00 PM',
      venue: 'The Wildflower Barn · Portland, OR',
      venueAddress: '4721 Meadow Ln, Hillsboro, OR 97123',
      rsvpDeadline: '2025-05-20',
      dresscode: 'Garden party',
      notes: 'Soft colors. Block heels — it\'s grass.',
    },
    chapters: [
      {
        id: 'c1',
        order: 0,
        date: '2018-05-04',
        title: 'The spring we met',
        subtitle: 'Pearl District · Portland',
        description:
          "A friend's birthday, a crowded kitchen, and the worst dad joke that somehow worked. We closed the bar down talking about dumb stuff that mattered.",
        mood: 'warm',
        location: { lat: 0, lng: 0, label: 'Pearl District · Portland' },
        images: [],
      },
      {
        id: 'c2',
        order: 1,
        date: '2019-07-14',
        title: 'First road trip',
        subtitle: 'Olympic Peninsula',
        description: 'Ten days, two tents, one very bad thermos. We came back knowing.',
        mood: 'field',
        location: { lat: 0, lng: 0, label: 'Olympic Peninsula' },
        images: [],
      },
      {
        id: 'c3',
        order: 2,
        date: '2020-09-02',
        title: 'Built a life',
        subtitle: 'North Tabor, Portland',
        description:
          'We moved in together three months too early and it was exactly right. Painted the hallway "Sonoma fog."',
        mood: 'peach',
        location: { lat: 0, lng: 0, label: 'North Tabor, Portland' },
        images: [],
      },
      {
        id: 'c4',
        order: 3,
        date: '2023-10-22',
        title: 'The ring at Cannon Beach',
        subtitle: 'Oregon Coast',
        description: 'Jamie knelt down on the wrong knee. Alex said yes before the question finished.',
        mood: 'lavender',
        location: { lat: 0, lng: 0, label: 'Cannon Beach, OR' },
        images: [],
      },
      {
        id: 'c5',
        order: 4,
        date: '2025-06-22',
        title: 'Our forever, officially',
        subtitle: 'The Wildflower Barn',
        description: 'June 22 — come celebrate with us.',
        mood: 'peach',
        location: { lat: 0, lng: 0, label: 'The Wildflower Barn' },
        images: [],
      },
    ],
    mealOptions: [
      { id: 'm1', name: 'Short rib', dietaryTags: [] },
      { id: 'm2', name: 'Halibut', dietaryTags: [] },
      { id: 'm3', name: 'Garden plate', dietaryTags: ['vegetarian'] },
    ],
    registry: [
      { label: 'Honeymoon fund', url: 'https://example.com/honeymoon' },
      { label: 'Our kitchen', url: 'https://example.com/kitchen' },
      { label: 'Zola', url: 'https://zola.com/alex-jamie' },
    ],
  } as unknown as StoryManifest;

  return (
    <SiteV8Renderer
      manifest={manifest}
      names={['Alex', 'Jamie']}
      siteSlug="demo"
      prettyUrl="pearloom.com/wedding/alex-and-jamie"
    />
  );
}
