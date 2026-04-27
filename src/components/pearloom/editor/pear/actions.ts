// ─────────────────────────────────────────────────────────────
// Pearloom / editor/pear/actions.ts
//
// Action dispatcher that turns a SuggestionAction (from the
// intelligence layer or the AI chat endpoint) into a concrete
// effect on the manifest. Safe: every manifest mutation is a
// deep clone + patch, so the editor's existing auto-save +
// undo stack pick up the change as a normal edit.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest, PageBlock } from '@/types';
import type { SuggestionAction } from '@/lib/editor-intelligence/analyze';

export interface PearActionContext {
  manifest: StoryManifest;
  names?: [string, string];
  siteSlug: string;
  onPatchManifest: (next: StoryManifest) => void;
  onJumpBlock: (key: string) => void;
  onOpenPanel?: (panel: string) => void;
  onOpenPreview?: () => void;
  onPublish?: () => void;
}

export type PearActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function runPearAction(
  action: SuggestionAction,
  ctx: PearActionContext,
): Promise<PearActionResult> {
  try {
    switch (action.kind) {
      case 'navigate': {
        ctx.onJumpBlock(action.blockKey);
        return { ok: true, message: `Jumped to ${action.blockKey}` };
      }

      case 'open-panel': {
        if (action.panel === 'preview') {
          ctx.onOpenPreview?.();
          return { ok: true };
        }
        if (action.panel === 'publish') {
          ctx.onPublish?.();
          return { ok: true };
        }
        ctx.onOpenPanel?.(action.panel);
        return { ok: true };
      }

      case 'add-block': {
        const existing = ctx.manifest.blocks ?? [];
        if (existing.some((b) => b.type === action.blockType)) {
          // Already exists — make it visible + navigate.
          const next = {
            ...ctx.manifest,
            blocks: existing.map((b) =>
              b.type === action.blockType ? { ...b, visible: true } : b,
            ),
          };
          ctx.onPatchManifest(next);
          ctx.onJumpBlock(action.blockType);
          return { ok: true, message: 'Enabled existing block' };
        }
        const block: PageBlock = {
          id: `${action.blockType}-${Date.now().toString(36)}`,
          type: action.blockType as PageBlock['type'],
          order: existing.length,
          visible: true,
          config: action.config ?? {},
        };
        const next = { ...ctx.manifest, blocks: [...existing, block] };
        ctx.onPatchManifest(next);
        ctx.onJumpBlock(action.blockType);
        return { ok: true, message: `Added ${action.blockType}` };
      }

      case 'fill-field': {
        const patched = setByPath(ctx.manifest as unknown as Record<string, unknown>, action.path, action.value);
        ctx.onPatchManifest(patched as unknown as StoryManifest);
        return { ok: true, message: 'Updated' };
      }

      case 'ai-command': {
        // Route named AI commands to server endpoints, then merge the
        // result back into the manifest. Each command is a specific,
        // named operation Pear can kick off on the user's behalf.
        return runAiCommand(action.command, action.payload ?? {}, ctx);
      }

      case 'external-link': {
        if (typeof window !== 'undefined') window.open(action.url, '_blank');
        return { ok: true };
      }

      default:
        return { ok: false, error: 'Unknown action' };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Action failed' };
  }
}

// ── Named AI commands ────────────────────────────────────────

async function runAiCommand(
  command: string,
  _payload: Record<string, unknown>,
  ctx: PearActionContext,
): Promise<PearActionResult> {
  switch (command) {
    case 'suggest-hero-tagline': {
      const r = await fetch('/api/rewrite-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: `Write a 5–8 word poetic hero tagline for a ${ctx.manifest.occasion ?? 'celebration'} for ${ctx.names?.filter(Boolean).join(' & ') || 'the hosts'}. Vibe: ${ctx.manifest.vibeString ?? ''}. No exclamation marks, no clichés.`,
          tone: 'warm',
        }),
      });
      if (!r.ok) return { ok: false, error: 'AI failed' };
      const data = (await r.json()) as { text?: string; rewritten?: string };
      const text = (data.text ?? data.rewritten ?? '').trim().replace(/^"|"$/g, '');
      if (!text) return { ok: false, error: 'Empty response' };
      const next = {
        ...ctx.manifest,
        poetry: { ...(ctx.manifest.poetry ?? {}), heroTagline: text, closingLine: ctx.manifest.poetry?.closingLine ?? '', rsvpIntro: ctx.manifest.poetry?.rsvpIntro ?? '' },
      };
      ctx.onPatchManifest(next);
      return { ok: true, message: `"${text}"` };
    }

    case 'seed-faqs': {
      const r = await fetch('/api/ai-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: ctx.manifest.occasion,
          names: ctx.names,
          logistics: ctx.manifest.logistics,
          vibes: [ctx.manifest.vibeString ?? ''],
        }),
      });
      if (!r.ok) return { ok: false, error: 'FAQ draft failed' };
      const data = (await r.json()) as { faq?: Array<{ question: string; answer: string }>; questions?: Array<{ question: string; answer: string }>; items?: Array<{ question: string; answer: string }> };
      const list = (data.faq ?? data.questions ?? data.items ?? []).map((q, i) => ({
        id: `faq-${Date.now().toString(36)}-${i}`,
        question: q.question,
        answer: q.answer,
        order: i,
      }));
      if (!list.length) return { ok: false, error: 'No FAQs returned' };
      const next = { ...ctx.manifest, faqs: list };
      ctx.onPatchManifest(next);
      return { ok: true, message: `${list.length} FAQs drafted` };
    }

    case 'seed-registry': {
      // Simple seed — AI does the heavy lifting in the stream route
      // during generation, but here we give the user the same seed
      // on demand.
      const r = await fetch('/api/rewrite-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: `Write a warm one-sentence "gifts are optional" line for a ${ctx.manifest.occasion} from ${ctx.names?.filter(Boolean).join(' & ') || 'us'}. No clichés.`,
          tone: 'warm',
        }),
      });
      const data = r.ok ? ((await r.json()) as { text?: string }) : null;
      const message = data?.text ?? 'Your presence is enough.';
      const next = {
        ...ctx.manifest,
        registry: {
          enabled: true,
          message,
          cashFundMessage: 'A contribution toward our next chapter — never expected, always appreciated.',
          entries: [
            { name: 'Zola', url: 'https://zola.com', note: 'Our main registry' },
            { name: 'Crate & Barrel', url: 'https://crateandbarrel.com', note: 'Home goods' },
          ],
        },
      };
      ctx.onPatchManifest(next);
      return { ok: true, message: 'Registry seeded — edit or swap links' };
    }

    case 'seed-travel': {
      const venue = ctx.manifest.logistics?.venue;
      const venueAddress = ctx.manifest.logistics?.venueAddress;
      if (!venue && !venueAddress) return { ok: false, error: 'Set a venue first' };
      const r = await fetch('/api/ai-hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueName: venue, venueAddress, radiusMiles: 8, count: 5 }),
      });
      if (!r.ok) return { ok: false, error: 'Hotel search failed' };
      const data = (await r.json()) as {
        hotels?: Array<{ name: string; address?: string; bookingUrl?: string; groupRate?: string; notes?: string }>;
        airports?: string[] | Array<{ code: string; name?: string }>;
        directions?: string;
        drivingTips?: string;
      };
      const airports: string[] = Array.isArray(data.airports)
        ? (data.airports as Array<string | { code: string; name?: string }>).map((a) =>
            typeof a === 'string' ? a : `${a.code}${a.name ? ` · ${a.name}` : ''}`,
          )
        : [];
      const hotels = (data.hotels ?? []).map((h) => ({
        name: h.name,
        address: h.address ?? '',
        bookingUrl: h.bookingUrl,
        groupRate: h.groupRate,
        notes: h.notes,
      }));
      const next = {
        ...ctx.manifest,
        travelInfo: { airports, hotels, directions: data.directions ?? data.drivingTips },
      };
      ctx.onPatchManifest(next);
      return { ok: true, message: `${hotels.length} hotels + ${airports.length} airports loaded` };
    }

    case 'rewrite-empty-chapters': {
      const chapters = ctx.manifest.chapters ?? [];
      let rewrittenCount = 0;
      const nextChapters = await Promise.all(
        chapters.map(async (c) => {
          if (c.description && c.description.length >= 60) return c;
          try {
            const r = await fetch('/api/rewrite-chapter', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chapter: c, tone: 'deepen' }),
            });
            if (!r.ok) return c;
            const data = (await r.json()) as { description?: string };
            if (data.description && data.description.length > (c.description ?? '').length) {
              rewrittenCount += 1;
              return { ...c, description: data.description };
            }
          } catch {}
          return c;
        }),
      );
      if (rewrittenCount === 0) return { ok: false, error: 'Nothing needed rewriting' };
      ctx.onPatchManifest({ ...ctx.manifest, chapters: nextChapters });
      return { ok: true, message: `Deepened ${rewrittenCount} chapter${rewrittenCount === 1 ? '' : 's'}` };
    }

    case 'open-publish': {
      ctx.onPublish?.();
      return { ok: true };
    }

    default:
      return { ok: false, error: `Unknown AI command: ${command}` };
  }
}

// ── Tiny path-set utility ────────────────────────────────────
// Matches simple dot paths like `logistics.venue` or
// `poetry.heroTagline`. Does not handle array indices.
function setByPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const parts = path.split('.');
  const root = { ...obj } as Record<string, unknown>;
  let cur: Record<string, unknown> = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const existing = cur[key];
    cur[key] = existing && typeof existing === 'object' ? { ...(existing as Record<string, unknown>) } : {};
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  return root as T;
}
