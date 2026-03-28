'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Globe, Pencil, ExternalLink, Calendar, Loader2, Trash2, X, AlertTriangle, Users, Heart, Sparkles, Copy, Check } from 'lucide-react';
import type { StoryManifest } from '@/types';
import { PearloomMark, WovenCircle } from '@/components/brand/PearloomMark';

// ── Magnetic Button ─────────────────────────────────────────────
function MagneticButton({ onClick, style, children, strength = 0.35 }: {
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
    <div style={{
      background: '#fff',
      borderRadius: '1.5rem',
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.05)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
    }}>
      {/* Cover skeleton */}
      <div style={{
        height: '220px',
        background: 'linear-gradient(90deg, #f5f0e8 0%, #fdf8f2 50%, #f5f0e8 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s ease-in-out infinite',
      }} />
      {/* Body skeleton */}
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{
          height: '12px', borderRadius: '100px', width: '60%',
          background: 'linear-gradient(90deg, #f0ece4 0%, #faf7f2 50%, #f0ece4 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.8s ease-in-out infinite 0.1s',
        }} />
        <div style={{
          height: '10px', borderRadius: '100px', width: '35%',
          background: 'linear-gradient(90deg, #f0ece4 0%, #faf7f2 50%, #f0ece4 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.8s ease-in-out infinite 0.2s',
        }} />
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.5rem', marginTop: '0.5rem',
        }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{
              height: '40px', borderRadius: '0.75rem',
              background: 'linear-gradient(90deg, #f0ece4 0%, #faf7f2 50%, #f0ece4 100%)',
              backgroundSize: '200% 100%',
              animation: `shimmer 1.8s ease-in-out infinite ${0.1 * i}s`,
            }} />
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

