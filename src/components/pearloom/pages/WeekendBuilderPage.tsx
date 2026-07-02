'use client';

/* ─────────────────────────────────────────────────────────────
   WeekendBuilderPage — one celebration, a weekend of linked sites.

   v2 (2026-07-02): generalized past weddings + redesigned around
   three plain steps and a live plan:

     1 · What are you planning?   (anchor picker — wedding,
         quinceañera, bar/bat mitzvah, big birthday, reunion…)
     2 · The basics               (names per nameModeFor, the
         anchor date, an auto-woven web address)
     3 · The events               (arc catalog with REAL computed
         dates, each adjustable — no "-30 days" jargon)

   A sticky "Your weekend" plan shows the chosen events in
   chronological order and carries the weave CTA, so the host
   always sees exactly what they're about to create. The catalog
   lives in lib/event-os/weekend-arcs.ts (shared with the API).
   ───────────────────────────────────────────────────────────── */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '../dash/DashShell';
import { Icon, Pear, Sparkle } from '../motifs';
import { DatePicker } from '../editor/v8-forms';
import { WEEKEND_ANCHORS, weekendArcFor, type WeekendEventDef } from '@/lib/event-os/weekend-arcs';
import { nameModeFor } from '@/lib/event-os/name-mode';

/* Deterministic date math — safe in render (argument-built Dates
   only; no Date.now()). */
