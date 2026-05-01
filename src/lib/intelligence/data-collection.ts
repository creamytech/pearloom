// ─────────────────────────────────────────────────────────────
// Pearloom / lib/intelligence/data-collection.ts
// Data collection pipeline — captures every user action,
// preference signal, and quality metric to build Pearloom's
// proprietary AI advantage.
//
// This is the foundation of the data moat. Every site generated,
// every edit made, every guest interaction teaches The Loom
// to be better. Competitors can copy the UI but not the data.
// ─────────────────────────────────────────────────────────────

// ── Event Types ──────────────────────────────────────────────

export type EventCategory =
  | 'generation'     // AI generation events
  | 'editing'        // User editing behavior
  | 'design'         // Design/theme choices
  | 'guest'          // Guest interactions
  | 'engagement'     // Site visitor engagement
  | 'conversion'     // Funnel conversion events
  | 'quality';       // Output quality signals

export interface TrackingEvent {
  /** Unique event ID */
  id: string;
  /** Event category */
  category: EventCategory;
  /** Specific action */
  action: string;
  /** Site ID (anonymized) */
  siteId: string;
  /** Timestamp */
  timestamp: number;
  /** Event-specific data */
  data: Record<string, unknown>;
  /** Session ID */
  sessionId?: string;
}

// ── Generation Signals ───────────────────────────────────────
// What the AI generated vs what the user kept

export interface GenerationSignal {
  siteId: string;
  /** What the AI generated */
  generated: {
    chapterCount: number;
    chapterTitles: string[];
    vibeString: string;
    occasion: string;
    layoutFormat: string;
    colorPalette: string[];
    fontPair: [string, string];
    heroTagline: string;
    closingLine: string;
  };
  /** What the user changed (delta from generated) */
  userChanges: {
    titlesChanged: string[];    // which titles were edited
    titlesKept: string[];       // which titles stayed
    chaptersDeleted: number;    // chapters removed
    chaptersAdded: number;      // chapters added manually
    layoutChanged: boolean;     // did they change layout format?
    colorsChanged: boolean;     // did they change the palette?
    fontsChanged: boolean;      // did they change fonts?
    heroTaglineChanged: boolean;
    vibeStringEdited: boolean;
  };
  /** Quality indicators */
  quality: {
    /** Did the user publish the site? (strongest quality signal) */
    published: boolean;
    /** Time from generation to publish (shorter = better output) */
    timeToPublishMs: number | null;
    /** Number of edits before publishing */
    editCount: number;
    /** Did the user regenerate? (negative signal) */
    regenerated: boolean;
    /** Guest RSVP rate (if published) */
    rsvpRate: number | null;
    /** Site view count (if published) */
    viewCount: number | null;
  };
  timestamp: number;
}

// ── Design Preference Signals ────────────────────────────────

export interface DesignPreference {
  siteId: string;
  occasion: string;
  vibeWords: string[];
  /** Theme/palette chosen */
  palette: {
    background: string;
    accent: string;
    chosen: string; // theme ID or 'custom'
  };
  /** Font pair chosen */
  fonts: {
    heading: string;
    body: string;
    changed: boolean; // did they change from AI suggestion?
  };
  /** Layout format chosen */
  layout: string;
  /** Card border style */
  cardBorder: string;
  /** Photo frame style */
  photoFrame: string;
  /** Which blocks are visible */
  visibleBlocks: string[];
  /** Block order (position preferences) */
  blockOrder: string[];
  timestamp: number;
}

// ── Photo Intelligence Signals ───────────────────────────────

export interface PhotoSignal {
  siteId: string;
  /** Number of photos uploaded */
  photoCount: number;
  /** Number of clusters formed */
  clusterCount: number;
  /** Which photos were selected as hero */
  heroPhotoIndex: number;
  /** Photo quality distribution */
  qualityDistribution: {
    high: number;  // 8-10
    medium: number; // 5-7
    low: number;   // 1-4
  };
  /** Average emotional intensity */
  avgEmotionalIntensity: number;
  /** Dominant scene types */
  sceneTypes: Record<string, number>;
  /** Did user reorder photos? */
  reordered: boolean;
  /** Did user remove AI-selected photos? */
  removedAiSelections: number;
  timestamp: number;
}

// ── Guest Engagement Signals ─────────────────────────────────

export interface GuestEngagement {
  siteId: string;
  /** Total unique visitors */
  uniqueVisitors: number;
  /** RSVP conversion rate */
  rsvpRate: number;
  /** Average time on site (seconds) */
  avgTimeOnSite: number;
  /** Most viewed sections */
  sectionViews: Record<string, number>;
  /** Guestbook entry count */
  guestbookEntries: number;
  /** Photo uploads from guests */
  guestPhotoUploads: number;
  /** Device breakdown */
  devices: { mobile: number; desktop: number; tablet: number };
  /** Bounce rate */
  bounceRate: number;
  timestamp: number;
}

