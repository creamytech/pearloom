// ─────────────────────────────────────────────────────────────
// Pearloom / lib/post-event/index.ts
// Post-event experience system — transforms the site after
// the event date, enables memory revisiting, anniversary
// emails, and digital preservation.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

// ── Types ────────────────────────────────────────────────────

export interface PostEventConfig {
  /** Is the event in the past? */
  isPast: boolean;
  /** Days since the event */
  daysSince: number;
  /** Anniversary number (1, 2, 5, 10, etc.) */
  anniversaryYear: number | null;
  /** Is today the anniversary? */
  isAnniversary: boolean;
  /** Post-event mode to display */
  mode: 'pre-event' | 'day-of' | 'just-passed' | 'memories' | 'anniversary';
  /** Thank you message to show */
  thankYouMessage: string;
  /** Anniversary message */
  anniversaryMessage: string;
}

export interface AnniversaryEmail {
  to: string;
  subject: string;
  body: string;
  coupleNames: string;
  eventDate: string;
  siteUrl: string;
  year: number;
}

// ── Core Logic ───────────────────────────────────────────────

/**
 * Determine the post-event state for a site.
 */
export function getPostEventConfig(
  manifest: StoryManifest,
  names: [string, string],
): PostEventConfig {
  const eventDateStr = manifest.logistics?.date || manifest.events?.[0]?.date;
  if (!eventDateStr) {
    return { isPast: false, daysSince: 0, anniversaryYear: null, isAnniversary: false, mode: 'pre-event', thankYouMessage: '', anniversaryMessage: '' };
  }

  const eventDate = new Date(eventDateStr);
  const now = new Date();
  const diffMs = now.getTime() - eventDate.getTime();
  const daysSince = Math.floor(diffMs / 86400000);

  const displayName = names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0];
  const occasion = manifest.occasion || 'wedding';

  // Check anniversary
  const yearsSince = now.getFullYear() - eventDate.getFullYear();
  const isAnniversaryMonth = now.getMonth() === eventDate.getMonth();
  const isAnniversaryDay = now.getDate() === eventDate.getDate();
  const isAnniversary = yearsSince > 0 && isAnniversaryMonth && isAnniversaryDay;
  const anniversaryYear = yearsSince > 0 ? yearsSince : null;

  // Determine mode
  let mode: PostEventConfig['mode'];
  if (daysSince < 0) mode = 'pre-event';
  else if (daysSince === 0) mode = 'day-of';
  else if (daysSince <= 14) mode = 'just-passed';
  else if (isAnniversary) mode = 'anniversary';
  else mode = 'memories';

  // Thank you message
  const thankYouMessages: Record<string, string> = {
    wedding: `Thank you for celebrating our love with us. Every moment was magical because you were there.`,
    birthday: `Thank you for making this birthday so special. Your presence was the greatest gift.`,
    anniversary: `Thank you for celebrating this milestone with us. Here's to many more years together.`,
    engagement: `Thank you for sharing in our joy. We can't wait to celebrate the next chapter with you.`,
    story: `Thank you for being part of our story.`,
  };

  // Anniversary message
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const anniversaryMessage = anniversaryYear
    ? `${ordinal(anniversaryYear)} ${occasion === 'wedding' ? 'Wedding Anniversary' : 'Anniversary'} — ${displayName}`
    : '';

  return {
    isPast: daysSince >= 0,
    daysSince,
    anniversaryYear,
    isAnniversary,
    mode,
    thankYouMessage: thankYouMessages[occasion] || thankYouMessages.story,
    anniversaryMessage,
  };
}

/**
 * Generate anniversary email content.
 */
export function generateAnniversaryEmail(
  manifest: StoryManifest,
  names: [string, string],
  guestEmail: string,
  siteUrl: string,
): AnniversaryEmail | null {
  const config = getPostEventConfig(manifest, names);
  if (!config.anniversaryYear) return null;

  const displayName = names[1]?.trim() ? `${names[0]} & ${names[1]}` : names[0];
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const year = config.anniversaryYear;

  return {
    to: guestEmail,
    subject: `${displayName}'s ${ordinal(year)} Anniversary — Revisit the Memories`,
    body: [
      `Dear friend,`,
      ``,
      `${year === 1 ? 'One year ago today' : `${year} years ago today`}, ${displayName} celebrated a special moment — and you were part of it.`,
      ``,
      `Revisit the memories, browse the photos, and read the guestbook messages at:`,
      siteUrl,
      ``,
      `${manifest.poetry?.closingLine || 'With love and gratitude.'}`,
      ``,
      `— ${displayName}`,
    ].join('\n'),
    coupleNames: displayName,
    eventDate: manifest.logistics?.date || '',
    siteUrl,
    year,
  };
}

/**
 * Get the post-event banner content for the site.
 */
export function getPostEventBanner(config: PostEventConfig): {
  show: boolean;
  title: string;
  subtitle: string;
  icon: string;
} | null {
  switch (config.mode) {
    case 'day-of':
      return { show: true, title: 'Today is the day!', subtitle: 'Live updates and photos will appear here.', icon: '✦' };
    case 'just-passed':
      return { show: true, title: 'Thank you for celebrating with us', subtitle: config.thankYouMessage, icon: '♡' };
    case 'anniversary':
      return { show: true, title: config.anniversaryMessage, subtitle: 'Revisit the memories from this special day.', icon: '✦' };
    case 'memories':
      return { show: true, title: 'A cherished memory', subtitle: `${config.daysSince} days since this celebration.`, icon: '◆' };
    default:
      return null;
  }
}
