'use client';

// Spotlight UI — single centered card, large Pear mascot, step-by-step

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, ArrowLeft, MapPin, MessageCircle } from 'lucide-react';
import { PearMascot } from '@/components/icons/PearMascot';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { LivingCanvas } from '@/components/wizard/LivingCanvas';
import { OccasionCard, SitePreviewCard } from '@/components/wizard/WizardCards';
import { LocationAutocomplete } from '@/components/wizard/LocationAutocomplete';
import { StyleDiscoveryCard, ColorPaletteCard } from '@/components/wizard/WizardCardsB';
import { PearCalendar } from '@/components/wizard/PearCalendar';
import { SiteRenderer } from '@/components/editor/SiteRenderer';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import type { StoryManifest } from '@/types';

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

type Step = 'occasion' | 'names' | 'date' | 'venue' | 'vibe-ask' | 'vibe-pick' | 'photos' | 'photo-review' | 'ready';

const STYLE_PAIRS = [
  { a: { name: 'Blush & Sage', colors: ['#D4A0A0', '#A3B18A', '#FAF7F2', '#3D3530'] },
    b: { name: 'Navy & Gold', colors: ['#2C3E6B', '#C4A96A', '#FAF7F2', '#1C1C1C'] } },
  { a: { name: 'Terracotta', colors: ['#C67B5C', '#E8B89D', '#FFF8F2', '#3D2E24'] },
    b: { name: 'Lavender', colors: ['#9B8EC1', '#D4A0C4', '#F8F5FD', '#2D2640'] } },
  { a: { name: 'Coastal', colors: ['#5B9BD5', '#B8D4E8', '#F0F7FF', '#1E4D8C'] },
    b: { name: 'Emerald', colors: ['#2D6A4F', '#C4A96A', '#F0F7F4', '#1C2E24'] } },
];

// ── AI-powered palette generation ──────────────────────────

/**
 * Call Gemini to generate 3 color palettes from ANY description.
 * "Knicks themed" → Knicks orange/blue palettes
 * "cottagecore with sunflowers" → warm pastoral palettes
 * Works with sports teams, brands, moods, aesthetics, anything.
 */
async function generatePalettesFromAI(
  description: string,
  occasion?: string,
): Promise<{ name: string; colors: string[]; description: string }[]> {
  try {
    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Generate exactly 3 color palettes for a ${occasion || 'celebration'} site. The user described their vision as: "${description}"

RULES:
- Each palette must have EXACTLY 4 hex colors: [background, accent1, accent2, text]
- Palette names should be creative and relate to the user's description (e.g. "Courtside Orange" for Knicks, "Tuscan Harvest" for rustic vineyard)
- Colors must actually match what the user described — if they say a sports team, use that team's REAL colors. If they say a brand, use brand colors. If they say a mood, pick colors that evoke it.
- Descriptions should be 4-6 words explaining the palette feel
- Return ONLY this JSON, nothing else:
{ "action": "message", "data": { "palettes": [
  { "name": "...", "colors": ["#hex1", "#hex2", "#hex3", "#hex4"], "description": "..." },
  { "name": "...", "colors": ["#hex1", "#hex2", "#hex3", "#hex4"], "description": "..." },
  { "name": "...", "colors": ["#hex1", "#hex2", "#hex3", "#hex4"], "description": "..." }
] }, "reply": "..." }`,
        manifest: null,
      }),
    });

    if (!res.ok) throw new Error('AI request failed');
    const data = await res.json();
    const palettes = data?.data?.palettes;
    if (Array.isArray(palettes) && palettes.length >= 2) {
      return palettes.slice(0, 3).map((p: any) => ({
        name: typeof p.name === 'string' ? p.name : 'Custom',
        colors: Array.isArray(p.colors) ? p.colors.filter((c: any) => typeof c === 'string' && c.startsWith('#')).slice(0, 4) : ['#A3B18A', '#D4A574', '#FAF7F2', '#3D3530'],
        description: typeof p.description === 'string' ? p.description : '',
      }));
    }
    throw new Error('Invalid palette response');
  } catch {
    // Fallback: use COLOR_VOCAB to build palettes from keywords
    return generatePalettesFallback(description, occasion);
  }
}

/**
 * Fallback palette generation using COLOR_VOCAB when AI is unavailable.
 * Scans for keywords in the description and builds palettes from matched colors.
 */
function generatePalettesFallback(
  description: string,
  occasion?: string,
): { name: string; colors: string[]; description: string }[] {
  const { COLOR_VOCAB } = require('@/components/wizard/LivingCanvas');
  const v = description.toLowerCase();
  const keys = Object.keys(COLOR_VOCAB).sort((a: string, b: string) => b.length - a.length);

  // Collect all matched colors
  const allColors: string[] = [];
  const matchedNames: string[] = [];
  for (const key of keys) {
    if (v.includes(key)) {
      matchedNames.push(key);
      for (const c of COLOR_VOCAB[key]) {
        if (!allColors.includes(c)) allColors.push(c);
      }
    }
  }

  // Build palettes from matched colors
  if (allColors.length >= 4) {
    const name = matchedNames.slice(0, 2).map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' & ');
    return [
      { name: `${name} Bold`, colors: allColors.slice(0, 4), description: `Inspired by ${description}` },
      { name: `${name} Light`, colors: [allColors[0], allColors[1], '#FAF7F2', '#3D3530'], description: 'Lighter variation' },
      { name: `${name} Deep`, colors: [allColors[0], '#1E1B24', allColors[1], '#FAF7F2'], description: 'Dramatic contrast' },
    ];
  }

  // Last resort: occasion fallbacks
  const fallbacks: Record<string, { name: string; colors: string[]; description: string }[]> = {
    wedding: [
      { name: 'Romantic Blush', colors: ['#F2D1D1', '#E8B4C8', '#C4A96A', '#FAF7F2'], description: 'Soft pinks with gold' },
      { name: 'Timeless Ivory', colors: ['#F0E6D6', '#C4A96A', '#3D3530', '#FAF7F2'], description: 'Classic elegance' },
      { name: 'Garden Fresh', colors: ['#A3B18A', '#D5F5E3', '#F2D1D1', '#3D3530'], description: 'Green and bloom' },
    ],
    birthday: [
      { name: 'Party Vibes', colors: ['#FF6B6B', '#FFC857', '#5BCEFA', '#1C1C1C'], description: 'Bright and festive' },
      { name: 'Sweet Pastel', colors: ['#FFD1DC', '#E8D5F5', '#D5F5E3', '#3D3530'], description: 'Soft and playful' },
      { name: 'Bold Night', colors: ['#2D2B33', '#FF6B6B', '#FFC857', '#FAF7F2'], description: 'Dark with pops' },
    ],
    anniversary: [
      { name: 'Golden Years', colors: ['#C4A96A', '#E8D5A0', '#F0E6D6', '#3D3530'], description: 'Warm gold tones' },
      { name: 'Vintage Rose', colors: ['#DCC9A4', '#E8B4C8', '#FAF7F2', '#3D3530'], description: 'Nostalgic warmth' },
      { name: 'Emerald & Gold', colors: ['#2D6A4F', '#C4A96A', '#F0F7F4', '#1C2E24'], description: 'Jewel-tone richness' },
    ],
  };
  return fallbacks[occasion || 'wedding'] || fallbacks.wedding;
}

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
function currentStep(c: Collected, photosDecided: boolean, vibeDescription: string, photosCount: number, reviewDone: boolean): Step {
  if (!c.occasion) return 'occasion';
  if (!c.names?.[0]) return 'names';
  if (c.occasion === 'wedding' || c.occasion === 'engagement' || c.occasion === 'anniversary') {
    if (!c.names?.[1]) return 'names';
  }
  if (!c.date) return 'date';
  if (!c.venue) return 'venue';
  if (!c.vibe) return vibeDescription ? 'vibe-pick' : 'vibe-ask';
  if (!photosDecided) return 'photos';
  if (photosCount > 0 && !reviewDone) return 'photo-review';
  return 'ready';
}

// Speech text for each step — warm, conversational, references what's been collected
function speechForStep(step: Step, collected: Collected, photoInfo?: { index: number; total: number; location?: string }): string {
  const name1 = collected.names?.[0];
  const name2 = collected.names?.[1];
  const nameDisplay = name2 ? `${name1} & ${name2}` : name1;
  const occ = collected.occasion;

  switch (step) {
    case 'occasion':
      return "Hey! What are we celebrating?";
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
    case 'vibe-ask': {
      const venue = collected.venue === 'TBD' ? '' : collected.venue;
      if (venue) return `${venue} sounds amazing! Describe your dream vibe`;
      return "Almost there! Describe the style or theme you love";
    }
    case 'vibe-pick':
      return "I put together some palettes based on your vision";
    case 'photos':
      return "Let's add some photos to make it personal";
    case 'photo-review': {
      if (photoInfo) {
        if (photoInfo.location) {
          return `Taken in ${photoInfo.location} — what was this moment?`;
        }
        return `Photo ${photoInfo.index + 1} of ${photoInfo.total} — where was this?`;
      }
      return "Tell me about this photo";
    }
    case 'ready':
      return `${nameDisplay}'s site is ready to build!`;
  }
}

