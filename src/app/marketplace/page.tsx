'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/marketplace/page.tsx
// Marketplace — browse templates, themes, and block presets.
// Integrated into the dashboard layout with sidebar navigation.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Search, Heart, ArrowRight, ArrowLeft,
  Sparkles, Grid, List, Check, Copy, Palette,
  LayoutTemplate, Blocks, Users, Lock, Package,
  ShoppingBag,
} from 'lucide-react';
import { BLOCK_TEMPLATES, searchTemplates as searchBlockTemplates } from '@/lib/block-engine/templates';
import { SITE_TEMPLATES, searchTemplates as searchSiteTemplates } from '@/lib/templates/wedding-templates';
import { COLOR_THEMES, searchColorThemes } from '@/lib/templates/color-themes';
import { MARKETPLACE_CATEGORIES, formatPrice } from '@/lib/marketplace';
import { MARKETPLACE_PACKS, searchPacks } from '@/lib/marketplace-assets';
import { Button } from '@/components/ui/button';
import { DashboardSidebar } from '@/components/dashboard/sidebar';

type TabId = 'templates' | 'themes' | 'blocks' | 'assets' | 'community';

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType; count: number }> = [
  { id: 'templates', label: 'Templates', icon: LayoutTemplate, count: SITE_TEMPLATES.length },
  { id: 'themes', label: 'Themes', icon: Palette, count: COLOR_THEMES.length },
  { id: 'assets', label: 'Asset Packs', icon: Package, count: MARKETPLACE_PACKS.length },
  { id: 'blocks', label: 'Block Presets', icon: Blocks, count: BLOCK_TEMPLATES.length },
  { id: 'community', label: 'Community', icon: Users, count: 0 },
];

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<TabId>('templates');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Fetch owned items on mount
  useEffect(() => {
    fetch('/api/marketplace/owned')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.ownedItems) setOwnedItems(new Set(data.ownedItems)); })
      .catch(() => {});
  }, []);

  const handlePurchase = async (itemId: string, itemType: string) => {
    setPurchasing(itemId);
    try {
      const res = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, itemType }),
      });
      const data = await res.json();
      if (data.owned) {
        setOwnedItems(prev => new Set([...prev, itemId]));
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      // Silent
    } finally {
      setPurchasing(null);
    }
  };

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

  const handleCopyTheme = (themeId: string) => {
    setCopiedId(themeId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--pl-cream)]">
      {/* Dashboard header */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-[var(--pl-divider)] bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-heading italic text-[1.05rem] font-semibold text-[var(--pl-ink-soft)] no-underline hover:opacity-75 transition-opacity">
            Pearloom
          </Link>
          <span className="hidden sm:block text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)]">
            Marketplace
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--pl-cream)] border border-[var(--pl-divider)] w-[280px]">
            <Search size={13} className="text-[var(--pl-muted)] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent border-none outline-none text-[0.82rem] text-[var(--pl-ink)] placeholder:text-[var(--pl-muted)]"
            />
          </div>
          <Link href="/dashboard" className="text-[0.72rem] text-[var(--pl-muted)] no-underline flex items-center gap-1 hover:text-[var(--pl-ink)] transition-colors">
            <ArrowLeft size={12} /> Dashboard
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Hero banner */}
          <div className="px-6 md:px-10 py-8 md:py-10 bg-gradient-to-br from-[var(--pl-cream)] to-white border-b border-[var(--pl-divider)]">
            <p className="text-[0.62rem] font-bold tracking-[0.14em] uppercase text-[var(--pl-olive-deep)] mb-2">
              Marketplace
            </p>
            <h1 className="font-heading italic text-[clamp(1.4rem,3vw,2.2rem)] text-[var(--pl-ink-soft)] leading-tight mb-2">
              Templates, themes & presets
            </h1>
            <p className="text-[0.88rem] text-[var(--pl-muted)] max-w-[500px]">
              Start with a beautifully designed foundation and make it completely yours.
            </p>

            {/* Mobile search */}
            <div className="sm:hidden mt-4 flex items-center gap-2 px-3 py-2.5 rounded-full bg-white border border-[var(--pl-divider)]">
              <Search size={14} className="text-[var(--pl-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates, themes..."
                className="flex-1 bg-transparent border-none outline-none text-[0.85rem] text-[var(--pl-ink)]"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 md:px-10 pt-5 pb-3 border-b border-[var(--pl-divider)] flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setCategory('all'); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[0.75rem] font-semibold border-none cursor-pointer transition-all shrink-0 ${
                    isActive
                      ? 'bg-[var(--pl-olive)] text-white shadow-sm'
                      : 'bg-transparent text-[var(--pl-muted)] hover:bg-[rgba(0,0,0,0.03)] hover:text-[var(--pl-ink)]'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[var(--pl-cream-deep)] text-[var(--pl-muted)]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Category filters (templates & themes only) */}
          {(activeTab === 'templates' || activeTab === 'themes') && (
            <div className="px-6 md:px-10 pt-4 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setCategory('all')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[0.65rem] font-bold uppercase tracking-[0.06em] border-none cursor-pointer transition-all ${
                  category === 'all' ? 'bg-[var(--pl-ink)] text-white' : 'bg-white text-[var(--pl-muted)] border border-[var(--pl-divider)]'
                }`}
              >
                All
              </button>
              {MARKETPLACE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[0.65rem] font-bold uppercase tracking-[0.06em] border-none cursor-pointer transition-all ${
                    category === cat.id ? 'bg-[var(--pl-ink)] text-white' : 'bg-white text-[var(--pl-muted)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Content area */}
          <div className="px-6 md:px-10 py-6">

            {/* ── Site Templates ── */}
            {activeTab === 'templates' && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-heading italic text-[1.2rem] text-[var(--pl-ink)]">
                    {siteResults.length} Site Template{siteResults.length !== 1 ? 's' : ''}
                  </h2>
                  <div className="flex gap-1">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md border-none cursor-pointer ${viewMode === 'grid' ? 'bg-[var(--pl-olive-mist)] text-[var(--pl-olive)]' : 'bg-transparent text-[var(--pl-muted)]'}`}><Grid size={15} /></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md border-none cursor-pointer ${viewMode === 'list' ? 'bg-[var(--pl-olive-mist)] text-[var(--pl-olive)]' : 'bg-transparent text-[var(--pl-muted)]'}`}><List size={15} /></button>
                  </div>
                </div>

                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5' : 'flex flex-col gap-3'}>
                  {siteResults.map((template, i) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                    >
                      <div className={`rounded-[var(--pl-radius-lg)] overflow-hidden border border-[rgba(0,0,0,0.05)] bg-white transition-all duration-200 hover:shadow-[0_8px_32px_rgba(43,30,20,0.08)] hover:-translate-y-1 ${viewMode === 'list' ? 'flex' : ''}`}>
                        {/* Preview gradient */}
                        <div
                          className={viewMode === 'list' ? 'w-[180px] shrink-0' : ''}
                          style={{
                            height: viewMode === 'list' ? '100%' : '150px',
                            minHeight: viewMode === 'list' ? '110px' : undefined,
                            background: template.previewGradient,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative',
                          }}
                        >
                          <span style={{
                            fontFamily: `"${template.theme.fonts.heading}", serif`,
                            fontSize: viewMode === 'list' ? '0.92rem' : '1.2rem',
                            fontStyle: 'italic', fontWeight: 600,
                            color: template.theme.colors.foreground, opacity: 0.6,
                          }}>{template.name}</span>
                          {template.popularity >= 90 && (
                            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[0.52rem] font-bold uppercase tracking-[0.08em] text-[var(--pl-olive-deep)]">
                              <Sparkles size={8} /> Popular
                            </div>
                          )}
                          {template.featured && (
                            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--pl-gold)]/90 backdrop-blur-sm text-[0.52rem] font-bold uppercase tracking-[0.08em] text-white" style={{ left: template.popularity >= 90 ? '90px' : '12px' }}>
                              ★ Featured
                            </div>
                          )}
                          {template.price && template.price > 0 && !ownedItems.has(template.id) && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[0.55rem] font-bold text-white">
                              {formatPrice(template.price)}
                            </div>
                          )}
                          {ownedItems.has(template.id) && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--pl-olive)]/90 backdrop-blur-sm text-[0.52rem] font-bold text-white">
                              <Check size={8} /> Owned
                            </div>
                          )}
                        </div>

                        <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex items-center' : ''}`}>
                          <div className={viewMode === 'list' ? 'flex-1' : ''}>
                            <h3 className="text-[0.88rem] font-semibold text-[var(--pl-ink)] mb-0.5">{template.name}</h3>
                            <p className="text-[0.72rem] text-[var(--pl-muted)] leading-relaxed mb-2">{template.tagline}</p>
                            <div className="flex gap-1 flex-wrap mb-3">
                              {template.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-[0.52rem] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full bg-[var(--pl-cream-deep)] text-[var(--pl-muted)]">{tag}</span>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              {(!template.price || template.price === 0 || ownedItems.has(template.id)) ? (
                                <Link
                                  href="/dashboard"
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--pl-olive)] text-white text-[0.68rem] font-bold no-underline hover:opacity-90 transition-opacity"
                                >
                                  Use Template <ArrowRight size={11} />
                                </Link>
                              ) : (
                                <button
                                  onClick={() => handlePurchase(template.id, 'template')}
                                  disabled={purchasing === template.id}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--pl-ink)] text-white text-[0.68rem] font-bold border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                  {purchasing === template.id ? 'Loading...' : (
                                    <><ShoppingBag size={11} /> {formatPrice(template.price)}</>
                                  )}
                                </button>
                              )}
                              <span className="text-[0.62rem] text-[var(--pl-muted)]">
                                {template.blocks.length} blocks
                                {(!template.price || template.price === 0) ? ' · Free' : ownedItems.has(template.id) ? ' · Owned' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* ── Block Presets ── */}
            {activeTab === 'blocks' && (
              <>
                <div className="mb-5">
                  <h2 className="font-heading italic text-[1.2rem] text-[var(--pl-ink)]">
                    {blockResults.length} Block Preset{blockResults.length !== 1 ? 's' : ''}
                  </h2>
                  <p className="text-[0.78rem] text-[var(--pl-muted)] mt-1">
                    Pre-configured section combos you can add to any site.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {blockResults.map((preset, i) => (
                    <motion.div
                      key={preset.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-5 rounded-[var(--pl-radius-lg)] bg-white border border-[rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--pl-olive-mist)] flex items-center justify-center shrink-0">
                          <Blocks size={18} className="text-[var(--pl-olive)]" />
                        </div>
                        <div>
                          <h3 className="text-[0.88rem] font-semibold text-[var(--pl-ink)]">{preset.name}</h3>
                          <p className="text-[0.72rem] text-[var(--pl-muted)] leading-relaxed mt-0.5">{preset.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {preset.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[0.5rem] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)]">{tag}</span>
                          ))}
                        </div>
                        <span className="text-[0.62rem] text-[var(--pl-muted)]">{preset.blocks.length} blocks</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* ── Themes ── */}
            {activeTab === 'themes' && (() => {
              const themeResults = search ? searchColorThemes(search) : [...COLOR_THEMES];
              const filtered = category === 'all' ? themeResults : themeResults.filter(t => t.tags.includes(category) || t.occasions.includes(category));
              return (
                <>
                  <div className="mb-5">
                    <h2 className="font-heading italic text-[1.2rem] text-[var(--pl-ink)]">
                      {filtered.length} Color Theme{filtered.length !== 1 ? 's' : ''}
                    </h2>
                    <p className="text-[0.78rem] text-[var(--pl-muted)] mt-1">
                      Apply a complete color palette and font pairing to your site.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filtered.map((theme, i) => (
                      <motion.div
                        key={theme.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-[var(--pl-radius-lg)] overflow-hidden border border-[rgba(0,0,0,0.05)] bg-white hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        <div style={{ height: '90px', background: theme.previewGradient, position: 'relative' }}>
                          <div style={{
                            position: 'absolute', bottom: '10px', left: '12px',
                            fontFamily: `"${theme.fonts.heading}", serif`,
                            fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 600,
                            color: theme.colors.foreground, opacity: 0.6,
                          }}>Aa Bb</div>
                          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[0.5rem] font-bold uppercase tracking-[0.06em] text-[var(--pl-muted)]">
                            {theme.season === 'all-season' ? 'All Year' : theme.season}
                          </div>
                        </div>
                        {/* Color swatches */}
                        <div className="flex h-1.5">
                          {[theme.colors.background, theme.colors.accent, theme.colors.accentLight, theme.colors.muted, theme.colors.foreground].map((c, ci) => (
                            <div key={ci} className="flex-1" style={{ background: c }} />
                          ))}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-[0.85rem] font-semibold text-[var(--pl-ink)]">{theme.name}</h3>
                              <p className="text-[0.68rem] text-[var(--pl-muted)] mt-0.5">{theme.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex gap-1">
                              {theme.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[0.5rem] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full bg-[var(--pl-cream-deep)] text-[var(--pl-muted)]">{tag}</span>
                              ))}
                            </div>
                            <button
                              onClick={() => handleCopyTheme(theme.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.62rem] font-bold border-none cursor-pointer transition-all bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)] hover:bg-[var(--pl-olive)] hover:text-white"
                            >
                              {copiedId === theme.id ? <><Check size={10} /> Applied</> : <><Copy size={10} /> Copy Theme</>}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              );
            })()}

            {/* ── Asset Packs ── */}
            {activeTab === 'assets' && (() => {
              const packResults = search ? searchPacks(search) : MARKETPLACE_PACKS;
              const PACK_CATEGORIES = [
                { id: 'all', label: 'All' },
                { id: 'icon-pack', label: 'Icons' },
                { id: 'background-pack', label: 'Backgrounds' },
                { id: 'accent-pack', label: 'Accents' },
                { id: 'sticker-pack', label: 'Stickers' },
              ];
              const filtered = category === 'all' ? packResults : packResults.filter(p => p.category === category.replace('-pack', 's'));
              return (
                <>
                  <div className="mb-5">
                    <h2 className="font-heading italic text-[1.2rem] text-[var(--pl-ink)]">
                      {filtered.length} Asset Pack{filtered.length !== 1 ? 's' : ''}
                    </h2>
                    <p className="text-[0.78rem] text-[var(--pl-muted)] mt-1">
                      Icons, backgrounds, decorative accents, and stickers for your site.
                    </p>
                  </div>

                  {/* Pack category filter */}
                  <div className="flex gap-1.5 mb-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {PACK_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[0.65rem] font-bold uppercase tracking-[0.06em] border-none cursor-pointer transition-all ${
                          category === cat.id ? 'bg-[var(--pl-ink)] text-white' : 'bg-white text-[var(--pl-muted)]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filtered.map((pack, i) => (
                      <div
                        key={pack.id}
                        className="pl-enter rounded-[var(--pl-radius-lg)] overflow-hidden border border-[rgba(0,0,0,0.05)] bg-white hover:shadow-[0_8px_32px_rgba(43,30,20,0.08)] hover:-translate-y-1 transition-all"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        {/* Preview strip */}
                        <div className="h-[100px] relative flex items-center justify-center" style={{
                          background: pack.category === 'icons' ? 'linear-gradient(135deg, var(--pl-cream) 0%, var(--pl-olive-mist) 100%)'
                            : pack.category === 'backgrounds' ? 'linear-gradient(135deg, #E8D5C4 0%, #D4B8A0 100%)'
                            : pack.category === 'accents' ? 'linear-gradient(135deg, #F0E8F5 0%, #D4C0E0 100%)'
                            : 'linear-gradient(135deg, #FFE8E0 0%, #FFD0C0 100%)',
                        }}>
                          <Package size={28} className="text-[var(--pl-muted)] opacity-40" />
                          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[0.55rem] font-bold text-white">
                            {formatPrice(pack.price)}
                          </div>
                          <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[0.52rem] font-bold uppercase tracking-[0.08em] text-[var(--pl-muted)]">
                            {pack.items.length} items
                          </div>
                          {ownedItems.has(pack.id) && (
                            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-[var(--pl-olive)]/90 backdrop-blur-sm text-[0.52rem] font-bold text-white flex items-center gap-1">
                              <Check size={8} /> Owned
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-[0.88rem] font-semibold text-[var(--pl-ink)] mb-0.5">{pack.name}</h3>
                          <p className="text-[0.72rem] text-[var(--pl-muted)] leading-relaxed mb-3">{pack.description}</p>
                          <div className="flex items-center gap-2">
                            {ownedItems.has(pack.id) ? (
                              <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--pl-olive)] text-white text-[0.68rem] font-bold border-none cursor-pointer">
                                <Check size={11} /> View Assets
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePurchase(pack.id, pack.category)}
                                disabled={purchasing === pack.id}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--pl-ink)] text-white text-[0.68rem] font-bold border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                              >
                                {purchasing === pack.id ? 'Loading...' : <><ShoppingBag size={11} /> Buy Pack</>}
                              </button>
                            )}
                            <div className="flex gap-1">
                              {pack.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[0.5rem] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full bg-[var(--pl-cream-deep)] text-[var(--pl-muted)]">{tag}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            {/* ── Community ── */}
            {activeTab === 'community' && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-[var(--pl-olive-mist)] flex items-center justify-center mx-auto mb-5">
                  <Heart size={24} className="text-[var(--pl-olive)]" />
                </div>
                <h2 className="font-heading italic text-xl text-[var(--pl-ink)] mb-2">Community Creations</h2>
                <p className="text-[0.88rem] text-[var(--pl-muted)] max-w-[420px] mx-auto mb-2 leading-relaxed">
                  Share your custom templates and earn revenue when others use them.
                </p>
                <p className="text-[0.75rem] text-[var(--pl-muted)] max-w-[380px] mx-auto mb-8">
                  Creators keep 70% of template sales. Join the program to start selling.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="accent" size="md" icon={<ArrowRight size={14} />}>
                    Apply as Creator
                  </Button>
                  <Link
                    href="/partners"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[0.82rem] font-semibold text-[var(--pl-muted)] border border-[var(--pl-divider)] no-underline hover:text-[var(--pl-ink)] hover:border-[var(--pl-ink)] transition-all"
                  >
                    Partner Program
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
