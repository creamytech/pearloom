'use client';

// ──────────────────────────────────────────────────────────────
// Shared building blocks for AI decor panels.
//
// - DecorPromptComposer: collapsible textarea where the user
//   dictates exactly what they want drawn. Auto-context (occasion,
//   palette, venue, vibe) is always layered in by the prompt
//   builder; this is the user's voice ON TOP of that.
//
// - DecorAlternatesStrip: shows the rendered piece + a horizontal
//   row of past drafts. Click a draft thumb to revert. Generates
//   one more alternate via "Show another" without losing the
//   currently active one.
//
// Used by AiAccentSection + DecorLibraryPanel slot tiles. The
// sticker tray manages its own per-sticker UX since stickers are
// independent items, not variants of one slot.
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Field, TextInput } from '../atoms';
import type { DecorDraft, SectionStampsDraft } from '@/types';

interface ComposerProps {
  /** Current draft prompt the user has typed. */
  value: string;
  onChange: (next: string) => void;
  /** Auto-context preview shown as placeholder when value is empty
   *  ("a flourish for a Tuscan vineyard wedding…"). */
  autoSummary?: string;
  /** Top label, defaults to "Custom direction (optional)". */
  label?: string;
  /** Disable while a draft is generating. */
  disabled?: boolean;
}

export function DecorPromptComposer({
  value, onChange, autoSummary, label = 'Custom direction (optional)', disabled,
}: ComposerProps) {
  const [open, setOpen] = useState(value.length > 0);
  return (
    <div style={{ marginBottom: 10 }}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--peach-ink)',
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 0',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          + Add custom direction
        </button>
      ) : (
        <Field label={label}>
          <TextInput
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={autoSummary || 'e.g. a single olive sprig, hand-drawn, in the palette accent'}
            disabled={disabled}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-muted)',
                fontSize: 11,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Use auto-context instead
            </button>
            {value.trim() && (
              <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                Pear will draw this on top of your palette + style.
              </span>
            )}
          </div>
        </Field>
      )}
    </div>
  );
}

interface AlternatesStripProps {
  /** Drafts in storage, most recent first. */
  drafts: DecorDraft[];
  /** Currently active URL on the canvas. */
  activeUrl?: string;
  /** Called when user clicks a thumb to revert. */
  onSelect: (draft: DecorDraft) => void;
  /** Called on × on a thumb. */
  onDelete?: (draft: DecorDraft) => void;
  /** Called on "Show another" — generates one more draft. */
  onAlternate?: () => void;
  /** Disable while generating. */
  busy?: boolean;
  /** Aspect ratio of the thumbnails — match the slot. */
  aspect?: '1/1' | '3/2' | '5/2' | '2/3';
}

export function DecorAlternatesStrip({
  drafts, activeUrl, onSelect, onDelete, onAlternate, busy, aspect = '1/1',
}: AlternatesStripProps) {
  if (!drafts.length && !onAlternate) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          fontSize: 10.5, fontWeight: 700, color: 'var(--ink-muted)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span>Alternates ({drafts.length})</span>
        {onAlternate && (
          <button
            type="button"
            disabled={busy}
            onClick={onAlternate}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--peach-ink)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em', cursor: busy ? 'wait' : 'pointer', padding: 0,
            }}
          >
            {busy ? 'Drafting…' : '+ Show another'}
          </button>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {drafts.map((d) => {
          const isActive = d.url === activeUrl;
          return (
            <div
              key={d.id}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: aspect === '5/2' ? 96 : aspect === '3/2' ? 72 : aspect === '2/3' ? 48 : 64,
                aspectRatio: aspect,
                borderRadius: 8,
                border: isActive ? '2px solid var(--peach-ink)' : '1px solid var(--line-soft)',
                background: `url(${d.url}) center/contain no-repeat var(--cream-2)`,
                cursor: 'pointer',
              }}
              onClick={() => onSelect(d)}
              title={d.customPrompt || 'Auto-drafted'}
            >
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(d); }}
                  aria-label="Remove draft"
                  style={{
                    position: 'absolute', top: 2, right: 2,
                    width: 16, height: 16, borderRadius: '50%',
                    border: 'none', background: 'rgba(14,13,11,0.72)',
                    color: '#fff', fontSize: 9, lineHeight: 1, cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Add a new draft to a slot's history, capped to 5 most-recent. */
export function pushDraft(
  prior: DecorDraft[] | undefined,
  next: DecorDraft,
  cap = 5,
): DecorDraft[] {
  const prev = prior ?? [];
  // Dedupe by URL — re-clicking "Show another" with same result
  // shouldn't double-count.
  const filtered = prev.filter((d) => d.url !== next.url);
  return [next, ...filtered].slice(0, cap);
}

export function pushSectionStampsDraft(
  prior: SectionStampsDraft[] | undefined,
  next: SectionStampsDraft,
  cap = 5,
): SectionStampsDraft[] {
  const prev = prior ?? [];
  return [next, ...prev].slice(0, cap);
}

/** Build a one-line context summary for the composer placeholder. */
export function buildAutoSummary(opts: {
  occasion?: string;
  venue?: string;
  vibe?: string;
}): string {
  const parts: string[] = [];
  if (opts.vibe) parts.push(opts.vibe.split(/\s+/).slice(0, 3).join(' '));
  if (opts.occasion) parts.push(opts.occasion.replace(/-/g, ' '));
  if (opts.venue) parts.push(`at ${opts.venue}`);
  if (parts.length === 0) return '';
  return `(auto: ${parts.join(' · ')})`;
}
