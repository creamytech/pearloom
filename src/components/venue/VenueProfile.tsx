'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/venue/VenueProfile.tsx
// Full venue profile form — shown after a venue is selected/created
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { MapPin, Globe, Phone, Plus, Trash2, Loader2, ExternalLink } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────

export interface VenueSpace {
  id: string;
  name: string;
  description?: string;
}

export interface VenueData {
  id?: string;
  placeId?: string;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  websiteUri?: string;
  phone?: string;
  types?: string[];
  // Event details
  hasceremony?: boolean;
  hasReception?: boolean;
  capacityMin?: number;
  capacityMax?: number;
  indoorOutdoor?: 'indoor' | 'outdoor' | 'both';
  // Spaces
  spaces?: VenueSpace[];
  // Notes
  notes?: string;
}

export interface VenueProfileProps {
  venue: VenueData;
  onChange: (venue: VenueData) => void;
  onSave: () => void;
  isSaving?: boolean;
}

// ── Sub-components ────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#FEFCF8',
        border: '1px solid #EAE3D0',
        borderRadius: '1rem',
        padding: '1.5rem',
        marginBottom: '1.25rem',
      }}
    >
      <h3
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '1.0625rem',
          fontWeight: 600,
          color: '#2C2416',
          margin: '0 0 1.125rem 0',
          paddingBottom: '0.625rem',
          borderBottom: '1px solid #EAE3D0',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value?: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: '0.875rem' }}>
      <span
        style={{
          display: 'block',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#6B5F4B',
          marginBottom: '0.375rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: '#F5F1E8',
          border: '1px solid #D4C9B0',
          borderRadius: '0.625rem',
          padding: '0.625rem 0.875rem',
          fontSize: '0.9375rem',
          color: '#2C2416',
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => {
          e.target.style.borderColor = '#8B774B';
          e.target.style.boxShadow = '0 0 0 3px rgba(139,119,75,0.12)';
        }}
        onBlur={e => {
          e.target.style.borderColor = '#D4C9B0';
          e.target.style.boxShadow = 'none';
        }}
      />
    </label>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.4375rem 1rem',
        borderRadius: '2rem',
        border: active ? '1.5px solid #8B774B' : '1.5px solid #D4C9B0',
        background: active ? '#8B774B' : 'transparent',
        color: active ? '#FEFCF8' : '#6B5F4B',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────

export function VenueProfile({
  venue,
  onChange,
  onSave,
  isSaving = false,
}: VenueProfileProps) {
  const [newSpaceName, setNewSpaceName] = useState('');

  const update = (patch: Partial<VenueData>) => onChange({ ...venue, ...patch });

  const mapsUrl =
    venue.lat && venue.lng
      ? `https://maps.google.com/?q=${venue.lat},${venue.lng}`
      : venue.address
      ? `https://maps.google.com/?q=${encodeURIComponent(venue.address)}`
      : null;

  const addSpace = () => {
    const name = newSpaceName.trim();
    if (!name) return;
    const space: VenueSpace = { id: `space-${Date.now()}`, name };
    update({ spaces: [...(venue.spaces ?? []), space] });
    setNewSpaceName('');
  };

  const removeSpace = (id: string) => {
    update({ spaces: (venue.spaces ?? []).filter(s => s.id !== id) });
  };

  const updateSpace = (id: string, name: string) => {
    update({
      spaces: (venue.spaces ?? []).map(s => (s.id === id ? { ...s, name } : s)),
    });
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ── 1. Venue Header ──────────────────────────────── */}
      <SectionCard title="Venue">
        <TextInput
          label="Venue name"
          value={venue.name}
          onChange={v => update({ name: v })}
          placeholder="e.g. The Grand Ballroom"
        />

        <TextInput
          label="Address"
          value={venue.address}
          onChange={v => update({ address: v })}
          placeholder="123 Main St, City, State"
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '0.25rem',
          }}
        >
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: '#8B774B',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <MapPin size={14} />
              View on Google Maps
              <ExternalLink size={12} />
            </a>
          )}
          {venue.websiteUri && (
            <a
              href={venue.websiteUri}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: '#8B774B',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <Globe size={14} />
              Venue website
              <ExternalLink size={12} />
            </a>
          )}
          {venue.phone && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: '#6B5F4B',
                fontSize: '0.875rem',
              }}
            >
              <Phone size={14} />
              {venue.phone}
            </span>
          )}
        </div>
      </SectionCard>

      {/* ── 2. Event Details ─────────────────────────────── */}
      <SectionCard title="Event Details">
        {/* Ceremony / Reception */}
        <div style={{ marginBottom: '1rem' }}>
          <span
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#6B5F4B',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Events at this venue
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <Pill
              label="Ceremony here"
              active={!!venue.hasceremony}
              onClick={() => update({ hasceremony: !venue.hasceremony })}
            />
            <Pill
              label="Reception here"
              active={!!venue.hasReception}
              onClick={() => update({ hasReception: !venue.hasReception })}
            />
            <Pill
              label="Both"
              active={!!venue.hasceremony && !!venue.hasReception}
              onClick={() =>
                update({
                  hasceremony: !(venue.hasceremony && venue.hasReception),
                  hasReception: !(venue.hasceremony && venue.hasReception),
                })
              }
            />
          </div>
        </div>

        {/* Capacity */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <TextInput
            label="Min capacity"
            type="number"
            value={venue.capacityMin}
            onChange={v => update({ capacityMin: parseInt(v) || undefined })}
            placeholder="e.g. 50"
          />
          <TextInput
            label="Max capacity"
            type="number"
            value={venue.capacityMax}
            onChange={v => update({ capacityMax: parseInt(v) || undefined })}
            placeholder="e.g. 300"
          />
        </div>

        {/* Indoor / Outdoor */}
        <div>
          <span
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#6B5F4B',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Setting
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['indoor', 'outdoor', 'both'] as const).map(opt => (
              <Pill
                key={opt}
                label={opt.charAt(0).toUpperCase() + opt.slice(1)}
                active={venue.indoorOutdoor === opt}
                onClick={() => update({ indoorOutdoor: opt })}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── 3. Spaces ────────────────────────────────────── */}
      <SectionCard title="Venue Spaces">
        {(venue.spaces ?? []).map(space => (
          <div
            key={space.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
            }}
          >
            <input
              type="text"
              value={space.name}
              onChange={e => updateSpace(space.id, e.target.value)}
              style={{
                flex: 1,
                background: '#F5F1E8',
                border: '1px solid #D4C9B0',
                borderRadius: '0.5rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9rem',
                color: '#2C2416',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={() => removeSpace(space.id)}
              aria-label={`Remove ${space.name}`}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#C87373',
                padding: '0.25rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input
            type="text"
            value={newSpaceName}
            onChange={e => setNewSpaceName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSpace()}
            placeholder="Add a space (e.g. Main Hall, Garden…)"
            style={{
              flex: 1,
              background: '#F5F1E8',
              border: '1px dashed #D4C9B0',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.9rem',
              color: '#2C2416',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={addSpace}
            disabled={!newSpaceName.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.5rem 0.875rem',
              background: newSpaceName.trim() ? '#8B774B' : '#D4C9B0',
              color: '#FEFCF8',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: newSpaceName.trim() ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: 500,
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            <Plus size={15} />
            Add
          </button>
        </div>
      </SectionCard>

      {/* ── 4. Notes ─────────────────────────────────────── */}
      <SectionCard title="Notes">
        <label style={{ display: 'block' }}>
          <span
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#6B5F4B',
              marginBottom: '0.375rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Venue notes &amp; vendor rules
          </span>
          <textarea
            value={venue.notes ?? ''}
            onChange={e => update({ notes: e.target.value })}
            placeholder="Anything important — parking, catering restrictions, noise curfew, coordinator contact…"
            rows={5}
            style={{
              width: '100%',
              background: '#F5F1E8',
              border: '1px solid #D4C9B0',
              borderRadius: '0.625rem',
              padding: '0.75rem',
              fontSize: '0.9375rem',
              color: '#2C2416',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.6,
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#8B774B';
              e.target.style.boxShadow = '0 0 0 3px rgba(139,119,75,0.12)';
            }}
            onBlur={e => {
              e.target.style.borderColor = '#D4C9B0';
              e.target.style.boxShadow = 'none';
            }}
          />
        </label>
      </SectionCard>

      {/* ── Save Button ───────────────────────────────────── */}
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        style={{
          width: '100%',
          padding: '0.9375rem',
          background: isSaving
            ? '#C4B896'
            : 'linear-gradient(135deg, #7A6B3F 0%, #8B774B 50%, #9E8956 100%)',
          color: '#FEFCF8',
          border: 'none',
          borderRadius: '0.875rem',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: isSaving ? 'not-allowed' : 'pointer',
          fontFamily: "'Playfair Display', Georgia, serif",
          letterSpacing: '0.02em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          boxShadow: isSaving ? 'none' : '0 4px 16px rgba(139,119,75,0.35)',
          transition: 'all 0.2s ease',
        }}
      >
        {isSaving ? (
          <>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Saving…
          </>
        ) : (
          'Save Venue'
        )}
      </button>

      <style>{`
        }
      `}</style>
    </div>
  );
}
