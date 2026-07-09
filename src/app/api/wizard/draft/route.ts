// ─────────────────────────────────────────────────────────────
// Pearloom / api/wizard/draft/route.ts
//
// POST /api/wizard/draft
//   body: { manifest: StoryManifest }
//   returns: { drafted: DraftResult }   (never throws to the caller)
//
// THE FIRST PRESSING draft pass. One lean batched Sonnet call drafts
// real per-section copy (story, hero line, voiced FAQ answers,
// schedule blurbs, details sublines, registry intro) from the seeded
// manifest + fact-sheet + occasion voice. Manifest-in / draft-out so
// the same route serves the wizard's generate moment AND a future
// editor "draft more" button.
//
// STRICTLY ADDITIVE:
//   • No ANTHROPIC_API_KEY → { drafted: {}, skipped: 'unconfigured' }.
//   • Claude error / malformed → try/catch → { drafted: {} }.
//   • Gated / rate-limited → the caller treats a non-2xx as "no draft".
// The site always generates. Text-only — ONE call, no vision, no
// multi-pass, no image gen (see FIRST-PRESSING-PLAN §6/§7).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, checkPearGate } from '@/lib/rate-limit';
import { getEventType } from '@/lib/event-os/event-types';
import { DRAFT_SCHEMA, VOICE_DIRECTIVE, type DraftResult } from '@/lib/first-pressing/schema';
import { overBudget, chargeAi, centsForUsage, approxTokens, budgetKey } from '@/lib/ai-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Loose = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const blank = (v: unknown): boolean => str(v) === '';

