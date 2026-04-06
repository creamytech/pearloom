// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-preservation/index.ts
// Post-event memory engine — auto montage, "on this day"
// memories, print book generation, anniversary updates.
//
// The site becomes MORE valuable over time, not less.
// This is what makes Pearloom sticky after the event.
// ─────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────

export interface MemoryHighlight {
  id: string;
  type: 'photo' | 'guestbook-entry' | 'milestone' | 'anniversary';
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  /** For "on this day" notifications */
  yearsSince: number;
}

export interface PhotoBook {
  id: string;
  title: string;
  /** Cover photo URL */
  coverUrl: string;
  /** Number of pages */
  pageCount: number;
  /** Photos included */
  photoIds: string[];
  /** Layout style */
  layout: 'classic' | 'magazine' | 'minimal' | 'scrapbook';
  /** Print status */
  status: 'draft' | 'ready' | 'ordered' | 'shipped';
  /** Price in cents */
  price?: number;
  /** Order URL */
  orderUrl?: string;
  createdAt: number;
}

export interface AnniversaryUpdate {
  year: number;
  message: string;
  photos?: string[];
  createdAt: number;
}

// ── "On This Day" Memories ───────────────────────────────────

/**
 * Get "on this day" memories for the current date.
 * Returns highlights from past events that happened on this date.
 */
export function getOnThisDayMemories(
  eventDate: string,
  guestbookEntries: Array<{ message: string; author: string; createdAt: string }>,
  photos: Array<{ url: string; alt: string; date?: string }>,
): MemoryHighlight[] {
  const today = new Date();
  const event = new Date(eventDate);
  const yearsSince = today.getFullYear() - event.getFullYear();
  const isAnniversaryMonth = today.getMonth() === event.getMonth();
  const isAnniversaryDay = today.getDate() === event.getDate();

  const memories: MemoryHighlight[] = [];

  // Anniversary of the event
  if (isAnniversaryMonth && isAnniversaryDay && yearsSince > 0) {
    memories.push({
      id: 'anniversary',
      type: 'anniversary',
      title: `${yearsSince} Year${yearsSince > 1 ? 's' : ''} Ago Today`,
      description: 'On this day, something beautiful happened.',
      imageUrl: photos[0]?.url,
      date: eventDate,
      yearsSince,
    });
  }

  // Random guestbook highlight
  if (guestbookEntries.length > 0 && yearsSince > 0) {
    const random = guestbookEntries[Math.floor(Math.random() * guestbookEntries.length)];
    memories.push({
      id: 'guestbook-' + random.author,
      type: 'guestbook-entry',
      title: `A message from ${random.author}`,
      description: `"${random.message.slice(0, 120)}${random.message.length > 120 ? '...' : ''}"`,
      date: random.createdAt,
      yearsSince,
    });
  }

  // Photo memories
  if (photos.length > 3 && yearsSince > 0) {
    const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
    memories.push({
      id: 'photo-memory',
      type: 'photo',
      title: 'A moment to remember',
      description: randomPhoto.alt || 'From your celebration',
      imageUrl: randomPhoto.url,
      date: eventDate,
      yearsSince,
    });
  }

  return memories;
}

// ── Auto Photo Book ──────────────────────────────────────────

/**
 * Generate a photo book layout from event photos.
 */
export function generatePhotoBook(
  photos: Array<{ url: string; alt: string }>,
  title: string,
  layout: PhotoBook['layout'] = 'classic',
): PhotoBook {
  // Select best photos (up to 40 for a standard book)
  const selected = photos.slice(0, 40);

  return {
    id: `book-${Date.now()}`,
    title,
    coverUrl: selected[0]?.url || '',
    pageCount: Math.ceil(selected.length / 2) + 2, // +2 for cover pages
    photoIds: selected.map((_, i) => `photo-${i}`),
    layout,
    status: 'draft',
    createdAt: Date.now(),
  };
}

/**
 * Get print pricing for a photo book.
 */
