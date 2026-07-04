'use client';

/* ════════════════════════════════════════════════════════════════
   BASTINGS — Pear's while-you-were-away work.

   BRAND.md §7: drafts are *basted in*, not generated. On editor
   open, Pear derives a few small, concrete improvements from the
   site as it stands and offers them stitched-in — the host SETS
   the stitch (keep, undoable) or PULLS the thread (it unravels
   out and stays dismissed). Nothing touches the manifest until
   Set, and nothing here needs a model call — these are honest,
   deterministic stitches derived from what's actually missing,
   so they work identically on keyless deploys.

   Each basting is { id, label, detail, section, apply } where
   apply is a pure manifest → manifest patch.
   ════════════════════════════════════════════════════════════════ */

import type { StoryManifest } from '@/types';
import { getEventType } from '@/lib/event-os/event-types';
import { CORE_BLOCK_ORDER } from '@/lib/event-os/wizard-sections';

export interface Basting {
  id: string;
  label: string;
  detail: string;
  /** Canvas section the stitch lands in — the loom FX threads there. */
  section: string;
  apply: (m: StoryManifest) => StoryManifest;
  /** When set, "Add it" awaits this instead of `apply` — used by the
   *  story draft, the one basting that needs a model call. Resolves
   *  to the next manifest, or null when the draft came back empty
   *  (keyless deploy / model error) so the card can fail quietly. */
  applyAsync?: (m: StoryManifest) => Promise<StoryManifest | null>;
}

type Loose = Record<string, unknown>;

const dismissKey = (slug: string) => `pl-bastings-pulled:${slug}`;

export function readPulled(slug: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(dismissKey(slug));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

export function pullThread(slug: string, id: string) {
  try {
    const next = readPulled(slug); next.add(id);
    window.localStorage.setItem(dismissKey(slug), JSON.stringify([...next]));
  } catch { /* dismissal is a nicety */ }
}

function blockOrderWith(m: StoryManifest, section: string): StoryManifest {
  const loose = m as unknown as Loose;
  /* CORE_BLOCK_ORDER — the shared canonical-order source; the core
     sections are the implicit default when blockOrder is unset. */
  const order = (Array.isArray(loose.blockOrder) ? loose.blockOrder as string[] : [...CORE_BLOCK_ORDER]);
  if (order.includes(section)) return m;
  return { ...loose, blockOrder: [...order, section] } as unknown as StoryManifest;
}

/* Starter FAQ pairs per register — drafts for the host to edit,
   phrased in the right voice for the occasion. */
function starterFaqs(occasion?: string): Array<{ question: string; answer: string }> {
  const solemn = occasion === 'memorial' || occasion === 'funeral';
  if (solemn) {
    return [
      { question: 'Is there a dress code?', answer: 'Dress comfortably — dark or muted colors are welcome, but presence matters more than wardrobe.' },
      { question: 'May I bring flowers?', answer: 'Your company is enough. If you’d like to give, the family will share a preferred remembrance.' },
    ];
  }
  return [
    { question: 'What should I wear?', answer: 'Dress to celebrate — we’ll share the dress code here once it’s settled.' },
    { question: 'Can I bring a plus-one?', answer: 'Check your invitation — if your invite includes a guest, the RSVP form will offer a spot for them.' },
  ];
}

/** Derive up to three honest stitches from the manifest as it
 *  stands. Pure + cheap — runs on every editor open. */
export function deriveBastings(manifest: StoryManifest, slug: string): Basting[] {
  const pulled = readPulled(slug);
  const loose = manifest as unknown as Loose;
  const occasion = (loose.occasion as string | undefined);
  const out: Basting[] = [];

  // 0. The host told Pear their story in the wizard but the story
  //    section is still empty — offer to baste the draft in. This
  //    is the ONE basting that calls the model: /api/story-draft,
  //    grounded in the fact sheet (the host's own words). Leads the
  //    card because it's the highest-value stitch after the instant
  //    wizard (which no longer drafts story content itself).
  const storyBody = ((loose.storySection as Loose | undefined)?.body as string | undefined) ?? '';
  const fs = (loose.factSheet as { howWeMet?: string; why?: string; favorite?: string; story?: string } | undefined) ?? {};
  const hasFacts = [fs.howWeMet, fs.why, fs.favorite, fs.story].some((v) => typeof v === 'string' && v.trim().length > 0);
  if (!storyBody.trim() && hasFacts) {
    out.push({
      id: 'story-from-facts',
      label: 'Your story, drafted from your words',
      detail: 'You told me how it started in the wizard — I can baste a first draft of the story section in from exactly what you said.',
      section: 'story',
      apply: (m) => m,
      applyAsync: async (m) => {
        const l = m as unknown as Loose;
        const logistics = (l.logistics as Loose | undefined) ?? {};
        try {
          const res = await fetch('/api/story-draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              names: l.names,
              occasion: l.occasion,
              venue: logistics.venue,
              place: logistics.place,
              date: logistics.date,
              factSheet: l.factSheet,
              photoCaptions: Object.values((l.galleryCaptions as Record<string, string> | undefined) ?? {}),
            }),
          });
          if (!res.ok) return null;
          const data = (await res.json()) as { draft?: string };
          const draft = (data.draft ?? '').trim();
          if (!draft) return null;
          const storySection = (l.storySection as Loose | undefined) ?? {};
          return blockOrderWith(
            { ...l, storySection: { ...storySection, body: draft } } as unknown as StoryManifest,
            'story',
          );
        } catch {
          return null;
        }
      },
    });
  }

  // 1. Date is set but there's no countdown section.
  const hasDate = Boolean((loose.logistics as Loose | undefined)?.date);
  const order = Array.isArray(loose.blockOrder) ? (loose.blockOrder as string[]) : [];
  const solemn = occasion === 'memorial' || occasion === 'funeral';
  if (hasDate && !solemn && !order.includes('countdown')) {
    out.push({
      id: 'countdown',
      label: 'A countdown to the day',
      detail: 'Your date is set — I can baste in a countdown so guests feel it approaching.',
      section: 'countdown',
      apply: (m) => blockOrderWith(m, 'countdown'),
    });
  }

  // 2. Hotels saved but no map section.
  const hotels = ((loose.travelInfo as Loose | undefined)?.hotels as unknown[] | undefined) ?? [];
  if (hotels.length > 0 && !order.includes('map')) {
    out.push({
      id: 'map',
      label: 'A map beside your hotels',
      detail: `You've saved ${hotels.length} ${hotels.length === 1 ? 'stay' : 'stays'} — a map section would let guests see where everything sits.`,
      section: 'map',
      apply: (m) => blockOrderWith(m, 'map'),
    });
  }

  // 3. FAQ exists but is empty (or missing) — baste in two starters.
  const faqs = (loose.faqs as Array<{ question?: string; answer?: string }> | undefined) ?? [];
  const answered = faqs.filter((f) => (f.answer ?? '').trim()).length;
  if (answered === 0) {
    const starters = starterFaqs(occasion);
    out.push({
      id: 'faq-starters',
      label: 'Two FAQ starters, basted in',
      detail: 'Guests always ask the same first questions — I drafted two you can edit or pull out.',
      section: 'faq',
      apply: (m) => {
        const l = m as unknown as Loose;
        const existing = (l.faqs as unknown[] | undefined) ?? [];
        return { ...l, faqs: [...existing, ...starters] } as unknown as StoryManifest;
      },
    });
  }

  return out.filter((b) => !pulled.has(b.id)).slice(0, 3);
}
