'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Globe, Pencil, ExternalLink, Calendar, Loader2, Trash2, X, AlertTriangle, Users } from 'lucide-react';
import type { StoryManifest } from '@/types';

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
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingDomain(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-10 w-full max-w-5xl mx-auto px-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-6">
        <div>
          <h2 className="text-3xl font-semibold text-[var(--eg-fg)]" style={{ fontFamily: 'var(--eg-font-heading)' }}>
            Your Sites
          </h2>
          <p className="text-[var(--eg-muted)] mt-2">Manage your published love stories or start a new chapter.</p>
        </div>
        <button
          onClick={onStartNew}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white font-medium hover:bg-black/80 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.2)] hover:scale-105"
        >
          <Plus size={18} />
          Create New Site
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--eg-muted)]">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p>Loading your sites...</p>
        </div>
      ) : sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-2xl border border-black/5 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[var(--eg-accent-light)] flex items-center justify-center text-[var(--eg-accent)] mb-6">
            <Globe size={32} />
          </div>
          <h3 className="text-xl font-medium text-[var(--eg-fg)] mb-2" style={{ fontFamily: 'var(--eg-font-heading)' }}>No published sites yet</h3>
          <p className="text-[var(--eg-muted)] max-w-sm mb-8">Start crafting a beautiful timeline of your favorite memories to share with friends and family.</p>
          <button
            onClick={onStartNew}
            className="px-6 py-2 border border-[var(--eg-accent)] text-[var(--eg-accent)] rounded-full hover:bg-[var(--eg-accent)] hover:text-white transition-all font-medium"
          >
            Start Creating
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site, i) => {
            // Try to get a real chapter image first; fall back to Unsplash
            const coverImage = site.manifest?.chapters?.[0]?.images?.[0]?.url
              || `https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=60`;
            const formattedDate = new Date(site.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const isDeleting = deletingDomain === site.domain;

            return (
              <motion.div
                key={site.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.08 }}
                className="group relative bg-white border border-black/5 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all"
              >
                {/* Cover photo */}
                <div className="h-48 relative overflow-hidden bg-black/5 cursor-pointer" onClick={() => onEditSite(site)}>
                  <img src={coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-white">
                    <span className="text-xs font-bold tracking-widest uppercase opacity-80">{site.domain}.pearloom.app</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-[var(--eg-muted)] mb-2 uppercase tracking-wider font-semibold">
                    <Calendar size={12} />
                    {formattedDate}
                  </div>
                  <h4 className="text-xl font-medium text-[var(--eg-fg)]" style={{ fontFamily: 'var(--eg-font-heading)' }}>
                    {(site.names || ['', '']).map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' & ')}
                  </h4>

                  <div className="flex gap-2 mt-5 pt-4 border-t border-black/5">
                    {/* View Live */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const isLocal = window.location.hostname === 'localhost';
                        const url = isLocal
                          ? `http://${site.domain}.localhost:3000`
                          : `https://${site.domain}.pearloom.app`;
                        window.open(url, '_blank');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-black/10 rounded-lg hover:bg-black/5 transition-colors text-[var(--eg-muted)] hover:text-black font-semibold uppercase tracking-wider"
                    >
                      <ExternalLink size={12} />
                      View Live
                    </button>

                    {/* Edit Site */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditSite(site); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-black text-white rounded-lg hover:bg-black/80 transition-colors font-semibold uppercase tracking-wider"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>

                    {/* Guest List */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onManageGuests(site); }}
                      className="flex items-center justify-center px-3 py-2 text-xs border border-black/10 text-[var(--eg-muted)] rounded-lg hover:bg-black/5 hover:text-black transition-colors"
                    >
                      <Users size={12} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(site); }}
                      disabled={isDeleting}
                      className="flex items-center justify-center px-3 py-2 text-xs border border-red-200 text-red-400 rounded-lg hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition-colors"
                    >
                      {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
            }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: '1.5rem',
                padding: '3rem', maxWidth: '420px', width: '100%',
                boxShadow: '0 30px 80px rgba(0,0,0,0.2)', textAlign: 'center',
              }}
            >
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.75rem', marginBottom: '0.75rem', color: '#1a1a1a' }}>
                Delete this site?
              </h3>
              <p style={{ color: '#8c8c8c', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.95rem' }}>
                <strong>{confirmDelete.domain}.pearloom.app</strong> will be permanently removed. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{ flex: 1, padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid rgba(0,0,0,0.12)', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  style={{ flex: 1, padding: '0.9rem', borderRadius: '0.75rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Delete Forever
                </button>
              </div>
              <button onClick={() => setConfirmDelete(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#8c8c8c' }}>
                <X size={18} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
