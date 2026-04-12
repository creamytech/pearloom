'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/UndoTimeline.tsx
// Visual undo/redo timeline panel — shows every action with
// descriptions and timestamps. Click to jump to any state.
//
// Two modes:
//   1. Popup overlay (used in EditorToolbar) — pass open/onClose
//   2. Sidebar panel (used in EditorWing history tab) — pass mode="panel"
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Type, Image, Trash2, Plus, ArrowUpDown, Pencil,
  Layout, Music, MapPin, ListChecks, Users, Settings, Sparkles, Clock,
  RotateCcw, ChevronUp, ChevronDown,
} from 'lucide-react';
import { useEditor, type HistoryEntry } from '@/lib/editor-state';

// ── Relative time formatting ────────────────────────────────
function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ── Action-type icon mapping ────────────────────────────────
function getActionIcon(label: string): React.ReactNode {
  const lower = label.toLowerCase();
  if (lower.includes('theme') || lower.includes('color') || lower.includes('tint')) return <Palette size={12} />;
  if (lower.includes('typography') || lower.includes('font')) return <Type size={12} />;
  if (lower.includes('photo') || lower.includes('cover') || lower.includes('image')) return <Image size={12} />;
  if (lower.includes('delete') || lower.includes('removed')) return <Trash2 size={12} />;
  if (lower.includes('added') || lower.includes('add ')) return <Plus size={12} />;
  if (lower.includes('moved') || lower.includes('reorder')) return <ArrowUpDown size={12} />;
  if (lower.includes('edited') || lower.includes('updated') || lower.includes('changed')) return <Pencil size={12} />;
  if (lower.includes('layout') || lower.includes('nav')) return <Layout size={12} />;
  if (lower.includes('spotify') || lower.includes('music')) return <Music size={12} />;
  if (lower.includes('logistics') || lower.includes('venue')) return <MapPin size={12} />;
  if (lower.includes('faq') || lower.includes('registry')) return <ListChecks size={12} />;
  if (lower.includes('wedding party')) return <Users size={12} />;
  if (lower.includes('customiz')) return <Settings size={12} />;
  if (lower.includes('skin') || lower.includes('design')) return <Sparkles size={12} />;
  if (lower.includes('initial')) return <Clock size={12} />;
  return <Pencil size={12} />;
}

// ── Shared timeline entry row ──────────────────────────────
function TimelineEntry({
  entry,
  realIndex,
  isCurrent,
  isFuture,
  onJump,
  activeRef,
}: {
  entry: HistoryEntry;
  realIndex: number;
  isCurrent: boolean;
  isFuture: boolean;
  onJump: (index: number) => void;
  activeRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  // Track time freshness
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.button
      ref={isCurrent ? activeRef : undefined}
      onClick={() => onJump(realIndex)}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: isFuture ? 0.4 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ backgroundColor: 'var(--pl-white-20)' }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '8px 10px',
        borderRadius: '10px',
        border: isCurrent ? '1.5px solid #18181B' : '1.5px solid transparent',
        background: isCurrent ? 'rgba(110,140,92,0.1)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* Timeline dot + connector */}
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isCurrent ? '#18181B' : 'var(--pl-black-6)',
          color: isCurrent ? '#fff' : '#3F3F46',
          flexShrink: 0,
          transition: 'background 0.15s, color 0.15s',
        }}>
          {getActionIcon(entry.label)}
        </div>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 'var(--pl-text-sm)',
          fontWeight: isCurrent ? 650 : 500,
          color: isCurrent ? '#18181B' : '#3F3F46',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {entry.label}
        </div>
        <div style={{
          fontSize: 'var(--pl-text-2xs)',
          color: '#71717A',
          marginTop: '1px',
        }}>
          {timeAgo(entry.timestamp)}
        </div>
      </div>

      {/* Current indicator */}
      {isCurrent && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#18181B',
            flexShrink: 0,
          }}
        />
      )}
    </motion.button>
  );
}

// ── Popup overlay mode (used in EditorToolbar) ─────────────

interface UndoTimelinePopupProps {
  open: boolean;
  onClose: () => void;
}

