import React from 'react';
import { Monogram } from 'pearloom';

const grid: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' };
const cell: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 };
const cap: React.CSSProperties = {
  fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: 'var(--pl-muted)',
};

/** The couple monogram in its six editorial frames — the wedding keystone. */
export function Frames() {
  const frames = ['plain', 'ring', 'crest', 'wreath', 'diamond', 'interlock'] as const;
  return (
    <div style={grid}>
      {frames.map((f) => (
        <div key={f} style={cell}>
          <Monogram left="M" right="J" frame={f} size={96} />
          <span style={cap}>{f}</span>
        </div>
      ))}
    </div>
  );
}

/** A single-initial mark — for a solo honoree or a wax-seal favicon. */
export function Single() {
  return (
    <div style={grid}>
      <Monogram single left="P" frame="ring" size={96} />
      <Monogram single left="A" frame="crest" size={96} />
    </div>
  );
}

/** Recolored for a dark surface — cream ink on editorial midnight. */
export function OnDark() {
  return (
    <div style={{ ...grid, background: 'var(--pl-ink)', padding: 24, borderRadius: 12 }}>
      <Monogram left="M" right="J" frame="ring" size={96} ink="var(--pl-cream)" accent="var(--pl-gold)" />
      <Monogram left="M" right="J" frame="diamond" size={96} ink="var(--pl-cream)" accent="var(--pl-gold)" />
    </div>
  );
}
