// ─────────────────────────────────────────────────────────────
// The retired-vocabulary fence (Sprint P / ground rule 3; L43+L56).
//
// BRAND §7 retired "Begin a thread" (the old <EmptyState/> key) and
// "basted in" on 2026-07-08 — and this was the ONE brand retirement
// with no fence test, so it regressed: the audit found the exact
// banned string live on the Budget page, the music dashboard, the
// circle threads, the zero-sites button, the signup metadata, and a
// welcome-email CTA. Retired words come back through copy-paste;
// only a grep keeps them dead.
// ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

/** Ripgrep src for a literal, returning `file:line:text` hits.
 *  Excludes test files (fences may quote the banned words). */
function grepSrc(literal: string): string[] {
  try {
    const out = execFileSync(
      'grep',
      ['-rn', '--include=*.ts', '--include=*.tsx', '-F', literal, 'src'],
      { encoding: 'utf8', cwd: process.cwd() },
    );
    return out
      .split('\n')
      .filter(Boolean)
      .filter((l) => !/\.test\.tsx?:/.test(l));
  } catch {
    return []; // grep exits 1 on zero matches
  }
}

describe('BRAND §7 retired vocabulary stays retired', () => {
  it('"Begin a thread" appears nowhere in src (the retired empty-state key + button copy)', () => {
    expect(grepSrc('Begin a thread')).toEqual([]);
  });

  it('"basted in" never ships as host-facing copy', () => {
    const hits = grepSrc('basted in').filter(
      (l) =>
        // The internal module keeps its name and documents the
        // retirement in a comment; Pear's prompts INSTRUCT the model
        // not to say it. Neither renders to a host.
        !l.startsWith('src/components/pearloom/redesign/bastings.ts:') &&
        !l.startsWith('src/app/api/pear-chat/route.ts:'),
    );
    expect(hits).toEqual([]);
  });
});
