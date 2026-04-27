// ─────────────────────────────────────────────────────────────
// Pearloom / memory-engine/grounding.ts
//
// Pass 1.5 — fact-grounding. Pass 1 (core storytelling) is
// intentionally looseish so chapters read like a novel, not a
// form. That's great for atmosphere but risky for facts: the
// model will happily invent where a couple met, how long they've
// been together, a grandmother's name.
//
// This pass is a cheap Haiku review of every chapter paragraph
// against the user's ground-truth inputs (cluster notes + the
// optional factSheet). It flags any sentence that makes a
// factual claim NOT backed by those inputs and the critique
// pass (Pass 1.2) then strips/rewrites them.
//
// We don't delete ungrounded sentences outright — we wrap them
// with a `[UNGROUNDED: ...]` marker and hand the chapters to
// Pass 1.2, which already knows how to refine.
// ─────────────────────────────────────────────────────────────

import { generate, textFrom } from '@/lib/claude';
import { log, logWarn } from './gemini-client';
import type { Chapter } from '@/types';

interface FactSheet {
  howWeMet?: string;
  why?: string;
  favorite?: string;
}

interface GroundingInput {
  chapters: Chapter[];
  clusterNotes: Array<{ note: string; location: string | null }>;
  factSheet?: FactSheet;
}

interface GroundingResult {
  chapters: Chapter[];
  flaggedCount: number;
}

/**
 * Returns a copy of chapters where any sentence the grounding model
 * flagged as ungrounded is wrapped with `[UNGROUNDED: ...]` so Pass
 * 1.2 strips it. Safe on failure: returns chapters unmodified if the
 * Claude call fails, so grounding is never a hard blocker.
 */
export async function groundChaptersAgainstNotes({
  chapters,
  clusterNotes,
  factSheet,
}: GroundingInput): Promise<GroundingResult> {
  if (chapters.length === 0) return { chapters, flaggedCount: 0 };

  // If user provided no notes AND no factSheet, skip — there's
  // nothing to ground against, and we'd end up flagging everything.
  const factsLines = [
    factSheet?.howWeMet ? `How they met: ${factSheet.howWeMet}` : null,
    factSheet?.why ? `Why this event matters: ${factSheet.why}` : null,
    factSheet?.favorite ? `Favorite: ${factSheet.favorite}` : null,
  ].filter(Boolean) as string[];
  const notesLines = clusterNotes
    .slice(0, 40)
    .map((cn, i) => `  [${i + 1}] ${cn.note}${cn.location ? ` (${cn.location})` : ''}`)
    .filter((l) => l.length > 5);

  const haveGround = notesLines.length + factsLines.length > 0;
  if (!haveGround) {
    log('[Grounding] no user notes or factSheet — skipping');
    return { chapters, flaggedCount: 0 };
  }

  const chapterBlob = chapters
    .slice(0, 12)
    .map(
      (c, i) =>
        `CHAPTER_${i}_ID: ${c.id}\nCHAPTER_${i}_TITLE: ${c.title}\nCHAPTER_${i}_TEXT: ${(c.description ?? '').slice(0, 1200)}`,
    )
    .join('\n\n');

  const groundBlob = [
    factsLines.length > 0 ? 'USER-SUPPLIED FACTS:\n' + factsLines.join('\n') : '',
    notesLines.length > 0 ? 'USER-SUPPLIED PHOTO NOTES:\n' + notesLines.join('\n') : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const prompt = `You are checking chapter paragraphs for ungrounded factual claims.

Flag any sentence that makes a specific factual claim NOT supported by the user-supplied facts or photo notes below. Examples of claims to flag: where they met, what year something happened, a specific person's name, a location, a profession, a quoted line, a duration.

Do NOT flag purely atmospheric / literary language ("the light was warm", "everyone laughed"), adjectives, or emotional claims without specifics. Those are fine.

${groundBlob}

CHAPTERS (verbatim — you must reproduce them exactly if unchanged):

${chapterBlob}

Return a JSON object shaped like:
{
  "reviews": [
    {
      "chapterId": "chapter_abc",
      "rewrittenText": "<the chapter text with every ungrounded sentence replaced with [UNGROUNDED: <the original sentence>]. Keep everything else exactly the same.>"
    }
  ]
}

If a chapter needed no changes, still include it with rewrittenText equal to the original.
Return ONLY the JSON, no preamble.`;

  try {
    const msg = await generate({
      tier: 'haiku',
      temperature: 0.1,
      maxTokens: 4096,
      system:
        'You are a cheap, careful fact-checker. You only flag specific factual claims with no support in the supplied notes. You never hallucinate content — you only wrap the original words in [UNGROUNDED: ...] brackets.',
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = textFrom(msg).trim();
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < 0) {
      logWarn('[Grounding] no JSON in response — skipping');
      return { chapters, flaggedCount: 0 };
    }
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
      reviews?: Array<{ chapterId: string; rewrittenText: string }>;
    };
    if (!Array.isArray(parsed.reviews)) {
      return { chapters, flaggedCount: 0 };
    }

    let flaggedCount = 0;
    const byId = new Map(parsed.reviews.map((r) => [r.chapterId, r.rewrittenText]));
    const next = chapters.map((c) => {
      const rewritten = byId.get(c.id);
      if (!rewritten || typeof rewritten !== 'string') return c;
      const flags = rewritten.match(/\[UNGROUNDED:/g)?.length ?? 0;
      flaggedCount += flags;
      if (flags === 0) return c;
      return { ...c, description: rewritten };
    });

    log(
      `[Grounding] flagged ${flaggedCount} ungrounded sentence${flaggedCount === 1 ? '' : 's'} across ${parsed.reviews.length} chapter${parsed.reviews.length === 1 ? '' : 's'}`,
    );
    return { chapters: next, flaggedCount };
  } catch (err) {
    logWarn('[Grounding] check failed — proceeding with unmodified chapters:', err);
    return { chapters, flaggedCount: 0 };
  }
}

/**
 * Strip the `[UNGROUNDED: ...]` markers the grounding pass added.
 * Called by Pass 1.2 (critique) when the model hasn't rewritten
 * them into new grounded copy — we'd rather drop a sentence than
 * ship a flagged claim. Safe on unflagged input.
 */
export function stripUngroundedMarkers(text: string): string {
  return text
    .replace(/\[UNGROUNDED:\s*([^\]]+)\]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
