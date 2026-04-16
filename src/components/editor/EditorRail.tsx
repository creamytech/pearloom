'use client';

// ─────────────────────────────────────────────────────────────
// EditorRail — Wave D rebuild.
// Collapses the legacy 16-tab rail into 4 editorial workspaces:
//   Build · Style · Grow · Ship
// Each workspace icon expands to a contextual flyout listing its
// sub-tabs. Drives the existing tab state machine — no migration
// of `editor-state` required.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hammer, Palette, Megaphone, Rocket,
  BookOpen, CalendarDays, FileText, LayoutGrid, Sparkles, Mic,
  Type as TypeIcon, Image as ImageIcon, Brush,
  Users, Mail, MessageSquare, Heart, Music, ShoppingBag,
  BarChart2, Globe, History, Settings,
  Plus,
} from 'lucide-react';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import { TAB_TIER, TIER_META, type PlanTier } from '@/lib/plan-tiers';
import { isPlanSufficient } from '@/lib/plan-gate';

// ── Types ───────────────────────────────────────────────────────

interface SubTab {
  id: string;
  tab: EditorTab;
  Icon: React.ElementType;
  label: string;
  description?: string;
  shortcut?: string;
}

interface Workspace {
  id: 'build' | 'style' | 'grow' | 'ship';
  label: string;
  Icon: React.ElementType;
  defaultTab: EditorTab;
  description: string;
  tabs: SubTab[];
}

// ── 4 workspaces ────────────────────────────────────────────────

const WORKSPACES: Workspace[] = [
  {
    id: 'build',
    label: 'Build',
    Icon: Hammer,
    defaultTab: 'story',
    description: 'Words, sections, structure',
    tabs: [
      { id: 'story',    tab: 'story',    Icon: BookOpen,     label: 'Chapters',    description: 'Your love story timeline', shortcut: '⌘1' },
      { id: 'events',   tab: 'events',   Icon: CalendarDays, label: 'Events',      description: 'Ceremony, reception, more', shortcut: '⌘2' },
      { id: 'pages',    tab: 'pages',    Icon: FileText,     label: 'Pages',       description: 'Manage all site pages', shortcut: '⌘5' },
      { id: 'sections', tab: 'canvas',   Icon: LayoutGrid,   label: 'Sections',    description: 'Add & arrange sections', shortcut: '⌘8' },
      { id: 'voice',    tab: 'voice',    Icon: Mic,          label: 'Voice & tone', description: 'How Pear sounds like you' },
    ],
  },
  {
    id: 'style',
    label: 'Style',
    Icon: Palette,
    defaultTab: 'design',
    description: 'Color, type, motion',
    tabs: [
      { id: 'design',     tab: 'design',     Icon: Brush,     label: 'Theme',       description: 'Palette · radius · vibe', shortcut: '⌘3' },
      { id: 'blocks',     tab: 'blocks',     Icon: Sparkles,  label: 'Pear blocks', description: 'AI section presets' },
      { id: 'components', tab: 'components', Icon: TypeIcon,  label: 'Components',  description: 'Saved blocks & motifs' },
    ],
  },
  {
    id: 'grow',
    label: 'Grow',
    Icon: Megaphone,
    defaultTab: 'guests',
    description: 'Reach guests, fill the room',
    tabs: [
      { id: 'guests',      tab: 'guests',      Icon: Users,        label: 'Guests',      description: 'Guest list & RSVPs' },
      { id: 'invite',      tab: 'invite',      Icon: Mail,         label: 'Invitations', description: 'Send bulk invites' },
      { id: 'messaging',   tab: 'messaging',   Icon: MessageSquare,label: 'Messages',    description: 'Email your guests' },
      { id: 'seating',     tab: 'seating',     Icon: Users,        label: 'Seating',     description: 'Seating chart' },
      { id: 'savethedate', tab: 'savethedate', Icon: Heart,        label: 'Save the Date' },
      { id: 'thankyou',    tab: 'thankyou',    Icon: Heart,        label: 'Thank-you notes' },
      { id: 'spotify',     tab: 'spotify',     Icon: Music,        label: 'Music' },
      { id: 'vendors',     tab: 'vendors',     Icon: ShoppingBag,  label: 'Vendors' },
    ],
  },
  {
    id: 'ship',
    label: 'Ship',
    Icon: Rocket,
    defaultTab: 'analytics',
    description: 'Polish, publish, measure',
    tabs: [
      { id: 'analytics', tab: 'analytics', Icon: BarChart2, label: 'Analytics', description: 'Views & engagement' },
      { id: 'translate', tab: 'translate', Icon: Globe,     label: 'Translate', description: 'Multi-language sites' },
      { id: 'history',   tab: 'history',   Icon: History,   label: 'History',   description: 'Versions & rollback' },
      { id: 'details',   tab: 'details',   Icon: Settings,  label: 'Settings',  description: 'Site-wide preferences' },
    ],
  },
];

