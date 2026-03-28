'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/coming-soon.tsx
// High-fidelity Coming Soon + email capture waitlist (#13)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, Mail, Check, ArrowRight, Eye, EyeOff } from 'lucide-react';
import type { ComingSoonConfig } from '@/types';

interface ComingSoonProps {
  config: ComingSoonConfig;
  siteId?: string;
  onUnlock?: () => void;
}

// ── Countdown ─────────────────────────────────────────────────
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

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', minWidth: '64px' }}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            fontWeight: 400,
            color: 'var(--eg-fg)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            display: 'block',
            minWidth: '2ch',
            textAlign: 'center',
          }}
        >
          {String(value).padStart(2, '0')}
        </motion.div>
      </AnimatePresence>
      <span style={{
        fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em',
        textTransform: 'uppercase', color: 'var(--eg-muted)',
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
    // Check password against config
    await new Promise(r => setTimeout(r, 400)); // subtle delay for UX
    if (password === config.password) {
      setPwStatus('idle');
      onUnlock?.();
    } else {
      setPwStatus('error');
      setPassword('');
    }
  };

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      padding: '8rem 2rem',
      background: 'var(--eg-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Layered ambient glows */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px', height: '800px',
          background: 'radial-gradient(circle, var(--eg-accent-light) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        style={{
          position: 'absolute', top: '70%', left: '30%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, var(--eg-accent-light) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Decorative top divider */}
      <div style={{
        position: 'absolute', top: '3.5rem', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.18,
      }}>
        <div style={{ width: '80px', height: '1px', background: 'var(--eg-fg)' }} />
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--eg-accent)', transform: 'rotate(45deg)' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--eg-accent)', transform: 'rotate(45deg)' }} />
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--eg-accent)', transform: 'rotate(45deg)' }} />
        <div style={{ width: '80px', height: '1px', background: 'var(--eg-fg)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true, margin: '-80px' }}
        style={{
          position: 'relative', zIndex: 10,
          textAlign: 'center',
          maxWidth: '640px',
          width: '100%',
        }}
      >
        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            color: 'var(--eg-accent)', marginBottom: '2.5rem',
            display: 'flex', justifyContent: 'center',
          }}
        >
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'var(--eg-accent-light)',
            border: '1.5px solid color-mix(in srgb, var(--eg-accent) 20%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 40px color-mix(in srgb, var(--eg-accent) 18%, transparent)',
          }}>
            {config.passwordProtected ? (
              <Lock size={28} strokeWidth={1.5} />
            ) : (
              <Sparkles size={28} strokeWidth={1.5} />
            )}
          </div>
        </motion.div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
          fontWeight: 400,
          color: 'var(--eg-fg)',
          lineHeight: 1.0,
          marginBottom: '1.5rem',
          letterSpacing: '-0.03em',
        }}>
          {config.title}
        </h2>

        <p style={{
          fontFamily: 'var(--eg-font-body)',
          fontSize: '1.1rem',
          fontWeight: 300,
          color: 'var(--eg-muted)',
          lineHeight: 1.75,
          marginBottom: isCountdownActive ? '3rem' : config.revealDate ? '2rem' : '3.5rem',
          fontStyle: 'italic',
        }}>
          {config.subtitle}
        </p>

        {/* ── Countdown ── */}
        {isCountdownActive && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            style={{ marginBottom: '3.5rem' }}
          >
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
              gap: '1.5rem',
              background: 'color-mix(in srgb, var(--eg-card-bg, #fff) 80%, transparent)',
              backdropFilter: 'blur(16px)',
              borderRadius: '1.5rem',
              padding: '2rem 2.5rem',
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.05)',
            }}>
              <div style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: 'var(--eg-muted)',
              }}>
                Revealing in
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                <CountdownUnit value={countdown.days} label="days" />
                <div style={{ color: 'var(--eg-muted)', fontSize: '2rem', fontFamily: 'var(--eg-font-heading)', opacity: 0.3, paddingTop: '0.1rem' }}>·</div>
                <CountdownUnit value={countdown.hours} label="hours" />
                <div style={{ color: 'var(--eg-muted)', fontSize: '2rem', fontFamily: 'var(--eg-font-heading)', opacity: 0.3, paddingTop: '0.1rem' }}>·</div>
                <CountdownUnit value={countdown.minutes} label="minutes" />
                <div style={{ color: 'var(--eg-muted)', fontSize: '2rem', fontFamily: 'var(--eg-font-heading)', opacity: 0.3, paddingTop: '0.1rem' }}>·</div>
                <CountdownUnit value={countdown.seconds} label="seconds" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Reveal date badge — only when countdown is past */}
        {config.revealDate && !isCountdownActive && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--eg-accent-light)',
            color: 'var(--eg-accent)',
            padding: '0.6rem 1.5rem',
            borderRadius: '100px',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '3.5rem',
            border: '1px solid color-mix(in srgb, var(--eg-accent) 15%, transparent)',
          }}>
            <Sparkles size={12} />
            {new Date(config.revealDate).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </div>
        )}

        {/* ── Password Gate ── */}
        {config.passwordProtected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{
              background: 'var(--eg-card-bg, #fff)',
              borderRadius: '1.5rem',
              padding: '2.5rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.07)',
              border: '1px solid rgba(0,0,0,0.05)',
              marginBottom: siteId ? '1.5rem' : '0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', justifyContent: 'center' }}>
              <Lock size={15} color="var(--eg-accent)" strokeWidth={2} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--eg-muted)' }}>
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
                    borderRadius: '0.875rem',
                    border: `1.5px solid ${pwStatus === 'error' ? '#ef4444' : 'rgba(0,0,0,0.08)'}`,
                    outline: 'none', fontSize: '1rem',
                    fontFamily: 'var(--eg-font-body)',
                    background: pwStatus === 'error' ? '#fef2f2' : 'rgba(0,0,0,0.02)',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, background 0.2s',
                    letterSpacing: showPassword ? '0' : '0.15em',
                  }}
                  onFocus={e => { if (pwStatus !== 'error') e.target.style.borderColor = 'var(--eg-accent)'; }}
                  onBlur={e => { if (pwStatus !== 'error') e.target.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--eg-muted)', padding: 0, display: 'flex', alignItems: 'center',
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
                  padding: '1rem', borderRadius: '0.875rem',
                  background: 'var(--eg-fg)', color: '#fff', border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'opacity 0.2s, transform 0.15s',
                  opacity: (pwStatus === 'checking' || !password.trim()) ? 0.5 : 1,
                  fontFamily: 'var(--eg-font-body)',
                }}
                onMouseOver={e => { if (pwStatus !== 'checking') e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'none'; }}
              >
                {pwStatus === 'checking' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}
                  />
                ) : (
                  <>
                    <Lock size={15} />
                    Unlock Site
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* ── Email Capture Form ── */}
        {siteId && captureStatus !== 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            style={{
              background: 'var(--eg-card-bg, #fff)',
              borderRadius: '1.5rem',
              padding: '2.5rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
              <Mail size={15} color="var(--eg-accent)" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--eg-muted)' }}>
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
                  width: '100%', padding: '1rem 1.25rem', borderRadius: '0.875rem',
                  border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none',
                  fontSize: '0.95rem', fontFamily: 'var(--eg-font-body)',
                  background: 'rgba(0,0,0,0.02)', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.08)'; }}
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    flex: 1, padding: '1rem 1.25rem', borderRadius: '0.875rem',
                    border: '1.5px solid rgba(0,0,0,0.08)', outline: 'none',
                    fontSize: '0.95rem', fontFamily: 'var(--eg-font-body)',
                    background: 'rgba(0,0,0,0.02)', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                />
                <button
                  type="submit"
                  disabled={captureStatus === 'loading'}
                  style={{
                    padding: '1rem 1.5rem', borderRadius: '0.875rem',
                    background: 'var(--eg-accent)', color: '#fff', border: 'none',
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
                      style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
              background: 'var(--eg-card-bg, #fff)', borderRadius: '1.5rem',
              padding: '3rem 2.5rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.05)',
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
                boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
              }}
            >
              <Check size={24} color="#fff" strokeWidth={2.5} />
            </motion.div>
            <p style={{
              fontFamily: 'var(--eg-font-heading)', fontSize: '1.35rem',
              color: 'var(--eg-fg)', fontWeight: 400, letterSpacing: '-0.01em',
            }}>
              You&apos;re on the list!
            </p>
            <p style={{ color: 'var(--eg-muted)', fontSize: '0.9rem', lineHeight: 1.65, maxWidth: '320px' }}>
              We&apos;ll reach out the moment this chapter is ready to be shared.
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Bottom ornamental divider */}
      <div style={{
        position: 'absolute', bottom: '3.5rem', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.14,
      }}>
        <div style={{ width: '40px', height: '1px', background: 'var(--eg-fg)' }} />
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--eg-accent)', transform: 'rotate(45deg)' }} />
        <div style={{ width: '40px', height: '1px', background: 'var(--eg-fg)' }} />
      </div>
    </section>
  );
}
