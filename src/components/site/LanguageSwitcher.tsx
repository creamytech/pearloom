'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/LanguageSwitcher.tsx
// Multi-language toggle — floats at bottom-right of the site.
// Fetches AI translations via /api/translate and stores in sessionStorage.
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VibeSkin } from '@/lib/vibe-engine';
import type { Chapter } from '@/types';

export interface LanguageSwitcherProps {
  siteId: string;
  currentLocale?: string;
  vibeSkin: VibeSkin;
  onLocaleChange: (locale: string, translations?: Array<{ title: string; subtitle: string; description: string }>) => void;
  chapters: Chapter[];
  coupleNames: [string, string];
}

interface Language {
  code: string;
  label: string;
  flag: string;
  dir?: 'rtl' | 'ltr';
}

const LANGUAGES: Language[] = [
  { code: 'en', label: 'English',    flag: '🇺🇸' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'it', label: 'Italiano',   flag: '🇮🇹' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'ja', label: '日本語',      flag: '🇯🇵' },
  { code: 'zh', label: '中文',        flag: '🇨🇳' },
  { code: 'he', label: 'עברית',      flag: '🇮🇱', dir: 'rtl' },
  { code: 'ar', label: 'العربية',    flag: '🇸🇦', dir: 'rtl' },
];

function getSessionKey(siteId: string, locale: string): string {
  return `pl_translation_${siteId}_${locale}`;
}

export function LanguageSwitcher({
  siteId,
  currentLocale = 'en',
  vibeSkin,
  onLocaleChange,
  chapters,
  coupleNames,
}: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [activeLocale, setActiveLocale] = useState(currentLocale);
  const [loading, setLoading] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { palette, fonts } = vibeSkin;

  const currentLang = LANGUAGES.find((l) => l.code === activeLocale) ?? LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = async (lang: Language) => {
    setOpen(false);
    if (lang.code === activeLocale) return;

    // Switching to English — no translation needed
    if (lang.code === 'en') {
      setActiveLocale('en');
      onLocaleChange('en', undefined);
      return;
    }

    // Check sessionStorage cache first
    const cacheKey = getSessionKey(siteId, lang.code);
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const translations = JSON.parse(cached);
        setActiveLocale(lang.code);
        onLocaleChange(lang.code, translations);
        return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // Fetch translation
    setLoading(lang.code);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapters,
          targetLocale: lang.code,
          coupleNames,
        }),
      });

      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();
      const translations = data.translations;

      // Cache in sessionStorage
      sessionStorage.setItem(cacheKey, JSON.stringify(translations));
      setActiveLocale(lang.code);
      onLocaleChange(lang.code, translations);
    } catch {
      console.warn('[LanguageSwitcher] Translation failed');
      // Silently fall back to current locale
    } finally {
      setLoading(null);
    }
  };

  // Only show if there's something to translate (more than 0 chapters)
  if (!chapters || chapters.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        zIndex: 9000,
        fontFamily: `${fonts.body}, Inter, sans-serif`,
      }}
    >
      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: '0.5rem',
              background: palette.card,
              borderRadius: '1rem',
              border: `1px solid ${palette.accent}28`,
              boxShadow: `0 12px 48px ${palette.accent}20, 0 4px 16px rgba(0,0,0,0.12)`,
              padding: '0.5rem',
              minWidth: '160px',
              overflow: 'hidden',
            }}
          >
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === activeLocale;
              const isLoadingThis = loading === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang)}
                  disabled={isLoadingThis}
                  dir={lang.dir || 'ltr'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.625rem',
                    border: 'none',
                    background: isActive ? `${palette.accent}18` : 'transparent',
                    color: isActive ? palette.accent : palette.foreground,
                    fontFamily: `${fonts.body}, Inter, sans-serif`,
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 400,
                    cursor: isLoadingThis ? 'wait' : 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = `${palette.accent}0e`;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{lang.flag}</span>
                  <span>{lang.label}</span>
                  {isLoadingThis && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: `2px solid ${palette.accent}`,
                        borderTopColor: 'transparent',
                        animation: 'spin 0.7s linear infinite',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {isActive && !isLoadingThis && (
                    <span style={{ marginLeft: 'auto', color: palette.accent, fontSize: '0.8rem' }}>✓</span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.55rem 1rem',
          borderRadius: '100px',
          background: palette.card,
          color: palette.foreground,
          border: `1px solid ${palette.accent}30`,
          boxShadow: `0 4px 20px rgba(0,0,0,0.12), 0 2px 8px ${palette.accent}14`,
          fontFamily: `${fonts.body}, Inter, sans-serif`,
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transition: 'box-shadow 0.2s',
        }}
        title="Change language"
        aria-label={`Current language: ${currentLang.label}. Click to change.`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{currentLang.flag}</span>
        <span style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {currentLang.code}
        </span>
        <span
          style={{
            fontSize: '0.6rem',
            opacity: 0.6,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}
        >
          ▲
        </span>
      </motion.button>

      {/* CSS for spinner animation */}
      <style>{`
      `}</style>
    </div>
  );
}
