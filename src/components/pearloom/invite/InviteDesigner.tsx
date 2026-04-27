'use client';

/* ========================================================================
   PEARLOOM INVITE DESIGNER — v8
   Save-the-date + wedding invite composer.
   8 editorial variants, each rendered as SVG so the PNG export is 1:1
   with the preview. Copy link, download PNG, and send-as-save-the-date
   via the existing bulk-email flow.
   ======================================================================== */

import Link from 'next/link';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';
import { DashLayout } from '../dash/DashShell';
import { buildSiteUrl, formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { AISuggestButton, useAICall } from '../editor/ai';
import { startDecorJob, completeDecorJob } from '@/lib/decor-bus';
import { ARCHETYPES, type ArchetypeId } from '@/lib/invite-engine/archetypes';

type VariantId = 'garden' | 'editorial' | 'groovy' | 'polaroid' | 'modern' | 'botanical' | 'cinema' | 'linen';
type DesignKind = 'save-the-date' | 'invitation';
type DesignerMode = 'variant' | 'style' | 'ai';
type QRPosition = 'br' | 'bl' | 'bc' | 'tr' | 'hidden';
type FontKey = 'fraunces' | 'cormorant' | 'allura' | 'space-grotesk' | 'system';

const FONT_FAMILIES: Record<FontKey, { label: string; value: string }> = {
  fraunces:        { label: 'Fraunces · classic serif', value: 'Fraunces, Georgia, serif' },
  cormorant:       { label: 'Cormorant · romantic',     value: '"Cormorant Garamond", "Cormorant", Georgia, serif' },
  allura:          { label: 'Allura · script',           value: '"Allura", "Caveat", cursive' },
  'space-grotesk': { label: 'Space Grotesk · modern',    value: '"Space Grotesk", Inter, sans-serif' },
  system:          { label: 'System sans',               value: 'Inter, system-ui, sans-serif' },
};

// Curated subset of archetypes shown in the AI tab (full list of 12
// in archetypes.ts is too dense for a single picker grid — we pick
// the ones that read distinctly across occasions).
const AI_ARCHETYPE_PICKS: ArchetypeId[] = [
  'art-deco',
  'italian-poster',
  'garden-table',
  'kyoto-winter',
  'tulum-dusk',
  'parisian-salon',
  'desert-heirloom',
  'midnight-observatory',
];

interface Variant {
  id: VariantId;
  label: string;
  description: string;
  paper: string;
  ink: string;
  accent: string;
  soft: string;
}

const VARIANTS: Variant[] = [
  { id: 'garden', label: 'Garden Party', description: 'Sage + cream with a soft squiggle.', paper: '#F3E9D4', ink: '#3D4A1F', accent: '#8B9C5A', soft: '#CBD29E' },
  { id: 'editorial', label: 'Editorial', description: 'Serif type on cream paper.', paper: '#F8F1E4', ink: '#3D4A1F', accent: '#B89244', soft: '#EDE0C5' },
  { id: 'groovy', label: 'Groovy', description: 'Loopy type, warm peach.', paper: '#F7DDC2', ink: '#8B4720', accent: '#C6703D', soft: '#EAB286' },
  { id: 'polaroid', label: 'Polaroid', description: 'Photo-first with handwriting.', paper: '#FFFFFF', ink: '#3D4A1F', accent: '#EAB286', soft: '#F3E9D4' },
  { id: 'modern', label: 'Modern', description: 'Minimal ink, sans body.', paper: '#F8F1E4', ink: '#0E0D0B', accent: '#6B5A8C', soft: '#EDE0C5' },
  { id: 'botanical', label: 'Botanical', description: 'Lavender wash.', paper: '#EDE0C5', ink: '#4A3F6B', accent: '#B7A4D0', soft: '#D7CCE5' },
  { id: 'cinema', label: 'Cinema', description: 'Dark olive with gold leaf.', paper: '#3D4A1F', ink: '#F3E9D4', accent: '#D4A95D', soft: '#8B9C5A' },
  { id: 'linen', label: 'Linen', description: 'Warm peach with gold rules.', paper: '#F7DDC2', ink: '#3D4A1F', accent: '#B89244', soft: '#F0C9A8' },
];

function fmtDate(iso?: string | null): { long: string; line: string; short: string } {
  if (!iso) return { long: 'Save the date', line: 'Date to come', short: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { long: 'Save the date', line: 'Date to come', short: '' };
  const long = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const short = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  return { long, line: `${weekday} · ${long}`, short };
}

export function InviteDesigner({
  siteSlug,
  manifest,
  names,
}: {
  siteSlug: string;
  manifest: StoryManifest;
  names: [string, string];
}) {
  const [variantId, setVariantId] = useState<VariantId>('garden');
  const [kind, setKind] = useState<DesignKind>('save-the-date');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ── Customization state ─────────────────────────────────────
  // Inspector mode controls which set of controls is visible.
  // Variant = the 8 SVG templates (current behaviour). Style =
  // color/font/qr overrides on top of the chosen template. AI =
  // Pear paints a bespoke background scene via /api/invite/render.
  const [mode, setMode] = useState<DesignerMode>('variant');
  const [colorOverrides, setColorOverrides] = useState<{
    paper?: string;
    ink?: string;
    accent?: string;
    soft?: string;
  }>({});
  const [headlineFont, setHeadlineFont] = useState<FontKey>('fraunces');
  const [bodyFont, setBodyFont] = useState<FontKey>('system');
  const [qrPosition, setQrPosition] = useState<QRPosition>('br');
  const [aiBackgroundUrl, setAiBackgroundUrl] = useState<string | null>(null);
  const [aiArchetype, setAiArchetype] = useState<ArchetypeId>('garden-table');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPaintError, setAiPaintError] = useState<string | null>(null);

  const baseVariant = VARIANTS.find((v) => v.id === variantId)!;
  // Apply overrides on top of the chosen template. When the host
  // hasn't touched a slot, the variant's own colour wins so the
  // template still reads as itself.
  const variant: Variant = useMemo(
    () => ({
      ...baseVariant,
      paper: colorOverrides.paper ?? baseVariant.paper,
      ink: colorOverrides.ink ?? baseVariant.ink,
      accent: colorOverrides.accent ?? baseVariant.accent,
      soft: colorOverrides.soft ?? baseVariant.soft,
    }),
    [baseVariant, colorOverrides],
  );
  const date = fmtDate(manifest.logistics?.date);
  const venue = manifest.logistics?.venue ?? 'Venue details to come';
  const occasion = normalizeOccasion((manifest as unknown as { occasion?: string }).occasion ?? 'wedding');
  const prettyUrl = formatSiteDisplayUrl(siteSlug, '', occasion);
  const fullUrl = buildSiteUrl(siteSlug, '', undefined, occasion);
  // Occasion-aware copy: default headline + kind toggle labels + page title
  // all adapt so a memorial host doesn't see "Wedding invite" at the top.
  const invitationLabels = useMemo(() => {
    switch (occasion) {
      case 'memorial':
      case 'funeral':
        return {
          title: { save: 'Service announcement', invite: 'Invitation to the service' },
          default: { save: 'In loving memory', invite: 'Please join us' },
          kindLabel: { save: 'Service notice', invite: 'Full invite' },
          stampShort: { save: 'SERVICE · ANNOUNCEMENT', invite: 'PLEASE · JOIN US' },
        };
      case 'bachelor-party':
      case 'bachelorette-party':
        return {
          title: { save: 'Save the weekend', invite: 'You’re in' },
          default: { save: 'Save the weekend', invite: 'You’re in' },
          kindLabel: { save: 'Save the weekend', invite: 'Full invite' },
          stampShort: { save: 'SAVE · THE · WEEKEND', invite: 'YOU ARE IN' },
        };
      case 'baby-shower':
      case 'gender-reveal':
      case 'sip-and-see':
        return {
          title: { save: 'Save the date', invite: 'You’re invited' },
          default: { save: 'A new little one', invite: 'Come meet the baby' },
          kindLabel: { save: 'Save the Date', invite: 'Invitation' },
          stampShort: { save: 'SAVE · THE · DATE', invite: 'YOU ARE INVITED' },
        };
      case 'bridal-shower':
      case 'rehearsal-dinner':
      case 'welcome-party':
      case 'brunch':
      case 'anniversary':
      case 'housewarming':
      case 'vow-renewal':
      case 'bridal-luncheon':
        return {
          title: { save: 'Save the date', invite: 'You’re invited' },
          default: { save: 'Save the date', invite: 'You’re invited' },
          kindLabel: { save: 'Save the Date', invite: 'Invitation' },
          stampShort: { save: 'SAVE · THE · DATE', invite: 'YOU ARE INVITED' },
        };
      case 'reunion':
        return {
          title: { save: 'Save the weekend', invite: 'The reunion' },
          default: { save: 'Save the weekend', invite: 'Everyone, together' },
          kindLabel: { save: 'Save the Weekend', invite: 'Invitation' },
          stampShort: { save: 'SAVE · THE · WEEKEND', invite: 'THE · REUNION' },
        };
      case 'birthday':
      case 'milestone-birthday':
      case 'first-birthday':
      case 'sweet-sixteen':
      case 'retirement':
      case 'graduation':
        return {
          title: { save: 'Save the date', invite: 'Celebrate with us' },
          default: { save: 'Save the date', invite: 'Celebrate with us' },
          kindLabel: { save: 'Save the Date', invite: 'Invitation' },
          stampShort: { save: 'SAVE · THE · DATE', invite: 'CELEBRATE · WITH · US' },
        };
      case 'bar-mitzvah':
      case 'bat-mitzvah':
      case 'quinceanera':
      case 'baptism':
      case 'first-communion':
      case 'confirmation':
        return {
          title: { save: 'Save the date', invite: 'Ceremony invite' },
          default: { save: 'Save the date', invite: 'Please join us' },
          kindLabel: { save: 'Save the Date', invite: 'Ceremony invite' },
          stampShort: { save: 'SAVE · THE · DATE', invite: 'PLEASE · JOIN · US' },
        };
      case 'wedding':
      case 'engagement':
      default:
        return {
          title: { save: 'Save the date', invite: 'Wedding invite' },
          default: { save: 'Save the date', invite: 'You’re invited' },
          kindLabel: { save: 'Save the Date', invite: 'Invitation' },
          stampShort: { save: 'SAVE · THE · DATE', invite: 'YOU ARE INVITED' },
        };
    }
  }, [occasion]);
  const defaultMessage = kind === 'save-the-date'
    ? invitationLabels.default.save
    : invitationLabels.default.invite;

  // Generate a QR code (data URL) pointing to the site. When a future
  // version passes a per-guest token (?g=<token>) we can swap this with
  // the Guest Passport URL — for now, the site link is the sensible
  // default for a printed invite that goes to every guest.
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(fullUrl, {
      margin: 1,
      width: 512,
      errorCorrectionLevel: 'M',
      color: { dark: variant.ink, light: '#00000000' },
    })
      .then((u) => {
        if (!cancelled) setQrDataUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fullUrl, variant.ink]);

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  }

  async function onDownloadPng() {
    setDownloading(true);
    try {
      const svg = svgRef.current;
      if (!svg) throw new Error('No SVG');
      const xml = new XMLSerializer().serializeToString(svg);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const src = `data:image/svg+xml;base64,${svg64}`;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('image load'));
        img.src = src;
      });
      const SCALE = 3;
      const canvas = document.createElement('canvas');
      canvas.width = 1000 * SCALE;
      canvas.height = 1400 * SCALE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no ctx');
      ctx.scale(SCALE, SCALE);
      ctx.drawImage(img, 0, 0, 1000, 1400);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('no blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${siteSlug}-${kind}-${variantId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed — try a different browser or try again.');
    } finally {
      setDownloading(false);
    }
  }

  const [aiMessage, setAiMessage] = useState<string>('');
  const { state: aiState, error: aiError, run: runAi } = useAICall(async () => {
    const res = await fetch('/api/rewrite-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: `Write a 3-6 word warm ${kind} headline for a ${occasion} for ${names.filter(Boolean).join(' & ') || 'the hosts'}. No exclamation marks. Specific over generic. Return ONLY the headline, no quotes.`,
        tone: 'warm',
      }),
    });
    if (!res.ok) throw new Error(`Pear couldn't write one (${res.status})`);
    const data = (await res.json()) as { text?: string; rewritten?: string; result?: string };
    const text = (data.text ?? data.rewritten ?? data.result ?? '').trim().replace(/^"|"$/g, '');
    if (!text) throw new Error('Empty response');
    setAiMessage(text);
    return text;
  });

  const headline = aiMessage.trim() || defaultMessage;

  // ── AI scene generation ─────────────────────────────────────
  // Calls the existing /api/invite/render archetype renderer. The
  // result is a tall PNG on R2 — we composite it as the background
  // of the SVG preview so the host can see it under the text. Toast
  // updates via the global decor-bus so the user can navigate away
  // while Pear paints (~20-40s).
  async function paintWithPear() {
    if (aiBusy) return;
    const archetype = ARCHETYPES.find((a) => a.id === aiArchetype);
    if (!archetype) return;
    setAiBusy(true);
    setAiPaintError(null);
    const jobId = startDecorJob('invite', `Painting ${archetype.label}`);
    try {
      const palette = {
        background: variant.paper,
        foreground: variant.ink,
        accent: variant.accent,
        accentLight: variant.soft,
      };
      const res = await fetch('/api/invite/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetypeId: aiArchetype,
          siteSlug,
          names: names.filter(Boolean).join(' & ') || 'Our celebration',
          date: manifest.logistics?.date ?? '',
          venue: manifest.logistics?.venue,
          city: manifest.logistics?.venue,
          occasionLabel: occasion,
          palette,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Render failed (${res.status})`);
      }
      const data = (await res.json()) as { ok?: boolean; url?: string };
      if (!data.url) throw new Error('Pear returned no image URL.');
      setAiBackgroundUrl(data.url);
      completeDecorJob(jobId, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Paint failed';
      setAiPaintError(msg);
      completeDecorJob(jobId, false, msg);
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <DashLayout active="sites" hideTopbar>
      <div
        className="pl8-invite-layout"
        style={{ padding: 'clamp(20px, 3vw, 32px)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 24 }}
      >
        <main>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 18,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 6 }}>
                Designer
              </div>
              <h1 className="display" style={{ fontSize: 'clamp(32px, 4vw, 48px)', margin: 0 }}>
                {kind === 'save-the-date' ? invitationLabels.title.save : invitationLabels.title.invite}
              </h1>
            </div>

            <div style={{ display: 'flex', padding: 3, background: 'var(--cream-2)', borderRadius: 10, gap: 2 }}>
              {(
                [
                  { v: 'save-the-date', l: invitationLabels.kindLabel.save },
                  { v: 'invitation', l: invitationLabels.kindLabel.invite },
                ] as const
              ).map((o) => {
                const on = kind === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setKind(o.v)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: on ? 'var(--ink)' : 'transparent',
                      color: on ? 'var(--cream)' : 'var(--ink)',
                      border: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {o.l}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              background: 'var(--cream-2)',
              borderRadius: 24,
              padding: 'clamp(20px, 3vw, 40px)',
              border: '1px solid var(--card-ring)',
              display: 'grid',
              placeItems: 'center',
              minHeight: 560,
            }}
          >
            <div
              style={{
                width: 'min(520px, 100%)',
                aspectRatio: '1000 / 1400',
                boxShadow: '0 24px 60px rgba(61,74,31,0.18), 0 2px 6px rgba(0,0,0,0.06)',
                borderRadius: 6,
                overflow: 'hidden',
                background: variant.paper,
              }}
            >
              <InviteSvg
                ref={svgRef}
                variant={variant}
                headline={headline}
                names={names}
                date={date}
                venue={venue}
                prettyUrl={prettyUrl}
                kind={kind}
                stampLabel={kind === 'save-the-date' ? invitationLabels.stampShort.save : invitationLabels.stampShort.invite}
                qrDataUrl={qrPosition === 'hidden' ? null : qrDataUrl}
                qrPosition={qrPosition}
                headlineFontFamily={FONT_FAMILIES[headlineFont].value}
                bodyFontFamily={FONT_FAMILIES[bodyFont].value}
                aiBackgroundUrl={aiBackgroundUrl}
              />
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={onDownloadPng} disabled={downloading}>
              <Icon name="download" size={13} color="var(--cream)" />
              {downloading ? 'Exporting…' : 'Download PNG'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onCopyLink}>
              <Icon name={copied ? 'check' : 'link'} size={13} />
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <Link
              href={`/dashboard/rsvp?action=bulk-invite&source=${kind}`}
              className="btn btn-outline"
            >
              <Icon name="send" size={13} /> Send to guest list
            </Link>
          </div>
        </main>

        <aside
          className="pl8-invite-inspector"
          style={{
            background: 'var(--cream)',
            border: '1px solid var(--line-soft)',
            borderRadius: 18,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            alignSelf: 'start',
            position: 'sticky',
            top: 24,
          }}
        >
          {/* Mode tabs — three lanes for designing the invite. */}
          <div
            role="tablist"
            aria-label="Designer mode"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2,
              padding: 3,
              background: 'var(--cream-2)',
              borderRadius: 10,
              border: '1px solid var(--line-soft)',
            }}
          >
            {(
              [
                { v: 'variant', l: 'Templates' },
                { v: 'style', l: 'Style' },
                { v: 'ai', l: 'Pear paint' },
              ] as const
            ).map((o) => {
              const on = mode === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setMode(o.v)}
                  style={{
                    padding: '7px 8px',
                    borderRadius: 7,
                    border: 0,
                    background: on ? 'var(--ink)' : 'transparent',
                    color: on ? 'var(--cream)' : 'var(--ink-soft)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {o.l}
                </button>
              );
            })}
          </div>

          {mode === 'variant' && (
            <div>
              <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
                Template
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {VARIANTS.map((v) => {
                  const on = variantId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVariantId(v.id);
                        // Switching template also drops manual color
                        // overrides so the new variant reads as itself.
                        setColorOverrides({});
                      }}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        background: on ? 'var(--cream-2)' : 'var(--card)',
                        border: on ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        textAlign: 'left',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[v.paper, v.ink, v.accent, v.soft].map((c, i) => (
                          <div
                            key={i}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: c,
                              border: '1.5px solid rgba(255,255,255,0.5)',
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{v.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.35 }}>{v.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'style' && (
            <StyleControls
              variant={variant}
              colorOverrides={colorOverrides}
              setColorOverrides={setColorOverrides}
              headlineFont={headlineFont}
              setHeadlineFont={setHeadlineFont}
              bodyFont={bodyFont}
              setBodyFont={setBodyFont}
              qrPosition={qrPosition}
              setQrPosition={setQrPosition}
            />
          )}

          {mode === 'ai' && (
            <AIControls
              archetype={aiArchetype}
              setArchetype={setAiArchetype}
              busy={aiBusy}
              error={aiPaintError}
              onPaint={paintWithPear}
              hasResult={Boolean(aiBackgroundUrl)}
              onClear={() => {
                setAiBackgroundUrl(null);
                setAiPaintError(null);
              }}
              context={{
                names: names.filter(Boolean).join(' & ') || 'the host',
                venue: manifest.logistics?.venue,
                occasion,
              }}
            />
          )}

          {/* Headline editor lives beneath the mode tabs because all
              three modes share it. AI mode still wants the host to
              own the words even if Pear paints the picture. */}
          <div>
            <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
              Headline
            </div>
            <input
              type="text"
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              placeholder={defaultMessage}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--paper)',
                border: '1.5px solid var(--line)',
                borderRadius: 10,
                fontSize: 14,
                color: 'var(--ink)',
                fontFamily: 'var(--font-ui)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ marginTop: 10 }}>
              <AISuggestButton
                label="Draft with Pear"
                runningLabel="Writing…"
                state={aiState}
                onClick={() => void runAi()}
                error={aiError ?? undefined}
                size="sm"
              />
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: 'var(--lavender-bg)',
              border: '1px solid rgba(107,90,140,0.2)',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lavender-ink)', marginBottom: 4 }}>
              About this print
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Downloads at 3000×4200 PNG (300dpi at 10×14 in). Scales cleanly to 5×7 postcards and 4×6 photo prints.
            </div>
          </div>
        </aside>
      </div>
    </DashLayout>
  );
}

// ── StyleControls ──────────────────────────────────────────
// Color overrides + font dropdowns + QR position. Applied on
// top of the chosen template variant — clearing an override
// snaps that slot back to the template default.
function StyleControls({
  variant,
  colorOverrides,
  setColorOverrides,
  headlineFont,
  setHeadlineFont,
  bodyFont,
  setBodyFont,
  qrPosition,
  setQrPosition,
}: {
  variant: Variant;
  colorOverrides: { paper?: string; ink?: string; accent?: string; soft?: string };
  setColorOverrides: (next: { paper?: string; ink?: string; accent?: string; soft?: string }) => void;
  headlineFont: FontKey;
  setHeadlineFont: (k: FontKey) => void;
  bodyFont: FontKey;
  setBodyFont: (k: FontKey) => void;
  qrPosition: QRPosition;
  setQrPosition: (p: QRPosition) => void;
}) {
  function setColor(slot: 'paper' | 'ink' | 'accent' | 'soft', value: string) {
    setColorOverrides({ ...colorOverrides, [slot]: value });
  }
  function clearColor(slot: 'paper' | 'ink' | 'accent' | 'soft') {
    const next = { ...colorOverrides };
    delete next[slot];
    setColorOverrides(next);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
          Colors
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {(
            [
              { slot: 'paper', label: 'Paper' },
              { slot: 'ink', label: 'Ink' },
              { slot: 'accent', label: 'Accent' },
              { slot: 'soft', label: 'Soft' },
            ] as const
          ).map(({ slot, label }) => {
            const value = (colorOverrides[slot] ?? variant[slot]) as string;
            const overridden = colorOverrides[slot] !== undefined;
            return (
              <label key={slot} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', justifyContent: 'space-between' }}>
                  {label}
                  {overridden && (
                    <button
                      type="button"
                      onClick={() => clearColor(slot)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--peach-ink)',
                        fontSize: 10,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      reset
                    </button>
                  )}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    background: 'var(--card)',
                    border: '1.5px solid var(--line)',
                    borderRadius: 9,
                  }}
                >
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => setColor(slot, e.target.value)}
                    style={{
                      width: 26,
                      height: 26,
                      padding: 0,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      flexShrink: 0,
                      background: 'transparent',
                    }}
                  />
                  <code
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-soft)',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {value.toUpperCase()}
                  </code>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
          Fonts
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)' }}>Headline</span>
          <select
            value={headlineFont}
            onChange={(e) => setHeadlineFont(e.target.value as FontKey)}
            style={fontSelectStyle}
          >
            {Object.entries(FONT_FAMILIES).map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)' }}>Body</span>
          <select
            value={bodyFont}
            onChange={(e) => setBodyFont(e.target.value as FontKey)}
            style={fontSelectStyle}
          >
            {Object.entries(FONT_FAMILIES).map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
          QR position
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {(
            [
              { v: 'tr', l: '↗' },
              { v: 'br', l: '↘' },
              { v: 'bc', l: '↓' },
              { v: 'bl', l: '↙' },
              { v: 'hidden', l: '×' },
            ] as const
          ).map((o) => {
            const on = qrPosition === o.v;
            return (
              <button
                key={o.v}
                type="button"
                onClick={() => setQrPosition(o.v)}
                title={o.v === 'hidden' ? 'Hide QR' : `QR ${o.v.toUpperCase()}`}
                style={{
                  padding: '8px 0',
                  borderRadius: 8,
                  background: on ? 'var(--ink)' : 'var(--card)',
                  color: on ? 'var(--cream)' : 'var(--ink-soft)',
                  border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {o.l}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const fontSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--card)',
  border: '1.5px solid var(--line)',
  borderRadius: 9,
  fontSize: 12.5,
  color: 'var(--ink)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
};

// ── AIControls ─────────────────────────────────────────────
// Picker for the AI archetype + Pear-suggested prompt context
// + Paint button that calls /api/invite/render and composites
// the result as the SVG background.
function AIControls({
  archetype,
  setArchetype,
  busy,
  error,
  onPaint,
  hasResult,
  onClear,
  context,
}: {
  archetype: ArchetypeId;
  setArchetype: (id: ArchetypeId) => void;
  busy: boolean;
  error: string | null;
  onPaint: () => void;
  hasResult: boolean;
  onClear: () => void;
  context: { names: string; venue?: string; occasion: string };
}) {
  const picks = AI_ARCHETYPE_PICKS.map((id) => ARCHETYPES.find((a) => a.id === id)).filter(Boolean) as typeof ARCHETYPES;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
          Pear paints from
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 10 }}>
          {context.venue
            ? <>Pear knows the venue is <strong>{context.venue}</strong> — pick a world and Pear&apos;ll work the venue&apos;s feel into the painting.</>
            : <>Pick a world and Pear paints a bespoke background for {context.names}. Add a venue in the editor for richer context.</>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {picks.map((a) => {
            const on = archetype === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setArchetype(a.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: on ? 'var(--cream-2)' : 'var(--card)',
                  border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  textAlign: 'left',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: on ? 'var(--peach-ink)' : 'var(--ink-muted)',
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', display: 'block' }}>
                    {a.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{a.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onPaint}
        disabled={busy}
        className="pl-pearl-accent"
        style={{
          padding: '10px 16px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 700,
          cursor: busy ? 'wait' : 'pointer',
          border: 'none',
          fontFamily: 'var(--font-ui)',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? 'Pear is painting…' : hasResult ? 'Paint another' : 'Paint with Pear'}
      </button>

      {hasResult && !busy && (
        <button
          type="button"
          onClick={onClear}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            background: 'transparent',
            color: 'var(--ink-soft)',
            border: '1px solid var(--line)',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          Remove background
        </button>
      )}

      {error && (
        <div
          style={{
            fontSize: 11.5,
            color: '#7A2D2D',
            background: 'rgba(122,45,45,0.08)',
            padding: '8px 10px',
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          color: 'var(--ink-muted)',
          lineHeight: 1.45,
          padding: '10px 12px',
          background: 'var(--lavender-bg)',
          border: '1px solid rgba(107,90,140,0.2)',
          borderRadius: 10,
        }}
      >
        Pear paints in ~30 seconds — you can switch tabs and keep editing while it works. The toast in the bottom-right will tell you when it&apos;s ready.
      </div>
    </div>
  );
}

/* ==================== SVG — all 8 variants in one switch ==================== */

const InviteSvg = forwardRef<
  SVGSVGElement,
  {
    variant: Variant;
    headline: string;
    names: [string, string];
    date: { long: string; line: string; short: string };
    venue: string;
    prettyUrl: string;
    kind: DesignKind;
    stampLabel?: string;
    qrDataUrl?: string | null;
    qrPosition?: QRPosition;
    headlineFontFamily?: string;
    bodyFontFamily?: string;
    /** AI-painted background image (R2 URL). When set, composites
     *  the PNG full-bleed under the SVG text + a soft tinted plate
     *  for legibility. */
    aiBackgroundUrl?: string | null;
  }
>(function InviteSvg({ variant, headline, names, date, venue, prettyUrl, kind, stampLabel, qrDataUrl, qrPosition = 'br', headlineFontFamily, bodyFontFamily, aiBackgroundUrl }, ref) {
  const [n1, n2] = names;
  const nameLine = n2 ? `${n1 || ''} & ${n2}` : n1 || 'Our celebration';
  const { paper, ink, accent, soft, id } = variant;
  const stamp =
    stampLabel ?? (kind === 'save-the-date' ? 'SAVE THE DATE' : 'INVITATION');
  const stampSoft = stamp.toLowerCase();
  // Font overrides — when the host picked a custom font in the
  // Style tab, every text node inherits it via the SVG root's
  // `font-family`. Individual text nodes may still set their own
  // family for variants that need a specific look (e.g. Polaroid's
  // handwritten note); those win because inline > inherit.
  const rootFontFamily = bodyFontFamily ?? 'Inter, sans-serif';
  const titleFontFamily = headlineFontFamily ?? 'Fraunces, Georgia, serif';
  // QR position helper — translates the corner key into x/y on the
  // 1000×1400 viewBox. Hidden mode falls through (caller passes
  // null qrDataUrl) so this only runs when we're rendering one.
  const qrCoords = (() => {
    switch (qrPosition) {
      case 'tr': return { x: 830, y: 60, labelY: 200 };
      case 'bl': return { x: 50, y: 1230, labelY: 1370 };
      case 'bc': return { x: 440, y: 1230, labelY: 1370 };
      case 'br':
      default:   return { x: 830, y: 1230, labelY: 1370 };
    }
  })();

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1400"
      width="100%"
      height="100%"
      style={{ display: 'block', background: paper, fontFamily: rootFontFamily }}
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      {/* Paper — solid colour, then optional AI-painted background
          image overlaid full-bleed (when host chose Pear paint
          mode). A soft tinted plate sits over the image so the
          centre text stays legible regardless of what Pear painted. */}
      <rect x="0" y="0" width="1000" height="1400" fill={paper} />
      {aiBackgroundUrl && (
        <>
          <image
            href={aiBackgroundUrl}
            x="0"
            y="0"
            width="1000"
            height="1400"
            preserveAspectRatio="xMidYMid slice"
          />
          {/* Vertical luminance plate — keeps the centre band
              readable when the AI scene has a busy middle.
              Tone-locked to the variant's paper so it feels like
              part of the same design system. */}
          <rect x="0" y="380" width="1000" height="640" fill={paper} opacity="0.62" />
        </>
      )}

      {id === 'garden' && (
        <>
          <circle cx="120" cy="180" r="220" fill={soft} opacity="0.55" />
          <circle cx="880" cy="1220" r="260" fill={accent} opacity="0.3" />
          <path d="M 150 1080 Q 250 1020, 350 1080 T 550 1080 T 750 1080" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
          <text x="500" y="270" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="28" fill={ink} letterSpacing="8">{stamp}</text>
          <text x="500" y="520" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="108" fontWeight="600" letterSpacing="-2" fill={ink}>{headline}</text>
          <text x="500" y="710" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="68" fontStyle="italic" fontWeight="500" fill={accent}>{nameLine}</text>
          <text x="500" y="920" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="30" fill={ink}>{date.long}</text>
          <text x="500" y="970" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="24" fill={ink} opacity="0.7">{venue}</text>
          <line x1="380" y1="1160" x2="620" y2="1160" stroke={accent} strokeWidth="1.4" />
          <text x="500" y="1220" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} opacity="0.7">{prettyUrl}</text>
        </>
      )}

      {id === 'editorial' && (
        <>
          <line x1="80" y1="160" x2="920" y2="160" stroke={accent} strokeWidth="1.2" />
          <text x="500" y="130" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} letterSpacing="14">PEARLOOM · {stamp}</text>
          <text x="500" y="540" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="120" fontWeight="500" letterSpacing="-3" fill={ink}>{n1 || 'Our'}</text>
          <text x="500" y="680" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="72" fontStyle="italic" fontWeight="500" fill={accent}>and</text>
          <text x="500" y="820" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="120" fontWeight="500" letterSpacing="-3" fill={ink}>{n2 || 'Celebration'}</text>
          <line x1="380" y1="940" x2="620" y2="940" stroke={accent} strokeWidth="1.2" />
          <text x="500" y="1010" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="36" fill={ink}>{date.long}</text>
          <text x="500" y="1060" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.7">{venue}</text>
          <text x="500" y="1290" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.6" letterSpacing="4">{prettyUrl.toUpperCase()}</text>
        </>
      )}

      {id === 'groovy' && (
        <>
          <path d="M 0 200 Q 200 120, 400 200 T 800 200 T 1200 200" stroke={accent} strokeWidth="3" fill="none" opacity="0.8" />
          <path d="M 0 1200 Q 200 1280, 400 1200 T 800 1200 T 1200 1200" stroke={accent} strokeWidth="3" fill="none" opacity="0.8" />
          <circle cx="170" cy="350" r="120" fill={soft} opacity="0.65" />
          <circle cx="840" cy="1040" r="140" fill={soft} opacity="0.65" />
          <text x="500" y="310" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="44" fontWeight="500" fill={ink}>~ {stampSoft} ~</text>
          <text x="500" y="560" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="128" fontWeight="600" letterSpacing="-2" fill={ink}>{headline}</text>
          <text x="500" y="740" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="60" fontWeight="500" fill={accent}>{nameLine}</text>
          <text x="500" y="910" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="38" fill={ink}>{date.long}</text>
          <text x="500" y="965" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.72">{venue}</text>
          <text x="500" y="1290" textAnchor="middle" fontFamily="Inter, sans-serif" fontStyle="italic" fontSize="20" fill={ink} opacity="0.6">more at {prettyUrl}</text>
        </>
      )}

      {id === 'polaroid' && (
        <>
          <rect x="100" y="140" width="800" height="980" fill={soft} />
          <rect x="120" y="160" width="760" height="720" fill={accent} opacity="0.5" />
          <text x="500" y="560" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="68" fontWeight="600" fill={paper}>{nameLine}</text>
          <text x="500" y="640" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="34" fill={paper} opacity="0.9">{date.long}</text>
          <text x="500" y="1040" textAnchor="middle" fontFamily="Caveat, Fraunces, cursive" fontSize="48" fill={ink}>{headline}</text>
          <text x="500" y="1270" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.7" letterSpacing="3">{venue.toUpperCase()}</text>
          <text x="500" y="1320" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="16" fill={ink} opacity="0.6">{prettyUrl}</text>
        </>
      )}

      {id === 'modern' && (
        <>
          <circle cx="820" cy="260" r="180" fill={accent} opacity="0.22" />
          <text x="120" y="320" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} letterSpacing="12">{stamp}</text>
          <text x="120" y="620" fontFamily="Fraunces, Georgia, serif" fontSize="150" fontWeight="500" letterSpacing="-5" fill={ink}>{n1 || 'Our'}</text>
          <text x="120" y="800" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="90" fontWeight="400" fill={accent}>and</text>
          <text x="120" y="980" fontFamily="Fraunces, Georgia, serif" fontSize="150" fontWeight="500" letterSpacing="-5" fill={ink}>{n2 || 'Story'}</text>
          <line x1="120" y1="1110" x2="320" y2="1110" stroke={ink} strokeWidth="1.6" />
          <text x="120" y="1180" fontFamily="Inter, sans-serif" fontSize="26" fontWeight="600" fill={ink}>{date.long}</text>
          <text x="120" y="1220" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} opacity="0.65">{venue}</text>
          <text x="120" y="1300" fontFamily="Inter, sans-serif" fontSize="16" fill={ink} opacity="0.55" letterSpacing="4">{prettyUrl.toUpperCase()}</text>
        </>
      )}

      {id === 'botanical' && (
        <>
          <path d="M 0 200 C 200 100, 400 300, 600 180 S 1000 260, 1000 260 L 1000 0 L 0 0 Z" fill={soft} opacity="0.65" />
          <path d="M 60 80 C 140 40, 200 120, 180 200 L 160 260 L 120 220 L 100 190 L 60 80 Z" fill={accent} opacity="0.7" />
          <circle cx="100" cy="120" r="12" fill={accent} />
          <text x="500" y="420" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="34" fill={ink} opacity="0.82">{stampSoft}</text>
          <text x="500" y="620" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="120" fontWeight="600" letterSpacing="-3" fill={ink}>{headline}</text>
          <text x="500" y="790" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="66" fontWeight="500" fill={accent}>{nameLine}</text>
          <line x1="380" y1="900" x2="620" y2="900" stroke={accent} strokeWidth="1.4" />
          <text x="500" y="970" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="34" fill={ink}>{date.long}</text>
          <text x="500" y="1020" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.7">{venue}</text>
          <text x="500" y="1300" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.6">{prettyUrl}</text>
        </>
      )}

      {id === 'cinema' && (
        <>
          <rect x="0" y="1200" width="1000" height="200" fill="rgba(0,0,0,0.3)" />
          <text x="500" y="220" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fill={ink} opacity="0.7" letterSpacing="12">FEATURING</text>
          <text x="500" y="560" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="128" fontWeight="600" letterSpacing="-3" fill={ink}>{n1 || 'Our'}</text>
          <text x="500" y="720" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="72" fontWeight="500" fill={accent}>and</text>
          <text x="500" y="880" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="128" fontWeight="600" letterSpacing="-3" fill={ink}>{n2 || 'Story'}</text>
          <line x1="380" y1="1000" x2="620" y2="1000" stroke={accent} strokeWidth="1.5" />
          <text x="500" y="1080" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="36" fill={accent}>{date.long}</text>
          <text x="500" y="1135" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} opacity="0.72">{venue}</text>
          <text x="500" y="1340" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.6" letterSpacing="4">{prettyUrl.toUpperCase()}</text>
        </>
      )}

      {id === 'linen' && (
        <>
          <line x1="90" y1="120" x2="910" y2="120" stroke={accent} strokeWidth="2" />
          <line x1="90" y1="1280" x2="910" y2="1280" stroke={accent} strokeWidth="2" />
          <line x1="90" y1="132" x2="910" y2="132" stroke={accent} strokeWidth="0.7" />
          <line x1="90" y1="1268" x2="910" y2="1268" stroke={accent} strokeWidth="0.7" />
          <text x="500" y="220" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fill={ink} letterSpacing="12">{stamp}</text>
          <text x="500" y="560" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="120" fontWeight="600" letterSpacing="-2" fill={ink}>{headline}</text>
          <text x="500" y="740" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="68" fontWeight="500" fill={accent}>{nameLine}</text>
          <text x="500" y="930" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="38" fill={ink}>{date.long}</text>
          <text x="500" y="985" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="24" fill={ink} opacity="0.72">{venue}</text>
          <text x="500" y="1230" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fill={ink} opacity="0.6">{prettyUrl}</text>
        </>
      )}

      {/* QR code — position chosen by the host in the Style tab.
          Hidden mode skips render entirely (caller passes null
          qrDataUrl). Scans → the couple's site (or future per-guest
          passport). */}
      {qrDataUrl && (
        <g>
          <image href={qrDataUrl} x={qrCoords.x} y={qrCoords.y} width="120" height="120" />
          <text
            x={qrCoords.x + 60}
            y={qrCoords.labelY}
            textAnchor="middle"
            fontFamily={rootFontFamily}
            fontSize="11"
            fill={ink}
            opacity="0.62"
            letterSpacing="2"
          >
            SCAN
          </text>
        </g>
      )}
    </svg>
  );
});
