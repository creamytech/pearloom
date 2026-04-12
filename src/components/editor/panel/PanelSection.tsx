'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelSection.tsx
// Canonical collapsible section wrapper for editor panels.
//
// VISUAL RULE: one glass card wraps BOTH the header and the body.
// The header is not a floating title above the card — it's part of
// the same rounded surface, so the section always reads as a single
// cohesive unit regardless of the user's site theme. Uses HARD-CODED
// radii + backgrounds so the editor chrome never inherits the site-
// level `elementShape` (arch/pill/etc).
// ─────────────────────────────────────────────────────────────

import { useState, type ReactNode, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { panelText, panelWeight, panelTracking } from './panel-tokens';

export interface PanelSectionProps {
  /** Uppercase eyebrow title rendered in the section header. */
  title: string;
  /** Optional lucide icon component rendered left of the title. */
  icon?: ElementType;
  /** Optional count/badge rendered right of the title. */
  badge?: string | number;
  /** Optional hint text rendered below the title when the section is open. */
  hint?: string;
  /** When false, the section can't be collapsed. Default true. */
  collapsible?: boolean;
  /** Initial open state when collapsible. Default true. */
  defaultOpen?: boolean;
  /**
   * When `true` (default), the section renders on the canonical
   * translucent glass card. Pass `false` to get an unstyled
   * container for sections whose children already render their own
   * full-bleed chrome (e.g. a block-list Reorder group).
   */
  card?: boolean;
  /** Panel-level children. */
  children: ReactNode;
}

// One hard-coded radius for ALL editor panel chrome so site-level
// elementShape overrides (arch / pill / etc) can't leak in.
const PANEL_RADIUS = '12px';
const PANEL_CARD_BG = '#FFFFFF';
const PANEL_CARD_BORDER = '1px solid #E4E4E7';

/**
 * A single collapsible section with:
 *   - uppercase eyebrow title @ 0.6rem / 700 / 0.1em tracking
 *   - chevron that rotates 90° when open
 *   - ONE rounded glass card wrapping the full header+body
 *   - spring-based height animation
 *
 * Usage:
 *   <PanelSection title="Colors" icon={Palette}>
 *     ...
 *   </PanelSection>
 */
export function PanelSection({
  title,
  icon: Icon,
  badge,
  hint,
  collapsible = true,
  defaultOpen = true,
  card = true,
  children,
}: PanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;

  const header = (
    <motion.button
      type="button"
      onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      whileHover={collapsible ? { backgroundColor: 'rgba(24,24,27,0.04)' } : undefined}
      whileTap={collapsible ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        // The header is flush with the card's rounded top when closed
        // and keeps that same radius when open — the body extends the
        // same card downward, so it's one continuous surface.
        padding: card ? '12px 14px' : '10px 12px',
        borderRadius: card ? `${PANEL_RADIUS} ${PANEL_RADIUS} 0 0` : '10px',
        border: 'none',
        background: 'transparent',
        cursor: collapsible ? 'pointer' : 'default',
        color: 'var(--pl-ink-soft)',
        textAlign: 'left',
      }}
    >
      {collapsible && (
        <ChevronRight
          size={10}
          style={{
            transform: isOpen ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
            color: isOpen ? '#18181B' : 'var(--pl-muted)',
            flexShrink: 0,
          }}
        />
      )}
      {Icon && <Icon size={12} color="#18181B" />}
      <span
        style={{
          flex: 1,
          textAlign: 'left',
          fontSize: panelText.heading,
          fontWeight: panelWeight.bold,
          letterSpacing: panelTracking.wider,
          textTransform: 'uppercase',
          color: isOpen ? 'var(--pl-ink-soft)' : 'var(--pl-muted)',
        }}
      >
        {title}
      </span>
      {badge !== undefined && (
        <span
          style={{
            fontSize: panelText.meta,
            padding: '2px 7px',
            borderRadius: '100px',
            background: '#F4F4F5',
            color: '#18181B',
            fontWeight: panelWeight.bold,
          }}
        >
          {badge}
        </span>
      )}
    </motion.button>
  );

  const body = (
    <div
      style={{
        padding: card ? '0 14px 14px' : '2px 10px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {hint && (
        <div
          style={{
            fontSize: panelText.hint,
            color: 'var(--pl-muted)',
            lineHeight: 1.5,
            margin: '-2px 0 2px',
          }}
        >
          {hint}
        </div>
      )}
      {children}
    </div>
  );

  // Outer wrapper: ONE glass card (when `card`) that contains both the
  // header button and the body. No nested cards — the site-theme arch
  // radius can't sneak in because this wrapper doesn't use the
  // `.pl-panel-section` CSS class or `var(--pl-radius-md)`.
  const wrapperStyle: React.CSSProperties = card
    ? {
        marginBottom: '10px',
        marginInline: '12px',
        borderRadius: PANEL_RADIUS,
        background: PANEL_CARD_BG,
        border: PANEL_CARD_BORDER,
        overflow: 'hidden',
      }
    : {
        marginBottom: '2px',
      };

  return (
    <div style={wrapperStyle}>
      {header}
      {collapsible ? (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              {body}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        body
      )}
    </div>
  );
}

/**
 * Standardized panel root wrapper. Every panel should wrap its
 * PanelSection children with this so padding, gap, and background
 * are consistent across the sidebar.
 */
export function PanelRoot({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        paddingBottom: '24px',
        paddingTop: '4px',
      }}
    >
      {children}
    </div>
  );
}
