'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/marketplace/page.tsx
// Community Marketplace — browse, search, filter, preview,
// and install templates, themes, and block presets.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Search, Filter, Star, Download, Heart, ArrowRight,
  ChevronDown, Sparkles, Grid, List, ArrowLeft,
} from 'lucide-react';
import { BLOCK_TEMPLATES, searchTemplates as searchBlockTemplates, instantiateTemplate } from '@/lib/block-engine/templates';
import { SITE_TEMPLATES, searchTemplates as searchSiteTemplates } from '@/lib/templates/wedding-templates';
import { MARKETPLACE_CATEGORIES } from '@/lib/marketplace';
import { Button } from '@/components/ui/button';

type TabId = 'templates' | 'themes' | 'blocks' | 'community';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'templates', label: 'Site Templates' },
  { id: 'blocks', label: 'Block Presets' },
  { id: 'themes', label: 'Themes' },
  { id: 'community', label: 'Community' },
];

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<TabId>('templates');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Template results
  const siteResults = useMemo(() => {
    let items = search ? searchSiteTemplates(search) : [...SITE_TEMPLATES];
    if (category !== 'all') {
      items = items.filter(t => t.tags.includes(category) || t.occasions.includes(category));
    }
    return items.sort((a, b) => b.popularity - a.popularity);
  }, [search, category]);

  const blockResults = useMemo(() => {
    return search ? searchBlockTemplates(search) : BLOCK_TEMPLATES;
  }, [search]);

  return (
    <div className="min-h-dvh bg-[var(--pl-cream)]">
      {/* ── Header ── */}
      <header className="border-b border-[var(--pl-divider)] bg-white">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          {/* Top bar */}
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-2 no-underline">
              <ArrowLeft size={16} className="text-[var(--pl-muted)]" />
              <span className="font-heading italic text-lg text-[var(--pl-ink-soft)]">Pearloom</span>
            </Link>
            <h1 className="font-heading italic text-xl text-[var(--pl-ink)]">Marketplace</h1>
            <Link href="/dashboard" className="text-[0.75rem] font-semibold text-[var(--pl-muted)] no-underline hover:text-[var(--pl-ink)]">
              Dashboard
            </Link>
          </div>

          {/* Search + tabs */}
          <div className="pb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-[240px] flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--pl-cream)] border border-[var(--pl-divider)]">
              <Search size={15} className="text-[var(--pl-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates, themes, blocks..."
                className="flex-1 bg-transparent border-none outline-none text-[0.88rem] text-[var(--pl-ink)] placeholder:text-[var(--pl-muted)] placeholder:opacity-50"
              />
            </div>
            <div className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-[0.72rem] font-bold uppercase tracking-[0.06em] border-none cursor-pointer transition-all ${
                    activeTab === tab.id
                      ? 'bg-[var(--pl-olive-deep)] text-white'
                      : 'bg-transparent text-[var(--pl-muted)] hover:text-[var(--pl-ink)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-8">
        {/* Category filters */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setCategory('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[0.68rem] font-bold uppercase tracking-[0.06em] border-none cursor-pointer ${
                category === 'all' ? 'bg-[var(--pl-ink)] text-white' : 'bg-[var(--pl-cream-deep)] text-[var(--pl-muted)]'
              }`}
            >
              All
            </button>
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[0.68rem] font-bold uppercase tracking-[0.06em] border-none cursor-pointer ${
                  category === cat.id ? 'bg-[var(--pl-ink)] text-white' : 'bg-[var(--pl-cream-deep)] text-[var(--pl-muted)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md border-none cursor-pointer ${viewMode === 'grid' ? 'bg-[var(--pl-olive-mist)] text-[var(--pl-olive)]' : 'bg-transparent text-[var(--pl-muted)]'}`}>
              <Grid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md border-none cursor-pointer ${viewMode === 'list' ? 'bg-[var(--pl-olive-mist)] text-[var(--pl-olive)]' : 'bg-transparent text-[var(--pl-muted)]'}`}>
              <List size={16} />
            </button>
          </div>
        </div>

        {/* ── Site Templates tab ── */}
        {activeTab === 'templates' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading italic text-[1.4rem] text-[var(--pl-ink)]">Site Templates</h2>
              <span className="text-[0.72rem] text-[var(--pl-muted)]">{siteResults.length} templates</span>
            </div>

            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'flex flex-col gap-3'
            }>
              {siteResults.map((template, i) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="group"
                >
                  <div className={`rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.05)] bg-white transition-all duration-200 hover:shadow-[0_8px_32px_rgba(43,30,20,0.08)] hover:-translate-y-1 ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}>
                    {/* Preview */}
                    <div
                      className={viewMode === 'list' ? 'w-[200px] shrink-0' : ''}
                      style={{
                        height: viewMode === 'list' ? '100%' : '160px',
                        minHeight: viewMode === 'list' ? '120px' : undefined,
                        background: template.previewGradient,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <span style={{
                        fontFamily: `"${template.theme.fonts.heading}", serif`,
                        fontSize: viewMode === 'list' ? '1rem' : '1.3rem',
                        fontStyle: 'italic', fontWeight: 600,
                        color: template.theme.colors.foreground,
                        opacity: 0.7,
                        textShadow: template.theme.colors.background.startsWith('#0') ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                      }}>
                        {template.name}
                      </span>
                      {template.popularity >= 90 && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[0.55rem] font-bold uppercase tracking-[0.08em] text-[var(--pl-olive-deep)]">
                          <Sparkles size={9} /> Popular
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex items-center gap-4' : ''}`}>
                      <div className={viewMode === 'list' ? 'flex-1' : ''}>
                        <h3 className="text-[0.92rem] font-semibold text-[var(--pl-ink)] mb-0.5">{template.name}</h3>
                        <p className="text-[0.75rem] text-[var(--pl-muted)] leading-relaxed mb-2">{template.tagline}</p>
                        <div className="flex gap-1 flex-wrap">
                          {template.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="text-[0.55rem] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full bg-[var(--pl-cream-deep)] text-[var(--pl-muted)]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 ${viewMode === 'list' ? '' : 'mt-3'}`}>
                        <span className="text-[0.68rem] font-bold text-[var(--pl-olive-deep)]">Free</span>
                        <span className="text-[0.62rem] text-[var(--pl-muted)]">{template.blocks.length} blocks</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* ── Block Presets tab ── */}
        {activeTab === 'blocks' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading italic text-[1.4rem] text-[var(--pl-ink)]">Block Presets</h2>
              <span className="text-[0.72rem] text-[var(--pl-muted)]">{blockResults.length} presets</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {blockResults.map((preset, i) => (
                <motion.div
                  key={preset.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="pl-panel-section"
                  style={{ margin: 0, cursor: 'pointer' }}
                >
                  <h3 className="text-[0.88rem] font-semibold text-[var(--pl-ink)] mb-1">{preset.name}</h3>
                  <p className="text-[0.75rem] text-[var(--pl-muted)] mb-2">{preset.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {preset.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[0.52rem] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[0.62rem] text-[var(--pl-muted)]">{preset.blocks.length} blocks</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* ── Themes tab ── */}
        {activeTab === 'themes' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[var(--pl-olive-mist)] flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} className="text-[var(--pl-olive)]" />
            </div>
            <h2 className="font-heading italic text-xl text-[var(--pl-ink)] mb-2">Theme Gallery Coming Soon</h2>
            <p className="text-[0.88rem] text-[var(--pl-muted)] max-w-[400px] mx-auto">
              Community-designed color palettes, font pairings, and visual styles. Submit your own or browse what others have created.
            </p>
          </div>
        )}

        {/* ── Community tab ── */}
        {activeTab === 'community' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[var(--pl-gold-mist)] flex items-center justify-center mx-auto mb-4">
              <Heart size={24} className="text-[var(--pl-gold)]" />
            </div>
            <h2 className="font-heading italic text-xl text-[var(--pl-ink)] mb-2">Community Creations</h2>
            <p className="text-[0.88rem] text-[var(--pl-muted)] max-w-[400px] mx-auto mb-6">
              Share your custom templates and earn revenue when others use them. Join the creator program.
            </p>
            <Button variant="primary" size="md" icon={<ArrowRight size={14} />}>
              Apply as Creator
            </Button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--pl-divider)] bg-white py-8 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <span className="font-heading italic text-[var(--pl-ink-soft)]">Pearloom Marketplace</span>
          <div className="flex gap-4 text-[0.75rem] text-[var(--pl-muted)]">
            <Link href="/dashboard" className="no-underline hover:text-[var(--pl-ink)]">Dashboard</Link>
            <Link href="/partners" className="no-underline hover:text-[var(--pl-ink)]">Partners</Link>
            <Link href="/" className="no-underline hover:text-[var(--pl-ink)]">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