const SYSTEM = `You are Pear, drafting the FIRST DRAFT of a celebration website from the host's own answers.

Absolute rules:
- Work ONLY from the facts provided. Never invent people, places, venues, dates, times, prices, addresses, guest names, policies, or "fun facts."
- If you cannot honestly ground a slot in the given facts, OMIT that slot entirely. Declining is correct — a blank is better than a fabrication.
- The story slots require a real story from the host. If none was given, omit them.
- Warm and editorial, never cheesy, never salesy. No exclamation marks. Never say "AI-generated", "Generated", "Loading", or refer to yourself.
- Copy is for the host to make their own — draft it as if writing on their behalf, in their register.
- Emit your result ONLY through the emit_first_pressing tool.`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  // Plan-tier gate — the draft is a Claude spend. A blocked account
  // gets a 429 the client reads as "no draft" → ships seeded.
  const { blocked } = await checkPearGate(session.user.email);
  if (blocked) return blocked;

  const rate = checkRateLimit(`fp-draft:${session.user.email}:${getClientIp(req)}`, {
    max: 8,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many draft passes. Wait a moment.' }, { status: 429 });
  }

  let body: { manifest?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const manifest = (body.manifest && typeof body.manifest === 'object' ? body.manifest : null) as Loose | null;
  if (!manifest) {
    return NextResponse.json({ error: 'manifest required' }, { status: 400 });
  }

  // Unconfigured → graceful degrade to today's behavior.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ drafted: {}, skipped: 'unconfigured' });
  }

  // ── Extract grounded facts + decide which BLANK slots to attempt.
  const occasion = str(manifest.occasion) || 'wedding';
  const voice = getEventType(occasion)?.voice ?? 'celebratory';
  const names = (Array.isArray(manifest.names) ? manifest.names : []).map(str).filter(Boolean);
  const factSheet = (manifest.factSheet as Loose | undefined) ?? {};
  const logistics = (manifest.logistics as Loose | undefined) ?? {};
  const vibes = str(manifest.vibeString);
  const storySection = (manifest.storySection as Loose | undefined) ?? {};

  const hasStory = !blank(factSheet.story) || !blank(factSheet.howWeMet) || !blank(factSheet.favorite);
  const wantStory = hasStory && blank(storySection.body) && blank(storySection.headline);
  const wantHero = blank(manifest.tagline) && blank((manifest.poetry as Loose | undefined)?.heroTagline);

  const faqs = (Array.isArray(manifest.faqs) ? manifest.faqs : []) as Array<Loose>;
  const blankFaqQuestions = faqs.map((f) => (blank(f.answer) ? str(f.question) : '')).filter(Boolean);

  const events = (Array.isArray(manifest.events) ? manifest.events : []) as Array<Loose>;
  const blankEventNames = events.map((e) => (blank(e.description) ? str(e.name) : '')).filter(Boolean);

  const detailsCards = (Array.isArray(manifest.detailsCards) ? manifest.detailsCards : []) as Array<unknown[]>;
  const blankDetailCards = detailsCards
    .filter((c) => Array.isArray(c) && !blank(c[0]) && blank(c[2]))
    .map((c) => ({ label: str(c[0]), value: str(c[1]) }));

  const registry = (manifest.registry as Loose | undefined) ?? {};
  const registryFunds = manifest.registryFunds as Loose | undefined;
  const registryEnabled = registry.enabled === true
    || (Array.isArray(registry.entries) && registry.entries.length > 0)
    || !!registryFunds;
  const wantRegistry = registryEnabled && blank(manifest.registryIntro);

  // Nothing to draft → skip the call entirely (cheapest degrade).
  const attempt = {
    story: wantStory,
    hero: wantHero,
    faqs: blankFaqQuestions.length > 0,
    schedule: blankEventNames.length > 0,
    details: blankDetailCards.length > 0,
    registry: wantRegistry,
  };
  if (!Object.values(attempt).some(Boolean)) {
    return NextResponse.json({ drafted: {} });
  }

  // ── Build the grounded USER turn. Voice directive + facts live
  //    here (the SYSTEM prompt is cached and must stay static).
  const facts: string[] = [];
  facts.push(`OCCASION: ${occasion}`);
  facts.push(`VOICE — write in this register: ${VOICE_DIRECTIVE[voice]}`);
  if (names.length) facts.push(`WHO: ${names.join(' & ')}`);
  if (!blank(logistics.date)) facts.push(`DATE: ${str(logistics.date)}`);
  if (!blank(logistics.venue)) facts.push(`VENUE: ${str(logistics.venue)}`);
  if (vibes) facts.push(`VIBES (extra tone signal): ${vibes}`);

  if (wantStory) {
    facts.push('');
    facts.push("THE HOST'S STORY (draft storyHeadline + storyBody + storyChips ONLY from this — spend these anchors, invent nothing):");
    if (!blank(factSheet.story)) facts.push(`- Their words: ${str(factSheet.story)}`);
    if (!blank(factSheet.howWeMet)) facts.push(`- How it began: ${str(factSheet.howWeMet)}`);
    if (!blank(factSheet.why)) facts.push(`- Why this matters: ${str(factSheet.why)}`);
    if (!blank(factSheet.favorite)) facts.push(`- A favorite memory: ${str(factSheet.favorite)}`);
    if (Array.isArray(factSheet.anchors) && factSheet.anchors.length) {
      facts.push(`- Anchors to weave in: ${(factSheet.anchors as unknown[]).map(str).filter(Boolean).join('; ')}`);
    }
  } else {
    facts.push('');
    facts.push('NO story was provided — DO NOT emit storyHeadline/storyBody/storyChips.');
  }

  if (attempt.faqs) {
    facts.push('');
    facts.push('BLANK FAQ QUESTIONS — answer ONLY the ones the facts above actually cover; copy each question verbatim into faqAnswers[].question, omit any you cannot ground:');
    blankFaqQuestions.forEach((q) => facts.push(`- ${q}`));
  }
  if (attempt.schedule) {
    facts.push('');
    facts.push('SCHEDULE MOMENTS needing a one-line blurb (copy each name verbatim into scheduleBlurbs[].name; one short descriptive line, never a new time/place):');
    events.forEach((e) => {
      if (blank(e.description) && !blank(e.name)) facts.push(`- ${str(e.name)}${blank(e.time) ? '' : ` (${str(e.time)})`}`);
    });
  }
  if (attempt.details) {
    facts.push('');
    facts.push('DETAIL CARDS needing a warm second line (copy the label verbatim into detailsSublines[].label; expand the value, no new facts):');
    blankDetailCards.forEach((c) => facts.push(`- ${c.label}: ${c.value}`));
  }
  if (attempt.registry) {
    facts.push('');
    const solemn = voice === 'solemn';
    facts.push(
      solemn
        ? 'Draft registryIntro as a gentle "in lieu of flowers" / in-memory note (tone only, no amounts).'
        : 'Draft registryIntro as a short, warm tone line (no amounts, no policy not given).',
    );
  }
  if (attempt.hero) {
    facts.push('');
    facts.push('Draft heroTagline: 5–8 words, a register/tone line, no fabricated facts.');
  }

  // Daily AI dollar cap (src/lib/ai-budget.ts). Keyed by account
  // email. Fails open — only blocks on a confirmed over-budget read.
  const budget = budgetKey(session.user.email, getClientIp(req));
  if (await overBudget(budget)) {
    return NextResponse.json(
      { error: "You've reached today's AI limit. Try again tomorrow." },
      { status: 429 }
    );
  }

  try {
    const { generateJson } = await import('@/lib/claude/structured');
    const { cached, CLAUDE_SONNET } = await import('@/lib/claude/client');
    const userTurn = facts.join('\n');
    const drafted = await generateJson<DraftResult>({
      tier: 'sonnet',
      system: [cached(SYSTEM)],
      messages: [{ role: 'user', content: userTurn }],
      schema: DRAFT_SCHEMA,
      schemaName: 'emit_first_pressing',
      schemaDescription: 'Emit the first-pressing draft. Every field optional — omit any slot you cannot honestly ground.',
      maxTokens: 1400,
      temperature: 0.7,
    });
    // Charge the estimated cost once the model call succeeded.
    void chargeAi(
      budget,
      centsForUsage({
        provider: 'claude',
        model: CLAUDE_SONNET,
        inputTokens: approxTokens(`${SYSTEM}${userTurn}`),
        outputTokens: approxTokens(JSON.stringify(drafted ?? {})),
        ms: 0,
      })
    );
    return NextResponse.json({ drafted: drafted && typeof drafted === 'object' ? drafted : {} });
  } catch (err) {
    console.warn('[wizard/draft] claude error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ drafted: {} });
  }
}
