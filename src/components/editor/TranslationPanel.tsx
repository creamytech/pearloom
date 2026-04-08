'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/TranslationPanel.tsx
//
// Generates multi-language translations of chapter content
// via /api/translate (Gemini). Supports 10 locales.
// Applied to manifest.translations[locale].chapters[].
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Sparkles, Check, X, ChevronDown, Loader2 } from 'lucide-react';
import type { StoryManifest } from '@/types';
import { SidebarSection } from './EditorSidebar';

const LOCALES: Array<{ code: string; label: string; flag: string }> = [
  { code: 'es', label: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr', label: 'French',     flag: '🇫🇷' },
  { code: 'it', label: 'Italian',    flag: '🇮🇹' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'de', label: 'German',     flag: '🇩🇪' },
  { code: 'ja', label: 'Japanese',   flag: '🇯🇵' },
  { code: 'zh', label: 'Chinese',    flag: '🇨🇳' },
  { code: 'he', label: 'Hebrew',     flag: '🇮🇱' },
  { code: 'ar', label: 'Arabic',     flag: '🇸🇦' },
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

  const handleGenerate = async (locale: string) => {
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

  const handleRemove = (locale: string) => {
    const tr = { ...(manifest.translations || {}) };
    delete tr[locale];
    onChange({ ...manifest, translations: Object.keys(tr).length > 0 ? tr : undefined });
    setDone(prev => { const n = new Set(prev); n.delete(locale); return n; });
  };

  const hasDone = done.size > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--pl-muted)',
      }}>
        <Globe size={11} /> Translations
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--pl-ink-soft)', lineHeight: 1.55 }}>
        Generate your story chapters in another language. Once created, guests switch
        language using the toolbar selector.
      </div>

      {/* Active translations */}
      {hasDone && (
        <SidebarSection title="Active" defaultOpen>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {LOCALES.filter(l => done.has(l.code)).map(locale => (
              <div key={locale.code} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 10px', borderRadius: '8px',
                background: 'var(--pl-olive-8)',
                border: '1px solid var(--pl-olive-20)',
              }}>
                <span style={{ fontSize: '1rem' }}>{locale.flag}</span>
                <div style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600, color: '#A3B18A' }}>
                  {locale.label}
                </div>
                <Check size={11} color="#A3B18A" />
                <button
                  onClick={() => handleGenerate(locale.code)}
                  disabled={generating === locale.code}
                  style={{
                    padding: '3px 8px', borderRadius: '5px',
                    border: '1px solid rgba(214,198,168,0.15)',
                    background: 'none', color: 'var(--pl-ink-soft)',
                    cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
                  }}
                  title="Regenerate"
                >
                  {generating === locale.code ? '…' : '↺'}
                </button>
                <button
                  onClick={() => handleRemove(locale.code)}
                  style={{
                    padding: '3px', borderRadius: '5px',
                    border: 'none', background: 'none',
                    color: 'var(--pl-muted)', cursor: 'pointer',
                  }}
                  title="Remove translation"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </SidebarSection>
      )}

      {/* Add new language */}
      <SidebarSection title={hasDone ? 'Add Language' : 'Choose Language'} defaultOpen={!hasDone}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {LOCALES.filter(l => !done.has(l.code)).map(locale => (
            <div key={locale.code}>
              <motion.button
                onClick={() => handleGenerate(locale.code)}
                disabled={!!generating}
                whileHover={{ backgroundColor: 'rgba(214,198,168,0.07)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '8px 10px', borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.04)',
                  background: 'var(--pl-olive-5)',
                  cursor: generating ? 'wait' : 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{locale.flag}</span>
                <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600, color: 'var(--pl-ink-soft)' }}>
                  {locale.label}
                </span>
                {generating === locale.code ? (
                  <span style={{ fontSize: '0.7rem', color: '#A3B18A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Loader2 size={11} style={{ animation: 'pl-spin 0.8s linear infinite' }} />
                    Translating…
                  </span>
                ) : (
                  <Sparkles size={11} color="rgba(214,198,168,0.35)" />
                )}
              </motion.button>
              {errors[locale.code] && (
                <div style={{ fontSize: '0.68rem', color: '#f87171', padding: '3px 10px' }}>
                  {errors[locale.code]}
                </div>
              )}
            </div>
          ))}
        </div>
      </SidebarSection>

      {chapters.length === 0 && (
        <div style={{
          padding: '10px 12px', borderRadius: '8px',
          background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)',
          fontSize: '0.72rem', color: 'var(--pl-ink-soft)',
        }}>
          Add story chapters before generating translations.
        </div>
      )}

      <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
