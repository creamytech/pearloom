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
  Hash, Clock,
} from 'lucide-react';
import { logEditorError } from '@/lib/editor-log';

const RECENTS_KEY = 'pl-cmd-palette-recents';
const MAX_RECENTS = 5;

export type CommandAction =
  | { type: 'tab'; tab: 'story' | 'events' | 'canvas' | 'design' | 'details' | 'pages' | 'blocks' | 'voice' }
  | { type: 'device'; mode: 'desktop' | 'tablet' | 'mobile' }
  | { type: 'chapter'; id: string }
  | { type: 'add-chapter' }
  | { type: 'preview' }
  | { type: 'publish' }
  | { type: 'undo' }
  | { type: 'redo' }
  // Contextual AI command — fires a Pear prompt.
  | { type: 'pear'; prompt: string };

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
  /** Current editing context. When present and no query is active, the
   *  palette prepends an "In context" group with commands tailored to
   *  whatever the user is currently working on. */
  contextHints?: {
    activeChapterId?: string | null;
    activeChapterTitle?: string | null;
    selectedBlockCount?: number;
    focusedFieldPath?: string | null;
  };
}

const TAB_COMMANDS: Command[] = [
  { id: 'tab-story',   label: 'Story',    description: 'Edit chapter text & photos',    icon: AlignLeft,          iconColor: '#60a5fa', group: 'Switch Tab', action: { type: 'tab', tab: 'story'   } },
  { id: 'tab-events',  label: 'Events',   description: 'Ceremony, reception & more',    icon: Calendar,           iconColor: '#f97316', group: 'Switch Tab', action: { type: 'tab', tab: 'events'  } },
  { id: 'tab-canvas',  label: 'Build',    description: 'Drag-and-drop page builder',    icon: LayoutTemplate,     iconColor: '#a78bfa', group: 'Switch Tab', action: { type: 'tab', tab: 'canvas'  } },
  { id: 'tab-design',  label: 'Design',   description: 'Colors, fonts & patterns',      icon: Palette,            iconColor: '#ec4899', group: 'Switch Tab', action: { type: 'tab', tab: 'design'  } },
  { id: 'tab-details', label: 'Details',  description: 'Names, date & location',        icon: Settings,           iconColor: '#6b7280', group: 'Switch Tab', action: { type: 'tab', tab: 'details' } },
  { id: 'tab-pages',   label: 'Pages',    description: 'Manage site pages',             icon: Globe,              iconColor: '#18181B', group: 'Switch Tab', action: { type: 'tab', tab: 'pages'  } },
  { id: 'tab-blocks',  label: 'AI',       description: 'AI-generated content blocks',   icon: Sparkles,           iconColor: '#18181B', group: 'Switch Tab', action: { type: 'tab', tab: 'blocks' } },
  { id: 'tab-voice',   label: 'Voice',    description: 'AI voice & TTS training',       icon: MessageCircleHeart, iconColor: '#f43f5e', group: 'Switch Tab', action: { type: 'tab', tab: 'voice'  } },
];

const DEVICE_COMMANDS: Command[] = [
  { id: 'device-desktop', label: 'Desktop view', description: 'Full-width preview',  icon: Monitor,     iconColor: '#94a3b8', group: 'Device', shortcut: '⌘1', action: { type: 'device', mode: 'desktop' } },
  { id: 'device-tablet',  label: 'Tablet view',  description: '768px preview',       icon: Tablet,      iconColor: '#94a3b8', group: 'Device', shortcut: '⌘2', action: { type: 'device', mode: 'tablet'  } },
  { id: 'device-mobile',  label: 'Mobile view',  description: '390px preview',       icon: Smartphone,  iconColor: '#94a3b8', group: 'Device', shortcut: '⌘3', action: { type: 'device', mode: 'mobile'  } },
];

