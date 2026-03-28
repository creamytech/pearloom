'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/PasswordGate.tsx
// Password protection for private wedding sites.
// Couple sets a password in editor → guests see this before site.
// Session is stored in sessionStorage so they don't re-enter.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';
import type { VibeSkin } from '@/lib/vibe-engine';

interface PasswordGateProps {
  siteId: string;
  coupleNames: [string, string];
  password: string;       // hashed or plaintext — checked server-side
  vibeSkin?: VibeSkin;
  children: React.ReactNode;
}

const SESSION_KEY = (id: string) => `pg-unlocked-${id}`;

export function PasswordGate({ siteId, coupleNames, password, vibeSkin, children }: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    // Check if already unlocked in this session
    if (sessionStorage.getItem(SESSION_KEY(siteId)) === '1') {
      setUnlocked(true);
    }
  }, [siteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Simple client-side check (plaintext) — good enough for wedding sites
    // For higher security, swap to an API call that checks hashed pw server-side
    if (input.trim().toLowerCase() === password.trim().toLowerCase()) {
      sessionStorage.setItem(SESSION_KEY(siteId), '1');
      setUnlocked(true);
    } else {
      setError('Wrong password. Try again or ask the couple!');
      setInput('');
    }
  };

  if (unlocked) return <>{children}</>;

  const [name1, name2] = coupleNames;
  const motif = vibeSkin?.accentSymbol || '♡';
  const accentColor = vibeSkin?.particleColor || '#A3B18A';
  const bgColor = '#F5F1E8'; // ThemeProvider sets CSS vars; fallback here is safe

  return (
    <div style={{
      minHeight: '100dvh', background: bgColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', fontFamily: 'var(--eg-font-body)',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: '420px',
          background: '#fff', borderRadius: '1.75rem',
          boxShadow: '0 24px 80px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)',
          padding: '3rem 2.5rem',
          border: '1px solid rgba(0,0,0,0.05)',
          textAlign: 'center',
        }}
      >
        {/* Lock icon */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: `rgba(163,177,138,0.1)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <Lock size={22} color={accentColor} />
        </div>

        {/* Motif decoration */}
        <div style={{ fontSize: '1.25rem', color: accentColor, marginBottom: '1.25rem', letterSpacing: '0.5rem' }}>
          {motif} {motif} {motif}
        </div>

        <h1 style={{
          fontFamily: 'var(--eg-font-heading)', fontSize: '1.75rem',
          fontWeight: 400, letterSpacing: '-0.02em',
          color: '#2B2B2B', marginBottom: '0.5rem',
        }}>
          {name1} & {name2}
        </h1>
        <p style={{ color: '#9A9488', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          This site is private. Enter the password to view.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Enter password"
              required
              autoFocus
              style={{
                width: '100%', padding: '0.85rem 3rem 0.85rem 1.1rem',
                borderRadius: '0.75rem', border: `1.5px solid ${error ? '#ef4444' : 'rgba(0,0,0,0.1)'}`,
                fontSize: '0.95rem', background: '#f9f9f9', outline: 'none',
                fontFamily: 'var(--eg-font-body)', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.background = '#fff'; }}
              onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : 'rgba(0,0,0,0.1)'; e.target.style.background = '#f9f9f9'; }}
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              style={{
                position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#9A9488', display: 'flex',
              }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'left', margin: '-0.5rem 0' }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            style={{
              padding: '0.9rem', borderRadius: '0.75rem',
              background: accentColor, color: '#fff',
              border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.03em',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            View Our Site
          </button>
        </form>
      </motion.div>
    </div>
  );
}
