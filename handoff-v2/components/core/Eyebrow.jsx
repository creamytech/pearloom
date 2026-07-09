import React from 'react';

/**
 * Eyebrow — the mono-uppercase section kicker, paired with a 1px gold
 * rule on the leading edge (BRAND §4). The quiet label that opens a
 * section above a Fraunces heading.
 */
export function Eyebrow({
  children,
  rule = 'leading',
  color = 'var(--pl-muted)',
  ruleColor = 'var(--pl-gold)',
  className,
  style,
}) {
  const Rule = () => <span aria-hidden="true" style={{ width: 24, height: 1, background: ruleColor, flexShrink: 0 }}></span>;
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 'var(--pl-text-2xs)',
        fontWeight: 500,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color,
        ...style,
      }}
    >
      {rule === 'leading' || rule === 'both' ? <Rule /> : null}
      {children}
      {rule === 'trailing' || rule === 'both' ? <Rule /> : null}
    </span>
  );
}
