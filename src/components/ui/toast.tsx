'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────

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

// ─── Context ──────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Variant styles ───────────────────────────────────────────

const VARIANT_CLASS: Record<ToastType, string> = {
  success: 'bg-[rgba(163,177,138,0.96)]',
  error:   'bg-[rgba(185,28,28,0.94)]',
  info:    'bg-[rgba(43,43,43,0.94)]',
};

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') return <Check size={15} strokeWidth={2.5} />;
  if (type === 'error')   return <AlertTriangle size={15} strokeWidth={2.5} />;
  return <Info size={15} strokeWidth={2.5} />;
}

const MAX_VISIBLE = 3;

// ─── Single toast ─────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      key={toast.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96, transition: { duration: 0.17 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2.5 pointer-events-auto',
        'rounded-xl px-3.5 py-2.5',
        'text-white text-[0.85rem] font-body leading-snug',
        'min-w-[220px] max-w-[360px]',
        'shadow-[0_4px_20px_rgba(0,0,0,0.18)]',
        'backdrop-blur-md',
        VARIANT_CLASS[toast.type],
      )}
    >
      {/* Icon */}
      <span className="flex-shrink-0 flex items-center justify-center w-5 h-5">
        <ToastIcon type={toast.type} />
      </span>

      {/* Message */}
      <span className="flex-1">{toast.message}</span>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className={cn(
          'flex-shrink-0 flex items-center justify-center',
          'w-5 h-5 rounded cursor-pointer',
          'text-white/70 hover:text-white',
          'bg-transparent border-0',
          'transition-colors duration-150',
        )}
      >
        <X size={13} strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}

// ─── Provider ─────────────────────────────────────────────────

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
        const next = prev.slice(-(MAX_VISIBLE - 1));
        prev.slice(0, prev.length - (MAX_VISIBLE - 1)).forEach((t) => dismiss(t.id));
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

      {/* Fixed notification stack */}
      <div
        aria-label="Notifications"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none"
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

// ─── Hook ─────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
}
