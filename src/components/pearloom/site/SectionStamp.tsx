'use client';

/* ========================================================================
   SectionStamp — single glyph for a section's eyebrow.
   Reads manifest.decorLibrary.sectionStamps[key] for a per-section
   AI-generated mark; falls back to an inline icon when the host
   hasn't generated stamps yet. Either way one glyph renders, never
   two — the previous "stamp + icon" combo was redundant noise.

   Sized to match the eyebrow line-height (default 20px) so the
   layout doesn't shift when the host generates a library and the
   stamp swaps in for the icon.

   In edit mode without a URL: renders an "+ ornament" pill that
   drops the user into the Theme tab's Decor Library so they can
   generate the missing set. Published mode with no URL falls back
   to the icon if one was provided, otherwise renders nothing.
   ======================================================================== */

import type { CSSProperties } from 'react';
import { useEditorCanvas } from '../editor/canvas/EditorCanvasContext';
import { focusDecorLibrary } from './focusDecorLibrary';
import { Icon } from '../motifs';

interface Props {
  url?: string;
  size?: number;
  style?: CSSProperties;
  alt?: string;
  /** Inline icon name to render when no AI stamp URL is present.
   *  Typically the section's existing motif (leaf, clock, gift,
   *  etc.). Provided so the eyebrow always has exactly ONE glyph,
   *  whether or not the host has generated a decor library. */
  fallbackIcon?: string;
}

export function SectionStamp({ url, size = 20, style, alt = '', fallbackIcon }: Props) {
  const { editMode } = useEditorCanvas();

  if (url) {
    return (
      <span
        aria-hidden={!alt}
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          marginRight: 6,
          verticalAlign: 'middle',
          backgroundImage: `url(${url})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          // Blend mode + filter are theme-aware via CSS variables.
          // Default 'multiply' looks great on warm cream paper (the
          // brand) but disappears on dark backgrounds —
          // SiteV8Renderer's themeStyle flips this to 'screen' +
          // brightness lift when the theme bg is dark so the stamp
          // lifts onto midnight surfaces.
          mixBlendMode: 'var(--stamp-blend, multiply)' as 'multiply',
          filter: 'var(--stamp-filter, none)',
          ...style,
        }}
      />
    );
  }

  // Fallback icon — rendered when no AI stamp exists. Keeps the
  // eyebrow visually anchored regardless of whether the host has
  // run the Decor Library. Sized 0.65× the stamp size so the
  // smaller, lighter motif reads as restrained next to the
  // eyebrow type.
  if (!editMode && fallbackIcon) {
    const iconSize = Math.round(size * 0.65);
    return (
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          marginRight: 6,
          verticalAlign: 'middle',
          color: 'inherit',
          ...style,
        }}
      >
        <Icon name={fallbackIcon} size={iconSize} />
      </span>
    );
  }

  if (!editMode) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        focusDecorLibrary();
      }}
      data-pl-no-select=""
      title="Generate AI ornaments for every section"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginRight: 10,
        padding: '2px 8px',
        height: 22,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--peach-ink, #C6703D)',
        background: 'var(--peach-bg, rgba(198,112,61,0.08))',
        border: '1px dashed currentColor',
        borderRadius: 999,
        cursor: 'pointer',
        opacity: 0.78,
        transition: 'opacity 160ms ease, transform 160ms ease',
        verticalAlign: 'middle',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.04)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.78'; e.currentTarget.style.transform = ''; }}
    >
      + ornament
    </button>
  );
}
