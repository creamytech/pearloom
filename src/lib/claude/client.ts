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
  ToolUseBlock,
  ContentBlock,
} from '@anthropic-ai/sdk/resources/messages';

// ── Model IDs ────────────────────────────────────────────────────
// Keep these centralized so we can bump versions in one place.
// Opus 4.7 is the current top-of-line (per the user). Haiku 4.5
// is the cheapest fast model. Sonnet 4.6 is the middle tier.
export const CLAUDE_OPUS = 'claude-opus-4-7';
export const CLAUDE_SONNET = 'claude-sonnet-4-6';
export const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001';

export type ClaudeTier = 'opus' | 'sonnet' | 'haiku';

export const MODEL_BY_TIER: Record<ClaudeTier, string> = {
  opus: CLAUDE_OPUS,
  sonnet: CLAUDE_SONNET,
  haiku: CLAUDE_HAIKU,
};

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
  _client = new Anthropic({ apiKey, maxRetries: 2 });
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
  stopSequences?: string[];
}

/**
 * Generate a single non-streaming response.
 */
export async function generate(opts: GenerateOptions): Promise<Message> {
  const client = getAnthropicClient();
  return withRetry(() =>
    client.messages.create({
      model: MODEL_BY_TIER[opts.tier],
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.7,
      system: typeof opts.system === 'string'
        ? [{ type: 'text', text: opts.system }]
        : opts.system,
      messages: opts.messages,
      ...(opts.tools && opts.tools.length > 0 ? { tools: opts.tools } : {}),
      ...(opts.stopSequences && opts.stopSequences.length > 0 ? { stop_sequences: opts.stopSequences } : {}),
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
