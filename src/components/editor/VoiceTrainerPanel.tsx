'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/VoiceTrainerPanel.tsx
// Lets the couple paste real text messages to teach the AI
// how they actually talk. Used by the Ask the Couple chatbot.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Trash2, Sparkles, Check, Cpu } from 'lucide-react';
import { trainVoiceProfile, type VoiceProfile } from '@/lib/voice-engine/trainer';

interface VoiceTrainerPanelProps {
  voiceSamples: string[];
  onChange: (samples: string[]) => void;
}

const EXAMPLE_SAMPLES = [
  "omg I'm so excited I literally can't stop smiling 😭💕",
  "can you believe we're actually doing this?? haha",
  "I love you so much, you're my favorite person ever",
];

export function VoiceTrainerPanel({ voiceSamples, onChange }: VoiceTrainerPanelProps) {
  const [newSample, setNewSample] = useState('');
  const [saved, setSaved] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [training, setTraining] = useState(false);

  const handleTrain = () => {
    if (voiceSamples.length === 0) return;
    setTraining(true);
    setTimeout(() => {
      const profile = trainVoiceProfile(
        voiceSamples.map(text => ({ text, source: 'freeform' as const })),
        'current-user',
      );
      setVoiceProfile(profile);
      setTraining(false);
    }, 800);
  };

  const addSample = () => {
    const trimmed = newSample.trim();
    if (!trimmed) return;
    onChange([...voiceSamples, trimmed]);
    setNewSample('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const removeSample = (index: number) => {
    onChange(voiceSamples.filter((_, i) => i !== index));
  };

  const loadExamples = () => {
    onChange([...voiceSamples, ...EXAMPLE_SAMPLES]);
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem', borderRadius: '0.6rem',
    border: '1.5px solid rgba(0,0,0,0.06)', fontSize: '0.85rem',
    background: 'rgba(163,177,138,0.05)', fontFamily: 'var(--pl-font-body)',
    color: 'var(--pl-ink)', outline: 'none', resize: 'none',
    lineHeight: 1.6, boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Explainer */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(163,177,138,0.08), rgba(163,177,138,0.03))',
        borderRadius: '0.75rem', padding: '1rem 1.25rem',
        border: '1px solid rgba(163,177,138,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={15} color="var(--pl-olive)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--pl-olive)', letterSpacing: '0.05em' }}>
            AI Voice Training
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--pl-muted)', lineHeight: 1.6, margin: 0 }}>
          Paste real texts, captions, or voice notes you&apos;ve written. The AI chatbot will respond to your guests <em>as you</em> — in your exact tone, energy, and emoji style.
        </p>
      </div>

      {/* Existing samples */}
      {voiceSamples.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>
            {voiceSamples.length} Voice Sample{voiceSamples.length !== 1 ? 's' : ''} Added
          </label>
          <AnimatePresence>
            {voiceSamples.map((sample, i) => (
              <motion.div
                key={`${sample.slice(0, 30)}-${i}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: 'rgba(0,0,0,0.04)', borderRadius: '0.6rem', padding: '0.65rem 0.85rem',
                  border: '1px solid rgba(0,0,0,0.06)', display: 'flex',
                  alignItems: 'flex-start', gap: '0.5rem',
                }}
              >
                <MessageSquare size={13} color="var(--pl-olive)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--pl-ink)', lineHeight: 1.5 }}>
                  &ldquo;{sample}&rdquo;
                </span>
                <button
                  onClick={() => removeSample(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(109,89,122,0.5)', display: 'flex', flexShrink: 0 }}
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add sample */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>
          Paste a text or caption
        </label>
        <textarea
          value={newSample}
          onChange={e => setNewSample(e.target.value)}
          rows={3}
          placeholder={'Paste a real text you\'ve sent, a caption from a post, a voice note transcript — anything that sounds like you...'}
          style={textareaStyle}
          onFocus={e => { e.target.style.borderColor = 'var(--pl-olive)'; e.target.style.background = 'rgba(0,0,0,0.06)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.06)'; e.target.style.background = 'rgba(163,177,138,0.05)'; }}
        />
        <button
          onClick={addSample}
          disabled={!newSample.trim()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.65rem 1rem', borderRadius: '0.6rem',
            background: 'var(--pl-olive)', color: '#fff',
            border: 'none', cursor: newSample.trim() ? 'pointer' : 'not-allowed',
            fontSize: '0.8rem', fontWeight: 700, opacity: newSample.trim() ? 1 : 0.4,
            transition: 'all 0.2s',
          }}
        >
          {saved ? <Check size={14} /> : <Plus size={14} />}
          {saved ? 'Added!' : 'Add Sample'}
        </button>
      </div>

      {/* Examples shortcut */}
      {voiceSamples.length === 0 && (
        <button
          onClick={loadExamples}
          style={{
            padding: '0.6rem 1rem', borderRadius: '0.6rem',
            border: '1.5px dashed rgba(0,0,0,0.07)', background: 'transparent',
            color: 'var(--pl-muted)', fontSize: '0.75rem', cursor: 'pointer',
            fontWeight: 600, letterSpacing: '0.02em',
          }}
        >
          Load example samples (demo)
        </button>
      )}

      {/* Train Voice button */}
      {voiceSamples.length >= 2 && (
        <button
          onClick={handleTrain}
          disabled={training}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px', borderRadius: '10px', border: 'none',
            background: training ? 'rgba(163,177,138,0.2)' : 'var(--pl-olive-deep)',
            color: training ? 'var(--pl-ink-soft)' : '#fff',
            cursor: training ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
          }}
        >
          <Cpu size={13} />
          {training ? 'Training...' : voiceProfile ? 'Retrain Voice' : 'Train Voice Model'}
        </button>
      )}

      {/* Voice Profile Results */}
      {voiceProfile && (
        <div className="pl-panel-section" style={{ marginTop: '8px' }}>
          <div className="pl-panel-label">Voice Profile</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[
              { label: 'Formality', value: voiceProfile.formality },
              { label: 'Warmth', value: voiceProfile.warmth },
              { label: 'Humor', value: voiceProfile.humor },
              { label: 'Expressiveness', value: voiceProfile.expressiveness },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '6px 8px', borderRadius: '8px', background: 'rgba(163,177,138,0.06)', textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--pl-olive-deep)' }}>{Math.round(value)}</div>
                <div style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--pl-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
          {voiceProfile.signaturePhrases.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--pl-muted)', marginBottom: '4px' }}>Signature Phrases</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {voiceProfile.signaturePhrases.slice(0, 5).map(phrase => (
                  <span key={phrase} style={{ padding: '2px 8px', borderRadius: '100px', background: 'var(--pl-olive-mist)', color: 'var(--pl-olive-deep)', fontSize: '0.62rem', fontWeight: 600 }}>
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ fontSize: '0.58rem', color: 'var(--pl-olive)', marginTop: '8px', fontStyle: 'italic' }}>
            Pronouns: {voiceProfile.pronounPreference} · Contractions: {voiceProfile.usesContractions ? 'yes' : 'no'}
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.7rem', color: 'var(--pl-muted)', textAlign: 'center', opacity: 0.7 }}>
        Add 3–10 samples for best results. The AI learns your exact vibe.
      </p>
    </div>
  );
}
