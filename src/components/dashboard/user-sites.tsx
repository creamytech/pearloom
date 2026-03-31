'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Globe, Pencil, ExternalLink, Calendar, Loader2,
  Trash2, X, AlertTriangle, Users, Copy, Check, Share2, RefreshCw,
} from 'lucide-react';
import type { StoryManifest } from '@/types';
import { PearIcon } from '@/components/icons/PearloomIcons';
import { text } from '@/lib/design-tokens';

import { SiteCompletenessPanel } from '@/components/dashboard/SiteCompletenessPanel';

// ── Greeting helper ────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ── Magnetic Button ─────────────────────────────────────────────
function MagneticButton({
  onClick,
  style,
  children,
  strength = 0.35,
}: {
  onClick: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
  strength?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setPos({ x: (e.clientX - cx) * strength, y: (e.clientY - cy) * strength });
  };

  const handleMouseLeave = () => setPos({ x: 0, y: 0 });

  return (
    // Static container keeps layout stable — only the inner button moves
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-flex' }}
    >
      <motion.button
        onClick={onClick}
        animate={{ x: pos.x, y: pos.y }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={style}
      >
        {children}
      </motion.button>
    </div>
  );
}

// ── Skeleton Card ────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '1.25rem',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          height: '200px',
          background: 'linear-gradient(90deg, #f5f0e8 0%, #fdf8f2 50%, #f5f0e8 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
      />
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div
          style={{
            height: '12px', borderRadius: '100px', width: '60%',
            background: 'linear-gradient(90deg, #f0ece4 0%, #faf7f2 50%, #f0ece4 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.1s',
          }}
        />
        <div
          style={{
            height: '10px', borderRadius: '100px', width: '35%',
            background: 'linear-gradient(90deg, #f0ece4 0%, #faf7f2 50%, #f0ece4 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.2s',
          }}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto auto',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          {[...Array(4)].map((_, idx) => (
            <div
              key={idx}
              style={{
                height: '40px', borderRadius: '0.75rem',
                background: 'linear-gradient(90deg, #f0ece4 0%, #faf7f2 50%, #f0ece4 100%)',
                backgroundSize: '200% 100%',
                animation: `shimmer 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite ${0.1 * idx}s`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

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

export function UserSites({ onStartNew, onEditSite, onManageGuests, userName }: UserSitesProps) {
  const [sites, setSites] = useState<UserSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserSite | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCompleteness, setExpandedCompleteness] = useState<string | null>(null);

  const loadSites = () => {
    setFetchError(false);
    setLoading(true);
    fetch('/api/sites')
      .then((res) => res.json())
      .then((data) => {
        if (data.sites) setSites(data.sites);
      })
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
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch { /* ignore parse error */ }
        setDeleteError(msg);
      }
    } catch {
      setDeleteError('Network error — please check your connection and try again.');
    } finally {
      setDeletingDomain(null);
    }
  };

  const getSiteUrl = (domain: string) => {
    if (typeof window === 'undefined') return `https://${domain}.pearloom.com`;
    const { hostname, origin } = window.location;
    if (hostname === 'localhost') return `http://${domain}.localhost:3000`;
    // On Vercel preview deployments use path-based routing
    if (hostname.includes('vercel.app')) return `${origin}/sites/${domain}`;
    return `https://${domain}.pearloom.com`;
  };

  const handleCopyUrl = async (site: UserSite, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getSiteUrl(site.domain));
      setCopiedId(site.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // silent
    }
  };

  const getFormattedDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(1rem, 3vw, 2rem)' }}>

      {/* ── Welcome header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: '3rem', textAlign: 'center' }}
      >
        <h1 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 400,
          color: 'var(--eg-fg)',
          letterSpacing: '-0.025em',
          lineHeight: 1.1,
          marginBottom: '1.5rem',
        }}>
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </h1>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '1.5rem',
          paddingBottom: '2rem',
          borderBottom: '1px solid var(--eg-divider)',
        }}>
          <p style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: '1.1rem',
            fontWeight: 400,
            color: 'var(--eg-muted)',
            fontStyle: 'italic',
            letterSpacing: '0.01em',
          }}>
            Your Sites
          </p>
          <MagneticButton
            onClick={onStartNew}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.85rem 1.75rem', borderRadius: '100px',
              background: 'linear-gradient(135deg, var(--eg-dark) 0%, var(--eg-dark-2) 100%)',
              color: '#fff', fontWeight: 600, fontSize: '0.875rem',
              border: 'none', cursor: 'pointer', letterSpacing: '0.01em',
              boxShadow: '0 8px 30px rgba(26,23,19,0.18)',
              fontFamily: 'var(--eg-font-body)',
            }}
          >
            <Plus size={16} />
            Create New Site
          </MagneticButton>
        </div>
      </motion.div>

      {/* ── Loading ── */}
      {loading ? (
        <div
          className="site-card-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>

      ) : fetchError ? (
        /* ── Error state ── */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#fff',
            borderRadius: '1.25rem',
            padding: '3rem',
            textAlign: 'center',
            border: '1px solid rgba(109,89,122,0.12)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          }}
        >
          <AlertTriangle size={36} color="rgba(109,89,122,0.5)" style={{ margin: '0 auto 1.25rem' }} />
          <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.4rem', fontWeight: 400, marginBottom: '0.75rem', color: 'var(--eg-fg)' }}>
            Could not load your sites
          </h3>
          <p style={{ color: 'var(--eg-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
            Check your connection and try again.
          </p>
          <button
            onClick={loadSites}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.8rem 1.75rem', borderRadius: '0.75rem',
              background: 'var(--eg-fg)', color: '#fff',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              fontFamily: 'var(--eg-font-body)',
            }}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </motion.div>

      ) : sites.length === 0 ? (
        /* ── Empty state ── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '6rem 2rem',
            background: 'radial-gradient(ellipse at 50% 30%, rgba(163,177,138,0.08) 0%, rgba(214,198,168,0.06) 40%, #ffffff 70%)',
            borderRadius: '1.5rem',
            border: '1px solid var(--eg-divider)',
            textAlign: 'center',
            maxWidth: '640px',
            margin: '0 auto',
            boxShadow: '0 8px 40px rgba(43,43,43,0.06)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative thread ornament — top left */}
          <svg
            width="120" height="120" viewBox="0 0 120 120" fill="none"
            aria-hidden="true"
            style={{ position: 'absolute', top: '-10px', left: '-10px', opacity: 0.12 }}
          >
            <path d="M10 110 C 30 60, 70 80, 60 10" stroke="#A3B18A" strokeWidth="1.5" fill="none" />
            <path d="M20 110 C 50 70, 40 50, 70 10" stroke="#D6C6A8" strokeWidth="1.5" fill="none" />
          </svg>
          {/* Decorative thread ornament — bottom right */}
          <svg
            width="120" height="120" viewBox="0 0 120 120" fill="none"
            aria-hidden="true"
            style={{ position: 'absolute', bottom: '-10px', right: '-10px', opacity: 0.12 }}
          >
            <path d="M110 10 C 90 60, 50 40, 60 110" stroke="#A3B18A" strokeWidth="1.5" fill="none" />
            <path d="M100 10 C 70 50, 80 70, 50 110" stroke="#D6C6A8" strokeWidth="1.5" fill="none" />
          </svg>

          {/* Pear icon with glow */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              marginBottom: '2rem',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Subtle glow behind pear */}
            <div style={{
              position: 'absolute',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(163,177,138,0.3) 0%, rgba(163,177,138,0) 70%)',
              filter: 'blur(8px)',
              pointerEvents: 'none',
            }} />
            <PearIcon size={80} color="var(--eg-accent)" />
          </motion.div>
          <h3 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 400, color: 'var(--eg-fg)',
            marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>
            Start your story
          </h3>
          <p style={{
            color: 'var(--eg-muted)', maxWidth: '400px', marginBottom: '0.75rem',
            lineHeight: 1.8, fontSize: '1rem',
          }}>
            Build a stunning celebration website in minutes. Your AI designer is waiting.
          </p>
          <p style={{
            color: 'var(--eg-muted)', fontSize: '0.8rem', marginBottom: '2.5rem',
            letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
            opacity: 0.55,
          }}>
            Powered by The Loom AI
          </p>
          <button
            onClick={onStartNew}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.65rem',
              padding: '1rem 2.5rem', borderRadius: '100px',
              background: 'linear-gradient(135deg, #A3B18A, #8FA876)',
              color: '#fff', fontWeight: 600, fontSize: '1.05rem',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 12px 40px rgba(163,177,138,0.4)',
              fontFamily: 'var(--eg-font-body)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              position: 'relative',
              zIndex: 1,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 16px 50px rgba(163,177,138,0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(163,177,138,0.4)';
            }}
          >
            <Plus size={18} />
            Create Your Site
          </button>
        </motion.div>

      ) : (
        /* ── Site grid ── */
        <>
          <div
            className="site-card-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <AnimatePresence>
              {sites.map((site, i) => {
                const vibeSkin = site.manifest?.vibeSkin;
                const accentColor = vibeSkin?.palette?.accent || site.manifest?.theme?.colors?.accent || '#A3B18A';
                const accentDark = vibeSkin?.palette?.highlight || site.manifest?.theme?.colors?.muted || '#8FA876';
                const coverPhotoUrl = site.manifest?.chapters?.[0]?.images?.[0]?.url;
                const formattedDate = getFormattedDate(site.created_at);
                const isDeleting = deletingDomain === site.domain;
                const isHovered = hoveredId === site.id;
                const isCopied = copiedId === site.id;
                const displayNames = (site.names || ['', '']).map(
                  (n) => n.charAt(0).toUpperCase() + n.slice(1)
                ).join(' & ');
                const weddingDate = site.manifest?.logistics?.date || site.manifest?.events?.[0]?.date;
                const isLive = !site.manifest?.comingSoon?.enabled;
                const occasionMeta: Record<string, { label: string; color: string; bg: string }> = {
                  wedding:     { label: 'Wedding',     color: '#6D597A', bg: 'rgba(109,89,122,0.10)' },
                  anniversary: { label: 'Anniversary', color: '#8A6D3B', bg: 'rgba(214,198,168,0.25)' },
                  engagement:  { label: 'Engagement',  color: '#6D597A', bg: 'rgba(109,89,122,0.10)' },
                  birthday:    { label: 'Birthday',    color: '#5C7A6E', bg: 'rgba(163,177,138,0.18)' },
                  story:       { label: 'Story',       color: 'var(--eg-muted)', bg: 'rgba(0,0,0,0.05)' },
                };
                const occ = occasionMeta[site.manifest?.occasion || ''];

                return (
                  <motion.article
                    key={site.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                    exit={{ opacity: 0, scale: 0.94, y: -10 }}
                    onHoverStart={() => setHoveredId(site.id)}
                    onHoverEnd={() => setHoveredId(null)}
                    style={{
                      background: 'var(--eg-bg)',
                      borderRadius: '1.25rem',
                      overflow: 'hidden',
                      border: isHovered
                        ? `1px solid ${accentColor}`
                        : '1px solid var(--eg-divider)',
                      boxShadow: isHovered
                        ? `0 20px 60px rgba(43,43,43,0.10), 0 4px 16px rgba(214,198,168,0.2), 0 0 0 3px ${accentColor}22`
                        : '0 4px 24px rgba(43,43,43,0.06)',
                      transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                      transition: 'box-shadow 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.4s, transform 0.4s cubic-bezier(0.16,1,0.3,1)',
                    }}
                  >
                    {/* Visual header — cover photo or gradient from vibeSkin palette */}
                    <div
                      onClick={() => onEditSite(site)}
                      style={{
                        height: '200px',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)`,
                      }}
                    >
                      {/* Actual cover photo if available */}
                      {coverPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverPhotoUrl}
                          alt=""
                          role="presentation"
                          style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.6s ease',
                          }}
                          onMouseOver={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'; }}
                          onMouseOut={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; }}
                        />
                      ) : (
                        /* Premium placeholder pattern for sites without a cover photo */
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 50%, ${accentColor}cc 100%)`,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            position: 'absolute', inset: '-50%',
                            background: `radial-gradient(circle at 20% 50%, ${accentColor}44 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${accentDark}55 0%, transparent 40%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)`,
                          }} />
                          <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                          }} />
                        </div>
                      )}
                      {/* Gradient overlay — bottom fade for text readability */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: coverPhotoUrl
                          ? 'linear-gradient(180deg, transparent 0%, transparent 35%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0.6) 100%)'
                          : 'linear-gradient(180deg, transparent 0%, transparent 40%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.4) 100%)',
                      }} />

                      {/* Domain badge */}
                      <div style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        background: 'rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        borderRadius: '100px', padding: '0.3rem 0.8rem',
                        border: '1px solid rgba(255,255,255,0.22)',
                        fontSize: text.xs, fontWeight: 700, color: '#fff',
                        letterSpacing: '0.06em',
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                      }}>
                        <Globe size={10} />
                        {site.domain}
                      </div>

                      {/* Live/Draft indicator */}
                      <div style={{
                        position: 'absolute', top: '1rem', left: '1rem',
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                      }}>
                        {isLive ? (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            background: 'rgba(34,197,94,0.18)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            borderRadius: '100px',
                            padding: '0.2rem 0.6rem 0.2rem 0.45rem',
                            border: '1px solid rgba(34,197,94,0.25)',
                          }}>
                            <div style={{
                              width: '7px', height: '7px', borderRadius: '50%',
                              background: '#22c55e',
                              boxShadow: '0 0 6px rgba(34,197,94,0.6), 0 0 0 0 rgba(34,197,94,0.4)',
                              animation: 'livePulse 2s ease-out infinite',
                            }} />
                            <span style={{ fontSize: text.xs, color: '#fff', fontWeight: 700, letterSpacing: '0.1em' }}>LIVE</span>
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            background: 'rgba(217,170,56,0.2)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            borderRadius: '100px',
                            padding: '0.2rem 0.6rem 0.2rem 0.45rem',
                            border: '1px solid rgba(217,170,56,0.3)',
                          }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D9AA38' }} />
                            <span style={{ fontSize: text.xs, color: '#fff', fontWeight: 700, letterSpacing: '0.1em' }}>DRAFT</span>
                          </div>
                        )}
                      </div>

                      {/* Couple names overlay */}
                      <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.5rem', right: '1.5rem' }}>
                        <div style={{
                          fontFamily: 'var(--eg-font-heading)',
                          fontSize: coverPhotoUrl ? '1.7rem' : '1.55rem',
                          fontWeight: 400, color: '#fff',
                          letterSpacing: '-0.015em', lineHeight: 1.05,
                          textShadow: coverPhotoUrl ? '0 2px 24px rgba(0,0,0,0.6)' : '0 2px 16px rgba(0,0,0,0.3)',
                        }}>
                          {displayNames}
                        </div>
                        {weddingDate && (
                          <div style={{
                            fontSize: text.xs, color: 'rgba(255,255,255,0.75)',
                            marginTop: '0.35rem', letterSpacing: '0.12em',
                            textTransform: 'uppercase', fontWeight: 600,
                            textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                          }}>
                            {new Date(weddingDate).toLocaleDateString('en-US', {
                              month: 'long', day: 'numeric', year: 'numeric',
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
                      {/* Occasion badge + date row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem', paddingLeft: '0.75rem', borderLeft: `3px solid ${accentColor}33`, }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {occ && (
                            <span style={{
                              fontSize: text.xs, fontWeight: 700, letterSpacing: '0.09em',
                              textTransform: 'uppercase', padding: '0.2rem 0.6rem',
                              borderRadius: '100px', color: occ.color, background: occ.bg,
                            }}>
                              {occ.label}
                            </span>
                          )}
                          <code style={{
                            fontSize: text.xs, background: 'rgba(0,0,0,0.04)',
                            padding: '0.2rem 0.55rem', borderRadius: '0.4rem',
                            color: 'var(--eg-muted)', letterSpacing: '0.01em',
                            fontFamily: 'ui-monospace, monospace',
                            border: '1px solid var(--eg-divider)',
                          }}>
                            {site.domain}.pearloom.com
                          </code>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--eg-muted)', fontSize: text.xs }}>
                          <Calendar size={11} />
                          <span>{formattedDate}</span>
                        </div>
                      </div>

                      {/* Analytics */}
                      {site.manifest?.analytics?.views != null && site.manifest.analytics.views > 0 && (
                        <div style={{
                          fontSize: text.xs, color: 'rgba(0,0,0,0.4)',
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          marginTop: '0.25rem',
                        }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          <span>{site.manifest.analytics.views.toLocaleString()} view{site.manifest.analytics.views !== 1 ? 's' : ''}</span>
                          {site.manifest.analytics.lastViewed && (
                            <span style={{ opacity: 0.6 }}>
                              · {new Date(site.manifest.analytics.lastViewed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Completeness bar — click to expand full panel */}
                      {site.manifest && (
                        <div style={{ marginBottom: '0.85rem' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCompleteness(prev => prev === site.id ? null : site.id);
                            }}
                            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
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
                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                style={{ overflow: 'hidden', marginTop: '8px' }}
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
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Edit — primary */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditSite(site); }}
                          style={{
                            flex: '1 1 auto', minWidth: '70px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.65rem 0.75rem', borderRadius: '0.75rem',
                            background: 'linear-gradient(135deg, var(--eg-accent) 0%, var(--eg-accent-hover) 100%)',
                            color: '#fff', border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: text.sm, letterSpacing: '0.04em',
                            fontFamily: 'var(--eg-font-body)',
                            boxShadow: '0 4px 14px rgba(163,177,138,0.35)',
                            transition: 'opacity 0.2s, box-shadow 0.2s',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(163,177,138,0.5)'; e.currentTarget.style.opacity = '0.92'; }}
                          onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(163,177,138,0.35)'; e.currentTarget.style.opacity = '1'; }}
                        >
                          <Pencil size={12} />
                          Edit Site
                        </button>

                        {/* Share — secondary */}
                        <button
                          onClick={(e) => handleCopyUrl(site, e)}
                          title="Copy site URL"
                          style={{
                            flex: '1 1 auto', minWidth: '70px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.65rem 0.75rem', borderRadius: '0.75rem',
                            background: isCopied ? 'rgba(163,177,138,0.12)' : 'rgba(163,177,138,0.08)',
                            color: isCopied ? 'var(--eg-accent, #A3B18A)' : 'var(--eg-accent)',
                            border: isCopied ? '1px solid rgba(163,177,138,0.3)' : '1px solid rgba(163,177,138,0.2)',
                            cursor: 'pointer', fontWeight: 600, fontSize: text.sm,
                            fontFamily: 'var(--eg-font-body)',
                            transition: 'all 0.25s',
                          }}
                        >
                          <span style={{
                            display: 'inline-flex',
                            transform: isCopied ? 'scale(1.2)' : 'scale(1)',
                            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          }}>
                            {isCopied ? <Check size={12} /> : <Share2 size={12} />}
                          </span>
                          {isCopied ? 'Copied!' : 'Share'}
                        </button>

                        {/* Guests — tertiary */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onManageGuests(site); }}
                          title="Manage Guests"
                          aria-label="Manage guests"
                          style={{
                            flex: '1 1 auto', minWidth: '70px', height: '40px', borderRadius: '0.75rem',
                            border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--eg-muted)', cursor: 'pointer', transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#EEE8DC';
                            e.currentTarget.style.color = 'var(--eg-accent)';
                            e.currentTarget.style.borderColor = 'rgba(163,177,138,0.3)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                            e.currentTarget.style.color = 'var(--eg-muted)';
                            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                          }}
                        >
                          <Users size={14} />
                        </button>

                        {/* View Live — icon only, external link */}
                        <a
                          href={getSiteUrl(site.domain)}
                          target="_blank"
                          rel="noreferrer"
                          title="View Live Site"
                          aria-label="View live site"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            flex: '1 1 auto', minWidth: '70px', height: '40px', borderRadius: '0.75rem',
                            border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--eg-muted)', textDecoration: 'none',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.background = '#EEE8DC';
                            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--eg-fg)';
                            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,0,0,0.12)';
                          }}
                          onMouseOut={(e) => {
                            (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,0,0,0.02)';
                            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--eg-muted)';
                            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,0,0,0.08)';
                          }}
                        >
                          <ExternalLink size={14} />
                        </a>

                        {/* Delete */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(site); }}
                          disabled={isDeleting}
                          title="Delete site"
                          aria-label="Delete site"
                          style={{
                            flex: '1 1 auto', minWidth: '70px', height: '40px', borderRadius: '0.75rem',
                            border: '1px solid rgba(185,28,28,0.15)',
                            background: 'rgba(185,28,28,0.03)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(185,28,28,0.55)', cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(185,28,28,0.06)';
                            e.currentTarget.style.color = 'rgb(185,28,28)';
                            e.currentTarget.style.borderColor = 'rgba(185,28,28,0.35)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(185,28,28,0.03)';
                            e.currentTarget.style.color = 'rgba(185,28,28,0.55)';
                            e.currentTarget.style.borderColor = 'rgba(185,28,28,0.15)';
                          }}
                        >
                          {isDeleting
                            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Trash2 size={13} />
                          }
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>

            {/* Create new site card */}
            <motion.button
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: sites.length * 0.07, ease: [0.16, 1, 0.3, 1] }}
              onClick={onStartNew}
              style={{
                background: 'rgba(163,177,138,0.04)',
                borderRadius: '1.25rem',
                overflow: 'hidden',
                border: '2px dashed rgba(163,177,138,0.3)',
                cursor: 'pointer', minHeight: '320px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '1rem',
                fontFamily: 'var(--eg-font-body)',
                transition: 'all 0.3s ease',
              }}
              whileHover={{
                backgroundColor: 'rgba(163,177,138,0.09)',
                y: -4,
              }}
            >
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'rgba(163,177,138,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.3s',
              }}>
                <Plus size={22} color="var(--eg-accent)" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--eg-accent)', fontSize: text.md, marginBottom: '0.35rem' }}>
                  Start a new site
                </div>
                <div style={{ fontSize: text.base, color: 'var(--eg-muted)', maxWidth: '150px', lineHeight: 1.55 }}>
                  Build a new love story in 90 seconds
                </div>
              </div>
            </motion.button>
          </div>

          {/* Responsive grid styles */}
          <style>{`
            @media (max-width: 479px) {
              .site-card-grid { grid-template-columns: 1fr !important; }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            @keyframes livePulse {
              0% { box-shadow: 0 0 6px rgba(34,197,94,0.6), 0 0 0 0 rgba(34,197,94,0.4); }
              70% { box-shadow: 0 0 6px rgba(34,197,94,0.6), 0 0 0 7px rgba(34,197,94,0); }
              100% { box-shadow: 0 0 6px rgba(34,197,94,0.6), 0 0 0 0 rgba(34,197,94,0); }
            }
          `}</style>
        </>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
            }}
            onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: '1.75rem',
                padding: '3rem', maxWidth: '420px', width: '100%',
                boxShadow: '0 40px 100px rgba(0,0,0,0.22)', textAlign: 'center',
                position: 'relative',
              }}
            >
              <button
                onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                style={{
                  position: 'absolute', top: '1.25rem', right: '1.25rem',
                  background: '#f5f5f5', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--eg-muted)',
                }}
              >
                <X size={16} />
              </button>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'rgba(109,89,122,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 2rem',
                boxShadow: '0 8px 24px rgba(109,89,122,0.1)',
              }}>
                <AlertTriangle size={26} color="var(--eg-plum, #6D597A)" />
              </div>
              <h3 style={{
                fontFamily: 'var(--eg-font-heading)', fontSize: '1.9rem',
                fontWeight: 400, marginBottom: '0.875rem', color: 'var(--eg-fg)',
                letterSpacing: '-0.015em',
              }}>
                Delete this site?
              </h3>
              <p style={{ color: 'var(--eg-muted)', lineHeight: 1.65, marginBottom: deleteError ? '1rem' : '2.25rem', fontSize: '0.925rem' }}>
                <strong style={{ color: 'var(--eg-fg)' }}>{confirmDelete.domain}.pearloom.com</strong> will be
                permanently removed. Guests will no longer be able to access it.
              </p>
              {deleteError && (
                <p style={{
                  fontSize: '0.85rem', color: '#c0392b', background: 'rgba(192,57,43,0.07)',
                  border: '1px solid rgba(192,57,43,0.18)', borderRadius: '0.6rem',
                  padding: '0.65rem 0.875rem', marginBottom: '1.5rem', lineHeight: 1.5,
                }}>
                  {deleteError}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                  style={{
                    flex: 1, padding: '0.9rem', borderRadius: '0.875rem',
                    border: '1px solid rgba(0,0,0,0.1)', background: 'none',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    color: 'var(--eg-fg)', fontFamily: 'var(--eg-font-body)',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#f8f8f8'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  Keep Site
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deletingDomain === confirmDelete.domain}
                  style={{
                    flex: 1, padding: '0.9rem', borderRadius: '0.875rem',
                    background: deletingDomain === confirmDelete.domain
                      ? 'rgba(109,89,122,0.4)'
                      : 'linear-gradient(135deg, #6D597A, #5a4a66)',
                    color: '#fff', border: 'none',
                    cursor: deletingDomain === confirmDelete.domain ? 'wait' : 'pointer',
                    fontWeight: 600, fontSize: '0.9rem',
                    boxShadow: deletingDomain === confirmDelete.domain ? 'none' : '0 8px 24px rgba(109,89,122,0.28)',
                    fontFamily: 'var(--eg-font-body)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                >
                  {deletingDomain === confirmDelete.domain
                    ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Deleting…</>
                    : 'Delete Forever'
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