export function UserSites({ onStartNew, onEditSite, onManageGuests }: {
  onStartNew: () => void;
  onEditSite: (site: UserSite) => void;
  onManageGuests: (site: UserSite) => void;
}) {
  const [sites, setSites] = useState<UserSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserSite | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tilt, setTilt] = useState<Record<string, { x: number; y: number }>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = -((e.clientY - rect.top) / rect.height - 0.5) * 14;
    setTilt(prev => ({ ...prev, [id]: { x, y } }));
  };

  const clearTilt = (id: string) => setTilt(prev => ({ ...prev, [id]: { x: 0, y: 0 } }));

  useEffect(() => {
    fetch('/api/sites')
      .then(res => res.json())
      .then(data => { if (data.sites) setSites(data.sites); })
      .catch(err => console.error('Failed to load sites:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (site: UserSite) => {
    setDeletingDomain(site.domain);
    try {
      const res = await fetch(`/api/sites/${site.domain}`, { method: 'DELETE' });
      if (res.ok) {
        setSites(prev => prev.filter(s => s.domain !== site.domain));
      } else {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error || `Error ${res.status}`;
        console.error('[UserSites] Delete failed:', msg);
        alert(`Could not delete site: ${msg}`);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Could not delete site — please try again.');
    } finally {
      setDeletingDomain(null);
      setConfirmDelete(null);
    }
  };

  const getSiteUrl = (domain: string) =>
    window.location.hostname === 'localhost'
      ? `http://${domain}.localhost:3000`
      : `https://${domain}.pearloom.app`;

  const handleCopyUrl = async (site: UserSite, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getSiteUrl(site.domain));
      setCopiedId(site.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback silent fail
    }
  };

  const getFormattedDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: '3rem', paddingBottom: '2rem',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        flexWrap: 'wrap', gap: '1.5rem',
      }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b8926a', marginBottom: '0.5rem' }}>
            Your Stories
          </div>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: '2.75rem', fontWeight: 400, color: 'var(--eg-fg)',
            letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            {loading ? 'Loading…' : sites.length > 0 ? `${sites.length} ${sites.length === 1 ? 'Story' : 'Stories'} woven` : 'Your love story starts here'}
          </h2>
          <p style={{ color: 'var(--eg-muted)', marginTop: '0.5rem', fontSize: '0.95rem', fontStyle: 'italic' }}>
            Each site is a living memory — open, edit, or begin a new chapter.
          </p>
        </div>

        <MagneticButton
          onClick={onStartNew}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.65rem',
            padding: '0.9rem 2rem', borderRadius: '100px',
            background: 'linear-gradient(135deg, var(--eg-dark) 0%, var(--eg-dark-2) 100%)',
            color: '#fff', fontWeight: 600, fontSize: '0.9rem',
            border: 'none', cursor: 'pointer', letterSpacing: '0.01em',
            boxShadow: '0 8px 30px rgba(26,23,19,0.2)',
            fontFamily: 'var(--eg-font-body)',
          }}
        >
          <Plus size={18} />
          Begin a New Story
        </MagneticButton>
      </div>

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.75rem' }}>
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

      ) : sites.length === 0 ? (
        /* ── Empty state ── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '8rem 2rem',
            background: 'linear-gradient(160deg, #fffdf9 0%, #fdf5eb 100%)',
            borderRadius: '2rem',
            border: '1px solid rgba(184,146,106,0.15)',
            boxShadow: '0 8px 60px rgba(184,146,106,0.08)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative background rings */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px', height: '600px',
            borderRadius: '50%',
            border: '1px solid rgba(184,146,106,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px', height: '400px',
            borderRadius: '50%',
            border: '1px solid rgba(184,146,106,0.12)',
            pointerEvents: 'none',
          }} />

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'relative', zIndex: 1, marginBottom: '2.5rem' }}
          >
            <WovenCircle size={100} color="linear-gradient(135deg, #f3e8d8, #e8d4b8)" borderColor="rgba(184,146,106,0.3)" style={{
              background: 'linear-gradient(135deg, #f3e8d8, #e8d4b8)',
              boxShadow: '0 20px 60px rgba(184,146,106,0.25), 0 0 0 1px rgba(184,146,106,0.15)',
            }}>
              <PearloomMark size={48} color="#b8926a" />
            </WovenCircle>
          </motion.div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{
              fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 400, color: 'var(--eg-fg)', marginBottom: '1rem',
              letterSpacing: '-0.02em', lineHeight: 1.1,
            }}>
              Your love story starts here
            </h3>
            <p style={{
              color: 'var(--eg-muted)', maxWidth: '420px', marginBottom: '0.75rem',
              lineHeight: 1.8, fontSize: '1.05rem', fontStyle: 'italic',
            }}>
              Connect your photos and describe how it feels. Pearloom weaves them into a beautiful wedding site — in under 90 seconds.
            </p>
            <p style={{
              color: 'rgba(184,146,106,0.7)', fontSize: '0.82rem',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
              marginBottom: '2.75rem',
            }}>
              No design skills needed &nbsp;·&nbsp; Fully customizable &nbsp;·&nbsp; Shareable in minutes
            </p>

            <button
              onClick={onStartNew}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                padding: '1rem 2.25rem', borderRadius: '100px',
                background: 'linear-gradient(135deg, #b8926a, #8b6b4a)',
                color: '#fff', fontWeight: 600, fontSize: '1rem',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 12px 40px rgba(184,146,106,0.4)',
                fontFamily: 'var(--eg-font-body)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 50px rgba(184,146,106,0.5)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(184,146,106,0.4)'; }}
            >
              <Sparkles size={18} />
              Begin Weaving Your Story
            </button>
          </div>
        </motion.div>

      ) : (
        /* ── Site grid ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.75rem' }}>
          <AnimatePresence>
            {sites.map((site, i) => {
              const coverImage = site.manifest?.chapters?.[0]?.images?.[0]?.url
                || `https://images.unsplash.com/photo-1519741497674-611481863552?w=700&q=70`;
              const formattedDate = getFormattedDate(site.created_at);
              const isDeleting = deletingDomain === site.domain;
              const isHovered = hoveredId === site.id;
              const isCopied = copiedId === site.id;
              const displayNames = (site.names || ['', '']).map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' & ');
              const accentColor = site.manifest?.theme?.colors?.accent || '#b8926a';
              const weddingDate = site.manifest?.events?.[0]?.date;
              // Determine published status: if comingSoon is disabled or not set, it's live
              const isLive = !site.manifest?.comingSoon?.enabled;

              const cardTilt = tilt[site.id] || { x: 0, y: 0 };

              return (
                <motion.article
                  key={site.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -10 }}
                  transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  onHoverStart={() => setHoveredId(site.id)}
                  onHoverEnd={() => { setHoveredId(null); clearTilt(site.id); }}
                  onMouseMove={e => handleCardMouseMove(e, site.id)}
                  style={{
                    background: '#fff',
                    borderRadius: '1.5rem',
                    overflow: 'hidden',
                    border: isHovered ? '1px solid rgba(184,146,106,0.25)' : '1px solid rgba(0,0,0,0.05)',
                    boxShadow: isHovered
                      ? '0 24px 70px rgba(0,0,0,0.12), 0 4px 16px rgba(184,146,106,0.1)'
                      : '0 4px 24px rgba(0,0,0,0.05)',
                    transition: 'box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s',
                    transform: isHovered
                      ? `perspective(800px) rotateX(${cardTilt.y}deg) rotateY(${cardTilt.x}deg) translateY(-6px) scale(1.01)`
                      : 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)',
                    transformStyle: 'preserve-3d',
                    willChange: 'transform',
                    transitionProperty: isHovered ? 'box-shadow, border-color' : 'all',
                    transitionDuration: isHovered ? '0.05s, 0.4s' : '0.5s',
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {/* Cover photo */}
                  <div
                    onClick={() => onEditSite(site)}
                    style={{ height: '220px', position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#f5f0e8' }}
                  >
                    <img
                      src={coverImage}
                      alt={displayNames}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1)',
                        transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                      }}
                    />
                    {/* Gradient overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                    }} />

                    {/* Accent color bar at very top */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                      background: `linear-gradient(90deg, ${accentColor}, transparent)`,
                    }} />

                    {/* Domain badge */}
                    <div style={{
                      position: 'absolute', top: '1rem', right: '1rem',
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '100px', padding: '0.35rem 0.85rem',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontSize: '0.68rem', fontWeight: 700, color: '#fff',
                      letterSpacing: '0.06em',
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                    }}>
                      <Globe size={10} />
                      {site.domain}
                    </div>

                    {/* Name overlay */}
                    <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.5rem', right: '1.5rem' }}>
                      <div style={{
                        fontFamily: 'var(--eg-font-heading)',
                        fontSize: '1.6rem', fontWeight: 400, color: '#fff',
                        letterSpacing: '-0.015em', lineHeight: 1.05,
                        textShadow: '0 2px 12px rgba(0,0,0,0.4)',
                      }}>
                        {displayNames}
                      </div>
                      {weddingDate && (
                        <div style={{
                          fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)',
                          marginTop: '0.3rem', letterSpacing: '0.1em',
                          textTransform: 'uppercase', fontWeight: 600,
                        }}>
                          {new Date(weddingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '1.5rem' }}>
                    {/* Meta row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: '1.25rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b0b0b0', fontSize: '0.75rem' }}>
                        <Calendar size={11} />
                        <span style={{ letterSpacing: '0.04em' }}>Created {formattedDate}</span>
                      </div>
                      {/* Publication status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isLive ? (
                          <>
                            <div style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              background: '#22c55e',
                              boxShadow: '0 0 6px rgba(34,197,94,0.6)',
                              animation: 'pulse 2s ease-in-out infinite',
                            }} />
                            <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: 700, letterSpacing: '0.08em' }}>LIVE</span>
                          </>
                        ) : (
                          <>
                            <div style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              background: '#f59e0b',
                            }} />
                            <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.08em' }}>DRAFT</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto auto auto', gap: '0.5rem', alignItems: 'center' }}>
                      {/* View Live */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(getSiteUrl(site.domain), '_blank');
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                          padding: '0.7rem', borderRadius: '0.75rem', fontSize: '0.75rem',
                          border: '1px solid rgba(0,0,0,0.1)', background: 'transparent',
                          color: '#8c8c8c', cursor: 'pointer', fontWeight: 700,
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                          transition: 'all 0.2s',
                          fontFamily: 'var(--eg-font-body)',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f8f8f8'; e.currentTarget.style.color = '#1a1a1a'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8c8c8c'; }}
                      >
                        <ExternalLink size={12} />
                        View
                      </button>

                      {/* Edit */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditSite(site); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                          padding: '0.7rem', borderRadius: '0.75rem', fontSize: '0.75rem',
                          background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                          color: '#fff', border: 'none', cursor: 'pointer',
                          fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          transition: 'all 0.2s',
                          fontFamily: 'var(--eg-font-body)',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; }}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>

                      {/* Copy URL */}
                      <button
                        onClick={(e) => handleCopyUrl(site, e)}
                        title="Copy URL"
                        style={{
                          width: '40px', height: '40px', borderRadius: '0.75rem',
                          border: isCopied ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(0,0,0,0.1)',
                          background: isCopied ? 'rgba(34,197,94,0.08)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isCopied ? '#22c55e' : '#8c8c8c',
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { if (!isCopied) { e.currentTarget.style.background = '#f3e8d8'; e.currentTarget.style.color = '#b8926a'; e.currentTarget.style.borderColor = 'rgba(184,146,106,0.3)'; } }}
                        onMouseOut={(e) => { if (!isCopied) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8c8c8c'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; } }}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>

                      {/* Guests */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onManageGuests(site); }}
                        title="Guest Manager"
                        style={{
                          width: '40px', height: '40px', borderRadius: '0.75rem',
                          border: '1px solid rgba(0,0,0,0.1)', background: 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#8c8c8c', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f3e8d8'; e.currentTarget.style.color = '#b8926a'; e.currentTarget.style.borderColor = 'rgba(184,146,106,0.3)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8c8c8c'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
                      >
                        <Users size={14} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(site); }}
                        disabled={isDeleting}
                        title="Delete Site"
                        style={{
                          width: '40px', height: '40px', borderRadius: '0.75rem',
                          border: '1px solid rgba(239,68,68,0.15)', background: 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'rgba(239,68,68,0.5)', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.5)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'; }}
                      >
                        {isDeleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
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
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: sites.length * 0.07 }}
            onClick={onStartNew}
            style={{
              background: 'rgba(184,146,106,0.04)',
              borderRadius: '1.5rem', overflow: 'hidden',
              border: '2px dashed rgba(184,146,106,0.25)',
              cursor: 'pointer', minHeight: '340px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '1rem', transition: 'all 0.3s ease',
              fontFamily: 'var(--eg-font-body)',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(184,146,106,0.08)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,146,106,0.5)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(184,146,106,0.04)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,146,106,0.25)';
              (e.currentTarget as HTMLElement).style.transform = 'none';
            }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'rgba(184,146,106,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={24} color="#b8926a" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#b8926a', fontSize: '0.95rem', marginBottom: '0.35rem' }}>New Site</div>
              <div style={{ fontSize: '0.82rem', color: '#b0b0b0', maxWidth: '160px', lineHeight: 1.55 }}>Build a new love story in 90 seconds</div>
            </div>
          </motion.button>
        </div>
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
                background: '#fff', borderRadius: '2rem',
                padding: '3rem', maxWidth: '440px', width: '100%',
                boxShadow: '0 40px 100px rgba(0,0,0,0.25)', textAlign: 'center',
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
                  color: '#8c8c8c',
                }}
              >
                <X size={16} />
              </button>

              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 2rem',
                boxShadow: '0 8px 24px rgba(239,68,68,0.12)',
              }}>
                <AlertTriangle size={26} color="#ef4444" />
              </div>

              <h3 style={{
                fontFamily: 'var(--eg-font-heading)', fontSize: '2rem',
                fontWeight: 400, marginBottom: '0.875rem', color: '#1a1a1a',
                letterSpacing: '-0.015em',
              }}>
                Delete this site?
              </h3>
              <p style={{ color: '#8c8c8c', lineHeight: 1.65, marginBottom: '2.5rem', fontSize: '0.95rem' }}>
                <strong style={{ color: '#1a1a1a' }}>{confirmDelete.domain}.pearloom.app</strong> will be permanently gone.
                Your guests will no longer be able to access it. This cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    flex: 1, padding: '0.95rem', borderRadius: '0.875rem',
                    border: '1px solid rgba(0,0,0,0.1)', background: 'none',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    transition: 'background 0.2s', color: '#1a1a1a',
                    fontFamily: 'var(--eg-font-body)',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#f8f8f8'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  Keep Site
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  style={{
                    flex: 1, padding: '0.95rem', borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.9rem',
                    boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
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
