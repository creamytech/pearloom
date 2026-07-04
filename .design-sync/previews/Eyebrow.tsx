import React from 'react';
import { Eyebrow } from 'pearloom';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' };

/** The default — a mono-uppercase kicker with a 1px gold rule on the leading edge. */
export function Leading() {
  return (
    <div style={col}>
      <Eyebrow>The ceremony</Eyebrow>
      <Eyebrow>Order of the day</Eyebrow>
      <Eyebrow>Travel &amp; stay</Eyebrow>
    </div>
  );
}

/** Rules on both edges — a centered section opener above a Fraunces heading. */
export function Both() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <Eyebrow rule="both">With love, the hosts</Eyebrow>
      <span style={{ fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontSize: 28, color: 'var(--pl-ink)' }}>
        Save the date
      </span>
    </div>
  );
}

/** Rule on the trailing edge instead. */
export function Trailing() {
  return (
    <div style={col}>
      <Eyebrow rule="trailing">Chapter one</Eyebrow>
    </div>
  );
}
