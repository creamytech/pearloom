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

const EMOJI_OPTIONS = ['💕', '🌸', '✨', '🥂', '💐', '🌹', '🎉', '💫', '🕊️', '💍'];

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
  const [selectedEmoji, setSelectedEmoji] = useState('💕');
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
      setSelectedEmoji('💕');
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
          Your message was delivered! 💕
        </div>
      )}

      {/* Messages grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--pl-muted, #9A9488)', padding: '2rem' }}>
          Loading messages...
        </div>
      ) : messages.length > 0 ? (
        <div
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
                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{msg.emoji || '💕'}</span>
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
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4 }}>💌</div>
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
                borderRadius: '100px',
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
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    style={{
                      fontSize: '1.3rem',
                      padding: '0.4rem',
                      borderRadius: '0.5rem',
                      border: selectedEmoji === emoji
                        ? `2px solid var(--pl-plum, #6D597A)`
                        : '2px solid transparent',
                      background: selectedEmoji === emoji
                        ? 'rgba(109,89,122,0.08)'
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'all var(--pl-dur-instant)',
                      lineHeight: 1,
                    }}
                    title={emoji}
                  >
                    {emoji}
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
                  borderRadius: '100px',
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
                  borderRadius: '100px',
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
