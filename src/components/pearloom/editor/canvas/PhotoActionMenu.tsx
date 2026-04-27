'use client';

// ──────────────────────────────────────────────────────────────
// PhotoActionMenu — wraps any image dropzone on the canvas. In
// edit mode, hovering reveals a small pill at the bottom-right.
// Clicking Replace opens the full PhotoPicker modal so users can
// pick from three sources in one place:
//
//   📷 Upload from device   — file picker + auto-upload to R2
//   📁 Pick from gallery     — your existing library
//   🌥  Google Photos        — Google's official picker flow
//   ✦  Stylize              — AI stylize prompt (optional)
//   ×  Remove                — clears the image
//
// The PhotoPicker handles the source switching; this component
// only owns the menu trigger + remove. Drag-drop still works via
// the surrounding PhotoDropTarget for users who like that flow.
// ──────────────────────────────────────────────────────────────

import { useState, type ReactNode } from 'react';
import { useIsEditMode } from './EditorCanvasContext';
import { PhotoPicker } from '../PhotoPicker';

interface Props {
  /** Current image URL (renders the menu only when this is set). */
  imageUrl?: string;
  /** Called when the user picks a new image. URL points to R2 (for
   *  device + Google Photos uploads) or to a library asset. */
  onReplace?: (url: string) => void;
  /** Called when the user clicks Remove. */
  onRemove?: () => void;
  /** Called when the user clicks Stylize. Parent opens its own
   *  prompt UI / API call. Optional — hidden when not provided. */
  onStylize?: () => void;
  /** Title shown in the picker modal header — defaults to a
   *  generic 'Choose a photo'. Pass a context-specific title
   *  ('Replace cover photo', 'Add a chapter image') for clarity. */
  pickerTitle?: string;
  children: ReactNode;
}

export function PhotoActionMenu({
  imageUrl, onReplace, onRemove, onStylize, pickerTitle = 'Choose a photo', children,
}: Props) {
  const editMode = useIsEditMode();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!editMode) return <>{children}</>;

  function handleContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    if (typeof window === 'undefined') return;
    // Don't hijack the menu on contenteditable / native form elements.
    const target = e.target as HTMLElement | null;
    if (target && (
      target.isContentEditable ||
      ['INPUT', 'TEXTAREA'].includes(target.tagName)
    )) return;
    e.preventDefault();
    e.stopPropagation();
    const items = [
      onReplace && {
        id: 'replace',
        label: imageUrl ? 'Replace photo' : 'Add a photo',
        icon: 'upload',
        onSelect: () => setPickerOpen(true),
      },
      onStylize && imageUrl && {
        id: 'stylize',
        label: 'Stylize with Pear',
        icon: 'sparkles',
        onSelect: () => onStylize(),
      },
      onRemove && imageUrl && {
        id: 'remove',
        label: 'Remove photo',
        icon: 'close',
        divider: true,
        danger: true,
        onSelect: () => onRemove(),
      },
    ].filter(Boolean) as Array<NonNullable<unknown>>;
    if (items.length === 0) return;
    window.dispatchEvent(new CustomEvent('pearloom:context-menu-open', {
      detail: {
        x: e.clientX,
        y: e.clientY,
        title: 'Photo',
        items,
      },
    }));
  }

  return (
    <div
      className="pl8-photo-action-wrap"
      style={{ position: 'relative' }}
      onContextMenu={handleContextMenu}
    >
      {children}
      <div
        className="pl8-photo-action-menu"
        role="toolbar"
        aria-label="Photo actions"
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          zIndex: 25,
          display: 'flex',
          gap: 4,
          padding: 4,
          borderRadius: 999,
          background: 'rgba(14,13,11,0.84)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 8px 20px rgba(14,13,11,0.18)',
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1), transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
          transform: 'translateY(4px)',
        }}
      >
        {onReplace && (
          <PhotoActionButton
            ariaLabel="Replace photo"
            title={imageUrl ? 'Replace from device, gallery, or Google Photos' : 'Add a photo'}
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen(true);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </PhotoActionButton>
        )}
        {onStylize && imageUrl && (
          <PhotoActionButton
            ariaLabel="Stylize with AI"
            title="Stylize with Pear (gpt-image-2)"
            onClick={(e) => {
              e.stopPropagation();
              onStylize();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L14.4 9.6 L22 12 L14.4 14.4 L12 22 L9.6 14.4 L2 12 L9.6 9.6 Z" />
            </svg>
          </PhotoActionButton>
        )}
        {onRemove && imageUrl && (
          <PhotoActionButton
            ariaLabel="Remove photo"
            title="Remove this photo"
            danger
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </PhotoActionButton>
        )}
      </div>
      <PhotoPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url) => {
          if (typeof url === 'string') onReplace?.(url);
        }}
        title={pickerTitle}
        accept="single"
      />
    </div>
  );
}

function PhotoActionButton({
  children, onClick, ariaLabel, title, danger,
}: {
  children: ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      style={{
        width: 28, height: 28,
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        color: danger ? '#FCA5A5' : 'rgba(243,233,212,0.92)',
        cursor: 'pointer',
        display: 'grid', placeItems: 'center',
        transition: 'background-color 180ms ease, color 180ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'rgba(239, 68, 68, 0.18)' : 'rgba(243,233,212,0.14)';
        if (danger) e.currentTarget.style.color = '#FECACA';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? '#FCA5A5' : 'rgba(243,233,212,0.92)';
      }}
    >
      {children}
    </button>
  );
}