export function getBookPricing(pageCount: number): {
  softcover: number;
  hardcover: number;
  premium: number;
} {
  const base = 2000; // $20 base
  const perPage = 100; // $1 per page

  return {
    softcover: base + pageCount * perPage,
    hardcover: base + pageCount * perPage + 1500,
    premium: base + pageCount * perPage + 3000,
  };
}

// ── Anniversary Email Content ────────────────────────────────

/**
 * Generate anniversary email content for a specific year.
 */
export function generateAnniversaryContent(
  year: number,
  coupleNames: string,
  guestCount: number,
  photoCount: number,
): {
  subject: string;
  heading: string;
  body: string;
  stats: Array<{ label: string; value: string }>;
} {
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const milestoneNames: Record<number, string> = {
    1: 'Paper', 5: 'Wood', 10: 'Tin', 15: 'Crystal',
    20: 'China', 25: 'Silver', 30: 'Pearl',
    40: 'Ruby', 50: 'Gold', 60: 'Diamond',
  };

  const milestone = milestoneNames[year];

  return {
    subject: `Happy ${ordinal(year)} Anniversary, ${coupleNames}!`,
    heading: milestone
      ? `Happy ${milestone} Anniversary`
      : `${ordinal(year)} Anniversary`,
    body: year === 1
      ? `One year ago, you celebrated something beautiful. Take a moment to revisit the photos, messages, and memories from that day.`
      : `${year} years of love, laughter, and everything in between. Revisit the celebration that started it all.`,
    stats: [
      { label: 'Years Together', value: String(year) },
      { label: 'Guests Who Celebrated', value: String(guestCount) },
      { label: 'Photos Captured', value: String(photoCount) },
      { label: 'Days of Love', value: String(year * 365) },
    ],
  };
}

// ── Site Transformation ──────────────────────────────────────

/**
 * Get the post-event site mode and display configuration.
 */
export function getPostEventSiteConfig(
  eventDate: string,
  hasPhotos: boolean,
  guestbookCount: number,
): {
  mode: 'countdown' | 'live' | 'thank-you' | 'memories' | 'anniversary';
  showThankYouBanner: boolean;
  showPhotoUploadCta: boolean;
  showGuestbookCta: boolean;
  showPrintBookCta: boolean;
  showAnniversaryBanner: boolean;
  heroText: string;
} {
  const now = new Date();
  const event = new Date(eventDate);
  const daysSince = Math.floor((now.getTime() - event.getTime()) / 86400000);
  const yearsSince = now.getFullYear() - event.getFullYear();
  const isAnniversary = yearsSince > 0 &&
    now.getMonth() === event.getMonth() &&
    now.getDate() === event.getDate();

  if (daysSince < 0) {
    return {
      mode: 'countdown',
      showThankYouBanner: false,
      showPhotoUploadCta: false,
      showGuestbookCta: false,
      showPrintBookCta: false,
      showAnniversaryBanner: false,
      heroText: 'Save the date',
    };
  }

  if (daysSince === 0) {
    return {
      mode: 'live',
      showThankYouBanner: false,
      showPhotoUploadCta: true,
      showGuestbookCta: true,
      showPrintBookCta: false,
      showAnniversaryBanner: false,
      heroText: 'Today is the day!',
    };
  }

  if (daysSince <= 14) {
    return {
      mode: 'thank-you',
      showThankYouBanner: true,
      showPhotoUploadCta: true,
      showGuestbookCta: true,
      showPrintBookCta: hasPhotos,
      showAnniversaryBanner: false,
      heroText: 'Thank you for celebrating with us',
    };
  }

  if (isAnniversary) {
    return {
      mode: 'anniversary',
      showThankYouBanner: false,
      showPhotoUploadCta: false,
      showGuestbookCta: true,
      showPrintBookCta: hasPhotos,
      showAnniversaryBanner: true,
      heroText: `${yearsSince} year${yearsSince > 1 ? 's' : ''} of love`,
    };
  }

  return {
    mode: 'memories',
    showThankYouBanner: false,
    showPhotoUploadCta: false,
    showGuestbookCta: guestbookCount < 20,
    showPrintBookCta: hasPhotos,
    showAnniversaryBanner: false,
    heroText: 'A celebration remembered',
  };
}
