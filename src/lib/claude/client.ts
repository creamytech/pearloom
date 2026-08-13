// ─────────────────────────────────────────────────────────────
// Pearloom / lib/claude/client.ts
// Anthropic SDK client with prompt caching, model routing,
// retry logic, streaming + tool use helpers.
//
// Model routing:
//   - OPUS   → top-quality creative passes (core story, agent loops)
//   - SONNET → structured planning + critique
//   - HAIKU  → fast, cheap micro-edits (captions, thank-yous, chat)
//
// Art generation stays on Gemini — see src/lib/memory-engine/gemini-client.ts
// ─────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  MessageParam,
  TextBlockParam,
  Tool,
  ToolChoice,
  ToolUseBlock,
  ContentBlock,
} from '@anthropic-ai/sdk/resources/messages';
import { recordAiUsage } from '@/lib/ai-usage';

// ── Model IDs ────────────────────────────────────────────────────
// Keep these centralized so we can bump versions in one place.
//
// Current Anthropic lineup as of 2026-06-01 (verified
// platform.claude.com/docs):
//   Opus 4.8 = current flagship (May 2026) — $5/$25, 1M ctx, 128k out
//   (the previous Opus generation remains GA + supported through next cycle)
//   Sonnet 4.6 = workhorse — $3/$15, 1M ctx, 64k out, ext. thinking
//   Haiku 4.5 = fastest near-frontier — $1/$5, 200k ctx, ext. thinking
//
// Pearloom's creative passes (story chapters, hero poetry, vow
// drafts) sit on Opus 4.8 to get the best literary voice.
// Critique + structured output stays on Sonnet 4.6 (extended
// thinking sweet spot). Micro-edits stay on Haiku 4.5.
//
// All three support: tool use, prompt caching (5m/1h ephemeral),
// vision, batch API (50% off), Priority Tier.
export const CLAUDE_OPUS = 'claude-opus-4-8';
export const CLAUDE_SONNET = 'claude-sonnet-4-6';
export const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001';

export type ClaudeTier = 'opus' | 'sonnet' | 'haiku';

export const MODEL_BY_TIER: Record<ClaudeTier, string> = {
  opus: CLAUDE_OPUS,
  sonnet: CLAUDE_SONNET,
  haiku: CLAUDE_HAIKU,
};

// ── Usage accounting (src/lib/ai-usage.ts) ──────────────────────
// Instrumented at the lowest shared point: the singleton returned
// by getAnthropicClient(). Every Claude call in the repo — the
// generate()/generateJson()/runAgent() helpers AND the raw
// `client.messages.stream(...)` consumers (structured.streamText,
// /api/pear-chat's streamFromAnthropic) — flows through this one
// instance, so wrapping `messages.create` + `messages.stream` here
// gives full coverage without changing any call-site signature.
// Anthropic responses carry `usage` (input_tokens, output_tokens,
// cache_creation_input_tokens, cache_read_input_tokens).

function recordClaudeMessage(requestModel: string, startedMs: number, msg: Message): void {
  try {
    const u = msg.usage;
    recordAiUsage({
      provider: 'claude',
      model: msg.model ?? requestModel,
      inputTokens: u?.input_tokens ?? 0,
      outputTokens: u?.output_tokens ?? 0,
      cacheReadTokens: u?.cache_read_input_tokens ?? 0,
      cacheWriteTokens: u?.cache_creation_input_tokens ?? 0,
      ms: Date.now() - startedMs,
    });
  } catch {
    // accounting must never break a model call
  }
}

