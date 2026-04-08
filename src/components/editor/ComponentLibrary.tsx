'use client';

// -----------------------------------------------------------------
// Pearloom / editor/ComponentLibrary.tsx
// Full component/symbol system — save styled sections as reusable
// components and insert them into any page.
// -----------------------------------------------------------------

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Trash2, Plus, Search,
  Image, BookOpen, CalendarDays, Mail, Gift, Plane,
  HelpCircle, Timer, FileText, Quote, Video, MapPin,
  Camera, MessageSquare, Minus, Music, Hash, Star,
  Layout, Type, Film, MousePointer,
  Pencil, Check, X, Sparkles, Clock,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { SidebarSection } from './EditorSidebar';
import type {
  StoryManifest, BlockType, PageBlock, SavedComponent, ComponentCategory,
} from '@/types';

// ── localStorage key ────────────────────────────────────────────
const STORAGE_KEY = 'pearloom-components';

// ── Block type icons ────────────────────────────────────────────
const BLOCK_ICONS: Record<string, LucideIcon> = {
  hero: Image, story: BookOpen, event: CalendarDays,
  rsvp: Mail, registry: Gift, travel: Plane,
  faq: HelpCircle, countdown: Timer, text: FileText,
  quote: Quote, video: Video, map: MapPin,
  photos: Camera, guestbook: MessageSquare, divider: Minus,
  spotify: Music, quiz: HelpCircle, photoWall: Camera,
  hashtag: Hash, gallery: Image, vibeQuote: Quote,
  welcome: FileText, footer: Minus, anniversary: Star,
  weddingParty: Star,
};

const BLOCK_LABELS: Record<string, string> = {
  hero: 'Hero', story: 'Story', event: 'Events',
  rsvp: 'RSVP', registry: 'Registry', travel: 'Travel',
  faq: 'FAQ', countdown: 'Countdown', text: 'Text',
  quote: 'Quote', video: 'Video', map: 'Map',
  photos: 'Photos', guestbook: 'Guestbook', divider: 'Divider',
  spotify: 'Music', quiz: 'Quiz', photoWall: 'Guest Photos',
  hashtag: 'Hashtags', gallery: 'Gallery', vibeQuote: 'Vibe Quote',
  welcome: 'Welcome', footer: 'Footer', anniversary: 'Anniversary',
  weddingParty: 'Wedding Party',
};

// ── Category config ─────────────────────────────────────────────
const CATEGORY_META: Record<ComponentCategory, { label: string; icon: LucideIcon; color: string }> = {
  layout:      { label: 'Layout',      icon: Layout,       color: '#7c93c3' },
  content:     { label: 'Content',     icon: Type,         color: '#a3b18a' },
  media:       { label: 'Media',       icon: Film,         color: '#d4a373' },
  interactive: { label: 'Interactive', icon: MousePointer, color: '#c97b84' },
};

const ALL_CATEGORIES: ComponentCategory[] = ['layout', 'content', 'media', 'interactive'];

function inferCategory(type: BlockType): ComponentCategory {
  switch (type) {
    case 'hero': case 'divider': case 'footer': case 'welcome':
      return 'layout';
    case 'story': case 'text': case 'quote': case 'vibeQuote': case 'countdown': case 'anniversary': case 'weddingParty':
      return 'content';
    case 'photos': case 'gallery': case 'photoWall': case 'video': case 'spotify': case 'map':
      return 'media';
    case 'rsvp': case 'guestbook': case 'faq': case 'event': case 'registry': case 'travel': case 'hashtag': case 'quiz':
      return 'interactive';
    default:
      return 'content';
  }
}

