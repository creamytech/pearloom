'use client';

/* ========================================================================
   FooterBouquet — the editorial closing flourish that sits above the
   site footer. Pulled from manifest.decorLibrary.footerBouquet. Empty
   in published mode; in edit mode shows an "+ closing flourish"
   affordance that drops the user into the Decor Library so they can
   generate one.
   ======================================================================== */

import { useEditorCanvas } from '../editor/canvas/EditorCanvasContext';
import { focusDecorLibrary } from './focusDecorLibrary';

interface Props {
  url?: string;
}

export function FooterBouquet({ url }: Props) {
  const { editMode } = useEditorCanvas();

  if (url) {
    return (
      <div
        aria-hidden="true"
        style={{
          display: 'grid',
          placeItems: 'center',
          padding: '48px 24px 0',
        }}
      >
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            width: 'clamp(180px, 42cqw, 320px)',
            height: 'auto',
            maxHeight: 'min(280px, 40vh)',
            aspectRatio: '2 / 3',
            objectFit: 'contain',
            mixBlendMode: 'multiply',
            opacity: 0.92,
          }}
        />
      </div>
    );
  }

  if (!editMode) return null;

  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        padding: '36px 24px 12px',
      }}
    >
      <button
        type="button"
        onClick={focusDecorLibrary}
        data-pl-no-select=""
        title="Generate the AI closing flourish"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--peach-ink, #C6703D)',
          background: 'var(--peach-bg, rgba(198,112,61,0.06))',
          border: '1px dashed currentColor',
          borderRadius: 999,
          cursor: 'pointer',
          opacity: 0.78,
          transition: 'opacity 160ms ease, transform 160ms ease',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.02)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.78'; e.currentTarget.style.transform = ''; }}
      >
        + Generate closing flourish
      </button>
    </div>
  );
}
