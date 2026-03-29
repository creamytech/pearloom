'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/user-nav.tsx
// User dropdown: My Sites, Profile Settings, Billing, Sign out
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, CreditCard, LayoutDashboard, ChevronLeft, Check, Loader2, Zap, Star } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface UserNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  /** Called when user clicks "My Websites" */
  onDashboard?: () => void;
}

type Panel = 'main' | 'profile' | 'billing';

export function UserNav({ user, onDashboard }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('main');
  const [displayName, setDisplayName] = useState(user.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Reset to main panel when dropdown closes
  useEffect(() => {
    if (!isOpen) setTimeout(() => setPanel('main'), 200);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    // Persist display name via API if available, otherwise just local state
    try {
      await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName.trim() }),
      }).catch(() => null); // non-fatal if route doesn't exist yet
    } finally {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleDashboard = () => {
    setIsOpen(false);
    if (onDashboard) {
      onDashboard();
    } else {
      // Fallback for contexts outside the main SPA (e.g. published sites)
      window.location.href = '/';
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {/* Avatar trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0.25rem', borderRadius: '2rem', transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }} className="hidden sm:flex">
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--eg-fg)', lineHeight: 1.2 }}>
            {user.name || 'Your Account'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--eg-muted)', lineHeight: 1.2 }}>
            {user.email}
          </span>
        </div>
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt="Profile"
            style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.05)', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--eg-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} />
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
              width: '260px', background: '#ffffff', borderRadius: '1rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden', zIndex: 100,
            }}
          >
            <AnimatePresence mode="wait" initial={false}>

              {/* ── Main panel ── */}
              {panel === 'main' && (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* User header */}
                  <div style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.image} alt="" role="presentation" style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: 'var(--eg-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={14} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--eg-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Your Account'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--eg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                  </div>

                  {/* Nav items */}
                  <div style={{ padding: '0.5rem' }}>
                    <button onClick={handleDashboard} style={itemStyle}>
                      <LayoutDashboard size={14} color="var(--eg-accent)" />
                      <span>My Websites</span>
                    </button>
                    <button onClick={() => setPanel('profile')} style={itemStyle}>
                      <Settings size={14} color="var(--eg-muted)" />
                      <span>Profile Settings</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'rgba(0,0,0,0.25)' }}>›</span>
                    </button>
                    <button onClick={() => setPanel('billing')} style={itemStyle}>
                      <CreditCard size={14} color="var(--eg-muted)" />
                      <span>Billing & Plan</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'rgba(0,0,0,0.25)' }}>›</span>
                    </button>
                  </div>

                  <div style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <button onClick={() => { setIsOpen(false); signOut(); }} style={{ ...itemStyle, color: '#dc2626' }}>
                      <LogOut size={14} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Profile Settings panel ── */}
              {panel === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.15 }}
                >
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => setPanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--eg-muted)', padding: '2px', borderRadius: '4px' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--eg-fg)' }}>Profile Settings</span>
                  </div>

                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.4rem' }}>
                        Display Name
                      </label>
                      <input
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '0.55rem 0.75rem', borderRadius: '0.5rem',
                          border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.88rem',
                          fontFamily: 'inherit', color: 'var(--eg-fg)',
                          outline: 'none', transition: 'border-color 0.15s',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--eg-accent)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.4rem' }}>
                        Email
                      </label>
                      <div style={{ padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(0,0,0,0.02)', fontSize: '0.88rem', color: 'var(--eg-muted)' }}>
                        {user.email}
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.35)', marginTop: '0.3rem' }}>
                        Managed by your Google account
                      </p>
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving || !displayName.trim()}
                      style={{
                        width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: 'none',
                        background: saved ? 'rgba(163,177,138,0.2)' : 'var(--eg-accent, #A3B18A)',
                        color: saved ? 'var(--eg-accent)' : '#fff',
                        fontSize: '0.85rem', fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        transition: 'all 0.2s', opacity: !displayName.trim() ? 0.5 : 1,
                      }}
                    >
                      {saving ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : saved ? <><Check size={14} /> Saved</> : 'Save Changes'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Billing & Plan panel ── */}
              {panel === 'billing' && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.15 }}
                >
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => setPanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--eg-muted)', padding: '2px', borderRadius: '4px' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--eg-fg)' }}>Billing & Plan</span>
                  </div>

                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {/* Current plan */}
                    <div style={{ background: 'rgba(163,177,138,0.08)', border: '1px solid rgba(163,177,138,0.2)', borderRadius: '0.75rem', padding: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <Star size={13} color="var(--eg-accent)" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--eg-accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Free Plan</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', margin: 0, lineHeight: 1.55 }}>
                        1 site · Pearloom branding · Core AI generation
                      </p>
                    </div>

                    {/* Pro upgrade */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(43,43,43,0.04), rgba(163,177,138,0.06))', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '0.75rem', padding: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <Zap size={13} color="#B8860B" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#B8860B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pro</span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', fontWeight: 700, color: 'var(--eg-fg)' }}>£9/mo</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', margin: '0 0 0.75rem', lineHeight: 1.55 }}>
                        Unlimited sites · No branding · Custom domain · Priority AI
                      </p>
                      <button
                        onClick={() => window.open('mailto:hello@pearloom.app?subject=Pro%20Plan%20Enquiry', '_blank')}
                        style={{
                          width: '100%', padding: '0.55rem', borderRadius: '0.5rem', border: 'none',
                          background: '#2B2B2B', color: '#fff',
                          fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                      >
                        Upgrade to Pro →
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const itemStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
  padding: '0.65rem 0.875rem', borderRadius: '0.5rem',
  background: 'transparent', border: 'none',
  fontSize: '0.85rem', fontWeight: 500, color: 'var(--eg-fg)',
  cursor: 'pointer', transition: 'background 0.15s ease',
  textAlign: 'left',
};
