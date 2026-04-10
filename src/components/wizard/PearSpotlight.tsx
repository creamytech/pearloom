'use client';

// Spotlight UI — single centered card, large Pear mascot, step-by-step

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, ArrowLeft } from 'lucide-react';
import { PearMascot } from '@/components/icons/PearMascot';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { LivingCanvas } from '@/components/wizard/LivingCanvas';
import { OccasionCard, SitePreviewCard } from '@/components/wizard/WizardCards';
import { StyleDiscoveryCard, ColorPaletteCard } from '@/components/wizard/WizardCardsB';

interface PearSpotlightProps {
  onComplete: (manifest: any, names: [string, string], subdomain: string) => void;
  onBack: () => void;
}

interface Collected {
  occasion?: string;
  names?: [string, string];
  date?: string;
  venue?: string;
  vibe?: string;
}

type Step = 'occasion' | 'names' | 'date' | 'venue' | 'vibe' | 'photos' | 'ready';

const STYLE_PAIRS = [
  { a: { name: 'Blush & Sage', colors: ['#D4A0A0', '#A3B18A', '#FAF7F2', '#3D3530'] },
    b: { name: 'Navy & Gold', colors: ['#2C3E6B', '#C4A96A', '#FAF7F2', '#1C1C1C'] } },
  { a: { name: 'Terracotta', colors: ['#C67B5C', '#E8B89D', '#FFF8F2', '#3D2E24'] },
    b: { name: 'Lavender', colors: ['#9B8EC1', '#D4A0C4', '#F8F5FD', '#2D2640'] } },
  { a: { name: 'Coastal', colors: ['#5B9BD5', '#B8D4E8', '#F0F7FF', '#1E4D8C'] },
    b: { name: 'Emerald', colors: ['#2D6A4F', '#C4A96A', '#F0F7F4', '#1C2E24'] } },
];

function getDefaultVibeForOccasion(occasion?: string): string {
  switch (occasion) {
    case 'wedding': return 'romantic elegant';
    case 'birthday': return 'fun colorful celebration';
    case 'anniversary': return 'timeless elegant';
    case 'engagement': return 'romantic modern';
    default: return 'elegant modern';
  }
}

// Determine current step from collected data
function currentStep(c: Collected, photosDecided: boolean): Step {
  if (!c.occasion) return 'occasion';
  if (!c.names?.[0]) return 'names';
  if (c.occasion === 'wedding' || c.occasion === 'engagement' || c.occasion === 'anniversary') {
    if (!c.names?.[1]) return 'names';
  }
  if (!c.date) return 'date';
  if (!c.venue) return 'venue';
  if (!c.vibe) return 'vibe';
  if (!photosDecided) return 'photos';
  return 'ready';
}

