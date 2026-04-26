'use client';

// Day-of room — real /api/announcements + /api/vendors wiring.
// Countdown + milestones derive from site.manifest.logistics.date
// and manifest.schedule. Live pulse shows real announcements.
// Post-an-announcement form writes to the real DB.

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, SectionTitle, EmptyShell, btnInk, btnGhost } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { siteDisplayName, useSelectedSite, useUserSites } from './hooks';

interface Announcement {
  id: string;
  body: string;
  kind: string | null;
  sent_at: string | null;
  scheduled_for: string | null;
  author_email: string | null;
  created_at?: string;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  status: string | null;
  notes: string | null;
}

interface ScheduleItem {
  time: string;
  title: string;
  kind?: string;
}

function parseScheduleFromManifest(m: unknown): ScheduleItem[] {
  if (!m || typeof m !== 'object') return [];
  const mo = m as { schedule?: Array<{ time?: string; title?: string; kind?: string }>; events?: Array<{ time?: string; title?: string }> };
  const raw = mo.schedule ?? mo.events ?? [];
  return raw
    .filter((x): x is { time: string; title: string; kind?: string } =>
      typeof x?.time === 'string' && typeof x?.title === 'string',
    )
    .map((x) => ({ time: x.time, title: x.title, kind: x.kind }));
}

