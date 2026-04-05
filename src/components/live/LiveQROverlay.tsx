'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface LiveQROverlayProps {
  domain: string;
}

export function LiveQROverlay({ domain }: LiveQROverlayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = `https://pearloom.com/sites/${domain}`;
    QRCode.toDataURL(url, {
      width: 120,
      margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [domain]);

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
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        zIndex: 100,
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
