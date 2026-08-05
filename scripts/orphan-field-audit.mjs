#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// scripts/orphan-field-audit.mjs
//
// Which manifest fields does a host set that NOTHING reads?
//
// This is the codebase's documented recurring failure, not a
// hypothetical. From CLAUDE-PRODUCT's own changelog: `pageMode`
// (the renderer read `siteMode`), `motif` (the renderer read
// `motifs`), `spacing`, `themeName`, `scriptFont` — each a control
// a host could operate, that wrote a field, that no renderer ever
// read. The picker lights up and the site never changes. It fails
// silently, and the host concludes the product is broken.
//
// Method: for every field on StoryManifest, count WRITES (an
// assignment or an object-literal key on a manifest-shaped value)
// separately from READS. A field with writes and no reads is the
// bug. A field with reads and no writes is usually fine — the
// wizard or an API seeds it.
//
// Heuristic by nature, so it reports and never edits: every hit
// needs a human to look. It exists to shrink 130 fields down to
// the handful worth reading.
//
//   node scripts/orphan-field-audit.mjs
// ─────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

function manifestFields() {
  const src = fs.readFileSync(path.join(ROOT, 'src/types.ts'), 'utf8');
  const m = /export interface StoryManifest \{(.*?)\n\}/s.exec(src);
  if (!m) throw new Error('StoryManifest not found in src/types.ts');
  return [...m[1].matchAll(/^ {2}(\w+)\??\s*[:?]/gm)].map((x) => x[1]);
}

/** Reads and writes of `.field`, excluding the type declaration. */
function classify(field, files) {
  const writes = [];
  const reads = [];
  // `x.field =` / `x.field ??=` — an assignment.
  const assign = new RegExp(`\\.${field}\\s*(?:\\?\\?|\\|\\|)?=[^=]`, 'g');
  // `field:` inside an object literal — a write when building a manifest.
  const literal = new RegExp(`(?:^|[{,\\s])${field}\\s*:`, 'g');
  // Any other mention of `.field` — a read.
  const dotted = new RegExp(`\\.${field}(?![a-zA-Z0-9_])`, 'g');
  // Bracket access — `manifest['field']`.
  const bracket = new RegExp(`\\[['"\`]${field}['"\`]\\]`, 'g');

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (rel === 'src/types.ts') continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes(field)) continue;
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      const at = { file: rel, line: i + 1, source: line.trim().slice(0, 100) };
      assign.lastIndex = literal.lastIndex = dotted.lastIndex = bracket.lastIndex = 0;
      const isAssign = assign.test(line);
      const isLiteral = literal.test(line);
      const isDotted = dotted.test(line) || bracket.test(line);
      if (isAssign || (isLiteral && !isDotted)) writes.push(at);
      else if (isDotted) reads.push(at);
    });
  }
  return { writes, reads };
}

/** Files that RENDER — a field only read by an editor panel is
 *  still orphaned as far as the guest's site is concerned. */
function isRenderer(rel) {
  // The whole redesign/ tree IS the renderer (ThemedSite plus its
  // section variants and overlays), so scoping this to a handful of
  // filenames under-counted and flagged live fields as orphans.
  return /components\/pearloom\/redesign\//.test(rel)
    || /components\/pearloom\/site\//.test(rel)
    || /app\/sites\//.test(rel)
    || /lib\/(site-look|site-editions|site-mode|suite)/.test(rel);
}

function main() {
  const files = walk(path.join(ROOT, 'src'));
  const fields = manifestFields();

  const orphans = [];
  const editorOnly = [];

  for (const field of fields) {
    const { writes, reads } = classify(field, files);
    if (writes.length === 0) continue;               // nothing sets it
    if (reads.length === 0) { orphans.push({ field, writes }); continue; }
    if (!reads.some((r) => isRenderer(r.file))) {
      editorOnly.push({ field, writes, reads });
    }
  }

  console.log(`${fields.length} StoryManifest fields checked\n`);

  console.log(`── WRITTEN, NEVER READ (${orphans.length}) ──`);
  for (const o of orphans) {
    console.log(`  ${o.field}  (${o.writes.length} write${o.writes.length === 1 ? '' : 's'})`);
    for (const w of o.writes.slice(0, 3)) console.log(`      ${w.file}:${w.line}  ${w.source}`);
  }

  console.log(`\n── READ, BUT NEVER BY A RENDERER (${editorOnly.length}) ──`);
  console.log('   (fine when the consumer is an API or a dashboard; a bug when a host expects the SITE to change)');
  for (const o of editorOnly) {
    const where = [...new Set(o.reads.map((r) => r.file.replace(/^src\//, '')))].slice(0, 3);
    console.log(`  ${o.field}  → ${where.join(', ')}${o.reads.length > 3 ? ' …' : ''}`);
  }
}

main();
