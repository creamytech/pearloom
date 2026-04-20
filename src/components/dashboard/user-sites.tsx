'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Globe, ExternalLink, Calendar, Loader2, Image,
  Trash2, AlertTriangle, Check, Share2, RefreshCw, Sparkles,
  EllipsisVertical, Pin,
} from 'lucide-react';
import type { StoryManifest } from '@/types';
import { PearIcon } from '@/components/icons/PearloomIcons';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/cn';

import { parseLocalDate } from '@/lib/date';
import { buildSiteUrl } from '@/lib/site-urls';
import { BlurFade, GrooveBlob, MagneticHover } from '@/components/brand/groove';

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

// Relative time for the 'Edited X ago' metadata chip on each site row.
function relativeTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="flex items-center gap-5 px-5 py-4 rounded-[10px]"
      style={{
        background: 'var(--pl-cream-card)',
        border: '1px solid rgba(14,13,11,0.08)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.56rem',
          fontWeight: 700,
          letterSpacing: '0.22em',
          color: 'rgba(14,13,11,0.25)',
          minWidth: '28px',
        }}
      >
        № {String(index + 1).padStart(2, '0')}
      </span>
      <div className="w-[64px] h-[64px] rounded-[8px] skeleton flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-[18px] rounded-sm w-[60%] skeleton" />
        <div className="h-[10px] rounded-sm w-[32%] skeleton" />
      </div>
    </div>
  );
}

// ── Overflow menu ─────────────────────────────────────────────

function OverflowMenu({ site, onShare, onDelete, onTogglePin, isPinned, isCopied, isDeleting }: {
  site: UserSite;
  onShare: (site: UserSite, e: React.MouseEvent) => void;
  onDelete: (site: UserSite) => void;
  onTogglePin?: (site: UserSite) => void;
  isPinned?: boolean;
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

  const itemStyle: React.CSSProperties = {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '18px 1fr',
    alignItems: 'center',
    columnGap: '12px',
    padding: '11px 14px',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
  };

  const itemLabel: React.CSSProperties = {
    fontFamily: 'var(--pl-font-display)',
    fontStyle: 'italic',
    fontSize: '0.84rem',
    fontWeight: 500,
    color: 'var(--pl-ink)',
    lineHeight: 1.15,
  };

  const itemKicker: React.CSSProperties = {
    fontFamily: 'var(--pl-font-mono)',
    fontSize: '0.5rem',
    fontWeight: 700,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: 'rgba(14,13,11,0.45)',
    marginTop: '3px',
    display: 'block',
    lineHeight: 1,
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
        style={{ background: open ? 'var(--pl-olive-mist)' : 'transparent' }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'rgba(14,13,11,0.04)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
        aria-label="More options"
      >
        <EllipsisVertical size={16} style={{ color: 'var(--pl-ink-soft)' }} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={menuRef}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              top: menuPos.top,
              right: menuPos.right,
              zIndex: 'var(--z-max)',
              minWidth: '208px',
              borderRadius: 'var(--pl-radius-lg)',
              overflow: 'hidden',
              background: 'var(--pl-cream-card)',
              border: '1px solid rgba(14,13,11,0.10)',
              boxShadow: '0 2px 8px rgba(14,13,11,0.06), 0 18px 44px rgba(14,13,11,0.14), 0 0 0 3px rgba(184,147,90,0.08)',
            } as React.CSSProperties}
          >
            {/* Editorial menu header — gold hairline */}
            <div style={{
              padding: '9px 14px 8px',
              borderBottom: '1px solid rgba(184,147,90,0.32)',
              background: 'rgba(184,147,90,0.06)',
            }}>
              <span style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.48rem',
                fontWeight: 700,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'rgba(14,13,11,0.55)',
              }}>
                Site Actions
              </span>
            </div>

            {onTogglePin && (
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePin(site); setOpen(false); }}
                style={itemStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(14,13,11,0.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Pin
                  size={14}
                  style={{
                    color: isPinned ? 'var(--pl-gold)' : 'var(--pl-ink-soft)',
                    transform: isPinned ? 'rotate(45deg)' : 'none',
                  }}
                />
                <span>
                  <span style={itemLabel}>{isPinned ? 'Unpin site' : 'Pin to top'}</span>
                  <span style={itemKicker}>
                    {isPinned ? 'Drops back to recent order' : 'Keep at the top of your list'}
                  </span>
                </span>
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onShare(site, e); setOpen(false); }}
              style={itemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(14,13,11,0.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {isCopied
                ? <Check size={14} style={{ color: 'var(--pl-olive)' }} />
                : <Share2 size={14} style={{ color: 'var(--pl-ink-soft)' }} />}
              <span>
                <span style={itemLabel}>{isCopied ? 'Link copied' : 'Copy share link'}</span>
                <span style={itemKicker}>{isCopied ? 'Confirmed' : 'To clipboard'}</span>
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(getSiteUrlStatic(site.domain, site.manifest?.occasion), '_blank');
                setOpen(false);
              }}
              style={itemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(14,13,11,0.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <ExternalLink size={14} style={{ color: 'var(--pl-ink-soft)' }} />
              <span>
                <span style={itemLabel}>View live site</span>
                <span style={itemKicker}>Open in new tab</span>
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(site);
                setOpen(false);
              }}
              disabled={isDeleting}
              style={{
                ...itemStyle,
                borderTop: '1px solid rgba(14,13,11,0.07)',
                opacity: isDeleting ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!isDeleting) e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" style={{ color: '#b91c1c' }} /> : <Trash2 size={14} style={{ color: '#b91c1c' }} />}
              <span>
                <span style={{ ...itemLabel, color: '#b91c1c' }}>Delete site</span>
                <span style={itemKicker}>Permanent</span>
              </span>
            </button>
          </motion.div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Static helper for site URL (used in OverflowMenu) ────────

function getSiteUrlStatic(domain: string, occasion?: string) {
  return buildSiteUrl(domain, '', undefined, occasion);
}

// ── Types ──────────────────────────────────────────────────────

interface UserSite {
  id: string;
  domain: string;
  manifest: StoryManifest;
  created_at: string;
  updated_at?: string;
  published?: boolean;
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

const PIN_STORAGE_KEY = 'pearloom:pinned-sites';
function readPinned(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}
function writePinned(domains: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(domains));
  } catch {
    /* ignore */
  }
}

