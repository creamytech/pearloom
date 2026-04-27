'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { DashEmpty } from '@/components/pearloom/dash/DashEmpty';

interface PrintJob {
  id: string;
  site_id: string;
  batch_id: string;
  product: string;
  kind: string;
  size: string | null;
  front_url: string;
  recipient_name: string | null;
  status: string;
  status_detail: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  cost_cents: number | null;
  currency: string | null;
  created_at: string;
  mailed_at: string | null;
  delivered_at: string | null;
}

interface Batch {
  batchId: string;
  siteSlug: string;
  product: string;
  kind: string;
  frontUrl: string;
  createdAt: string;
  jobs: PrintJob[];
  costCents: number;
  statusCounts: Record<string, number>;
}

const STATUS_TONE: Record<string, string> = {
  pending: '#A14A2C',
  submitted: '#5C6B3F',
  rendered: '#5C6B3F',
  mailed: '#5C6B3F',
  delivered: '#3D4A1F',
  failed: '#7A2D2D',
  cancelled: '#7A2D2D',
};

export function PrintOrdersClient({ siteFilter }: { siteFilter: string | null }) {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = siteFilter ? `/api/print/orders?site=${encodeURIComponent(siteFilter)}` : '/api/print/orders';
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'Could not load print orders.');
        setJobs(data.jobs ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [siteFilter]);

  const batches = useMemo<Batch[]>(() => {
    const byBatch = new Map<string, Batch>();
    for (const j of jobs) {
      let b = byBatch.get(j.batch_id);
      if (!b) {
        b = {
          batchId: j.batch_id,
          siteSlug: j.site_id,
          product: j.product,
          kind: j.kind,
          frontUrl: j.front_url,
          createdAt: j.created_at,
          jobs: [],
          costCents: 0,
          statusCounts: {},
        };
        byBatch.set(j.batch_id, b);
      }
      b.jobs.push(j);
      b.costCents += j.cost_cents ?? 0;
      b.statusCounts[j.status] = (b.statusCounts[j.status] ?? 0) + 1;
    }
    return Array.from(byBatch.values()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [jobs]);

  return (
    <DashLayout active="sites">
      <div className="pl8-dash-page-enter" style={{ padding: 'clamp(20px, 3vw, 32px)', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 6 }}>
            Pearloom Print
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 3vw, 36px)', margin: 0 }}>
            Print orders
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>
            Every postcard, invitation, and thank-you card sent through Pearloom Print, with delivery tracking.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-muted)' }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 14, background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', borderRadius: 12 }}>{error}</div>
        ) : batches.length === 0 ? (
          <DashEmpty
            size="page"
            eyebrow="Pearloom Print"
            title="Nothing in the mail yet"
            body="When you send save-the-dates or invites through the designer, every postcard shows up here with delivery tracking."
            actions={[{ label: 'Open the invite designer', href: '/dashboard/event' }]}
          />
        ) : (
          <div className="pl8-dash-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {batches.map((b) => (
              <BatchCard key={b.batchId} batch={b} />
            ))}
          </div>
        )}
      </div>
    </DashLayout>
  );
}

function BatchCard({ batch }: { batch: Batch }) {
  const [open, setOpen] = useState(false);
  const total = batch.jobs.length;
  const submitted = batch.statusCounts.submitted ?? 0;
  const mailed = batch.statusCounts.mailed ?? 0;
  const delivered = batch.statusCounts.delivered ?? 0;
  const failed = batch.statusCounts.failed ?? 0;
  const inFlight = total - delivered - failed;

  return (
    <div
      className="pl8-card-lift"
      style={{
        background: 'var(--cream-2, #FBF7EE)',
        borderRadius: 16,
        border: '1px solid var(--line-soft, rgba(14,13,11,0.06))',
        padding: 18,
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={batch.frontUrl}
          alt=""
          style={{
            width: 84,
            height: 120,
            objectFit: 'cover',
            borderRadius: 6,
            flexShrink: 0,
            border: '1px solid var(--line)',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 4 }}>
            {batch.kind.replace(/-/g, ' ')} · {batch.product}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
            {batch.siteSlug} · {total} {total === 1 ? 'card' : 'cards'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 10 }}>
            Sent {new Date(batch.createdAt).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Pill label={`${delivered} delivered`} tone={STATUS_TONE.delivered} />
            <Pill label={`${mailed} mailed`} tone={STATUS_TONE.mailed} />
            <Pill label={`${submitted} submitted`} tone={STATUS_TONE.submitted} />
            {inFlight - submitted - mailed > 0 && <Pill label={`${inFlight - submitted - mailed} pending`} tone={STATUS_TONE.pending} />}
            {failed > 0 && <Pill label={`${failed} failed`} tone={STATUS_TONE.failed} />}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="display" style={{ fontSize: 22, color: 'var(--ink)' }}>
            ${(batch.costCents / 100).toFixed(2)}
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              marginTop: 4,
              padding: '6px 12px',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--ink)',
              border: '1.5px solid var(--line)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {open ? 'Hide' : 'Recipients'}
          </button>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            {batch.jobs.map((j) => (
              <div key={j.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--paper)',
                fontSize: 12,
              }}>
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{j.recipient_name || 'Recipient'}</span>
                <span style={{ color: STATUS_TONE[j.status] ?? 'var(--ink-soft)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {j.status}
                </span>
                {j.tracking_number ? (
                  <a href={j.tracking_url || `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${j.tracking_number}`}
                     target="_blank" rel="noreferrer"
                     style={{ color: 'var(--peach-ink)', fontSize: 11, textDecoration: 'none', fontFamily: 'monospace' }}>
                    {j.tracking_number}
                  </a>
                ) : (
                  <span style={{ color: 'var(--ink-muted)', fontSize: 11 }}>—</span>
                )}
                {j.status_detail && (
                  <span style={{ gridColumn: '1 / -1', fontSize: 11, color: '#7A2D2D' }}>
                    {j.status_detail}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ label, tone }: { label: string; tone: string }) {
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: 999,
      background: `${tone}14`,
      color: tone,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );
}
