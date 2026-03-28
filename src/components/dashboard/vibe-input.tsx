'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/vibe-input.tsx
// Rich "Story DNA" Wizard — captures the couple's full aesthetic
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft, Heart, Music, Map, Dog, Palette, Globe, Mountain, Coffee, PartyPopper, Plane, Info } from 'lucide-react';

// Small tooltip component for Phase 2 field hints
function Tooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '0.35rem', cursor: 'pointer', verticalAlign: 'middle' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      aria-label={text}
    >
      <Info size={13} style={{ color: 'var(--eg-muted)', flexShrink: 0 }} />
      {visible && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--eg-bg, #fff)', border: '1px solid var(--eg-gold, #DAA520)',
          borderRadius: '0.5rem', padding: '0.45rem 0.7rem', fontSize: '0.78rem',
          color: 'var(--eg-fg)', whiteSpace: 'nowrap', maxWidth: '240px', whiteSpace: 'normal' as 'normal',
          lineHeight: 1.4, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, pointerEvents: 'none',
          textTransform: 'none' as 'none', letterSpacing: 'normal', fontWeight: 400,
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

interface DetailsData {
  ceremonyVenue?: string;
  ceremonyAddress?: string;
  ceremonyTime?: string;
  receptionVenue?: string;
  receptionAddress?: string;
  receptionTime?: string;
  dresscode?: string;
  officiant?: string;
  celebrationVenue?: string;
  celebrationTime?: string;
  guestNotes?: string;
}

interface VibeInputProps {
  onSubmit: (data: {
    names: [string, string];
    vibeString: string;
    occasion: string;
    subdomain?: string;
    eventDate?: string;
    ceremonyVenue?: string;
    ceremonyAddress?: string;
    ceremonyTime?: string;
    receptionVenue?: string;
    receptionAddress?: string;
    receptionTime?: string;
    dresscode?: string;
    officiant?: string;
    celebrationVenue?: string;
    celebrationTime?: string;
    guestNotes?: string;
    inspirationUrls?: string[];
  }) => void;
  initialNames?: [string, string];
  initialVibe?: string;
}

function slugFromNames(n1: string, n2: string): string {
  const s1 = n1.toLowerCase().replace(/[^a-z0-9]/g, '') || 'us';
  const s2 = n2.toLowerCase().replace(/[^a-z0-9]/g, '') || 'together';
  return `${s1}-and-${s2}`;
}

const VIBE_MOODS = [
  { id: 'romantic', label: 'Classic Romance', icon: Heart, desc: 'Timeless, elegant, deeply emotional' },
  { id: 'adventurous', label: 'Adventurous', icon: Mountain, desc: 'Wild, exploring the world together' },
  { id: 'playful', label: 'Playful & Fun', icon: PartyPopper, desc: 'Laughter, color, and vibrant energy' },
  { id: 'cozy', label: 'Cozy & Intimate', icon: Coffee, desc: 'Quiet mornings, warmth, and comfort' },
  { id: 'wanderlust', label: 'Wanderlust', icon: Plane, desc: 'Travel-driven, worldly, cultured' },
  { id: 'pets', label: 'Our Little Zoo', icon: Dog, desc: 'The fur babies are the stars' },
];

const OCCASIONS = [
  { id: 'wedding', label: 'Wedding / Save the Date', desc: 'A formal RSVP or details site' },
  { id: 'anniversary', label: 'Anniversary', desc: 'A celebration of years together' },
  { id: 'engagement', label: 'Engagement', desc: 'Popping the question!' },
  { id: 'birthday', label: 'Birthday / Gift', desc: 'A sweet gift for your partner' },
  { id: 'story', label: 'Just Because', desc: 'Documenting our love story' },
];

const COLOR_PALETTES = [
  { id: 'warm-earth',    name: 'Warm Earth',       colors: ['#8B4513', '#D2691E', '#DEB887', '#FAEBD7', '#2F1B14'] },
  { id: 'ocean-breeze',  name: 'Ocean Breeze',      colors: ['#1B4965', '#5FA8D3', '#BEE9E8', '#CAE9FF', '#0B2545'] },
  { id: 'golden-hour',   name: 'Golden Hour',       colors: ['#B8860B', '#DAA520', '#FFD700', '#FFF8DC', '#1A1A1A'] },
  { id: 'sage-garden',   name: 'Sage & Garden',     colors: ['#556B2F', '#8FBC8F', '#F5F5DC', '#FAFAF5', '#2D3B2D'] },
  { id: 'blush-rose',    name: 'Blush & Rose',      colors: ['#8B3A62', '#DB7093', '#FFB6C1', '#FFF0F5', '#4A1728'] },
  { id: 'midnight',      name: 'Midnight Elegant',  colors: ['#191970', '#4169E1', '#B0C4DE', '#F0F0FF', '#0A0A2E'] },
  { id: 'terracotta',    name: 'Terracotta',        colors: ['#A0522D', '#CD853F', '#F4A460', '#FFEFD5', '#3B1F0B'] },
  { id: 'festival',      name: 'Festival & Bold',   colors: ['#E84393', '#F8C000', '#F5841F', '#FFF5F8', '#2A2690'] },
  { id: 'dark-romance',  name: 'Dark Romance',      colors: ['#6A0F2A', '#A83050', '#D4A0A0', '#F8F0F2', '#1A0408'] },
  { id: 'celestial',     name: 'Celestial Night',   colors: ['#0D1B2A', '#1B3A6B', '#C8A0E8', '#F0EAFF', '#E8D8FF'] },
  { id: 'modern-luxe',   name: 'Modern Luxe',       colors: ['#1A1A1A', '#B8962A', '#DFC870', '#F5F2ED', '#0A0A0A'] },
  { id: 'custom',        name: 'Let AI decide',     colors: ['#888', '#aaa', '#ccc', '#eee', '#333'] },
];

const PLACES = [
  { id: 'beach', label: 'Beach / Coast', vibe: 'coastal, sandy, sun-kissed' },
  { id: 'mountains', label: 'Mountains', vibe: 'alpine, crisp, panoramic views' },
  { id: 'city', label: 'City / Urban', vibe: 'skyline, nightlife, rooftop drinks' },
  { id: 'countryside', label: 'Countryside', vibe: 'rolling fields, golden light, rustic' },
  { id: 'tropical', label: 'Tropical', vibe: 'lush, warm, paradise' },
  { id: 'europe', label: 'European', vibe: 'cobblestone, cafés, old-world charm' },
  { id: 'desert', label: 'Desert', vibe: 'vast, terracotta, sunset tones' },
  { id: 'home', label: 'Home Sweet Home', vibe: 'domestic bliss, couch cuddles, kitchen dances' },
];

const DRESSCODE_OPTIONS = [
  'Black Tie',
  'Black Tie Optional',
  'Cocktail Attire',
  'Garden Party',
  'Semi-Formal',
  'Casual Chic',
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '1.25rem', borderRadius: '1rem',
  border: '2px solid rgba(0,0,0,0.06)', background: '#ffffff',
  fontSize: '1.1rem', fontFamily: 'var(--eg-font-body)', color: 'var(--eg-fg)',
  outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
};

const getFocusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = 'var(--eg-accent)';
  e.target.style.boxShadow = '0 0 0 4px rgba(163,177,138,0.1)';
  e.target.style.transform = 'translateY(-1px)';
};

const getBlurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = 'rgba(0,0,0,0.06)';
  e.target.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)';
  e.target.style.transform = 'none';
};

const btnPrimaryStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '1rem 2.25rem', borderRadius: '100px',
  background: 'linear-gradient(135deg, var(--eg-dark, #1a1713) 0%, var(--eg-dark-2, #2a2118) 100%)',
  color: '#fff', border: 'none',
  fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--eg-font-body)',
  cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
  boxShadow: '0 8px 24px rgba(26,23,19,0.18)',
  letterSpacing: '0.01em',
};

export function VibeInput({ onSubmit, initialNames }: VibeInputProps) {
  const [step, setStep] = useState(1);
  // 'main' = steps 1-8 of the original wizard, 'details' = optional details sub-step
  const [wizardPhase, setWizardPhase] = useState<'main' | 'details'>('main');
  const [detailsData, setDetailsData] = useState<DetailsData>({});
  const [inspirationUrls, setInspirationUrls] = useState<string[]>([]);
  const [subdomain, setSubdomain] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const subdomainDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [occasion, setOccasion] = useState<string>('');
  const [showValidation, setShowValidation] = useState(false);
  const isEvent = occasion === 'wedding' || occasion === 'engagement';
  const totalSteps = isEvent ? 8 : 7;

  // Step 1: Names
  const [name1, setName1] = useState(initialNames?.[0] ?? '');
  const [name2, setName2] = useState(initialNames?.[1] ?? '');
  // Step 2: Occasion (already declared above)
  // Step 3: Mood
  const [mood, setMood] = useState<string>('');
  // Step 3: Color Palette
  const [palette, setPalette] = useState<string>('');
  // Step 4: Favorite places
  const [favPlaces, setFavPlaces] = useState<string[]>([]);
  const [customPlace, setCustomPlace] = useState('');
  // Step 5: Your Story
  const [meetCute, setMeetCute] = useState('');
  const [relationship, setRelationship] = useState('');
  // Step 7: Special details
  const [petsDetails, setPetsDetails] = useState('');
  const [musicSong, setMusicSong] = useState('');
  // Step 8: Event Details (Conditional)
  const [eventDate, setEventDate] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [rsvpDeadline, setRsvpDeadline] = useState('');
  const [cashFundUrl, setCashFundUrl] = useState('');

  const canProceedStep1 = name1.trim() && name2.trim();
  const canProceedStep2 = occasion !== '';
  const canProceedStep3 = mood !== '';
  const canProceedStep4 = palette !== '';
  const canProceedStep5 = favPlaces.length > 0;
  const canProceedStep6 = meetCute.trim() !== '';

  const canProceedCurrentStep = () => {
    if (step === 1) return !!canProceedStep1;
    if (step === 2) return !!canProceedStep2;
    if (step === 3) return !!canProceedStep3;
    if (step === 4) return !!canProceedStep4;
    if (step === 5) return !!canProceedStep5;
    if (step === 6) return !!canProceedStep6;
    return true;
  };

  const handleNext = () => {
    if (!canProceedCurrentStep()) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    if (step < totalSteps) setStep(step + 1);
  };
  const handleBack = () => {
    setShowValidation(false);
    if (step > 1) setStep(step - 1);
  };

  const togglePlace = (id: string) => {
    setFavPlaces(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const buildVibeString = () => {
    const selectedMoodLabel = VIBE_MOODS.find(m => m.id === mood)?.label || '';
    const selectedOccasionLabel = OCCASIONS.find(o => o.id === occasion)?.label || '';
    const selectedPalette = COLOR_PALETTES.find(p => p.id === palette);
    const paletteInfo = selectedPalette && palette !== 'custom'
      ? `MANDATORY COLOR PALETTE — the couple chose "${selectedPalette.name}". You MUST use these exact hex colors as the basis for the design: ${selectedPalette.colors.join(', ')}. Do NOT substitute muted or desaturated alternatives. These colors are required.`
      : 'Let the AI choose colors that match the overall vibe.';

    const placeVibes = favPlaces.map(id => {
      const p = PLACES.find(pl => pl.id === id);
      return p ? p.vibe : id;
    });
    const placeString = placeVibes.length > 0
      ? `Favorite place aesthetics: ${placeVibes.join('; ')}.`
      : '';

    return [
      `Occasion / Project Type: This site is for a ${selectedOccasionLabel}.`,
      `Core Vibe: ${selectedMoodLabel}.`,
      paletteInfo,
      placeString,
      customPlace ? `Specific favorite place: ${customPlace}.` : '',
      `How they met: ${meetCute}.`,
      relationship ? `What makes their relationship special: ${relationship}.` : '',
      petsDetails ? `Important details (pets/inside jokes): ${petsDetails}.` : '',
      musicSong ? `"Their song" or musical vibe: ${musicSong}.` : '',
      isEvent && eventDate ? `CRITICAL LOGISTICS: The event takes place on ${eventDate} at ${eventVenue || 'a beautiful venue'}. The RSVP deadline is ${rsvpDeadline || 'soon'}. Include a beautiful formal request for RSVP.` : (!isEvent && eventDate ? `Event date: ${eventDate}.` : ''),
      cashFundUrl ? `REGISTRY: They have a cash fund or registry setup at ${cashFundUrl}. Note this somewhere near the bottom of the story.` : '',
      'The generated site must feel deeply personal and emotionally resonant to the occasion.',
      'Make the colors, typography, and narrative flow from these exact feelings and aesthetics.',
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  };

  // Called from the final step — instead of generating immediately, show details sub-step
  const handleSubmit = () => {
    setWizardPhase('details');
  };

  // Called when the user clicks "Build my site" or "Skip all" from the details phase
  const handleFinalSubmit = (skipDetails = false) => {
    const synthesizedVibe = buildVibeString();
    const details = skipDetails ? {} : detailsData;
    const n1 = name1.trim();
    const n2 = name2.trim();
    const finalSlug = subdomain.trim() || slugFromNames(n1, n2);
    const validUrls = inspirationUrls.filter(u => u.trim().match(/^https?:\/\/.+/));
    onSubmit({
      names: [n1, n2],
      vibeString: synthesizedVibe,
      occasion,
      subdomain: finalSlug,
      eventDate: eventDate || undefined,
      inspirationUrls: validUrls.length > 0 ? validUrls : undefined,
      ...details,
    });
  };

  // Debounced subdomain availability check
  useEffect(() => {
    if (subdomainDebounceRef.current) clearTimeout(subdomainDebounceRef.current);
    const clean = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
    if (!clean) { setSubdomainStatus('idle'); return; }
    if (clean.length < 2) { setSubdomainStatus('error'); return; }
    setSubdomainStatus('checking');
    subdomainDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/check-subdomain?slug=${encodeURIComponent(clean)}`);
        const data = await res.json();
        setSubdomainStatus(data.available ? 'available' : 'taken');
      } catch {
        setSubdomainStatus('idle');
      }
    }, 500);
    return () => {
      if (subdomainDebounceRef.current) clearTimeout(subdomainDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  const setDetail = (key: keyof DetailsData, value: string) => {
    setDetailsData(prev => ({ ...prev, [key]: value || undefined }));
  };

  const toggleDresscode = (code: string) => {
    setDetailsData(prev => ({ ...prev, dresscode: prev.dresscode === code ? undefined : code }));
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 30 : -30, opacity: 0, filter: 'blur(4px)' }),
    center: { x: 0, opacity: 1, filter: 'blur(0px)' },
    exit: (direction: number) => ({ x: direction < 0 ? 30 : -30, opacity: 0, filter: 'blur(4px)' }),
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.75rem 1.25rem', borderRadius: '2rem',
    border: `2px solid ${active ? 'var(--eg-accent)' : 'rgba(0,0,0,0.06)'}`,
    background: active ? 'var(--eg-accent-light)' : '#fff',
    fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    transform: active ? 'translateY(-1px)' : 'none',
    boxShadow: active ? '0 4px 12px rgba(163,177,138,0.15)' : 'none',
    color: 'var(--eg-fg)',
  });

  if (wizardPhase === 'details') {
    const detailInputStyle: React.CSSProperties = {
      width: '100%',
      padding: '0.85rem 1rem',
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: '0.75rem',
      background: '#fff',
      fontSize: 'max(16px, 0.9rem)',
      fontFamily: 'var(--eg-font-body)',
      color: 'var(--eg-fg)',
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxSizing: 'border-box',
    };

    const pillStyle = (active: boolean): React.CSSProperties => ({
      padding: '0.55rem 1.15rem',
      borderRadius: '100px',
      border: `1.5px solid ${active ? 'var(--eg-accent)' : 'rgba(0,0,0,0.12)'}`,
      background: active ? '#556B2F' : '#FAF7F2',
      color: active ? '#fff' : 'var(--eg-fg)',
      fontSize: '0.88rem',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap' as const,
    });

    const fieldLabel: React.CSSProperties = {
      display: 'block',
      fontSize: '0.82rem',
      fontWeight: 600,
      color: 'var(--eg-muted)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      marginBottom: '0.45rem',
    };

    const sectionHeading: React.CSSProperties = {
      fontSize: '0.78rem',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      color: 'var(--eg-accent)',
      marginBottom: '1rem',
    };

    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Phase indicator + nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <button
            onClick={() => setWizardPhase('main')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--eg-muted)', fontWeight: 500 }}>Step 2 of 2</span>
          <button
            onClick={() => handleFinalSubmit(true)}
            style={{ fontSize: '0.88rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            Skip — add later
          </button>
        </div>

        <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '0.5rem' }}>
          A few more details
        </h2>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1rem', marginBottom: '2.5rem' }}>
          All optional. Fill in what you know and leave the rest blank.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* ── WEDDING ── */}
          {occasion === 'wedding' && (
            <>
              {/* Ceremony block */}
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <p style={sectionHeading}>Ceremony</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={fieldLabel}>Venue name</label>
                    <input
                      type="text"
                      placeholder="St. Mary's Church"
                      value={detailsData.ceremonyVenue ?? ''}
                      onChange={e => setDetail('ceremonyVenue', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Address / city</label>
                    <input
                      type="text"
                      placeholder="123 Main St, Napa, CA"
                      value={detailsData.ceremonyAddress ?? ''}
                      onChange={e => setDetail('ceremonyAddress', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Start time</label>
                    <input
                      type="text"
                      placeholder="4:00 PM"
                      value={detailsData.ceremonyTime ?? ''}
                      onChange={e => setDetail('ceremonyTime', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </div>

              {/* Reception block */}
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <p style={sectionHeading}>Reception</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={fieldLabel}>Venue name</label>
                    <input
                      type="text"
                      placeholder="The Vineyard Estate"
                      value={detailsData.receptionVenue ?? ''}
                      onChange={e => setDetail('receptionVenue', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Address / city</label>
                    <input
                      type="text"
                      placeholder="456 Vineyard Rd, Sonoma, CA"
                      value={detailsData.receptionAddress ?? ''}
                      onChange={e => setDetail('receptionAddress', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Start time</label>
                    <input
                      type="text"
                      placeholder="6:00 PM"
                      value={detailsData.receptionTime ?? ''}
                      onChange={e => setDetail('receptionTime', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </div>

              {/* Dress code */}
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <p style={sectionHeading}>Dress Code <span style={{ fontWeight: 400, fontSize: '0.75rem', textTransform: 'none', letterSpacing: 0, color: 'var(--eg-muted)' }}>(tap to select, tap again to clear)</span></p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                  {DRESSCODE_OPTIONS.map(code => (
                    <button key={code} onClick={() => toggleDresscode(code)} style={pillStyle(detailsData.dresscode === code)}>
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Officiant */}
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <label style={fieldLabel}>Officiant name <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input
                  type="text"
                  placeholder="Father Michael"
                  value={detailsData.officiant ?? ''}
                  onChange={e => setDetail('officiant', e.target.value)}
                  style={detailInputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </>
          )}

          {/* ── ANNIVERSARY ── */}
          {occasion === 'anniversary' && (
            <>
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <label style={fieldLabel}>Celebration venue <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input
                  type="text"
                  placeholder="The Grand Hotel Rooftop"
                  value={detailsData.celebrationVenue ?? ''}
                  onChange={e => setDetail('celebrationVenue', e.target.value)}
                  style={detailInputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <label style={fieldLabel}>Any notes for guests <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <textarea
                  placeholder="Parking is available on the street. Attire is cocktail casual."
                  value={detailsData.guestNotes ?? ''}
                  onChange={e => setDetail('guestNotes', e.target.value.slice(0, 200))}
                  maxLength={200}
                  style={{ ...detailInputStyle, minHeight: '90px', resize: 'none', lineHeight: 1.5 }}
                  onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
                <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', marginTop: '0.3rem', textAlign: 'right' }}>{(detailsData.guestNotes ?? '').length}/200</p>
              </div>
            </>
          )}

          {/* ── BIRTHDAY ── */}
          {occasion === 'birthday' && (
            <>
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <label style={fieldLabel}>Venue / location <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input
                  type="text"
                  placeholder="The Rooftop Garden"
                  value={detailsData.celebrationVenue ?? ''}
                  onChange={e => setDetail('celebrationVenue', e.target.value)}
                  style={detailInputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <label style={fieldLabel}>Start time <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input
                  type="text"
                  placeholder="7:00 PM"
                  value={detailsData.celebrationTime ?? ''}
                  onChange={e => setDetail('celebrationTime', e.target.value)}
                  style={detailInputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <label style={fieldLabel}>Notes for guests <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <textarea
                  placeholder="Dress to impress. Valet parking available."
                  value={detailsData.guestNotes ?? ''}
                  onChange={e => setDetail('guestNotes', e.target.value.slice(0, 200))}
                  maxLength={200}
                  style={{ ...detailInputStyle, minHeight: '90px', resize: 'none', lineHeight: 1.5 }}
                  onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
                <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', marginTop: '0.3rem', textAlign: 'right' }}>{(detailsData.guestNotes ?? '').length}/200</p>
              </div>
            </>
          )}

          {/* ── ENGAGEMENT ── */}
          {occasion === 'engagement' && (
            <>
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <label style={fieldLabel}>Celebration venue <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input
                  type="text"
                  placeholder="Lola's Wine Bar"
                  value={detailsData.celebrationVenue ?? ''}
                  onChange={e => setDetail('celebrationVenue', e.target.value)}
                  style={detailInputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <label style={fieldLabel}>Start time <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input
                  type="text"
                  placeholder="7:30 PM"
                  value={detailsData.celebrationTime ?? ''}
                  onChange={e => setDetail('celebrationTime', e.target.value)}
                  style={detailInputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </>
          )}

          {/* ── STORY ── */}
          {occasion === 'story' && (
            <div style={{ background: '#fff', borderRadius: '1rem', padding: '2rem', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center', color: 'var(--eg-muted)', lineHeight: 1.6 }}>
              No details needed. We&apos;ll build from your photos and vibe.
            </div>
          )}
        </div>

        {/* ── VISUAL INSPIRATION ── */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid rgba(214,198,168,0.12)',
          marginTop: '2rem',
        }}>
          <p style={sectionHeading}>
            <span style={{ marginRight: '0.4rem' }}>✨</span>Visual Inspiration
            <span style={{ fontWeight: 400, fontSize: '0.75rem', textTransform: 'none', letterSpacing: 0, color: 'var(--eg-muted)', marginLeft: '0.5rem' }}>(optional)</span>
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--eg-muted)', marginBottom: '1rem', lineHeight: 1.55 }}>
            Paste links to images that capture your wedding aesthetic — Pinterest pins, Instagram posts, or any image URL.
          </p>

          {inspirationUrls.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
              {inspirationUrls.map((url, idx) => {
                const isDirectImage = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
                const isKnownCdn = /(?:^|\.)(?:i\.imgur\.com|cdn\.discordapp\.com|images\.unsplash\.com|imagedelivery\.net|cloudinary\.com|res\.cloudinary\.com|live\.staticflickr\.com)(?:\/|$)/i.test(url);
                const isValid = /^https?:\/\/.+/.test(url.trim());
                const warnNotDirectImage = isValid && !isDirectImage && !isKnownCdn;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isDirectImage && isValid && (
                      <div style={{
                        width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem',
                        overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(214,198,168,0.2)',
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="inspiration preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <input
                      type="url"
                      value={url}
                      placeholder="https://..."
                      onChange={e => {
                        const next = [...inspirationUrls];
                        next[idx] = e.target.value;
                        setInspirationUrls(next);
                      }}
                      style={{
                        ...detailInputStyle,
                        flex: 1,
                        borderColor: url.trim() && !isValid ? '#ef4444' : 'rgba(0,0,0,0.12)',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = url.trim() && !isValid ? '#ef4444' : 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <button
                      onClick={() => setInspirationUrls(prev => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove"
                      style={{
                        width: '2rem', height: '2rem', borderRadius: '50%',
                        border: '1px solid rgba(0,0,0,0.1)', background: '#fff',
                        color: 'var(--eg-muted)', cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', lineHeight: 1, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#fca5a5'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--eg-muted)'; }}
                    >
                      ×
                    </button>
                  </div>
                  {warnNotDirectImage && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--eg-gold, #B8A04A)', marginTop: '0.1rem' }}>
                      &#9888; Use a direct image link (not a Pinterest or Instagram page URL)
                    </p>
                  )}
                  </div>
                );
              })}
            </div>
          )}

          {inspirationUrls.length < 4 && (
            <button
              onClick={() => setInspirationUrls(prev => [...prev, ''])}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', borderRadius: '100px',
                border: '1.5px solid rgba(163,177,138,0.35)',
                background: 'transparent', color: 'var(--eg-accent)',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(163,177,138,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Add inspiration image
            </button>
          )}

          <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
            Up to 4 images. Our AI will analyze them to match your visual style.
          </p>
        </div>

        {/* URL slug picker */}
        <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', marginTop: '2rem' }}>
          <p style={sectionHeading}><Globe size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />Your Site URL</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--eg-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
            This is where your site will live. You can always change it later.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', overflow: 'hidden', transition: 'border-color 0.2s', background: '#FAFAF8' }}
            onFocus={() => {}} onBlur={() => {}}>
            <input
              value={subdomain}
              onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="ben-and-shauna"
              style={{ flex: 1, padding: '0.85rem 1rem', fontSize: 'max(16px, 0.9rem)', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--eg-font-body)', color: 'var(--eg-fg)' }}
              onFocus={e => { (e.target.parentElement as HTMLElement).style.borderColor = 'var(--eg-accent)'; }}
              onBlur={e => { (e.target.parentElement as HTMLElement).style.borderColor = 'rgba(0,0,0,0.1)'; }}
            />
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.03)', color: 'var(--eg-muted)', fontWeight: 500, borderLeft: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
              .pearloom.app
            </div>
          </div>
          {subdomain && (
            <p style={{ fontSize: '0.8rem', color: 'var(--eg-accent)', marginTop: '0.5rem', fontWeight: 500 }}>
              pearloom.app/{subdomain}
            </p>
          )}
          {/* Availability status */}
          {subdomainStatus === 'checking' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--eg-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Checking availability...
            </p>
          )}
          {subdomainStatus === 'available' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--eg-accent)', marginTop: '0.5rem', fontWeight: 600 }}>
              ✓ Available
            </p>
          )}
          {subdomainStatus === 'taken' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--eg-plum, #7C3D73)', marginTop: '0.5rem', fontWeight: 600 }}>
              ✗ Already taken — try a different URL
            </p>
          )}
          {subdomainStatus === 'error' && subdomain.length > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', marginTop: '0.5rem' }}>
              Enter at least 2 characters
            </p>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Build my site button */}
        <div style={{ marginTop: '2.5rem' }}>
          <button
            onClick={() => handleFinalSubmit(false)}
            disabled={subdomainStatus === 'taken'}
            style={{
              ...btnPrimaryStyle,
              width: '100%',
              justifyContent: 'center',
              background: subdomainStatus === 'taken'
                ? 'rgba(0,0,0,0.12)'
                : 'linear-gradient(135deg, #A3B18A, #8FA876)',
              boxShadow: subdomainStatus === 'taken' ? 'none' : '0 12px 36px rgba(163,177,138,0.4)',
              fontSize: '1rem',
              padding: '1.1rem 2rem',
              cursor: subdomainStatus === 'taken' ? 'not-allowed' : 'pointer',
              color: subdomainStatus === 'taken' ? 'var(--eg-muted)' : '#fff',
            }}
          >
            Build my site <Sparkles size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '640px', margin: '0 auto', paddingBottom: '2rem',
    }}>
      {/* Linear progress bar — spans full wizard flow */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
            Step {step} of {totalSteps + 1}
          </span>
        </div>
        <div style={{ width: '100%', height: '3px', background: 'var(--eg-divider, rgba(0,0,0,0.08))', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${Math.round((step / (totalSteps + 1)) * 100)}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%', background: 'var(--eg-accent)' }}
          />
        </div>
      </div>
      {/* Pear progress dots */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '3rem', alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done = i + 1 < step;
          const active = i + 1 === step;
          return (
            <div
              key={i}
              style={{
                width: active ? '32px' : '8px',
                height: active ? '41px' : '10px',
                borderRadius: active
                  ? '42% 42% 52% 52% / 30% 30% 52% 52%'
                  : done
                  ? '42% 42% 52% 52% / 30% 30% 52% 52%'
                  : '50%',
                background: active
                  ? 'var(--eg-accent)'
                  : done
                  ? 'rgba(163,177,138,0.45)'
                  : 'rgba(0,0,0,0.08)',
                transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: active ? '0 4px 12px rgba(163,177,138,0.35)' : 'none',
              }}
            />
          );
        })}
      </div>

      <AnimatePresence mode="wait" custom={1}>
        {/* ── STEP 1: Names ── */}
        {step === 1 && (
          <motion.div key="s1" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              Who is this story about?
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              Let&apos;s start with the most important part.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>First Person</label>
                <input type="text" placeholder="e.g. Ben" value={name1} onChange={e => { setName1(e.target.value); setSubdomain(slugFromNames(e.target.value, name2)); }} style={{ ...inputStyle, fontSize: '1.25rem', ...(showValidation && !name1.trim() ? { borderColor: 'var(--eg-plum, #6D597A)' } : {}) }} onFocus={getFocusStyle} onBlur={getBlurStyle} autoFocus />
                {showValidation && !name1.trim() && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--eg-plum, #6D597A)', marginTop: '0.35rem' }}>This field is required</p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="shimmer-text" style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', color: 'var(--eg-accent)' }}>&</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>Second Person</label>
                <input type="text" placeholder="e.g. Shauna" value={name2} onChange={e => { setName2(e.target.value); setSubdomain(slugFromNames(name1, e.target.value)); }} style={{ ...inputStyle, fontSize: '1.25rem', ...(showValidation && !name2.trim() ? { borderColor: 'var(--eg-plum, #6D597A)' } : {}) }} onFocus={getFocusStyle} onBlur={getBlurStyle} />
                {showValidation && !name2.trim() && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--eg-plum, #6D597A)', marginTop: '0.35rem' }}>This field is required</p>
                )}
              </div>
            </div>
            {/* Slug preview + non-ASCII warning */}
            {(name1.trim() || name2.trim()) && (() => {
              const slug = slugFromNames(name1, name2);
              const simpleSlug = `${name1.toLowerCase().replace(/\s+/g, '-')}-and-${name2.toLowerCase().replace(/\s+/g, '-')}`;
              const hasNonAscii = slug !== simpleSlug;
              return (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--eg-muted)', marginBottom: hasNonAscii ? '0.35rem' : 0 }}>
                    Your site URL: <span style={{ fontWeight: 600 }}>{slug}.pearloom.app</span>
                  </p>
                  {hasNonAscii && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--eg-gold, #B8A04A)' }}>
                      &#9888; Special characters removed from your URL: {slug}.pearloom.app
                    </p>
                  )}
                </div>
              );
            })()}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
              <button onClick={handleNext} style={{ ...btnPrimaryStyle, opacity: canProceedStep1 ? 1 : 0.5 }}>
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: OCCASION ── */}
        {step === 2 && (
          <motion.div key="s2" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              What are you celebrating?
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              The occasion completely changes how we structure your site.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {OCCASIONS.map(occ => (
                <button key={occ.id} onClick={() => setOccasion(occ.id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1.5rem', borderRadius: '1rem', textAlign: 'left',
                  border: `2px solid ${occasion === occ.id ? 'var(--eg-accent)' : 'rgba(0,0,0,0.06)'}`,
                  background: occasion === occ.id ? 'var(--eg-accent-light)' : '#fff',
                  cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: occasion === occ.id ? '0 8px 24px rgba(163,177,138,0.15)' : '0 2px 10px rgba(0,0,0,0.02)',
                  transform: occasion === occ.id ? 'translateY(-2px)' : 'none',
                }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--eg-fg)' }}>{occ.label}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--eg-muted)', marginTop: '0.25rem' }}>{occ.desc}</p>
                  </div>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${occasion === occ.id ? 'var(--eg-accent)' : 'rgba(0,0,0,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {occasion === occ.id && <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--eg-accent)' }} />}
                  </div>
                </button>
              ))}
            </div>

            {/* Date picker — shown for all occasions except "story" */}
            {occasion !== '' && occasion !== 'story' && (
              <div style={{ marginTop: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>
                  {occasion === 'wedding' ? 'Wedding Date' :
                   occasion === 'anniversary' ? 'Anniversary Date' :
                   occasion === 'birthday' ? 'Birthday' :
                   occasion === 'engagement' ? 'Engagement Date' :
                   'When is the big day?'}
                  {' '}<span style={{ color: 'var(--eg-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  style={{
                    ...inputStyle,
                    fontSize: 'max(16px, 0.9rem)',
                    boxSizing: 'border-box',
                  }}
                  onFocus={getFocusStyle}
                  onBlur={getBlurStyle}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ ...btnPrimaryStyle, background: 'transparent', color: 'var(--eg-muted)', boxShadow: 'none' }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} disabled={!canProceedStep2} style={{ ...btnPrimaryStyle, opacity: canProceedStep2 ? 1 : 0.5, pointerEvents: canProceedStep2 ? 'auto' : 'none' }}>
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: MOOD ── */}
        {step === 3 && (
          <motion.div key="s2" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              What&apos;s your relationship vibe?
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              This shapes the entire tone — colors, fonts, and narrative voice.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {VIBE_MOODS.map(m => (
                <button key={m.id} onClick={() => setMood(m.id)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                  padding: '1.5rem 1rem', borderRadius: '1rem', textAlign: 'center',
                  border: `2px solid ${mood === m.id ? 'var(--eg-accent)' : 'rgba(0,0,0,0.06)'}`,
                  background: mood === m.id ? 'var(--eg-accent-light)' : '#fff',
                  cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: mood === m.id ? '0 8px 24px rgba(163,177,138,0.15)' : '0 2px 10px rgba(0,0,0,0.02)',
                  transform: mood === m.id ? 'translateY(-2px)' : 'none',
                }}>
                  <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: mood === m.id ? '#fff' : 'var(--eg-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--eg-accent)' }}>
                    <m.icon size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--eg-fg)' }}>{m.label}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', marginTop: '0.25rem' }}>{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} disabled={!canProceedStep3} style={{ ...btnPrimaryStyle, opacity: canProceedStep3 ? 1 : 0.5, pointerEvents: canProceedStep3 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: COLOR PALETTE ── */}
        {step === 4 && (
          <motion.div key="s4" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Palette size={28} color="var(--eg-accent)" />
              <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem' }}>Color Inspiration</h2>
            </div>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              Pick a palette that feels like your relationship. The AI will use this as a starting point.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {COLOR_PALETTES.map(p => (
                <button key={p.id} onClick={() => setPalette(p.id)} style={{
                  padding: '1.25rem', borderRadius: '1rem', textAlign: 'left',
                  border: `2px solid ${palette === p.id ? 'var(--eg-accent)' : 'rgba(0,0,0,0.06)'}`,
                  background: palette === p.id ? 'var(--eg-accent-light)' : '#fff',
                  cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: palette === p.id ? 'translateY(-2px)' : 'none',
                  boxShadow: palette === p.id ? '0 8px 24px rgba(163,177,138,0.15)' : '0 2px 10px rgba(0,0,0,0.02)',
                }}>
                  <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    {p.colors.map((c, i) => (
                      <div key={i} style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
                    ))}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--eg-fg)' }}>{p.name}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} disabled={!canProceedStep4} style={{ ...btnPrimaryStyle, opacity: canProceedStep4 ? 1 : 0.5, pointerEvents: canProceedStep4 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 5: FAVORITE PLACES ── */}
        {step === 5 && (
          <motion.div key="s5" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Globe size={28} color="var(--eg-accent)" />
              <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem' }}>Your Favorite Places</h2>
            </div>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
              Select the settings that define your adventures. This helps the AI match each photo to the right narrative.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
              {PLACES.map(p => (
                <button key={p.id} onClick={() => togglePlace(p.id)} style={chipStyle(favPlaces.includes(p.id))}>{p.label}</button>
              ))}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.5rem' }}>
                Or name a specific place that&apos;s meaningful to you both:
              </label>
              <input type="text" placeholder="e.g. Santorini, our back porch, that NYC rooftop..." value={customPlace} onChange={e => setCustomPlace(e.target.value)} style={inputStyle} onFocus={getFocusStyle} onBlur={getBlurStyle} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} disabled={!canProceedStep5} style={{ ...btnPrimaryStyle, opacity: canProceedStep5 ? 1 : 0.5, pointerEvents: canProceedStep5 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 6: YOUR STORY ── */}
        {step === 6 && (
          <motion.div key="s6" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>Tell Us Your Story</h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
              The more you share, the more personal and beautiful your site will be.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>How did you meet? *</label>
                <textarea value={meetCute} onChange={e => setMeetCute(e.target.value)} placeholder="We matched on Hinge and had our first date at a little Italian place..." style={{ ...inputStyle, minHeight: '140px', resize: 'none', lineHeight: 1.6, ...(showValidation && !meetCute.trim() ? { borderColor: 'var(--eg-plum, #6D597A)' } : {}) }} onFocus={getFocusStyle} onBlur={getBlurStyle} autoFocus />
                {showValidation && !meetCute.trim() && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--eg-plum, #6D597A)', marginTop: '0.35rem' }}>This field is required</p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>What makes your relationship special? <span style={{ color: 'var(--eg-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="We balance each other perfectly — she's spontaneous and I'm the planner..." style={{ ...inputStyle, minHeight: '100px', resize: 'none', lineHeight: 1.6 }} onFocus={getFocusStyle} onBlur={getBlurStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} disabled={!canProceedStep6} style={{ ...btnPrimaryStyle, opacity: canProceedStep6 ? 1 : 0.5, pointerEvents: canProceedStep6 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 7: SPECIAL DETAILS ── */}
        {step === 7 && (
          <motion.div key="s7" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              {/* Pear-shaped icon instead of circle */}
              <div style={{
                width: '5rem', height: '6.4rem',
                borderRadius: '42% 42% 52% 52% / 30% 30% 52% 52%',
                background: 'linear-gradient(160deg, rgba(163,177,138,0.15), rgba(163,177,138,0.08))',
                border: '1.5px solid rgba(163,177,138,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 8px 24px rgba(163,177,138,0.15)',
              }}>
                <Sparkles size={28} color="var(--eg-accent)" />
              </div>
              <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.75rem' }}>Final Magic Touches</h2>
              <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto' }}>
                These optional details add warmth and personality.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>
                  <Dog size={16} color="var(--eg-accent)" /> Pets, inside jokes, or special traditions
                </label>
                <textarea value={petsDetails} onChange={e => setPetsDetails(e.target.value)} placeholder="We have two cats named Peaches and Poppy..." style={{ ...inputStyle, minHeight: '100px', resize: 'none', lineHeight: 1.6 }} onFocus={getFocusStyle} onBlur={getBlurStyle} autoFocus />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>
                  <Music size={16} color="var(--eg-accent)" /> Your song or musical vibe
                </label>
                <input type="text" value={musicSong} onChange={e => setMusicSong(e.target.value)} placeholder={`"At Last" by Etta James, or indie folk, or lo-fi jazz...`} style={inputStyle} onFocus={getFocusStyle} onBlur={getBlurStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleSubmit} style={{
                ...btnPrimaryStyle,
                background: 'linear-gradient(135deg, #A3B18A, #8FA876)',
                boxShadow: '0 12px 36px rgba(163,177,138,0.4)',
              }}>Generate My Site <Sparkles size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 8: EVENT DETAILS (Conditional) ── */}
        {step === 8 && isEvent && (
          <motion.div key="s8" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>Event Details</h2>
              <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem' }}>
                Since this is a {OCCASIONS.find(o => o.id === occasion)?.label}, let's add the logistics so guests can RSVP and contribute.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>When is the event?</label>
                <input
                  type="text"
                  placeholder="e.g. October 12th, 2026"
                  value={eventDate
                    ? (/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
                        ? new Date(eventDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : eventDate)
                    : ''}
                  onChange={e => setEventDate(e.target.value)}
                  style={inputStyle}
                  onFocus={getFocusStyle}
                  onBlur={getBlurStyle}
                />
                {eventDate && /^\d{4}-\d{2}-\d{2}$/.test(eventDate) && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--eg-accent)', marginTop: '0.4rem', fontWeight: 500 }}>
                    Using date from earlier — change if needed
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>Where is the venue?</label>
                <input type="text" placeholder="e.g. The Glasshouse, NYC" value={eventVenue} onChange={e => setEventVenue(e.target.value)} style={inputStyle} onFocus={getFocusStyle} onBlur={getBlurStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>RSVP Deadline</label>
                <input type="text" placeholder="e.g. September 1st" value={rsvpDeadline} onChange={e => setRsvpDeadline(e.target.value)} style={inputStyle} onFocus={getFocusStyle} onBlur={getBlurStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>Registry or Cash Fund URL (Optional)</label>
                <input type="url" placeholder="e.g. venmo.com/shauna-scott" value={cashFundUrl} onChange={e => setCashFundUrl(e.target.value)} style={inputStyle} onFocus={getFocusStyle} onBlur={getBlurStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleSubmit} style={{
                ...btnPrimaryStyle,
                background: 'linear-gradient(135deg, #A3B18A, #8FA876)',
                boxShadow: '0 12px 36px rgba(163,177,138,0.4)',
              }}>Generate My Site <Sparkles size={18} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
