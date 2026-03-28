'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/SiteSharePanel.tsx
// QR code + share link for the couple's wedding site.
// Shows in the dashboard after publishing.
// ─────────────────────────name: "SiteSharePanel"─────────────
// Innovative: one click copies link, one click downloads QR.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Download, QrCode, ExternalLink, Globe } from 'lucide-react';

interface SiteSharePanelProps {
  siteUrl: string;
  siteId: string;
}

export function SiteSharePanel({ siteUrl, siteId }: SiteSharePanelProps) {
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!siteUrl) return;
    fetch(`/api/qr?url=${encodeURIComponent(siteUrl)}`)
      .then(r => r.text())
      .then(svg => setQrSvg(svg))
      .catch(() => {});
  }, [siteUrl]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(siteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteId}-qr-code.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: '#fff',
        borderRadius: '1.25rem',
        border: '1px solid rgba(0,0,0,0.06)',
        padding: '1.75rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center',
      }}
    >
      {/* QR Code */}
      <div style={{
        width: '120px', height: '120px', borderRadius: '0.75rem',
        overflow: 'hidden', background: 'rgba(0,0,0,0.02)',
        border: '1px solid rgba(0,0,0,0.06)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {qrSvg ? (
          <div
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        ) : (
          <QrCode size={40} color="rgba(0,0,0,0.15)" />
        )}
      </div>

      {/* Info + Actions */}
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <Globe size={14} color="var(--eg-accent)" />
          <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-accent)' }}>
            Your Wedding Site
          </span>
        </div>
        <p style={{
          fontFamily: 'var(--eg-font-heading)', fontSize: '1.1rem',
          fontWeight: 400, color: 'var(--eg-fg)', marginBottom: '0.25rem',
          wordBreak: 'break-all',
        }}>
          {siteUrl}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--eg-muted)', marginBottom: '1.25rem' }}>
          Share this link or print the QR code for save-the-dates.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={copyLink}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.1rem', borderRadius: '0.6rem',
              background: copied ? '#10b981' : 'var(--eg-fg)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={downloadQr}
            disabled={!qrSvg}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.1rem', borderRadius: '0.6rem',
              background: 'transparent', color: 'var(--eg-fg)',
              border: '1.5px solid rgba(0,0,0,0.1)', cursor: qrSvg ? 'pointer' : 'not-allowed',
              fontSize: '0.8rem', fontWeight: 700, opacity: qrSvg ? 1 : 0.4,
              transition: 'all 0.2s',
            }}
          >
            <Download size={14} /> Download QR
          </button>
          <a
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.1rem', borderRadius: '0.6rem',
              background: 'transparent', color: 'var(--eg-accent)',
              border: '1.5px solid rgba(163,177,138,0.25)', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <ExternalLink size={14} /> Preview Site
          </a>
        </div>
      </div>
    </motion.div>
  );
}
