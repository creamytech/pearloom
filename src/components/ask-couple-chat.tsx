'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/ask-couple-chat.tsx
// Floating chat button → AI chatbot that speaks AS the couple.
// Trained on their real texts. Guests ask anything.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleHeart, X, Send, Loader2 } from 'lucide-react';
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

export function AskCoupleChat({ siteId, coupleNames, vibeSkin }: AskCoupleChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [name1, name2] = coupleNames;
  const accentColor = 'var(--eg-accent)';
  const motif = vibeSkin?.accentSymbol || '♡';

  // Opening greeting
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'couple',
        text: `Hey!! 👋 It's ${name1} & ${name2}. So excited you're here! Ask us anything about the wedding 💕`,
      }]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || typing) return;
    setInput('');

    const userMsg: Message = { role: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    try {
      const res = await fetch('/api/ask-couple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          question: q,
          history: messages.map(m => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      // Simulate typing delay for realism
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
      setMessages(prev => [...prev, { role: 'couple', text: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'couple', text: `We'll catch up at the wedding! ${motif}` }]);
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
        style={{
          position: 'fixed',
          bottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
          right: '1.5rem',
          zIndex: 100,
          width: '56px', height: '56px', borderRadius: '50%',
          background: `linear-gradient(135deg, var(--eg-accent), var(--eg-accent)cc)`,
          border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          color: '#fff',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircleHeart size={24} />
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
              width: 'min(360px, calc(100vw - 3rem))',
              maxHeight: '520px',
              background: '#fff',
              borderRadius: '1.5rem',
              boxShadow: '0 24px 80px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: `linear-gradient(135deg, var(--eg-accent), var(--eg-accent)dd)`,
              color: '#fff',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem',
              }}>
                {motif}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{name1} & {name2}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                  {typing ? 'typing…' : 'Usually replies instantly ⚡'}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '1rem',
              display: 'flex', flexDirection: 'column', gap: '0.75rem',
            }}>
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
                  <div style={{
                    maxWidth: '80%',
                    padding: '0.65rem 0.9rem',
                    borderRadius: msg.role === 'user'
                      ? '1rem 1rem 0.25rem 1rem'
                      : '0.25rem 1rem 1rem 1rem',
                    background: msg.role === 'user'
                      ? 'var(--eg-fg)'
                      : 'rgba(0,0,0,0.05)',
                    color: msg.role === 'user' ? '#fff' : 'var(--eg-fg)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                  }}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {typing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '0.65rem 0.9rem', borderRadius: '0.25rem 1rem 1rem 1rem',
                    background: 'rgba(0,0,0,0.05)', display: 'flex', gap: '4px', alignItems: 'center',
                  }}>
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--eg-accent)' }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', gap: '0.5rem', alignItems: 'center',
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={`Ask ${name1} & ${name2}…`}
                style={{
                  flex: 1, padding: '0.6rem 0.85rem', borderRadius: '100px',
                  border: '1.5px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)',
                  fontSize: '0.875rem', outline: 'none', fontFamily: 'var(--eg-font-body)',
                  color: 'var(--eg-fg)',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || typing}
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: !input.trim() || typing ? 'rgba(0,0,0,0.08)' : 'var(--eg-accent)',
                  border: 'none', cursor: 'pointer', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}
              >
                {typing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
