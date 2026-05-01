// ─────────────────────────────────────────────────────────────
// site-progress — single source of truth for "is this section
// done?" across the editor Outline, the dashboard home strip,
// and any future progress tracker (publish gate, AI nudge).
//
// Each block reports one of three states:
//   • filled  — host has supplied enough content for the section
//               to read as complete
//   • partial — some content exists but key fields still empty
//   • empty   — nothing the host has supplied (defaults only)
//
// The thresholds are intentionally generous on the partial side
// so empty sites read as "lots of work" and lightly-edited sites
// read as "in progress" — the host gets credit for any input.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

export type BlockFillState = 'filled' | 'partial' | 'empty';

/** Block keys this helper knows how to score. Mirrors the keys
 *  used by EditorV8's BLOCKS array so fill state lines up with
 *  the Outline rows + dashboard checklist out of the box. */
export type ScoredBlockKey =
  | 'nav'
  | 'hero'
  | 'story'
  | 'details'
  | 'schedule'
  | 'travel'
  | 'registry'
  | 'gallery'
  | 'rsvp'
  | 'faq'
  | 'toasts'
  | 'theme';

export function blockFillState(block: ScoredBlockKey, manifest: StoryManifest | null | undefined): BlockFillState {
  if (!manifest) return 'empty';
  const m = manifest as unknown as Record<string, unknown>;
  switch (block) {
    case 'nav':
    case 'theme':
      // Structural chrome — the renderer always shows something
      // sensible, so we count these as filled.
      return 'filled';
    case 'hero': {
      const names = m.names as [string, string] | undefined;
      const cover = m.coverPhoto as string | undefined;
      const tagline = (m.poetry as { heroTagline?: string } | undefined)?.heroTagline;
      const hasNames = Boolean(names?.[0] && names?.[1]);
      const hasCover = Boolean(cover);
      const hasTagline = Boolean(tagline?.trim());
      if (hasNames && hasCover && hasTagline) return 'filled';
      if (hasNames || hasCover || hasTagline) return 'partial';
      return 'empty';
    }
    case 'story': {
      const chapters = (m.chapters as Array<{ description?: string; images?: unknown[] }> | undefined) ?? [];
      if (chapters.length === 0) return 'empty';
      const hasContent = chapters.some((c) => c.description || (c.images?.length ?? 0) > 0);
      return hasContent ? 'filled' : 'partial';
    }
    case 'details':
    case 'schedule': {
      const events = (m.events as unknown[] | undefined) ?? [];
      const date = (m.logistics as { date?: string } | undefined)?.date;
      if (events.length > 0 && date) return 'filled';
      if (events.length > 0 || date) return 'partial';
      return 'empty';
    }
    case 'travel': {
      const venue = (m.logistics as { venue?: string } | undefined)?.venue;
      const travelInfo = m.travelInfo as { hotels?: unknown[]; transport?: unknown } | undefined;
      const hotelCount = (travelInfo?.hotels as unknown[] | undefined)?.length ?? 0;
      if (venue && hotelCount > 0) return 'filled';
      if (venue || hotelCount > 0) return 'partial';
      return 'empty';
    }
    case 'registry': {
      const reg = m.registry as { entries?: unknown[]; cashFundUrl?: string } | undefined;
      const entries = reg?.entries?.length ?? 0;
      if (entries > 0 || reg?.cashFundUrl) return 'filled';
      return 'empty';
    }
    case 'gallery': {
      const chapters = (m.chapters as Array<{ images?: unknown[] }> | undefined) ?? [];
      const photoCount = chapters.reduce((n, c) => n + (c.images?.length ?? 0), 0);
      if (photoCount >= 6) return 'filled';
      if (photoCount > 0) return 'partial';
      return 'empty';
    }
    case 'rsvp': {
      const logistics = m.logistics as { date?: string; rsvpDeadline?: string } | undefined;
      if (logistics?.date && logistics?.rsvpDeadline) return 'filled';
      if (logistics?.date || logistics?.rsvpDeadline) return 'partial';
      return 'empty';
    }
    case 'faq': {
      const faqs = (m.faqs as unknown[] | undefined) ?? [];
      return faqs.length >= 3 ? 'filled' : faqs.length > 0 ? 'partial' : 'empty';
    }
    case 'toasts': {
      const samples = (m.voiceSamples as unknown[] | undefined) ?? [];
      return samples.length > 0 ? 'filled' : 'empty';
    }
    default:
      return 'empty';
  }
}

/** Aggregate site progress as a 0–100 percentage. Counts each
 *  block's contribution: filled = 1.0, partial = 0.5, empty = 0.
 *  Excludes nav + theme so structural chrome doesn't inflate the
 *  score on an otherwise empty site. */
export function siteProgressPct(manifest: StoryManifest | null | undefined): number {
  if (!manifest) return 0;
  const blocks: ScoredBlockKey[] = [
    'hero', 'story', 'details', 'schedule', 'travel',
    'registry', 'gallery', 'rsvp', 'faq', 'toasts',
  ];
  const score = blocks.reduce((sum, b) => {
    const s = blockFillState(b, manifest);
    return sum + (s === 'filled' ? 1 : s === 'partial' ? 0.5 : 0);
  }, 0);
  return Math.round((score / blocks.length) * 100);
}

/** Short rgba colours per state — used by the editor Outline pip
 *  and the dashboard progress strip. Kept in one place so the two
 *  surfaces stay visually synced. */
export const FILL_STATE_COLORS: Record<BlockFillState, { bg: string; ring: string; label: string }> = {
  filled: { bg: 'var(--sage-deep, #5C6B3F)', ring: 'rgba(92,107,63,0.30)', label: 'Filled in' },
  partial: { bg: 'var(--gold, #B8935A)', ring: 'rgba(184,147,90,0.30)', label: 'In progress' },
  empty: { bg: 'rgba(14,13,11,0.18)', ring: 'transparent', label: 'Empty' },
};
