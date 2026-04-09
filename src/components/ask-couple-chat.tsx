'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/ask-couple-chat.tsx
// Floating chat button → AI chatbot that speaks AS the couple.
// Trained on their real texts. Guests ask anything.
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { WeddingRingsIcon } from '@/components/icons/PearloomIcons';
import type { VibeSkin } from '@/lib/vibe-engine';

interface Message {
  role: 'user' | 'couple';
  text: string;
}

interface AskCoupleChatProps {
  siteId: string;
  coupleNames: [string, string];
  vibeSkin?: VibeSkin;
}

/** Three-dot bouncing typing indicator */
function TypingDots() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', justifyContent: 'flex-start' }}
    >
      <div
        style={{
          padding: '0.65rem 0.9rem',
          borderRadius: '0.25rem 1rem 1rem 1rem',
          background: 'var(--pl-cream-deep)',
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.14 }}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--pl-olive)',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function AskCoupleChat({ siteId, coupleNames, vibeSkin }: AskCoupleChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [name1, name2] = coupleNames;
  void vibeSkin; // reserved

  // Opening greeting
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'couple',
          text: `Hey! It's ${name1} & ${name2}. So excited you're here! Ask us anything about the wedding.`,
        },
      ]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || typing) return;
    setInput('');

    const userMsg: Message = { role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    try {
      const res = await fetch('/api/ask-couple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          question: q,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      // Simulate typing delay for realism
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
      setMessages((prev) => [...prev, { role: 'couple', text: data.answer }]);
      // Set suggestions from API (only on first message)
      if (data.suggestions && suggestions.length === 0) {
        setSuggestions(data.suggestions);
      } else if (suggestions.length > 0) {
        setSuggestions([]); // clear after first interaction
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'couple', text: `We'll catch up at the wedding!` },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 3, type: 'spring', stiffness: 200, damping: 20 }}
        onClick={() => setOpen(true)}
        aria-label="Ask the couple"
        style={{
          position: 'fixed',
          bottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
          right: '1.5rem',
          zIndex: 100,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--pl-olive)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(43,43,43,0.18)',
          color: '#fff',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <WeddingRingsIcon size={22} color="#fff" />
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
              right: '1.5rem',
              zIndex: 99,
              width: 'min(380px, calc(100vw - 3rem))',
              maxHeight: '560px',
              background: '#F5F1E8',
              borderRadius: '1.5rem',
              boxShadow:
                '0 24px 80px rgba(43,43,43,0.15), 0 8px 24px rgba(43,43,43,0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'var(--pl-olive)',
                color: '#fff',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--pl-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <WeddingRingsIcon size={20} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-heading)',
                    fontSize: '1rem',
                    fontWeight: 400,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Ask Us Anything
                </div>
                <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.1rem' }}>
                  {typing
                    ? 'typing...'
                    : 'Powered by Pear, trained on our story'}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--pl-ink)',
                  display: 'flex',
                  padding: '0.25rem',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '0.7rem 1rem',
                      borderRadius:
                        msg.role === 'user'
                          ? '1rem 1rem 0.25rem 1rem'
                          : '0.25rem 1rem 1rem 1rem',
                      background:
                        msg.role === 'user'
                          ? 'var(--pl-olive)'
                          : 'var(--pl-cream-deep)',
                      color: msg.role === 'user' ? '#fff' : 'var(--pl-ink)',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Bouncing dots typing indicator */}
              {typing && <TypingDots />}

              <div ref={bottomRef} />
            </div>

            {/* Suggested question chips */}
            {suggestions.length > 0 && !typing && (
              <div
                style={{
                  padding: '0.5rem 1rem 0',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                }}
              >
                {suggestions.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => {
                      setInput(s);
                      setSuggestions([]);
                      // Auto-send after a tick
                      setTimeout(() => {
                        const userMsg: Message = { role: 'user', text: s };
                        setMessages((prev) => [...prev, userMsg]);
                        setTyping(true);
                        setInput('');
                        fetch('/api/ask-couple', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ siteId, question: s, history: messages.map((m) => ({ role: m.role, text: m.text })) }),
                        })
                          .then(r => r.json())
                          .then(async (data) => {
                            await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
                            setMessages((prev) => [...prev, { role: 'couple', text: data.answer }]);
                          })
                          .catch(() => {
                            setMessages((prev) => [...prev, { role: 'couple', text: "We'll catch up at the wedding!" }]);
                          })
                          .finally(() => setTyping(false));
                      }, 50);
                    }}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '100px',
                      border: '1.5px solid rgba(0,0,0,0.08)',
                      background: 'var(--pl-cream)',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      color: 'var(--pl-ink)',
                      fontFamily: 'var(--pl-font-body)',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                    whileHover={{ scale: 1.03, borderColor: 'var(--pl-olive)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Pill-shaped input bar */}
            <div
              style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                background: '#fff',
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={`Ask ${name1} & ${name2}...`}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  borderRadius: '100px',
                  border: '1.5px solid rgba(0,0,0,0.08)',
                  background: 'var(--pl-cream)',
                  fontSize: 'max(16px, 0.875rem)',
                  outline: 'none',
                  fontFamily: 'var(--pl-font-body)',
                  color: 'var(--pl-ink)',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--pl-olive)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0,0,0,0.08)';
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || typing}
                aria-label="Send message"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background:
                    !input.trim() || typing
                      ? 'rgba(0,0,0,0.06)'
                      : 'var(--pl-olive)',
                  border: 'none',
                  cursor: !input.trim() || typing ? 'not-allowed' : 'pointer',
                  color: !input.trim() || typing ? 'var(--pl-muted)' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
