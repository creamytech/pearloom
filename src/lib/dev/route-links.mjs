// ─────────────────────────────────────────────────────────────
// Pearloom / lib/dev/route-links.mjs
//
// Does every internal link in this product go somewhere?
//
// Written after finding that the publish moment's "Invite your
// guests →" CTA pointed at /dashboard/guests, which does not exist
// — the roster is LABELLED "Guests" but lives at /dashboard/rsvp.
// That was the highest-intent click in the whole funnel, and it
// 404'd. It was found by accident. This finds the rest on purpose.
//
// NOT a replacement for scripts/link-audit.mjs. That one crawls a
// RUNNING app with Playwright from a seed list of public pages —
// which is why it never saw the bug above: the dead link lived
// behind auth, in a modal, on a surface the crawler can't reach.
// This is static: no server, no auth, and it sees targets inside
// conditionals a crawler would have to trigger to reach.
//
// Plain .mjs on purpose, so the CLI (scripts/route-link-audit.mjs)
// and the regression test (route-links.test.ts) run the SAME code
// rather than two copies that drift.
// ─────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP = path.join(ROOT, 'src/app');

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Every path the App Router serves, as a matcher. */
function collectRoutes() {
  const routes = [];
  for (const file of walk(APP)) {
    const base = path.basename(file);
    if (!/^(page|route)\.(tsx?|jsx?)$/.test(base)) continue;
    const rel = path.relative(APP, path.dirname(file));
    const segments = rel === '' ? [] : rel.split(path.sep);
    // Route groups — (shell), (marketing) — don't appear in the URL.
    const urlSegments = segments.filter((s) => !/^\(.*\)$/.test(s));
    routes.push({
      pattern: `/${urlSegments.join('/')}`.replace(/\/+$/, '') || '/',
      segments: urlSegments,
      file: path.relative(ROOT, file),
    });
  }
  return routes;
}

/** Does this concrete pathname match a route pattern (incl. [param])? */
export function matchesRoute(pathname, route) {
  const want = pathname.split('/').filter(Boolean);
  const got = route.segments;
  const catchAllAt = got.findIndex((s) => /^\[\[?\.\.\./.test(s));
  if (catchAllAt >= 0) {
    if (want.length < catchAllAt) return false;
    return got.slice(0, catchAllAt).every((s, i) => s.startsWith('[') || s === want[i]);
  }
  if (want.length !== got.length) return false;
  return got.every((s, i) => (s.startsWith('[') ? true : s === want[i]));
}

const EXT = new Set(['.ts', '.tsx']);

const PATTERNS = [
  /href\s*=\s*["'`](\/[^"'`\s{}$]*)["'`]/g,
  /href\s*=\s*\{\s*["'`](\/[^"'`\s{}$]*)["'`]\s*\}/g,
  /(?:router\s*\.\s*(?:push|replace)|redirect|permanentRedirect)\s*\(\s*["'`](\/[^"'`\s{}$]*)["'`]/g,
  /location\s*\.\s*href\s*=\s*["'`](\/[^"'`\s{}$]*)["'`]/g,
];

/* Interpolated targets — href={`/editor/${slug}`}, router.push(`/g/${t}`).
   The dynamic tail can't be checked, but the LITERAL PREFIX can, and a
   typo'd prefix (/dashboard/guest/${id}) is exactly the bug this audit
   exists to find. Captured separately and checked as a prefix. */
const TEMPLATE_PATTERNS = [
  /href\s*=\s*\{?\s*`(\/[^`]*)`/g,
  /(?:router\s*\.\s*(?:push|replace)|redirect|permanentRedirect)\s*\(\s*`(\/[^`]*)`/g,
  /location\s*\.\s*href\s*=\s*`(\/[^`]*)`/g,
];

/** Literal leading segments of a template target, before any `${`. */
export function literalPrefixSegments(raw) {
  const head = raw.split('${')[0];
  const segs = head.split('/').filter(Boolean);
  // The segment adjacent to the interpolation is a fragment, not a
  // whole segment, unless the template had a trailing slash.
  if (!head.endsWith('/') && segs.length > 0 && head !== raw) segs.pop();
  return segs;
}

/** Could ANY route start with these literal segments? */
export function prefixIsServed(segments, routes) {
  if (segments.length === 0) return true;
  return routes.some((r) =>
    r.segments.length >= segments.length &&
    segments.every((s, i) => r.segments[i].startsWith('[') || r.segments[i] === s));
}

function collectLinks() {
  const found = [];
  for (const file of walk(path.join(ROOT, 'src'))) {
    if (!EXT.has(path.extname(file))) continue;
    if (/\.test\.tsx?$/.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    const push = (m, kind) => {
      const line = text.slice(0, m.index).split('\n').length;
      found.push({
        target: m[1],
        kind,
        file: path.relative(ROOT, file),
        line,
        source: (lines[line - 1] ?? '').trim().slice(0, 110),
      });
    };
    for (const rx of PATTERNS) {
      rx.lastIndex = 0;
      let m;
      while ((m = rx.exec(text)) !== null) push(m, 'literal');
    }
    for (const rx of TEMPLATE_PATTERNS) {
      rx.lastIndex = 0;
      let m;
      while ((m = rx.exec(text)) !== null) {
        if (!m[1].includes('${')) continue;   // fully literal: already caught above
        push(m, 'template');
      }
    }
  }
  return found;
}

/** Served by something other than a page file, or not a route at all. */
const NOT_A_PAGE = [
  /^\/_next\//,
  /^\/favicon/,
  /\.(png|jpe?g|svg|webp|ico|txt|xml|json|pdf|css|js|woff2?)$/i,
];


/** Every internal link that resolves to no route. */
export function findDeadLinks() {
  const routes = collectRoutes();
  const links = collectLinks();
  const bad = [];
  const seen = new Set();
  for (const link of links) {
    const pathname = link.target.split(/[?#]/)[0] || '/';
    if (NOT_A_PAGE.some((rx) => rx.test(pathname))) continue;
    if (pathname === '/') continue;
    if (link.kind === 'template') {
      if (prefixIsServed(literalPrefixSegments(pathname), routes)) continue;
    } else if (routes.some((r) => matchesRoute(pathname, r))) continue;
    const key = `${link.file}:${link.line}:${pathname}`;
    if (seen.has(key)) continue;
    seen.add(key);
    bad.push({ ...link, pathname });
  }
  return { routes, links, dead: bad };
}

export { collectRoutes, collectLinks };
