'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, LogOut, Settings, CreditCard,
  LayoutDashboard, ChevronLeft, Check, Loader2, Zap, Star,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/cn';

interface UserNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onDashboard?: () => void;
}

type Panel = 'main' | 'profile' | 'billing';

function Avatar({ user, size = 'md' }: { user: UserNavProps['user']; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-[0.85rem]' : 'w-10 h-10 text-base';
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt="Profile"
        className={cn(dim, 'rounded-full object-cover border-2 border-[var(--pl-divider)] block')}
      />
    );
  }
  return (
    <div className={cn(dim, 'rounded-full bg-[var(--pl-olive)] text-white flex items-center justify-center font-bold flex-shrink-0')}>
      {user.name ? user.name.charAt(0).toUpperCase() : <User size={14} />}
    </div>
  );
}

export function UserNav({ user, onDashboard }: UserNavProps) {
  const [isOpen, setIsOpen]         = useState(false);
  const [panel, setPanel]           = useState<Panel>('main');
  const [displayName, setDisplayName] = useState(user.name || '');
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) setTimeout(() => setPanel('main'), 200);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
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
    if (onDashboard) onDashboard();
    else window.location.href = '/';
  };

  const NAV_ITEMS = [
    { onClick: handleDashboard,         icon: <LayoutDashboard size={14} />, label: 'My Websites',      chevron: false },
    { onClick: () => setPanel('profile'), icon: <Settings size={14} />,       label: 'Profile Settings', chevron: true  },
    { onClick: () => setPanel('billing'), icon: <CreditCard size={14} />,     label: 'Billing & Plan',   chevron: true  },
  ];

  return (
    <div className="relative" ref={ref}>
      {/* Avatar trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Account menu"
        aria-expanded={isOpen}
        className="flex items-center p-[3px] rounded-full cursor-pointer border-0 bg-transparent hover:ring-2 hover:ring-[var(--pl-olive)]/40 transition-all duration-200"
      >
        <Avatar user={user} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute top-[calc(100%+0.5rem)] right-0 w-[272px] bg-white rounded-[var(--pl-radius-md)] border border-[var(--pl-divider)] shadow-[0_12px_40px_rgba(43,30,20,0.12),0_20px_50px_rgba(43,30,20,0.07)] overflow-hidden z-[100]"
          >
            <AnimatePresence mode="wait" initial={false}>

              {/* ── Main panel ── */}
              {panel === 'main' && (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.13 }}
                >
                  {/* User header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3.5">
                    <Avatar user={user} />
                    <div className="min-w-0">
                      <div className="text-[0.92rem] font-semibold text-[var(--pl-ink)] truncate">
                        {user.name || 'Your Account'}
                      </div>
                      <div className="text-[0.72rem] text-[var(--pl-muted)] truncate mt-px">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="mx-4 h-px bg-[var(--pl-divider)]" />

                  <div className="px-1.5 py-1.5">
                    {NAV_ITEMS.map((item) => (
                      <button
                        key={item.label}
                        onClick={item.onClick}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--pl-radius-sm)] text-[0.85rem] font-medium text-[var(--pl-ink)] bg-transparent border-0 cursor-pointer text-left hover:bg-[var(--pl-cream)] transition-colors duration-120"
                      >
                        <span className="w-7 h-7 rounded-lg bg-[var(--pl-olive-mist)] text-[var(--pl-muted)] flex items-center justify-center flex-shrink-0">
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                        {item.chevron && <span className="ml-auto text-[var(--pl-muted)] text-[0.7rem]">›</span>}
                      </button>
                    ))}
                  </div>

                  <div className="mx-3 h-px bg-[var(--pl-divider)]" />

                  <div className="px-1.5 py-1.5">
                    <button
                      onClick={() => { setIsOpen(false); signOut(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--pl-radius-sm)] text-[0.85rem] font-medium text-red-600 bg-transparent border-0 cursor-pointer text-left hover:bg-red-50 transition-colors duration-120"
                    >
                      <LogOut size={14} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Profile Settings ── */}
              {panel === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.13 }}
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--pl-divider)]">
                    <button
                      onClick={() => setPanel('main')}
                      className="flex items-center text-[var(--pl-muted)] cursor-pointer bg-transparent border-0 p-0.5 rounded hover:text-[var(--pl-ink)] transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[0.92rem] font-bold text-[var(--pl-ink)]">Profile Settings</span>
                  </div>

                  <div className="p-4 flex flex-col gap-3.5">
                    <div>
                      <label className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--pl-muted)] mb-1.5">
                        Display Name
                      </label>
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-3 py-2.5 rounded-[var(--pl-radius-sm)] border border-[var(--pl-divider)] text-[max(16px,0.9rem)] text-[var(--pl-ink)] bg-white outline-none focus:border-[var(--pl-olive)] focus:shadow-[0_0_0_3px_rgba(163,177,138,0.22)] transition-all font-[family-name:var(--pl-font-body)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--pl-muted)] mb-1.5">
                        Email
                      </label>
                      <div className="px-3 py-2.5 rounded-[var(--pl-radius-sm)] border border-[var(--pl-divider)] bg-[var(--pl-cream)] text-[0.85rem] text-[var(--pl-muted)]">
                        {user.email}
                      </div>
                      <p className="text-[0.68rem] text-[var(--pl-muted)] mt-1">Managed by your Google account</p>
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving || !displayName.trim()}
                      className={cn(
                        'w-full py-2.5 rounded-[var(--pl-radius-sm)] border-0 text-[0.85rem] font-bold cursor-pointer',
                        'flex items-center justify-center gap-1.5 transition-all duration-200',
                        saved
                          ? 'bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)]'
                          : 'bg-[var(--pl-olive)] text-white hover:bg-[var(--pl-olive-hover)]',
                        (!displayName.trim() || saving) && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {saving ? (
                        <><Loader2 size={13} className="animate-spin" /> Saving…</>
                      ) : saved ? (
                        <><Check size={13} /> Saved</>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Billing & Plan ── */}
              {panel === 'billing' && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.13 }}
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--pl-divider)]">
                    <button
                      onClick={() => setPanel('main')}
                      className="flex items-center text-[var(--pl-muted)] cursor-pointer bg-transparent border-0 p-0.5 rounded hover:text-[var(--pl-ink)] transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[0.92rem] font-bold text-[var(--pl-ink)]">Billing & Plan</span>
                  </div>

                  <div className="p-4 flex flex-col gap-3.5">
                    {/* Current plan */}
                    <div className="bg-[var(--pl-olive-mist)] border border-[rgba(163,177,138,0.2)] rounded-[var(--pl-radius-md)] p-3.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Star size={13} className="text-[var(--pl-olive)]" />
                        <span className="text-[0.72rem] font-bold uppercase tracking-[0.07em] text-[var(--pl-olive-deep)]">Free Plan</span>
                      </div>
                      <p className="text-[0.82rem] text-[var(--pl-muted)] leading-snug m-0">
                        1 site · Pearloom branding · Core AI generation
                      </p>
                    </div>

                    {/* Pro upgrade */}
                    <div className="bg-[var(--pl-cream)] border border-[var(--pl-divider)] rounded-[var(--pl-radius-md)] p-3.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Zap size={13} className="text-[var(--pl-gold)]" />
                        <span className="text-[0.72rem] font-bold uppercase tracking-[0.07em] text-[var(--pl-ink-soft)]">Pro</span>
                        <span className="ml-auto text-[0.82rem] font-bold text-[var(--pl-ink)]">£9/mo</span>
                      </div>
                      <p className="text-[0.82rem] text-[var(--pl-muted)] leading-snug mb-3">
                        Unlimited sites · No branding · Custom domain · Priority AI
                      </p>
                      <button
                        onClick={() => window.open('mailto:hello@pearloom.com?subject=Pro%20Plan%20Enquiry', '_blank')}
                        className="w-full py-2 rounded-[var(--pl-radius-sm)] border-0 bg-[var(--pl-ink)] text-white text-[0.82rem] font-bold cursor-pointer hover:opacity-85 transition-opacity duration-150"
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
    </div>
  );
}