const ACTION_COMMANDS: Command[] = [
  { id: 'add-chapter', label: 'Add new chapter',  description: 'Insert a blank chapter', icon: Plus,  iconColor: '#18181B', group: 'Actions', action: { type: 'add-chapter' } },
  { id: 'preview',     label: 'Preview site',      description: 'Open live preview tab',  icon: Eye,   iconColor: '#38bdf8', group: 'Actions', shortcut: '⌘P', action: { type: 'preview'     } },
  { id: 'publish',     label: 'Publish site',      description: 'Go live on pearloom.com',icon: Globe, iconColor: '#18181B', group: 'Actions', action: { type: 'publish'     } },
  { id: 'undo',        label: 'Undo',              description: 'Undo last change',       icon: RotateCcw, iconColor: '#e2e8f0', group: 'Actions', shortcut: '⌘Z',  action: { type: 'undo' } },
  { id: 'redo',        label: 'Redo',              description: 'Redo last change',       icon: RotateCw,  iconColor: '#e2e8f0', group: 'Actions', shortcut: '⌘⇧Z', action: { type: 'redo' } },
];

// Derive a prompt-style instruction from a data-pe-path value so AI
// rewrites target the right manifest field. Paths look like
// "chapters.2.description" or "logistics.venue".
function describePath(path: string): string {
  const parts = path.split('.');
  if (parts[0] === 'chapters' && parts.length >= 3) {
    return `chapter ${parts[1]} ${parts.slice(2).join(' ')}`;
  }
  return parts.join(' ');
}

function buildContextCommands(hints: NonNullable<CommandPaletteProps['contextHints']>): Command[] {
  const list: Command[] = [];
  const { activeChapterId, activeChapterTitle, selectedBlockCount = 0, focusedFieldPath } = hints;

  if (focusedFieldPath) {
    list.push({
      id: 'ctx-rewrite-field',
      label: 'AI rewrite this field',
      description: `Pear will polish the ${describePath(focusedFieldPath)} in place`,
      icon: Sparkles,
      iconColor: '#A3B18A',
      group: 'In context',
      action: { type: 'pear', prompt: `Rewrite the ${describePath(focusedFieldPath)} to match the site's tone. Keep names and dates exact.` },
    });
  }

  if (activeChapterId && activeChapterTitle) {
    list.push({
      id: `ctx-rewrite-chapter-${activeChapterId}`,
      label: `AI rewrite "${activeChapterTitle}"`,
      description: 'Polish this chapter while keeping facts intact',
      icon: Sparkles,
      iconColor: '#A3B18A',
      group: 'In context',
      action: { type: 'pear', prompt: `Rewrite the "${activeChapterTitle}" chapter with warmer, more evocative prose. Keep names, dates, and the core storyline. Use the update_chapter action on chapter ${activeChapterId}.` },
    });
  }

  if (selectedBlockCount > 0) {
    list.push({
      id: 'ctx-delete-selected',
      label: `Delete ${selectedBlockCount} selected block${selectedBlockCount === 1 ? '' : 's'}`,
      description: 'Remove selected blocks from the canvas',
      icon: RotateCcw,
      iconColor: '#d06060',
      group: 'In context',
      action: { type: 'pear', prompt: `Delete the ${selectedBlockCount} currently selected blocks from the canvas.` },
    });
  }

  return list;
}

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

