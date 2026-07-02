// ─────────────────────────────────────────────────────────────
// Pearloom / api/celebrations/weekend/route.ts
//
// POST /api/celebrations/weekend
//   body: {
//     anchor?: string,                    // weekend anchor occasion (default 'wedding')
//     names?: string[],                   // 1-2 names; solo anchors send one
//     anchorDate?: string,                // ISO yyyy-mm-dd ('weddingDate' accepted as a legacy alias)
//     baseSlug?: string,
//     events?: Array<{ kind: string;      // must belong to the anchor's arc (weekend-arcs.ts)
//                      date?: string;     // explicit ISO date (wins)
//                      daysFromAnchor?: number;    // else offset from the anchor date
//                      daysFromWedding?: number;   // legacy alias
//                    }>,
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
import { saveSiteDraft } from '@/lib/db';
import { applyTemplateToManifest } from '@/lib/templates/apply-template';
import { getTemplatesForOccasion } from '@/lib/templates/wedding-templates';
import { weekendArcFor } from '@/lib/event-os/weekend-arcs';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

/* Curated templates for the wedding arc (the ids are hand-picked
   builds); every other occasion resolves through the template
   registry's own occasion index. A missing id makes
   applyTemplateToManifest a no-op (bare, unstyled site). */
const CURATED_TEMPLATE: Record<string, string> = {
  engagement: 'vintage-romance',
  'bridal-shower': 'gentle-gathering',
  'bachelor-party': 'last-weekend-in',
  'bachelorette-party': 'last-weekend-in',
  'rehearsal-dinner': 'the-night-before',
  'welcome-party': 'warm-threshold',
  wedding: 'lake-como',
  brunch: 'one-more-round',
};

function templateIdFor(occasion: string): string | undefined {
  return CURATED_TEMPLATE[occasion] ?? getTemplatesForOccasion(occasion)[0]?.id;
}

interface WeekendBody {
  anchor?: string;
  names?: string[];
  anchorDate?: string;
  /** Legacy alias for anchorDate (pre-generalization clients). */
  weddingDate?: string;
  baseSlug?: string;
  events?: Array<{ kind: string; date?: string; daysFromAnchor?: number; daysFromWedding?: number; host?: string }>;
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

  const arc = weekendArcFor(body.anchor);
  /* Normalized to the storage tuple — solo anchors send one name;
     the second slot stays '' (never a phantom partner). */
  const trimmed = (body.names ?? []).map((n) => (n ?? '').trim());
  const names: [string, string] = [trimmed[0] ?? '', trimmed[1] ?? ''];
  const anchorDate = body.anchorDate ?? body.weddingDate;
  const baseSlugRaw = (body.baseSlug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!anchorDate || !ISO_DATE.test(anchorDate)) {
    return NextResponse.json({ error: 'anchorDate must be YYYY-MM-DD' }, { status: 400 });
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

  const created: Array<{ slug: string; kind: string; date: string; url: string }> = [];

  for (const ev of body.events) {
    /* Only events that belong to this anchor's arc — the arc defines
       the slug suffix and keeps kinds honest. */
    const def = arc.events.find((e) => e.kind === ev.kind);
    if (!def) continue;
    const template = templateIdFor(ev.kind);
    const offset = ev.daysFromAnchor ?? ev.daysFromWedding;
    const date = ev.date && ISO_DATE.test(ev.date)
      ? ev.date
      : addDaysIso(anchorDate, typeof offset === 'number' ? offset : def.offsetDays);
    const slug = def.sluffix ? `${baseSlugRaw}-${def.sluffix}` : baseSlugRaw;

    // Seed manifest with shared theme + per-occasion template + the
    // celebration link so all sites show up as siblings.
    const baseManifest = {
      occasion: ev.kind,
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

    const themed = template ? applyTemplateToManifest(baseManifest, template) : baseManifest;

    try {
      // Create as a DRAFT (comingSoon) — the host reviews + publishes
      // each from the editor. Drafts won't appear as public siblings
      // until published, which is the intended flow.
      const result = await saveSiteDraft(session.user.email, slug, themed, names);
      if (!result.success) {
        console.warn('[celebrations/weekend] draft create failed for', slug, result.error);
        continue;
      }
      created.push({
        slug,
        kind: ev.kind,
        date,
        url: `/editor/${slug}`,
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
