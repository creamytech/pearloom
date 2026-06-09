'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / studio/StudioProofSheet.tsx
//
// "Pear pressed six proofs" — the Suite Phase 3 pick moment
// (docs/SUITE-STRATEGY.md §3). An overlay that calls
// /api/suite/proofs once, then renders each proof as a REAL
// mini CardFront (the same StudioCard/StudioLayouts pipeline the
// canvas uses, scaled down — not a mockup). Tapping a proof
// hands it to StudioApp, which applies it through the normal
// useStudioState paths; the host fine-tunes from there.
//
// Proofs flagged useStylizedArt render the cover photo plus a
// small "Add Pear art in Photo style" chip when the host hasn't
// pressed stylized art yet — this flow never fires the image
// model itself (cost).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import type { SuiteProof } from '@/lib/suite/proofs';
import type { StationeryType, StudioContent } from './studio-constants';
import { PALETTES, FONT_PAIRS } from './studio-constants';
import { CardFront } from './StudioCard';
import { PearThinking } from '../pear-thinking';
import { Pear, Icon } from '../motifs';

const CARD_W = 420;
const CARD_H = 588;
const MINI_SCALE = 0.42;

interface Props {
  siteSlug: string;
  type: StationeryType;
  /** The manifest-derived content the canvas renders — proofs lay
   *  their copy over it so locked fields (names, date) stay true. */
  baseContent: StudioContent;
  nameA: string;
  nameB: string;
  monogram: string;
  /** Cover photo — the stand-in when stylized art isn't pressed yet. */
  photoUrl: string | null;
  /** manifest.stylizedArt.url when the host has pressed hero art. */
  stylizedArtUrl: string | null;
  siteUrl: string;
  rsvpDeadline?: string;
  onApply: (proof: SuiteProof, sheet: SuiteProof[]) => void;
  onClose: () => void;
}

type SheetState =
  | { phase: 'pressing' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; proofs: SuiteProof[] };

