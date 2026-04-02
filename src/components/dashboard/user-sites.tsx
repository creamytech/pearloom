'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Globe, Pencil, ExternalLink, Calendar, Loader2,
  Trash2, AlertTriangle, Users, Check, Share2, RefreshCw, Sparkles,
  TrendingUp, Clock, BarChart2,
} from 'lucide-react';
import type { StoryManifest } from '@/types';
import { PearIcon } from '@/components/icons/PearloomIcons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardFooter } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/cn';

import { SiteCompletenessPanel } from '@/components/dashboard/SiteCompletenessPanel';
import { parseLocalDate } from '@/lib/date';

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

// ── Aggregate stats bar ────────────────────────────────────────

interface AggregateStats {
  totalViews: number;
  totalAttending: number;
  upcomingEvents: number;
}

function useAggregateStats(sites: UserSite[]): AggregateStats {
  const totalViews = sites.reduce((sum, s) => sum + (s.manifest?.analytics?.views ?? 0), 0);
  const upcomingEvents = sites.filter(s => {
    const d = s.manifest?.logistics?.date || s.manifest?.events?.[0]?.date;
    if (!d) return false;
    const days = daysUntil(d);
    return days !== null && days >= 0;
  }).length;
  // attendingCount stored in manifest if available
  const totalAttending = sites.reduce((sum, s) => {
    const count = (s.manifest as unknown as { attendingCount?: number }).attendingCount;
    return sum + (count ?? 0);
  }, 0);
  return { totalViews, totalAttending, upcomingEvents };
}

function StatsBar({ stats }: { stats: AggregateStats }) {
  if (stats.totalViews === 0 && stats.totalAttending === 0 && stats.upcomingEvents === 0) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap mb-8">
      {stats.totalViews > 0 && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-[var(--pl-radius-md)] bg-white border border-[var(--pl-divider)] shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <BarChart2 size={13} className="text-[var(--pl-olive)]" />
          <span className="text-[0.85rem] font-semibold text-[var(--pl-ink)]">{stats.totalViews.toLocaleString()}</span>
          <span className="text-[0.72rem] text-[var(--pl-muted)]">total views</span>
        </div>
      )}
      {stats.totalAttending > 0 && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-[var(--pl-radius-md)] bg-white border border-[var(--pl-divider)] shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <Users size={13} className="text-[var(--pl-olive)]" />
          <span className="text-[0.85rem] font-semibold text-[var(--pl-ink)]">{stats.totalAttending}</span>
          <span className="text-[0.72rem] text-[var(--pl-muted)]">attending</span>
        </div>
      )}
      {stats.upcomingEvents > 0 && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-[var(--pl-radius-md)] bg-white border border-[var(--pl-divider)] shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <Calendar size={13} className="text-[var(--pl-olive)]" />
          <span className="text-[0.85rem] font-semibold text-[var(--pl-ink)]">{stats.upcomingEvents}</span>
          <span className="text-[0.72rem] text-[var(--pl-muted)]">upcoming</span>
        </div>
      )}
    </div>
  );
}

// ── Per-card RSVP count (lazy-loaded) ─────────────────────────

function RsvpChip({ siteId }: { siteId: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    fetch(`/api/guests?siteId=${encodeURIComponent(siteId)}`)
      .then(r => r.ok ? r.json() : { guests: [] })
      .then(({ guests = [] }) => {
        setCount((guests as { status: string }[]).filter(g => g.status === 'attending').length);
      })
      .catch(() => null);
  }, [siteId]);
  if (count === null || count === 0) return null;
  return (
    <div className="flex items-center gap-1 text-[0.68rem] text-[var(--pl-muted)]">
      <Users size={9} />
      <span className="font-semibold text-[var(--pl-ink-soft)]">{count}</span>
      <span>attending</span>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-[var(--pl-radius-lg)] overflow-hidden border border-[rgba(0,0,0,0.07)] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <div className="h-56 skeleton" />
      <div className="p-6 flex flex-col gap-3 bg-white">
        <div className="h-4 rounded-full w-[55%] skeleton" />
        <div className="h-3 rounded-full w-[30%] skeleton" />
        <div className="flex gap-2 mt-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 flex-1 rounded-lg skeleton" />)}
        </div>
      </div>
    </div>
  );
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

