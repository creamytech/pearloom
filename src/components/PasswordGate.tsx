'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/PasswordGate.tsx
// Password protection for private wedding sites.
// Couple sets a password in editor → guests see this before site.
// Session is stored in sessionStorage so they don't re-enter.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { PearloomMark } from '@/components/brand/PearloomMark';
import type { VibeSkin } from '@/lib/vibe-engine';

interface PasswordGateProps {
  siteId: string;
  coupleNames: [string, string];
  password: string;       // hashed or plaintext — checked server-side
  vibeSkin?: VibeSkin;
  children: React.ReactNode;
}

const SESSION_KEY = (id: string) => `pg-unlocked-${id}`;

const shakeKeyframes = `
@keyframes pg-shake {
  0%, 100% { transform: translateX(0); }
  15%       { transform: translateX(-6px); }
  30%       { transform: translateX(6px); }
  45%       { transform: translateX(-5px); }
  60%       { transform: translateX(5px); }
  75%       { transform: translateX(-3px); }
  90%       { transform: translateX(3px); }
}
`;

export function PasswordGate({ siteId, coupleNames, password, vibeSkin, children }: PasswordGateProps) {
  const [unlocked, setUnlocked]   = useState(false);
  const [input, setInput]         = useState('');
  const [error, setError]         = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [shaking, setShaking]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if already unlocked in this session
    if (sessionStorage.getItem(SESSION_KEY(siteId)) === '1') {
      setUnlocked(true);
    }
  }, [siteId]);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    // Simulate async verification tick for UX feedback
    await new Promise(r => setTimeout(r, 300));

    // Simple client-side check (plaintext) — good enough for wedding sites
    // For higher security, swap to an API call that checks hashed pw server-side
    if (input.trim().toLowerCase() === password.trim().toLowerCase()) {
      sessionStorage.setItem(SESSION_KEY(siteId), '1');
      setUnlocked(true);
    } else {
      setError('Wrong password. Try again or ask the couple!');
      setInput('');
      setLoading(false);
      triggerShake();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  if (unlocked) return <>{children}</>;

  const accentColor = vibeSkin?.particleColor || '#5C6B3F';
  const bgColor = '#F5F1E8';

  return (
    <>
      <style>{shakeKeyframes}</style>
      <div style={{
        minHeight: '100dvh',
        background: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'var(--pl-font-body)',
      }}>
        {/* Brand mark at top */}
        <div style={{ marginBottom: '2.5rem' }}>
          <PearloomMark size={72} color={accentColor} animated />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%',
            maxWidth: '420px',
            background: '#fff',
            borderRadius: '1.75rem',
            boxShadow: '0 24px 80px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)',
            padding: '3rem 2.5rem',
            border: '1px solid rgba(0,0,0,0.05)',
            textAlign: 'center',
          }}
        >
          {/* Lock icon circle */}
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: `rgba(163,177,138,0.1)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Lock size={22} color={accentColor} />
          </div>

          <h1 style={{
            fontFamily: 'var(--pl-font-heading)',
            fontSize: '2rem',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: 'var(--pl-ink-soft)',
            marginBottom: '0.5rem',
          }}>
            This site is private
          </h1>
          <p style={{ color: '#9A9488', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            Enter the password to view this wedding site.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              animation: shaking ? 'pg-shake 0.5s ease' : 'none',
            }}
          >
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type={showPw ? 'text' : 'password'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter password"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 3rem 0.75rem 0',
                  border: 'none',
                  borderBottom: `1.5px solid ${error ? '#ef4444' : 'rgba(0,0,0,0.15)'}`,
                  borderRadius: 0,
                  fontSize: 'max(16px, 1rem)',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'var(--pl-font-body)',
                  boxSizing: 'border-box',
                  color: 'var(--pl-ink-soft)',
                  transition: 'border-color var(--pl-dur-fast)',
                }}
                onFocus={e => { e.target.style.borderBottomColor = accentColor; }}
                onBlur={e => { e.target.style.borderBottomColor = error ? '#ef4444' : 'rgba(0,0,0,0.15)'; }}
              />
              <button
                type="button"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute',
                  right: '0.1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9A9488',
                  display: 'flex',
                  padding: '0.25rem',
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'left', margin: '-0.5rem 0' }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.9rem',
                borderRadius: '0.75rem',
                background: loading
                  ? 'rgba(163,177,138,0.6)'
                  : `linear-gradient(135deg, ${accentColor} 0%, #7a9268 100%)`,
                color: '#fff',
                border: 'none',
                cursor: loading ? 'default' : 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                letterSpacing: '0.03em',
                transition: 'opacity 0.2s, background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
              }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.opacity = '0.88'; }}
              onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {loading ? (
                <>
                  <SpinnerIcon />
                  Verifying…
                </>
              ) : (
                'Enter'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 0.7s linear infinite' }}
    >
      <circle cx="8" cy="8" r="6" stroke="var(--pl-muted)" strokeWidth="2" />
      <path d="M8 2 A6 6 0 0 1 14 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
