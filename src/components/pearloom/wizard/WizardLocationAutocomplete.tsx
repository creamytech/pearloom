'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/wizard/WizardLocationAutocomplete.tsx
//
// v8-native venue typeahead for the wizard Basics step. Same
// /api/venue/search backend as the editorial LocationAutocomplete,
// but styled to match the rest of the v8 wizard (paper input,
// cream-2 dropdown, sage-tint hover, ink-soft detail text — no
// Fraunces italic, no mono kickers, no gold rules).
//
// The editorial variant stays as-is for the invite / guest pages
// that want that voice.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (place: { name: string; address: string; lat?: number; lng?: number }) => void;
  placeholder?: string;
}

interface Prediction {
  id: string;
  displayName: string;
  formattedAddress: string;
  location?: { lat: number; lng: number };
}

export function WizardLocationAutocomplete({ value, onChange, onSelect, placeholder = 'Search venues or cities…' }: Props) {
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/venue/search?type=autocomplete&q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setSuggestions([]);
        return;
      }
      const data = await res.json();
      setSuggestions(data.predictions || []);
      setShowDropdown(true);
      setActiveIdx(-1);
    } catch {
      /* ignore — network blip */
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (text: string) => {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 260);
  };

  const handleSelect = (pred: Prediction) => {
    const display = pred.formattedAddress
      ? `${pred.displayName} · ${pred.formattedAddress}`
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
      setActiveIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

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
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--sage-deep, #5C6B3F)',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          className="input"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{ paddingLeft: 38 }}
        />
        {loading && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '1.5px solid var(--line)',
              borderTopColor: 'var(--sage-deep, #5C6B3F)',
              animation: 'wizard-loc-spin 720ms linear infinite',
            }}
          />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 40,
            background: 'var(--cream-2, #FBF7EE)',
            border: '1px solid var(--line, rgba(61,74,31,0.14))',
            borderRadius: 'var(--r, 12px)',
            boxShadow: '0 18px 42px rgba(14,13,11,0.14)',
            overflow: 'hidden',
            animation: 'wizard-loc-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        >
          <div
            style={{
              padding: '8px 14px 2px',
              fontSize: 10.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: 'var(--ink-muted, #6F6557)',
            }}
          >
            {suggestions.length} {suggestions.length === 1 ? 'place' : 'places'}
          </div>
          {suggestions.map((pred, i) => {
            const active = i === activeIdx;
            return (
              <button
                key={pred.id}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(pred)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '20px 1fr',
                  alignItems: 'center',
                  columnGap: 10,
                  padding: '10px 14px',
                  border: 'none',
                  background: active ? 'var(--sage-tint, #EDEFE1)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'background 120ms ease',
                  borderTop: i === 0 ? '1px solid var(--line-soft, rgba(61,74,31,0.08))' : '1px solid transparent',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: active ? 'var(--sage-deep, #5C6B3F)' : 'var(--ink-muted, #6F6557)' }}
                  aria-hidden
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--ink, #18181B)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {pred.displayName}
                  </div>
                  {pred.formattedAddress && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--ink-soft, #4A5642)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {pred.formattedAddress}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes wizard-loc-spin {
          from { transform: translateY(-50%) rotate(0deg); }
          to   { transform: translateY(-50%) rotate(360deg); }
        }
        @keyframes wizard-loc-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
