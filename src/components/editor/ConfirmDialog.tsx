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
            transition={{ duration: 0.12 }}
            onClick={onCancel}
            style={{
              position: 'fixed', inset: 0, zIndex: 3000,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(4px)',
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
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', top: '30%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 3001,
              width: '100%', maxWidth: 360,
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: 12,
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
              padding: '18px 20px',
            }}
          >
            <h2
              id="pl-confirm-title"
              style={{
                margin: 0, fontSize: '1rem', fontWeight: 700,
                color: '#18181B', lineHeight: 1.3,
              }}
            >
              {title}
            </h2>
            {message && (
              <p
                id="pl-confirm-message"
                style={{
                  margin: '6px 0 0', fontSize: '0.82rem',
                  color: '#52525B', lineHeight: 1.45,
                }}
              >
                {message}
              </p>
            )}
            <div style={{
              marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8,
            }}>
              <button
                ref={cancelBtnRef}
                onClick={onCancel}
                style={{
                  padding: '7px 14px', borderRadius: 8,
                  border: '1px solid #E4E4E7',
                  background: '#FFFFFF', color: '#18181B',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={onConfirm}
                style={{
                  padding: '7px 14px', borderRadius: 8,
                  border: 'none',
                  background: danger ? '#dc2626' : '#18181B',
                  color: '#FFFFFF',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
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
