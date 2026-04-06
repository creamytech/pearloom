'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/RelationshipGraphInput.tsx
// Guest form: add yourself to the relationship social graph.
// Can be embedded inline in the graph or used as standalone.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { CustomSelect } from '@/components/ui/custom-select';

export interface RelationshipGraphInputProps {
  siteId: string;
  coupleNames: [string, string];
  onAdded?: () => void;
}

type Side = 'partner1' | 'partner2' | 'both';
type RelType = 'family' | 'college' | 'work' | 'childhood' | 'neighbors' | 'other';

const REL_OPTIONS: { value: RelType; label: string }[] = [
  { value: 'family', label: 'Family' },
  { value: 'college', label: 'College Friend' },
  { value: 'work', label: 'Work Colleague' },
  { value: 'childhood', label: 'Childhood Friend' },
  { value: 'neighbors', label: 'Neighbor' },
  { value: 'other', label: 'Other' },
];

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.8rem',
  borderRadius: '0.4rem',
  border: '1px solid #D6C6A8',
  background: '#FDFBF6',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  color: 'var(--pl-ink)',
  outline: 'none',
  boxSizing: 'border-box',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#5A5248',
  marginBottom: '0.3rem',
  letterSpacing: '0.03em',
};

export function RelationshipGraphInput({ siteId, coupleNames, onAdded }: RelationshipGraphInputProps) {
  const [name, setName] = useState('');
  const [side, setSide] = useState<Side | ''>('');
  const [relType, setRelType] = useState<RelType>('family');
  const [relLabel, setRelLabel] = useState('');
  const [memory, setMemory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name1, name2] = coupleNames;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!side) { setError('Please choose who you know.'); return; }
    if (!relLabel.trim()) { setError('Please describe your connection.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/relationship-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          guestName: name.trim(),
          side,
          relationshipType: relType,
          relationshipLabel: relLabel.trim(),
          memorySnippet: memory.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || 'Something went wrong');
      }

      setSuccess(true);
      onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div
        style={{
          background: '#F9F6EF',
          border: '1px solid #A3B18A',
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
        <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--pl-ink)', margin: 0 }}>
          You&apos;re on the map!
        </p>
        <p style={{ fontSize: '0.85rem', color: '#9A9488', marginTop: '0.4rem' }}>
          Thank you for being part of their story, {name}.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#FDFBF6',
        border: '1px solid #D6C6A8',
        borderRadius: '0.75rem',
        padding: '1.75rem 1.5rem',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <h3
        style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: '1.25rem',
          color: 'var(--pl-ink)',
          margin: '0 0 1.4rem',
          paddingRight: '1.5rem', // space for the close button if inline
        }}
      >
        Add Yourself to Their Story
      </h3>

      {/* Name */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={LABEL_STYLE}>Your Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Emma Clarke"
          maxLength={80}
          style={INPUT_STYLE}
          autoComplete="name"
        />
      </div>

      {/* Side */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={LABEL_STYLE}>I know&hellip;</label>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {([['partner1', name1], ['partner2', name2], ['both', 'Both of them']] as [Side, string][]).map(
            ([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setSide(val)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '2rem',
                  border: `1.5px solid ${side === val ? '#A3B18A' : '#D6C6A8'}`,
                  background: side === val ? '#A3B18A' : 'transparent',
                  color: side === val ? '#fff' : '#5A5248',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontWeight: side === val ? 600 : 400,
                }}
              >
                {lbl}
              </button>
            )
          )}
        </div>
      </div>

      {/* Relationship type */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={LABEL_STYLE}>I&apos;m their&hellip;</label>
        <select
          value={relType}
          onChange={e => setRelType(e.target.value as RelType)}
          style={{ ...INPUT_STYLE, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%239A9488\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', paddingRight: '2rem' }}
        >
          {REL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Connection label */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={LABEL_STYLE}>Describe your connection</label>
        <input
          type="text"
          value={relLabel}
          onChange={e => setRelLabel(e.target.value)}
          placeholder={`e.g. "${name1}'s older sister" or "We met at work in 2019"`}
          maxLength={120}
          style={INPUT_STYLE}
        />
      </div>

      {/* Memory */}
      <div style={{ marginBottom: '1.4rem' }}>
        <label style={LABEL_STYLE}>
          A short memory{' '}
          <span style={{ fontWeight: 400, color: '#9A9488' }}>(optional)</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={memory}
            onChange={e => setMemory(e.target.value.slice(0, 120))}
            placeholder="e.g. &ldquo;We stayed up talking until sunrise.&rdquo;"
            maxLength={120}
            style={INPUT_STYLE}
          />
          <span
            style={{
              position: 'absolute',
              right: '0.6rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.72rem',
              color: memory.length > 100 ? '#C4A882' : '#B5A99A',
              pointerEvents: 'none',
            }}
          >
            {memory.length}/120
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: '0.82rem', color: '#C47A5A', margin: '0 0 0.8rem', padding: '0.5rem 0.8rem', background: '#FBF3EE', borderRadius: '0.35rem', border: '1px solid #E8C4A8' }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        style={{
          width: '100%',
          padding: '0.7rem',
          background: submitting ? '#B5CCA3' : '#A3B18A',
          color: '#fff',
          border: 'none',
          borderRadius: '0.4rem',
          fontFamily: 'inherit',
          fontSize: '0.95rem',
          fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
          letterSpacing: '0.02em',
          transition: 'background 0.15s ease',
        }}
      >
        {submitting ? 'Adding you…' : '+ Add me to the map'}
      </button>
    </form>
  );
}
