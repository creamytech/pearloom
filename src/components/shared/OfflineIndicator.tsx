'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/shared/OfflineIndicator.tsx
// Shows a banner when offline, syncing, or just reconnected.
// Integrates with the offline queue to display pending actions.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, Loader2, CheckCircle2 } from 'lucide-react';
import {
  isOnline,
  registerServiceWorker,
  getPendingActions,
  processQueue,
} from '@/lib/offline';

type BannerState = 'hidden' | 'offline' | 'syncing' | 'synced';

export function OfflineIndicator() {
  const [state, setState] = useState<BannerState>('hidden');
  const [pendingCount, setPendingCount] = useState(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll pending actions while offline
  const refreshPendingCount = useCallback(async () => {
    try {
      const actions = await getPendingActions();
      setPendingCount(actions.length);
    } catch {
      // IndexedDB unavailable — ignore
    }
  }, []);

  // Attempt to sync queued actions when back online
  const syncPending = useCallback(async () => {
    const actions = await getPendingActions();
    if (actions.length === 0) {
      setState('synced');
      return;
    }

    setPendingCount(actions.length);
    setState('syncing');

    await processQueue();

    // Refresh the count after processing
    const remaining = await getPendingActions();
    setPendingCount(remaining.length);

    setState('synced');
  }, []);

  useEffect(() => {
    // Register the service worker on mount
    registerServiceWorker();

    const goOffline = () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      setState('offline');
      refreshPendingCount();
    };

    const goOnline = () => {
      syncPending().then(() => {
        // Auto-dismiss the "synced" banner after 3 seconds
        dismissTimer.current = setTimeout(() => {
          setState('hidden');
        }, 3000);
      });
    };

    // Listen for sync-complete messages from the service worker
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        refreshPendingCount();
        setState('synced');
        dismissTimer.current = setTimeout(() => setState('hidden'), 3000);
      }
    };

    // Check initial state
    if (!isOnline()) {
      setState('offline');
      refreshPendingCount();
    }

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    // Periodically refresh pending count while offline
    const interval = setInterval(() => {
      if (!isOnline()) refreshPendingCount();
    }, 5000);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
      clearInterval(interval);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [refreshPendingCount, syncPending]);

  // ── Render ───────────────────────────────────────────────

  const bgColor: Record<Exclude<BannerState, 'hidden'>, string> = {
    offline:  'rgba(220,38,38,0.85)',
    syncing:  'rgba(196,169,106,0.9)',
    synced:   'rgba(163,177,138,0.9)',
  };

  const content: Record<Exclude<BannerState, 'hidden'>, React.ReactNode> = {
    offline: (
      <>
        <WifiOff size={14} />
        You&apos;re offline
        {pendingCount > 0
          ? ` — ${pendingCount} pending change${pendingCount !== 1 ? 's' : ''} will sync when you reconnect`
          : ' — changes will sync when you reconnect'}
      </>
    ),
    syncing: (
      <>
        <Loader2 size={14} className="animate-spin" />
        Syncing {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}...
      </>
    ),
    synced: (
      <>
        <CheckCircle2 size={14} />
        All changes synced
      </>
    ),
  };

  return (
    <AnimatePresence>
      {state !== 'hidden' && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'fixed',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 'var(--z-max)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--pl-radius-full)',
            background: bgColor[state],
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: 'white',
            fontSize: '0.78rem',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
          } as React.CSSProperties}
        >
          {content[state]}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
