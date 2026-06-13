'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/StickyRsvpPill.tsx
//
// Persistent bottom-right RSVP pill for the public site. Appears
// once the guest has scrolled past 30% of the page so the nav's
// RSVP link never becomes a dead-end. Links to #rsvp anchor,
// hidden on the RSVP section itself, dismissable for the session,
// colour-matched to the site's accent.
//
// Bottom-right corner stacking policy (shared with
// pearloom/site/GuestPearChat.tsx + pearloom/site/DayOfBroadcastDock.tsx):
//   GuestPearChat      z 160  (topmost — open chat panel)
//   StickyRsvpPill     z 150  (this file)
//   DayOfBroadcastDock z 140
// When the broadcast dock is OPEN on viewports < 480px the pill
// hides entirely — day-of broadcasting is the priority surface and
// there isn't room for both. The dock announces open/close via the
// `pearloom:broadcast-dock` window event.
//
// Occlusion guard: the pill also fades out when the guest reaches
// the page footer (IntersectionObserver on the site's <footer>,
// with a near-bottom scroll fallback for renderers without one) so
// it never sits on top of the last tappable rows (registry chips,
// FAQ items) at the end of the page.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X } from 'lucide-react';

interface Props {
  accent?: string;
  /** Foreground on the accent fill. Defaults to the theme's RSVP
   *  ink with a warm-cream fallback. */
  accentInk?: string;
  rsvpLabel?: string;
  anchorId?: string;
}

/* Defaults bind to the live theme tokens (--t-rsvp / --t-accent)
   with the brand olive as the final fallback, so the pill wears the
   site's palette when it renders inside the themed root — and stays
   on-brand when it doesn't. PublishedSiteShell mounts the pill as a
   SIBLING of the themed root (vars not inherited there), so it also
   passes concrete theme values via props. */
export function StickyRsvpPill({
  accent = 'var(--t-rsvp, var(--t-accent, var(--pl-olive, #5C6B3F)))',
  accentInk = 'var(--t-rsvp-ink, var(--t-paper, #FDFAF0))',
  rsvpLabel = 'RSVP',
  anchorId = 'rsvp',
}: Props) {
  const [show, setShow] = useState(false);
  // Lazy useState init so render is pure and the pill doesn't
  // flash before sessionStorage is read.
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return sessionStorage.getItem('pl:sticky-rsvp-dismissed') === '1'; }
    catch { return false; }
  });
  const [overRsvp, setOverRsvp] = useState(false);
  const [nearFooter, setNearFooter] = useState(false);
  const [scrollingDown, setScrollingDown] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [smallViewport, setSmallViewport] = useState(false);

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
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setOverRsvp(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [anchorId]);

  // Occlusion guard: fade out when the footer scrolls into view so
  // the pill never covers the page's last tappable content (registry
  // chips, FAQ rows). ThemedSiteRenderer ships a real <footer>; the
  // redesign renderer doesn't, so we fall back to "within 160px of
  // the document bottom" via the same scroll-listener pattern.
  useEffect(() => {
    const footer = typeof IntersectionObserver === 'undefined' ? null : document.querySelector('footer');
    if (footer) {
      const observer = new IntersectionObserver(
        ([entry]) => setNearFooter(entry.isIntersecting),
        { threshold: 0 },
      );
      observer.observe(footer);
      return () => observer.disconnect();
    }
    const onScroll = () => {
      const h = document.documentElement;
      setNearFooter(h.scrollHeight - (h.scrollTop + window.innerHeight) < 160);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Corner coordination (see stacking-policy comment above): the
  // day-of broadcast dock announces its open state; on <480px
  // viewports the open dock owns the corner and the pill yields.
  useEffect(() => {
    const onDock = (e: Event) =>
      setDockOpen(Boolean((e as CustomEvent<{ open?: boolean }>).detail?.open));
    window.addEventListener('pearloom:broadcast-dock', onDock);
    return () => window.removeEventListener('pearloom:broadcast-dock', onDock);
  }, []);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 479px)');
    const update = () => setSmallViewport(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Mid-page occlusion guard (phones): the pill covers card text
  // while a guest is actively reading downward, so hide on
  // scroll-DOWN and return on scroll-up or after 900ms idle —
  // the standard FAB pattern. Desktop keeps the pill steady.
  useEffect(() => {
    if (!window.matchMedia('(max-width: 640px)').matches) return;
    let lastY = window.scrollY;
    let idleTimer: number | undefined;
    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      lastY = y;
      if (goingDown) setScrollingDown(true);
      else if (goingUp) setScrollingDown(false);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setScrollingDown(false), 900);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(idleTimer);
    };
  }, []);

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

  const visible =
    show && !dismissed && !overRsvp && !nearFooter && !scrollingDown &&
    !(dockOpen && smallViewport);

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
            bottom: 'calc(clamp(16px, 3vw, 28px) + env(safe-area-inset-bottom, 0px))',
            right: 'clamp(16px, 3vw, 28px)',
            /* Corner stacking policy: chat 160 > pill 150 > dock 140. */
            zIndex: 150,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 22px 14px 20px',
            minHeight: 48,
            borderRadius: 'var(--pl-radius-full)',
            background: accent,
            color: accentInk,
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
