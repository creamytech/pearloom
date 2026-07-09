'use client';

/* ─── SiteLookPlate — THE miniature of the site's look ───────────
   One shared plate (CARD-PLAN §2 law #5): the hosts' names in the
   real display face, on the real paper, under the real texture,
   with the real accent pill — a truthful thumbnail of the site
   that repaints the instant the manifest changes.

   Mounted by the Design door deck (the Theme card's preview) and
   at the top of the colors / fonts / paper doors, where it stands
   in for the canvas the full-height sheet hides: tap a swatch,
   watch the plate re-press.

   Chrome-safe: reads the site's resolved --t-* bag as DATA (inline
   values, like a thumbnail), and the texture through ThemedSite's
   exported TextureLayer (inline data-URI noise — no site-scope
   CSS). */

import type { StoryManifest } from '@/types';
import { getTheme } from '../site/themes';
import { TextureLayer } from './ThemedSite';

/** The site's resolved --t-* bag — themeVars override wins over the
 *  named theme's values (same chain the canvas uses). */
export function siteLookVars(manifest: StoryManifest): Record<string, string> {
  const loose = manifest as unknown as {
    themeId?: string; theme?: { id?: string }; themeVars?: Record<string, string>;
  };
  const t = getTheme(loose.themeId ?? loose.theme?.id);
  return { ...((t?.vars as Record<string, string> | undefined) ?? {}), ...(loose.themeVars ?? {}) };
}

/** The site's resolved paper texture + strength. */
export function siteLookTexture(manifest: StoryManifest): { texture: string; intensity: number } {
  const loose = manifest as unknown as {
    themeId?: string; theme?: { id?: string }; texture?: string; textureIntensity?: number;
  };
  const t = getTheme(loose.themeId ?? loose.theme?.id);
  return {
    texture: (loose.texture ?? t?.texture ?? 'none') || 'none',
    intensity: typeof loose.textureIntensity === 'number' ? loose.textureIntensity : 1,
  };
}

export function SiteLookPlate({
  manifest,
  height,
  style,
}: {
  manifest: StoryManifest;
  /** Fixed height; omit to fill the parent (height 100%). */
  height?: number;
  style?: React.CSSProperties;
}) {
  const v = siteLookVars(manifest);
  const { texture, intensity } = siteLookTexture(manifest);
  const paper = v['--t-paper'] ?? 'var(--cream)';
  const ink = v['--t-ink'] ?? 'var(--ink)';
  const inkSoft = v['--t-ink-soft'] ?? 'var(--ink-soft)';
  const gold = v['--t-gold'] ?? v['--t-accent'] ?? 'var(--gold)';
  const display = v['--t-display'] ?? 'Georgia, serif';
  const names = (manifest as unknown as { names?: [string, string] }).names;
  const title = names?.filter(Boolean).join(' & ') || 'Your names';
  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        height: height ?? '100%',
        minHeight: 84,
        borderRadius: 10,
        border: '1px solid var(--line-soft)',
        overflow: 'hidden',
        background: paper,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flexShrink: 0,
        ...style,
      }}
    >
      {/* The real material, not a suggestion of one. */}
      <TextureLayer texture={texture} intensity={intensity} />
      <span
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 8, fontWeight: 600, letterSpacing: '0.24em',
          textTransform: 'uppercase', color: inkSoft, position: 'relative',
        }}
      >
        The day itself
      </span>
      <span
        style={{
          fontFamily: display, fontSize: 21, color: ink, lineHeight: 1.1,
          maxWidth: '86%', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', position: 'relative',
        }}
      >
        {title}
      </span>
      <span aria-hidden style={{ width: 30, height: 1, background: gold, position: 'relative' }} />
      <span
        style={{
          position: 'relative',
          padding: '4px 13px', borderRadius: 999,
          background: v['--t-rsvp'] ?? v['--t-accent'] ?? 'var(--sage-deep)',
          color: v['--t-rsvp-ink'] ?? paper,
          fontFamily: v['--t-body'] ?? 'inherit',
          fontSize: 10, fontWeight: 600,
        }}
      >
        RSVP
      </span>
    </div>
  );
}

export default SiteLookPlate;
