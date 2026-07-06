'use client';

// ─────────────────────────────────────────────────────────────
// DashCircle — the HOST-side friend circle (GRAND-PLAN Phase 4).
// The account-holder home for the friend graph: see your circle,
// respond to requests, discover mutual familiar faces, and — the
// growth payoff — drop a friend straight into one of your events'
// split as a participant.
//
// Backed by /api/friends (session-authed; resolves the caller to
// their people-graph id) + /api/split/participants/from-person
// (owner-gated add-to-event). Privacy: opt-in (default off), mutual
// consent, first names only.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, EmptyShell, btnInk, btnMini, btnMiniGhost } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';
import { siteDisplayName, useUserSites, type SiteSummary } from './hooks';

interface CircleState {
  available: boolean;
  optedIn: boolean;
  friends: Array<{ firstName: string; personId?: string }>;
  incoming: Array<{ firstName: string; otherId: string }>;
  candidates: Array<{ firstName: string; personId: string; siteId: string }>;
}

const monoLabel = { ...MONO_STYLE, fontSize: 9, color: PD.terra, marginBottom: 10 } as const;

export function DashCircle() {
  const { sites } = useUserSites();
  const [state, setState] = useState<CircleState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [addFor, setAddFor] = useState<string | null>(null); // personId being added to an event
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch('/api/friends', { cache: 'no-store', signal });
      if (!r.ok) { setState({ available: false, optedIn: false, friends: [], incoming: [], candidates: [] }); return; }
      const d = (await r.json()) as Partial<CircleState>;
      setState({
        available: Boolean(d.available),
        optedIn: Boolean(d.optedIn),
        friends: d.friends ?? [],
        incoming: d.incoming ?? [],
        candidates: d.candidates ?? [],
      });
    } catch { /* leave prior state */ }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  async function post(body: Record<string, unknown>, key: string) {
    if (busy) return;
    setBusy(key);
    setNote(null);
    try {
      const r = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) await load();
    } finally {
      setBusy(null);
    }
  }

  async function addToEvent(personId: string, site: SiteSummary) {
    setBusy(`add:${personId}:${site.id}`);
    setNote(null);
    try {
      const r = await fetch('/api/split/participants/from-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: site.id, personId }),
      });
      const d = (await r.json().catch(() => null)) as { ok?: boolean; added?: boolean } | null;
      setNote(r.ok && d?.ok
        ? (d.added === false ? 'Already in that event.' : `Added to ${siteDisplayName(site)}.`)
        : 'Could not add — is that a group-split event?');
    } catch {
      setNote('Could not add — check your connection.');
    } finally {
      setBusy(null);
      setAddFor(null);
    }
  }

  const chip = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', borderRadius: 999,
    background: PD.paper2, border: `1px solid rgba(31,36,24,0.14)`,
    fontSize: '0.86rem', fontWeight: 600, color: PD.ink,
  } as const;

  return (
    <DashLayout active="circle" hideTopbar>
      <div style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 60px', maxWidth: 1100, margin: '0 auto' }}>
        <PageIntro
          eyebrow="Circle"
          title={<>The people you <span className="display-italic">celebrate with.</span></>}
          style={{ marginBottom: 18 }}
        />
        <div style={{ fontSize: 12.5, color: PD.inkSoft, marginBottom: 4, maxWidth: 560, lineHeight: 1.55 }}>
          First names only, and only when you both opt in — Pearloom&rsquo;s people graph, never a public feed.
        </div>

        {/* Opt-in gate */}
        {state && state.available && !state.optedIn && (
          <Panel style={{ padding: 26, marginTop: 18, textAlign: 'center' }}>
            <div style={{ ...DISPLAY_STYLE, fontSize: 22, fontStyle: 'italic', color: PD.olive, marginBottom: 8 }}>
              Keep your circle?
            </div>
            <div style={{ fontSize: 13.5, color: PD.inkSoft, maxWidth: 460, margin: '0 auto 16px', lineHeight: 1.6 }}>
              Turn this on to keep a quiet, first-names-only connection with people you&rsquo;ve celebrated with — and add
              them to your next event in a tap. Off by default; only mutual opt-ins ever see each other.
            </div>
            <button type="button" style={btnInk} disabled={busy === 'opt'} onClick={() => post({ action: 'opt-in', optIn: true }, 'opt')}>
              Turn on my circle
            </button>
          </Panel>
        )}

        {state && state.available && state.optedIn && (
          <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>
            {/* Incoming requests */}
            {state.incoming.length > 0 && (
              <Panel style={{ padding: 22 }}>
                <div style={monoLabel}>REQUESTS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {state.incoming.map((r) => (
                    <div key={r.otherId} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={chip}>{r.firstName}</span>
                      <span style={{ fontSize: 12.5, color: PD.inkSoft, flex: 1 }}>wants to keep a connection</span>
                      <button type="button" style={btnMini} disabled={!!busy} onClick={() => post({ action: 'accept', otherPersonId: r.otherId }, `acc:${r.otherId}`)}>Accept</button>
                      <button type="button" style={btnMiniGhost} disabled={!!busy} onClick={() => post({ action: 'decline', otherPersonId: r.otherId }, `dec:${r.otherId}`)}>Not now</button>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* Friends + add-to-event */}
            <Panel style={{ padding: 22 }}>
              <div style={monoLabel}>YOUR CIRCLE</div>
              {state.friends.length === 0 ? (
                <div style={{ fontSize: 13, color: PD.inkSoft }}>Nothing yet. Accept a request, or add someone below.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {state.friends.map((f, i) => {
                    const pid = f.personId ?? `f${i}`;
                    return (
                      <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={chip}>{f.firstName}</span>
                        {f.personId && (sites?.length ?? 0) > 0 && (
                          addFor === f.personId ? (
                            <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: 11.5, color: PD.inkSoft }}>add to</span>
                              {(sites ?? []).map((s) => (
                                <button key={s.id} type="button" style={btnMiniGhost} disabled={!!busy}
                                  onClick={() => addToEvent(f.personId!, s)}>
                                  {siteDisplayName(s)}
                                </button>
                              ))}
                              <button type="button" style={btnMiniGhost} onClick={() => setAddFor(null)}>cancel</button>
                            </span>
                          ) : (
                            <button type="button" style={btnMini} disabled={!!busy} onClick={() => { setAddFor(f.personId!); setNote(null); }}>
                              Add to an event
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {note && <div style={{ fontSize: 12.5, color: PD.olive, marginTop: 12 }}>{note}</div>}
            </Panel>

            {/* Discover */}
            {state.candidates.length > 0 && (
              <Panel style={{ padding: 22 }}>
                <div style={monoLabel}>PEOPLE YOU&rsquo;VE CELEBRATED WITH</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {state.candidates.map((c) => (
                    <span key={c.personId} style={{ ...chip, gap: 10 }}>
                      {c.firstName}
                      <button type="button" style={btnMiniGhost} disabled={!!busy}
                        onClick={() => post({ action: 'request', otherPersonId: c.personId, siteId: c.siteId }, `req:${c.personId}`)}>
                        Add as a friend
                      </button>
                    </span>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {state && !state.available && (
          <div style={{ marginTop: 18 }}>
            <EmptyShell message="Your circle grows as you attend celebrations. Once you're a guest somewhere, familiar faces show up here." />
          </div>
        )}
      </div>
    </DashLayout>
  );
}
