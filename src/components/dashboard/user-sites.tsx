'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Globe, Pencil, ExternalLink, Calendar, Loader2, Image,
  Trash2, AlertTriangle, Users, Check, Share2, RefreshCw, Sparkles,
  EllipsisVertical,
} from 'lucide-react';
import type { StoryManifest } from '@/types';
import { PearIcon } from '@/components/icons/PearloomIcons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/cn';

import { parseLocalDate } from '@/lib/date';
import { buildSiteUrl } from '@/lib/site-urls';

// ── Occasion gradients & icons ──────────────────────────────

const OCCASION_GRADIENT: Record<string, [string, string]> = {
  wedding:     ['#F4F4F5', '#FAFAFA'],
  birthday:    ['#F4F4F5', '#FAFAFA'],
  anniversary: ['#F4F4F5', '#FAFAFA'],
  engagement:  ['#F4F4F5', '#FAFAFA'],
};
const DEFAULT_GRADIENT: [string, string] = ['#F4F4F5', '#FAFAFA'];

function OccasionIcon({ occasion }: { occasion?: string }) {
  const cls = "text-current";
  switch (occasion) {
    case 'wedding':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M12 21C12 21 4 14.5 4 9.5C4 5.36 7.58 3 10.5 3C11.8 3 12 4 12 4C12 4 12.2 3 13.5 3C16.42 3 20 5.36 20 9.5C20 14.5 12 21 12 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'birthday':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={cls}>
          <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 7V11M8 9V11M16 9V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="5" r="1.5" stroke="currentColor" strokeWidth="1"/>
          <circle cx="8" cy="7" r="1" stroke="currentColor" strokeWidth="1"/>
          <circle cx="16" cy="7" r="1" stroke="currentColor" strokeWidth="1"/>
        </svg>
      );
    case 'anniversary':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'engagement':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={cls}>
          <circle cx="12" cy="14" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 8V4M10 4H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="14" r="2.5" stroke="currentColor" strokeWidth="1"/>
        </svg>
      );
    default:
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3Z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 12C8 8.5 10 6 12 6C14 6 16 8.5 16 12C16 15.5 14 18 12 18C10 18 8 15.5 8 12Z" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      );
  }
}

// ── Compact Thumbnail ────────────────────────────────────────

function SiteThumbnail({ photos, coverPhoto, accentColor, accentDark, occasion, displayName }: {
  photos: string[];
  coverPhoto?: string;
  accentColor: string;
  accentDark: string;
  occasion?: string;
  displayName?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const src = coverPhoto || photos[0];

  // proxy Google URLs
  const proxiedSrc = src?.includes('googleusercontent.com')
    ? `/api/photos/proxy?url=${encodeURIComponent(src)}&w=120&h=120`
    : src;

  const [gradStart, gradEnd] = OCCASION_GRADIENT[occasion || ''] || DEFAULT_GRADIENT;

  const fallback = (
    <div
      className="w-[60px] h-[60px] rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`,
      }}
    >
      {/* Couple/person names watermark */}
      {displayName && displayName !== 'Untitled Site' && (
        <span
          className="absolute inset-0 flex items-center justify-center text-[0.5rem] font-medium leading-tight text-center px-1 select-none pointer-events-none"
          style={{ opacity: 0.12, color: '#18181B' }}
        >
          {displayName}
        </span>
      )}
      {/* Occasion icon */}
      <span className="relative z-[1] select-none pointer-events-none" style={{ opacity: 0.15, color: '#18181B' }}>
        <OccasionIcon occasion={occasion} />
      </span>
    </div>
  );

  if (!proxiedSrc || imgError) {
    return fallback;
  }

  return (
    <div className="w-[60px] h-[60px] rounded-lg flex-shrink-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={proxiedSrc}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function daysUntil(dateStr: string): number | null {
  try {
    const event = parseLocalDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((event.getTime() - today.getTime()) / 86400000);
    return diff;
  } catch { return null; }
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white border border-[#E4E4E7]">
      <div className="w-[60px] h-[60px] rounded-lg skeleton flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-4 rounded-full w-[55%] skeleton" />
        <div className="h-3 rounded-full w-[30%] skeleton" />
      </div>
    </div>
  );
}

