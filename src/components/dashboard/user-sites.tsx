'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Globe, Pencil, ExternalLink, Calendar, Loader2 } from 'lucide-react';
import type { StoryManifest } from '@/types';

interface UserSite {
  id: string;
  domain: string;
  manifest: StoryManifest;
  created_at: string;
  names: [string, string];
}

export function UserSites({ onStartNew, onEditSite }: { onStartNew: () => void, onEditSite: (site: UserSite) => void }) {
  const [sites, setSites] = useState<UserSite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We will establish an API endpoint to fetch the user's sites
    fetch('/api/sites')
      .then(res => res.json())
      .then(data => {
        if (data.sites) setSites(data.sites);
      })
      .catch(err => console.error('Failed to load sites:', err))
      .finally(() => setLoading(false));
  }, []);

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
            const coverImage = site.manifest.chapters?.[0]?.images?.[0]?.url || 'https://images.unsplash.com/photo-1519741497674-611481863552';
            const formattedDate = new Date(site.created_at).toLocaleDateString();

            return (
              <motion.div
                key={site.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative bg-white border border-black/5 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all cursor-pointer"
                onClick={() => onEditSite(site)}
              >
                <div className="h-48 relative overflow-hidden bg-black/5">
                  <img src={coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-white">
                    <span className="text-sm font-semibold tracking-wider uppercase">{site.domain}.pearloom.app</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-[var(--eg-muted)] mb-2 uppercase tracking-wider font-semibold">
                    <Calendar size={12} />
                    Published {formattedDate}
                  </div>
                  <h4 className="text-xl font-medium text-[var(--eg-fg)]" style={{ fontFamily: 'var(--eg-font-heading)' }}>
                    {site.names.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' & ')}
                  </h4>
                  
                  <div className="flex gap-2 mt-6 pt-4 border-t border-black/5">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation();
                        const isLocal = window.location.hostname === 'localhost';
                        const url = isLocal 
                          ? `http://${site.domain}.localhost:3000` 
                          : `https://${site.domain}.pearloom.app`;
                        window.open(url, '_blank');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-sm border border-black/10 rounded-lg hover:bg-black/5 transition-colors text-[var(--eg-muted)] hover:text-black font-medium"
                    >
                      <ExternalLink size={14} />
                      View Live
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-black text-white rounded-lg hover:bg-black/80 transition-colors font-medium"
                    >
                      <Pencil size={14} />
                      Edit Site
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
