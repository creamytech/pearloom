// ─────────────────────────────────────────────────────────────
// Pearloom / scripts/backfill-theme-vars.ts
//
// One-shot backfill for manifest.themeVars on published sites.
//
// Background
// ──────────
// `src/lib/theme-store/apply.ts` (Round E onward) writes
// `manifest.themeVars` (the full --t-* var bag from the applied
// pack) so ThemedSiteRenderer can emit the prototype's complete
// theme namespace on the published site root. Sites generated
// BEFORE Round E don't carry that field — the renderer falls
// back to defaults for everything beyond the six
// `theme.colors.*` values.
//
// This script reads every published site (ai_manifest IS NOT
// NULL), derives the right themeVars from either:
//
//   1. `manifest.themeId` matches a pack id (lib/theme-store/packs)
//      → use pack.themeRef + motifKind + dividerLook + foil + darkMode.
//   2. `manifest.themeId` matches a base theme id
//      ('santorini' / 'tuscan' / 'garden' / 'editorial' /
//      'midnight' / 'coastal') → use THEMES.vars from
//      src/components/pearloom/site/themes.ts.
//   3. Neither matches → nearest-RGB match from
//      manifest.theme.colors.accent → THEMES (same algorithm
//      that lives in hydrate-manifest.ts:nearestThemeId).
//
// Usage
// ─────
//   # Dry-run (default): prints what WOULD change, writes nothing.
//   SUPABASE_URL='…' SUPABASE_SERVICE_ROLE_KEY='…' \
//     npx tsx scripts/backfill-theme-vars.ts
//
//   # Apply for real:
//   SUPABASE_URL='…' SUPABASE_SERVICE_ROLE_KEY='…' \
//     npx tsx scripts/backfill-theme-vars.ts --apply
//
// Env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) +
// SUPABASE_SERVICE_ROLE_KEY. The script reads the same env names
// the runtime uses so .env.local works.
//
// Idempotent: rows that already have manifest.themeVars are
// skipped. Rerunning is safe.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import {
  PACKS,
  getPackById,
  dividerForMotif,
  type Pack,
  type Motif,
} from '../src/lib/theme-store/packs';
import { THEMES } from '../src/components/pearloom/site/themes';

const APPLY = process.argv.includes('--apply');

/* Pack `Motif` → canvas `MotifKind` mapping. Mirrors the table
   in apply.ts so the backfill writes identical values to a fresh
   pack-apply (deco → deco-fan; everything else passes through). */
const MOTIF_CANVAS_MAP: Partial<Record<Motif, string>> = {
  deco: 'deco-fan',
};

/* Pack `Kit` → canvas data-pl-kit mapping. Same as apply.ts —
   arch/stamp/deco have no CSS so map them to canonical kits. */
const KIT_CANVAS_MAP: Record<string, string> = {
  arch: 'classic',
  stamp: 'scrapbook',
  deco: 'plate',
};

/* ─── Nearest-theme-by-accent (port of hydrate-manifest.ts) ──── */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function colourDistance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function nearestThemeId(accent?: string): string | null {
  if (!accent) return null;
  const target = hexToRgb(accent);
  if (!target) return null;
  let best: { id: string; d: number } | null = null;
  for (const theme of THEMES) {
    const themeAccent = theme.vars['--t-accent'];
    if (!themeAccent) continue;
    const rgb = hexToRgb(themeAccent);
    if (!rgb) continue;
    const d = colourDistance(target, rgb);
    if (!best || d < best.d) best = { id: theme.id, d };
  }
  return best?.id ?? null;
}

/* ─── Backfill derivation ─────────────────────────────────────── */

interface BackfillPatch {
  themeVars: Record<string, string>;
  /** Pack-only — these mirror what apply.ts writes alongside themeVars. */
  motifKind?: string;
  dividerLook?: string;
  foil?: boolean;
  darkMode?: boolean;
  kitId?: string;
  /** Used in log output to explain which branch fired. */
  source: 'pack' | 'theme' | 'nearest-theme';
  /** The themeId we ended up writing (or matching against). */
  resolvedThemeId: string;
}

function deriveFromPack(pack: Pack): BackfillPatch {
  const patch: BackfillPatch = {
    themeVars: { ...pack.themeRef },
    source: 'pack',
    resolvedThemeId: pack.id,
  };
  if (pack.kit) {
    patch.kitId = KIT_CANVAS_MAP[pack.kit] ?? pack.kit;
  }
  if (pack.motif && pack.motif !== 'none') {
    patch.motifKind = MOTIF_CANVAS_MAP[pack.motif] ?? pack.motif;
    patch.dividerLook = dividerForMotif(pack.motif);
  }
  if (pack.foil) patch.foil = true;
  if (pack.dark) patch.darkMode = true;
  return patch;
}

function deriveFromBaseTheme(themeId: string): BackfillPatch | null {
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return null;
  return {
    themeVars: { ...theme.vars },
    source: 'theme',
    resolvedThemeId: theme.id,
    /* Base themes carry their own foil/dark flags. We only write
       when truthy so we don't clobber a manifest that already
       set the field. */
    ...(theme.foil ? { foil: true } : {}),
    ...(theme.dark ? { darkMode: true } : {}),
  };
}

/**
 * Decide what to backfill for one row's manifest. Returns null
 * when the manifest already has themeVars (nothing to do) or
 * when no signal lets us pick a theme.
 */
