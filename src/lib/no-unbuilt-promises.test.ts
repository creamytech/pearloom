// ─────────────────────────────────────────────────────────────
// Don't sell what isn't built.
//
// Custom domains were priced, described in the Stripe checkout,
// listed in the settings copy, and explained in a help answer that
// told hosts to open "Dashboard → Profile → Domains" — a screen
// that does not exist. There is no DNS provisioning, no TLS
// issuance, no verification step anywhere in the product. A host
// could pay $89, follow our own instructions, and find nothing.
//
// The `PLAN_LIMITS.customDomain` flag stays so the ladder keeps its
// shape for whoever builds the feature. This test makes sure the
// flag can't quietly become a promise again in the meantime — the
// claim comes back only WITH the feature.
//
// Sibling of `no-physical-promises.test.ts`, which does the same
// job for the retired print service.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** Host-facing copy: what a user can actually read. */
const COPY_DIRS = ['src/components', 'src/app', 'src/lib'];

function walk(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Phrases that promise a custom domain as something you GET. */
const SELLING_PHRASES = [
  /your own domain/i,
  /add a custom domain/i,
  /attach a custom domain/i,
  /Profile\s*→\s*Domains/i,
  /custom domain included/i,
];

/** Files allowed to mention it: the honest "not yet" answers, the
 *  reserved flag itself, and the URL module's architectural note. */
const ALLOWED = [
  'src/lib/plan-gate.ts',
  'src/lib/site-urls.ts',
  'src/lib/help-faq.ts',
];

describe('custom domains are not sold until they exist', () => {
  const files = COPY_DIRS.flatMap((d) => walk(path.join(ROOT, d)));

  it('scanned a real tree', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('no host-facing copy promises a custom domain', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      if (ALLOWED.includes(rel)) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const rx of SELLING_PHRASES) {
        if (rx.test(text)) offenders.push(`${rel} — ${rx}`);
      }
    }
    expect(
      offenders,
      'These promise a custom domain, which the product does not have:\n'
      + `${offenders.join('\n')}\n`
      + 'Build the feature (DNS + TLS + verification) before selling it again.',
    ).toEqual([]);
  });

  it('the allowed mentions really are the honest ones', () => {
    // (DesignFAQ was deleted in M.1 — it was mounted nowhere and
    // still sold the retired Journal/Atelier/Legacy ladder, L86/L96.)
    const help = fs.readFileSync(path.join(ROOT, 'src/lib/help-faq.ts'), 'utf8');
    expect(help).toMatch(/aren’t available yet|are in the works/i);
  });
});
