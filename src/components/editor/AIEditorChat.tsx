'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/AIEditorChat.tsx
// Floating AI chat assistant for inline site editing via Gemini
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoryManifest, Chapter } from '@/types';

// ── Types ──────────────────────────────────────────────────────
export interface AIEditorChatProps {
  manifest: StoryManifest;
  activeChapterId: string | null;
  onUpdateChapter: (id: string, updates: Partial<Chapter>) => void;
  onUpdateManifest: (updates: Partial<StoryManifest>) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

// ── Starter suggestion chips ───────────────────────────────────
const STARTER_CHIPS = [
  'Make this section more romantic',
  'Add a beach chapter',
  'Shorten all the descriptions',
  'Make the tagline more poetic',
];

// ── Colour tokens (inline styles using CSS vars + literals) ───
const CREAM = '#FAF7F2';
const OLIVE = '#18181B';
const PLUM  = '#71717A';
const DARK  = 'var(--pl-ink-soft, #3D3530)';

// ── Typing dots animation ──────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: PLUM, display: 'block',
          }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function AIEditorChat({
  manifest,
  activeChapterId,
  onUpdateChapter,
  onUpdateManifest,
}: AIEditorChatProps) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setThinking(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          manifest,
          activeChapterId,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const { action, data: actionData, reply } = data;

      // Apply the action
      if (action === 'update_chapter' && actionData?.id) {
        const { id, ...updates } = actionData;
        onUpdateChapter(id, updates);
      } else if (action === 'update_manifest' && actionData?.path) {
        // Handle nested path like "poetry.heroTagline" or "chapters.0.title"
        const parts = (actionData.path as string).split('.');
        // Guard: only handle 1- or 2-level paths to avoid corrupting the manifest
        if (parts.length === 2) {
          const [topKey, subKey] = parts;
          const existing = (manifest as unknown as Record<string, unknown>)[topKey] as Record<string, unknown> | undefined;
          const updated = { [topKey]: { ...(existing || {}), [subKey]: actionData.value } };
          onUpdateManifest(updated as Partial<StoryManifest>);
        } else if (parts.length === 1) {
          onUpdateManifest({ [parts[0]]: actionData.value } as Partial<StoryManifest>);
        } else {
          // 3+ level paths (e.g. chapters.0.title) — route to chapter updater when applicable
          if (parts[0] === 'chapters' && parts.length === 3) {
            const chapterIndex = parseInt(parts[1], 10);
            const fieldKey = parts[2] as keyof Chapter;
            const targetChapter = manifest.chapters?.[chapterIndex];
            if (targetChapter && !isNaN(chapterIndex)) {
              onUpdateChapter(targetChapter.id, { [fieldKey]: actionData.value } as Partial<Chapter>);
            }
          }
          // Otherwise skip unknown deep paths silently — do not corrupt the manifest
        }
      }

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'ai',
        text: reply || "Done! Let me know if you'd like anything else.",
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'ai',
          text: 'Something went wrong. Please try again in a moment.',
        },
      ]);
    } finally {
      setThinking(false);
    }
  }, [thinking, manifest, activeChapterId, onUpdateChapter, onUpdateManifest]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputVal);
    }
  };

  return (
    <>
      {/* ── Expanded chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: '5.5rem',
              right: '1.5rem',
              zIndex: 1001,
              width: 320,
              height: 420,
              borderRadius: '1rem',
              background: CREAM,
              boxShadow: '0 20px 60px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: `1px solid #E4E4E7`,
            }}
          >
            {/* Header */}
            <div style={{
              background: DARK,
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: OLIVE, fontSize: '1rem' }}>✦</span>
                <span style={{
                  color: CREAM,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  letterSpacing: '0.04em',
                  fontFamily: 'inherit',
                }}>
                  AI Site Assistant
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close AI chat"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(250,247,242,0.55)', padding: '2px', lineHeight: 1,
                  fontSize: '1.1rem', display: 'flex', alignItems: 'center',
                  transition: 'color 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.color = CREAM)}
                onMouseOut={e => (e.currentTarget.style.color = 'rgba(250,247,242,0.55)')}
              >
                ✕
              </button>
            </div>

            {/* Messages area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {messages.length === 0 && !thinking && (
                <div style={{ padding: '0.5rem 0' }}>
                  <p style={{
                    fontSize: '0.78rem',
                    color: '#8B7E74',
                    textAlign: 'center',
                    margin: '0 0 0.75rem',
                    lineHeight: 1.5,
                  }}>
                    Ask me anything about your site. I can update chapters, taglines, and more.
                  </p>
                  {/* Starter chips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {STARTER_CHIPS.map(chip => (
                      <button
                        key={chip}
                        onClick={() => sendMessage(chip)}
                        style={{
                          background: CREAM,
                          border: `1px solid rgba(212,193,155,0.7)`,
                          borderRadius: '0.5rem',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.78rem',
                          color: '#3D3530',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                          fontFamily: 'inherit',
                          lineHeight: 1.4,
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = OLIVE;
                          e.currentTarget.style.color = CREAM;
                          e.currentTarget.style.borderColor = 'transparent';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = CREAM;
                          e.currentTarget.style.color = '#3D3530';
                          e.currentTarget.style.borderColor = 'rgba(212,193,155,0.7)';
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '80%',
                      padding: '0.55rem 0.8rem',
                      borderRadius: msg.role === 'user'
                        ? '1rem 1rem 0.2rem 1rem'
                        : '1rem 1rem 1rem 0.2rem',
                      background: msg.role === 'user' ? OLIVE : CREAM,
                      color: msg.role === 'user' ? CREAM : '#2B2B2B',
                      fontSize: '0.82rem',
                      lineHeight: 1.55,
                      borderLeft: msg.role === 'ai' ? `3px solid ${PLUM}` : 'none',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      border: msg.role === 'ai'
                        ? `1px solid rgba(24,24,27,0.1)`
                        : 'none',
                      borderLeftWidth: msg.role === 'ai' ? 3 : undefined,
                      borderLeftColor: msg.role === 'ai' ? PLUM : undefined,
                      fontFamily: 'inherit',
                    }}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {thinking && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    background: CREAM,
                    border: `1px solid rgba(24,24,27,0.1)`,
                    borderLeft: `3px solid ${PLUM}`,
                    borderRadius: '1rem 1rem 1rem 0.2rem',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input row */}
            <div style={{
              flexShrink: 0,
              padding: '0.6rem',
              borderTop: `1px solid rgba(24,24,27,0.1)`,
              background: 'rgba(250,247,242,0.95)',
              display: 'flex',
              gap: '0.4rem',
              alignItems: 'center',
            }}>
              <input
                ref={inputRef}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me to edit your site…"
                disabled={thinking}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.6rem',
                  border: `1px solid #E4E4E7`,
                  color: '#18181B',
                  fontSize: '0.82rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  opacity: thinking ? 0.6 : 1,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(24,24,27,0.65)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px #F4F4F5';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = '#E4E4E7';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={() => sendMessage(inputVal)}
                disabled={thinking || !inputVal.trim()}
                aria-label="Send message"
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: '0.6rem',
                  border: 'none',
                  background: OLIVE,
                  color: CREAM,
                  cursor: thinking || !inputVal.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: thinking || !inputVal.trim() ? 0.5 : 1,
                  transition: 'opacity 0.15s, background 0.15s',
                  fontSize: '1rem',
                }}
                onMouseOver={e => {
                  if (!thinking && inputVal.trim()) {
                    e.currentTarget.style.background = '#8FA878';
                  }
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = OLIVE;
                }}
              >
                ↑
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating bubble button ── */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 1001,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: OLIVE,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)',
          color: CREAM,
          fontSize: open ? '1.2rem' : '1.35rem',
          transition: 'font-size 0.15s',
        }}
      >
        {open ? '✕' : '✦'}
      </motion.button>
    </>
  );
}
