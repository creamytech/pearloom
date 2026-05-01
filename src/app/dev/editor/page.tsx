// Dev-only preview of the v8 block editor with a rich mock manifest so
// you can see every panel without a DB entry.

import { notFound } from 'next/navigation';
import { EditorV8 } from '@/components/pearloom/editor/EditorV8';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

export default function EditorDevPreview() {
  if (process.env.NODE_ENV === 'production') notFound();

  const manifest = {
    occasion: 'wedding',
    themeFamily: 'v8',
    vibeString: 'warm, groovy, garden',
    themeName: 'Groovy Ceremony',
    palette: 'groovy-garden',
    motif: 'pear',
    spacing: 'Comfortable',
    imagery: 'warm',
    poetry: {
      heroTagline:
        "After seven summers, one big move, a very patient golden retriever, and more road trips than we can count — we're finally doing the thing. We'd love you there.",
    },
    logistics: {
      date: '2025-06-22',
      time: '16:00',
      venue: 'The Wildflower Barn · Portland, OR',
      venueAddress: '4721 Meadow Ln, Hillsboro, OR 97123',
      rsvpDeadline: '2025-05-20',
      dresscode: 'Garden party',
      notes: "Soft colors. Block heels — it's grass.",
    },
    chapters: [
      {
        id: 'c1',
        order: 0,
        date: '2018-05-04',
        title: 'The spring we met',
        subtitle: 'Pearl District · Portland',
        description:
          "A friend's birthday, a crowded kitchen, and the worst dad joke that somehow worked.",
        mood: 'warm',
        location: { lat: 0, lng: 0, label: 'Pearl District · Portland' },
        images: [],
      },
      {
        id: 'c2',
        order: 1,
        date: '2023-10-22',
        title: 'The ring at Cannon Beach',
        subtitle: 'Oregon Coast',
        description: 'Jamie knelt down on the wrong knee. Alex said yes before the question finished.',
        mood: 'lavender',
        location: { lat: 0, lng: 0, label: 'Cannon Beach, OR' },
        images: [],
      },
    ],
    mealOptions: [
      { id: 'm1', name: 'Short rib', description: '', dietaryTags: [] },
      { id: 'm2', name: 'Halibut', description: '', dietaryTags: [] },
      { id: 'm3', name: 'Garden plate', description: '', dietaryTags: ['vegetarian'] },
    ],
    registry: [
      { id: 'r1', label: 'Honeymoon fund', url: 'https://honeyfund.com/x', description: 'Kyoto, October.', kind: 'fund' },
      { id: 'r2', label: 'Zola registry', url: 'https://zola.com/x', description: 'Kitchen + linens.', kind: 'registry' },
    ],
  } as unknown as StoryManifest;

  return (
    <EditorV8
      manifest={manifest}
      siteSlug="demo"
      names={['Alex', 'Jamie']}
      previewPathOverride="/dev/site"
    />
  );
}
