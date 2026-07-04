import React from 'react';
import { Thread } from 'pearloom';

const stage: React.CSSProperties = { width: 300, display: 'flex', flexDirection: 'column', gap: 4 };
const cap: React.CSSProperties = {
  fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: 'var(--pl-muted)',
};

/** The signature — two strands (olive + gold) crossing at the middle. */
export function Weave() {
  return (
    <div style={stage}>
      <span style={cap}>weave</span>
      <Thread variant="weave" height={16} />
    </div>
  );
}

/** Two parallel hairlines — a quieter rule. */
export function Straight() {
  return (
    <div style={stage}>
      <span style={cap}>straight</span>
      <Thread variant="straight" height={12} />
    </div>
  );
}

/** A single gold hairline — the most restrained divider. */
export function Single() {
  return (
    <div style={stage}>
      <span style={cap}>single</span>
      <Thread variant="single" />
    </div>
  );
}

/** A short rule with a centered gold bead — a section flourish. */
export function Bullet() {
  return (
    <div style={stage}>
      <span style={cap}>bullet</span>
      <Thread variant="bullet" />
    </div>
  );
}
