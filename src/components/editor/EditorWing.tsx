'use client';

// Two-sided overlay wing panel for the editor
// Left wing: narrative (story, events, canvas, pages, messaging)
// Right wing: aesthetic (design, details, blocks, voice)
// When closed: only a 44px handle pill is visible at the screen edge
// When open: a 360px glass panel slides in over the canvas

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type EditorTab = 'story' | 'events' | 'design' | 'details' | 'pages' | 'blocks' | 'voice' | 'canvas' | 'messaging' | 'analytics' | 'guests' | 'seating' | 'translate' | 'invite' | 'savethedate';

interface WingTab {
  tab: EditorTab;
  icon: React.ElementType;
  label: string;
}

interface EditorWingProps {
  side: 'left' | 'right';
  open: boolean;
  onToggle: () => void;
  tabs: WingTab[];
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  children: React.ReactNode;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  toolbarHeight?: number;
}

const PANEL_W = 348;
const HANDLE_W = 44;
const TOTAL_W = PANEL_W + HANDLE_W;

export function EditorWing({
  side,
  open,
  onToggle,
  tabs,
  activeTab,
  onTabChange,
  children,
  contentRef,
  toolbarHeight = 44,
}: EditorWingProps) {
  const isLeft = side === 'left';

  // Which chevron to show based on side and open state
  const ChevronIcon = isLeft
    ? (open ? ChevronLeft : ChevronRight)
    : (open ? ChevronRight : ChevronLeft);

  // Active tab icon for the handle
  const activeTabConfig = tabs.find(t => t.tab === activeTab);
  const ActiveTabIcon = activeTabConfig?.icon ?? tabs[0]?.icon;

  // Animation: closed means panel is hidden off screen
  // Left: closed x = -PANEL_W (only handle visible), open x = 0
  // Right: closed x = PANEL_W (only handle visible), open x = 0
  const xClosed = isLeft ? -PANEL_W : PANEL_W;

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: toolbarHeight,
        bottom: 0,
        [isLeft ? 'left' : 'right']: 0,
        width: TOTAL_W,
        display: 'flex',
        flexDirection: isLeft ? 'row' : 'row-reverse',
        zIndex: 200,
        pointerEvents: 'none',
      }}
      initial={false}
      animate={{ x: open ? 0 : xClosed }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
    >
      {/* Panel (348px) */}
      <div
        style={{
          width: PANEL_W,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(16, 13, 10, 0.97)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRight: isLeft ? '1px solid rgba(255,255,255,0.07)' : undefined,
          borderLeft: !isLeft ? '1px solid rgba(255,255,255,0.07)' : undefined,
          boxShadow: open
            ? (isLeft ? '24px 0 60px rgba(0,0,0,0.65)' : '-24px 0 60px rgba(0,0,0,0.65)')
            : 'none',
          pointerEvents: open ? 'all' : 'none',
          flexShrink: 0,
        }}
      >
        {/* Tab strip (48px) */}
        <div
          style={{
            height: 48,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'stretch',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
          }}
        >
          {tabs.map(({ tab, icon: Icon, label }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                aria-label={label}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(214,198,168,0.1)' : 'transparent',
                  color: isActive ? 'rgba(214,198,168,0.9)' : 'rgba(214,198,168,0.32)',
                  padding: '0 2px',
                  position: 'relative',
                  transition: 'color 0.15s ease, background 0.15s ease',
                }}
              >
                <Icon size={16} color="currentColor" />
                <span style={{
                  fontSize: '0.56rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  maxWidth: '36px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {label.slice(0, 6)}
                </span>
                {isActive && (
                  <motion.div
                    layoutId={`wing-tab-accent-${side}`}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '10%',
                      right: '10%',
                      height: 2,
                      background: 'rgba(214,198,168,0.6)',
                      borderRadius: '2px 2px 0 0',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div
          ref={contentRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}
        >
          {children}
        </div>
      </div>

      {/* Handle (44px) */}
      <button
        onClick={onToggle}
        aria-label={open ? `Close ${side} panel` : `Open ${side} panel`}
        style={{
          width: HANDLE_W,
          height: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          pointerEvents: 'all',
          flexShrink: 0,
        }}
      >
        {/* Pill bar with sheen */}
        <div
          style={{
            width: 4,
            height: 60,
            background: 'rgba(214,198,168,0.12)',
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ y: ['0%', '100%', '0%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '40%',
              background: 'linear-gradient(to bottom, transparent, rgba(214,198,168,0.4), transparent)',
              borderRadius: 4,
            }}
          />
        </div>

        {/* Active tab icon */}
        {ActiveTabIcon && (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'rgba(214,198,168,0.07)',
              border: '1px solid rgba(214,198,168,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActiveTabIcon size={14} color="rgba(214,198,168,0.6)" />
          </div>
        )}

        {/* Chevron */}
        <ChevronIcon size={12} color="rgba(214,198,168,0.4)" />
      </button>
    </motion.div>
  );
}
