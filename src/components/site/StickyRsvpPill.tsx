'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/StickyRsvpPill.tsx
//
// Persistent bottom-right RSVP pill for the public site. Appears
// once the guest has scrolled past 30% of the page so the nav's
// RSVP link never becomes a dead-end. Links to #rsvp anchor,
// hidden on the RSVP section itself, dismissable for the session,
// colour-matched to the site's accent.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X } from 'lucide-react';

interface Props {
  accent?: string;
  rsvpLabel?: string;
  anchorId?: string;
}

export function StickyRsvpPill({
  accent = 'var(--pl-olive, #5C6B3F)',
  rsvpLabel = 'RSVP',
  anchorId = 'rsvp',
}: Props) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [overRsvp, setOverRsvp] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('pl:sticky-rsvp-dismissed') === '1') {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Scroll-based visibility: show once past 30% of the document.
  useEffect(() => {
    if (dismissed) return;
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop + window.innerHeight;
      const total = h.scrollHeight;
      const ratio = total > 0 ? scrolled / total : 0;
      setShow(ratio > 0.3);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [dismissed]);

  // Hide when the RSVP section itself is on screen — no point showing
  // a jump-to-RSVP pill when the form is already in view.
  useEffect(() => {
    const el = document.getElementById(anchorId);
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOverRsvp(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [anchorId]);

  function handleDismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    try {
      sessionStorage.setItem('pl:sticky-rsvp-dismissed', '1');
    } catch {
      /* ignore */
    }
  }

  const visible = show && !dismissed && !overRsvp;

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href={`#${anchorId}`}
          key="sticky-rsvp"
          initial={{ opacity: 0, y: 20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            bottom: 'clamp(16px, 3vw, 28px)',
            right: 'clamp(16px, 3vw, 28px)',
            zIndex: 90,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 22px 14px 20px',
            minHeight: 48,
            borderRadius: 'var(--pl-radius-full)',
            background: accent,
            color: '#FAF7F2',
            textDecoration: 'none',
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 'clamp(0.82rem, 1.4vw, 0.88rem)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontWeight: 700,
            boxShadow:
              '0 14px 32px color-mix(in oklab, var(--pl-ink, #0E0D0B) 28%, transparent), 0 2px 6px color-mix(in oklab, var(--pl-ink, #0E0D0B) 16%, transparent)',
          }}
        >
          <Mail size={16} />
          <span>{rsvpLabel}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={handleDismiss}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              marginLeft: 4,
              marginRight: -8,
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: 'currentColor',
              borderRadius: '50%',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
