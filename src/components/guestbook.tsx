'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/guestbook.tsx
// Public guestbook — guests leave wishes visible on the site.
// Innovative: AI curates a "highlight" wish to feature prominently.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Send, Loader2, Sparkles } from 'lucide-react';
import type { VibeSkin } from '@/lib/vibe-engine';

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
  const [submitted, setSubmitted] = useState(false);

  const accentIcon = vibeSkin?.decorIcons[0] || '♡';

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
    if (!name.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, guestName: name, message }),
      });
      if (res.ok) {
        setSubmitted(true);
        fetchWishes();
      }
    } finally { setSubmitting(false); }
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
                background: 'var(--eg-accent-light)', borderRadius: '1.5rem',
                padding: '2.5rem 3rem', marginBottom: '3rem', position: 'relative',
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.05)',
              }}
            >
              <Sparkles size={16} color="var(--eg-accent)" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', opacity: 0.6 }} />
              <p style={{
                fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                fontWeight: 400, fontStyle: 'italic', color: 'var(--eg-fg)', lineHeight: 1.65,
                marginBottom: '1.5rem',
              }}>
                &ldquo;{highlighted.message}&rdquo;
              </p>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--eg-accent)', textTransform: 'uppercase' }}>
                — {highlighted.guestName}
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
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '2rem 0' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{accentIcon}</div>
              <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
                Thank you, {name}!
              </h3>
              <p style={{ color: 'var(--eg-muted)', fontSize: '0.9rem' }}>
                Your wish has been added to the guestbook.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--eg-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Your Name</label>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  required placeholder="First and last name" style={inputSt}
                  onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--eg-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Your Wish</label>
                <textarea
                  value={message} onChange={e => setMessage(e.target.value)}
                  required rows={3} placeholder={`Write your wishes for ${coupleNames[0]} & ${coupleNames[1]}...`}
                  style={{ ...inputSt, resize: 'none', lineHeight: 1.6 }}
                  onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                />
              </div>
              <button
                type="submit" disabled={submitting || !name.trim() || !message.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.9rem 2rem', borderRadius: '0.75rem',
                  background: 'var(--eg-fg)', color: '#fff', border: 'none',
                  fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                  opacity: (!name.trim() || !message.trim() || submitting) ? 0.4 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Heart size={15} />}
                {submitting ? 'Sending…' : 'Leave My Wish'}
              </button>
            </form>
          )}
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
                }}
              >
                <p style={{ fontSize: '0.95rem', color: 'var(--eg-fg)', lineHeight: 1.65, fontStyle: 'italic', marginBottom: '0.75rem' }}>
                  &ldquo;{wish.message}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--eg-accent)', letterSpacing: '0.06em' }}>
                    — {wish.guestName}
                  </span>
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
