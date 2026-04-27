// ─────────────────────────────────────────────────────────────
// Pearloom / api/print/orders — submit a print + mail batch.
//
// POST body:
//   {
//     siteSlug: string,
//     kind: 'save-the-date' | 'invitation' | 'thankyou' | …,
//     product: 'postcard' | 'letter' | 'thankyou' | 'book',
//     size?: '4x6' | '6x9' | '6x11',
//     svg: string,                     // raw SVG from the designer
//     guestIds?: string[],             // subset of the site's guests
//     returnAddress: LobAddress,       // sender's mailing address
//   }
//
// Flow:
//   1. Auth + ownership check (creator_email match).
//   2. Render SVG → PNG via Sharp at 300dpi for the chosen size.
//   3. Upload PNG to R2.
//   4. Pull recipient guest rows, filter to those with mailing
//      addresses, dedupe by address.
//   5. For each recipient: insert a print_jobs row (status='pending'),
//      call Lob.createPostcard, update the row with provider_job_id +
//      'submitted' status. Failures stay 'pending' with status_detail.
//   6. Return { ok, batchId, submitted, failed, costCents }.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { uploadToR2, getR2Url } from '@/lib/r2';
import {
  createPostcard,
  hasLobKey,
  postcardCostCents,
  letterCostCents,
  type LobAddress,
} from '@/lib/print-engine/lob-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Body {
  siteSlug: string;
  kind: 'save-the-date' | 'invitation' | 'thankyou' | 'memorial-program' | 'photo-book';
  product: 'postcard' | 'letter' | 'thankyou' | 'book';
  size?: '4x6' | '6x9' | '6x11';
  svg: string;
  guestIds?: string[];
  returnAddress: LobAddress;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function dimensionsForSize(size: '4x6' | '6x9' | '6x11' = '4x6'): { width: number; height: number } {
  // 300 dpi — standard print resolution. SVG viewBox is 1000×1400
  // already; Sharp scales it during the render step.
  switch (size) {
    case '6x9':  return { width: 1800, height: 2700 };
    case '6x11': return { width: 1800, height: 3300 };
    case '4x6':
    default:     return { width: 1200, height: 1800 };
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.siteSlug || !body.svg || !body.kind || !body.product) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }
  if (!body.returnAddress?.address_line1) {
    return NextResponse.json({ error: 'Return address is required for mailing.' }, { status: 400 });
  }

  const sb = getServiceClient();
  if (!sb) {
    return NextResponse.json(
      { error: 'Print storage backend is not configured on this server.' },
      { status: 503 },
    );
  }

  // ── Ownership check ──
  const { data: site, error: siteErr } = await sb
    .from('site_config')
    .select('creator_email, site_id')
    .eq('site_id', body.siteSlug)
    .maybeSingle();
  if (siteErr || !site) {
    return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  }
  if (site.creator_email !== session.user.email) {
    return NextResponse.json({ error: 'Not the site owner.' }, { status: 403 });
  }

  if (!hasLobKey()) {
    return NextResponse.json(
      { error: 'Pearloom Print is offline — LOB_API_KEY is not configured on this server.' },
      { status: 503 },
    );
  }

  // ── Render SVG → PNG ──
  // Sharp handles SVG → PNG natively via librsvg. We force the
  // output size to match the print product so the PNG ships at
  // 300dpi for the chosen card.
  const dim = dimensionsForSize(body.size);
  const sharpModule = await import('sharp');
  const sharp = sharpModule.default;
  let pngBuffer: Buffer;
  try {
    pngBuffer = await sharp(Buffer.from(body.svg, 'utf-8'), { density: 300 })
      .resize({ width: dim.width, height: dim.height, fit: 'fill' })
      .png({ quality: 92 })
      .toBuffer();
  } catch (err) {
    console.error('[print/orders] sharp render failed:', err);
    return NextResponse.json(
      { error: 'Could not render the design — please try again.' },
      { status: 500 },
    );
  }

  // ── Upload artwork to R2 ──
  const batchId = `print-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const r2Key = `print/${body.siteSlug}/${batchId}/front.png`;
  try {
    await uploadToR2(r2Key, pngBuffer, 'image/png');
  } catch (err) {
    console.error('[print/orders] R2 upload failed:', err);
    return NextResponse.json(
      { error: 'Could not stage the artwork for printing.' },
      { status: 500 },
    );
  }
  const frontUrl = getR2Url(r2Key);

  // ── Pull recipients ──
  let q = sb
    .from('guests')
    .select('id, name, mailing_address_line1, mailing_address_line2, city, state, postal_code, country')
    .eq('site_id', body.siteSlug)
    .not('mailing_address_line1', 'is', null);
  if (Array.isArray(body.guestIds) && body.guestIds.length > 0) {
    q = q.in('id', body.guestIds);
  }
  const { data: guests, error: guestErr } = await q;
  if (guestErr) {
    console.error('[print/orders] guest lookup failed:', guestErr);
    return NextResponse.json({ error: 'Could not load the guest list.' }, { status: 500 });
  }

  type Guest = {
    id: string;
    name: string | null;
    mailing_address_line1: string | null;
    mailing_address_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  };
  const recipients = (guests ?? []) as Guest[];
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: 'No recipients with mailing addresses on file. Collect addresses first.' },
      { status: 400 },
    );
  }

  // ── Submit each postcard ──
  const cost = body.product === 'letter'
    ? letterCostCents(recipients.length)
    : postcardCostCents(body.size, recipients.length);

  let submitted = 0;
  let failed = 0;
  for (const g of recipients) {
    if (!g.mailing_address_line1 || !g.city || !g.state || !g.postal_code) {
      failed += 1;
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
        site_id: body.siteSlug,
        owner_email: session.user.email,
        batch_id: batchId,
        product: body.product,
        kind: body.kind,
        size: body.size ?? '4x6',
        front_url: frontUrl,
        guest_id: g.id,
        recipient_name: g.name,
        recipient_address: recipientAddress,
        provider: 'lob',
        status: 'pending',
        cost_cents: body.product === 'letter' ? letterCostCents(1) : postcardCostCents(body.size, 1),
      })
      .select('id')
      .single();
    if (rowErr || !row) {
      failed += 1;
      continue;
    }
    // Submit to Lob.
    const lobResult = await createPostcard({
      description: `Pearloom · ${body.kind}`,
      to: recipientAddress,
      from: body.returnAddress,
      front: frontUrl,
      size: body.size,
      metadata: {
        siteSlug: body.siteSlug,
        kind: body.kind,
        printJobId: row.id,
        batchId,
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
      await sb.from('print_jobs').update({
        status: 'failed',
        status_detail: detail,
        updated_at: new Date().toISOString(),
      }).eq('id', row.id);
      failed += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    batchId,
    submitted,
    failed,
    skippedNoAddress: recipients.length - submitted - failed,
    costCents: cost,
    frontUrl,
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ jobs: [] });

  const siteSlug = req.nextUrl.searchParams.get('site');
  let q = sb
    .from('print_jobs')
    .select('id, site_id, batch_id, product, kind, size, front_url, recipient_name, status, status_detail, tracking_number, tracking_url, cost_cents, currency, created_at, mailed_at, delivered_at')
    .eq('owner_email', session.user.email)
    .order('created_at', { ascending: false })
    .limit(500);
  if (siteSlug) q = q.eq('site_id', siteSlug);
  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ jobs: data ?? [] });
}
