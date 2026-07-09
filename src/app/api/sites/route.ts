import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { saveSiteDraft } from '@/lib/db';
import { getPlanWithLimitsForEmail, planLimitResponseBody, isGriefExempt } from '@/lib/plan-gate';
import { mirrorManifestPhotos, stripProxyUrls } from '@/lib/mirror-photos';
import { recordProductEvent } from '@/lib/analytics/product-events';
import { listSitesForEmail } from '@/lib/sites-list';

// Force this route to always be server-rendered (never statically collected)
export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer service role for RLS bypass; fall back to public key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** First available subdomain for a wizard CREATE.
 *
 *  A new site must NEVER land on a slug that's already taken — by
 *  anyone, including the caller. Before this, a host who left the
 *  URL field blank got the same names-derived slug as their last
 *  site and saveSiteDraft (the autosave write path, which upserts
 *  by subdomain for same-owner rows) silently overwrote it.
 *
 *  One LIKE query, then counts up: base, base-2, base-3, … with a
 *  timestamp suffix as the deep-collision escape hatch. The base is
 *  already slugified by the wizard ([a-z0-9-]), so it can't carry
 *  LIKE wildcards. Fails OPEN to the requested slug — the old
 *  behavior — so a transient query error never blocks the create. */
async function findAvailableSubdomain(
  db: NonNullable<ReturnType<typeof getSupabase>>,
  requested: string,
): Promise<string> {
  const { data, error } = await db
    .from('sites')
    .select('subdomain')
    .like('subdomain', `${requested}%`)
    .limit(500);
  if (error || !data) {
    console.warn('[api/sites] subdomain availability query failed (using requested):', error);
    return requested;
  }
  const taken = new Set(data.map((r) => (r as { subdomain: string }).subdomain));
  if (!taken.has(requested)) return requested;
  for (let i = 2; i <= 60; i++) {
    const candidate = `${requested}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${requested}-${Date.now().toString(36)}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // The listing core (indexed creator_email query + legacy
    // mixed-case fallback + filter-mismatch probe + co-host append)
    // lives in @/lib/sites-list so the dashboard's server layout can
    // run the SAME query to seed the first paint. Owned + co-host
    // queries run in parallel there.
    const sites = await listSitesForEmail(session.user.email);
    // null = hard failure inside the lib — keep the route's historic
    // degrade-gracefully contract (empty list, 200).
    return NextResponse.json({ sites: sites ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sites:', error);
    // Return empty list so the UI degrades gracefully
    return NextResponse.json({ sites: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { names } = body;
    let manifest = body.manifest;
    const requestedSubdomain: string | undefined = body.subdomain;

    // Scoped patch mode — `manifestPatch` merges the given top-level
    // keys onto the FRESH stored manifest server-side. Secondary
    // authors with long-lived snapshots (the Studio autosave holds
    // its manifest from mount) use this so their save can never
    // revert edits made in the editor meanwhile. Exclusive with
    // `manifest` (full-save wins) and never a create.
    const manifestPatch =
      !manifest && body.manifestPatch && typeof body.manifestPatch === 'object' && !Array.isArray(body.manifestPatch)
        ? (body.manifestPatch as Record<string, unknown>)
        : null;

    if (!requestedSubdomain || (!manifest && !manifestPatch)) {
      return NextResponse.json({ error: 'Missing subdomain or manifest' }, { status: 400 });
    }

    if (manifestPatch) {
      if (body.create === true) {
        return NextResponse.json({ error: 'manifestPatch cannot create a site' }, { status: 400 });
      }
      const patchDb = getSupabase();
      if (!patchDb) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
      }
      const { data: row, error: patchReadError } = await patchDb
        .from('sites')
        .select('ai_manifest')
        .eq('subdomain', requestedSubdomain)
        .maybeSingle();
      if (patchReadError) {
        console.error('[api/sites] manifestPatch read failed:', patchReadError);
        return NextResponse.json({ error: 'Could not load site' }, { status: 500 });
      }
      if (!row) {
        return NextResponse.json({ error: 'Site not found' }, { status: 404 });
      }
      // Ownership is enforced by saveSiteDraft before anything is
      // written; the merged manifest is never returned to the caller.
      manifest = {
        ...(((row as { ai_manifest?: Record<string, unknown> | null }).ai_manifest) ?? {}),
        ...manifestPatch,
      };
    }

    // CREATE intent (wizard) — never land on a taken slug. Autosave
    // callers omit the flag and keep upsert-by-subdomain semantics.
    // The final subdomain is returned in the response so the wizard
    // can route to the editor it actually created.
    let subdomain = requestedSubdomain;
    if (body.create === true) {
      const createDb = getSupabase();
      if (createDb) {
        subdomain = await findAvailableSubdomain(createDb, requestedSubdomain);
        if (subdomain !== requestedSubdomain) {
          console.log(`[api/sites] create: '${requestedSubdomain}' taken — using '${subdomain}'`);
        }
      }
    }

    // Plan gate — maxSites from PLAN_LIMITS (@/lib/plan-gate). Only
    // CREATES (no existing row for this subdomain) are gated: this
    // route is also the editor autosave + unload sendBeacon target,
    // so updates must NEVER be blocked. Fails OPEN whenever Supabase
    // is unconfigured or any gate query errors — a save is never
    // lost to the gate itself.
    //
    // GRIEF EXEMPTION (the published "grief deserves no paywall"
    // promise, enforced): a memorial/funeral create is NEVER gated,
    // and existing memorial/funeral sites never count against the
    // slot limit — hosting a memorial can't paywall a celebration.
    try {
      const newOccasion = (manifest?.occasion as string | undefined) ?? null;
      const gateDb = getSupabase();
      if (gateDb && !isGriefExempt(newOccasion)) {
        const sessionEmail = session.user.email.toLowerCase().trim();
        const { data: existingRow, error: existsError } = await gateDb
          .from('sites')
          .select('id')
          .eq('subdomain', subdomain)
          .maybeSingle();
        if (!existsError && !existingRow) {
          // CREATE path — count this user's NON-grief-exempt sites.
          // Two fixes over the previous version:
          //   1. Filter on the INDEXED top-level `creator_email`
          //      column (idx_sites_creator_email), matching the GET
          //      list, instead of the un-indexed
          //      site_config->>creator_email JSONB path.
          //   2. Extract ONLY the occasion strings server-side
          //      (occasion lives on the manifest, with site_config as
          //      the legacy fallback — same read order as the GET
          //      list) rather than pulling up to 500 full
          //      manifest/site_config blobs to count in JS. The
          //      previous query also selected a non-existent `manifest`
          //      column (the table column is `ai_manifest`), so every
          //      count errored and the gate silently failed open.
          // Grief exemption can't be expressed cleanly in one PostgREST
          // filter (COALESCE across two JSON paths + NULL semantics),
          // so it stays a JS filter over the tiny occasion projection —
          // correct, and still blob-free.
          const { plan, limits } = await getPlanWithLimitsForEmail(sessionEmail);
          const { data: ownedRows, error: countError } = await gateDb
            .from('sites')
            .select('occasion:ai_manifest->>occasion, configOccasion:site_config->>occasion')
            .eq('creator_email', sessionEmail);
          const count = countError || !ownedRows
            ? null
            : ownedRows.filter((r: { occasion?: string | null; configOccasion?: string | null }) =>
                !isGriefExempt(r.occasion ?? r.configOccasion)).length;
          if (typeof count === 'number'
            && Number.isFinite(limits.maxSites) && count >= limits.maxSites) {
            return NextResponse.json(
              planLimitResponseBody('sites', limits.maxSites, plan),
              { status: 402 },
            );
          }
        }
      }
    } catch (gateErr) {
      console.warn('[api/sites] plan gate check failed (failing open):', gateErr);
    }

    // ── Pack paywall — try-before-you-buy's other half ─────────
    // Unowned paid packs may be WORN on drafts (the editor applies
    // them freely); the PUBLISH transition is the gate. Fires only
    // when the incoming manifest says published && wears a paid
    // pack the host doesn't own && the existing row isn't already
    // published — so autosaves are never blocked and a save is
    // never lost. Fails OPEN on lookup errors (publishing is never
    // lost to a flaky gate query; the client gate still stands).
    try {
      const packId = (manifest?.appliedPackId as string | undefined) ?? null;
      if (packId && Boolean(manifest?.published)) {
        const { getPackById } = await import('@/lib/theme-store/packs');
        const pack = getPackById(packId);
        if (pack && pack.priceCents > 0) {
          const gateDb = getSupabase();
          const { data: existingRow } = gateDb
            ? await gateDb.from('sites').select('ai_manifest').eq('subdomain', subdomain).maybeSingle()
            : { data: null };
          const alreadyPublished = Boolean((existingRow?.ai_manifest as { published?: boolean } | null)?.published);
          if (!alreadyPublished) {
            const { userOwnsPack } = await import('@/lib/theme-store/entitlements');
            const owns = await userOwnsPack(session.user.email, packId);
            if (!owns) {
              return NextResponse.json({
                error: `This site is wearing ${pack.name}. Unlock it to publish, or switch to a free look in the Theme panel.`,
                packGate: { id: pack.id, name: pack.name, priceCents: pack.priceCents },
              }, { status: 402 });
            }
          }
        }
      }
    } catch (packGateErr) {
      console.warn('[api/sites] pack gate check failed (failing open):', packGateErr);
    }

    // If the manifest carries a templateId, layer the rich template
    // (motifs, blockOrder, hiddenBlocks, theme fallback, poetry fallback)
    // so quick-start wizards get the signature feel, not just a palette.
    const templateId = typeof (manifest as { templateId?: unknown }).templateId === 'string'
      ? (manifest as { templateId: string }).templateId
      : null;
    if (templateId) {
      const { applyTemplateToManifest } = await import('@/lib/templates/apply-template');
      Object.assign(manifest, applyTemplateToManifest(manifest, templateId));
    }

    // Mirror every photo field (chapter images, coverPhoto,
    // heroSlideshow) to permanent storage so nothing in the saved
    // draft points at an expiring Google Picker baseUrl. Also
    // transparently unwraps any `/api/photos/proxy?url=…` wrappers
    // that were kept during the editing session. Failures fall back
    // to the stripped URL — never block the save.
    let manifestToSave = manifest;
    if (session.accessToken) {
      try {
        manifestToSave = await mirrorManifestPhotos(
          manifest,
          session.accessToken as string,
          subdomain,
        );
      } catch (err) {
        console.warn('[api/sites] Draft photo mirror failed (non-fatal):', err);
        manifestToSave = stripProxyUrls(manifest);
      }
    } else {
      // No OAuth session — still unwrap proxy wrappers so the DB
      // never holds a pointer at the editing session's ephemeral
      // photo proxy.
      manifestToSave = stripProxyUrls(manifest);
    }

    // Co-host editors save ON BEHALF OF the owner — resolve the
    // caller's role and substitute the owner's email so
    // saveSiteDraft's ownership check passes without ever
    // reassigning creator_email. Viewers / guest-managers /
    // strangers fall through with their own email and get the
    // ownership rejection, exactly as before.
    let actingAs = session.user.email;
    try {
      const roleDb = getSupabase();
      if (roleDb) {
        const { resolveViewerRole } = await import('@/lib/cohost-access');
        const access = await resolveViewerRole(roleDb, { subdomain }, session.user.email);
        if (access.role === 'editor' && access.ownerEmail) {
          actingAs = access.ownerEmail;
        }
      }
    } catch (roleErr) {
      console.warn('[api/sites] co-host role check failed (saving as caller):', roleErr);
    }

    const result = await saveSiteDraft(
      actingAs,
      subdomain,
      manifestToSave,
      names || ['', '']
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    // Activation instrumentation (Pillar 20). A genuine CREATE
    // (wizard finish, create:true) is the funnel's site_created
    // moment — autosave / unload-beacon UPDATES to this same route
    // are not. Fire-and-forget; never blocks or fails the save.
    if (body.create === true) {
      void recordProductEvent('site_created', {
        email: session.user.email,
        siteId: subdomain,
        props: { occasion: (manifest as { occasion?: string } | null)?.occasion ?? null },
      });
    }

    // `subdomain` may differ from the requested one on a create —
    // callers route to the editor with the returned value.
    return NextResponse.json({ success: true, subdomain }, { status: 201 });
  } catch (error) {
    console.error('Error saving site draft:', error);
    return NextResponse.json({ error: 'Failed to save site' }, { status: 500 });
  }
}
