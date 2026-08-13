#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// scripts/css-dead-audit.mjs
//
// Find (and optionally remove) class selectors in pearloom.css
// that no consumer references.
//
// This is a postcss job, not a grep-and-sed job. The occurrences
// sit inside nested @media / @supports blocks, and removing a rule
// by line number would orphan declarations or leave empty at-rules
// behind. postcss gives real brace matching and lets us prune the
// empties afterwards.
//
// THE SAFETY RULE: a rule is removed only when EVERY selector in it
// is dead. A rule like `.pl8-dash-main, .pl8-cockpit-hero` where one
// side is live keeps the live half and drops the dead one; if any
// doubt remains the rule stays. Deleting CSS fails silently and
// visually — it doesn't break a build or a test — so the tool errs
// toward keeping.
//
//   node scripts/css-dead-audit.mjs            # report only
//   node scripts/css-dead-audit.mjs --write    # apply
//   node scripts/css-dead-audit.mjs --verify-against .next
//
// `--verify-against <dir>` cross-checks every candidate against a
// BUILT output tree as well as source. Next inlines JSX class
// strings into its JS chunks, so a class absent from both source
// and the build has no consumer anywhere — a stronger claim than
// grepping src alone.
// ─────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const ROOT = process.cwd();
const CSS_FILE = path.join(ROOT, 'src/app/pearloom.css');

// Classes to KEEP regardless of consumer count — see the audit doc.
// The texture library is a coherent on-brand set built slightly
// ahead of its consumers, not sediment from a deleted surface.
const KEEP = new Set([
  'pl-tx-dotwork', 'pl-tx-herringbone', 'pl-tx-lattice', 'pl-tx-scallop',
  'pl-tx-starfield', 'pl-tx-vignette', 'pl-tx-waveline',
]);

const SEARCH_DIRS = ['src', 'public', 'e2e', 'tests', 'scripts'];
const SEARCH_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.html', '.md', '.json']);

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      walk(p, out);
    } else if (SEARCH_EXT.has(path.extname(e.name))) {
      out.push(p);
    }
  }
  return out;
}

/** Every corpus file's text, concatenated once.
 *
 *  `skipCss` matters for the build cross-check: the compiled bundle
 *  CONTAINS pearloom.css, so counting stylesheets there would find
 *  every class "referenced" by its own declaration and make the
 *  check vacuously pass. Consumers live in the JS/HTML. */
function readCorpus(dirs, { skipCss = false } = {}) {
  const files = dirs.flatMap((d) => walk(path.join(ROOT, d)));
  return files
    .filter((f) => path.resolve(f) !== path.resolve(CSS_FILE))
    .filter((f) => !(skipCss && path.extname(f) === '.css'))
    .map((f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } })
    .join('\n');
}

/** Collect every `.pl-*` / `.pl8-*` class in the stylesheet. */
function collectClasses(root) {
  const classes = new Set();
  root.walkRules((rule) => {
    // Skip keyframe steps ("from", "50%") — not selectors.
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    for (const m of rule.selector.matchAll(/\.(pl8?-[a-zA-Z0-9_-]+)/g)) classes.add(m[1]);
  });
  return classes;
}

/** Is this class referenced anywhere outside the stylesheet? */
function isReferenced(cls, corpus) {
  // Word-boundary-ish: the class must not be a prefix of a longer
  // class (pl8-tile vs pl8-tile-lift are different selectors).
  const rx = new RegExp(`${cls.replace(/[-]/g, '\\-')}(?![a-zA-Z0-9_-])`);
  return rx.test(corpus);
}

/**
 * Can this selector ever match anything?
 *
 * A descendant selector is a chain of compounds — `.a .b > .c` needs
 * an element with class `c`. If ANY compound in the chain requires a
 * class that no element in the product ever carries, the whole
 * selector is unreachable, however alive its other compounds are.
 * That's what makes `.pl8-guest .pl8-gallery-grid` removable: the
 * scope root is live, the target is not.
 *
 * TWO THINGS THAT WOULD MAKE THIS UNSOUND, both bailed out of:
 *   - `:not(.dead)` — a negation over a class nobody has matches
 *     EVERYTHING, so a dead class there makes the rule broader, not
 *     narrower.
 *   - `:is()` / `:where()` / `:has()` — a dead class inside a list
 *     doesn't kill the selector; its siblings can still match.
 * Any selector containing a functional pseudo-class is left alone.
 */
