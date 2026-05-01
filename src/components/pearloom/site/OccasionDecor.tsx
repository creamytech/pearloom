'use client';

/* ========================================================================
   OccasionDecor — per-occasion SVG graphics that decorate the hero + key
   sections. Replaces the universal squiggle+blob with event-specific
   visuals (disco ball for sweet-16, candles for memorial, balloons for
   birthday, laurel for graduation, etc.).

   Every icon reads three CSS vars (peach-ink = accent, sage-deep = deep,
   ink = foreground) so the template palette flows through automatically.
   Users can swap between "library sets" per site by changing the
   occasion — or the editor can pick a set manually.

   Usage:
       <OccasionDecor occasion={manifest.occasion} variant="hero" />
   ======================================================================== */

import type { CSSProperties } from 'react';

export type DecorVariant = 'hero' | 'section';

interface Props {
  occasion?: string;
  variant?: DecorVariant;
  style?: CSSProperties;
}

export function OccasionDecor({ occasion, variant = 'hero', style }: Props) {
  const kind = mapToDecorKind(occasion);
  return (
    <div
      aria-hidden="true"
      className={`pl8-decor pl8-decor-${kind}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        ...style,
      }}
    >
      {renderDecorFor(kind, variant)}
    </div>
  );
}

/** Rolls ~35 occasions down to 9 visual families. */
function mapToDecorKind(occasion?: string): DecorKind {
  switch ((occasion ?? '').toLowerCase()) {
    case 'wedding':
    case 'engagement':
    case 'anniversary':
    case 'vow-renewal':
    case 'rehearsal-dinner':
    case 'welcome-party':
    case 'brunch':
    case 'bridal-luncheon':
      return 'wedding';
    case 'bachelor-party':
    case 'bachelorette-party':
    case 'bridal-shower':
      return 'party';
    case 'baby-shower':
    case 'gender-reveal':
    case 'sip-and-see':
    case 'first-birthday':
      return 'baby';
    case 'birthday':
    case 'milestone-birthday':
    case 'sweet-sixteen':
      return 'disco';
    case 'retirement':
      return 'retirement';
    case 'graduation':
      return 'graduation';
    case 'memorial':
    case 'funeral':
    case 'celebration-life':
      return 'memorial';
    case 'reunion':
      return 'reunion';
    case 'bar-mitzvah':
    case 'bat-mitzvah':
    case 'quinceanera':
    case 'baptism':
    case 'first-communion':
    case 'confirmation':
      return 'ceremonial';
    case 'housewarming':
      return 'housewarming';
    case 'story':
    default:
      return 'story';
  }
}

type DecorKind =
  | 'wedding'
  | 'party'
  | 'baby'
  | 'disco'
  | 'retirement'
  | 'graduation'
  | 'memorial'
  | 'reunion'
  | 'ceremonial'
  | 'housewarming'
  | 'story';

function renderDecorFor(kind: DecorKind, variant: DecorVariant) {
  const accent = 'var(--peach-ink)';
  const deep = 'var(--sage-deep)';
  const ink = 'var(--ink)';
  const soft = 'var(--peach-bg)';
  const pieceOpacity = variant === 'hero' ? 0.92 : 0.55;

  switch (kind) {
    case 'wedding':
      return (
        <>
          {/* Twin rings top-right */}
          <svg
            width="120"
            height="70"
            viewBox="0 0 120 70"
            style={{ position: 'absolute', top: 40, right: 50, opacity: pieceOpacity }}
          >
            <circle cx="45" cy="35" r="28" fill="none" stroke={accent} strokeWidth="2" />
            <circle cx="75" cy="35" r="28" fill="none" stroke={accent} strokeWidth="2" />
          </svg>
          {/* Olive branch bottom-left */}
          <svg width="220" height="110" viewBox="0 0 220 110" style={{ position: 'absolute', bottom: 30, left: 40, opacity: pieceOpacity, transform: 'rotate(-8deg)' }}>
            <path d="M10 100 Q 80 70, 160 30" fill="none" stroke={deep} strokeWidth="1.6" />
            {Array.from({ length: 8 }).map((_, i) => (
              <ellipse
                key={i}
                cx={30 + i * 18}
                cy={100 - i * 9 - (i % 2) * 6}
                rx="8"
                ry="3.5"
                fill={deep}
                opacity={0.72}
                transform={`rotate(${-30 + (i % 2) * 60} ${30 + i * 18} ${100 - i * 9 - (i % 2) * 6})`}
              />
            ))}
          </svg>
        </>
      );

    case 'party':
      return (
        <>
          {/* Confetti triangles + stars */}
          {Array.from({ length: 14 }).map((_, i) => {
            const seed = (i + 1) * 37;
            const top = (seed * 7) % 260;
            const left = (seed * 13) % 800;
            const rot = (seed * 11) % 360;
            const hue = i % 3 === 0 ? accent : i % 3 === 1 ? deep : ink;
            return (
              <svg
                key={i}
                width={10 + (i % 3) * 6}
                height={10 + (i % 3) * 6}
                viewBox="0 0 20 20"
                style={{
                  position: 'absolute',
                  top,
                  left,
                  opacity: 0.78,
                  transform: `rotate(${rot}deg)`,
                }}
              >
                {i % 2 === 0 ? (
                  <polygon points="10,2 18,18 2,18" fill={hue} />
                ) : (
                  <circle cx="10" cy="10" r="4.2" fill={hue} />
                )}
              </svg>
            );
          })}
        </>
      );

    case 'disco':
      return (
        <>
          {/* Disco ball top-right */}
          <svg width="180" height="180" viewBox="0 0 180 180" style={{ position: 'absolute', top: -20, right: 40, opacity: 0.92 }}>
            <defs>
              <radialGradient id="pl-disco" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                <stop offset="55%" stopColor={accent} stopOpacity="0.65" />
                <stop offset="100%" stopColor={ink} stopOpacity="0.85" />
              </radialGradient>
            </defs>
            <circle cx="90" cy="95" r="64" fill="url(#pl-disco)" />
            {/* grid facets */}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={i} x1={26 + i * 16} y1="35" x2={26 + i * 16} y2="155" stroke="#fff" strokeWidth="0.8" opacity="0.35" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={i} x1="26" y1={40 + i * 15} x2="154" y2={40 + i * 15} stroke="#fff" strokeWidth="0.8" opacity="0.35" />
            ))}
            {/* suspension */}
            <line x1="90" y1="0" x2="90" y2="30" stroke={ink} strokeWidth="1.4" />
          </svg>
          {/* Glitter stars */}
          {Array.from({ length: 10 }).map((_, i) => {
            const seed = (i + 5) * 41;
            const top = (seed * 5) % 300;
            const left = (seed * 13 + 60) % 900;
            return (
              <svg key={i} width="14" height="14" viewBox="0 0 14 14" style={{ position: 'absolute', top, left, opacity: 0.78 }}>
                <path d="M7 0 L8 6 L14 7 L8 8 L7 14 L6 8 L0 7 L6 6 Z" fill={accent} />
              </svg>
            );
          })}
        </>
      );

    case 'baby':
      return (
        <>
          {/* Balloons tied top-left */}
          <svg width="140" height="230" viewBox="0 0 140 230" style={{ position: 'absolute', top: -10, left: 30, opacity: 0.95 }}>
            <path d="M70 220 C 40 180 20 130 30 90" fill="none" stroke={ink} strokeWidth="1" opacity="0.55" />
            <path d="M70 220 C 90 180 110 140 100 100" fill="none" stroke={ink} strokeWidth="1" opacity="0.55" />
            <path d="M70 220 C 60 160 50 100 65 60" fill="none" stroke={ink} strokeWidth="1" opacity="0.55" />
            <ellipse cx="30" cy="78" rx="24" ry="30" fill={soft} stroke={accent} strokeWidth="1.2" />
            <ellipse cx="100" cy="88" rx="24" ry="30" fill={accent} opacity="0.6" />
            <ellipse cx="66" cy="48" rx="24" ry="30" fill={deep} opacity="0.55" />
          </svg>
          {/* Cloud + stars right */}
          <svg width="160" height="90" viewBox="0 0 160 90" style={{ position: 'absolute', top: 80, right: 40, opacity: 0.65 }}>
            <ellipse cx="55" cy="55" rx="42" ry="18" fill="#fff" />
            <ellipse cx="90" cy="45" rx="30" ry="16" fill="#fff" />
            <ellipse cx="115" cy="55" rx="22" ry="14" fill="#fff" />
          </svg>
        </>
      );

    case 'retirement':
      return (
        <>
          {/* Palm branch + sun */}
          <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: 'absolute', top: 10, right: 20, opacity: 0.72 }}>
            <circle cx="150" cy="60" r="30" fill={accent} opacity="0.55" />
            <g stroke={deep} strokeWidth="1.8" fill="none">
              <path d="M20 180 Q 100 140, 180 70" />
              {Array.from({ length: 8 }).map((_, i) => (
                <path key={i} d={`M${30 + i * 20} ${175 - i * 12} Q ${40 + i * 20} ${145 - i * 12}, ${60 + i * 18} ${160 - i * 13}`} />
              ))}
            </g>
          </svg>
        </>
      );

    case 'graduation':
      return (
        <>
          {/* Mortarboard + laurel */}
          <svg width="160" height="140" viewBox="0 0 160 140" style={{ position: 'absolute', top: 20, right: 40, opacity: 0.88 }}>
            <polygon points="80,20 150,55 80,90 10,55" fill={ink} />
            <rect x="62" y="60" width="36" height="26" fill={accent} />
            <line x1="140" y1="55" x2="140" y2="115" stroke={accent} strokeWidth="2" />
            <circle cx="140" cy="118" r="8" fill={accent} />
          </svg>
          {/* Laurel bottom */}
          <svg width="260" height="90" viewBox="0 0 260 90" style={{ position: 'absolute', bottom: 30, left: 40, opacity: 0.72 }}>
            <path d="M20 70 Q 130 20, 240 70" fill="none" stroke={deep} strokeWidth="1.8" />
            {Array.from({ length: 9 }).map((_, i) => (
              <ellipse key={i} cx={30 + i * 26} cy={70 - Math.abs(i - 4) * 4} rx="8" ry="3.6" fill={deep} opacity="0.78" transform={`rotate(${-30 + i * 8} ${30 + i * 26} ${70 - Math.abs(i - 4) * 4})`} />
            ))}
          </svg>
        </>
      );

    case 'memorial':
      return (
        <>
          {/* Three candles + dove silhouette */}
          <svg width="220" height="200" viewBox="0 0 220 200" style={{ position: 'absolute', bottom: 10, right: 30, opacity: 0.82 }}>
            {[30, 80, 130].map((x, i) => (
              <g key={i} transform={`translate(${x + 20}, 0)`}>
                <path d={`M0 40 Q -4 20, 0 5 Q 4 20, 0 40`} fill={accent} opacity="0.9" />
                <rect x="-6" y="40" width="12" height="120" fill={deep} opacity="0.82" />
                <ellipse cx="0" cy="40" rx="6" ry="2" fill={ink} opacity="0.6" />
              </g>
            ))}
          </svg>
          {/* Soft sun ring top */}
          <svg width="240" height="90" viewBox="0 0 240 90" style={{ position: 'absolute', top: 30, left: 40, opacity: 0.35 }}>
            <circle cx="120" cy="80" r="60" fill="none" stroke={accent} strokeWidth="1.2" />
            <circle cx="120" cy="80" r="75" fill="none" stroke={accent} strokeWidth="0.6" strokeDasharray="2 6" />
          </svg>
        </>
      );

    case 'reunion':
      return (
        <>
          {/* Pennants strung across the top */}
          <svg width="100%" height="60" viewBox="0 0 1000 60" preserveAspectRatio="none" style={{ position: 'absolute', top: 20, left: 0, opacity: 0.82 }}>
            <path d="M0 10 Q 500 35, 1000 10" fill="none" stroke={ink} strokeWidth="0.8" opacity="0.45" />
            {Array.from({ length: 12 }).map((_, i) => {
              const x = 40 + i * 80;
              const hue = i % 3 === 0 ? accent : i % 3 === 1 ? deep : ink;
              return <polygon key={i} points={`${x},14 ${x + 20},14 ${x + 10},38`} fill={hue} opacity={0.78} />;
            })}
          </svg>
          {/* Year badge */}
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: 'absolute', bottom: 20, left: 40, opacity: 0.82 }}>
            <circle cx="60" cy="60" r="52" fill="none" stroke={accent} strokeWidth="1.5" />
            <text x="60" y="54" textAnchor="middle" fontFamily="Georgia, serif" fontSize="14" fill={accent} letterSpacing="4">EST.</text>
            <text x="60" y="78" textAnchor="middle" fontFamily="Georgia, serif" fontSize="20" fontWeight="700" fill={accent}>2010</text>
          </svg>
        </>
      );

    case 'ceremonial':
      return (
        <>
          {/* Crown/tiara top, filigree below */}
          <svg width="180" height="100" viewBox="0 0 180 100" style={{ position: 'absolute', top: 30, right: 60, opacity: 0.82 }}>
            <path d="M10 70 L40 25 L70 70 L100 20 L130 70 L160 30 L175 70" fill="none" stroke={accent} strokeWidth="2" />
            {Array.from({ length: 7 }).map((_, i) => (
              <circle key={i} cx={10 + i * 27} cy={70 + (i % 2 === 0 ? 0 : -3)} r="3" fill={accent} />
            ))}
            <line x1="5" y1="80" x2="175" y2="80" stroke={accent} strokeWidth="1.2" />
          </svg>
          {/* Ornamental flourish bottom */}
          <svg width="300" height="60" viewBox="0 0 300 60" style={{ position: 'absolute', bottom: 20, left: 60, opacity: 0.72 }}>
            <path d="M10 30 Q 60 10, 150 30 T 290 30" fill="none" stroke={accent} strokeWidth="1.6" />
            {[50, 110, 170, 230].map((x, i) => (
              <circle key={i} cx={x} cy="30" r="3" fill={accent} />
            ))}
          </svg>
        </>
      );

    case 'housewarming':
      return (
        <>
          {/* House silhouette + keys */}
          <svg width="180" height="160" viewBox="0 0 180 160" style={{ position: 'absolute', top: 40, right: 60, opacity: 0.72 }}>
            <polygon points="25,90 90,30 155,90" fill="none" stroke={deep} strokeWidth="1.8" />
            <rect x="40" y="90" width="100" height="55" fill="none" stroke={deep} strokeWidth="1.8" />
            <rect x="80" y="112" width="20" height="33" fill={accent} opacity="0.78" />
            <circle cx="95" cy="130" r="1.5" fill={deep} />
          </svg>
        </>
      );

    case 'story':
    default:
      return (
        <>
          {/* Pen nib + open book silhouette */}
          <svg width="220" height="120" viewBox="0 0 220 120" style={{ position: 'absolute', bottom: 20, right: 40, opacity: 0.72 }}>
            <path d="M10 80 Q 50 60, 100 80 T 200 80" fill="none" stroke={deep} strokeWidth="1.6" />
            <path d="M10 100 L100 90 L100 105 L10 115 Z" fill={soft} stroke={deep} strokeWidth="1" />
            <path d="M110 90 L200 100 L200 115 L110 105 Z" fill={soft} stroke={deep} strokeWidth="1" />
          </svg>
        </>
      );
  }
}
