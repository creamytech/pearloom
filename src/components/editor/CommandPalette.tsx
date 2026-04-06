'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/CommandPalette.tsx
// Cmd+K command palette for the full-screen editor
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlignLeft, Calendar, Palette, Settings, Globe, Sparkles,
  MessageCircleHeart, Monitor, Tablet, Smartphone, Plus,
  Eye, RotateCcw, RotateCw, LayoutTemplate, Search, ArrowRight,
  Hash,
} from 'lucide-react';

export type CommandAction =
  | { type: 'tab'; tab: 'story' | 'events' | 'canvas' | 'design' | 'details' | 'pages' | 'blocks' | 'voice' }
  | { type: 'device'; mode: 'desktop' | 'tablet' | 'mobile' }
  | { type: 'chapter'; id: string }
  | { type: 'add-chapter' }
  | { type: 'preview' }
  | { type: 'publish' }
  | { type: 'undo' }
  | { type: 'redo' };

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  iconColor?: string;
  group: string;
  shortcut?: string;
  action: CommandAction;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onAction: (action: CommandAction) => void;
  chapters: { id: string; title: string }[];
  canUndo: boolean;
  canRedo: boolean;
}

const TAB_COMMANDS: Command[] = [
  { id: 'tab-story',   label: 'Story',    description: 'Edit chapter text & photos',    icon: AlignLeft,          iconColor: '#60a5fa', group: 'Switch Tab', action: { type: 'tab', tab: 'story'   } },
  { id: 'tab-events',  label: 'Events',   description: 'Ceremony, reception & more',    icon: Calendar,           iconColor: '#f97316', group: 'Switch Tab', action: { type: 'tab', tab: 'events'  } },
  { id: 'tab-canvas',  label: 'Build',    description: 'Drag-and-drop page builder',    icon: LayoutTemplate,     iconColor: '#a78bfa', group: 'Switch Tab', action: { type: 'tab', tab: 'canvas'  } },
  { id: 'tab-design',  label: 'Design',   description: 'Colors, fonts & patterns',      icon: Palette,            iconColor: '#ec4899', group: 'Switch Tab', action: { type: 'tab', tab: 'design'  } },
  { id: 'tab-details', label: 'Details',  description: 'Names, date & location',        icon: Settings,           iconColor: '#6b7280', group: 'Switch Tab', action: { type: 'tab', tab: 'details' } },
  { id: 'tab-pages',   label: 'Pages',    description: 'Manage site pages',             icon: Globe,              iconColor: 'var(--pl-olive, #A3B18A)', group: 'Switch Tab', action: { type: 'tab', tab: 'pages'  } },
  { id: 'tab-blocks',  label: 'AI',       description: 'AI-generated content blocks',   icon: Sparkles,           iconColor: 'var(--pl-olive, #A3B18A)', group: 'Switch Tab', action: { type: 'tab', tab: 'blocks' } },
  { id: 'tab-voice',   label: 'Voice',    description: 'AI voice & TTS training',       icon: MessageCircleHeart, iconColor: '#f43f5e', group: 'Switch Tab', action: { type: 'tab', tab: 'voice'  } },
];

const DEVICE_COMMANDS: Command[] = [
  { id: 'device-desktop', label: 'Desktop view', description: 'Full-width preview',  icon: Monitor,     iconColor: '#94a3b8', group: 'Device', shortcut: '⌘1', action: { type: 'device', mode: 'desktop' } },
  { id: 'device-tablet',  label: 'Tablet view',  description: '768px preview',       icon: Tablet,      iconColor: '#94a3b8', group: 'Device', shortcut: '⌘2', action: { type: 'device', mode: 'tablet'  } },
  { id: 'device-mobile',  label: 'Mobile view',  description: '390px preview',       icon: Smartphone,  iconColor: '#94a3b8', group: 'Device', shortcut: '⌘3', action: { type: 'device', mode: 'mobile'  } },
];

