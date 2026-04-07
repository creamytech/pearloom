'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/auth/AuthModal.tsx
// Sign in / Sign up modal — Google OAuth + Email/Password
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Loader2, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      redirect: false,
      email: email.trim(),
      password,
      name: name.trim(),
      action: mode,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else if (result?.ok) {
      onClose();
      window.location.href = '/dashboard';
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[420px] overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(40px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.4)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 24px 80px rgba(43,30,20,0.15), 0 8px 24px rgba(43,30,20,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
          } as React.CSSProperties}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer z-10 text-[var(--pl-muted)] hover:text-[var(--pl-ink)] transition-colors"
            style={{ background: 'rgba(0,0,0,0.04)' }}
          >
            <X size={14} />
          </button>

          <div className="px-7 pt-7 pb-4">
            <span className="font-heading italic text-[1.1rem] text-[var(--pl-ink-soft)]">Pearloom</span>
            <h2 className="font-heading text-[1.5rem] text-[var(--pl-ink)] mt-2 leading-tight" style={{ fontWeight: 400 }}>
              {mode === 'register' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-[0.82rem] text-[var(--pl-muted)] mt-1">
              {mode === 'register'
                ? 'Start building your celebration site in minutes.'
                : 'Sign in to continue crafting your story.'}
            </p>
          </div>

          <div className="px-7 pb-7">
            {/* Google */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border cursor-pointer text-[0.88rem] font-semibold transition-all hover:shadow-md"
              style={{ background: 'white', borderColor: 'rgba(0,0,0,0.08)', color: 'var(--pl-ink)' }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48"><path d="M44 24.3c0-1.6-.1-3.1-.4-4.6H24v8.7h11.3c-.5 2.6-2 4.8-4.2 6.3v5.2h6.8c4-3.7 6.1-9.1 6.1-15.6z" fill="#4285F4"/><path d="M24 48c5.7 0 10.5-1.9 14-5.1l-6.8-5.2c-1.9 1.3-4.3 2-7.1 2-5.5 0-10.1-3.7-11.8-8.6H5.2v5.4C8.7 42.8 15.8 48 24 48z" fill="#34A853"/><path d="M12.2 31.1c-.4-1.3-.7-2.6-.7-4s.3-2.8.7-4V17.7H5.2C3.8 20.5 3 23.6 3 27s.8 6.5 2.2 9.3l7-5.2z" fill="#FBBC05"/><path d="M24 10.5c3.1 0 5.9 1.1 8.1 3.1l6.1-6.1C34.5 4 29.7 1.5 24 1.5 15.8 1.5 8.7 6.7 5.2 13.2l7 5.4c1.7-5 6.3-8.1 11.8-8.1z" fill="#EA4335"/></svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.06)' }} />
              <span className="text-[0.72rem] text-[var(--pl-muted)]">or use email</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.06)' }} />
            </div>

            {/* Name (register only) */}
            {mode === 'register' && (
              <div className="mb-3">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl text-[max(16px,0.88rem)] text-[var(--pl-ink)] outline-none transition-colors"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--pl-olive)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)')}
                />
              </div>
            )}

            <div className="mb-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-4 py-3 rounded-xl text-[max(16px,0.88rem)] text-[var(--pl-ink)] outline-none transition-colors"
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--pl-olive)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)')}
              />
            </div>

            <div className="mb-4 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Password (6+ characters)' : 'Password'}
                onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                className="w-full px-4 py-3 pr-10 rounded-xl text-[max(16px,0.88rem)] text-[var(--pl-ink)] outline-none transition-colors"
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--pl-olive)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[var(--pl-muted)] p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg text-[0.78rem] text-red-700" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.12)' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleEmailAuth}
              disabled={loading}
              className="w-full py-3 rounded-xl border-none cursor-pointer text-[0.88rem] font-bold text-white transition-all flex items-center justify-center gap-2"
              style={{
                background: 'var(--pl-olive)',
                boxShadow: '0 4px 16px rgba(163,177,138,0.3)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {mode === 'register' ? 'Create Account' : 'Sign In'}
            </button>

            <p className="text-center text-[0.78rem] text-[var(--pl-muted)] mt-5">
              {mode === 'register' ? (
                <>Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError(''); }} className="bg-transparent border-none cursor-pointer text-[var(--pl-olive)] font-semibold underline">
                    Sign in
                  </button>
                </>
              ) : (
                <>Don&apos;t have an account?{' '}
                  <button onClick={() => { setMode('register'); setError(''); }} className="bg-transparent border-none cursor-pointer text-[var(--pl-olive)] font-semibold underline">
                    Create one
                  </button>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
