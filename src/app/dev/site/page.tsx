// Dev-only preview of the v8 published site renderer with a rich mock manifest.
// Hidden in production so the /sites/[domain] real flow is used instead.

import { notFound } from 'next/navigation';
import { PublishedSiteShell } from '@/components/pearloom/site/PublishedSiteShell';
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
    /* Events — exercises ThemedSchedule kit dispatcher. */
    events: [
      { id: 'e1', time: '3:00 PM', name: 'Arrive & settle', description: 'Park, find your seat, breathe in the meadow.' },
      { id: 'e2', time: '4:00 PM', name: 'Ceremony', description: 'Under the wildflower arch.' },
      { id: 'e3', time: '5:00 PM', name: 'Cocktails & golden hour', description: 'Photos, hors d’oeuvres, the band warms up.' },
      { id: 'e4', time: '6:30 PM', name: 'Dinner', description: 'Family-style. Short rib, halibut, garden plate.' },
      { id: 'e5', time: '8:30 PM', name: 'Dancing under string lights', description: 'Until they kick us out.' },
    ],
    /* Travel hotels — exercises ThemedTravel. */
    travelInfo: {
      hotels: [
        { name: 'The Allison Inn & Spa', address: '2525 Allison Ln, Newberg, OR', bookingUrl: 'https://example.com/allison', distance: '12 min drive', groupRate: 'Wildflower group rate · $185/night' },
        { name: 'Atticus Hotel', address: '375 NE Ford St, McMinnville, OR', bookingUrl: 'https://example.com/atticus', distance: '20 min drive', groupRate: 'Mention "Alex & Jamie"' },
      ],
    } as never,
    /* Registry as the modern object shape so ThemedRegistry renders. */
    registry: {
      message: "Your presence is the gift. If you'd like to give more, these are the things we're building toward.",
      entries: [
        { name: 'Honeymoon fund', url: 'https://example.com/honeymoon', note: "We're going somewhere with no Wi-Fi." },
        { name: 'Our kitchen', url: 'https://example.com/kitchen', note: 'The dream Le Creuset list.' },
        { name: 'Zola registry', url: 'https://zola.com/alex-jamie', note: 'Everything else.' },
      ],
    } as never,
    /* FAQs — exercises ThemedFaq kit dispatcher. */
    faqs: [
      { id: 'f1', question: 'What should I wear?', answer: 'Garden formal. Soft colors, block heels — it’s grass.' },
      { id: 'f2', question: 'Are kids welcome?', answer: 'Of course. There’s a kid corner with quiet activities by the dance floor.' },
      { id: 'f3', question: 'Can I bring a plus-one?', answer: 'Check your invite — if it says +1 you’re welcome to bring someone.' },
      { id: 'f4', question: 'Will dinner accommodate dietary needs?', answer: 'Yes. Vegetarian, vegan, and gluten-free options — note anything else in your RSVP.' },
    ],
    /* Wedding hashtag — exercises ThemedHashtag. */
    hashtags: ['AlexAndJamie2025'],
    /* Spotify playlist — exercises ThemedSpotify. */
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    spotifyPlaylistName: 'soundtrack',
  } as unknown as StoryManifest;

  return (
    <PublishedSiteShell
      manifest={manifest}
      names={['Alex', 'Jamie']}
      siteSlug="demo"
      prettyUrl="pearloom.com/wedding/alex-and-jamie"
    />
  );
}