export function CommandPalette({ open, onClose, onAction, chapters, canUndo, canRedo, contextHints }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Item 103: hydrate recent command IDs from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentIds(parsed.filter((x: unknown): x is string => typeof x === 'string').slice(0, MAX_RECENTS));
        }
      }
    } catch (err) {
      logEditorError('CommandPalette: hydrate recents', err);
    }
  }, []);

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
      iconColor: '#18181B',
      group: 'Chapters',
      action: { type: 'chapter' as const, id: ch.id },
    })),
  ];

  // Build "Recent" pseudo-group from recentIds when there's no query.
  const recentCommands: Command[] = !query.trim()
    ? recentIds
        .map(id => {
          const base = allCommands.find(c => c.id === id);
          if (!base) return null;
          // Re-stamp with "Recent" group + clock icon for visual affordance.
          return { ...base, id: `recent-${base.id}`, group: 'Recent', icon: Clock, iconColor: '#71717A' } as Command;
        })
        .filter((c): c is Command => !!c)
    : [];

  // Contextual commands — tailored to whatever the user is currently
  // working on. Only surface when no query is active so they don't crowd
  // out search results.
  const contextCommands: Command[] = !query.trim() && contextHints
    ? buildContextCommands(contextHints)
    : [];

  const filtered = query.trim()
    ? allCommands.filter(c => fuzzyMatch(query, c.label) || fuzzyMatch(query, c.description || '') || fuzzyMatch(query, c.group))
    : [...contextCommands, ...recentCommands, ...allCommands];

  // Group by section — preserve insertion order (Recent first when present).
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
    // Item 103: persist last MAX_RECENTS command IDs (strip "recent-" prefix
    // so re-selecting from the Recent group still dedupes).
    const canonicalId = cmd.id.startsWith('recent-') ? cmd.id.slice('recent-'.length) : cmd.id;
    setRecentIds(prev => {
      const next = [canonicalId, ...prev.filter(id => id !== canonicalId)].slice(0, MAX_RECENTS);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch (err) {
        logEditorError('CommandPalette: persist recents', err);
      }
      return next;
    });
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
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(24,24,27,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}>
              <Search size={16} color="#3F3F46" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search actions, tabs, chapters…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#18181B', fontSize: '0.9rem', fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
                  caretColor: '#18181B',
                }}
              />
              <kbd style={{
                padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem',
                background: 'rgba(0,0,0,0.05)', color: '#71717A',
                border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'inherit',
              }}>ESC</kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}
            >
              {flatFiltered.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#71717A', fontSize: '0.8rem' }}>
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                Object.entries(groups).map(([groupName, cmds]) => (
                  <div key={groupName}>
                    {/* Group label */}
                    <div style={{
                      padding: '6px 10px 4px',
                      fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em',
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
                          animate={{ background: isSelected ? '#F4F4F5' : 'transparent' }}
                          transition={{ duration: 0.1 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            width: '100%', padding: '9px 10px', borderRadius: '8px',
                            border: isSelected ? '1px solid rgba(24,24,27,0.1)' : '1px solid transparent',
                            cursor: 'pointer', textAlign: 'left',
                            background: isSelected ? '#F4F4F5' : 'transparent',
                            transition: 'border 0.1s',
                          }}
                        >
                          {/* Icon */}
                          <div style={{
                            width: '30px', height: '30px', borderRadius: '6px',
                            background: '#F4F4F5',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            border: '1px solid rgba(0,0,0,0.04)',
                          }}>
                            <Icon size={14} color={cmd.iconColor || '#3F3F46'} />
                          </div>

                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                              {cmd.label}
                            </div>
                            {cmd.description && (
                              <div style={{ fontSize: '0.65rem', color: '#71717A', marginTop: '1px' }}>
                                {cmd.description}
                              </div>
                            )}
                          </div>

                          {/* Shortcut or arrow */}
                          {cmd.shortcut ? (
                            <kbd style={{
                              padding: '2px 7px', borderRadius: '6px', fontSize: '0.65rem',
                              background: 'rgba(0,0,0,0.04)', color: '#71717A',
                              border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'inherit',
                              flexShrink: 0,
                            }}>
                              {cmd.shortcut}
                            </kbd>
                          ) : isSelected ? (
                            <ArrowRight size={14} color="#71717A" />
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
                    background: 'rgba(0,0,0,0.04)', color: '#71717A',
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}>{key}</kbd>
                  <span style={{ fontSize: '0.65rem', color: '#71717A' }}>{label}</span>
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
