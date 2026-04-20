'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Mail } from 'lucide-react';
import {
  SectionsIcon, StoryIcon, EventsIcon, DesignIcon,
  DetailsIcon, AIBlocksIcon, VoiceIcon,
} from '@/components/icons/EditorIcons';

// ── Types ──────────────────────────────────────────────────────
type EditorTab = 'story' | 'events' | 'design' | 'details' | 'pages' | 'blocks' | 'voice' | 'canvas' | 'messaging' | 'analytics' | 'guests' | 'seating' | 'translate' | 'invite' | 'savethedate' | 'thankyou' | 'spotify' | 'vendors' | 'components' | 'history' | 'media';

interface EditorSidebarProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  width: number;
  onWidthChange: (w: number) => void;
  collapsed: boolean;
  onCollapsedChange: (c: boolean) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

// ── Tab configuration ──────────────────────────────────────────
const TAB_CONFIG: Array<{
  tab: EditorTab;
  icon: React.ElementType;
  label: string;
  group?: 'top' | 'bottom';
}> = [
  { tab: 'canvas',  icon: SectionsIcon, label: 'Sections',  group: 'top' },
  { tab: 'story',   icon: StoryIcon,    label: 'Story',     group: 'top' },
  { tab: 'events',  icon: EventsIcon,   label: 'Events',    group: 'top' },
  { tab: 'design',  icon: DesignIcon,   label: 'Design',    group: 'top' },
  { tab: 'details', icon: DetailsIcon,  label: 'Details',   group: 'bottom' },
  { tab: 'blocks',  icon: AIBlocksIcon, label: 'Pear', group: 'bottom' },
  { tab: 'voice',      icon: VoiceIcon,    label: 'Voice',      group: 'bottom' },
  { tab: 'messaging',  icon: Mail,         label: 'Messaging',  group: 'bottom' },
];

const TAB_LABELS: Record<EditorTab, string> = {
  canvas: 'Sections', story: 'Story Chapters', events: 'Events',
  design: 'Design', details: 'Details', pages: 'Pages',
  blocks: 'Pear', voice: 'Voice', messaging: 'Message Guests',
  analytics: 'Analytics', guests: 'Guest List', seating: 'Seating Chart',
  translate: 'Translations', invite: 'Send Invitations', savethedate: 'Save the Date',
  thankyou: 'Thank You', spotify: 'Soundtrack', vendors: 'Vendors',
  components: 'Components', history: 'Version History', media: 'Media library',
};

const MIN_WIDTH = 260;
const MAX_WIDTH = 620;
const DEFAULT_WIDTH = 380;

