'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / studio/StudioPressSheet.tsx
//
// The press-ready sheet (ATELIER-PLAN ST.3) — the print shop's
// replacement. Three pages at exact physical size: card front,
// card back, envelope, each with trim + bleed and crop marks.
// "Save as PDF" runs the browser's print engine over a 6×8in
// @page, so the downloaded PDF opens at true size and any print
// shop (or home printer) can take it from there. Pearloom
// presses the artwork; the paper is the host's.
//
// The pages render the SAME CardFront / CardBack / CardEnvelope
// DOM the canvas shows — the site's --t-* fonts, paper texture,
// kit frame, and the real QR all ride along by construction
// (one renderer, two paper sizes). CSS `in` units carry the
// physical contract; press-sheet-geometry.ts owns the math.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { StudioPalette, StudioFontPair, StudioContent, StationeryType } from './studio-constants';
import { CardFront, CardBack, CardEnvelope } from './StudioCard';
import {
  CARD_PRESS, ENVELOPE_PRESS, PRESS_PAGE,
  coverScale, cropMarks, bleedBox,
  type PressSpec,
} from './press-sheet-geometry';
import { useMobileViewport } from '../redesign/use-mobile-viewport';

interface Props {
  type: StationeryType;
  layout: string;
  motif: string;
  palette: StudioPalette;
  font: StudioFontPair;
  content: StudioContent;
  nameA: string;
  nameB: string;
  monogram: string;
  solemn?: boolean;
  photoUrl?: string | null;
  customMotifUrl?: string | null;
  texture?: string | null;
  /** Paper depth (STUDIO-PLAN SV.2) — the press sheet prints the
   *  same sheet the canvas shows. */
  textureIntensity?: number;
  edge?: string | null;
  darkPaper?: boolean;
  motifInk?: string | null;
  headlineScale?: number;
  /** SV.6 — the photo back + the envelope's addressee preview
   *  print exactly as the canvas shows them. */
  backStyle?: string | null;
  addressee?: string | null;
  siteUrl: string;
  rsvpDeadline?: string;
  returnAddress: { name: string; line1?: string; line2?: string };
  themeRoot?: React.CSSProperties;
  postmarkDate?: { dayLine: string; year: string } | null;
  kitId?: string | null;
  ceremonyAt?: string;
  receptionAt?: string;
  dressCode?: string;
  hotelLine?: string;
  onClose: () => void;
}

/** One physical page: crop marks on the artboard, artwork scaled
 *  to COVER the bleed box (clipped there — the trim cut happens
 *  inside). `rotate` lays a landscape artboard onto the portrait
 *  page (the envelope). */
