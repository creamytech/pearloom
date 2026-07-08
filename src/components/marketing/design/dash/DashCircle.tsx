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
  outgoing: Array<{ firstName: string; otherId: string }>;
  candidates: Array<{ firstName: string; personId: string; siteId: string }>;
}

interface PersonCardData {
  firstName: string;
  sharedCelebrations: Array<{ label: string; occasion: string | null }>;
  dietary: string | null;
}

const monoLabel = { ...MONO_STYLE, fontSize: 9, color: PD.terra, marginBottom: 10 } as const;

export function DashCircle() {
  const { sites } = useUserSites();
  const [state, setState] = useState<CircleState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [addFor, setAddFor] = useState<string | null>(null); // personId being added to an event
  const [note, setNote] = useState<string | null>(null);
  /* Invite someone new — pre-event, by email (SOCIAL-PLAN S1). */
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invNote, setInvNote] = useState<string | null>(null);
  /* The person card — one open at a time, fetched on demand. */
  const [cardFor, setCardFor] = useState<string | null>(null);
  const [card, setCard] = useState<PersonCardData | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch('/api/friends', { cache: 'no-store', signal });
      if (!r.ok) { setState({ available: false, optedIn: false, friends: [], incoming: [], outgoing: [], candidates: [] }); return; }
      const d = (await r.json()) as Partial<CircleState>;
      setState({
        available: Boolean(d.available),
        optedIn: Boolean(d.optedIn),
        friends: d.friends ?? [],
        incoming: d.incoming ?? [],
        outgoing: d.outgoing ?? [],
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

  async function invite() {
    if (busy || !invEmail.trim()) return;
    setBusy('invite');
    setInvNote(null);
    try {
      const r = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite', email: invEmail.trim(), name: invName.trim() || undefined }),
      });
      const d = (await r.json().catch(() => null)) as { ok?: boolean; error?: string; status?: { status?: string } } | null;
      if (r.ok && d?.ok) {
        setInvNote(invName.trim()
          ? `Woven in — ${invName.trim().split(/\s+/)[0]} will see your invitation when they first sign in.`
          : 'Woven in — they’ll see your invitation when they first sign in.');
        setInvName('');
        setInvEmail('');
        await load();
      } else {
        setInvNote(d?.error ?? 'Could not send the invitation.');
      }
    } catch {
      setInvNote('Could not send — check your connection.');
    } finally {
      setBusy(null);
    }
  }

  async function openCard(personId: string) {
    if (cardFor === personId) { setCardFor(null); setCard(null); return; }
    setCardFor(personId);
    setCard(null);
    try {
      const r = await fetch(`/api/friends/person?personId=${encodeURIComponent(personId)}`, { cache: 'no-store' });
      const d = (await r.json().catch(() => null)) as { ok?: boolean; card?: PersonCardData } | null;
      if (r.ok && d?.ok && d.card) setCard(d.card);
      else setCardFor(null);
    } catch {
      setCardFor(null);
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
                <div style={{ fontSize: 13, color: PD.inkSoft }}>Nothing yet. Accept a request, or invite someone below.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {state.friends.map((f, i) => {
                    const pid = f.personId ?? `f${i}`;
                    return (
                      <div key={pid}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          {f.personId ? (
                            <button
                              type="button"
                              title="Open their card"
                              onClick={() => void openCard(f.personId!)}
                              style={{ ...chip, cursor: 'pointer', borderColor: cardFor === f.personId ? PD.olive : 'rgba(31,36,24,0.14)' }}
                            >
                              {f.firstName}
                            </button>
                          ) : (
                            <span style={chip}>{f.firstName}</span>
                          )}
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
                        {/* The person card — first name, shared published
                            celebrations, known dietary. Mutual-only; the
                            API re-verifies consent server-side. */}
                        {cardFor === f.personId && (
                          <div
                            style={{
                              marginTop: 10, padding: '12px 14px', borderRadius: 12,
                              background: PD.paper2, border: '1px solid rgba(31,36,24,0.10)',
                              maxWidth: 480,
                            }}
                          >
                            {!card ? (
                              <div style={{ fontSize: 12.5, color: PD.inkSoft }}>Threading…</div>
                            ) : (
                              <div style={{ display: 'grid', gap: 8 }}>
                                <div style={{ ...DISPLAY_STYLE, fontStyle: 'italic', fontSize: 18, color: PD.ink }}>
                                  {card.firstName}
                                </div>
                                {card.sharedCelebrations.length > 0 ? (
                                  <div>
                                    <div style={{ ...MONO_STYLE, fontSize: 8.5, color: PD.terra, marginBottom: 5 }}>CELEBRATED TOGETHER</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                      {card.sharedCelebrations.map((c) => (
                                        <span key={c.label} style={{ fontSize: 12, color: PD.inkSoft, padding: '3px 9px', borderRadius: 999, border: '1px solid rgba(31,36,24,0.12)' }}>
                                          {c.label}{c.occasion ? ` · ${c.occasion}` : ''}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 12, color: PD.inkSoft, fontStyle: 'italic' }}>
                                    No shared celebrations yet — the next one starts the story.
                                  </div>
                                )}
                                {card.dietary && (
                                  <div style={{ fontSize: 12, color: PD.inkSoft }}>
                                    <span style={{ ...MONO_STYLE, fontSize: 8.5, color: PD.terra, marginRight: 6 }}>DIETARY</span>
                                    {card.dietary}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {note && <div style={{ fontSize: 12.5, color: PD.olive, marginTop: 12 }}>{note}</div>}
            </Panel>

            {/* Waiting on — invitations + requests the host sent. */}
            {state.outgoing.length > 0 && (
              <Panel style={{ padding: 22 }}>
                <div style={monoLabel}>WAITING ON</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {state.outgoing.map((o) => (
                    <span key={o.otherId} style={{ ...chip, opacity: 0.75 }}>
                      {o.firstName}
                      <span style={{ fontSize: 11, color: PD.inkSoft, fontWeight: 500 }}>· invited</span>
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: PD.inkSoft, marginTop: 10 }}>
                  They&rsquo;ll see your invitation the first time they sign in to Pearloom.
                </div>
              </Panel>
            )}

            {/* Invite someone new — pre-event, by email. The circle
                no longer waits for a shared celebration (S1). */}
            <Panel style={{ padding: 22 }}>
              <div style={monoLabel}>INVITE SOMEONE NEW</div>
              <div style={{ fontSize: 12.5, color: PD.inkSoft, marginBottom: 12, maxWidth: 480, lineHeight: 1.55 }}>
                Someone you&rsquo;ll celebrate with — no event required yet. They join your circle when they accept.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="First name (optional)"
                  style={{
                    padding: '9px 12px', borderRadius: 10, fontSize: 13, width: 160,
                    border: '1px solid rgba(31,36,24,0.16)', background: PD.paper2, color: PD.ink,
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <input
                  type="email"
                  value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void invite(); }}
                  placeholder="their@email.com"
                  style={{
                    padding: '9px 12px', borderRadius: 10, fontSize: 13, width: 220,
                    border: '1px solid rgba(31,36,24,0.16)', background: PD.paper2, color: PD.ink,
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button type="button" style={btnInk} disabled={busy === 'invite' || !invEmail.trim()} onClick={() => void invite()}>
                  {busy === 'invite' ? 'Weaving…' : 'Weave them in'}
                </button>
              </div>
              {invNote && <div style={{ fontSize: 12.5, color: PD.olive, marginTop: 10 }}>{invNote}</div>}
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
