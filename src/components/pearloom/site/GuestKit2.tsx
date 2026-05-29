'use client';

/* ========================================================================
   GuestKit2 — second wave of guest-experience helpers.

   - <PhotoLightbox /> + usePhotoLightbox()  : tap any gallery image to
     enter a fullscreen viewer with swipe/keyboard navigation.
   - <TimeZoneCountdown />   : "Starts 4pm Eastern · 9pm for you in London"
   - <ScrollSpyNav />        : highlights nav links matching scroll position
   - <GuestPhotoUploader />  : mobile-first uploader for guest photo wall
   - <VoiceToastRecorder />  : 30-second in-browser audio recorder for toasts
   - <LiveWallDiscover />    : auto-shows when broadcast is active
   ======================================================================== */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/lib/use-focus-trap';

// ─────────────────────────────────────────────────────────────
// Photo lightbox
// ─────────────────────────────────────────────────────────────

export interface LightboxImage {
  url: string;
  caption?: string;
  alt?: string;
}

export function usePhotoLightbox(images: LightboxImage[]) {
  const [index, setIndex] = useState<number | null>(null);
  const open = useCallback((i: number) => setIndex(i), []);
  const close = useCallback(() => setIndex(null), []);
  const next = useCallback(() => setIndex((i) => (i === null ? null : (i + 1) % images.length)), [images.length]);
  const prev = useCallback(() => setIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)), [images.length]);
  return { index, open, close, next, prev };
}

