'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Pencil, Copy, Trash2, ArrowUp, ArrowDown, Sparkles,
} from 'lucide-react';
import { LAYOUT_OPTS } from '@/components/editor/ChapterActions';

export interface ContextMenuState {
  x: number;
  y: number;
  chapterId: string;
  chapterIndex: number;
}

interface ChapterContextMenuProps {
  state: ContextMenuState | null;
  chapterCount: number;
  currentLayout?: string;
  onClose: () => void;
  onEditInSidebar: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onLayoutChange: (id: string, layout: string) => void;
  onAIRewrite: (id: string) => void;
}

function MenuItem({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 12px', border: 'none', borderRadius: 8,
        background: 'transparent', cursor: 'pointer',
        fontSize: '0.88rem', fontWeight: 500,
        color: danger ? '#ef4444' : 'var(--pl-ink)',
        fontFamily: 'var(--pl-font-body)',
        transition: 'background 0.12s',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : 'rgba(163,177,138,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: danger ? '#ef4444' : 'var(--pl-muted)' }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

const Divider = () => (
  <div style={{ height: 1, background: 'var(--pl-divider)', margin: '4px 0' }} />
);

export function ChapterContextMenu({
  state, chapterCount, currentLayout, onClose,
  onEditInSidebar, onDuplicate, onDelete, onMove, onLayoutChange, onAIRewrite,
}: ChapterContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!state) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [state]);

  if (!state) return null;

  const { x, y, chapterId, chapterIndex } = state;
  const act = (fn: () => void) => () => { fn(); onClose(); };

  // Clamp position to viewport
  const menuWidth = 200;
  const menuHeight = 340;
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 8);

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: clampedY,
        left: clampedX,
        zIndex: 9999,
        minWidth: menuWidth,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        padding: 4,
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      <MenuItem icon={<Pencil size={14} />} label="Edit in sidebar" onClick={act(() => onEditInSidebar(chapterId))} />
      <Divider />
      <MenuItem icon={<Copy size={14} />} label="Duplicate" onClick={act(() => onDuplicate(chapterId))} />
      <MenuItem icon={<Trash2 size={14} />} label="Delete" onClick={act(() => onDelete(chapterId))} danger />
      <Divider />

      {/* Layout sub-items */}
      <div style={{ padding: '4px 12px 2px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>
        Layout
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, padding: '2px 4px 4px' }}>
        {LAYOUT_OPTS.map((opt) => (
          <button
            key={opt.id}
            onClick={act(() => onLayoutChange(chapterId, opt.id))}
            title={opt.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '6px 4px', border: 'none', borderRadius: 6, cursor: 'pointer',
              background: currentLayout === opt.id ? 'rgba(163,177,138,0.15)' : 'transparent',
              color: currentLayout === opt.id ? 'var(--pl-olive)' : 'var(--pl-muted)',
              fontSize: '0.65rem', fontWeight: 600, transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { if (currentLayout !== opt.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
            onMouseLeave={(e) => { if (currentLayout !== opt.id) e.currentTarget.style.background = 'transparent'; }}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      <Divider />
      <MenuItem icon={<Sparkles size={14} />} label="AI Rewrite" onClick={act(() => onAIRewrite(chapterId))} />
      <Divider />
      {chapterIndex > 0 && (
        <MenuItem icon={<ArrowUp size={14} />} label="Move up" onClick={act(() => onMove(chapterId, 'up'))} />
      )}
      {chapterIndex < chapterCount - 1 && (
        <MenuItem icon={<ArrowDown size={14} />} label="Move down" onClick={act(() => onMove(chapterId, 'down'))} />
      )}
    </div>,
    document.body,
  );
}
