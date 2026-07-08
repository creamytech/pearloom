import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ownerEmailOf } from '@/lib/cohost-access';
import { GEMINI_FLASH } from '@/lib/memory-engine/gemini-client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { overBudget, chargeAi, centsForUsage, budgetKey } from '@/lib/ai-budget';
import { condensedFaqForPrompt } from '@/lib/help-faq';
import {
  summarizeVendorBook,
  describeNextDue,
  fmtCentsPlain,
  type VendorBookSummary,
} from '@/lib/vendor-book-summary';
import type { StoryManifest } from '@/types';

// ─────────────────────────────────────────────────────────────
// POST /api/pear-chat
//
// Streaming chat endpoint for the Pear Companion in the editor.
// Takes the manifest + a recent conversation tail + the host's
// new prompt; streams Pear's response back as SSE so the chat
// surface can render text as it arrives.
//
// The model is steered to:
//   • Respond in plain prose (no JSON unless explicitly asked)
//   • Reference specific things on THIS site (chapter titles,
//     venue name, etc.) — never generic "you might want to add"
//   • Proactively offer manifest patches for actionable asks
//     ("rewrite my hero tagline" → response includes a small
//     JSON block prefixed with `pearloom:patch` that the client
//     can detect + offer "Apply" on)
// ─────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'pear';
  content: string;
}

interface ChatRequest {
  manifest: StoryManifest;
  coupleNames: [string, string];
  /** The new prompt the host typed. */
  prompt: string;
  /** Up to ~6 recent messages so Pear has working memory. */
  history?: ChatMessage[];
  /** What the host is currently editing on canvas. When set,
   *  Pear biases its response toward that section so "polish
   *  this" works without the host having to specify what. */
  context?: {
    /** The current block key — 'hero' | 'story' | 'travel' | … */
    block?: string;
    /** Specific block ids selected (multi-select on canvas). */
    selectedIds?: string[];
  };
  /** Determines which system prompt Pear uses:
   *   • 'host'  — full editor mode, can suggest patches (default)
   *   • 'guest' — public-site concierge for visitors. No patches,
   *               warmer hospitality voice, only answers questions
   *               grounded in the manifest.
   *  Advisory only: `mode` picks the voice/patch behaviour, but it
   *  NEVER unlocks the privileged server-side stats — that is gated
   *  on a server-derived ownership check (see `callerOwnsSite`). */
  mode?: 'host' | 'guest';
  /** Site subdomain. Live activity stats (RSVP counts, registry
   *  claims, and the vendor-book money ledger) are fetched and
   *  surfaced to Pear ONLY when the request carries a valid session
   *  whose email owns this slug — never for anonymous callers who
   *  merely know a public subdomain. */
  siteSlug?: string;
}

