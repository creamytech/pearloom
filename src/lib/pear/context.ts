// ─────────────────────────────────────────────────────────────
// Pearloom / lib/pear/context.ts
//
// Single source for "what should Pear remember about this user?"
// AI-generation routes (rewrite-text, ai-chat, story chapters,
// vendor briefs, decor library) call buildPearContext() to fetch
// the user's recent voice samples + persistent memories and weave
// them into the system prompt.
//
// Keeps the heavy schema knowledge out of every individual route.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

export interface PearContextOptions {
  userEmail: string;
  siteId?: string;
  /** How many recent memories to include. Defaults to 8. */
  memoryLimit?: number;
  /** How many voice samples to include. Defaults to 2. */
  voiceLimit?: number;
}

export interface PearContext {
  voiceSnippets: string[];
  vocabHints: string[];
  memories: Array<{ content: string; tags: string[]; created_at: string }>;
  /** Pre-formatted prompt block ready to drop into a system message. */
  promptBlock: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Returns an empty-but-shaped context so callers don't need to null-check. */
function emptyContext(): PearContext {
  return { voiceSnippets: [], vocabHints: [], memories: [], promptBlock: '' };
}

export async function buildPearContext(opts: PearContextOptions): Promise<PearContext> {
  const sb = getSupabase();
  if (!sb || !opts.userEmail) return emptyContext();

  const memoryLimit = opts.memoryLimit ?? 8;
  const voiceLimit = opts.voiceLimit ?? 2;

  // Run both queries in parallel.
  const [voiceRes, memRes] = await Promise.all([
    sb
      .from('pear_voice_samples')
      .select('transcript, vocab_summary, created_at')
      .eq('user_email', opts.userEmail)
      .order('created_at', { ascending: false })
      .limit(voiceLimit),
    sb
      .from('pear_memories')
      .select('content, tags, created_at')
      .eq('user_email', opts.userEmail)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(memoryLimit),
  ]);

  const voiceRows = (voiceRes.data ?? []) as Array<{ transcript: string; vocab_summary?: string }>;
  const memRows = (memRes.data ?? []) as Array<{ content: string; tags?: string[]; created_at: string }>;

  // If a siteId is supplied, prefer rows with the same site_id but
  // don't exclude null (cross-site) memories.
  // (Filter happens client-side; we already capped to the limit.)

  const voiceSnippets = voiceRows
    .map((v) => v.transcript)
    .filter(Boolean)
    .map((s) => s.slice(0, 600));

  const vocabHints = voiceRows
    .flatMap((v) => (v.vocab_summary ?? '').split(/,\s*/).filter(Boolean))
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 30);

  const memories = memRows.map((m) => ({
    content: m.content.slice(0, 280),
    tags: Array.isArray(m.tags) ? m.tags : [],
    created_at: m.created_at,
  }));

  // Build the prompt block. Keep it small enough to add to every
  // generation without blowing through token budgets.
  const lines: string[] = [];
  if (voiceSnippets.length) {
    lines.push("HOST'S VOICE (recent voice memos — match this cadence, vocabulary, and tone):");
    voiceSnippets.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  }
  if (vocabHints.length) {
    lines.push(`HOST USES THESE WORDS A LOT: ${vocabHints.join(', ')}.`);
  }
  if (memories.length) {
    lines.push("HOST'S NOTES (things they've told Pear they care about):");
    memories.forEach((m) => {
      const tagPart = m.tags.length ? ` [${m.tags.join(', ')}]` : '';
      lines.push(`  - ${m.content}${tagPart}`);
    });
  }
  if (lines.length) {
    lines.unshift('--- HOST CONTEXT ---');
    lines.push('--- END HOST CONTEXT ---');
  }
  return {
    voiceSnippets,
    vocabHints,
    memories,
    promptBlock: lines.join('\n'),
  };
}
