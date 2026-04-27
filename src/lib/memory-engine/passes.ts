// ─────────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/passes.ts — AI refinement passes
// (chapter critique, poetry)
// ─────────────────────────────────────────────────────────────────

import { GEMINI_PRO, GEMINI_FLASH, log, logWarn, geminiRetryFetch } from './gemini-client';

// ── Pass 1.2: Chapter Story Quality Gate ─────────────────────────────
// Gemini reviews every chapter description and scores it 1–10 for
// "could this ONLY belong to this specific couple?"
// Any chapter scoring < 7 is rewritten before the user ever sees it.
export async function critiqueAndRefineChapters(
  chapters: import('@/types').Chapter[],
  vibeString: string,
  coupleNames: [string, string] | undefined,
  apiKey: string,
  occasion?: string,
  clusterNotes?: Array<{ chapterIndex: number; note: string; location: string | null }>
): Promise<import('@/types').Chapter[]> {
  if (!chapters.length) return chapters;
  const namesCtx = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';
  const occ = (occasion || 'wedding').charAt(0).toUpperCase() + (occasion || 'wedding').slice(1);

  const chapterList = chapters.map((c, i) =>
    `Chapter ${i}:\n  Title: "${c.title}"\n  Subtitle: "${c.subtitle}"\n  Description: "${c.description}"\n  Mood: ${c.mood}`
  ).join('\n\n');

  // Build cluster notes section for the prompt
  const notesSection = (clusterNotes && clusterNotes.length > 0)
    ? `\nCRITICAL: The following chapters have USER-WRITTEN NOTES that MUST be preserved and reflected in any rewrite:\n${
        clusterNotes
          .filter(cn => cn.chapterIndex < chapters.length)
          .map(cn => {
            const locationPart = cn.location ? ` (location: ${cn.location})` : '';
            return `Chapter ${cn.chapterIndex}: User note: '${cn.note}'${locationPart} — this MUST appear in any rewrite`;
          })
          .join('\n')
      }\n\nWhen a chapter with a user note scores < 7, the issue is generic PROSE, not the content reference. The rewrite must still honor the note's location, activity, and emotional context.\n`
    : '';

  const prompt = `You are a world-class story editor reviewing chapters for ${namesCtx}'s ${occ} website on Pearloom.

Their vibe: "${vibeString.slice(0, 500)}"
${notesSection}
CHAPTERS TO REVIEW:
${chapterList}

For EACH chapter, score 1–10: "Could this description ONLY belong to this couple, or could it fit any ${occ} site?"

Score guide:
- 1–3: Generic filler ("Our journey began...", "We started our adventure...", "It was a beautiful day")
- 4–6: Some personal detail but still fits many couples
- 7–10: Deeply specific — references THEIR actual vibe, uses unexpected language, feels written for THEM alone

Return ONLY valid JSON (no markdown):
{
  "chapters": [
    {
      "index": 0,
      "score": <1-10>,
      "issue": "<one-sentence reason if score < 7, else null>",
      "rewrite": {
        "title": "<improved title, or null if score >= 7>",
        "subtitle": "<improved subtitle, or null if score >= 7>",
        "description": "<FULL rewritten description if score < 7 — 3-4 sentences, FIRST PERSON PLURAL (we/us/our), deeply specific to their vibe, zero clichés. null if score >= 7>"
      }
    }
  ]
}

REWRITE RULES (apply only when score < 7):
- Preserve the date, mood, location metadata — only rewrite the prose
- Must use "We" / "us" / "our" throughout
- Must weave specific details from: "${vibeString.slice(0, 500)}"
- BANNED WORDS: journey, adventure, soulmate, fairy tale, magical, beautiful memories, new chapter, story of us, chapter of our lives
- Each rewritten description must feel like it could ONLY be THIS couple's site`;

  try {
    // Pass 1.2 uses Flash — scoring/judgment task, speed matters more than creativity
    const res = await geminiRetryFetch(
      `${GEMINI_FLASH}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.9,
            maxOutputTokens: 4096,
          },
        }),
      }
    );
    if (!res.ok) throw new Error(`Chapter critique API ${res.status}`);

    const data = await res.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      .replace(/,\s*([}\]])/g, '$1');

    const result = JSON.parse(raw) as {
      chapters: Array<{
        index: number;
        score: number;
        issue?: string | null;
        rewrite: { title: string | null; subtitle: string | null; description: string | null };
      }>;
    };

    // Build a set of chapter indices that have user notes (they get a higher score floor)
    const chaptersWithNotes = new Set(
      (clusterNotes ?? []).map(cn => cn.chapterIndex)
    );

    let rewriteCount = 0;
    const improved = [...chapters];
    for (const review of (result.chapters || [])) {
      const idx = review.index;
      if (typeof idx !== 'number' || idx < 0 || idx >= improved.length) continue;
      // Chapters with user notes only get rewritten if score < 6 (floor bumped to 6)
      // so they are only rewritten when truly broken, not just slightly generic.
      const rewriteThreshold = chaptersWithNotes.has(idx) ? 6 : 7;
      if (review.score < rewriteThreshold && review.rewrite) {
        const ch = { ...improved[idx] };
        if (review.rewrite.title) ch.title = review.rewrite.title;
        if (review.rewrite.subtitle) ch.subtitle = review.rewrite.subtitle;
        if (review.rewrite.description) ch.description = review.rewrite.description;
        improved[idx] = ch;
        rewriteCount++;
        log(`[Chapter Critique] Chapter ${idx} scored ${review.score}/10 — rewritten: ${review.issue}`);
      } else {
        log(`[Chapter Critique] Chapter ${idx} scored ${review.score}/10 — approved`);
      }
    }
    log(`[Chapter Critique] ${rewriteCount}/${chapters.length} chapter(s) rewritten`);
    return improved;
  } catch (err) {
    logWarn('[Chapter Critique] Failed (non-fatal):', err);
    return chapters;
  }
}

// ── Pass 4: Poetry pass ───────────────────────────────────────────────
// Gemini call that generates all couple-specific copywriting:
//   heroTagline      — 5-8 word poetic subtitle for the hero section
//   closingLine      — 10-15 word footer closing line
//   rsvpIntro        — warm, personal 1-2 sentence intro for RSVP
//   welcomeStatement — 3-5 sentence personal intro in the couple's own voice
//   milestones       — year-by-year highlights (anniversaries/birthdays only)
export async function generatePoetryPass(
  vibeString: string,
  coupleNames: [string, string] | undefined,
  chapters: import('@/types').Chapter[],
  apiKey: string,
  occasion?: string
): Promise<{
  heroTagline: string;
  closingLine: string;
  rsvpIntro: string;
  welcomeStatement?: string;
  milestones?: Array<{ year: number; label: string; emoji?: string }>;
}> {
  const namesCtx = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';
  const name1 = coupleNames?.[0] ?? 'We';
  const occ = occasion || 'wedding';

  // Strip structural preamble from vibeString before injecting into poetry prompt.
  // buildVibeString() prepends meta-instructions like "Occasion / Project Type: ..."
  // that are useful for Pass 1 (storytelling) but cause the poetry model to echo
  // them back verbatim as the heroTagline instead of generating a creative tagline.
  const vibeForPoetry = vibeString
    .replace(/^Occasion\s*\/\s*Project Type:[^\n]*\n?/im, '')
    .replace(/^This is a (?:BIRTHDAY|WEDDING|ANNIVERSARY|ENGAGEMENT|CELEBRATION)[^\n]*\n?/gim, '')
    .trim();

  // Pull a few chapter titles to give Gemini narrative context
  const safeChapters = Array.isArray(chapters) ? chapters : [];
  const chapterTitles = safeChapters.slice(0, 5).map(c => `"${c.title}"`).join(', ');
  const chapterContext = safeChapters.slice(0, 8).map(c =>
    `"${c.title}": ${c.description?.slice(0, 300) || ''}`
  ).join('\n');

  const occasionSectionLabels: Record<string, string> = {
    wedding:     'Our Story, The Ceremony, The Celebration, Our Registry, Getting There, Good to Know',
    anniversary: 'Our Journey, Through the Years, Still Us, The Celebration, Wishes',
    birthday:    `Who They Are, Their Story, Celebrating ${name1}, Wishes & Messages`,
    engagement:  "Our Love Story, The Proposal, The Party, What's Next",
    story:       'Our Story, Our Moments, Our World',
  };

  const rsvpIntroContext: Record<string, string> = {
    wedding:     'Write as a couple inviting guests to their wedding celebration.',
    anniversary: 'Write as a couple inviting friends to their anniversary celebration. Warm and inclusive.',
    birthday:    'Write as the host inviting guests to a birthday celebration. Center the birthday person.',
    engagement:  'Write as an engaged couple sharing their joy and inviting guests to celebrate.',
    story:       'Write as a warm personal invitation to share in this moment.',
  };

  const welcomeVoiceGuide: Record<string, string> = {
    wedding:     `Write as the couple, introducing themselves and their relationship. Reference how they met or something specific from their vibe. End with anticipation for the wedding.`,
    anniversary: `Write as the couple looking back at years together. Reference the number of years and something specific they've lived through. Celebratory, warm, reflective.`,
    birthday:    `Write as the host (or the birthday person themselves) introducing ${name1} to guests. Celebrate who they are — specific personality, passions, what makes them unforgettable. First person ("I'm ${name1}…") or third person from the host's perspective.`,
    engagement:  `Write as the newly-engaged couple, bursting with excitement. Reference the proposal story if available in the vibe. Romantic, electric, full of "what's next" energy.`,
    story:       `Write as the person/couple behind this site, introducing themselves and why this story matters. Intimate, personal, literary.`,
  };

  const needsMilestones = ['anniversary', 'birthday'].includes(occ);
  const milestonesInstruction = needsMilestones ? `
5. milestones: An array of ${occ === 'anniversary' ? '6-10 year-by-year highlights from their relationship' : '4-8 life highlights from this person\'s story'}. Each milestone should feel like a mini-chapter title — specific, poetic, 3-6 words. Use the chapter titles and vibe string as source material. Include a relevant emoji for each.
   Example for anniversary: [{"year": 2018, "label": "First terrible date, best story", "emoji": "☕"}, {"year": 2019, "label": "Moved in, chaos ensued", "emoji": "📦"}]
   Example for birthday: [{"year": 1994, "label": "Arrived, immediately took over", "emoji": "🌟"}, {"year": 2012, "label": "Discovered the mountains", "emoji": "⛰️"}]
` : '';

  const sectionLabels = occasionSectionLabels[occ] || occasionSectionLabels.wedding;
  const rsvpContext = rsvpIntroContext[occ] || rsvpIntroContext.wedding;
  const welcomeVoice = welcomeVoiceGuide[occ] || welcomeVoiceGuide.wedding;
  const occCap = occ.charAt(0).toUpperCase() + occ.slice(1);

  const heroTaglineExamples: Record<string, string> = {
    wedding:     '"Where the mountains remembered everything", "Two people who chose the long way home", "Still the same room, still the same light"',
    birthday:    '"Forty years of showing up beautifully", "She arrived and everything got louder", "Still becoming, still magnificent", "The one who made ordinary sacred"',
    anniversary: '"Every year the same choice, every year the right one", "Still choosing each other through everything", "The room where time stopped making sense"',
    engagement:  '"The beginning of everything we said yes to", "Here is where the story changes", "Two people who finally stopped pretending"',
    story:       '"The moments that made everything make sense", "Here, the ordinary becomes permanent", "All the things that led us here"',
  };

  const poetryPrompt = `You are a gifted copywriter and poet writing for ${namesCtx}'s ${occCap} website on Pearloom.
Their vibe: "${vibeForPoetry}"
Story chapters: ${chapterTitles || 'the beginning of their love'}
Chapter summaries:
${chapterContext}

This is a ${occCap} site — every piece of writing must reflect THIS specific occasion and THIS specific person/couple.

Use section labels appropriate for a ${occCap}: ${sectionLabels}

Write ${needsMilestones ? '5' : '4'} pieces of text — each must be deeply specific, not generic:

1. heroTagline: A 5-8 word poetic subtitle for their ${occCap} hero section. Should feel like a line from a literary novel or indie film. Must reference their actual vibe.
   BANNED phrases (do NOT use any of these): "Today is the Day", "Happy Birthday", "Celebrating", "The Big Day", "A love story written in stars", "Happily Ever After", "Special Day", "Time to Celebrate".
   Strong examples for a ${occCap}: ${heroTaglineExamples[occ] || heroTaglineExamples.story}

2. closingLine: A 10-15 word closing line for their site footer. Warm, intimate, final. References their specific story or vibe — not a generic platitude.
   Strong examples: "Two threads, one loom, forever woven in light", "Here is where we began. Here is where we stay.", "See you on the other side of forever."

3. rsvpIntro: A warm, personal 1-2 sentence intro for their RSVP section. ${rsvpContext} Must feel genuinely personal with a specific nod to their celebration.

4. welcomeStatement: ${welcomeVoice}
   CRITICAL RULES:
   - 3-5 sentences. No more.
   - Must feel like a REAL person wrote it, not an AI. Conversational, specific, alive.
   - Must reference at least ONE specific detail from their vibe: "${vibeForPoetry.slice(0, 200)}"
   - Banned: "journey", "adventure", "fairy tale", "soulmate", "beautifully unique story"
   - Must make a guest feel like they know these people after reading it.
   - Strong example tone: "We're Mia and Carlos. We met at a salsa class in Miami — he stepped on her feet twice, she forgave him anyway. Four years later, we're doing this. This site is our way of sharing a little of what got us here before the big day."
${milestonesInstruction}
Return ONLY valid JSON (no markdown, no backticks):
{
  "heroTagline": "<5-8 word poetic subtitle>",
  "closingLine": "<10-15 word closing footer line>",
  "rsvpIntro": "<1-2 warm, personal sentences>",
  "welcomeStatement": "<3-5 sentence personal intro in their voice>"${needsMilestones ? `,
  "milestones": [{"year": <number>, "label": "<3-6 word specific highlight>", "emoji": "<single emoji>"}]` : ''}
}`;

  // Pass 4 uses Gemini 3.1 Pro — welcome statement + poetry requires maximum creative quality
  const res = await geminiRetryFetch(
    `${GEMINI_PRO}?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: poetryPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 1.0,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Poetry pass API ${res.status}`);

  const data = await res.json();
  let raw: string = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    .replace(/,\s*([}\]])/g, '$1');

  const result = JSON.parse(raw) as {
    heroTagline?: string;
    closingLine?: string;
    rsvpIntro?: string;
    welcomeStatement?: string;
    milestones?: Array<{ year: number; label: string; emoji?: string }>;
  };

  // Validate word counts — if the model echoed back instructions instead of
  // generating copy, the output will be far too long and must be rejected.
  const isShortEnough = (s: string, maxWords: number) =>
    typeof s === 'string' && s.length > 0 && s.split(/\s+/).length <= maxWords;

  const heroTaglineFallbacks: Record<string, string> = {
    wedding:     'A love story worth every page',
    birthday:    'Still becoming, still magnificent',
    anniversary: 'Every year the same choice',
    engagement:  'The beginning of everything',
    story:       'The moments that made us',
  };

  return {
    heroTagline: isShortEnough(result.heroTagline ?? '', 12)
      ? result.heroTagline! : (heroTaglineFallbacks[occ] ?? heroTaglineFallbacks.wedding),
    closingLine: isShortEnough(result.closingLine ?? '', 20)
      ? result.closingLine! : 'Thank you for being part of our story.',
    rsvpIntro: typeof result.rsvpIntro === 'string' && result.rsvpIntro.length > 0
      ? result.rsvpIntro : "We can't wait to celebrate with you. Please let us know if you'll be joining us.",
    ...(typeof result.welcomeStatement === 'string' && result.welcomeStatement.length > 10
      ? { welcomeStatement: result.welcomeStatement } : {}),
    ...(Array.isArray(result.milestones) && result.milestones.length > 0
      ? { milestones: result.milestones } : {}),
  };
}

