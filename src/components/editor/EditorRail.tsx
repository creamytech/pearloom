'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorRail.tsx
//
// Simplified 4-category navigation rail.
// Groups 15+ tabs into: Content, Design, Pages, Settings
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Users, LayoutGrid, Globe2, Send, Calendar, Mail, Heart, Music2, Briefcase,
  MoreHorizontal, ChevronDown, BookOpen, Palette, PanelTop, Settings,
} from 'lucide-react';
import {
  SectionsIcon, StoryIcon, EventsIcon, DesignIcon,
  DetailsIcon, AIBlocksIcon, VoiceIcon,
} from '@/components/icons/EditorIcons';
import { ElegantHeartIcon } from '@/components/icons/PearloomIcons';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import { TAB_TIER, TIER_META } from '@/lib/plan-tiers';

// ── Tab categories ───────────────────────────────────────────
type RailItem = { tab: EditorTab; Icon: React.ElementType; label: string };

type CategoryDef = {
  id: string;
  Icon: React.ElementType;
  label: string;
  items: RailItem[];
};

const CATEGORIES: CategoryDef[] = [
  {
    id: 'content',
    Icon: BookOpen,
    label: 'Content',
    items: [
      { tab: 'story',    Icon: StoryIcon,    label: 'Story'    },
      { tab: 'events',   Icon: EventsIcon,   label: 'Events'   },
      { tab: 'guests',   Icon: Users,        label: 'Guests'   },
      { tab: 'blocks',   Icon: AIBlocksIcon, label: 'AI Blocks'},
      { tab: 'voice',    Icon: VoiceIcon,    label: 'Voice'    },
    ],
  },
  {
    id: 'design',
    Icon: Palette,
    label: 'Design',
    items: [
      { tab: 'design',   Icon: DesignIcon,   label: 'Theme'    },
      { tab: 'canvas',   Icon: SectionsIcon, label: 'Sections' },
    ],
  },
  {
    id: 'pages',
    Icon: PanelTop,
    label: 'Pages',
    items: [
      { tab: 'messaging',   Icon: Mail,      label: 'Messages' },
      { tab: 'savethedate', Icon: Calendar,   label: 'Save the Date' },
      { tab: 'thankyou',    Icon: Heart,      label: 'Thank You'},
      { tab: 'spotify',     Icon: Music2,     label: 'Music'    },
      { tab: 'vendors',     Icon: Briefcase,  label: 'Vendors'  },
    ],
  },
  {
    id: 'settings',
    Icon: Settings,
    label: 'Settings',
    items: [
      { tab: 'details',     Icon: DetailsIcon, label: 'Details' },
      { tab: 'analytics',   Icon: BarChart2,   label: 'Analytics'},
      { tab: 'translate',   Icon: Globe2,      label: 'Languages'},
    ],
  },
];

// Build a map from tab → category for quick lookup
const TAB_TO_CATEGORY = new Map<string, string>();
for (const cat of CATEGORIES) {
  for (const item of cat.items) {
    TAB_TO_CATEGORY.set(item.tab, cat.id);
  }
}

// ── CategoryBtn ──────────────────────────────────────────────
function CategoryBtn({ category, active, expanded, onClick }: {
  category: CategoryDef; active: boolean; expanded: boolean; onClick: () => void;
}) {
  const { Icon, label } = category;

  return (
    <motion.button
      onClick={onClick}
      title={label}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
      whileTap={{ scale: 0.88 }}
      transition={{ duration: 0.12 }}
      style={{
        width: '100%', height: '52px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '4px',
        border: 'none',
        background: active ? 'rgba(163,177,138,0.13)' : 'transparent',
        cursor: 'pointer', position: 'relative',
        color: active ? '#A3B18A' : 'rgba(255,255,255,0.38)',
        transition: 'color 0.15s, background 0.15s',
      }}
    >
      {/* Active glow accent bar */}
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="rail-accent"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            style={{
              position: 'absolute', left: 0, top: '16%', bottom: '16%',
              width: '3px',
              background: 'linear-gradient(180deg, #A3B18A 0%, #8FC87A 100%)',
              borderRadius: '0 3px 3px 0',
              transformOrigin: 'center',
              boxShadow: '0 0 10px rgba(163,177,138,0.55), 0 0 20px rgba(163,177,138,0.2)',
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          />
        )}
      </AnimatePresence>

      <Icon size={17} color="currentColor" />
      <span style={{
        fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.06em',
        textTransform: 'uppercase', lineHeight: 1, color: 'inherit',
        userSelect: 'none',
      }}>
        {label}
      </span>
    </motion.button>
  );
}

