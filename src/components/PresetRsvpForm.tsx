'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/PresetRsvpForm.tsx
//
// Preset-driven RSVP form for non-wedding events. Renders any
// field set from getRsvpFields(preset) — bachelor, shower,
// memorial, reunion, milestone, cultural, casual.
//
// The existing rsvp-form.tsx remains the polished wedding
// multi-step form; this sibling handles everything else.
// SiteRenderer picks which one based on the site's occasion
// via getEventType(occasion)?.rsvpPreset.
//
// The POST body extends the same /api/rsvp shape with an
// `answers` record so the backend can persist arbitrary preset
// fields without schema changes.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, CloudOff } from 'lucide-react';
import {
  getRsvpFields,
  type RsvpFieldDef,
  type RsvpFieldKind,
} from '@/lib/event-os/rsvp-presets';
import type { RsvpPreset } from '@/lib/event-os/event-types';

interface PresetRsvpFormProps {
  siteId: string;
  preset: RsvpPreset;
  /** Title above the form. Defaults to "RSVP". */
  title?: string;
  /** Intro text shown under the title. */
  subtitle?: string;
}

type AttendingValue = 'attending' | 'declined' | null;

export function PresetRsvpForm({
  siteId,
  preset,
  title = 'RSVP',
  subtitle,
}: PresetRsvpFormProps) {
  const fields = getRsvpFields(preset);

  // Core fields every form needs regardless of preset.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [attending, setAttending] = useState<AttendingValue>(null);

  // Free-form answers keyed by field kind. Simple typing: kind → value.
  // For checkbox groups (attending-days) we store comma-joined strings
  // and split on submit.
  const [answers, setAnswers] = useState<Partial<Record<RsvpFieldKind, string>>>({});

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setAnswer = (kind: RsvpFieldKind, value: string) =>
    setAnswers((prev) => ({ ...prev, [kind]: value }));

  // If they say "not attending" we only keep attending + name + email + maybe comments/memory-share.
  // All other fields are hidden.
  const visibleFields = fields.filter((f) => {
    if (f.kind === 'attending') return true;
    if (attending === 'declined') {
      return f.kind === 'comments' || f.kind === 'memory-share';
    }
    return true;
  });

  const canSubmit =
    name.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    attending !== null &&
    // Every required field has a non-empty answer.
    fields
      .filter((f) => f.required && f.kind !== 'attending')
      .filter((f) => {
        // Required fields only matter when attending.
        if (attending === 'declined') {
          return f.kind === 'comments' || f.kind === 'memory-share';
        }
        return true;
      })
      .every((f) => (answers[f.kind] ?? '').trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          status: attending,
          guestName: name.trim(),
          email: email.trim(),
          // Legacy RSVP columns — map preset answers into them when they
          // exist so the existing /api/rsvp handler keeps working.
          mealPreference: answers.meal ?? null,
          dietaryRestrictions: answers.dietary ?? null,
          songRequest: answers['song-request'] ?? null,
          message: answers.comments ?? answers['memory-share'] ?? null,
          // Full preset answers for anything that doesn't map to a
          // dedicated column — API should persist as JSONB.
          preset,
          answers,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data?.error || 'Something went wrong. Try again.');
      }
    } catch {
      setSubmitError('Couldn\u2019t reach the server. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={cardStyle}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {attending === 'attending' ? (
            <Check size={18} color="var(--pl-olive)" />
          ) : (
            <CloudOff size={18} color="var(--pl-muted)" />
          )}
          <span style={{ fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--pl-ink)' }}>
            {attending === 'attending' ? 'You\u2019re on the list.' : 'Thanks for letting us know.'}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
      style={cardStyle}
    >
      <header style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2
          className="pl-display"
          style={{
            margin: 0,
            fontStyle: 'italic',
            fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
            color: 'var(--pl-ink)',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '10px auto 0', maxWidth: '48ch', color: 'var(--pl-muted)', fontSize: '0.96rem', lineHeight: 1.55 }}>
            {subtitle}
          </p>
        )}
      </header>

      {/* Core: name + email (always first) */}
      <Row label="Your name" required>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </Row>
      <Row label="Email" required>
        <input
          type="email"
          style={inputStyle}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </Row>

      {/* Preset fields */}
      {visibleFields.map((field) => (
        <FieldRenderer
          key={field.kind}
          field={field}
          attending={attending}
          onAttendingChange={setAttending}
          value={answers[field.kind] ?? ''}
          onChange={(v) => setAnswer(field.kind, v)}
        />
      ))}

      {submitError && (
        <div
          role="alert"
          style={{
            margin: '18px 0 8px',
            padding: '10px 14px',
            borderRadius: 'var(--pl-radius-sm)',
            background: 'color-mix(in oklab, var(--pl-plum) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--pl-plum) 30%, transparent)',
            color: 'var(--pl-plum)',
            fontSize: '0.9rem',
          }}
        >
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="pl-pearl-accent"
        style={{
          marginTop: 24,
          width: '100%',
          padding: '14px 20px',
          borderRadius: 'var(--pl-radius-full)',
          fontFamily: 'var(--pl-font-mono, ui-monospace)',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          cursor: !canSubmit || loading ? 'default' : 'pointer',
          opacity: !canSubmit ? 0.5 : 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {loading ? (<><Loader2 size={14} className="animate-spin" />Sending</>) : 'Send it'}
      </button>
    </form>
  );
}

// ── Individual field renderers ───────────────────────────────

interface FieldRendererProps {
  field: RsvpFieldDef;
  attending: AttendingValue;
  onAttendingChange: (v: AttendingValue) => void;
  value: string;
  onChange: (v: string) => void;
}

function FieldRenderer({ field, attending, onAttendingChange, value, onChange }: FieldRendererProps) {
  switch (field.kind) {
    case 'attending':
      return (
        <Row label={field.label} hint={field.hint} required>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
            <PillButton active={attending === 'attending'} onClick={() => onAttendingChange('attending')}>
              Yes, I\u2019ll be there
            </PillButton>
            <PillButton active={attending === 'declined'} onClick={() => onAttendingChange('declined')}>
              Can\u2019t make it
            </PillButton>
          </div>
        </Row>
      );

    case 'meal':
    case 'room-preference':
    case 'bed-preference':
    case 'tshirt-size':
    case 'gift-status':
      return (
        <Row label={field.label} hint={field.hint} required={field.required}>
          <select
            style={{ ...inputStyle, paddingRight: 24 }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={focusBorder}
            onBlur={blurBorder}
          >
            <option value="">Select one…</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </Row>
      );

    case 'plus-one':
      return (
        <Row label={field.label} hint={field.hint}>
          <input
            style={inputStyle}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Their name (leave blank if no plus one)"
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </Row>
      );

    case 'song-request':
      return (
        <Row label={field.label} hint={field.hint}>
          <input
            style={inputStyle}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Artist — Song"
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </Row>
      );

    case 'attending-days': {
      // Render a checkbox row; stored as comma-joined string.
      const days = value ? value.split(',').filter(Boolean) : [];
      const toggle = (day: string) => {
        const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
        onChange(next.join(','));
      };
      return (
        <Row label={field.label} hint={field.hint}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {['Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <PillButton key={day} active={days.includes(day)} onClick={() => toggle(day)}>
                {day}
              </PillButton>
            ))}
          </div>
        </Row>
      );
    }

    case 'cost-acknowledge':
      return (
        <Row label={field.label} hint={field.hint} required={field.required}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: 'var(--pl-ink)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={value === 'yes'}
              onChange={(e) => onChange(e.target.checked ? 'yes' : '')}
              style={{ width: 18, height: 18 }}
            />
            I\u2019m good with the cost share shown on the site.
          </label>
        </Row>
      );

    case 'photo-upload':
      // MVP: capture a URL or skip. Full upload flow is a later
      // session (needs R2 wiring like /api/photos/upload).
      return (
        <Row label={field.label} hint={(field.hint ?? '') + ' Paste a link for now — direct upload coming soon.'}>
          <input
            style={inputStyle}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </Row>
      );

    case 'dietary':
    case 'comments':
    case 'memory-share':
    case 'advice':
    case 'allergies-med':
      return (
        <Row label={field.label} hint={field.hint} required={field.required}>
          <textarea
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </Row>
      );
  }
}

// ── Small UI atoms ───────────────────────────────────────────

function Row({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ marginLeft: 6, color: 'var(--pl-plum)' }}>*</span>}
      </label>
      {children}
      {hint && (
        <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--pl-muted)', lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderRadius: 'var(--pl-radius-full)',
        border: `1px solid ${active ? 'var(--pl-ink)' : 'var(--pl-divider)'}`,
        background: active ? 'var(--pl-ink)' : 'transparent',
        color: active ? 'var(--pl-cream)' : 'var(--pl-ink-soft)',
        fontSize: '0.82rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
      }}
    >
      {children}
    </button>
  );
}

// ── Shared styles (mirror rsvp-form.tsx so sites look consistent) ──

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 0',
  borderTop: 'none',
  borderLeft: 'none',
  borderRight: 'none',
  borderBottom: '1.5px solid rgba(0,0,0,0.1)',
  background: 'transparent',
  fontSize: 'max(16px, 0.9rem)',
  fontFamily: 'var(--pl-font-body)',
  color: 'var(--pl-ink)',
  outline: 'none',
  transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out)',
  borderRadius: 0,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: 'var(--pl-muted)',
  marginBottom: '0.3rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const cardStyle: React.CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: 'clamp(24px, 4vw, 40px) clamp(20px, 4vw, 36px)',
  background: 'var(--pl-cream-card)',
  border: '1px solid var(--pl-divider)',
  borderRadius: 'var(--pl-radius-lg)',
  boxShadow: 'var(--pl-shadow-md)',
};

function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderBottomColor = 'var(--pl-olive)';
}
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderBottomColor = 'rgba(0,0,0,0.1)';
}