const ACTION_COMMANDS: Command[] = [
  { id: 'add-chapter', label: 'Add new chapter',  description: 'Insert a blank chapter', icon: Plus,  iconColor: 'var(--pl-olive, #A3B18A)', group: 'Actions', action: { type: 'add-chapter' } },
  { id: 'preview',     label: 'Preview site',      description: 'Open live preview tab',  icon: Eye,   iconColor: '#38bdf8', group: 'Actions', shortcut: '⌘P', action: { type: 'preview'     } },
  { id: 'publish',     label: 'Publish site',      description: 'Go live on pearloom.com',icon: Globe, iconColor: 'var(--pl-olive, #A3B18A)', group: 'Actions', action: { type: 'publish'     } },
  { id: 'undo',        label: 'Undo',              description: 'Undo last change',       icon: RotateCcw, iconColor: '#e2e8f0', group: 'Actions', shortcut: '⌘Z',  action: { type: 'undo' } },
  { id: 'redo',        label: 'Redo',              description: 'Redo last change',       icon: RotateCw,  iconColor: '#e2e8f0', group: 'Actions', shortcut: '⌘⇧Z', action: { type: 'redo' } },
];

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette({ open, onClose, onAction, chapters, canUndo, canRedo }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build full command list including chapters
  const allCommands: Command[] = [
    ...TAB_COMMANDS,
    ...DEVICE_COMMANDS,
    ...ACTION_COMMANDS.map(c => ({
      ...c,
      // grey out undo/redo if unavailable
      iconColor: (c.id === 'undo' && !canUndo) || (c.id === 'redo' && !canRedo)
        ? 'rgba(0,0,0,0.08)'
        : c.iconColor,
    })),
    ...chapters.map((ch, i) => ({
      id: `chapter-${ch.id}`,
      label: ch.title || `Chapter ${i + 1}`,
      description: `Jump to chapter ${i + 1}`,
      icon: Hash,
      iconColor: 'var(--pl-olive, #A3B18A)',
      group: 'Chapters',
      action: { type: 'chapter' as const, id: ch.id },
    })),
  ];

  const filtered = query.trim()
    ? allCommands.filter(c => fuzzyMatch(query, c.label) || fuzzyMatch(query, c.description || '') || fuzzyMatch(query, c.group))
    : allCommands;

  // Group by section
  const groups = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.group] ||= []).push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(groups).flat();

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const execute = useCallback((cmd: Command) => {
    onAction(cmd.action);
    onClose();
  }, [onAction, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatFiltered[selectedIndex]) execute(flatFiltered[selectedIndex]);
    }
  }, [flatFiltered, selectedIndex, execute, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  let globalIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(8px)',
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', top: '18vh', left: '50%',
              transform: 'translateX(-50%)',
              width: '100%', maxWidth: '580px',
              zIndex: 2001,
              background: '#19160f',
              borderRadius: '16px',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(163,177,138,0.05)',
              overflow: 'hidden',
            }}
          >
            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}>
              <Search size={16} color="var(--pl-ink-soft)" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search actions, tabs, chapters…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--pl-ink)', fontSize: '0.95rem', fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
                  caretColor: 'var(--pl-olive, #A3B18A)',
                }}
              />
              <kbd style={{
                padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem',
                background: 'rgba(0,0,0,0.05)', color: 'var(--pl-muted)',
                border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'inherit',
              }}>ESC</kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}
            >
              {flatFiltered.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--pl-muted)', fontSize: '0.85rem' }}>
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                Object.entries(groups).map(([groupName, cmds]) => (
                  <div key={groupName}>
                    {/* Group label */}
                    <div style={{
                      padding: '6px 10px 4px',
                      fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.15em',
                      textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
                    }}>
                      {groupName}
                    </div>

                    {cmds.map(cmd => {
                      const idx = globalIndex++;
                      const isSelected = idx === selectedIndex;
                      const Icon = cmd.icon;
                      return (
                        <motion.button
                          key={cmd.id}
                          data-index={idx}
                          onClick={() => execute(cmd)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          animate={{ background: isSelected ? 'rgba(163,177,138,0.12)' : 'transparent' }}
                          transition={{ duration: 0.1 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            width: '100%', padding: '9px 10px', borderRadius: '8px',
                            border: isSelected ? '1px solid rgba(163,177,138,0.2)' : '1px solid transparent',
                            cursor: 'pointer', textAlign: 'left',
                            background: isSelected ? 'rgba(163,177,138,0.12)' : 'transparent',
                            transition: 'border 0.1s',
                          }}
                        >
                          {/* Icon */}
                          <div style={{
                            width: '30px', height: '30px', borderRadius: '7px',
                            background: 'rgba(163,177,138,0.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            border: '1px solid rgba(0,0,0,0.04)',
                          }}>
                            <Icon size={14} color={cmd.iconColor || 'var(--pl-ink-soft)'} />
                          </div>

                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                              {cmd.label}
                            </div>
                            {cmd.description && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', marginTop: '1px' }}>
                                {cmd.description}
                              </div>
                            )}
                          </div>

                          {/* Shortcut or arrow */}
                          {cmd.shortcut ? (
                            <kbd style={{
                              padding: '2px 7px', borderRadius: '5px', fontSize: '0.65rem',
                              background: 'rgba(0,0,0,0.04)', color: 'var(--pl-muted)',
                              border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'inherit',
                              flexShrink: 0,
                            }}>
                              {cmd.shortcut}
                            </kbd>
                          ) : isSelected ? (
                            <ArrowRight size={14} color="rgba(163,177,138,0.6)" />
                          ) : null}
                        </motion.button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid rgba(0,0,0,0.04)',
              display: 'flex', gap: '16px', alignItems: 'center',
            }}>
              {[['↑↓', 'navigate'], ['↵', 'select'], ['esc', 'close']].map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <kbd style={{
                    padding: '1px 6px', borderRadius: '4px', fontSize: '0.6rem',
                    background: 'rgba(0,0,0,0.04)', color: 'var(--pl-muted)',
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}>{key}</kbd>
                  <span style={{ fontSize: '0.65rem', color: 'var(--pl-muted)' }}>{label}</span>
                </div>
              ))}
              <div style={{ flex: 1, textAlign: 'right', fontSize: '0.6rem', color: 'rgba(0,0,0,0.08)' }}>
                ⌘K to toggle
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
