'use client';

// ─────────────────────────────────────────────────────────────
// PearNudges — small floating Pear in the editor topbar that
// surfaces a contextual tip without the host opening the
// companion. Listens to manifest changes (passive — no API
// calls) and computes a rule-based nudge that points to the
// most useful next step. Hovering the avatar reveals the tip in
// a small Fraunces italic bubble; clicking opens the Pear
// Companion already framed for that nudge's section.
//
// Heuristics, not AI — these run client-side and update on every
// manifest tick. Keep the rule list small + intentional so the
// bubble doesn't read as a settings checklist.
//
// Dismissed nudges are persisted in localStorage (per-site +
// per-nudge-id) so the host doesn't see the same tip twice.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Pear } from '../motifs';

interface Nudge {
  id: string;
  /** One-line gentle prompt — Fraunces italic on the bubble. */
  message: string;
  /** Optional CTA copy ("Add a date" etc.) — displayed as a chip. */
  cta?: string;
  /** Block to jump to when the host taps the CTA. */
  block?: 'hero' | 'details' | 'schedule' | 'travel' | 'registry' | 'gallery' | 'rsvp' | 'faq' | 'story';
}

interface Props {
  manifest: StoryManifest;
  siteSlug: string;
}

export function PearNudges({ manifest, siteSlug }: Props) {
  const nudges = useMemo(() => computeNudges(manifest), [manifest]);
  // Lazy useState init reads localStorage once at mount (siteSlug
  // is stable per session — the editor route is keyed on it). No
  // setState-in-effect cascade for the initial hydration.
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = window.localStorage.getItem(`pearloom:pear-nudges:${siteSlug}`);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch { /* ignore */ }
    return new Set();
  });
  // Two separate states so the bubble doesn't disappear the moment
  // the host's cursor crosses the 8px gap between button + bubble:
  //   • `pinned` — set by clicking the avatar; only closes via Got
  //     it / take-me-there / outside-click / Esc.
  //   • `hovering` — set by hover, with a leave-delay so passing
  //     through the visual gap doesn't snap the bubble shut.
  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);
  const leaveTimer = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const memoryKey = `pearloom:pear-nudges:${siteSlug}`;

  function persist(next: Set<string>) {
    try {
      window.localStorage.setItem(memoryKey, JSON.stringify(Array.from(next)));
    } catch { /* ignore quota */ }
  }

  const visible = nudges.find((n) => !dismissed.has(n.id));

  // Click-outside + Esc close the pinned bubble. Mounted before the
  // early-return so the hooks order is stable across renders.
  useEffect(() => {
    if (!pinned) return;
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target as Node)) return;
      setPinned(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPinned(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinned]);

  // Cancel any in-flight leave-delay on unmount so we don't leak.
  useEffect(() => () => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
  }, []);

  if (!visible) return null;

  const open = pinned || hovering;

  function handleEnter() {
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setHovering(true);
  }

  function handleLeave() {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    // 220ms grace covers the 8px gap between button and bubble + a
    // moment for the host's cursor to settle on the bubble. Shorter
    // and the bubble flickers; longer and it feels sticky.
    leaveTimer.current = window.setTimeout(() => {
      setHovering(false);
      leaveTimer.current = null;
    }, 220);
  }

  function dismiss() {
    const next = new Set(dismissed);
    next.add(visible!.id);
    setDismissed(next);
    persist(next);
    setPinned(false);
    setHovering(false);
  }

  function takeMeThere() {
    if (visible?.block && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block: visible.block } }));
    }
    dismiss();
  }

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{ position: 'relative', flexShrink: 0 }}
    >
      <button
        type="button"
        onClick={() => setPinned((p) => !p)}
        aria-label="Pear has a tip"
        aria-expanded={open}
        title={visible.message}
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          background: 'var(--cream-2)',
          border: '1px solid var(--peach-ink, #C6703D)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          position: 'relative',
          animation: 'pl-pear-nudge-pulse 2.4s ease-in-out infinite',
        }}
      >
        <Pear size={20} tone="sage" sparkle={false} shadow={false} />
        {/* Peach pip — signals "Pear has something to say". */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 1,
            right: 1,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: 'var(--peach-ink, #C6703D)',
            border: '1.5px solid var(--cream-2)',
          }}
        />
      </button>
      {open && (
        <>
          {/* Invisible bridge that fills the visual gap between the
              avatar and the bubble. Without it, the wrapper's hit-box
              has a "hole" at the 8px gap and the cursor passing
              through fires mouseleave on the wrapper, snapping the
              bubble shut mid-read. */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: 320,
              height: 12,
              background: 'transparent',
              pointerEvents: 'auto',
              zIndex: 99,
            }}
          />
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: 260,
              maxWidth: 320,
              padding: 14,
              background: 'var(--card, #FBF7EE)',
              border: '1px solid var(--card-ring, rgba(61,74,31,0.16))',
              borderRadius: 14,
              boxShadow: '0 14px 32px rgba(14,13,11,0.18)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              animation: 'pl-pear-nudge-fade 180ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Pear noticed
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 14,
              lineHeight: 1.45,
              color: 'var(--ink)',
              letterSpacing: '-0.005em',
            }}
          >
            {visible.message}
          </p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {visible.cta && visible.block && (
              <button
                type="button"
                onClick={takeMeThere}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'var(--peach-ink, #C6703D)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {visible.cta}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                background: 'transparent',
                color: 'var(--ink-soft)',
                border: '1px solid var(--line)',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Got it
            </button>
          </div>
          </div>
        </>
      )}
      <style jsx global>{`
        @keyframes pl-pear-nudge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(198, 112, 61, 0); }
          50%      { box-shadow: 0 0 0 4px rgba(198, 112, 61, 0.18); }
        }
        @keyframes pl-pear-nudge-fade {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="Pear has a tip"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

// ── Heuristics ────────────────────────────────────────────────
function computeNudges(manifest: StoryManifest): Nudge[] {
  const out: Nudge[] = [];
  const l = manifest.logistics ?? {};
  const chapters = manifest.chapters ?? [];
  const events = manifest.events ?? [];
  const faqs = manifest.faqs ?? [];
  const hotels = manifest.travelInfo?.hotels ?? [];
  const tagline = manifest.poetry?.heroTagline;

  // Most critical first — missing date.
  if (!l.date) {
    out.push({
      id: 'no-date',
      message: "Without a date, the countdown won't run and guests won't know when to RSVP. Worth setting first.",
      cta: 'Set a date',
      block: 'hero',
    });
  }
  if (!l.venue && l.date) {
    out.push({
      id: 'no-venue',
      message: 'A venue makes the map, hotels, and travel section come alive. Pop it in when you have it.',
      cta: 'Add the venue',
      block: 'hero',
    });
  }

  // Chapters present but no photos — flag specifically.
  const chaptersMissingPhotos = chapters.filter((c) => (c.images ?? []).length === 0);
  if (chapters.length >= 2 && chaptersMissingPhotos.length >= 2) {
    out.push({
      id: 'chapter-photos',
      message: `${chaptersMissingPhotos.length} of your chapters don't have a photo yet — even one each is plenty.`,
      cta: 'Add photos',
      block: 'story',
    });
  }

  // Hotels in town but no descriptions — guests want a sentence.
  const hotelsWithoutBlurb = hotels.filter((h) => {
    const note = (h as { description?: string; notes?: string }).description ?? (h as { notes?: string }).notes;
    return !note || note.length < 8;
  });
  if (hotels.length >= 2 && hotelsWithoutBlurb.length >= 2) {
    out.push({
      id: 'hotel-blurb',
      message: 'Your hotels could use a sentence each — one good line beats a star rating.',
      cta: 'Polish the hotels',
      block: 'travel',
    });
  }

  // Hero tagline default / blank.
  const defaultTagline = "We'd love you there. Come celebrate with us — the day will be better for it.";
  if (!tagline || tagline === defaultTagline) {
    out.push({
      id: 'default-tagline',
      message: 'The hero tagline is still the placeholder line. A sentence in your voice goes a long way.',
      cta: 'Polish the hero',
      block: 'hero',
    });
  }

  // RSVP deadline missing.
  if (!l.rsvpDeadline && l.date) {
    out.push({
      id: 'no-rsvp-deadline',
      message: 'Setting an RSVP deadline gives guests a gentle structure — and gives you a number to plan around.',
      cta: 'Add a deadline',
      block: 'rsvp',
    });
  }

  // Schedule has rows but no description.
  const eventsMissingDesc = events.filter((e) => !e.description || e.description.length < 12);
  if (events.length >= 2 && eventsMissingDesc.length >= 2) {
    out.push({
      id: 'schedule-desc',
      message: 'Your schedule is dense but unlabeled. A short description per event helps guests pace the day.',
      cta: 'Polish the schedule',
      block: 'schedule',
    });
  }

  // FAQ thin.
  if (faqs.length === 0 && (l.date || l.venue)) {
    out.push({
      id: 'no-faq',
      message: "FAQs are where guests' anxieties go to rest. Even 4–5 covers the questions you don't want to text-back individually.",
      cta: 'Draft an FAQ',
      block: 'faq',
    });
  }

  // Site is far along — a different nudge.
  const filled = [l.date, l.venue, chapters.length > 2, events.length > 1, faqs.length > 3, hotels.length > 1].filter(Boolean).length;
  if (filled >= 5) {
    out.push({
      id: 'looking-good',
      message: "Looking lovely. When you have a sec, ask me to do a full pass — I'll catch the small things.",
    });
  }

  return out;
}