// ── Collection Functions ─────────────────────────────────────

const EVENT_QUEUE: TrackingEvent[] = [];
const FLUSH_INTERVAL = 30_000; // 30 seconds
const MAX_QUEUE_SIZE = 50;

/**
 * Track a single event. Events are batched and sent periodically.
 */
export function track(
  category: EventCategory,
  action: string,
  siteId: string,
  data: Record<string, unknown> = {},
): void {
  const event: TrackingEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category,
    action,
    siteId,
    timestamp: Date.now(),
    data,
  };

  EVENT_QUEUE.push(event);

  // Auto-flush when queue is full
  if (EVENT_QUEUE.length >= MAX_QUEUE_SIZE) {
    flushEvents();
  }
}

/**
 * Flush the event queue to the backend.
 */
export async function flushEvents(): Promise<void> {
  if (EVENT_QUEUE.length === 0) return;

  const events = EVENT_QUEUE.splice(0, EVENT_QUEUE.length);

  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
  } catch {
    // Re-queue failed events (but limit to prevent infinite growth)
    if (EVENT_QUEUE.length < MAX_QUEUE_SIZE * 2) {
      EVENT_QUEUE.push(...events);
    }
  }
}

// ── High-Level Tracking Functions ────────────────────────────

/**
 * Track when a site is generated.
 */
export function trackGeneration(signal: GenerationSignal): void {
  track('generation', 'site_generated', signal.siteId, {
    chapterCount: signal.generated.chapterCount,
    occasion: signal.generated.occasion,
    vibeString: signal.generated.vibeString,
    layoutFormat: signal.generated.layoutFormat,
    fontPair: signal.generated.fontPair,
  });
}

/**
 * Track when a user makes an edit.
 */
export function trackEdit(siteId: string, editType: string, details: Record<string, unknown> = {}): void {
  track('editing', editType, siteId, details);
}

/**
 * Track when a user changes design choices.
 */
export function trackDesignChoice(pref: DesignPreference): void {
  track('design', 'design_choice', pref.siteId, {
    occasion: pref.occasion,
    palette: pref.palette.chosen,
    fonts: `${pref.fonts.heading}/${pref.fonts.body}`,
    fontsChanged: pref.fonts.changed,
    layout: pref.layout,
    blockCount: pref.visibleBlocks.length,
  });
}

/**
 * Track when a site is published (strongest positive signal).
 */
export function trackPublish(siteId: string, editCount: number, timeToPublishMs: number): void {
  track('conversion', 'site_published', siteId, {
    editCount,
    timeToPublishMs,
    quality: editCount < 5 ? 'high' : editCount < 15 ? 'medium' : 'needs-improvement',
  });
}

/**
 * Track a chapter title being kept vs changed.
 */
export function trackTitlePreference(siteId: string, original: string, final: string, kept: boolean): void {
  track('generation', 'title_preference', siteId, {
    original,
    final,
    kept,
  });
}

/**
 * Track guest engagement on a published site.
 */
export function trackGuestEngagement(engagement: GuestEngagement): void {
  track('engagement', 'guest_engagement', engagement.siteId, {
    visitors: engagement.uniqueVisitors,
    rsvpRate: engagement.rsvpRate,
    avgTime: engagement.avgTimeOnSite,
    guestbookEntries: engagement.guestbookEntries,
    bounceRate: engagement.bounceRate,
  });
}

/**
 * Track when AI output is regenerated (negative quality signal).
 */
export function trackRegeneration(siteId: string, reason: string): void {
  track('quality', 'regenerated', siteId, { reason });
}

/**
 * Track photo selection preferences.
 */
export function trackPhotoPreferences(signal: PhotoSignal): void {
  track('generation', 'photo_preferences', signal.siteId, {
    photoCount: signal.photoCount,
    clusterCount: signal.clusterCount,
    heroPhotoIndex: signal.heroPhotoIndex,
    reordered: signal.reordered,
    removedAiSelections: signal.removedAiSelections,
    avgIntensity: signal.avgEmotionalIntensity,
  });
}

// ── Auto-flush on page unload ────────────────────────────────

if (typeof window !== 'undefined') {
  // Periodic flush
  setInterval(flushEvents, FLUSH_INTERVAL);

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    if (EVENT_QUEUE.length > 0) {
      // Use sendBeacon for reliable delivery on unload
      const data = JSON.stringify({ events: EVENT_QUEUE });
      navigator.sendBeacon('/api/analytics/events', data);
      EVENT_QUEUE.length = 0;
    }
  });
}
