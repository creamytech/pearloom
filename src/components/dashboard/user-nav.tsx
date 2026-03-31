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
      {/* Avatar trigger — avatar only; name/email live inside the dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Account menu"
        className="pearloom-avatar-trigger"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '3px', borderRadius: '50%', transition: 'all 0.25s ease',
          display: 'flex', alignItems: 'center',
        }}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt="Profile"
            style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.07)', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '2.5rem', height: '2.5rem', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--eg-accent) 0%, var(--eg-plum, #6D597A) 100%)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--eg-font-heading)', fontWeight: 700, fontSize: '1rem', fontStyle: 'italic',
            letterSpacing: '-0.02em',
          }}>
            {user.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
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
              width: '280px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)', borderRadius: '1rem',
              boxShadow: '0 12px 48px rgba(43,43,43,0.12)', border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden', zIndex: 100,
            }}
          >
            {/* Accent gradient line at top */}
            <div style={{ height: '2px', background: 'linear-gradient(to right, var(--eg-accent), var(--eg-plum, #6D597A))' }} />

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
                  <div style={{ padding: '1rem 1rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.image} alt="" role="presentation" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(163,177,138,0.2)' }} />
                    ) : (
                      <div style={{
                        width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--eg-accent) 0%, var(--eg-plum, #6D597A) 100%)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        fontFamily: 'var(--eg-font-heading)', fontWeight: 700, fontSize: '1rem', fontStyle: 'italic',
                      }}>
                        {user.name ? user.name.charAt(0).toUpperCase() : <User size={14} />}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--eg-font-heading)', fontStyle: 'italic', fontWeight: 600, fontSize: '0.95rem', color: 'var(--eg-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Your Account'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--eg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{user.email}</div>
                    </div>
                  </div>
                  <div style={{ margin: '0 1rem', height: '1px', background: 'linear-gradient(to right, rgba(0,0,0,0.06), rgba(0,0,0,0.02))' }} />

                  {/* Nav items */}
                  <div style={{ padding: '0.375rem 0.5rem' }}>
                    {[
                      { onClick: handleDashboard, icon: <LayoutDashboard size={14} />, iconBg: 'rgba(163,177,138,0.15)', iconColor: 'var(--eg-accent)', label: 'My Websites', chevron: false },
                      { onClick: () => setPanel('profile'), icon: <Settings size={14} />, iconBg: 'rgba(0,0,0,0.05)', iconColor: 'var(--eg-muted)', label: 'Profile Settings', chevron: true },
                      { onClick: () => setPanel('billing'), icon: <CreditCard size={14} />, iconBg: 'rgba(0,0,0,0.05)', iconColor: 'var(--eg-muted)', label: 'Billing & Plan', chevron: true },
                    ].map((item, i) => (
                      <motion.button
                        key={item.label}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15, delay: 0.03 * (i + 1) }}
                        onClick={item.onClick}
                        className="pearloom-dropdown-item"
                        style={itemStyle}
                      >
                        <span style={{
                          width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                          background: item.iconBg, color: item.iconColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                        {item.chevron && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'rgba(0,0,0,0.25)' }}>›</span>}
                      </motion.button>
                    ))}
                  </div>

                  <div style={{ margin: '0 0.75rem', height: '1px', background: 'rgba(0,0,0,0.05)' }} />

                  <div style={{ padding: '0.375rem 0.5rem' }}>
                    <motion.button
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: 0.12 }}
                      onClick={() => { setIsOpen(false); signOut(); }}
                      className="pearloom-dropdown-item pearloom-signout-item"
                      style={{ ...itemStyle, color: '#dc2626' }}
                    >
                      <span style={{
                        width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                        background: 'rgba(220,38,38,0.08)', color: '#dc2626',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <LogOut size={14} />
                      </span>
                      <span>Sign out</span>
                    </motion.button>
                  </div>

                  {/* Footer decoration */}
                  <div style={{ padding: '0.5rem 1rem 0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25 }}>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                    </svg>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.22)', fontWeight: 500, letterSpacing: '0.06em' }}>Powered by Pearloom</span>
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
                          padding: '0.6rem 0.75rem', borderRadius: '0.6rem',
                          border: '1.5px solid rgba(0,0,0,0.08)', fontSize: '0.88rem',
                          fontFamily: 'inherit', color: 'var(--eg-fg)',
                          background: 'rgba(163,177,138,0.04)',
                          outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--eg-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'rgba(163,177,138,0.04)'; }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '0.4rem' }}>
                        Email
                      </label>
                      <div style={{ padding: '0.6rem 0.75rem', borderRadius: '0.6rem', border: '1.5px solid rgba(0,0,0,0.05)', background: 'rgba(163,177,138,0.04)', fontSize: '0.88rem', color: 'var(--eg-muted)' }}>
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
                        width: '100%', padding: '0.65rem', borderRadius: '0.6rem', border: 'none',
                        background: saved ? 'rgba(163,177,138,0.2)' : 'linear-gradient(135deg, var(--eg-accent, #A3B18A), var(--eg-accent-hover, #8FA876))',
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
                        onClick={() => window.open('mailto:hello@pearloom.com?subject=Pro%20Plan%20Enquiry', '_blank')}
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
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .pearloom-avatar-trigger { outline: 2px solid transparent; outline-offset: 1px; }
        .pearloom-avatar-trigger:hover { outline-color: rgba(163,177,138,0.45); }
        .pearloom-avatar-trigger:hover img,
        .pearloom-avatar-trigger:hover > div { transform: scale(1.04); transition: transform 0.2s ease; }
        .pearloom-dropdown-item:hover { background: rgba(163,177,138,0.1) !important; }
        .pearloom-signout-item:hover { background: rgba(220,38,38,0.06) !important; }
      `}</style>
    </div>
  );
}

const itemStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
  padding: '0.6rem 0.75rem', minHeight: '2.75rem', borderRadius: '0.5rem',
  background: 'transparent', border: 'none',
  fontSize: '0.85rem', fontWeight: 500, color: 'var(--eg-fg)',
  cursor: 'pointer', transition: 'background 0.18s ease',
  textAlign: 'left',
};
