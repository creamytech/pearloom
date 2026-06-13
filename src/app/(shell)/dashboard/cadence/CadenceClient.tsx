'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { DashEmpty } from '@/components/pearloom/dash/DashEmpty';
import { DashSkeleton } from '@/components/pearloom/dash/DashSkeleton';
import { Icon } from '@/components/pearloom/motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';

interface MergedPhase {
  id: string;
  label: string;
  description: string;
  daysBefore: number;
  channels: string[];
  product: string;
  audience?: string;
  rowId?: string;
  scheduledAt: string;
  status: 'preset' | 'draft' | 'scheduled' | 'sent' | 'cancelled' | 'failed';
  subject?: string;
  body?: string;
  sentAt?: string;
  sentCount?: number;
  hasOverride: boolean;
}

const STATUS_TONE: Record<MergedPhase['status'], { bg: string; fg: string; label: string }> = {
  preset:    { bg: 'rgba(14,13,11,0.06)',  fg: 'var(--ink-muted)', label: 'Suggested' },
  draft:     { bg: 'rgba(184,147,90,0.14)', fg: '#5C4F2E',          label: 'Draft' },
  scheduled: { bg: 'rgba(92,107,63,0.12)',  fg: '#3D4A1F',          label: 'Scheduled' },
  sent:      { bg: 'rgba(92,107,63,0.18)',  fg: '#3D4A1F',          label: 'Sent' },
  cancelled: { bg: 'rgba(122,45,45,0.08)',  fg: '#7A2D2D',          label: 'Cancelled' },
  failed:    { bg: 'rgba(122,45,45,0.18)',  fg: '#7A2D2D',          label: 'Failed' },
};