export function UserSites({ onStartNew, onEditSite, onManageGuests, userName }: UserSitesProps) {
  const router = useRouter();
  const goToEditor = (site: UserSite) => router.push(`/editor/${site.domain}`);
  const [sites, setSites]                   = useState<UserSite[]>([]);
  const [loading, setLoading]               = useState(true);
  const [fetchError, setFetchError]         = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<UserSite | null>(null);
  const [deleteError, setDeleteError]       = useState<string | null>(null);
  const [copiedId, setCopiedId]             = useState<string | null>(null);
  const [expandedCompleteness, setExpandedCompleteness] = useState<string | null>(null);

  const loadSites = () => {
    setFetchError(false);
    setLoading(true);
    fetch('/api/sites')
      .then((r) => r.json())
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

  const getSiteUrl = (domain: string) => {
    if (typeof window === 'undefined') return `https://${domain}.pearloom.com`;
    const { hostname, origin } = window.location;
    if (hostname === 'localhost') return `http://${domain}.localhost:3000`;
    if (hostname.includes('vercel.app')) return `${origin}/sites/${domain}`;
    return `https://${domain}.pearloom.com`;
  };

  const handleCopyUrl = async (site: UserSite, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getSiteUrl(site.domain));
      setCopiedId(site.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* silent */ }
  };

  const getFormattedDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const aggStats = useAggregateStats(sites);

  return (
    <div className="w-full max-w-[1280px] mx-auto">

      {/* ── Header band ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[var(--pl-radius-xl)] bg-[var(--pl-ink)] px-10 py-10 mb-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 overflow-hidden relative"
      >
        {/* Decorative arc */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-white/[0.05] pointer-events-none" />
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full border border-[var(--pl-gold)]/10 pointer-events-none" />

        <div>
          <p className="text-[0.72rem] font-bold tracking-[0.18em] uppercase text-[var(--pl-gold)] mb-2">
            Dashboard
          </p>
          <h1 className="font-heading text-[clamp(1.6rem,3vw,2.2rem)] font-semibold italic text-white leading-tight">
            {getGreeting()}{userName ? `, ${userName}` : ''}
          </h1>
          <p className="text-[var(--pl-dark-text)] text-[0.88rem] mt-1">
            {sites.length > 0
              ? `You have ${sites.length} celebration site${sites.length !== 1 ? 's' : ''}`
              : 'Build your first celebration site today'}
          </p>
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
      </motion.div>

      {/* ── Aggregate stats bar ── */}
      {!loading && !fetchError && sites.length > 0 && <StatsBar stats={aggStats} />}

      {/* ── Loading ── */}
      {loading ? (
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>

      ) : fetchError ? (
        <Card variant="elevated" className="p-16 text-center max-w-[480px] mx-auto">
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
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center justify-center text-center py-28 px-8 rounded-[var(--pl-radius-xl)] border-2 border-dashed border-[var(--pl-divider)] max-w-[560px] mx-auto"
        >
          <div className="w-20 h-20 rounded-2xl bg-[var(--pl-olive-mist)] flex items-center justify-center mb-8">
            <PearIcon size={48} color="var(--pl-olive)" />
          </div>
          <h3 className="font-heading text-[clamp(1.8rem,4vw,2.5rem)] font-semibold italic text-[var(--pl-ink-soft)] mb-3 tracking-tight leading-tight">
            Start your story
          </h3>
          <div className="w-12 h-[2px] bg-[var(--pl-gold)] mx-auto mb-5 rounded-full" />
          <p className="text-[var(--pl-muted)] max-w-[320px] leading-[1.8] text-[0.95rem] mb-10">
            Build a stunning celebration website in minutes — AI-powered and completely yours.
          </p>
          <Button variant="accent" size="lg" onClick={onStartNew} icon={<Sparkles size={15} />}>
            Create Your First Site
          </Button>
        </motion.div>

      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          <AnimatePresence>
            {sites.map((site, i) => {
              const vibeSkin      = site.manifest?.vibeSkin;
              const accentColor   = vibeSkin?.palette?.accent || site.manifest?.theme?.colors?.accent || '#A3B18A';
              const accentDark    = vibeSkin?.palette?.highlight || site.manifest?.theme?.colors?.muted || '#8FA876';
              const coverPhotoUrl = site.manifest?.chapters?.[0]?.images?.[0]?.url;
              const isDeleting    = deletingDomain === site.domain;
              const isCopied      = copiedId === site.id;
              const displayNames  = (site.names || ['', '']).map((n) => n.charAt(0).toUpperCase() + n.slice(1)).join(' & ');
              const weddingDate   = site.manifest?.logistics?.date || site.manifest?.events?.[0]?.date;
              const isLive        = !site.manifest?.comingSoon?.enabled;
              const occ           = OCCASION_BADGE[site.manifest?.occasion || ''];

              return (
                <motion.article
                  key={site.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  exit={{ opacity: 0, scale: 0.93 }}
                  className="rounded-[var(--pl-radius-lg)] overflow-hidden border border-[rgba(0,0,0,0.07)] shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.05)] bg-white group transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 flex flex-col"
                >
                  {/* Cover — taller, more editorial */}
                  <div
                    onClick={() => goToEditor(site)}
                    className="h-56 relative overflow-hidden cursor-pointer flex-shrink-0"
                    style={{ background: `linear-gradient(150deg, ${accentColor} 0%, ${accentDark} 100%)` }}
                  >
                    {coverPhotoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverPhotoUrl}
                        alt=""
                        role="presentation"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                    )}
                    {!coverPhotoUrl && (
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 40%)',
                        }}
                      />
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.65) 100%)' }} />

                    {/* Top row */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                      {isLive ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm text-[0.6rem] font-bold text-white tracking-widest uppercase border border-white/15">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
                          Live
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm text-[0.6rem] font-bold text-white/80 tracking-widest uppercase border border-white/15">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Draft
                        </span>
                      )}
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm text-[0.6rem] font-bold text-white/80 border border-white/15">
                        <Globe size={8} />
                        {site.domain}
                      </span>
                    </div>

                    {/* Names — big and centered at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div
                        className="font-heading text-[1.55rem] font-semibold italic text-white leading-tight mb-1"
                        style={{ textShadow: '0 2px 24px rgba(0,0,0,0.5), 0 1px 6px rgba(0,0,0,0.3)' }}
                      >
                        {displayNames}
                      </div>
                      {weddingDate && (
                        <div className="flex items-center gap-1.5 text-white/65 text-[0.65rem] tracking-[0.1em] uppercase font-semibold">
                          <Calendar size={9} />
                          {parseLocalDate(weddingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 flex flex-col p-5 gap-4">
                    {/* Meta row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {occ && <Badge variant={occ.variant} size="sm">{occ.label}</Badge>}
                        <code className="text-[0.6rem] bg-[rgba(0,0,0,0.04)] border border-[var(--pl-divider)] px-1.5 py-0.5 rounded font-mono text-[var(--pl-muted)] truncate max-w-[120px]">
                          {site.domain}.pearloom.com
                        </code>
                      </div>
                      <span className="text-[0.68rem] text-[var(--pl-muted)] flex-shrink-0">
                        {getFormattedDate(site.created_at)}
                      </span>
                    </div>

                    {/* Stats row: views + RSVP + countdown */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {site.manifest?.analytics?.views != null && site.manifest.analytics.views > 0 && (
                        <div className="flex items-center gap-1 text-[0.68rem] text-[var(--pl-muted)]">
                          <TrendingUp size={9} />
                          <span className="font-semibold text-[var(--pl-ink-soft)]">{site.manifest.analytics.views.toLocaleString()}</span>
                          <span>views</span>
                        </div>
                      )}
                      <RsvpChip siteId={site.domain} />
                      {(() => {
                        const days = weddingDate ? daysUntil(weddingDate) : null;
                        if (days === null) return null;
                        if (days < 0) return (
                          <div className="flex items-center gap-1 text-[0.68rem] text-[var(--pl-muted)]">
                            <Clock size={9} />
                            <span>{Math.abs(days)}d ago</span>
                          </div>
                        );
                        if (days === 0) return (
                          <div className="flex items-center gap-1 text-[0.68rem] font-bold text-[var(--pl-olive)]">
                            <Calendar size={9} />
                            <span>Today!</span>
                          </div>
                        );
                        return (
                          <div className={cn(
                            'flex items-center gap-1 text-[0.68rem]',
                            days <= 30 ? 'text-[var(--pl-olive)] font-semibold' : 'text-[var(--pl-muted)]',
                          )}>
                            <Calendar size={9} />
                            <span>{days}d to go</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Completeness */}
                    {site.manifest && (
                      <div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedCompleteness((p) => p === site.id ? null : site.id); }}
                          className="w-full bg-transparent border-0 cursor-pointer p-0 text-left"
                        >
                          <SiteCompletenessPanel
                            manifest={site.manifest}
                            coupleNames={(site.names || ['', '']) as [string, string]}
                            compact
                          />
                        </button>
                        <AnimatePresence>
                          {expandedCompleteness === site.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden mt-2"
                            >
                              <SiteCompletenessPanel
                                manifest={site.manifest}
                                coupleNames={(site.names || ['', '']) as [string, string]}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Footer action bar */}
                  <CardFooter className="border-t border-[rgba(0,0,0,0.06)] bg-[var(--pl-cream)] px-4 py-3 gap-2">
                    <Button
                      variant="accent"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); onEditSite(site); }}
                      icon={<Pencil size={11} />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className={cn('flex-1', isCopied && 'bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)]')}
                      onClick={(e) => handleCopyUrl(site, e)}
                      icon={isCopied ? <Check size={11} /> : <Share2 size={11} />}
                    >
                      {isCopied ? 'Copied!' : 'Share'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); onManageGuests(site); }}
                      title="Manage Guests"
                    >
                      <Users size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={getSiteUrl(site.domain)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="View Live Site"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(site); }}
                      disabled={isDeleting}
                      title="Delete site"
                    >
                      {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </Button>
                  </CardFooter>
                </motion.article>
              );
            })}
          </AnimatePresence>

          {/* Create new card */}
          <motion.button
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: sites.length * 0.06, ease: [0.16, 1, 0.3, 1] }}
            onClick={onStartNew}
            className="min-h-[340px] flex flex-col items-center justify-center gap-5 rounded-[var(--pl-radius-lg)] border-2 border-dashed border-[rgba(163,177,138,0.35)] bg-transparent cursor-pointer transition-all duration-300 hover:border-[var(--pl-olive)] hover:bg-[rgba(163,177,138,0.04)] group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--pl-olive-mist)] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <Plus size={22} className="text-[var(--pl-olive)]" />
            </div>
            <div className="text-center px-6">
              <div className="font-heading text-[1.1rem] font-semibold italic text-[var(--pl-olive)] mb-1.5">
                New celebration site
              </div>
              <div className="text-[0.82rem] text-[var(--pl-muted)] leading-snug">
                Build a love story in 90 seconds
              </div>
            </div>
          </motion.button>
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
            <strong className="text-[var(--pl-ink)]">{confirmDelete?.domain}.pearloom.com</strong> will be
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
