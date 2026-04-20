'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/registry/RegistryManager.tsx
// Full management UI for a couple's registry sources.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { CustomSelect } from '@/components/ui/custom-select';
import type { RegistrySource } from '@/types';
import { RegistryCard } from './RegistryCard';

export interface RegistryManagerProps {
  siteId: string;
}

const CATEGORIES = [
  'Home & Kitchen',
  'Dining & Entertaining',
  'Bedroom & Bath',
  'Experiences',
  'Cash Fund',
  'Other',
];

function extractStoreName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const known: Record<string, string> = {
      'amazon.com': 'Amazon',
      'zola.com': 'Zola',
      'target.com': 'Target',
      'myregistry.com': 'MyRegistry',
      'crateandbarrel.com': 'Crate & Barrel',
      'williams-sonoma.com': 'Williams Sonoma',
      'bedbathandbeyond.com': 'Bed Bath & Beyond',
      'overstock.com': 'Overstock',
      'venmo.com': 'Venmo',
      'paypal.com': 'PayPal',
      'honeyfund.com': 'Honeyfund',
      'blueprintregistry.com': 'Blueprint Registry',
    };
    if (known[hostname]) return known[hostname];
    // Capitalize first segment of domain
    const parts = hostname.split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return '';
  }
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Form state ────────────────────────────────────────────────

interface FormState {
  storeName: string;
  registryUrl: string;
  category: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  storeName: '',
  registryUrl: '',
  category: 'Home & Kitchen',
  notes: '',
};

// ── Edit modal (inline) ───────────────────────────────────────

interface EditPanelProps {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
}

