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
import { formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { parseLocalDate } from '@/lib/date-utils';

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
    const d = parseLocalDate(manifest.logistics?.date);
    if (!d) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [manifest.logistics?.date]);
  const dateLong = useMemo(() => {
    const d = parseLocalDate(manifest.logistics?.date);
    if (!d) return 'date to come';
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
  const rsvpDeadline = useMemo(() => {
    const d = parseLocalDate(manifest.logistics?.rsvpDeadline);
    if (!d) return undefined;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, [manifest.logistics?.rsvpDeadline]);

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

  // Envelope return-address corner. Fall back to the couple's
  // venue address if the host hasn't entered a dedicated one —
  // it's a sensible default when the envelope ships from the
  // wedding location, and it's better than three blank lines.
  const returnAddress = useMemo(() => {
    const parts = (venueAddress || '').split(',').map(s => s.trim()).filter(Boolean);
    return {
      name: `${nameA} & ${nameB}`,
      line1: parts[0] ?? '',
      line2: parts.slice(1).join(', '),
    };
  }, [nameA, nameB, venueAddress]);

  const occasion = normalizeOccasion((manifest as unknown as { occasion?: string }).occasion);
  const siteUrl = formatSiteDisplayUrl(siteSlug, '', occasion);

  const { state, setField, setMany, savedAt, saving, saveError, retrySave } = useStudioState({ siteSlug, manifest });
  const [aiBusy, setAiBusy] = useState(false);
  // Last AI flow error, shown as a short-lived toast at the
  // bottom of the canvas. Auto-clears after 6s — the toast itself
  // owns the timer so the catch sites stay simple.
  const [aiError, setAiError] = useState<string | null>(null);
  useEffect(() => {
    if (!aiError) return;
    const id = window.setTimeout(() => setAiError(null), 6000);
    return () => window.clearTimeout(id);
  }, [aiError]);

  // Live guest counts for the left-rail "This send" pill. The
  // Send overlay does its own fetch on open; this one keeps the
  // rail truthy without waiting for the overlay to mount, and
  // re-fetches after a successful send so the "N sent" count
  // updates without a page reload.
  const [guestStats, setGuestStats] = useState<{ total?: number; sent?: number; ready?: number }>({});
  const [statsTick, setStatsTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/guests?siteSlug=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((data: { guests?: Array<{ status?: string; emailSentAt?: string | null }> }) => {
        if (cancelled) return;
        const guests = data.guests ?? [];
        const total = guests.length;
        const sent = guests.filter(g => g.emailSentAt).length;
        const ready = guests.filter(g => g.status === 'attending').length;
        setGuestStats({ total, sent, ready });
      })
      .catch(() => { /* silent — rail just shows the empty hint */ });
    return () => { cancelled = true; };
  }, [siteSlug, statsTick]);

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

  // Friendly message picker for the AI catch sites. 429 from
  // checkRateLimit is the most common non-bug failure, so it
  // gets its own line. Everything else → generic "lost the
  // thread" copy that matches Pear's voice.
  function aiErrorFor(flow: 'draft' | 'asset' | 'rewrite', status: number | null, kind?: string): string {
    if (status === 429) {
      return 'Pear is taking a breath — try again in a minute.';
    }
    if (flow === 'draft') return 'Pear lost the thread on a fresh draft. Try again in a moment.';
    if (flow === 'asset') return `Pear couldn't paint a ${kind}. Try again or pick a different palette.`;
    return 'Pear couldn’t rewrite that line just now. Try a different angle.';
  }

  // ── AI: draft another direction ─────────────────────────────
  async function askPearForDraft() {
    if (aiBusy) return;
    setAiBusy(true);
    try {
      const r = await fetch('/api/studio/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, type: state.type, count: 3, tone: state.tone }),
      });
      if (!r.ok) {
        setAiError(aiErrorFor('draft', r.status));
        return;
      }
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
      setAiError(aiErrorFor('draft', null));
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
      if (!r.ok) {
        setAiError(aiErrorFor('asset', r.status, kind));
        return;
      }
      const data = (await r.json()) as { asset?: AssetEntry };
      if (data.asset?.url) {
        setMany({
          assets: [data.asset, ...state.assets],
        });
      }
    } catch (err) {
      console.error('[Studio] askPearForAsset', err);
      setAiError(aiErrorFor('asset', null, kind));
    } finally {
      setAiBusy(false);
    }
  }

  // ── AI: rewrite a single field with Pear ────────────────────
  async function rewriteField(fieldId: string, hint: string) {
    if (aiBusy) return;
    type EditableId = 'eyebrow' | 'line2' | 'line4' | 'cta';
    const EDITABLE: ReadonlyArray<EditableId> = ['eyebrow', 'line2', 'line4', 'cta'];
    if (!EDITABLE.includes(fieldId as EditableId)) return;
    setAiBusy(true);
    try {
      const currentText = content[fieldId as EditableId] ?? '';
      const r = await fetch('/api/studio/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          type: state.type,
          fieldId,
          currentText,
          hint,
          tone: state.tone,
        }),
      });
      if (!r.ok) {
        setAiError(aiErrorFor('rewrite', r.status));
        return;
      }
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
      setAiError(aiErrorFor('rewrite', null));
    } finally {
      setAiBusy(false);
    }
  }

  // ── Pear: suggest a complementary stamp + accent ────────────
  // Deterministic curator — no API call needed. Pairs each
  // motif with the palette that reads as its natural neighbour
  // (botanical leaves → sage, formal monogram → cream, etc.)
  // and avoids returning the host's current pair so the click
  // always produces a visible change.
  function suggestPair() {
    const PAIRS: Array<{ motif: string; palette: string }> = [
      { motif: 'leaves',   palette: 'sage' },
      { motif: 'monogram', palette: 'cream' },
      { motif: 'stamp',    palette: 'lavender' },
      { motif: 'tape',     palette: 'peach' },
      { motif: 'wax',      palette: 'rose' },
      { motif: 'doodle',   palette: 'twilight' },
      { motif: 'none',     palette: 'cream' },
    ];
    const candidates = PAIRS.filter(
      (p) => !(p.motif === state.motif && p.palette === state.palette),
    );
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    setMany({ motif: next.motif, palette: next.palette, customMotifUrl: null });
  }

  // ── Pear: match the card to the current site theme ─────────
  async function matchSiteTheme() {
    const themeAccent = (manifest as unknown as { theme?: { colors?: { accent?: string } } }).theme?.colors?.accent;
    // colorDistance assumes a 6-digit hex (#RRGGBB). #RGB shorthand
    // or rgb()/oklch() would parseInt to NaN and silently pick
    // PALETTES[0] every time. Guard explicitly so the host gets
    // a clear "no theme accent" message instead of a phantom no-op.
    if (!themeAccent || !/^#[0-9a-f]{6}$/i.test(themeAccent.trim())) {
      setAiError('Pear couldn’t read your site’s accent colour. Set one on the site first.');
      return;
    }
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
    <div className="pl-studio-root" style={{
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
        saving={saving}
        saveError={saveError}
        onRetrySave={retrySave}
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
        sendStats={guestStats}
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
                returnAddress={returnAddress}
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
            type="button"
            aria-label="Previous side"
            onClick={() => setField('view', state.view === 'front' ? 'envelope' : state.view === 'back' ? 'front' : 'back')}
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--cream-2)', border: 'none', cursor: 'pointer' }}
          >
            <Icon name="chev-left" size={12} />
          </button>
          <div aria-live="polite" style={{ padding: '0 8px', color: 'var(--ink-soft)', fontWeight: 600 }}>
            {state.view === 'front' ? 'Front · 5 × 7"' : state.view === 'back' ? 'Back · 5 × 7"' : 'Envelope · A7'}
          </div>
          <button
            type="button"
            aria-label="Next side"
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
        onSuggestPair={suggestPair}
        aiBusy={aiBusy}
      />

      {/* Always mounted — FloatingPear has its own internal
          expanded/minimized state. Closing the bubble shows a
          peach mini-button the host can reopen, instead of
          unmounting and stranding the affordance. */}
      <FloatingPear nudges={content.pearNudges} />

      {/* Transient AI error toast — surfaces failures from the
          three Pear flows so a host doesn't see a Threading…
          spinner clear and wonder if it worked. Auto-clears
          after 6s; click ✕ to dismiss sooner. role="alert" so
          the error gets an assertive announcement (it's a
          failure, not a passive update). */}
      {aiError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            padding: '10px 14px 10px 16px',
            background: 'var(--card)',
            color: 'var(--ink)',
            border: '1px solid rgba(122,45,45,0.35)',
            borderRadius: 999,
            boxShadow: '0 14px 32px rgba(14,13,11,0.18)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 12.5,
            maxWidth: 'min(560px, 92vw)',
            animation: 'pl-studio-nudge-in 240ms ease both',
          }}
        >
          <Squiggle variant={2} width={32} style={{ color: 'var(--peach-ink, #C6703D)', flexShrink: 0 }} />
          <span style={{ lineHeight: 1.4 }}>{aiError}</span>
          <button
            type="button"
            onClick={() => setAiError(null)}
            aria-label="Dismiss notice"
            style={{
              marginLeft: 4,
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: 4,
              fontFamily: 'inherit',
            }}
          >
            ✕
          </button>
        </div>
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
          onSent={() => setStatsTick((t) => t + 1)}
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
        @media print {
          /* Strip the dashboard chrome so Export → window.print()
             prints just the active card surface. The Studio root
             pins to the page; everything outside the canvas is
             hidden. */
          @page { size: 5in 7in; margin: 0; }
          body * { visibility: hidden !important; }
          .pl-studio-root, .pl-studio-root * { visibility: visible !important; }
          .pl-studio-root header,
          .pl-studio-root aside { display: none !important; }
          .pl-studio-root { display: block !important; height: auto !important; background: white !important; overflow: visible !important; }
          .pl-studio-canvas {
            background: white !important;
            overflow: visible !important;
            min-height: 7in !important;
          }
          /* Drop the desk shadow + texture overlays so the print
             reads as flat ink-on-paper. */
          .pl-studio-card-shadow { box-shadow: none !important; }
          /* Hide every floating affordance — the Pear nudge
             bubble, the AI error toast, and any open dialog
             (the host could fire window.print() while the Send
             overlay is open). They live inside .pl-studio-root
             so the visibility:visible cascade above unhides
             them; flip them off explicitly. */
          .pl-studio-nudge-in,
          .pl-studio-root [role="dialog"],
          .pl-studio-root [role="status"] {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}

function CanvasStage({ children }: { children: React.ReactNode }) {
  return (
    <main className="pl-studio-canvas" aria-label="Stationery canvas" style={{
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
    </main>
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

function FloatingPear({ nudges }: { nudges: string[] }) {
  const [open, setOpen] = useState(true);
  const [idx, setIdx] = useState(0);
  const nudge = nudges[idx % nudges.length];
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-label="Open Pear's nudges" style={{
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
          <button type="button" onClick={() => setOpen(false)} aria-label="Minimise Pear's nudges" style={{ color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon name="close" size={12} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setIdx(i => i + 1)}
            style={{
              padding: '6px 10px',
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--ink)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              borderRadius: 6,
            }}
          >
            Another
          </button>
        </div>
      </div>
    </div>
  );
}


function titleCase(s: string): string {
  // Preserve mixed case as the host typed it — "McKenna",
  // "O'Brien", "DeAngelo", "van der Berg". A naive
  // first-upper-rest-lower loop wrecks all of those (McKenna →
  // Mckenna, O'Brien → O'brien). Only rewrite when the input is
  // entirely lowercase or entirely uppercase, which is the only
  // signal that the host wasn't deliberate about casing.
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  const allLower = trimmed === trimmed.toLowerCase();
  const allUpper = trimmed === trimmed.toUpperCase();
  if (!allLower && !allUpper) return trimmed;
  return trimmed.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** Cheap RGB-distance helper for the "match site theme" picker.
 *  Two arbitrary 6-digit hex strings → 0..√3·255 distance. */
function colorDistance(a: string, b: string): number {
  const ra = parseInt(a.slice(1, 3), 16), ga = parseInt(a.slice(3, 5), 16), ba = parseInt(a.slice(5, 7), 16);
  const rb = parseInt(b.slice(1, 3), 16), gb = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  return Math.sqrt((ra - rb) ** 2 + (ga - gb) ** 2 + (ba - bb) ** 2);
}
