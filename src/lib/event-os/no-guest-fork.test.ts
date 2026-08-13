// The G.1 fence: the guests/pearloom_guests fork is collapsed
// (20260812_guest_spine_merge.sql) — `guests` is the ONE canonical
// guest row and NOTHING queries the deprecated identity table.
// A new `from('pearloom_guests')` anywhere in src/ is the fork
// growing back; route it through the adapter (lib/event-os/db.ts)
// against the guests spine instead. docs/FORK-SURVEY.md is the map.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe('the guest spine has no fork', () => {
  it("nothing in src/ queries pearloom_guests", () => {
    const offenders: string[] = [];
    for (const file of walk(join(process.cwd(), 'src'))) {
      if (file.endsWith('no-guest-fork.test.ts')) continue;
      const body = readFileSync(file, 'utf8');
      if (body.includes("from('pearloom_guests')") || body.includes('pearloom_guests!inner')) {
        offenders.push(file.replace(process.cwd() + '/', ''));
      }
    }
    expect(offenders, 'files still querying the deprecated fork').toEqual([]);
  });
});
