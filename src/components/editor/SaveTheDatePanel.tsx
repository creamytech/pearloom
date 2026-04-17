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
import { Download, Link2, Check, Calendar, Image as ImageIcon, Send, Clock } from 'lucide-react';
import type { StoryManifest } from '@/types';
import { buildSiteUrl } from '@/lib/site-urls';
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
  id: 'minimalist' | 'cinematic' | 'playful' | 'botanical';
  label: string;
  paper: string;
  ink: string;
  accent: string;
  soft: string;
  ruleOpacity: number;
  eyebrow: string;
  swatch: string;
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
];

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
  /** If true, embed @font-face rules so exported PNG has italic serif. */
  embedFonts?: boolean;
}

function CardSvg({ variant, displayNames, date, venue, message, website, embedFonts }: CardProps) {
  const W = 1050;
  const H = 750;
  const rule = `rgba(${hexToRgb(variant.accent)}, ${variant.ruleOpacity})`;
  const ruleSoft = `rgba(${hexToRgb(variant.accent)}, ${variant.ruleOpacity * 0.55})`;
  const fontDisplay = '"Fraunces", "Playfair Display", Georgia, serif';
  const fontMono = '"Geist Mono", "JetBrains Mono", ui-monospace, monospace';

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
      <rect width={W} height={H} fill={variant.paper} />

      {/* Outer inset frame */}
      <rect x={40} y={40} width={W - 80} height={H - 80} fill="none" stroke={rule} strokeWidth={1} />
      <rect x={54} y={54} width={W - 108} height={H - 108} fill="none" stroke={ruleSoft} strokeWidth={0.75} />

      {/* Top eyebrow ornament */}
      <line x1={W / 2 - 140} y1={130} x2={W / 2 - 30} y2={130} stroke={variant.accent} strokeWidth={1} />
      <line x1={W / 2 + 30} y1={130} x2={W / 2 + 140} y2={130} stroke={variant.accent} strokeWidth={1} />
      <text
        x={W / 2}
        y={134}
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
        x={W / 2}
        y={310}
        textAnchor="middle"
        fontFamily={fontDisplay}
        fontStyle="italic"
        fontWeight={400}
        fontSize={96}
        fill={variant.ink}
      >
        {displayNames}
      </text>

      {/* Divider flourish */}
      <line x1={W / 2 - 40} y1={360} x2={W / 2 + 40} y2={360} stroke={variant.accent} strokeWidth={1.5} />
      <circle cx={W / 2} cy={360} r={4} fill={variant.accent} />

      {/* Date */}
      {date && (
        <text
          x={W / 2}
          y={440}
          textAnchor="middle"
          fontFamily={fontDisplay}
          fontStyle="italic"
          fontSize={34}
          fill={variant.ink}
        >
          {date}
        </text>
      )}

      {/* Venue */}
      {venue && (
        <text
          x={W / 2}
          y={486}
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
          x={W / 2}
          y={560}
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
      <line x1={W / 2 - 170} y1={660} x2={W / 2 + 170} y2={660} stroke={ruleSoft} strokeWidth={0.75} />
      <text
        x={W / 2}
        y={690}
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

export function SaveTheDatePanel({ manifest, subdomain }: SaveTheDatePanelProps) {
  const svgRef = useRef<HTMLDivElement>(null);
  const [variantId, setVariantId] = useState<Variant['id']>('minimalist');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);

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
  const website = subdomain ? `${subdomain}.pearloom.com` : 'pearloom.com';
  const message = customMessage.trim();

  // Real PNG export: serialize the SVG and draw into a canvas.
  const handleDownload = useCallback(async () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current.querySelector('svg');
    if (!svgEl) return;

    setDownloading(true);
    try {
      // Clone + embed fonts link
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(clone);
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('SVG load failed'));
        img.src = url;
      });

      const W = 2100;
      const H = 1500;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas 2d ctx unavailable');
      ctx.fillStyle = variant.paper;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);

      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `save-the-date-${subdomain || 'pearloom'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      logEditorError('SaveTheDatePanel: png export', err);
    } finally {
      setDownloading(false);
    }
  }, [subdomain, variant.paper]);

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
      <PanelSection title="Design" icon={ImageIcon} defaultOpen>
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
              return (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  style={{
                    padding: '10px 10px',
                    borderRadius: 8,
                    border: `1px solid ${on ? v.accent : '#E4E4E7'}`,
                    background: on ? `${v.accent}18` : v.swatch,
                    color: on ? v.ink : '#3F3F46',
                    cursor: 'pointer',
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
                    {v.eyebrow}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
      <PanelSection title="Preview" icon={Calendar} defaultOpen>
        <div
          ref={svgRef}
          style={{
            width: '100%',
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

      {/* ── Ship ── */}
      <PanelSection title="Send" icon={Send} defaultOpen>
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
              {downloading ? 'Saving…' : 'PNG'}
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
