// ─────────────────────────────────────────────────────────────
// Pearloom / lib/analytics/product-events.ts
//
// The activation event spine (GRAND-PLAN Pillar 20). A lightweight
// first-party telemetry write to public.product_events so the host
// funnel is finally measurable — signup → welcome → site → publish
// → first RSVP. Before this the host funnel was entirely unmeasured.
//
// CONTRACT — recordProductEvent is FIRE-AND-FORGET and fully
// failure-tolerant. A telemetry write must NEVER block or throw into
// a request path: every failure (missing env, DB blip, a migration
// not yet applied) is swallowed and the function returns void.
// Callers `void recordProductEvent(...)` and move on.
//
// Writes use the service-role client — product_events is deny-anon,
// service-role-only (see supabase/migrations/20260706_product_events.sql).
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

/**
 * Canonical server-side funnel events. Client beacons
 * (wizard_started, wizard_step, welcome_started, …) POST arbitrary
 * names through /api/events; this union documents the ones the
 * server fires at real product moments.
 */
export type ProductEventName =
  | 'signed_up'
  | 'welcome_completed'
  | 'site_created'
  | 'site_published'
  | 'first_rsvp_received'
  | 'keepsake_generated';

interface RecordOptions {
  email?: string | null;
  siteId?: string | null;
  props?: Record<string, unknown> | null;
}

function analyticsClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Record a product/funnel event. Fire-and-forget: awaiting it is
 * optional and it never throws. Accepts the canonical server event
 * names OR any string (client beacons forwarded from /api/events).
 */
export async function recordProductEvent(
  event: ProductEventName | string,
  opts: RecordOptions = {},
): Promise<void> {
  try {
    const name = String(event ?? '').trim().slice(0, 80);
    if (!name) return;
    const supabase = analyticsClient();
    if (!supabase) return; // Supabase unconfigured — telemetry is optional.

    const email = opts.email ? String(opts.email).toLowerCase().trim().slice(0, 320) : null;
    const siteId = opts.siteId ? String(opts.siteId).slice(0, 200) : null;

    await supabase.from('product_events').insert({
      event: name,
      email,
      site_id: siteId,
      props: opts.props ?? null,
    });
  } catch (err) {
    // A telemetry write must never surface into a request path.
    console.warn(
      '[product-events] record failed (non-fatal):',
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Record an event AT MOST ONCE for a site.
 *
 * Milestone events ("their first RSVP arrived", "they made their
 * keepsake") are fired from routes that run many times — a GET a
 * host reloads, a reply every guest sends. Counting each one would
 * turn a funnel step into a traffic metric.
 *
 * Extracted from the inline version in /api/rsvp so the second
 * caller didn't copy it. Same contract as recordProductEvent:
 * fire-and-forget, never throws, telemetry never affects a reply.
 * On any read failure it stays SILENT rather than recording — a
 * missed milestone is a smaller lie than a duplicated one.
 */
export async function recordProductEventOnce(
  event: ProductEventName | string,
  opts: RecordOptions & { siteId: string },
): Promise<void> {
  try {
    const supabase = analyticsClient();
    if (!supabase || !opts.siteId) return;
    const { data, error } = await supabase
      .from('product_events')
      .select('id')
      .eq('event', String(event))
      .eq('site_id', opts.siteId)
      .limit(1);
    if (error || (data && data.length > 0)) return;
    await recordProductEvent(event, opts);
  } catch {
    /* telemetry only */
  }
}
