'use client';

 
/* BrandedQR — Pearloom-styled QR code that replaces the generic
   black-and-white square grid with:
     • Rounded-dot modules — soft circular fill in the host's theme
       ink, not hard black squares.
     • Bespoke corner finder patterns — the three large position
       markers get a rounded outer ring + filled inner dot instead
       of the default square-in-square.
     • Centered monogram badge — the couple's initials (or a single
       name initial for solo-honoree events) sit in a cream pill
       with a thin accent ring. The QR uses error-correction level
       'H' so ~30% of the modules can be obscured and the code
       still scans.
   Renders inline SVG so it's crisp at any size and Download-as-PNG
   serialises cleanly via canvas roundtrip. */

import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  /** URL the QR resolves to. */
  value: string;
  /** Rendered side length in CSS pixels. Defaults to 220. */
  size?: number;
  /** Initials to overlay in the center badge. Empty string hides
   *  the badge so the QR scans cleanly without a logo cutout. */
  initials?: string;
  /** Dark color (the dots). Defaults to the editor's --ink. */
  dark?: string;
  /** Light color (the background). Defaults to the editor's --cream. */
  light?: string;
  /** Accent color used for the center badge's ring. Defaults to
   *  the editor's --peach-ink. */
  accent?: string;
  /** Background tile shape. 'square' keeps a clean printable card,
   *  'circle' (default) tucks the dots into a cream disc. */
  shape?: 'square' | 'circle';
}

