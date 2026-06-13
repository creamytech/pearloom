'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / studio/StudioPrintPreview.tsx
//
// Print-ready "save-the-date + matching envelope" preview,
// generated entirely from the active site theme. Mirrors the
// prototype's ClaudeDesign/pages/stationery.jsx layout: the
// front of the card on the left, its envelope on the right,
// both painted from the same palette so the host can verify
// both will print as a coordinated set.
//
// Mounted by StudioApp when the host clicks "Preview both" /
// or via the print toolbar's "See pair" button. Uses the same
// CardFront + CardEnvelope primitives the canvas does, so
// pressing Cmd/Ctrl+P prints them on one sheet without any
// new layout code.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { StudioPalette, StudioFontPair, StudioContent, StationeryType } from './studio-constants';
import { CardFront, CardEnvelope } from './StudioCard';
import { ScaledCardBox, useViewportSize } from './StudioMobileChrome';
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
  photoUrl?: string | null;
  customMotifUrl?: string | null;
  siteUrl: string;
  rsvpDeadline?: string;
  returnAddress: { name: string; line1?: string; line2?: string };
  /** Optional manifest reference — kept for future reads (theme.fonts,
   *  theme.colors, etc.). Today the studio palette + font props win
   *  because the host edits them locally; this is a forward seam. */
  manifest?: StoryManifest;
  /** Trigger window.print() — the parent owns the button so the
   *  print preview can also be embedded inline in the studio. */
  onPrint?: () => void;
  /** Open the paid "Mail it for you" flow (Pearloom Print) —
   *  the parent closes this preview and opens the Send overlay
   *  on its mail step. Home printing above stays untouched. */
  onMailIt?: () => void;
  onClose?: () => void;
}

export function StudioPrintPreview({
  type,
  layout,
  motif,
  palette,
  font,
  content,
  nameA,
  nameB,
  monogram,
  photoUrl,
  customMotifUrl,
  siteUrl,
  rsvpDeadline,
  returnAddress,
  onPrint,
  onMailIt,
  onClose,
}: Props) {
  /* Phone-sized viewport — the 5×7 card (420px) and A7 envelope
     (540px) scale to fit the screen width; the @media print
     block in StudioApp strips the scale so paper output stays
     full-size. */
  const mobile = useMobileViewport();
  const { w: vpW } = useViewportSize(mobile);
  const cardScale = mobile && vpW > 0 ? Math.min((vpW - 32) / 420, 1) : 1;
  const envScale = mobile && vpW > 0 ? Math.min((vpW - 32) / 540, 1) : 1;
  return (
    <div
      role="dialog"
      aria-label="Print-ready preview"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: '#E7E2D6',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar — hidden by the print stylesheet in StudioApp via
          `body * { visibility: hidden }`. The .pl-studio-canvas
          override there lifts only the canvas back into visibility,
          so this floating chrome disappears automatically when
          window.print() fires. */}
      <header
        className="no-print"
        style={{
          padding: mobile ? '10px 14px' : '12px 22px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: mobile ? 'wrap' : undefined,
          gap: mobile ? 10 : 16,
          background: 'rgba(248,241,228,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--line-soft, var(--pl-divider-soft, #E5DCC4))',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--pl-font-display, "Fraunces"), Georgia, serif',
            fontWeight: 600,
            fontSize: 18,
            color: 'var(--ink, #0E0D0B)',
          }}
        >
          Stationery
        </div>
        <span
          style={{
            fontSize: 12,
            color: 'var(--ink-muted, #6F6557)',
            borderLeft: '1px solid var(--line, var(--pl-divider, #D8CFB8))',
            paddingLeft: 14,
          }}
        >
          {type === 'std'
            ? 'Save the date · 5×7" + A7'
            : type === 'invite'
              ? 'Invitation · 5×7" + A7'
              : 'Thank-you · 5×7" + A7'}
        </span>
        <div style={{ flex: 1 }} />
        {onMailIt && (
          <button
            type="button"
            onClick={onMailIt}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid var(--line, var(--pl-divider, #D8CFB8))',
              background: 'transparent',
              color: 'var(--ink, #0E0D0B)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Mail it for you
          </button>
        )}
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: 'none',
              background: 'var(--ink, #0E0D0B)',
              color: 'var(--cream, #F5EFE2)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Print / PDF
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--ink, #0E0D0B)',
              border: '1px solid var(--line, var(--pl-divider, #D8CFB8))',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Close
          </button>
        )}
      </header>

      {/* Stage — card on the left, envelope on the right. Both
          render through the same StudioCard primitives that drive
          the main canvas so any palette / motif / layout edit the
          host makes in the rails shows up here without a second
          render path. */}
      <div
        className="pl-studio-canvas"
        style={{
          flex: 1,
          display: 'flex',
          gap: mobile ? 24 : 40,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          padding: mobile ? '24px 16px' : '48px 24px',
          overflow: 'auto',
        }}
      >
        <ScaledCardBox baseW={420} baseH={588} scale={cardScale} radius={6}>
          <CardFront
            type={type}
            view="front"
            layout={layout}
            motif={motif}
            palette={palette}
            font={font}
            content={content}
            nameA={nameA}
            nameB={nameB}
            monogram={monogram}
            photoUrl={photoUrl}
            customMotifUrl={customMotifUrl}
            siteUrl={siteUrl}
            rsvpDeadline={rsvpDeadline}
          />
        </ScaledCardBox>
        <ScaledCardBox baseW={540} baseH={380} scale={envScale} radius={6}>
          <CardEnvelope
            type={type}
            view="envelope"
            layout={layout}
            motif={motif}
            palette={palette}
            font={font}
            content={content}
            nameA={nameA}
            nameB={nameB}
            monogram={monogram}
            returnAddress={returnAddress}
          />
        </ScaledCardBox>
      </div>
    </div>
  );
}
