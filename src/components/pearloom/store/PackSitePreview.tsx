'use client';

/* ─────────────────────────────────────────────────────────────
   PackSitePreview — the WHOLE site wearing the pack, live.

   The store's vignettes (PackPreview) show a hero crop; this is
   the real thing: the full demo site (DEMO_MANIFEST — Elena &
   Theo, every section on) re-dressed by applyPackToManifest —
   the exact transform purchasing applies — rendered scrollable
   at phone width. What you scroll here is what the pack does to
   a real site, section by section, not a thumbnail's impression.

   zoom (not transform) keeps native layout height so the window
   scrolls like the phone in a guest's hand — same technique as
   the wizard's structure preview. Mounted one-at-a-time (the
   QuickLook modal), so the full-site render cost never multiplies
   across the grid.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { ThemedSite } from '../redesign/ThemedSite';
import { DEMO_MANIFEST, DEMO_NAMES } from '@/lib/demo-manifest';
import { applyPackToManifest } from '@/lib/theme-store/apply';
import type { Pack } from '@/lib/theme-store/packs';

const SITE_W = 430;

export function PackSitePreview({
  pack,
  height = 420,
}: {
  pack: Pack;
  height?: number;
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

  return (
    <div
      style={{
        position: 'relative',
        height,
        overflow: 'hidden',
        background: 'var(--cream-2, #FBF7EE)',
      }}
    >
      {ready ? (
        <>
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ width: SITE_W, zoom: 1, containerType: 'inline-size', containerName: 'pl-site', margin: '0 auto', maxWidth: '100%' } as CSSProperties}>
              <ThemedSite manifest={manifest} names={DEMO_NAMES} forceMobile demoCopy />
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
