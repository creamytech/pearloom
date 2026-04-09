'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/AICommandBar.tsx
// Inline AI command bar — floating pill that expands into a
// contextual AI assistant. Notion AI / Linear-style UX.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowUp, Check, Loader2, X } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';
import type { StoryManifest, Chapter } from '@/types';

// ── Quick action definitions ──────────────────────────────────

interface QuickAction {
  label: string;
  prompt: string;
  handler: 'ai-chat' | 'ai-faq' | 'section-picker';
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Rewrite tagline',  prompt: 'Rewrite the hero tagline to be more poetic and memorable', handler: 'ai-chat' },
  { label: 'Suggest colors',   prompt: 'Suggest a warmer, more elegant color palette for this wedding site', handler: 'ai-chat' },
  { label: 'Generate FAQ',     prompt: '',  handler: 'ai-faq' },
  { label: 'Improve story',    prompt: 'Improve and enhance all chapter descriptions to be more vivid and emotional', handler: 'ai-chat' },
  { label: 'Add section',      prompt: '',  handler: 'section-picker' },
];

// ── Colour tokens ─────────────────────────────────────────────

const OLIVE = 'var(--pl-olive, #A3B18A)';

// ── Status type ───────────────────────────────────────────────

type BarStatus = 'idle' | 'loading' | 'success' | 'error';

// ── Main Component ────────────────────────────────────────────