// ── Utilities ───────────────────────────────────────────────────

function findWorkspaceForTab(tab: EditorTab): Workspace['id'] {
  for (const ws of WORKSPACES) {
    if (ws.tabs.some((t) => t.tab === tab) || ws.defaultTab === tab) return ws.id;
  }
  return 'build';
}

function useUserPlan(): string {
  const { data: session } = useSession();
  const sessionPlan = (session as Record<string, unknown> | null)?.plan;
  if (typeof sessionPlan === 'string' && sessionPlan) return sessionPlan;
  if (typeof document !== 'undefined') {
    const attr = document.body.getAttribute('data-plan');
    if (attr) return attr;
  }
  return 'free';
}

// ── Workspace pill ──────────────────────────────────────────────

function WorkspacePill({
  workspace,
  isActive,
  isOpen,
  onToggle,
}: {
  workspace: Workspace;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = workspace.Icon;
  return (
    <button
      onClick={onToggle}
      aria-label={workspace.label}
      aria-expanded={isOpen}
      style={{
        position: 'relative',
        width: 44,
        height: 44,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        border: 'none',
        borderRadius: 12,
        background: isActive
          ? 'var(--pl-olive-mist)'
          : isOpen
          ? 'color-mix(in oklab, var(--pl-olive) 6%, transparent)'
          : 'transparent',
        color: isActive || isOpen ? 'var(--pl-ink)' : 'var(--pl-ink-soft)',
        cursor: 'pointer',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
      }}
    >
      {isActive && (
        <motion.span
          layoutId="rail-active-workspace"
          aria-hidden
          style={{
            position: 'absolute',
            left: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 3,
            height: 22,
            borderRadius: 'var(--pl-radius-full)',
            background: 'var(--pl-olive)',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <Icon size={17} strokeWidth={isActive ? 2.2 : 1.7} />
      <span
        style={{
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.55rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          lineHeight: 1,
          fontWeight: 700,
        }}
      >
        {workspace.label}
      </span>
    </button>
  );
}

// ── Flyout panel ────────────────────────────────────────────────

function WorkspaceFlyout({
  workspace,
  activeTab,
  onPick,
  onClose,
  lockMap,
}: {
  workspace: Workspace;
  activeTab: EditorTab;
  onPick: (tab: EditorTab) => void;
  onClose: () => void;
  lockMap: Record<string, { locked: boolean; tierLabel?: string }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute',
        left: 64,
        top: 0,
        width: 268,
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        borderRadius: 14,
        padding: 8,
        boxShadow: 'var(--pl-shadow-xl)',
        zIndex: 60,
      }}
      onMouseLeave={onClose}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px 12px',
          borderBottom: '1px solid var(--pl-divider-soft)',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.62rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--pl-muted)',
            marginBottom: 4,
          }}
        >
          Workspace
        </div>
        <div
          style={{
            fontFamily: 'var(--pl-font-display)',
            fontSize: '1.1rem',
            color: 'var(--pl-ink)',
            letterSpacing: '-0.014em',
            fontVariationSettings: '"opsz" 144, "SOFT" 50',
          }}
        >
          {workspace.label}
        </div>
        <div
          style={{
            color: 'var(--pl-muted)',
            fontSize: '0.78rem',
            marginTop: 2,
          }}
        >
          {workspace.description}
        </div>
      </div>

      {/* Items */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {workspace.tabs.map((sub) => {
          const lock = lockMap[sub.tab];
          const Icon = sub.Icon;
          const isActive = activeTab === sub.tab;
          return (
            <li key={sub.id}>
              <button
                onClick={() => !lock?.locked && onPick(sub.tab)}
                disabled={lock?.locked}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  width: '100%',
                  padding: '10px 12px',
                  background: isActive ? 'var(--pl-olive-mist)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--pl-radius-md)',
                  textAlign: 'left',
                  cursor: lock?.locked ? 'not-allowed' : 'pointer',
                  opacity: lock?.locked ? 0.55 : 1,
                  transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !lock?.locked) {
                    e.currentTarget.style.background = 'color-mix(in oklab, var(--pl-olive) 5%, transparent)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={16} style={{ color: isActive ? 'var(--pl-olive)' : 'var(--pl-ink-soft)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.86rem',
                      fontWeight: isActive ? 600 : 500,
                      color: 'var(--pl-ink)',
                    }}
                  >
                    {sub.label}
                  </span>
                  {sub.description && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--pl-muted)',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {sub.description}
                    </span>
                  )}
                </div>
                {lock?.locked ? (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-gold)',
                      fontWeight: 700,
                      fontFamily: 'var(--pl-font-mono)',
                    }}
                  >
                    {lock.tierLabel}
                  </span>
                ) : sub.shortcut ? (
                  <kbd
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.62rem',
                      padding: '2px 6px',
                      background: 'var(--pl-cream-deep)',
                      border: '1px solid var(--pl-divider)',
                      borderRadius: 4,
                      color: 'var(--pl-muted)',
                    }}
                  >
                    {sub.shortcut}
                  </kbd>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

