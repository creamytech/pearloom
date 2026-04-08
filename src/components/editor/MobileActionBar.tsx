'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileActionBar.tsx
// Contextual floating action bar for the mobile editor.
// Sits above the bottom sheet and shows relevant actions
// based on the currently selected section in the preview.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Undo2, Redo2, Send, Type, Image, Palette,
  Pencil, Camera, Sparkles, Trash2, Settings2,
  ChevronUp, ChevronDown,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

export interface MobileActionBarProps {
  activeSection: string | null;
  onAddBlock: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Handler for context-specific actions */
  onAction?: (action: string) => void;
}

// ── Action button definition ────────────────────────────────

interface ActionButton {
  id: string;
  icon: React.ElementType;
  label: string;
  primary?: boolean;
  danger?: boolean;
}

// ── Action sets per context ─────────────────────────────────

const DEFAULT_ACTIONS: ActionButton[] = [
  { id: 'add',     icon: Plus,   label: 'Add Block', primary: true },
  { id: 'undo',    icon: Undo2,  label: 'Undo'    },
  { id: 'redo',    icon: Redo2,  label: 'Redo'    },
  { id: 'publish', icon: Send,   label: 'Publish' },
];

const HERO_ACTIONS: ActionButton[] = [
  { id: 'edit-text',     icon: Type,    label: 'Edit Text'    },
  { id: 'change-photo',  icon: Image,   label: 'Change Photo' },
  { id: 'style',         icon: Palette, label: 'Style'        },
];

const CHAPTER_ACTIONS: ActionButton[] = [
  { id: 'edit',      icon: Pencil,   label: 'Edit'       },
  { id: 'photos',    icon: Camera,   label: 'Photos'     },
  { id: 'rewrite',   icon: Sparkles, label: 'AI Rewrite' },
  { id: 'delete',    icon: Trash2,   label: 'Delete', danger: true },
];

const BLOCK_ACTIONS: ActionButton[] = [
  { id: 'settings',  icon: Settings2,  label: 'Settings'  },
  { id: 'move-up',   icon: ChevronUp,  label: 'Move Up'   },
  { id: 'move-down', icon: ChevronDown, label: 'Move Down' },
  { id: 'delete',    icon: Trash2,     label: 'Delete', danger: true },
];

// Sections that use block-level actions
const BLOCK_SECTIONS = new Set([
  'rsvp', 'registry', 'travel', 'faq', 'photos', 'guestbook',
  'map', 'quote', 'text', 'video', 'countdown', 'divider',
  'spotify', 'hashtag', 'weddingParty',
]);

function getActions(activeSection: string | null): ActionButton[] {
  if (!activeSection) return DEFAULT_ACTIONS;
  if (activeSection === 'hero') return HERO_ACTIONS;
  if (activeSection === 'story') return CHAPTER_ACTIONS;
  if (activeSection === 'nav' || activeSection === 'footer') return [
    { id: 'style', icon: Palette, label: 'Style' },
    { id: 'undo',  icon: Undo2,   label: 'Undo'  },
    { id: 'redo',  icon: Redo2,   label: 'Redo'  },
  ];
  if (activeSection === 'events') return [
    { id: 'edit',      icon: Pencil,    label: 'Edit'     },
    { id: 'add',       icon: Plus,      label: 'Add Event' },
    { id: 'delete',    icon: Trash2,    label: 'Delete', danger: true },
  ];
  if (BLOCK_SECTIONS.has(activeSection)) return BLOCK_ACTIONS;
  return DEFAULT_ACTIONS;
}

// ── Animation springs ───────────────────────────────────────

const SPRING_CONTAINER = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 26,
  mass: 0.8,
};

const SPRING_BUTTON = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 22,
  mass: 0.6,
};

// ── Component ───────────────────────────────────────────────

export function MobileActionBar({
  activeSection,
  onAddBlock,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAction,
}: MobileActionBarProps) {
  const currentActions = getActions(activeSection);
  const showLabels = currentActions.length <= 4;

  const handleClick = (action: ActionButton) => {
    switch (action.id) {
      case 'add':
        onAddBlock();
        break;
      case 'undo':
        onUndo();
        break;
      case 'redo':
        onRedo();
        break;
      default:
        onAction?.(action.id);
        break;
    }
  };

  const isDisabled = (action: ActionButton): boolean => {
    if (action.id === 'undo') return !canUndo;
    if (action.id === 'redo') return !canRedo;
    return false;
  };

  // Stable key for AnimatePresence based on the action set
  const actionKey = activeSection || 'default';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING_CONTAINER}
        style={pillStyle}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {currentActions.map((action) => (
            <motion.button
              key={`${actionKey}-${action.id}`}
              initial={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
              transition={SPRING_BUTTON}
              layout
              onClick={() => handleClick(action)}
              disabled={isDisabled(action)}
              aria-label={action.label}
              style={{
                ...btnStyle,
                opacity: isDisabled(action) ? 0.35 : 1,
                cursor: isDisabled(action) ? 'default' : 'pointer',
                background: action.primary
                  ? 'var(--pl-olive-15)'
                  : 'transparent',
                color: action.danger
                  ? '#EF4444'
                  : 'var(--pl-olive)',
              }}
            >
              <motion.div
                whileTap={{ scale: 0.82 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: showLabels ? 3 : 0,
                }}
              >
                <action.icon size={18} strokeWidth={1.8} />
                {showLabels && (
                  <span style={labelTextStyle}>
                    {action.label}
                  </span>
                )}
              </motion.div>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const pillStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  padding: '4px 8px',
  borderRadius: 100,
  background: 'var(--pl-glass-heavy)',
  backdropFilter: 'var(--pl-glass-blur)',
  boxShadow: 'var(--pl-glass-shadow-lg)',
  border: '1px solid var(--pl-black-6)',
  pointerEvents: 'auto',
};

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 40,
  minHeight: 40,
  padding: '6px 10px',
  borderRadius: 20,
  border: 'none',
  background: 'transparent',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 'var(--pl-text-2xs)',
  fontWeight: 700,
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
  lineHeight: 1,
};
