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
  { label: 'Rewrite tagline',   prompt: 'Write a new, beautiful, poetic hero tagline that captures this couple\'s love story. Return update_manifest with path poetry.heroTagline.', handler: 'ai-chat' },
  { label: 'Change colors',     prompt: 'Suggest a completely new, elegant color palette that matches the vibe of this site. Return update_theme with a full 6-color palette (background, foreground, accent, accentLight, muted, cardBg).', handler: 'ai-chat' },
  { label: 'Write welcome',     prompt: 'Write a warm, heartfelt welcome message for the guests (3-4 sentences). Return update_manifest with path poetry.welcomeStatement.', handler: 'ai-chat' },
  { label: 'Generate FAQ',      prompt: '',  handler: 'ai-faq' },
  { label: 'Add events',        prompt: 'Create a ceremony and reception event with beautiful descriptions, realistic times, and the venue from the site details. Return update_events.', handler: 'ai-chat' },
  { label: 'Improve story',     prompt: 'Rewrite all chapter descriptions to be more vivid, emotional, and poetic. Return update_chapter for each one.', handler: 'ai-chat' },
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
    if (!actionData && action !== 'message') return;

    switch (action) {
      case 'update_chapter': {
        if (!actionData?.id) break;
        const { id, ...updates } = actionData;
        actions.updateChapter(id as string, updates as Partial<Chapter>);
        break;
      }

      case 'update_manifest': {
        if (!actionData?.path) break;
        const parts = (actionData.path as string).split('.');
        if (parts.length === 2) {
          const [topKey, subKey] = parts;
          const existing = (manifest as unknown as Record<string, unknown>)[topKey] as Record<string, unknown> | undefined;
          actions.handleChatManifestUpdate({ [topKey]: { ...(existing || {}), [subKey]: actionData.value } } as Partial<StoryManifest>);
        } else if (parts.length === 1) {
          actions.handleChatManifestUpdate({ [parts[0]]: actionData.value } as Partial<StoryManifest>);
        }
        break;
      }

      case 'update_theme': {
        const themeUpdate: Record<string, unknown> = {};
        if (actionData?.colors) {
          themeUpdate.theme = {
            ...(manifest.theme || {}),
            colors: { ...(manifest.theme?.colors || {}), ...(actionData.colors as Record<string, string>) },
          };
        }
        if (actionData?.fonts) {
          themeUpdate.theme = {
            ...((themeUpdate.theme as Record<string, unknown>) || manifest.theme || {}),
            fonts: { ...(manifest.theme?.fonts || {}), ...(actionData.fonts as Record<string, string>) },
          };
        }
        if (Object.keys(themeUpdate).length > 0) {
          actions.handleChatManifestUpdate(themeUpdate as Partial<StoryManifest>);
        }
        break;
      }

      case 'update_blocks': {
        const blocks = [...(manifest.blocks || [])];
        // Remove blocks
        if (Array.isArray(actionData?.remove)) {
          const removeIds = new Set(actionData.remove as string[]);
          const filtered = blocks.filter(b => !removeIds.has(b.id));
          actions.handleChatManifestUpdate({ blocks: filtered } as Partial<StoryManifest>);
        }
        // Add blocks
        if (Array.isArray(actionData?.add)) {
          const newBlocks = (actionData.add as Array<{ type: string; config?: Record<string, unknown> }>).map((b, i) => ({
            id: `ai-${b.type}-${Date.now()}-${i}`,
            type: b.type as import('@/types').BlockType,
            order: blocks.length + i,
            visible: true,
            config: b.config,
          }));
          actions.handleChatManifestUpdate({ blocks: [...blocks, ...newBlocks] } as Partial<StoryManifest>);
        }
        // Update block configs
        if (Array.isArray(actionData?.update)) {
          const updates = actionData.update as Array<{ id: string; config: Record<string, unknown> }>;
          const updated = blocks.map(b => {
            const u = updates.find(u2 => u2.id === b.id);
            return u ? { ...b, config: { ...b.config, ...u.config } } : b;
          });
          actions.handleChatManifestUpdate({ blocks: updated } as Partial<StoryManifest>);
        }
        break;
      }

      case 'update_events': {
        if (Array.isArray(actionData?.events)) {
          const newEvents = (actionData.events as Array<Record<string, unknown>>).map((e, i) => ({
            id: `ai-event-${Date.now()}-${i}`,
            name: (e.name as string) || 'Event',
            type: (e.type as string) || 'other',
            date: (e.date as string) || '',
            time: (e.time as string) || '',
            venue: (e.venue as string) || '',
            address: (e.address as string) || '',
            dressCode: (e.dressCode as string) || '',
            description: (e.description as string) || '',
          }));
          const existing = manifest.events || [];
          actions.handleChatManifestUpdate({ events: [...existing, ...newEvents] } as Partial<StoryManifest>);
        }
        break;
      }

      case 'update_faqs': {
        if (Array.isArray(actionData?.faqs)) {
          const newFaqs = (actionData.faqs as Array<{ question: string; answer: string }>).map((f, i) => ({
            id: `ai-faq-${Date.now()}-${i}`,
            question: f.question,
            answer: f.answer,
            order: (manifest.faqs?.length || 0) + i,
          }));
          const existing = manifest.faqs || [];
          actions.handleChatManifestUpdate({ faqs: [...existing, ...newFaqs] } as Partial<StoryManifest>);
        }
        break;
      }

      case 'update_registry': {
        const reg = manifest.registry || { enabled: true };
        const updates: Partial<StoryManifest['registry']> = { ...reg };
        if (Array.isArray(actionData?.entries)) {
          updates.entries = [...(reg.entries || []), ...(actionData.entries as Array<{ name: string; url: string; note?: string }>)];
        }
        if (actionData?.message) updates.message = actionData.message as string;
        if (actionData?.cashFundUrl) updates.cashFundUrl = actionData.cashFundUrl as string;
        if (actionData?.cashFundMessage) updates.cashFundMessage = actionData.cashFundMessage as string;
        actions.handleChatManifestUpdate({ registry: updates } as Partial<StoryManifest>);
        break;
      }

      case 'message':
      default:
        // No data changes, just the reply
        break;
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
      const msg = (e as Error).message || '';
      if (msg.includes('401')) {
        setErrorMsg('Please sign in to use AI features.');
      } else if (msg.includes('500')) {
        setErrorMsg('AI service not configured. Check your API key.');
      } else if (msg.includes('429')) {
        setErrorMsg('Too many requests. Wait a moment and try again.');
      } else {
        setErrorMsg('Could not reach AI. Check your connection and try again.');
      }
      setTimeout(() => {
        setStatus('idle');
        setErrorMsg('');
      }, 4000);
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
