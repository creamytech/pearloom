'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / PearCrafts.tsx — Conversational AI wizard
// Users chat with Pear to build their site. Extracts occasion,
// names, date, venue from conversation, then generates.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { PearMascot } from '@/components/icons/PearMascot';

interface PearCraftsProps {
  onComplete: (manifest: any, names: [string, string], subdomain: string) => void;
  onBack: () => void;
}

interface ChatMessage {
  role: 'user' | 'pear';
  text: string;
  ts: number;
  cards?: Array<{ label: string; value: string; icon?: string }>;
}

interface Collected {
  occasion?: string;
  names?: [string, string];
  date?: string;
  venue?: string;
  vibe?: string;
}

const BG_GRADIENT = 'linear-gradient(135deg, #E8D5C4 0%, #F2E6D9 25%, #D4B8A0 50%, #E8CDB8 75%, #F0DFD0 100%)';

const WIZARD_SYSTEM = `The user is in the site creation wizard. Extract any details from their message: occasion (wedding/birthday/anniversary/engagement), couple names, event date (YYYY-MM-DD), venue name. Return action 'message' with data: { extracted: { occasion?, names?, date?, venue? } } and a warm follow-up asking for the NEXT missing piece of info. If you have occasion+names+date, say you're ready to build.`;

function hasAllRequired(c: Collected): boolean {
  return !!(c.occasion && c.names && c.names[0] && c.date);
}

