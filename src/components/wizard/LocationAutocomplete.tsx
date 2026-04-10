'use client';

// ─────────────────────────────────────────────────────────────
// LocationAutocomplete — Search-as-you-type location input
// Uses /api/venue/search (Google Places → Nominatim fallback)
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

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search for a location...',
  dark = false,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Colors
  const textColor = dark ? '#FAF7F2' : 'var(--pl-ink-soft, #3D3530)';
  const mutedColor = dark ? 'rgba(250,247,242,0.5)' : 'var(--pl-muted, #8C7E72)';
  const inputBg = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)';
  const inputBorder = dark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(163,177,138,0.3)';
  const dropBg = dark ? 'rgba(30,27,36,0.95)' : 'rgba(255,255,255,0.95)';
  const hoverBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(163,177,138,0.08)';

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
        {/* Pin icon */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={mutedColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%', height: 40, padding: '0 14px 0 34px',
            fontSize: '0.82rem', borderRadius: 10,
            border: inputBorder, background: inputBg,
            backdropFilter: 'blur(8px)',
            outline: 'none', color: textColor, fontFamily: 'inherit',
            boxSizing: 'border-box' as const,
          } as React.CSSProperties}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: 4, borderRadius: 12, overflow: 'hidden',
          background: dropBg,
          backdropFilter: 'blur(20px)',
          border: inputBorder,
          boxShadow: '0 8px 32px rgba(43,30,20,0.12)',
        } as React.CSSProperties}>
          {suggestions.map((pred, i) => (
            <button
              key={pred.id}
              onClick={() => handleSelect(pred)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                width: '100%', padding: '10px 14px', border: 'none',
                background: i === activeIdx ? hoverBg : 'transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
              }}
            >
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke={i === activeIdx ? 'var(--pl-olive, #A3B18A)' : mutedColor}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ marginTop: 2, flexShrink: 0 }}
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {pred.displayName}
                </div>
                {pred.formattedAddress && (
                  <div style={{ fontSize: '0.72rem', color: mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pred.formattedAddress}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
