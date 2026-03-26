'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/vibe-input.tsx
// Rich "Story DNA" Wizard — captures the couple's full aesthetic
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft, Heart, Music, Map, Dog, Palette, Globe, Mountain, Coffee, PartyPopper, Plane } from 'lucide-react';

interface VibeInputProps {
  onSubmit: (data: { names: [string, string]; vibeString: string }) => void;
  initialNames?: [string, string];
  initialVibe?: string;
}

const VIBE_MOODS = [
  { id: 'romantic', label: 'Classic Romance', icon: Heart, desc: 'Timeless, elegant, deeply emotional' },
  { id: 'adventurous', label: 'Adventurous', icon: Mountain, desc: 'Wild, exploring the world together' },
  { id: 'playful', label: 'Playful & Fun', icon: PartyPopper, desc: 'Laughter, color, and vibrant energy' },
  { id: 'cozy', label: 'Cozy & Intimate', icon: Coffee, desc: 'Quiet mornings, warmth, and comfort' },
  { id: 'wanderlust', label: 'Wanderlust', icon: Plane, desc: 'Travel-driven, worldly, cultured' },
  { id: 'pets', label: 'Our Little Zoo', icon: Dog, desc: 'The fur babies are the stars' },
];

const COLOR_PALETTES = [
  { id: 'warm-earth', name: 'Warm Earth', colors: ['#8B4513', '#D2691E', '#DEB887', '#FAEBD7', '#2F1B14'] },
  { id: 'ocean-breeze', name: 'Ocean Breeze', colors: ['#1B4965', '#5FA8D3', '#BEE9E8', '#CAE9FF', '#0B2545'] },
  { id: 'golden-hour', name: 'Golden Hour', colors: ['#B8860B', '#DAA520', '#FFD700', '#FFF8DC', '#1A1A1A'] },
  { id: 'sage-garden', name: 'Sage & Garden', colors: ['#556B2F', '#8FBC8F', '#F5F5DC', '#FAFAF5', '#2D3B2D'] },
  { id: 'blush-rose', name: 'Blush & Rose', colors: ['#8B3A62', '#DB7093', '#FFB6C1', '#FFF0F5', '#4A1728'] },
  { id: 'midnight', name: 'Midnight Elegant', colors: ['#191970', '#4169E1', '#B0C4DE', '#F0F0FF', '#0A0A2E'] },
  { id: 'terracotta', name: 'Terracotta', colors: ['#A0522D', '#CD853F', '#F4A460', '#FFEFD5', '#3B1F0B'] },
  { id: 'custom', name: 'Let AI decide', colors: ['#888', '#aaa', '#ccc', '#eee', '#333'] },
];

const PLACES = [
  { id: 'beach', label: '🏖 Beach / Coast', vibe: 'coastal, sandy, sun-kissed' },
  { id: 'mountains', label: '⛰ Mountains', vibe: 'alpine, crisp, panoramic views' },
  { id: 'city', label: '🏙 City / Urban', vibe: 'skyline, nightlife, rooftop drinks' },
  { id: 'countryside', label: '🌾 Countryside', vibe: 'rolling fields, golden light, rustic' },
  { id: 'tropical', label: '🌴 Tropical', vibe: 'lush, warm, paradise' },
  { id: 'europe', label: '🇪🇺 European', vibe: 'cobblestone, cafés, old-world charm' },
  { id: 'desert', label: '🏜 Desert', vibe: 'vast, terracotta, sunset tones' },
  { id: 'home', label: '🏡 Home Sweet Home', vibe: 'domestic bliss, couch cuddles, kitchen dances' },
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
  e.target.style.boxShadow = '0 0 0 4px rgba(184,146,106,0.1)';
  e.target.style.transform = 'translateY(-1px)';
};

const getBlurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = 'rgba(0,0,0,0.06)';
  e.target.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)';
  e.target.style.transform = 'none';
};

const btnPrimaryStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '1rem 2rem', borderRadius: '0.75rem',
  background: 'var(--eg-fg)', color: '#fff', border: 'none',
  fontSize: '1rem', fontWeight: 500, fontFamily: 'var(--eg-font-body)',
  cursor: 'pointer', transition: 'all 0.2s ease',
  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
};

