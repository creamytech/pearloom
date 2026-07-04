import React from 'react';
import { Card, Eyebrow, Button, Badge, Thread } from 'pearloom';

const heading: React.CSSProperties = {
  fontFamily: 'var(--pl-font-display)',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 26,
  color: 'var(--pl-ink)',
  margin: '10px 0 6px',
  lineHeight: 1.1,
};
const body: React.CSSProperties = {
  fontFamily: 'var(--pl-font-body)',
  fontSize: 14,
  lineHeight: 1.6,
  color: 'var(--pl-ink-soft)',
  margin: 0,
};

/** The paper surface — an editorial card opened by an Eyebrow above a Fraunces heading. */
export function Paper() {
  return (
    <Card style={{ maxWidth: 340 }}>
      <Eyebrow>The ceremony</Eyebrow>
      <h3 style={heading}>An evening woven by hand</h3>
      <p style={body}>
        Join us as we gather beneath the olive trees to set the type on a day
        that has been years in the making.
      </p>
      <Thread variant="single" style={{ margin: '16px 0' }} />
      <Button variant="olive" size="sm">Read the invitation</Button>
    </Card>
  );
}

/** An interactive card lifts on hover — for a tappable list of moments. */
export function Interactive() {
  return (
    <Card interactive onClick={() => {}} style={{ maxWidth: 300 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--pl-font-display)', fontSize: 18, color: 'var(--pl-ink)' }}>
          The welcome dinner
        </span>
        <Badge tone="gold">Friday</Badge>
      </div>
      <p style={{ ...body, marginTop: 8 }}>7:00 in the evening · The orchard barn</p>
    </Card>
  );
}

/** Tighter padding for a compact stat or aside. */
export function Compact() {
  return (
    <Card padding={16} style={{ maxWidth: 220 }}>
      <Eyebrow rule="none">Replies in</Eyebrow>
      <div style={{ fontFamily: 'var(--pl-font-display)', fontSize: 32, color: 'var(--pl-olive)', marginTop: 4 }}>
        128
      </div>
      <p style={body}>guests have answered the thread</p>
    </Card>
  );
}
