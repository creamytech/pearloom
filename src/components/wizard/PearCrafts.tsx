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
import { LivingCanvas } from '@/components/wizard/LivingCanvas';
import { OccasionCard, NamesPreviewCard, CountdownCard, VenueMapCard, SitePreviewCard } from '@/components/wizard/WizardCards';
import { StyleDiscoveryCard, ColorPaletteCard, PhotoTimelineCard, ProgressSummaryCard, QuickChips } from '@/components/wizard/WizardCardsB';

interface PearCraftsProps {
  onComplete: (manifest: any, names: [string, string], subdomain: string) => void;
  onBack: () => void;
}

interface ChatMessage {
  role: 'user' | 'pear';
  text: string;
  ts: number;
  cards?: Array<{ label: string; value: string; icon?: string }>;
  cardType?: 'occasion' | 'date' | 'venue' | 'style' | 'theme-ask' | 'theme-options' | 'photos-or-build' | 'photo-review' | 'info-card' | 'names-preview' | 'countdown' | 'venue-map' | 'style-discovery' | 'color-palette' | 'site-preview';
  photoUrl?: string;
  photoIndex?: number;
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

CRITICAL RULE — ONE QUESTION PER MESSAGE:
You must ask EXACTLY ONE question per reply. Never stack multiple questions. Never ask "what's the venue AND what's the vibe?" — pick the single NEXT thing needed and ask only that. Keep replies short (1-3 sentences max). Acknowledge what the user just told you, then ask ONE follow-up.

RULES:
- NEVER mention "wedding" if the occasion is birthday/anniversary/engagement
- Extract details from the user's message: names, date (YYYY-MM-DD), venue, vibe/theme description
- Return action 'message' with data: { extracted: { occasion?, names?, date?, venue?, vibe? } }
- When the user describes a theme, colors, mood, or style preference, extract it as "vibe" (e.g., "dark moody gothic" or "bright and colorful" or "elegant minimalist")
- The collection order is: occasion -> names -> date -> venue -> theme/style. Ask for ONE at a time.
- Once you have all details including a style/theme, confirm the vibe enthusiastically in 1-2 sentences. Do NOT ask about photos, building, or next steps — the app handles that automatically.
- NEVER say "nice to meet you", "lovely to meet you", "how exciting for you", or anything that assumes the user IS the person being celebrated. The user might be a parent, friend, partner, or planner. When names are given, say something like "Got it, [Name] & [Name] — love that!" or "The site will be for [Name] & [Name]." NEVER greet them by their celebration names.
- When the user gives names, acknowledge briefly and immediately ask for the NEXT thing (date). Do not make it a big moment.
- The current year is ${currentYear}. If the user says a month/day without a year (like "November 12"), assume ${currentYear}. If the date has already passed this year, use ${currentYear + 1}. ALWAYS return dates in YYYY-MM-DD format.
- NEVER mention photos, uploading photos, or ask if the user wants to add photos. The app handles photo selection automatically.

${isBirthday ? `BIRTHDAY RULES:
- Ask "What's the birthday person's name?" (ONE name only)
- names should be [name, ""] (single person, second name empty)
- Say "birthday" not "wedding" or "celebration"
- Don't ask for a "partner" — it's one person's birthday
- The event date should be the upcoming birthday in ${currentYear} or ${currentYear + 1}, NOT the birth year
- Do NOT ask the birth year or turning age — it's not needed` : ''}
${isWedding ? `WEDDING RULES:
- Ask for both names (bride and groom / partner and partner)
- names should be [name1, name2]` : ''}
${isAnniversary ? `ANNIVERSARY RULES:
- Ask for both names
- Do NOT ask how many years — it's not needed for site generation` : ''}

When asking about style/vibe, ask ONE open-ended question like "What's the vibe you're going for?" and let the user describe it freely. Do not list multiple sub-questions.

PHOTO STORY CRAFTING (only applies AFTER user has already uploaded photos via the app):
When the user has uploaded photos and describes the moments:
- Help them organize the photos into a timeline/story chapters
- Ask about each group: "Tell me about the [month/year] photos — what was happening?"
- Suggest chapter titles based on their descriptions`;
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
  const [photoReviewIndex, setPhotoReviewIndex] = useState(-1); // -1 = not reviewing
  const photoReviewRef = useRef(-1);
  const selectedPhotosRef = useRef<any[]>([]);
  const [photoNotes, setPhotoNotes] = useState<Record<number, { location?: string; note?: string }>>({});
  const photosDecidedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { photoReviewRef.current = photoReviewIndex; }, [photoReviewIndex]);
  useEffect(() => { selectedPhotosRef.current = selectedPhotos; }, [selectedPhotos]);
  useEffect(() => { photosDecidedRef.current = photosDecided; }, [photosDecided]);

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
          if (extracted.names && !prev.names?.[0]) {
            // Validate names — AI sometimes returns initials or garbage
            const n = extracted.names;
            const name1 = typeof n[0] === 'string' ? n[0].trim() : '';
            const name2 = typeof n[1] === 'string' ? n[1].trim() : '';
            // Only accept names that are at least 2 characters
            if (name1.length >= 2) {
              next.names = [name1, name2.length >= 2 ? name2 : ''];
            }
          }
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
      if (extracted?.names && !collected.names?.[0]) {
        const n1 = typeof extracted.names[0] === 'string' ? extracted.names[0].trim() : '';
        const n2 = typeof extracted.names[1] === 'string' ? extracted.names[1].trim() : '';
        if (n1.length >= 2) nextCollected.names = [n1, n2.length >= 2 ? n2 : ''];
      }
      if (extracted?.date && !collected.date) nextCollected.date = extracted.date;
      if (extracted?.venue && !collected.venue) nextCollected.venue = extracted.venue;
      if (extracted?.vibe && !collected.vibe) nextCollected.vibe = extracted.vibe;

      const pearMsg: ChatMessage = { role: 'pear', text: reply, ts: Date.now() };

      // Build follow-up rich cards for newly collected data
      const followUpCards: ChatMessage[] = [];

      // Names just collected → show names preview card
      if (extracted?.names && !collected.names?.[0] && extracted.names[0]) {
        followUpCards.push({
          role: 'pear', text: '', ts: Date.now() + 1,
          cardType: 'names-preview',
        });
      }

      // Date just collected → show countdown card
      if (extracted?.date && !collected.date) {
        followUpCards.push({
          role: 'pear', text: '', ts: Date.now() + 2,
          cardType: 'countdown',
        });
      }

      // Venue just collected → show venue map card
      if (extracted?.venue && !collected.venue && extracted.venue !== 'TBD') {
        followUpCards.push({
          role: 'pear', text: '', ts: Date.now() + 3,
          cardType: 'venue-map',
        });
      }

      // Vibe just collected → show site preview card
      if (extracted?.vibe && !collected.vibe) {
        followUpCards.push({
          role: 'pear', text: '', ts: Date.now() + 4,
          cardType: 'site-preview',
        });
      }

      // Determine name requirement based on occasion
      const isSoloPerson = nextCollected.occasion === 'birthday' || nextCollected.occasion === 'story';
      const hasNames = isSoloPerson
        ? !!(nextCollected.names?.[0])
        : !!(nextCollected.names?.[0] && nextCollected.names?.[1]);

      // If reviewing photos, advance to next photo after user describes one
      const currentReviewIdx = photoReviewRef.current;
      const currentPhotos = selectedPhotosRef.current;
      if (currentReviewIdx >= 0 && currentReviewIdx < currentPhotos.length - 1) {
        const nextIdx = currentReviewIdx + 1;
        const nextPhoto = currentPhotos[nextIdx];
        const nextUrl = nextPhoto?.baseUrl || nextPhoto?.url || nextPhoto?.uri || '';
        const nextDate = nextPhoto?.mediaMetadata?.creationTime || nextPhoto?.creationTime;
        const nextLoc = nextPhoto?.mediaMetadata?.location || nextPhoto?.location;
        const hasNextLoc = nextLoc && (nextLoc.latitude || nextLoc.lat);

        // First add AI's response to current photo
        setMessages(prev => [...prev, pearMsg]);

        // Then show next photo with location if available
        let nextMsg = `Next photo (${nextIdx + 1} of ${currentPhotos.length}):`;
        if (nextDate) {
          const d = new Date(nextDate);
          nextMsg += ` From ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`;
        }
        if (hasNextLoc) {
          try {
            const lat = nextLoc.latitude || nextLoc.lat;
            const lng = nextLoc.longitude || nextLoc.lng;
            const geoRes = await fetch(`/api/suggest-location?lat=${lat}&lng=${lng}`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.label) nextMsg += ` Taken in ${geoData.label}.`;
            }
          } catch { /* ignore */ }
        } else {
          nextMsg += '\nWhere was this taken?';
        }
        nextMsg += '\nWhat was happening here?';

        setPhotoReviewIndex(nextIdx);
        setMessages(prev => [...prev, {
          role: 'pear', text: nextMsg, ts: Date.now(),
          cardType: 'photo-review',
          photoUrl: nextUrl ? (nextUrl.includes('googleusercontent') ? `/api/photos/proxy?url=${encodeURIComponent(nextUrl)}&w=400&h=300` : nextUrl) : undefined,
          photoIndex: nextIdx,
          cards: nextIdx < selectedPhotos.length - 1 ? [{ label: 'Skip', value: 'skip', icon: '→' }] : [],
        }]);
        return; // Don't add the normal card logic
      } else if (currentReviewIdx >= 0 && currentReviewIdx >= currentPhotos.length - 1) {
        // Last photo reviewed
        setPhotoReviewIndex(-1);
        setPhotosDecided(true);
        setMessages(prev => [...prev, pearMsg, {
          role: 'pear',
          text: "I've got a beautiful picture of your story now. Ready to build your site?",
          ts: Date.now(),
          cardType: 'photos-or-build',
          cards: [{ label: 'Build my site', value: 'build', icon: '✦' }],
        }]);
        return;
      }

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
      } else if (selectedPhotosRef.current.length > 0 && !photosDecidedRef.current) {
        // Photos uploaded but user still discussing them — offer to build
        pearMsg.cardType = 'photos-or-build';
        pearMsg.cards = [
          { label: 'Looks great, build my site', value: 'build', icon: '✦' },
          { label: 'Tell me more about these photos', value: 'more', icon: '✦' },
        ];
      } else if (!photosDecidedRef.current) {
        // All text info collected, no photos yet — auto-open photo browser
        // Don't append text to AI response — just open the browser
        setTimeout(() => setShowPhotoBrowser(true), 600);
      }

      setMessages(prev => [...prev, pearMsg, ...followUpCards]);
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
    const c = collectedRef.current;
    const photos = selectedPhotosRef.current;
    if (!c.names || !c.occasion) return;
    setPhase('generating');
    setGenError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos,
          vibeString: `${c.occasion} ${c.vibe || ''} ${c.venue || ''}`.trim(),
          names: c.names,
          occasion: c.occasion,
          eventDate: c.date,
          eventVenue: c.venue,
          celebrationVenue: c.venue,
          layoutFormat: 'cascade',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Generation failed (${res.status})`);
      }

      const data = await res.json();
      if (!data.manifest) throw new Error('No manifest returned');

      const n1 = (c.names[0] || 'celebration').toLowerCase().replace(/[^a-z0-9]/g, '');
      const n2 = c.names[1] ? c.names[1].toLowerCase().replace(/[^a-z0-9]/g, '') : '';
      const suffix = Math.random().toString(36).slice(2, 6);
      const subdomain = n2 ? `${n1}-and-${n2}-${suffix}` : `${n1}-${suffix}`;

      setPhase('done');
      onComplete(data.manifest, c.names, subdomain);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
      setRetryCount(prev => prev + 1);
      setPhase('error');
    }
  }, [onComplete]);

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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
        <LivingCanvas occasion={collected.occasion} names={collected.names} date={collected.date} venue={collected.venue} vibe={collected.vibe} photoCount={selectedPhotos.length} phase="generating" />
        {/* Soft glow behind mascot */}
        <div style={{
          position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(163,177,138,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none', zIndex: 1,
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
        <LivingCanvas occasion={collected.occasion} names={collected.names} date={collected.date} venue={collected.venue} vibe={collected.vibe} photoCount={selectedPhotos.length} phase="chat" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 text-center px-6 max-w-md relative z-10"
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
    <div className="fixed inset-0 z-50 flex flex-col items-center">
      <LivingCanvas occasion={collected.occasion} names={collected.names} date={collected.date} venue={collected.venue} vibe={collected.vibe} photoCount={selectedPhotos.length} phase="chat" />
      {/* Header — minimal, integrated */}
      <header className="shrink-0 w-full flex items-center justify-between px-4 pt-[env(safe-area-inset-top,8px)] pb-1 md:px-6 max-w-[560px] relative z-10">
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
      <div className="flex-1 flex flex-col w-full max-w-[560px] min-h-0 md:my-2 md:rounded-3xl md:overflow-hidden relative z-10" style={{
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      } as React.CSSProperties}>

      {/* Progress summary card — collapsible with edit */}
      <AnimatePresence>
        {showPreviewBar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 mx-4 md:mx-8 mb-2"
          >
            <ProgressSummaryCard
              collected={collected}
              onEdit={(field) => {
                // Clear the field so user can re-enter it
                setCollected(prev => ({ ...prev, [field]: undefined }));
                const fieldLabels: Record<string, string> = {
                  occasion: 'occasion', names: 'names', date: 'date', venue: 'venue', vibe: 'style',
                };
                sendMessage(`I want to change the ${fieldLabels[field] || field}`);
              }}
            />
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

              {/* ── Occasion cards — rich animated grid ── */}
              {msg.cardType === 'occasion' && !collected.occasion && (
                <div style={{ marginTop: '12px' }}>
                  <OccasionCard
                    occasions={[
                      { label: 'Wedding', value: 'wedding', icon: 'ring' },
                      { label: 'Birthday', value: 'birthday', icon: 'cake' },
                      { label: 'Anniversary', value: 'anniversary', icon: 'star' },
                      { label: 'Engagement', value: 'engagement', icon: 'diamond' },
                      { label: 'Other', value: 'story', icon: 'book' },
                    ]}
                    onSelect={(value) => {
                      const label = ['Wedding','Birthday','Anniversary','Engagement','Other'].find(
                        (_, i) => ['wedding','birthday','anniversary','engagement','story'][i] === value
                      ) || value;
                      setCollected(prev => ({ ...prev, occasion: value }));
                      sendMessage(`It's a ${label.toLowerCase()}`, { occasion: value });
                    }}
                  />
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

              {/* ── Theme discovery — style discovery carousel ── */}
              {msg.cardType === 'theme-ask' && !collected.vibe && (
                <div style={{ marginTop: '12px' }}>
                  <StyleDiscoveryCard
                    pairs={STYLE_PAIRS}
                    names={collected.names}
                    onSelect={(style) => {
                      setCollected(prev => ({ ...prev, vibe: style.name.toLowerCase() }));
                      sendMessage(`I love the ${style.name} style`, { vibe: style.name.toLowerCase() });
                    }}
                  />
                  {/* Also allow free text */}
                  <button
                    onClick={() => {
                      const occasionVibe = getDefaultVibeForOccasion(collectedRef.current.occasion);
                      setCollected(prev => ({ ...prev, vibe: occasionVibe }));
                      sendMessage("Surprise me with something beautiful!", { vibe: occasionVibe });
                    }}
                    style={{
                      marginTop: '8px', padding: '10px 16px', borderRadius: '100px', width: '100%',
                      border: '1px solid rgba(163,177,138,0.2)', background: 'rgba(255,255,255,0.4)',
                      backdropFilter: 'blur(8px)', cursor: 'pointer', fontSize: '0.78rem',
                      fontWeight: 600, color: 'var(--pl-muted)', transition: 'all 0.15s',
                    }}
                  >
                    Surprise me instead
                  </button>
                </div>
              )}

              {/* ── Theme options — color palette cards ── */}
              {msg.cardType === 'theme-options' && !collected.vibe && (
                <div style={{ marginTop: '12px' }}>
                  <ColorPaletteCard
                    palettes={[
                      { name: 'Romantic & Elegant', colors: ['#F2D1D1', '#E8B4C8', '#C4A96A', '#FAF7F2'], description: 'Soft blush with golden accents' },
                      { name: 'Bold & Colorful', colors: ['#FF6B6B', '#FFC857', '#5BCEFA', '#F472B6'], description: 'Vibrant and eye-catching' },
                      { name: 'Rustic & Natural', colors: ['#D4A574', '#A8B890', '#C8B896', '#8B6F47'], description: 'Earthy warmth and greenery' },
                      { name: 'Modern & Minimal', colors: ['#F5F5F0', '#E8E4DC', '#D4CFC4', '#3D3530'], description: 'Clean lines, neutral tones' },
                      { name: 'Dark & Moody', colors: ['#2D2B33', '#4A3F54', '#7C3AED', '#C4A96A'], description: 'Dramatic and sophisticated' },
                    ]}
                    onSelect={(palette) => {
                      setCollected(prev => ({ ...prev, vibe: palette.name.toLowerCase() }));
                      sendMessage(`I love the ${palette.name} palette`, { vibe: palette.name.toLowerCase() });
                    }}
                  />
                </div>
              )}

              {/* ── Photos or Build choice ── */}
              {/* ── Photo review — show actual photo ── */}
              {msg.cardType === 'photo-review' && msg.photoUrl && (
                <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.4)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={msg.photoUrl}
                    alt={`Photo ${(msg.photoIndex ?? 0) + 1}`}
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--pl-muted)' }}>
                      Photo {(msg.photoIndex ?? 0) + 1} of {selectedPhotos.length}
                    </span>
                    {msg.cards && msg.cards.length > 0 && photoReviewIndex === msg.photoIndex && (
                      <button
                        onClick={() => {
                          // Skip to next photo
                          const nextIdx = (msg.photoIndex ?? 0) + 1;
                          if (nextIdx < selectedPhotos.length) {
                            const nextPhoto = selectedPhotos[nextIdx];
                            const nextUrl = nextPhoto?.baseUrl || nextPhoto?.url || nextPhoto?.uri || '';
                            const nextDate = nextPhoto?.mediaMetadata?.creationTime || nextPhoto?.creationTime;
                            const nextLoc = nextPhoto?.mediaMetadata?.location || nextPhoto?.location;
                            const hasNextLoc = nextLoc && (nextLoc.latitude || nextLoc.lat);

                            let nextMsg = '';
                            if (nextDate) {
                              const d = new Date(nextDate);
                              nextMsg += `This one is from ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`;
                            }
                            nextMsg += hasNextLoc ? ' I see location data on this one.' : '\nWhere was this taken?';
                            nextMsg += '\nWhat was happening in this moment?';

                            setPhotoReviewIndex(nextIdx);
                            setMessages(prev => [...prev, {
                              role: 'pear', text: nextMsg, ts: Date.now(),
                              cardType: 'photo-review',
                              photoUrl: nextUrl ? (nextUrl.includes('googleusercontent') ? `/api/photos/proxy?url=${encodeURIComponent(nextUrl)}&w=400&h=300` : nextUrl) : undefined,
                              photoIndex: nextIdx,
                              cards: nextIdx < selectedPhotos.length - 1 ? [{ label: 'Skip', value: 'skip', icon: '→' }] : [],
                            }]);
                          } else {
                            // All photos reviewed
                            setPhotosDecided(true);
                            setMessages(prev => [...prev, {
                              role: 'pear',
                              text: "That's all your photos! I have a great picture of your story now. Ready to build your site?",
                              ts: Date.now(),
                              cardType: 'photos-or-build',
                              cards: [{ label: 'Build my site', value: 'build', icon: '✦' }],
                            }]);
                          }
                        }}
                        style={{
                          padding: '4px 12px', borderRadius: '100px', fontSize: '0.68rem',
                          fontWeight: 600, border: '1px solid rgba(163,177,138,0.3)',
                          background: 'rgba(255,255,255,0.5)', color: 'var(--pl-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        {(msg.photoIndex ?? 0) < selectedPhotos.length - 1 ? 'Skip to next' : 'Done reviewing'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {msg.cardType === 'photos-or-build' && msg.cards && phase === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {msg.cards.map((card) => (
                    <button
                      key={card.value}
                      onClick={() => {
                        if (card.value === 'build') {
                          setPhotosDecided(true);
                          handleBuild();
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

              {/* ── Names preview card ── */}
              {msg.cardType === 'names-preview' && collected.names?.[0] && (
                <div style={{ marginTop: '8px' }}>
                  <NamesPreviewCard names={collected.names} occasion={collected.occasion} />
                </div>
              )}

              {/* ── Countdown card ── */}
              {msg.cardType === 'countdown' && collected.date && (
                <div style={{ marginTop: '8px' }}>
                  <CountdownCard date={collected.date} names={collected.names} occasion={collected.occasion} />
                </div>
              )}

              {/* ── Venue map card ── */}
              {msg.cardType === 'venue-map' && collected.venue && collected.venue !== 'TBD' && (
                <div style={{ marginTop: '8px' }}>
                  <VenueMapCard
                    venue={collected.venue}
                    onConfirm={() => {/* already confirmed by AI extraction */}}
                    onEdit={() => {
                      setCollected(prev => ({ ...prev, venue: undefined }));
                      sendMessage("I want to change the venue");
                    }}
                  />
                </div>
              )}

              {/* ── Site preview card — wow moment before build ── */}
              {msg.cardType === 'site-preview' && collected.names?.[0] && (
                <div style={{ marginTop: '8px' }}>
                  <SitePreviewCard
                    names={collected.names}
                    occasion={collected.occasion}
                    date={collected.date}
                    vibe={collected.vibe}
                    venue={collected.venue}
                  />
                </div>
              )}

              {/* ── Style discovery (alternate cardType) ── */}
              {msg.cardType === 'style-discovery' && !collected.vibe && (
                <div style={{ marginTop: '8px' }}>
                  <StyleDiscoveryCard
                    pairs={STYLE_PAIRS}
                    names={collected.names}
                    onSelect={(style) => {
                      setCollected(prev => ({ ...prev, vibe: style.name.toLowerCase() }));
                      sendMessage(`I love the ${style.name} style`, { vibe: style.name.toLowerCase() });
                    }}
                  />
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

      {/* Quick suggestion chips — contextual */}
      {(() => {
        const chips: { label: string; value: string }[] = [];
        if (!collected.occasion) {
          // No chips needed — occasion cards handle this
        } else if (!collected.names?.[0]) {
          // No chips — user needs to type names
        } else if (!collected.date) {
          chips.push({ label: 'This weekend', value: 'this-weekend' });
          chips.push({ label: 'Next month', value: 'next-month' });
          chips.push({ label: "Haven't decided yet", value: 'tbd-date' });
        } else if (!collected.venue) {
          chips.push({ label: "Skip for now", value: 'skip-venue' });
          chips.push({ label: "It's at home", value: 'at-home' });
          chips.push({ label: "Still looking", value: 'tbd-venue' });
        } else if (!collected.vibe) {
          chips.push({ label: 'Romantic', value: 'romantic elegant' });
          chips.push({ label: 'Modern', value: 'modern minimal' });
          chips.push({ label: 'Rustic', value: 'rustic natural' });
          chips.push({ label: 'Bold', value: 'bold colorful' });
          chips.push({ label: 'Surprise me', value: 'surprise' });
        }
        if (chips.length === 0) return null;
        return (
          <div className="shrink-0 px-3 md:px-6">
            <QuickChips
              chips={chips}
              onSelect={(value) => {
                if (value === 'this-weekend') {
                  const now = new Date(); const day = now.getDay();
                  const sat = new Date(now); sat.setDate(now.getDate() + (6 - day));
                  const d = sat.toISOString().slice(0, 10);
                  setCollected(prev => ({ ...prev, date: d }));
                  sendMessage(`This weekend — ${sat.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`, { date: d });
                } else if (value === 'next-month') {
                  const next = new Date(); next.setMonth(next.getMonth() + 1, 15);
                  const d = next.toISOString().slice(0, 10);
                  setCollected(prev => ({ ...prev, date: d }));
                  sendMessage(`Next month — ${next.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, { date: d });
                } else if (value === 'tbd-date') {
                  const fallback = new Date(); fallback.setMonth(fallback.getMonth() + 3, 1);
                  const d = fallback.toISOString().slice(0, 10);
                  setCollected(prev => ({ ...prev, date: d }));
                  sendMessage("Haven't decided on a date yet", { date: d });
                } else if (value === 'skip-venue' || value === 'tbd-venue') {
                  setCollected(prev => ({ ...prev, venue: 'TBD' }));
                  sendMessage("I'll add the venue later", { venue: 'TBD' });
                } else if (value === 'at-home') {
                  setCollected(prev => ({ ...prev, venue: 'At home' }));
                  sendMessage("It's at home", { venue: 'At home' });
                } else if (value === 'surprise') {
                  const v = getDefaultVibeForOccasion(collectedRef.current.occasion);
                  setCollected(prev => ({ ...prev, vibe: v }));
                  sendMessage("Surprise me with something beautiful!", { vibe: v });
                } else {
                  // Direct vibe value
                  setCollected(prev => ({ ...prev, vibe: value }));
                  sendMessage(`I'd love a ${value} style`, { vibe: value });
                }
              }}
            />
          </div>
        );
      })()}

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
                  setMessages(prev => [...prev, {
                    role: 'pear',
                    text: "No problem! You can always add photos later in the editor. Ready to build?",
                    ts: Date.now(),
                    cardType: 'photos-or-build',
                    cards: [{ label: 'Build my site', value: 'build', icon: '✦' }],
                  }]);
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

                  // Start photo-by-photo review
                  setMessages(prev => [...prev, {
                    role: 'user',
                    text: `I selected ${count} photo${count === 1 ? '' : 's'}`,
                    ts: Date.now(),
                  }]);

                  // Get photo URL for first photo
                  const firstPhoto = selectedPhotos[0];
                  const firstUrl = firstPhoto?.baseUrl || firstPhoto?.url || firstPhoto?.uri || '';
                  const firstDate = firstPhoto?.mediaMetadata?.creationTime || firstPhoto?.creationTime;
                  const firstLoc = firstPhoto?.mediaMetadata?.location || firstPhoto?.location;
                  const hasLoc = firstLoc && (firstLoc.latitude || firstLoc.lat);

                  let firstMsg = `Let's go through your photos one by one so I can craft the perfect story.`;
                  if (firstDate) {
                    const d = new Date(firstDate);
                    firstMsg += `\n\nThis one was taken ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`;
                  }
                  if (hasLoc) {
                    const lat = firstLoc.latitude || firstLoc.lat;
                    const lng = firstLoc.longitude || firstLoc.lng;
                    // Try to get a readable location via reverse geocode
                    try {
                      const geoRes = await fetch(`/api/suggest-location?lat=${lat}&lng=${lng}`);
                      if (geoRes.ok) {
                        const geoData = await geoRes.json();
                        if (geoData.label) {
                          firstMsg += ` Looks like it was taken in ${geoData.label}.`;
                        } else {
                          firstMsg += ` I detected a location for this photo.`;
                        }
                      }
                    } catch {
                      firstMsg += ` I detected a location for this photo.`;
                    }
                  } else {
                    firstMsg += `\n\nWhere was this taken?`;
                  }
                  firstMsg += `\n\nTell me about this moment — what was happening here?`;

                  setPhotoReviewIndex(0);
                  setMessages(prev => [...prev, {
                    role: 'pear',
                    text: firstMsg,
                    ts: Date.now(),
                    cardType: 'photo-review',
                    photoUrl: firstUrl ? (firstUrl.includes('googleusercontent') ? `/api/photos/proxy?url=${encodeURIComponent(firstUrl)}&w=400&h=300` : firstUrl) : undefined,
                    photoIndex: 0,
                    cards: count > 1 ? [
                      { label: 'Skip this photo', value: 'skip', icon: '→' },
                    ] : [],
                  }]);
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
