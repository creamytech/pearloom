import React from 'react';
import { Button, Pearl } from 'pearloom';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 };

/** The surface palette — ink is the default, olive the brand voice, paper the quiet option. */
export function Variants() {
  return (
    <div style={row}>
      <Button variant="ink">Begin a thread</Button>
      <Button variant="olive">Preview the site</Button>
      <Button variant="paper">Save the date</Button>
      <Button variant="terra">Send the invitations</Button>
      <Button variant="ghost">Not yet</Button>
    </div>
  );
}

/** The single primary CTA on a surface — the iridescent gold pearl surface. */
export function PrimaryCTA() {
  return (
    <Button variant="pearl" size="lg">
      <Pearl size={11} /> Press to publish
    </Button>
  );
}

/** Three sizes for hierarchy — sm for dense chrome, lg for the hero. */
export function Sizes() {
  return (
    <div style={row}>
      <Button variant="olive" size="sm">Small</Button>
      <Button variant="olive" size="md">Medium</Button>
      <Button variant="olive" size="lg">Large</Button>
    </div>
  );
}

/** The disabled rest state, dimmed and not-allowed. */
export function Disabled() {
  return (
    <div style={row}>
      <Button variant="ink" disabled>Threading…</Button>
      <Button variant="paper" disabled>Locked</Button>
    </div>
  );
}
