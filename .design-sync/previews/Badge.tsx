import React from 'react';
import { Badge } from 'pearloom';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 };

/** The default mono editorial label — uppercase, tracked, the Pearloom voice. */
export function Labels() {
  return (
    <div style={row}>
      <Badge tone="olive">Draft</Badge>
      <Badge tone="gold">Edition 01</Badge>
      <Badge tone="neutral">Not sent</Badge>
      <Badge tone="ink">Published</Badge>
    </div>
  );
}

/** The soft pill shape — for a friendlier, rounded status. */
export function Pills() {
  return (
    <div style={row}>
      <Badge tone="olive" variant="pill">Attending</Badge>
      <Badge tone="gold" variant="pill">Maybe</Badge>
      <Badge tone="plum" variant="pill">Declined</Badge>
      <Badge tone="neutral" variant="pill">Pending</Badge>
    </div>
  );
}

/** With a leading status dot in the current color. */
export function WithDot() {
  return (
    <div style={row}>
      <Badge tone="olive" variant="pill" dot>Live now</Badge>
      <Badge tone="plum" variant="pill" dot>Closing soon</Badge>
    </div>
  );
}
