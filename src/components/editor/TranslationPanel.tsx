'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/TranslationPanel.tsx
//
// Generates multi-language translations of chapter content
// via /api/translate (Gemini). Supports 10 locales.
// Applied to manifest.translations[locale].chapters[].
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Sparkles, Check, X, Loader2 } from 'lucide-react';
import type { StoryManifest } from '@/types';
import {
  PanelRoot,
  PanelSection,
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
} from './panel';

export type LocaleCode =
  | 'es' | 'fr' | 'it' | 'pt' | 'de' | 'ja' | 'zh' | 'he' | 'ar';

// ISO 639-1 codes + endonyms — accessible and honest (a language
// is not a country). Endonyms render identically across all OSes;
// flag emoji do not.
const LOCALES: ReadonlyArray<{ code: LocaleCode; label: string; endonym: string }> = [
  { code: 'es', label: 'Spanish',    endonym: 'Español' },
  { code: 'fr', label: 'French',     endonym: 'Français' },
  { code: 'it', label: 'Italian',    endonym: 'Italiano' },
  { code: 'pt', label: 'Portuguese', endonym: 'Português' },
  { code: 'de', label: 'German',     endonym: 'Deutsch' },
  { code: 'ja', label: 'Japanese',   endonym: '日本語' },
  { code: 'zh', label: 'Chinese',    endonym: '中文' },
  { code: 'he', label: 'Hebrew',     endonym: 'עברית' },
  { code: 'ar', label: 'Arabic',     endonym: 'العربية' },
];

interface TranslationPanelProps {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

export function TranslationPanel({ manifest, onChange }: TranslationPanelProps) {
  const [generating, setGenerating] = useState<string | null>(null); // locale code
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Set<string>>(new Set(
    Object.keys(manifest.translations || {})
  ));

  const coupleNames = (manifest as unknown as { names?: string[] }).names ?? ['', ''];
  const chapters = manifest.chapters || [];

  const handleGenerate = async (locale: LocaleCode) => {
    if (chapters.length === 0) {
      setErrors(prev => ({ ...prev, [locale]: 'Add story chapters first.' }));
      return;
    }
    setGenerating(locale);
    setErrors(prev => { const n = { ...prev }; delete n[locale]; return n; });
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapters,
          targetLocale: locale,
          coupleNames: coupleNames.filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error('Translation failed');
      const { translations: localeTrans } = await res.json();
      const updated: StoryManifest = {
        ...manifest,
        translations: {
          ...(manifest.translations || {}),
          [locale]: { chapters: localeTrans },
        },
      };
      onChange(updated);
      setDone(prev => new Set([...prev, locale]));
    } catch (err) {
      setErrors(prev => ({ ...prev, [locale]: err instanceof Error ? err.message : 'Failed' }));
    } finally {
      setGenerating(null);
    }
  };

  const handleRemove = (locale: LocaleCode) => {
    const tr = { ...(manifest.translations || {}) };
    delete tr[locale];
    onChange({ ...manifest, translations: Object.keys(tr).length > 0 ? tr : undefined });
    setDone(prev => { const n = new Set(prev); n.delete(locale); return n; });
  };

  const hasDone = done.size > 0;

