// ─────────────────────────────────────────────────────────────
// Pearloom / api/director/route.ts
//
// The Event Director agent — a planner-in-a-chat that uses
// Claude Opus with tool use to:
//   - search the vendor marketplace
//   - add items to the user's checklist
//   - shortlist vendors for their site
//   - write structured plan notes (budget split, timeline)
//
// POST body: { siteId, message }
// Returns:   { reply, plan, checklist, shortlist, steps }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { runAgent, cached, CLAUDE_OPUS } from '@/lib/claude';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import {
  getOrCreateDirectorSession,
  updateDirectorSession,
  searchVendors,
} from '@/lib/event-os/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

const DIRECTOR_SYSTEM = `You are the Pearloom Event Director — a warm, specific, opinionated AI wedding/event planner.

Your job: help the user plan a real event end to end. You have tools for searching the vendor marketplace, updating their checklist, shortlisting vendors, and writing structured plan notes.

How you work:
- Ask questions only when essential. Volunteer concrete options and suggestions.
- Always ground recommendations in the user's budget, city, date, and guest count.
- When you add a checklist item, make it specific and dated if possible.
- When you shortlist a vendor, explain in one sentence why they fit.
- Budgets: always reason in rough percentage splits (venue 40%, food 25%, photo 10%, etc) until real numbers come in.
- Never invent vendors. Only shortlist vendors you got from search_vendors.
- Keep replies concise (< 220 words) unless the user asks for detail.
- Never use emojis.`;

const TOOLS: Tool[] = [
  {
    name: 'search_vendors',
    description: 'Search the Pearloom vendor marketplace by category, city, and budget. Returns up to 12 vendors ranked by rating.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'e.g. photographer, florist, caterer, venue, dj' },
        city: { type: 'string' },
        minBudgetCents: { type: 'number' },
        maxBudgetCents: { type: 'number' },
      },
      required: ['category'],
    },
  },
  {
    name: 'add_checklist_item',
    description: 'Add a to-do to the user\'s planning checklist. Use concrete labels with dates when possible.',
    input_schema: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        due: { type: 'string', description: 'ISO date (YYYY-MM-DD) if known' },
      },
      required: ['label'],
    },
  },
  {
    name: 'shortlist_vendor',
    description: 'Add a vendor to the user\'s shortlist for a given category. Only call after search_vendors returned real results.',
    input_schema: {
      type: 'object',
      properties: {
        vendorId: { type: 'string' },
        category: { type: 'string' },
        note: { type: 'string', description: 'Why this vendor fits, one sentence' },
      },
      required: ['vendorId', 'category'],
    },
  },
  {
    name: 'update_plan',
    description: 'Merge structured plan notes into the session\'s plan object. Use for budget splits, timeline, venue shortlist rationale.',
    input_schema: {
      type: 'object',
      properties: {
        patch: {
          type: 'object',
          description: 'Arbitrary JSON to merge into the plan. e.g. { budgetSplit: { venue: 0.4, food: 0.25 } }',
        },
      },
      required: ['patch'],
    },
  },
];

interface DirectorInput {
  siteId?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;

  let body: DirectorInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { siteId, message } = body;
  if (!siteId || !message || typeof message !== 'string') {
    return NextResponse.json({ error: 'siteId and message required' }, { status: 400 });
  }