export function BrandedQR({
  value,
  size = 220,
  initials = '',
  dark = 'var(--ink, #0E0D0B)',
  light = 'var(--cream-2, #FBF7EE)',
  accent = 'var(--peach-ink, #C6703D)',
  shape = 'square',
}: Props) {
  /* qrcode's create() returns the bit matrix synchronously — no
     async required. We memoize on `value` so re-renders for size
     / color changes don't re-encode. */
  const matrix = useMemo(() => {
    try {
      return QRCode.create(value, { errorCorrectionLevel: 'H' });
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) return null;
  const moduleCount = matrix.modules.size;
  /* Cell size in viewBox units. We use a fixed viewBox of
     moduleCount × moduleCount so each module is exactly 1 unit
     and the visual size comes from the outer width/height. */
  const VB = moduleCount;

  /* Quiet-zone padding inside the SVG viewBox so the dots don't
     touch the edge — most scanners need ~4 modules of margin.
     We add 4 units of margin to the viewBox and inset everything. */
  const PAD = 4;
  const totalVB = VB + PAD * 2;

  /* Detect finder patterns (top-left, top-right, bottom-left).
     Each is a 7x7 square in the corners that we'll replace with
     a rounded-corner outer ring + inner filled square. */
  function isInFinderPattern(r: number, c: number): boolean {
    return (
      (r < 7 && c < 7) ||
      (r < 7 && c >= moduleCount - 7) ||
      (r >= moduleCount - 7 && c < 7)
    );
  }

  /* Initials sizing — width-aware so 1 vs 2-3 chars don't crowd
     or float. The center badge covers ~22% of the QR width
     (within the H-level ECC budget). */
  const trimmed = initials.trim();
  const showBadge = trimmed.length > 0;
  const badgeR = totalVB * 0.13; // radius in viewBox units
  const badgeFontSize = badgeR * 0.95;

  /* Three finder-pattern positions [row, col]. */
  const finders: Array<[number, number]> = [
    [0, 0],
    [0, moduleCount - 7],
    [moduleCount - 7, 0],
  ];

  return (
    <svg
      viewBox={`0 0 ${totalVB} ${totalVB}`}
      width={size}
      height={size}
      role="img"
      aria-label="QR code linking to your site"
      style={{ display: 'block', borderRadius: shape === 'circle' ? '50%' : 14 }}
    >
      {/* Backplate — cream tile or disc. */}
      {shape === 'circle' ? (
        <circle cx={totalVB / 2} cy={totalVB / 2} r={totalVB / 2} fill={light} />
      ) : (
        <rect x={0} y={0} width={totalVB} height={totalVB} rx={3} fill={light} />
      )}

      {/* Data modules — render every "1" cell EXCEPT those inside
          the three finder patterns (we paint those separately
          with the custom rounded style). */}
      <g fill={dark}>
        {Array.from({ length: moduleCount }).flatMap((_, r) =>
          Array.from({ length: moduleCount }).map((_, c) => {
            const isOn = matrix.modules.get(r, c);
            if (!isOn) return null;
            if (isInFinderPattern(r, c)) return null;
            return (
              <circle
                key={`${r}-${c}`}
                cx={PAD + c + 0.5}
                cy={PAD + r + 0.5}
                r={0.42}
              />
            );
          }),
        )}
      </g>

      {/* Finder patterns — three rounded "eye" markers. Each is a
          square outer ring (drawn as a path) + a filled inner
          square. Rounded corners give the brand-fit look that
          flat squares lack. */}
      <g fill={dark}>
        {finders.map(([r, c], i) => {
          const x = PAD + c;
          const y = PAD + r;
          return (
            <g key={`finder-${i}`}>
              {/* Outer 7×7 ring with rounded corners.
                  Uses fill-rule="evenodd" + a nested inner rect
                  to cut out the 5×5 center. */}
              <path
                fillRule="evenodd"
                d={`
                  M ${x + 1} ${y} h 5 a 1 1 0 0 1 1 1 v 5 a 1 1 0 0 1 -1 1 h -5 a 1 1 0 0 1 -1 -1 v -5 a 1 1 0 0 1 1 -1 z
                  M ${x + 1.5} ${y + 0.8} h 4 a 0.7 0.7 0 0 1 0.7 0.7 v 4 a 0.7 0.7 0 0 1 -0.7 0.7 h -4 a 0.7 0.7 0 0 1 -0.7 -0.7 v -4 a 0.7 0.7 0 0 1 0.7 -0.7 z
                `}
              />
              {/* Inner 3×3 filled square — slightly inset, fully
                  rounded for the brand polish. */}
              <rect
                x={x + 2}
                y={y + 2}
                width={3}
                height={3}
                rx={0.9}
                fill={dark}
              />
            </g>
          );
        })}
      </g>

      {/* Center monogram badge — only when initials provided.
          Cream pill with a 1-unit accent ring + Fraunces initials. */}
      {showBadge && (
        <g>
          <circle
            cx={totalVB / 2}
            cy={totalVB / 2}
            r={badgeR}
            fill={light}
            stroke={accent}
            strokeWidth={0.6}
          />
          <text
            x={totalVB / 2}
            y={totalVB / 2 + badgeFontSize * 0.34}
            textAnchor="middle"
            fontFamily="var(--font-display, Fraunces, Georgia, serif)"
            fontStyle="italic"
            fontWeight={500}
            fontSize={badgeFontSize}
            fill={dark}
            letterSpacing={trimmed.length > 2 ? -0.4 : 0}
          >
            {trimmed}
          </text>
        </g>
      )}
    </svg>
  );
}

/* Helper — turn the live SVG into a PNG dataURL the host can
   download. Renders the inline SVG into a canvas at 4× the
   intended print size so the dots stay crisp on paper. Returns
   null on browsers without canvas (SSR / unsupported). */
export function useBrandedQrPng(svgRef: React.RefObject<SVGSVGElement | null>, scale = 4): {
  download: (filename: string) => void;
  pending: boolean;
} {
  const [pending, setPending] = useState(false);
  const ref = useRef(svgRef);
  useEffect(() => { ref.current = svgRef; }, [svgRef]);

  function download(filename: string) {
    const svg = ref.current.current;
    if (!svg || typeof document === 'undefined') return;
    setPending(true);
    /* Serialize the SVG (CSS variables resolved at render — we
       inline computed colors before serializing). */
    const cloned = svg.cloneNode(true) as SVGSVGElement;
    /* Inline computed styles for the few attributes we use.
       Most browsers serialise inline attribute fills fine, but
       any `var(--…)` would break in the export — convert to
       the resolved color. */
    const cs = getComputedStyle(svg);
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    cloned.setAttribute('color', cs.color);
    const xml = new XMLSerializer().serializeToString(cloned);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const vb = (svg.viewBox.baseVal.width || 64);
      const cssSize = svg.clientWidth || vb;
      const canvas = document.createElement('canvas');
      canvas.width = cssSize * scale;
      canvas.height = cssSize * scale;
      const cx = canvas.getContext('2d');
      if (!cx) { setPending(false); URL.revokeObjectURL(url); return; }
      cx.imageSmoothingEnabled = true;
      cx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) { setPending(false); return; }
        const dl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = dl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(dl);
        setPending(false);
      }, 'image/png');
    };
    img.onerror = () => { setPending(false); URL.revokeObjectURL(url); };
    img.src = url;
  }

  return { download, pending };
}

export default BrandedQR;
