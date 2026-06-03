'use client';

/* eslint-disable no-restricted-syntax */
/* Disclosure — custom replacement for native <details>/<summary>.
   The native element renders an OS chevron, snaps open without
   animation, and pulls in slightly different metrics across
   browsers. This component matches the editor's editorial chrome:
   peach-tinted dashed summary, smooth grid-rows height transition,
   a custom chevron that rotates 90°, and keyboard / aria
   correctness. Mounted across ThemePanel, AtmospherePanel,
   and ColorTokenInspector. */

import { useId, useState, type ReactNode } from 'react';
import { Icon } from '../../motifs';

interface Props {
  /** Summary copy shown in the closed state and at the top when
   *  open. Stays terse — the disclosure is for content the host
   *  rarely needs. */
  label: string;
  /** Body — anything inside the disclosed section. */
  children: ReactNode;
  /** Whether to start open. Defaults to false. */
  defaultOpen?: boolean;
  /** Visual flavor.
   *  - 'dashed' (default): peach-dashed summary on cream-2 —
   *    used when the disclosure hints "this is opt-in".
   *  - 'flush': borderless summary with just the chevron — used
   *    when the disclosure sits inside a PanelSection that
   *    already frames things. */
  variant?: 'dashed' | 'flush';
}

export function Disclosure({ label, children, defaultOpen = false, variant = 'dashed' }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  const isDashed = variant === 'dashed';

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: isDashed ? '8px 10px' : '6px 4px',
          borderRadius: 8,
          background: isDashed
            ? (open ? 'var(--peach-bg)' : 'var(--cream-2)')
            : 'transparent',
          border: isDashed
            ? (open ? '1px dashed var(--peach-ink)' : '1px dashed var(--line)')
            : 'none',
          fontSize: 11.5,
          fontWeight: 600,
          color: open ? 'var(--peach-ink)' : 'var(--ink-soft)',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background 180ms cubic-bezier(0.22,1,0.36,1), color 180ms, border-color 180ms',
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <Icon name="chev-right" size={11} color={open ? 'var(--peach-ink)' : 'var(--ink-muted)'} />
        </span>
        <span style={{ flex: 1 }}>{label}</span>
      </button>
      {/* grid-rows trick: 1fr → 0fr collapses the child to zero
          while still letting it measure its natural height — no
          ref-and-scrollHeight dance needed, and the animation
          interpolates cleanly. inert when closed so tab order
          and AT skip the body. */}
      <div
        id={id}
        role="region"
        aria-hidden={!open}
        // @ts-expect-error — `inert` is a valid HTML5 attribute the
        // React types haven't caught up on yet (added in React 19).
        inert={open ? undefined : ''}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          marginTop: open ? 8 : 0,
          transition: 'grid-template-rows 260ms cubic-bezier(0.22,1,0.36,1), opacity 220ms, margin-top 180ms',
        }}
      >
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Disclosure;