// ── SubItem button ───────────────────────────────────────────
function SubItemBtn({ item, active, onClick }: {
  item: RailItem; active: boolean; onClick: () => void;
}) {
  const { Icon, label, tab } = item;
  const tier = TAB_TIER[tab];
  const meta = tier ? TIER_META[tier] : null;

  return (
    <motion.button
      onClick={onClick}
      title={meta ? `${label} — ${meta.label} plan` : label}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      whileTap={{ scale: 0.92 }}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px',
        border: 'none',
        background: active ? 'rgba(163,177,138,0.15)' : 'transparent',
        cursor: 'pointer',
        color: active ? '#A3B18A' : 'rgba(255,255,255,0.5)',
        fontSize: '0.65rem', fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        transition: 'color 0.12s, background 0.12s',
        position: 'relative',
      }}
    >
      {/* Plan tier dot */}
      {meta && (
        <div style={{
          position: 'absolute', top: '6px', right: '6px',
          width: '4px', height: '4px', borderRadius: '50%',
          background: meta.color,
          opacity: 0.7,
        }} />
      )}
      <Icon size={13} color="currentColor" />
      {label}
    </motion.button>
  );
}

// ── EditorRail ───────────────────────────────────────────────
export function EditorRail({ onOpen }: { onOpen?: () => void }) {
  const { state, actions } = useEditor();
  const activeTab = state.activeTab;
  const activeCategoryId = TAB_TO_CATEGORY.get(activeTab) || 'content';
  const [expandedCategory, setExpandedCategory] = useState<string | null>(activeCategoryId);

  const handleCategoryClick = (catId: string) => {
    if (expandedCategory === catId) {
      // Already expanded — clicking again toggles closed
      setExpandedCategory(null);
    } else {
      setExpandedCategory(catId);
      // Auto-select first tab in this category
      const cat = CATEGORIES.find(c => c.id === catId);
      if (cat && cat.items.length > 0) {
        actions.handleTabChange(cat.items[0].tab);
        onOpen?.();
      }
    }
  };

  const handleSubItemClick = (tab: EditorTab) => {
    actions.handleTabChange(tab);
    onOpen?.();
  };

  return (
    <div style={{
      width: '56px', flexShrink: 0,
      background: '#252230',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      zIndex: 100,
      overflowY: 'auto', overflowX: 'hidden',
      scrollbarWidth: 'none',
    } as React.CSSProperties}>

      {/* Logo mark */}
      <div style={{
        height: '44px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <ElegantHeartIcon size={14} color="#A3B18A" />
      </div>

      {/* Category tabs with expandable sub-items */}
      <div style={{ paddingTop: '2px', flex: 1 }}>
        {CATEGORIES.map(cat => {
          const isCatActive = activeCategoryId === cat.id;
          const isExpanded = expandedCategory === cat.id;

          return (
            <div key={cat.id}>
              <CategoryBtn
                category={cat}
                active={isCatActive}
                expanded={isExpanded}
                onClick={() => handleCategoryClick(cat.id)}
              />

              {/* Expandable sub-items */}
              <AnimatePresence>
                {isExpanded && cat.items.length > 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      overflow: 'hidden',
                      background: 'rgba(0,0,0,0.15)',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {cat.items.map(item => (
                      <SubItemBtn
                        key={item.tab}
                        item={item}
                        active={activeTab === item.tab}
                        onClick={() => handleSubItemClick(item.tab)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
