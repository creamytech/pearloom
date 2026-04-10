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
import { PhotoBrowser } from '@/components/dashboard/photo-browser';

interface PearCraftsProps {
  onComplete: (manifest: any, names: [string, string], subdomain: string) => void;
  onBack: () => void;
}

interface ChatMessage {
  role: 'user' | 'pear';
  text: string;
  ts: number;
  cards?: Array<{ label: string; value: string; icon?: string }>;
  cardType?: 'occasion' | 'date' | 'venue' | 'style' | 'theme-ask' | 'theme-options' | 'photos-or-build' | 'info-card';
}

// Occasion-based default vibes for "Suggest something beautiful"
function getDefaultVibeForOccasion(occasion?: string): string {
  switch (occasion) {
    case 'wedding': return 'romantic elegant';
    case 'birthday': return 'fun colorful celebration';
    case 'anniversary': return 'timeless elegant';
    case 'engagement': return 'romantic modern';
    default: return 'elegant modern';
  }
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

If you have name(s) + date + venue, ask about their style/theme preferences next. Questions to ask:
- "Do you have any favorite colors or a color scheme in mind?"
- "What's the overall vibe you're going for?" (elegant, fun, rustic, modern, etc.)
- "Any special touches you'd love? Custom illustrations, specific imagery, a hashtag?"
- "Is there a song, quote, or phrase that's meaningful to you?"

PHOTO STORY CRAFTING:
When the user has uploaded photos and describes the moments:
- Help them organize the photos into a timeline/story chapters
- Ask about each group: "Tell me about the [month/year] photos — what was happening?"
- Confirm the chapter order: "So the story goes: [chapter 1] → [chapter 2] → [chapter 3]. Does that flow feel right?"
- Suggest chapter titles based on their descriptions
- Once you've discussed the photos, say you're ready to build

Only say you're ready to build AFTER you've gathered style preferences AND (if they added photos) discussed the photo moments. Never rush to build — the more you know, the more personal the site will be.`;
}

function hasAllRequired(c: Collected, photosDecided: boolean): boolean {
  const hasName = c.names && c.names[0];
  const needsTwoNames = c.occasion === 'wedding' || c.occasion === 'engagement';
  const namesOk = needsTwoNames ? (hasName && c.names![1]) : hasName;
  // Need occasion + names + date + style + photos decision before Build button
  return !!(c.occasion && namesOk && c.date && c.vibe && photosDecided);
}

export function PearCrafts({ onComplete, onBack }: PearCraftsProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [collected, setCollected] = useState<Collected>({});
  const [phase, setPhase] = useState<'chat' | 'style' | 'photos' | 'generating' | 'error' | 'done'>('chat');
  const [genError, setGenError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showPhotoBrowser, setShowPhotoBrowser] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [photosDecided, setPhotosDecided] = useState(false);

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

  // Use refs to always have latest state in async callbacks
  const collectedRef = useRef(collected);
  collectedRef.current = collected;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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
          message: `${getWizardPrompt(latestCollected)}\n\nConversation so far:\n${messagesRef.current.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Pear'}: ${m.text}`).join('\n')}\n\nUser says: ${userText.trim()}`,
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
      } else if (selectedPhotos.length > 0 && !photosDecided) {
        // Photos uploaded but user still discussing them — offer to build
        pearMsg.cardType = 'photos-or-build';
        pearMsg.cards = [
          { label: 'Looks great, build my site', value: 'build', icon: '✦' },
          { label: 'Tell me more about these photos', value: 'more', icon: '✦' },
        ];
      } else if (phase === 'chat' && !photosDecided) {
        // All text info collected, no photos yet — offer photos or build
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
          photos: selectedPhotos,
          vibeString: `${collected.occasion} ${collected.vibe || ''} ${collected.venue || ''}`.trim(),
          names: collected.names,
          occasion: collected.occasion,
          eventDate: collected.date,
          eventVenue: collected.venue,
          celebrationVenue: collected.venue,
          layoutFormat: 'cascade',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Generation failed (${res.status})`);
      }

      const data = await res.json();
      if (!data.manifest) throw new Error('No manifest returned');

      const n1 = (collected.names[0] || 'celebration').toLowerCase().replace(/[^a-z0-9]/g, '');
      const n2 = collected.names[1] ? collected.names[1].toLowerCase().replace(/[^a-z0-9]/g, '') : '';
      const suffix = Math.random().toString(36).slice(2, 6);
      const subdomain = n2 ? `${n1}-and-${n2}-${suffix}` : `${n1}-${suffix}`;

      setPhase('done');
      onComplete(data.manifest, collected.names, subdomain);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
      setRetryCount(prev => prev + 1);
      setPhase('error');
    }
  }, [collected, selectedPhotos, onComplete]);

  const showPreviewBar = !!(collected.occasion && collected.names && collected.names[0]);
  const readyToBuild = hasAllRequired(collected, photosDecided);

  // ── Generating overlay ────────────────────────────────────
  // ── Generating phase — cinematic build experience ─────────
  const [genStep, setGenStep] = useState(0);
  const GEN_PHASES = [
    { label: 'Understanding your vision', mascotMood: 'thinking' as const },
    { label: 'Choosing your colors and fonts', mascotMood: 'thinking' as const },
    { label: 'Designing your pages', mascotMood: 'happy' as const },
    { label: 'Writing your content', mascotMood: 'happy' as const },
    { label: 'Adding final touches', mascotMood: 'celebrating' as const },
  ];

  useEffect(() => {
    if (phase !== 'generating') { setGenStep(0); return; }
    const timers = GEN_PHASES.map((_, i) =>
      setTimeout(() => setGenStep(i), i * 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'generating') {
    const currentPhase = GEN_PHASES[genStep] || GEN_PHASES[0];
    const progress = ((genStep + 1) / GEN_PHASES.length) * 100;
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: BG_GRADIENT }}>
        {/* Soft glow behind mascot */}
        <div style={{
          position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(163,177,138,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 text-center px-6 relative z-10"
        >
          <PearMascot size={96} mood={currentPhase.mascotMood} />

          {/* Preview card showing collected info */}
          <div style={{
            padding: '16px 24px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 4px 24px rgba(43,30,20,0.06)',
            minWidth: '260px',
          }}>
            <p className="font-heading italic text-[1.3rem] text-[var(--pl-ink-soft)] leading-tight mb-1">
              {collected.names?.[0]}{collected.names?.[1] ? ` & ${collected.names[1]}` : ''}
            </p>
            <p className="text-[0.72rem] text-[var(--pl-muted)]">
              {collected.occasion} {collected.date && `\u00B7 ${new Date(collected.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </p>
          </div>

          {/* Phase label */}
          <motion.p
            key={genStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[0.92rem] font-medium text-[var(--pl-ink-soft)]"
          >
            {currentPhase.label}...
          </motion.p>

          {/* Progress bar */}
          <div style={{ width: '200px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.4)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              background: 'var(--pl-olive)', width: `${progress}%`,
              transition: 'width 0.8s ease',
            }} />
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {GEN_PHASES.map((_, i) => (
              <div key={i} style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: i <= genStep ? 'var(--pl-olive)' : 'rgba(255,255,255,0.4)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Error phase — dedicated error state with retry ────────
  if (phase === 'error') {
    const maxRetries = 3;
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: BG_GRADIENT }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 text-center px-6 max-w-md"
        >
          <PearMascot size={80} mood="thinking" />

          {/* Info card showing what was being built */}
          <div style={{
            padding: '20px 28px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 4px 24px rgba(43,30,20,0.08)',
            width: '100%',
          }}>
            <p className="text-[0.72rem] font-bold tracking-[0.1em] uppercase text-[var(--pl-muted)] mb-2">
              Your details are safe
            </p>
            <p className="font-heading italic text-[1.2rem] text-[var(--pl-ink-soft)] leading-tight mb-1">
              {collected.names?.[0]}{collected.names?.[1] ? ` & ${collected.names[1]}` : ''}
            </p>
            <p className="text-[0.75rem] text-[var(--pl-muted)]">
              {collected.occasion}{collected.date ? ` \u00B7 ${new Date(collected.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
              {collected.vibe ? ` \u00B7 ${collected.vibe}` : ''}
            </p>
          </div>

          {/* Error message */}
          <div style={{
            padding: '16px 24px', borderRadius: '16px',
            background: 'rgba(239,68,68,0.08)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(239,68,68,0.2)',
            width: '100%',
          }}>
            <p className="text-[0.85rem] font-semibold text-red-700 mb-1">
              Something went wrong
            </p>
            <p className="text-[0.78rem] text-red-600/80">
              {genError}
            </p>
          </div>

          {retryCount >= maxRetries ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <p className="text-[0.82rem] text-[var(--pl-muted)]">
                We have tried {maxRetries} times without success. Please contact support for help.
              </p>
              <button
                onClick={() => {
                  setRetryCount(0);
                  setGenError(null);
                  setPhase('chat');
                }}
                className="px-5 py-3 rounded-full text-[0.82rem] font-semibold border-none cursor-pointer transition-all"
                style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', color: 'var(--pl-ink-soft)' }}
              >
                Back to Chat
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                onClick={() => {
                  setGenError(null);
                  setPhase('chat');
                }}
                className="flex-1 px-5 py-3 rounded-full text-[0.82rem] font-semibold border-none cursor-pointer transition-all"
                style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', color: 'var(--pl-ink-soft)' }}
              >
                Back to Chat
              </button>
              <button
                onClick={handleBuild}
                className="flex-1 px-5 py-3 rounded-full text-[0.82rem] font-bold text-white border-none cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--pl-olive-deep, #6B7F5A)' }}
              >
                Try Again ({retryCount}/{maxRetries})
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Main chat UI ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: BG_GRADIENT }}>
      {/* Header — minimal, integrated */}
      <header className="shrink-0 w-full flex items-center justify-between px-4 pt-[env(safe-area-inset-top,8px)] pb-1 md:px-6 max-w-[560px]">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-full text-[0.72rem] font-semibold text-[var(--pl-muted)] bg-transparent border-none cursor-pointer hover:bg-white/30 transition-all"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <div className="flex items-center gap-2">
          <PearMascot size={22} mood={loading ? 'thinking' : 'idle'} />
          <span className="font-heading italic text-[0.88rem] text-[var(--pl-ink-soft)]">Pear</span>
        </div>
        <div className="w-[52px]" />
      </header>

      {/* Card container — centered on desktop, snug on mobile */}
      <div className="flex-1 flex flex-col w-full max-w-[560px] min-h-0 md:my-2 md:rounded-3xl md:overflow-hidden" style={{
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      } as React.CSSProperties}>

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

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-3 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.ts + '-' + i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'pear' && (
              <div className="shrink-0 mt-1">
                <PearMascot size={24} mood="greeting" />
              </div>
            )}
            <div
              className="max-w-[85%] px-4 py-3 text-[0.85rem] leading-relaxed"
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
                <div style={{
                  marginTop: '12px', padding: '16px', borderRadius: '16px',
                  background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 2px 12px rgba(43,30,20,0.04)',
                } as React.CSSProperties}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--pl-muted)', marginBottom: '10px' }}>
                    Pick a date
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {[
                      { label: 'This weekend', getValue: () => {
                        const now = new Date(); const day = now.getDay();
                        const sat = new Date(now); sat.setDate(now.getDate() + (6 - day));
                        return sat.toISOString().slice(0, 10);
                      }},
                      { label: 'Next month', getValue: () => {
                        const now = new Date();
                        const next = new Date(now.getFullYear(), now.getMonth() + 1, 15);
                        return next.toISOString().slice(0, 10);
                      }},
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          const val = preset.getValue();
                          setCollected(prev => ({ ...prev, date: val }));
                          const d = new Date(val + 'T12:00:00');
                          const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                          sendMessage(`The date is ${formatted}`, { date: val });
                        }}
                        style={{
                          padding: '8px 14px', borderRadius: '100px', fontSize: '0.78rem',
                          fontWeight: 600, border: '1px solid rgba(163,177,138,0.3)',
                          background: 'rgba(163,177,138,0.08)', color: 'var(--pl-ink)',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <label style={{ display: 'block' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--pl-muted)', fontWeight: 500, marginBottom: '4px', display: 'block' }}>Pick a date, then tap confirm</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="date"
                      id="pear-date-input"
                      onChange={() => {/* Don't auto-submit — wait for confirm */}}
                      style={{
                        padding: '10px 14px', borderRadius: '12px', fontSize: '0.88rem',
                        border: '1px solid rgba(163,177,138,0.3)', background: 'rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        color: 'var(--pl-ink)', fontFamily: 'inherit', cursor: 'pointer',
                        width: '100%', maxWidth: '220px',
                      } as React.CSSProperties}
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById('pear-date-input') as HTMLInputElement | null;
                        const val = el?.value;
                        if (val) {
                          setCollected(prev => ({ ...prev, date: val }));
                          const d = new Date(val + 'T12:00:00');
                          const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                          sendMessage(`The date is ${formatted}`, { date: val });
                        }
                      }}
                      style={{
                        padding: '10px 18px', borderRadius: '12px', fontSize: '0.82rem',
                        fontWeight: 700, border: 'none', flexShrink: 0,
                        background: 'var(--pl-olive, #A3B18A)', color: 'white',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      Confirm
                    </button>
                    </div>
                  </label>
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
                        sendMessage("I'll add the venue later", { venue: 'TBD' });
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
                          // Show inline theme-options cards instead of relying on free text
                          const themeMsg: ChatMessage = {
                            role: 'pear',
                            text: "Pick a style that speaks to you:",
                            ts: Date.now(),
                            cardType: 'theme-options',
                            cards: [
                              { label: 'Romantic & Elegant', value: 'romantic elegant', icon: '✦' },
                              { label: 'Bold & Colorful', value: 'bold colorful', icon: '✦' },
                              { label: 'Rustic & Natural', value: 'rustic natural', icon: '✦' },
                              { label: 'Modern & Minimal', value: 'modern minimal', icon: '✦' },
                              { label: 'Dark & Moody', value: 'dark moody', icon: '✦' },
                              { label: 'Whimsical & Fun', value: 'whimsical fun', icon: '✦' },
                            ],
                          };
                          setMessages(prev => [
                            ...prev,
                            { role: 'user' as const, text: "I have a theme in mind", ts: Date.now() },
                            themeMsg,
                          ]);
                        } else {
                          // "Suggest something beautiful" — pick vibe based on occasion
                          const occasionVibe = getDefaultVibeForOccasion(collectedRef.current.occasion);
                          setCollected(prev => ({ ...prev, vibe: occasionVibe }));
                          sendMessage("Pick something beautiful that matches the occasion!", { vibe: occasionVibe });
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

              {/* ── Theme options — inline style cards ── */}
              {msg.cardType === 'theme-options' && msg.cards && !collected.vibe && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {msg.cards.map((card) => (
                    <button
                      key={card.value}
                      onClick={() => {
                        setCollected(prev => ({ ...prev, vibe: card.value }));
                        sendMessage(`I'd love a ${card.label.toLowerCase()} style`, { vibe: card.value });
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

              {/* ── Style palette choice (shown when AI suggests palettes) ── */}
              {msg.cardType === 'style' && !collected.vibe && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {STYLE_PAIRS.slice(0, 3).map((pair) => (
                    <button
                      key={pair.a.name}
                      onClick={() => {
                        setCollected(prev => ({ ...prev, vibe: pair.a.name.toLowerCase() }));
                        sendMessage(`I love the ${pair.a.name} look`, { vibe: pair.a.name.toLowerCase() });
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
                          setPhotosDecided(true);
                          sendMessage("Looks great, let's build it!", { });
                        } else if (card.value === 'more') {
                          sendMessage("Tell me more about what you'd like for these photo chapters");
                        } else if (card.value === 'photos') {
                          setShowPhotoBrowser(true);
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
        {readyToBuild && !loading && !messages.some(m => m.cardType === 'photos-or-build') && (
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
      <div className="shrink-0 px-3 md:px-6 pb-[env(safe-area-inset-bottom,8px)] pt-2">
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

      </div>{/* end centered card container */}

      {/* ── Photo Browser modal overlay ── */}
      <AnimatePresence>
        {showPhotoBrowser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              background: 'rgba(232,213,196,0.85)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              display: 'flex', flexDirection: 'column',
              overflow: 'auto',
            } as React.CSSProperties}
          >
            <div style={{ flex: 1, padding: '24px 16px', overflowY: 'auto' }}>
              <PhotoBrowser
                onSelectionChange={(photos) => setSelectedPhotos(photos)}
                maxSelection={30}
              />
            </div>
            <div style={{
              display: 'flex', gap: '12px', justifyContent: 'center',
              padding: '16px 24px 28px', flexShrink: 0,
            }}>
              <button
                onClick={() => {
                  setShowPhotoBrowser(false);
                  setPhotosDecided(true);
                  setMessages(prev => [...prev, { role: 'pear', text: "No problem! You can always add photos later in the editor. Ready to build?", ts: Date.now() }]);
                }}
                style={{
                  padding: '12px 24px', borderRadius: '100px', fontSize: '0.82rem',
                  fontWeight: 600, border: '1px solid rgba(163,177,138,0.3)',
                  background: 'rgba(255,255,255,0.5)', color: 'var(--pl-muted)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                Skip photos
              </button>
              <button
                onClick={async () => {
                  setShowPhotoBrowser(false);
                  const count = selectedPhotos.length;

                  if (count === 0) {
                    setPhotosDecided(true);
                    setMessages(prev => [...prev, {
                      role: 'pear',
                      text: 'No photos selected. You can always add them later in the editor!',
                      ts: Date.now(),
                      cardType: 'photos-or-build',
                      cards: [{ label: 'Build my site', value: 'build', icon: '✦' }],
                    }]);
                    return;
                  }

                  // Analyze photos — group by date, ask about them
                  setMessages(prev => [...prev, {
                    role: 'user',
                    text: `I selected ${count} photo${count === 1 ? '' : 's'}`,
                    ts: Date.now(),
                  }]);
                  setLoading(true);

                  // Group photos by date (month/year)
                  const groups: Record<string, number> = {};
                  for (const p of selectedPhotos) {
                    const date = p.creationTime || p.mediaMetadata?.creationTime;
                    if (date) {
                      const d = new Date(date);
                      const key = `${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                      groups[key] = (groups[key] || 0) + 1;
                    }
                  }

                  const groupEntries = Object.entries(groups);
                  let analysisText = '';

                  if (groupEntries.length > 1) {
                    analysisText = `I found ${count} photos from ${groupEntries.length} different moments:\n\n`;
                    analysisText += groupEntries.map(([period, num]) => `- ${period} (${num} photo${num > 1 ? 's' : ''})`).join('\n');
                    analysisText += '\n\nThese will become chapters in your story. Can you tell me a little about each moment? What was happening? Where were you?';
                  } else if (groupEntries.length === 1) {
                    analysisText = `Beautiful! I found ${count} photos from ${groupEntries[0][0]}. Tell me about this moment — what was happening? This will help me write a more personal story.`;
                  } else {
                    analysisText = `Got ${count} beautiful photos! Tell me a little about these moments — what was happening? Where were you? The more I know, the more personal your site will be.`;
                  }

                  // Check for location data
                  const withLocation = selectedPhotos.filter(p => {
                    const loc = p.mediaMetadata?.location || p.location;
                    return loc && (loc.latitude || loc.lat);
                  });
                  if (withLocation.length > 0) {
                    analysisText += `\n\nI also detected location data in ${withLocation.length} of your photos — I'll use that to add venue details automatically.`;
                  }

                  setLoading(false);
                  setMessages(prev => [...prev, {
                    role: 'pear',
                    text: analysisText,
                    ts: Date.now(),
                  }]);
                  // Don't set photosDecided yet — let user describe the moments first
                  // After user responds, the next AI call will have the context and can offer to build
                }}
                style={{
                  padding: '12px 24px', borderRadius: '100px', fontSize: '0.82rem',
                  fontWeight: 700, border: 'none',
                  background: 'var(--pl-olive-deep, #6B7F5A)', color: 'white',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                Done with photos
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
