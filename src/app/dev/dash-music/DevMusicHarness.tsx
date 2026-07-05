'use client';

// Dev-only sample harness for the restyled Music board. Feeds
// MusicBoard the same prop shape the real MusicDashboardClient
// does, with local state so Add / Skip / Set aside / Bring back
// all flip live — a faithful visual sign-off without needing auth
// or a seeded site. Hidden in production (the page guards it).

import { useState } from 'react';
import { MusicBoard } from '@/app/(shell)/dashboard/music/MusicDashboardClient';

type State = 'queued' | 'accepted' | 'hidden';
interface Row {
  id: string;
  guest_id: string | null;
  guest_name: string;
  song_title: string;
  artist: string | null;
  spotify_url: string | null;
  art_url?: string | null;
  preview_url?: string | null;
  note: string | null;
  state: State;
  created_at: string;
}

const now = Date.now();
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();

const SAMPLE: Row[] = [
  { id: '1', guest_id: null, guest_name: 'Maya Okafor', song_title: 'September', artist: 'Earth, Wind & Fire', spotify_url: 'https://open.spotify.com/track/2grjqo0Frpf2okIBiifQKs', art_url: null, preview_url: null, note: 'Aunt Rosa will lose it.', state: 'accepted', created_at: iso(2600) },
  { id: '2', guest_id: null, guest_name: 'Theo Marsh', song_title: 'Dreams', artist: 'Fleetwood Mac', spotify_url: null, art_url: null, preview_url: null, note: null, state: 'accepted', created_at: iso(2400) },
  { id: '3', guest_id: null, guest_name: 'June Halliday', song_title: 'At Last', artist: 'Etta James', spotify_url: 'https://open.spotify.com/track/1UpjQnyaCsH5rzwBt1Dp7t', art_url: null, preview_url: null, note: null, state: 'accepted', created_at: iso(1800) },
  { id: '4', guest_id: null, guest_name: 'the groomsmen', song_title: 'Dancing Queen', artist: 'ABBA', spotify_url: null, art_url: null, preview_url: null, note: 'Non-negotiable.', state: 'queued', created_at: iso(48) },
  { id: '5', guest_id: null, guest_name: 'Priya Nair', song_title: 'This Must Be the Place', artist: 'Talking Heads', spotify_url: 'https://open.spotify.com/track/4kLLWz7srcuLKA7Et40PQR', art_url: null, preview_url: null, note: null, state: 'queued', created_at: iso(120) },
  { id: '6', guest_id: null, guest_name: 'Auntie Rosa', song_title: 'Before I Let Go', artist: 'Frankie Beverly & Maze', spotify_url: null, art_url: null, preview_url: null, note: 'Play it before the cake!', state: 'queued', created_at: iso(300) },
  { id: '7', guest_id: null, guest_name: 'Anonymous', song_title: 'The Chicken Dance', artist: null, spotify_url: null, art_url: null, preview_url: null, note: null, state: 'hidden', created_at: iso(900) },
];

export function DevMusicHarness() {
  const [rows, setRows] = useState<Row[]>(SAMPLE);
  const setState = (id: string, next: State) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, state: next } : x)));

  return (
    <MusicBoard
      loading={false}
      siteReady
      songs={rows}
      busyId={null}
      error={null}
      spotifyUrl="https://open.spotify.com/playlist/37i9dQZF1DXcRXFNfZr7Tp"
      musicMode="approve"
      onSetState={setState}
    />
  );
}
