'use client';

// Guests — real /api/guests wiring + RSVP stats derived from
// the guest list client-side.

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Bloom } from '@/components/brand/groove';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, SectionTitle, EmptyShell, btnInk, btnGhost } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { siteDisplayName, useSelectedSite, useUserSites } from './hooks';
import { getEventType } from '@/lib/event-os/event-types';
import { GuestImportDialog } from '@/components/dashboard/GuestImportDialog';

// Occasion-aware copy for the guests page. Falls back to wedding-y
// defaults when an occasion isn't recognised.
function guestCopy(occasion?: string | null) {
  const e = getEventType(occasion as never) ?? null;
  const preset = e?.rsvpPreset ?? 'wedding';
  switch (preset) {
    case 'memorial':
      return {
        topSubtitle: 'Every note of attendance, and memories shared.',
        emptyHint: "Share the site link so family and friends can let you know they're coming.",
        fifthColumn: 'Memory',
        fifthKey: 'note' as const,
        verbComing: 'attending',
        verbQuiet: "haven't replied",
      };
    case 'bachelor':
      return {
        topSubtitle: 'Who’s in, which days, bed prefs, and cost acks.',
        emptyHint: 'Drop the link in the group chat — Pear tracks who’s in.',
        fifthColumn: 'Bed pref',
        fifthKey: 'note' as const,
        verbComing: 'in',
        verbQuiet: 'haven’t replied',
      };
    case 'shower':
      return {
        topSubtitle: 'Who’s coming, who’s bringing what, and any advice shared.',
        emptyHint: 'Share the link — guests can RSVP and leave a note for the guest of honor.',
        fifthColumn: 'Gift',
        fifthKey: 'note' as const,
        verbComing: 'coming',
        verbQuiet: 'still quiet',
      };
    case 'reunion':
      return {
        topSubtitle: 'Every RSVP, by day, with room and t-shirt prefs.',
        emptyHint: 'Share the link with the group chat, and Pear will track replies.',
        fifthColumn: 'T-shirt',
        fifthKey: 'note' as const,
        verbComing: 'in',
        verbQuiet: 'still quiet',
      };
    case 'milestone':
    case 'casual':
      return {
        topSubtitle: 'Every RSVP and note, in one list.',
        emptyHint: 'Share your link, or add guests by hand.',
        fifthColumn: 'Note',
        fifthKey: 'note' as const,
        verbComing: 'coming',
        verbQuiet: 'still quiet',
      };
    case 'cultural':
      return {
        topSubtitle: 'Every RSVP, dietary note, and ceremony tradition tracked.',
        emptyHint: 'Share the link — Pear tracks RSVPs and ceremony preferences.',
        fifthColumn: 'Meal',
        fifthKey: 'meal' as const,
        verbComing: 'coming',
        verbQuiet: 'still quiet',
      };
    case 'wedding':
    default:
      return {
        topSubtitle: 'Every RSVP, meal note, and plus-one recorded.',
        emptyHint: 'Share your invite link, or add guests by hand. Pear will track RSVPs, meals, and accessibility notes as they come in.',
        fifthColumn: 'Meal',
        fifthKey: 'meal' as const,
        verbComing: 'coming',
        verbQuiet: 'still quiet',
      };
  }
}

type RsvpKey = 'yes' | 'no' | 'maybe' | 'pending';

interface ApiGuest {
  id: string;
  name: string;
  email: string | null;
  status: string; // 'pending' | 'attending' | 'declined' | 'maybe'
  plusOne: boolean;
  plusOneName: string | null;
  mealPreference: string | null;
  dietaryRestrictions: string | null;
  message: string | null;
  respondedAt: string | null;
  eventIds: string[];
}

interface Guest {
  id: string;
  n: string;
  em: string;
  party: string;
  rsvp: RsvpKey;
  meal: string;
  note: string;
  tags: string[];
}

const rsvpMap: Record<RsvpKey, { bg: string; fg: string; label: string }> = {
  yes: { bg: '#E6EAC8', fg: PD.oliveDeep, label: 'Yes' },
  no: { bg: '#F1D7CE', fg: PD.plum, label: 'No' },
  maybe: { bg: '#F4E1BC', fg: PD.gold, label: 'Maybe' },
  pending: { bg: '#E6DFC9', fg: '#6A6A56', label: 'Pending' },
};

function normaliseStatus(s: string): RsvpKey {
  const v = s.toLowerCase();
  if (v === 'attending' || v === 'yes' || v === 'confirmed') return 'yes';
  if (v === 'declined' || v === 'no') return 'no';
  if (v === 'maybe' || v === 'tentative') return 'maybe';
  return 'pending';
}

