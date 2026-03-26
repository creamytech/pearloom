'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/vibe-input.tsx
// Multi-step Magical "Memory Engine Setup" Wizard
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft, Heart, Music, Image as ImageIcon, Map, Dog } from 'lucide-react';

interface VibeInputProps {
  onSubmit: (data: { names: [string, string]; vibeString: string }) => void;
  initialNames?: [string, string];
  initialVibe?: string;
}

const VIBE_MOODS = [
  { id: 'romantic', label: 'Classic Romance', icon: Heart, desc: 'Timeless, elegant, and deeply emotional.' },
  { id: 'adventurous', label: 'Adventurous', icon: Map, desc: 'Wild, free, exploring the world together.' },
  { id: 'playful', label: 'Playful & Fun', icon: Music, desc: 'Constant laughter, colorful, and vibrant.' },
  { id: 'cozy', label: 'Cozy & Intimate', icon: ImageIcon, desc: 'Sunday mornings, coffee, and quiet moments.' },
  { id: 'pets', label: 'Our Little Zoo', icon: Dog, desc: 'The pets are the main characters.' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '1.25rem',
  borderRadius: '1rem',
  border: '2px solid rgba(0,0,0,0.06)',
  background: '#ffffff',
  fontSize: '1.1rem',
  fontFamily: 'var(--eg-font-body)',
  color: 'var(--eg-fg)',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
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
  const totalSteps = 4;

  const [name1, setName1] = useState(initialNames?.[0] ?? '');
  const [name2, setName2] = useState(initialNames?.[1] ?? '');
  const [mood, setMood] = useState<string>('');
  const [meetCute, setMeetCute] = useState('');
  const [petsDetails, setPetsDetails] = useState('');
  
  const canProceedStep1 = name1.trim() && name2.trim();
  const canProceedStep2 = mood !== '';
  const canProceedStep3 = meetCute.trim() !== '';

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const selectedMoodLabel = VIBE_MOODS.find(m => m.id === mood)?.label || '';
    const synthesizedVibe = `
      Core Vibe: ${selectedMoodLabel}. 
      How we met: ${meetCute}. 
      ${petsDetails ? `Important details (pets/inside jokes): ${petsDetails}.` : ''} 
      Make the colors, tone, and design flow from these exact feelings.
    `.trim().replace(/\s+/g, ' ');

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

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Progress Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '3rem' }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: i + 1 <= step ? 'var(--eg-accent)' : 'rgba(0,0,0,0.06)',
              transition: 'background 0.4s ease',
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={1}>
        {/* ── STEP 1: Names ── */}
        {step === 1 && (
          <motion.div
            key="step1" custom={1} variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              Who is this story about?
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              Let&apos;s start with the most important part.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>
                  First Person
                </label>
                <input
                  type="text" placeholder="e.g. Ben"
                  value={name1} onChange={e => setName1(e.target.value)}
                  style={{ ...inputStyle, fontSize: '1.25rem' }}
                  onFocus={getFocusStyle} onBlur={getBlurStyle}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="shimmer-text" style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', color: 'var(--eg-accent)' }}>&</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>
                  Second Person
                </label>
                <input
                  type="text" placeholder="e.g. Shauna"
                  value={name2} onChange={e => setName2(e.target.value)}
                  style={{ ...inputStyle, fontSize: '1.25rem' }}
                  onFocus={getFocusStyle} onBlur={getBlurStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
              <button
                onClick={handleNext} disabled={!canProceedStep1}
                style={{ ...btnPrimaryStyle, opacity: canProceedStep1 ? 1 : 0.5, pointerEvents: canProceedStep1 ? 'auto' : 'none' }}
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: MOOD ── */}
        {step === 2 && (
          <motion.div
            key="step2" custom={1} variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              What&apos;s your relationship vibe?
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              This defines the colors, fonts, and tone of your generated site.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {VIBE_MOODS.map(m => (
                <button
                  key={m.id} onClick={() => setMood(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1.25rem',
                    padding: '1.25rem 1.5rem', borderRadius: '1rem',
                    border: `2px solid ${mood === m.id ? 'var(--eg-accent)' : 'rgba(0,0,0,0.06)'}`,
                    background: mood === m.id ? 'var(--eg-accent-light)' : '#fff',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: mood === m.id ? '0 8px 24px rgba(184,146,106,0.15)' : '0 2px 10px rgba(0,0,0,0.02)',
                    transform: mood === m.id ? 'translateY(-2px)' : 'none',
                  }}
                >
                  <div style={{
                    width: '3.5rem', height: '3.5rem', borderRadius: '50%',
                    background: mood === m.id ? '#fff' : 'var(--eg-accent-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--eg-accent)', flexShrink: 0,
                  }}>
                    <m.icon size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--eg-fg)' }}>
                      {m.label}
                    </h3>
                    <p style={{ fontSize: '0.95rem', color: 'var(--eg-muted)', marginTop: '0.25rem' }}>
                      {m.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '1rem' }}>
                <ArrowLeft size={18} /> Back
              </button>
              <button
                onClick={handleNext} disabled={!canProceedStep2}
                style={{ ...btnPrimaryStyle, opacity: canProceedStep2 ? 1 : 0.5, pointerEvents: canProceedStep2 ? 'auto' : 'none' }}
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: MEET CUTE ── */}
        {step === 3 && (
          <motion.div
            key="step3" custom={1} variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              How did you meet?
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              Give the AI some backstory to weave into your timeline.
            </p>

            <textarea
              value={meetCute} onChange={e => setMeetCute(e.target.value)}
              placeholder="We met at a coffee shop on a rainy Tuesday..."
              style={{ ...inputStyle, minHeight: '220px', resize: 'none', lineHeight: 1.6 }}
              onFocus={getFocusStyle} onBlur={getBlurStyle}
              autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '1rem' }}>
                <ArrowLeft size={18} /> Back
              </button>
              <button
                onClick={handleNext} disabled={!canProceedStep3}
                style={{ ...btnPrimaryStyle, opacity: canProceedStep3 ? 1 : 0.5, pointerEvents: canProceedStep3 ? 'auto' : 'none' }}
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: MAGIC / EXTRAS ── */}
        {step === 4 && (
          <motion.div
            key="step4" custom={1} variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{
                width: '5rem', height: '5rem', borderRadius: '50%',
                background: 'var(--eg-accent-light)', border: '2px solid rgba(184,146,106,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}>
                <Sparkles size={28} color="var(--eg-accent)" />
              </div>
              <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.75rem' }}>
                Any final magic touches?
              </h2>
              <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto' }}>
                Tell us about your pets, inside jokes, or anything else that makes your relationship unique. (Optional)
              </p>
            </div>

            <textarea
              value={petsDetails} onChange={e => setPetsDetails(e.target.value)}
              placeholder="We have a golden retriever named Poppy..."
              style={{ ...inputStyle, minHeight: '160px', resize: 'none', lineHeight: 1.6 }}
              onFocus={getFocusStyle} onBlur={getBlurStyle}
              autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '1rem' }}>
                <ArrowLeft size={18} /> Back
              </button>
              <button
                onClick={handleSubmit}
                style={{ ...btnPrimaryStyle, padding: '1rem 2.5rem' }}
              >
                <Sparkles size={18} /> Craft Our Story
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
