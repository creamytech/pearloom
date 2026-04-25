'use client';

/* ========================================================================
   BlockMiniature — small SVG diagrams that visually represent each
   section type. Used in the editor Outline so reordering feels like
   moving real cards instead of text labels.

   Each miniature is ~52×34px, schematic, monochrome (uses currentColor)
   so it inherits the row's text colour. The diagrams are deliberately
   simple — they hint at the section's shape (hero photo, schedule list,
   gallery grid) without trying to reproduce the actual content.
   ======================================================================== */

interface Props {
  block: string;
  active?: boolean;
}

export function BlockMiniature({ block, active }: Props) {
  const stroke = active ? 'rgba(255,254,247,0.85)' : 'rgba(40,34,22,0.55)';
  const fill = active ? 'rgba(255,254,247,0.18)' : 'rgba(40,34,22,0.10)';
  return (
    <svg
      width="52"
      height="34"
      viewBox="0 0 52 34"
      aria-hidden
      style={{ display: 'block' }}
    >
      <rect x="0.5" y="0.5" width="51" height="33" rx="4" fill={fill} stroke={stroke} strokeWidth="0.8" />
      {(() => {
        switch (block) {
          case 'hero':
            return (
              <>
                <circle cx="26" cy="13" r="3" fill={stroke} />
                <line x1="14" y1="22" x2="38" y2="22" stroke={stroke} strokeWidth="0.8" />
                <line x1="18" y1="26" x2="34" y2="26" stroke={stroke} strokeWidth="0.6" opacity="0.6" />
              </>
            );
          case 'story':
          case 'our-story':
            return (
              <>
                <line x1="6"  y1="10" x2="46" y2="10" stroke={stroke} strokeWidth="0.7" />
                <line x1="6"  y1="14" x2="42" y2="14" stroke={stroke} strokeWidth="0.7" opacity="0.6" />
                <line x1="6"  y1="18" x2="40" y2="18" stroke={stroke} strokeWidth="0.7" opacity="0.6" />
                <line x1="6"  y1="22" x2="38" y2="22" stroke={stroke} strokeWidth="0.7" opacity="0.6" />
                <line x1="6"  y1="26" x2="34" y2="26" stroke={stroke} strokeWidth="0.7" opacity="0.6" />
              </>
            );
          case 'details':
            return (
              <>
                <rect x="6" y="8" width="12" height="18" rx="2" fill={fill} stroke={stroke} strokeWidth="0.6" />
                <rect x="20" y="8" width="12" height="18" rx="2" fill={fill} stroke={stroke} strokeWidth="0.6" />
                <rect x="34" y="8" width="12" height="18" rx="2" fill={fill} stroke={stroke} strokeWidth="0.6" />
              </>
            );
          case 'schedule':
            return (
              <>
                <circle cx="9" cy="11" r="2" fill={stroke} />
                <line x1="14" y1="11" x2="44" y2="11" stroke={stroke} strokeWidth="0.7" />
                <circle cx="9" cy="17" r="2" fill={stroke} />
                <line x1="14" y1="17" x2="40" y2="17" stroke={stroke} strokeWidth="0.7" />
                <circle cx="9" cy="23" r="2" fill={stroke} />
                <line x1="14" y1="23" x2="36" y2="23" stroke={stroke} strokeWidth="0.7" />
              </>
            );
          case 'travel':
            return (
              <>
                <path d="M8 26 L18 12 L24 22 L34 8 L44 22" stroke={stroke} strokeWidth="0.9" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx="34" cy="8" r="1.4" fill={stroke} />
              </>
            );
          case 'registry':
            return (
              <>
                <rect x="14" y="10" width="24" height="16" rx="1.5" fill={fill} stroke={stroke} strokeWidth="0.7" />
                <line x1="26" y1="10" x2="26" y2="26" stroke={stroke} strokeWidth="0.7" />
                <line x1="14" y1="14" x2="38" y2="14" stroke={stroke} strokeWidth="0.6" />
                <path d="M22 10 C22 6, 26 6, 26 10" stroke={stroke} strokeWidth="0.7" fill="none" />
                <path d="M30 10 C30 6, 26 6, 26 10" stroke={stroke} strokeWidth="0.7" fill="none" />
              </>
            );
          case 'gallery':
            return (
              <>
                {[0, 1, 2].map((c) =>
                  [0, 1].map((r) => (
                    <rect
                      key={`${c}-${r}`}
                      x={6 + c * 14}
                      y={6 + r * 12}
                      width="12"
                      height="10"
                      rx="1.2"
                      fill={fill}
                      stroke={stroke}
                      strokeWidth="0.6"
                    />
                  )),
                )}
              </>
            );
          case 'rsvp':
            return (
              <>
                <rect x="10" y="9" width="32" height="16" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" />
                <path d="M10 9 L26 19 L42 9" stroke={stroke} strokeWidth="0.7" fill="none" />
              </>
            );
          case 'faq':
            return (
              <>
                <line x1="6" y1="10" x2="46" y2="10" stroke={stroke} strokeWidth="0.6" />
                <line x1="6" y1="17" x2="46" y2="17" stroke={stroke} strokeWidth="0.6" />
                <line x1="6" y1="24" x2="46" y2="24" stroke={stroke} strokeWidth="0.6" />
                <text x="42" y="13" fontSize="6" fontFamily="ui-monospace, monospace" fill={stroke}>?</text>
                <text x="42" y="20" fontSize="6" fontFamily="ui-monospace, monospace" fill={stroke}>?</text>
                <text x="42" y="27" fontSize="6" fontFamily="ui-monospace, monospace" fill={stroke}>?</text>
              </>
            );
          case 'theme':
            return (
              <>
                <circle cx="14" cy="17" r="5" fill="rgba(140,160,90,0.7)" />
                <circle cx="22" cy="17" r="5" fill="rgba(196,181,217,0.85)" />
                <circle cx="30" cy="17" r="5" fill="rgba(240,201,168,0.85)" />
                <circle cx="38" cy="17" r="5" fill="rgba(212,169,93,0.85)" />
              </>
            );
          case 'toasts':
            return (
              <>
                <rect x="20" y="6" width="12" height="16" rx="2" fill={fill} stroke={stroke} strokeWidth="0.7" />
                <path d="M20 22 L26 28 L32 22" stroke={stroke} strokeWidth="0.7" fill="none" />
                <line x1="14" y1="11" x2="38" y2="11" stroke={stroke} strokeWidth="0.5" opacity="0.6" />
              </>
            );
          default:
            return (
              <>
                <line x1="10" y1="14" x2="42" y2="14" stroke={stroke} strokeWidth="0.7" />
                <line x1="10" y1="20" x2="38" y2="20" stroke={stroke} strokeWidth="0.7" opacity="0.6" />
              </>
            );
        }
      })()}
    </svg>
  );
}
