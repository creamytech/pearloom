'use client';

// ─────────────────────────────────────────────────────────────
// SendOverlay — full-screen modal that summarises the current
// stationery + recipients + channel mix + schedule, then ships.
//
// Wires to /api/invite/guest for invitation sends (the existing
// per-guest invite path that mints tokens + writes email_sent_at
// + tags Resend events for the dashboard webhook).
//
// Save-the-date and Thank-you flows reuse the same endpoint —
// the channel field on the email tags lets the bell + dashboard
// distinguish them.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import type { StationeryType } from './studio-constants';
import { Pear, Icon } from '../motifs';

interface SendStats {
  total: number;
  withEmail: number;
  withPhone: number;
  withAddress: number;
  attending: number;
}

interface Props {
  siteSlug: string;
  type: StationeryType;
  /** Tiny preview of the rendered card. */
  cardPreview?: React.ReactNode;
  onClose: () => void;
  /** Optional caller-side callback when a real send completes —
   *  used to push a toast / refresh notification bell. */
  onSent?: (sentCount: number) => void;
}

export function StudioSendOverlay({ siteSlug, type, cardPreview, onClose, onSent }: Props) {
  const [stats, setStats] = useState<SendStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSummary, setSentSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/guests?siteSlug=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((data: null | { guests?: Array<{ email?: string | null; phone?: string | null; address?: string | null; status?: string | null }> }) => {
        if (cancelled || !data?.guests) return;
        const total = data.guests.length;
        const withEmail = data.guests.filter(g => !!g.email).length;
        const withPhone = data.guests.filter(g => !!g.phone).length;
        const withAddress = data.guests.filter(g => !!g.address).length;
        const attending = data.guests.filter(g => g.status === 'attending').length;
        setStats({ total, withEmail, withPhone, withAddress, attending });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [siteSlug]);

  async function send() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/invite/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: siteSlug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Send failed (${res.status})`);
      }
      const data = (await res.json()) as { sent?: number; failed?: number };
      const sent = data.sent ?? 0;
      const failed = data.failed ?? 0;
      setSentSummary(`Sent to ${sent}${failed ? ` · ${failed} failed` : ''}`);
      onSent?.(sent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send.');
    } finally {
      setBusy(false);
    }
  }

  const total = stats?.total ?? 0;
  const withEmail = stats?.withEmail ?? 0;
  const withPhone = stats?.withPhone ?? 0;
  const withAddress = stats?.withAddress ?? 0;

  const titleByType: Record<StationeryType, string> = {
    std: 'Off they go.',
    invite: 'Off it goes.',
    thanks: 'Send the thanks.',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(61,74,31,0.45)',
      backdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center',
      padding: 32,
      animation: 'pl-studio-card-in 300ms ease both',
    }}>
      <div style={{
        width: 'min(900px, 100%)', maxHeight: '90vh',
        background: 'var(--cream)', borderRadius: 18,
        boxShadow: 'var(--shadow-lg)',
        display: 'grid', gridTemplateColumns: '320px 1fr',
        overflow: 'hidden',
      }}>
        <div style={{
          background: 'var(--cream-3, var(--cream-2))', padding: 24,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          borderRight: '1px solid var(--line-soft)',
        }}>
          <div style={{ transform: 'scale(0.5)', transformOrigin: 'center' }}>
            {cardPreview}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', textAlign: 'center', marginTop: -120 }}>
            What guests will see
          </div>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--peach-ink)' }}>Send</div>
              <h2 className="display" style={{ fontSize: 26, margin: '4px 0 0' }}>{titleByType[type]}</h2>
            </div>
            <button onClick={onClose} aria-label="Close send overlay" style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--cream-2)', display: 'grid', placeItems: 'center',
              border: 'none', cursor: 'pointer',
            }}>
              <Icon name="close" size={14} />
            </button>
          </div>

          <SendBlock title="Recipients" sub="Pulled from your guest list">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: 'var(--lavender-bg, #E8E0F0)',
                display: 'grid', placeItems: 'center', color: 'var(--lavender-ink, #6B5784)',
              }}>
                <Icon name="users" size={20} color="currentColor" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {stats ? `${total} guest${total === 1 ? '' : 's'}` : 'Loading guests…'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                  {stats
                    ? `${withEmail} with email · ${withPhone} with phone · ${withAddress} with mailing address`
                    : 'Pulling roster…'}
                </div>
              </div>
              <a href="/dashboard/rsvp" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
                Edit list
              </a>
            </div>
          </SendBlock>

          <SendBlock title="Channel mix" sub="Pear sends each guest the way they prefer">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { l: 'Digital', sub: `${withEmail} with email`, icon: 'mail',  primary: true,  count: withEmail },
                { l: 'SMS',     sub: `${withPhone} with phone`, icon: 'phone', primary: false, count: withPhone },
                { l: 'Print',   sub: `${withAddress} with addresses`, icon: 'send', primary: false, count: withAddress, badge: 'PDF + ship' },
              ].map(c => (
                <div key={c.l} style={{
                  padding: 12, borderRadius: 12,
                  background: c.primary ? 'var(--ink)' : 'var(--card)',
                  color: c.primary ? 'var(--cream)' : 'var(--ink)',
                  border: '1px solid ' + (c.primary ? 'var(--ink)' : 'var(--line-soft)'),
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name={c.icon} size={13} color={c.primary ? 'var(--cream)' : 'var(--ink-soft)'} />
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{c.l}</div>
                  </div>
                  <div style={{ fontSize: 18, fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)', fontWeight: 600 }}>{c.count}</div>
                  <div style={{ fontSize: 10.5, opacity: c.primary ? 0.75 : 0.65 }}>{c.sub}</div>
                  {c.badge && <div style={{ fontSize: 9, color: 'var(--peach-ink)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>{c.badge}</div>}
                </div>
              ))}
            </div>
          </SendBlock>

          <SendBlock title="Schedule" sub="Pear staggers by timezone so nobody gets a 4am ping">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { l: 'Send now', sub: 'Ships in next 5 min', on: true },
                { l: 'Tomorrow at 9 AM', sub: 'Recommended', on: false },
                { l: 'Custom', sub: 'Pick date & time', on: false },
              ].map(s => (
                <button key={s.l} style={{
                  flex: 1, padding: 12, borderRadius: 10,
                  background: s.on ? 'var(--ink)' : 'var(--card)',
                  color: s.on ? 'var(--cream)' : 'var(--ink)',
                  border: '1px solid ' + (s.on ? 'var(--ink)' : 'var(--line-soft)'),
                  textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{s.l}</div>
                  <div style={{ fontSize: 10.5, opacity: s.on ? 0.75 : 0.6 }}>{s.sub}</div>
                </button>
              ))}
            </div>
          </SendBlock>

          {error && (
            <div role="alert" style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', fontSize: 12.5 }}>
              {error}
            </div>
          )}
          {sentSummary && (
            <div role="status" style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(92,107,63,0.10)', color: 'var(--sage-deep, #5C6B3F)', fontSize: 12.5 }}>
              ✓ {sentSummary}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--line-soft)', marginTop: 4 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
              {withEmail > 0
                ? `${withEmail} digital sends are free. Print + ship priced at checkout.`
                : 'No guest emails on file yet.'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} className="btn btn-ghost btn-sm">Save draft</button>
              <button
                className="btn btn-primary"
                onClick={send}
                disabled={busy || withEmail === 0}
                style={{ opacity: busy || withEmail === 0 ? 0.55 : 1 }}
              >
                {busy ? 'Sending…' : (
                  <>
                    <Icon name="send" size={12} color="var(--cream)" />
                    {' '}Send to {withEmail}
                  </>
                )}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
            <Pear size={10} tone="sage" shadow={false} /> Pear stamps email_sent_at on each guest so the bell &amp; dashboard pip light up live.
          </div>
        </div>
      </div>
    </div>
  );
}

function SendBlock({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}
