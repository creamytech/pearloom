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
import {
  PanelRoot,
  PanelSection,
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
} from './panel';

interface VoiceTrainerPanelProps {
  voiceSamples: string[];
  onChange: (samples: string[]) => void;
}

const EXAMPLE_SAMPLES = [
  "omg I'm so excited I literally can't stop smiling 😭💕",
  "can you believe we're actually doing this?? haha",
  "I love you so much, you're my favorite person ever",
];

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: panelText.label,
  fontWeight: panelWeight.bold,
  letterSpacing: panelTracking.wider,
  textTransform: 'uppercase',
  color: '#71717A',
  fontFamily: 'inherit',
  lineHeight: panelLineHeight.tight,
};

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
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid #E4E4E7',
    fontSize: 'max(16px, 0.8rem)',
    background: '#FFFFFF', fontFamily: 'inherit',
    color: '#18181B', outline: 'none', resize: 'vertical',
    lineHeight: panelLineHeight.normal, boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    minHeight: '72px',
  };

  return (
    <PanelRoot>
      <PanelSection
        title="Voice Trainer"
        icon={Sparkles}
        badge={voiceSamples.length || undefined}
        hint="Paste real texts or captions so the Ask the Couple chatbot answers guests in your exact tone."
        card={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Existing samples */}
          {voiceSamples.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>
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
                      background: '#FAFAFA', borderRadius: '10px',
                      padding: '10px 12px',
                      border: '1px solid #E4E4E7',
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                    }}
                  >
                    <MessageSquare size={13} color="#71717A" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{
                      flex: 1,
                      fontSize: panelText.body,
                      fontWeight: panelWeight.regular,
                      color: '#18181B',
                      fontFamily: 'inherit',
                      lineHeight: panelLineHeight.snug,
                    }}>
                      &ldquo;{sample}&rdquo;
                    </span>
                    <button
                      onClick={() => removeSample(i)}
                      title="Remove sample"
                      style={{
                        width: '24px', height: '24px', borderRadius: '6px', border: 'none',
                        background: 'transparent', color: '#71717A', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Add sample */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Paste a text or caption</label>
            <textarea
              value={newSample}
              onChange={e => setNewSample(e.target.value)}
              rows={3}
              placeholder={'Paste a real text you\'ve sent, a caption from a post, a voice note transcript — anything that sounds like you...'}
              style={textareaStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#18181B'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E4E4E7'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button
              onClick={addSample}
              disabled={!newSample.trim()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '9px 12px', borderRadius: '8px',
                background: newSample.trim() ? '#18181B' : '#E4E4E7',
                color: newSample.trim() ? '#FFFFFF' : '#71717A',
                border: 'none',
                cursor: newSample.trim() ? 'pointer' : 'not-allowed',
                fontSize: panelText.body,
                fontWeight: panelWeight.bold,
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
                transition: 'all 0.15s',
              }}
            >
              {saved ? <Check size={13} /> : <Plus size={13} />}
              {saved ? 'Added!' : 'Add Sample'}
            </button>
          </div>

          {/* Examples shortcut */}
          {voiceSamples.length === 0 && (
            <button
              onClick={loadExamples}
              style={{
                padding: '9px 12px', borderRadius: '8px',
                border: '1.5px dashed #E4E4E7', background: '#FAFAFA',
                color: '#3F3F46',
                fontSize: panelText.hint,
                fontWeight: panelWeight.semibold,
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
                cursor: 'pointer',
                transition: 'all 0.15s',
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
                padding: '10px', borderRadius: '8px', border: 'none',
                background: training ? '#F4F4F5' : '#18181B',
                color: training ? '#71717A' : '#FFFFFF',
                cursor: training ? 'not-allowed' : 'pointer',
                fontSize: panelText.body,
                fontWeight: panelWeight.bold,
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
                transition: 'all 0.15s',
              }}
            >
              <Cpu size={13} />
              {training ? 'Training...' : voiceProfile ? 'Retrain Voice' : 'Train Voice Model'}
            </button>
          )}

          {/* Voice Profile Results */}
          {voiceProfile && (
            <div style={{
              marginTop: '4px',
              padding: '12px',
              borderRadius: '12px',
              background: '#FAFAFA',
              border: '1px solid #E4E4E7',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={labelStyle}>Voice Profile</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  { label: 'Formality', value: voiceProfile.formality },
                  { label: 'Warmth', value: voiceProfile.warmth },
                  { label: 'Humor', value: voiceProfile.humor },
                  { label: 'Expressiveness', value: voiceProfile.expressiveness },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    padding: '8px',
                    borderRadius: '10px',
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: panelText.itemTitle,
                      fontWeight: panelWeight.bold,
                      color: '#18181B',
                      fontFamily: 'inherit',
                      lineHeight: panelLineHeight.tight,
                    }}>
                      {Math.round(value)}
                    </div>
                    <div style={{
                      fontSize: panelText.meta,
                      fontWeight: panelWeight.bold,
                      letterSpacing: panelTracking.wider,
                      textTransform: 'uppercase',
                      color: '#71717A',
                      fontFamily: 'inherit',
                      lineHeight: panelLineHeight.tight,
                      marginTop: '2px',
                    }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              {voiceProfile.signaturePhrases.length > 0 && (
                <div>
                  <div style={{
                    fontSize: panelText.meta,
                    fontWeight: panelWeight.bold,
                    letterSpacing: panelTracking.wider,
                    textTransform: 'uppercase',
                    color: '#71717A',
                    fontFamily: 'inherit',
                    lineHeight: panelLineHeight.tight,
                    marginBottom: '6px',
                  }}>
                    Signature Phrases
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {voiceProfile.signaturePhrases.slice(0, 5).map(phrase => (
                      <span key={phrase} style={{
                        padding: '3px 8px', borderRadius: '100px',
                        background: '#FFFFFF',
                        border: '1px solid #E4E4E7',
                        color: '#18181B',
                        fontSize: panelText.chip,
                        fontWeight: panelWeight.semibold,
                        fontFamily: 'inherit',
                        lineHeight: panelLineHeight.tight,
                      }}>
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{
                fontSize: panelText.hint,
                color: '#3F3F46',
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.snug,
              }}>
                Pronouns: {voiceProfile.pronounPreference} · Contractions: {voiceProfile.usesContractions ? 'yes' : 'no'}
              </div>
            </div>
          )}

          <p style={{
            fontSize: panelText.hint,
            color: '#71717A',
            fontFamily: 'inherit',
            lineHeight: panelLineHeight.snug,
            textAlign: 'center',
            margin: '4px 0 0',
          }}>
            Add 3–10 samples for best results. The AI learns your exact vibe.
          </p>
        </div>
      </PanelSection>
    </PanelRoot>
  );
}
