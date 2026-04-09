'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

// ── Compact Thumbnail ────────────────────────────────────────

function SiteThumbnail({ photos, coverPhoto, accentColor, accentDark }: {
  photos: string[];
  coverPhoto?: string;
  accentColor: string;
  accentDark: string;
}) {
  const src = coverPhoto || photos[0];

  // proxy Google URLs
  const proxiedSrc = src?.includes('googleusercontent.com')
    ? `/api/photos/proxy?url=${encodeURIComponent(src)}&w=120&h=120`
    : src;

  if (!proxiedSrc) {
    return (
      <div
        className="w-[60px] h-[60px] rounded-2xl flex-shrink-0 flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)`,
        }}
      >
        <Globe size={20} className="text-white/60" />
      </div>
    );
  }

  return (
    <div className="w-[60px] h-[60px] rounded-2xl flex-shrink-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={proxiedSrc}
        alt=""
        className="w-full h-full object-cover"
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
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.5)',
      } as React.CSSProperties}
    >
      <div className="w-[60px] h-[60px] rounded-2xl skeleton flex-shrink-0" />
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        aria-label="More options"
      >
        <EllipsisVertical size={16} className="text-[var(--pl-muted)]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 z-50 min-w-[160px] rounded-xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 32px rgba(43,30,20,0.12), 0 2px 8px rgba(43,30,20,0.06)',
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
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Static helper for site URL (used in OverflowMenu) ────────

