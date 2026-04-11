'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelSection.tsx
// Canonical collapsible section wrapper for editor panels.
// Replaces the 9 hand-rolled section containers with a single
// consistent API. Visually matches SidebarSection but works
// standalone (no sidebar scaffold required).
// ─────────────────────────────────────────────────────────────

import { useState, type ReactNode, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { panelText, panelSection, panelWeight, panelTracking } from './panel-tokens';

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
   * When true, wrap the children in the standard glass card (14px
   * radius, translucent bg, olive-tinted border, 14px padding).
   * Set to false if the children render their own full-width chrome
   * (e.g. a gallery grid or a long list). Default true.
   */
  card?: boolean;
  /** Panel-level children. */
  children: ReactNode;
}

/**
 * A single consistent collapsible section with:
 *   - uppercase eyebrow title @ 0.6rem / 700 / 0.1em tracking
 *   - chevron that rotates 90° when open
 *   - olive-tinted glass card body
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
      whileHover={collapsible ? { backgroundColor: 'rgba(163,177,138,0.06)' } : undefined}
      whileTap={collapsible ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        borderRadius: 'var(--pl-radius-sm)',
        border: 'none',
        background: 'transparent',
        cursor: collapsible ? 'pointer' : 'default',
        color: 'var(--pl-ink-soft)',
      }}
    >
      {collapsible && (
        <ChevronRight
          size={10}
          style={{
            transform: isOpen ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
            color: isOpen ? 'var(--pl-olive)' : 'var(--pl-muted)',
            flexShrink: 0,
          }}
        />
      )}
      {Icon && <Icon size={12} color="var(--pl-olive)" />}
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
            background: 'rgba(163,177,138,0.12)',
            color: 'var(--pl-olive-deep)',
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
        padding: '2px 10px 12px',
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
            margin: '-4px 0 4px',
          }}
        >
          {hint}
        </div>
      )}
      {card ? (
        <div
          style={{
            borderRadius: panelSection.cardRadius,
            background: panelSection.cardBg,
            border: panelSection.cardBorder,
            padding: panelSection.cardPadding,
          }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );

  return (
    <div className="pl-panel-section" style={{ marginBottom: '2px' }}>
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
        gap: '2px',
        paddingBottom: panelSection.rootPaddingBottom,
      }}
    >
      {children}
    </div>
  );
}
