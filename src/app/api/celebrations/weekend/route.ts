// ─────────────────────────────────────────────────────────────
// Pearloom / api/celebrations/weekend/route.ts
//
// POST /api/celebrations/weekend
//   body: {
//     names: [string, string],
//     weddingDate: string (ISO yyyy-mm-dd),
//     baseSlug: string,
//     events: Array<{ kind: 'engagement-party' | 'bridal-shower' |
//                          'bachelor-party' | 'bachelorette-party' |
//                          'rehearsal-dinner' | 'welcome-party' |
//                          'wedding' | 'brunch';
//                     daysFromWedding: number;
//                     host?: string;
//                   }>,
//     paletteHex?: string[],
//     theme?: { background, foreground, accent, accentLight, muted, cardBg },
//   }
//
// Creates one celebration id + a site per requested event, linked
// via manifest.celebration so they show up as siblings on each other's
// LinkedEventsStrip. Each site inherits the shared palette + theme but
// keeps its own occasion-appropriate template.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { publishSite } from '@/lib/db';
import { applyTemplateToManifest } from '@/lib/templates/apply-template';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

type EventKind =
  | 'engagement-party'
  | 'bridal-shower'
  | 'bachelor-party'
  | 'bachelorette-party'
  | 'rehearsal-dinner'
  | 'welcome-party'
  | 'wedding'
  | 'brunch';

const EVENT_TEMPLATE: Record<EventKind, { template: string; occasion: string; sluffix: string }> = {
  'engagement-party': { template: 'blush-bloom', occasion: 'engagement', sluffix: 'engagement' },
  'bridal-shower': { template: 'gentle-gathering', occasion: 'bridal-shower', sluffix: 'shower' },
  'bachelor-party': { template: 'last-weekend-in', occasion: 'bachelor-party', sluffix: 'bach' },
  'bachelorette-party': { template: 'last-weekend-in', occasion: 'bachelorette-party', sluffix: 'bach' },
  'rehearsal-dinner': { template: 'the-night-before', occasion: 'rehearsal-dinner', sluffix: 'rehearsal' },
  'welcome-party': { template: 'warm-threshold', occasion: 'welcome-party', sluffix: 'welcome' },
  wedding: { template: 'ethereal-garden', occasion: 'wedding', sluffix: '' },
  brunch: { template: 'one-more-round', occasion: 'brunch', sluffix: 'brunch' },
};

interface WeekendBody {
  names?: [string, string];
  weddingDate?: string;
  baseSlug?: string;
  events?: Array<{ kind: EventKind; daysFromWedding: number; host?: string }>;
  paletteHex?: string[];
  theme?: {
    background?: string;
    foreground?: string;
    accent?: string;
    accentLight?: string;
    muted?: string;
    cardBg?: string;
  };
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: WeekendBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const names = body.names ?? ['', ''];
  const weddingDate = body.weddingDate;
  const baseSlugRaw = (body.baseSlug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!weddingDate || !/^\d{4}-\d{2}-\d{2}$/.test(weddingDate)) {
    return NextResponse.json({ error: 'weddingDate must be YYYY-MM-DD' }, { status: 400 });
  }
  if (!baseSlugRaw || baseSlugRaw.length < 3) {
    return NextResponse.json({ error: 'baseSlug too short (min 3 chars)' }, { status: 400 });
  }
  if (!body.events?.length) {
    return NextResponse.json({ error: 'At least one event required' }, { status: 400 });
  }
  if (body.events.length > 8) {
    return NextResponse.json({ error: 'Too many events (max 8)' }, { status: 400 });
  }

  const celebrationId = `celebration-${Date.now().toString(36)}`;
  const celebrationName = names.filter(Boolean).join(' & ') || 'Our weekend';

  const created: Array<{ slug: string; kind: EventKind; date: string; url: string }> = [];

  for (const ev of body.events) {
    const meta = EVENT_TEMPLATE[ev.kind];
    if (!meta) continue;
    const date = addDaysIso(weddingDate, ev.daysFromWedding);
    const slug = meta.sluffix ? `${baseSlugRaw}-${meta.sluffix}` : baseSlugRaw;

    // Seed manifest with shared theme + per-occasion template + the
    // celebration link so all sites show up as siblings.
    const baseManifest = {
      occasion: meta.occasion,
      themeFamily: 'v8',
      rendererVersion: 'v2',
      names,
      logistics: {
        date,
      },
      theme: body.theme
        ? {
            colors: {
              background: body.theme.background ?? '#F5EFE2',
              foreground: body.theme.foreground ?? '#0E0D0B',
              accent: body.theme.accent ?? '#5C6B3F',
              accentLight: body.theme.accentLight ?? '#E0DDC9',
              muted: body.theme.muted ?? '#6F6557',
              cardBg: body.theme.cardBg ?? body.theme.background ?? '#FBF7EE',
            },
          }
        : undefined,
      celebration: {
        id: celebrationId,
        name: celebrationName,
      },
      vibeString: '',
      chapters: [],
    } as unknown as StoryManifest;

    const themed = applyTemplateToManifest(baseManifest, meta.template);

    try {
      const result = await publishSite(session.user.email, slug, themed, names);
      if (!result.success) {
        console.warn('[celebrations/weekend] publish failed for', slug, result.error);
        continue;
      }
      created.push({
        slug,
        kind: ev.kind,
        date,
        url: `/${meta.occasion}/${slug}`,
      });
    } catch (err) {
      console.warn('[celebrations/weekend] failed for', slug, err);
    }
  }

  return NextResponse.json({
    celebrationId,
    celebrationName,
    sites: created,
  });
}
