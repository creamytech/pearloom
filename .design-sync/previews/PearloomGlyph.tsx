import React from 'react';
import { PearloomGlyph } from 'pearloom';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 20 };

/** The brand mark — the solid pear with a carved spiral core, in brand olive. */
export function Mark() {
  return (
    <div style={row}>
      <PearloomGlyph size={24} />
      <PearloomGlyph size={40} />
      <PearloomGlyph size={64} />
      <PearloomGlyph size={96} />
    </div>
  );
}

/** Reverses cleanly to a cream knockout on olive and ink surfaces. */
export function Reversed() {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ background: 'var(--pl-olive)', padding: 20, borderRadius: 12 }}>
        <PearloomGlyph size={64} color="var(--pl-cream)" />
      </div>
      <div style={{ background: 'var(--pl-ink)', padding: 20, borderRadius: 12 }}>
        <PearloomGlyph size={64} color="var(--pl-cream)" />
      </div>
      <div style={{ background: 'var(--pl-cream-deep)', padding: 20, borderRadius: 12 }}>
        <PearloomGlyph size={64} color="var(--pl-gold)" />
      </div>
    </div>
  );
}
