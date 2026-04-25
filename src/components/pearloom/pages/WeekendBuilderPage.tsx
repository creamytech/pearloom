'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashLayout } from '../dash/DashShell';
import { Icon, Pear, Sparkle } from '../motifs';
import { DatePicker } from '../editor/v8-forms';

type EventKind =
  | 'engagement-party'
  | 'bridal-shower'
  | 'bachelor-party'
  | 'bachelorette-party'
  | 'rehearsal-dinner'
  | 'welcome-party'
  | 'wedding'
  | 'brunch';

interface EventOption {
  kind: EventKind;
  label: string;
  defaultDays: number;
  description: string;
  recommended?: boolean;
}

const ALL: EventOption[] = [
  { kind: 'engagement-party', label: 'Engagement party', defaultDays: -180, description: 'Six months out — friends + family meet the news.' },
  { kind: 'bridal-shower', label: 'Bridal shower', defaultDays: -45, description: 'Six weeks out — afternoon, low-key, often by MOH.' },
  { kind: 'bachelor-party', label: 'Bachelor party', defaultDays: -30, description: 'A month out — the trip with the boys.' },
  { kind: 'bachelorette-party', label: 'Bachelorette party', defaultDays: -30, description: 'A month out — the trip with the girls.' },
  { kind: 'rehearsal-dinner', label: 'Rehearsal dinner', defaultDays: -1, description: 'The night before. Family + wedding party only.', recommended: true },
  { kind: 'welcome-party', label: 'Welcome party', defaultDays: -1, description: 'Friday night drinks for out-of-towners.', recommended: true },
  { kind: 'wedding', label: 'Wedding', defaultDays: 0, description: 'The main event.', recommended: true },
  { kind: 'brunch', label: 'Morning-after brunch', defaultDays: 1, description: 'Sunday brunch for everyone who stayed late.', recommended: true },
];

export function WeekendBuilderPage() {
  const router = useRouter();
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [date, setDate] = useState('');
  const [baseSlug, setBaseSlug] = useState('');
  const [chosen, setChosen] = useState<Set<EventKind>>(
    new Set(['rehearsal-dinner', 'welcome-party', 'wedding', 'brunch']),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Array<{ slug: string; kind: EventKind; date: string; url: string }> | null>(null);

  const togglekind = (k: EventKind) => {
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  async function build() {
    if (!name1.trim()) return setError('Add at least one name.');
    if (!date) return setError('Pick a wedding date.');
    if (!baseSlug.trim()) return setError('Pick a base slug (e.g. alex-and-jamie).');
    if (chosen.size === 0) return setError('Choose at least one event.');

    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const events = ALL.filter((e) => chosen.has(e.kind)).map((e) => ({
        kind: e.kind,
        daysFromWedding: e.defaultDays,
      }));
      const res = await fetch('/api/celebrations/weekend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: [name1.trim(), name2.trim()],
          weddingDate: date,
          baseSlug: baseSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          events,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Build failed (${res.status})`);
      }
      const data = (await res.json()) as { sites?: Array<{ slug: string; kind: EventKind; date: string; url: string }> };
      setCreated(data.sites ?? []);
      // Invalidate dashboard cache so My Sites shows the new sites.
      try {
        const { invalidateSitesCache } = await import('@/components/marketing/design/dash/hooks');
        invalidateSitesCache();
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Build failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashLayout active="weekend" title="Weekend builder" subtitle="One date, one base name. Pear creates a linked site for every event in your weekend.">
      <div className="pl8" style={{ padding: '0 clamp(20px, 4vw, 56px) 56px', maxWidth: 1080, margin: '0 auto' }}>
        {created ? (
          <div
            style={{
              padding: 32,
              background: 'var(--sage-tint)',
              border: '1px solid var(--sage-deep)',
              borderRadius: 18,
              textAlign: 'center',
            }}
          >
            <Pear size={64} tone="sage" sparkle />
            <h2 className="display" style={{ fontSize: 32, margin: '14px 0 6px' }}>
              {created.length} sites <span className="display-italic">live.</span>
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 480, margin: '0 auto 18px', lineHeight: 1.55 }}>
              Each one is linked — guests on any site see a strip pointing to the others. Open one to start editing.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, maxWidth: 720, margin: '0 auto' }}>
              {created.map((s) => (
                <Link
                  key={s.slug}
                  href={`/editor/${s.slug}`}
                  style={{
                    display: 'block',
                    padding: 14,
                    background: 'var(--card)',
                    border: '1px solid var(--card-ring)',
                    borderRadius: 12,
                    textDecoration: 'none',
                    color: 'var(--ink)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{ALL.find((a) => a.kind === s.kind)?.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>{s.date}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--peach-ink)', marginTop: 8 }}>Open editor →</div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--card-ring)',
                borderRadius: 16,
                padding: 24,
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--peach-ink)',
                  marginBottom: 8,
                }}
              >
                The basics
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="First name">
                  <input value={name1} onChange={(e) => setName1(e.target.value)} placeholder="Alex" style={inputStyle} />
                </Field>
                <Field label="Partner's name">
                  <input value={name2} onChange={(e) => setName2(e.target.value)} placeholder="Jamie" style={inputStyle} />
                </Field>
                <Field label="Wedding date">
                  <DatePicker value={date} onChange={(v) => setDate(v)} placeholder="Pick the wedding date" />
                </Field>
                <Field label="Base slug">
                  <input
                    value={baseSlug}
                    onChange={(e) => setBaseSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="alex-and-jamie"
                    style={inputStyle}
                  />
                </Field>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 8 }}>
                Each event gets a slug suffix: bach, rehearsal, welcome, brunch, etc.
              </div>
            </div>

            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--card-ring)',
                borderRadius: 16,
                padding: 24,
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--peach-ink)',
                  marginBottom: 12,
                }}
              >
                Pick your events
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {ALL.map((e) => {
                  const on = chosen.has(e.kind);
                  return (
                    <button
                      key={e.kind}
                      type="button"
                      onClick={() => togglekind(e.kind)}
                      style={{
                        textAlign: 'left',
                        padding: 14,
                        borderRadius: 12,
                        background: on ? 'var(--sage-tint)' : 'var(--cream-2)',
                        border: on ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
                        cursor: 'pointer',
                        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{e.label}</span>
                        {e.recommended && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--peach-ink)' }}>RECOMMENDED</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>{e.description}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 6 }}>
                        {e.defaultDays === 0 ? 'On the wedding date' : e.defaultDays > 0 ? `+${e.defaultDays} day` : `${e.defaultDays} days`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
              {error && <span style={{ fontSize: 13, color: '#7A2D2D', flex: 1 }}>{error}</span>}
              <button type="button" className="btn btn-primary" disabled={busy} onClick={build}>
                {busy ? 'Building…' : `Create ${chosen.size} linked sites`} <Sparkle size={11} />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashLayout>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'var(--cream-2)',
  fontSize: 14,
  color: 'var(--ink)',
  width: '100%',
  fontFamily: 'inherit',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
