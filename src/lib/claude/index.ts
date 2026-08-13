// ─────────────────────────────────────────────────────────────
// Pearloom / lib/claude/index.ts — barrel
// ─────────────────────────────────────────────────────────────

export {
  getAnthropicClient,
  generate,
  runAgent,
  textFrom,
  toolUses,
  parseJsonFromText,
  cached,
  text,
  MODEL_BY_TIER,
  CLAUDE_OPUS,
  CLAUDE_SONNET,
  CLAUDE_HAIKU,
} from './client';

export type {
  ClaudeTier,
  GenerateOptions,
  RunAgentOptions,
  AgentResult,
  AgentStep,
} from './client';

export { generateJson, streamText } from './structured';