// ── Main rail ───────────────────────────────────────────────────

export function EditorRail({ onOpen }: { onOpen?: () => void }) {
  const { state, actions } = useEditor();
  const activeTab = state.activeTab;
  const currentPlan = useUserPlan();
  const [openWorkspace, setOpenWorkspace] = useState<Workspace['id'] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Collapse flyout on outside click / Escape
  useEffect(() => {
    if (!openWorkspace) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenWorkspace(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenWorkspace(null);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openWorkspace]);

  const lockMap = useMemo(() => {
    const info: Record<string, { locked: boolean; tierLabel?: string }> = {};
    for (const ws of WORKSPACES) {
      for (const t of ws.tabs) {
        const tier = TAB_TIER[t.tab] as PlanTier | undefined;
        if (!tier) {
          info[t.tab] = { locked: false };
          continue;
        }
        const ok = isPlanSufficient(currentPlan, tier);
        info[t.tab] = { locked: !ok, tierLabel: TIER_META[tier].label };
      }
    }
    return info;
  }, [currentPlan]);

  const activeWorkspace = findWorkspaceForTab(activeTab);

  const handlePick = (tab: EditorTab) => {
    actions.handleTabChange(tab);
    onOpen?.();
    setOpenWorkspace(null);
  };

  const handleToggle = (wsId: Workspace['id']) => {
    if (openWorkspace === wsId) {
      // Same workspace clicked: navigate to its default tab and close
      const ws = WORKSPACES.find((w) => w.id === wsId);
      if (ws) handlePick(ws.defaultTab);
    } else {
      setOpenWorkspace(wsId);
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.18, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: 8,
        borderRadius: 16,
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        boxShadow: 'var(--pl-shadow-md)',
      }}
    >
      {/* Wordmark dot */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--pl-ink)',
          color: 'var(--pl-cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
          fontFamily: 'var(--pl-font-display)',
          fontSize: '0.72rem',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}
      >
        P
      </div>

      {/* Block library launcher — drag-to-canvas palette */}
      <button
        type="button"
        aria-label="Open block library"
        title="Block library (drag sections onto the canvas)"
        onClick={() => window.dispatchEvent(new CustomEvent('pearloom-open-library'))}
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          border: 'none',
          borderRadius: 12,
          background: 'color-mix(in oklab, var(--pl-gold, #B8860B) 14%, transparent)',
          color: 'var(--pl-ink)',
          cursor: 'pointer',
          marginBottom: 6,
          transition: 'background var(--pl-dur-fast) var(--pl-ease-out), transform var(--pl-dur-fast) var(--pl-ease-out)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'color-mix(in oklab, var(--pl-gold, #B8860B) 22%, transparent)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'color-mix(in oklab, var(--pl-gold, #B8860B) 14%, transparent)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <Plus size={16} strokeWidth={2} />
        <span
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.55rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            lineHeight: 1,
            fontWeight: 700,
          }}
        >
          Add
        </span>
      </button>

      {/* Hairline separator */}
      <div
        aria-hidden
        style={{
          width: 24,
          height: 1,
          background: 'var(--pl-divider)',
          margin: '2px 0 8px',
        }}
      />

      {WORKSPACES.map((ws) => (
        <div key={ws.id} style={{ position: 'relative' }}>
          <WorkspacePill
            workspace={ws}
            isActive={ws.id === activeWorkspace}
            isOpen={openWorkspace === ws.id}
            onToggle={() => handleToggle(ws.id)}
          />
          <AnimatePresence>
            {openWorkspace === ws.id && (
              <WorkspaceFlyout
                workspace={ws}
                activeTab={activeTab}
                onPick={handlePick}
                onClose={() => setOpenWorkspace(null)}
                lockMap={lockMap}
              />
            )}
          </AnimatePresence>
        </div>
      ))}
    </motion.div>
  );
}
