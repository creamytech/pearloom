'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/pearloom/site/SiteToast.tsx
//
// One calm toast for the published site. Listens for the
// `pl-site-toast` window event ({ detail: { message } }) and
// surfaces a single, self-dismissing notice bottom-centre — so a
// guest action (RSVP not yet open, a submit that didn't go
// through) never just silently does nothing.
//
// Mounts as a SIBLING of the themed root in PublishedSiteShell, so
// it takes concrete theme values by prop (the --t-* vars aren't
// inherited here). Honours prefers-reduced-motion via framer's own
// guard upstream; this component keeps its motion gentle.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  theme: Record<string, string>;
  /** A toast that fired while this component's lazy chunk was still
   *  loading (see LazySiteToast) — shown immediately on mount with
   *  the same 5s self-dismiss. */
  initialMessage?: string | null;
}

export function SiteToast({ theme, initialMessage = null }: Props) {
  const [msg, setMsg] = useState<string | null>(initialMessage);

  useEffect(() => {
    let timer: number | undefined;
    if (initialMessage) {
      timer = window.setTimeout(() => setMsg(null), 5000);
    }
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      const message = typeof detail?.message === 'string' ? detail.message.trim() : '';
      if (!message) return;
      setMsg(message);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMsg(null), 5000);
    };
    window.addEventListener('pl-site-toast', onToast);
    return () => {
      window.removeEventListener('pl-site-toast', onToast);
      window.clearTimeout(timer);
    };
  }, [initialMessage]);

  const card = theme['--t-card'] ?? '#FFFEF7';
  const ink = theme['--t-ink'] ?? '#0E0D0B';
  const accent = theme['--t-accent'] ?? '#5C6B3F';
  const line = theme['--t-line'] ?? 'rgba(14,13,11,0.14)';
  const fontBody = theme['--t-body'] ?? 'var(--pl-font-body, system-ui, sans-serif)';

  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          key="site-toast"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setMsg(null)}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 'calc(clamp(18px, 4vw, 32px) + env(safe-area-inset-bottom, 0px))',
            transform: 'translateX(-50%)',
            zIndex: 200,
            maxWidth: 'min(420px, calc(100vw - 32px))',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '13px 18px',
            borderRadius: 14,
            background: card,
            color: ink,
            border: `1px solid ${line}`,
            boxShadow: '0 16px 40px rgba(14,13,11,0.22), 0 2px 8px rgba(14,13,11,0.12)',
            fontFamily: fontBody,
            fontSize: 13.5,
            lineHeight: 1.45,
            cursor: 'pointer',
          }}
        >
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
          <span>{msg}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
