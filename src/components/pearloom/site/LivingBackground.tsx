'use client';

/* LivingBackground — mounts the v2 interactive shader wallpaper
   (public/wallpaper-engine.js) on a canvas behind the site/editor
   content. WebGL, pointer-reactive, theme-aware; under
   prefers-reduced-motion the engine paints a single still frame.
   Loads the engine script once, lazily; degrades to nothing if
   WebGL is unavailable. */

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { isWallpaperId } from '@/lib/site-look/wallpapers';

interface WP {
  set: (k: string) => void;
  get: () => string;
  resize: () => void;
  poke: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    PearloomWallpaper?: (canvas: HTMLCanvasElement) => WP | null;
  }
}

let enginePromise: Promise<void> | null = null;
function loadEngine(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.PearloomWallpaper) return Promise.resolve();
  if (enginePromise) return enginePromise;
  enginePromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/wallpaper-engine.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('wallpaper engine failed to load'));
    document.head.appendChild(s);
  }).catch((e) => {
    enginePromise = null; // allow a later retry
    throw e;
  });
  return enginePromise;
}

export function LivingBackground({
  id,
  fixed = true,
  style,
  className,
}: {
  id: string;
  /** fixed (site body ground) vs absolute (inside a framed preview). */
  fixed?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wpRef = useRef<WP | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isWallpaperId(id)) {
      // id went valid → invalid while mounted: the canvas is about to
      // unmount (render returns null) — stop the engine now, or the
      // rAF loop keeps drawing to a detached canvas.
      wpRef.current?.destroy();
      wpRef.current = null;
      return;
    }
    loadEngine()
      .then(() => {
        if (cancelled || !canvasRef.current || !window.PearloomWallpaper) return;
        if (!wpRef.current) {
          wpRef.current = window.PearloomWallpaper(canvasRef.current);
        }
        wpRef.current?.set(id);
        wpRef.current?.resize();
      })
      .catch(() => {
        /* No WebGL / engine — silently leave the canvas blank so the
           paper ground beneath shows through. Never break the page. */
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Tear the engine down only when the component unmounts (not on every
  // id change — set() swaps the shader live).
  useEffect(() => {
    return () => {
      wpRef.current?.destroy();
      wpRef.current = null;
    };
  }, []);

  if (!isWallpaperId(id)) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        // The engine listens on window; the canvas itself must never
        // hit-test (it sits under the site content — grabbing touches
        // here would eat scrolling wherever it peeked through).
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}

export default LivingBackground;
