'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/venue/VenueSearch.tsx
// Google Places autocomplete search with Pearloom ivory theme
//
// TODO: integrate venue search shortcut into wizard details step
//       (vibe-input.tsx is owned by a separate agent — add a
//        <VenueSearch onSelect={...} /> inside the "Details" panel)
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Loader2, PlusCircle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────

export interface PlaceResult {
  id: string;
  displayName: string;
  formattedAddress: string;
  location?: { lat: number; lng: number };
  websiteUri?: string;
  internationalPhoneNumber?: string;
  types?: string[];
}

// Minimal Venue shape — mirrors what VenueProfile and the page expect
export interface VenuePartial {
  placeId?: string;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  websiteUri?: string;
  phone?: string;
  types?: string[];
}

export interface VenueSearchProps {
  onSelect: (venue: VenuePartial) => void;
  onAddManually?: () => void;
  placeholder?: string;
  darkMode?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function placeToVenue(place: PlaceResult): VenuePartial {
  return {
    placeId: place.id,
    name: place.displayName,
    address: place.formattedAddress,
    lat: place.location?.lat,
    lng: place.location?.lng,
    websiteUri: place.websiteUri,
    phone: place.internationalPhoneNumber,
    types: place.types,
  };
}

// ── Component ──────────────────────────────────────────────────

export function VenueSearch({
  onSelect,
  onAddManually,
  placeholder = 'Search for your venue…',
  darkMode = false,
}: VenueSearchProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setPredictions([]);
      setIsOpen(debouncedQuery.length > 0);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    fetch(`/api/venue/search?q=${encodeURIComponent(debouncedQuery)}&type=autocomplete`)
      .then(r => r.json())
      .then((data: { predictions?: PlaceResult[] }) => {
        if (!cancelled) {
          setPredictions(data.predictions ?? []);
          setIsOpen(true);
          setActiveIndex(-1);
        }
      })
      .catch(err => {
        console.error('[VenueSearch] autocomplete error:', err);
        if (!cancelled) setPredictions([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const selectPrediction = useCallback(async (prediction: PlaceResult) => {
    setIsOpen(false);
    setQuery(prediction.displayName);
    setIsFetchingDetails(true);

    try {
      const res = await fetch(
        `/api/venue/search?placeId=${encodeURIComponent(prediction.id)}&type=details`
      );
      const data = await res.json() as { place?: PlaceResult };
      const place = data.place ?? prediction;
      onSelect(placeToVenue(place));
    } catch (err) {
      console.error('[VenueSearch] details error:', err);
      onSelect(placeToVenue(prediction));
    } finally {
      setIsFetchingDetails(false);
    }
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    const itemCount = predictions.length + 1; // +1 for "add manually"

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, itemCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < predictions.length) {
        selectPrediction(predictions[activeIndex]);
      } else if (activeIndex === predictions.length && onAddManually) {
        onAddManually();
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const isLoading = isSearching || isFetchingDetails;
  const showEmptyState = isOpen && query.length >= 2 && !isSearching && predictions.length === 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Search Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: darkMode ? 'rgba(0,0,0,0.04)' : '#F5F1E8',
          border: darkMode ? '1.5px solid rgba(0,0,0,0.07)' : '1.5px solid #D4C9B0',
          borderRadius: darkMode ? '0.5rem' : '1rem',
          padding: darkMode ? '0.65rem 0.8rem' : '0.875rem 1.25rem',
          boxShadow: isOpen
            ? darkMode ? '0 0 0 2px rgba(163,177,138,0.3)' : '0 0 0 3px rgba(139, 119, 75, 0.15), 0 4px 20px rgba(0,0,0,0.08)'
            : darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          borderColor: isOpen
            ? darkMode ? 'rgba(163,177,138,0.6)' : '#8B774B'
            : darkMode ? 'rgba(0,0,0,0.07)' : '#D4C9B0',
        }}
      >
        {isLoading ? (
          <Loader2
            size={darkMode ? 16 : 20}
            style={{ color: darkMode ? 'rgba(163,177,138,0.7)' : '#8B774B', flexShrink: 0, animation: 'spin 1s linear infinite' }}
          />
        ) : (
          <Search size={darkMode ? 16 : 20} style={{ color: darkMode ? 'var(--pl-muted)' : '#8B774B', flexShrink: 0 }} />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            if (!e.target.value) {
              setPredictions([]);
              setIsOpen(false);
            }
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Venue search"
          aria-autocomplete="list"
          aria-controls="venue-search-list"
          aria-activedescendant={
            activeIndex >= 0 ? `venue-option-${activeIndex}` : undefined
          }
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: darkMode ? 'max(16px, 0.88rem)' : '1rem',
            fontFamily: 'inherit',
            color: darkMode ? 'var(--pl-ink)' : '#2C2416',
          } as React.CSSProperties}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: 0,
            right: 0,
            background: darkMode ? '#2a2520' : '#FEFCF8',
            border: darkMode ? '1px solid rgba(0,0,0,0.07)' : '1px solid #D4C9B0',
            borderRadius: darkMode ? '0.5rem' : '0.875rem',
            boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
            zIndex: 50,
            overflow: 'auto',
            maxHeight: '260px',
          }}
        >
          {/* Empty / no-results state */}
          {showEmptyState && (
            <div
              style={{
                padding: '1.25rem 1.5rem',
                color: darkMode ? 'var(--pl-ink-soft)' : '#9A8F7B',
                fontSize: '0.9rem',
                textAlign: 'center',
              }}
            >
              No venues found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Predictions list */}
          {predictions.length > 0 && (
            <ul
              id="venue-search-list"
              ref={listRef}
              role="listbox"
              aria-label="Venue suggestions"
              style={{ listStyle: 'none', margin: 0, padding: '0.5rem 0' }}
            >
              {predictions.map((p, i) => (
                <li
                  key={p.id}
                  id={`venue-option-${i}`}
                  role="option"
                  aria-selected={activeIndex === i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => selectPrediction(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem 1.25rem',
                    cursor: 'pointer',
                    background: activeIndex === i ? (darkMode ? 'rgba(163,177,138,0.15)' : '#F0EAD8') : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <MapPin
                    size={16}
                    style={{ color: darkMode ? 'rgba(163,177,138,0.7)' : '#8B774B', flexShrink: 0, marginTop: '2px' }}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                        color: darkMode ? 'var(--pl-ink)' : '#2C2416',
                        lineHeight: 1.3,
                      }}
                    >
                      {p.displayName}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: darkMode ? 'var(--pl-ink-soft)' : '#9A8F7B',
                        marginTop: '2px',
                        lineHeight: 1.4,
                      }}
                    >
                      {p.formattedAddress}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Add manually link */}
          {onAddManually && (
            <div
              style={{
                borderTop:
                  predictions.length > 0 || showEmptyState ? `1px solid ${darkMode ? 'rgba(0,0,0,0.06)' : '#EAE3D0'}` : 'none',
                padding: '0.625rem 1.25rem',
              }}
            >
              <button
                id={`venue-option-${predictions.length}`}
                role="option"
                aria-selected={activeIndex === predictions.length}
                onMouseEnter={() => setActiveIndex(predictions.length)}
                onClick={() => {
                  onAddManually();
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: darkMode ? 'rgba(163,177,138,0.8)' : '#8B774B',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  padding: '0.25rem 0',
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: activeIndex === predictions.length ? '0.375rem' : 0,
                  outline: activeIndex === predictions.length ? `2px solid ${darkMode ? 'rgba(163,177,138,0.6)' : '#8B774B'}` : 'none',
                  outlineOffset: '2px',
                }}
              >
                <PlusCircle size={15} />
                Add venue manually
              </button>
            </div>
          )}

          {/* Default empty hint when query is short */}
          {!query && (
            <div
              style={{
                padding: '1rem 1.5rem',
                color: '#9A8F7B',
                fontSize: '0.875rem',
                textAlign: 'center',
              }}
            >
              Search for your venue or add manually
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
