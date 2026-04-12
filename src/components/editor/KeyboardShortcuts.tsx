'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / KeyboardShortcuts.tsx — Glass-morphism shortcuts modal
// Shows all editor keyboard shortcuts grouped by category
// ─────────────────────────────────────────────────────────────

import { useEffect, useCallback, useRef } from 'react';
import { Keyboard, X } from 'lucide-react';

// ── Shortcut data ─────────────────────────────────────────────

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Quick actions' },
      { keys: ['⌘', 'Z'], description: 'Undo' },
      { keys: ['⌘', '⇧', 'Z'], description: 'Redo' },
      { keys: ['⌘', 'S'], description: 'Save' },
      { keys: ['?'], description: 'Keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close panel' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌘', '1'], description: 'Desktop view' },
      { keys: ['⌘', '2'], description: 'Tablet view' },
      { keys: ['⌘', '3'], description: 'Mobile view' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { keys: ['Double-click'], description: 'Edit text inline' },
      { keys: ['Drag handle'], description: 'Reorder blocks' },
      { keys: ['Space', 'drag'], description: 'Pan canvas' },
      { keys: ['⌘', 'C'], description: 'Copy block' },
      { keys: ['⌘', 'V'], description: 'Paste block' },
      { keys: ['Delete'], description: 'Delete selected block' },
    ],
  },
];

// ── Styles (CSS-in-JS matching Pearloom glass aesthetic) ──────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.35)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  animation: 'pl-kb-overlay-in 0.2s ease-out both',
};

const cardStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: '560px',
  maxHeight: '80vh',
  margin: '0 20px',
  overflowY: 'auto',
  borderRadius: '20px',
  background: 'rgba(250,247,242,0.92)',
  backdropFilter: 'blur(40px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
  border: '1px solid #E4E4E7',
  boxShadow: '0 24px 80px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.4)',
  animation: 'pl-kb-card-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  border: 'none',
  background: 'rgba(0,0,0,0.05)',
  color: '#71717A',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s',
};

const keyBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '24px',
  height: '24px',
  padding: '0 6px',
  borderRadius: '6px',
  background: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(0,0,0,0.1)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.06), inset 0 -1px 0 rgba(0,0,0,0.04)',
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  fontSize: '0.68rem',
  fontWeight: 500,
  color: 'var(--pl-ink-soft, #3a3530)',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

// ── Keyframes (injected once) ─────────────────────────────────

const KEYFRAME_ID = 'pl-keyboard-shortcuts-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAME_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAME_ID;
  style.textContent = `
    @keyframes pl-kb-overlay-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pl-kb-card-in {
      from { opacity: 0; transform: scale(0.94) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// ── Component ─────────────────────────────────────────────────

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Inject CSS keyframes
  useEffect(() => { injectKeyframes(); }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [open, onClose]);

  // Close on click outside card
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div ref={cardRef} style={cardStyle}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={closeButtonStyle}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.1)';
            (e.currentTarget as HTMLElement).style.color = '#3F3F46';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.05)';
            (e.currentTarget as HTMLElement).style.color = '#71717A';
          }}
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div style={{ padding: '24px 28px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '10px',
            background: '#F4F4F5',
            color: '#18181B',
          }}>
            <Keyboard size={17} />
          </div>
          <h2 style={{
            margin: 0,
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--pl-ink, #2b1e14)',
            letterSpacing: '-0.01em',
          }}>
            Keyboard Shortcuts
          </h2>
        </div>

        {/* Shortcut groups */}
        <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.title}>
              {/* Group header */}
              <div style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--pl-muted, #9a948c)',
                marginBottom: '8px',
                paddingBottom: '6px',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
              }}>
                {group.title}
              </div>
              {/* Shortcuts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 4px',
                      borderRadius: '6px',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.025)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span style={{
                      fontSize: '0.78rem',
                      color: 'var(--pl-ink-soft, #3a3530)',
                      fontWeight: 400,
                    }}>
                      {shortcut.description}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '16px' }}>
                      {shortcut.keys.map((key, j) => (
                        <span key={j} style={keyBadgeStyle}>
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '12px 28px 16px',
          borderTop: '1px solid rgba(0,0,0,0.04)',
          fontSize: '0.65rem',
          color: 'var(--pl-muted, #9a948c)',
          textAlign: 'center',
          fontWeight: 500,
        }}>
          Press <span style={keyBadgeStyle}>?</span> anytime to show this dialog
        </div>
      </div>
    </div>
  );
}
