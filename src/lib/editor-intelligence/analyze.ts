// ─────────────────────────────────────────────────────────────
// Pearloom / lib/editor-intelligence/analyze.ts
//
// Pure manifest analysis — reads the current StoryManifest and
// returns a ranked list of "what Pear would do next" suggestions.
// Every suggestion carries a typed action the editor can execute
// in one tap. No AI call — runs instantly on every manifest tick.
//
// This is the brain behind the always-on Pear copilot.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { getEventType } from '@/lib/event-os/event-types';

export type SuggestionSeverity = 'critical' | 'should-fix' | 'nice-to-have' | 'info';

export type SuggestionAction =
  | { kind: 'navigate'; blockKey: string }
  | { kind: 'add-block'; blockType: string; config?: Record<string, unknown> }
  | { kind: 'open-panel'; panel: string }
  | { kind: 'ai-command'; command: string; payload?: Record<string, unknown> }
  | { kind: 'fill-field'; path: string; value: unknown }
  | { kind: 'external-link'; url: string };

export interface Suggestion {
  id: string;
  severity: SuggestionSeverity;
  icon: 'sparkles' | 'heart' | 'calendar' | 'pin' | 'users' | 'mail' | 'music' | 'gift' | 'eye' | 'camera' | 'brush' | 'image';
  category: 'setup' | 'content' | 'polish' | 'launch' | 'engagement';
  title: string;
  body: string;
  action: SuggestionAction;
  /** Optional secondary action (e.g. "Skip for now"). */
  secondary?: { label: string; action: SuggestionAction };
}

export interface SiteAnalysis {
  /** 0–100 completeness score. */
  completeness: number;
  /** All suggestions, already ranked. */
  suggestions: Suggestion[];
  /** Quick flags — what Pear knows at a glance. */
  flags: {
    hasCoverPhoto: boolean;
    hasStoryChapters: boolean;
    hasVenue: boolean;
    hasDate: boolean;
    hasHeroTagline: boolean;
    hasRegistry: boolean;
    hasFaqs: boolean;
    hasTravel: boolean;
    hasGuestbook: boolean;
    hasRsvp: boolean;
    hasEvents: boolean;
    chapterCount: number;
    photoCount: number;
    emptyChapters: number;
    unpublished: boolean;
  };
}

interface PageBlockLite {
  type: string;
  visible?: boolean;
  config?: Record<string, unknown>;
}

function blockPresent(manifest: StoryManifest, type: string): boolean {
  const blocks = (manifest.blocks ?? []) as PageBlockLite[];
  return blocks.some((b) => b.type === type && b.visible !== false);
}

function blockExists(manifest: StoryManifest, type: string): boolean {
  const blocks = (manifest.blocks ?? []) as PageBlockLite[];
  return blocks.some((b) => b.type === type);
}

/**
 * Analyzes a manifest and returns a ranked list of suggestions.
 * Pure function — safe to call on every manifest change.
 */