export function UserSites({ onStartNew, onQuickStart, onOpenTemplates, onEditSite, userName }: UserSitesProps) {
  const [sites, setSites]                   = useState<UserSite[]>([]);
  const [loading, setLoading]               = useState(true);
  const [fetchError, setFetchError]         = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<UserSite | null>(null);
  const [deleteError, setDeleteError]       = useState<string | null>(null);
  const [copiedId, setCopiedId]             = useState<string | null>(null);
  const [pinned, setPinned]                 = useState<string[]>([]);

  // Load pinned list on mount.
  useEffect(() => {
    setPinned(readPinned());
  }, []);

  const togglePin = useCallback((domain: string) => {
    setPinned((prev) => {
      const next = prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [domain, ...prev].slice(0, 8);
      writePinned(next);
      return next;
    });
  }, []);
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

  const getSiteUrl = (site: UserSite) => getSiteUrlStatic(site.domain, site.manifest?.occasion);

  const handleCopyUrl = async (site: UserSite, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getSiteUrl(site));
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
    <div
      className="w-full max-w-[1280px] mx-auto pb-24 md:pb-20"
      style={{ position: 'relative' }}
    >
      {/* Ambient groove blobs — faint warmth behind the page */}
      <GrooveBlob
        palette="sunrise"
        size={520}
        blur={80}
        opacity={0.3}
        style={{ position: 'absolute', top: '-120px', right: '-80px', zIndex: 0, pointerEvents: 'none' }}
      />
      <GrooveBlob
        palette="orchard"
        size={380}
        blur={70}
        opacity={0.22}
        style={{ position: 'absolute', top: '40%', left: '-80px', zIndex: 0, pointerEvents: 'none' }}
      />

      {/* ── Masthead — warm greeting, no folios, no mono caps ── */}
      <BlurFade>
      <div className="pl-enter mb-8 sm:mb-12" style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--pl-font-body)',
            fontSize: '0.92rem',
            fontWeight: 500,
            color: 'var(--pl-groove-terra)',
            marginBottom: 8,
          }}
        >
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5">
          <div style={{ maxWidth: '560px' }}>
            <h1 style={{
              fontFamily: 'var(--pl-font-body)',
              fontWeight: 700,
              fontSize: 'clamp(2rem, 4.2vw, 2.8rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--pl-groove-ink)',
              margin: 0,
            }}>
              Your celebrations
            </h1>
            <p style={{
              marginTop: '12px',
              fontFamily: 'var(--pl-font-body)',
              fontSize: '1rem',
              lineHeight: 1.55,
              color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
              maxWidth: '460px',
            }}>
              Open one to keep going, or start something new.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Pear usage — editorial dossier chip */}
            {pearUsage && (() => {
              const isUnlimited = pearUsage.plan !== 'free';
              const remaining = Math.max(0, pearUsage.limit - pearUsage.used);
              const tone = isUnlimited
                ? 'var(--pl-olive)'
                : pearUsage.used >= pearUsage.limit ? '#b91c1c'
                : pearUsage.used >= pearUsage.limit - 3 ? '#b45309'
                : 'var(--pl-olive)';
              return (
                <div style={{
                  display: 'flex', alignItems: 'stretch',
                  borderRadius: 'var(--pl-radius-md)',
                  border: '1px solid rgba(184,147,90,0.40)',
                  background: 'var(--pl-cream-card)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '6px 10px',
                    borderRight: '1px solid rgba(184,147,90,0.32)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(184,147,90,0.08)',
                  }}>
                    <Sparkles size={12} style={{ color: 'var(--pl-gold)' }} />
                  </div>
                  <div style={{ padding: '4px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'rgba(14,13,11,0.55)',
                      lineHeight: 1,
                    }}>Pear credits</span>
                    <span style={{
                      fontFamily: 'var(--pl-font-display)',
                      fontStyle: 'italic',
                      fontSize: '0.9rem',
                      color: tone,
                      lineHeight: 1.1,
                      marginTop: '2px',
                    }}>
                      {isUnlimited
                        ? '\u221E unlimited'
                        : `${remaining} of ${pearUsage.limit} left`}
                    </span>
                  </div>
                </div>
              );
            })()}
            <MagneticHover strength={0.25} radius={120}>
              <button
                onClick={onStartNew}
                aria-label="Begin a new site"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  padding: '14px 24px',
                  minHeight: 48,
                  borderRadius: 'var(--pl-groove-radius-pill)',
                  background: 'var(--pl-groove-blob-sunrise)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 6px 18px rgba(139,74,106,0.24), 0 2px 6px rgba(43,30,20,0.08)',
                  cursor: 'pointer',
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  letterSpacing: '-0.005em',
                  transition: 'box-shadow var(--pl-dur-fast) var(--pl-ease-out)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    '0 10px 28px rgba(139,74,106,0.34), 0 4px 10px rgba(43,30,20,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    '0 6px 18px rgba(139,74,106,0.24), 0 2px 6px rgba(43,30,20,0.08)';
                }}
              >
                <Plus size={18} strokeWidth={2.4} />
                Begin a new site
              </button>
            </MagneticHover>
          </div>
        </div>
      </div>
      </BlurFade>

      {/* ── Compose — numbered specimen cards ── */}
      {!loading && !fetchError && (
        <div className="mb-8 sm:mb-12">
          <div style={{
            marginBottom: '14px',
          }}>
            <h2 style={{
              margin: 0,
              fontFamily: 'var(--pl-font-body)',
              fontWeight: 700,
              fontSize: '1.2rem',
              color: 'var(--pl-groove-ink)',
              letterSpacing: '-0.01em',
            }}>
              Start something new
            </h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              {
                icon: <Sparkles size={18} strokeWidth={1.6} />,
                title: 'Let Pear handle it',
                kicker: 'Pear AI · guided',
                desc: 'Answer a few prompts — Pear composes colors, story, and layout for you.',
                action: onStartNew,
              },
              {
                icon: <Image size={18} strokeWidth={1.6} />,
                title: 'Upload photos',
                kicker: 'From your reel',
                desc: 'Start with the pictures you love; we build chapters around them.',
                action: () => { if (onStartNew) onStartNew(); },
              },
              {
                icon: <Globe size={18} strokeWidth={1.6} />,
                title: 'From template',
                kicker: 'Hand-set layouts',
                desc: 'Pick a pre-designed motif — editorial, archival, romantic, spare.',
                action: onOpenTemplates || onQuickStart || onStartNew,
              },
            ].map((card, i) => {
              const isPrimary = i === 0;
              return (
              <motion.button
                key={card.title}
                onClick={card.action}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className={cn(`pl-enter pl-enter-d${i + 1}`, isPrimary && 'pl-pearl-border')}
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  gap: '12px',
                  padding: '24px 22px 22px',
                  minHeight: isPrimary ? 220 : 200,
                  borderRadius: 'var(--pl-radius-lg)',
                  background: isPrimary
                    ? 'linear-gradient(135deg, var(--pl-cream-card) 0%, color-mix(in oklab, var(--pl-olive) 8%, var(--pl-cream-card)) 100%)'
                    : 'var(--pl-cream-card)',
                  border: isPrimary
                    ? '1.5px solid color-mix(in oklab, var(--pl-olive) 45%, transparent)'
                    : '1px solid rgba(14,13,11,0.09)',
                  boxShadow: isPrimary
                    ? '0 2px 10px rgba(14,13,11,0.05), 0 0 0 3px color-mix(in oklab, var(--pl-gold) 18%, transparent)'
                    : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  overflow: 'hidden',
                  transition: 'border-color 0.18s, box-shadow 0.24s cubic-bezier(0.22,1,0.36,1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(184,147,90,0.55)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(14,13,11,0.04), 0 14px 36px rgba(14,13,11,0.10), 0 0 0 3px rgba(184,147,90,0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isPrimary
                    ? 'color-mix(in oklab, var(--pl-olive) 45%, transparent)'
                    : 'rgba(14,13,11,0.09)';
                  e.currentTarget.style.boxShadow = isPrimary
                    ? '0 2px 10px rgba(14,13,11,0.05), 0 0 0 3px color-mix(in oklab, var(--pl-gold) 18%, transparent)'
                    : 'none';
                }}
              >
                {/* Gold hairline at top */}
                <span style={{
                  position: 'absolute', top: 0, left: '16px', right: '16px',
                  height: '1px', background: 'rgba(184,147,90,0.45)',
                }} />

                {/* Recommended ribbon for the primary card */}
                {isPrimary && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-olive)',
                      background: 'var(--pl-cream)',
                      border: '1px solid color-mix(in oklab, var(--pl-olive) 40%, transparent)',
                      padding: '3px 10px',
                      borderRadius: 'var(--pl-radius-full)',
                    }}
                  >
                    Recommended
                  </span>
                )}

                {/* Big warm icon in a blob-ish circle, no folio */}
                <div style={{
                  width: '56px', height: '56px',
                  borderRadius: isPrimary
                    ? 'var(--pl-groove-radius-blob)'
                    : '50%',
                  background: isPrimary
                    ? 'var(--pl-groove-blob-sunrise)'
                    : 'color-mix(in oklab, var(--pl-groove-butter) 28%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isPrimary ? '#fff' : 'var(--pl-groove-ink)',
                  boxShadow: isPrimary
                    ? '0 6px 18px rgba(139,74,106,0.22)'
                    : 'none',
                }}>
                  {card.icon}
                </div>

                {/* Title — sentence-case sans, no italic, warm */}
                <h3 style={{
                  fontFamily: 'var(--pl-font-body)',
                  fontWeight: 700,
                  fontSize: isPrimary ? '1.4rem' : '1.15rem',
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                  color: 'var(--pl-groove-ink)',
                  margin: 0,
                }}>
                  {card.title}
                </h3>

                {/* Description — no mono uppercase kicker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  <p style={{
                    fontFamily: 'var(--pl-font-body)',
                    fontSize: '0.92rem',
                    lineHeight: 1.5,
                    color: 'var(--pl-ink-soft)',
                    margin: 0,
                  }}>
                    {card.desc}
                  </p>
                </div>
              </motion.button>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} index={i} />)}
        </div>

      ) : fetchError ? (
        <div
          className="mx-auto text-center"
          style={{
            maxWidth: '520px',
            padding: '48px 32px',
            borderRadius: 'var(--pl-radius-xl)',
            background: 'var(--pl-cream-card)',
            border: '1px solid rgba(14,13,11,0.10)',
            boxShadow: '0 2px 8px rgba(14,13,11,0.04), 0 18px 44px rgba(14,13,11,0.08)',
            position: 'relative',
          }}
        >
          <span style={{
            position: 'absolute', top: '1px', left: '20%', right: '20%',
            height: '1px', background: 'rgba(184,147,90,0.55)',
          }} />
          <span style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.52rem', fontWeight: 700,
            letterSpacing: '0.32em', textTransform: 'uppercase',
            color: '#b91c1c', display: 'block', marginBottom: '16px',
          }}>
            Couldn&rsquo;t load your sites
          </span>
          <div style={{
            width: '56px', height: '56px',
            borderRadius: '50%',
            border: '1px solid rgba(220,38,38,0.35)',
            background: 'rgba(220,38,38,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <AlertTriangle size={22} style={{ color: '#b91c1c' }} />
          </div>
          <h3 style={{
            fontFamily: 'var(--pl-font-display)',
            fontStyle: 'italic', fontWeight: 400,
            fontSize: '1.7rem', lineHeight: 1.1,
            color: 'var(--pl-ink)', margin: '0 0 10px',
          }}>
            Something went astray
          </h3>
          <p style={{
            fontFamily: 'var(--pl-font-body)',
            fontSize: '0.82rem', lineHeight: 1.55,
            color: 'var(--pl-ink-soft)',
            maxWidth: '340px', margin: '0 auto 24px',
          }}>
            We couldn&apos;t load your sites. Check your connection, then try the press again.
          </p>
          <Button variant="primary" size="md" onClick={loadSites} icon={<RefreshCw size={14} />}>
            Try Again
          </Button>
        </div>

      ) : sites.length === 0 ? (
        <div className="max-w-[680px] mx-auto">
          {/* Hero — dashed gold frame empty state */}
          <div
            className="pl-enter"
            style={{
              position: 'relative',
              padding: '56px 40px 48px',
              borderRadius: 'var(--pl-radius-xl)',
              background: 'var(--pl-cream-card)',
              border: '1px dashed rgba(184,147,90,0.55)',
              marginBottom: '20px',
              textAlign: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Corner folio marks */}
            <span style={{ position: 'absolute', top: '12px', left: '16px', fontFamily: 'var(--pl-font-mono)', fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--pl-olive)' }}>
              Prologue
            </span>
            <span style={{ position: 'absolute', top: '12px', right: '16px', fontFamily: 'var(--pl-font-mono)', fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(14,13,11,0.40)' }}>
              № 00
            </span>

            <div style={{
              width: '72px', height: '72px',
              borderRadius: '50%',
              border: '1px solid rgba(184,147,90,0.55)',
              background: 'rgba(184,147,90,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 0 6px rgba(184,147,90,0.06)',
            }}>
              <PearIcon size={40} color="var(--pl-ink)" />
            </div>

            <h2 style={{
              fontFamily: 'var(--pl-font-display)',
              fontStyle: 'italic', fontWeight: 400,
              fontSize: 'clamp(2rem, 5vw, 2.8rem)',
              lineHeight: 1.02,
              color: 'var(--pl-ink)',
              margin: '0 0 12px',
            }}>
              Welcome to Pearloom
            </h2>
            <p style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.88rem', lineHeight: 1.6,
              color: 'var(--pl-ink-soft)',
              maxWidth: '400px', margin: '0 auto 28px',
            }}>
              Compose your first celebration site — in minutes, with an editor that feels like setting a page.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={onStartNew}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '11px 22px',
                  borderRadius: 'var(--pl-radius-md)',
                  background: 'var(--pl-ink)',
                  color: 'var(--pl-cream)',
                  border: '1px solid var(--pl-ink)',
                  boxShadow: '0 0 0 3px rgba(184,147,90,0.18)',
                  cursor: 'pointer',
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  minWidth: '190px', justifyContent: 'center',
                }}
              >
                <Sparkles size={14} /> Begin with Pear
              </button>
              <button
                onClick={onOpenTemplates || onQuickStart || onStartNew}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '11px 22px',
                  borderRadius: 'var(--pl-radius-md)',
                  background: 'transparent',
                  color: 'var(--pl-ink)',
                  border: '1px solid rgba(14,13,11,0.22)',
                  cursor: 'pointer',
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  minWidth: '190px', justifyContent: 'center',
                }}
              >
                Browse templates
              </button>
            </div>
          </div>

          {/* Three-act story — how it works */}
          <div style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.5rem', fontWeight: 700,
                letterSpacing: '0.30em', textTransform: 'uppercase',
                color: 'rgba(14,13,11,0.55)',
              }}>
                In three acts
              </span>
              <span style={{ flex: 1, height: '1px', background: 'rgba(14,13,11,0.08)' }} />
            </div>
            <div className="pl-enter pl-enter-d2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { num: 'I',   title: 'Add photos',      desc: 'Pull from Google Photos or upload — the moments that matter most.' },
                { num: 'II',  title: 'Set the vibe',    desc: 'Describe the feeling; Pear composes color, type, and layout around it.' },
                { num: 'III', title: 'Share your link', desc: 'A printable-feeling URL for guests. Edit freely, whenever.' },
              ].map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: 'relative',
                    padding: '20px 18px 18px',
                    borderRadius: 'var(--pl-radius-lg)',
                    background: 'var(--pl-cream-card)',
                    border: '1px solid rgba(14,13,11,0.08)',
                  }}
                >
                  <span style={{ position: 'absolute', top: 0, left: '14px', right: '14px', height: '1px', background: 'rgba(184,147,90,0.40)' }} />
                  <span style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontStyle: 'italic', fontWeight: 400,
                    fontSize: '1.25rem',
                    color: 'var(--pl-gold)',
                    lineHeight: 1,
                    display: 'block',
                    marginBottom: '10px',
                  }}>
                    Act {step.num}
                  </span>
                  <h4 style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontStyle: 'italic', fontWeight: 500,
                    fontSize: '1.05rem', lineHeight: 1.15,
                    color: 'var(--pl-ink)',
                    margin: '0 0 6px',
                  }}>
                    {step.title}
                  </h4>
                  <p style={{
                    fontFamily: 'var(--pl-font-body)',
                    fontSize: '0.74rem', lineHeight: 1.55,
                    color: 'var(--pl-ink-soft)',
                    margin: 0,
                  }}>
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

      ) : (
        <>
        {/* Section eyebrow — "The Index" */}
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: '12px', marginBottom: '16px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(184,147,90,0.40)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
            <span style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.52rem', fontWeight: 700,
              letterSpacing: '0.32em', textTransform: 'uppercase',
              color: 'var(--pl-olive)',
            }}>
              The Index
            </span>
            <h2 style={{
              fontFamily: 'var(--pl-font-display)',
              fontStyle: 'italic', fontWeight: 400,
              fontSize: '1.15rem', lineHeight: 1,
              color: 'var(--pl-ink)', margin: 0,
            }}>
              your sites
            </h2>
          </div>
          <span style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.52rem', fontWeight: 700,
            letterSpacing: '0.26em', textTransform: 'uppercase',
            color: 'rgba(14,13,11,0.50)',
          }}>
            {sites.length} {sites.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Periodical entry rows */}
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {[...sites]
              .sort((a, b) => {
                const ap = pinned.includes(a.domain) ? 0 : 1;
                const bp = pinned.includes(b.domain) ? 0 : 1;
                return ap - bp;
              })
              .map((site, i) => {
              const vibeSkin      = site.manifest?.vibeSkin;
              const accentColor   = vibeSkin?.palette?.accent || site.manifest?.theme?.colors?.accent || '#5C6B3F';
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
              // Draft vs live state for the metadata strip.
              const isPublished   = site.published === true;
              const isPinned      = pinned.includes(site.domain);
              // Relative 'last edited' — pulls updated_at from supabase if
              // present, falls back silently.
              const lastEditedAt  = site.updated_at || site.created_at;
              const lastEditedRel = relativeTime(lastEditedAt);

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
                  transition={{ duration: 0.32, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => onEditSite(site)}
                  style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: '36px 72px 1fr auto',
                    alignItems: 'center',
                    columnGap: '18px',
                    padding: '16px 18px',
                    borderRadius: 'var(--pl-radius-lg)',
                    background: 'var(--pl-cream-card)',
                    border: '1px solid rgba(14,13,11,0.08)',
                    cursor: 'pointer',
                    transition: 'border-color 0.18s, box-shadow 0.24s cubic-bezier(0.22,1,0.36,1), transform 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(184,147,90,0.50)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(14,13,11,0.04), 0 12px 32px rgba(14,13,11,0.08), 0 0 0 3px rgba(184,147,90,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(14,13,11,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Site number / pinned badge */}
                  <span style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    color: isPinned ? 'var(--pl-gold)' : 'var(--pl-olive)',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    {isPinned ? (
                      <Pin size={10} strokeWidth={2.4} style={{ transform: 'rotate(45deg)' }} />
                    ) : null}
                    {String(i + 1).padStart(2, '0')}
                  </span>

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
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {/* Row 1: Name — Fraunces italic */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <span style={{
                        fontFamily: 'var(--pl-font-display)',
                        fontStyle: 'italic',
                        fontWeight: 400,
                        fontSize: '1.28rem',
                        lineHeight: 1.05,
                        color: 'var(--pl-ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {displayName}
                      </span>
                      {/* Status pill — minimal editorial */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '3px 9px 3px 8px',
                        borderRadius: 'var(--pl-radius-xs)',
                        background: isLive ? 'rgba(92,107,63,0.08)' : 'rgba(184,147,90,0.10)',
                        border: isLive ? '1px solid rgba(92,107,63,0.30)' : '1px solid rgba(184,147,90,0.35)',
                        fontFamily: 'var(--pl-font-mono)',
                        fontSize: '0.48rem',
                        fontWeight: 700,
                        letterSpacing: '0.24em',
                        textTransform: 'uppercase',
                        color: isLive ? 'var(--pl-olive)' : 'var(--pl-gold)',
                        flexShrink: 0,
                      }}>
                        <span style={{
                          width: '5px', height: '5px',
                          borderRadius: '50%',
                          background: isLive ? 'var(--pl-olive)' : 'var(--pl-gold)',
                        }} />
                        {isLive ? 'In print' : 'Draft'}
                      </span>
                    </div>

                    {/* Row 2: Metadata strip — mono, separated by pipe hairlines */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.52rem',
                      fontWeight: 600,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'rgba(14,13,11,0.55)',
                    }}>
                      {occ && (
                        <>
                          <span>{occ.label}</span>
                          <span style={{ color: 'rgba(184,147,90,0.55)' }}>·</span>
                        </>
                      )}
                      {dateDisplay && (
                        <>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <Calendar size={9} strokeWidth={1.8} />
                            {dateDisplay}
                          </span>
                          <span style={{ color: 'rgba(184,147,90,0.55)' }}>·</span>
                        </>
                      )}
                      <span style={{ color: 'rgba(14,13,11,0.40)', textTransform: 'lowercase', letterSpacing: '0.08em' }}>
                        {site.domain}
                      </span>
                      <span style={{ color: 'rgba(184,147,90,0.55)' }}>·</span>
                      <span
                        aria-label={isPublished ? 'Published' : 'Draft'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '2px 7px',
                          borderRadius: 3,
                          background: isPublished
                            ? 'color-mix(in oklab, var(--pl-olive) 14%, transparent)'
                            : 'color-mix(in oklab, var(--pl-gold) 14%, transparent)',
                          border: `1px solid color-mix(in oklab, ${isPublished ? 'var(--pl-olive)' : 'var(--pl-gold)'} 32%, transparent)`,
                          color: isPublished ? 'var(--pl-olive)' : 'var(--pl-gold)',
                          fontFamily: 'var(--pl-font-mono)',
                          fontSize: '0.5rem',
                          letterSpacing: '0.22em',
                          fontWeight: 700,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: isPublished ? 'var(--pl-olive)' : 'var(--pl-gold)',
                          }}
                        />
                        {isPublished ? 'Live' : 'Draft'}
                      </span>
                      {lastEditedRel && (
                        <>
                          <span style={{ color: 'rgba(184,147,90,0.55)' }}>·</span>
                          <span style={{ color: 'rgba(14,13,11,0.52)' }}>
                            Edited {lastEditedRel}
                          </span>
                        </>
                      )}
                      {showMilestone && (
                        <span
                          className="pl-badge-pulse"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '2px 8px',
                            borderRadius: 'var(--pl-radius-xs)',
                            background: 'rgba(184,147,90,0.12)',
                            border: '1px solid rgba(184,147,90,0.38)',
                            fontFamily: 'var(--pl-font-mono)',
                            fontSize: '0.5rem',
                            fontWeight: 700,
                            letterSpacing: '0.22em',
                            color: 'var(--pl-gold)',
                            marginLeft: '4px',
                          }}
                        >
                          ✦ {daysLeft === 0 ? 'Today' : `${daysLeft}d to go`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Overflow menu */}
                  <OverflowMenu
                    site={site}
                    onShare={handleCopyUrl}
                    onDelete={(s) => setConfirmDelete(s)}
                    onTogglePin={(s) => togglePin(s.domain)}
                    isPinned={pinned.includes(site.domain)}
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

      {/* Delete Modal — editorial confirmation */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setDeleteError(null); }}
        maxWidth="max-w-[440px]"
      >
        <div style={{ position: 'relative', textAlign: 'center', paddingTop: '6px' }}>
          <span style={{
            position: 'absolute', top: '-18px', left: '18%', right: '18%',
            height: '1px', background: 'rgba(184,147,90,0.55)',
          }} />
          <span style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.5rem', fontWeight: 700,
            letterSpacing: '0.32em', textTransform: 'uppercase',
            color: '#b91c1c', display: 'block', marginBottom: '16px',
          }}>
            Retire · irreversible
          </span>
          <div style={{
            width: '58px', height: '58px',
            borderRadius: '50%',
            border: '1px solid rgba(220,38,38,0.32)',
            background: 'rgba(220,38,38,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <AlertTriangle size={22} style={{ color: '#b91c1c' }} />
          </div>
          <h3 style={{
            fontFamily: 'var(--pl-font-display)',
            fontStyle: 'italic', fontWeight: 400,
            fontSize: '1.7rem', lineHeight: 1.1,
            color: 'var(--pl-ink)', margin: '0 0 10px',
          }}>
            Retire this site?
          </h3>
          <p style={{
            fontFamily: 'var(--pl-font-body)',
            fontSize: '0.82rem', lineHeight: 1.55,
            color: 'var(--pl-ink-soft)',
            margin: '0 auto 22px',
            maxWidth: '340px',
          }}>
            <span style={{
              fontFamily: 'var(--pl-font-display)',
              fontStyle: 'italic',
              color: 'var(--pl-ink)',
            }}>
              {confirmDelete ? getDisplayName(confirmDelete) : ''}
            </span>{' '}
            will be permanently removed. Guests will lose access to the page.
          </p>
          {deleteError && (
            <p style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.78rem', lineHeight: 1.5,
              color: '#b91c1c',
              background: 'rgba(220,38,38,0.06)',
              border: '1px solid rgba(220,38,38,0.28)',
              borderRadius: 'var(--pl-radius-md)',
              padding: '10px 14px',
              margin: '0 0 18px',
              textAlign: 'left',
            }}>
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
              Keep site
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              loading={confirmDelete ? deletingDomain === confirmDelete.domain : false}
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Delete forever
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