const SYSTEM = `You are Pear, the Pearloom site assistant. You help a host design their wedding / celebration site.

Voice: warm, observational, never lecturing. Short paragraphs. Reference specific things on THIS site (chapter titles, the actual venue name, etc.) — never generic suggestions.

Style guide:
- Use plain prose, not bullet lists, unless the user asks for a list.
- Never say "AI" or "AI-generated". You're Pear, a person.
- Never say "AI-generated" or "AI-powered"; say "drafted". Keep language plain and warm — write for someone who isn't technical. Avoid craft jargon like "weave", "the loom", or "basted"; say "make", "your account", "added".
- Lowercase first-letter sentences only when the host writes that way; otherwise sentence case.

When LIVE ACTIVITY counts are present in the site state, treat them as up-to-date facts. If the host asks "what should I focus on?" or "what's left?", lead with the most actionable number — e.g. "12 guests still haven't RSVP'd; want me to draft a nudge?" — instead of generic copy advice. Don't fabricate counts that aren't shown.

When a VENDOR BOOK block is present, money questions ("what's still unpaid?", "what's due this week?", "how much have we spent?") are answered from those numbers, plainly — name the vendor, the amount, and the date. Never invent a vendor figure that isn't shown; if the book has no answer, say so.

When the host explicitly asks you to SEND a nudge to pending guests ("yes send the nudge", "draft and send to the pending ones", "nudge them", "send a reminder to the holdouts"), emit an ACTION envelope instead of a field-edit patch:

\`\`\`pearloom:patch
{
  "summary": "Send a reminder to the N pending guests",
  "action": {
    "kind": "send_nudge_pending",
    "previewBody": "Quick note from us — the 14th is coming up. Tap to let us know either way before March 1st."
  },
  "patches": []
}
\`\`\`

Rules for action envelopes:
- Only emit when the host clearly wants Pear to RUN the action, not just suggest one.
- Use the LIVE ACTIVITY pending count when N is referenced.
- Write a real preview body in previewBody (3-4 sentences, warm, references date/venue if you know them) — the client will send exactly this if the host approves. The host can still cancel before send.
- Never fabricate; if no pending count is shown, ask the host first instead of emitting an action.
- Don't combine action envelopes with field-edit patches — keep patches:[].

When the host asks you to make a concrete change to the site (e.g. "rewrite my hero tagline", "add a fun FAQ", "polish my first chapter"), include a single JSON code block at the END of your response prefixed with the marker line "pearloom:patch":

\`\`\`pearloom:patch
{
  "summary": "Short human-readable summary of what this changes",
  "patches": [
    {
      "path": "poetry.heroTagline",
      "value": "the new copy",
      "before": "the existing copy you saw on the manifest"
    }
  ]
}
\`\`\`

When the host asked for OPTIONS to pick from (e.g. "rewrite my hero tagline three different ways", "give me 3 versions of the welcome line"), use \`options\` instead of \`value\`. The client renders each option as a picker tile so the host taps the one they like:

\`\`\`pearloom:patch
{
  "summary": "Three tagline drafts in your voice",
  "patches": [
    {
      "path": "poetry.heroTagline",
      "before": "the existing copy",
      "options": [
        "first draft",
        "second draft",
        "third draft"
      ],
      "optionLabels": ["Warm", "Specific", "Quiet"]
    }
  ]
}
\`\`\`

Always include \`before\` for string-valued patches when an existing value is present in the manifest summary — the card uses it to render a side-by-side diff so the host can compare without re-checking the field. Skip \`before\` when the field is empty.

When you offer options, give 2-4 of them (3 is the sweet spot). Each option must be a complete, applyable value — not "Option A" labels. \`optionLabels\` is optional but useful when the options are stylistically distinct ("Formal", "Playful", "Brief").

Supported patch paths:
- poetry.heroTagline (string)
- poetry.welcomeStatement (string)
- poetry.closingLine (string)
- logistics.dresscode (string)
- logistics.notes (string)
- chapters[N].title / chapters[N].description (where N is the 0-indexed chapter)
- faqs (replace whole array — items: { id, question, answer, order })

If the host is just asking a question (not requesting a change), DON'T include a patch block. Just answer in prose.

After your prose response, you MAY include up to 3 short follow-up suggestions in another fenced block — only if they'd genuinely help the host's next move. Format:

\`\`\`pearloom:followups
["Polish my hero tagline", "Draft 3 FAQs", "Suggest hotel descriptions"]
\`\`\`

Each suggestion is a short imperative (under 36 chars). Skip the block when nothing useful comes to mind.

Keep responses under 180 words unless the host explicitly asks for more.

PRODUCT FAQ — answer product how-to questions ("how do I add a section?", "how do I publish?") from this:
${condensedFaqForPrompt()}

If the host asks a product question the FAQ doesn't cover, say so plainly and point them to /dashboard/help — never invent product behavior that isn't listed above.`;

