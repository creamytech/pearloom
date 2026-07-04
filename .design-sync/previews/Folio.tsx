import React from 'react';
import { Folio } from 'pearloom';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' };

/** The editorial corner-mark in a row — kicker · No. · label, flanked by gold rules. */
export function Row() {
  return (
    <div style={col}>
      <Folio kicker="Edition" no={3} label="Day-of" />
      <Folio kicker="The Whitfield Wedding" label="Ceremony" />
    </div>
  );
}

/** Stacked as a column — for a panel or modal header. */
export function Column() {
  return <Folio kicker="Chapter" no={1} label="How we met" direction="column" size="md" />;
}

/** Three sizes for different altitudes of page furniture. */
export function Sizes() {
  return (
    <div style={col}>
      <Folio kicker="Edition" no={1} size="xs" />
      <Folio kicker="Edition" no={2} size="sm" />
      <Folio kicker="Edition" no={3} size="md" />
    </div>
  );
}
