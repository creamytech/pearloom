'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  SectionsIcon, StoryIcon, EventsIcon, DesignIcon,
  DetailsIcon, AIBlocksIcon, VoiceIcon,
} from '@/components/icons/EditorIcons';

// ── Types ──────────────────────────────────────────────────────
type EditorTab = 'story' | 'events' | 'design' | 'details' | 'pages' | 'blocks' | 'voice' | 'canvas';

interface EditorSidebarProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  width: number;
  onWidthChange: (w: number) => void;
  collapsed: boolean;
  onCollapsedChange: (c: boolean) => void;
  children: React.ReactNode;
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
  { tab: 'blocks',  icon: AIBlocksIcon, label: 'AI Blocks', group: 'bottom' },
  { tab: 'voice',   icon: VoiceIcon,    label: 'Voice',     group: 'bottom' },
];

const TAB_LABELS: Record<EditorTab, string> = {
  canvas: 'Sections', story: 'Story Chapters', events: 'Events',
  design: 'Design', details: 'Details', pages: 'Pages',
  blocks: 'AI Blocks', voice: 'Voice',
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
    <div style={{ marginBottom: '4px' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 8px', borderRadius: '6px', border: 'none',
          background: 'rgba(214,198,168,0.04)', cursor: 'pointer',
          color: 'rgba(214,198,168,0.6)',
        }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(214,198,168,0.08)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(214,198,168,0.04)'; }}
      >
        <ChevronRight
          size={11}
          style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
            color: 'rgba(214,198,168,0.3)',
            flexShrink: 0,
          }}
        />
        {Icon && <Icon size={12} color="rgba(214,198,168,0.4)" />}
        <span style={{
          flex: 1, textAlign: 'left', fontSize: '0.62rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'rgba(214,198,168,0.55)',
        }}>
          {title}
        </span>
        {badge !== undefined && (
          <span style={{
            fontSize: '0.58rem', padding: '1px 5px', borderRadius: '8px',
            background: 'rgba(214,198,168,0.08)', color: 'rgba(214,198,168,0.4)',
          }}>
            {badge}
          </span>
        )}
      </button>
      {open && (
        <div style={{ padding: '4px 0 8px' }}>
          {children}
        </div>
      )}
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
          width: '48px',
          flexShrink: 0,
          height: '100%',
          background: '#1C1916',
          borderRight: '1px solid rgba(214,198,168,0.07)',
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
                    background: 'rgba(214,198,168,0.08)',
                    margin: '4px 0',
                    flexShrink: 0,
                  }}
                />
              )}
              <button
                title={item.label}
                onClick={() => {
                  if (isActive) {
                    onCollapsedChange(!collapsed);
                  } else {
                    onTabChange(item.tab);
                    if (collapsed) onCollapsedChange(false);
                  }
                }}
                style={{
                  width: '44px',
                  height: '44px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  margin: '1px 2px',
                  background: isActive && !collapsed
                    ? 'rgba(163,177,138,0.18)'
                    : 'transparent',
                  borderLeft: isActive && !collapsed
                    ? '3px solid #A3B18A'
                    : '3px solid transparent',
                  color: isActive && !collapsed ? '#F5F1E8' : 'rgba(214,198,168,0.3)',
                  transition: 'background 0.15s, color 0.15s',
                  boxSizing: 'border-box',
                }}
                onMouseOver={e => {
                  if (!(isActive && !collapsed)) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(214,198,168,0.08)';
                  }
                }}
                onMouseOut={e => {
                  if (!(isActive && !collapsed)) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <Icon
                  size={16}
                  color={isActive && !collapsed ? '#F5F1E8' : 'rgba(214,198,168,0.3)'}
                />
              </button>
            </React.Fragment>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Collapse arrow at bottom */}
        <button
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
          onClick={() => onCollapsedChange(!collapsed)}
          style={{
            width: '44px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '6px',
            margin: '2px',
            background: 'transparent',
            color: 'rgba(214,198,168,0.25)',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(214,198,168,0.07)';
            (e.currentTarget as HTMLElement).style.color = 'rgba(214,198,168,0.6)';
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'rgba(214,198,168,0.25)';
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
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
          background: '#211D18',
          borderRight: collapsed ? 'none' : '1px solid rgba(214,198,168,0.07)',
          position: 'relative',
        }}
      >
        {!collapsed && (
          <>
            {/* Panel Header */}
            <div
              style={{
                height: '40px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px 0 12px',
                borderBottom: '1px solid rgba(214,198,168,0.07)',
                gap: '8px',
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(214,198,168,0.5)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {panelTitle}
              </span>

              {/* Expand to max button */}
              <button
                title={isAtMax ? 'Restore width' : 'Expand to full width'}
                onClick={handleExpandToggle}
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  background: isAtMax ? 'rgba(163,177,138,0.15)' : 'transparent',
                  color: isAtMax ? '#A3B18A' : 'rgba(214,198,168,0.25)',
                  fontSize: '14px',
                  lineHeight: 1,
                  flexShrink: 0,
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseOver={e => {
                  if (!isAtMax) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(214,198,168,0.08)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(214,198,168,0.6)';
                  }
                }}
                onMouseOut={e => {
                  if (!isAtMax) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(214,198,168,0.25)';
                  }
                }}
              >
                {isAtMax ? '⤡' : '⤢'}
              </button>
            </div>

            {/* Scrollable content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px',
                WebkitOverflowScrolling: 'touch',
              } as React.CSSProperties}
            >
              {children}
            </div>
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
              ? 'rgba(214,198,168,0.05)'
              : 'transparent',
            transition: 'background 0.15s',
          }}
        >
          {/* Visual line */}
          <div
            style={{
              width: '2px',
              height: '40px',
              borderRadius: '1px',
              background: isResizing || isResizeHover
                ? 'rgba(163,177,138,0.6)'
                : 'rgba(214,198,168,0.1)',
              transition: 'background 0.15s',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}
