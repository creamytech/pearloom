'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/PanelEmptyState.tsx
// A restrained empty state for panels that have no items yet.
// Optional primary action button and a "Pear" shortcut that fires
// the 'pear-command' event the editor listens for — so every empty
// state can seed an AI conversation with one tap.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import {
  panelFont,
  panelText,
  panelTracking,
  panelWeight,
  panelLineHeight,
} from './panel-tokens';

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
        padding: '28px 20px',
        border: '1px dashed color-mix(in srgb, var(--pl-chrome-accent) 30%, transparent)',
        borderRadius: 'var(--pl-radius-lg)',
        background:
          'color-mix(in srgb, var(--pl-chrome-accent) 4%, var(--pl-chrome-bg))',
        gap: 12,
      }}
    >
      {icon != null && (
        <div
          aria-hidden="true"
          style={{
            fontSize: 22,
            lineHeight: 1,
            color: 'var(--pl-chrome-accent)',
            opacity: 0.8,
          }}
        >
          {icon}
        </div>
      )}

      <div
        style={{
          fontFamily: panelFont.display,
          fontStyle: 'italic',
          fontSize: panelText.sectionTitle,
          fontWeight: panelWeight.regular,
          lineHeight: panelLineHeight.tight,
          letterSpacing: '-0.01em',
          color: 'var(--pl-chrome-text)',
        }}
      >
        {title}
      </div>

      {description && (
        <p
          style={{
            margin: 0,
            fontFamily: panelFont.body,
            fontSize: panelText.hint,
            lineHeight: panelLineHeight.normal,
            color: 'var(--pl-chrome-text-muted)',
            maxWidth: 260,
          }}
        >
          {description}
        </p>
      )}

      {(action || pearPrompt) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              style={{
                fontFamily: panelFont.mono,
                fontSize: panelText.chip,
                fontWeight: panelWeight.bold,
                letterSpacing: panelTracking.wider,
                textTransform: 'uppercase',
                padding: '8px 16px',
                borderRadius: 'var(--pl-radius-full)',
                border: '1px solid var(--pl-chrome-accent)',
                background: 'var(--pl-chrome-accent)',
                color: 'var(--pl-chrome-accent-ink)',
                cursor: 'pointer',
                transition: 'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
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
                fontFamily: panelFont.mono,
                fontSize: panelText.chip,
                fontWeight: panelWeight.semibold,
                letterSpacing: panelTracking.wider,
                textTransform: 'uppercase',
                padding: '8px 14px',
                borderRadius: 'var(--pl-radius-full)',
                border: '1px solid var(--pl-chrome-border)',
                background: 'transparent',
                color: 'var(--pl-chrome-text-soft)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 11, color: 'var(--pl-chrome-accent)' }}>{'\u2726'}</span>
              Ask Pear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