// ── Built-in templates ──────────────────────────────────────────
const BUILTIN_TEMPLATES: SavedComponent[] = [
  {
    id: 'builtin-elegant-hero',
    name: 'Elegant Hero',
    type: 'hero',
    category: 'layout',
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    config: {
      title: 'Our Love Story',
      subtitle: 'A celebration of forever',
      layout: 'fullbleed',
      overlayOpacity: 0.35,
      textAlign: 'center',
    },
    blockEffects: {
      scrollReveal: 'fade',
    },
  },
  {
    id: 'builtin-photo-grid',
    name: 'Photo Grid',
    type: 'gallery',
    category: 'media',
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    config: {
      title: 'Our Moments',
      layout: 'masonry',
      columns: 3,
      gap: 8,
      showCaptions: true,
    },
    blockEffects: {
      scrollReveal: 'zoom',
    },
  },
  {
    id: 'builtin-timeline-card',
    name: 'Timeline Card',
    type: 'story',
    category: 'content',
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    config: {
      title: 'Chapter One',
      subtitle: 'How We Met',
      layout: 'editorial',
      showTimeline: true,
    },
    blockEffects: {
      scrollReveal: 'slide-up',
    },
  },
  {
    id: 'builtin-rsvp-form',
    name: 'RSVP Form',
    type: 'rsvp',
    category: 'interactive',
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    config: {
      title: 'Will You Join Us?',
      subtitle: 'We would be honored to have you celebrate with us',
      showMealOptions: true,
      showDietaryNotes: true,
      showPlusOne: true,
    },
    blockEffects: {
      scrollReveal: 'slide-up',
    },
  },
  {
    id: 'builtin-faq-accordion',
    name: 'FAQ Accordion',
    type: 'faq',
    category: 'interactive',
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    config: {
      title: 'Questions & Answers',
      subtitle: 'Everything you need to know',
      style: 'accordion',
      expandFirst: true,
    },
    blockEffects: {
      scrollReveal: 'fade',
    },
  },
];

// ── Preview thumbnail generator ─────────────────────────────────
function BlockPreview({ type, config }: { type: string; config?: Record<string, unknown> }) {
  const Icon = BLOCK_ICONS[type] || Package;

  const renderMiniPreview = () => {
    switch (type) {
      case 'hero':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            <div style={{ width: '60%', height: '3px', borderRadius: '2px', background: 'var(--pl-olive-40)' }} />
            <div style={{ width: '40%', height: '2px', borderRadius: '2px', background: 'var(--pl-olive-20)' }} />
            <div style={{ width: '20%', height: '2px', borderRadius: '2px', background: 'var(--pl-olive-15)', marginTop: '2px' }} />
          </div>
        );
      case 'gallery': case 'photos': case 'photoWall':
        return (
          <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px', padding: '4px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ borderRadius: '2px', background: `rgba(163,177,138,${0.15 + (i % 3) * 0.08})` }} />
            ))}
          </div>
        );
      case 'story': case 'text':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 8px', justifyContent: 'center' }}>
            <div style={{ width: '70%', height: '2px', borderRadius: '1px', background: 'rgba(163,177,138,0.35)' }} />
            <div style={{ width: '100%', height: '2px', borderRadius: '1px', background: 'rgba(163,177,138,0.2)' }} />
            <div style={{ width: '85%', height: '2px', borderRadius: '1px', background: 'rgba(163,177,138,0.2)' }} />
            <div style={{ width: '60%', height: '2px', borderRadius: '1px', background: 'var(--pl-olive-15)' }} />
          </div>
        );
      case 'faq':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '3px', padding: '5px 6px', justifyContent: 'center' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '1px', background: 'var(--pl-olive-40)', flexShrink: 0 }} />
                <div style={{ flex: 1, height: '2px', borderRadius: '1px', background: `rgba(163,177,138,${0.25 - i * 0.05})` }} />
              </div>
            ))}
          </div>
        );
      case 'rsvp':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '3px', padding: '5px 8px', justifyContent: 'center' }}>
            <div style={{ width: '50%', height: '2px', borderRadius: '1px', background: 'rgba(163,177,138,0.3)', margin: '0 auto' }} />
            <div style={{ width: '80%', height: '6px', borderRadius: '3px', border: '1px solid rgba(163,177,138,0.2)', margin: '1px auto 0' }} />
            <div style={{ width: '40%', height: '5px', borderRadius: '3px', background: 'rgba(163,177,138,0.3)', margin: '1px auto 0' }} />
          </div>
        );
      case 'event': case 'countdown':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(163,177,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--pl-olive-40)' }} />
            </div>
          </div>
        );
      default:
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} style={{ color: 'var(--pl-olive-40)' }} />
          </div>
        );
    }
  };

  return (
    <div style={{
      width: '100%', height: '48px', borderRadius: '8px 8px 0 0',
      background: 'rgba(255,255,255,0.08)',
      border: 'none',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {renderMiniPreview()}
    </div>
  );
}

// ── localStorage helpers ────────────────────────────────────────
function loadStoredComponents(): SavedComponent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedComponent[];
  } catch {
    return [];
  }
}

function saveStoredComponents(components: SavedComponent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
  } catch { /* quota exceeded */ }
}

// ── Component Library ───────────────────────────────────────────
interface ComponentLibraryProps {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

export function ComponentLibrary({ manifest, onChange }: ComponentLibraryProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showBuiltIns, setShowBuiltIns] = useState(true);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── Merge manifest + localStorage components ────────────────
  const manifestComponents = manifest.savedComponents || [];
  const [localComponents, setLocalComponents] = useState<SavedComponent[]>(() => loadStoredComponents());