function instrumentAnthropic(client: Anthropic): Anthropic {
  const messages = client.messages;

  // Non-streaming (and any raw create) path. The overloaded
  // signature forces a cast; behaviour is pass-through — we only
  // subscribe to the resolved Message to read `usage`.
  const origCreate = messages.create.bind(messages) as (
    body: unknown,
    options?: unknown
  ) => Promise<unknown>;
  messages.create = ((body: unknown, options?: unknown) => {
    const started = Date.now();
    const result = origCreate(body, options);
    const b = body as { stream?: boolean; model?: string };
    if (!b?.stream) {
      void (result as Promise<Message>)
        .then((msg) => recordClaudeMessage(String(b?.model ?? ''), started, msg))
        .catch(() => {});
    }
    return result;
  }) as typeof messages.create;

  // Streaming path. MessageStream accumulates the final Message
  // internally regardless of how the caller consumes events, so a
  // passive finalMessage() subscription records usage without
  // interfering with the caller's iteration.
  const origStream = messages.stream.bind(messages) as (
    body: unknown,
    options?: unknown
  ) => ReturnType<typeof messages.stream>;
  messages.stream = ((body: unknown, options?: unknown) => {
    const started = Date.now();
    const stream = origStream(body, options);
    const b = body as { model?: string };
    void stream
      .finalMessage()
      .then((msg: Message) => recordClaudeMessage(String(b?.model ?? ''), started, msg))
      .catch(() => {});
    return stream;
  }) as typeof messages.stream;

  return client;
}

// ── Singleton client ─────────────────────────────────────────────

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY not configured. Set it in .env.local to enable Claude features.'
    );
  }
  _client = instrumentAnthropic(new Anthropic({ apiKey, maxRetries: 2 }));
  return _client;
}

// ── Dev logging ─────────────────────────────────────────────────
const devLog = process.env.NODE_ENV === 'development' ? console.log : () => {};

