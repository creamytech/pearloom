'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ui/confirm-dialog.tsx
// Custom confirm/alert/prompt dialogs — replaces window.confirm(),
// window.alert(), window.prompt() with glass modal dialogs.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, createContext, useContext, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, HelpCircle, X } from 'lucide-react';
import { Button } from './button';

// ── Types ────────────────────────────────────────────────────

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
}

interface AlertOptions {
  title: string;
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

type DialogState =
  | { type: 'confirm'; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { type: 'prompt'; options: PromptOptions; resolve: (v: string | null) => void }
  | { type: 'alert'; options: AlertOptions; resolve: () => void }
  | null;

// ── Context ──────────────────────────────────────────────────

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  alert: (options: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue>({
  confirm: () => Promise.resolve(false),
  prompt: () => Promise.resolve(null),
  alert: () => Promise.resolve(),
});

export function useDialog() {
  return useContext(DialogContext);
}

// ── Provider ─────────────────────────────────────────────────

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ type: 'confirm', options, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setDialog({ type: 'prompt', options, resolve });
    });
  }, []);

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setDialog({ type: 'alert', options, resolve });
    });
  }, []);

  const close = () => {
    if (dialog?.type === 'confirm') dialog.resolve(false);
    if (dialog?.type === 'prompt') dialog.resolve(null);
    if (dialog?.type === 'alert') dialog.resolve();
    setDialog(null);
  };

  const handleConfirm = () => {
    if (dialog?.type === 'confirm') { dialog.resolve(true); setDialog(null); }
    if (dialog?.type === 'prompt') {
      dialog.resolve(inputRef.current?.value ?? null);
      setDialog(null);
    }
    if (dialog?.type === 'alert') { dialog.resolve(); setDialog(null); }
  };

  const alertIcon = dialog?.type === 'alert' ? (
    dialog.options.variant === 'success' ? <CheckCircle size={28} className="text-[var(--pl-olive)]" /> :
    dialog.options.variant === 'warning' ? <AlertTriangle size={28} className="text-[var(--pl-gold)]" /> :
    dialog.options.variant === 'error' ? <AlertTriangle size={28} className="text-[var(--pl-warning)]" /> :
    <HelpCircle size={28} className="text-[var(--pl-olive)]" />
  ) : null;

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}

      <AnimatePresence>
        {dialog && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              style={{
                position: 'fixed', inset: 0, zIndex: 'var(--z-max)',
                background: 'rgba(250,247,242,0.8)',
                backdropFilter: 'blur(8px)',
              }}
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'fixed',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 'var(--z-max)',
                width: '100%', maxWidth: '400px',
                padding: '28px',
                borderRadius: 'var(--pl-radius-2xl)',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 24px 60px rgba(43,30,20,0.12)',
              } as React.CSSProperties}
            >
              {/* Close button */}
              <button
                onClick={close}
                style={{
                  position: 'absolute', top: '12px', right: '12px',
                  width: '28px', height: '28px', borderRadius: 'var(--pl-radius-md)',
                  border: 'none', background: 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--pl-muted)',
                }}
              >
                <X size={14} />
              </button>

              <div style={{ textAlign: 'center' }}>
                {/* Icon */}
                {dialog.type === 'alert' && (
                  <div style={{ marginBottom: '16px' }}>
                    {alertIcon}
                  </div>
                )}
                {dialog.type === 'confirm' && (
                  <div style={{
                    width: '48px', height: '48px', borderRadius: 'var(--pl-radius-xl)',
                    background: dialog.options.variant === 'danger' ? 'rgba(196,93,62,0.1)' : 'var(--pl-olive-mist)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    {dialog.options.variant === 'danger'
                      ? <AlertTriangle size={22} className="text-[var(--pl-warning)]" />
                      : <HelpCircle size={22} className="text-[var(--pl-olive)]" />
                    }
                  </div>
                )}

                {/* Title */}
                <h3 style={{
                  fontSize: '1.15rem', fontWeight: 600,
                  fontFamily: 'var(--pl-font-heading)',
                  color: 'var(--pl-ink)',
                  marginBottom: '8px',
                }}>
                  {dialog.type === 'confirm' ? dialog.options.title :
                   dialog.type === 'prompt' ? dialog.options.title :
                   dialog.options.title}
                </h3>

                {/* Message */}
                <p style={{
                  fontSize: '0.88rem', color: 'var(--pl-muted)',
                  lineHeight: 1.6, marginBottom: '20px',
                }}>
                  {dialog.type === 'confirm' ? dialog.options.message :
                   dialog.type === 'prompt' ? dialog.options.message :
                   dialog.options.message}
                </p>

                {/* Prompt input */}
                {dialog.type === 'prompt' && (
                  <input
                    ref={inputRef}
                    type="text"
                    defaultValue={dialog.options.defaultValue || ''}
                    placeholder={dialog.options.placeholder || ''}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                    className="pl-focus-glow"
                    style={{
                      width: '100%', padding: '10px 14px',
                      borderRadius: 'var(--pl-radius-sm)',
                      border: '1.5px solid var(--pl-divider)',
                      fontSize: '0.92rem', color: 'var(--pl-ink)',
                      background: 'white', marginBottom: '20px',
                      outline: 'none',
                    }}
                  />
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  {dialog.type !== 'alert' && (
                    <Button variant="secondary" size="md" className="flex-1" onClick={close}>
                      {dialog.type === 'confirm'
                        ? (dialog.options.cancelLabel || 'Cancel')
                        : 'Cancel'}
                    </Button>
                  )}
                  <Button
                    variant={dialog.type === 'confirm' && dialog.options.variant === 'danger' ? 'danger' : 'primary'}
                    size="md"
                    className="flex-1"
                    onClick={handleConfirm}
                  >
                    {dialog.type === 'confirm'
                      ? (dialog.options.confirmLabel || 'Confirm')
                      : dialog.type === 'prompt'
                        ? (dialog.options.confirmLabel || 'OK')
                        : 'OK'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}