function backfillFor(manifest: Record<string, unknown>): BackfillPatch | null {
  if (manifest.themeVars && typeof manifest.themeVars === 'object') {
    return null; // already populated, skip
  }

  const themeId = typeof manifest.themeId === 'string' ? manifest.themeId : undefined;

  /* 1. themeId matches a pack id → pack branch (most specific). */
  if (themeId) {
    const pack = getPackById(themeId);
    if (pack) return deriveFromPack(pack);
  }

  /* 2. themeId matches a base theme id → base-theme branch. */
  if (themeId) {
    const fromTheme = deriveFromBaseTheme(themeId);
    if (fromTheme) return fromTheme;
  }

  /* 3. Nearest-RGB match from theme.colors.accent → base theme. */
  const accent =
    typeof manifest.theme === 'object' && manifest.theme !== null
      ? (manifest.theme as { colors?: { accent?: string } }).colors?.accent
      : undefined;
  const matched = nearestThemeId(accent);
  if (matched) {
    const fromTheme = deriveFromBaseTheme(matched);
    if (fromTheme) return { ...fromTheme, source: 'nearest-theme' };
  }

  return null;
}

/**
 * Merge a backfill patch into a manifest WITHOUT clobbering
 * existing values. Only writes fields the manifest doesn't
 * already have — apply.ts is the source of truth at runtime,
 * so any host edits made after Round E always win.
 */
function mergePatch(
  manifest: Record<string, unknown>,
  patch: BackfillPatch,
): { merged: Record<string, unknown>; added: string[] } {
  const merged: Record<string, unknown> = { ...manifest };
  const added: string[] = [];

  if (!merged.themeVars) {
    merged.themeVars = patch.themeVars;
    added.push('themeVars');
  }
  if (patch.kitId && !merged.kitId) {
    merged.kitId = patch.kitId;
    added.push(`kitId=${patch.kitId}`);
  }
  if (patch.motifKind && !merged.motifKind) {
    merged.motifKind = patch.motifKind;
    added.push(`motifKind=${patch.motifKind}`);
  }
  if (patch.dividerLook && !merged.dividerLook) {
    merged.dividerLook = patch.dividerLook;
    added.push(`dividerLook=${patch.dividerLook}`);
  }
  if (patch.foil && !merged.foil) {
    merged.foil = true;
    added.push('foil');
  }
  if (patch.darkMode && !merged.darkMode) {
    merged.darkMode = true;
    added.push('darkMode');
  }
  /* themeId is written when missing so the runtime can re-derive
     this same backfill if needed in the future. */
  if (!merged.themeId) {
    merged.themeId = patch.resolvedThemeId;
    added.push(`themeId=${patch.resolvedThemeId}`);
  }

  return { merged, added };
}

/* ─── Main ────────────────────────────────────────────────────── */

interface SiteRow {
  id: string;
  subdomain: string;
  ai_manifest: Record<string, unknown> | null;
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars required.');
    console.error('Find them under Supabase → Project Settings → API.');
    process.exit(1);
  }

  console.log(`Pack catalog loaded: ${PACKS.length} packs`);
  console.log(`Base themes loaded:  ${THEMES.length} themes`);
  console.log(APPLY ? 'Mode: --apply (writes enabled)' : 'Mode: DRY-RUN (use --apply to write)');
  console.log('');

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('sites')
    .select('id, subdomain, ai_manifest')
    .not('ai_manifest', 'is', null)
    .order('subdomain', { ascending: true });

  if (error) {
    console.error('Supabase select failed:', error.message);
    process.exit(2);
  }

  const rows = (data ?? []) as SiteRow[];
  console.log(`Fetched ${rows.length} site row(s).\n`);

  let skippedNoManifest = 0;
  let skippedAlreadySet = 0;
  let skippedNoSignal = 0;
  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const slug = row.subdomain ?? row.id;
    const manifest = row.ai_manifest;

    if (!manifest || typeof manifest !== 'object') {
      skippedNoManifest += 1;
      console.log(`• skip  ${slug} — no manifest`);
      continue;
    }

    const patch = backfillFor(manifest);
    if (!patch) {
      if (manifest.themeVars) {
        skippedAlreadySet += 1;
        console.log(`• skip  ${slug} — themeVars already set`);
      } else {
        skippedNoSignal += 1;
        console.log(`• skip  ${slug} — no themeId or accent to match`);
      }
      continue;
    }

    const { merged, added } = mergePatch(manifest, patch);
    if (added.length === 0) {
      /* Shouldn't happen — backfillFor returned a patch but
         mergePatch wrote nothing. Defensive log. */
      skippedAlreadySet += 1;
      console.log(`• skip  ${slug} — patch matched but all fields present`);
      continue;
    }

    const action = APPLY ? 'apply' : 'would';
    console.log(
      `• ${action} ${slug}  [${patch.source}:${patch.resolvedThemeId}]  + ${added.join(', ')}`,
    );

    if (!APPLY) continue;

    const { error: upErr } = await supabase
      .from('sites')
      .update({ ai_manifest: merged })
      .eq('id', row.id);

    if (upErr) {
      failed += 1;
      console.error(`  ✗ update failed: ${upErr.message}`);
    } else {
      updated += 1;
    }
  }

  console.log('\n─── Summary ──────────────────────────────────────');
  console.log(`Total rows:           ${rows.length}`);
  console.log(`Skipped (no manifest): ${skippedNoManifest}`);
  console.log(`Skipped (already set): ${skippedAlreadySet}`);
  console.log(`Skipped (no signal):   ${skippedNoSignal}`);
  if (APPLY) {
    console.log(`Updated:               ${updated}`);
    console.log(`Failed:                ${failed}`);
  } else {
    const candidates =
      rows.length - skippedNoManifest - skippedAlreadySet - skippedNoSignal;
    console.log(`Would update:          ${candidates}`);
    console.log('\nRe-run with --apply to write changes.');
  }

  if (failed > 0) process.exit(3);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
