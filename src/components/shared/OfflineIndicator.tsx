'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/shared/OfflineIndicator.tsx
// Shows a banner when the user loses network connectivity
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    };

    // Check initial state
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {(isOffline || justReconnected) && (
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
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '100px',
            background: isOffline
              ? 'rgba(220,38,38,0.9)'
              : 'rgba(163,177,138,0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'white',
            fontSize: '0.78rem',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
          } as React.CSSProperties}
        >
          {isOffline ? (
            <>
              <WifiOff size={14} />
              You&apos;re offline — changes won&apos;t save
            </>
          ) : (
            <>
              <Wifi size={14} />
              Back online
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
