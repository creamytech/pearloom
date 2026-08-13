'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildSiteUrl } from '@/lib/site-urls';

interface LiveQROverlayProps {
  domain: string;
  /** Occasion for Zola-style URLs; falls back to legacy when omitted. */
  occasion?: string;
}

export function LiveQROverlay({ domain, occasion }: LiveQROverlayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = buildSiteUrl(domain, '', 'https://pearloom.com', occasion);
    QRCode.toDataURL(url, {
      width: 120,
      margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [domain, occasion]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: 'rgba(0,0,0,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 'var(--pl-radius-lg)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        zIndex: 'var(--z-sticky)',
      }}
    >
      {qrDataUrl && (
        <img
          src={qrDataUrl}
          alt="Scan to share photos"
          width={120}
          height={120}
          style={{ display: 'block' }}
        />
      )}
      <span
        style={{
          color: 'var(--pl-ink-soft)',
          fontSize: '0.65rem',
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        Scan to share photos
      </span>
    </div>
  );
}