export function UndoTimeline({ open, onClose }: UndoTimelinePopupProps) {
  const { actions } = useEditor();
  const entries = actions.getHistoryEntries();
  const currentIndex = actions.getHistoryIndex();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to current entry when panel opens or history changes
  useEffect(() => {
    if (open && activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [open, currentIndex]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

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
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: '48px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: '320px',
              maxHeight: '420px',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--pl-white-20)',
              borderRadius: '8px',
              border: '1px solid var(--pl-white-30)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px var(--pl-black-6)',
              overflow: 'hidden',
            } as React.CSSProperties}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px 8px',
              borderBottom: '1px solid var(--pl-white-20)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="#18181B" />
                <span style={{
                  fontSize: 'var(--pl-text-xs)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#18181B',
                }}>
                  Edit Timeline
                </span>
              </div>
              <span style={{
                fontSize: 'var(--pl-text-2xs)',
                fontWeight: 600,
                color: '#71717A',
              }}>
                {entries.length} {entries.length === 1 ? 'state' : 'states'}
              </span>
            </div>

            {/* Timeline list */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '6px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--pl-black-10) transparent',
              }}
            >
              {entries.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  fontSize: 'var(--pl-text-sm)',
                  color: '#71717A',
                }}>
                  No actions yet
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {[...entries].reverse().map((entry, rIdx) => {
                    const realIndex = entries.length - 1 - rIdx;
                    return (
                      <TimelineEntry
                        key={`${realIndex}-${entry.timestamp}`}
                        entry={entry}
                        realIndex={realIndex}
                        isCurrent={realIndex === currentIndex}
                        isFuture={realIndex > currentIndex}
                        onJump={(idx) => actions.jumpToHistory(idx)}
                        activeRef={activeRef}
                      />
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--pl-white-20)',
              fontSize: 'var(--pl-text-2xs)',
              color: '#71717A',
              textAlign: 'center',
              fontWeight: 500,
            }}>
              Click any state to jump back -- Cmd+Z / Cmd+Shift+Z
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sidebar panel mode (used in EditorWing history tab) ────

export function UndoTimelinePanel() {
  const { state, dispatch, actions } = useEditor();
  const entries = actions.getHistoryEntries();
  const currentIndex = actions.getHistoryIndex();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to current entry on mount and when history changes
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentIndex]);

  const handleJump = (index: number) => {
    actions.jumpToHistory(index);
    dispatch({ type: 'SET_UNDO_INDEX', index });
  };

  const handleClearHistory = () => {
    dispatch({ type: 'CLEAR_UNDO_HISTORY' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Stats bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderRadius: '10px',
        background: 'var(--pl-white-20)',
        border: '1px solid var(--pl-white-30)',
      } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#18181B',
            color: '#fff',
          }}>
            <RotateCcw size={13} />
          </div>
          <div>
            <div style={{
              fontSize: 'var(--pl-text-sm)',
              fontWeight: 650,
              color: '#18181B',
            }}>
              {entries.length} {entries.length === 1 ? 'state' : 'states'}
            </div>
            <div style={{
              fontSize: 'var(--pl-text-2xs)',
              color: '#71717A',
            }}>
              Position {currentIndex + 1} of {entries.length}
            </div>
          </div>
        </div>

        {/* Quick undo/redo */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <motion.button
            onClick={() => actions.undo()}
            disabled={!state.canUndo}
            whileHover={state.canUndo ? { scale: 1.08 } : {}}
            whileTap={state.canUndo ? { scale: 0.92 } : {}}
            title="Undo"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              border: 'none',
              background: state.canUndo ? 'var(--pl-black-6)' : 'transparent',
              color: state.canUndo ? '#3F3F46' : 'rgba(0,0,0,0.15)',
              cursor: state.canUndo ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronUp size={13} />
          </motion.button>
          <motion.button
            onClick={() => actions.redo()}
            disabled={!state.canRedo}
            whileHover={state.canRedo ? { scale: 1.08 } : {}}
            whileTap={state.canRedo ? { scale: 0.92 } : {}}
            title="Redo"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              border: 'none',
              background: state.canRedo ? 'var(--pl-black-6)' : 'transparent',
              color: state.canRedo ? '#3F3F46' : 'rgba(0,0,0,0.15)',
              cursor: state.canRedo ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronDown size={13} />
          </motion.button>
        </div>
      </div>

      {/* Timeline card */}
      <div style={{
        borderRadius: '12px',
        background: 'var(--pl-white-20)',
        border: '1px solid var(--pl-white-30)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      } as React.CSSProperties}>
        {/* Timeline header */}
        <div style={{
          padding: '10px 14px 8px',
          borderBottom: '1px solid var(--pl-white-20)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 'var(--pl-text-2xs)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#18181B',
          }}>
            Action History
          </span>
          <span style={{
            fontSize: 'var(--pl-text-2xs)',
            color: '#71717A',
            fontWeight: 500,
          }}>
            Newest first
          </span>
        </div>

        {/* Scrollable entry list */}
        <div
          ref={scrollRef}
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '6px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--pl-black-10) transparent',
          }}
        >
          {entries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'var(--pl-black-4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#71717A',
              }}>
                <Clock size={18} />
              </div>
              <div style={{
                fontSize: 'var(--pl-text-sm)',
                fontWeight: 600,
                color: '#3F3F46',
              }}>
                No actions yet
              </div>
              <div style={{
                fontSize: 'var(--pl-text-2xs)',
                color: '#71717A',
                lineHeight: 1.5,
                maxWidth: '180px',
              }}>
                Your edit history will appear here as you make changes
              </div>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {[...entries].reverse().map((entry, rIdx) => {
                const realIndex = entries.length - 1 - rIdx;
                return (
                  <TimelineEntry
                    key={`panel-${realIndex}-${entry.timestamp}`}
                    entry={entry}
                    realIndex={realIndex}
                    isCurrent={realIndex === currentIndex}
                    isFuture={realIndex > currentIndex}
                    onJump={handleJump}
                    activeRef={activeRef}
                  />
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Clear history button */}
      {entries.length > 1 && (
        <motion.button
          onClick={handleClearHistory}
          whileHover={{ backgroundColor: 'rgba(200,50,50,0.08)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--pl-white-30)',
            background: 'rgba(24,24,27,0.08)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: 'var(--pl-text-xs)',
            fontWeight: 600,
            color: '#71717A',
            transition: 'color 0.15s',
          } as React.CSSProperties}
        >
          <Trash2 size={11} />
          Clear History
        </motion.button>
      )}

      {/* Keyboard shortcut hint */}
      <div style={{
        textAlign: 'center',
        fontSize: 'var(--pl-text-2xs)',
        color: '#71717A',
        fontWeight: 500,
        paddingBottom: '8px',
      }}>
        Cmd+Z to undo / Cmd+Shift+Z to redo
      </div>
    </div>
  );
}
