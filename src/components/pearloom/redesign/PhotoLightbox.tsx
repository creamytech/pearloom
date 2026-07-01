'use client';

// ─────────────────────────────────────────────────────────────
// PhotoLightbox — full-screen viewer for the published gallery.
// Tap a gallery photo → it opens here with prev/next, caption,
// keyboard arrows, and Esc / backdrop / swipe to close. Themed
// against the site (dark scrim, --t-* accents). Published only —
// the editor canvas keeps click-to-edit-caption behaviour.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';

export interface LightboxState {
  photos: string[];
  captions?: (string | undefined)[];
  index: number;
}

export function PhotoLightbox({
  state,
  onClose,
}: {
  state: LightboxState | null;
  onClose: () => void;
}) {
  const [i, setI] = useState(state?.index ?? 0);
  // Re-seat the index when a new open request arrives (a different
  // `state` object). Render-time adjustment — the React-recommended
  // alternative to a setState-in-effect. `shown` also retains the
  // last non-null state so the exit fade has content to render
  // after the parent nulls `state`.
  const [seen, setSeen] = useState(state);
  const [shown, setShown] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state) {
      setShown(state);
      setI(state.index ?? 0);
    }
  }

  /* Two-state mount — the viewer used to fade in over 220ms and cut
     to nothing on close. Immediate halves are render-time
     adjustments; only the delayed halves live in the effect's timers
     (react-hooks/set-state-in-effect). */
  const openNow = state != null;
  const [render, setRender] = useState(openNow);
  const [vis, setVis] = useState(false);
  if (openNow && !render) setRender(true);
  if (!openNow && vis) setVis(false);
  useEffect(() => {
    if (openNow) {
      const t = setTimeout(() => setVis(true), 10);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRender(false), 200);
    return () => clearTimeout(t);
  }, [openNow]);

  const count = (state ?? shown)?.photos.length ?? 0;
  const go = useCallback(
    (dir: 1 | -1) => setI((cur) => (count === 0 ? 0 : (cur + dir + count) % count)),
    [count],
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [state, go, onClose]);

  const shownState = state ?? shown;
  if (!render || !shownState) return null;
  const src = shownState.photos[i];
  const caption = shownState.captions?.[i];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        /* No backdrop-filter: behind a 92%-opaque scrim the blur was
           invisible but still made the browser resample the whole
           page every frame of the fade. The solid fade is free. */
        background: 'rgba(12,10,7,0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(16px, 4vw, 48px)',
        opacity: vis ? 1 : 0,
        transition: 'opacity 200ms ease',
        pointerEvents: vis ? 'auto' : 'none',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{ ...ctrlBtn, position: 'absolute', top: 16, right: 16 }}
      >
        ✕
      </button>

      {count > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          aria-label="Previous photo"
          style={{ ...ctrlBtn, position: 'absolute', left: 'clamp(8px, 2vw, 28px)', top: '50%', transform: 'translateY(-50%)' }}
        >
          ‹
        </button>
      )}

      <img
        src={src}
        alt={caption ?? `Photo ${i + 1} of ${count}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '92vw',
          maxHeight: '82vh',
          objectFit: 'contain',
          borderRadius: 6,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      />

      {count > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(1); }}
          aria-label="Next photo"
          style={{ ...ctrlBtn, position: 'absolute', right: 'clamp(8px, 2vw, 28px)', top: '50%', transform: 'translateY(-50%)' }}
        >
          ›
        </button>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: 14,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.86)',
          fontSize: 13,
          maxWidth: '80vw',
        }}
      >
        {caption && <div style={{ fontStyle: 'italic', marginBottom: 4 }}>{caption}</div>}
        {count > 1 && (
          <div style={{ fontSize: 11, letterSpacing: '0.14em', opacity: 0.6 }}>
            {i + 1} / {count}
          </div>
        )}
      </div>

    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.28)',
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1,
};

export default PhotoLightbox;