  // Verify site ownership
  const { data: site } = await sb()
    .from('sites')
    .select('id, subdomain, site_config')
    .eq('id', siteId)
    .maybeSingle();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (site.site_config as Record<string, unknown>)?.creator_email;
  if (ownerEmail !== userEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load or create the director session
  const s = await getOrCreateDirectorSession({ siteId, ownerEmail: userEmail });
  const convo = Array.isArray(s.conversation) ? s.conversation : [];
  const checklist = Array.isArray(s.checklist) ? s.checklist : [];
  const shortlist = Array.isArray(s.vendor_shortlist) ? s.vendor_shortlist : [];
  const plan = (s.plan && typeof s.plan === 'object') ? { ...s.plan } : {};

  // Append the new user turn
  convo.push({ role: 'user', content: message, ts: new Date().toISOString() });

  const contextSummary = JSON.stringify({
    siteSubdomain: site.subdomain,
    budgetCents: s.budget_cents,
    targetDate: s.target_date,
    targetCity: s.target_city,
    guestCountEstimate: s.guest_count_estimate,
    constraints: s.constraints,
    currentPlan: plan,
    checklistCount: checklist.length,
    shortlistCount: shortlist.length,
  });

  // Track incremental updates applied during this turn
  const newChecklistItems: typeof checklist = [];
  const newShortlistItems: typeof shortlist = [];
  const planPatchesApplied: Record<string, unknown>[] = [];

  try {
    const result = await runAgent({
      tier: 'opus',
      system: [
        {
          type: 'text',
          text: DIRECTOR_SYSTEM,
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
        cached(`SESSION CONTEXT:\n${contextSummary}`, '5m'),
      ],
      maxTokens: 1600,
      temperature: 0.6,
      tools: TOOLS,
      maxSteps: 8,
      messages: convo.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      handlers: {
        search_vendors: async (input: unknown) => {
          const i = input as { category: string; city?: string; minBudgetCents?: number; maxBudgetCents?: number };
          const vendors = await searchVendors({
            category: i.category,
            city: i.city || s.target_city || undefined,
            minBudget: i.minBudgetCents,
            maxBudget: i.maxBudgetCents,
            limit: 8,
          });
          return vendors.map((v) => ({
            id: v.id,
            name: v.name,
            category: v.category,
            city: v.city,
            priceTier: v.price_tier,
            minBudget: v.min_budget_cents,
            maxBudget: v.max_budget_cents,
            rating: v.rating_avg,
            verified: v.is_verified,
            description: v.description?.slice(0, 180),
          }));
        },
        add_checklist_item: async (input: unknown) => {
          const i = input as { label: string; due?: string };
          const item = {
            id: crypto.randomUUID(),
            label: i.label,
            done: false,
            ...(i.due ? { due: i.due } : {}),
          };
          checklist.push(item);
          newChecklistItems.push(item);
          return { ok: true, id: item.id };
        },
        shortlist_vendor: async (input: unknown) => {
          const i = input as { vendorId: string; category: string; note?: string };
          const existing = shortlist.find((x) => x.vendorId === i.vendorId);
          if (existing) return { ok: true, alreadyShortlisted: true };
          const entry = { vendorId: i.vendorId, category: i.category, note: i.note };
          shortlist.push(entry);
          newShortlistItems.push(entry);
          return { ok: true };
        },
        update_plan: async (input: unknown) => {
          const i = input as { patch: Record<string, unknown> };
          Object.assign(plan, i.patch);
          planPatchesApplied.push(i.patch);
          return { ok: true, plan };
        },
      },
    });

    convo.push({
      role: 'assistant',
      content: result.text || '(no reply)',
      ts: new Date().toISOString(),
    });

    await updateDirectorSession(s.id, {
      conversation: convo,
      checklist,
      vendor_shortlist: shortlist,
      plan,
    });

    return NextResponse.json({
      reply: result.text,
      plan,
      checklist,
      shortlist,
      updates: {
        checklist: newChecklistItems,
        shortlist: newShortlistItems,
        plan: planPatchesApplied,
      },
      model: CLAUDE_OPUS,
      steps: result.steps.length,
    });
  } catch (err) {
    console.error('[director] agent failed', err);
    return NextResponse.json(
      { error: 'Director agent failed', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const { data: site } = await sb()
    .from('sites')
    .select('id, site_config')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (site.site_config as Record<string, unknown>)?.creator_email;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const s = await getOrCreateDirectorSession({
    siteId,
    ownerEmail: session.user.email,
  });
  return NextResponse.json({
    sessionId: s.id,
    conversation: s.conversation,
    plan: s.plan,
    checklist: s.checklist,
    shortlist: s.vendor_shortlist,
    budgetCents: s.budget_cents,
    targetDate: s.target_date,
    targetCity: s.target_city,
    guestCountEstimate: s.guest_count_estimate,
  });
}
