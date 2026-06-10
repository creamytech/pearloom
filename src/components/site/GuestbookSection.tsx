'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/GuestbookSection.tsx
// Public-facing guestbook component for wedding sites
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import type { VibeSkin } from '@/lib/vibe-engine';
import type { StoryManifest } from '@/types';

interface GuestbookMessage {
  id: string;
  name: string;
  message: string;
  emoji: string;
  created_at: string;
}

export interface GuestbookSectionProps {
  subdomain: string;
  vibeSkin?: VibeSkin;
  manifest: StoryManifest;
}

/* ── Guest glyphs — hand-drawn SVG marks replacing the old emoji
   picker (BRAND.md §10: no emoji peppered through copy). Stored
   by id; legacy rows that saved a raw emoji render through the
   LEGACY_GLYPH map so old signatures keep their sentiment. ── */
type GlyphId = 'heart' | 'sprig' | 'bloom' | 'sparkle' | 'rings' | 'dove';
const GLYPH_OPTIONS: GlyphId[] = ['heart', 'sprig', 'bloom', 'sparkle', 'rings', 'dove'];
const LEGACY_GLYPH: Record<string, GlyphId> = {
  '💕': 'heart', '💝': 'heart', '❤️': 'heart',
  '🌸': 'bloom', '💐': 'bloom', '🌹': 'bloom',
  '✨': 'sparkle', '💫': 'sparkle', '🎉': 'sparkle',
  '🥂': 'rings', '💍': 'rings',
  '🕊️': 'dove', '🕊': 'dove',
};
const GLYPH_LABEL: Record<GlyphId, string> = {
  heart: 'With love', sprig: 'An olive sprig', bloom: 'A bloom',
  sparkle: 'A sparkle', rings: 'Two rings', dove: 'A dove',
};

