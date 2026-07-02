'use client';

// Submissions — real /api/event-os/* moderation wiring.
// Merges tribute/advice/memory submissions + toast claims (and
// guestbook wishes below) into a single moderated feed per site.
// Activity-vote tallies surface in their own read-only panel
// (VotesTally below) — votes are counts, not posts, so they never
// join the moderation feed's approve/hide/flag cards.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, EmptyShell, btnInk, btnMini, btnMiniGhost } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro, HintChip } from '@/components/pearloom/dash/QuietDash';
import { siteDisplayName, useSelectedSite, useUserSites } from './hooks';
import { getEventType } from '@/lib/event-os/event-types';
import { getSubmissionKinds } from '@/lib/event-os/dashboard-presets';
import { nameVotePollWithId, optionIdsFor, votePollsWithIds } from '@/lib/event-os/activity-votes';
import type { StoryManifest } from '@/types';

function submissionsBodyFor(occasion?: string | null): string {
  const preset = getEventType(occasion as never)?.rsvpPreset ?? 'wedding';
  switch (preset) {
    case 'memorial':
      return 'Memories and tribute notes land here first. Approve what honors them, tuck anything else away — privately.';
    case 'bachelor':
      return 'Toast slot claims come here. Lock the crew in; keep the quiet ones quiet.';
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
  /* The moderation endpoint returns the claim's slot INDEX
     (toast_signups.slot_index), not a label. */
  slotIndex?: number;
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
  // null = the host hasn't picked a tab yet; we land them on
  // whichever bucket needs review (flagged first, else approved).
  // Derived at render so the default tracks the loaded data
  // without a setState-in-effect cascade.
  const [tab, setTab] = useState<'approved' | 'hidden' | 'flag' | 'all' | null>(null);
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
        body: typeof c.slotIndex === 'number' ? `Claimed toast slot ${c.slotIndex + 1}` : 'Toast signup claim',
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
    // The three real moderation states — there is no 'pending'.
    // Guest posts land approved (or whatever state the block set)
    // and hosts move them between approved / hidden / flagged.
    const c = { approved: 0, hidden: 0, flag: 0, all: subs.length };
    for (const s of subs) {
      if (s.status === 'flagged') c.flag += 1;
      else if (s.status === 'approved') c.approved += 1;
      else c.hidden += 1;
    }
    return c;
  }, [subs]);

  const activeTab = tab ?? (counts.flag > 0 ? 'flag' : 'approved');

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'flag') return s.status === 'flagged';
      if (activeTab === 'approved') return s.status === 'approved';
      return s.status === 'hidden';
    });
  }, [subs, activeTab]);

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

  /* Void a toast claim so the slot reopens on the published site.
     Toast claims live in toast_signups (not tribute_submissions),
     so they get this instead of approve/hide/flag. Optimistic
     removal, same pattern as GuestbookModeration below. */
  const voidToast = async (id: string) => {
    setPendingId(id);
    const prev = subs;
    setSubs((rows) => rows.filter((r) => r.id !== id));
    try {
      const r = await fetch(`/api/event-os/toasts/moderation?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!r.ok) throw new Error(`void ${r.status}`);
    } catch (err) {
      setSubs(prev);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingId(null);
    }
  };

  // ONE empty state (plan rule 5): the card carries the sentence;
  // the header never restates it.
  if (!siteLoading && (!sites || sites.length === 0)) {
    return (
      <DashLayout active="submissions" hideTopbar>
        <div style={{ padding: '16px clamp(20px, 4vw, 40px) 0', maxWidth: 1240, margin: '0 auto' }}>
          <PageIntro eyebrow="Submissions" title="What guests sent." />
        </div>
        <EmptyShell message="Create a site first — Pear needs somewhere for submissions to land." cta={{ label: 'Create a site →', href: '/wizard/new' }} />
      </DashLayout>
    );
  }
  if (!site) {
    return (
      <DashLayout active="submissions" hideTopbar>
        <div style={{ padding: '16px clamp(20px, 4vw, 40px) 0', maxWidth: 1240, margin: '0 auto' }}>
          <PageIntro eyebrow="Submissions" title="What guests sent." />
        </div>
        <EmptyShell message="Pick a celebration from the sidebar to see its submissions." />
      </DashLayout>
    );
  }

  const siteName = siteDisplayName(site);

  return (
    <DashLayout active="submissions" hideTopbar>
      {/* Quiet header (plan rules 1 + 4): one line + a HintChip
          carrying the occasion-aware "how moderation works" prose.
          The old title restated emptiness — the empty card owns
          that now (rule 5). */}
      <div style={{ padding: '16px clamp(20px, 4vw, 40px) 0', maxWidth: 1240, margin: '0 auto' }}>
        <PageIntro
          eyebrow={siteName ? `Submissions · ${siteName}` : 'Submissions'}
          title="What guests sent."
          meta={
            <HintChip
              storageKey="pl-hint-submissions"
              hint="Approve what fits; hide the rest."
              detail={submissionsBody}
            />
          }
          actions={
            // No standalone submission URL exists — guests submit from
            // the advice/tribute/toast blocks on the published site.
            <button className="pl8-btnfx" style={btnInk} onClick={() => void loadAll(site.domain)}>
              ↻ Refresh
            </button>
          }
          style={{ marginBottom: 16 }}
        />
      </div>

      <main style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto' }}>
        {error && (
          <Panel
            bg="#F1D7CE"
            style={{ padding: 14, marginBottom: 16, fontSize: 13, color: PD.terra }}
          >
            {error}
          </Panel>
        )}

        <div className="pl-hscroll" style={{ gap: 8, marginBottom: 20, paddingBottom: 2 }}>
          {([
            { k: 'approved', l: `Approved · ${counts.approved}`, c: PD.olive },
            { k: 'hidden', l: `Hidden · ${counts.hidden}`, c: PD.gold },
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
                background: activeTab === t.k ? t.c : 'transparent',
                color: activeTab === t.k ? PD.paper : PD.ink,
                border: `1px solid ${activeTab === t.k ? t.c : 'rgba(31,36,24,0.18)'}`,
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
                    // 'vote' deliberately omitted — vote tallies
                    // render in their own VotesTally panel below,
                    // not in this moderation feed.
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
            className="pl8-dash-stagger"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
              gap: 16,
            }}
          >
            {filtered.map((s) => {
              // Toast claims + activity votes live in their own
              // stores (toast_signups / activity_votes) — the
              // tribute-submissions moderation endpoint can't touch
              // them, so approve/hide/flag stays off their cards.
              // Toasts get a "Reopen slot" control (voidToast) wired
              // to DELETE /api/event-os/toasts/moderation instead.
              const moderatable = s.kind !== 'toast' && s.kind !== 'vote';
              return (
              <Panel
                key={s.id}
                bg={s.status === 'flagged' ? '#F1D7CE' : PD.paperCard}
                style={{ padding: 18 }}
                className="pl8-card-lift"
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
                  {moderatable && s.status === 'flagged' && (
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
                  {moderatable && s.status === 'approved' && (
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
                    overflowWrap: 'anywhere',
                    fontFamily: s.kind === 'note' ? '"Fraunces", Georgia, serif' : 'var(--pl-font-body)',
                    fontStyle: s.kind === 'note' ? 'italic' : 'normal',
                    fontVariationSettings: s.kind === 'note' ? '"opsz" 144, "SOFT" 80, "WONK" 1' : undefined,
                  }}
                >
                  {s.body || <span style={{ opacity: 0.5 }}>(no text)</span>}
                </div>

                {moderatable && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                    {s.status !== 'approved' && (
                      <button
                        disabled={pendingId === s.id}
                        onClick={() => void moderate(s.id, 'approved')}
                        className="pl8-btnfx" style={{ ...btnMini, background: PD.ink, color: PD.paper, flex: 1, opacity: pendingId === s.id ? 0.5 : 1 }}
                      >
                        Approve
                      </button>
                    )}
                    {s.status !== 'hidden' && (
                      <button
                        disabled={pendingId === s.id}
                        onClick={() => void moderate(s.id, 'hidden')}
                        className="pl8-btnfx" style={{ ...btnMiniGhost, opacity: pendingId === s.id ? 0.5 : 1 }}
                      >
                        Hide
                      </button>
                    )}
                    {s.status !== 'flagged' && (
                      <button
                        disabled={pendingId === s.id}
                        onClick={() => void moderate(s.id, 'flagged')}
                        className="pl8-btnfx" style={{ ...btnMiniGhost, opacity: pendingId === s.id ? 0.5 : 1 }}
                      >
                        Flag
                      </button>
                    )}
                  </div>
                )}

                {s.kind === 'toast' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                    <button
                      disabled={pendingId === s.id}
                      onClick={() => void voidToast(s.id)}
                      className="pl8-btnfx" style={{ ...btnMiniGhost, opacity: pendingId === s.id ? 0.5 : 1 }}
                    >
                      Reopen slot
                    </button>
                  </div>
                )}
              </Panel>
              );
            })}
          </div>
        )}

        <VotesTally manifest={site.manifest} siteDomain={site.domain} />

        <GuestbookModeration siteId={site.id} />
      </main>
    </DashLayout>
  );
}

// ── Group-vote tally ────────────────────────────────────────────
// Read-only counts for the site's activityVote polls
// (manifest.bachelor.votes). Votes are tallies, not posts — there
// is nothing to approve or hide, so this stays out of the feed
// above. Renders nothing when the site carries no polls. Block +
// option ids come from lib/event-os/activity-votes so they match
// what the published renderer writes.
function VotesTally({ manifest, siteDomain }: { manifest: unknown; siteDomain: string }) {
  // votePollsWithIds assigns tally ids over the renderer's own
  // filtered list (ids can't drift); question-only polls carry no
  // options to tally, so they drop out for display AFTER ids are
  // assigned.
  const polls = useMemo(() => {
    const group = votePollsWithIds(manifest as StoryManifest | null).filter(
      ({ poll }) => (poll.options ?? []).some((o) => o.trim()),
    );
    // The name ballot (manifest.nameVote) tallies through the same
    // backend under its constant block id — surface it alongside.
    const nameBallot = nameVotePollWithId(manifest as StoryManifest | null);
    return nameBallot ? [...group, nameBallot] : group;
  }, [manifest]);
  // The votes table keys site_id by the published slug — the same
  // value the renderer sends (manifest.subdomain, = domain).
  const siteId =
    ((manifest as { subdomain?: string } | null | undefined)?.subdomain ?? '').trim() || siteDomain;
  const [tallies, setTallies] = useState<Record<string, Record<string, number>> | null>(null);

  useEffect(() => {
    if (!siteId || polls.length === 0) return;
    let cancelled = false;
    void Promise.all(
      polls.slice(0, 12).map(async ({ blockId }) => {
        try {
          const r = await fetch(
            `/api/event-os/votes?siteId=${encodeURIComponent(siteId)}&blockId=${encodeURIComponent(blockId)}`,
            { cache: 'no-store' },
          );
          const d = (await r.json().catch(() => null)) as { ok?: boolean; tallies?: Record<string, number> } | null;
          return [blockId, d?.ok ? (d.tallies ?? {}) : {}] as const;
        } catch {
          return [blockId, {} as Record<string, number>] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) setTallies(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [siteId, polls]);

  if (polls.length === 0) return null;

  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.gold, marginBottom: 12 }}>
        GROUP VOTES · {polls.length}
      </div>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 16 }}
      >
        {polls.map(({ poll, blockId }) => {
          const labels = (poll.options ?? []).map((o) => o.trim()).filter(Boolean);
          const ids = optionIdsFor(labels);
          const t = tallies?.[blockId] ?? {};
          const counts = ids.map((id) => t[id] ?? 0);
          const total = counts.reduce((a, b) => a + b, 0);
          const max = counts.length ? Math.max(...counts) : 0;
          return (
            <Panel key={blockId} bg={PD.paperCard} style={{ padding: 18 }}>
              <div
                style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: PD.ink,
                  lineHeight: 1.4,
                  marginBottom: 12,
                  fontFamily: '"Fraunces", Georgia, serif',
                }}
              >
                {poll.question?.trim() || (blockId === 'name-vote' ? 'The name vote' : 'Group vote')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {labels.map((label, i) => {
                  const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
                  const leads = total > 0 && counts[i] === max && max > 0;
                  return (
                    <div key={ids[i]}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, color: PD.ink, fontWeight: leads ? 600 : 400, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {label}
                        </span>
                        <span style={{ ...MONO_STYLE, fontSize: 10, color: PD.inkSoft, flexShrink: 0 }}>
                          {counts[i]}{leads ? ' · leads' : ''}
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: 'rgba(31,36,24,0.08)', overflow: 'hidden' }}>
                        <span
                          style={{
                            display: 'block', height: '100%', borderRadius: 999,
                            width: `${pct}%`,
                            background: leads ? PD.gold : PD.olive,
                            opacity: leads ? 1 : 0.55,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ ...MONO_STYLE, fontSize: 9, color: PD.inkSoft, opacity: 0.7, marginTop: 12 }}>
                {tallies === null
                  ? 'THREADING…'
                  : total === 0
                    ? 'NO VOTES YET — GUESTS VOTE ON THE PUBLISHED SITE'
                    : `${total} VOTE${total === 1 ? '' : 'S'}`}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

// ── Guestbook moderation ────────────────────────────────────────
// The guestbook is a separate store (public.guestbook) from the
// event-os submissions above. Hosts review + remove wishes here.
interface Wish { id: string; guestName: string; message: string; createdAt?: string }

function GuestbookModeration({ siteId }: { siteId: string }) {
  const [wishes, setWishes] = useState<Wish[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/guestbook?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
      const d = (await r.json()) as { wishes?: Wish[] };
      setWishes(d.wishes ?? []);
    } catch {
      setWishes([]);
    }
  }, [siteId]);

  useEffect(() => { void load(); }, [load]);

  const remove = async (id: string) => {
    if (busy) return;
    setBusy(id);
    setWishes((prev) => (prev ?? []).filter((w) => w.id !== id)); // optimistic
    try {
      await fetch(`/api/guestbook?id=${encodeURIComponent(id)}&siteId=${encodeURIComponent(siteId)}`, { method: 'DELETE' });
    } catch {
      void load(); // reconcile on failure
    } finally {
      setBusy(null);
    }
  };

  if (!wishes || wishes.length === 0) return null;

  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.olive, marginBottom: 12 }}>
        GUESTBOOK · {wishes.length}
      </div>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 16 }}
      >
        {wishes.map((w) => (
          <Panel key={w.id} bg={PD.paperCard} style={{ padding: 18 }}>
            <div
              style={{
                fontSize: 14.5,
                color: PD.ink,
                lineHeight: 1.55,
                fontFamily: '"Fraunces", Georgia, serif',
                fontStyle: 'italic',
                marginBottom: 10,
                overflowWrap: 'anywhere',
              }}
            >
              “{w.message}”
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: PD.inkSoft }}>— {w.guestName}</span>
              <button
                type="button"
                disabled={busy === w.id}
                onClick={() => void remove(w.id)}
                className="pl8-btnfx" style={{ ...btnMiniGhost, opacity: busy === w.id ? 0.5 : 1 }}
              >
                Remove
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
