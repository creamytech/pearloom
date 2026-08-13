// ─────────────────────────────────────────────────────────────
// Pearloom / lib/first-pressing/merge.ts
//
// mergeDraft(manifest, drafted) — fold the First Pressing draft
// into the seeded manifest, FILL-ONLY.
//
// Contract (docs/FIRST-PRESSING-PLAN.md §5):
//   • Writes each drafted slot to its exact buildCopy target ONLY
//     when that target is still blank. Never clobbers host-authored
//     or Day-step content.
//   • Records every field-path it wrote into manifest.draftedByPear
//     (field-path keys → true; compatible with the existing
//     Record<string,boolean> the auto-draft route writes).
//   • Sets manifest.pearReviewRequired when it drafts a story field
//     on a solemn (memorial/funeral) occasion.
//   • PURE — does not mutate the input manifest. Only clones the
//     containers it touches (same pattern as wizard-seed.ts).
//   • A declined slot (omitted by the model) writes nothing → the
//     target stays honest-empty.
//
// The renderer targets these mirror buildCopy's read chain in
// ThemedSite.tsx: storySection.{headline,body,chips},
// poetry.heroTagline (+ manifest.tagline, which hydrate-manifest
// backfills from it and buildCopy actually reads), faqs[].answer,
// events[].description, detailsCards[i][2], registryIntro.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { DraftResult } from './schema';

type Loose = Record<string, unknown>;

const SOLEMN_OCCASIONS = new Set(['memorial', 'funeral']);

const blank = (v: unknown): boolean => typeof v !== 'string' || v.trim() === '';

/** Normalize a label/question for tolerant matching (case + spacing). */
const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Fold the draft into the manifest, fill-only. Returns a new manifest;
 * the input is never mutated.
 */
