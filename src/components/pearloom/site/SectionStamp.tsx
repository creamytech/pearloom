'use client';

/* ========================================================================
   SectionStamp — a tiny wax-seal stamp rendered next to each section's
   eyebrow label. Pulled from manifest.decorLibrary.sectionStamps[key]
   where key is one of story | schedule | travel | registry | gallery
   | rsvp | faq.

   In published mode the empty state is null (silent — guests never
   see "missing" affordance). In edit mode an "+ ornament" pill appears
   inline so the host knows they can generate stamps. Clicking it
   opens the Theme panel's Decor Library so the host can run the AI
   pass that fills every section's stamp slot in one shot.
   ======================================================================== */

import type { CSSProperties } from 'react';
import { useEditorCanvas } from '../editor/canvas/EditorCanvasContext';
import { focusDecorLibrary } from './focusDecorLibrary';

interface Props {
  url?: string;
  size?: number;
  style?: CSSProperties;
  alt?: string;
}

export function SectionStamp({ url, size = 44, style, alt = '' }: Props) {
  const { editMode } = useEditorCanvas();

  if (url) {
    return (
      <span
        aria-hidden={!alt}
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          marginRight: 10,
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