function parseTargetDate(m: unknown): Date | null {
  if (!m || typeof m !== 'object') return null;
  const mo = m as { logistics?: { date?: string } };
  if (!mo.logistics?.date) return null;
  try {
    const d = new Date(mo.logistics.date);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function Countdown({ target, now }: { target: Date; now: Date }) {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  if (days > 0) {
    return (
      <span>
        {days}
        <span style={{ fontSize: 36, opacity: 0.6 }}>d </span>
        {hours}
        <span style={{ opacity: 0.4 }}>:</span>
        {String(mins).padStart(2, '0')}
      </span>
    );
  }
  return (
    <span>
      {String(hours).padStart(1, '0')}
      <span style={{ opacity: 0.4 }}>:</span>
      {String(mins).padStart(2, '0')}
      <span style={{ opacity: 0.4 }}>:</span>
      {String(secs).padStart(2, '0')}
    </span>
  );
}

export function DashDayOf() {
  const { site, loading: siteLoading } = useSelectedSite();
  const { sites } = useUserSites();
  const [now, setNow] = useState(new Date());
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composeValue, setComposeValue] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadAll = useCallback(async () => {
    if (!site?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [ann, ven] = await Promise.all([
        fetch(`/api/announcements?siteId=${encodeURIComponent(site.id)}`, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => ({ announcements: [] })),
        fetch(`/api/vendors?subdomain=${encodeURIComponent(site.domain)}`, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => ({ vendors: [] })),
      ]);
      setAnnouncements((ann.announcements ?? []) as Announcement[]);
      setVendors((ven.vendors ?? []) as Vendor[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [site?.id, site?.domain]);

  useEffect(() => {
    if (site) void loadAll();
    else setLoading(false);
  }, [site, loadAll]);

  const postAnnouncement = useCallback(
    async (body: string) => {
      if (!site?.id || !body.trim()) return;
      setPosting(true);
      try {
        const r = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: site.id, body, kind: 'info' }),
        });
        if (!r.ok) throw new Error(`post ${r.status}`);
        setComposeValue('');
        await loadAll();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setPosting(false);
      }
    },
    [site?.id, loadAll],
  );

  if (!siteLoading && (!sites || sites.length === 0)) {
    return (
      <DashLayout active="timeline" title="Day-of room" subtitle="Create a site first — the day-of room shows up once an event is on the calendar.">
        <EmptyShell message="Create a site first — the day-of room shows up once an event is on the calendar." />
      </DashLayout>
    );
  }
  if (!site) {
    return (
      <DashLayout active="timeline" title="Day-of room" subtitle="Pick a site from the top-right menu to open its day-of room.">
        <EmptyShell message="Pick a site from the top-right menu to open its day-of room." />
      </DashLayout>
    );
  }

  const targetDate = parseTargetDate(site.manifest);
  const schedule = parseScheduleFromManifest(site.manifest);
  const siteName = siteDisplayName(site);

  const daysOut = targetDate
    ? Math.ceil((targetDate.getTime() - now.getTime()) / 86400000)
    : null;
  const isDayOf = targetDate && daysOut !== null && daysOut <= 0 && daysOut > -1;

  // Build milestones from schedule, or fall back to a default arc
  const milestones: Array<{ t: string; title: string; state: 'done' | 'soon' | 'upcoming' }> = useMemo(() => {
    if (schedule.length === 0) {
      return [
        { t: 'Morning', title: 'Prep + arrivals', state: 'upcoming' },
        { t: 'Afternoon', title: 'Ceremony', state: 'upcoming' },
        { t: 'Evening', title: 'Dinner + dance', state: 'upcoming' },
      ];
    }
    return schedule.slice(0, 8).map((s, i) => {
      const nowStr = now.toTimeString().slice(0, 5);
      const state: 'done' | 'soon' | 'upcoming' =
        !isDayOf || s.time > nowStr
          ? i === 0
            ? 'soon'
            : 'upcoming'
          : 'done';
      return { t: s.time, title: s.title, state };
    });
  }, [schedule, now, isDayOf]);

  return (
    <DashLayout
      active="timeline"
      title={
        targetDate ? (
          <span>
            {targetDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
            ,{' '}
            <i style={{ color: PD.terra, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              {targetDate.getFullYear()}
            </i>
          </span>
        ) : (
          <span>
            Set a date to light up the{' '}
            <i style={{ color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              day-of room.
            </i>
          </span>
        )
      }
      subtitle="One source of truth for everyone running today. Announcements push live to guests, vendors stay visible, the schedule updates as the day unfolds."
      actions={
        <>
          {isDayOf && <LiveDot />}
          <button style={btnGhost} onClick={() => void loadAll()}>
            ↻ Refresh
          </button>
        </>
      }
    >

      <main
        className="pd-dayof-main"
        style={{
          padding: '20px 40px 60px',
          display: 'grid',
          gridTemplateColumns: '1.3fr 1fr',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Countdown */}
          <Panel
            bg={PD.ink}
            style={{
              padding: '28px 30px',
              color: PD.paper,
              border: 'none',
              overflow: 'hidden',
              position: 'relative',
              minHeight: 200,
            }}
          >
            <div
              style={{
                ...MONO_STYLE,
                fontSize: 10,
                color: PD.butter,
                marginBottom: 10,
              }}
            >
              {targetDate ? (isDayOf ? 'LIVE' : daysOut && daysOut < 0 ? 'PAST' : 'COUNTDOWN') : 'NO DATE SET'}
            </div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 84,
                lineHeight: 0.9,
                fontWeight: 300,
                letterSpacing: '-0.03em',
              }}
            >
              {targetDate ? <Countdown target={targetDate} now={now} /> : '—'}
            </div>
            <div style={{ marginTop: 18, fontSize: 14, color: PD.stone, fontFamily: 'var(--pl-font-body)' }}>
              {site.venue ?? 'Venue TBD'}
            </div>
          </Panel>

          {/* Schedule */}
          <Panel bg={PD.paperCard} style={{ padding: '26px 28px' }}>
            <SectionTitle
              eyebrow={schedule.length ? `THE DAY · ${schedule.length} BEATS` : 'THE DAY'}
              title="The day,"
              italic="on one thread."
              style={{ marginBottom: 18 }}
            />
            {schedule.length === 0 ? (
              <div style={{ fontSize: 13.5, color: PD.inkSoft, lineHeight: 1.55, maxWidth: 480 }}>
                No schedule set yet. Add a schedule block to your site and the timeline shows up
                here live.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${milestones.length}, 1fr)`,
                  gap: 8,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '4%',
                    right: '4%',
                    top: 16,
                    height: 2,
                    background: PD.line,
                    borderRadius: 99,
                  }}
                />
                {milestones.map((m, i) => (
                  <div key={i} style={{ position: 'relative', textAlign: 'center', zIndex: 2 }}>
                    <div
                      style={{
                        margin: '0 auto 8px',
                        width: m.state === 'soon' ? 20 : 14,
                        height: m.state === 'soon' ? 20 : 14,
                        borderRadius: 99,
                        background:
                          m.state === 'done' ? PD.olive : m.state === 'soon' ? PD.terra : PD.line,
                        border: m.state === 'soon' ? `3px solid ${PD.paperCard}` : 'none',
                        outline: m.state === 'soon' ? `2px solid ${PD.terra}` : 'none',
                        animation:
                          m.state === 'soon' ? 'pl-bloom-breathe 2.4s ease-in-out infinite' : 'none',
                      }}
                    />
                    <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.6 }}>{m.t}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 500, marginTop: 3, lineHeight: 1.2 }}>
                      {m.title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Vendors */}
          <Panel bg={PD.paper3} style={{ padding: 26 }}>
            <SectionTitle
              eyebrow={`VENDORS${vendors ? ` · ${vendors.length}` : ''}`}
              title="Crews"
              italic="booked."
              accent={PD.olive}
            />
            {vendors === null ? (
              <div style={{ fontSize: 13, color: PD.inkSoft }}>Threading vendors…</div>
            ) : vendors.length === 0 ? (
              <div style={{ fontSize: 13.5, color: PD.inkSoft, lineHeight: 1.55 }}>
                No vendors recorded yet. Add them in the editor&rsquo;s Vendors panel and they
                surface here with live status on the day of.
              </div>
            ) : (
              <div
                className="pd-dayof-vendors"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}
              >
                {vendors.map((v) => {
                  const status = (v.status ?? 'booked').toLowerCase();
                  const color =
                    status === 'booked' || status === 'confirmed' || status === 'done'
                      ? PD.olive
                      : status === 'waiting' || status === 'pending'
                      ? PD.gold
                      : PD.stone;
                  return (
                    <div
                      key={v.id}
                      style={{
                        padding: '12px 14px',
                        background: PD.paperCard,
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        border: '1px solid rgba(31,36,24,0.08)',
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 99,
                          background: color,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {v.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#6A6A56', textTransform: 'capitalize' }}>
                          {v.category || 'vendor'}
                          {v.status ? ` · ${v.status}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* RIGHT — live pulse */}
        <div
          className="pd-dayof-right"
          style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 72 }}
        >
          <Panel bg={PD.paper} style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(31,36,24,0.08)',
              }}
            >
              <div style={{ ...DISPLAY_STYLE, fontSize: 18, letterSpacing: '-0.015em' }}>Live pulse</div>
              {isDayOf && <LiveDot />}
            </div>
            <div style={{ padding: '10px 0', maxHeight: 360, overflowY: 'auto' }}>
              {loading && !announcements ? (
                <div style={{ padding: 20, color: PD.inkSoft, fontSize: 13, textAlign: 'center' }}>
                  Loading pulse…
                </div>
              ) : (announcements ?? []).length === 0 ? (
                <div style={{ padding: 24, color: PD.inkSoft, fontSize: 13, textAlign: 'center' }}>
                  Nothing posted yet. Post the first note below — it pushes live to every guest on
                  the site.
                </div>
              ) : (
                (announcements ?? []).map((a, i, arr) => {
                  const t = a.sent_at ?? a.scheduled_for ?? a.created_at;
                  return (
                    <div
                      key={a.id}
                      style={{
                        padding: '10px 20px',
                        display: 'flex',
                        gap: 12,
                        borderBottom: i < arr.length - 1 ? '1px solid rgba(31,36,24,0.06)' : 'none',
                      }}
                    >
                      <div
                        style={{
                          ...MONO_STYLE,
                          fontSize: 9,
                          opacity: 0.5,
                          width: 58,
                          flexShrink: 0,
                          paddingTop: 3,
                        }}
                      >
                        {t ? new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'draft'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          {a.author_email?.split('@')[0] ?? 'Host'}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: PD.inkSoft,
                            lineHeight: 1.5,
                            marginTop: 2,
                            fontFamily: 'var(--pl-font-body)',
                          }}
                        >
                          {a.body}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ padding: '12px 16px', background: PD.paper3, borderTop: '1px solid rgba(31,36,24,0.08)' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void postAnnouncement(composeValue);
                }}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  background: PD.paperCard,
                  border: '1px solid rgba(31,36,24,0.12)',
                  borderRadius: 12,
                  padding: '6px 8px 6px 12px',
                }}
              >
                <input
                  value={composeValue}
                  onChange={(e) => setComposeValue(e.target.value)}
                  placeholder="Say something to the whole room..."
                  disabled={posting}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    padding: '6px 0',
                    color: PD.ink,
                  }}
                />
                <button
                  type="submit"
                  disabled={posting || !composeValue.trim()}
                  style={{
                    background: PD.ink,
                    color: PD.paper,
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    cursor: posting || !composeValue.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: posting || !composeValue.trim() ? 0.5 : 1,
                  }}
                >
                  Post
                </button>
              </form>
              {error && (
                <div style={{ marginTop: 6, fontSize: 11, color: PD.terra }}>{error}</div>
              )}
            </div>
          </Panel>

          <Panel bg={PD.paper2} style={{ padding: 22 }}>
            <SectionTitle
              eyebrow="QUICK THROWS"
              title="Drafts,"
              italic="one tap away."
              accent={PD.terra}
            />
            <div
              className="pd-dayof-throws"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
            >
              {[
                'Doors open in 30',
                'Shuttle running 10 late',
                'Cocktails moved to the lawn',
                'First dance in 5',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => void postAnnouncement(q)}
                  disabled={posting}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    fontSize: 12.5,
                    background: PD.paperCard,
                    border: '1px solid rgba(31,36,24,0.12)',
                    borderRadius: 12,
                    cursor: posting ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    color: PD.ink,
                    opacity: posting ? 0.5 : 1,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-dayof-main) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-dayof-right) {
            position: relative !important;
            top: auto !important;
          }
        }
        @media (max-width: 760px) {
          :global(.pd-dayof-vendors),
          :global(.pd-dayof-throws) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashLayout>
  );
}

function LiveDot() {
  const style: CSSProperties = {
    ...MONO_STYLE,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    color: PD.terra,
  };
  return (
    <span style={style}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: PD.terra,
          animation: 'pl-bloom-breathe 1.6s ease-in-out infinite',
        }}
      />
      LIVE
    </span>
  );
}

// keep btnInk used
void btnInk;
