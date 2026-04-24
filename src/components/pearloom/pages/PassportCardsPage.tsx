'use client';

// PassportCardsPage — bulk-printable sheet of per-guest cards.
// Each card carries a QR that scans to that guest's /g/[token]
// Passport. Designed for 4-up on A4 card stock.

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { DashLayout } from '../dash/DashShell';
import { Icon } from '../motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';

interface CardGuest {
  id: string;
  name: string;
  token: string;
  homeCity?: string | null;
  relationship?: string | null;
  side?: string | null;
  passportUrl: string;
  qrDataUrl?: string;
}

interface Payload {
  site: { domain: string; names: string[]; occasion: string; date: string | null; venue: string | null };
  guests: Array<Omit<CardGuest, 'qrDataUrl'>>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function PassportCardsPage() {
  const { site } = useSelectedSite();
  const [data, setData] = useState<Payload | null>(null);
  const [guests, setGuests] = useState<CardGuest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!site?.id) return;
    let cancelled = false;

    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/passport-cards?siteId=${encodeURIComponent(site.id)}`, { cache: 'no-store' });
        if (!r.ok) throw new Error('failed');
        const d = (await r.json()) as Payload;
        if (cancelled) return;
        setData(d);

        // Generate a QR for each guest in parallel.
        const withQr = await Promise.all(
          d.guests.map(async (g) => ({
            ...g,
            qrDataUrl: await QRCode.toDataURL(g.passportUrl, {
              margin: 1,
              width: 360,
              errorCorrectionLevel: 'M',
              color: { dark: '#0E0D0B', light: '#00000000' },
            }).catch(() => ''),
          })),
        );
        if (!cancelled) setGuests(withQr);
      } catch {
        if (!cancelled) {
          setData(null);
          setGuests([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [site?.id]);

  function print() {
    if (typeof window !== 'undefined') window.print();
  }

  const names = data?.site?.names?.filter(Boolean).join(' & ') ?? '';
  const dateLabel = fmtDate(data?.site?.date ?? null);

  return (
    <DashLayout
      active="passport-cards"
      title="Passport cards"
      subtitle="One personal card per guest — their name, their QR, their private view of the site. Print 4-up on card stock for the welcome bag."
    >
      <div style={{ padding: '0 32px 40px', maxWidth: 1160 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }} className="pl8-no-print">
          <button type="button" className="btn btn-primary" onClick={print} disabled={!guests.length}>
            <Icon name="sparkles" size={14} /> Print / save as PDF
          </button>
          <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--ink-soft)' }}>
            {guests.length > 0 ? `${guests.length} cards · 4 per page` : '—'}
          </span>
        </div>

        {loading && <div style={{ color: 'var(--ink-soft)' }}>Threading QR codes…</div>}

        {!loading && guests.length === 0 && (
          <div
            style={{
              padding: 36,
              textAlign: 'center',
              background: 'var(--card)',
              border: '1px dashed var(--line)',
              borderRadius: 18,
            }}
          >
            <div className="display" style={{ fontSize: 22 }}>
              No guests on this site yet.
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6, maxWidth: 420, margin: '6px auto 0' }}>
              Add guests on the Guests page. Each one gets a unique passport QR here that scans to their own view of
              your site.
            </div>
          </div>
        )}

        {guests.length > 0 && (
          <div
            className="pl8-passport-sheet"
            style={{
              background: 'var(--cream)',
              padding: '32px 28px',
              borderRadius: 4,
              boxShadow: '0 4px 16px rgba(61,74,31,0.08)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 14,
              }}
            >
              {guests.map((g) => (
                <article
                  key={g.id}
                  className="pl8-passport-card"
                  style={{
                    border: '1px dashed var(--line)',
                    padding: 22,
                    display: 'grid',
                    gridTemplateColumns: '1fr 128px',
                    gap: 14,
                    alignItems: 'center',
                    borderRadius: 6,
                    background: 'var(--paper)',
                    minHeight: 200,
                    breakInside: 'avoid',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--peach-ink)',
                        marginBottom: 6,
                      }}
                    >
                      Your passport
                    </div>
                    <h3
                      className="display"
                      style={{ fontSize: 22, margin: '0 0 8px', letterSpacing: '-0.01em' }}
                    >
                      {g.name}
                    </h3>
                    {names && (
                      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        for {names}
                      </div>
                    )}
                    {dateLabel && (
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{dateLabel}</div>
                    )}
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-muted)',
                        marginTop: 10,
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      {g.passportUrl.replace(/^https?:\/\//, '')}
                    </div>
                  </div>
                  <div style={{ display: 'grid', placeItems: 'center' }}>
                    {g.qrDataUrl ? (
                      <img
                        src={g.qrDataUrl}
                        alt={`QR to ${g.name}'s passport`}
                        style={{ width: 120, height: 120 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 120,
                          height: 120,
                          background: 'var(--cream-2)',
                          border: '1px dashed var(--line)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 11,
                          color: 'var(--ink-muted)',
                        }}
                      >
                        QR
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashLayout>
  );
}