function GuestGlyph({ id, size = 20, color = 'currentColor' }: { id: string; size?: number; color?: string }) {
  const g = (GLYPH_OPTIONS as string[]).includes(id) ? (id as GlyphId) : LEGACY_GLYPH[id];
  if (!g) return <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>{id}</span>;
  const k = { fill: 'none' as const, stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const body = (() => {
    switch (g) {
      case 'heart':
        return <path d="M12 20 C 6 15, 3 11, 3 8 a4.4 4.4 0 0 1 9 -1.4 A4.4 4.4 0 0 1 21 8 c 0 3, -3 7, -9 12 Z" {...k} />;
      case 'sprig':
        return (<g {...k}><path d="M5 20 C 9 16, 13 11, 19 4" /><path d="M9 16 C 7 14, 7 12, 8.4 10.6 C 10 12, 10.4 14, 9 16 Z" /><path d="M13 11.5 C 14.6 10, 16.6 9.8, 18 11 C 16.4 12.6, 14.4 12.8, 13 11.5 Z" /></g>);
      case 'bloom':
        return (<g {...k}><circle cx="12" cy="12" r="2.3" /><path d="M12 9.7 C 10.6 7.4, 11 4.8, 12 3.4 C 13 4.8, 13.4 7.4, 12 9.7 Z" /><path d="M14.3 12 C 16.6 10.6, 19.2 11, 20.6 12 C 19.2 13, 16.6 13.4, 14.3 12 Z" /><path d="M12 14.3 C 13.4 16.6, 13 19.2, 12 20.6 C 11 19.2, 10.6 16.6, 12 14.3 Z" /><path d="M9.7 12 C 7.4 13.4, 4.8 13, 3.4 12 C 4.8 11, 7.4 10.6, 9.7 12 Z" /></g>);
      case 'sparkle':
        return <path d="M12 3 L 13.6 10.4 L 21 12 L 13.6 13.6 L 12 21 L 10.4 13.6 L 3 12 L 10.4 10.4 Z" {...k} />;
      case 'rings':
        return (<g {...k}><circle cx="9" cy="13.5" r="5.6" /><circle cx="15" cy="10.5" r="5.6" /></g>);
      case 'dove':
        return (<g {...k}><path d="M4 14 C 8 14, 11 12, 13 8 C 14 10, 14 12, 13.4 13.6 C 16 13.4, 18.4 12, 20 9.6 C 20 15, 16 19, 10.6 19 C 7.6 19, 5.2 17, 4 14 Z" /><path d="M13 8 C 12.4 6.6, 11.2 6, 9.8 6.2 C 10.6 7.2, 11 7.8, 11.4 8.8" /></g>);
    }
  })();
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>{body}</svg>;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function GuestbookSection({ subdomain, vibeSkin, manifest }: GuestbookSectionProps) {
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('heart');
  const [showForm, setShowForm] = useState(false);

  const accent = vibeSkin?.palette?.accent || 'var(--pl-olive, #5C6B3F)';
  const headingFont = vibeSkin?.fonts?.heading || 'Playfair Display';

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/sites/guestbook?subdomain=${encodeURIComponent(subdomain)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('[GuestbookSection] Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, [subdomain]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/sites/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          name: name.trim(),
          message: message.trim(),
          emoji: selectedEmoji,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to submit message. Please try again.');
        return;
      }

      // Add new message to list
      if (data.message) {
        setMessages(prev => [data.message, ...prev]);
      }

      // Reset form
      setName('');
      setMessage('');
      setSelectedEmoji('heart');
      setShowForm(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const sectionHeading = (vibeSkin?.sectionLabels as Record<string, string> | undefined)?.['guestbook'] || 'Guest Wishes';

  return (
    <section
      id="guestbook"
      style={{
        padding: '5rem 2rem',
        background: 'var(--pl-cream, #F5F1E8)',
        position: 'relative',
      }}
    >
      {/* Section header */}
      <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 4rem' }}>
        {/* Eyebrow with accent lines */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: '48px', height: '1px', background: accent, opacity: 0.3 }} />
          <span style={{ fontSize: '0.62rem', letterSpacing: '0.32em', textTransform: 'uppercase' as const, color: accent, fontWeight: 700, opacity: 0.85 }}>
            {vibeSkin?.accentSymbol || '✦'}
          </span>
          <div style={{ width: '48px', height: '1px', background: accent, opacity: 0.3 }} />
        </div>
        <h2
          style={{
            fontFamily: `"${headingFont}", serif`,
            fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
            fontWeight: 600,
            fontStyle: 'italic',
            color: 'var(--pl-ink, var(--pl-ink-soft))',
            margin: '0 0 1.5rem',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
          }}
        >
          {sectionHeading}
        </h2>
        {/* Ornamental rule */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '24px', height: '1px', background: accent, opacity: 0.35 }} />
          <div style={{ width: '4px', height: '4px', background: accent, transform: 'rotate(45deg)', opacity: 0.5 }} />
          <div style={{ width: '24px', height: '1px', background: accent, opacity: 0.35 }} />
        </div>
        <p style={{ color: 'var(--pl-muted, #9A9488)', fontSize: '1rem', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
          Leave a note — your words will mean the world to them.
        </p>
      </div>

      {/* Success toast */}
      {submitSuccess && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: 'var(--pl-plum, #6D597A)',
            color: '#fff',
            padding: '1rem 1.5rem',
            borderRadius: '0.75rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 1000,
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          Your message was delivered.
        </div>
      )}

      {/* Messages grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--pl-muted, #9A9488)', padding: '2rem' }}>
          Loading messages...
        </div>
      ) : messages.length > 0 ? (
        <div
          className="pl-cascade-row"
          style={{
            maxWidth: '1100px',
            margin: '0 auto 3rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                background: 'var(--pl-ink)',
                border: '1px solid var(--pl-divider, #E6DFD2)',
                borderRadius: '1rem',
                padding: '1.5rem',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                transition: 'box-shadow var(--pl-dur-fast)',
              }}
            >
              {/* Emoji + Name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ lineHeight: 0, color: accent }}><GuestGlyph id={msg.emoji || 'heart'} size={22} color={accent} /></span>
                <span
                  style={{
                    fontFamily: `"${headingFont}", serif`,
                    fontWeight: 600,
                    fontSize: '1rem',
                    color: 'var(--pl-ink, var(--pl-ink-soft))',
                  }}
                >
                  {msg.name}
                </span>
              </div>

              {/* Message */}
              <p
                style={{
                  margin: 0,
                  color: 'var(--pl-ink, var(--pl-ink-soft))',
                  fontSize: '0.95rem',
                  lineHeight: 1.65,
                  opacity: 0.85,
                  flex: 1,
                }}
              >
                {msg.message}
              </p>

              {/* Date */}
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--pl-muted, #9A9488)',
                  borderTop: '1px solid var(--pl-divider, #E6DFD2)',
                  paddingTop: '0.6rem',
                }}
              >
                {formatDate(msg.created_at)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--pl-muted, #9A9488)',
            padding: '2rem',
            maxWidth: '500px',
            margin: '0 auto 3rem',
          }}
        >
          <div style={{ marginBottom: '0.75rem', opacity: 0.45, display: 'flex', justifyContent: 'center' }}><GuestGlyph id="dove" size={32} color={accent} /></div>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Be the first to leave a message for the couple!</p>
        </div>
      )}

      {/* Leave a message CTA / Form */}
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        {!showForm ? (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: 'var(--pl-plum, #6D597A)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--pl-radius-full)',
                padding: '0.9rem 2.5rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'opacity 0.15s, transform 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              Leave a Message
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'var(--pl-ink)',
              border: '1px solid var(--pl-divider, #E6DFD2)',
              borderRadius: '1.25rem',
              padding: '2rem',
              backdropFilter: 'blur(8px)',
            }}
          >
            <h3
              style={{
                fontFamily: `"${headingFont}", serif`,
                fontSize: '1.2rem',
                fontWeight: 600,
                color: 'var(--pl-ink, var(--pl-ink-soft))',
                margin: '0 0 1.5rem',
              }}
            >
              Write your message
            </h3>

            {/* Name */}
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-muted, #9A9488)',
                  marginBottom: '0.4rem',
                }}
              >
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Emma & James"
                maxLength={100}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--pl-divider, #E6DFD2)',
                  background: 'var(--pl-ink)',
                  color: 'var(--pl-ink, var(--pl-ink-soft))',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-muted, #9A9488)',
                  marginBottom: '0.4rem',
                }}
              >
                Your Message
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 200))}
                placeholder="Share your wishes for the happy couple..."
                maxLength={200}
                required
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--pl-divider, #E6DFD2)',
                  background: 'var(--pl-ink)',
                  color: 'var(--pl-ink, var(--pl-ink-soft))',
                  fontSize: '0.95rem',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  minHeight: '100px',
                }}
              />
              <div
                style={{
                  textAlign: 'right',
                  fontSize: '0.75rem',
                  color: message.length >= 180 ? 'var(--pl-plum, #6D597A)' : 'var(--pl-muted, #9A9488)',
                  marginTop: '0.2rem',
                }}
              >
                {message.length}/200
              </div>
            </div>

            {/* Emoji picker */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-muted, #9A9488)',
                  marginBottom: '0.6rem',
                }}
              >
                Reaction
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {GLYPH_OPTIONS.map((glyph) => (
                  <button
                    key={glyph}
                    type="button"
                    onClick={() => setSelectedEmoji(glyph)}
                    aria-label={GLYPH_LABEL[glyph]}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '0.5rem',
                      border: selectedEmoji === glyph
                        ? `2px solid ${accent}`
                        : '2px solid transparent',
                      background: selectedEmoji === glyph
                        ? 'rgba(92,107,63,0.08)'
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'all var(--pl-dur-instant)',
                      lineHeight: 0,
                      color: accent,
                    }}
                    title={GLYPH_LABEL[glyph]}
                  >
                    <GuestGlyph id={glyph} size={21} color={accent} />
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {submitError && (
              <div
                style={{
                  color: '#c0392b',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  padding: '0.6rem 0.8rem',
                  background: 'rgba(192,57,43,0.07)',
                  borderRadius: '0.5rem',
                }}
              >
                {submitError}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setSubmitError(null); }}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--pl-radius-full)',
                  border: '1px solid var(--pl-divider, #E6DFD2)',
                  background: 'transparent',
                  color: 'var(--pl-muted, #9A9488)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim() || !message.trim()}
                style={{
                  padding: '0.65rem 1.75rem',
                  borderRadius: 'var(--pl-radius-full)',
                  border: 'none',
                  background: 'var(--pl-plum, #6D597A)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting || !name.trim() || !message.trim() ? 0.6 : 1,
                  transition: 'opacity var(--pl-dur-instant)',
                  fontFamily: 'inherit',
                  letterSpacing: '0.04em',
                }}
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
