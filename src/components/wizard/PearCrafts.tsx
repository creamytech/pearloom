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
  cardType?: 'occasion' | 'date' | 'venue' | 'style' | 'theme-ask' | 'photos-or-build' | 'info-card';
}

// Style palette pairs for the A/B style discovery
const STYLE_PAIRS = [
  { a: { name: 'Blush & Sage', colors: ['#D4A0A0', '#A3B18A', '#FAF7F2', '#3D3530'] },
    b: { name: 'Navy & Gold', colors: ['#2C3E6B', '#C4A96A', '#FAF7F2', '#1C1C1C'] } },
  { a: { name: 'Terracotta', colors: ['#C67B5C', '#E8B89D', '#FFF8F2', '#3D2E24'] },
    b: { name: 'Lavender', colors: ['#9B8EC1', '#D4A0C4', '#F8F5FD', '#2D2640'] } },
  { a: { name: 'Coastal', colors: ['#5B9BD5', '#B8D4E8', '#F0F7FF', '#1E4D8C'] },
    b: { name: 'Emerald', colors: ['#2D6A4F', '#C4A96A', '#F0F7F4', '#1C2E24'] } },
];

interface Collected {
  occasion?: string;
  names?: [string, string];
  date?: string;
  venue?: string;
  vibe?: string;
  birthYear?: number;
  turningAge?: number;
}

const BG_GRADIENT = 'linear-gradient(135deg, #E8D5C4 0%, #F2E6D9 25%, #D4B8A0 50%, #E8CDB8 75%, #F0DFD0 100%)';

function getWizardPrompt(collected: Collected): string {
  const occasion = collected.occasion || 'unknown';
  const isBirthday = occasion === 'birthday';
  const isWedding = occasion === 'wedding';
  const currentYear = new Date().getFullYear();
  const isAnniversary = occasion === 'anniversary';

  return `You are Pear, helping a user create a ${occasion} site in Pearloom's setup wizard.

ALREADY COLLECTED:
- Occasion: ${collected.occasion || '(not set)'}
- Name(s): ${collected.names ? collected.names.filter(Boolean).join(' & ') : '(not set)'}
- Date: ${collected.date || '(not set)'}
- Venue: ${collected.venue || '(not set)'}

RULES:
- NEVER mention "wedding" if the occasion is birthday/anniversary/engagement
- Extract details from the user's message: names, date (YYYY-MM-DD), venue, vibe/theme description
- Return action 'message' with data: { extracted: { occasion?, names?, date?, venue?, vibe? } }
- When the user describes a theme, colors, mood, or style preference, extract it as "vibe" (e.g., "dark moody gothic" or "bright and colorful" or "elegant minimalist")
- Ask for the NEXT missing piece warmly. The order should be: occasion → names → date → venue → theme/style
- Once you have all details including a style/theme, tell the user you're ready to build and ask if they want to add photos first
- NEVER assume you're talking TO the person being celebrated. The user might be a parent, friend, partner, or planner setting up the site for someone else. Say "the birthday person" or use their name — never "nice to meet you [name]" or "your birthday"
- When the user gives a name, acknowledge it neutrally: "Got it, the site will be for [name]!" not "Nice to meet you, [name]!"
- The current year is ${currentYear}. If the user says a month/day without a year (like "November 12"), assume ${currentYear}. If the date has already passed this year, use ${currentYear + 1}. ALWAYS return dates in YYYY-MM-DD format.

${isBirthday ? `BIRTHDAY RULES:
- Ask "What's the birthday person's name?" (ONE name, not two)
- Ask "When's the birthday?" — use the date of the upcoming birthday party, NOT their birth year
- Ask "What year were they born?" or "How old will they be turning?" to calculate age for the site
- names should be [name, ""] (single person, second name empty)
- Say "birthday" not "wedding" or "celebration"
- Don't ask for a "partner" — it's one person's birthday
- The event date should be the upcoming birthday in ${currentYear} or ${currentYear + 1}, NOT the birth year` : ''}
${isWedding ? `WEDDING RULES:
- Ask for both names (bride and groom / partner and partner)
- Ask "When's the big day?"
- names should be [name1, name2]` : ''}
${isAnniversary ? `ANNIVERSARY RULES:
- Ask for both names
- Ask "When's the anniversary?"
- Ask "How many years are you celebrating?"` : ''}

If you have name(s) + date, say you're ready to build their site.`;
}

