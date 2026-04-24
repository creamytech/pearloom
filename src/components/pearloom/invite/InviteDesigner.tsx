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

type VariantId = 'garden' | 'editorial' | 'groovy' | 'polaroid' | 'modern' | 'botanical' | 'cinema' | 'linen';
type DesignKind = 'save-the-date' | 'invitation';

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

  const variant = VARIANTS.find((v) => v.id === variantId)!;
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
                qrDataUrl={qrDataUrl}
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
          <div>
            <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
              Variant
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {VARIANTS.map((v) => {
                const on = variantId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
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
  }
>(function InviteSvg({ variant, headline, names, date, venue, prettyUrl, kind, stampLabel, qrDataUrl }, ref) {
  const [n1, n2] = names;
  const nameLine = n2 ? `${n1 || ''} & ${n2}` : n1 || 'Our celebration';
  const { paper, ink, accent, soft, id } = variant;
  const stamp =
    stampLabel ?? (kind === 'save-the-date' ? 'SAVE THE DATE' : 'INVITATION');
  const stampSoft = stamp.toLowerCase();

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1400"
      width="100%"
      height="100%"
      style={{ display: 'block', background: paper }}
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      {/* Paper */}
      <rect x="0" y="0" width="1000" height="1400" fill={paper} />

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

      {/* QR code (bottom-right). Scans → the couple's site (or future
          per-guest passport). Shown on every variant. */}
      {qrDataUrl && (
        <g>
          <image href={qrDataUrl} x="830" y="1230" width="120" height="120" />
          <text x="890" y="1370" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fill={ink} opacity="0.62" letterSpacing="2">SCAN</text>
        </g>
      )}
    </svg>
  );
});