export function PearCrafts({ onComplete, onBack }: PearCraftsProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [collected, setCollected] = useState<Collected>({});
  const [phase, setPhase] = useState<'chat' | 'style' | 'photos' | 'generating' | 'done'>('chat');
  const [genError, setGenError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Greeting on mount
  useEffect(() => {
    setMessages([{
      role: 'pear',
      text: "Hey! I'm Pear. Tell me about your celebration and I'll build you something beautiful.",
      ts: Date.now(),
      cards: [
        { label: 'Wedding', value: 'wedding', icon: '✦' },
        { label: 'Birthday', value: 'birthday', icon: '✦' },
        { label: 'Anniversary', value: 'anniversary', icon: '✦' },
        { label: 'Engagement', value: 'engagement', icon: '✦' },
        { label: 'Other', value: 'story', icon: '✦' },
      ],
    }]);
  }, []);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: userText.trim(), ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${WIZARD_SYSTEM}\n\nUser says: ${userText.trim()}`,
          manifest: null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }

      const data = await res.json();
      const reply = data.reply || "I didn't quite catch that. Could you tell me more?";
      const extracted = data.data?.extracted;

      // Merge extracted fields
      if (extracted) {
        setCollected(prev => {
          const next = { ...prev };
          if (extracted.occasion) next.occasion = extracted.occasion;
          if (extracted.names) next.names = extracted.names;
          if (extracted.date) next.date = extracted.date;
          if (extracted.venue) next.venue = extracted.venue;
          if (extracted.vibe) next.vibe = extracted.vibe;
          return next;
        });
      }

      setMessages(prev => [...prev, { role: 'pear', text: reply, ts: Date.now() }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'pear',
        text: "Oops, I had a little hiccup. Could you try saying that again?",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleBuild = useCallback(async () => {
    if (!collected.names || !collected.occasion) return;
    setPhase('generating');
    setGenError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [],
          vibeString: collected.vibe || collected.occasion,
          names: collected.names,
          occasion: collected.occasion,
          eventDate: collected.date,
          eventVenue: collected.venue,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Generation failed (${res.status})`);
      }

      const data = await res.json();
      if (!data.manifest) throw new Error('No manifest returned');

      const n1 = (collected.names[0] || 'us').toLowerCase().replace(/[^a-z0-9]/g, '');
      const n2 = (collected.names[1] || 'together').toLowerCase().replace(/[^a-z0-9]/g, '');
      const suffix = Math.random().toString(36).slice(2, 6);
      const subdomain = `${n1}-and-${n2}-${suffix}`;

      setPhase('done');
      onComplete(data.manifest, collected.names, subdomain);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
      setPhase('chat');
    }
  }, [collected, onComplete]);

  const showPreviewBar = !!(collected.occasion && collected.names && collected.names[0]);
  const readyToBuild = hasAllRequired(collected);

  // ── Generating overlay ────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: BG_GRADIENT }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 text-center px-6"
        >
          <PearMascot size={96} mood="thinking" />
          <h2 className="font-heading italic text-[1.6rem] text-[var(--pl-ink-soft)]">
            Pear is building your site...
          </h2>
          <p className="text-[0.88rem] text-[var(--pl-muted)] max-w-[320px]">
            This usually takes 15-30 seconds. Sit tight while the magic happens.
          </p>
          <Loader2 size={24} className="text-[var(--pl-olive)] animate-spin" />
        </motion.div>
      </div>
    );
  }

  // ── Main chat UI ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: BG_GRADIENT }}>
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 md:px-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full text-[0.78rem] font-semibold text-[var(--pl-muted)] bg-white/40 backdrop-blur-md border border-white/30 cursor-pointer hover:bg-white/60 transition-all"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <span className="font-heading italic text-[1rem] text-[var(--pl-ink-soft)]">Create with Pear</span>
        <div className="w-[72px]" />
      </header>

      {/* Mini preview bar */}
      <AnimatePresence>
        {showPreviewBar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 mx-4 md:mx-8 mb-2 px-4 py-2.5 rounded-2xl bg-white/50 backdrop-blur-md border border-white/40 flex items-center justify-between"
          >
            <div>
              <p className="text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)]">
                {collected.occasion}
              </p>
              <p className="font-heading italic text-[1.1rem] text-[var(--pl-ink-soft)] leading-tight">
                {collected.names?.[0]}{collected.names?.[1] ? ` & ${collected.names[1]}` : ''}
              </p>
            </div>
            {collected.date && (
              <span className="text-[0.72rem] font-semibold text-[var(--pl-olive-deep)]">
                {collected.date}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error bar */}
      <AnimatePresence>
        {genError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="shrink-0 mx-4 md:mx-8 mb-2 px-4 py-3 rounded-2xl bg-red-50/80 backdrop-blur-md border border-red-200/60 flex items-center gap-3"
          >
            <span className="text-[0.82rem] text-red-700 flex-1">{genError}</span>
            <button
              onClick={handleBuild}
              className="px-3 py-1.5 rounded-full text-[0.72rem] font-bold text-white bg-[var(--pl-olive)] border-none cursor-pointer"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.ts + '-' + i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'pear' && (
              <div className="shrink-0 mt-1">
                <PearMascot size={36} mood="greeting" />
              </div>
            )}
            <div
              className="max-w-[75%] md:max-w-[60%] px-4 py-3 text-[0.88rem] leading-relaxed"
              style={{
                borderRadius: 16,
                background: msg.role === 'user'
                  ? 'var(--pl-olive, #A3B18A)'
                  : 'rgba(255, 255, 255, 0.55)',
                color: msg.role === 'user' ? 'white' : 'var(--pl-ink-soft, #3D3530)',
                backdropFilter: 'blur(12px)',
                border: msg.role === 'user'
                  ? 'none'
                  : '1px solid rgba(255, 255, 255, 0.4)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              {msg.text}
              {/* Inline option cards */}
              {msg.cards && !collected.occasion && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {msg.cards.map((card) => (
                    <button
                      key={card.value}
                      onClick={() => {
                        setCollected(prev => ({ ...prev, occasion: card.value }));
                        sendMessage(`It's a ${card.label.toLowerCase()}`);
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '100px',
                        border: '1px solid rgba(163,177,138,0.3)',
                        background: 'rgba(255,255,255,0.6)',
                        backdropFilter: 'blur(8px)',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--pl-ink, #2B1E14)',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ color: 'var(--pl-olive)', fontSize: '0.9rem' }}>{card.icon}</span>
                      {card.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2.5 justify-start"
          >
            <div className="shrink-0 mt-1">
              <PearMascot size={36} mood="thinking" />
            </div>
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.55)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
              }}
            >
              <Loader2 size={14} className="text-[var(--pl-olive)] animate-spin" />
              <span className="text-[0.82rem] text-[var(--pl-muted)]">Pear is typing...</span>
            </div>
          </motion.div>
        )}

        {/* Build button */}
        {readyToBuild && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center pt-2"
          >
            <button
              onClick={handleBuild}
              className="flex items-center gap-2 px-6 py-3 min-h-[48px] rounded-full text-[0.88rem] font-bold text-white border-none cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: 'var(--pl-olive-deep, #6B7F5A)' }}
            >
              <Sparkles size={16} />
              Build My Site
            </button>
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 md:px-8 pb-3 pt-2">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Tell Pear about your celebration..."
            disabled={loading}
            className="flex-1 bg-transparent border-none outline-none text-[max(16px,0.88rem)] text-[var(--pl-ink-soft)] placeholder:text-[var(--pl-muted)]"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-none cursor-pointer transition-all disabled:opacity-30"
            style={{ background: 'var(--pl-olive, #A3B18A)' }}
          >
            <Send size={15} className="text-white" />
          </button>
        </form>
        <div className="text-center mt-2 pb-1">
          <button
            onClick={onBack}
            className="text-[0.72rem] text-[var(--pl-muted)] underline bg-transparent border-none cursor-pointer hover:text-[var(--pl-ink-soft)] transition-colors"
          >
            Prefer classic setup?
          </button>
        </div>
      </div>
    </div>
  );
}
