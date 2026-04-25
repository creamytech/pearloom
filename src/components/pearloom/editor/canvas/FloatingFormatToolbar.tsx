'use client';

/* ========================================================================
   FloatingFormatToolbar — surfaces over any text selection inside an
   [data-pl-editable] node. Bold / italic / underline use the legacy
   document.execCommand for inline marks (works inside contentEditable
   without a custom serializer). Link prompts for a URL. Clear strips
   marks back to plain text. AI rewrite calls onAiRewrite with the
   selected substring so the parent can swap it via onSave.

   Drop once at the editor canvas top-level. The toolbar positions
   itself absolutely against the viewport via getBoundingClientRect().
   ======================================================================== */

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  /** Optional AI rewrite handler — receives the selected text and is
   *  expected to call back with a rewritten version (or noop). */
  onAiRewrite?: (selected: string) => Promise<string | null> | string | null;
}

const TOOLBAR_W = 280;
const TOOLBAR_H = 40;

export function FloatingFormatToolbar({ onAiRewrite }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [showLinkBox, setShowLinkBox] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const linkInputRef = useRef<HTMLInputElement | null>(null);

  // Listen for selection changes anywhere on the page; if the
  // selection lives inside a [data-pl-editable], render the toolbar.
  useEffect(() => {
    function update() {
      if (typeof window === 'undefined') return;
      const sel = window.getSelection?.();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPos(null);
        setShowLinkBox(false);
        return;
      }
      const range = sel.getRangeAt(0);
      const start = range.startContainer;
      const editable =
        start.nodeType === 1
          ? (start as Element).closest?.('[data-pl-editable]')
          : (start.parentElement as Element | null)?.closest?.('[data-pl-editable]');
      if (!editable) {
        setPos(null);
        setShowLinkBox(false);
        return;
      }
      const rect = range.getBoundingClientRect();
      // Position above the selection unless the toolbar would clip
      // off the top, in which case put it below.
      const above = rect.top > TOOLBAR_H + 12;
      const x = Math.max(8, Math.min(window.innerWidth - TOOLBAR_W - 8, rect.left + rect.width / 2 - TOOLBAR_W / 2));
      const y = above ? rect.top - TOOLBAR_H - 8 : rect.bottom + 8;
      setPos({ x, y });
    }
    document.addEventListener('selectionchange', update);
    window.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      document.removeEventListener('selectionchange', update);
      window.removeEventListener('scroll', update, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', update);
    };
  }, []);

  const cmd = useCallback((command: string, value?: string) => {
    try {
      document.execCommand(command, false, value);
    } catch {}
  }, []);

  const onLinkOpen = useCallback(() => {
    setShowLinkBox(true);
    setTimeout(() => linkInputRef.current?.focus(), 30);
  }, []);
  const onLinkApply = useCallback(() => {
    const v = linkValue.trim();
    if (!v) return;
    const href = v.startsWith('http') || v.startsWith('mailto:') || v.startsWith('tel:') ? v : `https://${v}`;
    cmd('createLink', href);
    setShowLinkBox(false);
    setLinkValue('');
  }, [cmd, linkValue]);

  const onClear = useCallback(() => {
    cmd('removeFormat');
    cmd('unlink');
  }, [cmd]);

  const onAi = useCallback(async () => {
    if (!onAiRewrite || aiBusy) return;
    const sel = window.getSelection?.();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const text = sel.toString();
    if (!text.trim()) return;
    setAiBusy(true);
    try {
      const result = await onAiRewrite(text);
      if (result && result !== text) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(result));
      }
    } finally {
      setAiBusy(false);
    }
  }, [onAiRewrite, aiBusy]);

  if (!pos) return null;

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: TOOLBAR_W,
        height: showLinkBox ? TOOLBAR_H + 38 : TOOLBAR_H,
        zIndex: 80,
        background: 'var(--ink, #18181B)',
        color: 'var(--cream, #FDFAF0)',
        borderRadius: 8,
        boxShadow: '0 12px 32px rgba(0,0,0,0.32)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'pl8-float-in 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        fontFamily: 'inherit',
      }}
      onMouseDown={(e) => {
        // Don't lose selection when clicking the toolbar.
        e.preventDefault();
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: TOOLBAR_H, padding: '0 4px', gap: 2 }}>
        <ToolBtn label="Bold"      shortcut="⌘B" onClick={() => cmd('bold')}>      <strong style={{ fontSize: 14 }}>B</strong></ToolBtn>
        <ToolBtn label="Italic"    shortcut="⌘I" onClick={() => cmd('italic')}>    <em style={{ fontFamily: 'Georgia, serif', fontSize: 15 }}>I</em></ToolBtn>
        <ToolBtn label="Underline" shortcut="⌘U" onClick={() => cmd('underline')}> <span style={{ textDecoration: 'underline', fontSize: 13 }}>U</span></ToolBtn>
        <Divider />
        <ToolBtn label="Add link"      onClick={onLinkOpen}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" />
            <path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
          </svg>
        </ToolBtn>
        <ToolBtn label="Clear formatting" onClick={onClear}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V4h16v3" />
            <path d="M5 20h6" />
            <path d="M13 4 8 20" />
            <path d="m15 15 5 5" />
            <path d="m20 15-5 5" />
          </svg>
        </ToolBtn>
        {onAiRewrite && (
          <>
            <Divider />
            <ToolBtn label={aiBusy ? 'Rewriting…' : 'Ask Pear to rewrite'} onClick={onAi} disabled={aiBusy}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.8 4.8L18.6 9l-4.8 1.8L12 15.6 10.2 10.8 5.4 9l4.8-1.2z" fill="currentColor" />
              </svg>
            </ToolBtn>
          </>
        )}
      </div>
      {showLinkBox && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '6px',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            ref={linkInputRef}
            type="url"
            value={linkValue}
            placeholder="paste a URL"
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onLinkApply();
              } else if (e.key === 'Escape') {
                setShowLinkBox(false);
              }
            }}
            style={{
              flex: 1,
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(0,0,0,0.3)',
              color: 'var(--cream)',
              fontSize: 12,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={onLinkApply}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: 'var(--peach-ink, #C6703D)',
              color: 'var(--cream)',
              border: 'none',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Apply
          </button>
        </div>
      )}
      <style jsx>{`
        @keyframes pl8-float-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function ToolBtn({
  label,
  shortcut,
  onClick,
  disabled,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      style={{
        flex: 1,
        height: 30,
        background: 'transparent',
        color: 'var(--cream)',
        border: 'none',
        borderRadius: 6,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 140ms ease',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.18)', margin: '0 2px' }} />;
}