export function AICommandBar() {
  const { state, dispatch, manifest, actions } = useEditor();
  const [expanded, setExpanded] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [status, setStatus] = useState<BarStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Expand / collapse ─────────────────────────────────────

  const open = useCallback(() => {
    setExpanded(true);
    setStatus('idle');
    setInputVal('');
    setErrorMsg('');
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setExpanded(false);
    setInputVal('');
    setStatus('idle');
    setErrorMsg('');
  }, []);

  // ── Keyboard shortcut: "/" opens, ESC closes ──────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // "/" opens the bar when not inside an editable element
      if (
        e.key === '/' &&
        !expanded &&
        !(e.target as HTMLElement).closest('input, textarea, [contenteditable], select')
      ) {
        e.preventDefault();
        open();
        return;
      }
      // ESC closes
      if (e.key === 'Escape' && expanded) {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded, open, close]);

  // ── Clean up on unmount ───────────────────────────────────

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // ── Apply AI response to manifest ─────────────────────────

  const applyAIResponse = useCallback((data: { action: string; data: Record<string, unknown> | null; reply: string }) => {
    const { action, data: actionData } = data;

    if (action === 'update_chapter' && actionData?.id) {
      const { id, ...updates } = actionData;
      actions.updateChapter(id as string, updates as Partial<Chapter>);
    } else if (action === 'update_manifest' && actionData?.path) {
      const parts = (actionData.path as string).split('.');
      if (parts.length === 2) {
        const [topKey, subKey] = parts;
        const existing = (manifest as unknown as Record<string, unknown>)[topKey] as Record<string, unknown> | undefined;
        const updated = { [topKey]: { ...(existing || {}), [subKey]: actionData.value } };
        actions.handleChatManifestUpdate(updated as Partial<StoryManifest>);
      } else if (parts.length === 1) {
        actions.handleChatManifestUpdate({ [parts[0]]: actionData.value } as Partial<StoryManifest>);
      } else if (parts[0] === 'chapters' && parts.length === 3) {
        const chapterIndex = parseInt(parts[1], 10);
        const fieldKey = parts[2];
        const targetChapter = manifest.chapters?.[chapterIndex];
        if (targetChapter && !isNaN(chapterIndex)) {
          actions.updateChapter(targetChapter.id, { [fieldKey]: actionData.value } as Partial<Chapter>);
        }
      }
    }
  }, [manifest, actions]);

  // ── Submit handler ────────────────────────────────────────

  const submit = useCallback(async (command: string, handler: QuickAction['handler'] = 'ai-chat') => {
    const trimmed = command.trim();
    if (!trimmed && handler !== 'ai-faq' && handler !== 'section-picker') return;

    // Section picker: open the canvas tab to add a section
    if (handler === 'section-picker') {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'canvas' });
      close();
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (handler === 'ai-faq') {
        // Generate FAQs
        const res = await fetch('/api/ai-faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manifest }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.faqs) {
          actions.handleChatManifestUpdate({ faqs: data.faqs });
        }
      } else {
        // AI chat command
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            manifest,
            activeChapterId: state.activeId,
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        applyAIResponse(data);
      }

      setStatus('success');
      successTimerRef.current = setTimeout(() => {
        close();
      }, 1200);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setStatus('error');
      setErrorMsg('Something went wrong. Try again.');
      setTimeout(() => {
        setStatus('idle');
        setErrorMsg('');
      }, 3000);
    }
  }, [manifest, state.activeId, actions, dispatch, close, applyAIResponse]);

  // ── Handle quick action click ─────────────────────────────

  const handleQuickAction = useCallback((action: QuickAction) => {
    if (action.handler === 'section-picker' || action.handler === 'ai-faq') {
      submit(action.prompt, action.handler);
    } else {
      submit(action.prompt, action.handler);
    }
  }, [submit]);

  // ── Handle form submit ────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (inputVal.trim()) {
      submit(inputVal);
    }
  }, [inputVal, submit]);

  // ── Determine mobile ──────────────────────────────────────

  const isMobile = state.isMobile;

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobile ? 80 : 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        width: isMobile ? 'calc(100% - 32px)' : 'auto',
        maxWidth: isMobile ? 'calc(100% - 32px)' : '520px',
      }}
    >
      <AnimatePresence mode="wait">
        {!expanded ? (
          /* ── Collapsed Pill ────────────────────────────────── */
          <motion.button
            key="pill"
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={open}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '100px',
              background: 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid rgba(163,177,138,0.35)`,
              boxShadow: '0 8px 32px rgba(43,30,20,0.1)',
              cursor: 'pointer',
              fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: 'var(--pl-ink-soft, #3D3530)',
              whiteSpace: 'nowrap',
              outline: 'none',
            } as React.CSSProperties}
          >
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <Sparkles size={15} color={OLIVE} />
            </motion.span>
            Ask AI anything...
            <kbd style={{
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.6rem',
              background: 'rgba(0,0,0,0.04)',
              color: 'var(--pl-muted, #9e9a96)',
              border: '1px solid rgba(0,0,0,0.06)',
              fontFamily: 'inherit',
              marginLeft: '4px',
            }}>/</kbd>
          </motion.button>
        ) : (
          /* ── Expanded Command Bar ─────────────────────────── */
          <motion.div
            key="bar"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              pointerEvents: 'auto',
              width: isMobile ? '100%' : '480px',
              borderRadius: '24px',
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 8px 32px rgba(43,30,20,0.1)',
              overflow: 'hidden',
              position: 'relative',
            } as React.CSSProperties}
          >
            {/* Loading shimmer overlay */}
            <AnimatePresence>
              {status === 'loading' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 10,
                    borderRadius: '24px',
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}
                >
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(163,177,138,0.12) 50%, transparent 100%)',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
            }}>
              {/* Status icon */}
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <AnimatePresence mode="wait">
                  {status === 'success' ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <Check size={16} color={OLIVE} strokeWidth={2.5} />
                    </motion.div>
                  ) : status === 'loading' ? (
                    <motion.div
                      key="loader"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 size={16} color={OLIVE} />
                    </motion.div>
                  ) : (
                    <motion.div key="sparkles">
                      <Sparkles size={16} color={OLIVE} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input field */}
              <input
                ref={inputRef}
                value={status === 'success' ? 'Applied!' : status === 'error' ? errorMsg : inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    close();
                  }
                }}
                disabled={status === 'loading' || status === 'success'}
                placeholder="Rewrite the hero tagline..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: status === 'success'
                    ? OLIVE
                    : status === 'error'
                      ? '#b91c1c'
                      : 'var(--pl-ink, #2B1E14)',
                  fontSize: '0.88rem',
                  fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
                  fontWeight: status === 'success' ? 600 : 400,
                  caretColor: OLIVE,
                  minWidth: 0,
                }}
              />

              {/* Submit / close buttons */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                {status === 'idle' && inputVal.trim() && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    onClick={handleSubmit}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: OLIVE,
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <ArrowUp size={14} color="white" strokeWidth={2.5} />
                  </motion.button>
                )}
                <button
                  onClick={close}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.04)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <X size={13} color="var(--pl-muted, #9e9a96)" />
                </button>
              </div>
            </div>

            {/* Quick action chips */}
            {status === 'idle' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  padding: '0 16px 14px',
                }}
              >
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '100px',
                      background: 'rgba(163,177,138,0.1)',
                      border: '1px solid rgba(163,177,138,0.18)',
                      color: OLIVE,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
                      cursor: 'pointer',
                      outline: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.target as HTMLElement).style.background = 'rgba(163,177,138,0.18)';
                      (e.target as HTMLElement).style.borderColor = 'rgba(163,177,138,0.3)';
                    }}
                    onMouseLeave={e => {
                      (e.target as HTMLElement).style.background = 'rgba(163,177,138,0.1)';
                      (e.target as HTMLElement).style.borderColor = 'rgba(163,177,138,0.18)';
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