function shapeGuest(g: ApiGuest): Guest {
  const tags: string[] = [];
  if (g.dietaryRestrictions) tags.push('dietary');
  if (g.plusOne) tags.push('plus-one');
  return {
    id: g.id,
    n: g.name,
    em: g.email || '—',
    party: g.plusOne ? `${g.name.split(' ')[0]} + 1${g.plusOneName ? ` (${g.plusOneName})` : ''}` : g.name,
    rsvp: normaliseStatus(g.status),
    meal: g.mealPreference || '—',
    note:
      (g.dietaryRestrictions ? `${g.dietaryRestrictions}. ` : '') + (g.message ?? ''),
    tags,
  };
}

export function DashGuests() {
  const { site, loading: siteLoading } = useSelectedSite();
  const { sites } = useUserSites();
  const [rows, setRows] = useState<Guest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RsvpKey | 'all'>('all');
  const [q, setQ] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!site?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/guests?siteId=${encodeURIComponent(site.id)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { guests?: ApiGuest[] }) => {
        if (cancelled) return;
        setRows((data.guests ?? []).map(shapeGuest));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [site?.id, refreshKey]);

  const counts = useMemo(() => {
    const base = { all: 0, yes: 0, no: 0, maybe: 0, pending: 0 };
    if (!rows) return base;
    base.all = rows.length;
    for (const g of rows) base[g.rsvp] += 1;
    return base;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter(
      (g) =>
        (filter === 'all' || g.rsvp === filter) &&
        (q === '' || (g.n + g.note + g.tags.join(' ')).toLowerCase().includes(q.toLowerCase())),
    );
  }, [rows, filter, q]);

  if (!siteLoading && (!sites || sites.length === 0)) {
    return (
      <DashLayout active="guests" title="Guests" subtitle="Create a site first, then invite guests.">
        <EmptyShell message="Create a site first, then invite guests." />
      </DashLayout>
    );
  }
  if (!site) {
    return (
      <DashLayout active="guests" title="Guests" subtitle="Pick a site from the top-right menu to see its guests.">
        <EmptyShell message="Pick a site from the top-right menu to see its guests." />
      </DashLayout>
    );
  }

  const siteName = siteDisplayName(site);
  const capacity = Math.max(rows?.length ?? 0, counts.yes + counts.pending + counts.maybe, 1);
  const hasGuests = (rows?.length ?? 0) > 0;
  const copy = guestCopy(site?.occasion);

  return (
    <DashLayout
      active="guests"
      title={
        hasGuests ? (
          <span>
            <i style={{ color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              {counts.yes}
            </i>{' '}
            {copy.verbComing},{' '}
            <i style={{ color: PD.gold, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              {counts.maybe}
            </i>{' '}
            maybe,{' '}
            <i style={{ color: PD.plum, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              {counts.pending}
            </i>{' '}
            {copy.verbQuiet}.
          </span>
        ) : (
          <span>
            No guests{' '}
            <i style={{ color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              yet.
            </i>
          </span>
        )
      }
      subtitle={
        <>
          {copy.topSubtitle}
          {siteName ? ` · ${siteName}.` : '.'}
          {site?.occasion === 'memorial' || site?.occasion === 'funeral'
            ? ' Pear checks in quietly — no follow-ups unless you ask.'
            : ' Pear is following up on the quiet ones once a week.'}
        </>
      }
      actions={
        <>
          <button style={btnGhost} onClick={() => setImportOpen(true)}>Import CSV</button>
          <button style={btnInk} onClick={() => setAddOpen(true)} disabled={!site?.id}>
            ✦ Add a guest
          </button>
        </>
      }
    >

      <main
        className="pd-guests-main"
        style={{
          padding: '0 clamp(20px, 4vw, 40px) 32px',
          maxWidth: 1240,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* STATS */}
          <div
            className="pd-guests-stats"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}
          >
            {[
              { l: 'Invited', v: counts.all, c: PD.stone },
              { l: 'Yes', v: counts.yes, c: PD.olive },
              { l: 'Maybe', v: counts.maybe, c: PD.gold },
              { l: 'Pending', v: counts.pending, c: PD.plum },
              { l: 'Declined', v: counts.no, c: PD.terra },
            ].map((s) => (
              <Panel key={s.l} bg={PD.paperCard} style={{ padding: '14px 16px' }}>
                <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 6 }}>
                  {s.l.toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 34,
                      lineHeight: 1,
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {s.v}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 5,
                      background: PD.paper3,
                      borderRadius: 99,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, (s.v / capacity) * 100)}%`,
                        height: '100%',
                        background: s.c,
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>
              </Panel>
            ))}
          </div>

          {/* TABLE */}
          <Panel bg={PD.paper} padding={0} style={{ overflow: 'hidden' }}>
            <div
              style={{
                padding: '12px 14px',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                borderBottom: '1px solid rgba(31,36,24,0.08)',
                flexWrap: 'wrap',
              }}
            >
              {([
                { k: 'all', l: `All · ${counts.all}` },
                { k: 'yes', l: `Yes · ${counts.yes}` },
                { k: 'pending', l: `Pending · ${counts.pending}` },
                { k: 'maybe', l: `Maybe · ${counts.maybe}` },
                { k: 'no', l: `No · ${counts.no}` },
              ] as const).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setFilter(t.k)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    borderRadius: 999,
                    background: filter === t.k ? PD.ink : 'transparent',
                    color: filter === t.k ? PD.paper : PD.ink,
                    border: `1px solid ${filter === t.k ? PD.ink : 'rgba(31,36,24,0.18)'}`,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                  }}
                >
                  {t.l}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: PD.paper3,
                  borderRadius: 999,
                  padding: '5px 12px',
                  border: '1px solid rgba(31,36,24,0.1)',
                }}
              >
                <span style={{ fontSize: 11, opacity: 0.5, fontFamily: '"Fraunces", Georgia, serif' }}>
                  ✦
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, tag, or note"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    width: 200,
                    color: PD.ink,
                  }}
                />
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: PD.inkSoft, fontSize: 13 }}>
                Threading your guest list…
              </div>
            ) : error ? (
              <div style={{ padding: 40, color: PD.terra, fontSize: 13 }}>
                Couldn&rsquo;t load guests: {error}
              </div>
            ) : !hasGuests ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 22,
                    fontStyle: 'italic',
                    color: PD.olive,
                    marginBottom: 10,
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  No guests yet.
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: PD.inkSoft,
                    maxWidth: 420,
                    margin: '0 auto',
                    lineHeight: 1.5,
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  {copy.emptyHint}
                </div>
              </div>
            ) : (
              <div>
                <div
                  className="pd-guests-head"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.3fr 1fr 0.7fr 1.5fr 90px',
                    padding: '10px 18px',
                    background: PD.paper3,
                    borderBottom: '1px solid rgba(31,36,24,0.08)',
                  }}
                >
                  {['Guest', 'Party', 'RSVP', 'Note', copy.fifthColumn].map((h) => (
                    <div key={h} style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>
                      {h.toUpperCase()}
                    </div>
                  ))}
                </div>
                {filtered.map((g, i) => {
                  const r = rsvpMap[g.rsvp];
                  return (
                    <div
                      key={g.id}
                      className="pd-guests-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.3fr 1fr 0.7fr 1.5fr 90px',
                        padding: '14px 18px',
                        borderBottom:
                          i < filtered.length - 1 ? '1px solid rgba(31,36,24,0.06)' : 'none',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 99,
                            background: `hsl(${(i * 47) % 360} 30% 72%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            color: PD.ink,
                            fontFamily: '"Fraunces", Georgia, serif',
                            fontStyle: 'italic',
                          }}
                        >
                          {g.n.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {g.n}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: '#6A6A56',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {g.em}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13 }}>{g.party}</div>
                      <div>
                        <span
                          style={{
                            ...MONO_STYLE,
                            fontSize: 10,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: r.bg,
                            color: r.fg,
                            border: `1px solid ${r.fg}26`,
                          }}
                        >
                          {r.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: PD.inkSoft,
                          lineHeight: 1.4,
                          fontFamily: 'var(--pl-font-body)',
                        }}
                      >
                        {g.note || <span style={{ opacity: 0.3 }}>—</span>}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          textTransform: 'capitalize',
                          color: '#6A6A56',
                        }}
                      >
                        {g.meal}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* RIGHT insights */}
        <div
          className="pd-guests-right"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            position: 'sticky',
            top: 72,
          }}
        >
          <Panel
            bg={PD.ink}
            style={{
              color: PD.paper,
              padding: 22,
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.4 }} aria-hidden>
              <Bloom size={100} color={PD.butter} centerColor={PD.terra} speed={9} />
            </div>
            <div style={{ ...MONO_STYLE, fontSize: 9, color: PD.butter, marginBottom: 6 }}>
              PEAR NOTICED
            </div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 20,
                lineHeight: 1.25,
                fontWeight: 400,
                fontStyle: 'italic',
                marginBottom: 16,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              {counts.pending > 0
                ? `${counts.pending} ${counts.pending === 1 ? 'guest hasn’t' : 'guests haven’t'} responded yet. Want me to send a warm nudge?`
                : counts.yes === 0
                ? 'No RSVPs yet. Want me to send the invitation?'
                : 'Everyone accounted for. Nice.'}
            </div>
          </Panel>

          <Panel bg={PD.paperDeep} style={{ padding: 20 }}>
            <SectionTitle
              eyebrow="SOFT INSIGHTS"
              title="Small things"
              italic="matter."
              accent={PD.gold}
              style={{ marginBottom: 14 }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: 13,
                color: PD.inkSoft,
                lineHeight: 1.5,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              <Insight label="Dietary notes" n={rows?.filter((r) => r.tags.includes('dietary')).length ?? 0} total="guests" />
              <Insight label="Plus-ones confirmed" n={rows?.filter((r) => r.tags.includes('plus-one') && r.rsvp === 'yes').length ?? 0} total="guests" />
              <Insight label="Messages left" n={rows?.filter((r) => r.note.length > 0).length ?? 0} total="notes" />
            </div>
          </Panel>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-guests-main) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-guests-right) {
            position: relative !important;
            top: auto !important;
          }
        }
        @media (max-width: 760px) {
          :global(.pd-guests-stats) {
            grid-template-columns: 1fr 1fr !important;
          }
          :global(.pd-guests-head),
          :global(.pd-guests-row) {
            grid-template-columns: 1fr 0.6fr !important;
          }
          :global(.pd-guests-head) > *:nth-child(n + 3),
          :global(.pd-guests-row) > *:nth-child(n + 3) {
            display: none;
          }
        }
      `}</style>

      {/* CSV import — opens modal, refreshes guest list on close. */}
      <GuestImportDialog
        siteId={site.id}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => setRefreshKey((k) => k + 1)}
      />
      {addOpen && (
        <AddGuestDialog
          siteId={site.id}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </DashLayout>
  );
}

// ── AddGuestDialog ────────────────────────────────────────────
// Lightweight modal that posts to POST /api/guests with the host's
// inputs and asks DashGuests to refresh on success. Kept local to
// the page since the only consumer is this one button — no need
// for a shared primitive yet.
function AddGuestDialog({
  siteId,
  onClose,
  onAdded,
}: {
  siteId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plusOne, setPlusOne] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          name: name.trim(),
          email: email.trim() || undefined,
          plusOne,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Failed (${res.status})`);
      }
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add guest.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add a guest"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.46)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 600,
        padding: 16,
        animation: 'pl-enter-fade-in 200ms ease both',
      }}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          background: PD.paperCard,
          borderRadius: 18,
          padding: '24px 24px 20px',
          boxShadow: '0 28px 60px rgba(14,13,11,0.32)',
          fontFamily: 'var(--pl-font-body)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10,
              letterSpacing: '0.22em',
              color: PD.terra,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Add a guest
          </div>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 24,
              margin: 0,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            One name at a time.
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: PD.inkSoft, lineHeight: 1.5 }}>
            We&apos;ll mark them as pending — Pear can email when you&apos;re ready, or they can RSVP through the link.
          </p>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: PD.ink }}>Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Alex"
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: PD.ink }}>Email <span style={{ color: PD.inkSoft, fontWeight: 400, opacity: 0.7 }}>(optional)</span></span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jordan@example.com"
            style={inputStyle}
          />
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'rgba(31,36,24,0.04)',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={plusOne}
            onChange={(e) => setPlusOne(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: PD.olive }}
          />
          <span style={{ fontSize: 13, color: PD.ink }}>Allow a plus-one</span>
        </label>

        {error && (
          <div
            role="alert"
            style={{
              fontSize: 12,
              color: '#7A2D2D',
              background: 'rgba(122,45,45,0.08)',
              padding: '8px 10px',
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose} style={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={busy} style={{ ...btnInk, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Adding…' : 'Add guest'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: PD.paper,
  border: `1.5px solid ${PD.line}`,
  borderRadius: 10,
  fontSize: 13.5,
  color: PD.ink,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

function Insight({ label, n, total }: { label: string; n: number; total: string }) {
  const style: CSSProperties = { padding: '10px 12px', background: PD.paperCard, borderRadius: 10 };
  return (
    <div style={style}>
      <span style={{ fontWeight: 600 }}>
        {n} {n === 1 ? total.slice(0, -1) : total}
      </span>{' '}
      — {label}
    </div>
  );
}
