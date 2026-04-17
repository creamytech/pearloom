'use client';

// Spotlight UI — single centered card, large Pear mascot, step-by-step

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, MapPin, MessageCircle, Check, Mic, Music } from 'lucide-react';
import { PearMascot } from '@/components/icons/PearMascot';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { OccasionCard, SitePreviewCard } from '@/components/wizard/WizardCards';
import { LocationAutocomplete } from '@/components/wizard/LocationAutocomplete';
import { ColorPaletteCard } from '@/components/wizard/WizardCardsB';
import { PearCalendar } from '@/components/wizard/PearCalendar';
import { SiteRenderer } from '@/components/editor/SiteRenderer';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import { formatSiteDisplayUrl } from '@/lib/site-urls';
import { StoryLayoutPicker, type StoryLayoutType } from '@/components/blocks/StoryLayouts';
import { useGenerationTicker } from '@/components/wizard/useGenerationTicker';
import { WizardBreadcrumb, type BreadcrumbStepKey } from '@/components/wizard/WizardBreadcrumb';
import { useConfetti } from '@/components/wizard/useConfetti';
import { PhotoDropZone } from '@/components/wizard/PhotoDropZone';
import { useSpeechRecognition } from '@/components/wizard/useSpeechRecognition';
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
  /** User-picked story layout — maps to manifest.storyLayout on generation. */
  storyLayout?: StoryLayoutType;
  /** Optional Spotify or YouTube URL that powers a music block. */
  songUrl?: string;
}

type Step = 'occasion' | 'names' | 'date' | 'venue' | 'vibe-ask' | 'vibe-pick' | 'photos' | 'photo-review' | 'layout' | 'song' | 'ready';

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

// Determine current step from collected data.
//
// NOTE: photos come BEFORE vibe so Pear can auto-suggest vibes
// from the actual photos the user picked (see the vibe-ask
// step's "Let Pear look at your photos" suggestions block).
function currentStep(c: Collected, photosDecided: boolean, vibeDescription: string, photosCount: number, reviewDone: boolean, layoutConfirmed: boolean, songDecided: boolean): Step {
  if (!c.occasion) return 'occasion';
  if (!c.names?.[0]) return 'names';
  if (c.occasion === 'wedding' || c.occasion === 'engagement' || c.occasion === 'anniversary') {
    if (!c.names?.[1]) return 'names';
  }
  if (!c.date) return 'date';
  if (!c.venue) return 'venue';
  if (!photosDecided) return 'photos';
  if (photosCount > 0 && !reviewDone) return 'photo-review';
  if (!c.vibe) return vibeDescription ? 'vibe-pick' : 'vibe-ask';
  // Ask the user to pick a story layout before we build so the live
  // preview renders with their chosen format, not the default.
  if (!layoutConfirmed) return 'layout';
  if (!songDecided) return 'song';
  return 'ready';
}

// Step titles — direct, professional UX writing (no mascot voice)
function titleForStep(step: Step, collected: Collected): string {
  const name1 = collected.names?.[0];
  const name2 = collected.names?.[1];
  const nameDisplay = name2 ? `${name1} & ${name2}` : name1;

  switch (step) {
    case 'occasion': return 'What are we celebrating?';
    case 'names': return 'Who is this for?';
    case 'date': return "When's the date?";
    case 'venue': return "Where's it happening?";
    case 'vibe-ask': return 'Describe your style';
    case 'vibe-pick': return 'Pick a color palette';
    case 'photos': return 'Add your photos';
    case 'photo-review': return 'Review your photos';
    case 'layout': return 'Choose a layout';
    case 'song': return 'Add a song';
    case 'ready': return `${nameDisplay}'s site is ready`;
  }
}

// Step descriptions — helpful context below the title
function descriptionForStep(step: Step, collected: Collected): string {
  const occ = collected.occasion;
  switch (step) {
    case 'occasion': return 'This helps us personalize your site layout and features.';
    case 'names':
      if (occ === 'birthday') return 'Just their first name is perfect.';
      if (occ === 'engagement') return 'Both first names — real ones or nicknames.';
      return 'First names work great.';
    case 'date':
      return "We'll add a countdown to your site.";
    case 'venue': return "We'll add it to the map for your guests. Skip if TBD.";
    case 'vibe-ask': return 'Colors, themes, moods — describe what you want.';
    case 'vibe-pick': return `Based on "${collected.vibe?.split(' - ')[0] || ''}"`;
    case 'photos': return 'Photos make your site personal. Upload or pick from Google Photos.';
    case 'photo-review': return 'Add locations and notes to enrich the story.';
    case 'layout': return 'You can always change this later in the editor.';
    case 'song': return 'Optional — paste a Spotify or YouTube link.';
    case 'ready': return 'Review and build your site.';
  }
}

// Detect if the vibe is dark-themed — used for contrast adaptation
function isDarkVibe(vibe?: string): boolean {
  if (!vibe) return false;
  const v = vibe.toLowerCase();
  return v.includes('dark') || v.includes('moody') || v.includes('gothic') || v.includes('midnight') || v.includes('noir') || v.includes('black') || v.includes('navy') || v.includes('celestial');
}

