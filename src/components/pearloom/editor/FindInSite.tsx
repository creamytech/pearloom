'use client';

// ─────────────────────────────────────────────────────────────
// FindInSite — ⌘F / Ctrl+F overlay that searches every text
// field in the manifest and lists the matches as jumpable rows.
// Click a row → fires `pearloom:design-jump` to the section's
// block AND scrolls the canvas to the first match. The browser's
// native ⌘F still works for in-viewport text; this overlay
// surfaces matches across the whole site (most of which are
// off-screen).
//
// Searched fields:
//   • poetry.heroTagline / welcomeStatement / closingLine
//   • logistics.venue / dresscode / notes
//   • chapters[].title / description / subtitle
//   • events[].name / description / venue
//   • faqs[].question / answer
//   • travelInfo.hotels[].name / description
//   • registry.entries[].name / note
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';

interface Match {
  id: string;
  block: 'hero' | 'story' | 'details' | 'schedule' | 'travel' | 'registry' | 'faq';
  field: string;
  snippet: string;
}

interface Props {
  manifest: StoryManifest;
  open: boolean;
  onClose: () => void;
  onJump: (block: Match['block']) => void;
}

export function FindInSite({ manifest, open, onClose, onJump }: Props) {
  const [query, setQuery] = useState('');
  // Cursor for arrow-key navigation. Resets to 0 whenever the
  // overlay opens or the query changes, so the first match is
  // always pre-selected and Enter jumps without further nav.
  const [cursor, setCursor] = useState(0);

  const matches = useMemo(() => collectMatches(manifest, query), [manifest, query]);

  // Reset cursor + query when overlay opens or query changes,
  // via store-and-compare-prev (avoids two setState-in-effect
  // cascades).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery('');
      setCursor(0);
    }
  }
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setCursor(0);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        if (matches.length === 0) return;
        e.preventDefault();
        setCursor((c) => (c + 1) % matches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        if (matches.length === 0) return;
        e.preventDefault();
        setCursor((c) => (c - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === 'Enter') {
        if (matches.length === 0) return;
        e.preventDefault();
        const m = matches[cursor];
        if (m) {
          onJump(m.block);
          onClose();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, matches, cursor, onJump]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Find in site"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.32)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9990,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'pl-find-fade 180ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 92vw)',
          maxHeight: '70vh',
          background: 'var(--paper, #FBF7EE)',
          border: '1px solid var(--card-ring, rgba(61,74,31,0.16))',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(14,13,11,0.32)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'pl-find-rise 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid var(--line-soft)',
            background: 'var(--cream, #FBF7EE)',
          }}
        >
          <Icon name="search" size={16} color="var(--peach-ink, #C6703D)" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find anywhere on your site…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 16,
              color: 'var(--ink)',
              fontFamily: 'var(--font-ui)',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--ink-soft)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!query.trim() ? (
            <div
              style={{
                padding: 28,
                textAlign: 'center',
                color: 'var(--ink-soft)',
                fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
                fontStyle: 'italic',
                fontSize: 14,
              }}
            >
              Type a few characters and we'll list every place that mentions it.
            </div>
          ) : matches.length === 0 ? (
            <div
              style={{
                padding: 28,
                textAlign: 'center',
                color: 'var(--ink-soft)',
                fontSize: 13,
              }}
            >
              Nothing found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {matches.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  ref={(el) => {
                    // Scroll the keyboard-highlighted row into view as
                    // the cursor moves through the list. `nearest` keeps
                    // the cursor stable when the user is already viewing
                    // the row — no jumpy snap-to-center.
                    if (el && i === cursor) {
                      el.scrollIntoView({ block: 'nearest' });
                    }
                  }}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => {
                    onJump(m.block);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--line-soft)',
                    background: i === cursor ? 'var(--cream-2, #F5EFE2)' : 'transparent',
                    border: 'none',
                    borderLeft: i === cursor
                      ? '2px solid var(--peach-ink, #C6703D)'
                      : '2px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-ui)',
                    transition: 'background 140ms ease, border-color 140ms ease',
                  }}
                >
                  <div
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      color: 'var(--peach-ink, #C6703D)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {m.block} · {m.field}
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: 'var(--ink)',
                      lineHeight: 1.45,
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightSnippet(m.snippet, query) }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--line-soft)',
            background: 'var(--cream-2, #F5EFE2)',
            fontSize: 11.5,
            color: 'var(--ink-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <span>{matches.length} {matches.length === 1 ? 'match' : 'matches'}</span>
          <span>↑↓ navigate · ↵ jump · Esc close</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pl-find-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pl-find-rise {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function collectMatches(manifest: StoryManifest, query: string): Match[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: Match[] = [];
  let id = 0;
  const push = (block: Match['block'], field: string, value: unknown) => {
    if (typeof value !== 'string') return;
    const lower = value.toLowerCase();
    if (!lower.includes(q)) return;
    out.push({
      id: `m-${id++}`,
      block,
      field,
      snippet: snippetAround(value, q),
    });
  };

  push('hero', 'tagline', manifest.poetry?.heroTagline);
  push('hero', 'welcome', manifest.poetry?.welcomeStatement);
  push('hero', 'closing', manifest.poetry?.closingLine);
  push('details', 'venue', manifest.logistics?.venue);
  push('details', 'address', manifest.logistics?.venueAddress);
  push('details', 'dress code', manifest.logistics?.dresscode);
  push('details', 'notes', manifest.logistics?.notes);

  for (const c of manifest.chapters ?? []) {
    push('story', `chapter title`, c.title);
    push('story', `chapter body`, c.description);
    push('story', `chapter subtitle`, c.subtitle);
  }
  for (const e of manifest.events ?? []) {
    push('schedule', e.type ? `${e.type} name` : 'event name', e.name);
    push('schedule', e.type ? `${e.type} description` : 'event description', e.description);
    push('schedule', 'venue', e.venue);
  }
  for (const f of manifest.faqs ?? []) {
    push('faq', 'question', f.question);
    push('faq', 'answer', f.answer);
  }
  for (const h of manifest.travelInfo?.hotels ?? []) {
    push('travel', 'hotel name', h.name);
    push('travel', 'hotel description', (h as { description?: string; notes?: string }).description ?? (h as { notes?: string }).notes);
  }
  for (const r of manifest.registry?.entries ?? []) {
    push('registry', 'name', r.name);
    push('registry', 'note', r.note);
  }

  return out.slice(0, 30);
}

function snippetAround(value: string, query: string): string {
  const idx = value.toLowerCase().indexOf(query);
  if (idx < 0) return value.slice(0, 100);
  const start = Math.max(0, idx - 30);
  const end = Math.min(value.length, idx + query.length + 60);
  const prefix = start > 0 ? '… ' : '';
  const suffix = end < value.length ? ' …' : '';
  return prefix + value.slice(start, end) + suffix;
}

function highlightSnippet(snippet: string, query: string): string {
  const safe = snippet.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
  if (!query.trim()) return safe;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(escaped, 'ig');
  return safe.replace(rx, (m) => `<mark style="background:rgba(198,112,61,0.32);color:inherit;border-radius:3px;padding:0 2px;">${m}</mark>`);
}
