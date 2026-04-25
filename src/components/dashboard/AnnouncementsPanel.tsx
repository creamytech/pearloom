'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/AnnouncementsPanel.tsx
//
// Day-of announcements composer + history. Host writes short
// messages that surface in the Guest Companion + /g/{token}.
// Supports immediate send OR scheduled delivery.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { CustomSelect } from '@/components/pearloom/editor/v8-forms';

interface Announcement {
  id: string;
  body: string;
  kind: string;
  target_audience: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

const KINDS = [
  { value: 'info', label: 'Info' },
  { value: 'timeline', label: 'Timeline update' },
  { value: 'urgent', label: 'Urgent' },
];

const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'attending', label: 'Attending only' },
  { value: 'side_a', label: 'Side A' },
  { value: 'side_b', label: 'Side B' },
];

export function AnnouncementsPanel({ siteId }: { siteId: string }) {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const [body, setBody] = useState('');
  const [kind, setKind] = useState('info');
  const [audience, setAudience] = useState('all');
  const [scheduledFor, setScheduledFor] = useState('');

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/announcements?siteId=${siteId}`);
      const data = await r.json();
      if (!r.ok) setError(data.error ?? 'Failed to load');
      else setList(data.announcements ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setError(null);
    if (!body.trim()) {
      setError('Write a message first.');
      return;
    }
    if (body.length > 1000) {
      setError('Too long (1000 char max).');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          body: body.trim(),
          kind,
          targetAudience: audience,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? 'Failed to post');
      } else {
        setBody('');
        setScheduledFor('');
        await load();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = 1000 - body.length;

  return (
    <div style={{ fontFamily: 'var(--pl-font-body)', padding: '1rem' }}>
      <h3 style={{
        margin: 0,
        marginBottom: '1rem',
        fontFamily: 'var(--pl-font-display)',
        fontStyle: 'italic',
        fontSize: '1.25rem',
      }}>
        Day-of announcements
      </h3>

      {/* Composer */}
      <div style={{
        padding: '1rem 1.25rem',
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        borderRadius: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ceremony starts in 30 minutes — please take your seats."
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--pl-divider)',
            borderRadius: '0.5rem',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          fontSize: '0.75rem',
          color: remaining < 0 ? 'var(--pl-plum)' : 'var(--pl-muted)',
          marginTop: '0.25rem',
        }}>
          {remaining} left
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.75rem',
          marginTop: '0.75rem',
        }}>
          <label style={labelStyle}>
            <span style={labelText}>Kind</span>
            <CustomSelect
              value={kind}
              onChange={(v) => setKind(v)}
              options={KINDS}
              ariaLabel="Announcement kind"
            />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Audience</span>
            <CustomSelect
              value={audience}
              onChange={(v) => setAudience(v)}
              options={AUDIENCES}
              ariaLabel="Announcement audience"
            />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Schedule (optional)</span>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              style={selectStyle}
            />
          </label>
        </div>

        {error && (
          <div style={{
            color: 'var(--pl-plum)',
            fontSize: '0.85rem',
            marginTop: '0.75rem',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || !body.trim()}
            style={{
              padding: '0.6rem 1.25rem',
              background: submitting || !body.trim() ? 'var(--pl-muted)' : 'var(--pl-olive)',
              color: 'var(--pl-cream)',
              border: 'none',
              borderRadius: 'var(--pl-radius-full)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: submitting || !body.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Sending…' : scheduledFor ? 'Schedule' : 'Send now'}
          </button>
        </div>
      </div>

      {/* History */}
      <div>
        <h4 style={{
          margin: 0,
          marginBottom: '0.75rem',
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--pl-muted)',
        }}>
          Recent
        </h4>

        {loading && <div style={{ opacity: 0.6, fontSize: '0.9rem' }}>Loading…</div>}
        {!loading && list.length === 0 && (
          <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>
            No announcements yet.
          </div>
        )}

        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          {list.map((a) => {
            const status = a.sent_at
              ? { label: 'Sent', color: 'var(--pl-olive)' }
              : a.scheduled_for
              ? { label: `Scheduled`, color: 'var(--pl-gold)' }
              : { label: 'Draft', color: 'var(--pl-muted)' };
            const when = a.sent_at
              ? new Date(a.sent_at).toLocaleString()
              : a.scheduled_for
              ? new Date(a.scheduled_for).toLocaleString()
              : new Date(a.created_at).toLocaleString();
            return (
              <li
                key={a.id}
                style={{
                  padding: '0.85rem 1.1rem',
                  background: 'var(--pl-cream-card)',
                  border: '1px solid var(--pl-divider)',
                  borderRadius: '0.6rem',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.35rem',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--pl-radius-full)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: `color-mix(in oklab, ${status.color} 14%, transparent)`,
                      color: status.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      {status.label}
                    </span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.7, textTransform: 'capitalize' }}>
                      {a.kind} · {a.target_audience.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>
                    {when}
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {a.body}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const labelText: React.CSSProperties = {
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--pl-muted)',
};

const selectStyle: React.CSSProperties = {
  padding: '0.5rem 0.6rem',
  border: '1px solid var(--pl-divider)',
  borderRadius: '0.4rem',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  background: 'var(--pl-cream)',
};
