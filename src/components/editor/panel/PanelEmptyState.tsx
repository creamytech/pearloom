'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelEmptyState.tsx
// A restrained empty state for panels that have no items yet.
// Optional primary action button and a "Pear" shortcut that fires
// the 'pear-command' event the editor listens for — so every empty
// state can seed an AI conversation with one tap.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import { panelText, panelWeight, panelLineHeight } from './panel-tokens';

export interface PanelEmptyStateProps {
  /** Short glyph/icon element (emoji, svg, dot). */
  icon?: ReactNode;
  /** Plain-language headline describing what's missing. */
  title: string;
  /** One-line hint explaining what to do next. */
  description?: string;
  /** Primary action — rendered as a filled button. */
  action?: { label: string; onClick: () => void };
  /**
   * Optional Pear shortcut — dispatches `pear-command` on window.
   * Omit to hide the shortcut row entirely.
   */
  pearPrompt?: string;
}

export function PanelEmptyState({
  icon,
  title,
  description,
  action,
  pearPrompt,
}: PanelEmptyStateProps) {
  const firePear = () => {
    if (!pearPrompt) return;
    window.dispatchEvent(
      new CustomEvent('pear-command', { detail: { prompt: pearPrompt } }),
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px 16px',
        border: '1px dashed #E4E4E7',
        borderRadius: '10px',
        background: '#FAFAFA',
        gap: 10,
      }}
    >
      {icon != null && (
        <div
          aria-hidden="true"
          style={{
            fontSize: 24,
            lineHeight: 1,
            color: '#A1A1AA',
            filter: 'grayscale(1)',
            opacity: 0.85,
          }}
        >
          {icon}
        </div>
      )}

      <div
        style={{
          fontSize: panelText.itemTitle,
          fontWeight: panelWeight.semibold,
          lineHeight: panelLineHeight.tight,
          color: '#27272A',
        }}
      >
        {title}
      </div>

      {description && (
        <p
          style={{
            margin: 0,
            fontSize: panelText.hint,
            lineHeight: panelLineHeight.normal,
            color: '#71717A',
            maxWidth: 260,
          }}
        >
          {description}
        </p>
      )}

      {(action || pearPrompt) && (
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              style={{
                fontSize: panelText.body,
                fontWeight: panelWeight.semibold,
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid #18181B',
                background: '#18181B',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {action.label}
            </button>
          )}
          {pearPrompt && (
            <button
              type="button"
              onClick={firePear}
              style={{
                fontSize: panelText.body,
                fontWeight: panelWeight.medium,
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #E4E4E7',
                background: '#FFFFFF',
                color: '#3F3F46',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 11 }}>{'\u2728'}</span>
              Ask Pear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
