'use client';

// Submissions — real /api/event-os/* moderation wiring.
// Merges tribute/advice/memory submissions + song/toast claims +
// activity-vote tallies into a single moderated feed per site.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, EmptyShell, btnInk, btnGhost, btnMini, btnMiniGhost } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { siteDisplayName, useSelectedSite, useUserSites } from './hooks';
import { getEventType } from '@/lib/event-os/event-types';
import { getSubmissionKinds } from '@/lib/event-os/dashboard-presets';

function submissionsBodyFor(occasion?: string | null): string {
  const preset = getEventType(occasion as never)?.rsvpPreset ?? 'wedding';
  switch (preset) {
    case 'memorial':
      return 'Memories and tribute notes land here first. Approve what honors them, tuck anything else away — privately.';
    case 'bachelor':
      return 'Activity votes and toast slot claims come here. Lock the crew in; keep the quiet ones quiet.';
    case 'shower':
      return 'Advice the guests left for the guest of honor — review before it lands on the site.';
    case 'reunion':
      return 'Then-and-now photos, advice, toast signups — review what guests shared.';
    case 'wedding':
    default:
      return 'Photos, toasts, and tribute notes come here first. Approve what fits, tuck away what doesn’t.';
  }
}

type SubKind = 'photo' | 'note' | 'toast' | 'vote';
type SubStatus = 'approved' | 'hidden' | 'flagged';

interface Submission {
  id: string;
  kind: SubKind;
  from: string;
  when: string;
  body: string;
  status: SubStatus;
  blockId?: string;
}

interface TributeEntry {
  id: string;
  blockId: string;
  from: string;
  body: string;
  state: SubStatus;
  at: string;
}

interface ToastClaim {
  id: string;
  blockId: string;
  slotLabel?: string;
  claimedBy: string;
  at: string;
}

function iconFor(k: SubKind) {
  if (k === 'photo') return '◎';
  if (k === 'toast') return '♫';
  if (k === 'vote') return '⚘';
  return '✢';
}

function colorFor(k: SubKind) {
  if (k === 'photo') return PD.olive;
  if (k === 'toast') return PD.plum;
  if (k === 'vote') return PD.gold;
  return PD.terra;
}

