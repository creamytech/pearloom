// ─────────────────────────────────────────────────────────────
// rewrite-tones — single source of truth for the AI rewrite
// vocabulary that appears across HoverToolbar, PearCommand, and
// DesignAdvisor. Previously each surface defined its own
// instruction strings; this module collects them so the prompt
// language stays consistent and a future variant-chip UI can
// fan all three out in one round-trip.
//
// Audit #11 partial — full unification (single API call that
// returns all three variants, accept-or-reject chip flow) needs
// a new UI primitive and is deferred. This is the data layer
// shared between the eventual unified UI and today's three
// per-surface entry points.
// ─────────────────────────────────────────────────────────────

/** Canonical rewrite-tone identifiers. The three tones cover
 *  every host-perceptible variation we surface today. */
export type RewriteTone = 'rewrite' | 'shorter' | 'warmer' | 'quieter';

/** One tone — id + label + the instruction string the API takes. */
export interface RewriteToneSpec {
  /** Stable id used in UI state + analytics. */
  id: RewriteTone;
  /** UI label — title-case, single word where possible. */
  label: string;
  /** One-line hint shown under the label in a longer affordance
   *  (command palette row, picker). */
  hint: string;
  /** Builds the instruction string the API consumes. `subject`
   *  is interpolated as either "the {context}" or "this text"
   *  to keep prompts grammatical. */
  buildInstruction: (subject: string) => string;
}

/** Tone catalog. Order matters: this is the order the eventual
 *  variant-chip picker will render the chips in. */
export const REWRITE_TONES: Record<RewriteTone, RewriteToneSpec> = {
  rewrite: {
    id: 'rewrite',
    label: 'Rewrite',
    hint: 'Specific, unexpected, warm — same length',
    buildInstruction: (subject) =>
      `Rewrite ${subject} so it's more specific, unexpected, and warm. Keep the length.`,
  },
  shorter: {
    id: 'shorter',
    label: 'Shorter',
    hint: 'About half as long, same meaning',
    buildInstruction: (subject) =>
      `Rewrite ${subject} to be about half as long. Keep the core meaning.`,
  },
  warmer: {
    id: 'warmer',
    label: 'Warmer',
    hint: 'More human, less brand-y',
    buildInstruction: (subject) =>
      `Rewrite ${subject} so it feels warmer, more human, and less brand-y.`,
  },
  quieter: {
    id: 'quieter',
    label: 'Quieter',
    hint: 'Editorial voice, no exclamation marks',
    buildInstruction: (subject) =>
      `Rewrite ${subject} in a quiet, editorial voice. No exclamation marks. No cliches.`,
  },
};

/** Convenience — same as REWRITE_TONES[id] but indexed by tone id
 *  with safe fallback to 'rewrite'. */
export function toneSpec(id: RewriteTone | string): RewriteToneSpec {
  return REWRITE_TONES[(id as RewriteTone)] ?? REWRITE_TONES.rewrite;
}

/** Helper — the three tones the canvas HoverToolbar surfaces by
 *  default. PearCommand surfaces warmer + shorter + quieter; the
 *  full unified picker will offer all four. */
export const HOVER_TOOLBAR_TONES: RewriteTone[] = ['rewrite', 'shorter', 'warmer'];

/** Helper — the three tones PearCommand shows in its tagline
 *  rewrite group. */
export const PEAR_COMMAND_TONES: RewriteTone[] = ['warmer', 'shorter', 'quieter'];

/** Build the subject string the way every consumer does today —
 *  `the {context}` when a context label is provided, else
 *  'this text'. Keeps every prompt grammatical. */
export function rewriteSubject(context?: string | null): string {
  return context ? `the ${context}` : 'this text';
}