function hasAllRequired(c: Collected): boolean {
  const hasName = c.names && c.names[0];
  // Birthdays only need one name; weddings/anniversaries need two
  const needsTwoNames = c.occasion === 'wedding' || c.occasion === 'engagement';
  const namesOk = needsTwoNames ? (hasName && c.names![1]) : hasName;
  // Need occasion + name(s) + date + style before showing Build button
  return !!(c.occasion && namesOk && c.date && c.vibe);
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
      cardType: 'occasion',
      cards: [
        { label: 'Wedding', value: 'wedding', icon: '✦' },
        { label: 'Birthday', value: 'birthday', icon: '✦' },
        { label: 'Anniversary', value: 'anniversary', icon: '✦' },
        { label: 'Engagement', value: 'engagement', icon: '✦' },
        { label: 'Other', value: 'story', icon: '✦' },
      ],
    }]);
  }, []);

  // Use ref to always have latest collected state in async callbacks
  const collectedRef = useRef(collected);
  collectedRef.current = collected;

  const sendMessage = useCallback(async (userText: string, overrideCollected?: Partial<Collected>) => {
    if (!userText.trim() || loading) return;

    // Merge any override (from card clicks that set state + send simultaneously)
    const latestCollected = { ...collectedRef.current, ...overrideCollected };

    const userMsg: ChatMessage = { role: 'user', text: userText.trim(), ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${getWizardPrompt(latestCollected)}\n\nUser says: ${userText.trim()}`,
          manifest: null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }

      const data = await res.json();
      const reply = data.reply || "I didn't quite catch that. Could you tell me more?";
      const extracted = data.data?.extracted;

      // Merge extracted fields — NEVER override already-set values
      if (extracted) {
        setCollected(prev => {
          const next = { ...prev };
          if (extracted.occasion && !prev.occasion) next.occasion = extracted.occasion;
          if (extracted.names && !prev.names?.[0]) next.names = extracted.names;
          if (extracted.date && !prev.date) {
            // Fix dates in the past — bump year to current/next
            let d = extracted.date;
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
              const parsed = new Date(d + 'T12:00:00');
              if (parsed.getTime() < Date.now()) {
                const thisYear = new Date().getFullYear();
                const bumped = new Date(parsed);
                bumped.setFullYear(thisYear);
                if (bumped.getTime() < Date.now()) bumped.setFullYear(thisYear + 1);
                d = bumped.toISOString().slice(0, 10);
              }
            }
            next.date = d;
          }
          if (extracted.venue && !prev.venue) next.venue = extracted.venue;
          if (extracted.vibe && !prev.vibe) next.vibe = extracted.vibe;
          return next;
        });
      }

      // Determine what interactive element to show next
      // Use the CURRENT collected state (already merged above via setCollected)
      const nextCollected = { ...collected };
      if (extracted?.occasion && !collected.occasion) nextCollected.occasion = extracted.occasion;
      if (extracted?.names && !collected.names?.[0]) nextCollected.names = extracted.names;
      if (extracted?.date && !collected.date) nextCollected.date = extracted.date;
      if (extracted?.venue && !collected.venue) nextCollected.venue = extracted.venue;

      const pearMsg: ChatMessage = { role: 'pear', text: reply, ts: Date.now() };

      // Determine name requirement based on occasion
      const isSoloPerson = nextCollected.occasion === 'birthday' || nextCollected.occasion === 'story';
      const hasNames = isSoloPerson
        ? !!(nextCollected.names?.[0])
        : !!(nextCollected.names?.[0] && nextCollected.names?.[1]);

      // Add contextual interactive cards — ordered by importance
      if (!nextCollected.occasion) {
        pearMsg.cards = [
          { label: 'Wedding', value: 'wedding', icon: '✦' },
          { label: 'Birthday', value: 'birthday', icon: '✦' },
          { label: 'Anniversary', value: 'anniversary', icon: '✦' },
          { label: 'Engagement', value: 'engagement', icon: '✦' },
        ];
        pearMsg.cardType = 'occasion';
      } else if (!hasNames) {
        // Names still needed — no card, just let user type
      } else if (!nextCollected.date) {
        pearMsg.cardType = 'date';
      } else if (!nextCollected.venue) {
        pearMsg.cards = [
          { label: 'Skip for now', value: 'skip', icon: '→' },
        ];
        pearMsg.cardType = 'venue';
      } else if (!nextCollected.vibe) {
        // Ask about theme/interests
        pearMsg.cardType = 'theme-ask';
        pearMsg.cards = [
          { label: 'I have a theme in mind', value: 'has-theme', icon: '✦' },
          { label: 'Suggest something beautiful', value: 'suggest', icon: '✦' },
          { label: 'Surprise me', value: 'surprise', icon: '✦' },
        ];
      } else if (phase === 'chat') {
        // All info collected — offer photos or build
        pearMsg.cardType = 'photos-or-build';
        pearMsg.cards = [
          { label: 'Add photos first', value: 'photos', icon: '✦' },
          { label: 'Build now, add photos later', value: 'build', icon: '✦' },
        ];
      }

      setMessages(prev => [...prev, pearMsg]);
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

      {/* Progressive info cards — build as you go */}
      <AnimatePresence>
        {showPreviewBar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 mx-4 md:mx-8 mb-2 rounded-2xl bg-white/50 backdrop-blur-md border border-white/40 overflow-hidden"
          >
            {/* Name + occasion header */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[0.58rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)]">
                  {collected.occasion}
                </p>
                <p className="font-heading italic text-[1.15rem] text-[var(--pl-ink-soft)] leading-tight">
                  {collected.names?.[0]}{collected.names?.[1] ? ` & ${collected.names[1]}` : ''}
                </p>
              </div>
              <PearMascot size={28} mood="happy" />
            </div>
            {/* Detail chips — appear as info is collected */}
            {(collected.date || collected.venue || collected.vibe) && (
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                {collected.date && (
                  <span className="text-[0.68rem] font-semibold px-3 py-1 rounded-full bg-[var(--pl-olive)]/10 text-[var(--pl-olive-deep)]">
                    {(() => {
                      try {
                        const d = new Date(collected.date + 'T12:00:00');
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      } catch { return collected.date; }
                    })()}
                  </span>
                )}
                {collected.venue && collected.venue !== 'TBD' && (
                  <span className="text-[0.68rem] font-semibold px-3 py-1 rounded-full bg-[var(--pl-olive)]/10 text-[var(--pl-olive-deep)]">
                    {collected.venue}
                  </span>
                )}
                {collected.vibe && (
                  <span className="text-[0.68rem] font-semibold px-3 py-1 rounded-full bg-[var(--pl-gold)]/15 text-[var(--pl-ink-soft)]">
                    {collected.vibe}
                  </span>
                )}
              </div>
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

              {/* ── Occasion cards ── */}
              {msg.cardType === 'occasion' && msg.cards && !collected.occasion && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {msg.cards.map((card) => (
                    <button
                      key={card.value}
                      onClick={() => {
                        setCollected(prev => ({ ...prev, occasion: card.value }));
                        sendMessage(`It's a ${card.label.toLowerCase()}`, { occasion: card.value });
                      }}
                      style={{
                        padding: '10px 16px', borderRadius: '100px',
                        border: '1px solid rgba(163,177,138,0.3)', background: 'rgba(255,255,255,0.6)',
                        backdropFilter: 'blur(8px)', cursor: 'pointer', fontSize: '0.82rem',
                        fontWeight: 600, color: 'var(--pl-ink, #2B1E14)', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      <span style={{ color: 'var(--pl-olive)', fontSize: '0.9rem' }}>{card.icon}</span>
                      {card.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Date picker ── */}
              {msg.cardType === 'date' && !collected.date && (
                <div style={{ marginTop: '12px' }}>
                  <input
                    type="date"
                    onChange={(e) => {
                      if (e.target.value) {
                        setCollected(prev => ({ ...prev, date: e.target.value }));
                        const d = new Date(e.target.value + 'T12:00:00');
                        const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                        sendMessage(`The date is ${formatted}`);
                      }
                    }}
                    style={{
                      padding: '10px 14px', borderRadius: '12px', fontSize: '0.88rem',
                      border: '1px solid rgba(163,177,138,0.3)', background: 'rgba(255,255,255,0.7)',
                      color: 'var(--pl-ink)', fontFamily: 'inherit', cursor: 'pointer',
                      width: '100%', maxWidth: '220px',
                    }}
                  />
                </div>
              )}

              {/* ── Venue with skip ── */}
              {msg.cardType === 'venue' && !collected.venue && msg.cards && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {msg.cards.map((card) => (
                    <button
                      key={card.value}
                      onClick={() => {
                        setCollected(prev => ({ ...prev, venue: 'TBD' }));
                        sendMessage("I'll add the venue later");
                      }}
                      style={{
                        padding: '8px 16px', borderRadius: '100px',
                        border: '1px solid rgba(163,177,138,0.2)', background: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                        color: 'var(--pl-muted)', transition: 'all 0.15s',
                      }}
                    >
                      {card.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Theme discovery — ask about interests ── */}
              {msg.cardType === 'theme-ask' && msg.cards && !collected.vibe && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {msg.cards.map((card) => (
                    <button
                      key={card.value}
                      onClick={() => {
                        if (card.value === 'surprise') {
                          setCollected(prev => ({ ...prev, vibe: 'elegant modern' }));
                          sendMessage("Surprise me with something beautiful!", { vibe: 'elegant modern' });
                        } else if (card.value === 'has-theme') {
                          sendMessage("I have a theme in mind. What kind of details do you need?");
                        } else {
                          setCollected(prev => ({ ...prev, vibe: 'curated by pear' }));
                          sendMessage("Pick something beautiful that matches the occasion!", { vibe: 'curated by pear' });
                        }
                      }}
                      style={{
                        padding: '12px 16px', borderRadius: '14px',
                        border: '1px solid rgba(163,177,138,0.25)', background: 'rgba(255,255,255,0.55)',
                        backdropFilter: 'blur(8px)', cursor: 'pointer', fontSize: '0.82rem',
                        fontWeight: 600, color: 'var(--pl-ink)', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
                      }}
                    >
                      <span style={{ color: 'var(--pl-olive)', flexShrink: 0 }}>{card.icon}</span>
                      {card.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Style palette choice (shown when AI suggests palettes) ── */}
              {msg.cardType === 'style' && !collected.vibe && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {STYLE_PAIRS.slice(0, 3).map((pair) => (
                    <button
                      key={pair.a.name}
                      onClick={() => {
                        setCollected(prev => ({ ...prev, vibe: pair.a.name.toLowerCase() }));
                        sendMessage(`I love the ${pair.a.name} look`);
                      }}
                      style={{
                        flex: 1, minWidth: '90px', padding: '10px', borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.5)',
                        backdropFilter: 'blur(8px)', cursor: 'pointer', transition: 'all 0.15s',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '6px' }}>
                        {pair.a.colors.map((c, ci) => (
                          <div key={ci} style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: c, border: '1px solid rgba(0,0,0,0.08)',
                          }} />
                        ))}
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--pl-ink)' }}>
                        {pair.a.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Photos or Build choice ── */}
              {msg.cardType === 'photos-or-build' && msg.cards && phase === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {msg.cards.map((card) => (
                    <button
                      key={card.value}
                      onClick={() => {
                        if (card.value === 'build') {
                          handleBuild();
                        } else {
                          // TODO: open photo picker
                          sendMessage("I'd like to add some photos first");
                        }
                      }}
                      style={{
                        padding: '12px 16px', borderRadius: '14px',
                        border: card.value === 'build'
                          ? '2px solid var(--pl-olive)'
                          : '1px solid rgba(163,177,138,0.25)',
                        background: card.value === 'build'
                          ? 'rgba(163,177,138,0.12)'
                          : 'rgba(255,255,255,0.55)',
                        backdropFilter: 'blur(8px)', cursor: 'pointer', fontSize: '0.82rem',
                        fontWeight: 600, color: 'var(--pl-ink)', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}
                    >
                      <span style={{ color: 'var(--pl-olive)' }}>{card.icon}</span>
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
