'use client';

/* ─────────────────────────────────────────────────────────────
   PackSitePreview — the WHOLE site wearing the pack, live.

   The store's vignettes (PackPreview) show a hero crop; this is
   the real thing: the full demo site (DEMO_MANIFEST — Elena &
   Theo, every section on) re-dressed by applyPackToManifest —
   the exact transform purchasing applies — rendered scrollable.
   What you scroll here is what the pack does to a real site,
   section by section, not a thumbnail's impression.

   Two viewports: phones get the 430px mobile render; desktop
   (wide) gets the real DESKTOP layout at 1100px, zoom-scaled to
   the pane (it previously always showed the mobile render, which
   undersold every pack's desktop typography).

   zoom (not transform) keeps native layout height so the window
   scrolls like a site in a guest's hand. The frame carries
   translateZ(0) so it becomes the containing block for the
   site's position:fixed chrome — without it the mobile nav
   drawer escaped the preview and opened over the whole modal.
   Mounted one-at-a-time (the QuickLook modal), so the full-site
   render cost never multiplies across the grid.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { ThemedSite } from '../redesign/ThemedSite';
import { DEMO_MANIFEST, DEMO_NAMES } from '@/lib/demo-manifest';
import { applyPackToManifest } from '@/lib/theme-store/apply';
import type { Pack } from '@/lib/theme-store/packs';

const MOBILE_W = 430;
const DESKTOP_W = 1100;

export function PackSitePreview({
  pack,
  height = 420,
  wide = false,
}: {
  pack: Pack;
  height?: number;
  /** Render the desktop layout, zoom-fit to the pane. */
  wide?: boolean;
}) {
  const manifest = useMemo<StoryManifest>(
    () => applyPackToManifest(pack, DEMO_MANIFEST as unknown as StoryManifest),
    [pack],
  );

  /* One-frame deferral so the modal opens instantly; the full
     render lands right behind it. */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  /* Wide mode measures the pane so the 1100px desktop render
     zoom-fits exactly. rAF for the first read (no synchronous
     setState-in-effect); resize keeps it honest. */
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW] = useState(0);
  useEffect(() => {
    if (!wide) return;
    const measure = () => setFrameW(frameRef.current?.clientWidth ?? 0);
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [wide]);

  const siteW = wide ? DESKTOP_W : MOBILE_W;
  const zoom = wide ? (frameW > 0 ? frameW / DESKTOP_W : 0.38) : 1;

  return (
    <div
      ref={frameRef}
      style={{
        position: 'relative',
        height,
        overflow: 'hidden',
        background: 'var(--cream-2, #FBF7EE)',
        /* Containing block for the site's fixed chrome (mobile
           nav drawer, lightbox) — keeps it inside the frame. */
        transform: 'translateZ(0)',
      }}
    >
      {ready ? (
        <>
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ width: siteW, zoom, containerType: 'inline-size', containerName: 'pl-site', margin: '0 auto', maxWidth: wide ? undefined : '100%' } as CSSProperties}>
              <ThemedSite manifest={manifest} names={DEMO_NAMES} forceMobile={!wide} demoCopy />
            </div>
          </div>
          {/* Scroll hint — glass chip riding the preview. */}
          <div
            aria-hidden
            style={{
              position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
              padding: '5px 13px', borderRadius: 999,
              background: 'var(--pl-glass)',
              backgroundImage: 'var(--pl-glass-sheen)',
              backdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
              WebkitBackdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
              border: '1px solid var(--pl-glass-border)',
              fontSize: 10.5, fontWeight: 600, color: 'var(--pl-ink-soft, #3A332C)',
              pointerEvents: 'none', whiteSpace: 'nowrap',
            }}
          >
            scroll — the whole site, wearing {pack.name}
          </div>
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 11, color: 'var(--pl-muted, #6F6557)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Pressing…
        </div>
      )}
    </div>
  );
}
