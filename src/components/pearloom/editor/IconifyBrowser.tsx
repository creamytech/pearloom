'use client';

// ─────────────────────────────────────────────────────────────
// IconifyBrowser — embedded "Browse more" panel inside IconSwapModal.
// Wraps the /api/library/iconify/search endpoint so hosts can
// reach beyond the curated Pearloom set without leaving the
// swap modal.
//
// On pick we fetch the SVG via /api/library/iconify/svg and pass
// its data-URI back up to the parent — same pathway uploads use,
// so the picked icon goes straight into iconOverrides as a URL
// (no special handling for "iconify refs" anywhere in the rest
// of the editor).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Called with a data URI when the host picks an icon. */
  onPick: (dataUrl: string, label: string) => void;
}

interface SearchResp {
  icons?: string[];
  total?: number;
  source?: string;
  error?: string;
}

export function IconifyBrowser({ onPick }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Debounced search — every keystroke would otherwise hammer the
  // route. 220ms is short enough that the host barely notices but
  // long enough that we collapse a typing burst into one fetch.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/library/iconify/search?q=${encodeURIComponent(query)}&limit=36`);
        if (!res.ok) {
          setError('Search hiccup — try again.');
          setResults([]);
          return;
        }
        const data = (await res.json()) as SearchResp;
        setResults(data.icons ?? []);
      } catch {
        setError('Search hiccup — try again.');
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function pickIcon(ref: string) {
    try {
      const res = await fetch(`/api/library/iconify/svg?ref=${encodeURIComponent(ref)}`);
      if (!res.ok) {
        setError("Couldn't fetch that one. Try another?");
        return;
      }
      const svgText = await res.text();
      // Encode as data URI. We keep the SVG inline rather than
      // proxying the icon URL because <img src=/api/library/...>
      // would break offline previews + add a network hop on every
      // render. Data URI works everywhere our motifs already do.
      const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
      onPick(encoded, ref);
    } catch {
      setError("Couldn't fetch that one. Try another?");
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search 200k+ free icons (heart, leaf, plane, ribbon…)"
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 999,
          border: '1px solid var(--line)',
          background: 'var(--cream-2, #F5EFE2)',
          fontSize: 13,
          fontFamily: 'var(--font-ui)',
          color: 'var(--ink)',
          outline: 'none',
        }}
      />
      {error && (
        <div style={{ fontSize: 12, color: '#7A2D2D', textAlign: 'center', padding: '6px 0' }}>
          {error}
        </div>
      )}
      {!query.trim() ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '12px 0 0' }}>
          <div
            style={{
              textAlign: 'center',
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 14,
            }}
          >
            Type a word — or pick a starter:
          </div>
          {/* Curated starter searches. Hand-picked terms that
              return on-brand results across our allowlisted icon
              sets. Hosts who don't know what they want still find
              something usable in two clicks. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {[
              'heart', 'leaf', 'flower', 'ring', 'ribbon',
              'champagne', 'cake', 'star', 'sun', 'moon',
              'compass', 'plane', 'mountain', 'feather', 'olive',
              'envelope', 'calendar', 'camera', 'music', 'wave',
            ].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 999,
                  background: 'var(--cream-2, #F5EFE2)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink-soft)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      ) : loading ? (
        <div
          style={{
            padding: 28,
            textAlign: 'center',
            color: 'var(--ink-muted)',
            fontSize: 12,
          }}
        >
          Threading…
        </div>
      ) : results.length === 0 ? (
        <div
          style={{
            padding: 28,
            textAlign: 'center',
            color: 'var(--ink-muted)',
            fontSize: 13,
          }}
        >
          Nothing for &ldquo;{query}&rdquo;. Try a single word.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
            gap: 6,
          }}
        >
          {results.map((ref) => (
            <button
              key={ref}
              type="button"
              onClick={() => pickIcon(ref)}
              title={ref}
              style={{
                aspectRatio: '1 / 1',
                background: 'var(--cream, #FBF7EE)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                cursor: 'pointer',
                padding: 8,
                display: 'grid',
                placeItems: 'center',
                transition: 'transform 140ms ease, border-color 140ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <img
                src={`/api/library/iconify/svg?ref=${encodeURIComponent(ref)}`}
                alt={ref}
                loading="lazy"
                decoding="async"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