export function PhotoLightbox({
  images,
  index,
  onClose,
  onNext,
  onPrev,
  reactions,
  onToggleReaction,
}: {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  /** Heart count + my-reaction map keyed by photoUrl. When
   *  provided + onToggleReaction is set, the lightbox renders a
   *  heart button in the chrome rail. */
  reactions?: { counts: Record<string, number>; mine: Record<string, true> };
  onToggleReaction?: (photoUrl: string) => void | Promise<void>;
}) {
  // Render via portal so the fixed-position overlay isn't trapped
  // by an ancestor with transform / filter / will-change (which
  // breaks `position: fixed` and was why the v1 lightbox showed
  // up off-centre, half-hidden under the nav).
  const [portalNode] = useState<HTMLElement | null>(() => {
    return typeof document !== 'undefined' ? document.body : null;
  });

  // Phase 4.5 of AUDIT-2026-05-29 — a11y. counterId binds the
  // dialog announcement to the visible "01/12" counter (more
  // useful for SR users than the generic "Photo viewer" aria-label
  // it had before). Focus trap keeps Tab inside the chrome rail
  // (close / heart / nav) so it can't escape behind the overlay.
  // useFocusTrap also restores focus to the gallery thumbnail
  // that opened the lightbox when index → null.
  const counterId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(index !== null, dialogRef);

  useEffect(() => {
    if (index === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, onClose, onNext, onPrev]);

  // Touch swipe — left = next, right = prev. 60px threshold so
  // small fidgets don't accidentally page through.
  const startXRef = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? startXRef.current;
    const dx = endX - startXRef.current;
    if (Math.abs(dx) > 60) {
      if (dx < 0) onNext();
      else onPrev();
    }
    startXRef.current = null;
  };

  if (index === null || !portalNode) return null;
  const img = images[index];
  if (!img) return null;

  async function share() {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      await navigator.share({ title: img.caption ?? 'A photo', url: img.url });
    } catch {}
  }

  // Editorial v8 chrome: cream-on-ink dialog with paper grain
  // pulled from the global pearloom.css `.pl-grain` utility, big
  // serif counter, and click-outside-to-close.
  const overlay = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={counterId}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(14, 13, 11, 0.92)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 4vw, 56px) clamp(16px, 4vw, 56px) clamp(80px, 8vw, 120px)',
        animation: 'pl8-lb-in 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Top rail — counter on the left, Close on the right. Stays
          out of the image's way and matches the editorial nav vibe. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 'clamp(16px, 2vw, 28px)',
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(16px, 4vw, 32px)',
          color: 'var(--cream, #F5EFE2)',
          pointerEvents: 'none',
        }}
      >
        <div
          id={counterId}
          aria-label={`Photo ${index + 1} of ${images.length}`}
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 6,
            fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
            fontSize: 18,
            fontStyle: 'italic',
            color: 'rgba(243,233,212,0.9)',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 600, fontStyle: 'normal', color: 'var(--cream)' }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span style={{ opacity: 0.55 }}>/</span>
          <span style={{ opacity: 0.6, fontStyle: 'normal', fontSize: 14, fontWeight: 500 }}>
            {String(images.length).padStart(2, '0')}
          </span>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            pointerEvents: 'auto',
            width: 38,
            height: 38,
            borderRadius: 999,
            border: '1px solid rgba(243,233,212,0.22)',
            background: 'rgba(243,233,212,0.06)',
            color: 'var(--cream, #F5EFE2)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            fontSize: 18,
            fontWeight: 300,
            transition: 'background 160ms ease, border-color 160ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(243,233,212,0.14)';
            e.currentTarget.style.borderColor = 'rgba(243,233,212,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(243,233,212,0.06)';
            e.currentTarget.style.borderColor = 'rgba(243,233,212,0.22)';
          }}
        >
          ×
        </button>
      </div>

      {/* Image — actual centred element. The picture is pinned in
          the middle of the flex column; the chrome floats around it. */}
      <figure
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: 0,
          maxWidth: 'min(92vw, 1280px)',
          maxHeight: 'min(78vh, 920px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          minHeight: 0,
        }}
      >
        <img
          // Re-keying on the photo URL forces React to remount the
          // <img> when the host arrow-keys to the next photo — that
          // re-runs the pl8-lb-image-in entrance keyframe so each
          // new photo lifts forward from the backdrop instead of
          // hard-cutting in place.
          key={img.url}
          src={img.url}
          alt={img.alt ?? img.caption ?? ''}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: 8,
            boxShadow: '0 24px 72px rgba(0,0,0,0.6), 0 0 0 1px rgba(243,233,212,0.06)',
            background: '#0E0D0B',
            animation: 'pl8-lb-image-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        />
      </figure>

      {/* Caption — sits between image and chrome rail, optional. */}
      {img.caption && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 14,
            color: 'rgba(243,233,212,0.78)',
            fontSize: 13,
            fontStyle: 'italic',
            fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
            textAlign: 'center',
            maxWidth: '60ch',
            lineHeight: 1.5,
          }}
        >
          {img.caption}
        </div>
      )}

      {/* Chrome rail at the bottom — Prev / Share / Save / Next. The
          big nav arrows sit at the edges so guests on a phone can
          thumb through without aiming at a small button. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 'clamp(20px, 3vw, 32px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: 6,
          background: 'rgba(243,233,212,0.08)',
          border: '1px solid rgba(243,233,212,0.16)',
          borderRadius: 999,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <RailButton ariaLabel="Previous photo" onClick={(e) => { e.stopPropagation(); onPrev(); }}>‹</RailButton>
        <span style={{ width: 1, height: 16, background: 'rgba(243,233,212,0.18)', margin: '0 2px' }} />
        {reactions && onToggleReaction && (
          <>
            <button
              type="button"
              aria-label={reactions.mine[img.url] ? 'Unheart photo' : 'Heart photo'}
              onClick={(e) => { e.stopPropagation(); void onToggleReaction(img.url); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: reactions.mine[img.url] ? 'var(--peach-ink, #C6703D)' : 'transparent',
                color: reactions.mine[img.url] ? '#FFFFFF' : 'var(--cream, #F5EFE2)',
                border: 'none',
                borderRadius: 999,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'inherit',
                transition: 'background 140ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseEnter={(e) => {
                if (!reactions.mine[img.url]) e.currentTarget.style.background = 'rgba(243,233,212,0.14)';
              }}
              onMouseLeave={(e) => {
                if (!reactions.mine[img.url]) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span aria-hidden style={{ fontSize: 13, transform: reactions.mine[img.url] ? 'scale(1.1)' : 'scale(1)', transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}>♥</span>
              {(reactions.counts[img.url] ?? 0) > 0 ? reactions.counts[img.url] : ''}
            </button>
            <span style={{ width: 1, height: 16, background: 'rgba(243,233,212,0.18)', margin: '0 2px' }} />
          </>
        )}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <>
            <RailButton ariaLabel="Share" onClick={share}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
              </svg>
            </RailButton>
            <span style={{ width: 1, height: 16, background: 'rgba(243,233,212,0.18)', margin: '0 2px' }} />
          </>
        )}
        <a
          href={img.url}
          target="_blank"
          rel="noreferrer"
          download
          aria-label="Open or save photo"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 14px',
            color: 'var(--cream, #F5EFE2)',
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.04em',
            borderRadius: 999,
            transition: 'background 140ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(243,233,212,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v14M5 12l7 7 7-7M3 21h18" />
          </svg>
          Save
        </a>
        <span style={{ width: 1, height: 16, background: 'rgba(243,233,212,0.18)', margin: '0 2px' }} />
        <RailButton ariaLabel="Next photo" onClick={(e) => { e.stopPropagation(); onNext(); }}>›</RailButton>
      </div>

      <style jsx global>{`
        @keyframes pl8-lb-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pl8-lb-image-in {
          from { opacity: 0; transform: scale(0.965); }
          to   { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="Photo viewer"] {
            animation: none !important;
          }
          [aria-label="Photo viewer"] img {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(overlay, portalNode);
}

function RailButton({
  ariaLabel,
  children,
  onClick,
}: {
  ariaLabel: string;
  children: ReactNode;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        color: 'var(--cream, #F5EFE2)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        fontSize: 22,
        lineHeight: 1,
        fontFamily: 'inherit',
        transition: 'background 140ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(243,233,212,0.14)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Time-zone aware countdown
// ─────────────────────────────────────────────────────────────

interface TZArgs {
  iso?: string;            // YYYY-MM-DD
  time?: string;           // free-form like '4:00pm'
  venueTimeZone?: string;  // IANA like 'America/New_York'
}

export function TimeZoneCountdown({ iso, time, venueTimeZone }: TZArgs) {
  const guestTZ = useMemo(() => {
    if (typeof Intl === 'undefined') return null;
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  if (!iso) return null;
  const [hours, minutes] = parseTime(time);
  const eventLocal = `${iso}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  // If host hasn't set a venue TZ, treat the time as the guest's
  // local time and skip the cross-TZ comparison.
  if (!venueTimeZone || venueTimeZone === guestTZ) return null;

  const venueLabel = venueTimeZone.split('/').pop()?.replace(/_/g, ' ') ?? venueTimeZone;
  const guestLabel = guestTZ?.split('/').pop()?.replace(/_/g, ' ') ?? '';

  // Format the time in both zones using the same instant.
  let venueTime = '—';
  let guestTime = '—';
  try {
    // Build the venue-local moment as a Date by parsing it in venue TZ.
    // Trick: use Intl.DateTimeFormat to derive the offset, then compute.
    const naive = new Date(eventLocal);
    venueTime = new Intl.DateTimeFormat('en-US', {
      timeZone: venueTimeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(naive);
    guestTime = new Intl.DateTimeFormat('en-US', {
      timeZone: guestTZ ?? undefined,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(naive);
  } catch {}

  return (
    <div
      style={{
        marginTop: 14,
        padding: '8px 14px',
        borderRadius: 999,
        background: 'var(--cream-2, #FBF7EE)',
        border: '1px solid var(--line, #D8CFB8)',
        fontSize: 12.5,
        color: 'var(--ink-soft)',
        display: 'inline-flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <span>
        <strong style={{ color: 'var(--ink)' }}>{venueTime}</strong> in {venueLabel}
      </span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>
        <strong style={{ color: 'var(--ink)' }}>{guestTime}</strong> for you{guestLabel ? ` in ${guestLabel}` : ''}
      </span>
    </div>
  );
}

function parseTime(t?: string | null): [number, number] {
  if (!t) return [12, 0];
  const m = t.toLowerCase().trim().match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/);
  if (!m) return [12, 0];
  let h = parseInt(m[1] ?? '12', 10);
  const min = parseInt(m[2] ?? '0', 10);
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return [h, min];
}

// ─────────────────────────────────────────────────────────────
// Scroll spy — highlights the active section in nav
// ─────────────────────────────────────────────────────────────

/** Drop in once at the page level. Watches sections by id and adds
 *  data-pl-scroll-active to nav anchors. CSS in pearloom.css uses
 *  the attr to paint the active state. */
export function ScrollSpy({ sections }: { sections: string[] }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const navs = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    if (navs.length === 0) return;
    function paint(id: string) {
      navs.forEach((a) => {
        const targetId = a.getAttribute('href')?.slice(1);
        if (targetId === id) a.setAttribute('data-pl-scroll-active', '1');
        else a.removeAttribute('data-pl-scroll-active');
      });
    }
    const els = sections
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            paint((entry.target as HTMLElement).id);
            break;
          }
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.4, 1] },
    );
    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);
  return null;
}

