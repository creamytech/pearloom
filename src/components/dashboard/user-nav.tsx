'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/user-nav.tsx — v3
// Profile dropdown with real plan data, responsive layout,
// and working name edit.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, LogOut, Check, Loader2, Zap, Star, Crown,
  LayoutDashboard, LayoutGrid, ExternalLink,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/cn';

interface UserNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onDashboard?: () => void;
}

interface PlanInfo {
  plan: string;
  label: string;
  icon: typeof Star;
  color: string;
  bg: string;
}

const PLAN_DISPLAY: Record<string, PlanInfo> = {
  free:     { plan: 'free',    label: 'Free',    icon: Star,  color: 'var(--pl-muted)',      bg: 'var(--pl-cream)' },
  journal:  { plan: 'free',    label: 'Free',    icon: Star,  color: 'var(--pl-muted)',      bg: 'var(--pl-cream)' },
  pro:      { plan: 'pro',     label: 'Pro',     icon: Zap,   color: 'var(--pl-olive-deep)', bg: 'var(--pl-olive-mist)' },
  atelier:  { plan: 'pro',     label: 'Pro',     icon: Zap,   color: 'var(--pl-olive-deep)', bg: 'var(--pl-olive-mist)' },
  premium:  { plan: 'premium', label: 'Premium', icon: Crown, color: 'var(--pl-gold)',        bg: 'rgba(196,168,74,0.1)' },
  legacy:   { plan: 'premium', label: 'Premium', icon: Crown, color: 'var(--pl-gold)',        bg: 'rgba(196,168,74,0.1)' },
};

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
  const [userPlan, setUserPlan]       = useState<string>('free');
  const ref = useRef<HTMLDivElement>(null);

  // Fetch real plan data
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/billing/plan')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.plan) setUserPlan(data.plan); })
      .catch(() => {});
  }, [isOpen]);

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
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName.trim() }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      // Silent fail — name change isn't critical
    } finally {
      setSaving(false);
    }
  };

  const planInfo = PLAN_DISPLAY[userPlan] || PLAN_DISPLAY.free;
  const PlanIcon = planInfo.icon;
  const isPaid = planInfo.plan !== 'free';

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
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[calc(100%+0.6rem)] right-0 w-[min(296px,calc(100vw-2rem))] bg-white rounded-[var(--pl-radius-lg)] border border-[var(--pl-divider)] shadow-[0_16px_48px_rgba(43,30,20,0.14),0_4px_12px_rgba(43,30,20,0.06)] overflow-hidden z-[200]"
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
                {/* Plan badge — real data */}
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold uppercase tracking-[0.1em] flex-shrink-0"
                  style={{ background: planInfo.bg, color: planInfo.color }}
                >
                  <PlanIcon size={8} />
                  {planInfo.label}
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
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-[var(--pl-radius-sm)] border border-[var(--pl-divider)] text-[max(16px,0.85rem)] text-[var(--pl-ink)] bg-white outline-none focus:border-[var(--pl-olive)] transition-colors font-body"
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !displayName.trim() || displayName === user.name}
                  className={cn(
                    'px-3 py-1.5 rounded-[var(--pl-radius-sm)] border-0 text-[0.78rem] font-bold cursor-pointer flex items-center gap-1 transition-all duration-150 flex-shrink-0',
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

            {/* ── Plan card — only show upgrade if on free ── */}
            {!isPaid && (
              <div className="px-4 py-3.5 border-b border-[var(--pl-divider)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Zap size={11} className="text-[var(--pl-gold)] flex-shrink-0" />
                      <span className="text-[0.72rem] font-bold text-[var(--pl-ink-soft)]">Upgrade to Pro</span>
                    </div>
                    <p className="text-[0.68rem] text-[var(--pl-muted)] leading-snug m-0">
                      Unlimited sites · Custom domain · No branding
                    </p>
                  </div>
                  <button
                    onClick={() => { setIsOpen(false); window.location.href = '/dashboard?upgrade=true'; }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--pl-radius-sm)] border-0 bg-[var(--pl-ink)] text-white text-[0.68rem] font-bold cursor-pointer hover:opacity-85 transition-opacity flex-shrink-0"
                  >
                    Upgrade <ExternalLink size={9} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Current plan info if paid ── */}
            {isPaid && (
              <div className="px-4 py-3.5 border-b border-[var(--pl-divider)]">
                <div className="flex items-center gap-2">
                  <PlanIcon size={13} style={{ color: planInfo.color }} />
                  <span className="text-[0.72rem] font-bold text-[var(--pl-ink-soft)]">
                    {planInfo.label} Plan
                  </span>
                </div>
                <p className="text-[0.68rem] text-[var(--pl-muted)] mt-1 m-0">
                  You have full access to all features.
                </p>
              </div>
            )}

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