// Guest-mode system prompt. The same Pear voice but pivoted from
// "edit the site" to "help a visitor find what they need." No
// patches, no edits — just hospitable answers grounded in the
// manifest the host already wrote.
const SYSTEM_GUEST = `You are Pear, the concierge on a private celebration site. A guest of the host has tapped a chat pill at the bottom of the page; they're not the host, and they can't edit anything. Your job is to answer their question quickly and warmly using ONLY the information on this site.

Voice: warm, observational, hospitable. Imagine you're the host's witty friend who knows the answer. Reference specifics: the actual venue, dress code, schedule, hotels — never generic suggestions. Two short paragraphs at most.

Style guide:
- Plain prose. No bullet lists unless the answer is genuinely a list (like "the three hotels nearby").
- Never say "AI" or "AI-generated". You're Pear, a person.
- Say "drafted", never "AI-generated". Keep it plain and warm for a non-technical host — no craft jargon ("weave", "the loom", "basted"); say "make", "added", "nothing yet on that".
- Lowercase first-letter sentences only when the host writes that way; otherwise sentence case.

When you don't have the answer in the manifest:
- Say so honestly: "I don't have that on the page yet — try asking {couple} directly."
- Suggest a related thing you DO have if relevant ("but here's the dress code: …").

NEVER:
- Make up venue details, times, addresses, or dietary information that isn't on the manifest.
- Suggest the guest edit the site or "ask the AI to update".
- Emit pearloom:patch blocks. Guests can't apply patches.
- Speak for the host (no "we'd love to have you there" — you're not the host).

Common guest questions you should be ready for:
- "Where do I park / how do I get there?" → travel + venue address.
- "What time is X?" → schedule events, ceremony time.
- "What should I wear?" → dress code from logistics.
- "Can I bring my kid / a +1?" → check the FAQ + RSVP plus_one config.
- "Where should I stay?" → hotels from travelInfo.
- "What's the registry link?" → registry block.
- "How do I RSVP?" → tell them to scroll to the RSVP section or tap the RSVP button.

Keep responses under 100 words. Brevity reads as confident hospitality.`;

// ─── Live activity stats for host mode ────────────────────────
// Pulls cheap counts for RSVPs / photos / claims / submissions /
// guestbook so Pear can answer "what should I focus on next?"
// with specifics. Cached per slug for STATS_TTL_MS so chat
// volume doesn't pound Supabase on every keystroke.

interface ActivityStats {
  rsvp: { attending: number; declined: number; pending: number; total: number };
  photos: number;
  claims: number;
  guestbook: number;
  submissions: number;
  /** Vendor Book aggregates (site_vendors) — null when the book is
   *  empty or the table is missing on this deployment. */
  vendors: VendorBookSummary | null;
}

const STATS_TTL_MS = 30_000;
const statsCache = new Map<string, { at: number; stats: ActivityStats }>();

function getStatsSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Server-side ownership check — the ONLY gate for the privileged
// host-advisor stats path (RSVP counts + the vendor-book money
// ledger). The client-supplied `mode` field is advisory (it only
// picks Pear's voice/patch behaviour); it can NEVER unlock a
// server-side read of another host's private data. A caller gets
// the stats block only when they hold a valid session whose email
// owns `siteSlug`. Returns false for anon callers, non-owners, or
// unknown slugs.
async function callerOwnsSite(siteSlug: string, email: string): Promise<boolean> {
  const sb = getStatsSupabase();
  if (!sb) return false;
  try {
    const { data: site } = await sb
      .from('sites')
      .select('creator_email, site_config')
      .eq('subdomain', siteSlug)
      .maybeSingle();
    if (!site) return false;
    const owner = ownerEmailOf(site);
    return owner.length > 0 && owner === email.toLowerCase().trim();
  } catch {
    return false;
  }
}

