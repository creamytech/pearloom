// ─────────────────────────────────────────────────────────────
// Pearloom / lib/print-engine/fulfill.ts
//
// Per-recipient Lob submission, extracted from /api/print/orders.
//
// fulfillPrintIntent(intent) runs ONLY after payment is settled —
// either the Stripe webhook marked the intent 'paid', or the
// checkout route covered the full total from legacy print credit.
// It loads the guest rows frozen on the intent, inserts one
// print_jobs row per recipient, submits each to Lob, then flips
// the intent to 'fulfilled' (≥1 card submitted) or 'failed'
// (every submission failed, with detail).
//
// print_jobs.cost_cents records the RETAIL per-card price the
// host paid (pricing.ts), so dashboard batch totals show what was
// charged, not Lob's wholesale invoice.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { createPostcard, type LobAddress } from './lob-client';
import {
  retailPrintUnitCents,
  type PrintProduct,
  type PostcardSize,
} from './pricing';

export interface PrintOrderIntent {
  id: string;
  user_email: string;
  site_id: string | null;
  kind: string | null;
  product: string | null;
  size: string | null;
  front_url: string | null;
  guest_ids: string[] | null;
  return_address: LobAddress | null;
  recipient_count: number | null;
  retail_total_cents: number | null;
  credit_applied_cents: number | null;
  amount_due_cents: number | null;
  stripe_session_id: string | null;
  status: string;
}

export interface FulfillResult {
  ok: boolean;
  submitted: number;
  failed: number;
  detail?: string;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

type GuestRow = {
  id: string;
  name: string | null;
  mailing_address_line1: string | null;
  mailing_address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
};

async function markIntent(
  sb: NonNullable<ReturnType<typeof getServiceClient>>,
  intentId: string,
  status: 'fulfilled' | 'failed',
  detail?: string,
) {
  const { error } = await sb
    .from('print_order_intents')
    .update({
      status,
      status_detail: detail ?? null,
      ...(status === 'fulfilled' ? { fulfilled_at: new Date().toISOString() } : {}),
    })
    .eq('id', intentId);
  if (error) {
    console.error(`[print] could not mark intent ${intentId} ${status}:`, error.message);
  }
}

/**
 * Submit every recipient on a PAID print intent to Lob.
 * Never throws for per-recipient failures — those land as
 * 'failed' print_jobs rows; the intent only goes 'failed' when
 * NOT A SINGLE card made it out.
 */
export async function fulfillPrintIntent(intent: PrintOrderIntent): Promise<FulfillResult> {
  const sb = getServiceClient();
  if (!sb) {
    console.error('[print] fulfillment skipped — Supabase env missing for intent', intent.id);
    return { ok: false, submitted: 0, failed: 0, detail: 'Supabase not configured' };
  }
  if (!intent.site_id || !intent.front_url || !intent.return_address?.address_line1) {
    const detail = 'Intent is missing site, artwork, or return address.';
    console.error(`[print] intent ${intent.id} unfulfillable:`, detail);
    await markIntent(sb, intent.id, 'failed', detail);
    return { ok: false, submitted: 0, failed: 0, detail };
  }

  const product = (intent.product ?? 'postcard') as PrintProduct;
  const size = (intent.size ?? '4x6') as PostcardSize;
  const kind = intent.kind ?? 'invitation';
  const perCardCents = retailPrintUnitCents(product, size);
  const batchId = intent.id;
  const ownerEmail = intent.user_email.toLowerCase().trim();

  // ── Load the frozen recipient set ──
  let q = sb
    .from('guests')
    .select('id, name, mailing_address_line1, mailing_address_line2, city, state, postal_code, country')
    .eq('site_id', intent.site_id)
    .not('mailing_address_line1', 'is', null);
  if (Array.isArray(intent.guest_ids) && intent.guest_ids.length > 0) {
    q = q.in('id', intent.guest_ids);
  }
  const { data: guests, error: guestErr } = await q;
  if (guestErr) {
    const detail = `Guest lookup failed: ${guestErr.message}`;
    console.error(`[print] intent ${intent.id}:`, detail);
    await markIntent(sb, intent.id, 'failed', detail);
    return { ok: false, submitted: 0, failed: 0, detail };
  }
  const recipients = (guests ?? []) as GuestRow[];
  if (recipients.length === 0) {
    const detail = 'No recipients with mailing addresses remained at fulfillment time.';
    console.error(`[print] intent ${intent.id}:`, detail);
    await markIntent(sb, intent.id, 'failed', detail);
    return { ok: false, submitted: 0, failed: 0, detail };
  }

  // ── Submit each card ──
  let submitted = 0;
  let failed = 0;
  let lastFailureDetail = '';

  for (const g of recipients) {
    if (!g.mailing_address_line1 || !g.city || !g.state || !g.postal_code) {
      failed += 1;
      lastFailureDetail = 'Incomplete mailing address.';
      continue;
    }
    const recipientAddress: LobAddress = {
      name: g.name || 'Guest',
      address_line1: g.mailing_address_line1,
      address_line2: g.mailing_address_line2 || undefined,
      address_city: g.city,
      address_state: g.state,
      address_zip: g.postal_code,
      address_country: g.country || 'US',
    };
    // Insert a row first so even Lob failures are tracked.
    const { data: row, error: rowErr } = await sb
      .from('print_jobs')
      .insert({
        site_id: intent.site_id,
        owner_email: ownerEmail,
        batch_id: batchId,
        product,
        kind,
        size,
        front_url: intent.front_url,
        guest_id: g.id,
        recipient_name: g.name,
        recipient_address: recipientAddress,
        provider: 'lob',
        status: 'pending',
        cost_cents: perCardCents,
      })
      .select('id')
      .single();
    if (rowErr || !row) {
      console.error(`[print] intent ${intent.id} print_jobs insert failed:`, rowErr?.message);
      failed += 1;
      lastFailureDetail = rowErr?.message ?? 'print_jobs insert failed';
      continue;
    }
    // Submit to Lob.
    const lobResult = await createPostcard({
      description: `Pearloom · ${kind}`,
      to: recipientAddress,
      from: intent.return_address,
      front: intent.front_url,
      size,
      metadata: {
        siteSlug: intent.site_id,
        kind,
        printJobId: row.id,
        batchId,
        printIntentId: intent.id,
      },
    });
    if (lobResult.ok) {
      await sb.from('print_jobs').update({
        provider_job_id: lobResult.data.id,
        status: 'submitted',
        tracking_number: lobResult.data.tracking_number ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', row.id);
      submitted += 1;
    } else {
      const detail = lobResult.reason === 'http-error'
        ? `Lob ${lobResult.status}: ${lobResult.message.slice(0, 240)}`
        : lobResult.message;
      console.error(`[print] intent ${intent.id} Lob submission failed for guest ${g.id}:`, detail);
      await sb.from('print_jobs').update({
        status: 'failed',
        status_detail: detail,
        updated_at: new Date().toISOString(),
      }).eq('id', row.id);
      failed += 1;
      lastFailureDetail = detail;
    }
  }

  if (submitted > 0) {
    await markIntent(sb, intent.id, 'fulfilled');
    console.log(`[print] intent ${intent.id} fulfilled — ${submitted} submitted, ${failed} failed`);
    return { ok: true, submitted, failed };
  }

  const detail = `Every submission failed (${failed}). Last error: ${lastFailureDetail || 'unknown'}`;
  await markIntent(sb, intent.id, 'failed', detail);
  return { ok: false, submitted, failed, detail };
}
