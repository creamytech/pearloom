'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VibeSkin } from '@/lib/vibe-engine';

interface WeddingCoordinatorProps {
  siteId: string;
  coupleNames: [string, string];
  vibeSkin: VibeSkin;
  weddingDate?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  { icon: '📍', label: 'Where is parking?' },
  { icon: '👗', label: 'Dress code?' },
  { icon: '🕐', label: 'What time?' },
  { icon: '🚌', label: 'Shuttle info?' },
];

export default function WeddingCoordinator({
  siteId,
  coupleNames,
  vibeSkin,
  weddingDate,
}: WeddingCoordinatorProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const accentColor = vibeSkin?.palette?.accent || '#7c6e64';
  const foreground = vibeSkin?.palette?.foreground || '#2d2826';

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/coordinator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          message: text.trim(),
          history: messages,
        }),
      });
      const data = await res.json();
      setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: "I'm having a moment — please check with the couple directly!" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const [name1, name2] = coupleNames;

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        aria-label="Open wedding coordinator chat"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          backgroundColor: accentColor,
          color: '#fff',
          border: 'none',
          borderRadius: '9999px',
          padding: '12px 22px',
          fontFamily: 'inherit',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        }}
      >
        <span>💬</span>
        <span>Ask our coordinator</span>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '24px',
            zIndex: 1000,
            width: 'min(380px, calc(100vw - 48px))',
            height: '500px',
            backgroundColor: 'rgba(245,241,232,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '20px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'inherit',
            color: foreground,
          }}
        >

          {/* Header */}
          <div
            style={{
              backgroundColor: accentColor,
              color: '#fff',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💬</span> Wedding Coordinator
              </div>
              <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>
                Ask anything about the big day
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close coordinator chat"
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '20px',
                lineHeight: 1,
                padding: '4px',
                opacity: 0.85,
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Welcome message */}
            <div
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#fff',
                borderRadius: '14px 14px 14px 4px',
                padding: '10px 14px',
                fontSize: '14px',
                lineHeight: 1.5,
                maxWidth: '88%',
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              }}
            >
              👋 Hi! I'm your wedding day assistant for {name1} &amp; {name2}'s celebration.
              Ask me anything about the schedule, venue, parking, or dress code!
            </div>

            {/* Suggested chips (before first message) */}
            {messages.length === 0 && (
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '12px', color: '#9a8e85', marginBottom: '8px', fontWeight: 500 }}>
                  Quick questions:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button
                      key={q.label}
                      onClick={() => sendMessage(q.label)}
                      style={{
                        backgroundColor: '#fff',
                        border: `1.5px solid ${accentColor}30`,
                        borderRadius: '20px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: foreground,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'background 0.12s ease',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span>{q.icon}</span> {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' ? '#6b7c5e' : '#fff',
                  color: msg.role === 'user' ? '#fff' : foreground,
                  borderRadius:
                    msg.role === 'user'
                      ? '14px 14px 4px 14px'
                      : '14px 14px 14px 4px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  maxWidth: '88%',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
              </motion.div>
            ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#fff',
                  borderRadius: '14px 14px 14px 4px',
                  padding: '12px 16px',
                  display: 'flex',
                  gap: '5px',
                  alignItems: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                }}
              >
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    animate={{ scale: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                    style={{
                      width: '7px',
                      height: '7px',
                      backgroundColor: accentColor,
                      borderRadius: '50%',
                      display: 'inline-block',
                    }}
                  />
                ))}
              </motion.div>
            )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              borderTop: '1px solid rgba(0,0,0,0.08)',
              padding: '12px 14px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-end',
              flexShrink: 0,
              backgroundColor: 'rgba(255,255,255,0.7)',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a question..."
              rows={1}
              style={{
                flex: 1,
                border: '1.5px solid rgba(0,0,0,0.12)',
                borderRadius: '12px',
                padding: '9px 13px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                backgroundColor: '#fff',
                color: foreground,
                lineHeight: 1.5,
                maxHeight: '100px',
                overflowY: 'auto',
              }}
            />
            <motion.button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              whileHover={loading || !input.trim() ? {} : { scale: 1.05 }}
              whileTap={loading || !input.trim() ? {} : { scale: 0.95 }}
              style={{
                backgroundColor: accentColor,
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '9px 16px',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1,
                flexShrink: 0,
                transition: 'opacity 0.12s ease',
              }}
            >
              Send →
            </motion.button>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
