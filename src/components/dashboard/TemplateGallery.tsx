'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/TemplateGallery.tsx
// Template selection gallery — users pick a template and get
// a fully populated site. Wired into Quick Start flow.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Search, X, Sparkles } from 'lucide-react';
import { SITE_TEMPLATES, searchTemplates, type SiteTemplate } from '@/lib/templates/wedding-templates';
import { generateCardIllustration } from '@/lib/card-illustrations';
import { getThemeArt } from '@/lib/theme-art';
import { Button } from '@/components/ui/button';

interface TemplateGalleryProps {
  onSelect: (template: SiteTemplate) => void;
  onClose: () => void;
  occasion?: string;
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'wedding', label: 'Wedding' },
  { id: 'anniversary', label: 'Anniversary' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'birthday', label: 'Birthday' },
];

export function TemplateGallery({ onSelect, onClose, occasion }: TemplateGalleryProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(occasion || 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const templates = search
    ? searchTemplates(search)
    : filter === 'all'
      ? [...SITE_TEMPLATES].sort((a, b) => b.popularity - a.popularity)
      : SITE_TEMPLATES.filter(t => t.occasions.includes(filter));

  const handleApply = () => {
    const template = SITE_TEMPLATES.find(t => t.id === selected);
    if (template) onSelect(template);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Gallery */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative z-10 w-full max-w-[900px] max-h-[85vh] flex flex-col rounded-xl bg-white border border-[#E4E4E7] shadow-[0_16px_48px_rgba(0,0,0,0.12)]"
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-[#E4E4E7]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[1.2rem] font-semibold text-[#18181B] m-0">
                Choose a Template
              </h2>
              <p className="text-[0.78rem] text-[#71717A] mt-1">
                Pick a starting point — every template is fully customizable.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-md border border-[#E4E4E7] bg-transparent cursor-pointer flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:border-[#18181B] transition-colors"
              aria-label="Close template gallery"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-md border border-[#E4E4E7] bg-white">
              <Search size={14} className="text-[#A1A1AA] flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="flex-1 bg-transparent border-none outline-none text-[max(16px,0.85rem)] text-[#18181B] placeholder:text-[#A1A1AA]"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setFilter(f.id); setSearch(''); }}
                  className={`px-3 py-1.5 rounded-md text-[0.72rem] font-semibold border cursor-pointer transition-all whitespace-nowrap flex-shrink-0 ${
                    filter === f.id
                      ? 'bg-[#18181B] text-white border-[#18181B]'
                      : 'bg-white text-[#71717A] border-[#E4E4E7] hover:text-[#18181B] hover:border-[#18181B]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {templates.length === 0 ? (
            <div className="text-center py-12 text-[#71717A]">
              <p className="text-[0.92rem]">No templates match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template, i) => {
                const isSelected = selected === template.id;
                const isHovered = hoveredId === template.id;
                return (
                  <motion.button
                    key={template.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    onClick={() => setSelected(isSelected ? null : template.id)}
                    onMouseEnter={() => setHoveredId(template.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="text-left"
                    style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: isSelected ? '2px solid #18181B' : '1px solid #E4E4E7',
                      boxShadow: isSelected
                        ? '0 0 0 1px #18181B'
                        : '0 1px 3px rgba(0,0,0,0.04)',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      transform: isHovered ? 'translateY(-2px)' : 'none',
                    } as React.CSSProperties}
                  >
                    {/* Custom SVG art preview */}
                    <div
                      style={{
                        height: '120px',
                        background: template.theme.colors.background,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Bold scene illustration */}
                      <div
                        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
                        dangerouslySetInnerHTML={{ __html: generateCardIllustration(template.id, {
                          background: template.theme.colors.background,
                          accent: template.theme.colors.accent,
                          accent2: template.theme.colors.accentLight,
                          foreground: template.theme.colors.foreground,
                        }) }}
                      />

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-md bg-[#18181B] flex items-center justify-center" style={{ zIndex: 5 }}>
                          <Check size={14} color="white" strokeWidth={3} />
                        </div>
                      )}

                      {/* Popularity badge */}
                      {template.popularity >= 90 && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E4E4E7] text-[0.55rem] font-semibold uppercase tracking-[0.06em] text-[#18181B]" style={{ zIndex: 5 }}>
                          <Sparkles size={9} /> Popular
                        </div>
                      )}

                      {/* Color palette strip */}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', height: '2px', zIndex: 3 }}>
                        {[template.theme.colors.accent, template.theme.colors.accentLight, template.theme.colors.muted].map((c, ci) => (
                          <div key={ci} style={{ flex: 1, background: c }} />
                        ))}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '12px 14px' }}>
                      <h3 style={{
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: 'var(--pl-ink)',
                        margin: '0 0 2px',
                      }}>
                        {template.name}
                      </h3>
                      <p style={{
                        fontSize: '0.72rem',
                        color: 'var(--pl-muted)',
                        margin: 0,
                        lineHeight: 1.4,
                      }}>
                        {template.tagline}
                      </p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {template.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[0.55rem] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-md bg-[#F4F4F5] text-[#71717A]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — apply button */}
        <div className="shrink-0 px-6 py-4 border-t border-[#E4E4E7] flex items-center justify-between">
          <p className="text-[0.75rem] text-[#71717A]">
            {selected
              ? `"${SITE_TEMPLATES.find(t => t.id === selected)?.name}" selected`
              : `${templates.length} templates available`
            }
          </p>
          <Button
            variant="primary"
            size="md"
            disabled={!selected}
            onClick={handleApply}
            icon={<ArrowRight size={14} />}
          >
            Use This Template
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
