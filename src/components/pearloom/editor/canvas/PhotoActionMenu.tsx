'use client';

// ──────────────────────────────────────────────────────────────
// PhotoActionMenu — wraps any image dropzone on the canvas. In
// edit mode, hovering reveals a small pill at the bottom-right
// with three actions:
//
//   ⤓ Replace  — opens a file picker, uploads to R2, sets the URL
//   ✦ Stylize  — opens an AI stylize prompt (gpt-image-2)
//   × Remove   — clears the image
//
// Doesn't replace PhotoDropTarget — wraps it. Drag-drop still
// works for users who like that flow; the menu is for everyone
// else.
// ──────────────────────────────────────────────────────────────

import { useRef, type ReactNode } from 'react';
import { useIsEditMode } from './EditorCanvasContext';

interface Props {
  /** Current image URL (renders the menu only when this is set). */
  imageUrl?: string;
  /** Called when the user picks a new image (data URL after upload). */
  onReplace?: (dataUrlOrR2Url: string) => void;
  /** Called when the user clicks Remove. */
  onRemove?: () => void;
  /** Called when the user clicks Stylize. Parent opens its own
   *  prompt UI / API call. Optional — hidden when not provided. */
  onStylize?: () => void;
  children: ReactNode;
}

export function PhotoActionMenu({
  imageUrl, onReplace, onRemove, onStylize, children,
}: Props) {
  const editMode = useIsEditMode();
  const fileInput = useRef<HTMLInputElement>(null);

  if (!editMode) return <>{children}</>;

  function handleFile(file: File) {
    if (!onReplace) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 8 * 1024 * 1024) {
      // eslint-disable-next-line no-alert
      alert('Image must be under 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') onReplace(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="pl8-photo-action-wrap" style={{ position: 'relative' }}>
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
            title={imageUrl ? 'Replace photo' : 'Add a photo'}
            onClick={(e) => {
              e.stopPropagation();
              fileInput.current?.click();
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
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
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