export function CadenceClient({ siteSlug: urlSiteSlug }: { siteSlug: string | null }) {
  // URL ?site= param wins; otherwise fall back to the global
  // sidebar-picked site so users don't get re-prompted on every nav.
  const { site } = useSelectedSite();
  const siteSlug = urlSiteSlug ?? site?.domain ?? '';
  const [phases, setPhases] = useState<MergedPhase[] | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPhase, setOpenPhase] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!siteSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/cadence?site=${encodeURIComponent(siteSlug)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load cadence.');
      setPhases(data.phases ?? []);
      setEventDate(data.eventDate ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [siteSlug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <DashLayout
      active="event"
      title="Send timeline"
      subtitle="Pear suggests every send your event needs — save-the-date, RSVP nudge, day-before reminder, thank-you. Approve, edit copy, or schedule."
    >
      <div style={{ padding: 'clamp(20px, 3vw, 32px)', maxWidth: 1100, margin: '0 auto' }}>

        {!eventDate && !loading && (
          <DashEmpty
            size="page"
            eyebrow="Heads up"
            title="No event date set"
            body="Add a date to your site logistics so Pear can anchor the cadence (save-the-date 6 months before, day-before reminders, etc.)."
            actions={[{ label: 'Open the editor', href: `/editor/${siteSlug}` }]}
          />
        )}

        {loading ? (
          <DashSkeleton kind="list" count={6} label="Threading the cadence" />
        ) : error ? (
          <div style={{ padding: 14, background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', borderRadius: 12 }}>{error}</div>
        ) : phases && phases.length > 0 ? (
          <div className="pl8-dash-stagger" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Timeline rail */}
            <div aria-hidden style={{
              position: 'absolute',
              left: 22,
              top: 18,
              bottom: 18,
              width: 2,
              background: 'linear-gradient(to bottom, var(--peach-ink, #C6703D) 0%, var(--peach-ink, #C6703D) 50%, transparent 100%)',
              opacity: 0.18,
            }} />
            {phases.map((p) => (
              <PhaseRow
                key={p.id}
                phase={p}
                eventDate={eventDate}
                siteSlug={siteSlug}
                expanded={openPhase === p.id}
                onToggle={() => setOpenPhase(openPhase === p.id ? null : p.id)}
                onChange={() => void reload()}
              />
            ))}
          </div>
        ) : null}
      </div>
    </DashLayout>
  );
}

function PhaseRow({
  phase,
  eventDate,
  siteSlug,
  expanded,
  onToggle,
  onChange,
}: {
  phase: MergedPhase;
  eventDate: string | null;
  siteSlug: string;
  expanded: boolean;
  onToggle: () => void;
  onChange: () => void;
}) {
  const tone = STATUS_TONE[phase.status];
  const dateLabel = useMemo(() => {
    if (!phase.scheduledAt) return '—';
    return new Date(phase.scheduledAt).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  }, [phase.scheduledAt]);
  const relLabel = useMemo(() => {
    const d = phase.daysBefore;
    if (d === 0) return 'Day of';
    if (d > 0) return `${d}d after`;
    if (d <= -7) return `${Math.abs(Math.round(d / 7))}w before`;
    return `${Math.abs(d)}d before`;
  }, [phase.daysBefore]);

  return (
    <div
      className="pl8-card-lift"
      style={{
        position: 'relative',
        marginLeft: 12,
        background: 'var(--cream-2)',
        border: '1px solid var(--line-soft)',
        borderRadius: 14,
        padding: '14px 16px 14px 36px',
      }}
    >
      {/* Timeline dot */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: -2,
          top: 18,
          width: 16,
          height: 16,
          borderRadius: 999,
          background: phase.status === 'sent' ? 'var(--peach-ink)' : phase.status === 'scheduled' ? '#5C6B3F' : 'var(--cream)',
          border: '2px solid var(--peach-ink, #C6703D)',
          boxShadow: '0 0 0 4px var(--paper)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>{phase.label}</span>
            <span style={{
              padding: '3px 10px',
              borderRadius: 999,
              background: tone.bg,
              color: tone.fg,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {tone.label}
            </span>
            {phase.channels.map((c) => (
              <span key={c} style={{
                fontSize: 10.5,
                color: 'var(--ink-muted)',
                padding: '2px 8px',
                background: 'rgba(14,13,11,0.04)',
                borderRadius: 999,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                {c}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 6 }}>
            {phase.description}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            {dateLabel} · <span style={{ color: 'var(--peach-ink)', fontWeight: 600 }}>{relLabel}</span>
            {phase.audience && phase.audience !== 'all' && (
              <span style={{ color: 'var(--ink-muted)' }}> · {phase.audience}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            border: '1.5px solid var(--line)',
            background: 'var(--card)',
            color: 'var(--ink)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name={expanded ? 'close' : 'pencil'} size={11} />
          {expanded ? 'Close' : phase.hasOverride ? 'Edit' : 'Set up'}
        </button>
      </div>

      {expanded && (
        <PhaseEditor
          phase={phase}
          eventDate={eventDate}
          siteSlug={siteSlug}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function PhaseEditor({
  phase,
  eventDate,
  siteSlug,
  onChange,
}: {
  phase: MergedPhase;
  eventDate: string | null;
  siteSlug: string;
  onChange: () => void;
}) {
  const [subject, setSubject] = useState(phase.subject ?? '');
  const [body, setBody] = useState(phase.body ?? '');
  const [scheduledAt, setScheduledAt] = useState(phase.scheduledAt.slice(0, 16));
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDraft() {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch('/api/cadence/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, phaseId: phase.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Draft failed.');
      setSubject(data.subject || subject);
      setBody(data.body || body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft failed.');
    } finally {
      setDrafting(false);
    }
  }

  async function handleSave(status: 'draft' | 'scheduled' | 'cancelled') {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/cadence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          phaseId: phase.id,
          subject: subject || null,
          body: body || null,
          scheduledAt: new Date(scheduledAt).toISOString(),
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pl8-tab-enter" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!eventDate && (
        <div style={{ fontSize: 12, color: '#7A2D2D', background: 'rgba(122,45,45,0.08)', padding: '8px 10px', borderRadius: 8 }}>
          Set the event date in the editor to anchor the schedule.
        </div>
      )}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          When to send
        </span>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          style={{
            padding: '9px 12px',
            background: 'var(--paper)',
            border: '1.5px solid var(--line)',
            borderRadius: 9,
            fontSize: 13,
            color: 'var(--ink)',
            fontFamily: 'var(--font-ui)',
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Subject
        </span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Click ‘Draft with Pear’ to generate"
          style={{
            padding: '9px 12px',
            background: 'var(--paper)',
            border: '1.5px solid var(--line)',
            borderRadius: 9,
            fontSize: 13,
            color: 'var(--ink)',
            fontFamily: 'var(--font-ui)',
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Body
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Pear can draft a starting point in your voice."
          style={{
            padding: '10px 12px',
            background: 'var(--paper)',
            border: '1.5px solid var(--line)',
            borderRadius: 9,
            fontSize: 13,
            color: 'var(--ink)',
            fontFamily: 'var(--font-ui)',
            lineHeight: 1.5,
            resize: 'vertical',
          }}
        />
      </label>
      {error && (
        <div style={{ fontSize: 12, color: '#7A2D2D', background: 'rgba(122,45,45,0.08)', padding: '8px 10px', borderRadius: 8 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleDraft}
          disabled={drafting}
          style={btnStyle('outline')}
        >
          <Icon name="sparkles" size={12} /> {drafting ? 'Drafting…' : 'Draft with Pear'}
        </button>
        <button
          type="button"
          onClick={() => handleSave('draft')}
          disabled={saving}
          style={btnStyle('outline')}
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={() => handleSave('scheduled')}
          disabled={saving || !body}
          className="pl-pearl-accent"
          style={{
            ...btnStyle('primary'),
            opacity: !body ? 0.5 : 1,
            cursor: !body ? 'not-allowed' : 'pointer',
          }}
        >
          Schedule
        </button>
        {phase.hasOverride && phase.status !== 'sent' && (
          <button
            type="button"
            onClick={() => handleSave('cancelled')}
            disabled={saving}
            style={btnStyle('danger')}
          >
            Cancel send
          </button>
        )}
      </div>
    </div>
  );
}

function btnStyle(variant: 'primary' | 'outline' | 'danger'): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
  };
  if (variant === 'primary') return { ...base, padding: '9px 18px', fontWeight: 700 };
  if (variant === 'danger') return { ...base, background: 'transparent', color: '#7A2D2D', border: '1.5px solid #7A2D2D' };
  return { ...base, background: 'var(--card)', color: 'var(--ink)', border: '1.5px solid var(--line)' };
}
