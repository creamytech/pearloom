'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/user-nav.tsx
// User dropdown: My Sites, Profile Settings, Billing, Sign out
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, CreditCard, LayoutDashboard, ChevronLeft, Check, Loader2, Zap, Star } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { colors as C, text, card } from '@/lib/design-tokens';

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
    try {
      await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName.trim() }),
      }).catch(() => null);
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
      window.location.href = '/';
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {/* Avatar trigger */}
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
            style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: `2px solid ${C.divider}`, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '2.5rem', height: '2.5rem', borderRadius: '50%',
            background: C.olive,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1rem',
          }}>
            {user.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
              width: '280px', background: card.bg,
              borderRadius: card.radius,
              boxShadow: card.shadow, border: card.border,
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
                  <div style={{ padding: '1rem 1rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.image} alt="" role="presentation" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${C.divider}` }} />
                    ) : (
                      <div style={{
                        width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                        background: C.olive,
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        fontWeight: 700, fontSize: '1rem',
                      }}>
                        {user.name ? user.name.charAt(0).toUpperCase() : <User size={14} />}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: text.md, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Your Account'}</div>
                      <div style={{ fontSize: text.xs, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{user.email}</div>
                    </div>
                  </div>
                  <div style={{ margin: '0 1rem', height: '1px', background: C.divider }} />

                  {/* Nav items */}
                  <div style={{ padding: '0.375rem 0.5rem' }}>
                    {[
                      { onClick: handleDashboard, icon: <LayoutDashboard size={14} />, label: 'My Websites', chevron: false },
                      { onClick: () => setPanel('profile'), icon: <Settings size={14} />, label: 'Profile Settings', chevron: true },
                      { onClick: () => setPanel('billing'), icon: <CreditCard size={14} />, label: 'Billing & Plan', chevron: true },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.onClick}
                        className="pearloom-dropdown-item"
                        style={itemStyle}
                      >
                        <span style={{
                          width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                          background: `${C.olive}1A`, color: C.muted,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                        {item.chevron && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: C.muted }}>›</span>}
                      </button>
                    ))}
                  </div>

                  <div style={{ margin: '0 0.75rem', height: '1px', background: C.divider }} />

                  <div style={{ padding: '0.375rem 0.5rem' }}>
                    <button
                      onClick={() => { setIsOpen(false); signOut(); }}
                      className="pearloom-dropdown-item pearloom-signout-item"
                      style={{ ...itemStyle, color: '#dc2626' }}
                    >
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
                  <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.divider}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => setPanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: C.muted, padding: '2px', borderRadius: '4px' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: text.base, fontWeight: 700, color: C.ink }}>Profile Settings</span>
                  </div>

                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: text.xs, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted, marginBottom: '0.4rem' }}>
                        Display Name
                      </label>
                      <input
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '0.6rem 0.75rem', borderRadius: '0.6rem',
                          border: `1px solid ${C.divider}`, fontSize: text.base,
                          fontFamily: 'inherit', color: C.ink,
                          background: '#fff',
                          outline: 'none', transition: 'border-color 0.2s',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = C.olive; }}
                        onBlur={e => { e.currentTarget.style.borderColor = C.divider; }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: text.xs, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted, marginBottom: '0.4rem' }}>
                        Email
                      </label>
                      <div style={{ padding: '0.6rem 0.75rem', borderRadius: '0.6rem', border: `1px solid ${C.divider}`, background: C.cream, fontSize: text.base, color: C.muted }}>
                        {user.email}
                      </div>
                      <p style={{ fontSize: text.xs, color: C.muted, marginTop: '0.3rem' }}>
                        Managed by your Google account
                      </p>
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving || !displayName.trim()}
                      style={{
                        width: '100%', padding: '0.65rem', borderRadius: '0.6rem', border: 'none',
                        background: saved ? `${C.olive}33` : C.olive,
                        color: saved ? C.olive : '#fff',
                        fontSize: text.base, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
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
                  <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.divider}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => setPanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: C.muted, padding: '2px', borderRadius: '4px' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: text.base, fontWeight: 700, color: C.ink }}>Billing & Plan</span>
                  </div>

                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {/* Current plan */}
                    <div style={{ background: `${C.olive}1A`, border: `1px solid ${C.olive}33`, borderRadius: '0.75rem', padding: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <Star size={13} color={C.olive} />
                        <span style={{ fontSize: text.sm, fontWeight: 800, color: C.olive, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Free Plan</span>
                      </div>
                      <p style={{ fontSize: text.sm, color: C.muted, margin: 0, lineHeight: 1.55 }}>
                        1 site · Pearloom branding · Core AI generation
                      </p>
                    </div>

                    {/* Pro upgrade */}
                    <div style={{ background: C.cream, border: `1px solid ${C.divider}`, borderRadius: '0.75rem', padding: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <Zap size={13} color={C.gold} />
                        <span style={{ fontSize: text.sm, fontWeight: 800, color: C.dark, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pro</span>
                        <span style={{ marginLeft: 'auto', fontSize: text.sm, fontWeight: 700, color: C.ink }}>£9/mo</span>
                      </div>
                      <p style={{ fontSize: text.sm, color: C.muted, margin: '0 0 0.75rem', lineHeight: 1.55 }}>
                        Unlimited sites · No branding · Custom domain · Priority AI
                      </p>
                      <button
                        onClick={() => window.open('mailto:hello@pearloom.com?subject=Pro%20Plan%20Enquiry', '_blank')}
                        style={{
                          width: '100%', padding: '0.55rem', borderRadius: '0.5rem', border: 'none',
                          background: C.ink, color: '#fff',
                          fontSize: text.sm, fontWeight: 700, cursor: 'pointer',
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
        .pearloom-avatar-trigger:hover { outline-color: ${C.olive}66; }
        .pearloom-avatar-trigger:hover img,
        .pearloom-avatar-trigger:hover > div { transform: scale(1.04); transition: transform 0.2s ease; }
        .pearloom-dropdown-item:hover { background: ${C.cream} !important; }
        .pearloom-signout-item:hover { background: #fef2f2 !important; }
      `}</style>
    </div>
  );
}

const itemStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
  padding: '0.6rem 0.75rem', height: '40px', borderRadius: '0.5rem',
  background: 'transparent', border: 'none',
  fontSize: '0.85rem', fontWeight: 500, color: C.ink,
  cursor: 'pointer', transition: 'background 0.15s ease',
  textAlign: 'left',
};