export function mergeDraft(manifest: StoryManifest, drafted: DraftResult | null | undefined): StoryManifest {
  const d = drafted ?? {};
  const out = { ...(manifest as unknown as Loose) };
  const occasion = (out.occasion as string | undefined) ?? '';
  const isSolemn = SOLEMN_OCCASIONS.has(occasion);

  // Accumulate the draft trail — merged into draftedByPear once at
  // the end (dedupe by key; never blindly appends).
  const wrote: string[] = [];
  let wroteStory = false;

  // ── Story ──────────────────────────────────────────────────
  const story = { ...((out.storySection as Loose | undefined) ?? {}) };
  let storyTouched = false;
  if (typeof d.storyHeadline === 'string' && d.storyHeadline.trim() && blank(story.headline)) {
    story.headline = d.storyHeadline.trim();
    wrote.push('storySection.headline');
    storyTouched = true;
    wroteStory = true;
  }
  if (typeof d.storyBody === 'string' && d.storyBody.trim() && blank(story.body)) {
    story.body = d.storyBody.trim();
    wrote.push('storySection.body');
    storyTouched = true;
    wroteStory = true;
  }
  {
    const existingChips = story.chips as unknown[] | undefined;
    const chips = Array.isArray(d.storyChips)
      ? d.storyChips.map((c) => String(c ?? '').trim()).filter(Boolean).slice(0, 3)
      : [];
    if (chips.length === 3 && (!Array.isArray(existingChips) || existingChips.length === 0)) {
      story.chips = chips;
      wrote.push('storySection.chips');
      storyTouched = true;
      wroteStory = true;
    }
  }
  if (storyTouched) out.storySection = story;

  // ── Hero tagline ───────────────────────────────────────────
  // Canonical field per the plan is poetry.heroTagline; buildCopy
  // reads manifest.tagline (hydrate-manifest backfills it from
  // poetry.heroTagline). Fill BOTH, fill-only, so the drafted line
  // renders immediately without depending on the hydrate pass.
  if (typeof d.heroTagline === 'string' && d.heroTagline.trim()) {
    const line = d.heroTagline.trim();
    const poetry = { ...((out.poetry as Loose | undefined) ?? {}) };
    if (blank(poetry.heroTagline)) {
      poetry.heroTagline = line;
      out.poetry = poetry;
      wrote.push('poetry.heroTagline');
    }
    if (blank(out.tagline)) {
      out.tagline = line;
      // record only the canonical path (poetry.heroTagline) to avoid
      // double-badging the same line; add tagline only if poetry was
      // already set (host/template) so the trail still reflects a write.
      if (!wrote.includes('poetry.heroTagline')) wrote.push('tagline');
    }
  }

  // ── FAQ answers (fill blank answers on existing questions) ──
  if (Array.isArray(d.faqAnswers) && d.faqAnswers.length > 0) {
    const faqs = (out.faqs as Array<Loose> | undefined);
    if (Array.isArray(faqs) && faqs.length > 0) {
      const byQ = new Map<string, string>();
      for (const fa of d.faqAnswers) {
        if (fa && typeof fa.question === 'string' && typeof fa.answer === 'string' && fa.answer.trim()) {
          byQ.set(norm(fa.question), fa.answer.trim());
        }
      }
      if (byQ.size > 0) {
        let changed = false;
        const nextFaqs = faqs.map((f, i) => {
          const q = typeof f.question === 'string' ? f.question : '';
          const ans = byQ.get(norm(q));
          if (ans && blank(f.answer)) {
            wrote.push(`faqs.${i}.answer`);
            changed = true;
            return { ...f, answer: ans };
          }
          return f;
        });
        if (changed) out.faqs = nextFaqs;
      }
    }
  }

  // ── Schedule blurbs (fill blank event description by name) ──
  if (Array.isArray(d.scheduleBlurbs) && d.scheduleBlurbs.length > 0) {
    const events = (out.events as Array<Loose> | undefined);
    if (Array.isArray(events) && events.length > 0) {
      const byName = new Map<string, string>();
      for (const sb of d.scheduleBlurbs) {
        if (sb && typeof sb.name === 'string' && typeof sb.blurb === 'string' && sb.blurb.trim()) {
          byName.set(norm(sb.name), sb.blurb.trim());
        }
      }
      if (byName.size > 0) {
        let changed = false;
        const nextEvents = events.map((e, i) => {
          const name = typeof e.name === 'string' ? e.name : '';
          const blurb = byName.get(norm(name));
          if (blurb && blank(e.description)) {
            wrote.push(`events.${i}.description`);
            changed = true;
            return { ...e, description: blurb };
          }
          return e;
        });
        if (changed) out.events = nextEvents;
      }
    }
  }

  // ── Details sublines (fill blank 3rd tuple slot by label) ──
  if (Array.isArray(d.detailsSublines) && d.detailsSublines.length > 0) {
    const cards = (out.detailsCards as Array<[string, string, string?]> | undefined);
    if (Array.isArray(cards) && cards.length > 0) {
      const byLabel = new Map<string, string>();
      for (const ds of d.detailsSublines) {
        if (ds && typeof ds.label === 'string' && typeof ds.subline === 'string' && ds.subline.trim()) {
          byLabel.set(norm(ds.label), ds.subline.trim());
        }
      }
      if (byLabel.size > 0) {
        let changed = false;
        const nextCards = cards.map((card, i) => {
          if (!Array.isArray(card)) return card;
          const label = typeof card[0] === 'string' ? card[0] : '';
          const sub = byLabel.get(norm(label));
          if (sub && blank(card[2])) {
            wrote.push(`detailsCards.${i}.2`);
            changed = true;
            return [card[0], card[1], sub] as [string, string, string];
          }
          return card;
        });
        if (changed) out.detailsCards = nextCards;
      }
    }
  }

  // ── Registry intro ─────────────────────────────────────────
  if (typeof d.registryIntro === 'string' && d.registryIntro.trim() && blank(out.registryIntro)) {
    out.registryIntro = d.registryIntro.trim();
    wrote.push('registryIntro');
  }

  // ── Draft trail + solemn flag ──────────────────────────────
  if (wrote.length > 0) {
    const prev = (out.draftedByPear as Record<string, boolean> | undefined) ?? {};
    const next: Record<string, boolean> = { ...prev };
    for (const path of wrote) next[path] = true;
    out.draftedByPear = next;
  }
  if (wroteStory && isSolemn) {
    out.pearReviewRequired = true;
  }

  return out as unknown as StoryManifest;
}
