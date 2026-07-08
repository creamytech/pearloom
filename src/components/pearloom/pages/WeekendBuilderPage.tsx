'use client';

/* ─────────────────────────────────────────────────────────────
   WeekendBuilderPage — one celebration, a weekend of linked sites.

   Restyled (2026-07-05) to the design-handoff "Weekend" screen
   (ScreensPlan.jsx): a lavender base-core banner up top ("one base
   core weaves across the whole weekend"), the three plain build
   steps, and a sticky "Your weekend" plan re-drawn as the zip's
   day-grouped board — day headings + status-dot event cards, the
   anchor wearing a gold ★ THE DAY. Every value is real: the plan
   shows the host's chosen events on their computed dates; nothing
   invents guest counts for sites that don't exist yet. All styling
   rides the .pl8 chrome tokens.

   The wiring is unchanged from v2:
     1 · What are you planning?   (anchor picker)
     2 · The basics               (names, anchor date, woven address)
     3 · The events               (arc catalog, real dates, adjustable)
   The catalog lives in lib/event-os/weekend-arcs.ts (shared with
   the /api/celebrations/weekend route).
   ───────────────────────────────────────────────────────────── */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '../dash/DashShell';
import { DashConnections } from '@/components/marketing/design/dash/DashConnections';
import { PageIntro } from '../dash/QuietDash';
import { Icon, Pear, Sparkle, PearloomGlyph } from '../motifs';
import { DatePicker } from '../editor/v8-forms';
import { WEEKEND_ANCHORS, weekendArcFor, type WeekendEventDef } from '@/lib/event-os/weekend-arcs';
import { nameModeFor } from '@/lib/event-os/name-mode';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

/* Tier 2 — the satellites that genuinely need their OWN guest list
   and tone (a different crowd than the main day). Everything else
   defaults to a moment on the main site's schedule. */
