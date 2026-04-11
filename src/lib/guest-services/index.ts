// ─────────────────────────────────────────────────────────────
// Pearloom / lib/guest-services/index.ts
// Guest services — meal selection, messaging, data export,
// registry tracking. Everything guests and hosts need.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest, MealOption, GuestBroadcast } from '@/types';
import { buildSiteUrl } from '@/lib/site-urls';

// ── Meal Selection ───────────────────────────────────────────

/**
 * Get meal summary for catering — count of each option selected.
 */
export function getMealSummary(
  rsvps: Array<{ mealPreference?: string; status: string }>,
  mealOptions: MealOption[],
): Array<{ option: MealOption; count: number }> {
  return mealOptions.map(option => ({
    option,
    count: rsvps.filter(r => r.status === 'attending' && r.mealPreference === option.id).length,
  }));
}

/**
 * Get dietary summary — aggregate all dietary needs.
 */
export function getDietarySummary(
  rsvps: Array<{ dietary?: string; status: string }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rsvps) {
    if (r.status !== 'attending' || !r.dietary) continue;
    const tags = r.dietary.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    for (const tag of tags) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Export meal data as CSV for caterer.
 */
export function exportMealCSV(
  guests: Array<{ name: string; email?: string; mealPreference?: string; dietary?: string; status: string }>,
  mealOptions: MealOption[],
): string {
  const optionMap = new Map(mealOptions.map(o => [o.id, o.name]));
  const header = 'Name,Email,Meal Selection,Dietary Notes,RSVP Status';
  const rows = guests
    .filter(g => g.status === 'attending')
    .map(g => {
      const meal = g.mealPreference ? (optionMap.get(g.mealPreference) || g.mealPreference) : 'Not selected';
      return `"${g.name}","${g.email || ''}","${meal}","${g.dietary || ''}","${g.status}"`;
    });
  return [header, ...rows].join('\n');
}

// ── Guest Data Export ────────────────────────────────────────

/**
 * Export full guest list as CSV.
 */
export function exportGuestListCSV(
  guests: Array<{
    name: string;
    email?: string;
    phone?: string;
    status: string;
    plusOne?: boolean;
    mealPreference?: string;
    dietary?: string;
    message?: string;
    table?: string;
  }>,
): string {
  const header = 'Name,Email,Phone,RSVP Status,Plus One,Meal,Dietary,Message,Table';
  const rows = guests.map(g =>
    `"${g.name}","${g.email || ''}","${g.phone || ''}","${g.status}","${g.plusOne ? 'Yes' : 'No'}","${g.mealPreference || ''}","${g.dietary || ''}","${(g.message || '').replace(/"/g, '""')}","${g.table || ''}"`
  );
  return [header, ...rows].join('\n');
}

/**
 * Export manifest as JSON for backup.
 */
export function exportManifestJSON(manifest: StoryManifest): string {
  return JSON.stringify(manifest, null, 2);
}

/**
 * Download a string as a file.
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Guest Messaging ──────────────────────────────────────────

/**
 * Send a broadcast message to all guests.
 */
export async function sendBroadcast(
  siteId: string,
  message: string,
  type: GuestBroadcast['type'],
  channel: GuestBroadcast['channel'],
): Promise<GuestBroadcast | null> {
  try {
    const res = await fetch('/api/messaging/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, message, type, channel }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Pre-built broadcast templates.
 */
export const BROADCAST_TEMPLATES = {
  'running-late': {
    message: "We're running a few minutes behind schedule. Thank you for your patience!",
    type: 'update' as const,
  },
  'venue-change': {
    message: 'Important: The venue has changed. Please check the site for updated directions.',
    type: 'emergency' as const,
  },
  'thank-you': {
    message: 'Thank you for celebrating with us! Check the site to browse photos and sign the guestbook.',
    type: 'thank-you' as const,
  },
  'photo-reminder': {
    message: 'Don\'t forget to upload your photos! We\'d love to see the celebration through your eyes.',
    type: 'reminder' as const,
  },
  'rsvp-reminder': {
    message: 'Friendly reminder: Please RSVP by the deadline if you haven\'t already.',
    type: 'reminder' as const,
  },
};

// ── Registry Tracking ────────────────────────────────────────

export interface GiftTracker {
  registryEntryId: string;
  itemName: string;
  purchasedBy?: string;
  purchasedAt?: number;
  amount?: number;
  thankedAt?: number;
}

/**
 * Get gift purchase summary.
 */
export function getGiftSummary(trackers: GiftTracker[]): {
  totalGifts: number;
  purchasedCount: number;
  totalAmount: number;
  thankedCount: number;
  pendingThankYous: GiftTracker[];
} {
  const purchased = trackers.filter(t => t.purchasedBy);
  return {
    totalGifts: trackers.length,
    purchasedCount: purchased.length,
    totalAmount: purchased.reduce((sum, t) => sum + (t.amount || 0), 0),
    thankedCount: purchased.filter(t => t.thankedAt).length,
    pendingThankYous: purchased.filter(t => !t.thankedAt),
  };
}

// ── SEO Utilities ────────────────────────────────────────────

/**
 * Generate JSON-LD structured data for a wedding/event site.
 */
export function generateJsonLd(
  manifest: StoryManifest,
  names: [string, string],
  domain: string,
): string {
  const displayName = names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0];
  const occasion = manifest.occasion || 'wedding';
  const eventDate = manifest.logistics?.date;
  const venue = manifest.logistics?.venue;

  const eventType = occasion === 'wedding' ? 'WeddingEvent'
    : occasion === 'birthday' ? 'SocialEvent'
    : 'Event';

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': eventType,
    name: `${displayName}'s ${occasion === 'wedding' ? 'Wedding' : occasion === 'birthday' ? 'Birthday' : 'Celebration'}`,
    url: buildSiteUrl(domain),
    description: manifest.poetry?.heroTagline || manifest.vibeString || '',
  };

  if (eventDate) {
    data.startDate = eventDate;
  }

  if (venue) {
    data.location = {
      '@type': 'Place',
      name: venue,
      address: manifest.logistics?.venueAddress || venue,
    };
  }

  if (occasion === 'wedding') {
    data.organizer = [
      { '@type': 'Person', name: names[0] },
      ...(names[1]?.trim() ? [{ '@type': 'Person', name: names[1] }] : []),
    ];
  }

  return JSON.stringify(data);
}

/**
 * Generate Twitter Card meta tags.
 */
export function getTwitterMeta(
  manifest: StoryManifest,
  names: [string, string],
  ogImageUrl: string,
): Array<{ name: string; content: string }> {
  const displayName = names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0];
  return [
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: `${displayName} — Pearloom` },
    { name: 'twitter:description', content: manifest.poetry?.heroTagline || manifest.vibeString || '' },
    { name: 'twitter:image', content: ogImageUrl },
  ];
}
