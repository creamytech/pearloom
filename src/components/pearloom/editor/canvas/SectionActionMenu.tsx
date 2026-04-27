'use client';

// ──────────────────────────────────────────────────────────────
// SectionActionMenu — floating action toolbar that appears on
// hover at the top-right of every section in edit mode.
//
// Actions (left to right):
//   ⋮⋮ drag      — handled separately by CanvasBlockSortable
//   ✎ edit       — scrolls to + highlights the Inspector panel
//   ⊕ add below  — opens the BlockPickerPopover
//   × remove     — hides the section (manifest.hiddenBlocks)
//
// This is the heart of "click anywhere on the canvas to do
// anything" — no more round-trip through the Outline.
// ──────────────────────────────────────────────────────────────

import { type ReactNode } from 'react';

interface Props {
  blockKey: string;
  /** Pretty label shown in the chip (e.g. "Gallery", not "gallery").
   *  Falls back to blockKey when omitted. */
  blockLabel?: string;
  onEdit?: (blockKey: string) => void;
  onAddBelow?: (blockKey: string, anchor: HTMLElement) => void;
  onRemove?: (blockKey: string) => void;
  /** Slot for the dnd-kit drag handle so it sits inline with the
   *  edit / add / remove buttons. */
  dragHandle?: ReactNode;
}

export function SectionActionMenu({
  blockKey, blockLabel, onEdit, onAddBelow, onRemove, dragHandle,
}: Props) {
  const label = blockLabel ?? blockKey;
  return (
    <div
      className="pl8-canvas-section-menu"
      role="toolbar"
      aria-label={`${label} actions`}
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 30,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: '3px 4px 3px 8px',
        borderRadius: 999,
        background: 'rgba(14,13,11,0.86)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 6px 18px rgba(14,13,11,0.22)',
        opacity: 0,
        pointerEvents: 'none',
        transition: 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1), transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        transform: 'translateY(-3px)',
        color: 'rgba(251, 247, 238, 0.92)',
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        maxWidth: 'calc(100% - 20px)',
      }}
    >
      {dragHandle}
      <span
        style={{
          padding: '0 6px 0 2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          maxWidth: 140,
        }}
      >
        {label}
      </span>
      {onEdit && (
        <ActionButton
          ariaLabel={`Edit ${label}`}
          onClick={() => onEdit(blockKey)}
          title="Edit in Inspector"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </ActionButton>
      )}
      {onAddBelow && (
        <ActionButton
          ariaLabel={`Add a section below ${label}`}
          onClick={(e) => onAddBelow(blockKey, e.currentTarget)}
          title="Add a section below"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </ActionButton>
      )}
      {onRemove && (
        <ActionButton
          ariaLabel={`Remove ${label}`}
          onClick={() => onRemove(blockKey)}
          title="Hide this section"
          danger
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({
  children, onClick, ariaLabel, title, danger,
}: {
  children: ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      style={{
        width: 24, height: 24,
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        color: danger ? '#FCA5A5' : 'rgba(243,233,212,0.92)',
        cursor: 'pointer',
        display: 'grid', placeItems: 'center',
        transition: 'background-color 180ms ease, color 180ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'rgba(239, 68, 68, 0.18)' : 'rgba(243,233,212,0.14)';
        if (danger) e.currentTarget.style.color = '#FECACA';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? '#FCA5A5' : 'rgba(243,233,212,0.92)';
      }}
    >
      {children}
    </button>
  );
}