const OWN_SITE_KINDS = new Set([
  'engagement', 'bridal-shower', 'bachelor-party', 'bachelorette-party', 'rehearsal-dinner',
]);

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
function weekdayOf(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}
function monthDayOf(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
  /* Two tiers (GRAND-PLAN-2 B.1): events with their own guest list
     default to a full site; small moments (welcome drinks, brunch)
     default to a slot on the MAIN site's schedule — no new domain,
     no second guest list. The host can flip either way per event. */
  const [modes, setModes] = useState<Record<string, 'site' | 'moment'>>({});
  const defaultModeFor = (kind: string): 'site' | 'moment' =>
    OWN_SITE_KINDS.has(kind) ? 'site' : 'moment';
  const modeFor = (e: WeekendEventDef): 'site' | 'moment' =>
    e.sluffix === '' ? 'site' : (modes[e.kind] ?? defaultModeFor(e.kind));
  /* Per-event date overrides — kind → ISO. Cleared on anchor swap. */
  const [dateOverrides, setDateOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Array<{ slug: string; kind: string; date: string; url: string }> | null>(null);
  const [createdMoments, setCreatedMoments] = useState<Array<{ kind: string; label: string; date: string }>>([]);

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
    setModes({});
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

  /* The plan, grouped into the zip's day columns — each distinct
     date is its own day heading; undated events (no anchor date yet)
     fall into one "when the day is set" bucket at the end. */
  const dayGroups = useMemo(() => {
    const groups: Array<{ key: string; day: string; date: string; items: typeof plan }> = [];
    for (const p of plan) {
      const key = p.iso ?? 'tbd';
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = {
          key,
          day: p.iso ? weekdayOf(p.iso) : 'When the day is set',
          date: p.iso ? monthDayOf(p.iso) : '',
          items: [],
        };
        groups.push(g);
      }
      g.items.push(p);
    }
    return groups;
  }, [plan]);

  const anchorChosen = arc.events.some((e) => e.sluffix === '' && chosen.has(e.kind));
  const momentCount = arc.events.filter((e) => chosen.has(e.kind) && modeFor(e) === 'moment').length;
  const siteCount = chosen.size - momentCount;
  const missing: string | null =
    !name1.trim() ? (nameSpec.mode === 'couple' ? 'Add your names' : `Add the ${nameSpec.primaryLabel.toLowerCase()}`)
    : !date ? `Pick the ${arc.dateLabel.toLowerCase()}`
    : baseSlug.length < 3 ? 'Give the sites a web address'
    : chosen.size === 0 ? 'Choose at least one event'
    : momentCount > 0 && !anchorChosen ? 'Include the main event — moments live on its schedule'
    : null;

  async function build() {
    if (missing) return setError(missing);
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const events = arc.events
        .filter((e) => chosen.has(e.kind))
        .map((e) => ({ kind: e.kind, date: eventDate(e) ?? undefined, daysFromAnchor: e.offsetDays, mode: modeFor(e) }));
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
      const data = (await res.json()) as {
        sites?: Array<{ slug: string; kind: string; date: string; url: string }>;
        moments?: Array<{ kind: string; label: string; date: string }>;
      };
      setCreated(data.sites ?? []);
      setCreatedMoments(data.moments ?? []);
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
    <DashLayout active="weekend" hideTopbar>
      <div className="pl8" style={{ padding: '20px var(--pl-dash-pad) 32px', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto' }}>
        <PageIntro
          eyebrow="Weekend"
          title={
            <>
              Plan the <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>weekend.</span>
            </>
          }
        />

        {/* Base core banner — the zip's lavender "one core, threaded
            across the weekend" card. Carries the woven base address so
            the host sees exactly what every event inherits. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '18px 22px',
            borderRadius: 16,
            background: 'var(--lavender-bg)',
            border: '1px solid var(--line-soft)',
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <PearloomGlyph size={20} color="var(--lavender-ink)" />
          <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 }}>
            Every event shares one base core — the names, palette, and guest list weave across the whole weekend. Edit once, thread everywhere.
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 12px',
              borderRadius: 999,
              background: 'var(--card)',
              border: '1px solid var(--line)',
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.04em',
              color: 'var(--ink-soft)',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name="link" size={12} color="var(--lavender-ink)" />
            {baseSlug || 'your-names'}
          </span>
        </div>

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
            <h2 style={{ fontFamily: DISPLAY, fontSize: 32, fontWeight: 600, margin: '14px 0 6px', color: 'var(--ink)' }}>
              {created.length} {created.length === 1 ? 'draft' : 'drafts'} <span style={{ fontStyle: 'italic', color: 'var(--sage-deep)' }}>ready.</span>
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 480, margin: '0 auto 18px', lineHeight: 1.55 }}>
              Each one is a private draft, already linked to the others. Open one to make it yours and publish when it&rsquo;s ready —
              once published, guests on any site see a strip pointing to the rest of the weekend.
            </p>
            {createdMoments.length > 0 && (
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 480, margin: '-6px auto 18px', lineHeight: 1.55 }}>
                {createdMoments.map((m) => m.label).join(' · ')} {createdMoments.length === 1 ? 'lives' : 'live'} on the main
                site&rsquo;s schedule — no extra site to manage. Edit them any time from the editor&rsquo;s Itinerary section.
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12, maxWidth: 720, margin: '0 auto' }}>
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
                {/* Phones: 2-up compact cards (plan-2 §2 weekend) —
                    nine full-width anchor cards pushed the basics
                    ~2000px down the page. */}
                <div className="pl8-weekend-anchors" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: 10 }}>
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
                        <div className="pl8-weekend-anchor-blurb" style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 3, lineHeight: 1.4 }}>{a.blurb}</div>
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
                    Events with their own site get their own address on top of this one — {baseSlug || 'your-names'}-bach, {baseSlug || 'your-names'}-rehearsal… Moments share the main address.
                  </div>
                </div>
              </Card>

              {/* ── Step 3 · the events ──────────────────────── */}
              <Card>
                <StepEyebrow n={3} label="Choose the events" hint="Tap to include one. Small moments join the main site’s schedule; trips and dinners can carry their own site and guest list." />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: 10 }}>
                  {arc.events.map((e) => {
                    const on = chosen.has(e.kind);
                    const iso = eventDate(e);
                    const main = e.sluffix === '';
                    return (
                      <div
                        key={e.kind}
                        style={{
                          borderRadius: 12,
                          background: on ? 'var(--sage-tint)' : 'var(--cream-2)',
                          border: on ? '1.5px solid var(--sage-deep)' : main ? '1px solid var(--pl-gold, #C19A4B)' : '1px solid var(--line)',
                          transition: 'border-color var(--pl-dur-fast, 160ms) var(--pl-ease-out, ease), background var(--pl-dur-fast, 160ms) var(--pl-ease-out, ease)',
                        }}
                      >
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleKind(e.kind)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
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
                            <span style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{e.label}</span>
                            {main && (
                              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-gold, #C19A4B)' }}>
                                ★ The day
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
                            {iso && !main && (
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
                        {/* Two tiers (B.1): a moment lives on the main
                            site's schedule; a site gets its own guest
                            list + address. Anchor is always a site. */}
                        {on && !main && (
                          <div
                            role="radiogroup"
                            aria-label={`Where ${e.label} lives`}
                            style={{ display: 'flex', gap: 4, padding: '0 14px 12px' }}
                          >
                            {([
                              ['moment', 'On the main site'],
                              ['site', 'Its own site'],
                            ] as const).map(([m, label]) => {
                              const active = modeFor(e) === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  onClick={() => setModes((prev) => ({ ...prev, [e.kind]: m }))}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    fontFamily: 'inherit',
                                    cursor: 'pointer',
                                    border: active ? '1px solid var(--sage-deep)' : '1px solid var(--line)',
                                    background: active ? 'var(--sage-deep)' : 'var(--card)',
                                    color: active ? '#F5EFE2' : 'var(--ink-soft)',
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* ── The plan — sticky, day-grouped, honest ─────── */}
            <aside className="pl8-weekend-plan" style={{ position: 'sticky', top: 84 }}>
              <Card>
                <div style={eyebrowStyle}>Your weekend</div>
                {plan.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: '4px 0 14px', lineHeight: 1.5 }}>
                    Nothing yet. Choose an event and it lands here, in order.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '4px 0 16px' }}>
                    {dayGroups.map((g) => (
                      <div key={g.key}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, padding: '0 2px' }}>
                          <span style={{ fontFamily: DISPLAY, fontSize: 16, color: 'var(--ink)' }}>{g.day}</span>
                          {g.date && <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--ink-muted)' }}>{g.date}</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {g.items.map(({ def, iso }) => {
                            const main = def.sluffix === '';
                            const moment = modeFor(def) === 'moment';
                            return (
                              <div
                                key={def.kind}
                                style={{
                                  padding: '11px 12px',
                                  borderRadius: 12,
                                  background: 'var(--cream-2)',
                                  border: main ? '1px solid var(--pl-gold, #C19A4B)' : moment ? '1px dashed var(--line)' : '1px solid var(--line-soft)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: 99, flexShrink: 0, background: main ? 'var(--pl-gold, #C19A4B)' : moment ? 'var(--lavender-ink, #6B5A8C)' : 'var(--sage-deep)' }} />
                                  <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.12em', color: 'var(--ink-muted)' }}>
                                    {main ? 'DRAFT' : moment ? 'ON THE MAIN SITE' : 'ITS OWN SITE'}
                                  </span>
                                  {main && <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.06em', color: 'var(--pl-gold, #C19A4B)' }}>★ THE DAY</span>}
                                </div>
                                <div style={{ fontFamily: DISPLAY, fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>{def.label}</div>
                                <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>{iso ? fmtDate(iso) : 'Date follows the big day'}</div>
                              </div>
                            );
                          })}
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
                  {busy
                    ? 'Weaving…'
                    : momentCount > 0
                      ? `Weave ${siteCount} ${siteCount === 1 ? 'site' : 'sites'} + ${momentCount} ${momentCount === 1 ? 'moment' : 'moments'}`
                      : `Weave ${chosen.size} linked ${chosen.size === 1 ? 'site' : 'sites'}`} <Sparkle size={11} />
                </button>
                <div style={{ fontSize: 11, color: error ? 'var(--pl-plum, #7A2D2D)' : 'var(--ink-muted)', marginTop: 8, lineHeight: 1.5 }}>
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
        @media (max-width: 640px) {
          /* 2-up compact anchor cards; the blurb yields to the
             label so the picker fits ~3 rows, not 9 (plan-2 §2). */
          :global(.pl8-weekend-anchors) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          :global(.pl8-weekend-anchor-blurb) {
            display: none;
          }
        }
      `}</style>

      {/* Linked celebrations — the old /dashboard/connections panel,
          folded in (ATELIER-PLAN DR.1): the Weekend page is the one
          home for the events around your event. */}
      <section style={{ padding: '8px var(--pl-dash-pad) 48px', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 4px' }}>
          <span aria-hidden style={{ width: 14, height: 1, background: 'var(--gold, #C19A4B)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            Linked celebrations
          </span>
        </div>
        <DashConnections embedded />
      </section>
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