export function analyzeSite(manifest: StoryManifest, names?: [string, string]): SiteAnalysis {
  const chapters = manifest.chapters ?? [];
  const photoCount = chapters.reduce((acc, c) => acc + (c.images?.length ?? 0), 0);
  const emptyChapters = chapters.filter((c) => !c.description || c.description.length < 30).length;
  const logistics = manifest.logistics ?? {};
  const occasion = manifest.occasion ?? 'wedding';
  const voice = getEventType(occasion as never)?.voice ?? 'celebratory';

  const flags = {
    hasCoverPhoto: Boolean(manifest.coverPhoto),
    hasStoryChapters: chapters.length >= 3,
    hasVenue: Boolean(logistics.venue),
    hasDate: Boolean(logistics.date),
    hasHeroTagline: Boolean(manifest.poetry?.heroTagline),
    hasRegistry: Boolean(manifest.registry?.entries?.length),
    hasFaqs: Boolean(manifest.faqs?.length),
    hasTravel: Boolean(manifest.travelInfo?.hotels?.length),
    hasGuestbook: blockPresent(manifest, 'guestbook'),
    hasRsvp: blockPresent(manifest, 'rsvp'),
    hasEvents: (manifest.events ?? []).length > 0,
    chapterCount: chapters.length,
    photoCount,
    emptyChapters,
    unpublished: !(manifest as unknown as { published?: boolean }).published,
  };

  const suggestions: Suggestion[] = [];

  // ── Critical: names ─────────────────────────────────────────
  if (!names?.[0] || !names[0].trim()) {
    suggestions.push({
      id: 'set-names',
      severity: 'critical',
      icon: 'heart',
      category: 'setup',
      title: 'Start with your name',
      body: 'Guests see your name before anything else. Set it in Hero.',
      action: { kind: 'navigate', blockKey: 'hero' },
    });
  }

  // ── Critical: event date ────────────────────────────────────
  if (!flags.hasDate) {
    suggestions.push({
      id: 'set-date',
      severity: 'critical',
      icon: 'calendar',
      category: 'setup',
      title: 'Add the date',
      body: 'Without a date, the countdown + RSVP deadlines can\'t calculate. Even "TBD" is better than empty.',
      action: { kind: 'navigate', blockKey: 'details' },
    });
  }

  // ── Critical: venue ─────────────────────────────────────────
  if (!flags.hasVenue && occasion !== 'story') {
    suggestions.push({
      id: 'set-venue',
      severity: 'critical',
      icon: 'pin',
      category: 'setup',
      title: 'Where is it?',
      body: 'A venue drives the map, travel tips, and directions. Add it in Details.',
      action: { kind: 'navigate', blockKey: 'details' },
    });
  }

  // ── Should-fix: cover photo ─────────────────────────────────
  if (!flags.hasCoverPhoto) {
    suggestions.push({
      id: 'set-cover',
      severity: 'should-fix',
      icon: 'camera',
      category: 'content',
      title: 'Add a hero photo',
      body: 'The very first image guests see. Pull one from your Library or upload a new one.',
      action: { kind: 'navigate', blockKey: 'hero' },
    });
  }

  // ── Should-fix: hero tagline ────────────────────────────────
  if (!flags.hasHeroTagline) {
    suggestions.push({
      id: 'set-tagline',
      severity: 'should-fix',
      icon: 'sparkles',
      category: 'content',
      title: 'Draft a hero line',
      body: 'Five or six words under your name. Pear can write one from your vibe if you\'re stuck.',
      action: { kind: 'ai-command', command: 'suggest-hero-tagline' },
      secondary: { label: 'Write it myself', action: { kind: 'navigate', blockKey: 'hero' } },
    });
  }

  // ── Should-fix: story chapters ──────────────────────────────
  if (!flags.hasStoryChapters && occasion !== 'story' && chapters.length < 3) {
    suggestions.push({
      id: 'add-chapters',
      severity: 'should-fix',
      icon: 'heart',
      category: 'content',
      title: chapters.length === 0 ? 'Tell your story' : `Add ${3 - chapters.length} more chapter${3 - chapters.length === 1 ? '' : 's'}`,
      body: chapters.length === 0
        ? 'Three to five chapters is the sweet spot. Upload photos and Pear drafts one per cluster.'
        : 'A site with 3+ chapters reads like a proper story. Upload more photos or write them by hand.',
      action: { kind: 'navigate', blockKey: 'story' },
    });
  }

  // ── Nice-to-have: flesh out empty chapters ──────────────────
  if (flags.emptyChapters > 0 && chapters.length > 0) {
    suggestions.push({
      id: 'fill-chapter-text',
      severity: 'should-fix',
      icon: 'sparkles',
      category: 'content',
      title: `${flags.emptyChapters} chapter${flags.emptyChapters === 1 ? ' needs' : 's need'} more words`,
      body: 'Short chapter descriptions read like placeholder text. Pear can deepen them with one tap.',
      action: { kind: 'ai-command', command: 'rewrite-empty-chapters' },
      secondary: { label: 'Open story editor', action: { kind: 'navigate', blockKey: 'story' } },
    });
  }

  // ── Engagement blocks ───────────────────────────────────────
  if (!flags.hasRsvp && occasion !== 'memorial' && occasion !== 'funeral' && occasion !== 'story') {
    suggestions.push({
      id: 'add-rsvp',
      severity: 'should-fix',
      icon: 'mail',
      category: 'engagement',
      title: 'Add RSVP',
      body: 'Guests reply in-site — no third-party form. Tracks meal and plus-ones automatically.',
      action: { kind: 'add-block', blockType: 'rsvp', config: { title: 'RSVP' } },
    });
  }

  if (!flags.hasGuestbook && (occasion === 'memorial' || occasion === 'funeral' || occasion === 'retirement' || occasion === 'milestone-birthday')) {
    suggestions.push({
      id: 'add-guestbook',
      severity: 'should-fix',
      icon: 'users',
      category: 'engagement',
      title: 'Open a guestbook',
      body: voice === 'solemn'
        ? 'A space for memories. Guests add a note; you approve before they appear.'
        : 'One-line wishes from everyone who shows up. Printable as a keepsake later.',
      action: { kind: 'add-block', blockType: 'guestbook', config: { title: voice === 'solemn' ? 'Memories' : 'Guestbook' } },
    });
  }

  // ── Nice-to-have: registry (if applicable) ──────────────────
  const needsRegistry = !['memorial', 'funeral', 'story', 'bachelor-party', 'bachelorette-party', 'reunion'].includes(occasion);
  if (needsRegistry && !flags.hasRegistry) {
    suggestions.push({
      id: 'seed-registry',
      severity: 'nice-to-have',
      icon: 'gift',
      category: 'content',
      title: 'Seed a registry',
      body: 'Pear drafts retailer picks + a cash-fund line in your voice. You can swap or skip anything.',
      action: { kind: 'ai-command', command: 'seed-registry' },
    });
  }

  // ── Nice-to-have: travel ────────────────────────────────────
  if (!flags.hasTravel && flags.hasVenue) {
    suggestions.push({
      id: 'seed-travel',
      severity: 'nice-to-have',
      icon: 'pin',
      category: 'content',
      title: 'Add travel info',
      body: 'Pear finds real hotels + airports near your venue and writes driving tips.',
      action: { kind: 'ai-command', command: 'seed-travel' },
    });
  }

  // ── Nice-to-have: FAQs ──────────────────────────────────────
  if (!flags.hasFaqs && voice !== 'solemn') {
    suggestions.push({
      id: 'seed-faqs',
      severity: 'nice-to-have',
      icon: 'sparkles',
      category: 'content',
      title: 'Draft FAQs',
      body: 'Dress code, kids, parking, dietary — 6 to 8 Q&As written from your manifest.',
      action: { kind: 'ai-command', command: 'seed-faqs' },
    });
  }

  // ── Polish: design review ───────────────────────────────────
  if (flags.hasStoryChapters && flags.hasVenue && flags.hasDate && flags.hasHeroTagline) {
    suggestions.push({
      id: 'pear-review',
      severity: 'nice-to-have',
      icon: 'eye',
      category: 'polish',
      title: 'Ask Pear to review',
      body: 'Pear reads the whole site and flags anything that reads off-brand or feels thin.',
      action: { kind: 'open-panel', panel: 'design-advisor' },
    });
  }

  // ── Launch readiness ────────────────────────────────────────
  if (
    flags.unpublished &&
    flags.hasCoverPhoto &&
    flags.hasStoryChapters &&
    flags.hasVenue &&
    flags.hasDate &&
    flags.hasHeroTagline
  ) {
    suggestions.push({
      id: 'publish',
      severity: 'info',
      icon: 'sparkles',
      category: 'launch',
      title: 'Ready to publish',
      body: 'You have everything a launched site needs. One click.',
      action: { kind: 'ai-command', command: 'open-publish' },
    });
  }

  // ── Completeness score ──────────────────────────────────────
  const completeness = computeCompleteness(flags);

  // Sort: critical > should-fix > nice-to-have > info; cap at 6 visible.
  const severityRank: Record<SuggestionSeverity, number> = {
    critical: 0,
    'should-fix': 1,
    'nice-to-have': 2,
    info: 3,
  };
  suggestions.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return { completeness, suggestions, flags };
}

