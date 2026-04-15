'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / SiteRenderer.tsx — Direct-DOM site preview
// Renders the celebration site directly in the editor DOM
// instead of in an iframe. Enables native drag-drop, direct
// click-to-edit, and real glass blur transparency.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Copy, Trash2, Eye, EyeOff, GripVertical, CalendarDays, Mail, Gift, Plane, HelpCircle, PenLine, Camera, Hand, Sparkles } from 'lucide-react';
import { Hero } from '@/components/hero';
// Timeline is kept only as a legacy fallback for the rare code path that
// doesn't have manifest.blocks. New renders go through StorySection, which
// dispatches to the canonical StoryLayouts components.
import { StorySection, chapterDateFormatOptions } from '@/components/blocks/StoryLayouts';
import { WeddingEvents } from '@/components/wedding-events';
import { VisualTimeline } from '@/components/visual-timeline';
import { RegistryShowcase } from '@/components/registry-showcase';
import { FaqSection } from '@/components/faq-section';
import { TravelSection } from '@/components/travel-section';
import { TravelGuide } from '@/components/travel-guide';
import { PublicRsvpSection } from '@/components/public-rsvp-section';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { WaveDivider } from '@/components/vibe/WaveDivider';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import { sanitizeSvg } from '@/lib/sanitize-svg';
import { getThemeArt } from '@/lib/theme-art';
import { getHeroIllustrationDataUrl } from '@/lib/hero-illustrations';
import { StickerLayer } from '@/components/site-stickers/StickerLayer';
import { ensureContrast, enforcePaletteContrast } from '@/lib/color-utils';
import { smartBlockOrder } from '@/lib/smart-features';
import { PearIcon } from '@/components/icons/PearloomIcons';
import { InlineArtHoverToolbar } from './InlineArtHoverToolbar';
import type { StoryManifest, SitePage, PageBlock, BlockType } from '@/types';

// ── "Let Pear help" button for empty states ──
const OLIVE = '#18181B';

function PearHelpButton({ label, prompt }: { label: string; prompt: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('pear-command', { detail: { prompt } }));
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        marginTop: '0.75rem',
        padding: '5px 12px',
        borderRadius: '8px',
        background: 'transparent',
        border: `1px solid #E4E4E7`,
        color: OLIVE,
        fontSize: '0.65rem',
        fontWeight: 600,
        fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
        cursor: 'pointer',
        outline: 'none',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        (e.target as HTMLElement).style.background = 'rgba(24,24,27,0.04)';
      }}
      onMouseLeave={e => {
        (e.target as HTMLElement).style.background = 'transparent';
      }}
    >
      <PearIcon size={12} color="#18181B" />
      {label}
    </button>
  );
}

// ── PearNudge — one-time floating nudge on first empty section scroll ──
function PearNudge({ prompt, onDismiss }: { prompt: string; onDismiss: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={(e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('pear-command', { detail: { prompt } }));
        setVisible(false);
        onDismiss();
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        borderRadius: '8px',
        background: '#FFFFFF',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid #E4E4E7',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        marginTop: '0.75rem',
        fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: 'var(--pl-ink-soft, #3D3530)',
        whiteSpace: 'nowrap',
      } as React.CSSProperties}
    >
      <PearIcon size={14} color="#18181B" />
      Pear can fill this in for you &rarr;
    </motion.div>
  );
}

// ── Generic prompt — let Pear figure out what to do based on context ──
function getPearPrompt(sectionType: string): string {
  return `Look at this empty ${sectionType} section on my site. Based on the occasion type, couple names, and any details you already know, fill it in with appropriate content. Ask me for any info you need.`;
}

function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return '';
  if (rawUrl.includes('googleusercontent.com') || rawUrl.includes('lh3.google')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

// ── Live Countdown Component ──
function LiveCountdown({ targetDate, accentColor, textColor, mutedColor, headingFont, bodyFont }: {
  targetDate: string; accentColor: string; textColor: string; mutedColor: string; headingFont: string; bodyFont: string;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(targetDate).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const isPast = target <= now;

  if (isPast) {
    return (
      <div style={{ padding: '1rem' }}>
        <div style={{ fontFamily: `"${headingFont}", serif`, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', color: accentColor }}>
          The Day Has Arrived!
        </div>
      </div>
    );
  }

  const units = [
    { value: days, label: 'Days' },
    { value: hours, label: 'Hours' },
    { value: minutes, label: 'Minutes' },
    { value: seconds, label: 'Seconds' },
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(0.5rem, 2vw, 1.5rem)', flexWrap: 'wrap' }}>
      {units.map((u) => (
        <div key={u.label} style={{
          minWidth: '70px', padding: '1rem 0.75rem', borderRadius: '10px',
          background: `${accentColor}0D`, border: `1px solid ${accentColor}20`,
        }}>
          <div style={{
            fontFamily: `"${headingFont}", serif`, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 700, color: textColor, lineHeight: 1.1,
          }}>
            {String(u.value).padStart(2, '0')}
          </div>
          <div style={{
            fontFamily: `"${bodyFont}", sans-serif`, fontSize: '0.65rem', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em', color: mutedColor, marginTop: '0.25rem',
          }}>
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Block type labels/colors ──
const BLOCK_LABELS: Record<string, { label: string; color: string }> = {
  hero:         { label: 'Hero',             color: '#71717A' },
  story:        { label: 'Our Story',        color: '#7c5cbf' },
  event:        { label: 'Events',           color: '#e8927a' },
  countdown:    { label: 'Countdown',        color: '#4a9b8a' },
  rsvp:         { label: 'RSVP',             color: '#e87ab8' },
  registry:     { label: 'Registry',         color: '#c4774a' },
  travel:       { label: 'Travel & Hotels',  color: '#4a7a9b' },
  faq:          { label: 'FAQ',              color: '#8b7a4a' },
  photos:       { label: 'Photo Gallery',    color: '#4a8b6a' },
  guestbook:    { label: 'Guestbook',        color: '#7a4a8b' },
  text:         { label: 'Text Block',       color: '#6a8b4a' },
  quote:        { label: 'Quote',            color: '#8b4a6a' },
  video:        { label: 'Video',            color: '#4a4a8b' },
  divider:      { label: 'Divider',          color: '#8b8b4a' },
  map:          { label: 'Map',              color: '#4a6a8b' },
  vibeQuote:    { label: 'Vibe Quote',       color: '#9b6a8b' },
  welcome:      { label: 'Welcome',          color: '#c47a7a' },
  spotify:      { label: 'Spotify Playlist', color: '#1DB954' },
  hashtag:      { label: 'Hashtag',          color: '#4a7a9b' },
  photoWall:    { label: 'Guest Photo Wall', color: '#7a6a4a' },
  gallery:      { label: 'Photo Collage',    color: '#4a8b6a' },
  quiz:         { label: 'Couple Quiz',      color: '#b88a4a' },
  weddingParty: { label: 'Wedding Party',    color: '#7c5cbf' },
  anniversary:  { label: 'Anniversary',      color: '#c4774a' },
  storymap:     { label: 'Story Map',        color: '#4a6a8b' },
  footer:       { label: 'Footer',           color: '#7a7a7a' },
};

// ── Context menu primitives ────────────────────────────────────
function ContextMenuItem({ label, icon, danger, onClick }: {
  label: string; icon?: string; danger?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        width: '100%', padding: '6px 10px', borderRadius: '8px',
        border: 'none', textAlign: 'left', background: 'transparent',
        cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
        color: danger ? '#c0392b' : '#18181B', fontFamily: 'inherit',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F4F4F5'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {icon && <span style={{ width: '14px', textAlign: 'center', fontSize: '0.65rem', color: danger ? '#c0392b' : '#71717A', flexShrink: 0 }}>{icon}</span>}
      {label}
    </button>
  );
}
function ContextMenuDivider() {
  return <div style={{ height: '1px', background: '#F4F4F5', margin: '3px 0' }} />;
}

// ── Section Overlay — memoized, does NOT re-render when parent state changes ──
const SectionOverlay = React.memo(function SectionOverlay({
  blockId, blockType, isSelected, index, total, editMode, children,
  onSectionClick, onBlockAction, onBlockReorder, onBlockCopy, onBlockPaste, hasClipboard,
}: {
  blockId: string; blockType: string; isSelected: boolean;
  index: number; total: number; editMode: boolean;
  children: React.ReactNode;
  onSectionClick?: (sectionId: string, chapterId?: string, blockId?: string, clickPos?: { x: number; y: number }) => void;
  onBlockAction?: (action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete' | 'toggleVisibility', blockId: string) => void;
  onBlockReorder?: (from: number, to: number) => void;
  onBlockCopy?: (blockId: string) => void;
  onBlockPaste?: (position: number) => void;
  hasClipboard?: boolean;
}) {
  const def = BLOCK_LABELS[blockType];
  const color = def?.color || '#71717A';
  const wrapRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef(0);
  // Track listeners so a rapid re-drag tears down the previous session cleanly
  const dragCleanupRef = useRef<(() => void) | null>(null);

  // Tear down any prior drag session on unmount (prevents stale listeners
  // when a block is removed mid-drag under rapid activity)
  useEffect(() => {
    return () => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
        dragCleanupRef.current = null;
      }
    };
  }, []);

  // Compute the closest drop index from the current pointer Y.
  // Re-derived every call so rapid drags always see the live DOM.
  const computeClosestDropIndex = useCallback((clientY: number) => {
    const dropZones = document.querySelectorAll('[data-drop-index]');
    let closestIdx = -1;
    let closestDist = Infinity;
    dropZones.forEach(zone => {
      const zRect = zone.getBoundingClientRect();
      const dist = Math.abs(clientY - (zRect.top + zRect.height / 2));
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = parseInt(zone.getAttribute('data-drop-index') || '-1');
      }
    });
    return closestIdx;
  }, []);

  // Pointer-based smooth drag
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (!editMode) return;
    // Only start drag from the grab handle area (first 40px)
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;

    e.preventDefault();
    e.stopPropagation();

    // If a prior drag session is somehow still active (rapid re-drag),
    // clean it up first so state is never silently double-bound.
    if (dragCleanupRef.current) {
      dragCleanupRef.current();
      dragCleanupRef.current = null;
    }

    setIsDragging(true);
    dragStartY.current = e.clientY;
    document.body.style.cursor = 'grabbing';

    // Create ghost
    const ghost = document.createElement('div');
    ghost.style.cssText = `
      position: fixed; z-index: 99999; pointer-events: none;
      padding: 10px 20px; border-radius: 14px;
      background: rgba(250,247,242,0.92);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1.5px solid ${color}40;
      box-shadow: 0 12px 40px rgba(0,0,0,0.08);
      font-size: 0.78rem; font-weight: 600; color: ${color};
      display: flex; align-items: center; gap: 8px;
      transform: rotate(1deg) scale(1.02);
      transition: top 50ms ease-out;
      left: ${e.clientX - 60}px; top: ${e.clientY - 20}px;
    `;
    ghost.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${color}"></span> ${def?.label || blockType}`;
    document.body.appendChild(ghost);
    dragGhostRef.current = ghost;

    // Dim the original
    if (wrapRef.current) {
      wrapRef.current.style.opacity = '0.3';
      wrapRef.current.style.transition = 'opacity 0.15s';
    }

    const onMove = (ev: PointerEvent) => {
      if (ghost) {
        ghost.style.top = `${ev.clientY - 20}px`;
        ghost.style.left = `${ev.clientX - 60}px`;
      }
      // Live drop indicator — re-derive from DOM every move
      const idx = computeClosestDropIndex(ev.clientY);
      setDropTargetIndex(idx >= 0 ? idx : null);
    };

    const cleanup = () => {
      ghost.remove();
      dragGhostRef.current = null;
      setIsDragging(false);
      setDropTargetIndex(null);
      document.body.style.cursor = '';
      if (wrapRef.current) {
        wrapRef.current.style.opacity = '1';
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      dragCleanupRef.current = null;
    };

    const onUp = (ev: PointerEvent) => {
      // Re-derive drop index at release time so rapid drags don't lose
      // the final position if state updates were coalesced.
      const closestIdx = computeClosestDropIndex(ev.clientY);
      if (closestIdx >= 0 && closestIdx !== index && onBlockReorder) {
        onBlockReorder(index, closestIdx);
      }
      cleanup();
    };

    const onCancel = () => cleanup();

    dragCleanupRef.current = cleanup;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }, [editMode, index, blockType, color, def, onBlockReorder, computeClosestDropIndex]);

  return (
    <div
      ref={wrapRef}
      data-block-id={blockId}
      className={isSelected ? 'pl-block-selected' : ''}
      tabIndex={editMode ? 0 : -1}
      role="button"
      aria-label={`Edit ${blockType} block`}
      onClick={(e) => {
        e.stopPropagation();
        onSectionClick?.(blockType, undefined, blockId, { x: e.clientX, y: e.clientY });
      }}
      onKeyDown={(e) => {
        if (!editMode) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        // Bail gracefully if the focus is inside an editable element within
        // the block — let that element handle its own keys.
        const target = e.target as HTMLElement | null;
        if (target && target !== e.currentTarget) {
          const tag = target.tagName;
          if (
            tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
            tag === 'BUTTON' || tag === 'A' ||
            target.isContentEditable
          ) {
            return;
          }
        }
        e.preventDefault();
        e.stopPropagation();
        onSectionClick?.(blockType, undefined, blockId);
      }}
      onContextMenu={(e) => {
        if (!editMode) return;
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
        setShowMenu(true);
      }}
      style={{
        position: 'relative',
        borderRadius: '4px',
        cursor: editMode ? 'default' : 'default',
        isolation: 'isolate', // Contain z-index within each block — prevents hero from overlapping nav
      }}
    >
      {/* Drop indicator — renders just above this block when it's the current
          drop target during a pointer-drag reorder (item 97). Inserted into
          the DOM between blocks via absolute positioning at the top edge. */}
      {isDragging && dropTargetIndex !== null && dropTargetIndex === index && (
        <div
          aria-hidden
          style={{
            position: 'absolute', left: 0, right: 0, top: -1,
            height: 2, background: '#4a9b8a', zIndex: 99,
            pointerEvents: 'none', borderRadius: 1,
          }}
        />
      )}
      {isDragging && dropTargetIndex !== null && dropTargetIndex === index + 1 && (
        <div
          aria-hidden
          style={{
            position: 'absolute', left: 0, right: 0, bottom: -1,
            height: 2, background: '#4a9b8a', zIndex: 99,
            pointerEvents: 'none', borderRadius: 1,
          }}
        />
      )}
      {/* Inline toolbar — selected only */}
      {editMode && isSelected && (
        <div style={{
          position: 'absolute', top: '-36px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, display: 'flex', alignItems: 'center', gap: '2px',
          padding: '4px 6px', borderRadius: '12px',
          background: 'rgba(250,247,242,0.92)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid #E4E4E7',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        } as React.CSSProperties}>
          {/* Drag handle — grab to reorder */}
          <div
            onPointerDown={handleDragStart}
            role="button"
            aria-label="Drag to reorder block"
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              // Ensure hit area is at least 24x24 (item 96)
              minWidth: 24, minHeight: 24,
              padding: '6px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'rgba(0,0,0,0.2)',
              touchAction: 'none',
            }}
            title="Drag to reorder"
          >
            <GripVertical size={12} />
          </div>
          <span style={{ fontSize: '0.55rem', fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 4px' }}>
            {def?.label || blockType}
          </span>
          <div style={{ width: '1px', height: '14px', background: '#FFFFFF' }} />
          {[
            ...(index > 0 ? [{ icon: '↑', action: 'moveUp' as const, handler: () => onBlockAction?.('moveUp', blockId) }] : []),
            ...(index < total - 1 ? [{ icon: '↓', action: 'moveDown' as const, handler: () => onBlockAction?.('moveDown', blockId) }] : []),
            { icon: '⎘', action: 'copy' as const, handler: () => onBlockCopy?.(blockId) },
            { icon: '⧉', action: 'duplicate' as const, handler: () => onBlockAction?.('duplicate', blockId) },
            { icon: '✕', action: 'delete' as const, handler: () => setConfirmDelete(true), danger: true },
          ].map(a => (
            <button key={a.action} onClick={(e) => { e.stopPropagation(); a.handler(); }}
              title={a.action.charAt(0).toUpperCase() + a.action.slice(1)}
              style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '6px', background: 'transparent', color: (a as { danger?: boolean }).danger ? '#d06060' : '#71717A', cursor: 'pointer', fontSize: '0.65rem' }}
            >{a.icon}</button>
          ))}
          {/* Delete confirmation inline */}
          {confirmDelete && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }} onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: '0.65rem', color: '#d06060', fontWeight: 600, whiteSpace: 'nowrap' }}>Delete?</span>
              <button onClick={(e) => { e.stopPropagation(); onBlockAction?.('delete', blockId); setConfirmDelete(false); }}
                style={{ padding: '2px 7px', borderRadius: '5px', border: 'none', background: '#d06060', color: '#fff', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700 }}>
                Yes
              </button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                style={{ padding: '2px 7px', borderRadius: '5px', border: 'none', background: '#F4F4F5', color: '#52525B', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 600 }}>
                No
              </button>
            </div>
          )}
        </div>
      )}

      {children}

      {/* Context menu */}
      {showMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowMenu(false)} />
          <div style={{
            position: 'fixed', top: menuPos.y, left: menuPos.x, zIndex: 9999,
            minWidth: '176px', padding: '4px',
            background: '#FFFFFF',
            borderRadius: '12px', border: '1px solid #E4E4E7',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04)',
          } as React.CSSProperties}>
            {/* Edit in sidebar — always first */}
            <ContextMenuItem
              label="Edit in sidebar"
              icon="↗"
              onClick={() => { onSectionClick?.(blockType, undefined, blockId); setShowMenu(false); }}
            />
            <ContextMenuDivider />
            {/* Move / rearrange */}
            {index > 0 && <ContextMenuItem label="Move up" icon="↑" onClick={() => { onBlockAction?.('moveUp', blockId); setShowMenu(false); }} />}
            {index < total - 1 && <ContextMenuItem label="Move down" icon="↓" onClick={() => { onBlockAction?.('moveDown', blockId); setShowMenu(false); }} />}
            <ContextMenuItem label="Duplicate" icon="⎘" onClick={() => { onBlockAction?.('duplicate', blockId); setShowMenu(false); }} />
            <ContextMenuItem label="Copy" icon="⊡" onClick={() => { onBlockCopy?.(blockId); setShowMenu(false); }} />
            {hasClipboard && <ContextMenuItem label="Paste below" icon="⊞" onClick={() => { onBlockPaste?.(index + 1); setShowMenu(false); }} />}
            {/* AI rewrite for story blocks */}
            {(blockType === 'story' || blockType === 'chapter') && (
              <>
                <ContextMenuDivider />
                <ContextMenuItem
                  label="AI rewrite"
                  icon="✦"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('pear-command', {
                      detail: { prompt: 'Rewrite the story chapters to better match the vibe and occasion. Keep names and dates. Use the update_chapter action for each.' }
                    }));
                    setShowMenu(false);
                  }}
                />
              </>
            )}
            <ContextMenuDivider />
            <ContextMenuItem label="Hide section" icon="○" onClick={() => { onBlockAction?.('toggleVisibility', blockId); setShowMenu(false); }} />
            <ContextMenuItem label="Delete" icon="✕" danger onClick={() => { setShowMenu(false); setConfirmDelete(true); onSectionClick?.(blockType, undefined, blockId); }} />
          </div>
        </>
      )}
    </div>
  );
});

