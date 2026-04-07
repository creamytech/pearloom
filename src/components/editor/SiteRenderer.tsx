'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / SiteRenderer.tsx — Direct-DOM site preview
// Renders the celebration site directly in the editor DOM
// instead of in an iframe. Enables native drag-drop, direct
// click-to-edit, and real glass blur transparency.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Copy, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Hero } from '@/components/hero';
import { Timeline } from '@/components/timeline';
import { WeddingEvents } from '@/components/wedding-events';
import { RegistryShowcase } from '@/components/registry-showcase';
import { FaqSection } from '@/components/faq-section';
import { TravelSection } from '@/components/travel-section';
import { PublicRsvpSection } from '@/components/public-rsvp-section';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { WaveDivider } from '@/components/vibe/WaveDivider';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import { sanitizeSvg } from '@/lib/sanitize-svg';
import { StickerLayer } from '@/components/site-stickers/StickerLayer';
import type { StoryManifest, SitePage, PageBlock, BlockType } from '@/types';

function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return '';
  if (rawUrl.includes('googleusercontent.com')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

// ── Block type labels/colors ──
const BLOCK_LABELS: Record<string, { label: string; color: string }> = {
  hero: { label: 'Hero', color: '#A3B18A' },
  story: { label: 'Story', color: '#7c5cbf' },
  event: { label: 'Events', color: '#e8927a' },
  countdown: { label: 'Countdown', color: '#4a9b8a' },
  rsvp: { label: 'RSVP', color: '#e87ab8' },
  registry: { label: 'Registry', color: '#c4774a' },
  travel: { label: 'Travel', color: '#4a7a9b' },
  faq: { label: 'FAQ', color: '#8b7a4a' },
  photos: { label: 'Photos', color: '#4a8b6a' },
  guestbook: { label: 'Guestbook', color: '#7a4a8b' },
  text: { label: 'Text', color: '#6a8b4a' },
  quote: { label: 'Quote', color: '#8b4a6a' },
  video: { label: 'Video', color: '#4a4a8b' },
  divider: { label: 'Divider', color: '#8b8b4a' },
  map: { label: 'Map', color: '#4a6a8b' },
};

// ── Section Overlay — memoized, does NOT re-render when parent state changes ──
const SectionOverlay = React.memo(function SectionOverlay({
  blockId, blockType, isSelected, index, total, editMode, children,
  onSectionClick, onBlockAction, onBlockReorder, onBlockCopy, onBlockPaste, hasClipboard,
}: {
  blockId: string; blockType: string; isSelected: boolean;
  index: number; total: number; editMode: boolean;
  children: React.ReactNode;
  onSectionClick?: (sectionId: string) => void;
  onBlockAction?: (action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete' | 'toggleVisibility', blockId: string) => void;
  onBlockReorder?: (from: number, to: number) => void;
  onBlockCopy?: (blockId: string) => void;
  onBlockPaste?: (position: number) => void;
  hasClipboard?: boolean;
}) {
  const def = BLOCK_LABELS[blockType];
  const color = def?.color || '#A3B18A';
  const wrapRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef(0);

  // Pointer-based smooth drag
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (!editMode) return;
    // Only start drag from the grab handle area (first 40px)
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;

    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;

    // Create ghost
    const ghost = document.createElement('div');
    ghost.style.cssText = `
      position: fixed; z-index: 99999; pointer-events: none;
      padding: 10px 20px; border-radius: 14px;
      background: rgba(250,247,242,0.92);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1.5px solid ${color}40;
      box-shadow: 0 12px 40px rgba(43,30,20,0.12);
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
    };

    const onUp = (ev: PointerEvent) => {
      // Find which drop zone we're over
      const dropZones = document.querySelectorAll('[data-drop-index]');
      let closestIdx = -1;
      let closestDist = Infinity;
      dropZones.forEach(zone => {
        const zRect = zone.getBoundingClientRect();
        const dist = Math.abs(ev.clientY - (zRect.top + zRect.height / 2));
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = parseInt(zone.getAttribute('data-drop-index') || '-1');
        }
      });

      if (closestIdx >= 0 && closestIdx !== index && onBlockReorder) {
        onBlockReorder(index, closestIdx);
      }

      // Cleanup
      ghost.remove();
      dragGhostRef.current = null;
      setIsDragging(false);
      if (wrapRef.current) {
        wrapRef.current.style.opacity = '1';
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [editMode, index, blockType, color, def, onBlockReorder]);

  return (
    <div
      ref={wrapRef}
      data-block-id={blockId}
      className={isSelected ? 'pl-block-selected' : ''}
      onClick={(e) => { e.stopPropagation(); onSectionClick?.(blockType); }}
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
      }}
    >
      {/* Inline toolbar — selected only */}
      {editMode && isSelected && (
        <div style={{
          position: 'absolute', top: '-36px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, display: 'flex', alignItems: 'center', gap: '2px',
          padding: '4px 6px', borderRadius: '12px',
          background: 'rgba(250,247,242,0.92)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 4px 20px rgba(43,30,20,0.1)',
        } as React.CSSProperties}>
          {/* Drag handle — grab to reorder */}
          <div
            onPointerDown={handleDragStart}
            style={{
              cursor: 'grab', padding: '4px 2px', display: 'flex',
              alignItems: 'center', color: 'rgba(0,0,0,0.2)',
              touchAction: 'none',
            }}
            title="Drag to reorder"
          >
            <GripVertical size={12} />
          </div>
          <span style={{ fontSize: '0.55rem', fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 4px' }}>
            {def?.label || blockType}
          </span>
          <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.25)' }} />
          {[
            ...(index > 0 ? [{ icon: '↑', action: 'moveUp' as const, handler: () => onBlockAction?.('moveUp', blockId) }] : []),
            ...(index < total - 1 ? [{ icon: '↓', action: 'moveDown' as const, handler: () => onBlockAction?.('moveDown', blockId) }] : []),
            { icon: '⎘', action: 'copy' as const, handler: () => onBlockCopy?.(blockId) },
            { icon: '⧉', action: 'duplicate' as const, handler: () => onBlockAction?.('duplicate', blockId) },
            { icon: '✕', action: 'delete' as const, handler: () => onBlockAction?.('delete', blockId), danger: true },
          ].map(a => (
            <button key={a.action} onClick={(e) => { e.stopPropagation(); a.handler(); }}
              title={a.action.charAt(0).toUpperCase() + a.action.slice(1)}
              style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '6px', background: 'transparent', color: (a as { danger?: boolean }).danger ? '#d06060' : 'var(--pl-muted)', cursor: 'pointer', fontSize: '0.72rem' }}
            >{a.icon}</button>
          ))}
        </div>
      )}

      {children}

      {/* Context menu */}
      {showMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowMenu(false)} />
          <div style={{
            position: 'fixed', top: menuPos.y, left: menuPos.x, zIndex: 9999,
            minWidth: '160px', padding: '4px',
            background: 'rgba(250,247,242,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 12px 40px rgba(43,30,20,0.15)',
          } as React.CSSProperties}>
            {[
              ...(index > 0 ? [{ label: 'Move Up', action: () => onBlockAction?.('moveUp', blockId) }] : []),
              ...(index < total - 1 ? [{ label: 'Move Down', action: () => onBlockAction?.('moveDown', blockId) }] : []),
              { label: 'Duplicate', action: () => onBlockAction?.('duplicate', blockId) },
              { label: 'Copy', action: () => onBlockCopy?.(blockId) },
              ...(hasClipboard ? [{ label: 'Paste Below', action: () => onBlockPaste?.(index + 1) }] : []),
              { label: 'Delete', action: () => onBlockAction?.('delete', blockId), danger: true },
            ].map(item => (
              <button key={item.label} onClick={() => { item.action(); setShowMenu(false); }}
                style={{ display: 'block', width: '100%', padding: '6px 10px', borderRadius: '6px', border: 'none', textAlign: 'left', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: (item as { danger?: boolean }).danger ? '#d05050' : 'var(--pl-ink)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >{item.label}</button>
            ))}
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
  onSectionClick?: (sectionId: string, chapterId?: string) => void;
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
  const vibeSkin = manifest.vibeSkin || deriveVibeSkin(manifest.vibeString || '');
  const pal = vibeSkin.palette;
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

  const sitePages: SitePage[] = useMemo(() => [
    { id: 'story', slug: 'our-story', label: vibeSkin.sectionLabels?.story || 'Our Story', enabled: true, order: 0 },
    ...(manifest.events?.length ? [{ id: 'schedule', slug: 'schedule', label: 'Schedule', enabled: true, order: 1 }] : []),
    ...(manifest.events?.length ? [{ id: 'rsvp', slug: 'rsvp', label: 'RSVP', enabled: true, order: 2 }] : []),
    ...((manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) ? [{ id: 'registry', slug: 'registry', label: 'Registry', enabled: true, order: 3 }] : []),
    ...((manifest.travelInfo?.hotels?.length || manifest.travelInfo?.airports?.length) ? [{ id: 'travel', slug: 'travel', label: 'Travel', enabled: true, order: 4 }] : []),
    ...(manifest.faqs?.length ? [{ id: 'faq', slug: 'faq', label: 'FAQ', enabled: true, order: 5 }] : []),
  ], [manifest, vibeSkin]);

  const visibleBlocks = manifest.blocks?.filter(b => b.visible).sort((a, b) => a.order - b.order);

  // ── Section click handler — direct DOM, no postMessage ──
  const handleSectionClick = useCallback((e: React.MouseEvent) => {
    if (!editMode || !onSectionClick) return;
    const target = e.target as HTMLElement;
    if (target.closest('[contenteditable="true"]')) return;
    const section = target.closest('[data-pe-section]');
    if (section) {
      const sectionId = section.getAttribute('data-pe-section') || '';
      const chapterId = section.getAttribute('data-pe-chapter') || undefined;
      onSectionClick(sectionId, chapterId);
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

    const setupEditableElements = () => {
      if (!siteRef.current) return;
      siteRef.current.querySelectorAll('[data-pe-editable="true"]').forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.dataset.peSetup) return;
        htmlEl.dataset.peSetup = '1';
        htmlEl.style.cursor = 'pointer';

        // Hover: dotted underline hint
        htmlEl.addEventListener('mouseenter', () => {
          if (htmlEl.contentEditable !== 'true') {
            htmlEl.style.textDecoration = 'underline';
            htmlEl.style.textDecorationColor = 'rgba(163,177,138,0.35)';
            htmlEl.style.textUnderlineOffset = '4px';
            htmlEl.style.textDecorationStyle = 'dotted';
          }
        });
        htmlEl.addEventListener('mouseleave', () => {
          if (htmlEl.contentEditable !== 'true') {
            htmlEl.style.textDecoration = 'none';
          }
        });

        // Double-click: enter edit mode
        htmlEl.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          htmlEl.contentEditable = 'true';
          htmlEl.spellcheck = false;
          htmlEl.style.outline = 'none';
          htmlEl.style.cursor = 'text';
          htmlEl.style.textDecoration = 'none';
          htmlEl.style.boxShadow = '0 0 0 2px rgba(163,177,138,0.25)';
          htmlEl.style.borderRadius = '4px';
          htmlEl.style.background = 'rgba(255,255,255,0.1)';
          htmlEl.focus();
          // Select all text
          const range = document.createRange();
          range.selectNodeContents(htmlEl);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        });

        // Blur: exit edit mode and commit
        htmlEl.addEventListener('blur', () => {
          htmlEl.contentEditable = 'false';
          htmlEl.style.cursor = 'pointer';
          htmlEl.style.boxShadow = 'none';
          htmlEl.style.borderRadius = '';
          htmlEl.style.background = '';

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
      });
    };

    setupEditableElements();
    const observer = new MutationObserver(setupEditableElements);
    observer.observe(siteRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [editMode, onTextEdit]);

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
        box-shadow: 0 12px 40px rgba(43,30,20,0.12);
        display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;
      `;
      picker.innerHTML = ICON_OPTIONS.map(icon => `
        <button style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid rgba(255,255,255,0.3);background:${target.textContent?.trim() === icon ? 'rgba(163,177,138,0.15)' : 'transparent'};cursor:pointer;font-size:1.1rem;" data-icon="${icon}">${icon}</button>
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

    switch (block.type) {
      case 'hero':
        return (
          <div key={key} data-pe-section="hero" data-pe-label="Hero" style={{ position: 'relative' }}>
            <Hero
              names={names}
              subtitle={manifest.chapters?.[0]?.subtitle || `${manifest.chapters?.length || 0} chapters`}
              coverPhoto={proxiedCover}
              weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date}
              vibeSkin={vibeSkin}
              heroTagline={manifest.poetry?.heroTagline}
            />
            <StickerLayer stickers={manifest.stickers || []} accentColor={pal.accent} />
          </div>
        );
      case 'story':
        return <section key={key} id="our-story" data-pe-section="story"><Timeline chapters={manifest.chapters || []} layoutFormat={manifest.layoutFormat} /></section>;
      case 'event':
        if (!manifest.events?.length) return null;
        return <section key={key} id="schedule" data-pe-section="events"><WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} /></section>;
      case 'rsvp':
        if (!manifest.events?.length) return null;
        return <section key={key} id="rsvp" data-pe-section="rsvp"><PublicRsvpSection siteId="preview" events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} /></section>;
      case 'registry':
        if (!manifest.registry?.entries?.length && !manifest.registry?.cashFundUrl) return null;
        return <section key={key} id="registry" data-pe-section="registry"><RegistryShowcase registries={manifest.registry?.entries || []} cashFundUrl={manifest.registry?.cashFundUrl} cashFundMessage={manifest.registry?.cashFundMessage} title={vibeSkin.sectionLabels.registry} /></section>;
      case 'travel':
        if (!manifest.travelInfo) return null;
        return <section key={key} id="travel" data-pe-section="travel"><TravelSection info={manifest.travelInfo} /></section>;
      case 'faq':
        if (!manifest.faqs?.length) return null;
        return <section key={key} id="faq" data-pe-section="faq"><FaqSection faqs={manifest.faqs} /></section>;
      case 'countdown':
        return (
          <section key={key} data-pe-section="countdown" style={{ padding: '4rem 2rem', textAlign: 'center', background: cardBg }}>
            <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: pal.foreground }}>
              Countdown
            </div>
          </section>
        );
      case 'text': {
        const textContent = blockCfg.content as string | undefined;
        if (!textContent) return null;
        return (
          <section key={key} data-pe-section="text" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
            <p
              data-pe-editable="true" data-pe-path={`blocks.${manifest.blocks?.findIndex(b => b.id === block.id) ?? 0}.config.content`}
              style={{ fontFamily: `"${vibeSkin.fonts.body}", sans-serif`, fontSize: '1.1rem', lineHeight: 1.8, color: pal.foreground, opacity: 0.8, textAlign: 'center' }}
            >
              {textContent}
            </p>
          </section>
        );
      }
      case 'quote':
        return (
          <section key={key} data-pe-section="quote" style={{ padding: '5rem 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div data-pe-icon="accentSymbol" data-pe-icon-scope="global" style={{ fontSize: '2rem', color: pal.accent, opacity: 0.4, marginBottom: '1rem', cursor: 'pointer' }}>{vibeSkin.accentSymbol || '✦'}</div>
            <p data-pe-editable="true" data-pe-path="poetry.dividerQuote" style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.3rem, 3vw, 2rem)', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.65, color: pal.foreground, opacity: 0.75 }}>
              {vibeSkin.dividerQuote || manifest.vibeString || 'Love is composed of a single soul inhabiting two bodies.'}
            </p>
          </section>
        );
      case 'divider':
        return <WaveDivider key={key} skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={60} />;
      case 'photos': {
        const allPhotos = manifest.chapters?.flatMap(ch => ch.images || []).slice(0, 9) || [];
        if (!allPhotos.length) return null;
        return (
          <section key={key} data-pe-section="photos" style={{ padding: '4rem 2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', maxWidth: '960px', margin: '0 auto' }}>
              {allPhotos.map((photo, i) => (
                <div key={i} style={{ aspectRatio: i === 0 ? '2/1' : '1', gridColumn: i === 0 ? 'span 2' : undefined, borderRadius: '10px', overflow: 'hidden' }}>
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
                <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', borderRadius: '1rem', border: '2px dashed rgba(163,177,138,0.3)', color: 'var(--pl-muted)' }}>
                <p data-pe-editable="true" data-pe-path={`blocks.${block.id}.config.url`} style={{ fontSize: '0.88rem' }}>
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
              <div style={{ padding: '3rem', textAlign: 'center', borderRadius: '1rem', border: '2px dashed rgba(163,177,138,0.3)', color: 'var(--pl-muted)', fontSize: '0.88rem' }}>
                Add an event address to show the map
              </div>
            )}
          </section>
        );
      }
      case 'guestbook':
        return (
          <section key={key} data-pe-section="guestbook" style={{ padding: '4rem 2rem', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: pal.foreground, marginBottom: '1rem' }}>
              Leave Your Wishes
            </h2>
            <p style={{ color: pal.muted, fontSize: '0.95rem', marginBottom: '2rem' }}>Share your love and well wishes</p>
            <div style={{ padding: '2rem', borderRadius: '1rem', background: `${pal.card}40`, border: `1px solid ${pal.accent}20` }}>
              <p style={{ color: pal.muted, fontStyle: 'italic' }}>Guestbook messages will appear here</p>
            </div>
          </section>
        );
      case 'spotify': {
        const spotifyUrl = blockCfg.url as string | undefined;
        const embedSrc = spotifyUrl?.replace('open.spotify.com/', 'open.spotify.com/embed/');
        return (
          <section key={key} data-pe-section="spotify" style={{ padding: '3rem 2rem', maxWidth: '700px', margin: '0 auto' }}>
            {embedSrc ? (
              <iframe src={embedSrc} style={{ width: '100%', height: '352px', borderRadius: '12px', border: 'none' }} allow="encrypted-media" />
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', borderRadius: '1rem', border: '2px dashed rgba(163,177,138,0.3)', color: 'var(--pl-muted)', fontSize: '0.88rem' }}>
                Add a Spotify playlist URL in the Music panel
              </div>
            )}
          </section>
        );
      }
      case 'hashtag':
        return (
          <section key={key} data-pe-section="hashtag" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontWeight: 600, color: pal.accent }}>
              #{(blockCfg.hashtag as string) || `${names[0]}And${names[1]}`.replace(/\s/g, '')}
            </div>
            <p style={{ color: pal.muted, fontSize: '0.88rem', marginTop: '0.5rem' }}>Share your photos with our hashtag</p>
          </section>
        );
      case 'weddingParty':
        return (
          <section key={key} data-pe-section="weddingParty" style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: pal.foreground, textAlign: 'center', marginBottom: '2rem' }}>
              The Wedding Party
            </h2>
            {(manifest.weddingParty?.length || 0) > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
                {manifest.weddingParty!.map((m, i) => (
                  <div key={i}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 0.75rem', background: `${pal.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: pal.accent }}>
                      {m.name?.[0] || '?'}
                    </div>
                    <div style={{ fontWeight: 600, color: pal.foreground, fontSize: '0.88rem' }}>{m.name}</div>
                    <div style={{ color: pal.muted, fontSize: '0.75rem' }}>{m.role}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: pal.muted }}>Add wedding party members in the Story panel</p>
            )}
          </section>
        );
      case 'vibeQuote':
      case 'welcome': {
        const statement = block.type === 'welcome' ? manifest.poetry?.welcomeStatement : (vibeSkin.dividerQuote || manifest.vibeString);
        if (!statement) return null;
        return (
          <section key={key} data-pe-section={block.type} style={{ padding: '4rem 2rem', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <p data-pe-editable="true" data-pe-path={block.type === 'welcome' ? 'poetry.welcomeStatement' : 'poetry.dividerQuote'} style={{
              fontFamily: `"${block.type === 'welcome' ? vibeSkin.fonts.body : vibeSkin.fonts.heading}", ${block.type === 'welcome' ? 'sans-serif' : 'serif'}`,
              fontSize: block.type === 'welcome' ? '1.05rem' : 'clamp(1.2rem, 2.5vw, 1.8rem)',
              fontStyle: 'italic', fontWeight: 400, lineHeight: 1.7, color: pal.foreground, opacity: 0.75,
            }}>
              {statement}
            </p>
          </section>
        );
      }
      case 'quiz':
        return (
          <section key={key} data-pe-section="quiz" style={{ padding: '4rem 2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: pal.foreground, marginBottom: '1rem' }}>
              How Well Do You Know Us?
            </h2>
            <p style={{ color: pal.muted, marginBottom: '2rem' }}>Take the couple quiz and see how you score!</p>
            <div style={{ padding: '2rem', borderRadius: '1rem', background: `${pal.accent}10`, border: `1px solid ${pal.accent}20` }}>
              <p style={{ color: pal.muted, fontStyle: 'italic' }}>Quiz questions will appear here for your guests</p>
            </div>
          </section>
        );
      case 'photoWall':
      case 'gallery': {
        const photos = manifest.chapters?.flatMap(ch => ch.images || []).slice(0, 12) || [];
        return (
          <section key={key} data-pe-section={block.type} style={{ padding: '4rem 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: pal.foreground }}>
                {block.type === 'photoWall' ? 'Photo Wall' : 'Gallery'}
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
              <p style={{ textAlign: 'center', color: pal.muted }}>Photos from your chapters will appear here</p>
            )}
          </section>
        );
      }
      case 'footer':
        return null; // Footer is rendered separately below
      case 'anniversary':
        return (
          <section key={key} data-pe-section="anniversary" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ fontSize: '2rem', color: pal.accent, opacity: 0.4, marginBottom: '1rem' }}>{vibeSkin.accentSymbol || '✦'}</div>
            <h2 data-pe-editable="true" data-pe-path="poetry.anniversaryTitle" style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: pal.foreground, marginBottom: '1rem' }}>
              Anniversary Milestones
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              {['First Date', '1 Year', '5 Years', 'Today'].map((milestone, i) => (
                <div key={i} style={{ padding: '1rem', borderRadius: '12px', background: `${pal.accent}10`, border: `1px solid ${pal.accent}20`, minWidth: '100px' }}>
                  <div style={{ fontSize: '1.5rem', color: pal.accent, marginBottom: '0.25rem' }}>{['💕', '🎂', '🌟', '✨'][i]}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: pal.foreground }}>{milestone}</div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'storymap':
        return (
          <section key={key} data-pe-section="storymap" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h2 data-pe-editable="true" data-pe-path="poetry.storymapTitle" style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: pal.foreground, marginBottom: '1rem' }}>
              Our Journey
            </h2>
            <p style={{ color: pal.muted, marginBottom: '2rem' }}>The places that made our story</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {(manifest.chapters || []).slice(0, 4).filter(c => c.location?.label).map((ch, i) => (
                <div key={i} style={{ padding: '0.75rem 1.25rem', borderRadius: '100px', background: `${pal.accent}10`, border: `1px solid ${pal.accent}20`, fontSize: '0.82rem', color: pal.foreground }}>
                  📍 {ch.location!.label}
                </div>
              ))}
              {!(manifest.chapters || []).some(c => c.location?.label) && (
                <p style={{ color: pal.muted, fontStyle: 'italic' }}>Add locations to your chapters to see them here</p>
              )}
            </div>
          </section>
        );
      default:
        // Unknown block type — show placeholder instead of nothing
        return (
          <section key={key} data-pe-section={block.type} style={{ padding: '2rem', margin: '1rem auto', maxWidth: '700px', textAlign: 'center', borderRadius: '1rem', border: '2px dashed rgba(163,177,138,0.2)' }}>
            <p style={{ color: 'var(--pl-muted)', fontSize: '0.82rem' }}>
              {String(block.type).replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()} section
            </p>
          </section>
        );
    }
  }, [manifest, names, vibeSkin, pal, bgColor, cardBg, proxiedCover, editMode, handleTextBlur, onTextEdit]);

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
            background: isDropTarget ? 'var(--pl-olive)' : 'rgba(163,177,138,0.3)',
            borderRadius: '2px',
            transition: 'all 0.15s',
            boxShadow: isDropTarget ? '0 0 12px rgba(163,177,138,0.4)' : 'none',
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
              border: '1.5px solid rgba(163,177,138,0.4)',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              color: 'var(--pl-olive)',
              cursor: 'pointer', fontSize: '1rem', fontWeight: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(43,30,20,0.06)',
              transition: 'all 0.15s',
            } as React.CSSProperties}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--pl-olive)';
              (e.currentTarget as HTMLElement).style.color = 'white';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--pl-olive)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.85)';
              (e.currentTarget as HTMLElement).style.color = 'var(--pl-olive)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(163,177,138,0.4)';
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
              borderRadius: '14px', border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 12px 40px rgba(43,30,20,0.12)',
              display: 'flex', flexDirection: 'column', gap: '2px',
            } as React.CSSProperties}>
              <div style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted)', padding: '4px 8px' }}>
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
                    fontSize: '0.78rem', color: 'var(--pl-ink)',
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

      {/* CSS scoping — site content lives inside .pl-site-scope */}
      <div
        ref={siteRef}
        className="pl-site-scope"
        onClick={handleSectionClick}
        style={{ position: 'relative', minHeight: '100%' }}
      >
        {/* Site navigation — override fixed positioning in editor */}
        <div className="pl-site-nav-editor" style={{ position: 'relative', zIndex: 5 }}>
          <SiteNav
            names={safeNames}
            pages={sitePages}
            logoIcon={manifest.logoIcon}
            logoSvg={manifest.logoSvg}
            navStyle={manifest.navStyle}
          />
        </div>

        {/* Main content */}
        <main style={{
          minHeight: '100dvh', paddingBottom: '5rem',
          background: bgColor, position: 'relative', isolation: 'isolate',
        }}>
          {/* Ambient art */}
          {vibeSkin.ambientArtDataUrl && (
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vibeSkin.ambientArtDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28, mixBlendMode: 'multiply' }} />
            </div>
          )}

          {/* Block sequence with drop zones */}
          {visibleBlocks ? (
            <>
              <DropZone index={0} />
              {visibleBlocks.map((block, i) => (
                <React.Fragment key={block.id}>
                  {renderSectionWrap(block, i, visibleBlocks.length, renderBlock(block))}
                  <DropZone index={i + 1} />
                </React.Fragment>
              ))}
            </>
          ) : (
            <>
              <Hero names={names} subtitle={manifest.chapters?.[0]?.subtitle || 'A love story'} coverPhoto={proxiedCover} weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date} vibeSkin={vibeSkin} heroTagline={manifest.poetry?.heroTagline} />
              <section id="our-story"><Timeline chapters={manifest.chapters || []} layoutFormat={manifest.layoutFormat} /></section>
              {manifest.events?.length ? <section id="schedule"><WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} /></section> : null}
              {manifest.events?.length ? <section id="rsvp"><PublicRsvpSection siteId="preview" events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} /></section> : null}
              {(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) ? <section id="registry"><RegistryShowcase registries={manifest.registry?.entries || []} cashFundUrl={manifest.registry?.cashFundUrl} cashFundMessage={manifest.registry?.cashFundMessage} title={vibeSkin.sectionLabels.registry} /></section> : null}
              {manifest.travelInfo ? <section id="travel"><TravelSection info={manifest.travelInfo} /></section> : null}
              {manifest.faqs?.length ? <section id="faq"><FaqSection faqs={manifest.faqs} /></section> : null}
            </>
          )}
        </main>

        {/* Footer */}
        <footer style={{
          padding: '3rem 2rem', textAlign: 'center',
          background: pal.foreground, color: `${pal.background}cc`,
          fontSize: '0.75rem', letterSpacing: '0.05em', position: 'relative',
        }}>
          <div style={{ marginBottom: '0.5rem', fontSize: '1rem', opacity: 0.6 }}>{vibeSkin.accentSymbol || '♡'}</div>
          <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {safeNames[0]}{safeNames[1] ? ` & ${safeNames[1]}` : ''}
          </div>
          {manifest.poetry?.closingLine && (
            <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '0.75rem', fontStyle: 'italic', opacity: 0.45, maxWidth: '400px', margin: '0 auto 0.75rem' }}>
              {manifest.poetry.closingLine}
            </div>
          )}
          <div style={{ opacity: 0.35, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '1rem' }}>Made with Pearloom</div>
        </footer>

        {/* Context menu is now inside SectionOverlay */}
      </div>
    </ThemeProvider>
  );
}
