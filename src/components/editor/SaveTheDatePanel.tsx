'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/SaveTheDatePanel.tsx
//
// Editorial Save-the-Date composer. Four editorial variants
// that mirror the canvas block presets (Minimalist / Cinematic
// / Playful / Botanical). Renders as SVG so PNG export is 1:1
// with the preview (no html2canvas dep). Ships three actions:
//
//   • Download PNG — real SVG→canvas→blob download
//   • Copy link — shareable site url
//   • Send as save-the-date — hands off to the bulk email flow
//     via a custom event the Guests panel listens for.
// ─────────────────────────────────────────────────────────────

import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Link2,
  Check,
  Send,
  Clock,
  Share2,
  Palette,
  Eye,
  Sparkles,
} from 'lucide-react';
import type { StoryManifest } from '@/types';
import { buildSiteUrl, formatSiteDisplayUrl } from '@/lib/site-urls';
import { logEditorError } from '@/lib/editor-log';
import {
  PanelRoot,
  PanelSection,
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
} from './panel';

// ── Variants match canvas block presets ──────────────────────
interface Variant {
  id: 'minimalist' | 'cinematic' | 'playful' | 'botanical' | 'photo';
  label: string;
  paper: string;
  ink: string;
  accent: string;
  soft: string;
  ruleOpacity: number;
  eyebrow: string;
  swatch: string;
  /** If true, render a hero photo as the card background. */
  usePhoto?: boolean;
}

const VARIANTS: Variant[] = [
  {
    id: 'minimalist',
    label: 'Minimalist',
    paper: '#FAF7F2',
    ink: '#18181B',
    accent: '#B8935A',
    soft: '#6F6557',
    ruleOpacity: 0.35,
    eyebrow: 'Save the Date',
    swatch: 'linear-gradient(180deg, #FAF7F2 0%, #EFEAE0 100%)',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    paper: '#161006',
    ink: '#F0E8D4',
    accent: '#D6A655',
    soft: '#9B8A66',
    ruleOpacity: 0.45,
    eyebrow: 'Save the Date',
    swatch: 'linear-gradient(180deg, #161006 0%, #2A1F10 100%)',
  },
  {
    id: 'playful',
    label: 'Playful',
    paper: '#F7E9D2',
    ink: '#8B2D2D',
    accent: '#D95D50',
    soft: '#A46A3F',
    ruleOpacity: 0.4,
    eyebrow: 'Mark Your Calendar',
    swatch: 'linear-gradient(135deg, #F7E9D2 0%, #F2C5A0 60%, #E5B0C8 100%)',
  },
  {
    id: 'botanical',
    label: 'Botanical',
    paper: '#EEF0E6',
    ink: '#1E2A1A',
    accent: '#5C6B3F',
    soft: '#64724E',
    ruleOpacity: 0.4,
    eyebrow: 'An Invitation is Forthcoming',
    swatch: 'linear-gradient(180deg, #EEF0E6 0%, #D9DFC9 100%)',
  },
  {
    id: 'photo',
    label: 'Photo',
    paper: '#18181B',
    ink: '#FAF7F2',
    accent: '#E8D8B4',
    soft: 'rgba(250,247,242,0.75)',
    ruleOpacity: 0.5,
    eyebrow: 'Save the Date',
    swatch: 'linear-gradient(180deg, #3A332C 0%, #18181B 100%)',
    usePhoto: true,
  },
];

type Aspect = 'landscape' | 'portrait';

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Pure SVG card (used for preview AND PNG export) ──────────
interface CardProps {
  variant: Variant;
  displayNames: string;
  date: string;
  venue: string;
  message: string;
  website: string;
  aspect: Aspect;
  photoUrl?: string;
  /** If true, embed @font-face rules so exported PNG has italic serif. */
  embedFonts?: boolean;
}