// ── Global drag state for smooth canvas dragging ──
export interface CanvasDragState {
  active: boolean;
  sourceType: 'canvas' | 'panel';
  blockType: string;
  blockId?: string;
  fromIndex?: number;
  ghostLabel: string;
  ghostColor: string;
  pointerX: number;
  pointerY: number;
}

interface SiteRendererProps {
  manifest: StoryManifest;
  names: [string, string];
  /** Called when user clicks editable text — provides path and current value */
  onTextEdit?: (path: string, value: string) => void;
  /** Called when user clicks a section — provides section type */
  onSectionClick?: (sectionId: string, chapterId?: string, blockId?: string, clickPos?: { x: number; y: number }) => void;
  /** Called when a block is dropped at a position */
  onBlockDrop?: (blockType: string, position: number) => void;
  /** Called when blocks are reordered via canvas drag */
  onBlockReorder?: (fromIndex: number, toIndex: number) => void;
  /** Called when a block is copied */
  onBlockCopy?: (blockId: string) => void;
  /** Called when a block is pasted at position */
  onBlockPaste?: (position: number) => void;
  /** Is editor in edit mode? Enables click handlers and visual hints */
  editMode?: boolean;
  /** Currently selected block ID */
  selectedBlockId?: string | null;
  /** Called when a block action is triggered */
  onBlockAction?: (action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete' | 'toggleVisibility', blockId: string) => void;
  /** Clipboard has a copied block */
  hasClipboard?: boolean;
  /** External drag state (from panel) */
  externalDrag?: CanvasDragState | null;
}

export function SiteRenderer({ manifest, names, onTextEdit, onSectionClick, onBlockDrop, onBlockReorder, onBlockCopy, onBlockPaste, editMode = true, selectedBlockId, onBlockAction, hasClipboard, externalDrag }: SiteRendererProps) {
  // Guard against malformed `vibeSkin` values (e.g. legacy drafts or partial
  // skeletons) that are missing the `palette` field entirely. Without this
  // fallback, `enforcePaletteContrast` throws "Cannot read properties of
  // undefined (reading 'foreground')" and breaks the whole renderer.
  const vibeSkin = (manifest.vibeSkin && manifest.vibeSkin.palette)
    ? manifest.vibeSkin
    : deriveVibeSkin(manifest.vibeString || '');
  // Enforce contrast at render time — catches palettes saved before the update
  const pal = enforcePaletteContrast(vibeSkin.palette);

  // ── Theme art: hand-crafted SVG decorations per theme ──
  const art = useMemo(() => {
    const themeArt = getThemeArt(manifest.vibeSkin?.tone || '');
    const templateArt = getThemeArt(manifest.theme?.name || '');
    return { ...themeArt, ...templateArt };
  }, [manifest.vibeSkin?.tone, manifest.theme?.name]);
  const bgColor = pal.background;
  const cardBg = pal.card;

  const dynamicTheme = {
    name: 'pearloom-ai',
    fonts: { heading: vibeSkin.fonts.heading, body: vibeSkin.fonts.body },
    colors: {
      background: pal.background, foreground: pal.foreground,
      accent: pal.accent, accentLight: pal.accent2,
      muted: pal.muted, cardBg: pal.card,
    },
    borderRadius: '1rem',
  };

  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(vibeSkin.fonts.heading)}:ital,wght@0,400;0,600;0,700;1,400&family=${encodeURIComponent(vibeSkin.fonts.body)}:wght@300;400;500;600&display=swap`;

  const safeNames: [string, string] = [names[0] || 'Celebrating', names[1] || ''];
  const occasion = manifest.occasion || 'wedding';

  const proxiedCover = manifest.coverPhoto
    || vibeSkin.heroArtDataUrl
    || `/api/hero-art?${new URLSearchParams({ n1: safeNames[0], n2: safeNames[1], occasion, accent: pal.accent, bg: pal.background }).toString()}`;

  // If no cover photo, generate illustrated hero from theme
  const effectiveCover = proxiedCover || (manifest.theme?.name ? getHeroIllustrationDataUrl(manifest.theme.name, {
    background: pal.background,
    accent: pal.accent,
    accent2: pal.accent2,
    foreground: pal.foreground,
  }) : undefined);

  const sitePages: SitePage[] = useMemo(() => {
    const hidden = new Set(manifest.hiddenPages || []);
    return [
      { id: 'story', slug: 'our-story', label: 'Our Story', enabled: !hidden.has('story'), order: 0 },
      ...(manifest.events?.length && !hidden.has('schedule') ? [{ id: 'schedule', slug: 'schedule', label: 'Schedule', enabled: true, order: 1 }] : []),
      ...(manifest.events?.length && !hidden.has('rsvp') ? [{ id: 'rsvp', slug: 'rsvp', label: 'RSVP', enabled: true, order: 2 }] : []),
      ...((manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) && !hidden.has('registry') ? [{ id: 'registry', slug: 'registry', label: 'Registry', enabled: true, order: 3 }] : []),
      ...((manifest.travelInfo?.hotels?.length || manifest.travelInfo?.airports?.length) && !hidden.has('travel') ? [{ id: 'travel', slug: 'travel', label: 'Travel', enabled: true, order: 4 }] : []),
      ...(manifest.faqs?.length && !hidden.has('faq') ? [{ id: 'faq', slug: 'faq', label: 'FAQ', enabled: true, order: 5 }] : []),
      ...(manifest.features?.guestbook && !hidden.has('guestbook') ? [{ id: 'guestbook', slug: 'guest-wishes', label: 'Guest Wishes', enabled: true, order: 6 }] : []),
      ...(manifest.customPages?.filter(cp => !hidden.has(cp.id)).map((cp, i) => ({ id: cp.id, slug: cp.slug, label: cp.title, enabled: true, order: 100 + i })) || []),
    ];
  }, [manifest, vibeSkin]);

  const visibleBlocksRaw = manifest.blocks?.filter(b => b.visible !== false).sort((a, b) => a.order - b.order);
  // Smart section ordering: auto-reorder based on date context
  const visibleBlocks = useMemo(() => {
    if (!visibleBlocksRaw) return undefined;
    const weddingDate = manifest.logistics?.date || manifest.events?.[0]?.date;
    const rsvpDeadline = manifest.logistics?.rsvpDeadline;
    const { reordered } = smartBlockOrder(visibleBlocksRaw, weddingDate, rsvpDeadline);
    return reordered as PageBlock[];
  }, [visibleBlocksRaw, manifest.logistics?.date, manifest.logistics?.rsvpDeadline, manifest.events]);

  // ── Section click handler — direct DOM, no postMessage ──
  const handleSectionClick = useCallback((e: React.MouseEvent) => {
    if (!editMode || !onSectionClick) return;
    const target = e.target as HTMLElement;
    if (target.closest('[contenteditable="true"]')) return;

    // Check sub-elements FIRST (most specific to least specific)

    // Chapter image click → focal point drag overlay
    const imgEl = (target.tagName === 'IMG'
      ? target
      : target.closest('img')) as HTMLImageElement | null;
    if (imgEl && target.closest('[data-pe-chapter]')) {
      const chapterEl = target.closest('[data-pe-chapter]') as HTMLElement;
      const chapterId = chapterEl.getAttribute('data-pe-chapter') || '';
      const chapter = manifest.chapters?.find(c => c.id === chapterId);
      window.dispatchEvent(new CustomEvent('pearloom-focal-point-start', {
        detail: {
          chapterId,
          rect: imgEl.getBoundingClientRect(),
          x: chapter?.imagePosition?.x ?? 50,
          y: chapter?.imagePosition?.y ?? 50,
        }
      }));
      e.stopPropagation();
      return;
    }

    // Chapter click — inside timeline
    const chapter = target.closest('[data-pe-chapter]');
    if (chapter) {
      const chapterId = chapter.getAttribute('data-pe-chapter') || undefined;
      onSectionClick('chapter', chapterId);
      return;
    }

    // Event card click
    const eventCard = target.closest('[data-pe-event-id]');
    if (eventCard) {
      onSectionClick('events');
      return;
    }

    // FAQ item click
    const faqItem = target.closest('[data-pe-faq-id]');
    if (faqItem) {
      onSectionClick('faq');
      return;
    }

    // Hero date badge click
    if (target.closest('[data-pe-badge-date]')) {
      onSectionClick('countdown');
      return;
    }

    // Hero venue badge click
    if (target.closest('[data-pe-badge-venue]')) {
      onSectionClick('event');
      return;
    }

    // Registry link — prevent navigation in edit mode
    const registryLink = target.closest('a[href]');
    if (registryLink && target.closest('[data-pe-section="registry"]')) {
      e.preventDefault();
      onSectionClick('registry');
      return;
    }

    // Default: section-level click
    const section = target.closest('[data-pe-section]');
    if (section) {
      const sectionId = section.getAttribute('data-pe-section') || '';
      const chapterId2 = section.getAttribute('data-pe-chapter') || undefined;
      // Item 93: forward blockId so empty-state CTAs can select the owning
      // block (e.g. the empty gallery "+ Add photos" button).
      const blockId2 = section.getAttribute('data-block-id') || undefined;
      onSectionClick(sectionId, chapterId2, blockId2);
    }
  }, [editMode, onSectionClick]);

  // ── Inline text editing — direct DOM, no postMessage ──
  const handleTextBlur = useCallback((e: React.FocusEvent) => {
    if (!editMode || !onTextEdit) return;
    const el = e.target as HTMLElement;
    const path = el.getAttribute('data-pe-path');
    const chapterId = el.closest('[data-pe-chapter]')?.getAttribute('data-pe-chapter');
    const field = el.getAttribute('data-pe-field');
    const value = el.innerText.trim();

    if (path) {
      onTextEdit(path, value);
    } else if (chapterId && field) {
      onTextEdit(`chapter:${chapterId}:${field}`, value);
    }
  }, [editMode, onTextEdit]);

  // ── Double-click to edit text — NOT always contentEditable ──
  const siteRef = useRef<HTMLDivElement>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);

  useEffect(() => {
    if (!editMode || !siteRef.current) return;

    // Click-to-prime state: track elements waiting for second click
    const primedEls = new Set<HTMLElement>();
    const primedTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

    function activateEditable(htmlEl: HTMLElement) {
      htmlEl.contentEditable = 'true';
      htmlEl.spellcheck = false;
      htmlEl.style.outline = 'none';
      htmlEl.style.cursor = 'text';
      htmlEl.style.textDecoration = 'none';
      htmlEl.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.12)';
      htmlEl.style.borderRadius = '4px';
      htmlEl.style.background = 'rgba(255,255,255,0.08)';
      htmlEl.focus();
      const range = document.createRange();
      range.selectNodeContents(htmlEl);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    const setupEditableElements = () => {
      if (!siteRef.current) return;
      siteRef.current.querySelectorAll('[data-pe-editable="true"]').forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.dataset.peSetup) return;
        htmlEl.dataset.peSetup = '1';
        // Show text cursor on hover so users know the field is editable
        htmlEl.style.cursor = 'text';

        // Hover: clear underline hint that signals editability
        htmlEl.addEventListener('mouseenter', () => {
          if (htmlEl.contentEditable !== 'true') {
            htmlEl.style.textDecoration = 'underline';
            htmlEl.style.textDecorationColor = 'rgba(24,24,27,0.3)';
            htmlEl.style.textUnderlineOffset = '4px';
            htmlEl.style.textDecorationStyle = 'dotted';
          }
        });
        htmlEl.addEventListener('mouseleave', () => {
          if (htmlEl.contentEditable !== 'true') {
            htmlEl.style.textDecoration = 'none';
          }
        });

        // Single-click: prime on first click, activate on second click within 800ms
        htmlEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (htmlEl.contentEditable === 'true') return;
          if (primedEls.has(htmlEl)) {
            // Second click — activate immediately
            primedEls.delete(htmlEl);
            clearTimeout(primedTimers.get(htmlEl));
            primedTimers.delete(htmlEl);
            htmlEl.classList.remove('pe-edit-primed');
            activateEditable(htmlEl);
          } else {
            // First click — prime and wait for second
            primedEls.add(htmlEl);
            htmlEl.classList.add('pe-edit-primed');
            const timer = setTimeout(() => {
              primedEls.delete(htmlEl);
              primedTimers.delete(htmlEl);
              htmlEl.classList.remove('pe-edit-primed');
            }, 800);
            primedTimers.set(htmlEl, timer);
          }
        });

        // Blur: exit edit mode, commit, and hide format bar
        htmlEl.addEventListener('blur', () => {
          htmlEl.contentEditable = 'false';
          htmlEl.style.cursor = 'pointer';
          htmlEl.style.boxShadow = 'none';
          htmlEl.style.borderRadius = '';
          htmlEl.style.background = '';
          window.dispatchEvent(new CustomEvent('pearloom-field-blur'));

          const path = htmlEl.getAttribute('data-pe-path');
          const chapterId = htmlEl.closest('[data-pe-chapter]')?.getAttribute('data-pe-chapter');
          const field = htmlEl.getAttribute('data-pe-field');
          const sectionId = htmlEl.closest('[data-pe-section]')?.getAttribute('data-pe-section');
          const value = htmlEl.innerText.trim();

          if (path && onTextEdit) {
            onTextEdit(path, value);
          } else if (chapterId && field && onTextEdit) {
            onTextEdit(`chapter:${chapterId}:${field}`, value);
          } else if (sectionId === 'hero' && field && onTextEdit) {
            const pathMap: Record<string, string> = {
              heroTagline: 'poetry.heroTagline',
              subtitle: 'chapters.0.subtitle',
            };
            if (pathMap[field]) onTextEdit(pathMap[field], value);
          }
        });

        htmlEl.addEventListener('keydown', (e: KeyboardEvent) => {
          if (htmlEl.contentEditable !== 'true') return;
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); htmlEl.blur(); }
          if (e.key === 'Escape') htmlEl.blur();
        });

        // Focus: tell the sidebar which chapter / section is being edited
        // Also emit the element's rect so the inline format bar can position itself
        htmlEl.addEventListener('focus', () => {
          const chapterId = htmlEl.closest('[data-pe-chapter]')?.getAttribute('data-pe-chapter') ?? null;
          const field = htmlEl.getAttribute('data-pe-field') ?? null;
          const path = htmlEl.getAttribute('data-pe-path') ?? null;
          window.dispatchEvent(new CustomEvent('pearloom-field-focus', {
            detail: { chapterId, field, path, rect: htmlEl.getBoundingClientRect() }
          }));
        });
      });
    };

    setupEditableElements();
    let rafId: number;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(setupEditableElements);
    });
    observer.observe(siteRef.current, { childList: true, subtree: true });
    return () => { observer.disconnect(); cancelAnimationFrame(rafId); };
  }, [editMode, onTextEdit]);

  // ── Apply textFormats to [data-pe-path] elements ──────────────
  useEffect(() => {
    if (!siteRef.current) return;
    const formats = manifest.textFormats;
    if (!formats) return;
    const sizeMap: Record<string, string> = { sm: '0.85em', md: '1em', lg: '1.2em', xl: '1.5em' };
    Object.entries(formats).forEach(([path, fmt]) => {
      const el = siteRef.current?.querySelector(`[data-pe-path="${path}"]`) as HTMLElement | null;
      if (!el) return;
      el.style.fontStyle = fmt.italic ? 'italic' : '';
      el.style.fontWeight = fmt.bold ? '700' : '';
      el.style.fontSize = fmt.size ? sizeMap[fmt.size] : '';
      el.style.color = fmt.color || '';
    });
  });

  // ── Make icon elements clickable for swap ──
  useEffect(() => {
    if (!editMode || !siteRef.current) return;

    const ICON_OPTIONS = ['✦', '♡', '❋', '✿', '◆', '☆', '✧', '♢', '❀', '✻', '❖', '△', '◎', '⟡', '✶', '❁', '♤', '⚘', '✽', '⟐'];

    const handleIconClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-pe-icon]') as HTMLElement | null;
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = target.getBoundingClientRect();
      document.getElementById('pe-icon-picker')?.remove();

      const picker = document.createElement('div');
      picker.id = 'pe-icon-picker';
      picker.style.cssText = `
        position: fixed; z-index: 99999;
        top: ${Math.min(rect.bottom + 8, window.innerHeight - 260)}px;
        left: ${Math.max(8, Math.min(rect.left - 80, window.innerWidth - 240))}px;
        width: 220px; padding: 12px;
        background: rgba(250,247,242,0.95);
        backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border-radius: 16px; border: 1px solid rgba(255,255,255,0.5);
        box-shadow: 0 12px 40px rgba(0,0,0,0.08);
        display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;
      `;
      picker.innerHTML = ICON_OPTIONS.map(icon => `
        <button style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid rgba(255,255,255,0.3);background:${target.textContent?.trim() === icon ? 'rgba(24,24,27,0.08)' : 'transparent'};cursor:pointer;font-size:1.1rem;" data-icon="${icon}">${icon}</button>
      `).join('');

      picker.addEventListener('click', (ev) => {
        const btn = (ev.target as HTMLElement).closest('[data-icon]') as HTMLElement | null;
        if (!btn) return;
        const newIcon = btn.getAttribute('data-icon') || '✦';
        // Only update this specific element, not the global manifest
        target.textContent = newIcon;
        // Check if user wants to apply to all (via data attribute)
        const scope = target.getAttribute('data-pe-icon-scope');
        if (scope === 'global' && onTextEdit) {
          onTextEdit('vibeSkin.accentSymbol', newIcon);
        }
        picker.remove();
      });

      document.body.appendChild(picker);
      const close = (ev: MouseEvent) => {
        if (!picker.contains(ev.target as Node) && ev.target !== target) {
          picker.remove();
          document.removeEventListener('mousedown', close);
        }
      };
      setTimeout(() => document.addEventListener('mousedown', close), 50);
    };

    siteRef.current.addEventListener('click', handleIconClick);
    return () => siteRef.current?.removeEventListener('click', handleIconClick);
  }, [editMode, onTextEdit]);

  // ── Keyboard: Copy (Cmd+C) / Paste (Cmd+V) / Delete ──
  useEffect(() => {
    if (!editMode) return;
    const handler = (e: KeyboardEvent) => {
      // Don't capture when editing text
      if ((e.target as HTMLElement).contentEditable === 'true') return;

      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 'c' && selectedBlockId) {
        e.preventDefault();
        onBlockCopy?.(selectedBlockId);
      }
      if (meta && e.key === 'v' && hasClipboard) {
        e.preventDefault();
        const blocks = manifest.blocks || [];
        const idx = selectedBlockId ? blocks.findIndex(b => b.id === selectedBlockId) + 1 : blocks.length;
        onBlockPaste?.(idx);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId && !(e.target as HTMLElement).closest('[contenteditable]')) {
        e.preventDefault();
        onBlockAction?.('delete', selectedBlockId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editMode, selectedBlockId, hasClipboard, manifest, onBlockCopy, onBlockPaste, onBlockAction]);

  // ── Chapter hover → emit event so EditorCanvas can show toolbar ─────────
  useEffect(() => {
    if (!editMode || !siteRef.current) return;
    const el = siteRef.current;
    let currentChapterId: string | null = null;

    const onOver = (e: MouseEvent) => {
      const chapterEl = (e.target as HTMLElement).closest('[data-pe-chapter]') as HTMLElement | null;
      const id = chapterEl ? chapterEl.getAttribute('data-pe-chapter') : null;
      if (id === currentChapterId) return; // same chapter, no change
      currentChapterId = id;
      if (id && chapterEl) {
        const chapters = manifest.chapters || [];
        const chapterIndex = chapters.findIndex(c => c.id === id);
        window.dispatchEvent(new CustomEvent('pearloom-chapter-hover', {
          detail: {
            chapterId: id,
            rect: chapterEl.getBoundingClientRect(),
            chapterIndex,
            chapterCount: chapters.length,
          }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('pearloom-chapter-hover-end'));
      }
    };

    el.addEventListener('mouseover', onOver);
    return () => el.removeEventListener('mouseover', onOver);
  }, [editMode, manifest.chapters]);

  // ── Event card hover → emit event for toolbar ────────────────────────────
  useEffect(() => {
    if (!editMode || !siteRef.current) return;
    const el = siteRef.current;
    let currentEventId: string | null = null;

    const onOver = (e: MouseEvent) => {
      const cardEl = (e.target as HTMLElement).closest('[data-pe-event-id]') as HTMLElement | null;
      const id = cardEl ? cardEl.getAttribute('data-pe-event-id') : null;
      if (id === currentEventId) return;
      currentEventId = id;
      if (id && cardEl) {
        const index = parseInt(cardEl.getAttribute('data-pe-event-index') || '0');
        const count = manifest.events?.length ?? 0;
        window.dispatchEvent(new CustomEvent('pearloom-event-hover', {
          detail: { eventId: id, eventIndex: index, eventCount: count, rect: cardEl.getBoundingClientRect() }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('pearloom-event-hover-end'));
      }
    };

    el.addEventListener('mouseover', onOver);
    return () => el.removeEventListener('mouseover', onOver);
  }, [editMode, manifest.events]);

  // ── FAQ item hover → emit event for toolbar ───────────────────────────────
  useEffect(() => {
    if (!editMode || !siteRef.current) return;
    const el = siteRef.current;
    let currentFaqId: string | null = null;

    const onOver = (e: MouseEvent) => {
      const itemEl = (e.target as HTMLElement).closest('[data-pe-faq-id]') as HTMLElement | null;
      const id = itemEl ? itemEl.getAttribute('data-pe-faq-id') : null;
      if (id === currentFaqId) return;
      currentFaqId = id;
      if (id && itemEl) {
        const index = parseInt(itemEl.getAttribute('data-pe-faq-index') || '0');
        const count = manifest.faqs?.length ?? 0;
        window.dispatchEvent(new CustomEvent('pearloom-faq-hover', {
          detail: { faqId: id, faqIndex: index, faqCount: count, rect: itemEl.getBoundingClientRect() }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('pearloom-faq-hover-end'));
      }
    };

    el.addEventListener('mouseover', onOver);
    return () => el.removeEventListener('mouseover', onOver);
  }, [editMode, manifest.faqs]);

  // ── Footer hover → emit event for toolbar ────────────────────────────────
  useEffect(() => {
    if (!editMode || !siteRef.current) return;
    const el = siteRef.current;
    let insideFooter = false;
    const onOver = (e: MouseEvent) => {
      const footerEl = (e.target as HTMLElement).closest('[data-pe-section="footer"]') as HTMLElement | null;
      if (footerEl && !insideFooter) {
        insideFooter = true;
        window.dispatchEvent(new CustomEvent('pearloom-section-hover', {
          detail: { section: 'footer', label: 'Footer', rect: footerEl.getBoundingClientRect() }
        }));
      } else if (!footerEl && insideFooter) {
        insideFooter = false;
        window.dispatchEvent(new CustomEvent('pearloom-section-hover-end', { detail: { section: 'footer' } }));
      }
    };
    el.addEventListener('mouseover', onOver);
    return () => el.removeEventListener('mouseover', onOver);
  }, [editMode]);

  // ── Nav hover → emit event for toolbar ───────────────────────────────────
  useEffect(() => {
    if (!editMode || !siteRef.current) return;
    const el = siteRef.current;
    let insideNav = false;
    const onOver = (e: MouseEvent) => {
      const navEl = (e.target as HTMLElement).closest('[data-pe-section="nav"]') as HTMLElement | null;
      if (navEl && !insideNav) {
        insideNav = true;
        window.dispatchEvent(new CustomEvent('pearloom-section-hover', {
          detail: { section: 'nav', label: 'Navigation', rect: navEl.getBoundingClientRect() }
        }));
      } else if (!navEl && insideNav) {
        insideNav = false;
        window.dispatchEvent(new CustomEvent('pearloom-section-hover-end', { detail: { section: 'nav' } }));
      }
    };
    el.addEventListener('mouseover', onOver);
    return () => el.removeEventListener('mouseover', onOver);
  }, [editMode]);

  // ── Hero hover → emit event for inline style edit bar ─────────────────────
  useEffect(() => {
    if (!editMode || !siteRef.current) return;
    const el = siteRef.current;
    let insideHero = false;
    const onOver = (e: MouseEvent) => {
      const heroEl = (e.target as HTMLElement).closest('[data-pe-section="hero"]') as HTMLElement | null;
      if (heroEl && !insideHero) {
        insideHero = true;
        window.dispatchEvent(new CustomEvent('pearloom-hero-hover', {
          detail: { rect: heroEl.getBoundingClientRect() }
        }));
      } else if (!heroEl && insideHero) {
        insideHero = false;
        window.dispatchEvent(new CustomEvent('pearloom-hero-hover-end'));
      }
    };
    el.addEventListener('mouseover', onOver);
    return () => el.removeEventListener('mouseover', onOver);
  }, [editMode]);

  // ── Registry card hover → emit event for toolbar ─────────────────────────
  useEffect(() => {
    if (!editMode || !siteRef.current) return;
    const el = siteRef.current;
    let currentRegistryId: string | null = null;
    const onOver = (e: MouseEvent) => {
      const cardEl = (e.target as HTMLElement).closest('[data-pe-registry-id]') as HTMLElement | null;
      const id = cardEl ? cardEl.getAttribute('data-pe-registry-id') : null;
      if (id === currentRegistryId) return;
      currentRegistryId = id;
      if (id && cardEl) {
        const index = parseInt(cardEl.getAttribute('data-pe-registry-index') || '0');
        window.dispatchEvent(new CustomEvent('pearloom-registry-hover', {
          detail: { registryId: id, registryIndex: index, rect: cardEl.getBoundingClientRect() }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('pearloom-registry-hover-end'));
      }
    };
    el.addEventListener('mouseover', onOver);
    return () => el.removeEventListener('mouseover', onOver);
  }, [editMode]);

  // ── Chapter inline photo replace — forward event to onTextEdit ──────────
  useEffect(() => {
    if (!editMode) return;
    const handler = (e: Event) => {
      const { chapterId, imgIndex, newUrl, newAlt, append } = (e as CustomEvent).detail;
      onTextEdit?.('__replaceChapterPhoto__', JSON.stringify({ chapterId, imgIndex, newUrl, newAlt, append }));
    };
    window.addEventListener('pearloom-photo-replaced', handler);
    return () => window.removeEventListener('pearloom-photo-replaced', handler);
  }, [editMode, onTextEdit]);

  // ── Pear nudge: appears once per session on first empty section scroll ──
  const [pearNudgeSection, setPearNudgeSection] = useState<string | null>(null);
  const pearNudgeShownRef = useRef(false);

  useEffect(() => {
    if (!editMode || pearNudgeShownRef.current) return;
    // Check localStorage to see if we've shown the nudge this session
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('pear_nudge_shown')) {
        pearNudgeShownRef.current = true;
        return;
      }
    } catch { /* ignore */ }

    const siteEl = siteRef.current;
    if (!siteEl) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !pearNudgeShownRef.current) {
          const sectionType = (entry.target as HTMLElement).getAttribute('data-pe-empty-section');
          if (sectionType && getPearPrompt(sectionType)) {
            pearNudgeShownRef.current = true;
            setPearNudgeSection(sectionType);
            try { sessionStorage.setItem('pear_nudge_shown', '1'); } catch { /* ignore */ }
            observer.disconnect();
          }
        }
      }
    }, { threshold: 0.5 });

    // Observe after a short delay to let empty sections render
    const timer = setTimeout(() => {
      if (!siteEl) return;
      siteEl.querySelectorAll('[data-pe-empty-section]').forEach(el => observer.observe(el));
    }, 500);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [editMode, manifest]);

  const dismissPearNudge = useCallback(() => setPearNudgeSection(null), []);

  // ── Canvas section drag-to-reorder state ──
  const [draggingBlockIdx, setDraggingBlockIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // ── Hover state — use refs to avoid re-rendering entire site on hover ──
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);

  // SectionWrap is now the standalone SectionOverlay component above
  const renderSectionWrap = (block: PageBlock, index: number, total: number, children: React.ReactNode) => (
    <SectionOverlay
      key={block.id}
      blockId={block.id}
      blockType={block.type}
      isSelected={selectedBlockId === block.id}
      index={index}
      total={total}
      editMode={editMode}
      onSectionClick={onSectionClick}
      onBlockAction={onBlockAction}
      onBlockReorder={onBlockReorder}
      onBlockCopy={onBlockCopy}
      onBlockPaste={onBlockPaste}
      hasClipboard={hasClipboard}
    >
      {children}
    </SectionOverlay>
  );

  // Remove old SectionWrap — keeping this comment as marker
  // (old SectionWrap removed — now using SectionOverlay component above)
  // Dummy ref to prevent lint warnings about unused vars
  // old SectionWrap body removed
  // ── Block drop zone ──
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  // ── Render block by type — memoized to prevent re-render on hover ──
  const renderBlock = useCallback((block: PageBlock) => {
    const blockCfg = block.config || {};
    const key = block.id;

    // Per-block contrast-safe colors: if a block has a custom bgColor,
    // auto-adjust text colors so they remain readable
    const blockBg = (blockCfg.bgColor as string) || bgColor;
    const safeFg = ensureContrast(pal.foreground, blockBg, 4.5);
    const safeMuted = ensureContrast(pal.muted, blockBg, 3.0);
    const safeAccent = ensureContrast(pal.accent, blockBg, 3.0);

    // Apply per-block style overrides from config
    const blockStyle: React.CSSProperties = {};
    if (blockCfg.bgColor) blockStyle.background = blockCfg.bgColor as string;
    if (blockCfg.bgImage) {
      blockStyle.backgroundImage = `url(${blockCfg.bgImage as string})`;
      blockStyle.backgroundSize = (blockCfg.bgSize as string) || 'cover';
      blockStyle.backgroundPosition = 'center';
      blockStyle.backgroundRepeat = (blockCfg.bgSize as string) === 'repeat' ? 'repeat' : 'no-repeat';
    }
    if (blockCfg.verticalPadding) {
      blockStyle.paddingTop = blockCfg.verticalPadding as string;
      blockStyle.paddingBottom = blockCfg.verticalPadding as string;
    }
    // Section style presets
    if (blockCfg.backdropFilter) blockStyle.backdropFilter = blockCfg.backdropFilter as string;
    if (blockCfg.borderRadius) blockStyle.borderRadius = blockCfg.borderRadius as string;
    if (blockCfg.border) blockStyle.border = blockCfg.border as string;
    if (blockCfg.boxShadow) blockStyle.boxShadow = blockCfg.boxShadow as string;
    if (blockCfg.maxWidth) blockStyle.maxWidth = blockCfg.maxWidth as string;
    if (blockCfg.margin) blockStyle.margin = blockCfg.margin as string;
    if (blockCfg.overflow) blockStyle.overflow = blockCfg.overflow as string;
    if (blockCfg.color) blockStyle.color = blockCfg.color as string;

    switch (block.type) {
      case 'hero':
        return (
          <div key={key} data-pe-section="hero" data-pe-label="Hero" style={{ position: 'relative', overflow: 'hidden', ...blockStyle }}>
            {/* AI-generated hero blob illustration — couple-specific motifs */}
            {vibeSkin.heroBlobSvg && (
              <InlineArtHoverToolbar
                slot="heroBlobSvg"
                label="Hero overlay"
                editable={editMode}
                style={{
                  position: 'absolute',
                  right: '-6%',
                  top: '8%',
                  width: 'min(560px, 46%)',
                  height: 'auto',
                  zIndex: 2,
                  mixBlendMode: 'multiply' as React.CSSProperties['mixBlendMode'],
                }}
              >
                <motion.div
                  aria-hidden="true"
                  className="pear-svg-draw-in"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 0.78, scale: 1 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.heroBlobSvg) }}
                />
              </InlineArtHoverToolbar>
            )}
            <Hero
              names={names}
              subtitle={manifest.chapters?.[0]?.subtitle || `${manifest.chapters?.length || 0} chapters of your love story`}
              coverPhoto={effectiveCover}
              weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date}
              vibeSkin={vibeSkin}
              heroTagline={manifest.poetry?.heroTagline}
              heroBadgeStyle={manifest.heroBadgeStyle}
              heroCountdownStyle={manifest.heroCountdownStyle}
              heroTextColorOverride={manifest.heroTextColorOverride}
              photos={
                // Explicit slideshow photos take priority, then chapter first-photos
                ((manifest as any).heroSlideshow?.length > 0
                  ? (manifest as any).heroSlideshow.filter(Boolean).map((u: string) => proxyUrl(u, 1800, 1200))
                  : (manifest.chapters || []).flatMap(ch => (ch.images || []).slice(0, 1).map(img => proxyUrl(img.url, 1800, 1200))).filter(Boolean).slice(0, 6)
                )
              }
              editMode={editMode}
            />
            {/* AI-generated corner flourish (takes priority over theme cornerSvg) */}
            {vibeSkin.cornerFlourishSvg ? (
              <>
                <InlineArtHoverToolbar
                  slot="cornerFlourishSvg"
                  label="Corner flourish"
                  editable={editMode}
                  style={{ position: 'absolute', top: 0, left: 0, width: 'min(28vw, 260px)', height: 'min(28vw, 260px)', zIndex: 2 }}
                >
                  <motion.div
                    aria-hidden="true"
                    initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                    animate={{ opacity: 0.7, scale: 1, rotate: 0 }}
                    transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.cornerFlourishSvg) }}
                  />
                </InlineArtHoverToolbar>
                <InlineArtHoverToolbar
                  slot="cornerFlourishSvg"
                  label="Corner flourish"
                  editable={editMode}
                  style={{ position: 'absolute', top: 0, right: 0, width: 'min(28vw, 260px)', height: 'min(28vw, 260px)', zIndex: 2, transform: 'scaleX(-1)' }}
                >
                  <motion.div
                    aria-hidden="true"
                    initial={{ opacity: 0, scale: 0.85, rotate: 4 }}
                    animate={{ opacity: 0.7, scale: 1, rotate: 0 }}
                    transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                    style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.cornerFlourishSvg) }}
                  />
                </InlineArtHoverToolbar>
              </>
            ) : art.cornerSvg && (
              <>
                <div
                  aria-hidden="true"
                  style={{ position: 'absolute', top: 0, left: 0, width: 'min(25vw, 200px)', height: 'min(25vw, 200px)', pointerEvents: 'none', zIndex: 2, opacity: 0.55 }}
                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.cornerSvg) }}
                />
                <div
                  aria-hidden="true"
                  style={{ position: 'absolute', top: 0, right: 0, width: 'min(25vw, 200px)', height: 'min(25vw, 200px)', pointerEvents: 'none', zIndex: 2, transform: 'scaleX(-1)', opacity: 0.55 }}
                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.cornerSvg) }}
                />
              </>
            )}
            {/* Stickers rendered globally at the site root — not inside hero */}
          </div>
        );
      case 'story': {
        return (
          <section key={key} id="our-story" data-pe-section="story" style={{ position: 'relative', ...blockStyle }}>
            <StorySection
              chapters={manifest.chapters || []}
              storyLayout={manifest.storyLayout}
              layoutFormat={manifest.layoutFormat}
              chapterIcons={(vibeSkin.chapterIcons || []).map(svg => sanitizeSvg(svg))}
              sectionBorderSvg={vibeSkin.sectionBorderSvg ? sanitizeSvg(vibeSkin.sectionBorderSvg) : undefined}
              medallionSvg={vibeSkin.medallionSvg ? sanitizeSvg(vibeSkin.medallionSvg) : undefined}
              accentColor={pal.accent}
              dateFormat={chapterDateFormatOptions(manifest.dateFormat)}
              // Only the editor preview marks text as editable so public
              // renders stay read-only.
              editable={editMode}
              transformUrl={(url) =>
                url.includes('googleusercontent.com')
                  ? `/api/photos/proxy?url=${encodeURIComponent(url)}&w=1600&h=1200`
                  : url
              }
            />
          </section>
        );
      }
      case 'event':
        if (!manifest.events?.length) return editMode ? (
          <section key={key} data-pe-section="events" data-pe-empty-section="events" style={{ padding: '4rem 2rem', textAlign: 'center', ...blockStyle }}>
            <div className="pl-empty-gradient" style={{ padding: '3rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted }}>
              <div style={{ marginBottom: '0.75rem' }}><CalendarDays size={28} style={{ color: '#71717A' }} /></div>
              <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '1.2rem', color: safeFg, marginBottom: '0.5rem' }}>Events</div>
              <p style={{ fontSize: '0.8rem' }}>Add your ceremony, reception, and other events in the Events panel</p>
              <PearHelpButton label="Ask Pear to set up events" prompt={getPearPrompt('events')} />
              {pearNudgeSection === 'events' && <PearNudge prompt={getPearPrompt('events')} onDismiss={dismissPearNudge} />}
            </div>
          </section>
        ) : null;
        return (
          <section key={key} id="schedule" data-pe-section="events" style={{ position: 'relative', overflow: 'hidden', ...blockStyle }}>
            {art.cornerSvg && (
              <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', background: `linear-gradient(90deg, transparent, ${pal.accent}40, transparent)` }} />
            )}
            {vibeSkin.accentBlobSvg && (
              <InlineArtHoverToolbar
                slot="accentBlobSvg"
                label="Events backdrop"
                editable={editMode}
                style={{ position: 'absolute', left: '-8%', bottom: '5%', width: '55%', height: '90%', zIndex: 0, opacity: 0.16 }}
              >
                <div
                  aria-hidden="true"
                  style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.accentBlobSvg) }}
                />
              </InlineArtHoverToolbar>
            )}
            {art.blockArt?.eventFrame && (
              <div
                aria-hidden="true"
                style={{ position: 'absolute', inset: '-8px', width: 'calc(100% + 16px)', height: 'calc(100% + 16px)', pointerEvents: 'none', zIndex: 1, opacity: 0.4 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.blockArt.eventFrame) }}
              />
            )}
            {art.blockArt?.headingDecor && (
              <div
                aria-hidden="true"
                style={{ width: 160, height: 24, margin: '0 auto 0.5rem', pointerEvents: 'none', opacity: 0.5 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.blockArt.headingDecor) }}
              />
            )}
            <WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} />
            {manifest.events && manifest.events.length >= 2 && (
              <div style={{ padding: '0 2rem 4rem', position: 'relative', zIndex: 2 }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <span style={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase' as const,
                    color: pal.accent,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}>
                    Day-of Timeline
                  </span>
                </div>
                <VisualTimeline events={manifest.events} />
              </div>
            )}
          </section>
        );
      case 'rsvp':
        if (!manifest.events?.length) return editMode ? (
          <section key={key} data-pe-section="rsvp" data-pe-empty-section="rsvp" style={{ padding: '4rem 2rem', textAlign: 'center', ...blockStyle }}>
            <div className="pl-empty-gradient" style={{ padding: '3rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted }}>
              <div style={{ marginBottom: '0.75rem' }}><Mail size={28} style={{ color: '#71717A' }} /></div>
              <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '1.2rem', color: safeFg, marginBottom: '0.5rem' }}>RSVP</div>
              <p style={{ fontSize: '0.8rem' }}>Add events first — the RSVP form will appear here for your guests</p>
              <PearHelpButton label="Ask Pear to set up RSVP" prompt={getPearPrompt('RSVP')} />
              {pearNudgeSection === 'rsvp' && <PearNudge prompt={getPearPrompt('RSVP')} onDismiss={dismissPearNudge} />}
            </div>
          </section>
        ) : null;
        return (
          <section key={key} id="rsvp" data-pe-section="rsvp" style={{ position: 'relative', ...blockStyle }}>
            {art.cornerSvg && (
              <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', background: `linear-gradient(90deg, transparent, ${pal.accent}40, transparent)` }} />
            )}
            {art.blockArt?.headingDecor && (
              <div
                aria-hidden="true"
                style={{ width: 160, height: 24, margin: '0 auto 0.5rem', pointerEvents: 'none', opacity: 0.5 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.blockArt.headingDecor) }}
              />
            )}
            {art.blockArt?.rsvpDecor && (
              <div
                aria-hidden="true"
                style={{ width: 50, height: 50, margin: '0 auto 0.5rem', pointerEvents: 'none', opacity: 0.35 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.blockArt.rsvpDecor) }}
              />
            )}
            <PublicRsvpSection siteId="preview" events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} rsvpIntro={manifest.poetry?.rsvpIntro} editable={editMode} />
          </section>
        );
      case 'registry':
        if (!manifest.registry?.entries?.length && !manifest.registry?.cashFundUrl) return editMode ? (
          <section key={key} data-pe-section="registry" data-pe-empty-section="registry" style={{ padding: '4rem 2rem', textAlign: 'center', ...blockStyle }}>
            <div className="pl-empty-gradient" style={{ padding: '3rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted }}>
              <div style={{ marginBottom: '0.75rem' }}><Gift size={28} style={{ color: '#71717A' }} /></div>
              <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '1.2rem', color: safeFg, marginBottom: '0.5rem' }}>Registry</div>
              <p style={{ fontSize: '0.8rem' }}>Add registry links in Details → Registry</p>
              <PearHelpButton label="Ask Pear to help" prompt={getPearPrompt('registry')} />
              {pearNudgeSection === 'registry' && <PearNudge prompt={getPearPrompt('registry')} onDismiss={dismissPearNudge} />}
            </div>
          </section>
        ) : null;
        return <section key={key} id="registry" data-pe-section="registry" style={blockStyle}><RegistryShowcase registries={manifest.registry?.entries || []} cashFundUrl={manifest.registry?.cashFundUrl} cashFundMessage={manifest.registry?.cashFundMessage} title={vibeSkin.sectionLabels.registry} /></section>;
      case 'travel':
        if (!manifest.travelInfo) return editMode ? (
          <section key={key} data-pe-section="travel" data-pe-empty-section="travel" style={{ padding: '4rem 2rem', textAlign: 'center', ...blockStyle }}>
            <div className="pl-empty-gradient" style={{ padding: '3rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted }}>
              <div style={{ marginBottom: '0.75rem' }}><Plane size={28} style={{ color: '#71717A' }} /></div>
              <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '1.2rem', color: safeFg, marginBottom: '0.5rem' }}>Travel & Hotels</div>
              <p style={{ fontSize: '0.8rem' }}>Add hotel and travel info in Details → Travel</p>
              <PearHelpButton label="Ask Pear to help" prompt={getPearPrompt('travel')} />
              {pearNudgeSection === 'travel' && <PearNudge prompt={getPearPrompt('travel')} onDismiss={dismissPearNudge} />}
            </div>
          </section>
        ) : null;
        return (
          <section key={key} id="travel" data-pe-section="travel" style={blockStyle}>
            <TravelSection info={manifest.travelInfo} />
            {(manifest.logistics?.venueAddress || manifest.logistics?.venue) && (
              <TravelGuide
                venueAddress={manifest.logistics?.venueAddress}
                venueCity={manifest.logistics?.venue || manifest.logistics?.venueAddress || ''}
                eventDate={manifest.logistics?.date}
              />
            )}
          </section>
        );
      case 'faq':
        if (!manifest.faqs?.length) return editMode ? (
          <section key={key} data-pe-section="faq" data-pe-empty-section="faq" style={{ padding: '4rem 2rem', textAlign: 'center', ...blockStyle }}>
            <div className="pl-empty-gradient" style={{ padding: '3rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted }}>
              <div style={{ marginBottom: '0.75rem' }}><HelpCircle size={28} style={{ color: '#71717A' }} /></div>
              <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '1.2rem', color: safeFg, marginBottom: '0.5rem' }}>FAQ</div>
              <p style={{ fontSize: '0.8rem' }}>Add frequently asked questions in Details → FAQ</p>
              <PearHelpButton label="Ask Pear to help" prompt={getPearPrompt('FAQ')} />
              {pearNudgeSection === 'faq' && <PearNudge prompt={getPearPrompt('FAQ')} onDismiss={dismissPearNudge} />}
            </div>
          </section>
        ) : null;
        return (
          <section key={key} id="faq" data-pe-section="faq" style={{ position: 'relative', ...blockStyle }}>
            {art.cornerSvg && (
              <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', background: `linear-gradient(90deg, transparent, ${pal.accent}40, transparent)` }} />
            )}
            <FaqSection faqs={manifest.faqs} />
          </section>
        );
      case 'countdown': {
        const countdownDate = (blockCfg.date as string) || manifest.events?.[0]?.date || manifest.logistics?.date;
        return (
          <section key={key} data-pe-section="countdown" style={{ padding: '4rem 2rem', textAlign: 'center', background: cardBg, ...blockStyle }}>
            {art.blockArt?.headingDecor && (
              <div
                aria-hidden="true"
                style={{ width: 160, height: 24, margin: '0 auto 0.5rem', pointerEvents: 'none', opacity: 0.5 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.blockArt.headingDecor) }}
              />
            )}
            {art.blockArt?.countdownDecor && (
              <div
                aria-hidden="true"
                style={{ width: 50, height: 50, margin: '0 auto 0.5rem', pointerEvents: 'none', opacity: 0.35 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.blockArt.countdownDecor) }}
              />
            )}
            <h2 style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: safeFg, marginBottom: '1.5rem' }}>
              {(blockCfg.label as string) || 'Counting Down'}
            </h2>
            {countdownDate ? (
              <LiveCountdown targetDate={countdownDate} accentColor={safeAccent} textColor={safeFg} mutedColor={safeMuted} headingFont={vibeSkin.fonts.heading} bodyFont={vibeSkin.fonts.body} />
            ) : editMode ? (
              <div className="pl-empty-gradient" style={{ padding: '2rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted }}>
                <p style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>Set a wedding date in Details → Events to activate the countdown</p>
                <PearHelpButton label="Ask Pear to help" prompt={getPearPrompt('countdown date')} />
                {pearNudgeSection === 'countdown' && <PearNudge prompt={getPearPrompt('countdown date')} onDismiss={dismissPearNudge} />}
              </div>
            ) : (
              <p style={{ color: safeMuted, fontSize: '0.9rem' }}>Set a date in the countdown block settings</p>
            )}
          </section>
        );
      }
      case 'text': {
        const textContent = blockCfg.content as string | undefined;
        if (!textContent) return editMode ? (
          <section key={key} data-pe-section="text" data-pe-empty-section="text" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <div className="pl-empty-gradient" style={{ padding: '2.5rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted }}>
              <div style={{ marginBottom: '0.5rem' }}><PenLine size={22} style={{ color: '#71717A' }} /></div>
              <p style={{ fontSize: '0.8rem' }}>Click to add text content</p>
              <PearHelpButton label="Ask Pear to write this" prompt={getPearPrompt('text')} />
              {pearNudgeSection === 'text' && <PearNudge prompt={getPearPrompt('text')} onDismiss={dismissPearNudge} />}
            </div>
          </section>
        ) : null;
        return (
          <section key={key} data-pe-section="text" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
            <p
              data-pe-editable="true" data-pe-path={`blocks.${manifest.blocks?.findIndex(b => b.id === block.id) ?? 0}.config.content`}
              style={{ fontFamily: `"${vibeSkin.fonts.body}", sans-serif`, fontSize: '1.1rem', lineHeight: 1.8, color: safeFg, opacity: 0.8, textAlign: 'center' }}
            >
              {textContent}
            </p>
          </section>
        );
      }
      case 'quote':
        return (
          <section key={key} data-pe-section="quote" style={{ padding: '5rem 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            {/* Theme art: decorative accent above quote */}
            {art.accentSvg && (
              <div
                aria-hidden="true"
                style={{ width: 60, height: 60, margin: '0 auto 0.75rem', opacity: 0.3 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.accentSvg) }}
              />
            )}
            <div data-pe-icon="accentSymbol" data-pe-icon-scope="global" style={{ fontSize: '2rem', color: safeAccent, opacity: 0.4, marginBottom: '1rem', cursor: 'pointer' }}>{vibeSkin.accentSymbol || '✦'}</div>
            <p data-pe-editable="true" data-pe-path="poetry.dividerQuote" style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.3rem, 3vw, 2rem)', fontWeight: 400,  lineHeight: 1.65, color: safeFg, opacity: 0.75 }}>
              {vibeSkin.dividerQuote || manifest.vibeString || 'Love is composed of a single soul inhabiting two bodies.'}
            </p>
          </section>
        );
      case 'divider': {
        const divStyle = (blockCfg.style as string) || 'wave';
        const divHeight = (blockCfg.height as number) || 60;
        // Ensure the divider section is always tall enough to click on in the editor,
        // even when the visual variant renders very thin (e.g. a 1px line).
        const editMinHeight: React.CSSProperties = editMode ? { minHeight: 40 } : {};
        // Surface the clickable hit-area with a subtle inset outline + faint
        // wash on hover so users can see they can click a near-invisible
        // divider in edit mode. Rule lives in globals.css and only applies
        // when the class is present (edit mode only → no effect on
        // published output).
        const editHitClass = editMode ? 'pl-divider-edit-hit' : undefined;
        if (divStyle === 'line') {
          return (
            <section key={key} data-pe-section="divider" data-block-id={block.id} className={editHitClass} style={{ padding: `${Math.max(divHeight / 2, 20)}px 2rem`, ...editMinHeight, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1, height: '1px', background: pal.accent, opacity: 0.25 }} />
                <span style={{ color: pal.accent, opacity: 0.45, fontSize: '1rem', lineHeight: 1 }}>{vibeSkin.accentSymbol || '✦'}</span>
                <div style={{ flex: 1, height: '1px', background: pal.accent, opacity: 0.25 }} />
              </div>
            </section>
          );
        }
        if (divStyle === 'dots') {
          return (
            <section key={key} data-pe-section="divider" data-block-id={block.id} className={editHitClass} style={{ padding: `${Math.max(divHeight / 2, 20)}px 2rem`, textAlign: 'center', ...editMinHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>
                {[0.25, 0.5, 1, 0.5, 0.25].map((op, i) => (
                  <div key={i} style={{ width: i === 2 ? '7px' : '5px', height: i === 2 ? '7px' : '5px', borderRadius: '50%', background: pal.accent, opacity: op }} />
                ))}
              </div>
            </section>
          );
        }
        if (divStyle === 'botanical') {
          return (
            <section key={key} data-pe-section="divider" data-block-id={block.id} className={editHitClass} style={{ padding: `${Math.max(divHeight / 2, 16)}px 2rem`, textAlign: 'center', ...editMinHeight }}>
              {art.dividerPath ? (
                <svg viewBox="0 0 200 50" style={{ width: '100%', maxWidth: '420px', height: `${divHeight}px` }} preserveAspectRatio="none">
                  <path d={art.dividerPath} fill="none" stroke={pal.accent} strokeWidth="1.5" opacity="0.35" />
                </svg>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', color: pal.accent, opacity: 0.4, fontSize: '1.1rem', letterSpacing: '0.25em' }}>
                  🌿 {vibeSkin.accentSymbol || '✦'} 🌿
                </div>
              )}
            </section>
          );
        }
        // wave (default) — WaveDivider has a negative top-margin pulling it up,
        // so reserve guaranteed clickable height in edit mode.
        return (
          <section key={key} data-pe-section="divider" data-block-id={block.id} className={editHitClass} style={{ ...editMinHeight }}>
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={divHeight} />
          </section>
        );
      }
      case 'photos': {
        const seen = new Set<string>();
        const allPhotos: Array<{ url: string; alt?: string }> = [];
        if ((manifest as any).coverPhoto) {
          const u = (manifest as any).coverPhoto as string;
          if (!seen.has(u)) { seen.add(u); allPhotos.push({ url: u, alt: 'Cover photo' }); }
        }
        for (const u of ((manifest as any).heroSlideshow || []) as string[]) {
          if (u && !seen.has(u)) { seen.add(u); allPhotos.push({ url: u, alt: 'Hero slideshow' }); }
        }
        for (const ch of (manifest.chapters || [])) {
          for (const img of (ch.images || [])) {
            if (img.url && !seen.has(img.url)) { seen.add(img.url); allPhotos.push(img); }
          }
        }
        if (!allPhotos.length) return editMode ? (
          <section key={key} data-pe-section="photos" data-block-id={block.id} style={{ padding: '4rem 2rem', textAlign: 'center', ...blockStyle }}>
            <div className="pl-empty-gradient" style={{ padding: '3rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted }}>
              <div style={{ marginBottom: '0.75rem' }}><Camera size={28} style={{ color: '#71717A' }} /></div>
              <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '1.2rem', color: safeFg, marginBottom: '0.5rem' }}>Photo Gallery</div>
              <p style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Add photos to your story chapters — they&apos;ll appear here</p>
              {/* Item 93: empty-state CTA — click bubbles to the section handler
                  which selects the block and opens the block config popover so
                  the user can find the image manager from there. */}
              <button
                type="button"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.5rem 0.9rem', borderRadius: '999px',
                  background: pal.accent, color: '#fff',
                  border: 'none', fontSize: '0.75rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                + Add photos
              </button>
            </div>
          </section>
        ) : null;
        return (
          <section key={key} data-pe-section="photos" style={{ position: 'relative', padding: '4rem 2rem' }}>
            {art.cornerSvg && (
              <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', background: `linear-gradient(90deg, transparent, ${pal.accent}40, transparent)` }} />
            )}
            {art.blockArt?.headingDecor && (
              <div
                aria-hidden="true"
                style={{ width: 160, height: 24, margin: '0 auto 0.5rem', pointerEvents: 'none', opacity: 0.5 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.blockArt.headingDecor) }}
              />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', maxWidth: '960px', margin: '0 auto' }}>
              {allPhotos.map((photo, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: i === 0 ? '2/1' : '1', gridColumn: i === 0 ? 'span 2' : undefined, borderRadius: '10px', overflow: 'hidden' }}>
                  {art.blockArt?.photoFrame && (
                    <div
                      aria-hidden="true"
                      style={{ position: 'absolute', inset: '-4px', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', pointerEvents: 'none', zIndex: 1, opacity: 0.45 }}
                      dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.blockArt.photoFrame) }}
                    />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proxyUrl(photo.url, 800, 600)} alt={photo.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          </section>
        );
      }
      case 'video': {
        const videoUrl = blockCfg.url as string | undefined;
        const embedUrl = videoUrl?.includes('youtube') ? videoUrl.replace('watch?v=', 'embed/') : videoUrl?.includes('vimeo') ? videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/') : null;
        return (
          <section key={key} data-pe-section="video" style={{ padding: '3rem 2rem', maxWidth: '960px', margin: '0 auto' }}>
            {embedUrl ? (
              <div style={{ aspectRatio: '16/9', borderRadius: '1rem', overflow: 'hidden' }}>
                <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen title="Video" />
              </div>
            ) : (
              <div className="pl-empty-gradient" style={{ padding: '3rem', textAlign: 'center', borderRadius: '1rem', border: '2px dashed #E4E4E7', color: '#71717A' }}>
                <p data-pe-editable="true" data-pe-path={`block-config:${block.id}:url`} style={{ fontSize: '0.8rem' }}>
                  {videoUrl || 'Paste a YouTube or Vimeo URL'}
                </p>
              </div>
            )}
          </section>
        );
      }
      case 'map': {
        const mapAddress = (blockCfg.address as string | undefined) || manifest.events?.[0]?.address || manifest.logistics?.venueAddress;
        return (
          <section key={key} data-pe-section="map" style={{ padding: '3rem 2rem', maxWidth: '960px', margin: '0 auto' }}>
            {mapAddress ? (
              <div style={{ aspectRatio: '16/9', borderRadius: '1rem', overflow: 'hidden' }}>
                <iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed&z=15`} style={{ width: '100%', height: '100%', border: 'none' }} loading="lazy" title="Venue" />
              </div>
            ) : (
              <div className="pl-empty-gradient" style={{ padding: '3rem', textAlign: 'center', borderRadius: '1rem', border: '2px dashed #E4E4E7', color: '#71717A', fontSize: '0.8rem' }}>
                Add an event address to show the map
              </div>
            )}
          </section>
        );
      }
      case 'guestbook':
        return (
          <section key={key} data-pe-section="guestbook" style={{ position: 'relative', padding: '4rem 2rem', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            {art.cornerSvg && (
              <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', background: `linear-gradient(90deg, transparent, ${pal.accent}40, transparent)` }} />
            )}
            {art.blockArt?.guestbookDecor && (
              <div
                aria-hidden="true"
                style={{ width: 50, height: 50, margin: '0 auto 0.5rem', pointerEvents: 'none', opacity: 0.35 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.blockArt.guestbookDecor) }}
              />
            )}
            {art.blockArt?.headingDecor && (
              <div
                aria-hidden="true"
                style={{ width: 160, height: 24, margin: '0 auto 0.5rem', pointerEvents: 'none', opacity: 0.5 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.blockArt.headingDecor) }}
              />
            )}
            <h2 style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: safeFg, marginBottom: '1rem' }}>
              {(blockCfg.heading as string) || (blockCfg.title as string) || 'Leave Your Wishes'}
            </h2>
            <p style={{ color: safeMuted, fontSize: '0.9rem', marginBottom: '2rem' }}>{(blockCfg.prompt as string) || 'Share your love and well wishes'}</p>
            <div style={{ padding: '2rem', borderRadius: '1rem', background: `${pal.card}40`, border: `1px solid ${pal.accent}20` }}>
              <p style={{ color: safeMuted,  }}>Guestbook messages will appear here</p>
            </div>
          </section>
        );
      case 'spotify': {
        const spotifyUrl = blockCfg.url as string | undefined;
        const embedSrc = spotifyUrl?.replace('open.spotify.com/', 'open.spotify.com/embed/');
        return (
          <section key={key} data-pe-section="spotify" style={{ padding: '3rem 2rem', maxWidth: '700px', margin: '0 auto' }}>
            {embedSrc ? (
              <iframe src={embedSrc} style={{ width: '100%', height: '352px', borderRadius: '12px', border: 'none' }} allow="encrypted-media" title="Spotify Playlist" />
            ) : (
              <div className="pl-empty-gradient" style={{ padding: '3rem', textAlign: 'center', borderRadius: '1rem', border: '2px dashed #E4E4E7', color: '#71717A', fontSize: '0.8rem' }}>
                Add a Spotify playlist URL in the Music panel
              </div>
            )}
          </section>
        );
      }
      case 'hashtag':
        return (
          <section key={key} data-pe-section="hashtag" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div
              data-pe-editable="true"
              data-pe-path={`block-config:${block.id}:hashtag`}
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontWeight: 600, color: safeAccent }}
            >
              #{(blockCfg.hashtag as string) || `${names[0]}And${names[1]}`.replace(/\s/g, '')}
            </div>
            <p style={{ color: safeMuted, fontSize: '0.8rem', marginTop: '0.5rem' }}>Share your photos with our hashtag</p>
          </section>
        );
      case 'weddingParty':
        return (
          <section key={key} data-pe-section="weddingParty" data-pe-empty-section={!(manifest.weddingParty?.length) ? 'weddingParty' : undefined} style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: safeFg, textAlign: 'center', marginBottom: '2rem' }}>
              The Wedding Party
            </h2>
            {(manifest.weddingParty?.length || 0) > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
                {manifest.weddingParty!.map((m, i) => (
                  <div key={i}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 0.75rem', background: `${pal.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: pal.accent }}>
                      {m.name?.[0] || '?'}
                    </div>
                    <div style={{ fontWeight: 600, color: safeFg, fontSize: '0.8rem' }}>{m.name}</div>
                    <div style={{ color: safeMuted, fontSize: '0.75rem' }}>{m.role}</div>
                  </div>
                ))}
              </div>
            ) : editMode ? (
              <div className="pl-empty-gradient" style={{ padding: '2.5rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted, textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>Add wedding party members in the Story panel</p>
                <PearHelpButton label="Ask Pear to add wedding party" prompt={getPearPrompt('wedding party')} />
                {pearNudgeSection === 'weddingParty' && <PearNudge prompt={getPearPrompt('wedding party')} onDismiss={dismissPearNudge} />}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: safeMuted }}>Add wedding party members in the Story panel</p>
            )}
          </section>
        );
      case 'vibeQuote':
      case 'welcome': {
        const isWelcome = block.type === 'welcome';
        const statement = isWelcome ? manifest.poetry?.welcomeStatement : (vibeSkin.dividerQuote || manifest.vibeString);
        if (!statement) return editMode ? (
          <section key={key} data-pe-section={block.type} data-pe-empty-section={block.type} style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div className="pl-empty-gradient" style={{ padding: '2.5rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted }}>
              <div style={{ marginBottom: '0.5rem' }}>{isWelcome ? <Hand size={22} style={{ color: '#71717A' }} /> : <Sparkles size={22} style={{ color: '#71717A' }} />}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: pal.accent, marginBottom: '0.5rem', opacity: 0.8 }}>
                {isWelcome ? 'Welcome Block' : 'Mood Quote Block'}
              </div>
              <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '1rem', color: safeFg, marginBottom: '0.25rem' }}>
                {isWelcome ? 'Add a Welcome Message' : 'Add an Atmospheric Quote'}
              </div>
              <p style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                {isWelcome ? 'A personal note welcoming guests to your site' : 'A short quote or lyric that sets the mood'}
              </p>
              <PearHelpButton label={isWelcome ? 'Ask Pear to write a welcome' : 'Ask Pear to find a quote'} prompt={getPearPrompt(isWelcome ? 'welcome message' : 'atmospheric vibe quote')} />
              {pearNudgeSection === block.type && <PearNudge prompt={getPearPrompt(isWelcome ? 'welcome message' : 'atmospheric vibe quote')} onDismiss={dismissPearNudge} />}
            </div>
          </section>
        ) : null;
        return (
          <section key={key} data-pe-section={block.type} style={{ padding: '4rem 2rem', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            {/* Label badge — visible in edit mode to distinguish block types */}
            {editMode && (
              <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: pal.accent, opacity: 0.6, marginBottom: '1rem' }}>
                {isWelcome ? '— Welcome —' : '— Mood Quote —'}
              </div>
            )}
            {/* Theme art: decorative accent above vibeQuote (not welcome) */}
            {!isWelcome && art.accentSvg && (
              <div
                aria-hidden="true"
                style={{ width: 60, height: 60, margin: '0 auto 0.75rem', opacity: 0.3 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(art.accentSvg) }}
              />
            )}
            {isWelcome && (
              <div style={{ fontSize: '1.5rem', color: pal.accent, opacity: 0.35, marginBottom: '0.75rem' }}>♡</div>
            )}
            <p data-pe-editable="true" data-pe-path={isWelcome ? 'poetry.welcomeStatement' : 'poetry.dividerQuote'} style={{
              fontFamily: `"${isWelcome ? vibeSkin.fonts.body : vibeSkin.fonts.heading}", ${isWelcome ? 'sans-serif' : 'serif'}`,
              fontSize: isWelcome ? '1.05rem' : 'clamp(1.2rem, 2.5vw, 1.8rem)',
              fontWeight: 400, lineHeight: 1.7, color: safeFg, opacity: 0.75,
            }}>
              {statement}
            </p>
          </section>
        );
      }
      case 'quiz': {
        const quizQuestions = (blockCfg.questions as Array<{ question: string; options?: string[]; answer?: string }>) || [];
        const quizTitle = (blockCfg.quizTitle as string) || 'How Well Do You Know Us?';
        return (
          <section key={key} data-pe-section="quiz" style={{ padding: '4rem 2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h2 data-pe-editable="true" data-pe-path={`blocks.${manifest.blocks?.findIndex(b => b.id === block.id) ?? 0}.config.quizTitle`} style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: safeFg, marginBottom: '1rem' }}>
              {quizTitle}
            </h2>
            <p style={{ color: safeMuted, marginBottom: '2rem' }}>Take the couple quiz and see how you score!</p>
            {quizQuestions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                {quizQuestions.map((q, qi) => (
                  <div key={qi} style={{ padding: '1.25rem', borderRadius: '12px', background: `${pal.card}60`, border: `1px solid ${pal.accent}15` }}>
                    <div style={{ fontWeight: 600, color: safeFg, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                      {qi + 1}. {q.question}
                    </div>
                    {(q.options || []).map((opt, oi) => (
                      <div key={oi} style={{ padding: '0.5rem 0.75rem', marginBottom: '0.25rem', borderRadius: '8px', background: `${pal.accent}08`, fontSize: '0.8rem', color: safeFg, opacity: 0.8 }}>
                        {opt}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : editMode ? (
              <div className="pl-empty-gradient" style={{ padding: '2.5rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted }}>
                <p style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>Add quiz questions in the block settings</p>
                <PearHelpButton label="Ask Pear to write quiz questions" prompt={getPearPrompt('couple quiz')} />
                {pearNudgeSection === 'quiz' && <PearNudge prompt={getPearPrompt('couple quiz')} onDismiss={dismissPearNudge} />}
              </div>
            ) : (
              <div style={{ padding: '2rem', borderRadius: '1rem', background: `${pal.accent}10`, border: `1px solid ${pal.accent}20` }}>
                <p style={{ color: safeMuted }}>Quiz questions will appear here for your guests</p>
              </div>
            )}
          </section>
        );
      }
      case 'photoWall':
      case 'gallery': {
        const gwSeen = new Set<string>();
        const photos: Array<{ url: string; alt?: string }> = [];
        if ((manifest as any).coverPhoto) {
          const u = (manifest as any).coverPhoto as string;
          if (!gwSeen.has(u)) { gwSeen.add(u); photos.push({ url: u, alt: 'Cover photo' }); }
        }
        for (const u of ((manifest as any).heroSlideshow || []) as string[]) {
          if (u && !gwSeen.has(u)) { gwSeen.add(u); photos.push({ url: u, alt: 'Hero slideshow' }); }
        }
        for (const ch of (manifest.chapters || [])) {
          for (const img of (ch.images || [])) {
            if (img.url && !gwSeen.has(img.url)) { gwSeen.add(img.url); photos.push(img); }
          }
        }
        return (
          <section key={key} data-pe-section={block.type} style={{ padding: '4rem 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: safeFg }}>
                {block.type === 'photoWall' ? 'Guest Photo Wall' : 'Photo Collage'}
              </h2>
            </div>
            {photos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px', maxWidth: '1000px', margin: '0 auto' }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={proxyUrl(p.url, 400, 400)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: safeMuted }}>Photos from your chapters will appear here</p>
            )}
          </section>
        );
      }
      case 'footer': {
        const footerText = blockCfg.text as string | undefined;
        return (
          <section key={key} data-pe-section="footer" style={{ padding: '3rem 2rem', textAlign: 'center', borderTop: `1px solid ${pal.accent}15`, ...blockStyle }}>
            <p style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '0.8rem',  color: safeMuted, lineHeight: 1.6 }}>
              {footerText || manifest.poetry?.closingLine || 'Made with love'}
            </p>
            <p style={{ fontSize: '0.65rem', color: safeMuted, opacity: 0.6, marginTop: '0.5rem' }}>
              Pearloom
            </p>
          </section>
        );
      }
      case 'anniversary': {
        const annMilestones = (blockCfg.milestones as Array<{ label: string; date?: string; emoji?: string }>) || [];
        const hasAnnMilestones = annMilestones.length > 0;
        const weddingDateStr = manifest.events?.[0]?.date || manifest.logistics?.date;
        const defaultMilestones = hasAnnMilestones ? annMilestones : [
          { label: 'First Date', emoji: '✦', date: '' },
          { label: 'Engaged', emoji: '✦', date: '' },
          { label: weddingDateStr ? 'Wedding Day' : '1 Year', emoji: '✦', date: weddingDateStr || '' },
          { label: 'Today', emoji: '✦', date: new Date().toISOString().slice(0, 10) },
        ];
        return (
          <section key={key} data-pe-section="anniversary" data-pe-empty-section={!hasAnnMilestones ? 'anniversary' : undefined} style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ fontSize: '2rem', color: pal.accent, opacity: 0.4, marginBottom: '1rem' }}>{vibeSkin.accentSymbol || '✦'}</div>
            <h2 data-pe-editable="true" data-pe-path="poetry.anniversaryTitle" style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: safeFg, marginBottom: '1.5rem' }}>
              {(blockCfg.title as string) || 'Anniversary Milestones'}
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(0.75rem, 2vw, 2rem)', flexWrap: 'wrap' }}>
              {defaultMilestones.map((m, i) => (
                <div key={i} style={{ padding: '1.25rem 1rem', borderRadius: '10px', background: `${pal.accent}0D`, border: `1px solid ${pal.accent}20`, minWidth: '110px', maxWidth: '140px' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{m.emoji || '✦'}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: safeFg }}>{m.label}</div>
                  {m.date && <div style={{ fontSize: '0.7rem', color: safeMuted, marginTop: '0.25rem' }}>{m.date}</div>}
                </div>
              ))}
            </div>
            {!hasAnnMilestones && editMode && (
              <div style={{ marginTop: '1.5rem' }}>
                <PearHelpButton label="Ask Pear to add milestones" prompt={getPearPrompt('anniversary milestones')} />
                {pearNudgeSection === 'anniversary' && <PearNudge prompt={getPearPrompt('anniversary milestones')} onDismiss={dismissPearNudge} />}
              </div>
            )}
          </section>
        );
      }
      case 'storymap': {
        const hasLocations = (manifest.chapters || []).some(c => c.location?.label);
        return (
          <section key={key} data-pe-section="storymap" data-pe-empty-section={!hasLocations ? 'storymap' : undefined} style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h2 data-pe-editable="true" data-pe-path="poetry.storymapTitle" style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: safeFg, marginBottom: '1rem' }}>
              Our Journey
            </h2>
            <p style={{ color: safeMuted, marginBottom: '2rem' }}>The places that made our story</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {(manifest.chapters || []).slice(0, 4).filter(c => c.location?.label).map((ch, i) => (
                <div key={i} style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', background: `${pal.accent}10`, border: `1px solid ${pal.accent}20`, fontSize: '0.8rem', color: safeFg }}>
                  📍 {ch.location!.label}
                </div>
              ))}
              {!hasLocations && (
                editMode ? (
                  <div className="pl-empty-gradient" style={{ width: '100%', padding: '2rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: safeMuted }}>
                    <p style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>Add locations to your story chapters to see them here</p>
                    <PearHelpButton label="Ask Pear to add locations" prompt={getPearPrompt('story map locations')} />
                    {pearNudgeSection === 'storymap' && <PearNudge prompt={getPearPrompt('story map locations')} onDismiss={dismissPearNudge} />}
                  </div>
                ) : <p style={{ color: safeMuted }}>Add locations to your chapters to see them here</p>
              )}
            </div>
          </section>
        );
      }
      default:
        // Unknown block type — show placeholder instead of nothing
        return (
          <section key={key} data-pe-section={block.type} className="pl-empty-gradient" style={{ padding: '2rem', margin: '1rem auto', maxWidth: '700px', textAlign: 'center', borderRadius: '1rem', border: '2px dashed rgba(24,24,27,0.1)' }}>
            <p style={{ color: '#71717A', fontSize: '0.8rem' }}>
              {String(block.type).replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()} section
            </p>
          </section>
        );
    }
  }, [manifest, names, vibeSkin, pal, bgColor, cardBg, effectiveCover, editMode, handleTextBlur, onTextEdit, art]);

  // ── Drop zone between blocks ──
  // ── Add Section Line — visible between every block ──
  const [addMenuIdx, setAddMenuIdx] = useState<number | null>(null);

  const DropZone = ({ index }: { index: number }) => {
    const [hovered, setHoveredZone] = useState(false);
    const isDropTarget = dropTargetIdx === index;
    const showLine = hovered || isDropTarget;

    return (
      <div
        data-drop-index={index}
        onDragOver={e => {
          if (e.dataTransfer.types.includes('pearloom/block-type') || e.dataTransfer.types.includes('pearloom/reorder')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = e.dataTransfer.types.includes('pearloom/reorder') ? 'move' : 'copy';
            setDropTargetIdx(index);
          }
        }}
        onDragLeave={() => setDropTargetIdx(null)}
        onDrop={e => {
          e.preventDefault();
          const blockType = e.dataTransfer.getData('pearloom/block-type');
          const reorderFrom = e.dataTransfer.getData('pearloom/reorder');
          if (blockType && onBlockDrop) {
            onBlockDrop(blockType, index);
          } else if (reorderFrom && onBlockReorder) {
            onBlockReorder(parseInt(reorderFrom), index);
          }
          setDropTargetIdx(null);
        }}
        onMouseEnter={() => setHoveredZone(true)}
        onMouseLeave={() => setHoveredZone(false)}
        style={{
          position: 'relative',
          height: showLine ? '24px' : '8px',
          transition: 'height 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Line */}
        {showLine && (
          <div style={{
            position: 'absolute', left: '5%', right: '5%', top: '50%', transform: 'translateY(-50%)',
            height: isDropTarget ? '3px' : '1px',
            background: isDropTarget ? '#18181B' : '#E4E4E7',
            borderRadius: '2px',
            transition: 'all 0.15s',
            boxShadow: isDropTarget ? '0 0 12px #E4E4E7' : 'none',
          }} />
        )}

        {/* + button */}
        {editMode && hovered && !isDropTarget && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAddMenuIdx(addMenuIdx === index ? null : index);
            }}
            style={{
              position: 'relative', zIndex: 10,
              width: '28px', height: '28px', borderRadius: '50%',
              border: '1.5px solid #E4E4E7',
              background: '#FFFFFF',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              color: '#18181B',
              cursor: 'pointer', fontSize: '1rem', fontWeight: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.15s',
            } as React.CSSProperties}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#18181B';
              (e.currentTarget as HTMLElement).style.color = 'white';
              (e.currentTarget as HTMLElement).style.borderColor = '#18181B';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.85)';
              (e.currentTarget as HTMLElement).style.color = '#18181B';
              (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7';
            }}
          >
            +
          </button>
        )}

        {/* Quick add menu */}
        {addMenuIdx === index && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setAddMenuIdx(null)} />
            <div style={{
              position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
              zIndex: 99, padding: '8px', minWidth: '200px', maxHeight: '320px', overflowY: 'auto',
              background: 'rgba(250,247,242,0.95)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '8px', border: '1px solid #E4E4E7',
              boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
              display: 'flex', flexDirection: 'column', gap: '2px',
            } as React.CSSProperties}>
              <div style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#71717A', padding: '4px 8px' }}>
                Add Section
              </div>
              {Object.entries(BLOCK_LABELS).map(([type, def]) => (
                <button
                  key={type}
                  onClick={() => { onBlockDrop?.(type, index); setAddMenuIdx(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 10px', borderRadius: '8px', border: 'none',
                    background: 'transparent', cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.75rem', color: '#18181B',
                    transition: 'background 0.1s', width: '100%',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: def.color, flexShrink: 0 }} />
                  {def.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <ThemeProvider theme={{ ...dynamicTheme, ...manifest.theme, colors: { ...dynamicTheme.colors, ...(manifest.theme?.colors || {}) }, effects: manifest.theme?.effects }}>
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl} />

      {/* Inline-edit visual states + section tooltips */}
      {editMode && (
        <style>{`
          /* Chapter photo replace button — fade in on chapter hover */
          .pe-chapter-wrap .pe-photo-replace-btn {
            opacity: 0;
            transform: translateY(-4px);
            transition: opacity 0.18s ease, transform 0.18s ease;
          }
          .pe-chapter-wrap:hover .pe-photo-replace-btn {
            opacity: 1;
            transform: translateY(0);
          }

          /* Hover hint: dotted underline on editable fields */
          [data-pe-editable="true"]:not([contenteditable="true"]):not(.pe-edit-primed):hover {
            text-decoration: underline;
            text-decoration-style: dotted;
            text-decoration-color: rgba(163,177,138,0.6);
            text-underline-offset: 3px;
            cursor: text;
          }

          [data-pe-editable="true"].pe-edit-primed {
            outline: 2px solid rgba(24,24,27,0.22) !important;
            outline-offset: 3px !important;
            border-radius: 4px !important;
            background: rgba(24,24,27,0.04) !important;
            transition: outline 0.1s ease, background 0.1s ease;
          }

          /* Section label badge — shown on hover of any data-pe-section */
          [data-pe-section] {
            position: relative;
          }
          [data-pe-section]::before {
            content: attr(data-pe-label);
            position: absolute;
            top: 8px;
            left: 8px;
            z-index: 50;
            padding: 2px 7px;
            border-radius: 5px;
            background: rgba(24,24,27,0.75);
            color: #fff;
            font-size: 0.6rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            white-space: nowrap;
            font-family: system-ui, sans-serif;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s ease;
          }
          [data-pe-section]:hover::before {
            opacity: 1;
          }

          /* Panel field highlight pulse */
          @keyframes pe-field-pulse {
            0%   { box-shadow: 0 0 0 0 rgba(101,163,13,0.35); }
            60%  { box-shadow: 0 0 0 6px rgba(101,163,13,0); }
            100% { box-shadow: none; }
          }
          .pe-panel-field-highlight {
            animation: pe-field-pulse 1.5s ease-out forwards;
            border-radius: 6px;
          }
        `}</style>
      )}

      {/* CSS scoping — site content lives inside .pl-site-scope */}
      <div
        ref={siteRef}
        className={`pl-site-scope${manifest.navStyle === 'sidebar' ? ' lg:ml-60' : ''}`}
        onClick={handleSectionClick}
        style={{ position: 'relative', minHeight: '100%' }}
      >
        {/* Main content */}
        <main style={{
          minHeight: '100dvh', paddingBottom: '5rem',
          background: bgColor, position: 'relative', isolation: 'isolate',
        }}>
          {/* Site navigation — inside main so z-index works within same stacking context */}
          <div
            className="pl-site-nav-editor"
            onClick={(e) => {
              // Don't open nav settings when clicking buttons/links inside the nav (e.g. hamburger)
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('a') || target.tagName === 'BUTTON' || target.tagName === 'A') return;
              e.stopPropagation();
              onSectionClick?.('nav');
            }}
            style={{ position: 'relative', zIndex: 50, cursor: editMode ? 'pointer' : 'default' }}
          >
            <SiteNav
              names={safeNames}
              pages={sitePages}
              logoIcon={manifest.logoIcon}
              logoSvg={manifest.logoSvg}
              navStyle={manifest.navStyle}
              mobileNavStyle={manifest.mobileNavStyle}
              navOpacity={manifest.navOpacity}
              navBackground={manifest.navBackground}
              pageLabels={manifest.pageLabels}
              inline={editMode}
              pageHrefOverride={(slug) => {
                // In editor: scroll to section instead of navigating
                const sectionId = slug === '' || slug === 'our-story' ? 'our-story' : slug;
                return `#${sectionId}`;
              }}
            />
          </div>
          {/* Ambient art overlay */}
          {vibeSkin.ambientArtDataUrl ? (
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vibeSkin.ambientArtDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28, mixBlendMode: 'multiply' }} />
            </div>
          ) : (vibeSkin.heroPatternSvg || art.heroPatternSvg) ? (
            <div aria-hidden="true" style={{
              position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
              backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(vibeSkin.heroPatternSvg || art.heroPatternSvg!)}")`,
              backgroundRepeat: 'repeat', backgroundSize: '220px 220px', opacity: 0.22,
            }} />
          ) : null}

          {/* Block sequence with drop zones */}
          {visibleBlocks ? (
            <>
              <DropZone index={0} />
              {visibleBlocks.map((block, i) => {
                const prevType = i > 0 ? visibleBlocks[i - 1].type : null;
                // Add wave divider between major section transitions
                const needsDivider = prevType === 'hero' || (prevType === 'story' && block.type !== 'divider') || (prevType === 'event' && block.type !== 'divider');
                return (
                  <React.Fragment key={block.id}>
                    {needsDivider && (
                      <>
                        {vibeSkin.sectionBorderSvg ? (
                          <div
                            aria-hidden="true"
                            style={{
                              width: 'min(640px, 70%)',
                              height: 36,
                              margin: '1.5rem auto 0.5rem',
                              pointerEvents: 'none',
                              opacity: 0.55,
                              color: pal.accent,
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.sectionBorderSvg) }}
                          />
                        ) : art.dividerPath ? (
                          <svg viewBox="0 0 200 50" style={{ width: '100%', height: '40px' }} preserveAspectRatio="none">
                            <path d={art.dividerPath} fill="none" stroke={pal.accent} strokeWidth="1" opacity="0.2" />
                          </svg>
                        ) : null}
                        <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={60} />
                      </>
                    )}
                    {renderSectionWrap(block, i, visibleBlocks.length, renderBlock(block))}
                    <DropZone index={i + 1} />
                  </React.Fragment>
                );
              })}
            </>
          ) : (
            <>
              <Hero names={names} subtitle={manifest.chapters?.[0]?.subtitle || 'A love story beautifully told.'} coverPhoto={effectiveCover} weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date} vibeSkin={vibeSkin} heroTagline={manifest.poetry?.heroTagline} photos={((manifest as any).heroSlideshow?.length > 0 ? (manifest as any).heroSlideshow.filter(Boolean) : (manifest.chapters || []).flatMap(ch => (ch.images || []).slice(0, 1).map(img => img.url)).filter(Boolean).slice(0, 6))} editMode={editMode} />
              <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />
              <section id="our-story" style={{ position: 'relative' }}>
                <StorySection
                  chapters={manifest.chapters || []}
                  storyLayout={manifest.storyLayout}
                  layoutFormat={manifest.layoutFormat}
                  chapterIcons={(vibeSkin.chapterIcons || []).map(svg => sanitizeSvg(svg))}
                  sectionBorderSvg={vibeSkin.sectionBorderSvg ? sanitizeSvg(vibeSkin.sectionBorderSvg) : undefined}
                  medallionSvg={vibeSkin.medallionSvg ? sanitizeSvg(vibeSkin.medallionSvg) : undefined}
                  accentColor={pal.accent}
                  dateFormat={chapterDateFormatOptions(manifest.dateFormat)}
                  editable={editMode}
                  transformUrl={(url) =>
                    url.includes('googleusercontent.com')
                      ? `/api/photos/proxy?url=${encodeURIComponent(url)}&w=1600&h=1200`
                      : url
                  }
                />
              </section>
              {manifest.events?.length ? <section id="schedule"><WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} /></section> : null}
              {manifest.events?.length ? <section id="rsvp"><PublicRsvpSection siteId="preview" events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} rsvpIntro={manifest.poetry?.rsvpIntro} editable={editMode} /></section> : null}
              {(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) ? <section id="registry"><RegistryShowcase registries={manifest.registry?.entries || []} cashFundUrl={manifest.registry?.cashFundUrl} cashFundMessage={manifest.registry?.cashFundMessage} title={vibeSkin.sectionLabels.registry} /></section> : null}
              {manifest.travelInfo ? <section id="travel"><TravelSection info={manifest.travelInfo} /></section> : null}
              {manifest.faqs?.length ? <section id="faq"><FaqSection faqs={manifest.faqs} /></section> : null}
            </>
          )}

          {/* Custom pages — user-created pages rendered as anchor sections */}
          {manifest.customPages?.map(cp => (
            <section key={cp.id} id={cp.id} data-pe-section={cp.id} style={{ position: 'relative' }}>
              {cp.blocks?.length ? (
                cp.blocks.filter(b => b.visible !== false).sort((a, b) => a.order - b.order).map(b => renderBlock(b))
              ) : editMode ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
                  <div className="pl-empty-gradient" style={{ padding: '2.5rem', borderRadius: '1rem', border: `2px dashed ${pal.accent}30`, color: pal.muted || '#71717A' }}>
                    <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '1.2rem', color: pal.foreground || pal.ink || '#18181B', marginBottom: '0.5rem' }}>{cp.icon} {cp.title}</div>
                    <p style={{ fontSize: '0.8rem' }}>This custom page is empty. Add blocks from the Story panel.</p>
                  </div>
                </div>
              ) : null}
            </section>
          ))}
        </main>

        {/* Footer */}
        <footer
          data-pe-section="footer"
          data-pe-label="Footer"
          onClick={(e) => { e.stopPropagation(); onSectionClick?.('footer'); }}
          style={{
            cursor: editMode ? 'pointer' : 'default',
            padding: '3rem 2rem', textAlign: 'center',
            background: pal.foreground, color: `${pal.background}cc`,
            fontSize: '0.75rem', letterSpacing: '0.05em', position: 'relative',
          }}
        >
          <div style={{ marginBottom: '0.5rem', fontSize: '1rem', opacity: 0.6 }}>{vibeSkin.accentSymbol || '♡'}</div>
          <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <span
              data-pe-editable={editMode ? 'true' : undefined}
              data-pe-path="coupleNames.0"
            >{safeNames[0]}</span>
            {safeNames[1] ? (
              <><span style={{ opacity: 0.5 }}> & </span><span
                data-pe-editable={editMode ? 'true' : undefined}
                data-pe-path="coupleNames.1"
              >{safeNames[1]}</span></>
            ) : null}
          </div>
          {manifest.poetry?.closingLine && (
            <div
              data-pe-editable={editMode ? 'true' : undefined}
              data-pe-path="poetry.closingLine"
              style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '0.75rem', opacity: 0.45, maxWidth: '400px', margin: '0 auto 0.75rem' }}
            >
              {manifest.poetry.closingLine}
            </div>
          )}
          <div style={{ opacity: 0.35, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '1rem' }}>Made with Pearloom</div>
        </footer>

        {/* Global sticker layer — pointerEvents ONLY on individual stickers */}
        {(manifest.stickers?.length ?? 0) > 0 && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15, overflow: 'hidden' }}>
            {manifest.stickers!.map((s, i) => {
              const module = s.type === 'illustrations'
                ? require('@/components/asset-library/SvgIllustrations')
                : s.type === 'accents'
                  ? require('@/components/asset-library/SvgAccents')
                  : require('@/components/asset-library/SvgDividers');
              const Comp = module[s.name] as React.ComponentType<{ size?: number; color?: string }> | undefined;
              if (!Comp) return null;
              return (
                <div
                  key={s.id}
                  data-sticker={s.id}
                  style={{
                    position: 'absolute',
                    left: `${s.x}%`, top: `${s.y}%`,
                    transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                    opacity: s.opacity,
                    cursor: editMode ? 'grab' : 'default',
                    pointerEvents: editMode ? 'auto' : 'none',
                  }}
                  onPointerDown={editMode ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const startX = e.clientX, startY = e.clientY;
                    const startSX = s.x, startSY = s.y;
                    const container = e.currentTarget.parentElement!;
                    const rect = container.getBoundingClientRect();
                    const el = e.currentTarget as HTMLElement;
                    el.style.cursor = 'grabbing';
                    el.style.zIndex = '100';

                    const onMove = (ev: PointerEvent) => {
                      const dx = ((ev.clientX - startX) / rect.width) * 100;
                      const dy = ((ev.clientY - startY) / rect.height) * 100;
                      el.style.left = `${startSX + dx}%`;
                      el.style.top = `${startSY + dy}%`;
                    };
                    const onUp = (ev: PointerEvent) => {
                      const dx = ((ev.clientX - startX) / rect.width) * 100;
                      const dy = ((ev.clientY - startY) / rect.height) * 100;
                      el.style.cursor = 'grab';
                      el.style.zIndex = '';
                      const newX = Math.max(0, Math.min(100, startSX + dx));
                      const newY = Math.max(0, Math.min(100, startSY + dy));
                      onTextEdit?.(`__moveSticker__`, JSON.stringify({ index: i, x: newX, y: newY }));
                      window.removeEventListener('pointermove', onMove);
                      window.removeEventListener('pointerup', onUp);
                    };
                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                  } : undefined}
                >
                  <Comp size={s.size} color={pal.accent} />
                  {/* X button to remove sticker */}
                  {editMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onTextEdit?.(`__removeSticker__`, String(i));
                      }}
                      style={{
                        position: 'absolute', top: '-8px', right: '-8px',
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: 'rgba(220,60,60,0.9)', color: 'white',
                        border: 'none', cursor: 'pointer',
                        fontSize: '0.6rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        opacity: 0,
                        transition: 'opacity 0.15s',
                        pointerEvents: 'auto',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Context menu is now inside SectionOverlay */}
      </div>
    </ThemeProvider>
  );
}
