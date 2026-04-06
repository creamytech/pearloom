'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/guestbook.tsx
// Public guestbook — guests leave wishes visible on the site.
// Innovative: AI curates a "highlight" wish to feature prominently.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, AlertCircle, Send, Mic } from 'lucide-react';
import { ElegantHeartIcon } from '@/components/icons/PearloomIcons';
import type { VibeSkin } from '@/lib/vibe-engine';

const MAX_CHARS = 300;

// ── AI-inspired prompt pills — static starters guests can click ──
const PROMPT_PILLS = [
  { label: "What's your secret to a happy marriage?", starter: "My secret to a happy marriage: " },
  { label: "What do you love about this couple?", starter: "What I love most about this couple is " },
  { label: "Your favorite memory with them?", starter: "My favorite memory with them is " },
  { label: "Advice for their adventure together?", starter: "My advice for your adventure together: " },
];

interface Wish {
  id: string;
  guestName: string;
  message: string;
  createdAt: string;
  highlighted?: boolean;
}

interface GuestbookProps {
  siteId: string;
  coupleNames: [string, string];
  vibeSkin?: VibeSkin;
}

// Elegant bottom-border input style
const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0',
  borderTop: 'none',
  borderLeft: 'none',
  borderRight: 'none',
  borderBottom: '1.5px solid rgba(0,0,0,0.12)',
  background: 'transparent',
  fontSize: 'max(16px, 0.9rem)',
  fontFamily: 'var(--pl-font-body)',
  color: 'var(--pl-ink)',
  outline: 'none',
  transition: 'border-color 0.25s ease',
  borderRadius: 0,
};

function WishCard({ wish, index }: { wish: Wish; index: number }) {
  const formattedDate = (() => {
    try {
      return new Date(wish.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.6,
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ boxShadow: '0 14px 40px rgba(43,43,43,0.13)', y: -3, backgroundColor: 'rgba(255,255,255,0.97)' }}
      style={{
        background: '#ffffff',
        borderRadius: '1.25rem',
        padding: '1.75rem',
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 2px 12px rgba(43,43,43,0.04)',
        transition: 'box-shadow 0.3s ease',
        breakInside: 'avoid',
        marginBottom: '1rem',
      }}
    >
      {/* Decorative heart */}
      <div style={{ marginBottom: '1rem', opacity: 0.4 }}>
        <ElegantHeartIcon size={16} color="var(--pl-olive)" />
      </div>

      {/* Message */}
      <p
        style={{
          fontSize: '1rem',
          color: 'var(--pl-muted)',
          lineHeight: 1.7,
          fontStyle: 'italic',
          marginBottom: '1.25rem',
          fontFamily: 'var(--pl-font-body)',
        }}
      >
        &ldquo;{wish.message}&rdquo;
      </p>

      {/* Name + date */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'var(--pl-olive-mist)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: 'var(--pl-olive)',
              flexShrink: 0,
            }}
          >
            {wish.guestName.charAt(0).toUpperCase()}
          </div>
          <span
            style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: '1.1rem',
              fontWeight: 400,
              color: 'var(--pl-ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {wish.guestName}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--pl-muted)',
            fontVariant: 'small-caps',
            letterSpacing: '0.06em',
            opacity: 0.7,
          }}
        >
          {formattedDate}
        </span>
      </div>
    </motion.div>
  );
}