function CardSvg({
  variant,
  displayNames,
  date,
  venue,
  message,
  website,
  aspect,
  photoUrl,
  embedFonts,
}: CardProps) {
  const isPortrait = aspect === 'portrait';
  const W = isPortrait ? 750 : 1050;
  const H = isPortrait ? 1050 : 750;
  const cx = W / 2;

  // Layout anchors that scale with aspect. Keeping visual
  // rhythm on a portrait card requires pushing everything down.
  const pad = 40;
  const eyebrowY = isPortrait ? 150 : 130;
  const namesY = isPortrait ? H / 2 - 20 : 310;
  const dividerY = namesY + (isPortrait ? 70 : 50);
  const dateY = dividerY + (isPortrait ? 80 : 80);
  const venueY = dateY + (isPortrait ? 52 : 46);
  const messageY = venueY + (isPortrait ? 82 : 74);
  const websiteLineY = H - 90;
  const websiteY = H - 60;

  const rule = `rgba(${hexToRgb(variant.accent)}, ${variant.ruleOpacity})`;
  const ruleSoft = `rgba(${hexToRgb(variant.accent)}, ${variant.ruleOpacity * 0.55})`;
  const fontDisplay = '"Fraunces", "Playfair Display", Georgia, serif';
  const fontMono = '"Geist Mono", "JetBrains Mono", ui-monospace, monospace';

  const namesFontSize = isPortrait ? 80 : 96;
  const dateFontSize = isPortrait ? 30 : 34;
  const showPhoto = variant.usePhoto && photoUrl;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {embedFonts && (
        <defs>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;1,400&family=Geist+Mono:wght@400&display=swap');`}</style>
        </defs>
      )}
      <defs>
        <linearGradient id="pl-std-veil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(24,24,27,0.15)" />
          <stop offset="55%" stopColor="rgba(24,24,27,0.55)" />
          <stop offset="100%" stopColor="rgba(24,24,27,0.82)" />
        </linearGradient>
      </defs>

      {/* Base paper */}
      <rect width={W} height={H} fill={variant.paper} />

      {/* Photo variant background */}
      {showPhoto && (
        <>
          <image
            href={photoUrl}
            xlinkHref={photoUrl}
            x={0}
            y={0}
            width={W}
            height={H}
            preserveAspectRatio="xMidYMid slice"
          />
          <rect width={W} height={H} fill="url(#pl-std-veil)" />
        </>
      )}

      {/* Outer inset frame */}
      <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} fill="none" stroke={rule} strokeWidth={1} />
      <rect x={pad + 14} y={pad + 14} width={W - (pad + 14) * 2} height={H - (pad + 14) * 2} fill="none" stroke={ruleSoft} strokeWidth={0.75} />

      {/* Top eyebrow ornament */}
      <line x1={cx - 140} y1={eyebrowY} x2={cx - 30} y2={eyebrowY} stroke={variant.accent} strokeWidth={1} />
      <line x1={cx + 30} y1={eyebrowY} x2={cx + 140} y2={eyebrowY} stroke={variant.accent} strokeWidth={1} />
      <text
        x={cx}
        y={eyebrowY + 4}
        textAnchor="middle"
        fontFamily={fontMono}
        fontSize={15}
        letterSpacing={6}
        fill={variant.soft}
      >
        {variant.eyebrow.toUpperCase()}
      </text>

      {/* Display names */}
      <text
        x={cx}
        y={namesY}
        textAnchor="middle"
        fontFamily={fontDisplay}
        fontStyle="italic"
        fontWeight={400}
        fontSize={namesFontSize}
        fill={variant.ink}
      >
        {displayNames}
      </text>

      {/* Divider flourish */}
      <line x1={cx - 40} y1={dividerY} x2={cx + 40} y2={dividerY} stroke={variant.accent} strokeWidth={1.5} />
      <circle cx={cx} cy={dividerY} r={4} fill={variant.accent} />

      {/* Date */}
      {date && (
        <text
          x={cx}
          y={dateY}
          textAnchor="middle"
          fontFamily={fontDisplay}
          fontStyle="italic"
          fontSize={dateFontSize}
          fill={variant.ink}
        >
          {date}
        </text>
      )}

      {/* Venue */}
      {venue && (
        <text
          x={cx}
          y={venueY}
          textAnchor="middle"
          fontFamily={fontMono}
          fontSize={14}
          letterSpacing={4}
          fill={variant.soft}
        >
          {venue.toUpperCase()}
        </text>
      )}

      {/* Custom message */}
      {message && (
        <text
          x={cx}
          y={messageY}
          textAnchor="middle"
          fontFamily={fontDisplay}
          fontStyle="italic"
          fontSize={22}
          fill={variant.soft}
        >
          {message}
        </text>
      )}

      {/* Bottom website line */}
      <line x1={cx - 170} y1={websiteLineY} x2={cx + 170} y2={websiteLineY} stroke={ruleSoft} strokeWidth={0.75} />
      <text
        x={cx}
        y={websiteY}
        textAnchor="middle"
        fontFamily={fontMono}
        fontSize={13}
        letterSpacing={3}
        fill={variant.soft}
      >
        {website.toUpperCase()}
      </text>
    </svg>
  );
}

