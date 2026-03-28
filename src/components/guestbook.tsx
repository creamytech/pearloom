'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/guestbook.tsx
// Public guestbook — guests leave wishes visible on the site.
// Innovative: AI curates a "highlight" wish to feature prominently.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import type { VibeSkin } from '@/lib/vibe-engine';

const MAX_CHARS = 300;

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

export function Guestbook({ siteId, coupleNames, vibeSkin }: GuestbookProps) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const accentIcon = vibeSkin?.decorIcons[0] || '♡';
  const charsLeft = MAX_CHARS - message.length;
  const isOverLimit = charsLeft < 0;

  const fetchWishes = useCallback(async () => {
    try {
      const res = await fetch(`/api/guestbook?siteId=${siteId}`);
      const data = await res.json();
      setWishes(data.wishes || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [siteId]);

  useEffect(() => { fetchWishes(); }, [fetchWishes]);

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

  const highlighted = wishes.find(w => w.highlighted);
  const rest = wishes.filter(w => !w.highlighted).slice(0, 20);

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '0.85rem 1rem',
    borderRadius: '0.75rem', border: '1.5px solid rgba(0,0,0,0.08)',
    background: '#fff', fontSize: '0.9rem', outline: 'none',
    fontFamily: 'var(--eg-font-body)', color: 'var(--eg-fg)',
    transition: 'border-color 0.2s', boxSizing: 'border-box',
  };

  return (
    <section
      id="guestbook"
      style={{ padding: '8rem 2rem', background: 'var(--eg-bg)', position: 'relative' }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.9 }}
          style={{ textAlign: 'center', marginBottom: '5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
            <span style={{ fontSize: '1.5rem', color: 'var(--eg-accent)' }}>{accentIcon}</span>
            <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--eg-fg)', marginBottom: '1rem',
          }}>
            Leave Your Wishes
          </h2>
          <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', fontStyle: 'italic' }}>
            A few words of love for {coupleNames[0]} & {coupleNames[1]}.
          </p>
        </motion.div>

        {/* Highlighted wish — AI-curated hero card */}
        <AnimatePresence>
          {highlighted && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'linear-gradient(135deg, var(--eg-accent-light), color-mix(in srgb, var(--eg-accent-light) 60%, #fff))',
                borderRadius: '1.75rem',
                padding: '2.75rem 3rem',
                marginBottom: '3rem',
                position: 'relative',
                border: '1.5px solid color-mix(in srgb, var(--eg-accent) 20%, transparent)',
                boxShadow: '0 12px 50px color-mix(in srgb, var(--eg-accent) 12%, transparent)',
                overflow: 'hidden',
              }}
            >
              {/* Decorative corner sparkle */}
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.75rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <Sparkles size={13} color="var(--eg-accent)" style={{ opacity: 0.7 }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-accent)', opacity: 0.7 }}>
                  Featured Wish
                </span>
              </div>

              {/* Large decorative quote mark */}
              <div style={{
                position: 'absolute', top: '-0.5rem', left: '1.75rem',
                fontFamily: 'Georgia, serif', fontSize: '8rem', lineHeight: 1,
                color: 'var(--eg-accent)', opacity: 0.08, pointerEvents: 'none',
                userSelect: 'none',
              }}>
                &ldquo;
              </div>

              <p style={{
                fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(1.15rem, 2.5vw, 1.6rem)',
                fontWeight: 400, fontStyle: 'italic', color: 'var(--eg-fg)', lineHeight: 1.7,
                marginBottom: '1.75rem', position: 'relative', paddingTop: '0.5rem',
              }}>
                &ldquo;{highlighted.message}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'var(--eg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {highlighted.guestName.charAt(0).toUpperCase()}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--eg-accent)', textTransform: 'uppercase' }}>
                  {highlighted.guestName}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Write a wish form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.8 }}
          style={{
            background: '#fff', borderRadius: '1.25rem',
            border: '1px solid rgba(0,0,0,0.06)', padding: '2rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: '3rem',
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
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                  style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--eg-accent-light), color-mix(in srgb, var(--eg-accent-light) 50%, #fff))',
                    border: '2px solid color-mix(in srgb, var(--eg-accent) 25%, transparent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    fontSize: '1.75rem',
                  }}
                >
                  {accentIcon}
                </motion.div>
                <h3 style={{
                  fontFamily: 'var(--eg-font-heading)', fontSize: '1.65rem',
                  fontWeight: 400, marginBottom: '0.6rem', color: 'var(--eg-fg)',
                  letterSpacing: '-0.015em',
                }}>
                  Your wish has been added! ✦
                </h3>
                <p style={{ color: 'var(--eg-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Thank you, {name}. {coupleNames[0]} & {coupleNames[1]} will treasure your words.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                {/* Empty state prompt when no wishes yet */}
                {!loading && wishes.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      textAlign: 'center', padding: '0.5rem 0 1rem',
                      borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: '0.25rem',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{accentIcon}</div>
                    <p style={{ fontStyle: 'italic', color: 'var(--eg-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                      Be the first to leave a wish for {coupleNames[0]} & {coupleNames[1]}
                    </p>
                  </motion.div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--eg-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                    YOUR NAME
                  </label>
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    required placeholder="First and last name" style={inputSt}
                    onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--eg-muted)', letterSpacing: '0.05em' }}>
                      YOUR WISH
                    </label>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600,
                      color: isOverLimit ? '#ef4444' : charsLeft <= 40 ? '#f59e0b' : 'var(--eg-muted)',
                      transition: 'color 0.2s',
                    }}>
                      {charsLeft} left
                    </span>
                  </div>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required rows={3}
                    placeholder={`Write your wishes for ${coupleNames[0]} & ${coupleNames[1]}...`}
                    style={{
                      ...inputSt, resize: 'none', lineHeight: 1.6,
                      borderColor: isOverLimit ? '#ef4444' : 'rgba(0,0,0,0.08)',
                    }}
                    onFocus={e => { if (!isOverLimit) e.target.style.borderColor = 'var(--eg-accent)'; }}
                    onBlur={e => { e.target.style.borderColor = isOverLimit ? '#ef4444' : 'rgba(0,0,0,0.08)'; }}
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
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.75rem 1rem', borderRadius: '0.65rem',
                        background: '#fef2f2', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#ef4444', fontSize: '0.82rem',
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      {errorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !message.trim() || isOverLimit}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.9rem 2rem', borderRadius: '0.75rem',
                    background: 'var(--eg-fg)', color: '#fff', border: 'none',
                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                    opacity: (!name.trim() || !message.trim() || submitting || isOverLimit) ? 0.4 : 1,
                    transition: 'all 0.2s',
                    fontFamily: 'var(--eg-font-body)',
                  }}
                >
                  {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Heart size={15} />}
                  {submitting ? 'Sending…' : 'Leave My Wish'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* All wishes feed */}
        {!loading && rest.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rest.map((wish, i) => (
              <motion.div
                key={wish.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.04 }}
                style={{
                  background: '#fff', borderRadius: '1rem', padding: '1.5rem 1.75rem',
                  border: '1px solid rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.25s, border-color 0.25s',
                }}
                whileHover={{
                  boxShadow: '0 8px 32px rgba(0,0,0,0.07)',
                }}
              >
                <p style={{ fontSize: '0.95rem', color: 'var(--eg-fg)', lineHeight: 1.65, fontStyle: 'italic', marginBottom: '0.75rem' }}>
                  &ldquo;{wish.message}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: 'var(--eg-accent-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 700, color: 'var(--eg-accent)',
                    }}>
                      {wish.guestName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--eg-accent)', letterSpacing: '0.06em' }}>
                      — {wish.guestName}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--eg-muted)' }}>
                    {new Date(wish.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