// ── SidebarSection accordion ───────────────────────────────────
export function SidebarSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="pl-panel-section" style={{ marginBottom: '2px', padding: '0' }}>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ backgroundColor: 'var(--pl-chrome-accent-soft)' }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', borderRadius: 'var(--pl-radius-sm)', border: 'none',
          background: 'transparent', cursor: 'pointer',
          color: 'var(--pl-chrome-text-soft)',
        }}
      >
        <ChevronRight
          size={10}
          style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform var(--pl-dur-fast)',
            color: open ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-muted)',
            flexShrink: 0,
          }}
        />
        {Icon && <Icon size={12} color="var(--pl-chrome-text)" />}
        <span style={{
          flex: 1, textAlign: 'left', fontSize: '0.65rem', fontWeight: 600,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          color: open ? 'var(--pl-chrome-text-soft)' : 'var(--pl-chrome-text-muted)',
        }}>
          {title}
        </span>
        {badge !== undefined && (
          <span style={{
            fontSize: '0.58rem', padding: '2px 7px', borderRadius: 'var(--pl-radius-md)',
            background: 'var(--pl-chrome-surface-2)', color: 'var(--pl-chrome-text)',
            fontWeight: 700,
          }}>
            {badge}
          </span>
        )}
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '2px 10px 10px' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── EditorSidebar ──────────────────────────────────────────────
export function EditorSidebar({
  activeTab,
  onTabChange,
  width,
  onWidthChange,
  collapsed,
  onCollapsedChange,
  children,
  footer,
  contentRef,
}: EditorSidebarProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isResizeHover, setIsResizeHover] = useState(false);
  const [prevWidthBeforeExpand, setPrevWidthBeforeExpand] = useState<number | null>(null);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);

  // ── Resize handle drag ─────────────────────────────────────────
  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - dragStartX.current;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartWidth.current + delta));
      onWidthChange(newWidth);
    };

    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [width, onWidthChange]);

  // ── Expand to max / restore ────────────────────────────────────
  const handleExpandToggle = useCallback(() => {
    if (width >= MAX_WIDTH - 10) {
      onWidthChange(prevWidthBeforeExpand ?? DEFAULT_WIDTH);
      setPrevWidthBeforeExpand(null);
    } else {
      setPrevWidthBeforeExpand(width);
      onWidthChange(MAX_WIDTH);
    }
  }, [width, prevWidthBeforeExpand, onWidthChange]);

  // cursor override during resize
  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isResizing]);

  const panelTitle = TAB_LABELS[activeTab] ?? activeTab;
  const isAtMax = width >= MAX_WIDTH - 10;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* ── Icon Rail ─────────────────────────────────────────── */}
      <div
        style={{
          width: '64px',
          flexShrink: 0,
          height: '100%',
          background: 'var(--pl-chrome-rail)',
          borderRight: '1px solid var(--pl-chrome-rail-divider)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '6px',
          paddingBottom: '6px',
          gap: '0',
        }}
      >
        {/* Tabs */}
        {TAB_CONFIG.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          // Separator before the 'details' group
          const showSeparator = index > 0 && TAB_CONFIG[index - 1].group !== item.group;

          return (
            <React.Fragment key={item.tab}>
              {showSeparator && (
                <div
                  style={{
                    width: '28px',
                    height: '1px',
                    background: 'var(--pl-chrome-rail-divider)',
                    margin: '4px 0',
                    flexShrink: 0,
                  }}
                />
              )}
              <motion.button
                title={item.label}
                aria-label={item.label}
                onClick={() => {
                  if (isActive) {
                    onCollapsedChange(!collapsed);
                  } else {
                    onTabChange(item.tab);
                    if (collapsed) onCollapsedChange(false);
                  }
                }}
                whileHover={!(isActive && !collapsed) ? { backgroundColor: 'var(--pl-chrome-rail-hover)', scale: 1.04 } : { scale: 1.02 }}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                style={{
                  width: '56px',
                  height: '40px',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 'var(--pl-radius-sm)',
                  margin: '1px 4px',
                  position: 'relative',
                  background: isActive && !collapsed
                    ? 'var(--pl-chrome-rail-active)'
                    : 'transparent',
                  color: isActive && !collapsed ? 'var(--pl-chrome-rail-ink)' : 'var(--pl-chrome-rail-ink-muted)',
                  boxSizing: 'border-box',
                }}
              >
                {/* Bottom pill active indicator */}
                <AnimatePresence>
                  {isActive && !collapsed && (
                    <motion.div
                      layoutId="sidebar-pill"
                      initial={{ opacity: 0, scaleX: 0.5 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0.5 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '24px',
                        height: '3px',
                        borderRadius: 'var(--pl-radius-md)',
                        background: 'var(--pl-chrome-rail-ink)',
                      }}
                    />
                  )}
                </AnimatePresence>
                <motion.div
                  animate={{ scale: isActive && !collapsed ? 1 : 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                >
                  <Icon
                    size={16}
                    color={isActive && !collapsed ? 'var(--pl-chrome-rail-ink)' : 'var(--pl-chrome-rail-ink-faint)'}
                  />
                </motion.div>
                {/* Micro-label */}
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  color: isActive && !collapsed ? 'var(--pl-chrome-rail-ink)' : 'var(--pl-chrome-rail-ink-faint)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '52px',
                }}>
                  {item.label.length > 8 ? item.label.slice(0, 6) + '…' : item.label}
                </span>
              </motion.button>
            </React.Fragment>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Collapse arrow at bottom */}
        <motion.button
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
          aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
          onClick={() => onCollapsedChange(!collapsed)}
          whileHover={{ backgroundColor: 'var(--pl-chrome-rail-hover)', color: 'var(--pl-chrome-rail-ink-muted)', scale: 1.08 }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          style={{
            width: '56px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 'var(--pl-radius-sm)',
            margin: '2px',
            background: 'transparent',
            color: 'var(--pl-chrome-rail-ink-faint)',
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </motion.button>
      </div>

      {/* ── Content Panel ─────────────────────────────────────── */}
      <div
        style={{
          width: collapsed ? '0px' : `${width}px`,
          flexShrink: 0,
          overflow: 'hidden',
          transition: isResizing ? 'none' : 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--pl-chrome-bg)',
          borderRight: collapsed ? 'none' : '1px solid var(--pl-chrome-border)',
          position: 'relative',
        }}
      >
        {!collapsed && (
          <>
            {/* Panel Header */}
            <div
              style={{
                height: '48px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px 0 14px',
                borderBottom: '1px solid var(--pl-chrome-border)',
                gap: '8px',
                background: 'var(--pl-chrome-surface)',
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  letterSpacing: '-0.01em',
                  color: 'var(--pl-chrome-text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {panelTitle}
              </span>

              {/* Expand to max button */}
              <motion.button
                title={isAtMax ? 'Restore width' : 'Expand to full width'}
                aria-label={isAtMax ? 'Restore panel width' : 'Expand panel to full width'}
                onClick={handleExpandToggle}
                whileHover={!isAtMax ? { backgroundColor: 'var(--pl-chrome-accent-soft)', color: 'var(--pl-chrome-text)', scale: 1.12 } : { scale: 1.08 }}
                whileTap={{ scale: 0.86 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 'var(--pl-radius-xs)',
                  background: isAtMax ? 'var(--pl-chrome-accent-soft)' : 'transparent',
                  color: isAtMax ? 'var(--pl-chrome-text)' : 'var(--pl-chrome-text-muted)',
                  fontSize: '14px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {isAtMax ? '⤡' : '⤢'}
              </motion.button>
            </div>

            {/* Scrollable content */}
            <div
              ref={contentRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px',
                WebkitOverflowScrolling: 'touch',
              } as React.CSSProperties}
            >
              {children}
            </div>

            {/* Sticky footer (optional) */}
            {footer && (
              <div
                style={{
                  flexShrink: 0,
                  borderTop: '1px solid var(--pl-chrome-border)',
                  background: 'var(--pl-chrome-surface-2)',
                }}
              >
                {footer}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Resize Handle ─────────────────────────────────────── */}
      {!collapsed && (
        <div
          onPointerDown={handleResizePointerDown}
          onMouseEnter={() => setIsResizeHover(true)}
          onMouseLeave={() => setIsResizeHover(false)}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '8px',
            cursor: 'col-resize',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isResizing || isResizeHover
              ? 'var(--pl-chrome-accent-soft)'
              : 'transparent',
            transition: 'background var(--pl-dur-instant)',
          }}
        >
          {/* Visual line */}
          <div
            style={{
              width: '2px',
              height: '40px',
              borderRadius: 'var(--pl-radius-xs)',
              background: isResizing || isResizeHover
                ? 'var(--pl-chrome-accent)'
                : 'var(--pl-chrome-border)',
              transition: 'background var(--pl-dur-instant)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}
