// ─────────────────────────────────────────────────────────────
// The no-stock-hotlinks fence (REVAMP P.4).
//
// The landing, the demo worlds, and the dev harness used to
// hotlink images.unsplash.com — 36 stock photos a corporate
// proxy or ad-blocker could blank (the audit sim saw exactly
// that: broken landing imagery). Every slot now presses one of
// the house's own plates (public/plates via lib/photo-plates),
// and the unsplash remotePattern is gone from next.config so a
// future hotlink breaks visibly instead of riding through the
// image optimizer. This grep keeps it that way.
// ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLATE_COUNT, platePath, plateFor } from './photo-plates';

function grepTree(literal: string, dir: string): string[] {
  try {
    const out = execFileSync(
      'grep',
      ['-rn', '--include=*.ts', '--include=*.tsx', '-F', literal, dir],
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

describe('no surface hotlinks stock imagery', () => {
  it('images.unsplash.com appears nowhere in src', () => {
    expect(grepTree('images.unsplash.com', 'src')).toEqual([]);
  });

  it('next.config declares no unsplash remotePattern', () => {
    const cfg = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
    expect(cfg).not.toMatch(/hostname:\s*'images\.unsplash\.com'/);
  });
});

describe('the plate set is real and stable', () => {
  it(`all ${PLATE_COUNT} pressed plates exist in public/plates`, () => {
    for (let i = 1; i <= PLATE_COUNT; i++) {
      const p = join(process.cwd(), 'public', platePath(i));
      expect(existsSync(p), `${platePath(i)} missing`).toBe(true);
    }
  });

  it('plateFor is stable and always lands on a real plate', () => {
    expect(plateFor('photo-1519741497674-611481863552')).toBe(
      plateFor('photo-1519741497674-611481863552'),
    );
    for (const key of ['a', 'photo-x', 'wardrobe-1', 'then-2', '']) {
      expect(plateFor(key)).toMatch(/^\/plates\/plate-(0[1-9]|1[0-2])\.jpg$/);
    }
  });
});