function computeCompleteness(flags: SiteAnalysis['flags']): number {
  const checks: Array<[boolean, number]> = [
    [flags.hasCoverPhoto, 10],
    [flags.hasStoryChapters, 20],
    [flags.hasVenue, 10],
    [flags.hasDate, 10],
    [flags.hasHeroTagline, 10],
    [flags.hasRsvp, 10],
    [flags.hasRegistry, 5],
    [flags.hasFaqs, 5],
    [flags.hasTravel, 5],
    [flags.hasGuestbook, 5],
    [flags.hasEvents, 5],
    [flags.photoCount >= 6, 5],
  ];
  const earned = checks.reduce((sum, [ok, pts]) => sum + (ok ? pts : 0), 0);
  return Math.min(100, Math.round(earned));
}

/**
 * One-liner summary of site state — used as a system prompt hint
 * when the user asks Pear open-ended questions.
 */
export function describeSite(analysis: SiteAnalysis, manifest: StoryManifest, names?: [string, string]): string {
  const parts: string[] = [];
  const occasion = manifest.occasion ?? 'wedding';
  const nameLine = names?.filter(Boolean).join(' & ') || 'The host';
  parts.push(`${nameLine}'s ${occasion} site — ${analysis.completeness}% complete.`);
  const { flags } = analysis;
  const have: string[] = [];
  const missing: string[] = [];
  if (flags.hasCoverPhoto) have.push('hero photo'); else missing.push('hero photo');
  if (flags.hasHeroTagline) have.push('hero tagline'); else missing.push('hero tagline');
  if (flags.chapterCount > 0) have.push(`${flags.chapterCount} chapter${flags.chapterCount === 1 ? '' : 's'}`);
  if (flags.hasVenue) have.push('venue'); else missing.push('venue');
  if (flags.hasDate) have.push('date'); else missing.push('date');
  if (flags.hasRsvp) have.push('RSVP');
  if (flags.hasRegistry) have.push('registry'); else if (occasion !== 'memorial' && occasion !== 'funeral') missing.push('registry');
  if (flags.hasFaqs) have.push('FAQs'); else missing.push('FAQs');
  if (flags.hasTravel) have.push('travel info'); else if (flags.hasVenue) missing.push('travel info');
  if (flags.hasGuestbook) have.push('guestbook');
  if (have.length) parts.push(`HAS: ${have.join(', ')}.`);
  if (missing.length) parts.push(`MISSING: ${missing.join(', ')}.`);
  return parts.join(' ');
}