// ── Retry wrapper (for 529 overloaded / 5xx) ─────────────────────

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Anthropic SDK surfaces HTTP status on APIError
      const status = (err as { status?: number })?.status;
      const retriable = status === 429 || status === 503 || status === 529 || (status ?? 0) >= 500;
      if (!retriable || attempt === maxAttempts) throw err;
      const backoff = Math.pow(2, attempt) * 1000;
      devLog(`[Claude] ${status} — retry in ${backoff / 1000}s (${attempt}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}

// ── Prompt caching helpers ──────────────────────────────────────

/**
 * Mark a text block as cacheable. The prefix + this block becomes a
 * cache breakpoint. Subsequent calls with the same prefix hit the cache
 * (~90% cheaper). Cache TTL defaults to 5 minutes; pass 'ephemeral-1h'
 * for a 1 hour cache.
 */
export function cached(text: string, ttl: '5m' | '1h' = '5m'): TextBlockParam {
  return {
    type: 'text',
    text,
    cache_control: { type: 'ephemeral', ttl },
  };
}

/**
 * Plain text block (not cached).
 */
export function text(str: string): TextBlockParam {
  return { type: 'text', text: str };
}

// ── Public API ──────────────────────────────────────────────────

export interface GenerateOptions {
  tier: ClaudeTier;
  system: string | TextBlockParam[];
  messages: MessageParam[];
  maxTokens?: number;
  temperature?: number;
  tools?: Tool[];
  /** Force a specific tool / any tool / auto / none. Mirrors the
   *  Anthropic SDK's `tool_choice` param. Defaults to undefined
   *  (SDK default = 'auto' when tools are provided). Set
   *  `{ type: 'tool', name: '<tool_name>' }` to guarantee
   *  structured output from a single named tool. */
  toolChoice?: ToolChoice;
  stopSequences?: string[];
  /** Extended thinking budget in tokens. When set, the model
   *  uses extended thinking with the given budget — observably
   *  better calibration on critique / judgment / agent loops
   *  per Anthropic docs. Only enable for Sonnet 4.6 or Haiku 4.5;
   *  the previous Opus generation doesn't support it (Opus 4.8 does).
   *  Recommended: 4000-8000 for critique, 0 (disabled) for
   *  micro-edits / micro-classification. */
  thinkingBudget?: number;
}

/**
 * Generate a single non-streaming response.
 */
export async function generate(opts: GenerateOptions): Promise<Message> {
  const client = getAnthropicClient();
  /* Extended thinking can't combine with temperature: when
     thinking is on, the SDK rejects a non-1.0 temperature. So
     when the caller asks for thinking we silently force
     temperature=1 (the model picks its own creative variance
     during thinking). */
  const thinkingOn = (opts.thinkingBudget ?? 0) > 0;
  return withRetry(() =>
    client.messages.create({
      model: MODEL_BY_TIER[opts.tier],
      max_tokens: opts.maxTokens ?? 4096,
      temperature: thinkingOn ? 1 : (opts.temperature ?? 0.7),
      system: typeof opts.system === 'string'
        ? [{ type: 'text', text: opts.system }]
        : opts.system,
      messages: opts.messages,
      ...(opts.tools && opts.tools.length > 0 ? { tools: opts.tools } : {}),
      ...(opts.toolChoice ? { tool_choice: opts.toolChoice } : {}),
      ...(opts.stopSequences && opts.stopSequences.length > 0 ? { stop_sequences: opts.stopSequences } : {}),
      ...(thinkingOn
        ? { thinking: { type: 'enabled' as const, budget_tokens: opts.thinkingBudget! } }
        : {}),
    })
  );
}

/**
 * Pull all text from a Message into a single string.
 */
export function textFrom(msg: Message): string {
  return msg.content
    .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

/**
 * Pull tool_use blocks from a Message.
 */
export function toolUses(msg: Message): ToolUseBlock[] {
  return msg.content.filter((b): b is ToolUseBlock => b.type === 'tool_use');
}

/**
 * Parse a JSON object from the model's text output. Handles markdown
 * fences, leading prose, and trailing commas.
 */
export function parseJsonFromText<T = unknown>(raw: string): T {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const first = s.indexOf('{');
  if (first > 0) s = s.slice(first);
  const lastBrace = s.lastIndexOf('}');
  if (lastBrace > 0 && lastBrace < s.length - 1) s = s.slice(0, lastBrace + 1);
  s = s.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(s) as T;
}

/**
 * Run a tool-use agent loop until the model either emits end_turn without
 * a tool call or hits maxSteps.
 *
 * `handlers` maps tool names to handler functions. Each handler returns
 * a JSON-serializable result that becomes the tool_result content.
 */
export interface AgentStep {
  toolName: string;
  input: unknown;
  result: unknown;
}

export interface RunAgentOptions extends GenerateOptions {
  tools: Tool[];
  handlers: Record<string, (input: unknown) => Promise<unknown> | unknown>;
  maxSteps?: number;
  onStep?: (step: AgentStep) => void;
}

export interface AgentResult {
  finalMessage: Message;
  steps: AgentStep[];
  text: string;
}

export async function runAgent(opts: RunAgentOptions): Promise<AgentResult> {
  const maxSteps = opts.maxSteps ?? 12;
  const steps: AgentStep[] = [];
  const conversation: MessageParam[] = [...opts.messages];
  let lastMessage: Message | null = null;

  for (let i = 0; i < maxSteps; i++) {
    const msg = await generate({
      ...opts,
      messages: conversation,
    });
    lastMessage = msg;

    const uses = toolUses(msg);
    if (uses.length === 0 || msg.stop_reason === 'end_turn') break;

    // Record the assistant's tool_use message verbatim
    conversation.push({ role: 'assistant', content: msg.content });

    // Execute each tool and push tool_result back
    const toolResults: {
      type: 'tool_result';
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    }[] = [];
    for (const use of uses) {
      const handler = opts.handlers[use.name];
      if (!handler) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: `Unknown tool: ${use.name}`,
          is_error: true,
        });
        continue;
      }
      try {
        const result = await handler(use.input);
        steps.push({ toolName: use.name, input: use.input, result });
        opts.onStep?.({ toolName: use.name, input: use.input, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      } catch (err) {
        steps.push({ toolName: use.name, input: use.input, result: { error: String(err) } });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: `Error: ${String(err)}`,
          is_error: true,
        });
      }
    }
    conversation.push({ role: 'user', content: toolResults });
  }

  return {
    finalMessage: lastMessage!,
    steps,
    text: lastMessage ? textFrom(lastMessage) : '',
  };
}
