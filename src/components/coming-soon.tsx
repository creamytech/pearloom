'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/coming-soon.tsx
// High-fidelity Coming Soon + email capture waitlist (#13)
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, Mail, Check, ArrowRight } from 'lucide-react';
import type { ComingSoonConfig } from '@/types';

interface ComingSoonProps {
  config: ComingSoonConfig;
  siteId?: string;
}

export function ComingSoon({ config, siteId }: ComingSoonProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  if (!config.enabled) return null;

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !siteId) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, siteId }),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section style={{
      position: 'relative',
      padding: '10rem 2rem',
      background: 'var(--eg-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Large ambient glow */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px', height: '700px',
          background: 'radial-gradient(circle, var(--eg-accent-light) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top ornamental divider */}
      <div style={{ position: 'absolute', top: '4rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.2 }}>
        <div style={{ width: '60px', height: '1px', background: 'var(--eg-fg)' }} />
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--eg-accent)' }} />
        <div style={{ width: '60px', height: '1px', background: 'var(--eg-fg)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true, margin: '-80px' }}
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          maxWidth: '620px',
        }}
      >
        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          style={{ color: 'var(--eg-accent)', marginBottom: '2.5rem', display: 'flex', justifyContent: 'center' }}
        >
          {config.passwordProtected ? (
            <Lock size={36} strokeWidth={1.5} />
          ) : (
            <Sparkles size={36} strokeWidth={1.5} />
          )}
        </motion.div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: 400,
          color: 'var(--eg-fg)',
          lineHeight: 1.0,
          marginBottom: '1.5rem',
          letterSpacing: '-0.025em',
        }}>
          {config.title}
        </h2>

        <p style={{
          fontFamily: 'var(--eg-font-body)',
          fontSize: '1.15rem',
          fontWeight: 300,
          color: 'var(--eg-muted)',
          lineHeight: 1.7,
          marginBottom: config.revealDate ? '2rem' : '3.5rem',
          fontStyle: 'italic',
        }}>
          {config.subtitle}
        </p>

        {/* Reveal date badge */}
        {config.revealDate && (
          <div style={{
            display: 'inline-flex',
            background: 'var(--eg-accent-light)',
            color: 'var(--eg-accent)',
            padding: '0.6rem 1.5rem',
            borderRadius: '100px',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '3.5rem',
          }}>
            {new Date(config.revealDate).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </div>
        )}

        {/* ── Email Capture Form ── */}
        {siteId && status !== 'success' && (
          <div style={{
            background: 'var(--eg-card-bg)',
            borderRadius: 'var(--eg-radius)',
            padding: '2.5rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
              <Mail size={16} color="var(--eg-accent)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--eg-muted)' }}>
                Be the first to know
              </span>
            </div>
            <form onSubmit={handleCapture} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%', padding: '0.9rem 1.25rem', borderRadius: '0.75rem',
                  border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none',
                  fontSize: '0.95rem', fontFamily: 'var(--eg-font-body)',
                  background: 'rgba(0,0,0,0.02)', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    flex: 1, padding: '0.9rem 1.25rem', borderRadius: '0.75rem',
                    border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none',
                    fontSize: '0.95rem', fontFamily: 'var(--eg-font-body)',
                    background: 'rgba(0,0,0,0.02)',
                  }}
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  style={{
                    padding: '0.9rem 1.5rem', borderRadius: '0.75rem',
                    background: 'var(--eg-accent)', color: '#fff', border: 'none',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    flexShrink: 0, transition: 'opacity 0.2s',
                    opacity: status === 'loading' ? 0.7 : 1,
                  }}
                >
                  {status === 'loading' ? '...' : <><ArrowRight size={16} /></>}
                </button>
              </div>
              {status === 'error' && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>Something went wrong. Try again.</p>
              )}
            </form>
          </div>
        )}

        {/* Success state */}
        {siteId && status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
              background: 'var(--eg-card-bg)', borderRadius: 'var(--eg-radius)',
              padding: '2.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={24} color="#fff" strokeWidth={2.5} />
            </div>
            <p style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.25rem', color: 'var(--eg-fg)' }}>
              We&apos;ll let you know!
            </p>
            <p style={{ color: 'var(--eg-muted)', fontSize: '0.9rem' }}>
              You&apos;re on the list. We&apos;ll reach out the moment this chapter is ready.
            </p>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