export function selectorCanNeverMatch(selector, deadSet) {
  if (/:(not|is|where|has|matches|any)\s*\(/i.test(selector)) return false;
  const compounds = selector.split(/\s*[\s>+~]\s*/).filter(Boolean);
  for (const compound of compounds) {
    const found = [...compound.matchAll(/\.(pl8?-[a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
    if (found.length > 0 && found.every((c) => deadSet.has(c))) return true;
  }
  return false;
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const vIdx = args.indexOf('--verify-against');
  const verifyDir = vIdx >= 0 ? args[vIdx + 1] : null;

  const css = fs.readFileSync(CSS_FILE, 'utf8');
  const root = postcss.parse(css, { from: CSS_FILE });
  const classes = [...collectClasses(root)].sort();

  const corpus = readCorpus(SEARCH_DIRS);
  let dead = classes.filter((c) => !KEEP.has(c) && !isReferenced(c, corpus));

  if (verifyDir) {
    // A class present in the BUILD but absent from source means the
    // source scan missed a consumer — keep it, and say so loudly.
    const built = readCorpus([verifyDir], { skipCss: true });
    const resurrected = dead.filter((c) => isReferenced(c, built));
    if (resurrected.length) {
      console.log(`\n⚠ ${resurrected.length} class(es) appear in the build but not in source — KEEPING:`);
      for (const c of resurrected) console.log(`   .${c}`);
    }
    dead = dead.filter((c) => !isReferenced(c, built));
  }

  const deadSet = new Set(dead);
  console.log(`\n${classes.length} classes declared · ${dead.length} with no consumer · ${KEEP.size} kept by policy`);

  // ── Plan the edit ────────────────────────────────────────
  let rulesRemoved = 0;
  let selectorsRemoved = 0;

  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    const parts = rule.selectors;
    const keep = parts.filter((sel) => !selectorCanNeverMatch(sel, deadSet));
    if (keep.length === parts.length) return;
    selectorsRemoved += parts.length - keep.length;
    if (keep.length === 0) { rule.remove(); rulesRemoved += 1; }
    else rule.selectors = keep;
  });

  // Prune @keyframes nothing animates any more. Removing the last
  // consumer of an animation leaves its keyframes behind as dead
  // weight, so this runs AFTER the rule removal above and searches
  // the whole repo — an animation-name can be set from JS.
  const kfCorpus = (() => {
    const stripped = postcss.parse(root.toString(), { from: CSS_FILE });
    stripped.walkAtRules(/keyframes/, (a) => a.remove());
    return `${corpus}\n${stripped.toString()}`;
  })();
  let keyframesRemoved = 0;
  root.walkAtRules(/keyframes/, (at) => {
    const name = at.params.trim();
    const rx = new RegExp(`${name.replace(/[-]/g, '\\-')}(?![a-zA-Z0-9_-])`);
    if (!rx.test(kfCorpus)) { at.remove(); keyframesRemoved += 1; }
  });
  if (keyframesRemoved) console.log(`${keyframesRemoved} orphaned @keyframes removed`);

  // Prune at-rules left holding nothing.
  let pruned = 0;
  let changed = true;
  while (changed) {
    changed = false;
    root.walkAtRules((at) => {
      if (!at.nodes || at.nodes.length > 0) return;
      if (/keyframes|import|charset|font-face|property/.test(at.name)) return;
      at.remove(); pruned += 1; changed = true;
    });
  }

  const out = root.toString();
  const before = css.split('\n').length;
  const after = out.split('\n').length;
  console.log(`${rulesRemoved} rules removed · ${selectorsRemoved} selectors dropped · ${pruned} empty at-rules pruned`);
  console.log(`${before} → ${after} lines (−${before - after})`);

  if (write) {
    // Re-parse the result: if the output isn't valid CSS, don't ship it.
    postcss.parse(out, { from: CSS_FILE });
    fs.writeFileSync(CSS_FILE, out, 'utf8');
    console.log(`\nWrote ${CSS_FILE}`);
  } else {
    console.log('\n(report only — pass --write to apply)');
    if (dead.length) {
      console.log('\nDead classes:');
      for (const c of dead) console.log(`  .${c}`);
    }
  }
}

main();
