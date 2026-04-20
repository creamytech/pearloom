'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/coming-soon.tsx
// Save-the-date aesthetic — elegant, restrained, breathtaking
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, Check, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { CalendarHeartIcon } from '@/components/icons/PearloomIcons';
import type { ComingSoonConfig } from '@/types';
import { parseLocalDate } from '@/lib/date';

interface ComingSoonProps {
  config: ComingSoonConfig;
  siteId?: string;
  onUnlock?: () => void;
}

// ── Countdown hook ─────────────────────────────────────────────
function useCountdown(targetDate?: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetDate) return;

    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

function CountdownUnit({ value, label, isTick = false }: { value: number; label: string; isTick?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', minWidth: 'min(72px, 18vw)' }}>
      <div style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(16px)',
        borderRadius: '1rem',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 8px 32px rgba(43,43,43,0.08), 0 1px 4px rgba(43,43,43,0.04)',
        border: '1px solid var(--pl-ink)',
        minWidth: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={value}
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 14, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(2.25rem, 5vw, 3.25rem)',
              fontWeight: 400,
              color: 'var(--pl-ink)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              display: 'block',
              minWidth: '2ch',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
              ...(isTick ? { animation: 'cs-tick 1s steps(1) infinite' } : {}),
            }}
          >
            {String(value).padStart(2, '0')}
          </motion.div>
        </AnimatePresence>
      </div>
      <span style={{
        fontSize: '0.58rem',
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--pl-muted)',
      }}>
        {label}
      </span>
    </div>
  );
}

