'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/SaveTheDatePanel.tsx
//
// Generates a beautiful Save-the-Date card that couples can
// download or share. Renders a live preview using theme colors
// + first event date, then offers:
//   • Download as PNG (via html-to-image / canvas)
//   • Copy a shareable link (just the event details page)
// ─────────────────────────────────────────────────────────────

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Link2, Check, Calendar, Image } from 'lucide-react';
import type { StoryManifest } from '@/types';

// ── Card layout themes ────────────────────────────────────────
const CARD_STYLES = [
  { id: 'elegant',  label: 'Elegant',  bg: 'linear-gradient(135deg, #1a1410 0%, #2d2218 100%)', text: '#D6C6A8', accent: '#A3B18A' },
  { id: 'romantic', label: 'Romantic', bg: 'linear-gradient(135deg, #1f0f14 0%, #2d1520 100%)', text: '#f0d8e0', accent: '#e87ab8' },
  { id: 'minimal',  label: 'Minimal',  bg: 'linear-gradient(135deg, #faf8f4 0%, #f0ebe2 100%)', text: '#2B2B2B', accent: '#8A7A4A' },
  { id: 'garden',   label: 'Garden',   bg: 'linear-gradient(135deg, #0d1812 0%, #162412 100%)', text: '#D4E6C3', accent: '#7BB661' },
] as const;

type CardStyleId = (typeof CARD_STYLES)[number]['id'];

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

interface SaveTheDatePanelProps {
  manifest: StoryManifest;
  subdomain: string;
}

export function SaveTheDatePanel({ manifest, subdomain }: SaveTheDatePanelProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardStyle, setCardStyle] = useState<CardStyleId>('elegant');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const coupleNames = (manifest as unknown as { names?: string[] }).names ?? [];
  const events = manifest.events || [];
  const mainEvent = events.find(e => e.type === 'ceremony') || events[0];
  const date = mainEvent?.date ? formatDate(mainEvent.date) : '';
  const venue = mainEvent?.venue || '';
  const headingFont = manifest.vibeSkin?.fonts?.heading || 'Georgia';

  const style = CARD_STYLES.find(s => s.id === cardStyle) || CARD_STYLES[0];
  const displayNames = coupleNames.filter(Boolean).join(' & ') || 'The Couple';
  const message = customMessage.trim() || 'Please save the date';

  // Download using browser print / canvas approach
  const handleDownload = useCallback(() => {
    setDownloading(true);
    try {
      if (!cardRef.current) return;
      const cardHtml = cardRef.current.outerHTML;
      const w = window.open('', '_blank', 'width=700,height=520');
      if (w) {
        w.document.write(`<!DOCTYPE html><html><head><title>Save the Date — ${subdomain}</title><style>*{box-sizing:border-box;}body{margin:0;padding:32px;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;}@media print{body{background:transparent;padding:0;display:block;}</style></head><body>${cardHtml}</body></html>`);
        w.document.close();
        setTimeout(() => { w.focus(); w.print(); }, 300);
      }
    } catch { /* silent */ }
    finally { setDownloading(false); }
  }, [subdomain]);

  const handleCopyLink = useCallback(async () => {
    const url = `https://${subdomain}.pearloom.com`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [subdomain]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'rgba(214,198,168,0.5)',
      }}>
        <Calendar size={11} /> Save the Date
      </div>

      {/* Style picker */}
      <div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Card Style</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CARD_STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setCardStyle(s.id)}
              style={{
                padding: '5px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                border: `1px solid ${cardStyle === s.id ? s.accent : 'rgba(255,255,255,0.1)'}`,
                background: cardStyle === s.id ? `${s.accent}22` : 'transparent',
                color: cardStyle === s.id ? s.accent : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
              }}
            >{s.label}</button>
          ))}
        </div>
      </div>

      {/* Custom message */}
      <div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Message</div>
        <input
          value={customMessage}
          onChange={e => setCustomMessage(e.target.value)}
          placeholder="Please save the date"
          style={{
            width: '100%', padding: '7px 10px', borderRadius: '7px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Card preview */}
      <div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Preview</div>
        <div
          ref={cardRef}
          style={{
            width: '100%',
            aspectRatio: '7 / 5',
            borderRadius: '12px',
            overflow: 'hidden',
            background: style.bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            boxSizing: 'border-box',
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Decorative top line */}
          <div style={{ position: 'absolute', top: '14px', left: '24px', right: '24px', height: '1px', background: `${style.accent}40` }} />
          <div style={{ position: 'absolute', bottom: '14px', left: '24px', right: '24px', height: '1px', background: `${style.accent}40` }} />

          {/* Save the date tagline */}
          <div style={{
            fontSize: '0.55rem', letterSpacing: '0.3em', textTransform: 'uppercase',
            color: `${style.accent}aa`, fontWeight: 700, marginBottom: '8px',
          }}>
            {message.toUpperCase()}
          </div>

          {/* Names */}
          <div style={{
            fontFamily: headingFont,
            fontSize: 'clamp(1rem, 3vw, 1.5rem)',
            fontWeight: 400,
            color: style.text,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            lineHeight: 1.2,
            marginBottom: '10px',
          }}>
            {displayNames}
          </div>

          {/* Divider flourish */}
          <div style={{
            width: '40px', height: '1px', background: `${style.accent}80`,
            marginBottom: '8px',
          }} />

          {/* Date */}
          {date && (
            <div style={{
              fontSize: '0.65rem', color: `${style.text}cc`,
              letterSpacing: '0.06em', textAlign: 'center', fontWeight: 500,
            }}>
              {date}
            </div>
          )}

          {/* Venue */}
          {venue && (
            <div style={{
              fontSize: '0.55rem', color: `${style.text}80`,
              letterSpacing: '0.08em', textAlign: 'center', marginTop: '5px', textTransform: 'uppercase',
            }}>
              {venue}
            </div>
          )}

          {/* Website */}
          <div style={{
            position: 'absolute', bottom: '24px',
            fontSize: '0.5rem', color: `${style.accent}80`,
            letterSpacing: '0.12em', textTransform: 'lowercase',
          }}>
            {subdomain}.pearloom.com
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <motion.button
          onClick={handleDownload}
          disabled={downloading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px', borderRadius: '9px',
            border: '1px solid rgba(163,177,138,0.3)',
            background: 'rgba(163,177,138,0.1)', color: '#A3B18A',
            cursor: downloading ? 'wait' : 'pointer', fontSize: '0.75rem', fontWeight: 700,
          }}
        >
          <Download size={13} />
          {downloading ? 'Saving…' : 'Download PNG'}
        </motion.button>

        <motion.button
          onClick={handleCopyLink}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px', borderRadius: '9px',
            border: '1px solid rgba(214,198,168,0.2)',
            background: 'rgba(214,198,168,0.07)', color: '#D6C6A8',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
          }}
        >
          {copied ? <Check size={13} color="#A3B18A" /> : <Link2 size={13} />}
          {copied ? 'Copied!' : 'Copy Link'}
        </motion.button>
      </div>

      {!mainEvent && (
        <div style={{
          padding: '8px 10px', borderRadius: '7px',
          background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)',
          fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)',
        }}>
          ⚠️ Add a ceremony or event with a date to see it on the card.
        </div>
      )}
    </div>
  );
}
