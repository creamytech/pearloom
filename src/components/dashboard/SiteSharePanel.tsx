'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/SiteSharePanel.tsx
// Premium share panel — real OG preview, iMessage/SMS/WhatsApp,
// RSVP direct link, themed QR codes (site + RSVP), download.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, Download, QrCode, ExternalLink,
  Mail, MessageCircle, Phone,
} from 'lucide-react';

interface SiteSharePanelProps {
  siteUrl: string;
  siteId: string;
  siteName?: string;
  coupleNames?: [string, string];
  /** Theme accent hex — used for QR dot colour and button accents */
  accentColor?: string;
  /** Theme background hex — used for QR background colour */
  bgColor?: string;
  /** Hero tagline for OG preview */
  tagline?: string;
  /** Formatted date string for OG preview */
  dateStr?: string;
  /** Cover photo URL (relative /api/img/ paths are handled automatically) */
  coverPhoto?: string;
  /** RSVP section URL, e.g. https://x.pearloom.com#rsvp */
  rsvpUrl?: string;
}

export function SiteSharePanel({
  siteUrl,
  siteId,
  siteName,
  coupleNames,
  accentColor = '#A3B18A',
  bgColor = '#2B2B2B',
  tagline = '',
  dateStr = '',
  coverPhoto = '',
  rsvpUrl,
}: SiteSharePanelProps) {
  const [copied, setCopied]       = useState<'link' | 'rsvp' | null>(null);
  const [qrSvg, setQrSvg]         = useState<string | null>(null);
  const [qrRsvpSvg, setQrRsvpSvg] = useState<string | null>(null);
  const [qrTab, setQrTab]         = useState<'site' | 'rsvp'>('site');

  const [n1 = '', n2 = ''] = coupleNames || [];
  const displayNames = coupleNames ? `${n1} & ${n2}` : (siteName || 'Our Site');
  const shareMsg     = `You're invited! View ${displayNames}'s site: ${siteUrl}`;
  const rsvpMsg      = rsvpUrl ? `RSVP for ${displayNames}: ${rsvpUrl}` : '';

  const ogPreviewUrl =
    `/api/og?n1=${encodeURIComponent(n1)}&n2=${encodeURIComponent(n2)}` +
    `&tag=${encodeURIComponent(tagline)}&accent=${encodeURIComponent(accentColor)}` +
    `&bg=${encodeURIComponent(bgColor)}&date=${encodeURIComponent(dateStr)}` +
    `&photo=${encodeURIComponent(coverPhoto)}`;

  useEffect(() => {
    if (!siteUrl) return;
    fetch(
      `/api/qr?url=${encodeURIComponent(siteUrl)}&color=${encodeURIComponent(accentColor)}&bg=${encodeURIComponent(bgColor)}`
    )
      .then(r => r.text()).then(setQrSvg).catch(() => {});
  }, [siteUrl, accentColor, bgColor]);

  useEffect(() => {
    if (!rsvpUrl) return;
    fetch(
      `/api/qr?url=${encodeURIComponent(rsvpUrl)}&color=${encodeURIComponent(accentColor)}&bg=${encodeURIComponent(bgColor)}`
    )
      .then(r => r.text()).then(setQrRsvpSvg).catch(() => {});
  }, [rsvpUrl, accentColor, bgColor]);

  const copyLink = async (url: string, type: 'link' | 'rsvp') => {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(type);
    setTimeout(() => setCopied(null), 2500);
  };

  const downloadQr = (svg: string | null, label: string) => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${siteId}-${label}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareSMS      = (msg: string) => { window.location.href = `sms:?body=${encodeURIComponent(msg)}`; };
  const shareWhatsApp = (msg: string) => { window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank'); };
  const shareEmail    = (subject: string, body: string) => {
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  // ── Shared sub-components ──────────────────────────────────
  const sectionLabel = (text: string) => (
    <div style={{
      fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '1rem',
    }}>
      {text}
    </div>
  );

  const card = (children: React.ReactNode, extraStyle?: React.CSSProperties) => (
    <div style={{
      background: 'var(--pl-cream)', borderRadius: '1.25rem',
      border: '1px solid rgba(0,0,0,0.06)',
      padding: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
      ...extraStyle,
    }}>
      {children}
    </div>
  );

  const urlRow = (url: string, type: 'link' | 'rsvp') => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      background: 'rgba(0,0,0,0.025)', borderRadius: '0.65rem',
      padding: '0.7rem 0.9rem', border: '1px solid rgba(0,0,0,0.06)',
    }}>
      <code style={{
        flex: 1, fontSize: '0.8rem', color: 'var(--pl-ink)',
        fontFamily: 'ui-monospace, monospace',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {url}
      </code>
      <AnimatePresence mode="wait">
        <motion.button
          key={copied === type ? 'ok' : 'copy'}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={() => copyLink(url, type)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.4rem 0.8rem', borderRadius: '0.4rem', flexShrink: 0,
            background: copied === type ? 'rgba(34,197,94,0.1)' : 'var(--pl-ink)',
            color:      copied === type ? '#16a34a'             : '#fff',
            border:     copied === type ? '1px solid rgba(34,197,94,0.2)' : 'none',
            cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          {copied === type ? <Check size={12} /> : <Copy size={12} />}
          {copied === type ? 'Copied!' : 'Copy'}
        </motion.button>
      </AnimatePresence>
    </div>
  );

  const shareButton = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    primary = false
  ) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.55rem 1rem', borderRadius: '100px',
        background: primary ? 'var(--pl-ink)' : 'rgba(0,0,0,0.04)',
        color:      primary ? '#fff'         : 'var(--pl-ink)',
        border:     primary ? 'none'         : '1px solid rgba(0,0,0,0.08)',
        cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
        fontFamily: 'var(--pl-font-body)', whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </button>
  );

  const activeSvg = qrTab === 'rsvp' ? qrRsvpSvg : qrSvg;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* ── OG Link Preview ─────────────────────────────────── */}
      {card(
        <>
          {sectionLabel('Link Preview')}
          <div style={{
            borderRadius: '0.75rem', overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>
            {/* Real OG image rendered by /api/og */}
            <img
              src={ogPreviewUrl}
              alt={`${displayNames} site preview`}
              style={{ width: '100%', aspectRatio: '1200/630', display: 'block', objectFit: 'cover' }}
            />
            {/* iMessage-style bottom row */}
            <div style={{
              background: '#f9f9f9', borderTop: '1px solid rgba(0,0,0,0.07)',
              padding: '0.65rem 0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.78rem', fontWeight: 700, color: '#1a1816', marginBottom: '0.1rem',
                  fontFamily: '-apple-system, sans-serif',
                }}>
                  {siteName || displayNames}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.4)', fontFamily: '-apple-system, sans-serif' }}>
                  pearloom.com
                </div>
              </div>
              <a
                href={siteUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.7rem', fontWeight: 600, color: accentColor,
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem',
                }}
              >
                Open <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </>
      )}

      {/* ── Site URL + Share buttons ─────────────────────────── */}
      {card(
        <>
          {sectionLabel('Your Site URL')}
          <div style={{ marginBottom: '1rem' }}>
            {urlRow(siteUrl, 'link')}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {shareButton('iMessage', <Phone size={14} />, () => shareSMS(shareMsg), true)}
            {shareButton('WhatsApp', <MessageCircle size={14} />, () => shareWhatsApp(shareMsg))}
            {shareButton('Email',    <Mail size={14} />, () => shareEmail(
              siteName ? `You're invited — ${siteName}` : "You're invited!",
              `View our website:\n${siteUrl}`
            ))}
          </div>
        </>
      )}

      {/* ── RSVP direct link ─────────────────────────────────── */}
      {rsvpUrl && card(
        <>
          {sectionLabel('RSVP Link')}
          <p style={{
            fontSize: '0.8rem', color: 'var(--pl-muted)', margin: '0 0 0.875rem 0', lineHeight: 1.5,
          }}>
            Send this directly so guests can RSVP without scrolling through the whole site.
          </p>
          <div style={{ marginBottom: '1rem' }}>
            {urlRow(rsvpUrl, 'rsvp')}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {shareButton('Text RSVP Link', <Phone size={14} />, () => shareSMS(rsvpMsg), true)}
            {shareButton('WhatsApp', <MessageCircle size={14} />, () => shareWhatsApp(rsvpMsg))}
          </div>
        </>
      )}

      {/* ── QR Codes ─────────────────────────────────────────── */}
      {card(
        <>
          {sectionLabel(rsvpUrl ? 'QR Codes' : 'QR Code')}

          {/* Tab switcher (only shown when RSVP URL exists) */}
          {rsvpUrl && (
            <div style={{
              display: 'flex', gap: '0.25rem', marginBottom: '1.25rem',
              background: 'rgba(0,0,0,0.04)', borderRadius: '0.6rem', padding: '0.2rem',
            }}>
              {(['site', 'rsvp'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setQrTab(tab)}
                  style={{
                    flex: 1, padding: '0.45rem', borderRadius: '0.45rem',
                    background: qrTab === tab ? '#fff' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    fontSize: '0.72rem', fontWeight: 600,
                    color: qrTab === tab ? 'var(--pl-ink)' : 'var(--pl-muted)',
                    boxShadow: qrTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  {tab === 'site' ? 'Site Link' : 'RSVP Link'}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
            {/* QR display */}
            <div style={{
              width: '120px', height: '120px', borderRadius: '0.75rem',
              overflow: 'hidden', flexShrink: 0,
              background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {activeSvg ? (
                <div
                  dangerouslySetInnerHTML={{ __html: activeSvg }}
                  style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              ) : (
                <QrCode size={36} color="rgba(0,0,0,0.12)" />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingTop: '0.25rem' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--pl-muted)', margin: 0, lineHeight: 1.5 }}>
                {qrTab === 'rsvp'
                  ? 'Display at your venue — guests scan to RSVP instantly.'
                  : 'Add to save-the-dates, invitations, or venue displays.'}
              </p>
              <button
                onClick={() => downloadQr(activeSvg, qrTab)}
                disabled={!activeSvg}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.45rem 0.85rem', borderRadius: '0.5rem',
                  border: '1px solid rgba(0,0,0,0.1)', background: 'transparent',
                  cursor: activeSvg ? 'pointer' : 'not-allowed',
                  fontSize: '0.72rem', fontWeight: 600,
                  opacity: activeSvg ? 1 : 0.4,
                  color: 'var(--pl-ink)', fontFamily: 'var(--pl-font-body)',
                  width: 'fit-content',
                }}
              >
                <Download size={12} /> Download SVG
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
