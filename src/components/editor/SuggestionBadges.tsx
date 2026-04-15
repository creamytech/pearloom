'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/SuggestionBadges.tsx
// Ambient ✦ sparkle badges anchored to fields where Pear has a
// suggestion ready. Click the badge → opens the AI command bar
// with a tailored prompt so the user can apply the suggestion
// in one step.
//
// Suggestions are heuristic, derived from the live manifest:
//   • Missing venue address (venue set, address empty)
//   • No RSVP deadline set
//   • No dress code set
//   • No FAQs yet (or very few)
//   • No registry entries yet
//   • Missing hero tagline/poetry
//
// Each suggestion targets a DOM element by data-pe-section so the
// badge can float next to the relevant part of the rendered site.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';

interface Suggestion {
  id: string;
  /** CSS selector used to locate the anchor element. */
  selector: string;
  /** Short label shown in the hover tooltip. */
  label: string;
  /** The prompt passed to the Pear command bar. */
  prompt: string;
}

interface Positioned extends Suggestion {
  top: number;
  left: number;
}

export function SuggestionBadges() {
  const { manifest, state } = useEditor();
  const [positioned, setPositioned] = useState<Positioned[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ── Compute live suggestion list from manifest ───────────
  const suggestions = useMemo<Suggestion[]>(() => {
    const list: Suggestion[] = [];
    const logistics = manifest.logistics ?? {};
    const venue = logistics.venue?.trim();
    if (venue && !logistics.venueAddress?.trim()) {
      list.push({
        id: 'venue-address',
        selector: '[data-pe-section="events"], [data-pe-section="travel"]',
        label: `Add address for ${venue}`,
        prompt: `Find and set the venue address for "${venue}". Use update_logistics with venueAddress.`,
      });
    }
    if (!logistics.rsvpDeadline) {
      list.push({
        id: 'rsvp-deadline',
        selector: '[data-pe-section="rsvp"]',
        label: 'Add an RSVP deadline',
        prompt: 'Suggest a sensible RSVP deadline (about 4 weeks before the wedding date) and set it via update_logistics with rsvpDeadline.',
      });
    }
    if (!logistics.dresscode) {
      list.push({
        id: 'dresscode',
        selector: '[data-pe-section="events"]',
        label: 'Add a dress code',
        prompt: 'Suggest a dress code that matches the wedding vibe and set it via update_logistics with dresscode.',
      });
    }
    if ((manifest.faqs?.length ?? 0) < 3) {
      list.push({
        id: 'faqs',
        selector: '[data-pe-section="faqs"], [data-pe-section="faq"]',
        label: 'Pear can write common FAQs',
        prompt: 'Draft 4-6 common wedding FAQs (parking, kids welcome, gift etiquette, etc.) tailored to this wedding. Use the update_faqs action.',
      });
    }
    if ((manifest.registry?.entries?.length ?? 0) === 0) {
      list.push({
        id: 'registry',
        selector: '[data-pe-section="registry"]',
        label: 'Suggest registries',
        prompt: 'Suggest 2-3 popular wedding registry sites that fit this couple\'s style. Use update_registry to add them as entries.',
      });
    }
    if (!manifest.poetry?.heroTagline) {
      list.push({
        id: 'hero-tagline',
        selector: '[data-pe-section="hero"]',
        label: 'Write a poetic hero tagline',
        prompt: 'Draft a 5-8 word poetic hero tagline that matches the vibe. Use update_poetry with heroTagline.',
      });
    }
    return list;
  }, [manifest]);

  // ── Position badges on their anchor elements ─────────────
  // Recomputes on scroll / resize / manifest change.
  useEffect(() => {
    const update = () => {
      const next: Positioned[] = [];
      for (const s of suggestions) {
        const el = document.querySelector<HTMLElement>(s.selector);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        // Anchor the badge to the top-right corner of the section.
        next.push({
          ...s,
          top: r.top + 14,
          left: Math.min(window.innerWidth - 44, r.right - 34),
        });
      }
      setPositioned(next);
    };

    // Initial paint after DOM settles.
    const timer = setTimeout(update, 200);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    // Re-run periodically in case layout shifts after lazy art loads.
    const interval = setInterval(update, 2000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [suggestions, state.device, state.previewZoom]);

  if (typeof document === 'undefined' || positioned.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      {positioned.map((s) => {
        const isHover = hoveredId === s.id;
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: s.top,
              left: s.left,
              zIndex: 150,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              pointerEvents: 'auto',
            }}
            onMouseEnter={() => setHoveredId(s.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <motion.button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('pear-command', {
                  detail: { prompt: s.prompt },
                }));
                setHoveredId(null);
              }}
              animate={{
                boxShadow: isHover
                  ? '0 6px 20px rgba(163,177,138,0.35)'
                  : '0 2px 8px rgba(0,0,0,0.12)',
              }}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.94 }}
              title={s.label}
              aria-label={s.label}
              style={{
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(163,177,138,0.4)',
                borderRadius: '50%',
                background: 'rgba(250,247,242,0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: '#6E8C5C',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {/* Slow pulse so the badge reads as "alive" without being loud. */}
              <motion.span
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'flex' }}
              >
                <Sparkles size={13} />
              </motion.span>
            </motion.button>
            <AnimatePresence>
              {isHover && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    padding: '5px 9px',
                    borderRadius: 8,
                    background: 'rgba(24,24,27,0.92)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    color: '#FAF7F2',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  {s.label}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </AnimatePresence>,
    document.body,
  );
}