export function VibeInput({ onSubmit, initialNames }: VibeInputProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Step 1: Names
  const [name1, setName1] = useState(initialNames?.[0] ?? '');
  const [name2, setName2] = useState(initialNames?.[1] ?? '');
  // Step 2: Mood
  const [mood, setMood] = useState<string>('');
  // Step 3: Color Palette
  const [palette, setPalette] = useState<string>('');
  // Step 4: Favorite places
  const [favPlaces, setFavPlaces] = useState<string[]>([]);
  const [customPlace, setCustomPlace] = useState('');
  // Step 5: Your Story
  const [meetCute, setMeetCute] = useState('');
  const [relationship, setRelationship] = useState('');
  // Step 6: Special details
  const [petsDetails, setPetsDetails] = useState('');
  const [musicSong, setMusicSong] = useState('');

  const canProceedStep1 = name1.trim() && name2.trim();
  const canProceedStep2 = mood !== '';
  const canProceedStep3 = palette !== '';
  const canProceedStep4 = favPlaces.length > 0;
  const canProceedStep5 = meetCute.trim() !== '';

  const handleNext = () => { if (step < totalSteps) setStep(step + 1); };
  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const togglePlace = (id: string) => {
    setFavPlaces(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    const selectedMoodLabel = VIBE_MOODS.find(m => m.id === mood)?.label || '';
    const selectedPalette = COLOR_PALETTES.find(p => p.id === palette);
    const paletteInfo = selectedPalette && palette !== 'custom'
      ? `Color inspiration: ${selectedPalette.name} palette (${selectedPalette.colors.join(', ')}).`
      : 'Let the AI choose colors that match the overall vibe.';

    const placeVibes = favPlaces.map(id => {
      const p = PLACES.find(pl => pl.id === id);
      return p ? p.vibe : id;
    });
    const placeString = placeVibes.length > 0
      ? `Favorite place aesthetics: ${placeVibes.join('; ')}.`
      : '';

    const synthesizedVibe = [
      `Core Vibe: ${selectedMoodLabel}.`,
      paletteInfo,
      placeString,
      customPlace ? `Specific favorite place: ${customPlace}.` : '',
      `How they met: ${meetCute}.`,
      relationship ? `What makes their relationship special: ${relationship}.` : '',
      petsDetails ? `Important details (pets/inside jokes): ${petsDetails}.` : '',
      musicSong ? `"Their song" or musical vibe: ${musicSong}.` : '',
      'The generated site must feel deeply personal and emotionally resonant.',
      'Make the colors, typography, and narrative flow from these exact feelings and aesthetics.',
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    onSubmit({
      names: [name1.trim(), name2.trim()],
      vibeString: synthesizedVibe,
    });
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
    boxShadow: active ? '0 4px 12px rgba(184,146,106,0.15)' : 'none',
    color: 'var(--eg-fg)',
  });

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Progress Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '3rem' }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: i + 1 <= step ? 'var(--eg-accent)' : 'rgba(0,0,0,0.06)',
            transition: 'background 0.4s ease',
          }} />
        ))}
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
                <input type="text" placeholder="e.g. Ben" value={name1} onChange={e => setName1(e.target.value)} style={{ ...inputStyle, fontSize: '1.25rem' }} onFocus={getFocusStyle} onBlur={getBlurStyle} autoFocus />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="shimmer-text" style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', color: 'var(--eg-accent)' }}>&</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>Second Person</label>
                <input type="text" placeholder="e.g. Shauna" value={name2} onChange={e => setName2(e.target.value)} style={{ ...inputStyle, fontSize: '1.25rem' }} onFocus={getFocusStyle} onBlur={getBlurStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
              <button onClick={handleNext} disabled={!canProceedStep1} style={{ ...btnPrimaryStyle, opacity: canProceedStep1 ? 1 : 0.5, pointerEvents: canProceedStep1 ? 'auto' : 'none' }}>
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: MOOD ── */}
        {step === 2 && (
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
                  boxShadow: mood === m.id ? '0 8px 24px rgba(184,146,106,0.15)' : '0 2px 10px rgba(0,0,0,0.02)',
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
              <button onClick={handleNext} disabled={!canProceedStep2} style={{ ...btnPrimaryStyle, opacity: canProceedStep2 ? 1 : 0.5, pointerEvents: canProceedStep2 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: COLOR PALETTE ── */}
        {step === 3 && (
          <motion.div key="s3" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
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
                  boxShadow: palette === p.id ? '0 8px 24px rgba(184,146,106,0.15)' : '0 2px 10px rgba(0,0,0,0.02)',
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
              <button onClick={handleNext} disabled={!canProceedStep3} style={{ ...btnPrimaryStyle, opacity: canProceedStep3 ? 1 : 0.5, pointerEvents: canProceedStep3 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: FAVORITE PLACES ── */}
        {step === 4 && (
          <motion.div key="s4" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
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
              <button onClick={handleNext} disabled={!canProceedStep4} style={{ ...btnPrimaryStyle, opacity: canProceedStep4 ? 1 : 0.5, pointerEvents: canProceedStep4 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 5: YOUR STORY ── */}
        {step === 5 && (
          <motion.div key="s5" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>Tell Us Your Story</h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
              The more you share, the more personal and beautiful your site will be.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>How did you meet? *</label>
                <textarea value={meetCute} onChange={e => setMeetCute(e.target.value)} placeholder="We matched on Hinge and had our first date at a little Italian place..." style={{ ...inputStyle, minHeight: '140px', resize: 'none', lineHeight: 1.6 }} onFocus={getFocusStyle} onBlur={getBlurStyle} autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>What makes your relationship special? <span style={{ color: 'var(--eg-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="We balance each other perfectly — she's spontaneous and I'm the planner..." style={{ ...inputStyle, minHeight: '100px', resize: 'none', lineHeight: 1.6 }} onFocus={getFocusStyle} onBlur={getBlurStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} disabled={!canProceedStep5} style={{ ...btnPrimaryStyle, opacity: canProceedStep5 ? 1 : 0.5, pointerEvents: canProceedStep5 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 6: SPECIAL DETAILS ── */}
        {step === 6 && (
          <motion.div key="s6" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: 'var(--eg-accent-light)', border: '2px solid rgba(184,146,106,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
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
              <button onClick={handleSubmit} style={{ ...btnPrimaryStyle, padding: '1rem 2.5rem', background: 'var(--eg-accent)' }}>
                <Sparkles size={18} /> Craft Our Story
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
