// ─────────────────────────────────────────────────────────────
// POST /api/auto-draft — re-run a single auto-draft section
// from the editor. Used by DraftedByPearBanner's "Redraft" button.
//
// Body: { manifest: StoryManifest, section: DraftableSection }
// Returns: { manifest: StoryManifest } with the section re-drafted.
//
// Server-side because the drafters live in lib/ and we don't want
// to ship them to the client bundle (small files but they're
// templates that may grow).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { StoryManifest } from '@/types';
import type { DraftableSection } from '@/lib/auto-draft/types';
import type { SiteOccasion } from '@/lib/site-urls';
import type { EventVoice } from '@/lib/event-os/event-types';
import { getEventType } from '@/lib/event-os/event-types';
import { draftSchedule } from '@/lib/auto-draft/schedule';
import { draftFaq } from '@/lib/auto-draft/faq';
import { draftRegistry } from '@/lib/auto-draft/registry';
import { draftTravel } from '@/lib/auto-draft/travel';
import { draftDetails } from '@/lib/auto-draft/details';

const DRAFTERS = {
  schedule: draftSchedule,
  faq: draftFaq,
  registry: draftRegistry,
  travel: draftTravel,
  details: draftDetails,
} as const;

const ALLOWED_SECTIONS = new Set<DraftableSection>(['schedule', 'faq', 'registry', 'travel', 'details']);

function isDraftableSection(value: unknown): value is DraftableSection {
  return typeof value === 'string' && ALLOWED_SECTIONS.has(value as DraftableSection);
}

function buildContext(manifest: StoryManifest) {
  const occasion = (manifest as unknown as { occasion?: string }).occasion as SiteOccasion | undefined;
  if (!occasion) return null;
  const eventType = getEventType(occasion);
  const voice: EventVoice = eventType?.voice ?? 'celebratory';
  const names = (manifest.names as [string, string] | undefined) ?? ['', ''];
  const eventDate = manifest.logistics?.date ?? null;
  let eventHour: number | null = null;
  const timeStr = manifest.logistics?.time;
  if (typeof timeStr === 'string') {
    const match = timeStr.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?$/);
    if (match) {
      let h = parseInt(match[1] ?? '0', 10);
      const m = parseInt(match[2] ?? '0', 10);
      const ampm = (match[3] ?? '').toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      eventHour = h + m / 60;
    }
  }
  const venue = manifest.logistics?.venue ?? null;
  const vibes = (manifest.vibeString ?? '').split(',').map((v) => v.trim()).filter(Boolean);
  return { occasion, voice, names, eventDate, eventHour, venue, vibes };
}

export async function POST(req: Request) {
  let body: { manifest?: StoryManifest; section?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { manifest, section } = body;
  if (!manifest) {
    return NextResponse.json({ error: 'Missing manifest' }, { status: 400 });
  }
  if (!isDraftableSection(section)) {
    return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
  }
  const ctx = buildContext(manifest);
  if (!ctx) {
    return NextResponse.json({ error: 'Missing occasion' }, { status: 400 });
  }
  // Build a "clean" version of the manifest for THIS section so
  // the drafter actually re-runs. Otherwise the drafter sees the
  // existing content and skips with null.
  let cleaned: StoryManifest = manifest;
  if (section === 'schedule') cleaned = { ...manifest, events: [] };
  else if (section === 'faq') cleaned = { ...manifest, faq: [] } as unknown as StoryManifest;
  else if (section === 'registry') cleaned = { ...manifest, registry: { enabled: true, ...((manifest.registry as Record<string, unknown>) ?? {}), entries: [] } } as unknown as StoryManifest;
  else if (section === 'travel') cleaned = { ...manifest, travelInfo: { ...(manifest.travelInfo ?? {}), hotels: [] } } as StoryManifest;
  else if (section === 'details') cleaned = { ...manifest, logistics: { ...(manifest.logistics ?? {}), dresscode: undefined } } as StoryManifest;

  const drafter = DRAFTERS[section];
  const patch = drafter(ctx, cleaned);
  if (!patch) {
    return NextResponse.json({ error: 'Drafter returned no content' }, { status: 200 });
  }
  const next: StoryManifest = {
    ...cleaned,
    ...patch,
    draftedByPear: {
      ...(manifest.draftedByPear ?? {}),
      [section]: true,
    },
  } as StoryManifest;

  return NextResponse.json({ manifest: next });
}
