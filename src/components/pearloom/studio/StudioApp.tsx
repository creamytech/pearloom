'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / studio/StudioApp.tsx
//
// Stationery editor that replaces the legacy InviteDesigner.
// Layout:
//   • topbar: brand · type tabs (Save the date / Invitation /
//     Thank-you) · view (front / back / envelope) · Send
//   • left rail: Pear's drafts + asset palette + send history
//   • center: paper desk with the active card + stickers
//   • right rail: Design / Copy / Pear tabs
//   • floating Pear bubble · Send overlay
//
// Wires to:
//   - manifest.names + logistics.{date,venue,venueAddress}
//     for couple + date + place rendering
//   - manifest.studio for tweak persistence
//   - /api/studio/draft for AI palette/layout suggestions
//   - /api/studio/asset for AI stamp/wax/leaf/doodle generation
//   - /api/invite/guest for actual invitation send
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Pear, PostIt, Squiggle, Icon } from '../motifs';
import {
  PALETTES, FONT_PAIRS, type StationeryType,
  buildTypeContent, type AssetEntry, type StudioDraft,
} from './studio-constants';
import { useStudioState } from './useStudioState';
import { CardFront, CardBack, CardEnvelope } from './StudioCard';
import { StudioTopbar, DraftsRail, RemixRail } from './StudioRails';
import { StudioSendOverlay } from './StudioSendOverlay';
import { buildSiteUrl, formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';

interface Props {
  siteSlug: string;
  manifest: StoryManifest;
  names: [string, string];
}

export function StudioApp({ siteSlug, manifest, names }: Props) {
  const [nameA, nameB] = useMemo(() => {
    const a = (names[0] || '').trim() || 'Your';
    const b = (names[1] || '').trim() || 'Celebration';
    return [titleCase(a), titleCase(b)];
  }, [names]);
  const monogram = useMemo(() => {
    const first = (nameA[0] ?? '').toUpperCase();
    const second = (nameB[0] ?? '').toUpperCase();
    if (!first && !second) return '·&·';
    return `${first || '·'}&${second || '·'}`;
  }, [nameA, nameB]);

  const dateShort = useMemo(() => {
    const iso = manifest.logistics?.date;
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [manifest.logistics?.date]);
  const dateLong = useMemo(() => {
    const iso = manifest.logistics?.date;
    if (!iso) return 'date to come';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [manifest.logistics?.date]);
  const venue = manifest.logistics?.venue ?? '';
  const venueAddress = manifest.logistics?.venueAddress ?? '';
  const place = useMemo(() => {
    if (!venueAddress) return venue;
    const parts = venueAddress.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
    return parts[0] ?? venue;
  }, [venue, venueAddress]);
  const rsvpDeadline = manifest.logistics?.rsvpDeadline
    ? new Date(manifest.logistics.rsvpDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : undefined;

  // Save-the-date back details, derived from the same manifest
  // pieces as the public site so the printable card matches what
  // guests see online. Each falls back to a placeholder if the
  // host hasn't filled it in yet.
  const events = (manifest as unknown as { events?: Array<{ type?: string; time?: string; dressCode?: string }> }).events ?? [];
  const hotels = ((manifest as unknown as { travelInfo?: { hotels?: Array<{ name?: string; groupRate?: string }> } }).travelInfo?.hotels) ?? [];
  const ceremony = events.find(e => e.type === 'ceremony');
  const reception = events.find(e => e.type === 'reception');
  const ceremonyAt = ceremony?.time ? `${ceremony.time}` : undefined;
  const receptionAt = reception?.time ? `${reception.time}` : undefined;
  const dressCode = events.find(e => (e.dressCode ?? '').trim())?.dressCode;
  const hotelLine = hotels[0]?.name
    ? `${hotels[0].name}${hotels[0].groupRate ? ` · ${hotels[0].groupRate}` : ''}`
    : undefined;

  const occasion = normalizeOccasion((manifest as unknown as { occasion?: string }).occasion);
  const siteUrl = formatSiteDisplayUrl(siteSlug, '', occasion);
  const siteAbsoluteUrl = buildSiteUrl(siteSlug, '', undefined, occasion);

  const { state, setField, setMany, savedAt } = useStudioState({ siteSlug, manifest });
  const [aiBusy, setAiBusy] = useState(false);

  const palette = PALETTES.find(p => p.id === state.palette) ?? PALETTES[0];
  const font = FONT_PAIRS.find(f => f.id === state.fontPair) ?? FONT_PAIRS[0];

  const baseContent = useMemo(() => buildTypeContent({
    type: state.type,
    nameA, nameB,
    dateShort, dateLong,
    venue,
    place,
    siteUrl,
  }), [state.type, nameA, nameB, dateShort, dateLong, venue, place, siteUrl]);

  // Merge AI-drafted alternates + host-typed copy overrides over
  // the built-in defaults. Locked fields (headline, line3) always
  // come from the manifest — overrides on those are ignored.
  const content = useMemo(() => {
    const aiDrafts = state.drafts[state.type];
    const overrides = state.copyOverrides[state.type] ?? {};
    const merged = {
      ...baseContent,
      eyebrow: overrides.eyebrow?.trim() || baseContent.eyebrow,
      line2:   overrides.line2?.trim()   || baseContent.line2,
      line4:   overrides.line4?.trim()   || baseContent.line4,
      cta:     overrides.cta?.trim()     || baseContent.cta,
    };
    if (aiDrafts && aiDrafts.length > 0) {
      return { ...merged, drafts: aiDrafts };
    }
    return merged;
  }, [baseContent, state.drafts, state.copyOverrides, state.type]);

  // When stationery type changes, reset to the first draft of that
  // type so palette/layout/motif pick up sensible defaults.
  useEffect(() => {
    const drafts = content.drafts;
    if (!drafts.find(d => d.id === state.draft)) {
      setMany({
        draft: drafts[0].id,
        layout: drafts[0].layout,
        motif: drafts[0].motif,
        palette: drafts[0].accent,
        customMotifUrl: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.type, content]);

  // ── AI: draft another direction ─────────────────────────────
  async function askPearForDraft() {
    if (aiBusy) return;
    setAiBusy(true);
    try {
      const r = await fetch('/api/studio/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, type: state.type, count: 3 }),
      });
      if (!r.ok) throw new Error(`Studio draft failed (${r.status})`);
      const data = (await r.json()) as { drafts?: StudioDraft[] };
      if (Array.isArray(data.drafts) && data.drafts.length > 0) {
        setMany({
          drafts: { ...state.drafts, [state.type]: data.drafts },
          draft: data.drafts[0].id,
          palette: data.drafts[0].accent,
          layout: data.drafts[0].layout,
          motif: data.drafts[0].motif,
          customMotifUrl: null,
        });
      }
    } catch (err) {
      console.error('[Studio] askPearForDraft', err);
    } finally {
      setAiBusy(false);
    }
  }

  // ── AI: generate a custom asset (stamp/wax/leaf/doodle) ────
  async function askPearForAsset(kind: AssetEntry['kind']) {
    if (aiBusy) return;
    setAiBusy(true);
    try {
      const r = await fetch('/api/studio/asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          kind,
          paletteId: state.palette,
          motif: state.motif,
          stationeryType: state.type,
        }),
      });
      if (!r.ok) throw new Error(`Asset gen failed (${r.status})`);
      const data = (await r.json()) as { asset?: AssetEntry };
      if (data.asset?.url) {
        setMany({
          assets: [data.asset, ...state.assets],
        });
      }
    } catch (err) {
      console.error('[Studio] askPearForAsset', err);
    } finally {
      setAiBusy(false);
    }
  }

  // ── AI: rewrite a single field with Pear ────────────────────
  async function rewriteField(fieldId: string, hint: string) {
    if (aiBusy) return;
    if (!['eyebrow', 'line2', 'line4', 'cta'].includes(fieldId)) return;
    setAiBusy(true);
    try {
      const currentText = (content as unknown as Record<string, string>)[fieldId] ?? '';
      const r = await fetch('/api/studio/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          type: state.type,
          fieldId,
          currentText,
          hint,
        }),
      });
      if (!r.ok) throw new Error(`Rewrite failed (${r.status})`);
      const data = (await r.json()) as { rewritten?: string };
      const next = (data.rewritten ?? '').trim();
      if (!next) return;
      // Write into the per-type override slice — same path host
      // edits land in, so the canvas updates immediately.
      const prevSlice = state.copyOverrides[state.type] ?? {};
      const nextSlice = { ...prevSlice, [fieldId]: next };
      setMany({
        copyOverrides: { ...state.copyOverrides, [state.type]: nextSlice },
      });
    } catch (err) {
      console.error('[Studio] rewriteField', err);
    } finally {
      setAiBusy(false);
    }
  }

  // ── Pear: match the card to the current site theme ─────────
  async function matchSiteTheme() {
    const themeAccent = (manifest as unknown as { theme?: { colors?: { accent?: string } } }).theme?.colors?.accent;
    if (!themeAccent) return;
    // Find the studio palette whose accent is closest to the
    // site's theme accent.
    const closest = PALETTES.reduce((best, p) => {
      const da = colorDistance(p.accent, themeAccent);
      return da < best.d ? { p, d: da } : best;
    }, { p: PALETTES[0], d: Number.POSITIVE_INFINITY });
    setField('palette', closest.p.id);
  }

  function pickDraft(d: StudioDraft) {
    setMany({
      draft: d.id,
      layout: d.layout,
      motif: d.motif,
      palette: d.accent,
      customMotifUrl: null,
    });
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '296px 1fr 312px',
      gridTemplateRows: '64px 1fr',
      gridTemplateAreas: '"top top top" "left canvas right"',
      height: '100vh',
      background: 'var(--cream)',
      overflow: 'hidden',
      fontFamily: 'var(--font-ui, "Inter", system-ui, sans-serif)',
    }}>
      <StudioTopbar
        state={state}
        setField={setField}
        nameA={nameA}
        nameB={nameB}
        dateShort={dateShort}
        savedAt={savedAt}
      />

      <DraftsRail
        state={state}
        setField={setField}
        content={content}
        nameA={nameA}
        nameB={nameB}
        onPickDraft={pickDraft}
        onAskPearForDraft={askPearForDraft}
        onAskPearForAsset={askPearForAsset}
        aiBusy={aiBusy}
        sendStats={{ total: undefined }}
      />

      <CanvasStage>
        <DeskStickers type={state.type} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'grid', placeItems: 'center',
          padding: 32,
        }}>
          <div
            key={state.draft + state.view + state.layout + state.motif + state.palette}
            className={state.animate ? (state.view === 'envelope' ? 'pl-studio-card-in' : 'pl-studio-flip-in') : ''}
          >
            {state.view === 'front' && (
              <CardFront
                type={state.type}
                view="front"
                layout={state.layout}
                motif={state.motif}
                palette={palette}
                font={font}
                content={content}
                nameA={nameA}
                nameB={nameB}
                monogram={monogram}
                photoUrl={(manifest.coverPhoto as string | undefined) ?? null}
                customMotifUrl={state.customMotifUrl}
                siteUrl={siteUrl}
                rsvpDeadline={rsvpDeadline}
              />
            )}
            {state.view === 'back' && (
              <CardBack
                type={state.type}
                view="back"
                layout={state.layout}
                motif={state.motif}
                palette={palette}
                font={font}
                content={content}
                nameA={nameA}
                nameB={nameB}
                monogram={monogram}
                siteUrl={siteUrl}
                rsvpDeadline={rsvpDeadline}
                ceremonyAt={ceremonyAt}
                receptionAt={receptionAt}
                dressCode={dressCode}
                hotelLine={hotelLine}
              />
            )}
            {state.view === 'envelope' && (
              <CardEnvelope
                type={state.type}
                view="envelope"
                layout={state.layout}
                motif={state.motif}
                palette={palette}
                font={font}
                content={content}
                nameA={nameA}
                nameB={nameB}
                monogram={monogram}
                returnAddress={{ name: `${nameA} & ${nameB}` }}
              />
            )}
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', background: 'var(--card)', borderRadius: 999,
          border: '1px solid var(--line)', boxShadow: 'var(--shadow)',
          fontSize: 11.5,
        }}>
          <button
            onClick={() => setField('view', state.view === 'front' ? 'envelope' : state.view === 'back' ? 'front' : 'back')}
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--cream-2)', border: 'none', cursor: 'pointer' }}
          >
            <Icon name="chev-left" size={12} />
          </button>
          <div style={{ padding: '0 8px', color: 'var(--ink-soft)', fontWeight: 600 }}>
            {state.view === 'front' ? 'Front · 5 × 7"' : state.view === 'back' ? 'Back · 5 × 7"' : 'Envelope · A7'}
          </div>
          <button
            onClick={() => setField('view', state.view === 'envelope' ? 'front' : state.view === 'front' ? 'back' : 'envelope')}
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--cream-2)', border: 'none', cursor: 'pointer' }}
          >
            <Icon name="chev-right" size={12} />
          </button>
        </div>
      </CanvasStage>

      <RemixRail
        state={state}
        setField={setField}
        content={content}
        nameA={nameA}
        nameB={nameB}
        onPickDraft={pickDraft}
        onRewriteField={rewriteField}
        onMatchSiteTheme={matchSiteTheme}
        aiBusy={aiBusy}
      />

      {state.showPear && (
        <FloatingPear
          nudges={content.pearNudges}
          onClose={() => setField('showPear', false)}
        />
      )}

      {state.showSend && (
        <StudioSendOverlay
          siteSlug={siteSlug}
          type={state.type}
          cardPreview={
            <CardFront
              type={state.type}
              view="front"
              layout={state.layout}
              motif={state.motif}
              palette={palette}
              font={font}
              content={content}
              nameA={nameA}
              nameB={nameB}
              monogram={monogram}
              photoUrl={(manifest.coverPhoto as string | undefined) ?? null}
              customMotifUrl={state.customMotifUrl}
              siteUrl={siteUrl}
              rsvpDeadline={rsvpDeadline}
            />
          }
          onClose={() => setField('showSend', false)}
        />
      )}

      {/* Inline keyframe + scroll styles. Lifted from the design's
          <style> block so the React build doesn't need a new CSS
          file. */}
      <style jsx global>{`
        .pl-studio-card-shadow { box-shadow: 0 30px 60px -20px rgba(61,74,31,0.30), 0 12px 28px rgba(61,74,31,0.10); }
        @keyframes pl-studio-card-in { from { opacity: 0; transform: translate3d(0,12px,0) scale(.98) rotate(-1deg); } to { opacity: 1; transform: translate3d(0,0,0) scale(1) rotate(0); } }
        .pl-studio-card-in { animation: pl-studio-card-in 600ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes pl-studio-flip-y { from { transform: rotateY(180deg); opacity: 0; } to { transform: rotateY(0); opacity: 1; } }
        .pl-studio-flip-in { animation: pl-studio-flip-y 500ms cubic-bezier(0.16, 1, 0.3, 1) both; transform-style: preserve-3d; }
        @keyframes pl-studio-nudge-in { from { opacity: 0; transform: translate3d(0,8px,0); } to { opacity: 1; transform: translate3d(0,0,0); } }
        .pl-studio-nudge-in { animation: pl-studio-nudge-in 360ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .pl-studio-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        @media (prefers-reduced-motion: reduce) {
          .pl-studio-card-in, .pl-studio-flip-in, .pl-studio-nudge-in { animation: none !important; }
        }
      `}</style>

      {/* Suppress unused — referenced for future analytics. */}
      <span style={{ display: 'none' }}>{siteAbsoluteUrl}</span>
    </div>
  );
}