function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function WeekendBuilderPage() {
  const [anchorId, setAnchorId] = useState('wedding');
  const arc = weekendArcFor(anchorId);
  const nameSpec = nameModeFor(anchorId);

  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [date, setDate] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugManual, setSlugManual] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(weekendArcFor('wedding').events.filter((e) => e.recommended).map((e) => e.kind)),
  );
  /* Per-event date overrides — kind → ISO. Cleared on anchor swap. */
  const [dateOverrides, setDateOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Array<{ slug: string; kind: string; date: string; url: string }> | null>(null);

  /* The web address weaves itself from the names until the host
     takes the pen. */
  const autoSlug = useMemo(() => {
    const parts = [name1, nameSpec.mode === 'couple' ? name2 : ''].map((n) => n.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    return slugify(parts.join(' and '));
  }, [name1, name2, nameSpec.mode]);
  const baseSlug = slugEdited ? slugManual : autoSlug;

  const pickAnchor = (id: string) => {
    if (id === anchorId) return;
    setAnchorId(id);
    setChosen(new Set(weekendArcFor(id).events.filter((e) => e.recommended).map((e) => e.kind)));
    setDateOverrides({});
    setError(null);
  };

  const toggleKind = (k: string) => {
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  const eventDate = (e: WeekendEventDef): string | null => {
    const override = dateOverrides[e.kind];
    if (override) return override;
    if (!date) return null;
    return addDaysIso(date, e.offsetDays);
  };

  /* The plan — chosen events in chronological order, real dates. */
  const plan = useMemo(() => {
    return arc.events
      .filter((e) => chosen.has(e.kind))
      .map((e) => ({ def: e, iso: dateOverrides[e.kind] ?? (date ? addDaysIso(date, e.offsetDays) : null) }))
      .sort((a, b) => (a.iso ?? '').localeCompare(b.iso ?? ''));
  }, [arc, chosen, date, dateOverrides]);

  const missing: string | null =
    !name1.trim() ? (nameSpec.mode === 'couple' ? 'Add your names' : `Add the ${nameSpec.primaryLabel.toLowerCase()}`)
    : !date ? `Pick the ${arc.dateLabel.toLowerCase()}`
    : baseSlug.length < 3 ? 'Give the sites a web address'
    : chosen.size === 0 ? 'Choose at least one event'
    : null;

  async function build() {
    if (missing) return setError(missing);
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const events = arc.events
        .filter((e) => chosen.has(e.kind))
        .map((e) => ({ kind: e.kind, date: eventDate(e) ?? undefined, daysFromAnchor: e.offsetDays }));
      const res = await fetch('/api/celebrations/weekend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anchor: anchorId,
          names: nameSpec.mode === 'couple' ? [name1.trim(), name2.trim()] : [name1.trim()],
          anchorDate: date,
          baseSlug,
          events,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Build failed (${res.status})`);
      }
      const data = (await res.json()) as { sites?: Array<{ slug: string; kind: string; date: string; url: string }> };
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

  const eventLabel = (kind: string) => arc.events.find((a) => a.kind === kind)?.label ?? kind;

  return (
    <DashLayout
      active="weekend"
      title="Weekend builder"
      subtitle="Big days rarely come alone. Plan every event around yours — each becomes its own site, already linked to the others."
    >
      <div className="pl8" style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 1080, margin: '0 auto' }}>
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
              {created.length} {created.length === 1 ? 'draft' : 'drafts'} <span className="display-italic">ready.</span>
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 480, margin: '0 auto 18px', lineHeight: 1.55 }}>
              Each one is a private draft, already linked to the others. Open one to make it yours and publish when it&rsquo;s ready —
              once published, guests on any site see a strip pointing to the rest of the weekend.
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
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{eventLabel(s.kind)}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>{fmtDate(s.date)}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--peach-ink)', marginTop: 8 }}>Open editor →</div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="pl8-weekend-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 22, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
              {/* ── Step 1 · the celebration ─────────────────── */}
              <Card>
                <StepEyebrow n={1} label="What are you planning?" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {WEEKEND_ANCHORS.map((a) => {
                    const on = a.id === anchorId;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => pickAnchor(a.id)}
                        style={{
                          textAlign: 'left',
                          padding: '12px 14px',
                          borderRadius: 12,
                          background: on ? 'var(--sage-tint)' : 'var(--cream-2)',
                          border: on ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'border-color var(--pl-dur-fast, 160ms) var(--pl-ease-out, ease), background var(--pl-dur-fast, 160ms) var(--pl-ease-out, ease)',
                        }}
                      >
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{a.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 3, lineHeight: 1.4 }}>{a.blurb}</div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* ── Step 2 · the basics ──────────────────────── */}
              <Card>
                <StepEyebrow n={2} label="The basics" />
                <div className="pl8-weekend-basics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label={nameSpec.primaryLabel}>
                    <input value={name1} onChange={(e) => setName1(e.target.value)} placeholder={nameSpec.primaryPlaceholder} style={inputStyle} />
                  </Field>
                  {nameSpec.mode === 'couple' && (
                    <Field label={nameSpec.secondaryLabel ?? 'Name 2'}>
                      <input value={name2} onChange={(e) => setName2(e.target.value)} placeholder={nameSpec.secondaryPlaceholder ?? 'Jamie'} style={inputStyle} />
                    </Field>
                  )}
                  <Field label={arc.dateLabel}>
                    <DatePicker value={date} onChange={(v) => setDate(v)} placeholder={`Pick the ${arc.dateLabel.toLowerCase()}`} />
                  </Field>
                </div>

                {/* Web address — woven from the names; editable for
                    hosts who want their own. */}
                <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--cream-2)', border: '1px dashed var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Icon name="link" size={12} color="var(--ink-muted)" />
                    {slugEdited ? (
                      <input
                        value={slugManual}
                        onChange={(e) => setSlugManual(slugify(e.target.value))}
                        placeholder="alex-and-jamie"
                        autoFocus
                        style={{ ...inputStyle, padding: '6px 9px', fontSize: 12.5, maxWidth: 240 }}
                      />
                    ) : (
                      <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                        pearloom.com/…/<b style={{ color: 'var(--ink)' }}>{baseSlug || 'your-names'}</b>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (slugEdited) { setSlugEdited(false); setSlugManual(''); }
                        else { setSlugManual(autoSlug); setSlugEdited(true); }
                      }}
                      style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: 'var(--peach-ink)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                    >
                      {slugEdited ? 'Use my names' : 'Change'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 5 }}>
                    Every event gets its own address on top of this one — {baseSlug || 'your-names'}-welcome, {baseSlug || 'your-names'}-brunch…
                  </div>
                </div>
              </Card>

              {/* ── Step 3 · the events ──────────────────────── */}
              <Card>
                <StepEyebrow n={3} label="Choose the events" hint="Tap to include one. Each becomes its own site with its own guest list." />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  {arc.events.map((e) => {
                    const on = chosen.has(e.kind);
                    const iso = eventDate(e);
                    return (
                      <div
                        key={e.kind}
                        style={{
                          borderRadius: 12,
                          background: on ? 'var(--sage-tint)' : 'var(--cream-2)',
                          border: on ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
                          transition: 'border-color var(--pl-dur-fast, 160ms) var(--pl-ease-out, ease), background var(--pl-dur-fast, 160ms) var(--pl-ease-out, ease)',
                        }}
                      >
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleKind(e.kind)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span
                              aria-hidden
                              style={{
                                width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                                border: on ? 'none' : '1.5px solid var(--line)',
                                background: on ? 'var(--sage-deep)' : 'var(--card)',
                                display: 'grid', placeItems: 'center',
                              }}
                            >
                              {on && <Icon name="check" size={10} color="#fff" strokeWidth={3} />}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{e.label}</span>
                            {e.sluffix === '' && (
                              <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--peach-ink)' }}>
                                Main event
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45 }}>{e.description}</div>
                        </button>
                        {on && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 12px' }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-muted)' }}>
                              {iso ? fmtDate(iso) : 'Date follows the big day'}
                            </span>
                            {iso && e.sluffix !== '' && (
                              <input
                                type="date"
                                value={iso}
                                onChange={(ev) => setDateOverrides((o) => ({ ...o, [e.kind]: ev.target.value }))}
                                aria-label={`${e.label} date`}
                                style={{ ...inputStyle, marginLeft: 'auto', width: 'auto', padding: '4px 8px', fontSize: 11.5 }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* ── The plan — sticky, chronological, honest ────── */}
            <aside className="pl8-weekend-plan" style={{ position: 'sticky', top: 84 }}>
              <Card>
                <div style={eyebrowStyle}>Your weekend</div>
                {plan.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: '4px 0 12px', lineHeight: 1.5 }}>
                    Nothing yet. Choose an event and it lands here, in order.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', margin: '4px 0 14px' }}>
                    {plan.map(({ def, iso }, i) => (
                      <div key={def.kind} style={{ display: 'flex', gap: 10 }}>
                        {/* two-dot thread spine */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 10 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: def.sluffix === '' ? 'var(--pl-gold, #C19A4B)' : 'var(--sage-deep)', marginTop: 5, flexShrink: 0 }} />
                          {i < plan.length - 1 && <span style={{ width: 1, flex: 1, background: 'var(--line)', margin: '3px 0' }} />}
                        </div>
                        <div style={{ paddingBottom: i < plan.length - 1 ? 12 : 0, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{def.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>{iso ? fmtDate(iso) : '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-primary pl-pearl-accent"
                  disabled={busy || !!missing}
                  onClick={build}
                  style={{ width: '100%', justifyContent: 'center', fontFamily: 'inherit' }}
                >
                  {busy ? 'Weaving…' : `Weave ${chosen.size} linked ${chosen.size === 1 ? 'site' : 'sites'}`} <Sparkle size={11} />
                </button>
                <div style={{ fontSize: 11, color: error ? '#7A2D2D' : 'var(--ink-muted)', marginTop: 8, lineHeight: 1.5 }}>
                  {error ?? missing ?? 'All drafts stay private until you publish each one.'}
                </div>
              </Card>
            </aside>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pl8-weekend-grid) {
            grid-template-columns: 1fr !important;
          }
          :global(.pl8-weekend-plan) {
            position: static !important;
          }
          :global(.pl8-weekend-basics) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashLayout>
  );
}

/* ── atoms ──────────────────────────────────────────────────── */

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--peach-ink)',
  marginBottom: 12,
};

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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--card-ring)', borderRadius: 16, padding: 24 }}>
      {children}
    </div>
  );
}

function StepEyebrow({ n, label, hint }: { n: number; label: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span
          aria-hidden
          style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            border: '1px solid var(--pl-gold, #C19A4B)', color: 'var(--pl-gold, #C19A4B)',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: 10.5, fontWeight: 700,
          }}
        >
          {n}
        </span>
        <span style={{ ...eyebrowStyle, marginBottom: 0 }}>{label}</span>
      </div>
      {hint && <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 6, lineHeight: 1.45 }}>{hint}</div>}
    </div>
  );
}

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
