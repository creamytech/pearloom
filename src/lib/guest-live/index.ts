// ─────────────────────────────────────────────────────────────
// Pearloom / lib/guest-live/index.ts
// Guest Live Experience — QR code scanning, real-time photo
// feed, live updates, big screen mode, seat finder, timeline.
//
// This is Pearloom's viral growth engine. When guests at a
// wedding pull out their phones and see THIS, they ask
// "what app is this?" — and that's how we grow.
// ─────────────────────────────────────────────────────────────

import { buildSiteUrl } from '@/lib/site-urls';

// ── Types ────────────────────────────────────────────────────

export interface LiveEvent {
  id: string;
  siteId: string;
  /** Current event phase */
  phase: 'pre-ceremony' | 'ceremony' | 'cocktail-hour' | 'reception' | 'dancing' | 'send-off' | 'after-party';
  /** Live timeline items visible to guests */
  timeline: LiveTimelineItem[];
  /** Live photo stream */
  photoStream: LivePhoto[];
  /** Active announcements */
  announcements: LiveAnnouncement[];
  /** Big screen mode URL */
  bigScreenUrl: string;
  /** Is the event currently live? */
  isLive: boolean;
  /** Guest check-in count */
  checkedInCount: number;
}

export interface LiveTimelineItem {
  id: string;
  time: string; // "4:30 PM"
  title: string;
  description?: string;
  status: 'upcoming' | 'happening-now' | 'completed';
  /** Minutes until this item */
  minutesUntil?: number;
}

export interface LivePhoto {
  id: string;
  url: string;
  uploaderName: string;
  uploadedAt: number;
  /** Is this approved for big screen? */
  bigScreenApproved: boolean;
  /** Reactions from other guests */
  reactions: number;
  caption?: string;
}

export interface LiveAnnouncement {
  id: string;
  message: string;
  type: 'info' | 'alert' | 'celebration';
  createdAt: number;
  /** Auto-dismiss after seconds (0 = manual) */
  dismissAfter: number;
}

// ── Guest Check-In ───────────────────────────────────────────

export interface GuestCheckIn {
  guestId: string;
  name: string;
  table?: string;
  seat?: string;
  checkedInAt: number;
  /** Device token for push notifications */
  pushToken?: string;
}

/**
 * Generate a QR code URL for guest check-in at the venue.
 */
export function getCheckInQrUrl(siteId: string, occasion?: string): string {
  return buildSiteUrl(siteId, '/live?checkin=true', undefined, occasion);
}

/**
 * Generate the big screen display URL.
 */
export function getBigScreenUrl(siteId: string, occasion?: string): string {
  return buildSiteUrl(siteId, '/live?mode=bigscreen', undefined, occasion);
}

// ── Live Timeline ────────────────────────────────────────────

/**
 * Default wedding timeline template.
 */
export function getDefaultTimeline(occasion: string): LiveTimelineItem[] {
  if (occasion === 'wedding') {
    return [
      { id: 'arrive', time: '3:30 PM', title: 'Guest Arrival', description: 'Welcome drinks in the garden', status: 'upcoming' },
      { id: 'ceremony', time: '4:00 PM', title: 'Ceremony', description: 'Please be seated by 3:55', status: 'upcoming' },
      { id: 'cocktail', time: '4:45 PM', title: 'Cocktail Hour', description: 'Drinks and canapés on the terrace', status: 'upcoming' },
      { id: 'reception', time: '6:00 PM', title: 'Dinner Reception', description: 'Please find your table', status: 'upcoming' },
      { id: 'speeches', time: '7:00 PM', title: 'Speeches & Toasts', status: 'upcoming' },
      { id: 'first-dance', time: '7:30 PM', title: 'First Dance', status: 'upcoming' },
      { id: 'cake', time: '8:00 PM', title: 'Cake Cutting', status: 'upcoming' },
      { id: 'dancing', time: '8:30 PM', title: 'Dancing', description: 'The floor is yours!', status: 'upcoming' },
      { id: 'sendoff', time: '11:00 PM', title: 'Sparkler Send-Off', status: 'upcoming' },
    ];
  }
  if (occasion === 'birthday') {
    return [
      { id: 'arrive', time: '6:00 PM', title: 'Doors Open', status: 'upcoming' },
      { id: 'dinner', time: '7:00 PM', title: 'Dinner', status: 'upcoming' },
      { id: 'cake', time: '8:30 PM', title: 'Birthday Cake', status: 'upcoming' },
      { id: 'party', time: '9:00 PM', title: 'Party Time', status: 'upcoming' },
    ];
  }
  return [
    { id: 'arrive', time: '5:00 PM', title: 'Arrival', status: 'upcoming' },
    { id: 'main', time: '6:00 PM', title: 'Main Event', status: 'upcoming' },
    { id: 'end', time: '10:00 PM', title: 'Event End', status: 'upcoming' },
  ];
}

// ── Photo Stream ─────────────────────────────────────────────

/**
 * Upload a photo to the live stream.
 */
export async function uploadLivePhoto(
  siteId: string,
  file: File,
  uploaderName: string,
  caption?: string,
): Promise<LivePhoto | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('siteId', siteId);
    formData.append('uploaderName', uploaderName);
    if (caption) formData.append('caption', caption);

    const res = await fetch('/api/guest-photos', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      url: data.url,
      uploaderName,
      uploadedAt: Date.now(),
      bigScreenApproved: false,
      reactions: 0,
      caption,
    };
  } catch {
    return null;
  }
}

/**
 * React to a live photo (heart reaction).
 */
export async function reactToPhoto(siteId: string, photoId: string): Promise<void> {
  try {
    await fetch('/api/guest-photos/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, photoId }),
    });
  } catch {}
}

// ── Announcements ────────────────────────────────────────────

/**
 * Send a live announcement to all checked-in guests.
 */
export async function sendLiveAnnouncement(
  siteId: string,
  message: string,
  type: LiveAnnouncement['type'] = 'info',
  dismissAfter: number = 30,
): Promise<void> {
  try {
    await fetch('/api/sites/live-updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, message, type, dismissAfter }),
    });
  } catch {}
}

/**
 * Pre-built announcement templates for the couple.
 */
export const LIVE_ANNOUNCEMENT_TEMPLATES = [
  { id: 'ceremony-start', message: 'The ceremony is about to begin. Please find your seats.', type: 'info' as const },
  { id: 'cocktail-hour', message: 'Cocktail hour! Head to the terrace for drinks and canapés.', type: 'celebration' as const },
  { id: 'dinner-seated', message: 'Dinner is being served. Please find your assigned table.', type: 'info' as const },
  { id: 'first-dance', message: 'The first dance is about to begin!', type: 'celebration' as const },
  { id: 'cake-cutting', message: 'Time for cake! Gather around for the cutting.', type: 'celebration' as const },
  { id: 'bouquet-toss', message: 'All the single ladies — bouquet toss time!', type: 'celebration' as const },
  { id: 'photos-upload', message: 'Don\'t forget to upload your photos! They\'ll appear on the big screen.', type: 'info' as const },
  { id: 'running-late', message: 'We\'re running a few minutes behind. Thank you for your patience!', type: 'alert' as const },
  { id: 'sendoff', message: 'Sparkler send-off in 10 minutes! Meet us at the front entrance.', type: 'celebration' as const },
  { id: 'thank-you', message: 'Thank you all for making tonight unforgettable. We love you!', type: 'celebration' as const },
];
