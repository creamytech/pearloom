'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/ConfirmDialog.tsx
// Accessible confirm dialog — replaces native confirm() in editor
// components (item 83). Announced to screen readers via role="alertdialog"
// and aria-modal, with focus trapped to the action buttons.
//
// For editor components that already have an undoable-toast pattern
// (EditorCanvas.tsx), prefer that. This dialog is for cases where
// restore-on-undo isn't feasible (multi-block delete, context-menu
// delete, hover-toolbar delete) because the selection/hover state
// is lost the moment the toast is dismissed.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button on open + close on Escape + trap Tab between
  // the two buttons so screen readers announce + keyboard users can act.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 40);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === 'Tab') {
        // Simple 2-button trap
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === cancelBtnRef.current) {
            e.preventDefault();
            confirmBtnRef.current?.focus();
          }
        } else {
          if (active === confirmBtnRef.current) {
            e.preventDefault();
            cancelBtnRef.current?.focus();
          }
        }
      }
      if (e.key === 'Enter' && document.activeElement === confirmBtnRef.current) {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onConfirm, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={onCancel}
            style={{
              position: 'fixed', inset: 0, zIndex: 3000,
              background: 'rgba(22,16,6,0.55)',
              backdropFilter: 'blur(6px)',
            }}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="pl-confirm-title"
            aria-describedby={message ? 'pl-confirm-message' : undefined}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed', top: '30%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 3001,
              width: '100%', maxWidth: 380,
              background: 'linear-gradient(180deg, #FDFAF0 0%, #F3EFE7 100%)',
              borderTop: `2px solid ${danger ? 'rgba(139,45,45,0.65)' : 'rgba(193,154,75,0.55)'}`,
              borderLeft: '1px solid rgba(193,154,75,0.22)',
              borderRight: '1px solid rgba(193,154,75,0.22)',
              borderBottom: '1px solid rgba(193,154,75,0.22)',
              borderRadius: 'var(--pl-radius-xs)',
              boxShadow: '0 28px 72px rgba(22,16,6,0.32), 0 2px 10px rgba(22,16,6,0.08)',
              padding: '22px 26px 20px',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <span style={{
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: danger ? 'rgba(139,45,45,0.85)' : 'rgba(193,154,75,0.85)',
              }}>
                {danger ? 'Heads up' : 'Confirm'}
              </span>
              <span style={{
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: '0.28em',
                color: 'rgba(193,154,75,0.65)',
              }}>
                № 00
              </span>
            </div>
            <h2
              id="pl-confirm-title"
              style={{
                margin: 0,
                fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                fontStyle: 'italic',
                fontSize: '1.4rem',
                fontWeight: 400,
                color: '#18181B',
                lineHeight: 1.12,
                letterSpacing: '-0.005em',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              {title}
            </h2>
            {message && (
              <p
                id="pl-confirm-message"
                style={{
                  margin: '10px 0 0',
                  fontSize: '0.82rem',
                  color: '#52525B',
                  lineHeight: 1.5,
                  fontFamily: 'var(--pl-font-body, inherit)',
                }}
              >
                {message}
              </p>
            )}
            <div style={{
              marginTop: 22,
              paddingTop: 14,
              borderTop: '1px solid rgba(193,154,75,0.28)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}>
              <button
                ref={cancelBtnRef}
                onClick={onCancel}
                style={{
                  padding: '9px 16px',
                  borderRadius: 'var(--pl-radius-xs)',
                  border: '1px solid rgba(193,154,75,0.45)',
                  background: 'transparent',
                  color: '#18181B',
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'background 180ms ease, border-color 180ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(193,154,75,0.10)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(193,154,75,0.75)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(193,154,75,0.45)';
                }}
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={onConfirm}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--pl-radius-xs)',
                  border: 'none',
                  background: danger ? '#C6563D' : '#18181B',
                  color: '#FDFAF0',
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: danger
                    ? '0 0 0 3px rgba(139,45,45,0.22)'
                    : '0 0 0 3px rgba(193,154,75,0.22)',
                  transition: 'box-shadow 180ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = danger
                    ? '0 0 0 4px rgba(139,45,45,0.32)'
                    : '0 0 0 4px rgba(193,154,75,0.32)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = danger
                    ? '0 0 0 3px rgba(139,45,45,0.22)'
                    : '0 0 0 3px rgba(193,154,75,0.22)';
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