// ─────────────────────────────────────────────────────────────
// Live wall discovery — peeks into the live-updates feed; if there
// have been broadcasts in the last 6h, renders a "See what's happening"
// link that deep-jumps to /sites/<domain>/live.
// ─────────────────────────────────────────────────────────────

export function LiveWallDiscover({ subdomain, occasion }: { subdomain: string; occasion?: string }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/sites/live-updates?subdomain=${encodeURIComponent(subdomain)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { updates?: Array<{ created_at: string }> };
        const recent = (data.updates ?? []).some(
          (u) => Date.now() - new Date(u.created_at).getTime() < 6 * 60 * 60 * 1000,
        );
        if (!cancelled) setActive(recent);
      } catch {}
    }
    poll();
    const id = setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [subdomain]);

  if (!active) return null;

  return (
    <a
      href={occasion ? `/${occasion}/${subdomain}/live` : `/sites/${subdomain}/live`}
      target="_blank"
      rel="noreferrer"
      style={{
        position: 'fixed',
        bottom: 86,
        left: 18,
        zIndex: 70,
        background: 'var(--peach-ink, #C6703D)',
        color: 'var(--cream, #FDFAF0)',
        padding: '10px 16px',
        borderRadius: 999,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 10px 24px rgba(198,112,61,0.32)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        animation: 'pl8-livedisc-in 380ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--cream)',
          animation: 'pl8-livedisc-pulse 1.4s ease-in-out infinite',
        }}
      />
      Live now — see what's happening
      <style jsx>{`
        @keyframes pl8-livedisc-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pl8-livedisc-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes pl8-livedisc-pulse {
            0%, 100% { opacity: 0.85; transform: none; }
          }
        }
      `}</style>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// Guest photo upload — mobile-first
// ─────────────────────────────────────────────────────────────

export function GuestPhotoUploader({
  siteSlug,
  onUploaded,
}: {
  siteSlug: string;
  onUploaded?: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!name.trim()) {
      setError('Tell us your name first so the couple knows who shared.');
      return;
    }
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const list = Array.from(files).slice(0, 8);
      let count = 0;
      const uploaded: string[] = [];
      for (const file of list) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 15 * 1024 * 1024) {
          setError(`${file.name} is too big (max 15MB).`);
          continue;
        }
        const fd = new FormData();
        fd.append('siteId', siteSlug);
        fd.append('name', name);
        fd.append('caption', caption);
        fd.append('image', file);
        const res = await fetch('/api/wedding-day', { method: 'POST', body: fd });
        if (res.ok) {
          const data = (await res.json()) as { photo?: { url?: string } };
          if (data.photo?.url) uploaded.push(data.photo.url);
        }
        count += 1;
        setProgress(Math.round((count / list.length) * 100));
      }
      onUploaded?.(uploaded);
      setDone(true);
      setCaption('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(0), 1200);
    }
  }

  return (
    <div
      style={{
        background: 'var(--card, #fff)',
        border: '1px solid var(--card-ring, #D8CFB8)',
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--peach-ink)',
          marginBottom: 8,
        }}
      >
        Share a photo
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={inputBase}
        />
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          style={inputBase}
        />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="btn btn-primary btn-sm"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {busy ? `Uploading… ${progress}%` : done ? 'Add another' : 'Pick photo(s)'}
      </button>
      {progress > 0 && progress < 100 && (
        <div style={{ height: 4, background: 'var(--cream-2)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--peach-ink)',
              transition: 'width 240ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>
      )}
      {error && <div style={{ marginTop: 8, fontSize: 12, color: '#7A2D2D' }}>{error}</div>}
      {done && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--sage-deep)' }}>Thanks — your photos are with the couple.</div>}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid var(--line, #D8CFB8)',
  background: 'var(--cream-2, #FBF7EE)',
  fontSize: 13,
  color: 'var(--ink, #18181B)',
  fontFamily: 'inherit',
};

// ─────────────────────────────────────────────────────────────
// Voice toast recorder
// ─────────────────────────────────────────────────────────────

export function VoiceToastRecorder({
  siteSlug,
  onSubmitted,
  maxSeconds = 30,
}: {
  siteSlug: string;
  onSubmitted?: () => void;
  maxSeconds?: number;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    setError(null);
    setAudioUrl(null);
    setAudioBlob(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone not available.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      rec.start();
      setRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= maxSeconds) {
            stop();
            return maxSeconds;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start recording');
    }
  }

  function stop() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    if (recRef.current && recRef.current.state !== 'inactive') {
      recRef.current.stop();
    }
    setRecording(false);
  }

  async function submit() {
    if (!audioBlob) return;
    if (!name.trim()) { setError('Add your name first.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(audioBlob);
      });
      const res = await fetch('/api/event-os/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          kind: 'voice-toast',
          authorName: name.trim(),
          audioBase64: base64,
          mimeType: 'audio/webm',
          durationMs: elapsed * 1000,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Send failed (${res.status})`);
      }
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setAudioUrl(null);
    setAudioBlob(null);
    setElapsed(0);
    setSubmitted(false);
  }

  return (
    <div
      style={{
        background: 'var(--card, #fff)',
        border: '1px solid var(--card-ring, #D8CFB8)',
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--peach-ink)',
          marginBottom: 8,
        }}
      >
        Leave a voice toast
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10, lineHeight: 1.5 }}>
        Up to {maxSeconds} seconds. Hosts review before it plays at the event.
      </div>

      {submitted ? (
        <div style={{ fontSize: 13, color: 'var(--sage-deep)' }}>
          Thanks — your toast is with the host.
          <button type="button" onClick={reset} style={{ marginLeft: 10, background: 'transparent', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: 'inherit' }}>
            record another
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            style={{ ...inputBase, width: '100%', marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!audioUrl ? (
              <button
                type="button"
                onClick={recording ? stop : start}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {recording ? `■ Stop · ${elapsed}s` : '● Record toast'}
              </button>
            ) : (
              <>
                <audio src={audioUrl} controls style={{ flex: 1, height: 36 }} />
                <button type="button" onClick={reset} className="btn btn-outline btn-sm">
                  Re-record
                </button>
                <button type="button" onClick={submit} disabled={submitting} className="btn btn-primary btn-sm">
                  {submitting ? 'Sending…' : 'Send'}
                </button>
              </>
            )}
          </div>
          {error && <div style={{ marginTop: 8, fontSize: 12, color: '#7A2D2D' }}>{error}</div>}
        </>
      )}
    </div>
  );
}

// WeatherWidget removed (2026-04-30) — replaced by the editorial
// WeatherStrip in src/components/pearloom/site/WeatherStrip.tsx,
// which uses custom SVG glyphs instead of system emoji and reads
// as a single Fraunces italic line rather than a stat tile. The
// old export is gone from this file's barrel; if any external
// consumer still imports it, that path needs updating.

// Pass-through provider — kept for future hooks composition.
export function GuestKit2Provider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
