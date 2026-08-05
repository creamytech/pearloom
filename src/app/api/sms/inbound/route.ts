// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/sms/inbound/route.ts
//
// THE CONCIERGE NUMBER — inbound half.
//
// A guest texts a question; Pear answers from the celebration they
// were actually invited to, or hands the question to the host and
// says so. All three platform reviews converged on this channel:
// the guest who will never open a website will answer a text, and
// the question they ask is already on the site.
//
// Twilio POSTs form-encoded params here and expects TwiML back.
// Configure the number's "A MESSAGE COMES IN" webhook to
// POST {NEXT_PUBLIC_SITE_URL}/api/sms/inbound.
//
// THREE THINGS THIS ROUTE WILL NOT DO:
//
//   1. Trust an unsigned request. verifyTwilioSignature fails
//      CLOSED, including when TWILIO_AUTH_TOKEN is unset — the
//      opposite of the fail-open webhook the platform audit found
//      on /api/film/render-complete.
//   2. Tell an unrecognised number anything. Possession of a phone
//      number proves nothing; a helpful guess here would make the
//      number an oracle for anyone who dials it.
//   3. Improvise an answer. The model is given an allowlisted fact
//      sheet (lib/sms/site-facts) and instructed to emit NO_ANSWER
//      rather than guess — a guest who drives to a wrong address
//      because a model invented one is the worst outcome here.
//
// Decision rules live in lib/sms/concierge (pure + tested); this
// file is the plumbing around them.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyTwilioSignature } from '@/lib/sms/verify-twilio';
import { normalizePhone } from '@/lib/sms';
import { smsSiteFacts } from '@/lib/sms/site-facts';
import {
  classifyMessage,
  unknownNumberReply,
  disambiguationReply,
  escalationReply,
  stopReply,
  helpReply,
  shouldEscalate,
  fitReply,
  type ConciergeMatch,
} from '@/lib/sms/concierge';
import { parseChannelAddress, channelLabel } from '@/lib/sms/channel';
import { resolveWithNumber, normalizeNumberKey } from '@/lib/sms/number-routing';
import { checkRateLimit } from '@/lib/rate-limit';
import { generate, textFrom } from '@/lib/claude/client';
import { overBudget, chargeAi, centsForUsage, approxTokens } from '@/lib/ai-budget';
import { notifyHost } from '@/lib/notifications/notify';
import { resolveSiteNames } from '@/lib/site-names';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TAG = '[sms-inbound]';

function sb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** TwiML. Twilio needs XML back; an empty <Response/> means "say
 *  nothing", which is the right answer to a STOP or to anything we
 *  decline to engage with. */
function twiml(message?: string): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface SiteRow {
  id: string;
  subdomain: string;
  ai_manifest: Record<string, unknown> | null;
  site_config: Record<string, unknown> | null;
  creator_email: string | null;
}

/** Every guest row across both roster tables carrying this number. */
async function matchesForPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<{ matches: ConciergeMatch[]; sites: Map<string, SiteRow> }> {
  const [a, b] = await Promise.all([
    supabase.from('guests').select('id, name, site_id, phone').eq('phone', phone).limit(20),
    supabase.from('pearloom_guests').select('id, display_name, site_id, phone').eq('phone', phone).limit(20),
  ]);

  const raw: Array<{ guestId: string; guestName: string; siteId: string }> = [];
  for (const r of a.data ?? []) {
    raw.push({ guestId: String(r.id), guestName: String(r.name ?? ''), siteId: String(r.site_id) });
  }
  for (const r of b.data ?? []) {
    raw.push({ guestId: String(r.id), guestName: String(r.display_name ?? ''), siteId: String(r.site_id) });
  }

  const sites = new Map<string, SiteRow>();
  const siteIds = [...new Set(raw.map((r) => r.siteId))].filter(Boolean);
  if (siteIds.length === 0) return { matches: [], sites };

  const { data: siteRows } = await supabase
    .from('sites')
    .select('id, subdomain, ai_manifest, site_config, creator_email')
    .in('id', siteIds);
  for (const s of (siteRows ?? []) as SiteRow[]) sites.set(s.id, s);

  const matches: ConciergeMatch[] = [];
  for (const r of raw) {
    const site = sites.get(r.siteId);
    if (!site) continue;
    const names = resolveSiteNames(site.site_config?.names, site.ai_manifest?.names);
    const label = names.filter(Boolean).join(' & ') || site.subdomain;
    matches.push({
      siteId: site.id,
      siteSlug: site.subdomain,
      siteLabel: label,
      guestId: r.guestId,
      guestName: r.guestName,
      published: Boolean(site.ai_manifest?.published),
    });
  }
  return { matches, sites };
}

/**
 * The celebration that owns the number this message came IN on, or
 * null for the shared number.
 *
 * Never throws: a lookup failure degrades to the shared-number
 * path, which asks rather than guesses. That's the right failure —
 * a guest gets one extra question instead of silence.
 */
async function siteForConciergeNumber(
  supabase: SupabaseClient,
  to: string | null | undefined,
): Promise<string | null> {
  const key = normalizeNumberKey(parseChannelAddress(to)?.phone);
  if (!key) return null;
  try {
    const { data } = await supabase
      .from('sites')
      .select('id')
      .eq('concierge_number', key)
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  } catch (err) {
    console.warn(TAG, 'concierge-number lookup failed (non-fatal):', err);
    return null;
  }
}

