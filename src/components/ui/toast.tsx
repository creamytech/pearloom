'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ShowToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Styling helpers ──────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastType, React.CSSProperties> = {
  success: { background: 'rgba(163,177,138,0.95)' },
  error:   { background: 'rgba(185,28,28,0.93)' },
  info:    { background: 'rgba(43,43,43,0.93)' },
};

const MAX_VISIBLE = 3;

// ─── Individual Toast ─────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const Icon =
    toast.type === 'success' ? Check : toast.type === 'error' ? X : Info;

  return (
    <motion.div
      layout
      key={toast.id}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        ...VARIANT_STYLES[toast.type],
        color: '#fff',
        borderRadius: 12,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '10px 14px 10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 240,
        maxWidth: 380,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        fontFamily: 'var(--eg-font-body, system-ui, sans-serif)',
        fontSize: 14,
        lineHeight: 1.4,
        pointerEvents: 'auto',
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <span
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
        }}
      >
        <Icon size={16} strokeWidth={2.5} />
      </span>

      {/* Message */}
      <span style={{ flex: 1 }}>{toast.message}</span>

      {/* Close button */}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.75)',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = '#fff')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color =
            'rgba(255,255,255,0.75)')
        }
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, type = 'info', duration = 3500 }: ShowToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = { id, message, type, duration };

      setToasts((prev) => {
        // Keep only the latest MAX_VISIBLE - 1 existing toasts before appending
        const next = prev.slice(-(MAX_VISIBLE - 1));
        // Dismiss any that got evicted
        prev
          .slice(0, prev.length - (MAX_VISIBLE - 1))
          .forEach((t) => dismiss(t.id));
        return [...next, item];
      });

      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const visible = toasts.slice(-MAX_VISIBLE);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Portal-like fixed container */}
      <div
        aria-label="Notifications"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence mode="sync" initial={false}>
          {visible.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}