function hexToRgb(hex: string): string {
  const m = hex.replace('#', '');
  const n = parseInt(
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m,
    16,
  );
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// ── Main panel ───────────────────────────────────────────────
interface SaveTheDatePanelProps {
  manifest: StoryManifest;
  subdomain: string;
}

// ── Photo-style presets (Gemini image-edit) ──────────────────
// Mirrors the server side. Keep ids in sync with
// /api/photos/stylize prompts — the server is source of truth
// for the actual prompt text.
const PHOTO_STYLES = [
  { id: 'paper-craft', label: 'Paper craft' },
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'embroidery', label: 'Embroidery' },
  { id: 'botanical', label: 'Botanical' },
] as const;
type PhotoStyleId = (typeof PHOTO_STYLES)[number]['id'];
type PhotoStyleChoice = PhotoStyleId | 'original';

export function SaveTheDatePanel({ manifest, subdomain }: SaveTheDatePanelProps) {
  const svgRef = useRef<HTMLDivElement>(null);
  const [variantId, setVariantId] = useState<Variant['id']>('minimalist');
  const [aspect, setAspect] = useState<Aspect>('landscape');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  // Nano-banana style transforms for the Photo variant.
  const [photoStyle, setPhotoStyle] = useState<PhotoStyleChoice>('original');
  const [stylizingId, setStylizingId] = useState<PhotoStyleId | null>(null);
  const [stylizedCache, setStylizedCache] = useState<Partial<Record<PhotoStyleId, string>>>({});
  const [stylizeError, setStylizeError] = useState<string | null>(null);

  const variant = useMemo(
    () => VARIANTS.find((v) => v.id === variantId) ?? VARIANTS[0],
    [variantId],
  );

  const coupleNames = (manifest as unknown as { names?: string[] }).names ?? [];
  const events = manifest.events || [];
  const mainEvent = events.find((e) => e.type === 'ceremony') || events[0];
  const date = mainEvent?.date ? formatDate(mainEvent.date) : '';
  const venue = mainEvent?.venue || '';
  const displayNames = coupleNames.filter(Boolean).join(' & ') || 'The Couple';
  const website = subdomain
    ? formatSiteDisplayUrl(subdomain, '', manifest.occasion)
    : 'pearloom.com';
  const message = customMessage.trim();

  // Hero photo (first available from manifest) — used by the
  // "Photo" variant and offered as an option on the others.
  const heroPhoto = useMemo(() => {
    const anyManifest = manifest as unknown as {
      coverPhoto?: string;
      heroSlideshow?: string[];
      chapters?: Array<{
        images?: Array<{ url?: string } | string>;
        heroPhotoIndex?: number;
      }>;
    };
    if (anyManifest.coverPhoto) return anyManifest.coverPhoto;
    if (anyManifest.heroSlideshow?.[0]) return anyManifest.heroSlideshow[0];
    const chapter0 = anyManifest.chapters?.[0];
    if (chapter0?.images?.length) {
      const idx = chapter0.heroPhotoIndex ?? 0;
      const img = chapter0.images[idx] ?? chapter0.images[0];
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object' && 'url' in img) return img.url;
    }
    return undefined;
  }, [manifest]);

  // Resolve the photo actually shown on the Photo variant —
  // stylized override if one is active, else the raw hero.
  const effectivePhoto = useMemo(() => {
    if (photoStyle !== 'original') {
      const cached = stylizedCache[photoStyle];
      if (cached) return cached;
    }
    return heroPhoto;
  }, [photoStyle, stylizedCache, heroPhoto]);

  const handleChoosePhotoStyle = useCallback(
    async (choice: PhotoStyleChoice) => {
      setStylizeError(null);

      if (choice === 'original') {
        setPhotoStyle('original');
        return;
      }
      // If we already rendered this style for the current photo,
      // switching back is instant.
      if (stylizedCache[choice]) {
        setPhotoStyle(choice);
        return;
      }
      if (!heroPhoto) {
        setStylizeError('Add a photo to your site first.');
        return;
      }
      if (stylizingId) return;

      setStylizingId(choice);
      try {
        const res = await fetch('/api/photos/stylize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl: heroPhoto, style: choice }),
        });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error || `Request failed (${res.status})`);
        }
        setStylizedCache((prev) => ({ ...prev, [choice]: data.url }));
        setPhotoStyle(choice);
      } catch (err) {
        logEditorError('SaveTheDatePanel: stylize', err);
        setStylizeError(err instanceof Error ? err.message : 'Style render failed.');
      } finally {
        setStylizingId(null);
      }
    },
    [heroPhoto, stylizedCache, stylizingId],
  );

  // Render the current SVG to a PNG blob. Used by both the
  // download and share-as-image flows.
  const renderPngBlob = useCallback(async (): Promise<Blob | null> => {
    if (!svgRef.current) return null;
    const svgEl = svgRef.current.querySelector('svg');
    if (!svgEl) return null;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clone);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('SVG load failed'));
        img.src = url;
      });

      const isPortrait = aspect === 'portrait';
      const W = isPortrait ? 1500 : 2100;
      const H = isPortrait ? 2100 : 1500;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas 2d ctx unavailable');
      ctx.fillStyle = variant.paper;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);

      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }, [aspect, variant.paper]);

  // PNG download
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const blob = await renderPngBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `save-the-date-${subdomain || 'pearloom'}-${aspect}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      logEditorError('SaveTheDatePanel: png export', err);
    } finally {
      setDownloading(false);
    }
  }, [aspect, renderPngBlob, subdomain]);

  // Web Share API — hands the PNG off to the OS share sheet on
  // supporting devices. Falls back gracefully on desktop Chrome
  // (text + url only) and surfaces a clear message otherwise.
  const canWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const [webSharing, setWebSharing] = useState(false);
  const handleWebShare = useCallback(async () => {
    setShareError(null);
    if (!canWebShare) {
      setShareError('This browser can\u2019t use the native share sheet.');
      return;
    }
    setWebSharing(true);
    try {
      const url = buildSiteUrl(subdomain, '', undefined, manifest.occasion);
      const title = `${displayNames} — Save the Date`;
      const text = date ? `${displayNames} · ${date}` : displayNames;

      const blob = await renderPngBlob();
      const file = blob
        ? new File([blob], `save-the-date-${subdomain || 'pearloom'}.png`, { type: 'image/png' })
        : null;
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData & { files?: File[] }) => boolean;
      };
      if (file && nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ title, text, url, files: [file] });
      } else {
        await navigator.share({ title, text, url });
      }
    } catch (err) {
      // User-cancelled share throws AbortError — silent.
      const anyErr = err as { name?: string };
      if (anyErr?.name !== 'AbortError') {
        logEditorError('SaveTheDatePanel: web share', err);
        setShareError('Share cancelled or unavailable.');
      }
    } finally {
      setWebSharing(false);
    }
  }, [canWebShare, date, displayNames, manifest.occasion, renderPngBlob, subdomain]);

  const handleCopyLink = useCallback(async () => {
    const url = buildSiteUrl(subdomain, '', undefined, manifest.occasion);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logEditorError('SaveTheDatePanel: copy link', err);
    }
  }, [subdomain, manifest.occasion]);

  // Mint a 24-hour shareable preview URL via /api/preview so the
  // user can send the current draft to a partner/vendor for a
  // look before any guests receive a real invitation.
  const handleShare24h = useCallback(async () => {
    setSharing(true);
    try {
      const siteId =
        (manifest as unknown as { coupleId?: string }).coupleId ||
        (manifest as unknown as { subdomain?: string }).subdomain ||
        subdomain;
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, manifest, ttlHours: 24 }),
      });
      if (!res.ok) throw new Error('preview mint failed');
      const { previewUrl } = await res.json();
      if (previewUrl) {
        setSharedUrl(previewUrl);
        try {
          await navigator.clipboard.writeText(previewUrl);
        } catch {
          /* user can still click link */
        }
      }
    } catch (err) {
      logEditorError('SaveTheDatePanel: share 24h preview', err);
    } finally {
      setSharing(false);
    }
  }, [manifest, subdomain]);

  // Hand off to the bulk-email flow. The Guests panel listens
  // for `pearloom:send-save-the-date` and opens its bulk modal.
  const handleSendBulk = useCallback(() => {
    setSending(true);
    window.dispatchEvent(
      new CustomEvent('pearloom:send-save-the-date', {
        detail: {
          variant: variantId,
          message: message || undefined,
        },
      }),
    );
    setTimeout(() => setSending(false), 1200);
  }, [variantId, message]);

  return (
    <PanelRoot>
      {/* ── Variant picker + message ── */}
      <PanelSection title="Style" icon={Palette} defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              fontSize: panelText.label,
              color: '#71717A',
              textTransform: 'uppercase',
              letterSpacing: panelTracking.wide,
              fontWeight: panelWeight.bold,
            }}
          >
            Style
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {VARIANTS.map((v) => {
              const on = variantId === v.id;
              const disabled = v.usePhoto && !heroPhoto;
              return (
                <button
                  key={v.id}
                  onClick={() => !disabled && setVariantId(v.id)}
                  disabled={disabled}
                  title={disabled ? 'Add a photo to your site to use this variant' : undefined}
                  style={{
                    padding: '10px 10px',
                    borderRadius: 8,
                    border: `1px solid ${on ? v.accent : '#E4E4E7'}`,
                    background: on ? `${v.accent}18` : v.swatch,
                    color: on ? v.ink : '#3F3F46',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.45 : 1,
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: panelText.body,
                      fontWeight: panelWeight.bold,
                    }}
                  >
                    {v.label}
                  </span>
                  <span
                    style={{
                      fontSize: panelText.meta,
                      color: v.soft,
                      fontStyle: 'italic',
                    }}
                  >
                    {disabled ? 'Needs a photo' : v.eyebrow}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspect ratio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div
            style={{
              fontSize: panelText.label,
              color: '#71717A',
              textTransform: 'uppercase',
              letterSpacing: panelTracking.wide,
              fontWeight: panelWeight.bold,
            }}
          >
            Shape
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {([
              ['landscape', 'Landscape', 'For email & desktop'],
              ['portrait', 'Portrait', 'For stories & prints'],
            ] as const).map(([id, label, hint]) => {
              const on = aspect === id;
              return (
                <button
                  key={id}
                  onClick={() => setAspect(id)}
                  style={{
                    padding: '10px 10px',
                    borderRadius: 8,
                    border: `1px solid ${on ? '#18181B' : '#E4E4E7'}`,
                    background: on ? '#18181B' : '#FFFFFF',
                    color: on ? '#FAF7F2' : '#3F3F46',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: panelText.body, fontWeight: panelWeight.bold }}>
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: panelText.meta,
                      color: on ? 'rgba(250,247,242,0.6)' : '#A1A1AA',
                      fontStyle: 'italic',
                    }}
                  >
                    {hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Photo-style transforms — Gemini image-edit presets.
            Only shown on the Photo variant once a source photo
            is available, since we need something to restyle. */}
        {variantId === 'photo' && heroPhoto && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div
              style={{
                fontSize: panelText.label,
                color: '#71717A',
                textTransform: 'uppercase',
                letterSpacing: panelTracking.wide,
                fontWeight: panelWeight.bold,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles size={11} />
              Photo style
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {(['original', ...PHOTO_STYLES.map((s) => s.id)] as PhotoStyleChoice[]).map(
                (choice) => {
                  const isOriginal = choice === 'original';
                  const label = isOriginal
                    ? 'Original'
                    : PHOTO_STYLES.find((s) => s.id === choice)?.label ?? choice;
                  const on = photoStyle === choice;
                  const loading = stylizingId === choice;
                  const disabled = !!stylizingId && !loading;
                  return (
                    <button
                      key={choice}
                      onClick={() => handleChoosePhotoStyle(choice)}
                      disabled={disabled}
                      style={{
                        padding: '10px 10px',
                        borderRadius: 8,
                        border: `1px solid ${on ? '#18181B' : '#E4E4E7'}`,
                        background: on ? '#18181B' : '#FFFFFF',
                        color: on ? '#FAF7F2' : '#3F3F46',
                        cursor: disabled ? 'wait' : loading ? 'wait' : 'pointer',
                        opacity: disabled ? 0.55 : 1,
                        textAlign: 'left',
                        fontSize: panelText.body,
                        fontWeight: panelWeight.bold,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {loading ? 'Rendering\u2026' : label}
                    </button>
                  );
                },
              )}
            </div>
            <div
              style={{
                fontSize: panelText.meta,
                color: '#71717A',
                fontStyle: 'italic',
              }}
            >
              Restyles your hero photo with AI — faces stay the same.
            </div>
            {stylizeError && (
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(220,38,38,0.06)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  fontSize: panelText.hint,
                  color: '#7F1D1D',
                }}
              >
                {stylizeError}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div
            style={{
              fontSize: panelText.label,
              color: '#71717A',
              textTransform: 'uppercase',
              letterSpacing: panelTracking.wide,
              fontWeight: panelWeight.bold,
            }}
          >
            Custom line
          </div>
          <input
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Formal invitation to follow"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #E4E4E7',
              background: '#FFFFFF',
              color: '#18181B',
              fontSize: 'max(16px, 0.8rem)',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.normal,
            }}
          />
        </div>
      </PanelSection>

      {/* ── Preview ── */}
      <PanelSection title="Preview" icon={Eye} defaultOpen>
        <div
          ref={svgRef}
          style={{
            width: '100%',
            maxWidth: aspect === 'portrait' ? 280 : '100%',
            margin: aspect === 'portrait' ? '0 auto' : undefined,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #E4E4E7',
            background: variant.paper,
          }}
        >
          <CardSvg
            variant={variant}
            displayNames={displayNames}
            date={date}
            venue={venue}
            message={message}
            website={website}
            aspect={aspect}
            photoUrl={effectivePhoto}
            embedFonts
          />
        </div>

        {!mainEvent && (
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: 'rgba(234,179,8,0.07)',
              border: '1px solid rgba(234,179,8,0.2)',
              fontSize: panelText.hint,
              color: '#3F3F46',
            }}
          >
            Add a ceremony or event with a date to see it on the card.
          </div>
        )}
      </PanelSection>

      {/* ── Share / Send ── */}
      <PanelSection title="Share" icon={Send} defaultOpen>
        <div style={{ display: 'grid', gap: 6 }}>
          <motion.button
            onClick={handleSendBulk}
            disabled={sending}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 11,
              borderRadius: 8,
              border: '1px solid #18181B',
              background: '#18181B',
              color: '#FAF7F2',
              cursor: sending ? 'wait' : 'pointer',
              fontSize: panelText.body,
              fontWeight: panelWeight.bold,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Send size={13} />
            {sending ? 'Opening…' : 'Send as save-the-date'}
          </motion.button>

          {/* Native share sheet (mobile-primary). Renders only
              when the browser supports navigator.share, so we
              never show a button that does nothing. */}
          {canWebShare && (
            <motion.button
              onClick={handleWebShare}
              disabled={webSharing}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #B8935A',
                background: '#FAF7F2',
                color: '#8C6E3D',
                cursor: webSharing ? 'wait' : 'pointer',
                fontSize: panelText.body,
                fontWeight: panelWeight.bold,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              <Share2 size={13} />
              {webSharing ? 'Opening share sheet\u2026' : 'Share via phone'}
            </motion.button>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <motion.button
              onClick={handleDownload}
              disabled={downloading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: 9,
                borderRadius: 8,
                border: '1px solid #E4E4E7',
                background: '#F4F4F5',
                color: '#3F3F46',
                cursor: downloading ? 'wait' : 'pointer',
                fontSize: panelText.body,
                fontWeight: panelWeight.bold,
              }}
            >
              <Download size={13} />
              {downloading ? 'Saving\u2026' : 'PNG'}
            </motion.button>

            <motion.button
              onClick={handleCopyLink}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: 9,
                borderRadius: 8,
                border: '1px solid #E4E4E7',
                background: '#F4F4F5',
                color: '#3F3F46',
                cursor: 'pointer',
                fontSize: panelText.body,
                fontWeight: panelWeight.bold,
              }}
            >
              {copied ? <Check size={13} /> : <Link2 size={13} />}
              {copied ? 'Copied' : 'Link'}
            </motion.button>
          </div>

          {shareError && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: 'rgba(234,179,8,0.07)',
                border: '1px solid rgba(234,179,8,0.2)',
                fontSize: panelText.hint,
                color: '#3F3F46',
              }}
            >
              {shareError}
            </div>
          )}

          {/* 24h preview share */}
          <motion.button
            onClick={handleShare24h}
            disabled={sharing}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 10,
              borderRadius: 8,
              border: '1px dashed #B8935A',
              background: 'rgba(184,147,90,0.08)',
              color: '#8C6E3D',
              cursor: sharing ? 'wait' : 'pointer',
              fontSize: panelText.hint,
              fontWeight: panelWeight.bold,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Clock size={12} />
            {sharing ? 'Minting…' : 'Share 24-hour preview'}
          </motion.button>

          {sharedUrl && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(184,147,90,0.06)',
                border: '1px solid rgba(184,147,90,0.25)',
                fontSize: panelText.hint,
                color: '#3F3F46',
                wordBreak: 'break-all',
                fontFamily: 'var(--pl-font-mono, monospace)',
              }}
            >
              Copied to clipboard · expires in 24h
              <div style={{ marginTop: 4, color: '#8C6E3D' }}>{sharedUrl}</div>
            </div>
          )}
        </div>
      </PanelSection>
    </PanelRoot>
  );
}