async function fetchActivityStats(siteSlug: string): Promise<ActivityStats | null> {
  const cached = statsCache.get(siteSlug);
  if (cached && Date.now() - cached.at < STATS_TTL_MS) return cached.stats;

  const sb = getStatsSupabase();
  if (!sb) return null;

  // Resolve slug → uuid once.
  const { data: site } = await sb
    .from('sites')
    .select('id')
    .eq('subdomain', siteSlug)
    .maybeSingle();
  const siteId = (site as { id?: string } | null)?.id;
  if (!siteId) return null;

  // Fan out cheap counts in parallel. Each query is awaited
  // inside its own try so a missing table on a deployment doesn't
  // break the whole stats block.
  type CountResult = { count: number | null } | null;
  async function countOf(builder: PromiseLike<{ count: number | null }>): Promise<CountResult> {
    try {
      return await builder;
    } catch {
      return null;
    }
  }
  // Vendor Book rows → pure aggregation. Full rows (not a count)
  // because Pear needs sums, the next due item, and arrival times.
  async function vendorBookOf(): Promise<VendorBookSummary | null> {
    try {
      const { data, error } = await sb!
        .from('site_vendors')
        .select('name, category, status, cost_cents, deposit_cents, deposit_due, balance_due, deposit_paid, balance_paid, arrival_time')
        .eq('site_id', siteId)
        .limit(120);
      if (error || !data || data.length === 0) return null;
      const rows = (data as Array<{
        name: string; category: string; status: string;
        cost_cents: number | null; deposit_cents: number | null;
        deposit_due: string | null; balance_due: string | null;
        deposit_paid: boolean; balance_paid: boolean; arrival_time: string | null;
      }>).map((r) => ({
        name: r.name,
        category: r.category,
        status: r.status,
        costCents: r.cost_cents,
        depositCents: r.deposit_cents,
        depositDue: r.deposit_due,
        balanceDue: r.balance_due,
        depositPaid: r.deposit_paid,
        balancePaid: r.balance_paid,
        arrivalTime: r.arrival_time,
      }));
      return summarizeVendorBook(rows, new Date().toISOString().slice(0, 10));
    } catch {
      return null;
    }
  }
  const [
    attendingRes,
    declinedRes,
    pendingRes,
    photosRes,
    claimsRes,
    gbRes,
    subsRes,
    vendorBook,
  ] = await Promise.all([
    countOf(sb.from('guests').select('id', { count: 'exact', head: true }).eq('site_id', siteId).eq('status', 'attending')),
    countOf(sb.from('guests').select('id', { count: 'exact', head: true }).eq('site_id', siteId).eq('status', 'declined')),
    countOf(sb.from('guests').select('id', { count: 'exact', head: true }).eq('site_id', siteId).is('responded_at', null)),
    countOf(sb.from('guest_photos').select('id', { count: 'exact', head: true }).eq('site_id', siteId)),
    countOf(sb.from('registry_link_claims').select('id', { count: 'exact', head: true }).eq('site_id', siteId).is('revoked_at', null)),
    countOf(sb.from('guestbook').select('id', { count: 'exact', head: true }).eq('site_id', siteId)),
    countOf(sb.from('tribute_submissions').select('id', { count: 'exact', head: true }).eq('site_id', siteId)),
    vendorBookOf(),
  ]);

  const c = (r: CountResult): number => r?.count ?? 0;
  const stats: ActivityStats = {
    rsvp: {
      attending: c(attendingRes),
      declined: c(declinedRes),
      pending: c(pendingRes),
      total: c(attendingRes) + c(declinedRes) + c(pendingRes),
    },
    photos: c(photosRes),
    claims: c(claimsRes),
    guestbook: c(gbRes),
    submissions: c(subsRes),
    vendors: vendorBook,
  };
  statsCache.set(siteSlug, { at: Date.now(), stats });
  return stats;
}

function summariseStats(stats: ActivityStats): string {
  let block = `LIVE ACTIVITY (current state, source-of-truth):
  - RSVPs: ${stats.rsvp.attending} attending, ${stats.rsvp.declined} declined, ${stats.rsvp.pending} pending of ${stats.rsvp.total} invited
  - Guest photos uploaded: ${stats.photos}
  - Registry gift claims: ${stats.claims}
  - Guestbook entries: ${stats.guestbook}
  - Wall submissions (advice/tribute): ${stats.submissions}`;
  const v = stats.vendors;
  if (v) {
    block += `

VENDOR BOOK (host-entered ledger, source-of-truth for money):
  - ${v.bookedCount} booked, ${v.paidCount} fully paid
  - Total booked cost: ${fmtCentsPlain(v.totalBookedCents)} · paid so far: ${fmtCentsPlain(v.paidCents)} · unpaid remainder: ${fmtCentsPlain(v.unpaidCents)}`;
    if (v.nextDue) block += `\n  - Next due: ${describeNextDue(v.nextDue)}`;
    if (v.arrivals.length) block += `\n  - Arrivals on the day: ${v.arrivals.join('; ')}`;
  }
  return block;
}

// Default tagline shipped by the wizard. Kept in sync with the
// pear-critique route's check; both surfaces have to agree on what
// "the host hasn't edited the hero" means.
const DEFAULT_TAGLINE = "We'd love you there. Come celebrate with us — the day will be better for it.";

function isPlaceholderTagline(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return true;
  if (trimmed === DEFAULT_TAGLINE.toLowerCase()) return true;
  return trimmed.includes("celebrate with us") && trimmed.includes("the day will be better");
}