  // Combine: manifest components take precedence, then localStorage
  const allUserComponents = (() => {
    const ids = new Set(manifestComponents.map(c => c.id));
    const merged = [...manifestComponents];
    for (const lc of localComponents) {
      if (!ids.has(lc.id)) {
        merged.push(lc);
        ids.add(lc.id);
      }
    }
    return merged;
  })();

  const allComponents = showBuiltIns
    ? [...allUserComponents, ...BUILTIN_TEMPLATES.filter(bt => !allUserComponents.some(c => c.id === bt.id))]
    : allUserComponents;

  // ── Filter by category + search ──────────────────────────────
  const filtered = allComponents.filter(c => {
    const matchesCategory = activeCategory === 'all' || c.category === activeCategory;
    const matchesSearch = !searchQuery.trim() || (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (BLOCK_LABELS[c.type] || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesCategory && matchesSearch;
  });

  // ── Sync to localStorage when components change ──────────────
  const syncComponents = useCallback((components: SavedComponent[]) => {
    setLocalComponents(components);
    saveStoredComponents(components);
    onChange({ ...manifest, savedComponents: components });
  }, [manifest, onChange]);

  // ── Insert a component ────────────────────────────────────────
  const handleInsert = useCallback((component: SavedComponent) => {
    const blocks = manifest.blocks || [];
    const newBlock: PageBlock = {
      id: `block-${component.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: component.type,
      order: blocks.length,
      visible: true,
      config: component.config ? { ...component.config } : undefined,
      blockEffects: component.blockEffects ? { ...component.blockEffects } : undefined,
    };
    const updated = [...blocks, newBlock];
    onChange({ ...manifest, blocks: updated.map((b, i) => ({ ...b, order: i })) });
    showToast({ message: `Inserted "${component.name}"`, type: 'success' });
  }, [manifest, onChange, showToast]);

  // ── Delete a component ────────────────────────────────────────
  const handleDelete = useCallback((componentId: string) => {
    const component = allUserComponents.find(c => c.id === componentId);
    if (!component) return;
    const updated = allUserComponents.filter(c => c.id !== componentId);
    syncComponents(updated);
    showToast({ message: `Removed "${component.name}" from library`, type: 'info' });
    setConfirmDeleteId(null);
  }, [allUserComponents, syncComponents, showToast]);

  // ── Rename a component ────────────────────────────────────────
  const handleStartRename = useCallback((component: SavedComponent) => {
    setEditingId(component.id);
    setEditName(component.name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, []);

  const handleCommitRename = useCallback(() => {
    if (!editingId || !editName.trim()) {
      setEditingId(null);
      return;
    }
    const updated = allUserComponents.map(c =>
      c.id === editingId ? { ...c, name: editName.trim() } : c
    );
    syncComponents(updated);
    setEditingId(null);
    showToast({ message: 'Component renamed', type: 'success' });
  }, [editingId, editName, allUserComponents, syncComponents, showToast]);

  // Category counts
  const categoryCounts = ALL_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = allComponents.filter(c => c.category === cat).length;
    return acc;
  }, {} as Record<ComponentCategory, number>);

  const userCount = allUserComponents.length;
  const builtInCount = BUILTIN_TEMPLATES.filter(bt => !allUserComponents.some(c => c.id === bt.id)).length;

  return (
    <div style={{ padding: '0' }}>
      <SidebarSection title="Component Library" icon={Package} badge={allComponents.length || undefined}>
        {/* Header description */}
        <div style={{
          padding: '0 12px 10px',
          fontSize: '0.72rem',
          color: 'var(--pl-muted)',
          lineHeight: 1.5,
        }}>
          Save styled sections as reusable components. Insert them on any page.
        </div>

        {/* Search bar */}
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 10px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--pl-glass-dark-border)',
            boxShadow: '0 1px 4px rgba(43,30,20,0.08)',
          } as React.CSSProperties}>
            <Search size={12} style={{ color: 'var(--pl-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: '0.72rem', color: 'var(--pl-ink)',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <motion.button
                onClick={() => setSearchQuery('')}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex', padding: '0' }}
              >
                <X size={11} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Category filter chips */}
        <div style={{
          padding: '0 12px 10px',
          display: 'flex', flexWrap: 'wrap', gap: '4px',
        }}>
          <CategoryChip
            label="All"
            count={allComponents.length}
            active={activeCategory === 'all'}
            color="var(--pl-olive, #a3b18a)"
            onClick={() => setActiveCategory('all')}
          />
          {ALL_CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat];
            return (
              <CategoryChip
                key={cat}
                label={meta.label}
                count={categoryCounts[cat]}
                active={activeCategory === cat}
                color={meta.color}
                onClick={() => setActiveCategory(activeCategory === cat ? 'all' : cat)}
              />
            );
          })}
        </div>

        {/* Show built-ins toggle */}
        <div style={{ padding: '0 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--pl-muted)', fontWeight: 600 }}>
            {userCount} saved{builtInCount > 0 && showBuiltIns ? ` + ${builtInCount} templates` : ''}
          </span>
          <motion.button
            onClick={() => setShowBuiltIns(!showBuiltIns)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              background: showBuiltIns ? 'rgba(163,177,138,0.12)' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(163,177,138,0.2)',
              borderRadius: '6px', padding: '3px 8px',
              fontSize: '0.6rem', fontWeight: 700,
              color: showBuiltIns ? 'var(--pl-olive)' : 'var(--pl-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              transition: 'all 0.15s',
            }}
          >
            <Sparkles size={9} />
            Templates
          </motion.button>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && !searchQuery && (
          <div style={{
            padding: '24px 16px', textAlign: 'center',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--pl-glass-dark-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 2px 8px rgba(43,30,20,0.08)',
            } as React.CSSProperties}>
              <Package size={20} style={{ color: 'var(--pl-muted)' }} />
            </div>
            <div style={{
              fontSize: '0.78rem', fontWeight: 600,
              color: 'var(--pl-ink-soft)', marginBottom: '4px',
              fontFamily: 'var(--pl-font-heading)',
            }}>
              No saved components yet
            </div>
            <div style={{
              fontSize: '0.68rem', color: 'var(--pl-muted)',
              lineHeight: 1.5,
            }}>
              Select any section on the canvas and click the save button in the toolbar to create a reusable component.
            </div>
          </div>
        )}

        {/* Component grid */}
        <div style={{
          padding: '0 8px 8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '6px',
        }}>
          <AnimatePresence initial={false}>
            {filtered.map((component) => {
              const isDeleting = confirmDeleteId === component.id;
              const isEditing = editingId === component.id;
              const catMeta = CATEGORY_META[component.category];
              const isBuiltIn = component.builtIn;
              const typeLabel = BLOCK_LABELS[component.type] || component.type;

              return (
                <motion.div
                  key={component.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.93, height: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  style={{
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.25)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: isBuiltIn
                      ? '1px solid rgba(163,177,138,0.25)'
                      : '1px solid var(--pl-glass-dark-border)',
                    boxShadow: '0 2px 8px rgba(43,30,20,0.08)',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  } as React.CSSProperties}
                >
                  {/* Preview thumbnail */}
                  <BlockPreview type={component.type} config={component.config} />

                  {/* Built-in badge */}
                  {isBuiltIn && (
                    <div style={{
                      position: 'absolute', top: '4px', right: '4px',
                      padding: '1px 5px', borderRadius: '4px',
                      background: 'rgba(163,177,138,0.85)',
                      backdropFilter: 'blur(4px)',
                      fontSize: '0.5rem', fontWeight: 800,
                      color: 'white', letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    } as React.CSSProperties}>
                      Template
                    </div>
                  )}

                  {/* Content area */}
                  <div style={{ padding: '8px 10px 6px', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {/* Name -- editable */}
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                        <input
                          ref={editInputRef}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleCommitRename();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={handleCommitRename}
                          style={{
                            flex: 1, minWidth: 0, border: 'none', borderBottom: '1px solid var(--pl-olive)',
                            background: 'transparent', fontSize: '0.72rem', fontWeight: 600,
                            color: 'var(--pl-ink)', outline: 'none', padding: '0 0 1px',
                          }}
                        />
                        <motion.button
                          onClick={handleCommitRename}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-olive)', display: 'flex', padding: '0' }}
                        >
                          <Check size={11} />
                        </motion.button>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: '0.72rem', fontWeight: 600,
                          color: 'var(--pl-ink)', lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          cursor: isBuiltIn ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '3px',
                        }}
                        onClick={() => !isBuiltIn && handleStartRename(component)}
                        title={isBuiltIn ? component.name : 'Click to rename'}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {component.name}
                        </span>
                        {!isBuiltIn && <Pencil size={8} style={{ color: 'var(--pl-muted)', flexShrink: 0, opacity: 0.5 }} />}
                      </div>
                    )}

                    {/* Type badge + category */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.52rem', fontWeight: 700,
                        color: catMeta.color, letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '1px 4px', borderRadius: '3px',
                        background: `${catMeta.color}15`,
                      }}>
                        {typeLabel}
                      </span>
                      <span style={{
                        fontSize: '0.48rem', fontWeight: 600,
                        color: 'var(--pl-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {catMeta.label}
                      </span>
                    </div>

                    {/* Created date */}
                    <div style={{
                      fontSize: '0.5rem', color: 'var(--pl-muted)',
                      display: 'flex', alignItems: 'center', gap: '3px',
                      marginTop: '1px',
                    }}>
                      <Clock size={7} />
                      {new Date(component.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {/* Insert button */}
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); handleInsert(component); }}
                      whileHover={{ backgroundColor: 'var(--pl-olive-15)' }}
                      whileTap={{ scale: 0.96 }}
                      title="Insert on page"
                      style={{
                        flex: 1, padding: '6px 0',
                        border: 'none', background: 'rgba(163,177,138,0.06)',
                        color: 'var(--pl-olive)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        fontSize: '0.6rem', fontWeight: 700,
                        borderRight: '1px solid rgba(255,255,255,0.1)',
                        transition: 'background 0.15s',
                      }}
                    >
                      <Plus size={10} />
                      Insert
                    </motion.button>

                    {/* Delete button */}
                    {!isBuiltIn && (
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDeleting) {
                            handleDelete(component.id);
                          } else {
                            setConfirmDeleteId(component.id);
                            setTimeout(() => setConfirmDeleteId(null), 3000);
                          }
                        }}
                        whileHover={{ backgroundColor: isDeleting ? 'rgba(220,60,60,0.15)' : 'rgba(220,60,60,0.06)' }}
                        whileTap={{ scale: 0.96 }}
                        title={isDeleting ? 'Click again to confirm' : 'Delete component'}
                        style={{
                          padding: '6px 10px',
                          border: 'none',
                          background: isDeleting ? 'rgba(220,60,60,0.08)' : 'transparent',
                          color: isDeleting ? '#dc3c3c' : 'var(--pl-muted)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'color 0.15s, background 0.15s',
                        }}
                      >
                        <Trash2 size={10} />
                      </motion.button>
                    )}
                  </div>

                  {/* Confirm delete text */}
                  <AnimatePresence>
                    {isDeleting && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          textAlign: 'center', padding: '3px',
                          fontSize: '0.5rem', fontWeight: 700,
                          color: '#dc3c3c', letterSpacing: '0.04em',
                          background: 'rgba(220,60,60,0.04)',
                        }}
                      >
                        click again to delete
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* No search results */}
        {searchQuery && filtered.length === 0 && allComponents.length > 0 && (
          <div style={{
            padding: '16px', textAlign: 'center',
            fontSize: '0.72rem', color: 'var(--pl-muted)',
          }}>
            No components matching &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </SidebarSection>
    </div>
  );
}

// ── Category chip ───────────────────────────────────────────────
function CategoryChip({ label, count, active, color, onClick }: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: '3px 8px',
        borderRadius: '8px',
        border: `1px solid ${active ? color : 'var(--pl-glass-dark-border)'}`,
        background: active ? `${color}18` : 'rgba(255,255,255,0.08)',
        color: active ? color : 'var(--pl-muted)',
        cursor: 'pointer',
        fontSize: '0.6rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        transition: 'all 0.15s',
      }}
    >
      {label}
      {count > 0 && (
        <span style={{
          fontSize: '0.5rem',
          background: active ? `${color}25` : 'rgba(255,255,255,0.08)',
          padding: '0px 4px',
          borderRadius: '4px',
          fontWeight: 800,
        }}>
          {count}
        </span>
      )}
    </motion.button>
  );
}

// ── Helper: save a block as a component ─────────────────────────
export function saveBlockAsComponent(
  block: PageBlock,
  manifest: StoryManifest,
  onChange: (m: StoryManifest) => void,
): SavedComponent {
  const typeLabel = BLOCK_LABELS[block.type] || block.type;
  const name = (block.config?.title as string) || `My ${typeLabel}`;
  const component: SavedComponent = {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    type: block.type,
    category: inferCategory(block.type),
    config: block.config ? { ...block.config } : undefined,
    blockEffects: block.blockEffects ? { ...block.blockEffects } : undefined,
    createdAt: new Date().toISOString(),
    builtIn: false,
  };
  const existing = manifest.savedComponents || [];
  const updated = [...existing, component];
  onChange({ ...manifest, savedComponents: updated });

  // Also save to localStorage
  const stored = loadStoredComponents();
  stored.push(component);
  saveStoredComponents(stored);

  return component;
}