function CanvasStage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      gridArea: 'canvas',
      position: 'relative',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, var(--cream-2, #F5EFE2) 0%, var(--cream-3, #ECE3CB) 100%)',
    }}>
      {/* desk texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: 'radial-gradient(circle, rgba(61,74,31,0.06) 1px, transparent 1px)',
        backgroundSize: '24px 24px', pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}

function DeskStickers({ type }: { type: StationeryType }) {
  return (
    <>
      <div style={{ position: 'absolute', top: '14%', left: '7%', transform: 'rotate(-12deg)', opacity: 0.95 }}>
        <PostIt tone="lavender" width={140} rotation={-8} tape={false} style={{ fontSize: 14 }}>
          {type === 'std' ? 'save\nthe date!' : type === 'invite' ? 'send by\nthe deadline' : 'with love'}
        </PostIt>
      </div>
      <div style={{ position: 'absolute', top: '8%', right: '14%', opacity: 0.7 }}>
        <Squiggle width={120} height={50} variant={2} stroke="#D4A95D" />
      </div>
      <div style={{ position: 'absolute', bottom: '18%', left: '10%', opacity: 0.6 }}>
        <Squiggle width={100} height={40} variant={4} stroke="#C4B5D9" />
      </div>
    </>
  );
}

function FloatingPear({ nudges, onClose }: { nudges: string[]; onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const [idx, setIdx] = useState(0);
  const nudge = nudges[idx % nudges.length];
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', bottom: 70, right: 332, zIndex: 30,
        width: 48, height: 48, borderRadius: '50%',
        background: 'var(--card)', border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-md)', display: 'grid', placeItems: 'center',
        cursor: 'pointer',
      }}>
        <Pear size={28} tone="sage" sparkle />
      </button>
    );
  }
  return (
    <div style={{ position: 'fixed', bottom: 70, right: 332, zIndex: 30, pointerEvents: 'auto' }}>
      <div className="pl-studio-nudge-in" style={{
        width: 280, padding: 14,
        background: 'var(--card)', borderRadius: 14,
        border: '1px solid var(--line-soft)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Pear size={28} tone="sage" sparkle />
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.45 }}>{nudge}</div>
          <button onClick={() => { setOpen(false); onClose(); }} style={{ color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon name="close" size={12} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setIdx(i => i + 1)} className="btn btn-ghost btn-sm" style={{ padding: '6px 10px', fontSize: 11.5 }}>
            Another
          </button>
        </div>
      </div>
    </div>
  );
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** Cheap RGB-distance helper for the "match site theme" picker.
 *  Two arbitrary 6-digit hex strings → 0..√3·255 distance. */
function colorDistance(a: string, b: string): number {
  const ra = parseInt(a.slice(1, 3), 16), ga = parseInt(a.slice(3, 5), 16), ba = parseInt(a.slice(5, 7), 16);
  const rb = parseInt(b.slice(1, 3), 16), gb = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  return Math.sqrt((ra - rb) ** 2 + (ga - gb) ** 2 + (ba - bb) ** 2);
}