function WallOfLight({ wishes, vibeSkin }: { wishes: Wish[]; vibeSkin?: VibeSkin }) {
  const accent = vibeSkin?.palette?.accent ?? '#C4A96A';

  // Assign each wish a stable random position and depth
  // Use wish index as seed so positions don't change on re-render
  const positioned = useMemo(() => wishes.map((wish, i) => {
    // Deterministic "random" from index
    const seed = i * 137.508; // golden angle
    const x = 5 + ((seed * 47.3) % 70); // 5–75% left
    const y = i * 280 + 40; // stack vertically with overlap
    const depth = 0.7 + ((seed * 13.7) % 0.6); // 0.7–1.3 scale
    const rotate = -3 + ((seed * 7.3) % 6); // -3° to +3°
    return { wish, x, y, depth, rotate };
  }), [wishes]);

  const totalHeight = wishes.length * 260 + 200;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: Math.max(totalHeight, 400),
      background: 'radial-gradient(ellipse at 50% 20%, rgba(40,35,30,0.95) 0%, rgba(20,18,15,0.98) 100%)',
      borderRadius: '1.5rem',
      overflow: 'hidden',
      padding: '2rem 0',
    }}>
      {/* Ambient star field */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${(i * 73.13) % 100}%`,
          top: `${(i * 47.17) % 100}%`,
          width: i % 5 === 0 ? '2px' : '1px',
          height: i % 5 === 0 ? '2px' : '1px',
          borderRadius: '50%',
          background: accent,
          opacity: 0.08 + (i % 3) * 0.04,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Floating wish cards */}
      {positioned.map(({ wish, x, y, depth, rotate }, i) => (
        <motion.div
          key={wish.id}
          initial={{ opacity: 0, y: y + 40, scale: depth * 0.8 }}
          whileInView={{ opacity: 1, y, scale: depth }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: depth * 1.05, zIndex: 50 }}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: y,
            width: 'clamp(220px, 30vw, 280px)',
            transform: `rotate(${rotate}deg)`,
            zIndex: Math.round(depth * 10),
          }}
        >
          <div style={{
            background: `rgba(255,255,255,${0.04 + depth * 0.06})`,
            border: `1px solid rgba(255,255,255,${0.06 + depth * 0.04})`,
            borderRadius: '1rem',
            padding: '1.5rem',
            backdropFilter: 'blur(8px)',
            boxShadow: `0 ${Math.round(depth * 20)}px ${Math.round(depth * 40)}px rgba(0,0,0,0.4), 0 0 ${Math.round(depth * 20)}px ${accent}18`,
          }}>
            <p style={{
              fontSize: '0.88rem',
              fontStyle: 'italic',
              color: `rgba(245,241,232,${0.6 + depth * 0.25})`,
              lineHeight: 1.65,
              marginBottom: '0.85rem',
              fontFamily: 'var(--pl-font-body, Georgia, serif)',
            }}>
              &ldquo;{wish.message}&rdquo;
            </p>
            <p style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: accent,
              opacity: 0.7,
              margin: 0,
            }}>
              — {wish.guestName}
            </p>
          </div>
        </motion.div>
      ))}

      {/* Empty state */}
      {wishes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--pl-muted)' }}>
          <p style={{ fontStyle: 'italic', fontSize: '1rem' }}>Be the first to leave a wish...</p>
        </div>
      )}
    </div>
  );
}

export function Guestbook({ siteId, coupleNames, vibeSkin }: GuestbookProps) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [voiceToast, setVoiceToast] = useState(false);

  const charsLeft = MAX_CHARS - message.length;
  const isOverLimit = charsLeft < 0;

  const fetchWishes = useCallback(async () => {
    try {
      const res = await fetch(`/api/guestbook?siteId=${siteId}`);
      const data = await res.json();
      setWishes(data.wishes || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim() || isOverLimit) return;
    setSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, guestName: name, message }),
      });
      if (res.ok) {
        setSubmitStatus('success');
        fetchWishes();
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body?.error || 'Something went wrong. Please try again.');
        setSubmitStatus('error');
      }
    } catch {
      setErrorMessage('Could not send your wish — please check your connection.');
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const highlighted = wishes.find((w) => w.highlighted);
  const rest = wishes.filter((w) => !w.highlighted).slice(0, 20);

  return (
    <section
      id="guestbook"
      style={{ padding: '8rem 2rem', background: 'var(--pl-cream)', position: 'relative' }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          style={{ textAlign: 'center', marginBottom: '5rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                flex: 1,
                maxWidth: '80px',
                height: '1px',
                background: 'var(--pl-olive)',
                opacity: 0.2,
              }}
            />
            <ElegantHeartIcon size={20} color="var(--pl-olive)" style={{ opacity: 0.7 }} />
            <div
              style={{
                flex: 1,
                maxWidth: '80px',
                height: '1px',
                background: 'var(--pl-olive)',
                opacity: 0.2,
              }}
            />
          </div>
          <h2
            style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 400,
              letterSpacing: '-0.025em',
              color: 'var(--pl-ink)',
              marginBottom: '1rem',
            }}
          >
            Leave Your Wishes
          </h2>
          <p
            style={{
              color: 'var(--pl-muted)',
              fontSize: '1.05rem',
              fontStyle: 'italic',
            }}
          >
            A few words of love for {coupleNames[0]} &amp; {coupleNames[1]}.
          </p>
        </motion.div>

        {/* Write a wish form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{
            background: 'var(--pl-cream-deep)',
            borderRadius: '1.25rem',
            border: '1px solid rgba(0,0,0,0.05)',
            padding: '2rem 2.25rem',
            boxShadow: '0 4px 24px rgba(43,43,43,0.04)',
            marginBottom: '4rem',
          }}
        >
          <AnimatePresence mode="wait">
            {submitStatus === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.92, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ textAlign: 'center', padding: '2.5rem 1rem' }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 18,
                    delay: 0.1,
                  }}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, var(--pl-olive-mist), color-mix(in srgb, var(--pl-olive-mist) 50%, #fff))',
                    border: '2px solid color-mix(in srgb, var(--pl-olive) 25%, transparent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                  }}
                >
                  <ElegantHeartIcon size={24} color="var(--pl-olive)" />
                </motion.div>
                <h3
                  style={{
                    fontFamily: 'var(--pl-font-heading)',
                    fontSize: '1.65rem',
                    fontWeight: 400,
                    marginBottom: '0.6rem',
                    color: 'var(--pl-ink)',
                    letterSpacing: '-0.015em',
                  }}
                >
                  Your wish has been added
                </h3>
                <p
                  style={{
                    color: 'var(--pl-muted)',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                  }}
                >
                  Thank you, {name}. {coupleNames[0]} &amp; {coupleNames[1]} will
                  treasure your words.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
              >
                {/* Empty state */}
                {!loading && wishes.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      textAlign: 'center',
                      padding: '1.5rem',
                      border: '2px dashed rgba(163,177,138,0.3)',
                      borderRadius: '0.75rem',
                      background: 'rgba(163,177,138,0.04)',
                    }}
                  >
                    <ElegantHeartIcon
                      size={28}
                      color="var(--pl-olive)"
                      style={{ opacity: 0.4, marginBottom: '0.75rem' }}
                    />
                    <p
                      style={{
                        fontStyle: 'italic',
                        color: 'var(--pl-muted)',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                      }}
                    >
                      Be the first to leave a message.
                    </p>
                  </motion.div>
                )}

                {/* AI prompt pills */}
                <div>
                  <p
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--pl-muted)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: '0.6rem',
                    }}
                  >
                    Need inspiration?
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.45rem',
                    }}
                  >
                    {PROMPT_PILLS.map((pill) => (
                      <button
                        key={pill.label}
                        type="button"
                        onClick={() => setMessage((prev) => prev ? prev : pill.starter)}
                        style={{
                          padding: '0.35rem 0.8rem',
                          borderRadius: '100px',
                          border: '1px solid color-mix(in srgb, var(--pl-olive) 30%, transparent)',
                          background: 'color-mix(in srgb, var(--pl-olive-mist) 50%, transparent)',
                          color: 'var(--pl-olive)',
                          fontSize: '0.78rem',
                          fontFamily: 'var(--pl-font-body)',
                          cursor: 'pointer',
                          transition: 'background 0.2s, border-color 0.2s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            'color-mix(in srgb, var(--pl-olive-mist) 80%, transparent)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            'color-mix(in srgb, var(--pl-olive-mist) 50%, transparent)';
                        }}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice note placeholder */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceToast(true);
                      setTimeout(() => setVoiceToast(false), 2800);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 1rem',
                      borderRadius: '100px',
                      border: '1.5px dashed rgba(0,0,0,0.15)',
                      background: 'transparent',
                      color: 'var(--pl-muted)',
                      fontSize: '0.82rem',
                      fontFamily: 'var(--pl-font-body)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--pl-olive)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--pl-olive)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.15)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)';
                    }}
                  >
                    <Mic size={13} />
                    Leave a voice message
                  </button>
                  <AnimatePresence>
                    {voiceToast && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25 }}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 'calc(100% + 0.5rem)',
                          background: 'var(--pl-ink)',
                          color: 'var(--pl-cream)',
                          fontSize: '0.75rem',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '0.5rem',
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          zIndex: 10,
                        }}
                      >
                        Voice messages coming soon
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Name field — bottom-border style */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--pl-muted)',
                      marginBottom: '0.35rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Your Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="First and last name"
                    style={inputBaseStyle}
                    onFocus={(e) => {
                      e.target.style.borderBottomColor = 'var(--pl-olive)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderBottomColor = 'rgba(0,0,0,0.12)';
                    }}
                  />
                </div>

                {/* Message field */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'var(--pl-muted)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Your Wish
                    </label>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color:
                          isOverLimit
                            ? '#ef4444'
                            : charsLeft <= 40
                            ? '#f59e0b'
                            : 'var(--pl-muted)',
                        transition: 'color 0.2s',
                      }}
                    >
                      {charsLeft} left
                    </span>
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={3}
                    placeholder={`Write your wishes for ${coupleNames[0]} & ${coupleNames[1]}...`}
                    style={{
                      ...inputBaseStyle,
                      resize: 'none' as const,
                      lineHeight: 1.6,
                      borderBottomColor: isOverLimit
                        ? '#ef4444'
                        : 'rgba(0,0,0,0.12)',
                    }}
                    onFocus={(e) => {
                      if (!isOverLimit)
                        e.target.style.borderBottomColor = 'var(--pl-olive)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderBottomColor = isOverLimit
                        ? '#ef4444'
                        : 'rgba(0,0,0,0.12)';
                    }}
                  />
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {submitStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.65rem',
                        background: '#fef2f2',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: '#ef4444',
                        fontSize: '0.82rem',
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      {errorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !message.trim() || isOverLimit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.9rem 2rem',
                    borderRadius: '100px',
                    background:
                      submitting || !name.trim() || !message.trim() || isOverLimit
                        ? 'rgba(0,0,0,0.08)'
                        : 'var(--pl-olive)',
                    color:
                      submitting || !name.trim() || !message.trim() || isOverLimit
                        ? 'var(--pl-muted)'
                        : '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor:
                      submitting || !name.trim() || !message.trim() || isOverLimit
                        ? 'not-allowed'
                        : 'pointer',
                    transition: 'all 0.25s ease',
                    fontFamily: 'var(--pl-font-body)',
                    alignSelf: 'flex-start',
                  }}
                >
                  {submitting ? (
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Send size={15} />
                  )}
                  {submitting ? 'Sending...' : 'Leave My Wish'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Highlighted wish — AI-curated hero card */}
        <AnimatePresence>
          {highlighted && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background:
                  'linear-gradient(135deg, var(--pl-olive-mist), color-mix(in srgb, var(--pl-olive-mist) 60%, #fff))',
                borderRadius: '1.25rem',
                padding: '2.75rem 3rem',
                marginBottom: '3rem',
                position: 'relative',
                border:
                  '1.5px solid color-mix(in srgb, var(--pl-olive) 20%, transparent)',
                boxShadow:
                  '0 12px 50px color-mix(in srgb, var(--pl-olive) 12%, transparent)',
                overflow: 'hidden',
              }}
            >
              {/* Decorative corner label */}
              <div
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.75rem',
                  display: 'flex',
                  gap: '0.35rem',
                  alignItems: 'center',
                }}
              >
                <Sparkles size={13} color="var(--pl-olive)" style={{ opacity: 0.7 }} />
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-olive)',
                    opacity: 0.7,
                  }}
                >
                  Featured Wish
                </span>
              </div>

              {/* Large decorative quote mark */}
              <div
                style={{
                  position: 'absolute',
                  top: '-0.5rem',
                  left: '1.75rem',
                  fontFamily: 'Georgia, serif',
                  fontSize: '8rem',
                  lineHeight: 1,
                  color: 'var(--pl-olive)',
                  opacity: 0.08,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                &ldquo;
              </div>

              <p
                style={{
                  fontFamily: 'var(--pl-font-heading)',
                  fontSize: 'clamp(1.15rem, 2.5vw, 1.6rem)',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  color: 'var(--pl-ink)',
                  lineHeight: 1.7,
                  marginBottom: '1.75rem',
                  position: 'relative',
                  paddingTop: '0.5rem',
                }}
              >
                &ldquo;{highlighted.message}&rdquo;
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--pl-olive)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#F5F1E8',
                    flexShrink: 0,
                  }}
                >
                  {highlighted.guestName.charAt(0).toUpperCase()}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-heading)',
                    fontSize: '1.1rem',
                    fontWeight: 400,
                    letterSpacing: '-0.01em',
                    color: 'var(--pl-ink)',
                  }}
                >
                  {highlighted.guestName}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wall of Light — floating spatial wish display */}
        {!loading && (
          <WallOfLight wishes={rest} vibeSkin={vibeSkin} />
        )}

        {/* Loading state */}
        {loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '3rem',
              color: 'var(--pl-muted)',
            }}
          >
            <Loader2
              size={24}
              style={{ animation: 'spin 1s linear infinite', opacity: 0.5 }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
