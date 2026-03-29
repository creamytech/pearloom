'use client';

import { useState } from 'react';

interface ShareBarProps {
  url: string;
  title: string;
  accent: string;
  bgColor: string;
}

export function ShareBar({ url, title, accent, bgColor }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback: select text
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { /* ignore */ }
    }
  };

  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(`${title} 💕`)}&url=${encodeURIComponent(url)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 14px', borderRadius: '100px',
    fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em',
    cursor: 'pointer', textDecoration: 'none',
    border: `1px solid ${accent}40`,
    background: `${accent}12`,
    color: accent,
    transition: 'opacity 0.15s',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '1.25rem' }}>
      <a href={twitterUrl} target="_blank" rel="noopener noreferrer" style={btnBase} aria-label="Share on X / Twitter">
        Share on X
      </a>
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={btnBase} aria-label="Share on WhatsApp">
        Share on WhatsApp
      </a>
      <button onClick={handleCopy} style={{ ...btnBase, background: copied ? `${accent}25` : btnBase.background as string }} aria-label="Copy link">
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  );
}
