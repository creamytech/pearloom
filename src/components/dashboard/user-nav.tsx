'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/user-nav.tsx — v2
// Single-panel profile dropdown — no sub-navigation friction.
// Shows: identity + plan badge, quick links, inline name edit,
// plan card, sign-out. All visible without clicking deeper.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, LogOut, Check, Loader2, Zap, Star,
  LayoutDashboard, LayoutGrid, ExternalLink,
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

function Avatar({ user, size = 'md' }: { user: UserNavProps['user']; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[0.78rem]'
            : size === 'lg' ? 'w-12 h-12 text-[1rem]'
            : 'w-9 h-9 text-[0.9rem]';
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt="Profile"
        className={cn(dim, 'rounded-full object-cover block flex-shrink-0')}
      />
    );
  }
  return (
    <div className={cn(dim, 'rounded-full bg-gradient-to-br from-[var(--pl-olive)] to-[#7A9170] text-white flex items-center justify-center font-bold flex-shrink-0')}>
      {user.name ? user.name.charAt(0).toUpperCase() : <User size={13} />}
    </div>
  );
}

export function UserNav({ user, onDashboard }: UserNavProps) {
  const [isOpen, setIsOpen]           = useState(false);
  const [displayName, setDisplayName] = useState(user.name || '');
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSave = async () => {
    if (!displayName.trim() || saving) return;
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
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const initials = user.name
    ? user.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Account menu"
        aria-expanded={isOpen}
        className={cn(
          'flex items-center gap-2 rounded-[var(--pl-radius-full)] px-1.5 py-1 border-0 bg-transparent cursor-pointer',
          'transition-all duration-150',
          isOpen
            ? 'bg-[rgba(163,177,138,0.12)] ring-2 ring-[var(--pl-olive)]/30'
            : 'hover:bg-[rgba(0,0,0,0.05)]',
        )}
      >
        <Avatar user={user} size="sm" />
        <span className="hidden sm:block text-[0.8rem] font-[500] text-[var(--pl-ink-soft)] max-w-[100px] truncate pr-0.5">
          {user.name?.split(' ')[0] || 'Account'}
        </span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[calc(100%+0.6rem)] right-0 w-[296px] bg-white rounded-[var(--pl-radius-lg)] border border-[var(--pl-divider)] shadow-[0_16px_48px_rgba(43,30,20,0.14),0_4px_12px_rgba(43,30,20,0.06)] overflow-hidden z-[200]"
          >
            {/* ── Identity header ── */}
            <div className="px-4 pt-4 pb-3 border-b border-[var(--pl-divider)]">
              <div className="flex items-center gap-3">
                <Avatar user={user} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="text-[0.95rem] font-semibold text-[var(--pl-ink)] truncate leading-tight">
                    {user.name || 'Your Account'}
                  </div>
                  <div className="text-[0.7rem] text-[var(--pl-muted)] truncate mt-0.5">
                    {user.email}
                  </div>
                </div>
                {/* Plan badge */}
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--pl-olive-mist)] text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-olive-deep)] flex-shrink-0">
                  <Star size={8} />
                  Free
                </span>
              </div>
            </div>

            {/* ── Quick links ── */}
            <div className="flex items-stretch border-b border-[var(--pl-divider)]">
              {[
                { icon: LayoutDashboard, label: 'Dashboard', action: () => { setIsOpen(false); if (onDashboard) onDashboard(); else window.location.href = '/dashboard'; } },
                { icon: LayoutGrid,      label: 'Gallery',   action: () => { setIsOpen(false); window.location.href = '/dashboard/gallery'; } },
                { icon: ExternalLink,    label: 'Marketplace', action: () => { setIsOpen(false); window.location.href = '/marketplace'; } },
              ].map(({ icon: Icon, label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 border-0 bg-transparent cursor-pointer text-[var(--pl-muted)] hover:bg-[var(--pl-cream)] hover:text-[var(--pl-ink)] transition-colors duration-120"
                >
                  <Icon size={15} />
                  <span className="text-[0.62rem] font-semibold tracking-[0.04em]">{label}</span>
                </button>
              ))}
            </div>

            {/* ── Inline name edit ── */}
            <div className="px-4 py-3.5 border-b border-[var(--pl-divider)]">
              <div className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)] mb-1.5">
                Display Name
              </div>
              <div className="flex gap-2">
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                  placeholder="Your name"
                  className="flex-1 px-2.5 py-1.5 rounded-[var(--pl-radius-sm)] border border-[var(--pl-divider)] text-[max(16px,0.85rem)] text-[var(--pl-ink)] bg-white outline-none focus:border-[var(--pl-olive)] transition-colors font-body"
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !displayName.trim() || displayName === user.name}
                  className={cn(
                    'px-3 rounded-[var(--pl-radius-sm)] border-0 text-[0.78rem] font-bold cursor-pointer flex items-center gap-1 transition-all duration-150',
                    saved
                      ? 'bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)]'
                      : 'bg-[var(--pl-olive)] text-white hover:opacity-88',
                    (saving || !displayName.trim() || displayName === user.name) && 'opacity-40 cursor-default',
                  )}
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : saved ? <Check size={11} /> : 'Save'}
                </button>
              </div>
              <div className="text-[0.65rem] text-[var(--pl-muted)] mt-1.5">
                Email managed by Google · <span className="text-[var(--pl-ink-soft)]">{user.email}</span>
              </div>
            </div>

            {/* ── Plan upsell ── */}
            <div className="px-4 py-3.5 border-b border-[var(--pl-divider)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Zap size={11} className="text-[var(--pl-gold)]" />
                    <span className="text-[0.72rem] font-bold text-[var(--pl-ink-soft)]">Upgrade to Pro</span>
                    <span className="text-[0.72rem] font-bold text-[var(--pl-muted)]">· £9/mo</span>
                  </div>
                  <p className="text-[0.68rem] text-[var(--pl-muted)] leading-snug m-0">
                    Unlimited sites · Custom domain · No branding
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = '/dashboard/profile'}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--pl-radius-sm)] border-0 bg-[var(--pl-ink)] text-white text-[0.68rem] font-bold cursor-pointer hover:opacity-85 transition-opacity flex-shrink-0"
                >
                  Upgrade <ExternalLink size={9} />
                </button>
              </div>
            </div>

            {/* ── Sign out ── */}
            <div className="px-1.5 py-1.5">
              <button
                onClick={() => { setIsOpen(false); signOut(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--pl-radius-sm)] text-[0.85rem] font-medium text-red-600 bg-transparent border-0 cursor-pointer text-left hover:bg-red-50 transition-colors duration-120"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
