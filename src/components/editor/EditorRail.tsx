'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorRail.tsx
//
// 56px dark-glass always-visible icon navigation rail.
// Dark editor surface with glowing olive active accent,
// visible group labels, and frosted glass borders.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Users, LayoutGrid, Globe2, Send, Calendar, Mail, Heart, Music2, Briefcase,
  MoreHorizontal, ChevronDown,
} from 'lucide-react';
import {
  SectionsIcon, StoryIcon, EventsIcon, DesignIcon,
  DetailsIcon, AIBlocksIcon, VoiceIcon,
} from '@/components/icons/EditorIcons';
import { ElegantHeartIcon } from '@/components/icons/PearloomIcons';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import { TAB_TIER, TIER_META } from '@/lib/plan-tiers';

// ── Tab groups ─────────────────────────────────────────────────
type RailItem = { tab: EditorTab; Icon: React.ElementType; label: string };

// Primary: always visible (5 core tabs)
const PRIMARY: RailItem[] = [
  { tab: 'story',   Icon: StoryIcon,    label: 'Story'    },
  { tab: 'events',  Icon: EventsIcon,   label: 'Events'   },
  { tab: 'design',  Icon: DesignIcon,   label: 'Design'   },
  { tab: 'canvas',  Icon: SectionsIcon, label: 'Sections' },
  { tab: 'guests',  Icon: Users,        label: 'Guests'   },
];

// Secondary: collapsed under "More" by default
const SECONDARY: RailItem[] = [
  { tab: 'details', Icon: DetailsIcon,  label: 'Details'  },
  { tab: 'blocks',  Icon: AIBlocksIcon, label: 'Blocks'   },
  { tab: 'voice',   Icon: VoiceIcon,    label: 'Voice'    },
  { tab: 'messaging',   Icon: Mail,      label: 'Messages' },
  { tab: 'vendors',     Icon: Briefcase, label: 'Vendors'  },
  { tab: 'analytics',   Icon: BarChart2, label: 'Stats'    },
  { tab: 'translate',   Icon: Globe2,    label: 'Langs'    },
  { tab: 'savethedate', Icon: Calendar,  label: 'STD'      },
  { tab: 'thankyou',    Icon: Heart,     label: 'Thanks'   },
  { tab: 'spotify',     Icon: Music2,    label: 'Music'    },
];

const SECONDARY_TABS = new Set(SECONDARY.map(s => s.tab));

// ── Group Label ────────────────────────────────────────────────
function GroupLabel({ label }: { label: string }) {
  return (
    <div style={{
      padding: '8px 0 4px',
      display: 'flex', justifyContent: 'center',
    }}>
      <span style={{
        fontSize: '0.42rem', fontWeight: 800,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.22)',
        userSelect: 'none',
      }}>
        {label}
      </span>
    </div>
  );
}

// ── RailBtn ────────────────────────────────────────────────────
function RailBtn({ item, active, onClick }: {
  item: RailItem; active: boolean; onClick: () => void;
}) {
  const { Icon, label, tab } = item;
  const tier = TAB_TIER[tab];
  const meta = tier ? TIER_META[tier] : null;

  return (
    <motion.button
      onClick={onClick}
      title={meta ? `${label} — ${meta.label} plan` : label}
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

      {/* Plan tier dot — top-right of the icon area */}
      {meta && (
        <div style={{
          position: 'absolute', top: '8px', right: '8px',
          width: '5px', height: '5px', borderRadius: '50%',
          background: meta.color,
          opacity: 0.75,
          flexShrink: 0,
        }} />
      )}

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

// ── EditorRail ─────────────────────────────────────────────────
export function EditorRail({ onOpen }: { onOpen?: () => void }) {
  const { state, actions } = useEditor();
  const active = state.activeTab;
  const [moreOpen, setMoreOpen] = useState(false);

  // Auto-expand "More" when a secondary tab is active
  const isSecondaryActive = SECONDARY_TABS.has(active);

  const handleClick = (tab: typeof active) => {
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

      {/* Primary tabs */}
      <div style={{ paddingTop: '2px' }}>
        {PRIMARY.map(item => (
          <RailBtn
            key={item.tab}
            item={item}
            active={active === item.tab}
            onClick={() => handleClick(item.tab)}
          />
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', margin: '4px 12px', background: 'rgba(255,255,255,0.06)' }} />

      {/* More toggle */}
      <motion.button
        onClick={() => setMoreOpen(v => !v)}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
        whileTap={{ scale: 0.88 }}
        style={{
          width: '100%', height: '44px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '3px',
          border: 'none',
          background: (moreOpen || isSecondaryActive) ? 'rgba(163,177,138,0.08)' : 'transparent',
          cursor: 'pointer',
          color: isSecondaryActive ? '#A3B18A' : 'rgba(255,255,255,0.3)',
          transition: 'color 0.15s, background 0.15s',
        }}
      >
        <motion.div
          animate={{ rotate: moreOpen || isSecondaryActive ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} color="currentColor" />
        </motion.div>
        <span style={{
          fontSize: '0.48rem', fontWeight: 800, letterSpacing: '0.06em',
          textTransform: 'uppercase', lineHeight: 1, color: 'inherit',
          userSelect: 'none',
        }}>
          More
        </span>
      </motion.button>

      {/* Secondary tabs (collapsible) */}
      <AnimatePresence>
        {(moreOpen || isSecondaryActive) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {SECONDARY.map(item => (
              <RailBtn
                key={item.tab}
                item={item}
                active={active === item.tab}
                onClick={() => handleClick(item.tab)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
