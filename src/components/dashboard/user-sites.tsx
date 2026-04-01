'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Globe, Pencil, ExternalLink, Calendar, Loader2,
  Trash2, AlertTriangle, Users, Check, Share2, RefreshCw,
} from 'lucide-react';
import type { StoryManifest } from '@/types';
import { PearIcon } from '@/components/icons/PearloomIcons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/cn';

import { SiteCompletenessPanel } from '@/components/dashboard/SiteCompletenessPanel';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ── Skeleton Card ─────────────────────────────────────────────

function SkeletonCard() {
  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      <div className="h-48 skeleton" />
      <div className="p-5 flex flex-col gap-3">
        <div className="h-3 rounded-full w-[60%] skeleton" />
        <div className="h-2.5 rounded-full w-[35%] skeleton" />
        <div className="grid grid-cols-4 gap-2 mt-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 rounded-[var(--pl-radius-sm)] skeleton" />
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Types ─────────────────────────────────────────────────────

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

// ── Occasion badge map ────────────────────────────────────────

const OCCASION_BADGE: Record<string, { label: string; variant: 'plum' | 'gold' | 'default' | 'muted' }> = {
  wedding:     { label: 'Wedding',     variant: 'plum'    },
  anniversary: { label: 'Anniversary', variant: 'gold'    },
  engagement:  { label: 'Engagement',  variant: 'plum'    },
  birthday:    { label: 'Birthday',    variant: 'default' },
  story:       { label: 'Story',       variant: 'muted'   },
};

// ── UserSites ─────────────────────────────────────────────────

export function UserSites({ onStartNew, onEditSite, onManageGuests, userName }: UserSitesProps) {
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
    new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="w-full mx-auto max-w-[1200px]">

      {/* ── Welcome header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10 text-center"
      >
        <h1 className="font-[family-name:var(--pl-font-heading)] text-[clamp(1.5rem,3vw,2rem)] font-semibold italic text-[var(--pl-ink-soft)] tracking-tight leading-tight mb-6">
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </h1>
        <div className="flex items-center justify-center gap-4 pb-8 border-b border-[var(--pl-divider)]">
          <p className="text-[0.72rem] font-bold text-[var(--pl-muted)] tracking-[0.14em] uppercase">
            Your Sites
          </p>
          <Button variant="primary" size="sm" onClick={onStartNew} icon={<Plus size={14} />}>
            Create New Site
          </Button>
        </div>
      </motion.div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>

      ) : fetchError ? (
        /* ── Error state ── */
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card variant="elevated" className="p-12 text-center">
            <AlertTriangle size={36} className="text-[var(--pl-plum)] opacity-50 mx-auto mb-5" />
            <h3 className="font-[family-name:var(--pl-font-heading)] text-[1.4rem] font-normal mb-3 text-[var(--pl-ink-soft)]">
              Could not load your sites
            </h3>
            <p className="text-[var(--pl-muted)] text-[0.9rem] mb-6">
              Check your connection and try again.
            </p>
            <Button variant="primary" size="md" onClick={loadSites} icon={<RefreshCw size={14} />}>
              Retry
            </Button>
          </Card>
        </motion.div>

      ) : sites.length === 0 ? (
        /* ── Empty state ── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Card
            variant="elevated"
            className="flex flex-col items-center justify-center text-center py-24 px-8 max-w-[600px] mx-auto relative overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(163,177,138,0.07) 0%, rgba(214,198,168,0.05) 40%, #fff 70%)' }}
          >
            <PearIcon size={72} color="var(--pl-olive)" />
            <h3 className="font-[family-name:var(--pl-font-heading)] text-[clamp(1.75rem,4vw,2.4rem)] font-semibold italic text-[var(--pl-ink-soft)] mt-6 mb-3 tracking-tight leading-tight">
              Start your story
            </h3>
            <div className="w-16 h-px bg-[var(--pl-gold)] mx-auto mb-4" />
            <p className="text-[var(--pl-muted)] max-w-[360px] leading-[1.8] text-[0.95rem] mb-2">
              Build a stunning celebration website in minutes. Your AI designer is waiting.
            </p>
            <p className="text-[0.65rem] uppercase tracking-[0.1em] font-bold text-[var(--pl-muted)] opacity-50 mb-9">
              Powered by The Loom AI
            </p>
            <Button variant="accent" size="lg" onClick={onStartNew} icon={<Plus size={16} />}>
              Create Your Site
            </Button>
          </Card>
        </motion.div>

      ) : (
        /* ── Site grid ── */
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
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
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className="bg-white rounded-[var(--pl-radius-md)] overflow-hidden border border-[rgba(0,0,0,0.07)] shadow-[0_2px_8px_rgba(43,30,20,0.08),0_1px_3px_rgba(43,30,20,0.05)] transition-all duration-300 hover:shadow-[0_6px_24px_rgba(43,30,20,0.12),0_2px_8px_rgba(43,30,20,0.07)] hover:-translate-y-1"
                >
                  {/* ── Cover ── */}
                  <div
                    onClick={() => onEditSite(site)}
                    className="h-48 relative overflow-hidden cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)` }}
                  >
                    {coverPhotoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverPhotoUrl}
                        alt=""
                        role="presentation"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-600 hover:scale-[1.04]"
                      />
                    )}

                    {!coverPhotoUrl && (
                      <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 50%, ${accentColor}cc 100%)` }}
                      />
                    )}

                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: coverPhotoUrl ? 'linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.55) 100%)' : 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.35) 100%)' }}
                    />

                    {/* Domain pill */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.18] border border-white/25 backdrop-blur-[10px] text-[0.62rem] font-bold text-white tracking-wide">
                      <Globe size={9} />
                      {site.domain}
                    </div>

                    {/* Live / Draft */}
                    <div className="absolute top-3 left-3">
                      {isLive ? (
                        <Badge
                          variant="success"
                          size="sm"
                          className="bg-[rgba(34,197,94,0.18)] text-white border-[rgba(34,197,94,0.28)] backdrop-blur-[8px] uppercase tracking-widest"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.7)] animate-pulse" />
                          Live
                        </Badge>
                      ) : (
                        <Badge
                          variant="gold"
                          size="sm"
                          className="bg-[rgba(217,170,56,0.22)] text-white border-[rgba(217,170,56,0.32)] backdrop-blur-[8px] uppercase tracking-widest"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#D9AA38]" />
                          Draft
                        </Badge>
                      )}
                    </div>

                    {/* Names */}
                    <div className="absolute bottom-4 left-5 right-5">
                      <div
                        className="font-[family-name:var(--pl-font-heading)] text-[1.35rem] font-normal italic text-white leading-tight"
                        style={{ textShadow: coverPhotoUrl ? '0 2px 20px rgba(0,0,0,0.6)' : '0 2px 12px rgba(0,0,0,0.3)' }}
                      >
                        {displayNames}
                      </div>
                      {weddingDate && (
                        <div className="text-[0.62rem] text-white/75 mt-1 tracking-[0.12em] uppercase font-semibold" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
                          {new Date(weddingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Body ── */}
                  <div className="p-4 pb-5">
                    {/* Occasion + date row */}
                    <div
                      className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-3 pl-2.5"
                      style={{ borderLeft: `3px solid ${accentColor}30` }}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {occ && (
                          <Badge variant={occ.variant} size="sm">
                            {occ.label}
                          </Badge>
                        )}
                        <code className="text-[0.62rem] bg-[rgba(0,0,0,0.04)] border border-[var(--pl-divider)] px-1.5 py-0.5 rounded text-[var(--pl-muted)] font-mono">
                          {site.domain}.pearloom.com
                        </code>
                      </div>
                      <div className="flex items-center gap-1 text-[var(--pl-muted)] text-[0.68rem]">
                        <Calendar size={10} />
                        <span>{getFormattedDate(site.created_at)}</span>
                      </div>
                    </div>

                    {/* Analytics */}
                    {site.manifest?.analytics?.views != null && site.manifest.analytics.views > 0 && (
                      <div className="flex items-center gap-1 text-[0.68rem] text-[rgba(0,0,0,0.4)] mb-2">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>{site.manifest.analytics.views.toLocaleString()} view{site.manifest.analytics.views !== 1 ? 's' : ''}</span>
                        {site.manifest.analytics.lastViewed && (
                          <span className="opacity-60">
                            · {new Date(site.manifest.analytics.lastViewed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Completeness */}
                    {site.manifest && (
                      <div className="mb-3">
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

                    {/* Action row */}
                    <div className="flex gap-1.5 flex-wrap">
                      <Button
                        variant="accent"
                        size="sm"
                        className="flex-1 min-w-[60px] min-h-[40px]"
                        onClick={(e) => { e.stopPropagation(); onEditSite(site); }}
                        icon={<Pencil size={11} />}
                      >
                        Edit
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        className={cn(
                          'flex-1 min-w-[60px] min-h-[40px]',
                          isCopied && 'bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)] border-[var(--pl-olive-mist)]',
                        )}
                        onClick={(e) => handleCopyUrl(site, e)}
                        icon={isCopied ? <Check size={11} /> : <Share2 size={11} />}
                      >
                        {isCopied ? 'Copied!' : 'Share'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-1 min-h-[40px] min-w-[40px]"
                        onClick={(e) => { e.stopPropagation(); onManageGuests(site); }}
                        title="Manage Guests"
                        aria-label="Manage guests"
                      >
                        <Users size={13} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-1 min-h-[40px] min-w-[40px]"
                        asChild
                      >
                        <a
                          href={getSiteUrl(site.domain)}
                          target="_blank"
                          rel="noreferrer"
                          title="View Live Site"
                          aria-label="View live site"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={13} />
                        </a>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-1 min-h-[40px] min-w-[40px] text-red-400 hover:text-red-700 hover:bg-red-50 border border-red-100 hover:border-red-200"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(site); }}
                        disabled={isDeleting}
                        title="Delete site"
                        aria-label="Delete site"
                      >
                        {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </Button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          {/* ── Create new card ── */}
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, delay: sites.length * 0.07, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ backgroundColor: 'rgba(163,177,138,0.09)', y: -4 }}
            onClick={onStartNew}
            className="min-h-[300px] flex flex-col items-center justify-center gap-4 rounded-[var(--pl-radius-md)] border-2 border-dashed border-[rgba(163,177,138,0.3)] bg-transparent cursor-pointer overflow-hidden font-[family-name:var(--pl-font-body)] transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--pl-olive-mist)] flex items-center justify-center">
              <Plus size={20} className="text-[var(--pl-olive)]" />
            </div>
            <div className="text-center">
              <div className="font-bold text-[var(--pl-olive)] text-[1rem] mb-1">Start a new site</div>
              <div className="text-[0.85rem] text-[var(--pl-muted)] max-w-[150px] leading-snug">
                Build a new love story in 90 seconds
              </div>
            </div>
          </motion.button>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setDeleteError(null); }}
        maxWidth="max-w-[400px]"
      >
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--pl-plum-mist)] flex items-center justify-center mx-auto mb-6 shadow-[0_8px_24px_rgba(109,89,122,0.1)]">
            <AlertTriangle size={24} className="text-[var(--pl-plum)]" />
          </div>

          <h3 className="font-[family-name:var(--pl-font-heading)] text-[1.75rem] font-normal mb-3 text-[var(--pl-ink-soft)] tracking-tight">
            Delete this site?
          </h3>
          <p className="text-[var(--pl-muted)] leading-relaxed mb-5 text-[0.9rem]">
            <strong className="text-[var(--pl-ink)]">{confirmDelete?.domain}.pearloom.com</strong> will be
            permanently removed. Guests will no longer be able to access it.
          </p>

          {deleteError && (
            <p className="text-[0.82rem] text-red-700 bg-red-50 border border-red-200 rounded-[var(--pl-radius-sm)] px-3.5 py-2.5 mb-4 leading-snug text-left">
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
