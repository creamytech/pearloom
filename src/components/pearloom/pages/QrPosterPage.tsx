'use client';

// QrPosterPage — single printable poster of the site's URL as a
// big QR code. Print as A4 portrait and prop it on the welcome
// table so guests scan-to-open the site without typing a link.
//
// Different from PassportCardsPage: that's per-guest invite
// cards. This is a single tabletop poster with the site URL.

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { DashLayout } from '../dash/DashShell';
import { Icon } from '../motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { buildSiteUrl, formatSiteDisplayUrl } from '@/lib/site-urls';

const COPY_PRESETS: Array<{ id: string; label: string; kicker: string; hint: string }> = [
  { id: 'tabletop', label: 'Welcome table', kicker: 'Scan to open', hint: 'our wedding site' },
  { id: 'rsvp', label: 'RSVP reminder', kicker: 'Scan to RSVP', hint: 'kindly reply by the deadline inside' },
  { id: 'photos', label: 'Live photo wall', kicker: 'Scan to share photos', hint: 'add yours to the wall' },
  { id: 'menu', label: 'Dinner menu', kicker: 'Scan to see the menu', hint: 'allergens + dietary tags inside' },
];

export function QrPosterPage() {
  const { site } = useSelectedSite();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string>('tabletop');
  const [headline, setHeadline] = useState<string>('');
  const [subhead, setSubhead] = useState<string>('');

  const preset = COPY_PRESETS.find((p) => p.id === presetId) ?? COPY_PRESETS[0];

  const targetUrl = useMemo(() => {
    if (!site?.domain) return '';
    const path = presetId === 'rsvp' ? '/rsvp' : presetId === 'photos' ? '/live' : '';
    return buildSiteUrl(site.domain, path, undefined, site.occasion);
  }, [site?.domain, site?.occasion, presetId]);

  const displayHost = useMemo(() => {
    if (!site?.domain) return '';
    const path = presetId === 'rsvp' ? '/rsvp' : presetId === 'photos' ? '/live' : '';
    return formatSiteDisplayUrl(site.domain, path, site.occasion);
  }, [site?.domain, site?.occasion, presetId]);

  useEffect(() => {
    if (!targetUrl) {
      setQrUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(targetUrl, {
      margin: 0,
      width: 1200,
      errorCorrectionLevel: 'H',
      color: { dark: '#0E0D0B', light: '#00000000' },
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [targetUrl]);

  const names = (site?.names ?? []).filter(Boolean).join(' & ') || 'Our celebration';
  const dateLabel = site?.eventDate
    ? new Date(site.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const finalKicker = headline.trim() || preset?.kicker || 'Scan to open';
  const finalHint = subhead.trim() || preset?.hint || 'our wedding site';

  function print() {
    if (typeof window !== 'undefined') window.print();
  }

  return (
    <DashLayout
      active="qr-poster"
      title="QR poster"
      subtitle="A printable scan-to-site poster — drop on the welcome table, the bar, or by the RSVP card so guests open the site without typing a link."
    >
      <div style={{ padding: '0 32px 40px', maxWidth: 1180 }}>
        {/* Controls — hidden when printing */}
        <div className="pl8-no-print" style={{ marginBottom: 24, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={print} disabled={!qrUrl}>
              <Icon name="sparkles" size={14} /> Print / save as PDF
            </button>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {site?.domain ? <>Linking to <strong style={{ color: 'var(--ink)' }}>{displayHost}</strong></> : 'No site selected'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COPY_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                aria-pressed={p.id === presetId}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1.5px solid ${p.id === presetId ? 'var(--peach-ink)' : 'var(--line)'}`,
                  background: p.id === presetId ? 'var(--peach-bg, #FCEAD6)' : 'var(--cream-2)',
                  color: p.id === presetId ? 'var(--peach-ink)' : 'var(--ink-soft)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 720 }}>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={preset?.kicker ?? 'Scan to open'}
              style={poseInput}
            />
            <input
              type="text"
              value={subhead}
              onChange={(e) => setSubhead(e.target.value)}
              placeholder={preset?.hint ?? 'our wedding site'}
              style={poseInput}
            />
          </div>
        </div>

        {/* Poster — printable */}
        <div
          className="pl8-qr-poster"
          style={{
            background: 'var(--paper, #F8F2E0)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            padding: '64px 56px 56px',
            margin: '0 auto',
            maxWidth: 720,
            aspectRatio: '1 / 1.414', // A4 portrait
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 24px 60px rgba(61,74,31,0.10)',
            color: 'var(--ink, #18181B)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* corner thread */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 24,
              left: 24,
              right: 24,
              borderTop: '1.5px solid var(--peach-ink, #C6703D)',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: 24,
              left: 24,
              right: 24,
              borderBottom: '1.5px solid var(--peach-ink, #C6703D)',
            }}
          />

          {/* Header */}
          <div style={{ textAlign: 'center', maxWidth: '92%' }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--peach-ink)',
                marginBottom: 18,
              }}
            >
              {finalKicker}
            </div>
            <div
              className="display"
              style={{ fontSize: 'clamp(34px, 4.6vw, 52px)', lineHeight: 1.05, margin: 0, fontFamily: 'var(--font-display, Georgia, serif)' }}
            >
              {names}
            </div>
            {dateLabel && (
              <div style={{ marginTop: 14, fontSize: 17, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                {dateLabel}
              </div>
            )}
          </div>

          {/* QR */}
          <div
            style={{
              padding: 22,
              background: 'var(--cream-2, #FBF7EE)',
              border: '1px solid var(--line)',
              borderRadius: 12,
            }}
          >
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR code linking to your site"
                style={{ width: 320, height: 320, display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: 320,
                  height: 320,
                  background: 'var(--cream)',
                  border: '1px dashed var(--line)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 14,
                  color: 'var(--ink-muted)',
                }}
              >
                Threading QR…
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', maxWidth: '92%' }}>
            <div style={{ fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>
              {finalHint}
            </div>
            <div
              style={{
                fontSize: 13,
                fontFamily: 'var(--font-ui, ui-monospace, monospace)',
                color: 'var(--ink-muted)',
                letterSpacing: '0.04em',
              }}
            >
              {displayHost}
            </div>
          </div>
        </div>
      </div>

      {/* Print rules — single page, no chrome */}
      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          .pl8-no-print { display: none !important; }
          .pl8-qr-poster {
            box-shadow: none !important;
            border: none !important;
            background: #FFF !important;
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100vw !important;
            height: 100vh !important;
            aspect-ratio: auto !important;
            padding: 14mm !important;
            page-break-after: always;
          }
          .pl8-dashshell, .pl8-dashshell aside, .pl8-dashshell header { display: none !important; }
          .pl8-dashshell main { padding: 0 !important; }
          @page { margin: 0; size: A4 portrait; }
        }
      `}</style>
    </DashLayout>
  );
}

const poseInput: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid var(--line)',
  background: 'var(--cream-2)',
  fontSize: 13,
  color: 'var(--ink)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};