function getSiteUrlStatic(domain: string) {
  if (typeof window === 'undefined') return `https://${domain}.pearloom.com`;
  const { hostname, origin } = window.location;
  if (hostname === 'localhost') return `http://${domain}.localhost:3000`;
  if (hostname.includes('vercel.app')) return `${origin}/sites/${domain}`;
  return `https://${domain}.pearloom.com`;
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
  onManageGuests: (site: UserSite) => void;
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

export function UserSites({ onStartNew, onQuickStart, onOpenTemplates, onEditSite, onManageGuests, userName }: UserSitesProps) {
  const router = useRouter();
  const [sites, setSites]                   = useState<UserSite[]>([]);
  const [loading, setLoading]               = useState(true);
  const [fetchError, setFetchError]         = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<UserSite | null>(null);
  const [deleteError, setDeleteError]       = useState<string | null>(null);
  const [copiedId, setCopiedId]             = useState<string | null>(null);


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
      <div
        className="pl-enter rounded-2xl sm:rounded-[var(--pl-radius-xl)] bg-[var(--pl-cream)] px-5 py-6 sm:px-10 sm:py-10 mb-6 sm:mb-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 sm:gap-6 overflow-hidden relative"
      >
        <div>
          <p className="text-[0.68rem] font-bold tracking-[0.14em] uppercase text-[var(--pl-olive-deep)] mb-2">
            {getGreeting()}{userName ? `, ${userName}` : ''}
          </p>
          <h1 className="font-heading text-[clamp(1.6rem,3vw,2.4rem)] font-medium text-[var(--pl-ink-soft)] leading-tight">
            Your celebrations are
            <br />
            <em className="text-[var(--pl-olive-deep)]">looking beautiful.</em>
          </h1>
        </div>

        <Button
          variant="accent"
          size="md"
          onClick={onStartNew}
          icon={<Plus size={15} />}
          className="flex-shrink-0 shadow-[0_4px_20px_rgba(163,177,138,0.35)]"
        >
          New Site
        </Button>
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
            { icon: <Sparkles size={20} />, title: 'AI Story', action: onStartNew },
            { icon: <Image size={20} />, title: 'Upload Photos', action: () => { if (onStartNew) onStartNew(); } },
            { icon: <Globe size={20} />, title: 'From Template', action: onOpenTemplates || onQuickStart || onStartNew },
          ].map((card, i) => (
            <button
              key={card.title}
              onClick={card.action}
              className={cn(
                `pl-enter pl-enter-d${i + 1}`,
                'flex items-center gap-3 px-4 py-3 min-w-[140px] max-h-[80px]',
                'rounded-2xl border border-transparent',
                'hover:bg-white hover:border-[rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(43,30,20,0.06)]',
                'active:scale-[0.98] transition-all duration-200 cursor-pointer flex-shrink-0',
              )}
              style={{
                background: 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              } as React.CSSProperties}
            >
              <div className="w-10 h-10 rounded-xl border border-[var(--pl-divider)] flex items-center justify-center text-[var(--pl-muted)] flex-shrink-0">
                {card.icon}
              </div>
              <span className="font-heading italic text-[0.88rem] text-[var(--pl-ink-soft)] whitespace-nowrap">{card.title}</span>
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
        <Card variant="elevated" className="p-8 sm:p-16 text-center max-w-[480px] mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[var(--pl-plum-mist)] flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={28} className="text-[var(--pl-plum)]" />
          </div>
          <h3 className="font-heading text-2xl font-semibold italic mb-2 text-[var(--pl-ink-soft)]">
            Could not load sites
          </h3>
          <p className="text-[var(--pl-muted)] text-[0.88rem] mb-8 leading-relaxed">
            Check your connection and try again.
          </p>
          <Button variant="primary" size="md" onClick={loadSites} icon={<RefreshCw size={14} />}>
            Try Again
          </Button>
        </Card>

      ) : sites.length === 0 ? (
        <div className="max-w-[640px] mx-auto">
          {/* Hero empty state */}
          <div
            className="pl-enter flex flex-col items-center justify-center text-center py-20 px-8 rounded-[24px] mb-8"
            style={{
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 4px 24px rgba(43,30,20,0.04)',
            } as React.CSSProperties}
          >
            <div className="w-20 h-20 rounded-2xl bg-[var(--pl-olive-mist)] flex items-center justify-center mb-6">
              <PearIcon size={48} color="var(--pl-olive)" />
            </div>
            <h2 className="font-heading text-[clamp(2rem,5vw,2.8rem)] italic text-[var(--pl-ink-soft)] mb-3 tracking-tight leading-tight">
              Welcome to Pearloom!
            </h2>
            <p className="text-[var(--pl-muted)] max-w-[380px] leading-[1.7] text-[1rem] mb-10">
              Create your first celebration site in minutes
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Button variant="accent" size="lg" onClick={onStartNew} icon={<Sparkles size={15} />} className="shadow-[0_4px_20px_rgba(163,177,138,0.35)] min-w-[180px]">
                Start with AI
              </Button>
              <Button variant="secondary" size="lg" onClick={onOpenTemplates || onQuickStart || onStartNew} className="min-w-[180px]">
                Browse Templates
              </Button>
            </div>
          </div>

          {/* How it works — 3 steps */}
          <div
            className="pl-enter pl-enter-d2 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
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
                className="p-5 rounded-2xl text-center"
                style={{
                  background: 'rgba(255,255,255,0.4)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.5)',
                } as React.CSSProperties}
              >
                <div className="w-8 h-8 rounded-full bg-[var(--pl-olive-mist)] flex items-center justify-center mx-auto mb-3 text-[0.72rem] font-bold text-[var(--pl-olive-deep)]">
                  {step.num}
                </div>
                <h4 className="text-[0.82rem] font-semibold text-[var(--pl-ink)] mb-1">{step.title}</h4>
                <p className="text-[0.72rem] text-[var(--pl-muted)] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

      ) : (
        <>
        {/* Your Sites heading + count */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading italic text-[clamp(1.4rem,2.5vw,1.8rem)] text-[var(--pl-ink-soft)]">Your Sites</h2>
          <span className="text-[0.78rem] text-[var(--pl-muted)]">
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
                    'flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer',
                    'transition-all duration-200',
                    'hover:shadow-[0_8px_32px_rgba(43,30,20,0.08)] hover:-translate-y-0.5',
                    'active:scale-[0.99]',
                  )}
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.6)',
                    boxShadow: '0 2px 12px rgba(43,30,20,0.04)',
                  } as React.CSSProperties}
                >
                  {/* Thumbnail */}
                  <SiteThumbnail
                    photos={chapterPhotos}
                    coverPhoto={coverPhotoUrl}
                    accentColor={accentColor}
                    accentDark={accentDark}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {/* Row 1: Name + status badge */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-heading text-[0.95rem] font-semibold italic text-[var(--pl-ink-soft)] truncate">
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

      {/* ── Floating bottom nav (desktop only — mobile uses MobileBottomNav) ── */}
      {!loading && !fetchError && (
        <div className="hidden md:block fixed bottom-6 left-0 right-0 z-50 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 8px',
            borderRadius: '100px',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 4px 24px rgba(43,30,20,0.1), 0 1px 4px rgba(43,30,20,0.06)',
          } as React.CSSProperties}
        >
          <button
            onClick={onStartNew}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', borderRadius: '100px', border: 'none',
              background: 'var(--pl-olive-deep)', color: 'white',
              cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >
            <Plus size={14} /> New Site
          </button>
          {[
            { label: 'Templates', icon: <Globe size={14} />, onClick: onOpenTemplates || onQuickStart },
            { label: 'Marketplace', icon: <Sparkles size={14} />, onClick: () => window.location.href = '/marketplace' },
            { label: 'Gallery', icon: <Image size={14} />, onClick: () => window.location.href = '/dashboard/gallery' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '10px 14px', borderRadius: '100px', border: 'none',
                background: 'transparent', color: 'var(--pl-muted)',
                cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = 'var(--pl-ink)'; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = 'var(--pl-muted)'; }}
            >
              {item.icon} {item.label}
            </button>
          ))}
          </div>
        </motion.div>
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setDeleteError(null); }}
        maxWidth="max-w-[420px]"
      >
        <div className="text-center pt-2">
          <div className="w-16 h-16 rounded-2xl bg-[var(--pl-plum-mist)] flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={28} className="text-[var(--pl-plum)]" />
          </div>
          <h3 className="font-heading text-2xl font-semibold italic mb-3 text-[var(--pl-ink-soft)]">
            Delete this site?
          </h3>
          <p className="text-[var(--pl-muted)] leading-relaxed mb-6 text-[0.88rem]">
            <strong className="text-[var(--pl-ink)]">{confirmDelete ? getDisplayName(confirmDelete) : ''}</strong> will be
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
