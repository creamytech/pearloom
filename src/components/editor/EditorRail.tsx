'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorRail.tsx
//
// 56px dark-glass always-visible icon navigation rail.
// Dark editor surface with glowing olive active accent,
// visible group labels, and frosted glass borders.
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Users, LayoutGrid, Globe2, Send, Calendar, Mail,
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

const NARRATIVE: RailItem[] = [
  { tab: 'story',   Icon: StoryIcon,    label: 'Story'    },
  { tab: 'events',  Icon: EventsIcon,   label: 'Events'   },
  { tab: 'canvas',  Icon: SectionsIcon, label: 'Sections' },
];

const AESTHETIC: RailItem[] = [
  { tab: 'design',  Icon: DesignIcon,   label: 'Design'   },
  { tab: 'details', Icon: DetailsIcon,  label: 'Details'  },
  { tab: 'blocks',  Icon: AIBlocksIcon, label: 'Blocks'   },
  { tab: 'voice',   Icon: VoiceIcon,    label: 'Voice'    },
];

const TOOLS: RailItem[] = [
  { tab: 'messaging',   Icon: Mail,      label: 'Messages' },
  { tab: 'guests',      Icon: Users,     label: 'Guests'   },
  { tab: 'analytics',   Icon: BarChart2, label: 'Stats'    },
  { tab: 'translate',   Icon: Globe2,    label: 'Langs'    },
  { tab: 'savethedate', Icon: Calendar,  label: 'STD'      },
];

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

      {/* Narrative group */}
      <div style={{ paddingTop: '2px' }}>
        <GroupLabel label="Content" />
        {NARRATIVE.map(item => (
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

      {/* Aesthetic group */}
      <div>
        <GroupLabel label="Style" />
        {AESTHETIC.map(item => (
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

      {/* Tools group */}
      <div>
        <GroupLabel label="Tools" />
        {TOOLS.map(item => (
          <RailBtn
            key={item.tab}
            item={item}
            active={active === item.tab}
            onClick={() => handleClick(item.tab)}
          />
        ))}
      </div>
    </div>
  );
}