function summariseManifest(manifest: StoryManifest, names: [string, string]): string {
  const couple = `${names[0]} & ${names[1]}`;
  const l = manifest.logistics ?? {};
  const date = l.date ?? '(none)';
  const rsvp = l.rsvpDeadline ?? '(none)';
  const venue = l.venue ?? '(none)';
  const venueAddress = l.venueAddress ?? '';
  const dresscode = l.dresscode ?? '(none)';
  const logisticsNotes = (l.notes ?? '').slice(0, 120);
  const tagline = manifest.poetry?.heroTagline ?? '';
  const taglineNote = isPlaceholderTagline(tagline) ? ' (DEFAULT PLACEHOLDER)' : '';
  const welcome = (manifest.poetry?.welcomeStatement ?? '').slice(0, 100) || '(none)';
  const closing = (manifest.poetry?.closingLine ?? '').slice(0, 100) || '(none)';

  const chapters = (manifest.chapters ?? []).map((c, i) =>
    `  [${i}] "${c.title ?? '(untitled)'}" — ${(c.description ?? '').slice(0, 80) || '(no body)'} | ${c.images?.length ?? 0} photo(s)`
  ).slice(0, 8).join('\n') || '  (none)';

  const events = (manifest.events ?? []).map((e) =>
    `  - "${e.name ?? '(unnamed)'}"@${e.time ?? '?'} | ${(e.description ?? '').slice(0, 60) || '(no description)'}`
  ).join('\n') || '  (none)';

  const hotels = manifest.travelInfo?.hotels ?? [];
  const hotelLines = hotels.slice(0, 6).map((h) => {
    const hh = h as { name?: string; address?: string; description?: string; notes?: string; groupRate?: string; bookingUrl?: string };
    const addr = hh.address ? ` @ ${hh.address.slice(0, 60)}` : '';
    const desc = (hh.description ?? hh.notes ?? '').slice(0, 60);
    const rate = hh.groupRate ? ` | rate: ${hh.groupRate.slice(0, 30)}` : '';
    const booking = hh.bookingUrl ? ` | booking link available` : '';
    return `  - "${hh.name ?? '(unnamed)'}"${addr} | ${desc || '(no description)'}${rate}${booking}`;
  }).join('\n') || '  (none)';

  // Travel intro/parking/directions — guests asking "how do I get there?"
  // need this in Pear's context, otherwise it answers generically.
  const travel = manifest.travelInfo;
  const travelLines: string[] = [];
  if (travel?.parkingInfo) travelLines.push(`  Parking: ${travel.parkingInfo.slice(0, 200)}`);
  if (travel?.directions) travelLines.push(`  Directions: ${travel.directions.slice(0, 200)}`);
  const airports = (travel?.airports ?? []).slice(0, 4).map((a) => {
    if (typeof a === 'string') return a;
    return (a as { name?: string; code?: string }).name ?? (a as { code?: string }).code ?? '';
  }).filter(Boolean);
  if (airports.length) travelLines.push(`  Airports: ${airports.join(', ')}`);
  const travelBlock = travelLines.length ? travelLines.join('\n') : '  (none)';

  // Registry — guests asking "what's the registry?" need entry names + URLs.
  const reg = manifest.registry;
  const regLines: string[] = [];
  if (reg?.enabled) {
    const entries = (reg.entries ?? []).slice(0, 6);
    if (entries.length) {
      regLines.push(...entries.map((e) =>
        `  - "${(e.name ?? '(unnamed)').slice(0, 50)}" → ${(e.url ?? '').slice(0, 80) || '(no link)'}${e.note ? ` | ${e.note.slice(0, 40)}` : ''}`
      ));
    }
    if (reg.cashFundUrl) {
      regLines.push(`  - Cash fund: ${reg.cashFundUrl.slice(0, 80)}${reg.cashFundMessage ? ` | ${reg.cashFundMessage.slice(0, 60)}` : ''}`);
    }
    if (reg.message) regLines.push(`  Note from couple: ${reg.message.slice(0, 120)}`);
  }
  const regBlock = regLines.length ? regLines.join('\n') : '  (none)';

  // Details — parking/accessibility/custom cards. Guests routinely ask
  // about accessibility ("can my mom park close?") and Pear should know.
  const det = manifest.details;
  const detailLines: string[] = [];
  if (det?.parking) detailLines.push(`  Parking card: ${det.parking.slice(0, 150)}`);
  if (det?.accessibility) detailLines.push(`  Accessibility: ${det.accessibility.slice(0, 150)}`);
  for (const card of (det?.customCards ?? []).slice(0, 4)) {
    const at = card.address ? ` @ ${card.address.slice(0, 50)}` : '';
    const t = card.time ? ` (${card.time})` : '';
    detailLines.push(`  - ${card.title}${t}${at}: ${(card.body ?? '').slice(0, 100)}`);
  }
  const detailBlock = detailLines.length ? detailLines.join('\n') : '  (none)';

  const faqs = (manifest.faqs ?? []).slice(0, 6).map((f, i) =>
    `  [${i}] Q: "${(f.question ?? '').slice(0, 60)}" | A: ${(f.answer ?? '').slice(0, 80) || '(empty)'}`
  ).join('\n') || '  (none)';

  return `Couple: ${couple}
Date: ${date} | RSVP deadline: ${rsvp}
Venue: ${venue}${venueAddress ? ` (${venueAddress})` : ''} | Dress code: ${dresscode}
${logisticsNotes ? `Logistics notes: ${logisticsNotes}\n` : ''}Hero tagline: "${tagline.slice(0, 100)}"${taglineNote}
Welcome line: ${welcome}
Closing line: ${closing}

CHAPTERS (${manifest.chapters?.length ?? 0}):
${chapters}

EVENTS:
${events}

TRAVEL:
${travelBlock}

HOTELS:
${hotelLines}

REGISTRY:
${regBlock}

DETAILS:
${detailBlock}

FAQS (${manifest.faqs?.length ?? 0}):
${faqs}`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`pear-chat:${ip}`, { max: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many messages — slow down a tick.' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Pear isn\'t connected to a model on this server.' }, { status: 503 });
  }

  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.manifest || !Array.isArray(body.coupleNames) || body.coupleNames.length !== 2 || typeof body.prompt !== 'string') {
    return NextResponse.json({ error: 'manifest, coupleNames, and prompt are required' }, { status: 400 });
  }

  // Resolve the caller once — account email when authenticated (host
  // editor), else null (anonymous guest concierge). Used for BOTH
  // the daily budget key AND the owner-gated stats block below.
  const session = await getServerSession(authOptions);
  const sessionEmail = session?.user?.email?.toLowerCase().trim() || null;

  // Daily AI dollar cap (src/lib/ai-budget.ts). Keyed by account
  // email for hosts, by IP for anonymous guests — so guest-concierge
  // abuse is bounded too. Fails open; only blocks on a confirmed
  // over-budget read.
  const budget = budgetKey(sessionEmail, ip);
  if (await overBudget(budget)) {
    return NextResponse.json(
      { ok: false, error: "You've reached today's AI limit — try again tomorrow." },
      { status: 429 }
    );
  }

  const summary = summariseManifest(body.manifest, body.coupleNames);
  const history = (body.history ?? []).slice(-6);

  // Host-advisor stats (RSVP counts + the vendor-book money ledger)
  // are PRIVATE. Whether the caller may see them is derived on the
  // SERVER — a valid session whose email OWNS `siteSlug` — never
  // from the client-supplied `mode`. An anonymous POST that knows a
  // public subdomain must not be able to read these back, so a
  // non-owner is treated as the public/guest concierge and answers
  // only from the manifest the client already sent. Cached 30s.
  let statsBlock = '';
  if (body.siteSlug && sessionEmail) {
    if (await callerOwnsSite(body.siteSlug, sessionEmail)) {
      const stats = await fetchActivityStats(body.siteSlug).catch(() => null);
      if (stats) statsBlock = '\n\n' + summariseStats(stats);
    }
  }

  // Stitch a short "you're currently looking at X" line into the
  // user turn so Pear naturally biases responses toward that
  // section. Skipped when no context — chat falls back to
  // whole-site mode.
  const contextLine = body.context?.block
    ? `\n\n(I'm currently editing the "${body.context.block}" section.${
        body.context.selectedIds?.length
          ? ` Selected blocks: ${body.context.selectedIds.slice(0, 5).join(', ')}.`
          : ''
      })`
    : '';

  // Build Gemini contents: alternating user/model with the
  // running history, then the new user turn that re-anchors with
  // the latest manifest summary so Pear always sees current state.
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  for (const m of history) {
    contents.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: `Current site state:\n\n${summary}${statsBlock}${contextLine}\n\n---\n\nMy question:\n${body.prompt}` }],
  });

  // Pick the system prompt. Guest mode is concierge-only (no
  // patches); host mode is the full editor experience.
  const systemPrompt = body.mode === 'guest' ? SYSTEM_GUEST : SYSTEM;

  // Estimate this turn's cost for the daily budget. Streaming makes
  // the real token count awkward to capture, so charge a
  // conservative estimate (full manifest summary in + max output)
  // once we commit to the model call. ~4 chars/token.
  const maxOut = body.mode === 'guest' ? 512 : 1024;
  const inputChars =
    summary.length +
    statsBlock.length +
    contextLine.length +
    (body.prompt?.length ?? 0) +
    history.reduce((n, m) => n + (m.content?.length ?? 0), 0);
  const inputTokens = Math.ceil(inputChars / 4);

  /* Provider choice — Sonnet for editorial quality when
     ANTHROPIC_API_KEY is set, Gemini Flash as fallback. The
     audit-recommended path: Sonnet 4.6 reads as much more
     "Pear" than Gemini Flash for the concierge surface. */
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    // Charge the estimated Sonnet cost before streaming (fire-and-
    // forget) — a client that opens streams and aborts still accrues.
    void chargeAi(
      budget,
      centsForUsage({
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        inputTokens,
        outputTokens: maxOut,
        ms: 0,
      })
    );
    return streamFromAnthropic({
      systemPrompt,
      contents,
      maxTokens: maxOut,
    });
  }

  // Stream from Gemini's streamGenerateContent endpoint and
  // re-emit as plain text chunks via SSE.
  const upstreamUrl = `${GEMINI_FLASH.replace(':generateContent', ':streamGenerateContent')}?key=${apiKey}&alt=sse`;
  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: body.mode === 'guest' ? 512 : 1024,
      },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const err = await upstream.text().catch(() => 'Pear is asleep');
    return NextResponse.json({ error: `Pear couldn't think (${upstream.status}): ${err.slice(0, 200)}` }, { status: 502 });
  }

  // Model call is live — charge the estimated Gemini Flash cost.
  void chargeAi(
    budget,
    centsForUsage({
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      inputTokens,
      outputTokens: maxOut,
      ms: 0,
    })
  );

  // Re-emit as our own SSE — `data: { delta: "<token>" }` for each
  // chunk, `data: { done: true }` at the end. The client can
  // parse without needing Gemini-specific knowledge.
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6).trim();
            if (!json) continue;
            try {
              const parsed = JSON.parse(json) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
              };
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) send({ delta: text });
            } catch {
              // ignore frame-parse errors
            }
          }
        }
        send({ done: true });
      } catch (e) {
        send({ error: e instanceof Error ? e.message : 'Stream interrupted' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/* ───────── Anthropic streaming path ─────────
   When ANTHROPIC_API_KEY is set we route Pear-chat through
   Claude Sonnet 4.6 — the audit-recommended editorial-quality
   model for concierge surfaces. Same SSE wire format the
   Gemini path uses (`data: {"delta":"…"}` / `data: {"done":true}`)
   so the chat UI doesn't care which provider answered. */
async function streamFromAnthropic({
  systemPrompt,
  contents,
  maxTokens,
}: {
  systemPrompt: string;
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  maxTokens: number;
}): Promise<Response> {
  const { getAnthropicClient, CLAUDE_SONNET } = await import('@/lib/claude/client');
  /* Translate Gemini's role 'model' to Anthropic's 'assistant'
     and collapse the parts[] arrays into a single string per
     turn (Pearloom's chat is text-only). */
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = contents.map((c) => ({
    role: c.role === 'model' ? 'assistant' : 'user',
    content: c.parts.map((p) => p.text).join('\n'),
  }));
  const client = getAnthropicClient();
  const stream = client.messages.stream({
    model: CLAUDE_SONNET,
    max_tokens: maxTokens,
    temperature: 0.7,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral', ttl: '1h' },
      },
    ],
    messages,
  });
  const sse = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta' &&
            event.delta.text
          ) {
            send({ delta: event.delta.text });
          }
        }
        send({ done: true });
      } catch (e) {
        send({ error: e instanceof Error ? e.message : 'Stream interrupted' });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(sse, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