function EditPanel({ initial, onSave, onCancel }: EditPanelProps) {
  const [form, setForm] = useState<FormState>(initial);

  return (
    <div
      style={{
        background: '#FEFCF8',
        border: '1px solid #EDE8E0',
        borderRadius: '1rem',
        padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      }}
    >
      <h3
        style={{
          margin: '0 0 1rem',
          fontSize: '1rem',
          fontFamily: 'Playfair Display, Georgia, serif',
          color: '#1C1C1C',
        }}
      >
        Edit Registry
      </h3>
      <FormFields form={form} setForm={setForm} />
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <button
          onClick={() => onSave(form)}
          disabled={!form.storeName || !isValidUrl(form.registryUrl)}
          style={primaryBtnStyle(!form.storeName || !isValidUrl(form.registryUrl))}
        >
          Save Changes
        </button>
        <button onClick={onCancel} style={ghostBtnStyle}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Shared form fields ────────────────────────────────────────

interface FormFieldsProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}

function FormFields({ form, setForm }: FormFieldsProps) {
  const handleUrlChange = (url: string) => {
    setForm((f) => {
      const autoName = url && !f.storeName ? extractStoreName(url) : f.storeName;
      return { ...f, registryUrl: url, storeName: autoName };
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div style={fieldGroup}>
        <label style={labelStyle}>Registry URL *</label>
        <input
          type="url"
          placeholder="https://www.zola.com/registry/yourname"
          value={form.registryUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          style={inputStyle(form.registryUrl !== '' && !isValidUrl(form.registryUrl))}
        />
        {form.registryUrl !== '' && !isValidUrl(form.registryUrl) && (
          <span style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '0.2rem' }}>
            Please enter a valid URL (starting with https://)
          </span>
        )}
      </div>

      <div style={fieldGroup}>
        <label style={labelStyle}>Store Name *</label>
        <input
          type="text"
          placeholder="Zola, Amazon, Target…"
          value={form.storeName}
          onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
          style={inputStyle(false)}
        />
      </div>

      <div style={fieldGroup}>
        <label style={labelStyle}>Category</label>
        <select
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          style={{ ...inputStyle(false), cursor: 'pointer' }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldGroup}>
        <label style={labelStyle}>Notes (optional)</label>
        <input
          type="text"
          placeholder="e.g. We are registered for the 4-person set"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          style={inputStyle(false)}
        />
      </div>
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────

const fieldGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#6B6660',
  fontFamily: 'Inter, sans-serif',
  letterSpacing: '0.02em',
};

function inputStyle(isError: boolean): React.CSSProperties {
  return {
    padding: '0.625rem 0.875rem',
    borderRadius: '0.5rem',
    border: `1px solid ${isError ? '#DC2626' : '#DDD8D0'}`,
    fontSize: '0.9rem',
    fontFamily: 'Inter, sans-serif',
    color: '#1C1C1C',
    background: '#fff',
    outline: 'none',
    transition: 'border-color var(--pl-dur-instant)',
    width: '100%',
    boxSizing: 'border-box',
  };
}

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.625rem 1.25rem',
    borderRadius: '0.625rem',
    border: 'none',
    background: disabled ? '#C8C3BB' : '#6B7C3A',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.875rem',
    fontFamily: 'Inter, sans-serif',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background var(--pl-dur-instant)',
  };
}

const ghostBtnStyle: React.CSSProperties = {
  padding: '0.625rem 1.25rem',
  borderRadius: '0.625rem',
  border: '1px solid #DDD8D0',
  background: 'transparent',
  color: '#6B6660',
  fontWeight: 500,
  fontSize: '0.875rem',
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
};

// ── Empty State ───────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '3rem 2rem',
        background: '#FEFCF8',
        border: '2px dashed #EDE8E0',
        borderRadius: '1rem',
        color: '#9A9488',
      }}
    >
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        style={{ margin: '0 auto 1rem', display: 'block' }}
        aria-hidden="true"
      >
        <circle cx="28" cy="28" r="28" fill="#F5F1E8" />
        <path
          d="M18 23h20l-2.5 16h-15L18 23z"
          stroke="#5C6B3F"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M23 23v-3a5 5 0 0 1 10 0v3"
          stroke="#5C6B3F"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="24" cy="30" r="1.5" fill="#5C6B3F" />
        <circle cx="32" cy="30" r="1.5" fill="#5C6B3F" />
      </svg>
      <p
        style={{
          margin: '0 0 0.4rem',
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '1.125rem',
          color: 'var(--pl-ink-soft)',
          fontStyle: 'italic',
        }}
      >
        No registries yet
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          maxWidth: '320px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Add your registries so guests can find everything in one place.
      </p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export function RegistryManager({ siteId }: RegistryManagerProps) {
  const [sources, setSources] = useState<RegistrySource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/registry?siteId=${encodeURIComponent(siteId)}`);
      const json = await res.json();
      setSources(json.sources || []);
    } catch (e) {
      console.error('Failed to load registries', e);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // ── Add ────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!form.storeName || !isValidUrl(form.registryUrl)) return;
    setSubmitting(true);
    setError(null);

    // Optimistic update
    const optimistic: RegistrySource = {
      id: `opt-${Date.now()}`,
      userId: '',
      siteId,
      storeName: form.storeName,
      registryUrl: form.registryUrl,
      category: form.category,
      notes: form.notes,
      sortOrder: sources.length,
      createdAt: new Date().toISOString(),
    };
    setSources((prev) => [...prev, optimistic]);
    setShowForm(false);
    setForm(EMPTY_FORM);

    try {
      const res = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, ...form }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add registry');
      }
      // Replace optimistic entry with real one
      setSources((prev) =>
        prev.map((s) => (s.id === optimistic.id ? (json.source as RegistrySource) : s))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add registry');
      // Rollback
      setSources((prev) => prev.filter((s) => s.id !== optimistic.id));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this registry?')) return;

    // Optimistic
    const previous = sources;
    setSources((prev) => prev.filter((s) => s.id !== id));

    try {
      const res = await fetch(`/api/registry?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
    } catch {
      setSources(previous);
    }
  };

  // ── Edit ───────────────────────────────────────────────────

  const handleEditSave = async (id: string, f: FormState) => {
    const previous = sources;
    setSources((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, storeName: f.storeName, registryUrl: f.registryUrl, category: f.category, notes: f.notes }
          : s
      )
    );
    setEditingId(null);

    try {
      const res = await fetch('/api/registry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...f }),
      });
      if (!res.ok) throw new Error('Update failed');
    } catch {
      setSources(previous);
    }
  };

  // ── Reorder ────────────────────────────────────────────────

  const move = (idx: number, direction: -1 | 1) => {
    const next = [...sources];
    const swap = idx + direction;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSources(next);
    // Persist
    Promise.all(
      next.map((s, i) =>
        fetch('/api/registry', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: s.id, sortOrder: i }),
        })
      )
    ).catch(console.error);
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* AI tip banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f0ede5, #faf8f3)',
          border: '1px solid #E8E3D8',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>✦</span>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B6660', lineHeight: 1.5 }}>
          Add all your registries here — Pearloom will display them beautifully on your wedding
          site so guests can find everything in one place.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            color: '#DC2626',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Registry grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9A9488', fontSize: '0.875rem' }}>
          Loading registries…
        </div>
      ) : sources.length === 0 && !showForm ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          {sources.map((source, idx) =>
            editingId === source.id ? (
              <EditPanel
                key={source.id}
                initial={{
                  storeName: source.storeName,
                  registryUrl: source.registryUrl,
                  category: source.category || 'Other',
                  notes: source.notes || '',
                }}
                onSave={(f) => handleEditSave(source.id, f)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div key={source.id} style={{ position: 'relative' }}>
                <RegistryCard
                  source={source}
                  editable
                  onEdit={() => setEditingId(source.id)}
                  onDelete={() => handleDelete(source.id)}
                />
                {/* Up/Down reorder buttons */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    right: '0.75rem',
                    display: 'flex',
                    gap: '0.25rem',
                  }}
                >
                  {idx > 0 && (
                    <button
                      onClick={() => move(idx, -1)}
                      title="Move up"
                      style={reorderBtnStyle}
                      aria-label="Move registry up"
                    >
                      ↑
                    </button>
                  )}
                  {idx < sources.length - 1 && (
                    <button
                      onClick={() => move(idx, 1)}
                      title="Move down"
                      style={reorderBtnStyle}
                      aria-label="Move registry down"
                    >
                      ↓
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Add Registry form */}
      {showForm ? (
        <div
          style={{
            background: '#FEFCF8',
            border: '1px solid #EDE8E0',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginTop: '1rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <h3
            style={{
              margin: '0 0 1.25rem',
              fontSize: '1.05rem',
              fontFamily: 'Playfair Display, Georgia, serif',
              color: '#1C1C1C',
            }}
          >
            Add a Registry
          </h3>
          <FormFields form={form} setForm={setForm} />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleAdd}
              disabled={submitting || !form.storeName || !isValidUrl(form.registryUrl)}
              style={primaryBtnStyle(submitting || !form.storeName || !isValidUrl(form.registryUrl))}
            >
              {submitting ? 'Adding…' : 'Add Registry'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
              }}
              style={ghostBtnStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            border: '2px dashed #5C6B3F',
            background: 'transparent',
            color: '#6B7C3A',
            fontSize: '0.9rem',
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            marginTop: sources.length > 0 ? '0.5rem' : 0,
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#F0F4EA';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>+</span> Add Registry
        </button>
      )}
    </div>
  );
}

const reorderBtnStyle: React.CSSProperties = {
  background: 'var(--pl-ink)',
  border: '1px solid #DDD8D0',
  borderRadius: '0.375rem',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '0.7rem',
  color: '#6B6660',
  fontFamily: 'Inter, sans-serif',
  padding: 0,
};
