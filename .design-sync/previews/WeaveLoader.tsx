import React from 'react';
import { WeaveLoader } from 'pearloom';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28 };

/** The single Pearloom loader across its sizes — two threads weaving on a loop. */
export function Sizes() {
  return (
    <div style={row}>
      <WeaveLoader size="xs" />
      <WeaveLoader size="sm" />
      <WeaveLoader size="md" />
      <WeaveLoader size="lg" />
      <WeaveLoader size="xl" />
    </div>
  );
}

/** With the mono label beneath — say "Threading…", never "Loading…". */
export function WithLabel() {
  return <WeaveLoader size="lg" label="Threading…" />;
}

/** Inline, sitting on the baseline of a line of text. */
export function Inline() {
  return (
    <span style={{ fontFamily: 'var(--pl-font-body)', fontSize: 15, color: 'var(--pl-ink-soft)' }}>
      <WeaveLoader size="sm" inline /> Basting your draft in…
    </span>
  );
}
