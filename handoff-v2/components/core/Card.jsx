import React, { useState } from 'react';

/**
 * Card — the paper surface (BRAND §9, the "paper" layer). Warm cream
 * card, hairline tan border, restrained radius, soft warm shadow.
 * Cards are paper, never glass. Set `interactive` for a hover lift.
 */
export function Card({
  children,
  interactive = false,
  padding = 24,
  as = 'div',
  onClick,
  className,
  style,
}) {
  const [hover, setHover] = useState(false);
  const Tag = as;
  return (
    <Tag
      className={className}
      onClick={onClick}
      onMouseEnter={interactive ? () => setHover(true) : undefined}
      onMouseLeave={interactive ? () => setHover(false) : undefined}
      style={{
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        borderRadius: 'var(--pl-radius-lg)',
        boxShadow: hover ? 'var(--pl-shadow-md)' : 'var(--pl-shadow-sm)',
        padding,
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform var(--pl-dur-base) var(--pl-ease-emphasis), box-shadow var(--pl-dur-base) var(--pl-ease-emphasis)',
        cursor: interactive && onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
