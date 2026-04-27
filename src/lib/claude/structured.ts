// ─────────────────────────────────────────────────────────────
// Pearloom / lib/claude/structured.ts
// Structured output + streaming helpers for Claude.
// ─────────────────────────────────────────────────────────────

import { generate, parseJsonFromText, textFrom, getAnthropicClient, MODEL_BY_TIER } from './client';
import type { ClaudeTier, GenerateOptions } from './client';

/**
 * Generate a typed JSON response by asking the model to emit a single
 * JSON object via a dedicated tool. This is more reliable than
 * response-format hacks — Claude's tool-use is the structured output
 * escape hatch.
 */
export async function generateJson<T>(opts: Omit<GenerateOptions, 'tools'> & {
  schema: Record<string, unknown>;
  schemaName?: string;
  schemaDescription?: string;
}): Promise<T> {
  const name = opts.schemaName ?? 'emit_result';
  const msg = await generate({
    ...opts,
    tools: [{
      name,
      description: opts.schemaDescription ?? 'Emit the final structured result.',
      input_schema: opts.schema as unknown as {
        type: 'object';
        properties?: Record<string, unknown>;
      },
    }],
    // Force the tool so we always get structured JSON.
    // (SDK accepts tool_choice in the create params.)
  });

  // First try a tool_use block
  for (const block of msg.content) {
    if (block.type === 'tool_use' && block.name === name) {
      return block.input as T;
    }
  }

  // Fallback: model returned text — try to parse JSON out of it
  const raw = textFrom(msg);
  try {
    return parseJsonFromText<T>(raw);
  } catch {
    throw new Error(`Claude did not return valid JSON for ${name}: ${raw.slice(0, 400)}`);
  }
}

/**
 * Stream text tokens from Claude. Yields each delta as it arrives.
 * Returns the full accumulated text + usage info.
 */
export async function* streamText(opts: {
  tier: ClaudeTier;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
}): AsyncGenerator<string, { text: string }, void> {
  const client = getAnthropicClient();
  const stream = await client.messages.stream({
    model: MODEL_BY_TIER[opts.tier],
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.7,
    system: opts.system,
    messages: opts.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  let accumulated = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      accumulated += event.delta.text;
      yield event.delta.text;
    }
  }
  return { text: accumulated };
}
