import React from 'react';

const SIZES = {
  xs: { font: '0.54rem', tracking: '0.22em', rule: 14 },
  sm: { font: '0.62rem', tracking: '0.24em', rule: 22 },
  md: { font: '0.7rem', tracking: '0.28em', rule: 32 },
};

/**
 * Folio — the editorial corner-mark. A mono-uppercase label paired
 * with a 1px gold rule that gives a screen the feel of a printed
 * page: "Edition · No. 03 · Day-of". Use in page corners, panel and
 * modal headers — anywhere a quiet location anchor belongs.
 */
export function Folio({
  kicker,
  no,
  label,
  direction = 'row',
  ruleColor = 'var(--pl-gold)',
  color = 'var(--pl-muted)',
  rules = true,
  size = 'sm',
  className,
  style,
}) {
  const cfg = SIZES[size] || SIZES.sm;
  const noStr = no == null ? null : `No. ${typeof no === 'number' ? String(no).padStart(2, '0') : no}`;
  const meta = [kicker, noStr, label].filter(Boolean);

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: direction === 'column' ? 'column' : 'row',
        alignItems: direction === 'column' ? 'flex-start' : 'center',
        gap: direction === 'column' ? 6 : 12,
        fontFamily: 'var(--pl-font-mono)',
        fontSize: cfg.font,
        letterSpacing: cfg.tracking,
        textTransform: 'uppercase',
        color,
        fontWeight: 600,
        ...style,
      }}
    >
      {rules && direction === 'row' ? <span aria-hidden="true" style={{ width: cfg.rule, height: 1, background: ruleColor }}></span> : null}
      {meta.map((m, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          {m}
          {i < meta.length - 1 ? (
            <span aria-hidden="true" style={{ width: 3, height: 3, borderRadius: '50%', background: ruleColor, opacity: 0.7, marginLeft: 6 }}></span>
          ) : null}
        </span>
      ))}
      {rules && direction === 'row' ? <span aria-hidden="true" style={{ width: cfg.rule, height: 1, background: ruleColor }}></span> : null}
      {rules && direction === 'column' ? <span aria-hidden="true" style={{ width: cfg.rule * 1.4, height: 1, background: ruleColor, marginTop: 6 }}></span> : null}
    </div>
  );
}
