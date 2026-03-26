// ─────────────────────────────────────────────────────────────
// everglow / lib/db.ts — file-based JSON data store
// Simple persistence for the first site. Swap to Supabase later.
// ─────────────────────────────────────────────────────────────

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { SiteConfig, RsvpResponse, GalleryPhoto, WeddingEvent, FaqItem } from '@/types';

const DATA_DIR = path.join(process.cwd(), '.data');
const SITE_FILE = path.join(DATA_DIR, 'site.json');
const RSVPS_FILE = path.join(DATA_DIR, 'rsvps.json');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir();
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Default site config for ben & shauna ───
const DEFAULT_SITE: SiteConfig = {
  slug: 'ben-and-shauna',
  names: ['ben', 'shauna'],
  anniversaryDate: '2024-03-15',
  tagline: '730 days of laughter, love, and a lifetime to go.',
  vibeString: 'warm and golden, like a sunday morning',
  theme: {
    name: 'everglow-ivory',
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    colors: {
      background: '#faf9f6',
      foreground: '#1a1a1a',
      accent: '#c9a87c',
      accentLight: '#f5ead6',
      muted: '#8c8c8c',
      cardBg: '#ffffff',
    },
    borderRadius: '0.5rem',
  },
  manifest: null,
  events: [
    {
      id: 'evt-1',
      name: 'anniversary dinner',
      date: '2026-03-15',
      time: '7:00 PM',
      endTime: '10:00 PM',
      venue: 'our favorite restaurant',
      address: '123 love lane, fort lauderdale, fl',
      description: 'an intimate celebration of two years together.',
      dressCode: 'cocktail attire',
    },
  ],
  faqs: [
    { id: 'faq-1', question: 'what should I wear?', answer: 'cocktail attire — think elevated but comfortable. we want you to feel your best.', order: 0 },
    { id: 'faq-2', question: 'can I bring a plus one?', answer: 'absolutely! just make sure to include their name in your rsvp so we can plan accordingly.', order: 1 },
    { id: 'faq-3', question: 'is there parking available?', answer: 'yes, there\'s a complimentary parking garage attached to the venue. valet is also available.', order: 2 },
    { id: 'faq-4', question: 'what about dietary restrictions?', answer: 'we\'ve got you covered. please note any dietary needs in your rsvp and we\'ll make sure there are options for everyone.', order: 3 },
    { id: 'faq-5', question: 'can I share photos?', answer: 'yes please! head to the photos page to upload your pictures from the event. we\'d love to see everything through your eyes.', order: 4 },
  ],
  pages: [
    { id: 'pg-1', slug: 'our-story', label: 'our story', enabled: true, order: 0 },
    { id: 'pg-2', slug: 'details', label: 'details', enabled: true, order: 1 },
    { id: 'pg-3', slug: 'rsvp', label: 'rsvp', enabled: true, order: 2 },
    { id: 'pg-4', slug: 'photos', label: 'photos', enabled: true, order: 3 },
    { id: 'pg-5', slug: 'faq', label: 'faq', enabled: true, order: 4 },
  ],
  travelInfo: {
    airports: ['Fort Lauderdale–Hollywood International Airport (FLL)'],
    hotels: [
      {
        name: 'The Ritz-Carlton, Fort Lauderdale',
        address: '1 N Fort Lauderdale Beach Blvd',
        groupRate: '$249/night',
        notes: 'mention "everglow" for the group rate.',
      },
    ],
    parkingInfo: 'Complimentary parking available at the venue. Valet service available for $15.',
    directions: 'From I-95, take exit 29 toward Sunrise Blvd East. The venue is on the right after 2 miles.',
  },
  passwordProtected: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Public API ───

export async function getSiteConfig(): Promise<SiteConfig> {
  return readJson(SITE_FILE, DEFAULT_SITE);
}

export async function updateSiteConfig(updates: Partial<SiteConfig>): Promise<SiteConfig> {
  const current = await getSiteConfig();
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  await writeJson(SITE_FILE, updated);
  return updated;
}

export async function getRsvps(): Promise<RsvpResponse[]> {
  return readJson(RSVPS_FILE, []);
}

export async function addRsvp(rsvp: RsvpResponse): Promise<RsvpResponse> {
  const rsvps = await getRsvps();
  // Update if existing email, otherwise add
  const existingIndex = rsvps.findIndex((r) => r.email === rsvp.email);
  if (existingIndex >= 0) {
    rsvps[existingIndex] = rsvp;
  } else {
    rsvps.push(rsvp);
  }
  await writeJson(RSVPS_FILE, rsvps);
  return rsvp;
}

export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  return readJson(GALLERY_FILE, []);
}

export async function addGalleryPhoto(photo: GalleryPhoto): Promise<GalleryPhoto> {
  const photos = await getGalleryPhotos();
  photos.push(photo);
  await writeJson(GALLERY_FILE, photos);
  return photo;
}

export { DEFAULT_SITE };