export function StudioProofSheet(props: Props) {
  const { siteSlug, type, onClose } = props;
  const [state, setState] = useState<SheetState>({ phase: 'pressing' });

  const press = useCallback(async () => {
    setState({ phase: 'pressing' });
    try {
      const r = await fetch('/api/suite/proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, type }),
      });
      if (!r.ok) {
        let message = 'Pear lost the thread mid-press. Give it a beat and try again.';
        if (r.status === 429) message = 'Pear is taking a breath — try the press again in a minute.';
        try {
          const data = (await r.json()) as { error?: string };
          if (typeof data.error === 'string' && data.error && r.status !== 401 && r.status !== 403) {
            message = data.error;
          }
        } catch { /* keep the default warm copy */ }
        setState({ phase: 'error', message });
        return;
      }
      const data = (await r.json()) as { ok?: boolean; proofs?: SuiteProof[] };
      if (!data.ok || !Array.isArray(data.proofs) || data.proofs.length === 0) {
        setState({ phase: 'error', message: 'The sheet came off the press blank. Try again in a moment.' });
        return;
      }
      setState({ phase: 'ready', proofs: data.proofs });
    } catch {
      setState({ phase: 'error', message: 'Pear lost the thread mid-press. Check your connection and try again.' });
    }
  }, [siteSlug, type]);

  useEffect(() => { void press(); }, [press]);

  // Esc closes — standard overlay affordance.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const count = state.phase === 'ready' ? state.proofs.length : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pear's proof sheet"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(14,13,11,0.45)',
        display: 'grid', placeItems: 'center',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="pl-studio-card-in"
        style={{
          width: 'min(880px, 96vw)', maxHeight: '90vh',
          background: 'var(--cream)', borderRadius: 18,
          border: '1px solid var(--line-soft)',
          boxShadow: '0 30px 80px rgba(14,13,11,0.35)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', borderBottom: '1px solid var(--line-soft)',
        }}>
          <Pear size={28} tone="sage" sparkle />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: "'Fraunces', Georgia, serif" }}>
              {state.phase === 'ready' ? `Pear pressed ${count} proofs` : 'The proof sheet'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
              Whole designs in your site&apos;s look — tap one to make it the canvas, then fine-tune anything.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close proof sheet"
            style={{
              width: 30, height: 30, borderRadius: '50%',
              display: 'grid', placeItems: 'center',
              background: 'var(--card)', border: '1px solid var(--line-soft)',
              cursor: 'pointer', color: 'var(--ink-soft)',
            }}
          >
            <Icon name="close" size={12} />
          </button>
        </div>

        {/* Body */}
        <div className="pl-studio-scroll" style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {state.phase === 'pressing' && (
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 280 }}>
              <PearThinking active label="Pressing proofs" size="lg" />
            </div>
          )}

          {state.phase === 'error' && (
            <div role="alert" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              minHeight: 280, justifyContent: 'center', textAlign: 'center',
            }}>
              <Pear size={36} tone="peach" shadow={false} />
              <div style={{ fontSize: 13, color: 'var(--ink)', maxWidth: 380, lineHeight: 1.5 }}>
                {state.message}
              </div>
              <button
                type="button"
                onClick={() => void press()}
                style={{
                  padding: '9px 18px', borderRadius: 999,
                  background: 'var(--ink)', color: 'var(--cream)',
                  fontSize: 12.5, fontWeight: 700, border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Press again
              </button>
            </div>
          )}

          {state.phase === 'ready' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}>
              {state.proofs.map((proof) => (
                <ProofTile
                  key={proof.id}
                  proof={proof}
                  sheet={state.proofs}
                  {...props}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProofTile({
  proof, sheet, type, baseContent, nameA, nameB, monogram,
  photoUrl, stylizedArtUrl, siteUrl, rsvpDeadline, onApply,
}: Props & { proof: SuiteProof; sheet: SuiteProof[] }) {
  const palette = PALETTES.find((p) => p.id === proof.studio.palette) ?? PALETTES[0];
  const font = FONT_PAIRS.find((f) => f.id === proof.studio.fontPair) ?? FONT_PAIRS[0];

  // Pear's copy over the manifest-locked base — same merge shape
  // the canvas uses (headline + line3 stay locked to the manifest).
  const content: StudioContent = {
    ...baseContent,
    eyebrow: proof.copy.eyebrow || baseContent.eyebrow,
    line2: proof.copy.dateLine || baseContent.line2,
    cta: proof.copy.footer || baseContent.cta,
  };

  const artMissing = proof.useStylizedArt && !stylizedArtUrl;
  const tilePhoto = proof.useStylizedArt ? (stylizedArtUrl ?? photoUrl) : photoUrl;

  return (
    <button
      type="button"
      onClick={() => onApply(proof, sheet)}
      aria-label={`Pick the ${proof.name} proof — ${proof.note}`}
      style={{
        textAlign: 'left', padding: 0, borderRadius: 14,
        background: 'var(--card)', border: '1px solid var(--line-soft)',
        cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden',
        transition: 'transform 160ms ease, box-shadow 160ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(61,74,31,0.18)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Real mini render — the actual CardFront pipeline, scaled. */}
      <div style={{
        position: 'relative',
        width: '100%',
        display: 'grid', placeItems: 'center',
        padding: '14px 0 10px',
        background: 'var(--cream-2)',
        borderBottom: '1px solid var(--line-soft)',
      }}>
        <div
          aria-hidden
          style={{
            width: CARD_W * MINI_SCALE,
            height: CARD_H * MINI_SCALE,
            overflow: 'hidden',
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        >
          <div style={{ transform: `scale(${MINI_SCALE})`, transformOrigin: 'top left', width: CARD_W, height: CARD_H }}>
            <CardFront
              type={type}
              view="front"
              layout={proof.studio.layout}
              motif={proof.studio.motif}
              palette={palette}
              font={font}
              content={content}
              nameA={nameA}
              nameB={nameB}
              monogram={monogram}
              photoUrl={tilePhoto}
              customMotifUrl={null}
              siteUrl={siteUrl}
              rsvpDeadline={rsvpDeadline}
            />
          </div>
        </div>
        {artMissing && (
          <div style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            padding: '3px 9px', borderRadius: 999,
            background: 'var(--peach-bg, #FBE8D6)', color: 'var(--peach-ink, #C6703D)',
            fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em',
            whiteSpace: 'nowrap', border: '1px solid rgba(198,112,61,0.25)',
          }}>
            ✦ Add Pear art in Photo style
          </div>
        )}
      </div>
      <div style={{ padding: '9px 12px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{proof.name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {proof.note}
        </div>
      </div>
    </button>
  );
}