// Conversational sub-text — adds personality below the main speech
function subtextForStep(step: Step, collected: Collected): string {
  const occ = collected.occasion;
  switch (step) {
    case 'occasion': return "I'm Pear, your personal site builder. Let's make something beautiful together.";
    case 'names': return occ === 'birthday' ? "Just their first name is perfect." : "First names are great — I'll make them look stunning.";
    case 'date': return "I'll add a gorgeous countdown to the site.";
    case 'venue': return "I'll put it on the map for your guests. Or skip if it's TBD.";
    case 'vibe-ask': return "Colors, themes, moods — anything goes. Think Pinterest board.";
    case 'vibe-pick': return "Tap the one that makes your heart sing.";
    case 'photos': return "Your photos make the site 10x more personal. I'll help tell the story.";
    case 'photo-review': return "Add the location and a note — it makes the story richer.";
    case 'ready': return "Take a peek — you can always tweak in the editor after.";
  }
}

// Detect if the vibe is dark-themed — used for contrast adaptation
function isDarkVibe(vibe?: string): boolean {
  if (!vibe) return false;
  const v = vibe.toLowerCase();
  return v.includes('dark') || v.includes('moody') || v.includes('gothic') || v.includes('midnight') || v.includes('noir') || v.includes('black') || v.includes('navy') || v.includes('celestial');
}