  return (
    <PanelRoot>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '2px 20px 0',
        fontSize: panelText.label,
        fontWeight: panelWeight.heavy,
        letterSpacing: panelTracking.wider,
        textTransform: 'uppercase',
        color: '#71717A',
      }}>
        <Globe size={11} /> Translations
      </div>

      {/* Description */}
      <div style={{
        padding: '4px 20px 2px',
        fontSize: panelText.body,
        color: '#3F3F46',
        lineHeight: panelLineHeight.snug,
      }}>
        Generate your story chapters in another language. Once created, guests switch
        language using the toolbar selector.
      </div>

      {/* Active translations */}
      {hasDone && (
        <PanelSection title="Active" icon={Check} defaultOpen>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {LOCALES.filter(l => done.has(l.code)).map(locale => (
              <div key={locale.code} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', borderRadius: 'var(--pl-radius-lg)',
                background: '#FAFAFA',
                border: '1px solid #E4E4E7',
              }}>
                <span
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.62rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    padding: '3px 6px',
                    borderRadius: 'var(--pl-radius-xs)',
                    background: 'var(--pl-cream-deep, #F0ECE3)',
                    color: 'var(--pl-ink-soft, #3A332C)',
                  }}
                >
                  {locale.code}
                </span>
                <div style={{
                  flex: 1,
                  fontSize: panelText.body,
                  fontWeight: panelWeight.semibold,
                  color: '#3F3F46',
                }}>
                  {locale.label}
                </div>
                <Check size={11} color="#71717A" />
                <button
                  onClick={() => handleGenerate(locale.code)}
                  disabled={generating === locale.code}
                  style={{
                    padding: '3px 8px', borderRadius: 'var(--pl-radius-sm)',
                    border: '1px solid #E4E4E7',
                    background: 'none', color: '#3F3F46',
                    cursor: 'pointer',
                    fontSize: panelText.hint,
                    fontWeight: panelWeight.bold,
                  }}
                  title="Regenerate"
                >
                  {generating === locale.code ? '…' : '↺'}
                </button>
                <button
                  onClick={() => handleRemove(locale.code)}
                  style={{
                    padding: '3px', borderRadius: 'var(--pl-radius-sm)',
                    border: 'none', background: 'none',
                    color: '#71717A', cursor: 'pointer',
                  }}
                  title="Remove translation"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </PanelSection>
      )}

      {/* Add / choose language */}
      <PanelSection title={hasDone ? 'Add Language' : 'Choose Language'} icon={Globe} defaultOpen={!hasDone}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {LOCALES.filter(l => !done.has(l.code)).map(locale => (
            <div key={locale.code}>
              <motion.button
                onClick={() => handleGenerate(locale.code)}
                disabled={!!generating}
                whileHover={{ backgroundColor: 'rgba(24,24,27,0.04)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '8px 10px', borderRadius: 'var(--pl-radius-lg)',
                  border: '1px solid #E4E4E7',
                  background: '#FFFFFF',
                  cursor: generating ? 'wait' : 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.62rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    padding: '3px 6px',
                    borderRadius: 'var(--pl-radius-xs)',
                    background: 'var(--pl-cream-deep, #F0ECE3)',
                    color: 'var(--pl-ink-soft, #3A332C)',
                    minWidth: 28,
                    textAlign: 'center',
                  }}
                >
                  {locale.code}
                </span>
                <span style={{
                  flex: 1,
                  fontSize: panelText.body,
                  fontWeight: panelWeight.semibold,
                  color: '#3F3F46',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}>
                  {locale.label}
                  <span
                    style={{
                      fontSize: panelText.hint,
                      color: '#A1A1AA',
                      fontWeight: panelWeight.regular,
                      fontStyle: 'italic',
                    }}
                  >
                    {locale.endonym}
                  </span>
                </span>
                {generating === locale.code ? (
                  <span style={{
                    fontSize: panelText.hint,
                    color: '#71717A',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <Loader2 size={11} style={{ animation: 'pl-spin 0.8s linear infinite' }} />
                    Translating…
                  </span>
                ) : (
                  <Sparkles size={11} color="#A1A1AA" />
                )}
              </motion.button>
              {errors[locale.code] && (
                <div style={{
                  fontSize: panelText.hint,
                  color: '#b34747',
                  padding: '3px 10px',
                }}>
                  {errors[locale.code]}
                </div>
              )}
            </div>
          ))}
        </div>
      </PanelSection>

      {chapters.length === 0 && (
        <div style={{
          margin: '0 8px',
          padding: '8px 10px', borderRadius: 'var(--pl-radius-lg)',
          background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)',
          fontSize: panelText.hint, color: '#3F3F46',
        }}>
          Add story chapters before generating translations.
        </div>
      )}

      <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
    </PanelRoot>
  );
}
