'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/CommandPalette.tsx
// Cmd+K command palette for the full-screen editor
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlignLeft, Calendar, Palette, Settings, Globe, Sparkles,
  Mic, Monitor, Tablet, Smartphone, Plus,
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
  { id: 'tab-voice',   label: 'Voice',    description: 'AI voice & TTS training',       icon: Mic, iconColor: '#f43f5e', group: 'Switch Tab', action: { type: 'tab', tab: 'voice'  } },
];

const DEVICE_COMMANDS: Command[] = [
  { id: 'device-desktop', label: 'Desktop view', description: 'Full-width preview',  icon: Monitor,     iconColor: '#94a3b8', group: 'Device', shortcut: '⌘⌥1', action: { type: 'device', mode: 'desktop' } },
  { id: 'device-tablet',  label: 'Tablet view',  description: '768px preview',       icon: Tablet,      iconColor: '#94a3b8', group: 'Device', shortcut: '⌘⌥2', action: { type: 'device', mode: 'tablet'  } },
  { id: 'device-mobile',  label: 'Mobile view',  description: '390px preview',       icon: Smartphone,  iconColor: '#94a3b8', group: 'Device', shortcut: '⌘⌥3', action: { type: 'device', mode: 'mobile'  } },
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
      iconColor: 'var(--sage-deep)',
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
      iconColor: 'var(--sage-deep)',
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
            transition={{ duration: 0.16 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(22,16,6,0.62)',
              backdropFilter: 'blur(10px)',
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed', top: '16vh', left: '50%',
              transform: 'translateX(-50%)',
              width: '100%', maxWidth: '600px',
              zIndex: 2001,
              background: 'linear-gradient(180deg, #FDFAF0 0%, #F3EFE7 100%)',
              borderRadius: 'var(--pl-radius-xs)',
              borderTop: '2px solid rgba(193,154,75,0.55)',
              borderLeft: '1px solid rgba(193,154,75,0.22)',
              borderRight: '1px solid rgba(193,154,75,0.22)',
              borderBottom: '1px solid rgba(193,154,75,0.22)',
              boxShadow: '0 32px 80px rgba(22,16,6,0.45), 0 2px 10px rgba(22,16,6,0.12)',
              overflow: 'hidden',
            }}
          >
            {/* Masthead */}
            <div style={{
              padding: '14px 18px 10px',
              borderBottom: '1px solid rgba(193,154,75,0.28)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.32em',
                  textTransform: 'uppercase',
                  color: 'rgba(193,154,75,0.85)',
                }}>
                  The Index · ⌘K
                </span>
                <span style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '0.24em',
                  color: 'rgba(193,154,75,0.55)',
                }}>
                  № 00
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                paddingTop: 4,
              }}>
                <Search size={15} color="rgba(120,90,40,0.85)" strokeWidth={1.8} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search the ledger…"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#18181B',
                    fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                    fontStyle: 'italic',
                    fontSize: '1.15rem',
                    fontWeight: 400,
                    letterSpacing: '-0.005em',
                    caretColor: 'rgba(193,154,75,1)',
                    paddingBottom: 4,
                    borderBottom: '1.5px solid rgba(193,154,75,0.45)',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                />
                <kbd style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--pl-radius-xs)',
                  fontSize: 9,
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  background: 'rgba(255,252,245,0.7)',
                  color: '#52525B',
                  border: '1px solid rgba(193,154,75,0.28)',
                  boxShadow: 'inset 0 -1px 0 rgba(193,154,75,0.18)',
                }}>ESC</kbd>
              </div>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              style={{
                maxHeight: '420px',
                overflowY: 'auto',
                padding: '10px 10px 14px',
                background: 'rgba(255,252,245,0.35)',
              }}
            >
              {flatFiltered.length === 0 ? (
                <div style={{
                  margin: '18px 8px',
                  padding: '32px 16px',
                  textAlign: 'center',
                  border: '1px dashed rgba(193,154,75,0.45)',
                  borderRadius: 'var(--pl-radius-xs)',
                  background: 'rgba(255,252,245,0.55)',
                }}>
                  <div style={{
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color: 'rgba(193,154,75,0.85)',
                    marginBottom: 8,
                  }}>
                    Blank folio · № 00
                  </div>
                  <div style={{
                    fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                    fontStyle: 'italic',
                    fontSize: '1.1rem',
                    color: '#18181B',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}>
                    No results for “{query}”.
                  </div>
                </div>
              ) : (
                Object.entries(groups).map(([groupName, cmds]) => (
                  <div key={groupName} style={{ marginBottom: 6 }}>
                    {/* Group label */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 10px 6px',
                    }}>
                      <span style={{
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.28em',
                        textTransform: 'uppercase',
                        color: 'rgba(193,154,75,0.85)',
                      }}>
                        {groupName}
                      </span>
                      <span style={{
                        flex: 1,
                        height: 1,
                        background: 'rgba(193,154,75,0.28)',
                      }} />
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
                          animate={{
                            background: isSelected
                              ? 'rgba(193,154,75,0.12)'
                              : 'transparent',
                          }}
                          transition={{ duration: 0.14 }}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '26px 32px 1fr auto',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            padding: '9px 10px',
                            borderRadius: 'var(--pl-radius-xs)',
                            border: 'none',
                            boxShadow: isSelected ? 'inset 2px 0 0 rgba(193,154,75,0.75)' : 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            background: isSelected ? 'rgba(193,154,75,0.12)' : 'transparent',
                            transition: 'box-shadow 180ms cubic-bezier(0.22,1,0.36,1)',
                            position: 'relative',
                          }}
                        >
                          {/* Folio */}
                          <span style={{
                            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                            fontSize: 8.5,
                            fontWeight: 700,
                            letterSpacing: '0.22em',
                            color: isSelected ? 'rgba(193,154,75,1)' : 'rgba(193,154,75,0.5)',
                            textAlign: 'right',
                            paddingRight: 2,
                          }}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          {/* Icon */}
                          <div style={{
                            width: '30px', height: '30px', borderRadius: 'var(--pl-radius-xs)',
                            background: isSelected ? 'rgba(193,154,75,0.20)' : 'rgba(255,252,245,0.65)',
                            border: isSelected
                              ? '1px solid rgba(193,154,75,0.55)'
                              : '1px solid rgba(193,154,75,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'background 180ms ease, border-color 180ms ease',
                          }}>
                            <Icon size={14} color={isSelected ? 'rgba(120,90,40,1)' : '#3F3F46'} strokeWidth={1.8} />
                          </div>

                          {/* Text */}
                          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{
                              fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                              fontStyle: 'italic',
                              fontSize: '0.95rem',
                              fontWeight: 400,
                              color: '#18181B',
                              lineHeight: 1.1,
                              letterSpacing: '-0.003em',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {cmd.label}
                            </div>
                            {cmd.description && (
                              <div style={{
                                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                                fontSize: 9,
                                color: '#71717A',
                                letterSpacing: '0.04em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {cmd.description}
                              </div>
                            )}
                          </div>

                          {/* Shortcut or arrow */}
                          {cmd.shortcut ? (
                            <kbd style={{
                              padding: '3px 8px',
                              borderRadius: 'var(--pl-radius-xs)',
                              fontSize: 9,
                              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                              fontWeight: 700,
                              letterSpacing: '0.18em',
                              textTransform: 'uppercase',
                              background: 'rgba(255,252,245,0.7)',
                              color: '#52525B',
                              border: '1px solid rgba(193,154,75,0.28)',
                              flexShrink: 0,
                            }}>
                              {cmd.shortcut}
                            </kbd>
                          ) : isSelected ? (
                            <ArrowRight size={13} color="rgba(120,90,40,1)" strokeWidth={1.8} />
                          ) : <span />}
                        </motion.button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              padding: '10px 18px',
              borderTop: '1px solid rgba(193,154,75,0.28)',
              background: 'rgba(248,244,236,0.7)',
              display: 'flex',
              gap: '18px',
              alignItems: 'center',
            }}>
              {[['↑↓', 'navigate'], ['↵', 'select'], ['esc', 'close']].map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <kbd style={{
                    padding: '2px 7px',
                    borderRadius: 'var(--pl-radius-xs)',
                    fontSize: 8.5,
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    background: 'rgba(255,252,245,0.85)',
                    color: '#52525B',
                    border: '1px solid rgba(193,154,75,0.28)',
                  }}>{key}</kbd>
                  <span style={{
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontSize: 8.5,
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'rgba(82,82,91,0.85)',
                  }}>{label}</span>
                </div>
              ))}
              <div style={{
                flex: 1,
                textAlign: 'right',
                fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                fontStyle: 'italic',
                fontSize: 11,
                color: 'rgba(193,154,75,0.85)',
              }}>
                ⌘K · toggle
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
