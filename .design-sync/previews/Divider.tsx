import React from 'react';
import { Divider } from 'pearloom';

const stage: React.CSSProperties = { width: 320, display: 'flex', flexDirection: 'column', gap: 5 };
const cap: React.CSSProperties = {
  fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: 'var(--pl-muted)',
};

function Row({ ornament }: { ornament: string }) {
  return (
    <div style={stage}>
      <span style={cap}>{ornament}</span>
      {/* @ts-expect-error ornament is a DS enum string */}
      <Divider ornament={ornament} />
    </div>
  );
}

/** Ornamental section breaks — a centered fleuron, pearl, or diamond flanked by hairlines. */
export function Ornaments() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Row ornament="fleuron" />
      <Row ornament="pearl" />
      <Row ornament="diamond" />
      <Row ornament="sprig" />
    </div>
  );
}

/** The full occasion set — including sun (celebration) and cross (memorial). */
export function OccasionSet() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Row ornament="infinity" />
      <Row ornament="sun" />
      <Row ornament="cross" />
    </div>
  );
}