function timeAgo(iso: string) {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const h = Math.floor(ms / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h} hr`;
    const d = Math.floor(h / 24);
    if (d < 2) return 'yesterday';
    return `${d} d`;
  } catch {
    return '';
  }
}

export function DashSubmissions() {
  const { site, loading: siteLoading } = useSelectedSite();
  const { sites } = useUserSites();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'approved' | 'flag' | 'all'>('approved');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadAll = useCallback(async (domain: string) => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, toastsRes] = await Promise.all([
        fetch(`/api/event-os/submissions/moderation?siteId=${encodeURIComponent(domain)}`, {
          cache: 'no-store',
        }),
        fetch(`/api/event-os/toasts/moderation?siteId=${encodeURIComponent(domain)}`, {
          cache: 'no-store',
        }),
      ]);
      const [subsData, toastsData] = await Promise.all([
        subsRes.json().catch(() => ({})),
        toastsRes.json().catch(() => ({})),
      ]);

      const tribute: Submission[] = (subsData.entries as TributeEntry[] | undefined ?? []).map((e) => ({
        id: e.id,
        kind: /photo/i.test(e.blockId) ? 'photo' : 'note',
        from: e.from || 'Guest',
        when: timeAgo(e.at),
        body: e.body || '',
        status: e.state,
        blockId: e.blockId,
      }));

      const toasts: Submission[] = (toastsData.claims as ToastClaim[] | undefined ?? []).map((c) => ({
        id: c.id,
        kind: 'toast',
        from: c.claimedBy || 'Guest',
        when: timeAgo(c.at),
        body: c.slotLabel ? `Claimed "${c.slotLabel}" · toast signup` : 'Toast signup claim',
        status: 'approved',
        blockId: c.blockId,
      }));

      setSubs(
        [...tribute, ...toasts].sort(
          (a, b) => (a.when > b.when ? -1 : 1),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!site?.domain) {
      setLoading(false);
      return;
    }
    void loadAll(site.domain);
  }, [site?.domain, loadAll]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, flag: 0, all: subs.length };
    for (const s of subs) {
      if (s.status === 'flagged') c.flag += 1;
      else if (s.status === 'approved') c.approved += 1;
      else c.pending += 1;
    }
    return c;
  }, [subs]);

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (tab === 'all') return true;
      if (tab === 'flag') return s.status === 'flagged';
      if (tab === 'approved') return s.status === 'approved';
      return s.status === 'hidden';
    });
  }, [subs, tab]);

  const submissionsBody = submissionsBodyFor(site?.occasion);
  const relevantKinds = useMemo(() => getSubmissionKinds(site?.occasion), [site?.occasion]);
  const kindLabels = useMemo(() => {
    const m: Partial<Record<string, string>> = {};
    for (const k of relevantKinds) m[k.kind] = k.label;
    return m;
  }, [relevantKinds]);

  const moderate = async (id: string, nextState: SubStatus) => {
    if (!site?.domain) return;
    setPendingId(id);
    const prev = subs;
    setSubs((rows) => rows.map((r) => (r.id === id ? { ...r, status: nextState } : r)));
    try {
      const r = await fetch('/api/event-os/submissions/moderation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, state: nextState }),
      });
      if (!r.ok) throw new Error(`mod ${r.status}`);
    } catch (err) {
      setSubs(prev);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingId(null);
    }
  };

  if (!siteLoading && (!sites || sites.length === 0)) {
    return (
      <DashLayout active="submissions" title="Submissions" subtitle="Create a site first — Pear needs somewhere for submissions to land.">
        <EmptyShell message="Create a site first — Pear needs somewhere for submissions to land." />
      </DashLayout>
    );
  }
  if (!site) {
    return (
      <DashLayout active="submissions" title="Submissions" subtitle="Pick a site from the top-right menu to see its submissions.">
        <EmptyShell message="Pick a site from the top-right menu to see its submissions." />
      </DashLayout>
    );
  }

  const siteName = siteDisplayName(site);

  return (
    <DashLayout
      active="submissions"
      title={
        subs.length > 0 ? (
          <span>
            Friends are{' '}
            <i style={{ color: PD.terra, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              weaving
            </i>{' '}
            the reel.
          </span>
        ) : (
          <span>
            <i style={{ color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              Nothing yet.
            </i>{' '}
            Share the submission link.
          </span>
        )
      }
      subtitle={submissionsBody}
      actions={
        <>
          <button style={btnGhost}>Submission link</button>
          <button style={btnInk} onClick={() => void loadAll(site.domain)}>
            ↻ Refresh
          </button>
        </>
      }
    >

      <main style={{ padding: '20px 40px 60px' }}>
        {error && (
          <Panel
            bg="#F1D7CE"
            style={{ padding: 14, marginBottom: 16, fontSize: 13, color: PD.terra }}
          >
            {error}
          </Panel>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {([
            { k: 'pending', l: `Pending · ${counts.pending}`, c: PD.gold },
            { k: 'approved', l: `Approved · ${counts.approved}`, c: PD.olive },
            { k: 'flag', l: `Flagged · ${counts.flag}`, c: PD.terra },
            { k: 'all', l: `All · ${counts.all}`, c: PD.ink },
          ] as const).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                borderRadius: 999,
                background: tab === t.k ? t.c : 'transparent',
                color: tab === t.k ? PD.paper : PD.ink,
                border: `1px solid ${tab === t.k ? t.c : 'rgba(31,36,24,0.18)'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              {t.l}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: PD.inkSoft, fontSize: 13 }}>
            Threading submissions…
          </div>
        ) : filtered.length === 0 ? (
          <Panel bg={PD.paperCard} style={{ padding: 60, textAlign: 'center' }}>
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
              Nothing to review.
            </div>
            <div style={{ fontSize: 13.5, color: PD.inkSoft, maxWidth: 460, margin: '0 auto', lineHeight: 1.55 }}>
              {(() => {
                const blocks = relevantKinds
                  .map((k) => {
                    if (k.kind === 'tribute') return 'a tribute wall';
                    if (k.kind === 'advice') return 'an advice wall';
                    if (k.kind === 'toast') return 'a toast-signup block';
                    if (k.kind === 'vote') return 'an activity-vote block';
                    return null;
                  })
                  .filter(Boolean) as string[];
                const list =
                  blocks.length === 1
                    ? blocks[0]
                    : blocks.length === 2
                      ? `${blocks[0]} or ${blocks[1]}`
                      : `${blocks.slice(0, -1).join(', ')}, or ${blocks[blocks.length - 1]}`;
                return `Add ${list} to your site and guests can start submitting from the published page.`;
              })()}
            </div>
          </Panel>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {filtered.map((s) => (
              <Panel
                key={s.id}
                bg={s.status === 'flagged' ? '#F1D7CE' : PD.paperCard}
                style={{ padding: 18 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      background: colorFor(s.kind),
                      color: PD.paper,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontFamily: '"Fraunces", Georgia, serif',
                    }}
                  >
                    {iconFor(s.kind)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.from}</div>
                    <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>
                      {s.kind.toUpperCase()} · {s.when}
                    </div>
                  </div>
                  {s.status === 'flagged' && (
                    <span
                      style={{
                        ...MONO_STYLE,
                        fontSize: 9,
                        padding: '4px 9px',
                        borderRadius: 999,
                        background: PD.terra,
                        color: PD.paper,
                      }}
                    >
                      FLAGGED
                    </span>
                  )}
                  {s.status === 'approved' && (
                    <span
                      style={{
                        ...MONO_STYLE,
                        fontSize: 9,
                        padding: '4px 9px',
                        borderRadius: 999,
                        background: PD.olive,
                        color: PD.paper,
                      }}
                    >
                      APPROVED
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: s.kind === 'note' ? 14.5 : 13.5,
                    color: PD.ink,
                    lineHeight: 1.55,
                    fontFamily: s.kind === 'note' ? '"Fraunces", Georgia, serif' : 'var(--pl-font-body)',
                    fontStyle: s.kind === 'note' ? 'italic' : 'normal',
                    fontVariationSettings: s.kind === 'note' ? '"opsz" 144, "SOFT" 80, "WONK" 1' : undefined,
                  }}
                >
                  {s.body || <span style={{ opacity: 0.5 }}>(no text)</span>}
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                  {s.status !== 'approved' && (
                    <button
                      disabled={pendingId === s.id}
                      onClick={() => void moderate(s.id, 'approved')}
                      style={{ ...btnMini, background: PD.ink, color: PD.paper, flex: 1, opacity: pendingId === s.id ? 0.5 : 1 }}
                    >
                      Approve
                    </button>
                  )}
                  {s.status !== 'hidden' && (
                    <button
                      disabled={pendingId === s.id}
                      onClick={() => void moderate(s.id, 'hidden')}
                      style={{ ...btnMiniGhost, opacity: pendingId === s.id ? 0.5 : 1 }}
                    >
                      Hide
                    </button>
                  )}
                  {s.status !== 'flagged' && (
                    <button
                      disabled={pendingId === s.id}
                      onClick={() => void moderate(s.id, 'flagged')}
                      style={{ ...btnMiniGhost, opacity: pendingId === s.id ? 0.5 : 1 }}
                    >
                      Flag
                    </button>
                  )}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </main>
    </DashLayout>
  );
}