export function ComingSoon({ config, siteId, onUnlock }: ComingSoonProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Password gate state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwStatus, setPwStatus] = useState<'idle' | 'checking' | 'error'>('idle');

  const countdown = useCountdown(config.revealDate);
  const isCountdownActive = !!config.revealDate && new Date(config.revealDate).getTime() > Date.now();

  if (!config.enabled) return null;

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !siteId) return;
    setCaptureStatus('loading');
    try {
      const res = await fetch('/api/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, siteId }),
      });
      if (!res.ok) throw new Error('Failed');
      setCaptureStatus('success');
    } catch {
      setCaptureStatus('error');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setPwStatus('checking');
    await new Promise(r => setTimeout(r, 400));
    if (password === config.password) {
      setPwStatus('idle');
      // Persist unlock to sessionStorage so PasswordGate doesn't re-show on reload
      if (siteId) {
        try { sessionStorage.setItem(`pg-unlocked-${siteId}`, '1'); } catch {}
      }
      onUnlock?.();
    } else {
      setPwStatus('error');
      setPassword('');
    }
  };

  return (
    <section style={{
      position: 'relative',
      minHeight: '100dvh',
      padding: 'clamp(4rem, 10vw, 8rem) clamp(1rem, 5vw, 2rem)',
      background: 'var(--pl-cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Ambient accent orbs — subtle depth without brand shapes */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.06, 0.09, 0.06] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', bottom: '-40px', right: '-40px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, var(--pl-ink) 0%, transparent 70%)',
          zIndex: 0, pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.04, 0.07, 0.04] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute', top: '-60px', left: '-60px',
          width: '240px', height: '240px', borderRadius: '50%',
          background: 'radial-gradient(circle, var(--pl-olive) 0%, transparent 70%)',
          zIndex: 0, pointerEvents: 'none',
        }}
      />

      {/* Layered ambient glows */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.18, 0.28, 0.18] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px', height: '800px',
          background: 'radial-gradient(circle, var(--pl-olive-mist) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <motion.div
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.08, 0.16, 0.08] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        style={{
          position: 'absolute', top: '70%', left: '30%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, var(--pl-olive-mist) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top ornamental rule */}
      <div style={{
        position: 'absolute', top: '3.5rem', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.2,
        zIndex: 1,
      }}>
        <div style={{ width: '80px', height: '1px', background: 'var(--pl-ink)' }} />
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--pl-olive)', transform: 'rotate(45deg)' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pl-olive)', transform: 'rotate(45deg)' }} />
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--pl-olive)', transform: 'rotate(45deg)' }} />
        <div style={{ width: '80px', height: '1px', background: 'var(--pl-ink)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', zIndex: 10,
          textAlign: 'center',
          maxWidth: '620px',
          width: '100%',
        }}
      >
        {/* Eyebrow label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.75rem', marginBottom: '2.5rem', opacity: 0.65,
          }}
        >
          <div style={{ width: '40px', height: '1px', background: 'var(--pl-olive)' }} />
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.32em',
            textTransform: 'uppercase', color: 'var(--pl-olive)',
          }}>
            Save the Date
          </span>
          <div style={{ width: '40px', height: '1px', background: 'var(--pl-olive)' }} />
        </motion.div>

        {/* Icon */}
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            color: 'var(--pl-olive)', marginBottom: '2.5rem',
            display: 'flex', justifyContent: 'center',
          }}
        >
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'var(--pl-ink)',
            border: '1.5px solid rgba(163,177,138,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 40px rgba(163,177,138,0.2)',
            backdropFilter: 'blur(8px)',
          }}>
            {config.passwordProtected ? (
              <Lock size={30} strokeWidth={1.3} color="var(--pl-olive)" />
            ) : (
              <CalendarHeartIcon size={30} color="var(--pl-olive)" />
            )}
          </div>
        </motion.div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--pl-font-heading)',
          fontSize: 'clamp(2.75rem, 7vw, 5rem)',
          fontWeight: 400,
          fontStyle: 'italic',
          color: 'var(--pl-ink)',
          lineHeight: 1.0,
          marginBottom: '1.5rem',
          letterSpacing: '-0.03em',
        }}>
          {config.title}
        </h1>

        <p style={{
          fontFamily: 'var(--pl-font-body)',
          fontSize: '1.1rem',
          fontWeight: 300,
          color: 'var(--pl-muted)',
          lineHeight: 1.8,
          marginBottom: isCountdownActive ? '3.5rem' : config.revealDate ? '2rem' : '3.5rem',
          fontStyle: 'italic',
          maxWidth: '440px',
          margin: `0 auto ${isCountdownActive ? '3.5rem' : config.revealDate ? '2rem' : '3.5rem'}`,
        }}>
          {config.subtitle}
        </p>

        {/* Countdown — large display units */}
        {isCountdownActive && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.9 }}
            style={{ marginBottom: '3.5rem' }}
          >
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
              gap: '1.75rem',
              background: 'rgba(245,241,232,0.6)',
              backdropFilter: 'blur(20px)',
              borderRadius: '2rem',
              padding: '2.25rem 2.75rem',
              border: '1px solid rgba(214,198,168,0.3)',
              boxShadow: '0 8px 40px rgba(43,43,43,0.05), 0 1px 0 var(--pl-ink) inset',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.55rem', opacity: 0.6,
              }}>
                <CalendarHeartIcon size={12} color="var(--pl-olive)" />
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700,
                  letterSpacing: '0.3em', textTransform: 'uppercase',
                  color: 'var(--pl-muted)',
                }}>
                  Revealing in
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'clamp(0.4rem, 2vw, 1rem)', flexWrap: 'wrap', justifyContent: 'center' }}>
                <CountdownUnit value={countdown.days} label="days" />
                <div style={{ color: 'var(--pl-muted)', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontFamily: 'var(--pl-font-heading)', opacity: 0.25, paddingTop: '0.5rem' }}>·</div>
                <CountdownUnit value={countdown.hours} label="hours" />
                <div style={{ color: 'var(--pl-muted)', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontFamily: 'var(--pl-font-heading)', opacity: 0.25, paddingTop: '0.5rem' }}>·</div>
                <CountdownUnit value={countdown.minutes} label="min" />
                <div style={{ color: 'var(--pl-muted)', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontFamily: 'var(--pl-font-heading)', opacity: 0.25, paddingTop: '0.5rem' }}>·</div>
                <CountdownUnit value={countdown.seconds} label="sec" isTick />
              </div>
            </div>
          </motion.div>
        )}

        {/* Reveal date badge — when countdown is past */}
        {config.revealDate && !isCountdownActive && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--pl-olive-mist)',
            color: 'var(--pl-olive)',
            padding: '0.65rem 1.75rem',
            borderRadius: '100px',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '3.5rem',
            border: '1px solid rgba(163,177,138,0.2)',
          }}>
            <CalendarHeartIcon size={12} color="var(--pl-olive)" />
            {parseLocalDate(config.revealDate).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </div>
        )}

        {/* Password Gate */}
        {config.passwordProtected && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.9 }}
            style={{
              background: 'var(--pl-ink)',
              backdropFilter: 'blur(20px)',
              borderRadius: '1.75rem',
              padding: '2.5rem',
              boxShadow: '0 20px 60px rgba(43,43,43,0.07), 0 1px 0 var(--pl-ink) inset',
              border: '1px solid rgba(214,198,168,0.25)',
              marginBottom: siteId ? '1.5rem' : '0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', justifyContent: 'center' }}>
              <Lock size={14} color="var(--pl-olive)" strokeWidth={1.8} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>
                Enter password to view
              </span>
            </div>
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPwStatus('idle'); }}
                  required
                  style={{
                    width: '100%', padding: '1rem 3rem 1rem 1.25rem',
                    borderRadius: '1rem',
                    border: `1.5px solid ${pwStatus === 'error' ? '#ef4444' : 'rgba(163,177,138,0.25)'}`,
                    outline: 'none', fontSize: '1rem',
                    fontFamily: 'var(--pl-font-body)',
                    background: pwStatus === 'error' ? '#fef2f2' : 'var(--pl-ink-soft)',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, background 0.2s',
                    letterSpacing: showPassword ? '0' : '0.15em',
                  }}
                  onFocus={e => { if (pwStatus !== 'error') e.target.style.borderColor = 'var(--pl-olive)'; }}
                  onBlur={e => { if (pwStatus !== 'error') e.target.style.borderColor = 'rgba(163,177,138,0.25)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--pl-muted)', padding: 0, display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <AnimatePresence>
                {pwStatus === 'error' && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}
                  >
                    Incorrect password — please try again.
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={pwStatus === 'checking' || !password.trim()}
                style={{
                  padding: '1rem', borderRadius: '1rem',
                  background: 'var(--pl-ink)', color: '#fff', border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'opacity 0.2s, transform 0.15s',
                  opacity: (pwStatus === 'checking' || !password.trim()) ? 0.5 : 1,
                  fontFamily: 'var(--pl-font-body)',
                }}
                onMouseOver={e => { if (pwStatus !== 'checking') e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'none'; }}
              >
                {pwStatus === 'checking' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '16px', height: '16px', border: '2px solid var(--pl-muted)', borderTopColor: '#fff', borderRadius: '50%' }}
                  />
                ) : (
                  <>
                    <Lock size={14} />
                    Unlock Site
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* Email Capture Form — styled UI (save the date aesthetic) */}
        {siteId && captureStatus !== 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.9 }}
            style={{
              background: 'var(--pl-ink)',
              backdropFilter: 'blur(20px)',
              borderRadius: '1.75rem',
              padding: '2.5rem',
              boxShadow: '0 20px 60px rgba(43,43,43,0.06), 0 1px 0 var(--pl-ink) inset',
              border: '1px solid rgba(214,198,168,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
              <Mail size={14} color="var(--pl-olive)" strokeWidth={1.8} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>
                Be the first to know
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--pl-muted)', textAlign: 'center', marginBottom: '1.75rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.6 }}>
              Leave your email and we will notify you the moment this site goes live.
            </p>
            <form onSubmit={handleCapture} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%', padding: '1rem 1.25rem', borderRadius: '1rem',
                  border: '1.5px solid rgba(163,177,138,0.22)', outline: 'none',
                  fontSize: '1rem', fontFamily: 'var(--pl-font-body)',
                  background: 'var(--pl-ink-soft)', boxSizing: 'border-box',
                  transition: 'border-color var(--pl-dur-fast)',
                  color: 'var(--pl-ink)',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--pl-olive)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(163,177,138,0.22)'; }}
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    flex: 1, padding: '1rem 1.25rem', borderRadius: '1rem',
                    border: '1.5px solid rgba(163,177,138,0.22)', outline: 'none',
                    fontSize: '1rem', fontFamily: 'var(--pl-font-body)',
                    background: 'var(--pl-ink-soft)', transition: 'border-color var(--pl-dur-fast)',
                    color: 'var(--pl-ink)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--pl-olive)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(163,177,138,0.22)'; }}
                />
                <button
                  type="submit"
                  disabled={captureStatus === 'loading'}
                  style={{
                    padding: '1rem 1.5rem', borderRadius: '1rem',
                    background: 'var(--pl-ink)', color: '#fff', border: 'none',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    flexShrink: 0, transition: 'opacity 0.2s, transform 0.15s',
                    opacity: captureStatus === 'loading' ? 0.6 : 1,
                  }}
                  onMouseOver={e => { if (captureStatus !== 'loading') e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'none'; }}
                >
                  {captureStatus === 'loading' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      style={{ width: '16px', height: '16px', border: '2px solid var(--pl-muted)', borderTopColor: '#fff', borderRadius: '50%' }}
                    />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>
              </div>
              {captureStatus === 'error' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}
                >
                  Something went wrong — please try again.
                </motion.p>
              )}
            </form>
          </motion.div>
        )}

        {/* Success state */}
        {siteId && captureStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
              background: 'var(--pl-ink)',
              backdropFilter: 'blur(20px)',
              borderRadius: '1.75rem',
              padding: '3rem 2.5rem',
              boxShadow: '0 20px 60px rgba(43,43,43,0.06)',
              border: '1px solid rgba(214,198,168,0.25)',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
              style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #34d399)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(16,185,129,0.28)',
              }}
            >
              <Check size={24} color="#fff" strokeWidth={2.5} />
            </motion.div>
            <p style={{
              fontFamily: 'var(--pl-font-heading)', fontSize: '1.35rem',
              color: 'var(--pl-ink)', fontWeight: 400, letterSpacing: '-0.01em',
            }}>
              You&apos;re on the list!
            </p>
            <p style={{ color: 'var(--pl-muted)', fontSize: '0.9rem', lineHeight: 1.65, maxWidth: '320px', textAlign: 'center' }}>
              We&apos;ll reach out the moment this chapter is ready to be shared.
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Bottom ornamental divider */}
      <div style={{
        position: 'absolute', bottom: '3.5rem', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.15,
        zIndex: 1,
      }}>
        <div style={{ width: '40px', height: '1px', background: 'var(--pl-ink)' }} />
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--pl-olive)', transform: 'rotate(45deg)' }} />
        <div style={{ width: '40px', height: '1px', background: 'var(--pl-ink)' }} />
      </div>

      {/* Tick animation for seconds */}
      <style>{`
        @keyframes cs-tick {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.55; }
        }
      `}</style>
    </section>
  );
}
