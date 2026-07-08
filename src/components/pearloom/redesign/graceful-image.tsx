'use client';

/* ─── Graceful imagery — the pressed mat ─────────────────────────
   One shared image primitive for every host photo on the published
   site (RADICAL-DESIGN-DIRECTIONS §B / audit P2: "materiality that
   degrades gracefully").

   Loading: the wrapper paints the section's tonal paper immediately
   (the paper IS the placeholder — no LQIP, no dominant-color pass);
   the real <img> fades in over 400ms once decoded.

   Failure: a photo that 404s or never arrives must NEVER read as a
   gray gap. It becomes a *pressed mat* — tonal paper, a hairline
   inner frame, and a faint blind-embossed sprig — i.e. a frame that
   is deliberately mounted and waiting, in the site's own theme
   tokens (everything keys off --t-*).

   All motion honors prefers-reduced-motion (instant swap, no fade).
   ────────────────────────────────────────────────────────────── */

import { useState, useSyncExternalStore, type CSSProperties } from 'react';
import { usePhotoFocus } from './photo-focus';

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (!window.matchMedia) return () => {};
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => (window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false),
    () => false, // SSR — assume motion; CSS media queries still guard
  );
}

/** The blind-embossed sprig at the center of a waiting mat. Strokes
 *  in the theme's ink at whisper opacity — present on any paper. */
function MatSprig({ size = 44 }: { size?: number }) {
  const ink = 'var(--t-ink, #2A2A28)';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden style={{ opacity: 0.16 }}>
      <path d="M24 40 C 24 28, 24 18, 24 8" fill="none" stroke={ink} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M24 30 C 19 27, 15 27, 11 29 C 15 22, 20 24, 24 27 Z" fill={ink} opacity="0.8" />
      <path d="M24 22 C 29 19, 33 19, 37 21 C 33 14, 28 16, 24 19 Z" fill={ink} opacity="0.8" />
      <circle cx="24" cy="8" r="2" fill={ink} />
    </svg>
  );
}

/** The pressed-mat visual — exported so any bespoke image path
 *  (e.g. gallery's next/image tiles) can overlay the same state. */
export function PressedMat({ style = {} }: { style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--t-section, #F1EBDD)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* Hairline inner frame — the mat is mounted, not missing. */}
      <div
        style={{
          position: 'absolute',
          inset: 10,
          border: '1px solid var(--t-line, rgba(42,42,40,0.14))',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
        }}
      />
      <MatSprig />
    </div>
  );
}

export function FadeInImage({
  src,
  alt = '',
  eager = false,
  style = {},
  imgStyle = {},
  title,
}: {
  src: string;
  alt?: string;
  /** Above-the-fold heroes skip lazy loading. */
  eager?: boolean;
  /** Layout styles for the wrapper (aspectRatio, borderRadius, margins…). */
  style?: CSSProperties;
  /** Extra styles on the <img> itself (rarely needed). */
  imgStyle?: CSSProperties;
  /** Tooltip, forwarded to the <img> (honor-list stamp hovers). */
  title?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = usePrefersReducedMotion();
  /* Host-set focal point (manifest.photoFocus via ThemedSite's
     provider) — cover-cropping keeps the subject instead of the
     blind center. Undefined = browser default (50% 50%). */
  const focus = usePhotoFocus(src);
  /* SSR / cache guard — if the browser finished the image before
     React attached (server-rendered markup, cached asset), onLoad
     never fires; the ref callback checks .complete at attach time. */
  const attachImg = (node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  };
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        /* Tonal paper base — the wait shows paper, not white. */
        backgroundColor: 'var(--t-section)',
        ...style,
      }}
    >
      {!failed && (
        <img
          ref={attachImg}
          src={src}
          alt={alt}
          title={title}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          /* Eager = the hero/cover = the LCP candidate — tell the
             browser to fetch it ahead of the below-fold queue. */
          fetchPriority={eager ? 'high' : undefined}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...(focus ? { objectPosition: focus } : {}),
            opacity: loaded ? 1 : 0,
            transition: reduced ? 'none' : 'opacity 400ms var(--pl-ease-out, cubic-bezier(0.22, 1, 0.36, 1))',
            ...imgStyle,
          }}
        />
      )}
      {failed && <PressedMat />}
    </div>
  );
}
