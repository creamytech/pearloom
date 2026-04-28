import { NextRequest, NextResponse } from 'next/server';
import { GEMINI_FLASH } from '@/lib/memory-engine/gemini-client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
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
}

const SYSTEM = `You are Pear, the Pearloom site assistant. You help a host design their wedding / celebration site.

Voice: warm, observational, never lecturing. Short paragraphs. Reference specific things on THIS site (chapter titles, the actual venue name, etc.) — never generic suggestions.

Style guide:
- Use plain prose, not bullet lists, unless the user asks for a list.
- Never say "AI" or "AI-generated". You're Pear, a person.
- Replace "Loading…" → "Threading…", "Generated" → "drafted", "Empty" → "Nothing yet".
- Lowercase first-letter sentences only when the host writes that way; otherwise sentence case.

When the host asks you to make a concrete change to the site (e.g. "rewrite my hero tagline", "add a fun FAQ", "polish my first chapter"), include a single JSON code block at the END of your response prefixed with the marker line "pearloom:patch":

\`\`\`pearloom:patch
{
  "summary": "Short human-readable summary of what this changes",
  "patches": [
    {"path": "poetry.heroTagline", "value": "the new copy"}
  ]
}
\`\`\`

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

Keep responses under 180 words unless the host explicitly asks for more.`;

function summariseManifest(manifest: StoryManifest, names: [string, string]): string {
  const couple = `${names[0]} & ${names[1]}`;
  const date = manifest.logistics?.date ?? '(none)';
  const venue = manifest.logistics?.venue ?? '(none)';
  const tagline = manifest.poetry?.heroTagline ?? '(none)';
  const chapters = (manifest.chapters ?? []).map((c, i) =>
    `  [${i}] "${c.title ?? '(untitled)'}" — ${(c.description ?? '').slice(0, 80)}`
  ).slice(0, 8).join('\n') || '  (none)';
  const events = (manifest.events ?? []).map(e => `  - ${e.name ?? '(unnamed)'}@${e.time ?? '?'}`).join('\n') || '  (none)';
  const faqs = (manifest.faqs ?? []).slice(0, 6).map((f, i) => `  [${i}] Q: ${f.question}`).join('\n') || '  (none)';
  return `Couple: ${couple}\nDate: ${date}\nVenue: ${venue}\nHero tagline: ${tagline}\n\nCHAPTERS:\n${chapters}\n\nEVENTS:\n${events}\n\nFAQS:\n${faqs}`;
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

  const summary = summariseManifest(body.manifest, body.coupleNames);
  const history = (body.history ?? []).slice(-6);

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
    parts: [{ text: `Current site state:\n\n${summary}${contextLine}\n\n---\n\nMy question:\n${body.prompt}` }],
  });

  // Stream from Gemini's streamGenerateContent endpoint and
  // re-emit as plain text chunks via SSE.
  const upstreamUrl = `${GEMINI_FLASH.replace(':generateContent', ':streamGenerateContent')}?key=${apiKey}&alt=sse`;
  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const err = await upstream.text().catch(() => 'Pear is asleep');
    return NextResponse.json({ error: `Pear couldn't think (${upstream.status}): ${err.slice(0, 200)}` }, { status: 502 });
  }

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
