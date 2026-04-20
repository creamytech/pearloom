'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelSection.tsx
// Canonical collapsible section wrapper for editor panels.
//
// Editorial chrome (v2): Each section is an editorial "card" with
// a mono uppercase eyebrow (tracked 0.22em), a Fraunces italic
// sentence-case title, and a gold hairline separating the header
// from the body. The card itself sits on cream paper (or the warm
// dark surface in dark mode) with a near-hairline border.
//
// Visual rule: one card wraps BOTH the header and the body — the
// header is never a floating title above the card. Uses hard-coded
// radii so the editor chrome never inherits the site's
// `elementShape` override.
// ─────────────────────────────────────────────────────────────

import { useState, type ReactNode, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import {
  panelFont,
  panelText,
  panelWeight,
  panelTracking,
  panelSection,
} from './panel-tokens';

export interface PanelSectionProps {
  /** Sentence-case title rendered in Fraunces italic. */
  title: string;
  /** Optional mono eyebrow rendered ABOVE the title. */
  eyebrow?: string;
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
   * cream-paper card. Pass `false` to get an unstyled container for
   * sections whose children already render their own chrome (e.g. a
   * block-list Reorder group).
   */
  card?: boolean;
  /** Panel-level children. */
  children: ReactNode;
}

const PANEL_RADIUS = panelSection.cardRadius;

/**
 * A single collapsible section with:
 *   - mono uppercase eyebrow @ 0.58rem / 700 / 0.22em tracking
 *   - Fraunces italic sentence-case title (weight 400)
 *   - gold hairline separator between header and body
 *   - chevron that rotates 90° when open
 *   - ONE rounded card wrapping the full header+body
 *   - spring-based height animation
 *
 * Usage:
 *   <PanelSection title="Colors" icon={Palette}>
 *     ...
 *   </PanelSection>
 */
export function PanelSection({
  title,
  eyebrow,
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

  const headerInner = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1,
        minWidth: 0,
      }}
    >
      {eyebrow && (
        <span
          style={{
            fontFamily: panelFont.mono,
            fontSize: panelText.meta,
            fontWeight: panelWeight.bold,
            letterSpacing: panelTracking.widest,
            textTransform: 'uppercase',
            color: 'var(--pl-chrome-text-faint)',
            lineHeight: 1,
          }}
        >
          {eyebrow}
        </span>
      )}
      <span
        style={{
          fontFamily: panelFont.display,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: panelText.sectionTitle,
          lineHeight: 1.15,
          color: isOpen ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-soft)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </span>
    </div>
  );

  const header = (
    <motion.button
      type="button"
      onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      whileHover={
        collapsible
          ? { backgroundColor: 'color-mix(in srgb, var(--pl-chrome-accent) 6%, transparent)' }
          : undefined
      }
      whileTap={collapsible ? { scale: 0.995 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: eyebrow ? 'flex-start' : 'center',
        gap: '10px',
        padding: card ? '14px 16px 12px' : '10px 12px 8px',
        borderRadius: card ? `${PANEL_RADIUS} ${PANEL_RADIUS} 0 0` : '6px',
        border: 'none',
        background: 'transparent',
        cursor: collapsible ? 'pointer' : 'default',
        color: 'var(--pl-chrome-text)',
        textAlign: 'left',
      }}
    >
      {collapsible && (
        <ChevronRight
          size={12}
          strokeWidth={1.75}
          style={{
            transform: isOpen ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
            color: 'var(--pl-chrome-text-muted)',
            flexShrink: 0,
            marginTop: eyebrow ? '14px' : '3px',
          }}
        />
      )}
      {Icon && (
        <Icon
          size={13}
          strokeWidth={1.5}
          color="var(--pl-chrome-accent)"
          style={{
            flexShrink: 0,
            marginTop: eyebrow ? '13px' : '2px',
          }}
        />
      )}
      {headerInner}
      {badge !== undefined && (
        <span
          style={{
            fontFamily: panelFont.mono,
            fontSize: panelText.meta,
            padding: '3px 8px',
            borderRadius: 'var(--pl-radius-full)',
            background: 'var(--pl-chrome-accent-soft)',
            color: 'var(--pl-chrome-accent)',
            fontWeight: panelWeight.bold,
            letterSpacing: panelTracking.wide,
            flexShrink: 0,
            alignSelf: eyebrow ? 'flex-start' : 'center',
            marginTop: eyebrow ? '14px' : 0,
            lineHeight: 1.2,
          }}
        >
          {badge}
        </span>
      )}
    </motion.button>
  );

  const body = (
    <>
      {/* Gold hairline — signature editorial rule between header and body */}
      <div
        style={{
          height: '1px',
          margin: card ? '0 16px' : '0 12px',
          background:
            'color-mix(in srgb, var(--pl-chrome-accent) 24%, transparent)',
        }}
      />
      <div
        style={{
          padding: card ? '14px 16px 16px' : '10px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {hint && (
          <div
            style={{
              fontFamily: panelFont.body,
              fontSize: panelText.hint,
              color: 'var(--pl-chrome-text-muted)',
              lineHeight: 1.55,
              margin: '-2px 0 0',
              fontStyle: 'italic',
            }}
          >
            {hint}
          </div>
        )}
        {children}
      </div>
    </>
  );

  const wrapperStyle: React.CSSProperties = card
    ? {
        marginBottom: panelSection.stackGap,
        marginInline: '10px',
        borderRadius: PANEL_RADIUS,
        background: 'var(--pl-chrome-surface)',
        border: '1px solid var(--pl-chrome-border)',
        overflow: 'hidden',
        // Warm editorial shadow — brown-tinted, never pure black
        boxShadow: 'var(--pl-chrome-shadow)',
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
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
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
        paddingBottom: panelSection.rootPaddingBottom,
        paddingTop: '10px',
      }}
    >
      {children}
    </div>
  );
}
