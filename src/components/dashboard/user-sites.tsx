'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Globe, Pencil, ExternalLink, Calendar, Loader2,
  Trash2, X, AlertTriangle, Users, Copy, Check, Share2, RefreshCw,
} from 'lucide-react';
import type { StoryManifest } from '@/types';
import { PearIcon } from '@/components/icons/PearloomIcons';
import { PearBackground } from '@/components/icons/PearShapes';

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
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setPos({ x: (e.clientX - cx) * strength, y: (e.clientY - cy) * strength });
  };

  const handleMouseLeave = () => setPos({ x: 0, y: 0 });

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={style}
    >
      {children}
    </motion.button>
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
          animation: 'shimmer 1.8s ease-in-out infinite',
        }}
      />
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div
          style={{
            height: '12px', borderRadius: '100px', width: '60%',
            background: 'linear-gradient(90deg, #f0ece4 0%, #faf7f2 50%, #f0ece4 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.8s ease-in-out infinite 0.1s',
          }}
        />
        <div
          style={{
            height: '10px', borderRadius: '100px', width: '35%',
            background: 'linear-gradient(90deg, #f0ece4 0%, #faf7f2 50%, #f0ece4 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.8s ease-in-out infinite 0.2s',
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
                animation: `shimmer 1.8s ease-in-out infinite ${0.1 * idx}s`,
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    try {
      const res = await fetch(`/api/sites/${site.domain}`, { method: 'DELETE' });
      if (res.ok) {
        setSites((prev) => prev.filter((s) => s.domain !== site.domain));
      }
    } catch {
      // silently fail — modal will close
    } finally {
      setDeletingDomain(null);
      setConfirmDelete(null);
    }
  };

  const getSiteUrl = (domain: string) =>
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? `http://${domain}.localhost:3000`
      : `https://${domain}.pearloom.app`;

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
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>

      {/* ── Welcome header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: '3rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <PearIcon size={28} color="var(--eg-accent)" />
          <span style={{
            fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--eg-accent)',
          }}>
            Pearloom
          </span>
        </div>
        <h1 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 400,
          color: 'var(--eg-fg)',
          letterSpacing: '-0.025em',
          lineHeight: 1.1,
          marginBottom: '0.5rem',
        }}>
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </h1>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem',
          paddingBottom: '2rem',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <p style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: '1.1rem',
            fontWeight: 400,
            color: 'var(--eg-muted)',
            fontStyle: 'italic',
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
        }}
          className="site-card-grid"
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
            border: '1px solid rgba(239,68,68,0.12)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          }}
        >
          <AlertTriangle size={36} color="rgba(239,68,68,0.5)" style={{ margin: '0 auto 1.25rem' }} />
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
            justifyContent: 'center', padding: '8rem 2rem',
            background: 'linear-gradient(160deg, #F5F1E8 0%, #EEE8DC 100%)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(163,177,138,0.15)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Watermark */}
          <div style={{ position: 'absolute', right: '-4rem', bottom: '-4rem', pointerEvents: 'none' }}>
            <PearBackground size={320} color="var(--eg-accent)" opacity={0.04} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ marginBottom: '2rem' }}
            >
              <PearIcon size={64} color="var(--eg-accent)" />
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
              color: 'var(--eg-muted)', maxWidth: '400px', marginBottom: '2.5rem',
              lineHeight: 1.8, fontSize: '1rem',
            }}>
              Build a stunning wedding website in minutes. Your AI designer is waiting.
            </p>
            <button
              onClick={onStartNew}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.65rem',
                padding: '1rem 2.25rem', borderRadius: '100px',
                background: 'linear-gradient(135deg, #A3B18A, #8FA876)',
                color: '#fff', fontWeight: 600, fontSize: '1rem',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 12px 40px rgba(163,177,138,0.4)',
                fontFamily: 'var(--eg-font-body)',
                transition: 'transform 0.2s, box-shadow 0.2s',
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
          </div>
        </motion.div>

      ) : (
        /* ── Site grid ── */
        <>
          <div
            className="site-card-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem',
            }}
          >
            <AnimatePresence>
              {sites.map((site, i) => {
                const vibeSkin = site.manifest?.vibeSkin;
                const accentColor = vibeSkin?.palette?.accent || site.manifest?.theme?.colors?.accent || '#A3B18A';
                const accentDark = vibeSkin?.palette?.highlight || site.manifest?.theme?.colors?.muted || '#8FA876';
                const formattedDate = getFormattedDate(site.created_at);
                const isDeleting = deletingDomain === site.domain;
                const isHovered = hoveredId === site.id;
                const isCopied = copiedId === site.id;
                const displayNames = (site.names || ['', '']).map(
                  (n) => n.charAt(0).toUpperCase() + n.slice(1)
                ).join(' & ');
                const weddingDate = site.manifest?.logistics?.date || site.manifest?.events?.[0]?.date;
                const isLive = !site.manifest?.comingSoon?.enabled;

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
                      background: '#fff',
                      borderRadius: '1.25rem',
                      overflow: 'hidden',
                      border: isHovered
                        ? '1px solid rgba(163,177,138,0.3)'
                        : '1px solid rgba(0,0,0,0.05)',
                      boxShadow: isHovered
                        ? '0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(163,177,138,0.08)'
                        : '0 4px 24px rgba(0,0,0,0.05)',
                      transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                      transition: 'box-shadow 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.4s, transform 0.4s cubic-bezier(0.16,1,0.3,1)',
                    }}
                  >
                    {/* Visual header — gradient from vibeSkin palette */}
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
                      {/* Subtle texture overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 100%)',
                      }} />

                      {/* Domain badge */}
                      <div style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        background: 'rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        borderRadius: '100px', padding: '0.3rem 0.8rem',
                        border: '1px solid rgba(255,255,255,0.22)',
                        fontSize: '0.68rem', fontWeight: 700, color: '#fff',
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
                          <>
                            <div style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              background: '#4ade80',
                              boxShadow: '0 0 6px rgba(74,222,128,0.7)',
                              animation: 'pulse 2s ease-in-out infinite',
                            }} />
                            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700, letterSpacing: '0.1em' }}>LIVE</span>
                          </>
                        ) : (
                          <>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24' }} />
                            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: '0.1em' }}>DRAFT</span>
                          </>
                        )}
                      </div>

                      {/* Couple names overlay */}
                      <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.5rem', right: '1.5rem' }}>
                        <div style={{
                          fontFamily: 'var(--eg-font-heading)',
                          fontSize: '1.55rem', fontWeight: 400, color: '#fff',
                          letterSpacing: '-0.015em', lineHeight: 1.05,
                          textShadow: '0 2px 16px rgba(0,0,0,0.3)',
                        }}>
                          {displayNames}
                        </div>
                        {weddingDate && (
                          <div style={{
                            fontSize: '0.7rem', color: 'rgba(255,255,255,0.72)',
                            marginTop: '0.3rem', letterSpacing: '0.1em',
                            textTransform: 'uppercase', fontWeight: 600,
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
                      {/* URL pill + date */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <code style={{
                          fontSize: '0.72rem', background: 'rgba(0,0,0,0.04)',
                          padding: '0.25rem 0.65rem', borderRadius: '0.4rem',
                          color: 'var(--eg-muted)', letterSpacing: '0.01em',
                          fontFamily: 'ui-monospace, monospace',
                          border: '1px solid rgba(0,0,0,0.06)',
                        }}>
                          {site.domain}.pearloom.app
                        </code>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--eg-muted)', fontSize: '0.72rem' }}>
                          <Calendar size={11} />
                          <span>Created {formattedDate}</span>
                        </div>
                      </div>

                      {/* Action row */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {/* Edit — primary */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditSite(site); }}
                          style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.65rem 0.75rem', borderRadius: '0.75rem',
                            background: 'var(--eg-fg)',
                            color: '#fff', border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.78rem', letterSpacing: '0.04em',
                            fontFamily: 'var(--eg-font-body)',
                            transition: 'opacity 0.2s',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                          onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
                        >
                          <Pencil size={12} />
                          Edit Site
                        </button>

                        {/* Share — secondary */}
                        <button
                          onClick={(e) => handleCopyUrl(site, e)}
                          title="Copy site URL"
                          style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.65rem 0.75rem', borderRadius: '0.75rem',
                            background: isCopied ? 'rgba(34,197,94,0.08)' : 'rgba(163,177,138,0.08)',
                            color: isCopied ? '#16a34a' : 'var(--eg-accent)',
                            border: isCopied ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(163,177,138,0.2)',
                            cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem',
                            fontFamily: 'var(--eg-font-body)',
                            transition: 'all 0.25s',
                          }}
                        >
                          {isCopied ? <Check size={12} /> : <Share2 size={12} />}
                          {isCopied ? 'Copied!' : 'Share'}
                        </button>

                        {/* Guests — tertiary */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onManageGuests(site); }}
                          title="Manage Guests"
                          style={{
                            width: '38px', height: '38px', borderRadius: '0.75rem',
                            border: '1px solid rgba(0,0,0,0.08)', background: 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--eg-muted)', cursor: 'pointer', transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#EEE8DC';
                            e.currentTarget.style.color = 'var(--eg-accent)';
                            e.currentTarget.style.borderColor = 'rgba(163,177,138,0.3)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
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
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '38px', height: '38px', borderRadius: '0.75rem',
                            border: '1px solid rgba(0,0,0,0.08)', background: 'transparent',
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
                            (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
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
                          style={{
                            width: '38px', height: '38px', borderRadius: '0.75rem',
                            border: '1px solid rgba(239,68,68,0.12)',
                            background: 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(239,68,68,0.45)', cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#fef2f2';
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'rgba(239,68,68,0.45)';
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.12)';
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
                <div style={{ fontWeight: 700, color: 'var(--eg-accent)', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                  Start a new site
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', maxWidth: '150px', lineHeight: 1.55 }}>
                  Build a new love story in 90 seconds
                </div>
              </div>
            </motion.button>
          </div>

          {/* Responsive grid styles */}
          <style>{`
            @media (max-width: 1024px) {
              .site-card-grid { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 640px) {
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
            onClick={() => setConfirmDelete(null)}
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
                onClick={() => setConfirmDelete(null)}
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
                background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 2rem',
                boxShadow: '0 8px 24px rgba(239,68,68,0.1)',
              }}>
                <AlertTriangle size={26} color="#ef4444" />
              </div>
              <h3 style={{
                fontFamily: 'var(--eg-font-heading)', fontSize: '1.9rem',
                fontWeight: 400, marginBottom: '0.875rem', color: 'var(--eg-fg)',
                letterSpacing: '-0.015em',
              }}>
                Delete this site?
              </h3>
              <p style={{ color: 'var(--eg-muted)', lineHeight: 1.65, marginBottom: '2.25rem', fontSize: '0.925rem' }}>
                <strong style={{ color: 'var(--eg-fg)' }}>{confirmDelete.domain}.pearloom.app</strong> will be
                permanently removed. Guests will no longer be able to access it.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setConfirmDelete(null)}
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
                  style={{
                    flex: 1, padding: '0.9rem', borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.9rem',
                    boxShadow: '0 8px 24px rgba(239,68,68,0.28)',
                    fontFamily: 'var(--eg-font-body)',
                  }}
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