// ── Overflow menu ─────────────────────────────────────────────

function OverflowMenu({ site, onShare, onDelete, isCopied, isDeleting }: {
  site: UserSite;
  onShare: (site: UserSite, e: React.MouseEvent) => void;
  onDelete: (site: UserSite) => void;
  isCopied: boolean;
  isDeleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        aria-label="More options"
      >
        <EllipsisVertical size={16} className="text-[var(--pl-muted)]" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={menuRef}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="min-w-[160px] rounded-lg overflow-hidden bg-white border border-[#E4E4E7] shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]"
            style={{
              position: 'fixed',
              top: menuPos.top,
              right: menuPos.right,
              zIndex: 9999,
            } as React.CSSProperties}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onShare(site, e); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[0.82rem] text-[var(--pl-ink)] hover:bg-black/[0.03] transition-colors text-left"
            >
              {isCopied ? <Check size={14} className="text-[var(--pl-olive)]" /> : <Share2 size={14} className="text-[var(--pl-muted)]" />}
              {isCopied ? 'Link copied!' : 'Copy share link'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(getSiteUrlStatic(site.domain), '_blank');
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[0.82rem] text-[var(--pl-ink)] hover:bg-black/[0.03] transition-colors text-left"
            >
              <ExternalLink size={14} className="text-[var(--pl-muted)]" />
              View live site
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(site);
                setOpen(false);
              }}
              disabled={isDeleting}
              className="w-full flex items-center gap-3 px-4 py-3 text-[0.82rem] text-red-600 hover:bg-red-50 transition-colors text-left border-t border-[rgba(0,0,0,0.06)]"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete site
            </button>
          </motion.div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Static helper for site URL (used in OverflowMenu) ────────

function getSiteUrlStatic(domain: string) {
  return buildSiteUrl(domain);
}

// ── Types ──────────────────────────────────────────────────────

interface UserSite {
  id: string;
  domain: string;
  manifest: StoryManifest;
  created_at: string;
  names: [string, string];
}

interface UserSitesProps {
  onStartNew: () => void;
  onQuickStart?: () => void;
  onOpenTemplates?: () => void;
  onEditSite: (site: UserSite) => void;
  userName?: string;
}

const OCCASION_BADGE: Record<string, { label: string; variant: 'plum' | 'gold' | 'default' | 'muted' }> = {
  wedding:     { label: 'Wedding',     variant: 'plum'    },
  anniversary: { label: 'Anniversary', variant: 'gold'    },
  engagement:  { label: 'Engagement',  variant: 'plum'    },
  birthday:    { label: 'Birthday',    variant: 'default' },
  story:       { label: 'Story',       variant: 'muted'   },
};

// ─────────────────────────────────────────────────────────────

export function UserSites({ onStartNew, onQuickStart, onOpenTemplates, onEditSite, userName }: UserSitesProps) {
  const router = useRouter();
  const [sites, setSites]                   = useState<UserSite[]>([]);
  const [loading, setLoading]               = useState(true);
  const [fetchError, setFetchError]         = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<UserSite | null>(null);
  const [deleteError, setDeleteError]       = useState<string | null>(null);
  const [copiedId, setCopiedId]             = useState<string | null>(null);
  const [pearUsage, setPearUsage]           = useState<{ used: number; limit: number; plan: string } | null>(null);


  const loadSites = () => {
    setFetchError(false);
    setLoading(true);
    fetch('/api/sites')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { if (d.sites) setSites(d.sites); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSites(); }, []);

  // Fetch Pear AI usage stats
  useEffect(() => {
    fetch('/api/ai-usage')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setPearUsage({ used: d.used ?? 0, limit: d.limit ?? 15, plan: d.plan ?? 'free' });
      })
      .catch(() => { /* silent */ });
  }, []);

  const handleDelete = async (site: UserSite) => {
    setDeletingDomain(site.domain);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/sites/${site.domain}`, { method: 'DELETE' });
      if (res.ok) {
        setSites((prev) => prev.filter((s) => s.domain !== site.domain));
        setConfirmDelete(null);
      } else {
        let msg = 'Delete failed. Please try again.';
        try { const b = await res.json(); if (b?.error) msg = b.error; } catch { /* ignore */ }
        setDeleteError(msg);
      }
    } catch {
      setDeleteError('Network error — please check your connection.');
    } finally {
      setDeletingDomain(null);
    }
  };

  const getSiteUrl = (domain: string) => getSiteUrlStatic(domain);

  const handleCopyUrl = async (site: UserSite, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getSiteUrl(site.domain));
      setCopiedId(site.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* silent */ }
  };

  const getDisplayName = useCallback((site: UserSite) => {
    const rawNames = (site.names || ['', '']).map((n) => n.charAt(0).toUpperCase() + n.slice(1));
    if (rawNames[1]?.trim()) return rawNames.join(' & ');
    if (rawNames[0]?.trim()) return rawNames[0];
    return 'Untitled Site';
  }, []);

  return (
    <div className="w-full max-w-[1280px] mx-auto pb-24 md:pb-20">

      {/* ── Header band ── */}
      <div className="pl-enter mb-6 sm:mb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.06em] uppercase text-[#A1A1AA] mb-1">
              {getGreeting()}{userName ? `, ${userName}` : ''}
            </p>
            <h1 className="text-[clamp(1.4rem,3vw,2rem)] font-semibold text-[#18181B] leading-tight">
              Your Sites
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Pear usage indicator */}
            {pearUsage && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7]">
                <Sparkles size={13} className="text-[#18181B]" />
                <span className="text-[0.72rem] font-semibold text-[#18181B]">
                  Pear:{' '}
                  {pearUsage.plan !== 'free' ? (
                    <span className="text-[#18181B]">{'\u221E'}</span>
                  ) : (
                    <span style={{ color: pearUsage.used >= pearUsage.limit ? '#b91c1c' : pearUsage.used >= pearUsage.limit - 3 ? '#b45309' : '#18181B' }}>
                      {pearUsage.used}/{pearUsage.limit} used
                    </span>
                  )}
                </span>
              </div>
            )}
            <button
              onClick={onStartNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#18181B] text-white text-[0.75rem] font-semibold border-none cursor-pointer hover:bg-[#27272A] transition-colors flex-shrink-0"
            >
              <Plus size={15} /> New Site
            </button>
          </div>
        </div>
      </div>

      {/* ── Compact creation row — horizontal scroll on mobile ── */}
      {!loading && !fetchError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-3 mb-6 sm:mb-10 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {[
            { icon: <Sparkles size={18} />, title: 'Let Pear handle it', action: onStartNew },
            { icon: <Image size={18} />, title: 'Upload Photos', action: () => { if (onStartNew) onStartNew(); } },
            { icon: <Globe size={18} />, title: 'From Template', action: onOpenTemplates || onQuickStart || onStartNew },
          ].map((card, i) => (
            <button
              key={card.title}
              onClick={card.action}
              className={cn(
                `pl-enter pl-enter-d${i + 1}`,
                'flex items-center gap-3 px-4 py-3 min-w-[140px] max-h-[80px]',
                'rounded-lg bg-white border border-[#E4E4E7]',
                'hover:border-[#18181B] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
                'active:scale-[0.98] transition-all duration-200 cursor-pointer flex-shrink-0',
              )}
            >
              <div className="w-9 h-9 rounded-md border border-[#E4E4E7] flex items-center justify-center text-[#71717A] flex-shrink-0">
                {card.icon}
              </div>
              <span className="text-[0.82rem] font-medium text-[#18181B] whitespace-nowrap">{card.title}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>

      ) : fetchError ? (
        <div className="p-8 sm:p-16 text-center max-w-[480px] mx-auto bg-white rounded-xl border border-[#E4E4E7]">
          <div className="w-14 h-14 rounded-lg bg-[#FEF2F2] flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={24} className="text-[#DC2626]" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-[#18181B]">
            Something went wrong
          </h3>
          <p className="text-[#71717A] text-[0.85rem] mb-6 leading-relaxed">
            We couldn&apos;t load your sites. Check your connection and try again.
          </p>
          <Button variant="primary" size="md" onClick={loadSites} icon={<RefreshCw size={14} />}>
            Try Again
          </Button>
        </div>

      ) : sites.length === 0 ? (
        <div className="max-w-[640px] mx-auto">
          {/* Hero empty state */}
          <div className="pl-enter flex flex-col items-center justify-center text-center py-16 px-8 rounded-xl bg-white border border-[#E4E4E7] mb-6">
            <div className="w-16 h-16 rounded-lg bg-[#F4F4F5] flex items-center justify-center mb-5">
              <PearIcon size={40} color="#18181B" />
            </div>
            <h2 className="text-[clamp(1.6rem,4vw,2.2rem)] font-semibold text-[#18181B] mb-2 leading-tight">
              Welcome to Pearloom
            </h2>
            <p className="text-[#71717A] max-w-[360px] leading-[1.6] text-[0.9rem] mb-8">
              Create your first celebration site in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <button onClick={onStartNew} className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#18181B] text-white text-[0.8rem] font-semibold border-none cursor-pointer hover:bg-[#27272A] transition-colors min-w-[180px] justify-center">
                <Sparkles size={15} /> Start with AI
              </button>
              <button onClick={onOpenTemplates || onQuickStart || onStartNew} className="flex items-center justify-center px-5 py-2.5 rounded-md bg-white text-[#18181B] text-[0.8rem] font-semibold border border-[#E4E4E7] cursor-pointer hover:bg-[#F4F4F5] transition-colors min-w-[180px]">
                Browse Templates
              </button>
            </div>
          </div>

          {/* How it works — 3 steps */}
          <div className="pl-enter pl-enter-d2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { num: '1', title: 'Add photos', desc: 'From Google Photos or your device — the moments that matter most.' },
              { num: '2', title: 'Set your vibe', desc: 'Describe the feeling. AI crafts colors, fonts, and layout around it.' },
              { num: '3', title: 'Share your site', desc: 'Get a beautiful link to send to your guests. Edit anytime.' },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                className="p-5 rounded-xl bg-white border border-[#E4E4E7] text-center"
              >
                <div className="w-8 h-8 rounded-md bg-[#F4F4F5] flex items-center justify-center mx-auto mb-3 text-[0.72rem] font-bold text-[#18181B]">
                  {step.num}
                </div>
                <h4 className="text-[0.82rem] font-semibold text-[#18181B] mb-1">{step.title}</h4>
                <p className="text-[0.72rem] text-[#71717A] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

      ) : (
        <>
        {/* Your Sites heading + count */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[0.65rem] font-semibold tracking-[0.06em] uppercase text-[#A1A1AA]">Your Sites</h2>
          <span className="text-[0.75rem] text-[#71717A]">
            {sites.length} {sites.length === 1 ? 'site' : 'sites'}
          </span>
        </div>

        {/* Compact site cards */}
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {sites.map((site, i) => {
              const vibeSkin      = site.manifest?.vibeSkin;
              const accentColor   = vibeSkin?.palette?.accent || site.manifest?.theme?.colors?.accent || '#A3B18A';
              const accentDark    = vibeSkin?.palette?.highlight || site.manifest?.theme?.colors?.muted || '#8FA876';
              const coverPhotoUrl = site.manifest?.chapters?.[0]?.images?.[0]?.url;
              const chapterPhotos = (site.manifest?.chapters ?? [])
                .flatMap(c => (c.images ?? []).slice(0, 1).map(img => img.url))
                .filter(Boolean)
                .slice(0, 5) as string[];
              const isDeleting    = deletingDomain === site.domain;
              const isCopied      = copiedId === site.id;
              const displayName   = getDisplayName(site);
              const weddingDate   = site.manifest?.logistics?.date || site.manifest?.events?.[0]?.date;
              const isLive        = !site.manifest?.comingSoon?.enabled;
              const occ           = OCCASION_BADGE[site.manifest?.occasion || ''];
              const daysLeft      = weddingDate ? daysUntil(weddingDate) : null;
              const showMilestone = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

              // Date display
              let dateDisplay: string | null = null;
              if (weddingDate) {
                try {
                  dateDisplay = parseLocalDate(weddingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                } catch { /* ignore */ }
              }

              return (
                <motion.article
                  key={site.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => onEditSite(site)}
                  className={cn(
                    'pl-site-card flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer',
                    'bg-white border border-[#E4E4E7]',
                    'transition-all duration-200',
                    'hover:border-[#18181B] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
                    'active:scale-[0.99]',
                  )}
                >
                  {/* Thumbnail */}
                  <SiteThumbnail
                    photos={chapterPhotos}
                    coverPhoto={coverPhotoUrl}
                    accentColor={accentColor}
                    accentDark={accentDark}
                    occasion={site.manifest?.occasion}
                    displayName={displayName}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {/* Row 1: Name + status badge */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[0.9rem] font-semibold text-[#18181B] truncate">
                        {displayName}
                      </span>
                      {isLive ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold tracking-wide uppercase bg-green-50 text-green-700 border border-green-200 flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Live
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Row 2: Occasion pill + date */}
                    <div className="flex items-center gap-2 text-[0.75rem] text-[var(--pl-muted)]">
                      {occ && <Badge variant={occ.variant} size="sm">{occ.label}</Badge>}
                      {dateDisplay && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {dateDisplay}
                        </span>
                      )}
                      {showMilestone && (
                        <span
                          className="pl-badge-pulse"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 8px',
                            borderRadius: '100px',
                            background: 'rgba(196,169,106,0.12)',
                            border: '1px solid rgba(196,169,106,0.25)',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            color: 'var(--pl-gold, #C4A96A)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {'\uD83C\uDF89'} {daysLeft === 0 ? 'Today!' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} to go!`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Overflow menu */}
                  <OverflowMenu
                    site={site}
                    onShare={handleCopyUrl}
                    onDelete={(s) => setConfirmDelete(s)}
                    isCopied={isCopied}
                    isDeleting={isDeleting}
                  />
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
        </>
      )}

      {/* Desktop floating nav removed — sidebar provides navigation */}

      {/* Delete Modal */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setDeleteError(null); }}
        maxWidth="max-w-[420px]"
      >
        <div className="text-center pt-2">
          <div className="w-14 h-14 rounded-lg bg-[#FEF2F2] flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={24} className="text-[#DC2626]" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-[#18181B]">
            Delete this site?
          </h3>
          <p className="text-[#71717A] leading-relaxed mb-6 text-[0.85rem]">
            <strong className="text-[#18181B]">{confirmDelete ? getDisplayName(confirmDelete) : ''}</strong> will be
            permanently removed and guests will lose access.
          </p>
          {deleteError && (
            <p className="text-[0.82rem] text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-left leading-snug">
              {deleteError}
            </p>
          )}
          <Separator className="mb-5" />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
            >
              Keep Site
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              loading={confirmDelete ? deletingDomain === confirmDelete.domain : false}
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Delete Forever
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
