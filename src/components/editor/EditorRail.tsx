'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorRail.tsx
//
// 56px always-visible icon navigation rail. Replaces the old
// EditorWing toggle handles and EditorSidebar tab strip.
// Clicking a tab fires handleTabChange (which auto-opens the
// push panel). Active state is indicated by a left-edge accent
// bar + highlight, not overlays.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import {
  BarChart2, Users, LayoutGrid, Globe2, Send, Calendar, Mail,
} from 'lucide-react';
import {
  SectionsIcon, StoryIcon, EventsIcon, DesignIcon,
  DetailsIcon, AIBlocksIcon, VoiceIcon,
} from '@/components/icons/EditorIcons';
import { ElegantHeartIcon } from '@/components/icons/PearloomIcons';
import { useEditor, type EditorTab } from '@/lib/editor-state';

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

// ── RailBtn ────────────────────────────────────────────────────
function RailBtn({ item, active, onClick }: {
  item: RailItem; active: boolean; onClick: () => void;
}) {
  const { Icon, label } = item;
  return (
    <motion.button
      onClick={onClick}
      title={label}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.12 }}
      style={{
        width: '100%', height: '46px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '3px',
        border: 'none', background: active ? 'rgba(163,177,138,0.09)' : 'transparent',
        cursor: 'pointer', position: 'relative',
        color: active ? '#A3B18A' : 'rgba(214,198,168,0.38)',
        transition: 'color 0.15s, background 0.15s',
      }}
    >
      {/* Active accent bar */}
      {active && (
        <motion.div
          layoutId="rail-accent"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          style={{
            position: 'absolute', left: 0, top: '18%', bottom: '18%',
            width: '2px',
            background: 'linear-gradient(180deg, #A3B18A 0%, #6E8B5A 100%)',
            borderRadius: '0 2px 2px 0',
            transformOrigin: 'center',
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        />
      )}
      <Icon size={15} color="currentColor" />
      <span style={{
        fontSize: '0.49rem', fontWeight: 800, letterSpacing: '0.06em',
        textTransform: 'uppercase', lineHeight: 1, color: 'inherit',
        userSelect: 'none',
      }}>
        {label}
      </span>
    </motion.button>
  );
}

// ── Separator ──────────────────────────────────────────────────
function Sep() {
  return (
    <div style={{
      height: '1px', margin: '5px 14px',
      background: 'rgba(255,255,255,0.05)',
    }} />
  );
}

// ── EditorRail ─────────────────────────────────────────────────
export function EditorRail({ onOpen }: { onOpen?: () => void }) {
  const { state, actions } = useEditor();
  const active = state.activeTab;

  const handleClick = (tab: typeof active) => {
    actions.handleTabChange(tab);
    onOpen?.(); // always re-open panel, even if same tab
  };

  return (
    <div style={{
      width: '56px', flexShrink: 0,
      background: 'rgba(12,9,7,0.99)',
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
        borderBottom: '1px solid rgba(255,255,255,0.055)',
      }}>
        <ElegantHeartIcon size={14} color="rgba(214,198,168,0.45)" />
      </div>

      {/* Narrative group */}
      <div style={{ paddingTop: '6px' }}>
        {NARRATIVE.map(item => (
          <RailBtn
            key={item.tab}
            item={item}
            active={active === item.tab}
            onClick={() => handleClick(item.tab)}
          />
        ))}
      </div>

      <Sep />

      {/* Aesthetic group */}
      <div>
        {AESTHETIC.map(item => (
          <RailBtn
            key={item.tab}
            item={item}
            active={active === item.tab}
            onClick={() => handleClick(item.tab)}
          />
        ))}
      </div>

      <Sep />

      {/* Tools group */}
      <div>
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