function PressPage({
  spec, rotate, label, domW, domH, isLast, children,
}: {
  spec: PressSpec;
  rotate?: boolean;
  label: string;
  domW: number;
  domH: number;
  /** The final sheet — no page break after it (a trailing break
   *  prints a blank fourth page). */
  isLast?: boolean;
  children: React.ReactNode;
}) {
  const scale = coverScale(domW, domH, spec);
  const marks = cropMarks(spec);
  const bb = bleedBox(spec);

  const artboard = (
    <div
      style={{
        position: rotate ? 'absolute' : 'relative',
        width: `${spec.artW}in`,
        height: `${spec.artH}in`,
        background: '#fff',
        ...(rotate
          ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(90deg)' }
          : {}),
      }}
    >
      {/* Crop marks — hairline black, held outside the bleed. */}
      <svg
        aria-hidden
        viewBox={`0 0 ${spec.artW} ${spec.artH}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {marks.map((m, i) => (
          <line key={i} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="#000" strokeWidth={0.006} />
        ))}
      </svg>
      {/* The bleed box — artwork clips here. */}
      <div
        style={{
          position: 'absolute',
          left: `${bb.x}in`, top: `${bb.y}in`,
          width: `${bb.w}in`, height: `${bb.h}in`,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div className="pl-press-scale" style={{ transform: `scale(${scale})`, transformOrigin: 'center', flexShrink: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className={isLast ? 'pl-press-piece pl-press-piece-last' : 'pl-press-piece'} style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <div className="pl-press-label" style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: 'var(--ink-muted, #6F6557)',
      }}>
        {label}
      </div>
      <div
        className="pl-press-page"
        style={{
          position: 'relative',
          width: `${PRESS_PAGE.w}in`,
          height: `${PRESS_PAGE.h}in`,
          background: '#fff',
          boxShadow: '0 18px 44px -20px rgba(61,74,31,0.35)',
          overflow: 'hidden',
        }}
      >
        {artboard}
      </div>
    </div>
  );
}

export function StudioPressSheet(props: Props) {
  const {
    type, layout, motif, palette, font, content, nameA, nameB, monogram,
    solemn, photoUrl, customMotifUrl, texture, textureIntensity, edge, darkPaper,
    motifInk, headlineScale, backStyle, addressee,
    siteUrl, rsvpDeadline,
    returnAddress, themeRoot, postmarkDate, kitId,
    ceremonyAt, receptionAt, dressCode, hotelLine, onClose,
  } = props;
  const mobile = useMobileViewport();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shared = {
    type, layout, motif, palette, font, content, nameA, nameB, monogram,
    solemn, texture, textureIntensity, edge, darkPaper, motifInk, headlineScale,
    themeRoot, postmarkDate, kitId, siteUrl, rsvpDeadline,
  };

  const sheet = (
    <div
      className="pl-press-sheet"
      role="dialog"
      aria-label="Press-ready sheet"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'var(--cream-2, #E7E2D6)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <header
        className="pl-press-chrome"
        style={{
          padding: mobile ? '10px 14px' : '12px 22px',
          display: 'flex', alignItems: 'center',
          flexWrap: mobile ? 'wrap' : undefined,
          gap: mobile ? 10 : 16,
          background: 'rgba(248,241,228,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--line-soft, var(--pl-divider-soft, #E5DCC4))',
        }}
      >
        <div style={{
          fontFamily: 'var(--pl-font-display, "Fraunces"), Georgia, serif',
          fontWeight: 600, fontSize: 18, color: 'var(--ink, #0E0D0B)',
        }}>
          The press sheet
        </div>
        <span style={{
          fontSize: 12, color: 'var(--ink-muted, #6F6557)',
          borderLeft: '1px solid var(--line, var(--pl-divider, #D8CFB8))',
          paddingLeft: 14,
        }}>
          {type === 'std' ? 'Save the date' : type === 'invite' ? 'Invitation' : 'Thank-you'}
          {' · front, back & envelope at exact size, trim and bleed marked'}
        </span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            padding: '8px 14px', borderRadius: 999, border: 'none',
            background: 'var(--ink, #0E0D0B)', color: 'var(--cream, #F5EFE2)',
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Save as PDF / print
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close press sheet"
          style={{
            padding: '8px 14px', borderRadius: 999, background: 'transparent',
            color: 'var(--ink, #0E0D0B)',
            border: '1px solid var(--line, var(--pl-divider, #D8CFB8))',
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Close
        </button>
      </header>

      <div
        className="pl-press-stage"
        style={{
          flex: 1, overflow: 'auto',
          display: 'flex', flexWrap: 'wrap', gap: mobile ? 24 : 40,
          alignItems: 'flex-start', justifyContent: 'center',
          padding: mobile ? '20px 12px 32px' : '36px 24px 48px',
        }}
      >
        <PressPage spec={CARD_PRESS} label="Front · 5×7″ + bleed" domW={420} domH={588}>
          <CardFront
            {...shared}
            view="front"
            photoUrl={photoUrl}
            customMotifUrl={customMotifUrl}
          />
        </PressPage>
        <PressPage spec={CARD_PRESS} label="Back · 5×7″ + bleed" domW={420} domH={588}>
          <CardBack
            {...shared}
            view="back"
            backStyle={backStyle}
            photoUrl={photoUrl}
            ceremonyAt={ceremonyAt}
            receptionAt={receptionAt}
            dressCode={dressCode}
            hotelLine={hotelLine}
          />
        </PressPage>
        <PressPage spec={ENVELOPE_PRESS} rotate label="Envelope · A7" domW={540} domH={380} isLast>
          <CardEnvelope
            {...shared}
            view="envelope"
            addressee={addressee}
            returnAddress={returnAddress}
          />
        </PressPage>

        <div className="pl-press-label" style={{
          flexBasis: '100%', textAlign: 'center',
          fontSize: 11.5, color: 'var(--ink-muted, #6F6557)', paddingBottom: 8,
        }}>
          Pearloom presses the artwork, the paper is yours. Any print shop or home printer takes it from here.
        </div>
      </div>

      <style jsx global>{`
        /* Press pages read flat, like proofs on a light table —
           the desk shadow + rounded corners belong to the canvas,
           not the artwork. Squared corners matter: the trim cut is
           straight, and a rounded card edge would notch the bleed. */
        .pl-press-scale > * {
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        @media print {
          @page { size: ${PRESS_PAGE.w}in ${PRESS_PAGE.h}in; margin: 0; }
          body > *:not(.pl-press-sheet) { display: none !important; }
          body { margin: 0 !important; background: #fff !important; }
          .pl-press-sheet {
            position: static !important;
            overflow: visible !important;
            background: #fff !important;
            display: block !important;
          }
          .pl-press-chrome, .pl-press-label { display: none !important; }
          .pl-press-stage {
            display: block !important;
            overflow: visible !important;
            padding: 0 !important;
          }
          .pl-press-piece {
            display: block !important;
            margin: 0 !important;
            break-after: page;
            page-break-after: always;
          }
          .pl-press-piece-last { break-after: auto; page-break-after: auto; }
          .pl-press-page {
            margin: 0 !important;
            box-shadow: none !important;
          }
          .pl-press-page, .pl-press-page * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );

  /* Portal to <body> so the print stylesheet can hide the whole
     app with one selector and the pages flow from page 1. Only
     mounted on user action, so document is always available. */
  return createPortal(sheet, document.body);
}
