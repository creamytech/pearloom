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
import { COLOR_THEMES, type ColorTheme } from '@/lib/templates/color-themes';
import { generateCardIllustration } from '@/lib/card-illustrations';
import { getThemeArt } from '@/lib/theme-art';
import { Button } from '@/components/ui/button';

// Wrap a ColorTheme as a minimal SiteTemplate so users can launch a fresh
// site from a pure palette. Hero + story blocks ship visible; everything else
// is added on demand from the editor.
function paletteToTemplate(theme: ColorTheme): SiteTemplate {
  return {
    id: `palette-${theme.id}`,
    name: theme.name,
    tagline: theme.description,
    description: theme.description,
    previewGradient: theme.previewGradient,
    occasions: theme.occasions,
    tags: theme.tags,
    popularity: 50,
    blocks: [
      { id: `hero-${theme.id}`,  type: 'hero',  order: 0, visible: true },
      { id: `story-${theme.id}`, type: 'story', order: 1, visible: true },
    ],
    theme: { colors: theme.colors, fonts: theme.fonts },
    vibeString: theme.description,
    layoutFormat: 'magazine',
    poetry: {
      heroTagline: theme.description,
      closingLine: 'Thank you for being part of our story.',
      rsvpIntro: 'We can\u2019t wait to celebrate with you.',
      welcomeStatement: 'Welcome to our celebration.',
    },
  };
}

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
  const [mode, setMode] = useState<'templates' | 'palettes'>('templates');
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const templates = search
    ? searchTemplates(search)
    : filter === 'all'
      ? [...SITE_TEMPLATES].sort((a, b) => b.popularity - a.popularity)
      : SITE_TEMPLATES.filter(t => t.occasions.includes(filter));

  const palettes = (() => {
    const q = search.trim().toLowerCase();
    const base = filter === 'all'
      ? COLOR_THEMES
      : COLOR_THEMES.filter((p) => p.occasions.includes(filter));
    if (!q) return base;
    return base.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q))
    );
  })();

  const handleApply = () => {
    if (mode === 'palettes') {
      const id = selected?.startsWith('palette-') ? selected.slice('palette-'.length) : selected;
      const palette = COLOR_THEMES.find((p) => p.id === id);
      if (palette) onSelect(paletteToTemplate(palette));
      return;
    }
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
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'color-mix(in oklab, var(--pl-ink) 50%, transparent)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Gallery */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative z-10 w-full max-w-[960px] max-h-[88vh] flex flex-col"
        style={{
          borderRadius: 16,
          background: 'var(--pl-cream-card)',
          border: '1px solid var(--pl-divider)',
          boxShadow: '0 24px 64px color-mix(in oklab, var(--pl-ink) 20%, transparent)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            padding: '24px 28px 18px',
            borderBottom: '1px solid var(--pl-divider)',
            background: 'color-mix(in oklab, var(--pl-cream) 50%, transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <span
                style={{
                  display: 'inline-block',
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-muted)',
                  marginBottom: 6,
                }}
              >
                Start somewhere
              </span>
              <h2
                style={{
                  fontFamily: 'var(--pl-font-display)',
                  fontSize: 'clamp(1.6rem, 2.4vw, 2rem)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                  color: 'var(--pl-ink)',
                  margin: 0,
                  fontWeight: 400,
                  fontVariationSettings: '"opsz" 32, "SOFT" 70, "WONK" 1',
                }}
              >
                Pick a <em style={{ fontStyle: 'italic', color: 'var(--pl-olive)' }}>template</em>.
              </h2>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--pl-ink-soft)',
                  margin: '8px 0 0',
                  maxWidth: 460,
                  lineHeight: 1.5,
                }}
              >
                Every template is a fully composed starting point — typography, palette, and pacing already in tune. You'll customize freely from there.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close template gallery"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: '1px solid var(--pl-divider)',
                background: 'var(--pl-cream-card)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--pl-muted)',
                transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--pl-ink)';
                e.currentTarget.style.color = 'var(--pl-ink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--pl-divider)';
                e.currentTarget.style.color = 'var(--pl-muted)';
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid var(--pl-divider)',
                background: 'var(--pl-cream-card)',
              }}
            >
              <Search size={13} style={{ color: 'var(--pl-muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by mood, theme, or palette…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 'max(16px, 0.85rem)',
                  color: 'var(--pl-ink)',
                  fontFamily: 'var(--pl-font-body)',
                }}
              />
            </div>
            <div
              role="tablist"
              aria-label="Gallery mode"
              style={{
                display: 'inline-flex',
                padding: 3,
                borderRadius: 999,
                border: '1px solid var(--pl-divider)',
                background: 'var(--pl-cream-card)',
              }}
            >
              {(['templates', 'palettes'] as const).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={active}
                    onClick={() => { setMode(m); setSelected(null); }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      border: 'none',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      background: active ? 'var(--pl-ink)' : 'transparent',
                      color: active ? 'var(--pl-cream)' : 'var(--pl-ink-soft)',
                      transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
                    }}
                  >
                    {m === 'templates' ? 'Templates' : 'Palettes'}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setFilter(f.id); setSearch(''); }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 999,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      border: `1px solid ${active ? 'var(--pl-ink)' : 'var(--pl-divider)'}`,
                      background: active ? 'var(--pl-ink)' : 'var(--pl-cream-card)',
                      color: active ? 'var(--pl-cream)' : 'var(--pl-ink-soft)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-auto" style={{ padding: 'clamp(16px, 3vw, 28px)' }}>
          {mode === 'palettes' ? (
            palettes.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--pl-muted)',
                  fontFamily: 'var(--pl-font-display)',
                  fontStyle: 'italic',
                  fontSize: '0.96rem',
                }}
              >
                No palettes match your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {palettes.map((palette, i) => {
                  const id = `palette-${palette.id}`;
                  const isSelected = selected === id;
                  const isHovered = hoveredId === id;
                  return (
                    <motion.button
                      key={id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => setSelected(isSelected ? null : id)}
                      onMouseEnter={() => setHoveredId(id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="text-left"
                      style={{
                        borderRadius: 14,
                        overflow: 'hidden',
                        border: isSelected
                          ? '1.5px solid var(--pl-olive)'
                          : '1px solid var(--pl-divider)',
                        boxShadow: isSelected
                          ? '0 0 0 3px color-mix(in oklab, var(--pl-olive) 18%, transparent), 0 8px 28px color-mix(in oklab, var(--pl-ink) 14%, transparent)'
                          : isHovered
                            ? '0 8px 24px color-mix(in oklab, var(--pl-ink) 12%, transparent)'
                            : '0 1px 3px color-mix(in oklab, var(--pl-ink) 4%, transparent)',
                        background: 'var(--pl-cream-card)',
                        cursor: 'pointer',
                        transition: 'box-shadow var(--pl-dur-mid) var(--pl-ease-out), border-color var(--pl-dur-mid) var(--pl-ease-out), transform var(--pl-dur-mid) var(--pl-ease-out)',
                        transform: isHovered ? 'translateY(-3px)' : 'none',
                      } as React.CSSProperties}
                    >
                      <div
                        style={{
                          height: 140,
                          background: palette.previewGradient,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute', top: 10, right: 10,
                              width: 24, height: 24, borderRadius: '50%',
                              background: 'var(--pl-olive)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 4px 12px color-mix(in oklab, var(--pl-olive) 30%, transparent)',
                            }}
                          >
                            <Check size={13} color="white" strokeWidth={3} />
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', height: 6, zIndex: 3 }}>
                          {[palette.colors.background, palette.colors.accent, palette.colors.accentLight, palette.colors.muted, palette.colors.foreground].map((c, ci) => (
                            <div key={ci} style={{ flex: 1, background: c }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ padding: '14px 16px 16px' }}>
                        <h3 style={{
                          fontFamily: 'var(--pl-font-display)',
                          fontSize: '1rem', fontWeight: 500,
                          letterSpacing: '-0.01em', color: 'var(--pl-ink)',
                          margin: '0 0 4px',
                        }}>
                          {palette.name}
                        </h3>
                        <p style={{
                          fontSize: '0.74rem', color: 'var(--pl-ink-soft)',
                          margin: 0, lineHeight: 1.45,
                          fontFamily: 'var(--pl-font-display)', fontStyle: 'italic',
                        }}>
                          {palette.description}
                        </p>
                        <div className="flex gap-1 mt-3 flex-wrap">
                          {palette.tags.slice(0, 3).map((tag) => (
                            <span key={tag} style={{
                              fontSize: '0.55rem', fontWeight: 600,
                              letterSpacing: '0.12em', textTransform: 'uppercase',
                              padding: '2px 8px', borderRadius: 999,
                              background: 'color-mix(in oklab, var(--pl-ink) 6%, transparent)',
                              color: 'var(--pl-ink-soft)',
                              fontFamily: 'var(--pl-font-mono)',
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )
          ) : templates.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--pl-muted)',
                fontFamily: 'var(--pl-font-display)',
                fontStyle: 'italic',
                fontSize: '0.96rem',
              }}
            >
              No templates match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((template, i) => {
                const isSelected = selected === template.id;
                const isHovered = hoveredId === template.id;
                return (
                  <motion.button
                    key={template.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => setSelected(isSelected ? null : template.id)}
                    onMouseEnter={() => setHoveredId(template.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="text-left"
                    style={{
                      borderRadius: 14,
                      overflow: 'hidden',
                      border: isSelected
                        ? '1.5px solid var(--pl-olive)'
                        : '1px solid var(--pl-divider)',
                      boxShadow: isSelected
                        ? '0 0 0 3px color-mix(in oklab, var(--pl-olive) 18%, transparent), 0 8px 28px color-mix(in oklab, var(--pl-ink) 14%, transparent)'
                        : isHovered
                          ? '0 8px 24px color-mix(in oklab, var(--pl-ink) 12%, transparent)'
                          : '0 1px 3px color-mix(in oklab, var(--pl-ink) 4%, transparent)',
                      background: 'var(--pl-cream-card)',
                      cursor: 'pointer',
                      transition: 'box-shadow var(--pl-dur-mid) var(--pl-ease-out), border-color var(--pl-dur-mid) var(--pl-ease-out), transform var(--pl-dur-mid) var(--pl-ease-out)',
                      transform: isHovered ? 'translateY(-3px)' : 'none',
                    } as React.CSSProperties}
                  >
                    {/* Custom SVG art preview */}
                    <div
                      style={{
                        height: 140,
                        background: template.theme.colors.background,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
                        dangerouslySetInnerHTML={{ __html: generateCardIllustration(template.id, {
                          background: template.theme.colors.background,
                          accent: template.theme.colors.accent,
                          accent2: template.theme.colors.accentLight,
                          foreground: template.theme.colors.foreground,
                        }) }}
                      />

                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'var(--pl-olive)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 5,
                            boxShadow: '0 4px 12px color-mix(in oklab, var(--pl-olive) 30%, transparent)',
                          }}
                        >
                          <Check size={13} color="white" strokeWidth={3} />
                        </div>
                      )}

                      {template.popularity >= 90 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 10,
                            left: 10,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 999,
                            background: 'color-mix(in oklab, var(--pl-cream-card) 92%, transparent)',
                            border: '1px solid var(--pl-divider)',
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: 'var(--pl-ink)',
                            backdropFilter: 'blur(6px)',
                            zIndex: 5,
                          }}
                        >
                          <Sparkles size={9} /> Editor's pick
                        </div>
                      )}

                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', height: 3, zIndex: 3 }}>
                        {[template.theme.colors.accent, template.theme.colors.accentLight, template.theme.colors.muted].map((c, ci) => (
                          <div key={ci} style={{ flex: 1, background: c }} />
                        ))}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '14px 16px 16px' }}>
                      <h3
                        style={{
                          fontFamily: 'var(--pl-font-display)',
                          fontSize: '1rem',
                          fontWeight: 500,
                          letterSpacing: '-0.01em',
                          color: 'var(--pl-ink)',
                          margin: '0 0 4px',
                          fontVariationSettings: '"opsz" 18, "SOFT" 60',
                        }}
                      >
                        {template.name}
                      </h3>
                      <p
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--pl-ink-soft)',
                          margin: 0,
                          lineHeight: 1.45,
                          fontFamily: 'var(--pl-font-display)',
                          fontStyle: 'italic',
                          fontVariationSettings: '"opsz" 12',
                        }}
                      >
                        {template.tagline}
                      </p>
                      <div className="flex gap-1 mt-3 flex-wrap">
                        {template.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            style={{
                              fontSize: '0.55rem',
                              fontWeight: 600,
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: 'color-mix(in oklab, var(--pl-ink) 6%, transparent)',
                              color: 'var(--pl-ink-soft)',
                              fontFamily: 'var(--pl-font-mono)',
                            }}
                          >
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
        <div
          style={{
            flexShrink: 0,
            padding: '16px 28px',
            borderTop: '1px solid var(--pl-divider)',
            background: 'color-mix(in oklab, var(--pl-cream) 60%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--pl-ink-soft)',
              margin: 0,
              fontFamily: 'var(--pl-font-display)',
              fontStyle: selected ? 'italic' : 'normal',
            }}
          >
            {selected
              ? mode === 'palettes'
                ? `"${COLOR_THEMES.find((p) => `palette-${p.id}` === selected)?.name}" palette selected.`
                : `"${SITE_TEMPLATES.find(t => t.id === selected)?.name}" selected.`
              : mode === 'palettes'
                ? `${palettes.length} palettes ready.`
                : `${templates.length} templates ready.`
            }
          </p>
          <Button
            variant="primary"
            size="md"
            disabled={!selected}
            onClick={handleApply}
            icon={<ArrowRight size={14} />}
          >
            {mode === 'palettes' ? 'Use this palette' : 'Use this template'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
