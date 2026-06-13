'use client';

// ─────────────────────────────────────────────────────────────
// AssetGlyph — small SVG renderer for a single AssetEntry. Used
// by the asset palette in the left rail. AI-generated assets
// render via <img> when `url` is set.
// ─────────────────────────────────────────────────────────────

import type { AssetEntry } from './studio-constants';
import { Stamp, Squiggle } from '../motifs';

export function AssetGlyph({ asset, size = 32 }: { asset: AssetEntry; size?: number }) {
  if (asset.url) {
    return <img src={asset.url} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />;
  }
  if (asset.kind === 'stamp') {
    type StampTone = 'lavender' | 'peach' | 'sage' | 'cream';
    type StampIcon = 'heart' | 'sparkle' | 'pear';
    const allowedTones: StampTone[] = ['lavender', 'peach', 'sage', 'cream'];
    const allowedIcons: StampIcon[] = ['heart', 'sparkle', 'pear'];
    const tone: StampTone = (allowedTones as string[]).includes(asset.tone ?? '')
      ? (asset.tone as StampTone)
      : 'lavender';
    const icon: StampIcon = (allowedIcons as string[]).includes(asset.icon ?? '')
      ? (asset.icon as StampIcon)
      : 'heart';
    return <Stamp size={size + 4} tone={tone} text={asset.text ?? ''} icon={icon} rotation={-6} />;
  }
  if (asset.kind === 'wax') {
    return (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <circle cx="20" cy="20" r="14" fill={asset.color ?? '#C97A6E'} />
        <circle cx="20" cy="20" r="14" fill="url(#waxGrad)" opacity="0.4" />
        <text x="20" y="25" textAnchor="middle" fontSize="9" fontFamily="Fraunces" fill="rgba(255,255,255,0.6)" fontStyle="italic" fontWeight="700">S&amp;S</text>
        <defs><radialGradient id="waxGrad"><stop offset="0%" stopColor="#fff" /><stop offset="100%" stopColor="#000" /></radialGradient></defs>
      </svg>
    );
  }
  if (asset.kind === 'leaf' || asset.kind === 'leaf2') {
    return (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <path d={asset.kind === 'leaf'
          ? 'M8 32 Q 20 8 32 20 Q 26 30 12 30 Z'
          : 'M10 30 C 12 14, 26 14, 30 28 C 24 32, 14 32, 10 30 Z'}
          fill="#8B9C5A" />
        <path d="M8 32 Q 20 22 32 20" stroke="#3D4A1F" strokeWidth="0.6" fill="none" />
      </svg>
    );
  }
  if (asset.kind === 'doodle') {
    return asset.shape === 'sun' ? (
      <svg viewBox="0 0 40 40" width={size - 4} height={size - 4}>
        <circle cx="20" cy="20" r="6" fill="none" stroke="#D4A95D" strokeWidth="1.5" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
          <line key={a}
            x1={20 + Math.cos((a * Math.PI) / 180) * 10}
            y1={20 + Math.sin((a * Math.PI) / 180) * 10}
            x2={20 + Math.cos((a * Math.PI) / 180) * 16}
            y2={20 + Math.sin((a * Math.PI) / 180) * 16}
            stroke="#D4A95D" strokeWidth="1.2" strokeLinecap="round" />
        ))}
      </svg>
    ) : (
      <Squiggle width={size} height={size / 2} variant={1} />
    );
  }
  if (asset.kind === 'mono') {
    return (
      <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: size * 0.7, color: 'var(--ink)', fontWeight: 600 }}>
        {asset.letters ?? 'S&S'}
      </div>
    );
  }
  if (asset.kind === 'tape') {
    return <div style={{ width: size + 4, height: size / 2 - 2, background: asset.color ?? '#F0C9A8', opacity: 0.7, transform: 'rotate(-6deg)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} />;
  }
  return null;
}
