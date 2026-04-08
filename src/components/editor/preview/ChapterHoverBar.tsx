'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil, Copy, Trash2, ArrowUp, ArrowDown, Sparkles, LayoutGrid,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown';
import { LAYOUT_OPTS } from '@/components/editor/ChapterActions';

interface ChapterHoverBarProps {
  visible: boolean;
  chapterIndex: number;
  chapterCount: number;
  currentLayout?: string;
  onEditInSidebar: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onLayoutChange: (layout: string) => void;
  onAIRewrite: () => void;
}

const barBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 4, border: 'none',
  background: 'transparent', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.12s, color 0.12s',
};

function BarButton({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  const color = danger ? '#fca5a5' : 'var(--pl-ink)';
  return (
    <button
      aria-label={label}
      title={label}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      style={{ ...barBtnStyle, color }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0,0,0,0.08)';
        if (!danger) e.currentTarget.style.color = 'white';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = color;
      }}
    >
      {icon}
    </button>
  );
}

const Sep = () => (
  <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />
);

export function ChapterHoverBar({
  visible,
  chapterIndex,
  chapterCount,
  currentLayout,
  onEditInSidebar,
  onDuplicate,
  onDelete,
  onMove,
  onLayoutChange,
  onAIRewrite,
}: ChapterHoverBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 20,
            display: 'flex', alignItems: 'center', gap: 2,
            padding: '3px 4px', borderRadius: 8,
            background: 'rgba(109,89,122,0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <BarButton icon={<Pencil size={14} />} label="Edit in sidebar" onClick={onEditInSidebar} />
          <BarButton icon={<Copy size={14} />} label="Duplicate" onClick={onDuplicate} />
          <BarButton icon={<Trash2 size={14} />} label="Delete" onClick={onDelete} danger />
          <Sep />

          {/* Layout picker — DropdownMenuTrigger wraps button directly */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Change layout"
                onClick={(e) => e.stopPropagation()}
                style={{ ...barBtnStyle, color: 'var(--pl-ink)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <LayoutGrid size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6}>
              {LAYOUT_OPTS.map((opt) => (
                <DropdownMenuItem
                  key={opt.id}
                  className={currentLayout === opt.id ? 'bg-[rgba(163,177,138,0.12)] text-[var(--pl-olive)]' : ''}
                  onSelect={() => onLayoutChange(opt.id)}
                >
                  <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {opt.icon}
                  </span>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Sep />
          {chapterIndex > 0 && (
            <BarButton icon={<ArrowUp size={14} />} label="Move up" onClick={() => onMove('up')} />
          )}
          {chapterIndex < chapterCount - 1 && (
            <BarButton icon={<ArrowDown size={14} />} label="Move down" onClick={() => onMove('down')} />
          )}
          <Sep />
          <BarButton icon={<Sparkles size={14} />} label="AI Rewrite" onClick={onAIRewrite} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