// Pear mood per step
function moodForStep(step: Step, loading: boolean): 'idle' | 'thinking' | 'happy' | 'greeting' | 'celebrating' {
  if (loading) return 'thinking';
  switch (step) {
    case 'occasion': return 'greeting';
    case 'names': return 'happy';
    case 'date': return 'happy';
    case 'venue': return 'happy';
    case 'vibe-ask': return 'happy';
    case 'vibe-pick': return 'happy';
    case 'photos': return 'happy';
    case 'photo-review': return 'happy';
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
  const [phase, setPhase] = useState<'chat' | 'generating' | 'error' | 'done' | 'complete'>('chat');
  const [genError, setGenError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showPhotoBrowser, setShowPhotoBrowser] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [photosDecided, setPhotosDecided] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [partialManifest, setPartialManifest] = useState<StoryManifest | null>(null);
  const [vibeDescription, setVibeDescription] = useState(''); // raw user input before palette generation
  const [generatedPalettes, setGeneratedPalettes] = useState<{name: string; colors: string[]; description: string}[]>([]);
  const [selectedPaletteColors, setSelectedPaletteColors] = useState<string[] | null>(null);
  const [photoReviewIndex, setPhotoReviewIndex] = useState(0);
  const [photoNotes, setPhotoNotes] = useState<Record<number, { location?: string; locationDetected?: boolean; date?: string; note?: string }>>({});
  const [reviewDone, setReviewDone] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [completedData, setCompletedData] = useState<{ manifest: any; names: [string, string]; subdomain: string } | null>(null);
  const [genProgress, setGenProgress] = useState(0); // 0-100
  const inputRef = useRef<HTMLInputElement>(null);
  const collectedRef = useRef(collected);
  collectedRef.current = collected;
  const selectedPhotosRef = useRef<any[]>([]);
  useEffect(() => { selectedPhotosRef.current = selectedPhotos; }, [selectedPhotos]);

  const step = currentStep(collected, photosDecided, vibeDescription, selectedPhotos.length, reviewDone);
  const progress = progressCount(collected);
  const speech = speechForStep(step, collected, step === 'photo-review' ? { index: photoReviewIndex, total: selectedPhotos.length, location: photoNotes[photoReviewIndex]?.location } : undefined);
  const subtext = subtextForStep(step, collected);
  const mood = moodForStep(step, loading);
  const dark = isDarkVibe(collected.vibe);

  // Contrast-adaptive colors
  const textColor = dark ? '#FAF7F2' : 'var(--pl-ink-soft, #3D3530)';
  const mutedColor = dark ? 'rgba(250,247,242,0.6)' : 'var(--pl-muted, #8C7E72)';
  const cardBg = dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.4)';
  const cardBorder = dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.5)';
  const inputBg = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)';
  const inputBorder = dark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(163,177,138,0.3)';
  const chipBg = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)';
  const chipBorder = dark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.4)';
  const ghostBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)';
  const ghostBorder = dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(163,177,138,0.2)';

  // Auto-open photo browser when we reach photos step
  useEffect(() => {
    if (step === 'photos' && !showPhotoBrowser) {
      const t = setTimeout(() => setShowPhotoBrowser(true), 500);
      return () => clearTimeout(t);
    }
  }, [step, showPhotoBrowser]);

  // Auto-focus input on steps that need it + clear stale input between steps
  useEffect(() => {
    setInput('');
    if (step === 'names' || step === 'venue' || step === 'vibe-ask') {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [step]);

  // Track which photos are still being detected
  const [detectingPhotos, setDetectingPhotos] = useState<Set<number>>(new Set());

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
    setInput('');
    setDirection(1);
    setCollected(prev => ({ ...prev, venue: 'TBD' }));
  };

  const handleVibeDescriptionSubmit = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setDirection(1);
    setVibeDescription(text);
    setLoading(true);
    // AI generates palettes from the user's description
    try {
      const palettes = await generatePalettesFromAI(text, collected.occasion);
      setGeneratedPalettes(palettes);
    } catch {
      setGeneratedPalettes(generatePalettesFallback(text, collected.occasion));
    } finally {
      setLoading(false);
    }
  };

  const handleVibeSelect = (vibe: string, colors?: string[]) => {
    setDirection(1);
    const fullVibe = vibeDescription ? `${vibeDescription} - ${vibe}` : vibe;
    setCollected(prev => ({ ...prev, vibe: fullVibe }));
    if (colors) setSelectedPaletteColors(colors);
  };

  const handlePhotosSkip = () => {
    setShowPhotoBrowser(false);
    setPhotosDecided(true);
    setReviewDone(true);
    setDirection(1);
  };

  const handlePhotosDone = async () => {
    setShowPhotoBrowser(false);
    setPhotosDecided(true);
    setDirection(1);
    if (selectedPhotos.length === 0) {
      setReviewDone(true);
      return;
    }

    // Store dates for all photos first
    selectedPhotos.forEach((photo, idx) => {
      if (photo?.creationTime) {
        try {
          const d = new Date(photo.creationTime);
          const dateLabel = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          setPhotoNotes(prev => ({ ...prev, [idx]: { ...prev[idx], date: dateLabel } }));
        } catch { /* ignore */ }
      }
    });

    // Detect locations via Gemini Vision — process 2 at a time to rate-limit
    const CONCURRENCY = 2;
    const queue = selectedPhotos.map((photo, idx) => ({ photo, idx }));

    const processOne = async (photo: any, idx: number) => {
      const rawUrl = photo?.baseUrl || photo?.url || photo?.uri || '';
      if (!rawUrl) return;

      setDetectingPhotos(prev => new Set([...prev, idx]));

      try {
        // Fetch the image through our proxy as a blob
        const proxyUrl = rawUrl.includes('googleusercontent')
          ? `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=1200&h=1200`
          : rawUrl;
        const imgRes = await fetch(proxyUrl);
        if (!imgRes.ok) return;
        const blob = await imgRes.blob();
        const mimeType = blob.type || 'image/jpeg';

        // Convert blob to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            // Strip the data:...;base64, prefix
            const b64 = dataUrl.split(',')[1] || '';
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (!base64) return;

        // Send base64 to server for Gemini Vision analysis
        const res = await fetch('/api/photos/detect-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, mimeType, occasion: collected.occasion }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.location) {
            setPhotoNotes(prev => ({
              ...prev,
              [idx]: { ...prev[idx], location: data.location, locationDetected: true },
            }));
          }
        }
      } catch { /* location detection is best-effort */ }
      finally {
        setDetectingPhotos(prev => { const next = new Set(prev); next.delete(idx); return next; });
      }
    };

    // Process in batches of CONCURRENCY
    for (let i = 0; i < queue.length; i += CONCURRENCY) {
      const batch = queue.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(({ photo, idx }) => processOne(photo, idx)));
    }
  };

  const detectingLocation = detectingPhotos.has(photoReviewIndex);

  const handleBuild = useCallback(async () => {
    const c = collectedRef.current;
    const photos = selectedPhotosRef.current;
    if (!c.names || !c.occasion) return;
    setPhase('generating');
    setGenError(null);
    setGenStep(0);
    setGenProgress(0);

    // Synthesize a skeleton manifest from collected data so the live
    // preview shows IMMEDIATELY with real names/date/colors instead
    // of waiting for the server to finish.
    const paletteColors = selectedPaletteColors || ['#A3B18A', '#C4A96A', '#FAF7F2', '#3D3530'];
    const photoUrls = photos.map(p => {
      const raw = p?.baseUrl || p?.url || p?.uri || '';
      return raw.includes('googleusercontent') ? `/api/photos/proxy?url=${encodeURIComponent(raw)}&w=1200&h=1200` : raw;
    }).filter(Boolean);

    // Build a properly-shaped VibeSkin from the fallback derivation so every
    // required field (including `palette`) exists. Then override the palette
    // colors with the user's chosen palette so the live preview reflects their
    // selection instantly.
    const vibeString = `${c.occasion} ${c.vibe || ''}`.trim();
    const baseVibeSkin = deriveVibeSkin(vibeString);
    const skeletonVibeSkin = {
      ...baseVibeSkin,
      palette: {
        ...baseVibeSkin.palette,
        background: paletteColors[2] || baseVibeSkin.palette.background,
        foreground: paletteColors[3] || baseVibeSkin.palette.foreground,
        accent: paletteColors[0] || baseVibeSkin.palette.accent,
        accent2: paletteColors[1] || baseVibeSkin.palette.accent2,
      },
    };

    const skeleton: any = {
      occasion: c.occasion,
      coupleId: c.names.filter(Boolean).join(' & '),
      logistics: {
        date: c.date || '',
        venue: c.venue && c.venue !== 'TBD' ? c.venue : '',
        venueAddress: '',
        time: '',
        dresscode: '',
      },
      poetry: {
        heroTagline: c.vibe ? `A ${c.vibe.split(' ')[0]} celebration` : 'Our love story',
        welcomeStatement: `Join us to celebrate ${c.names[1] ? `${c.names[0]} & ${c.names[1]}` : c.names[0]}.`,
        closingLine: 'Thank you for being part of our story',
        rsvpIntro: "We hope you'll join us",
      },
      coverPhoto: photoUrls[0] || '',
      heroSlideshow: photoUrls.slice(0, 5),
      vibeString,
      vibeSkin: skeletonVibeSkin,
      chapters: [],
      blocks: [
        { id: 'hero-skel', type: 'hero', visible: true, order: 0, config: { title: c.names.filter(Boolean).join(' & ') } },
        // Always include a story block so the preview reserves space for
        // chapters the moment Pass 1 streams them in.
        { id: 'story-skel', type: 'story', visible: true, order: 1, config: {} },
        ...(c.date ? [{ id: 'countdown-skel', type: 'countdown', visible: true, order: 2, config: {} }] : []),
        ...(c.venue && c.venue !== 'TBD' ? [{ id: 'event-skel', type: 'event', visible: true, order: 3, config: {} }] : []),
      ],
      events: c.venue && c.venue !== 'TBD' && c.date ? [{
        name: `${c.occasion}`,
        type: c.occasion || 'event',
        date: c.date,
        time: '',
        venue: c.venue,
        address: '',
        dressCode: '',
        description: '',
      }] : [],
      faqs: [],
      registry: { entries: [], message: '', cashFundUrl: '', cashFundMessage: '' },
      travelInfo: { hotels: [], airports: [] },
      storyLayout: 'parallax' as const,
      pageMode: 'single-page',
      navStyle: 'glass',
    };
    setPartialManifest(skeleton);

    // Build a photoNotes lookup keyed by photo.id so server-side clustering
    // can re-attach the user's exact notes + manual locations to the right
    // cluster regardless of clustering order.
    const photoNotesById: Record<string, { note?: string; location?: string; date?: string }> = {};
    photos.forEach((p, idx) => {
      const n = photoNotes[idx];
      if (!p?.id || !n) return;
      if (n.note || n.location || n.date) {
        photoNotesById[p.id] = {
          note: n.note || undefined,
          location: n.location || undefined,
          date: n.date || undefined,
        };
      }
    });

    const requestBody = JSON.stringify({
      photos,
      // Send the vibe string + any explicit hex colors the user picked so the
      // design engine honors the chosen palette.
      vibeString: `${c.occasion} ${c.vibe || ''} ${c.venue || ''}`.trim(),
      names: c.names,
      occasion: c.occasion,
      eventDate: c.date,
      eventVenue: c.venue,
      celebrationVenue: c.venue,
      layoutFormat: 'cascade',
      // Chosen color palette from the wizard — must be honored as the final palette.
      selectedPaletteColors: selectedPaletteColors || undefined,
      // Per-photo notes + manual locations collected during photo review.
      photoNotes: Object.keys(photoNotesById).length > 0 ? photoNotesById : undefined,
    });

    try {
      // Try the streaming endpoint first, fall back to synchronous
      let res: Response;
      try {
        res = await fetch('/api/generate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });
        if (!res.ok) throw new Error('stream not available');
      } catch {
        res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Generation failed (${res.status})`);
      }

      // If streaming is available, read SSE events
      if (res.headers.get('content-type')?.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let manifest = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.startsWith('data:') ? line.slice(5).trim() : line.trim();
            if (!trimmed) continue;
            try {
              const event = JSON.parse(trimmed);
              if (event.type === 'progress') {
                // Server sends pass 0-7; map to 5 UI steps
                const pass = event.pass ?? 0;
                const stepIndex = pass <= 0 ? 0
                  : pass <= 1 ? 1
                  : pass <= 3 ? 2
                  : pass <= 5 ? 3
                  : 4;
                setGenStep(stepIndex);
                setGenProgress(Math.round(((pass + 1) / 8) * 100));
                // Merge the server snapshot onto the current partial manifest
                // so fields that the pipeline hasn't filled in yet (blocks,
                // coverPhoto, heroSlideshow, etc.) stay populated from the
                // skeleton while real content (chapters, theme, vibeSkin)
                // streams in progressively.
                if (event.manifest) {
                  setPartialManifest(prev => {
                    const snap = event.manifest as StoryManifest;
                    if (!prev) return snap;
                    return {
                      ...prev,
                      ...snap,
                      // Always prefer the real chapters/theme/vibeSkin/poetry
                      // from the server snapshot; keep the skeleton's blocks
                      // and hero media until the pipeline provides its own.
                      chapters: snap.chapters?.length ? snap.chapters : prev.chapters,
                      blocks: snap.blocks?.length ? snap.blocks : prev.blocks,
                      coverPhoto: prev.coverPhoto || snap.coverPhoto,
                      heroSlideshow: prev.heroSlideshow?.length ? prev.heroSlideshow : snap.heroSlideshow,
                    } as StoryManifest;
                  });
                }
              }
              if (event.type === 'complete') {
                manifest = event.manifest;
                if (manifest) setPartialManifest(manifest);
              }
              if (event.type === 'error') {
                throw new Error(event.message || 'Generation failed');
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue; // skip non-JSON lines
              throw e;
            }
          }
        }

        if (manifest) {
          const n1 = (c.names[0] || 'celebration').toLowerCase().replace(/[^a-z0-9]/g, '');
          const n2 = c.names[1] ? c.names[1].toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          const suffix = Math.random().toString(36).slice(2, 6);
          const subdomain = n2 ? `${n1}-and-${n2}-${suffix}` : `${n1}-${suffix}`;
          setCompletedData({ manifest, names: c.names, subdomain });
          setPhase('complete');
          return;
        }
      }

      // Fallback: non-streaming response (plain JSON)
      const data = await res.json();
      if (!data.manifest) throw new Error('No manifest returned');

      const n1 = (c.names[0] || 'celebration').toLowerCase().replace(/[^a-z0-9]/g, '');
      const n2 = c.names[1] ? c.names[1].toLowerCase().replace(/[^a-z0-9]/g, '') : '';
      const suffix = Math.random().toString(36).slice(2, 6);
      const subdomain = n2 ? `${n1}-and-${n2}-${suffix}` : `${n1}-${suffix}`;
      setCompletedData({ manifest: data.manifest, names: c.names, subdomain });
      setPhase('complete');
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
    else if (step === 'vibe-ask') handleVibeDescriptionSubmit();
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

  // Fallback timer — only advances genStep if SSE isn't providing updates
  useEffect(() => {
    if (phase !== 'generating') { setGenStep(0); setGenProgress(0); return; }
    let lastStep = 0;
    const fallbackTimer = setInterval(() => {
      setGenStep(prev => {
        if (prev === lastStep) {
          // No SSE update received, advance manually
          lastStep = Math.min(prev + 1, GEN_PHASES.length - 1);
          return lastStep;
        }
        lastStep = prev;
        return prev;
      });
    }, 8000); // Slower fallback — 8s instead of 5s
    return () => clearInterval(fallbackTimer);
  }, [phase]);

  if (phase === 'generating') {
    const displayNames = collected.names
      ? collected.names[1]
        ? `${collected.names[0]} & ${collected.names[1]}`
        : collected.names[0]
      : '';
    const displayProgress = genProgress > 0 ? genProgress : ((genStep + 1) / GEN_PHASES.length) * 100;

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
        {/* Live preview sizing: desktop width by default, narrower on small screens */}
        <style>{`
          .pear-live-preview {
            width: 100%;
            max-width: min(1200px, 92vw);
          }
          @media (max-width: 900px) {
            .pear-live-preview {
              max-width: min(760px, 96vw);
            }
          }
          @media (max-width: 640px) {
            .pear-live-preview {
              max-width: 96vw;
            }
          }
        `}</style>
        <LivingCanvas occasion={collected.occasion} names={collected.names} date={collected.date} venue={collected.venue} vibe={collected.vibe} paletteColors={selectedPaletteColors} phase="generating" />

        {/* Top bar — progress + status */}
        <div style={{
          position: 'relative', zIndex: 10, flexShrink: 0,
          padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <PearMascot size={40} mood={genStep >= 4 ? 'celebrating' : 'thinking'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={genStep}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pl-ink-soft)' }}
                >
                  {GEN_PHASES[genStep]}...
                </motion.span>
              </AnimatePresence>
            </div>
            <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'rgba(163,177,138,0.15)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${displayProgress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 2, background: 'var(--pl-olive, #A3B18A)' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {GEN_PHASES.map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: i <= genStep ? 'var(--pl-olive, #A3B18A)' : 'rgba(163,177,138,0.2)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>

        {/* Live site preview — grows as manifest builds */}
        <div style={{
          flex: 1, position: 'relative', zIndex: 10,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          overflow: 'hidden', padding: '0 24px 24px',
        }}>
          {partialManifest ? (
            <motion.div
              className="pear-live-preview"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              style={{
                borderRadius: 20, overflow: 'hidden',
                boxShadow: '0 12px 48px rgba(43,30,20,0.18)',
                border: '1px solid rgba(255,255,255,0.4)',
                maxHeight: '78vh',
                overflowY: 'auto',
                background: '#FAF7F2',
              }}
            >
              <div style={{ transform: 'scale(1)', transformOrigin: 'top center' }}>
                <SiteRenderer
                  manifest={partialManifest}
                  names={collected.names || ['', '']}
                  editMode={false}
                />
              </div>
            </motion.div>
          ) : (
            /* Skeleton while waiting for first manifest data */
            <motion.div
              className="pear-live-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                borderRadius: 20, overflow: 'hidden',
                boxShadow: '0 12px 48px rgba(43,30,20,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.3)',
                backdropFilter: 'blur(20px)',
                padding: '60px 32px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
                minHeight: 400,
              } as React.CSSProperties}
            >
              <PearMascot size={80} mood="thinking" />
              <p style={{
                fontFamily: 'var(--pl-font-heading)',
                fontStyle: 'italic', fontSize: '1.4rem',
                color: 'var(--pl-ink-soft)', textAlign: 'center',
              }}>
                {displayNames}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--pl-muted)', textAlign: 'center' }}>
                Building your site...
              </p>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // ── Error phase ──────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <LivingCanvas occasion={collected.occasion} names={collected.names} paletteColors={selectedPaletteColors} phase="chat" />

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

  // ── Celebration / Confirmation screen ────────────────────
  if (phase === 'complete' && completedData) {
    const siteUrl = `${completedData.subdomain}.pearloom.com`;
    const displayNames = completedData.names[1]
      ? `${completedData.names[0]} & ${completedData.names[1]}`
      : completedData.names[0];

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LivingCanvas occasion={collected.occasion} names={collected.names} date={collected.date} venue={collected.venue} vibe={collected.vibe} phase="chat" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          style={{
            position: 'relative', zIndex: 10,
            maxWidth: 440, width: '90%',
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 28,
            padding: '40px 28px 32px',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 12px 48px rgba(43,30,20,0.1)',
            textAlign: 'center',
          } as React.CSSProperties}
        >
          {/* Celebrating Pear */}
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <PearMascot size={100} mood="celebrating" />
          </motion.div>

          {/* Names */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              fontFamily: 'var(--pl-font-heading)',
              fontStyle: 'italic',
              fontSize: '1.6rem',
              color: 'var(--pl-ink-soft)',
              marginTop: 16,
              marginBottom: 4,
            }}
          >
            {displayNames}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{ fontSize: '0.85rem', color: 'var(--pl-muted)', marginBottom: 24 }}
          >
            Your site is ready!
          </motion.p>

          {/* URL display */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            style={{
              background: 'rgba(255,255,255,0.5)',
              borderRadius: 16,
              padding: '14px 20px',
              marginBottom: 20,
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          >
            <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--pl-muted)', marginBottom: 6 }}>
              Your site URL
            </p>
            <p style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--pl-olive, #A3B18A)',
              wordBreak: 'break-all' as const,
            }}>
              {siteUrl}
            </p>
            <button
              onClick={() => navigator.clipboard?.writeText(`https://${siteUrl}`)}
              style={{
                marginTop: 8,
                padding: '6px 16px',
                borderRadius: 100,
                background: 'rgba(163,177,138,0.12)',
                border: '1px solid rgba(163,177,138,0.3)',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--pl-olive)',
                cursor: 'pointer',
              }}
            >
              Copy link
            </button>
          </motion.div>

          {/* Pear's message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            style={{
              fontSize: '0.82rem',
              color: 'var(--pl-muted)',
              lineHeight: 1.5,
              marginBottom: 24,
              fontStyle: 'italic',
            }}
          >
            Photos are saved, site is on your dashboard. You can customize everything in the editor.
            {'\n'}— Pear
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <button
              onClick={() => onComplete(completedData.manifest, completedData.names, completedData.subdomain)}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 100,
                background: 'var(--pl-olive, #A3B18A)',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              Open Editor
            </button>
            <button
              onClick={() => window.open(`https://${siteUrl}`, '_blank')}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 100,
                background: 'transparent',
                border: '1px solid rgba(163,177,138,0.3)',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--pl-ink-soft)',
                cursor: 'pointer',
              }}
            >
              Preview live site
            </button>
          </motion.div>
        </motion.div>
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

  // Chip component — contrast-adaptive
  const Chip = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="pear-btn"
      style={{
        padding: '6px 16px', minHeight: 32,
        borderRadius: 100,
        background: chipBg, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        border: chipBorder, fontSize: '0.75rem', fontWeight: 600,
        color: textColor, cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Global focus + interaction styles */}
      <style>{`
        .pear-input:focus-visible { box-shadow: 0 0 0 3px rgba(163,177,138,0.35) !important; outline: none; }
        .pear-btn:focus-visible { box-shadow: 0 0 0 3px rgba(163,177,138,0.35) !important; outline: none; }
        .pear-btn:active { transform: scale(0.97); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pear-breathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-6px) scale(1.02); }
        }
        @keyframes pear-blink {
          0%, 92%, 100% { opacity: 1; }
          95%           { opacity: 0.4; }
        }
        .pear-float {
          animation: pear-breathe 4.5s ease-in-out infinite;
        }
        .pear-shadow {
          animation: pear-breathe 4.5s ease-in-out infinite reverse;
        }
        /* Responsive layout: side-by-side on desktop, stacked on mobile */
        .pear-stage {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          width: 100%;
          max-width: 860px;
          padding: 0 20px;
        }
        .pear-stage-mascot {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 220px;
        }
        .pear-stage-card {
          flex: 1;
          max-width: 480px;
          min-width: 0;
        }
        @media (max-width: 767px) {
          .pear-stage {
            flex-direction: column;
            gap: 0;
            padding: 0 16px;
          }
          .pear-stage-mascot {
            width: 140px;
            margin-bottom: -10px;
          }
          .pear-stage-card {
            width: 100%;
          }
          /* Tail points UP toward Pear on mobile instead of left */
          .pear-speech-tail {
            left: 50% !important;
            top: -8px !important;
            transform: translateX(-50%) rotate(135deg) !important;
          }
        }
      `}</style>
      <LivingCanvas
        occasion={collected.occasion}
        names={collected.names}
        date={collected.date}
        venue={collected.venue}
        vibe={collected.vibe}
        paletteColors={selectedPaletteColors}
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
          color: textColor,
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={14} />
        Back
      </button>

      {/* The Spotlight Stage — Pear side-by-side with card */}
      <div className="pear-stage" style={{ position: 'relative', zIndex: 10 }}>

        {/* Big Pear mascot — the star of the show */}
        {step !== 'photo-review' && (
          <div className="pear-stage-mascot">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              {/* Glow halo behind Pear */}
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '110%', height: '110%',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${dark ? 'rgba(163,177,138,0.25)' : 'rgba(163,177,138,0.2)'} 0%, transparent 65%)`,
                filter: 'blur(20px)',
                pointerEvents: 'none',
                zIndex: -1,
              }} />

              {/* Progress ring — wraps around Pear like a halo */}
              <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0 }}>
                  <ProgressRing progress={progress} size={200} />
                </div>

                {/* Pear himself — breathing idle animation + reaction wiggles */}
                <motion.div
                  className="pear-float"
                  animate={{
                    rotate: step === 'ready' ? [0, -6, 6, -4, 4, 0] : 0,
                  }}
                  transition={{
                    rotate: { duration: 0.8, delay: 0.2 },
                  }}
                  key={`pear-${step}`}
                  style={{ position: 'relative', zIndex: 2 }}
                >
                  <PearMascot size={160} mood={mood} />
                </motion.div>
              </div>

              {/* Floor shadow — subtle ellipse beneath Pear */}
              <div
                className="pear-shadow"
                style={{
                  width: 120, height: 12,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse, rgba(43,30,20,0.15) 0%, transparent 70%)',
                  marginTop: -8,
                }}
              />

              {/* Thinking particles — only when loading */}
              {loading && (
                <div style={{ position: 'absolute', top: 10, right: 20, display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 0 }}
                      animate={{ opacity: [0, 1, 0], y: [-4, -12, -20] }}
                      transition={{ duration: 1.4, delay: i * 0.2, repeat: Infinity }}
                      style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--pl-olive, #A3B18A)',
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Right side — speech + card stack */}
        <div className="pear-stage-card">

          {/* Speech bubble — sits above the card with tail pointing to Pear */}
          {step !== 'photo-review' && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`speech-${step}`}
                initial={{ opacity: 0, x: -12, y: 4 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: -12, y: -4 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'relative',
                  padding: '18px 22px',
                  marginBottom: 14,
                  borderRadius: 20,
                  background: cardBg,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: cardBorder,
                  boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.18)' : '0 8px 32px rgba(43,30,20,0.07)',
                  transition: 'background 0.5s, border 0.5s',
                }}
              >
                {/* Tail pointing LEFT toward Pear (hidden on mobile where Pear is above) */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: -8, top: 28,
                    width: 16, height: 16,
                    background: cardBg,
                    borderLeft: cardBorder,
                    borderBottom: cardBorder,
                    transform: 'rotate(45deg)',
                    backdropFilter: 'blur(20px)',
                  }}
                  className="pear-speech-tail"
                />
                <p style={{
                  fontFamily: 'var(--pl-font-heading)',
                  fontStyle: 'italic',
                  fontSize: '1.2rem',
                  color: textColor,
                  lineHeight: 1.35,
                  margin: '0 0 4px',
                  transition: 'color 0.5s',
                }}>
                  {speech}
                </p>
                <p style={{
                  fontSize: '0.78rem',
                  color: mutedColor,
                  lineHeight: 1.5,
                  margin: 0,
                  transition: 'color 0.5s',
                }}>
                  {subtext}
                </p>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Glass card — the interactive content */}
          <div
            style={{
              background: cardBg,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: step === 'photo-review' ? 20 : 24,
              padding: step === 'photo-review' ? '0' : '24px',
              border: cardBorder,
              boxShadow: dark ? '0 8px 40px rgba(0,0,0,0.2)' : '0 8px 40px rgba(43,30,20,0.08)',
              // Venue + photo-review steps render an absolutely-positioned
              // location autocomplete dropdown that must escape the card.
              // All other steps clip their slide-in transition to the card
              // bounds so the sliding content doesn't bleed outside.
              overflow: step === 'venue' || step === 'photo-review' ? 'visible' : 'hidden',
              transition: 'background 0.5s, border 0.5s, box-shadow 0.5s',
            }}
          >

          {/* Step content -- animated swap */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.3 }}
              style={{ minHeight: step === 'occasion' ? 200 : 120 }}
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
                    className="pear-input"
                    style={{
                      width: '100%', height: 48, padding: '0 16px',
                      fontSize: '1rem', borderRadius: 14,
                      border: inputBorder, background: inputBg,
                      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                      outline: 'none', color: textColor, fontFamily: 'inherit',
                      boxSizing: 'border-box' as const,
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="pear-btn"
                    style={{
                      marginTop: 12, width: '100%', minHeight: 44,
                      padding: '0 16px', borderRadius: 100,
                      background: input.trim() ? 'var(--pl-olive, #A3B18A)' : 'rgba(163,177,138,0.25)',
                      border: 'none', fontSize: '0.88rem', fontWeight: 700,
                      color: input.trim() ? '#fff' : mutedColor,
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
                <PearCalendar onSelect={handleDateSubmit} dark={dark} />
              )}

              {/* ── Venue step ── */}
              {step === 'venue' && (
                <div>
                  <LocationAutocomplete
                    value={input}
                    onChange={setInput}
                    onSelect={(place) => {
                      const venueName = place.address ? `${place.name}, ${place.address}` : place.name;
                      setInput(''); // clear so it doesn't leak into next step
                      setDirection(1);
                      setCollected(prev => ({ ...prev, venue: venueName }));
                    }}
                    placeholder="Search for a venue..."
                    dark={dark}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={handleVenueSkip}
                      style={{
                        flex: 1, minHeight: 44, padding: '0 16px', borderRadius: 100,
                        background: ghostBg, border: ghostBorder,
                        fontSize: '0.85rem', fontWeight: 600, color: textColor, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      Skip for now
                    </button>
                    <button
                      onClick={() => { if (input.trim()) handleVenueSubmit(); }}
                      disabled={!input.trim()}
                      style={{
                        flex: 1, minHeight: 44, padding: '0 16px', borderRadius: 100,
                        background: input.trim() ? 'var(--pl-olive, #A3B18A)' : 'rgba(163,177,138,0.25)',
                        border: 'none', fontSize: '0.85rem', fontWeight: 700,
                        color: input.trim() ? '#fff' : mutedColor, cursor: input.trim() ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ── Vibe ask step — text input for description ── */}
              {step === 'vibe-ask' && (
                <div>
                  <form onSubmit={handleInputSubmit}>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="e.g. country western, rustic barn, horses..."
                      className="pear-input"
                      style={{
                        width: '100%', height: 48, padding: '0 18px', borderRadius: 14,
                        border: inputBorder, background: inputBg,
                        backdropFilter: 'blur(8px)', fontSize: '0.92rem', color: textColor,
                        fontFamily: 'inherit', outline: 'none',
                        boxSizing: 'border-box' as const,
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      } as React.CSSProperties}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="pear-btn"
                      style={{
                        marginTop: 12, width: '100%', minHeight: 44, padding: '0 16px', borderRadius: 100,
                        background: input.trim() ? 'var(--pl-olive, #A3B18A)' : 'rgba(163,177,138,0.25)',
                        color: input.trim() ? '#fff' : mutedColor,
                        border: 'none', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Show me palettes
                    </button>
                  </form>
                  <button
                    onClick={async () => {
                      const desc = `beautiful ${collected.occasion || 'celebration'} theme`;
                      setVibeDescription(desc);
                      setLoading(true);
                      setDirection(1);
                      try {
                        const palettes = await generatePalettesFromAI(desc, collected.occasion);
                        setGeneratedPalettes(palettes);
                      } catch {
                        setGeneratedPalettes(generatePalettesFallback(desc, collected.occasion));
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="pear-btn"
                    style={{
                      marginTop: 8, width: '100%', minHeight: 44, padding: '0 16px', borderRadius: 100,
                      background: ghostBg, border: ghostBorder,
                      fontSize: '0.82rem', fontWeight: 600, color: textColor, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    Surprise me instead
                  </button>
                </div>
              )}

              {/* ── Vibe pick step — generated palettes from user's description ── */}
              {step === 'vibe-pick' && (
                <div>
                  <p style={{
                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--pl-muted)',
                    textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                    textAlign: 'center', marginBottom: 12,
                  }}>
                    Based on &ldquo;{vibeDescription}&rdquo;
                  </p>
                  <ColorPaletteCard
                    palettes={generatedPalettes}
                    onSelect={(palette) => handleVibeSelect(palette.name.toLowerCase(), palette.colors)}
                  />
                  <button
                    onClick={() => {
                      setVibeDescription('');
                      setGeneratedPalettes([]);
                      setDirection(-1);
                    }}
                    style={{
                      marginTop: 10, width: '100%', padding: '10px 0', borderRadius: 100,
                      background: 'transparent', border: '1px solid rgba(163,177,138,0.2)',
                      fontSize: '0.78rem', fontWeight: 600, color: 'var(--pl-muted)', cursor: 'pointer',
                    }}
                  >
                    Describe something different
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

              {/* ── Photo review step — immersive full-card experience ── */}
              {step === 'photo-review' && (() => {
                const photo = selectedPhotos[photoReviewIndex];
                const rawUrl = photo?.baseUrl || photo?.url || photo?.uri || '';
                const photoUrl = rawUrl.includes('googleusercontent')
                  ? `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=800&h=800`
                  : rawUrl;
                const isLast = photoReviewIndex === selectedPhotos.length - 1;
                const notes = photoNotes[photoReviewIndex] || {};
                const currentLocation = notes.location || '';
                const currentDate = notes.date || '';
                const currentNote = notes.note || '';

                return (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Photo — full bleed with rounded top corners matching card */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', maxHeight: '52vh', overflow: 'hidden', borderRadius: '14px 14px 0 0' }}>
                      {photoUrl && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoUrl}
                            alt={`Photo ${photoReviewIndex + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                          {/* Subtle gradient overlay — just enough for text readability */}
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, transparent 25%, transparent 70%, rgba(0,0,0,0.3) 100%)',
                            pointerEvents: 'none',
                          }} />
                        </>
                      )}
                      {/* Top bar — counter + date */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        padding: '14px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, color: '#fff', letterSpacing: '0.06em',
                          background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)',
                          padding: '4px 10px', borderRadius: 100,
                        }}>
                          {photoReviewIndex + 1} / {selectedPhotos.length}
                        </span>
                        {currentDate && (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 600, color: '#fff',
                            background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)',
                            padding: '4px 10px', borderRadius: 100,
                          }}>
                            {currentDate}
                          </span>
                        )}
                      </div>
                      {/* Bottom — location badge or detecting */}
                      <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
                        {detectingLocation ? (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                            padding: '5px 12px', borderRadius: 100,
                          }}>
                            <div style={{
                              width: 12, height: 12, borderRadius: '50%',
                              border: '2px solid #fff', borderTopColor: 'transparent',
                              animation: 'spin 0.8s linear infinite',
                            }} />
                            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.9)', fontStyle: 'italic' }}>
                              Detecting location...
                            </span>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                          </div>
                        ) : notes.locationDetected && currentLocation ? (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                            padding: '5px 12px', borderRadius: 100,
                          }}>
                            <MapPin size={12} color="#fff" strokeWidth={2.5} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>
                              {currentLocation}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Controls strip — compact, below photo */}
                    <div style={{ padding: '14px 16px 16px' }}>
                      {/* Location input with autocomplete (only if not auto-detected) */}
                      {!notes.locationDetected && (
                        <div style={{ marginBottom: 8 }}>
                          <LocationAutocomplete
                            value={currentLocation}
                            onChange={(val) => setPhotoNotes(prev => ({
                              ...prev,
                              [photoReviewIndex]: { ...prev[photoReviewIndex], location: val },
                            }))}
                            onSelect={(place) => setPhotoNotes(prev => ({
                              ...prev,
                              [photoReviewIndex]: { ...prev[photoReviewIndex], location: place.address ? `${place.name}, ${place.address}` : place.name },
                            }))}
                            placeholder="Where was this taken?"
                            dark={dark}
                          />
                        </div>
                      )}
                      {/* Note input */}
                      <div style={{ position: 'relative', marginBottom: 14 }}>
                        <MessageCircle size={14} color={mutedColor} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                          value={currentNote}
                          onChange={(e) => setPhotoNotes(prev => ({
                            ...prev,
                            [photoReviewIndex]: { ...prev[photoReviewIndex], note: e.target.value },
                          }))}
                          placeholder="Add a note about this moment..."
                          className="pear-input"
                          style={{
                            width: '100%', height: 44, padding: '0 14px 0 34px',
                            fontSize: '0.85rem', borderRadius: 12,
                            border: inputBorder, background: inputBg,
                            outline: 'none', color: textColor, fontFamily: 'inherit',
                            boxSizing: 'border-box' as const,
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                          } as React.CSSProperties}
                        />
                      </div>
                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setReviewDone(true)}
                          className="pear-btn"
                          style={{
                            flex: 1, minHeight: 44, padding: '0 16px', borderRadius: 100,
                            background: ghostBg, border: ghostBorder,
                            fontSize: '0.85rem', fontWeight: 600, color: textColor, cursor: 'pointer',
                          }}
                        >
                          Skip all
                        </button>
                        <button
                          onClick={() => isLast ? setReviewDone(true) : setPhotoReviewIndex(prev => prev + 1)}
                          className="pear-btn"
                          style={{
                            flex: 1, minHeight: 44, padding: '0 16px', borderRadius: 100,
                            background: 'var(--pl-olive, #A3B18A)', border: 'none',
                            fontSize: '0.85rem', fontWeight: 700, color: '#fff', cursor: 'pointer',
                          }}
                        >
                          {isLast ? 'Done' : 'Next'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

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

        </div>{/* end glass card */}
        </div>{/* end pear-stage-card */}
      </div>{/* end pear-stage */}

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