// Step index for progress bar (0-based out of total steps)
const TOTAL_STEPS = 11;
function stepIndex(step: Step): number {
  const ORDER: Step[] = ['occasion', 'names', 'date', 'venue', 'photos', 'photo-review', 'vibe-ask', 'vibe-pick', 'layout', 'song', 'ready'];
  return ORDER.indexOf(step);
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
  /** Palette the user tapped but hasn't confirmed yet. */
  const [pendingPalette, setPendingPalette] = useState<{ name: string; colors: string[] } | null>(null);
  const [photoReviewIndex, setPhotoReviewIndex] = useState(0);
  const [photoNotes, setPhotoNotes] = useState<Record<number, { location?: string; locationDetected?: boolean; date?: string; note?: string }>>({});
  const [reviewDone, setReviewDone] = useState(false);
  /** User confirmed layout selection (requires explicit Continue). */
  const [layoutConfirmed, setLayoutConfirmed] = useState(false);
  /** User dismissed the optional "your song" step (with or without a value). */
  const [songDecided, setSongDecided] = useState(false);
  /** Gemini-Vision-suggested vibes from the user's uploaded photos. */
  const [photoSuggestions, setPhotoSuggestions] = useState<Array<{
    vibe: string;
    reason: string;
    palette?: string[];
  }>>([]);
  /** Whether we're currently fetching vibe suggestions. */
  const [suggestingVibe, setSuggestingVibe] = useState(false);
  const [genStep, setGenStep] = useState(0);
  /** Raw server pass number (0..7). Drives the dynamic ticker. */
  const [genPass, setGenPass] = useState(0);
  const [completedData, setCompletedData] = useState<{ manifest: any; names: [string, string]; subdomain: string; occasion?: string } | null>(null);
  const [genProgress, setGenProgress] = useState(0); // 0-100
  const inputRef = useRef<HTMLInputElement>(null);
  const collectedRef = useRef(collected);
  collectedRef.current = collected;
  const selectedPhotosRef = useRef<any[]>([]);
  useEffect(() => { selectedPhotosRef.current = selectedPhotos; }, [selectedPhotos]);

  const step = currentStep(collected, photosDecided, vibeDescription, selectedPhotos.length, reviewDone, layoutConfirmed, songDecided);
  const stepTitle = titleForStep(step, collected);
  const stepDesc = descriptionForStep(step, collected);
  const currentStepIdx = stepIndex(step);
  const progressPct = Math.round((currentStepIdx / (TOTAL_STEPS - 1)) * 100);
  const dark = isDarkVibe(collected.vibe);
  const fireConfetti = useConfetti();

  // ── Breadcrumb edit handler ────────────────────────────────
  // Resets a single field on `collected`, which makes
  // `currentStep()` automatically rewind to that step so the
  // user can fix a typo without losing everything after it.
  const handleEditField = useCallback((field: BreadcrumbStepKey) => {
    setDirection(-1);
    if (field === 'occasion') {
      setCollected((prev) => ({ ...prev, occasion: undefined }));
    } else if (field === 'names') {
      setCollected((prev) => ({ ...prev, names: undefined }));
      setInput('');
    } else if (field === 'date') {
      setCollected((prev) => ({ ...prev, date: undefined }));
    } else if (field === 'venue') {
      setCollected((prev) => ({ ...prev, venue: undefined }));
      setInput('');
    } else if (field === 'vibe') {
      setCollected((prev) => ({ ...prev, vibe: undefined }));
      setVibeDescription('');
      setGeneratedPalettes([]);
      setSelectedPaletteColors(null);
    } else if (field === 'photos') {
      setPhotosDecided(false);
      setSelectedPhotos([]);
      setReviewDone(false);
      setPhotoSuggestions([]); // stale; re-derive on new photos
    } else if (field === 'layout') {
      setCollected((prev) => ({ ...prev, storyLayout: undefined }));
      setLayoutConfirmed(false);
    }
    // Reset the song step whenever any earlier field changes
    // so the user lands on it again after re-confirming later
    // steps (and isn't silently skipping back to ready).
    setLayoutConfirmed(false);
    setSongDecided(false);
  }, []);

  // ── Freeform description mode ──────────────────────────────
  // Power users tap "Tell Pear everything at once" on the
  // occasion screen and paste a natural-language description;
  // we send it to /api/wizard/parse and merge the extracted
  // fields into `collected` in one shot.
  const [freeformOpen, setFreeformOpen] = useState(false);
  const [freeformText, setFreeformText] = useState('');
  const [freeformLoading, setFreeformLoading] = useState(false);
  const [freeformError, setFreeformError] = useState<string | null>(null);
  const freeformTextRef = useRef(freeformText);
  useEffect(() => { freeformTextRef.current = freeformText; }, [freeformText]);

  // Voice dictation for the freeform textarea — tap the mic and
  // speak; we append the transcript to whatever was already in
  // the input so users can speak and type in the same session.
  // Renamed to `dictation` (not `speech`) because `speech` is
  // already used above for the Pear speech-bubble text.
  const dictation = useSpeechRecognition();
  const dictationBaselineRef = useRef<string>('');
  const startDictation = useCallback(() => {
    if (dictation.listening) {
      dictation.stop();
      return;
    }
    dictationBaselineRef.current = freeformTextRef.current;
    dictation.start((transcript) => {
      // Append the running transcript to whatever text was
      // already in the input when the user tapped the mic.
      const baseline = dictationBaselineRef.current;
      const joiner = baseline && !baseline.endsWith(' ') ? ' ' : '';
      setFreeformText(`${baseline}${joiner}${transcript}`.trim());
    });
  }, [dictation]);
  const submitFreeform = useCallback(async () => {
    const text = freeformText.trim();
    if (text.length < 3 || freeformLoading) return;
    setFreeformLoading(true);
    setFreeformError(null);
    try {
      const res = await fetch('/api/wizard/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: '' }));
        throw new Error(error || `Parse failed (${res.status})`);
      }
      const parsed = await res.json() as {
        occasion?: string | null;
        name1?: string | null;
        name2?: string | null;
        date?: string | null;
        venue?: string | null;
        vibe?: string | null;
      };

      // Merge the parsed fields into `collected`. Fields the
      // parser couldn't extract stay unset so the wizard just
      // continues from wherever the user stopped providing info.
      setCollected((prev) => {
        const next: typeof prev = { ...prev };
        if (parsed.occasion) next.occasion = parsed.occasion;
        if (parsed.name1 || parsed.name2) {
          next.names = [
            parsed.name1 || prev.names?.[0] || '',
            parsed.name2 || prev.names?.[1] || '',
          ];
        }
        if (parsed.date) next.date = parsed.date;
        if (parsed.venue) next.venue = parsed.venue;
        if (parsed.vibe) next.vibe = parsed.vibe;
        return next;
      });
      if (parsed.vibe) {
        // Seed the vibe description so the vibe-pick step shows
        // palettes right away instead of asking for it again.
        setVibeDescription(parsed.vibe);
      }
      setDirection(1);
      setFreeformOpen(false);
      setFreeformText('');
    } catch (err) {
      setFreeformError(err instanceof Error ? err.message : 'Pear couldn\u2019t read that');
    } finally {
      setFreeformLoading(false);
    }
  }, [freeformText, freeformLoading]);

  // Editorial tokens — cream paper, gold hairlines, ink text
  const textColor = '#18181B';
  const mutedColor = '#52525B';
  const inputBg = 'rgba(250,247,242,0.65)';
  const inputBorder = '1px solid rgba(184,147,90,0.38)';
  const ghostBg = 'transparent';
  const ghostBorder = '1px solid rgba(184,147,90,0.45)';

  // NOTE: we no longer auto-open the Google Photos browser on
  // the photos step — the user now picks between drag-and-drop
  // direct upload and Google Photos themselves. The browser is
  // triggered by the explicit "Pick from Google Photos" button
  // inside the photos step render block.

  // ── Keyboard shortcuts — small power-user win.
  //    Esc closes overlays (photo browser, freeform mode).
  //    Arrow-left steps back by clearing the current field.
  //    We intentionally don't map Arrow-right/Enter to "continue"
  //    because each step already has its own commit gesture and
  //    we don't want surprise submissions when users are typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Never fire while typing in inputs/textareas
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (showPhotoBrowser) {
          setShowPhotoBrowser(false);
          return;
        }
        if (freeformOpen) {
          setFreeformOpen(false);
          return;
        }
      }

      if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        // Cmd/Ctrl + ← steps back by clearing the current field
        // and letting `currentStep()` rewind.
        e.preventDefault();
        if (step === 'names') handleEditField('occasion');
        else if (step === 'date') handleEditField('names');
        else if (step === 'venue') handleEditField('date');
        else if (step === 'photos') handleEditField('venue');
        else if (step === 'vibe-ask' || step === 'vibe-pick') handleEditField('photos');
        else if (step === 'layout') handleEditField('vibe');
        else if (step === 'song') handleEditField('layout');
        else if (step === 'ready') setSongDecided(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, showPhotoBrowser, freeformOpen, handleEditField]);

  // ── AI vibe suggestion — trigger on vibe-ask step if photos
  //    are available. Sends 2-4 photos to Gemini Vision and
  //    renders 3 tappable vibe suggestions above the text input.
  useEffect(() => {
    if (step !== 'vibe-ask') return;
    if (selectedPhotos.length === 0) return;
    if (photoSuggestions.length > 0) return;
    if (suggestingVibe) return;

    const photoUrls = selectedPhotos
      .slice(0, 4)
      .map((p) => p?.baseUrl || p?.url || p?.uri || '')
      .filter(Boolean);
    if (photoUrls.length === 0) return;

    let cancelled = false;
    setSuggestingVibe(true);
    fetch('/api/photos/suggest-vibe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoUrls,
        occasion: collected.occasion,
        names: collected.names,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Suggest failed (${res.status})`);
        return res.json();
      })
      .then((data: { suggestions?: Array<{ vibe: string; reason: string; palette?: string[] }> }) => {
        if (cancelled) return;
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setPhotoSuggestions(data.suggestions);
        }
      })
      .catch(() => { /* silent — text input still works */ })
      .finally(() => {
        if (!cancelled) setSuggestingVibe(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedPhotos.length]);

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
    setGenPass(0);
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
      // Honor the user's story layout pick from the wizard — falls back to
      // the classic parallax default if they skipped the step.
      storyLayout: (c.storyLayout || 'parallax') as StoryLayoutType,
      pageMode: 'single-scroll',
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
      // User-picked story layout from the wizard — persisted to
      // manifest.storyLayout so the final site renders with it.
      storyLayout: c.storyLayout || 'parallax',
      // Chosen color palette from the wizard — must be honored as the final palette.
      selectedPaletteColors: selectedPaletteColors || undefined,
      // Per-photo notes + manual locations collected during photo review.
      photoNotes: Object.keys(photoNotesById).length > 0 ? photoNotesById : undefined,
      // Optional song URL — Spotify/YouTube link the user pasted
      // on the song step. The server adds a music block to the
      // manifest when this is set.
      songUrl: c.songUrl?.trim() || undefined,
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
                setGenPass(pass);
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
                    // Server snapshots are canonical once they arrive:
                    // their chapters/cover/heroSlideshow point at
                    // permanent R2 URLs, while the skeleton's versions
                    // wrap ephemeral Google Picker tokens that expire
                    // within the hour. Prefer `snap.*` whenever it's
                    // populated and only fall back to the skeleton
                    // when the server hasn't filled that field yet.
                    return {
                      ...prev,
                      ...snap,
                      chapters: snap.chapters?.length ? snap.chapters : prev.chapters,
                      blocks: snap.blocks?.length ? snap.blocks : prev.blocks,
                      coverPhoto: snap.coverPhoto || prev.coverPhoto,
                      heroSlideshow: snap.heroSlideshow?.length
                        ? snap.heroSlideshow
                        : prev.heroSlideshow,
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

  // NOTE: the canonical `handleEditField` is defined earlier in
  // the component (around line 425) and is used by the wizard
  // breadcrumb. A duplicate stub used to live here from an
  // earlier draft — delete it so the component compiles.

  // ── SPLIT POINT: RENDER STARTS BELOW ──
  // ── Generating phase ─────────────────────────────────────
  const GEN_PHASES = ['Understanding your vision', 'Choosing colors and fonts', 'Designing your pages', 'Writing your content', 'Adding final touches'];

  // Fallback timer — only advances genStep if SSE isn't providing updates
  useEffect(() => {
    if (phase !== 'generating') { setGenStep(0); setGenPass(0); setGenProgress(0); return; }
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
    return (
      <GeneratingStage
        collected={collected}
        selectedPaletteColors={selectedPaletteColors}
        photoCount={selectedPhotos.length}
        genPass={genPass}
        genStep={genStep}
        genProgress={genProgress}
        partialManifest={partialManifest}
      />
    );
  }

  // ── Error phase ──────────────────────────────────────────
  if (phase === 'error') {
    // Figure out a human-friendly error category so the copy
    // matches what actually happened instead of always saying
    // "something went wrong".
    const errMsg = genError || 'An unexpected error occurred while generating your site.';
    const isTimeout = /timeout|timed out|abort/i.test(errMsg);
    const isRate = /rate limit|too many/i.test(errMsg);
    const isAuth = /unauthoriz|sign ?out|session/i.test(errMsg);
    const isAI = /gemini|invalid json|model|generation/i.test(errMsg);
    const headline = isTimeout ? 'Pear needed more time'
      : isRate ? 'Too many tries at once'
      : isAuth ? 'Please sign back in'
      : isAI ? 'Pear hit a snag'
      : 'Something went sideways';
    const suggestion = isTimeout ? 'Sometimes the AI takes a little longer. One more try usually does it.'
      : isRate ? 'Wait a minute and try again — our AI quota resets quickly.'
      : isAuth ? 'Your Google session expired. Sign back in and we\u2019ll pick up right where you left off.'
      : isAI ? 'This usually works on the second attempt — the AI can be moody.'
      : 'Your answers are safe. Let\u2019s try again.';

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
      }}>
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, maxWidth: 480, width: '90%' }}>
          <PearMascot size={30} mood="thinking" color="rgba(184,147,90,0.75)" />

          <div style={{
            background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
            borderRadius: 2,
            padding: '28px 26px 22px',
            border: '1px solid rgba(184,147,90,0.28)',
            borderTop: '2px solid rgba(139,45,45,0.65)',
            boxShadow: '0 24px 60px rgba(22,16,6,0.14), 0 2px 8px rgba(22,16,6,0.06)',
            width: '100%', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.32em', textTransform: 'uppercase',
              color: 'rgba(139,45,45,0.85)', marginBottom: 10,
            }}>Something went wrong</div>
            <p style={{
              fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
              fontStyle: 'italic',
              fontSize: '1.45rem', fontWeight: 400,
              color: '#18181B', margin: '0 0 8px',
              letterSpacing: '-0.008em',
              lineHeight: 1.1,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}>{headline}</p>
            <p style={{
              fontSize: '0.82rem', color: '#52525B',
              margin: '0 0 8px', lineHeight: 1.55,
              fontFamily: 'var(--pl-font-body, inherit)',
            }}>{suggestion}</p>
            <p style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 9.5, letterSpacing: '0.04em',
              color: 'rgba(184,147,90,0.8)', marginBottom: 18,
              lineHeight: 1.5,
            }}>{errMsg}</p>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 2,
              background: 'rgba(184,147,90,0.1)',
              border: '1px solid rgba(184,147,90,0.38)',
              borderTop: '1.5px solid rgba(184,147,90,0.65)',
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.24em',
              textTransform: 'uppercase', color: '#18181B', marginBottom: 20,
            }}>
              <Check size={10} strokeWidth={3} color="rgba(184,147,90,0.95)" />
              {selectedPhotos.length} plates · {collected.vibe ? 'vibe set' : 'vibe pending'} · nothing lost
            </div>

            <div style={{
              display: 'flex', gap: 8, justifyContent: 'center',
              paddingTop: 14,
              borderTop: '1px solid rgba(184,147,90,0.28)',
            }}>
              <button onClick={() => { setPhase('chat'); setGenError(null); }}
                style={{
                  padding: '10px 20px', borderRadius: 2,
                  background: 'transparent', border: '1px solid rgba(184,147,90,0.45)',
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.24em', textTransform: 'uppercase',
                  color: '#18181B', cursor: 'pointer',
                  transition: 'background 180ms ease, border-color 180ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(184,147,90,0.1)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,147,90,0.75)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,147,90,0.45)';
                }}
              >Revise Answers</button>
              {retryCount < 3 && (
                <button onClick={() => { setPhase('chat'); setGenError(null); setTimeout(() => handleBuild(), 50); }}
                  style={{
                    padding: '10px 20px', borderRadius: 2,
                    background: '#18181B', border: 'none',
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.24em', textTransform: 'uppercase',
                    color: '#FAF7F2', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 0 0 3px rgba(184,147,90,0.22)',
                    transition: 'box-shadow 180ms ease',
                  }}
                >
                  <Sparkles size={12} color="#F0D484" />
                  Press Again{retryCount > 0 ? ` · ${retryCount}/3` : ''}
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
    const siteUrl = formatSiteDisplayUrl(
      completedData.subdomain,
      '',
      completedData.occasion || completedData.manifest?.occasion,
    );
    const displayNames = completedData.names[1]
      ? `${completedData.names[0]} & ${completedData.names[1]}`
      : completedData.names[0];

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'relative', zIndex: 10, maxWidth: 520, width: '92%',
            background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
            borderRadius: 2,
            padding: '36px 32px 28px',
            border: '1px solid rgba(184,147,90,0.28)',
            borderTop: '2px solid rgba(212,175,55,0.8)',
            boxShadow: '0 28px 72px rgba(22,16,6,0.18), 0 2px 10px rgba(22,16,6,0.08)',
            textAlign: 'center',
          }}
        >
          {/* Masthead above pear */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 18, gap: 10,
          }}>
            <span style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 9.5, fontWeight: 700,
              letterSpacing: '0.32em', textTransform: 'uppercase',
              color: 'rgba(184,147,90,0.9)',
            }}>Published · {new Date().getFullYear()}</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.38)' }} />
            <span style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 9.5, fontWeight: 700,
              letterSpacing: '0.3em', textTransform: 'uppercase',
              color: 'rgba(184,147,90,0.9)',
            }}>№ 00</span>
          </div>

          <PearMascot size={30} mood="idle" color="rgba(184,147,90,0.85)" />

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{
              fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
              fontStyle: 'italic',
              fontSize: '2.1rem', fontWeight: 400,
              color: '#18181B', marginTop: 18, marginBottom: 4,
              letterSpacing: '-0.012em',
              lineHeight: 1.05,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >{displayNames}</motion.p>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.34em', textTransform: 'uppercase',
              color: 'rgba(184,147,90,0.95)',
              marginBottom: 26,
            }}
          >Building your site</motion.p>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            style={{
              background: 'rgba(250,247,242,0.8)',
              borderRadius: 2,
              padding: '16px 20px 14px',
              marginBottom: 22,
              border: '1px solid rgba(184,147,90,0.28)',
              borderTop: '1.5px solid rgba(184,147,90,0.65)',
              textAlign: 'left',
            }}
          >
            <p style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.3em',
              color: 'rgba(184,147,90,0.9)',
              marginBottom: 6, marginTop: 0,
            }}>Address</p>
            <p style={{
              fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
              fontStyle: 'italic',
              fontSize: '1.1rem',
              color: '#18181B',
              wordBreak: 'break-all' as const,
              margin: '0 0 10px',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              letterSpacing: '-0.004em',
            }}>{siteUrl}</p>
            <button onClick={() => navigator.clipboard?.writeText(`https://${siteUrl}`)}
              style={{
                padding: '6px 14px', borderRadius: 2,
                background: 'transparent',
                border: '1px solid rgba(184,147,90,0.45)',
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 9.5, fontWeight: 700,
                letterSpacing: '0.24em', textTransform: 'uppercase',
                color: '#18181B', cursor: 'pointer',
                transition: 'background 180ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,147,90,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >Transcribe Address</button>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{
              fontSize: '0.82rem',
              color: '#52525B',
              lineHeight: 1.55,
              marginBottom: 24,
              fontFamily: 'var(--pl-font-body, inherit)',
            }}
          >Plates archived. Every block is editable from the studio.</motion.p>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <button onClick={() => onComplete(completedData.manifest, completedData.names, completedData.subdomain)}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 2,
                background: '#18181B', border: 'none',
                borderTop: '2px solid rgba(212,175,55,0.8)',
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.3em', textTransform: 'uppercase',
                color: '#FAF7F2', cursor: 'pointer',
                boxShadow: '0 0 0 3px rgba(184,147,90,0.28)',
                transition: 'box-shadow 180ms ease',
              }}
            >Enter the Studio</button>
            <button onClick={() => window.open(`https://${siteUrl}`, '_blank')}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 2,
                background: 'transparent',
                border: '1px solid rgba(184,147,90,0.45)',
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.24em', textTransform: 'uppercase',
                color: '#18181B', cursor: 'pointer',
                transition: 'background 180ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,147,90,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >Preview your site</button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ── Main Spotlight UI ────────────────────────────────────
  const needsTwo = collected.occasion === 'wedding' || collected.occasion === 'engagement' || collected.occasion === 'anniversary';
  const hasFirstName = !!(collected.names?.[0] && !collected.names?.[1]);


  // Step folio number (01..NN) for the editorial masthead.
  const stepFolio = String(Math.max(1, stepIndex(step) + 1)).padStart(2, '0');
  const stepTotal = String(TOTAL_STEPS).padStart(2, '0');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)', overflowY: 'auto' }}>
      {/* Focus + interaction styles */}
      <style>{`
        .pear-input:focus-visible { box-shadow: 0 0 0 2px rgba(184,147,90,0.35) !important; outline: none; border-color: rgba(184,147,90,0.75) !important; }
        .pear-btn:focus-visible { box-shadow: 0 0 0 2px rgba(184,147,90,0.35) !important; outline: none; }
        .pear-btn:active { transform: scale(0.97); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Editorial paper grain: faint cross-rule texture */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(212,175,55,0.08) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(184,147,90,0.06) 0%, transparent 60%)',
      }} />

      {/* Back chip — editorial mono-cap */}
      <button
        onClick={onBack}
        className="pear-btn"
        style={{
          position: 'fixed', top: 22, left: 22, zIndex: 20,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '9px 14px 9px 12px',
          borderRadius: 2,
          background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
          border: '1px solid rgba(184,147,90,0.35)',
          borderTop: '1.5px solid rgba(184,147,90,0.7)',
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase',
          color: '#18181B', cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(22,16,6,0.08)',
          transition: 'background 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#F5EFE3';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,147,90,0.65)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,147,90,0.35)';
        }}
      >
        <ArrowLeft size={12} strokeWidth={2.4} />
        Return
      </button>

      {/* ── Single centered card ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 620, padding: '80px 20px 48px',
      }}>
        {/* Masthead above the card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px 12px',
          gap: 12,
        }}>
          <span style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.34em',
            textTransform: 'uppercase',
            color: 'rgba(184,147,90,0.9)',
          }}>
            The Pearloom · Atelier · Vol. {new Date().getFullYear()}
          </span>
          <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.42)' }} />
          <span style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'rgba(184,147,90,0.9)',
          }}>
            № {stepFolio} / {stepTotal}
          </span>
        </div>

        <div style={{
          background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
          borderRadius: 2,
          border: '1px solid rgba(184,147,90,0.28)',
          borderTop: '2px solid rgba(184,147,90,0.65)',
          boxShadow: '0 24px 60px rgba(22,16,6,0.14), 0 2px 8px rgba(22,16,6,0.06)',
          overflow: step === 'venue' || step === 'photo-review' ? 'visible' : 'hidden',
          position: 'relative',
        }}>
          {/* Progress rule — gold bar under the top rule */}
          <div style={{ height: 2, background: 'rgba(184,147,90,0.14)', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', background: 'linear-gradient(90deg, rgba(184,147,90,0.9), rgba(212,175,55,0.95))' }}
            />
          </div>

          {/* Card content */}
          <div style={{ padding: step === 'photo-review' ? 0 : '28px 30px 26px' }}>
            {/* Step header — mono kicker + italic Fraunces title */}
            {step !== 'photo-review' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`header-${step}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{ marginBottom: 22 }}
                >
                  <div style={{
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.32em',
                    textTransform: 'uppercase',
                    color: 'rgba(184,147,90,0.95)',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <span>Chapter № {stepFolio} · {step.replace(/-/g, ' ')}</span>
                    <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.28)' }} />
                  </div>
                  <h2 style={{
                    fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                    fontStyle: 'italic',
                    fontSize: '1.75rem',
                    fontWeight: 400,
                    color: '#18181B',
                    margin: '0 0 6px',
                    letterSpacing: '-0.012em',
                    lineHeight: 1.08,
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}>
                    {stepTitle}
                  </h2>
                  <p style={{
                    fontSize: '0.82rem',
                    color: '#52525B',
                    margin: 0,
                    lineHeight: 1.55,
                    fontFamily: 'var(--pl-font-body, inherit)',
                  }}>
                    {stepDesc}
                  </p>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Breadcrumb — editable chips for answered steps */}
            {step !== 'photo-review' && step !== 'occasion' && (
              <div style={{ marginBottom: 16 }}>
                <WizardBreadcrumb
                  collected={collected}
                  currentStep={step}
                  onEditField={handleEditField}
                  dark={false}
                />
              </div>
            )}

            {/* Step content — directional slide transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ minHeight: step === 'occasion' ? 200 : 120 }}
              >
              {/* ── Occasion step ── */}
              {step === 'occasion' && !freeformOpen && (
                <div>
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
                  {/* Power-user shortcut — lets people describe
                      their whole celebration in one sentence and
                      have Pear pre-fill every field at once. */}
                  <button
                    type="button"
                    onClick={() => setFreeformOpen(true)}
                    style={{
                      marginTop: 14,
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 2,
                      background: 'transparent',
                      border: '1px dashed rgba(184,147,90,0.55)',
                      color: '#18181B',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'background 180ms cubic-bezier(0.22,1,0.36,1), border-color 180ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(184,147,90,0.1)';
                      e.currentTarget.style.borderColor = 'rgba(184,147,90,0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(184,147,90,0.55)';
                    }}
                  >
                    <Sparkles size={12} />
                    Tell Pear the whole story
                  </button>
                </div>
              )}

              {/* ── Freeform natural-language entry ── */}
              {step === 'occasion' && freeformOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                      fontStyle: 'italic',
                      fontSize: '0.92rem',
                      color: '#52525B',
                      lineHeight: 1.5,
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    Describe your celebration in a sentence or two — Pear will
                    pull out the date, names, venue, and vibe.
                  </div>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      autoFocus
                      value={freeformText}
                      onChange={(e) => {
                        setFreeformText(e.target.value);
                        setFreeformError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          submitFreeform();
                        }
                      }}
                      placeholder={'e.g. October 28 2026 wedding in Cape Cod for Alex & Jordan — sage and linen, beach vibes, 80 guests'}
                      rows={4}
                      disabled={freeformLoading}
                      className="pear-input"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        paddingRight: dictation.supported ? 56 : 16,
                        borderRadius: 2,
                        border: inputBorder,
                        borderTop: '1.5px solid rgba(184,147,90,0.7)',
                        background: inputBg,
                        fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                        fontStyle: 'italic',
                        fontSize: 'max(16px, 1rem)',
                        color: textColor,
                        lineHeight: 1.4,
                        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                        outline: 'none',
                        resize: 'vertical',
                        minHeight: 104,
                        transition: 'border-color 180ms ease, box-shadow 180ms ease, background 180ms ease',
                        boxSizing: 'border-box' as const,
                      } as React.CSSProperties}
                    />
                    {/* Mic button — Web Speech API dictation. Hidden
                        in browsers that don't support it. */}
                    {dictation.supported && (
                      <button
                        type="button"
                        onClick={startDictation}
                        disabled={freeformLoading}
                        aria-label={dictation.listening ? 'Stop dictation' : 'Dictate with mic'}
                        title={dictation.listening ? 'Stop dictation' : 'Tap to dictate'}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          border: dictation.listening ? 'none' : '1px solid rgba(184,147,90,0.45)',
                          background: dictation.listening
                            ? '#18181B'
                            : 'rgba(250,247,242,0.9)',
                          boxShadow: dictation.listening
                            ? '0 0 0 3px rgba(184,147,90,0.22)'
                            : 'none',
                          cursor: freeformLoading ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: dictation.listening ? '#F0D484' : '#52525B',
                          transition: 'background 180ms ease, box-shadow 180ms ease',
                          animation: dictation.listening ? 'pear-mic-pulse 1.6s ease-in-out infinite' : undefined,
                        }}
                      >
                        <Mic size={15} />
                      </button>
                    )}
                    {/* Mic-pulse keyframe lives here so we don't
                        need a global stylesheet for one animation. */}
                    {dictation.listening && (
                      <style>{`
                        @keyframes pear-mic-pulse {
                          0%, 100% {
                            box-shadow: 0 0 0 3px rgba(184,147,90,0.4);
                          }
                          50% {
                            box-shadow: 0 0 0 10px rgba(184,147,90,0);
                          }
                        }
                      `}</style>
                    )}
                  </div>
                  {dictation.error && (
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: 'rgba(139,45,45,0.85)',
                        marginTop: -4,
                      }}
                    >
                      {dictation.error}
                    </div>
                  )}
                  {freeformError && (
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-body, inherit)',
                        fontSize: '0.78rem',
                        color: '#7A2323',
                        background: 'rgba(139,45,45,0.08)',
                        padding: '10px 14px',
                        borderRadius: 2,
                        borderLeft: '2px solid rgba(139,45,45,0.6)',
                      }}
                    >
                      <span style={{
                        display: 'block',
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.28em',
                        textTransform: 'uppercase',
                        color: 'rgba(139,45,45,0.85)',
                        marginBottom: 4,
                      }}>Erratum</span>
                      {freeformError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFreeformOpen(false);
                        setFreeformText('');
                        setFreeformError(null);
                      }}
                      disabled={freeformLoading}
                      style={{
                        flex: 1,
                        minHeight: 46,
                        padding: '0 16px',
                        borderRadius: 2,
                        background: ghostBg,
                        border: ghostBorder,
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.24em',
                        textTransform: 'uppercase',
                        color: textColor,
                        cursor: freeformLoading ? 'default' : 'pointer',
                        opacity: freeformLoading ? 0.5 : 1,
                        transition: 'background 180ms ease, border-color 180ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (freeformLoading) return;
                        e.currentTarget.style.background = 'rgba(184,147,90,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      Return
                    </button>
                    <button
                      type="button"
                      onClick={submitFreeform}
                      disabled={freeformLoading || freeformText.trim().length < 3}
                      style={{
                        flex: 1.4,
                        minHeight: 46,
                        padding: '0 18px',
                        borderRadius: 2,
                        background: freeformText.trim().length < 3
                          ? 'rgba(24,24,27,0.4)'
                          : '#18181B',
                        border: 'none',
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.24em',
                        textTransform: 'uppercase',
                        color: '#FAF7F2',
                        cursor: freeformLoading ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: freeformText.trim().length < 3 ? 'none' : '0 0 0 3px rgba(184,147,90,0.22)',
                        transition: 'box-shadow 180ms ease, background 180ms ease',
                      }}
                    >
                      {freeformLoading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              border: '2px solid rgba(240,212,132,0.35)',
                              borderTopColor: '#F0D484',
                            }}
                          />
                          Reading
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} />
                          Set the Page
                        </>
                      )}
                    </button>
                  </div>
                </div>
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
                      width: '100%', height: 52, padding: '0 18px',
                      fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                      fontStyle: 'italic',
                      fontSize: '1.1rem',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                      borderRadius: 2,
                      border: inputBorder,
                      borderTop: '1.5px solid rgba(184,147,90,0.7)',
                      background: inputBg,
                      outline: 'none', color: textColor,
                      letterSpacing: '-0.003em',
                      boxSizing: 'border-box' as const,
                      transition: 'border-color 180ms ease, box-shadow 180ms ease, background 180ms ease',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="pear-btn"
                    style={{
                      marginTop: 14, width: '100%', minHeight: 48,
                      padding: '0 16px', borderRadius: 2,
                      background: input.trim() ? '#18181B' : 'rgba(24,24,27,0.4)',
                      border: 'none',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.26em', textTransform: 'uppercase',
                      color: '#FAF7F2',
                      cursor: input.trim() ? 'pointer' : 'default',
                      boxShadow: input.trim() ? '0 0 0 3px rgba(184,147,90,0.22)' : 'none',
                      transition: 'box-shadow 180ms ease, background 180ms ease',
                    }}
                  >
                    Set the Names · ↵
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={handleVenueSkip}
                      style={{
                        flex: 1, minHeight: 48, padding: '0 16px', borderRadius: 2,
                        background: 'transparent', border: ghostBorder,
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.24em', textTransform: 'uppercase',
                        color: textColor, cursor: 'pointer',
                        transition: 'background 180ms ease, border-color 180ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(184,147,90,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      Venue · TBD
                    </button>
                    <button
                      onClick={() => { if (input.trim()) handleVenueSubmit(); }}
                      disabled={!input.trim()}
                      style={{
                        flex: 1, minHeight: 48, padding: '0 16px', borderRadius: 2,
                        background: input.trim() ? '#18181B' : 'rgba(24,24,27,0.4)',
                        border: 'none',
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.24em', textTransform: 'uppercase',
                        color: '#FAF7F2', cursor: input.trim() ? 'pointer' : 'default',
                        boxShadow: input.trim() ? '0 0 0 3px rgba(184,147,90,0.22)' : 'none',
                        transition: 'box-shadow 180ms ease, background 180ms ease',
                      }}
                    >
                      Mark the Map · ↵
                    </button>
                  </div>
                </div>
              )}

              {/* ── Vibe ask step — text input for description ── */}
              {step === 'vibe-ask' && (
                <div>
                  {/* AI-suggested vibes from the user's photos —
                      shown above the text input when we have
                      suggestions. Tap one to skip typing entirely
                      and jump straight to the palette picker. */}
                  {(suggestingVibe || photoSuggestions.length > 0) && (
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: '#71717A',
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Sparkles size={11} />
                        {suggestingVibe
                          ? 'Pear is reading your photos…'
                          : 'From your photos'}
                      </div>
                      {suggestingVibe ? (
                        <div
                          style={{
                            padding: '18px 14px',
                            borderRadius: 10,
                            background: '#F4F4F5',
                            border: '1px dashed #D4D4D8',
                            fontSize: '0.74rem',
                            color: mutedColor,
                            textAlign: 'center',
                            fontStyle: 'italic',
                          }}
                        >
                          Looking at your photos for the vibe…
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {photoSuggestions.map((s, i) => (
                            <motion.button
                              key={`${s.vibe}-${i}`}
                              type="button"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: i * 0.08 }}
                              whileHover={{ y: -1 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={async (e) => {
                                if (s.palette && s.palette.length > 0) {
                                  fireConfetti(e, {
                                    colors: s.palette,
                                    count: 18,
                                  });
                                }
                                setVibeDescription(s.vibe);
                                setDirection(1);
                                setLoading(true);
                                try {
                                  const palettes = await generatePalettesFromAI(
                                    s.vibe,
                                    collected.occasion,
                                  );
                                  setGeneratedPalettes(palettes);
                                } catch {
                                  setGeneratedPalettes(
                                    generatePalettesFallback(s.vibe, collected.occasion),
                                  );
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr',
                                alignItems: 'center',
                                gap: 12,
                                padding: '10px 14px',
                                borderRadius: 2,
                                border: '1px solid rgba(184,147,90,0.28)',
                                borderTop: '1.5px solid rgba(184,147,90,0.65)',
                                background: 'rgba(250,247,242,0.85)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontFamily: 'inherit',
                                transition: 'background 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
                              }}
                            >
                              {/* Swatch ribbon */}
                              {s.palette && s.palette.length > 0 && (
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: 0,
                                    flexShrink: 0,
                                    border: '1px solid rgba(184,147,90,0.45)',
                                  }}
                                >
                                  {s.palette.slice(0, 4).map((c, ci) => (
                                    <div
                                      key={ci}
                                      style={{
                                        width: 14,
                                        height: 22,
                                        background: c,
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                                    fontStyle: 'italic',
                                    fontSize: '0.95rem',
                                    fontWeight: 400,
                                    color: '#18181B',
                                    lineHeight: 1.2,
                                    letterSpacing: '-0.003em',
                                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                                  }}
                                >
                                  {s.vibe}
                                </div>
                                {s.reason && (
                                  <div
                                    style={{
                                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                                      fontSize: 9,
                                      fontWeight: 700,
                                      letterSpacing: '0.22em',
                                      textTransform: 'uppercase',
                                      color: 'rgba(184,147,90,0.9)',
                                      marginTop: 4,
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    Annotation · {s.reason}
                                  </div>
                                )}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          margin: '14px 0 6px',
                        }}
                      >
                        <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.28)' }} />
                        <span style={{
                          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.3em',
                          textTransform: 'uppercase',
                          color: 'rgba(184,147,90,0.85)',
                        }}>Or set your own</span>
                        <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.28)' }} />
                      </div>
                    </div>
                  )}
                  <form onSubmit={handleInputSubmit}>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="e.g. country western, rustic barn, horses..."
                      className="pear-input"
                      style={{
                        width: '100%', height: 52, padding: '0 18px', borderRadius: 2,
                        border: inputBorder,
                        borderTop: '1.5px solid rgba(184,147,90,0.7)',
                        background: inputBg,
                        fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                        fontStyle: 'italic',
                        fontSize: '1rem', color: textColor,
                        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                        letterSpacing: '-0.003em',
                        outline: 'none',
                        boxSizing: 'border-box' as const,
                        transition: 'border-color 180ms ease, box-shadow 180ms ease, background 180ms ease',
                      } as React.CSSProperties}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="pear-btn"
                      style={{
                        marginTop: 14, width: '100%', minHeight: 48, padding: '0 16px', borderRadius: 2,
                        background: input.trim() ? '#18181B' : 'rgba(24,24,27,0.4)',
                        color: '#FAF7F2',
                        border: 'none',
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.24em', textTransform: 'uppercase',
                        cursor: input.trim() ? 'pointer' : 'default',
                        boxShadow: input.trim() ? '0 0 0 3px rgba(184,147,90,0.22)' : 'none',
                        transition: 'box-shadow 180ms ease, background 180ms ease',
                      }}
                    >
                      Mix the Palette · ↵
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
                      marginTop: 8, width: '100%', minHeight: 46, padding: '0 16px', borderRadius: 2,
                      background: 'transparent', border: '1px dashed rgba(184,147,90,0.55)',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.22em', textTransform: 'uppercase',
                      color: textColor, cursor: 'pointer',
                      transition: 'background 180ms ease, border-color 180ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(184,147,90,0.1)';
                      e.currentTarget.style.borderColor = 'rgba(184,147,90,0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(184,147,90,0.55)';
                    }}
                  >
                    <Sparkles size={11} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
                    Surprise me
                  </button>
                </div>
              )}

              {/* ── Vibe pick step — generated palettes from user's description ── */}
              {step === 'vibe-pick' && (
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginBottom: 14,
                  }}>
                    <span style={{
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 9, fontWeight: 700,
                      letterSpacing: '0.3em', textTransform: 'uppercase',
                      color: 'rgba(184,147,90,0.9)',
                    }}>From</span>
                    <span style={{
                      fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                      fontStyle: 'italic', fontSize: '0.95rem',
                      color: '#18181B',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}>&ldquo;{vibeDescription}&rdquo;</span>
                    <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.32)' }} />
                  </div>
                  <ColorPaletteCard
                    palettes={generatedPalettes}
                    onSelect={(palette) => {
                      setPendingPalette(palette);
                      setSelectedPaletteColors(palette.colors);
                      try {
                        const active = document.activeElement as HTMLElement | null;
                        if (active) {
                          fireConfetti(active, {
                            colors: palette.colors,
                            count: 22,
                          });
                        }
                      } catch { /* non-fatal visual effect */ }
                    }}
                  />
                  <button
                    disabled={!pendingPalette}
                    onClick={() => {
                      if (pendingPalette) {
                        handleVibeSelect(pendingPalette.name.toLowerCase(), pendingPalette.colors);
                      }
                    }}
                    style={{
                      marginTop: 16, width: '100%', padding: '14px 0', borderRadius: 2,
                      background: pendingPalette ? '#18181B' : 'rgba(24,24,27,0.3)',
                      border: 'none',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.26em', textTransform: 'uppercase',
                      color: pendingPalette ? '#FAF7F2' : 'rgba(250,247,242,0.55)',
                      cursor: pendingPalette ? 'pointer' : 'default',
                      boxShadow: pendingPalette ? '0 0 0 3px rgba(184,147,90,0.22)' : 'none',
                      transition: 'background 180ms ease, box-shadow 180ms ease',
                    }}
                  >
                    Set the Palette · ↵
                  </button>
                  <button
                    onClick={() => {
                      setVibeDescription('');
                      setGeneratedPalettes([]);
                      setPendingPalette(null);
                      setDirection(-1);
                    }}
                    style={{
                      marginTop: 8, width: '100%', padding: '12px 0', borderRadius: 2,
                      background: 'transparent', border: ghostBorder,
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.22em', textTransform: 'uppercase',
                      color: textColor, cursor: 'pointer',
                      transition: 'background 180ms ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,147,90,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    Redraft the Vibe
                  </button>
                </div>
              )}

              {/* ── Photos step ── */}
              {step === 'photos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Drag-and-drop direct upload — the biggest
                      accessibility win of the wizard. Users who
                      don't have their photos in Google Photos can
                      upload straight from their device and the
                      rest of the flow treats them identically. */}
                  <PhotoDropZone
                    dark={dark}
                    onPhotosUploaded={(uploaded) => {
                      setSelectedPhotos((prev) => [...prev, ...uploaded]);
                      setPhotosDecided(true);
                    }}
                  />

                  {/* Divider */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      margin: '4px 0',
                    }}
                  >
                    <div style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.32)' }} />
                    <span style={{
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 9, fontWeight: 700,
                      letterSpacing: '0.3em', textTransform: 'uppercase',
                      color: 'rgba(184,147,90,0.9)',
                    }}>Or</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.32)' }} />
                  </div>

                  {/* Google Photos picker — original path */}
                  <button
                    type="button"
                    onClick={() => setShowPhotoBrowser(true)}
                    style={{
                      width: '100%',
                      minHeight: 50,
                      padding: '12px 16px',
                      borderRadius: 2,
                      background: 'rgba(250,247,242,0.85)',
                      border: '1px solid rgba(184,147,90,0.38)',
                      borderTop: '1.5px solid rgba(184,147,90,0.7)',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.24em', textTransform: 'uppercase',
                      color: '#18181B',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      transition: 'background 180ms ease, border-color 180ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F5EFE3';
                      e.currentTarget.style.borderColor = 'rgba(184,147,90,0.65)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(250,247,242,0.85)';
                      e.currentTarget.style.borderColor = 'rgba(184,147,90,0.38)';
                    }}
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 2a10 10 0 0 0-9.95 9h11.64L9.74 7.05a.75.75 0 0 1 1.06-1.06l5.5 5.5a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 1 1-1.06-1.06l3.95-3.95H2.05A10 10 0 1 0 12 2z" fill="#18181B" />
                    </svg>
                    Archive · Google Photos
                  </button>

                  <button
                    type="button"
                    onClick={handlePhotosSkip}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      color: 'rgba(184,147,90,0.85)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      textUnderlineOffset: 4,
                      textDecorationColor: 'rgba(184,147,90,0.35)',
                    }}
                  >
                    Run without photographs
                  </button>
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
                    {/* Photo — full bleed with rigid edges matching card */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', maxHeight: '52vh', overflow: 'hidden', borderRadius: 0 }}>
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
                      {/* Top bar — folio counter + date */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        padding: '14px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{
                          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                          fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.28em', textTransform: 'uppercase',
                          color: '#FAF7F2',
                          background: 'rgba(22,16,6,0.4)',
                          backdropFilter: 'blur(10px)',
                          padding: '5px 10px', borderRadius: 2,
                          border: '1px solid rgba(240,212,132,0.4)',
                          borderTop: '1.5px solid rgba(240,212,132,0.8)',
                        }}>
                          № {String(photoReviewIndex + 1).padStart(2, '0')} / {String(selectedPhotos.length).padStart(2, '0')}
                        </span>
                        {currentDate && (
                          <span style={{
                            fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                            fontStyle: 'italic',
                            fontSize: '0.82rem', color: '#FAF7F2',
                            background: 'rgba(22,16,6,0.4)',
                            backdropFilter: 'blur(10px)',
                            padding: '5px 12px', borderRadius: 2,
                            border: '1px solid rgba(240,212,132,0.35)',
                            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                          }}>
                            {currentDate}
                          </span>
                        )}
                      </div>
                      {/* Bottom — location badge or detecting */}
                      <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
                        {detectingLocation ? (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            background: 'rgba(22,16,6,0.4)', backdropFilter: 'blur(10px)',
                            padding: '6px 12px', borderRadius: 2,
                            border: '1px solid rgba(240,212,132,0.35)',
                          }}>
                            <div style={{
                              width: 11, height: 11, borderRadius: '50%',
                              border: '2px solid rgba(240,212,132,0.8)', borderTopColor: 'transparent',
                              animation: 'spin 0.8s linear infinite',
                            }} />
                            <span style={{
                              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                              fontSize: 9.5, fontWeight: 700,
                              letterSpacing: '0.28em', textTransform: 'uppercase',
                              color: 'rgba(250,247,242,0.95)',
                            }}>
                              Triangulating · Location
                            </span>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                          </div>
                        ) : notes.locationDetected && currentLocation ? (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            background: 'rgba(22,16,6,0.4)', backdropFilter: 'blur(10px)',
                            padding: '6px 12px', borderRadius: 2,
                            border: '1px solid rgba(240,212,132,0.4)',
                            borderTop: '1.5px solid rgba(240,212,132,0.8)',
                          }}>
                            <MapPin size={12} color="#F0D484" strokeWidth={2.5} />
                            <span style={{
                              fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                              fontStyle: 'italic',
                              fontSize: '0.85rem', color: '#FAF7F2',
                              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                            }}>
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
                        <MessageCircle size={14} color="rgba(184,147,90,0.85)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                          value={currentNote}
                          onChange={(e) => setPhotoNotes(prev => ({
                            ...prev,
                            [photoReviewIndex]: { ...prev[photoReviewIndex], note: e.target.value },
                          }))}
                          placeholder="Caption this moment…"
                          className="pear-input"
                          style={{
                            width: '100%', height: 46, padding: '0 14px 0 34px',
                            fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                            fontStyle: 'italic',
                            fontSize: '0.95rem', borderRadius: 2,
                            border: inputBorder,
                            borderTop: '1.5px solid rgba(184,147,90,0.7)',
                            background: inputBg,
                            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                            letterSpacing: '-0.003em',
                            outline: 'none', color: textColor,
                            boxSizing: 'border-box' as const,
                            transition: 'border-color 180ms ease, box-shadow 180ms ease',
                          } as React.CSSProperties}
                        />
                      </div>
                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setReviewDone(true)}
                          className="pear-btn"
                          style={{
                            flex: 1, minHeight: 46, padding: '0 16px', borderRadius: 2,
                            background: 'transparent', border: ghostBorder,
                            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                            fontSize: 10, fontWeight: 700,
                            letterSpacing: '0.22em', textTransform: 'uppercase',
                            color: textColor, cursor: 'pointer',
                            transition: 'background 180ms ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,147,90,0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          Finish Review
                        </button>
                        <button
                          onClick={() => isLast ? setReviewDone(true) : setPhotoReviewIndex(prev => prev + 1)}
                          className="pear-btn"
                          style={{
                            flex: 1, minHeight: 46, padding: '0 16px', borderRadius: 2,
                            background: '#18181B', border: 'none',
                            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                            fontSize: 10, fontWeight: 700,
                            letterSpacing: '0.22em', textTransform: 'uppercase',
                            color: '#FAF7F2', cursor: 'pointer',
                            boxShadow: '0 0 0 3px rgba(184,147,90,0.22)',
                            transition: 'box-shadow 180ms ease',
                          }}
                        >
                          {isLast ? 'Done' : 'Next step'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Story layout step ── */}
              {step === 'layout' && (
                <div>
                  <StoryLayoutPicker
                    selected={collected.storyLayout || 'parallax'}
                    onSelect={(layout) => {
                      setCollected(prev => ({ ...prev, storyLayout: layout }));
                    }}
                  />
                  <button
                    onClick={() => {
                      setDirection(1);
                      setCollected(prev => ({
                        ...prev,
                        storyLayout: prev.storyLayout || 'parallax',
                      }));
                      setLayoutConfirmed(true);
                    }}
                    style={{
                      marginTop: 18, width: '100%', padding: '14px 0', borderRadius: 2,
                      background: '#18181B',
                      border: 'none',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.26em', textTransform: 'uppercase',
                      color: '#FAF7F2',
                      cursor: 'pointer',
                      boxShadow: '0 0 0 3px rgba(184,147,90,0.22)',
                      transition: 'box-shadow 180ms ease, background 180ms ease',
                    }}
                  >
                    Set the Layout · ↵
                  </button>
                </div>
              )}

              {/* ── Song step — optional music block ── */}
              {step === 'song' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                      fontStyle: 'italic',
                      fontSize: '0.95rem',
                      color: '#52525B',
                      lineHeight: 1.5,
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    Paste a Spotify or YouTube link — Pear sets the needle and
                    adds a music block beneath your hero.
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="url"
                      value={collected.songUrl || ''}
                      onChange={(e) =>
                        setCollected((prev) => ({ ...prev, songUrl: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setSongDecided(true);
                          setDirection(1);
                        }
                      }}
                      placeholder="spotify.com/track/… or youtu.be/…"
                      className="pear-input"
                      style={{
                        width: '100%',
                        height: 52,
                        padding: '0 46px 0 16px',
                        borderRadius: 2,
                        border: inputBorder,
                        borderTop: '1.5px solid rgba(184,147,90,0.7)',
                        background: inputBg,
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 'max(16px, 0.88rem)',
                        letterSpacing: '0.02em',
                        color: textColor,
                        outline: 'none',
                        boxSizing: 'border-box' as const,
                        transition: 'border-color 180ms ease, box-shadow 180ms ease',
                      } as React.CSSProperties}
                    />
                    <Music
                      size={15}
                      style={{
                        position: 'absolute',
                        right: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'rgba(184,147,90,0.85)',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSongDecided(true);
                        setCollected((prev) => ({ ...prev, songUrl: undefined }));
                        setDirection(1);
                      }}
                      style={{
                        flex: 1,
                        minHeight: 48,
                        padding: '0 16px',
                        borderRadius: 2,
                        background: 'transparent',
                        border: ghostBorder,
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.24em', textTransform: 'uppercase',
                        color: textColor,
                        cursor: 'pointer',
                        transition: 'background 180ms ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,147,90,0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      Silent Page
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSongDecided(true);
                        setDirection(1);
                      }}
                      disabled={!(collected.songUrl || '').trim()}
                      style={{
                        flex: 1.2,
                        minHeight: 48,
                        padding: '0 18px',
                        borderRadius: 2,
                        background: (collected.songUrl || '').trim()
                          ? '#18181B'
                          : 'rgba(24,24,27,0.4)',
                        border: 'none',
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.24em', textTransform: 'uppercase',
                        color: '#FAF7F2',
                        cursor: (collected.songUrl || '').trim() ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: (collected.songUrl || '').trim() ? '0 0 0 3px rgba(184,147,90,0.22)' : 'none',
                        transition: 'box-shadow 180ms ease, background 180ms ease',
                      }}
                    >
                      <Music size={12} />
                      Set the Needle
                    </button>
                  </div>
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
                    onClick={(e) => {
                      try {
                        fireConfetti(e, {
                          colors: selectedPaletteColors || ['#A3B18A', '#D4A574', '#E8C39C', '#C4A96A'],
                          count: 42,
                          spread: 220,
                          lifetimeMs: 1600,
                        });
                      } catch { /* non-fatal visual effect */ }
                      handleBuild();
                    }}
                    style={{
                      marginTop: 18,
                      width: '100%',
                      padding: '18px 0',
                      borderRadius: 2,
                      background: '#18181B',
                      border: 'none',
                      borderTop: '2px solid rgba(212,175,55,0.8)',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.3em', textTransform: 'uppercase',
                      color: '#FAF7F2',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      boxShadow: '0 0 0 3px rgba(184,147,90,0.28), 0 10px 30px rgba(22,16,6,0.18)',
                      transition: 'box-shadow 180ms ease, transform 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 4px rgba(184,147,90,0.36), 0 14px 36px rgba(22,16,6,0.22)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(184,147,90,0.28), 0 10px 30px rgba(22,16,6,0.18)';
                    }}
                  >
                    <Sparkles size={14} color="#F0D484" />
                    Build my site
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          </div>{/* end card content */}
        </div>{/* end card shell */}
      </div>{/* end centered wrapper */}

      {/* Photo Browser overlay */}
      <AnimatePresence>
        {showPhotoBrowser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(22,16,6,0.55)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
                borderRadius: 2,
                padding: 24, maxWidth: 600, width: '92%',
                maxHeight: '82vh', overflow: 'auto',
                border: '1px solid rgba(184,147,90,0.28)',
                borderTop: '2px solid rgba(184,147,90,0.65)',
                boxShadow: '0 28px 72px rgba(22,16,6,0.32), 0 2px 10px rgba(22,16,6,0.08)',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 16,
              }}>
                <span style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.32em', textTransform: 'uppercase',
                  color: 'rgba(184,147,90,0.9)',
                }}>Archive · Google Photos</span>
                <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.38)' }} />
                <span style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.28em', textTransform: 'uppercase',
                  color: 'rgba(184,147,90,0.9)',
                }}>№ {String(selectedPhotos.length).padStart(2, '0')}</span>
              </div>
              <PhotoBrowser
                onSelectionChange={setSelectedPhotos}
                maxSelection={20}
              />

              <div style={{
                display: 'flex', gap: 10, marginTop: 18,
                paddingTop: 14,
                borderTop: '1px solid rgba(184,147,90,0.28)',
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={handlePhotosSkip}
                  style={{
                    padding: '10px 22px', borderRadius: 2,
                    background: 'transparent', border: ghostBorder,
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.24em', textTransform: 'uppercase',
                    color: '#18181B', cursor: 'pointer',
                    transition: 'background 180ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,147,90,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Defer
                </button>
                <button
                  onClick={handlePhotosDone}
                  style={{
                    padding: '10px 22px', borderRadius: 2,
                    background: selectedPhotos.length > 0 ? '#18181B' : 'rgba(24,24,27,0.4)',
                    border: 'none',
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.24em', textTransform: 'uppercase',
                    color: '#FAF7F2',
                    cursor: selectedPhotos.length > 0 ? 'pointer' : 'default',
                    boxShadow: selectedPhotos.length > 0 ? '0 0 0 3px rgba(184,147,90,0.22)' : 'none',
                    transition: 'box-shadow 180ms ease, background 180ms ease',
                  }}
                >
                  Lock Plate{selectedPhotos.length > 0 ? ` · ${selectedPhotos.length}` : ''}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GeneratingStage — the "something magical is happening" screen
// Extracted into its own component so the ticker hook + pulse
// animation + continuous progress tween don't thrash the parent
// component on every tick.
// ─────────────────────────────────────────────────────────────

interface GeneratingStageProps {
  collected: Collected;
  selectedPaletteColors: string[] | null;
  photoCount: number;
  genPass: number;
  genStep: number;
  genProgress: number;
  partialManifest: StoryManifest | null;
}

function GeneratingStage({
  collected,
  selectedPaletteColors,
  photoCount,
  genPass,
  genStep,
  genProgress,
  partialManifest,
}: GeneratingStageProps) {
  const displayNames = collected.names
    ? collected.names[1]
      ? `${collected.names[0]} & ${collected.names[1]}`
      : collected.names[0]
    : '';

  // ── Dynamic ticker — rotates through phase-specific messages
  //    on a 2.4s interval so the UI always feels alive even when
  //    the server hasn't shipped a new snapshot. ──
  const ticker = useGenerationTicker({
    pass: genPass,
    manifest: partialManifest,
    photoCount,
    names: collected.names,
  });

  // ── Continuous progress bar — the server only emits progress
  //    4 times across a 60-90s generation, so we tween between
  //    them locally. Target is the server-reported progress plus
  //    a small drift that advances between server updates. ──
  const [smoothProgress, setSmoothProgress] = useState(0);
  const targetRef = useRef(genProgress);
  useEffect(() => {
    // New server update — snap target to the real value.
    targetRef.current = Math.max(targetRef.current, genProgress);
  }, [genProgress]);
  useEffect(() => {
    const id = window.setInterval(() => {
      setSmoothProgress((prev) => {
        // Drift toward target. Between server updates, creep
        // forward up to 85% of the *next* phase's expected
        // endpoint so the bar never completely stalls.
        const ceiling = Math.min(100, targetRef.current + 6);
        const next = prev + (ceiling - prev) * 0.06;
        return next;
      });
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  // Reset when unmounted/remounted.
  useEffect(() => {
    setSmoothProgress(0);
    targetRef.current = 0;
  }, []);

  // ── Update pulse — briefly flashes an olive halo around the
  //    preview every time a fresh snapshot lands, so the user
  //    feels the generation "ticking" forward even if the visible
  //    content change is subtle. ──
  const [pulseKey, setPulseKey] = useState(0);
  const lastFingerprintRef = useRef<string>('');
  useEffect(() => {
    if (!partialManifest) return;
    const fingerprint = JSON.stringify({
      c: partialManifest.chapters?.length,
      v: partialManifest.vibeSkin?.palette?.accent,
      t: partialManifest.theme?.colors?.accent,
      p: partialManifest.poetry?.heroTagline,
      b: partialManifest.blocks?.length,
    });
    if (fingerprint !== lastFingerprintRef.current) {
      lastFingerprintRef.current = fingerprint;
      setPulseKey((k) => k + 1);
    }
  }, [partialManifest]);

  const displayProgress = Math.max(smoothProgress, genProgress);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#FAFAFA' }}>
      {/* Keyframes + live preview sizing */}
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

        /* Subtle pulse on every manifest update */
        @keyframes pear-preview-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(24,24,27,0.08), 0 12px 48px rgba(0,0,0,0.08); }
          50%  { box-shadow: 0 0 0 8px rgba(24,24,27,0.00), 0 16px 64px rgba(0,0,0,0.12); }
          100% { box-shadow: 0 0 0 0 rgba(24,24,27,0.00), 0 12px 48px rgba(0,0,0,0.08); }
        }
        .pear-preview-pulse {
          animation: pear-preview-pulse 1.6s cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Diagonal shimmer sweep across the preview */
        @keyframes pear-shimmer-sweep {
          0%   { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateX(220%) skewX(-12deg); opacity: 0; }
        }

        /* Progress pulse on the bar's leading edge */
        @keyframes pear-progress-pulse {
          0%   { opacity: 0.4; }
          50%  { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>

      {/* Subtle background gradient */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(228,228,231,0.4) 0%, transparent 70%)',
      }} />

      {/* ── Top bar — phase headline + ticker + progress ── */}
      <div style={{
        position: 'relative', zIndex: 10, flexShrink: 0,
        padding: '20px 28px 16px',
        display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid #E4E4E7',
        background: '#FFFFFF',
      }}>
        <PearMascot size={36} mood={genStep >= 4 ? 'celebrating' : 'thinking'} color="#A1A1AA" />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Phase headline */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={`phase-${ticker.phaseLabel}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#18181B',
                  letterSpacing: '-0.01em',
                }}
              >
                {ticker.phaseLabel}
              </motion.span>
            </AnimatePresence>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#71717A',
            }}>
              {Math.round(displayProgress)}%
            </span>
          </div>

          {/* Dynamic ticker */}
          <div style={{ minHeight: 18, marginBottom: 8 }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={ticker.key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.78rem',
                  color: '#A1A1AA',
                }}
              >
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#18181B',
                  animation: 'pear-progress-pulse 1.4s ease-in-out infinite',
                  flexShrink: 0,
                }} />
                {ticker.message}…
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div style={{
            width: '100%', height: 3, borderRadius: 2,
            background: '#F4F4F5',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <motion.div
              animate={{ width: `${displayProgress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                height: '100%',
                borderRadius: 2,
                background: '#18181B',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Live site preview — grows as manifest builds ── */}
      <div style={{
        flex: 1, position: 'relative', zIndex: 10,
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        overflow: 'hidden', padding: '24px 24px',
      }}>
        {partialManifest ? (
          <motion.div
            key={`preview-pulse-${pulseKey}`}
            className="pear-live-preview pear-preview-pulse"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #E4E4E7',
              maxHeight: '78vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              position: 'relative',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          >
            {/* Shimmer sweep on new snapshots */}
            <div
              key={`shimmer-${pulseKey}`}
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '60%', height: '100%',
                background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 5,
                animation: 'pear-shimmer-sweep 1.4s cubic-bezier(0.22, 1, 0.36, 1)',
                animationFillMode: 'forwards',
              }}
            />
            <div style={{ transform: 'scale(1)', transformOrigin: 'top center' }}>
              <SiteRenderer
                manifest={partialManifest}
                names={collected.names || ['', '']}
                editMode={false}
              />
            </div>
          </motion.div>
        ) : (
          /* Skeleton while waiting for the first manifest snapshot */
          <motion.div
            className="pear-live-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
              border: '1px solid #E4E4E7',
              background: '#FFFFFF',
              padding: '60px 32px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
              minHeight: 400,
            }}
          >
            <PearMascot size={64} mood="thinking" color="#A1A1AA" />
            <p style={{
              fontSize: '1.4rem', fontWeight: 500,
              color: '#18181B', textAlign: 'center',
            }}>
              {displayNames}
            </p>
            <p style={{ fontSize: '0.82rem', color: '#A1A1AA', textAlign: 'center' }}>
              Building your site…
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}