/** Ask Pear, grounded strictly in the fact sheet. */
async function answerFromFacts(facts: string, question: string, budgetKeyStr: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (await overBudget(budgetKeyStr)) return null;
  try {
    const system = [
      'You are Pear, answering a guest’s text message about a celebration.',
      'Answer ONLY from the FACTS below. Never guess, never infer an address, a time, or a rule that is not written there.',
      'If the answer is not in the FACTS, reply with exactly: NO_ANSWER',
      'Otherwise reply in one or two short sentences, warm and plain, under 300 characters.',
      'No greetings, no sign-off, no emoji, no links unless one appears in the FACTS.',
      '',
      'FACTS:',
      facts,
    ].join('\n');
    const msg = await generate({
      tier: 'haiku',
      system,
      messages: [{ role: 'user', content: question.slice(0, 500) }],
      maxTokens: 200,
      temperature: 0.2,
    });
    const out = textFrom(msg).trim();
    await chargeAi(budgetKeyStr, centsForUsage({
      provider: 'claude',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: approxTokens(system + question),
      outputTokens: approxTokens(out),
      ms: 0,
    }));
    return out;
  } catch (err) {
    console.warn(TAG, 'answer failed (non-fatal):', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Is this actually Twilio? ────────────────────────────
  let params: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [k, v] of form.entries()) params[k] = typeof v === 'string' ? v : '';
  } catch {
    params = {};
  }

  /* Sign against the URL Twilio was CONFIGURED with, not req.url —
     behind a proxy the inbound URL can differ in scheme or host,
     and a mismatch there would reject genuine traffic. */
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com').replace(/\/+$/, '');
  const verified = verifyTwilioSignature({
    url: `${base}/api/sms/inbound`,
    params,
    signature: req.headers.get('x-twilio-signature'),
    authToken: process.env.TWILIO_AUTH_TOKEN,
  });
  if (!verified) {
    console.warn(TAG, 'rejected an unsigned or mis-signed request');
    return new NextResponse('Forbidden', { status: 403 });
  }

  /* SMS and WhatsApp arrive on this same webhook; WhatsApp just
     prefixes the addresses. The prefix MUST come off before guest
     lookup — guest rows hold bare numbers, so leaving it on would
     make a real guest a stranger and hand them the
     unknown-number reply. Twilio routes the response back on the
     channel the request came in on, so replying is automatic. */
  const inbound = parseChannelAddress(params.From);
  const from = inbound ? normalizePhone(inbound.phone) : null;
  const channel = inbound?.channel ?? 'sms';
  const bodyText = params.Body ?? '';
  if (!from) return twiml();

  // ── 2. Compliance keywords never reach an AI or a host. ────
  const kind = classifyMessage(bodyText);
  if (kind === 'stop') return twiml(stopReply());
  if (kind === 'help') return twiml(helpReply());
  if (kind === 'empty') return twiml();

  // Per-number limit, keyed per channel so one person reaching us
  // both ways isn't throttled by their own other conversation.
  // Generous enough for a real exchange, tight enough that the
  // number can't be farmed for AI spend.
  const rl = checkRateLimit(`sms-inbound:${channel}:${from}`, { max: 12, windowMs: 10 * 60_000 });
  if (!rl.allowed) {
    return twiml('You’ve sent a few in a row — give me a minute and try again.');
  }

  const supabase = sb();
  if (!supabase) {
    console.warn(TAG, 'Supabase not configured');
    return twiml();
  }

  // ── 3. Which celebration is this? ──────────────────────────
  let matches: ConciergeMatch[] = [];
  let sites = new Map<string, SiteRow>();
  try {
    const found = await matchesForPhone(supabase, from);
    matches = found.matches;
    sites = found.sites;
  } catch (err) {
    console.warn(TAG, 'lookup failed:', err);
    return twiml();
  }

  /* Which number did they text? A celebration with its own
     concierge number needs no disambiguation — the number names the
     event. It NARROWS and never widens: a guest who isn't on that
     celebration's list is told nothing, and is deliberately not
     answered about some other celebration they do belong to. A
     phone number is far more guessable than a passport token, so a
     bought number must never become a probe against a guest list. */
  const dedicatedSiteId = await siteForConciergeNumber(supabase, params.To);

  const resolution = resolveWithNumber(matches, dedicatedSiteId);
  // An unrecognised number is told nothing about anyone.
  if (resolution.kind === 'none') return twiml(unknownNumberReply());
  if (resolution.kind === 'many') return twiml(disambiguationReply(resolution.matches));

  const match = resolution.match;
  const site = sites.get(match.siteId);
  const facts = smsSiteFacts(
    (site?.ai_manifest ?? null) as Record<string, unknown> | null,
    match.siteLabel,
  );

  // ── 4. Answer, or hand it to the host. ─────────────────────
  const answer = facts
    ? await answerFromFacts(facts, bodyText, `sms:${from}`)
    : null;

  if (!shouldEscalate(answer)) return twiml(fitReply(answer!));

  const hostFirst = match.siteLabel.split(/[&,]/)[0]?.trim().split(/\s+/)[0] || null;
  if (site?.creator_email) {
    await notifyHost(supabase, {
      siteId: match.siteId,
      siteLabel: match.siteLabel,
      ownerEmail: site.creator_email,
      category: 'replies',
      title: `${match.guestName || 'A guest'} asked a question by ${channelLabel(channel)}`,
      body: fitReply(bodyText, 240),
      href: '/dashboard/messages',
      // One notification per guest per message — Twilio retries a
      // webhook on timeout, and the host should not see doubles.
      dedupeKey: `sms-q:${match.siteId}:${params.MessageSid || `${channel}:${from}:${bodyText.slice(0, 40)}`}`,
      forceInstantEmail: true,
    });
  }
  return twiml(escalationReply(hostFirst));
}

/** Twilio pings with GET when a webhook URL is saved. */
export async function GET() {
  return new NextResponse('Pearloom SMS concierge', { status: 200 });
}