// Speech text for each step — warm, conversational, references what's been collected
function speechForStep(step: Step, collected: Collected): string {
  const name1 = collected.names?.[0];
  const name2 = collected.names?.[1];
  const nameDisplay = name2 ? `${name1} & ${name2}` : name1;
  const occ = collected.occasion;

  switch (step) {
    case 'occasion':
      return "Hey, I'm Pear! What are we celebrating?";
    case 'names': {
      if (occ === 'birthday') return "Love it! Who's the birthday for?";
      if (occ === 'wedding') return "A wedding! Who's the happy couple?";
      if (occ === 'engagement') return "How exciting! Who just got engaged?";
      if (occ === 'anniversary') return "Beautiful! Who's celebrating?";
      return "Great! Who is this for?";
    }
    case 'date': {
      if (occ === 'birthday') return `${nameDisplay}'s birthday — when is it?`;
      if (occ === 'wedding') return `${nameDisplay} — when's the big day?`;
      return `Got it, ${nameDisplay}! When's the date?`;
    }
    case 'venue': {
      const dateStr = collected.date ? new Date(collected.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '';
      if (dateStr) return `${dateStr} — perfect! Where's it happening?`;
      return "Where's the celebration happening?";
    }
    case 'vibe': {
      const venue = collected.venue === 'TBD' ? '' : collected.venue;
      if (venue) return `${venue} sounds amazing! What's the vibe?`;
      return "Almost there! What's the vibe you're going for?";
    }
    case 'photos':
      return "Let's add some photos to make it personal";
    case 'ready':
      return `${nameDisplay}'s site is ready to build!`;
  }
}

// Pear mood per step
function moodForStep(step: Step, loading: boolean): 'idle' | 'thinking' | 'happy' | 'greeting' | 'celebrating' {
  if (loading) return 'thinking';
  switch (step) {
    case 'occasion': return 'greeting';
    case 'names': return 'happy';
    case 'date': return 'happy';
    case 'venue': return 'happy';
    case 'vibe': return 'happy';
    case 'photos': return 'happy';
    case 'ready': return 'celebrating';
  }
}

// Progress: how many of 5 steps done
function progressCount(c: Collected): number {
  let n = 0;
  if (c.occasion) n++;
  if (c.names?.[0]) n++;
  if (c.date) n++;
  if (c.venue) n++;
  if (c.vibe) n++;
  return n;
}

// SVG progress ring component
function ProgressRing({ progress, size = 140 }: { progress: number; size?: number }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 5) * circumference;
  return (
    <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(163,177,138,0.15)" strokeWidth={stroke} />
      {/* Fill */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--pl-olive, #A3B18A)" strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
    </svg>
  );
}

export function PearSpotlight({ onComplete, onBack }: PearSpotlightProps) {
  // ── State ─────────────────────────────────────────────────
  const [collected, setCollected] = useState<Collected>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'chat' | 'generating' | 'error' | 'done'>('chat');
  const [genError, setGenError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showPhotoBrowser, setShowPhotoBrowser] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [photosDecided, setPhotosDecided] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const inputRef = useRef<HTMLInputElement>(null);
  const collectedRef = useRef(collected);
  collectedRef.current = collected;
  const selectedPhotosRef = useRef<any[]>([]);
  useEffect(() => { selectedPhotosRef.current = selectedPhotos; }, [selectedPhotos]);

  const step = currentStep(collected, photosDecided);
  const progress = progressCount(collected);
  const speech = speechForStep(step, collected);
  const mood = moodForStep(step, loading);

  // Auto-open photo browser when we reach photos step
  useEffect(() => {
    if (step === 'photos' && !showPhotoBrowser) {
      const t = setTimeout(() => setShowPhotoBrowser(true), 500);
      return () => clearTimeout(t);
    }
  }, [step, showPhotoBrowser]);

  // Auto-focus input on steps that need it
  useEffect(() => {
    if (step === 'names' || step === 'venue') {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [step]);

  // ── Handlers ──────────────────────────────────────────────
  const handleOccasionSelect = (value: string) => {
    setDirection(1);
    setCollected(prev => ({ ...prev, occasion: value }));
  };

  const handleNameSubmit = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setDirection(1);

    const parts = text.split(/\s*(?:&|and)\s*/i).map(s => s.trim()).filter(Boolean);
    const name1 = parts[0] || '';
    const name2 = parts[1] || '';

    // Validate — reject single characters
    if (name1.length < 2) return;

    const needsTwo = collected.occasion === 'wedding' || collected.occasion === 'engagement' || collected.occasion === 'anniversary';

    if (needsTwo && !name2) {
      // If they only gave one name for a couple occasion, we still need the second
      // Store first name and stay on names step — placeholder will ask for partner
      if (!collected.names?.[0]) {
        setCollected(prev => ({ ...prev, names: [name1, ''] }));
      } else {
        // This IS the second name
        setCollected(prev => ({ ...prev, names: [prev.names![0], name1] }));
      }
      return;
    }

    setCollected(prev => ({ ...prev, names: [name1, name2.length >= 2 ? name2 : ''] }));
  };

  const handleDateSubmit = (dateStr: string) => {
    setDirection(1);
    // Bump past dates to current/next year
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parsed = new Date(dateStr + 'T12:00:00');
      if (parsed.getTime() < Date.now()) {
        const y = new Date().getFullYear();
        parsed.setFullYear(y);
        if (parsed.getTime() < Date.now()) parsed.setFullYear(y + 1);
        dateStr = parsed.toISOString().slice(0, 10);
      }
    }
    setCollected(prev => ({ ...prev, date: dateStr }));
  };

  const handleVenueSubmit = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setDirection(1);
    setCollected(prev => ({ ...prev, venue: text }));
  };

  const handleVenueSkip = () => {
    setDirection(1);
    setCollected(prev => ({ ...prev, venue: 'TBD' }));
  };

  const handleVibeSelect = (vibe: string) => {
    setDirection(1);
    setCollected(prev => ({ ...prev, vibe: vibe }));
  };

  const handlePhotosSkip = () => {
    setShowPhotoBrowser(false);
    setPhotosDecided(true);
    setDirection(1);
  };

  const handlePhotosDone = () => {
    setShowPhotoBrowser(false);
    setPhotosDecided(true);
    setDirection(1);
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

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'names') handleNameSubmit();
    else if (step === 'venue') handleVenueSubmit();
  };

  // Edit a collected field
  const handleEditField = (field: keyof Collected) => {
    setDirection(-1);
    if (field === 'names') {
      setCollected(prev => ({ ...prev, names: undefined }));
    } else {
      setCollected(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // ── SPLIT POINT: RENDER STARTS BELOW ──
  // ── Generating phase ─────────────────────────────────────
  const GEN_PHASES = ['Understanding your vision', 'Choosing colors and fonts', 'Designing your pages', 'Writing your content', 'Adding final touches'];
  const [genPhaseIndex, setGenPhaseIndex] = useState(0);

  useEffect(() => {
    if (phase !== 'generating') {
      setGenPhaseIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setGenPhaseIndex(prev => (prev + 1) % GEN_PHASES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === 'generating') {
    const displayNames = collected.names
      ? collected.names[1]
        ? `${collected.names[0]} & ${collected.names[1]}`
        : collected.names[0]
      : '';

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <LivingCanvas occasion={collected.occasion} names={collected.names} date={collected.date} venue={collected.venue} vibe={collected.vibe} phase="generating" />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <PearMascot size={96} mood="celebrating" />

          {displayNames && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontFamily: 'var(--pl-font-heading)',
                fontSize: '1.5rem',
                fontStyle: 'italic',
                color: 'var(--pl-ink-soft)',
                textAlign: 'center',
              }}
            >
              {displayNames}
            </motion.p>
          )}

          {/* Animated progress bar */}
          <div style={{ width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(163,177,138,0.15)', overflow: 'hidden' }}>
              <motion.div
                key={genPhaseIndex}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 4.8, ease: 'linear' }}
                style={{ height: '100%', borderRadius: 2, background: 'var(--pl-olive, #A3B18A)' }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={genPhaseIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                style={{ fontSize: '0.85rem', color: 'var(--pl-muted, #8C7E72)', textAlign: 'center' }}
              >
                {GEN_PHASES[genPhaseIndex]}...
              </motion.p>
            </AnimatePresence>

            {/* Step dots */}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {GEN_PHASES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: i <= genPhaseIndex ? 'var(--pl-olive, #A3B18A)' : 'rgba(163,177,138,0.25)',
                    transition: 'background 0.4s ease',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error phase ──────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <LivingCanvas occasion={collected.occasion} names={collected.names} phase="chat" />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <PearMascot size={80} mood="thinking" />

          <div
            style={{
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 20,
              padding: '28px 24px',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 4px 24px rgba(43,30,20,0.08)',
              maxWidth: 400,
              width: '88%',
              textAlign: 'center',
            }}
          >
            <p style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '1.1rem', color: 'var(--pl-ink-soft)', marginBottom: 8, fontWeight: 600 }}>
              Oops, something went wrong
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--pl-muted, #8C7E72)', marginBottom: 20, lineHeight: 1.5 }}>
              {genError || 'An unexpected error occurred while generating your site.'}
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={onBack}
                style={{
                  padding: '10px 20px',
                  borderRadius: 100,
                  background: 'rgba(255,255,255,0.5)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--pl-ink-soft)',
                  cursor: 'pointer',
                }}
              >
                Go Back
              </button>

              {retryCount < 3 && (
                <button
                  onClick={() => {
                    setPhase('chat');
                    setGenError(null);
                    handleBuild();
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 100,
                    background: 'var(--pl-olive, #A3B18A)',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Try Again {retryCount > 0 ? `(${retryCount}/3)` : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Spotlight UI ────────────────────────────────────
  const needsTwo = collected.occasion === 'wedding' || collected.occasion === 'engagement' || collected.occasion === 'anniversary';
  const hasFirstName = !!(collected.names?.[0] && !collected.names?.[1]);

  // Date preset helpers
  const getThisWeekend = (): string => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + daysUntilSaturday);
    return saturday.toISOString().slice(0, 10);
  };

  const getNextMonth = (): string => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    return next.toISOString().slice(0, 10);
  };

  // Format date for chip display
  const formatDateChip = (dateStr: string): string => {
    try {
      const d = new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Chip component
  const Chip = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px',
        borderRadius: 100,
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.4)',
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--pl-ink-soft)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LivingCanvas
        occasion={collected.occasion}
        names={collected.names}
        date={collected.date}
        venue={collected.venue}
        vibe={collected.vibe}
        phase="chat"
      />

      {/* Back button -- top left */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 100,
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.4)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--pl-ink-soft)',
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={14} />
        Back
      </button>

      {/* The Spotlight Card */}
      <div style={{ maxWidth: 480, width: '92%', position: 'relative', zIndex: 10 }}>

        {/* Pear mascot -- large, overlapping top of card */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: -40, zIndex: 20 }}>
          <ProgressRing progress={progress} size={140} />
          <div style={{ paddingTop: 10 }}>
            <PearMascot size={120} mood={mood} />
          </div>
        </div>

        {/* Glass card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 28,
            padding: '56px 28px 28px',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 8px 40px rgba(43,30,20,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Speech bubble */}
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              style={{
                textAlign: 'center',
                fontFamily: 'var(--pl-font-heading)',
                fontStyle: 'italic',
                fontSize: '1.25rem',
                color: 'var(--pl-ink-soft)',
                marginBottom: 24,
                lineHeight: 1.4,
              }}
            >
              {speech}
            </motion.p>
          </AnimatePresence>

          {/* Step content -- animated swap */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.3 }}
              style={{ minHeight: 200 }}
            >
              {/* ── Occasion step ── */}
              {step === 'occasion' && (
                <OccasionCard
                  occasions={[
                    { label: 'Wedding', value: 'wedding' },
                    { label: 'Birthday', value: 'birthday' },
                    { label: 'Anniversary', value: 'anniversary' },
                    { label: 'Engagement', value: 'engagement' },
                    { label: 'Our Story', value: 'story' },
                  ]}
                  onSelect={handleOccasionSelect}
                />
              )}

              {/* ── Names step ── */}
              {step === 'names' && (
                <form onSubmit={handleInputSubmit}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      needsTwo
                        ? hasFirstName
                          ? "Partner's name"
                          : 'Both names (e.g. Alex & Jordan)'
                        : 'Their name'
                    }
                    style={{
                      width: '100%',
                      height: 48,
                      padding: '0 16px',
                      fontSize: '1rem',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.5)',
                      background: 'rgba(255,255,255,0.5)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      outline: 'none',
                      color: 'var(--pl-ink-soft)',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    style={{
                      marginTop: 12,
                      width: '100%',
                      padding: '12px 0',
                      borderRadius: 100,
                      background: input.trim() ? 'var(--pl-olive, #A3B18A)' : 'rgba(163,177,138,0.3)',
                      border: 'none',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#fff',
                      cursor: input.trim() ? 'pointer' : 'default',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    Continue
                  </button>
                </form>
              )}

              {/* ── Date step ── */}
              {step === 'date' && (
                <div>
                  {/* Quick presets */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button
                      onClick={() => handleDateSubmit(getThisWeekend())}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.5)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--pl-ink-soft)',
                        cursor: 'pointer',
                      }}
                    >
                      This weekend
                    </button>
                    <button
                      onClick={() => handleDateSubmit(getNextMonth())}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.5)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--pl-ink-soft)',
                        cursor: 'pointer',
                      }}
                    >
                      Next month
                    </button>
                  </div>
                  {/* Date input + confirm */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="date"
                      id="spotlight-date"
                      style={{
                        flex: 1,
                        height: 48,
                        padding: '0 12px',
                        fontSize: '0.9rem',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.5)',
                        background: 'rgba(255,255,255,0.5)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        outline: 'none',
                        color: 'var(--pl-ink-soft)',
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById('spotlight-date') as HTMLInputElement | null;
                        if (el?.value) {
                          handleDateSubmit(el.value);
                        }
                      }}
                      style={{
                        padding: '0 20px',
                        height: 48,
                        borderRadius: 14,
                        background: 'var(--pl-olive, #A3B18A)',
                        border: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#fff',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              {/* ── Venue step ── */}
              {step === 'venue' && (
                <form onSubmit={handleInputSubmit}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Venue name or address"
                    style={{
                      width: '100%',
                      height: 48,
                      padding: '0 16px',
                      fontSize: '1rem',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.5)',
                      background: 'rgba(255,255,255,0.5)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      outline: 'none',
                      color: 'var(--pl-ink-soft)',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={handleVenueSkip}
                      style={{
                        flex: 1,
                        padding: '12px 0',
                        borderRadius: 100,
                        background: 'rgba(255,255,255,0.4)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--pl-ink-soft)',
                        cursor: 'pointer',
                      }}
                    >
                      Skip for now
                    </button>
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      style={{
                        flex: 1,
                        padding: '12px 0',
                        borderRadius: 100,
                        background: input.trim() ? 'var(--pl-olive, #A3B18A)' : 'rgba(163,177,138,0.3)',
                        border: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#fff',
                        cursor: input.trim() ? 'pointer' : 'default',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </form>
              )}

              {/* ── Vibe step ── */}
              {step === 'vibe' && (
                <div>
                  <StyleDiscoveryCard
                    pairs={STYLE_PAIRS}
                    names={collected.names}
                    onSelect={(s) => handleVibeSelect(s.name.toLowerCase())}
                  />
                  <button
                    onClick={() => handleVibeSelect(getDefaultVibeForOccasion(collected.occasion))}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      padding: '10px 0',
                      borderRadius: 100,
                      background: 'rgba(255,255,255,0.4)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--pl-ink-soft)',
                      cursor: 'pointer',
                    }}
                  >
                    Surprise me
                  </button>
                </div>
              )}

              {/* ── Photos step ── */}
              {step === 'photos' && (
                <div style={{ textAlign: 'center', paddingTop: 24, paddingBottom: 24 }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--pl-muted, #8C7E72)' }}>
                    Opening photo picker...
                  </p>
                </div>
              )}

              {/* ── Ready step ── */}
              {step === 'ready' && (
                <div>
                  <SitePreviewCard
                    names={collected.names!}
                    occasion={collected.occasion}
                    date={collected.date}
                    vibe={collected.vibe}
                    venue={collected.venue}
                  />
                  <button
                    onClick={handleBuild}
                    style={{
                      marginTop: 16,
                      width: '100%',
                      padding: '16px 0',
                      borderRadius: 100,
                      background: 'var(--pl-olive, #A3B18A)',
                      border: 'none',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Sparkles size={18} />
                    Build My Site
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Collected chips -- bottom of card */}
          {progress > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {collected.occasion && (
                <Chip
                  label={collected.occasion.charAt(0).toUpperCase() + collected.occasion.slice(1)}
                  onClick={() => handleEditField('occasion')}
                />
              )}
              {collected.names?.[0] && (
                <Chip
                  label={
                    collected.names[1]
                      ? `${collected.names[0]} & ${collected.names[1]}`
                      : collected.names[0]
                  }
                  onClick={() => handleEditField('names')}
                />
              )}
              {collected.date && (
                <Chip
                  label={formatDateChip(collected.date)}
                  onClick={() => handleEditField('date')}
                />
              )}
              {collected.venue && collected.venue !== 'TBD' && (
                <Chip
                  label={collected.venue}
                  onClick={() => handleEditField('venue')}
                />
              )}
              {collected.vibe && (
                <Chip
                  label={collected.vibe}
                  onClick={() => handleEditField('vibe')}
                />
              )}
            </div>
          )}
        </div>{/* end glass card */}
      </div>{/* end spotlight card container */}

      {/* Photo Browser overlay */}
      <AnimatePresence>
        {showPhotoBrowser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRadius: 24,
                padding: 24,
                maxWidth: 560,
                width: '92%',
                maxHeight: '80vh',
                overflow: 'auto',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 12px 48px rgba(43,30,20,0.15)',
              }}
            >
              <PhotoBrowser
                onSelectionChange={setSelectedPhotos}
                maxSelection={20}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
                <button
                  onClick={handlePhotosSkip}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 100,
                    background: 'rgba(255,255,255,0.5)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--pl-ink-soft)',
                    cursor: 'pointer',
                  }}
                >
                  Skip
                </button>
                <button
                  onClick={handlePhotosDone}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 100,
                    background: selectedPhotos.length > 0 ? 'var(--pl-olive, #A3B18A)' : 'rgba(163,177,138,0.3)',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#fff',
                    cursor: selectedPhotos.length > 0 ? 'pointer' : 'default',
                    transition: 'background 0.2s ease',
                  }}
                >
                  Done{selectedPhotos.length > 0 ? ` (${selectedPhotos.length})` : ''}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}