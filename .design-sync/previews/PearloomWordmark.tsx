import React from 'react';
import { PearloomWordmark } from 'pearloom';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'flex-start' };

/** The signed-off "pearloom" lettering — pure vector, crisp at any cap height. */
export function Wordmark() {
  return (
    <div style={col}>
      <PearloomWordmark size={16} />
      <PearloomWordmark size={24} />
      <PearloomWordmark size={36} />
    </div>
  );
}

/** In brand olive, and reversed to cream on a dark surface. */
export function Colors() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      <PearloomWordmark size={28} color="var(--pl-olive)" />
      <div style={{ background: 'var(--pl-ink)', padding: '16px 22px', borderRadius: 10 }}>
        <PearloomWordmark size={28} color="var(--pl-cream)" />
      </div>
    </div>
  );
}
