'use client';

// ─────────────────────────────────────────────────────────────
// LocationAutocomplete — Search-as-you-type location input
// Uses /api/venue/search (Google Places → Nominatim fallback).
// Editorial voice: cream plate, gold rule, mono caps on codex
// entries, italic Fraunces on venue names.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (place: { name: string; address: string; lat?: number; lng?: number }) => void;
  placeholder?: string;
  dark?: boolean;
}

interface Prediction {
  id: string;
  displayName: string;
  formattedAddress: string;
  location?: { lat: number; lng: number };
}

const FONT_DISPLAY = 'var(--pl-font-display, "Fraunces", serif)';
const FONT_MONO = 'var(--pl-font-mono, ui-monospace, monospace)';

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search the atlas…',
  dark = false,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Editorial palette
  const textColor = dark ? '#FAF7F2' : '#18181B';
  const mutedColor = dark ? 'rgba(250,247,242,0.6)' : '#52525B';
  const kickerColor = dark ? 'rgba(212,175,55,0.85)' : 'rgba(184,147,90,0.85)';
  const ruleColor = dark ? 'rgba(212,175,55,0.55)' : 'rgba(184,147,90,0.55)';
  const inputBorder = dark
    ? '1px solid rgba(212,175,55,0.38)'
    : '1px solid rgba(184,147,90,0.38)';
  const inputBg = dark ? 'rgba(22,16,6,0.35)' : 'rgba(250,247,242,0.65)';
  const dropBg = dark
    ? 'rgba(22,16,6,0.96)'
    : 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)';
  const hoverBg = dark
    ? 'rgba(212,175,55,0.12)'
    : 'rgba(184,147,90,0.1)';

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`/api/venue/search?type=autocomplete&q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.predictions || []);
      setShowDropdown(true);
      setActiveIdx(-1);
    } catch { /* ignore */ }
  }, []);

  const handleChange = (text: string) => {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 300);
  };

  const handleSelect = (pred: Prediction) => {
    const display = pred.formattedAddress
      ? `${pred.displayName}, ${pred.formattedAddress}`
      : pred.displayName;
    onChange(display);
    setShowDropdown(false);
    setSuggestions([]);
    onSelect?.({
      name: pred.displayName,
      address: pred.formattedAddress,
      lat: pred.location?.lat,
      lng: pred.location?.lng,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        {/* Gold top rule + mono kicker inside input */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 14,
            top: -8,
            padding: '0 6px',
            background: dark ? '#1a1305' : '#FAF7F2',
            fontFamily: FONT_MONO,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: kickerColor,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          Find venue
        </span>
        {/* Pin icon */}
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke={focused ? ruleColor : mutedColor}
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            transition: 'stroke 180ms ease',
          }}
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            height: 46,
            padding: '0 16px 0 38px',
            fontFamily: FONT_DISPLAY,
            fontStyle: 'italic',
            fontSize: '1rem',
            fontWeight: 400,
            letterSpacing: '-0.003em',
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            borderRadius: 'var(--pl-radius-xs)',
            border: inputBorder,
            borderTop: focused
              ? `1.5px solid ${ruleColor}`
              : `1px solid ${ruleColor}`,
            background: inputBg,
            outline: 'none',
            color: textColor,
            transition: 'border-color 180ms ease, box-shadow 180ms ease',
            boxSizing: 'border-box' as const,
            boxShadow: focused ? '0 0 0 3px rgba(184,147,90,0.18)' : 'none',
          } as React.CSSProperties}
        />
      </div>

      {/* Dropdown — codex of places */}
      {showDropdown && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 50,
          marginTop: 6,
          borderRadius: 'var(--pl-radius-xs)',
          overflow: 'hidden',
          background: dropBg,
          borderTop: `1.5px solid ${ruleColor}`,
          borderLeft: inputBorder,
          borderRight: inputBorder,
          borderBottom: inputBorder,
          boxShadow: '0 18px 48px rgba(22,16,6,0.18), 0 2px 8px rgba(22,16,6,0.08)',
        } as React.CSSProperties}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px 4px',
          }}>
            <span style={{
              fontFamily: FONT_MONO,
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: kickerColor,
            }}>
              {String(suggestions.length).padStart(2, '0')} result{suggestions.length === 1 ? '' : 's'}
            </span>
            <span style={{ flex: 1, height: 1, background: ruleColor, opacity: 0.4 }} />
          </div>
          {suggestions.map((pred, i) => {
            const active = i === activeIdx;
            return (
              <button
                key={pred.id}
                onClick={() => handleSelect(pred)}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  alignItems: 'flex-start',
                  gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  borderTop: i === 0 ? `1px dashed ${ruleColor}` : 'none',
                  borderBottom: `1px dashed ${dark ? 'rgba(212,175,55,0.2)' : 'rgba(184,147,90,0.2)'}`,
                  background: active ? hoverBg : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'background 140ms ease',
                }}
              >
                <span style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  paddingTop: 3,
                  minWidth: 20,
                }}>
                  <span style={{
                    fontFamily: FONT_MONO,
                    fontSize: 7.5,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    color: active ? ruleColor : kickerColor,
                    lineHeight: 1,
                  }}>
                    № {String(i + 1).padStart(2, '0')}
                  </span>
                  <svg
                    width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke={active ? ruleColor : kickerColor}
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{
                    fontFamily: FONT_DISPLAY,
                    fontStyle: 'italic',
                    fontSize: '0.95rem',
                    fontWeight: 400,
                    color: textColor,
                    letterSpacing: '-0.003em',
                    lineHeight: 1.2,
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {pred.displayName}
                  </div>
                  {pred.formattedAddress && (
                    <div style={{
                      fontFamily: FONT_MONO,
                      fontSize: 8.5,
                      fontWeight: 700,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: mutedColor,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {pred.formattedAddress}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
