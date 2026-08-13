// ──────────────────────────────────────────────────────────────
// POST /api/registry-items/[id]/claim
//
// Public endpoint. A guest clicks "I'll get this" on a registry
// item. Two paths:
//
//   PAY (Stripe configured, default):
//     1. Validate the item exists, is native (source_id null), has
//        remaining quantity, and the requested quantity fits.
//     2. Build a Stripe Checkout Session for amount = price * qty.
//     3. Return { url } so the client can redirect.
//     The webhook is what marks the item claimed and inserts the
//     payment row — NOT this endpoint. Until the webhook fires the
//     item stays 'unpaid'.
//
//   RESERVE (no Stripe key, or explicit body.mode === 'reserve'):
//     The launch-mode flow — no payment at all. The guest leaves
//     their name (+ optional note / email); we atomically bump
//     quantity_claimed with an optimistic-concurrency guard, stamp
//     the claimant on the item, record a ledger row in
//     registry_item_claims (payment_id null = reservation), and
//     return { reserved: true, buyUrl } where buyUrl is the item's
//     external product link if it has one. Hosts undo mistakes by
//     editing the item in the panel — there's no guest unreserve.
//
// Anti-abuse: 6 claim-attempts per IP per hour.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasStripe } from '@/lib/stripe/client';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getAppOrigin } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Postgres check-constraint violation (23514). Older databases
 *  carry a payment_status CHECK without 'reserved' — we retry the
 *  reservation without touching payment_status when we hit it. */
function isCheckViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === '23514' || /check constraint/i.test(e?.message ?? '');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const ip = getClientIp(request);
    const limit = checkRateLimit(`registry-claim:${ip}`, { max: 6, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many claims. Try again in a few minutes.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const {
      payerEmail,
      payerName,
      quantity = 1,
      message = '',
      mode,
    } = (body || {}) as {
      payerEmail?: string;
      payerName?: string;
      quantity?: number;
      message?: string;
      mode?: string;
    };

    /* Reserve-and-link when Stripe isn't configured (launch mode),
       or when the caller explicitly asks for it. */
    const reserveMode = mode === 'reserve' || !hasStripe();

    if (reserveMode) {
      if (!payerName || typeof payerName !== 'string' || !payerName.trim()) {
        return NextResponse.json({ error: 'payerName is required' }, { status: 400 });
      }
    } else if (!payerEmail || typeof payerEmail !== 'string') {
      return NextResponse.json({ error: 'payerEmail is required' }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return NextResponse.json({ error: 'quantity must be 1–99' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    const { data: item, error: itemError } = await supabase
      .from('registry_items')
      .select('id, site_id, source_id, name, description, price, image_url, item_url, quantity, quantity_claimed, purchased')
      .eq('id', id)
      .maybeSingle();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if (item.source_id) {
      return NextResponse.json(
        { error: 'This item is hosted on an external store. Use its link instead.' },
        { status: 400 },
      );
    }
    const totalQty = (item.quantity as number) || 1;
    const claimedQty = (item.quantity_claimed as number) || 0;
    if (claimedQty + quantity > totalQty) {
      return NextResponse.json(
        { error: `Only ${totalQty - claimedQty} left to claim.` },
        { status: 409 },
      );
    }
    const price = Number(item.price);

    // ── Reserve path — no payment, just a promise. ──────────────
    if (reserveMode) {
      const nowIso = new Date().toISOString();
      const trimmedName = String(payerName).trim().slice(0, 120);
      const trimmedNote = (typeof message === 'string' ? message : '').trim().slice(0, 500) || null;
      const trimmedEmail = (typeof payerEmail === 'string' ? payerEmail : '').trim().slice(0, 200) || null;
      const newClaimed = claimedQty + quantity;

      const reserveFields = {
        quantity_claimed: newClaimed,
        purchased: newClaimed >= totalQty,
        claimed_by_email: trimmedEmail,
        claimed_by_name: trimmedName,
        claimed_at: nowIso,
        claim_note: trimmedNote,
        updated_at: nowIso,
      };

      /* Atomic over-claim guard: the update only lands if
         quantity_claimed is still what we read above. A racing
         reservation changes it, the filter matches zero rows, and
         we 409 instead of over-claiming — same remaining-quantity
         contract the Stripe path validates. */
      let { data: bumped, error: bumpError } = await supabase
        .from('registry_items')
        .update({ ...reserveFields, payment_status: 'reserved' })
        .eq('id', item.id)
        .eq('quantity_claimed', claimedQty)
        .select('id');

      if (bumpError && isCheckViolation(bumpError)) {
        /* Legacy payment_status CHECK without 'reserved' — the
           reservation is still fully represented by the claimed_*
           stamps + the ledger row below. */
        ({ data: bumped, error: bumpError } = await supabase
          .from('registry_items')
          .update(reserveFields)
          .eq('id', item.id)
          .eq('quantity_claimed', claimedQty)
          .select('id'));
      }

      if (bumpError) {
        console.error('[api/registry-items/claim] reserve bump failed:', bumpError.message);
        return NextResponse.json({ error: 'Could not reserve. Try again.' }, { status: 500 });
      }
      if (!bumped || bumped.length === 0) {
        return NextResponse.json(
          { error: 'Someone just spoke for this. Refresh to see what’s left.' },
          { status: 409 },
        );
      }

      /* Ledger row — payment_id null marks it a reservation (vs the
         webhook's 'paid' rows). Best-effort: the item-level stamps
         above already carry the reservation if this insert fails. */
      const { error: claimError } = await supabase
        .from('registry_item_claims')
        .insert({
          registry_item_id: item.id,
          site_id: item.site_id,
          payer_email: trimmedEmail ?? '',
          payer_name: trimmedName,
          quantity,
          amount_cents: Number.isFinite(price) && price > 0 ? Math.round(price * quantity * 100) : 0,
          payment_id: null,
          status: 'pending',
          message: trimmedNote,
        });
      if (claimError) {
        console.warn('[api/registry-items/claim] reserve ledger insert failed:', claimError.message);
      }

      /* The gift moment reaches people (email audit 2026-07-08):
         the host hears a gift was spoken for; the giver gets a
         thank-you when they left an email. Fire-and-forget — the
         reservation never waits on mail. */
      void (async () => {
        try {
          const { data: siteRow } = await supabase
            .from('sites')
            .select('id, subdomain, occasion, creator_email, site_config')
            .eq('id', item.site_id as string)
            .maybeSingle();
          const cfg = (siteRow as { site_config?: { creator_email?: string; names?: string[] } } | null)?.site_config;
          const ownerEmail = String((siteRow as { creator_email?: string } | null)?.creator_email ?? cfg?.creator_email ?? '');
          const names = (cfg?.names ?? []).filter(Boolean);
          const siteLabel = names.length >= 2 ? `${names[0]} & ${names[1]}` : ((siteRow as { subdomain?: string } | null)?.subdomain ?? 'your site');
          const who = trimmedName.split(/\s+/)[0] || 'A guest';
          if (ownerEmail && siteRow) {
            const { notifyHost } = await import('@/lib/notifications/notify');
            await notifyHost(supabase, {
              siteId: (siteRow as { id: string }).id,
              siteLabel,
              ownerEmail,
              category: 'gifts',
              title: `${who} reserved ${String(item.name ?? 'a registry gift')}`,
              body: trimmedNote ?? undefined,
              href: '/dashboard/registry',
              dedupeKey: `reserve:${item.id}:${nowIso}`,
            });
          }
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey && trimmedEmail && siteRow) {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
            const fromEmail = process.env.EMAIL_FROM || 'Pearloom <noreply@pearloom.com>';
            const { buildSiteUrl } = await import('@/lib/site-urls');
            const siteUrl = buildSiteUrl(
              (siteRow as { subdomain?: string }).subdomain ?? '',
              '', baseUrl,
              (siteRow as { occasion?: string }).occasion,
            );
            const { buildRegistryClaimThankYouEmail } = await import('@/lib/email/brand-emails');
            const { subject, html } = buildRegistryClaimThankYouEmail({
              guestName: trimmedName,
              coupleDisplay: siteLabel,
              itemName: String(item.name ?? '') || null,
              siteUrl,
            });
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ from: fromEmail, to: [trimmedEmail], subject, html }),
            }).catch((e) => console.warn('[registry-items/claim] thank-you email failed (non-fatal):', e));
          }
        } catch (err) {
          console.warn('[registry-items/claim] notify failed (non-fatal):', err);
        }
      })();

      return NextResponse.json({
        reserved: true,
        buyUrl: (item.item_url as string) || null,
      });
    }

    // ── Stripe path — unchanged checkout flow. ──────────────────
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Item price not set' }, { status: 400 });
    }
    const amountCents = Math.round(price * quantity * 100);

    const origin = getAppOrigin();
    const successUrl = `${origin}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/sites/${item.site_id}/registry?cancelled=1`;

    const session = await createCheckoutSession({
      productName: item.name as string,
      productImage: (item.image_url as string) || undefined,
      amountCents,
      currency: 'usd',
      successUrl,
      cancelUrl,
      customerEmail: payerEmail as string,
      metadata: {
        siteId: item.site_id as string,
        paymentType: 'registry',
        registryItemId: item.id as string,
        message,
        payerName,
        quantity: String(quantity),
      },
    });

    // Mark item as 'pending' so the UI shows it's being purchased.
    // The webhook will flip it to 'paid' on success or back to
    // 'unpaid' if it never completes.
    await supabase
      .from('registry_items')
      .update({ payment_status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', item.id);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[api/registry-items/claim] error:', err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
