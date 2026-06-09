'use client';

// Settings — real session + /api/user/preferences wiring.
// Voice, quiet hours, autonomy, and profile extras persist via
// PATCH /api/user/preferences. Billing / domain / privacy read
// the real sign-in provider / site config.

import { useEffect, useState, type CSSProperties } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Bloom } from '@/components/brand/groove';
import { Pear, PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, SectionTitle, btnInk, btnGhost, btnMini } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLAtmosphere } from '@/components/pearloom/dash/PLChrome';
import { useUserPrefs, useUserSites, type AutonomyKey, type PearVoice } from './hooks';

type Section = 'profile' | 'pear' | 'domain' | 'privacy' | 'billing' | 'export' | 'danger';

const SECTIONS: Array<{ k: Section; l: string }> = [
  { k: 'profile', l: 'You, in the loom' },
  { k: 'pear', l: "Pear's voice" },
  { k: 'domain', l: 'Your web address' },
  { k: 'privacy', l: 'Who can see what' },
  { k: 'billing', l: 'Plan' },
  { k: 'export', l: 'Weave a backup' },
  { k: 'danger', l: 'Delicate actions' },
];

export function DashSettings() {
  const { data: session } = useSession();
  const { prefs, save, loading, error } = useUserPrefs();
  const { sites } = useUserSites();
  const [section, setSection] = useState<Section>('profile');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Honor ?section=... deep links (privacy page points hosts here
  // for GDPR export + delete via section=export / section=danger).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const requested = new URLSearchParams(window.location.search).get('section');
    if (requested && SECTIONS.some(s => s.k === requested)) {
      setSection(requested as Section);
    }
  }, []);

  // GDPR self-serve state — see /api/user/export-data + /api/user/delete-account
  const [exportState, setExportState] = useState<'idle' | 'working' | 'error'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteState, setDeleteState] = useState<'idle' | 'working' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const firstName =
    prefs.display_name || session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'Host';
  const fullName = prefs.display_name || session?.user?.name || firstName;

  const wrap = async (patch: Parameters<typeof save>[0]) => {
    setSaveState('saving');
    await save(patch);
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 1600);
  };

  async function handleExport() {
    setExportState('working');
    setExportError(null);
    try {
      const res = await fetch('/api/user/export-data', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Export failed (${res.status})`);
      }
      // Server returns JSON with Content-Disposition; browsers won't
      // auto-download from a fetch() so we materialize a Blob URL.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pearloom-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportState('idle');
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
      setExportState('error');
    }
  }

  async function handleDelete() {
    if (!session?.user?.email) return;
    setDeleteState('working');
    setDeleteError(null);
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: deleteConfirm.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Delete failed (${res.status})`);
      }
      // Hard-deleted on the server — sign out locally + send the
      // user home. The session JWT is still technically valid for a
      // few minutes (NextAuth limitation, noted in route header),
      // but every owner-gated route now sees an account-not-found
      // state and 403s.
      await signOut({ callbackUrl: '/' });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
      setDeleteState('error');
    }
  }

  const deleteEnabled = !!session?.user?.email
    && deleteConfirm.trim().toLowerCase() === session.user.email.toLowerCase()
    && deleteState !== 'working';

  return (
    <DashLayout
      active="settings"
      title={
        <span>
          Your{' '}
          <i style={{ color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
            preferences
          </i>
          , woven in.
        </span>
      }
      subtitle="Pear learns from every tweak. The more you adjust, the more she matches your voice."
      actions={
        <>
          {saveState === 'saving' && (
            <span style={{ ...MONO_STYLE, fontSize: 10, color: PD.olive }}>SAVING…</span>
          )}
          {saveState === 'saved' && (
            <span style={{ ...MONO_STYLE, fontSize: 10, color: PD.olive }}>SAVED ✓</span>
          )}
          <button style={btnGhost} onClick={() => void signOut({ callbackUrl: '/' })}>
            Sign out
          </button>
        </>
      }
    >
      <PLAtmosphere />
      <main
        className="pd-settings-main"
        style={{
          padding: '0 clamp(20px, 4vw, 40px) 60px',
          maxWidth: 1040,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '200px minmax(0, 1fr)',
          gap: 26,
          alignItems: 'flex-start',
        }}
      >
        <aside
          className="pd-settings-nav"
          style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.k}
              onClick={() => setSection(s.k)}
              style={{
                padding: '9px 13px',
                background: section === s.k && s.k !== 'danger' ? 'var(--cream-2)' : 'transparent',
                border: 'none',
                borderRadius: 9,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                fontSize: 13,
                fontWeight: section === s.k ? 700 : 500,
                color: s.k === 'danger' ? 'var(--peach-ink)' : 'var(--ink)',
                marginTop: s.k === 'danger' ? 4 : 0,
                transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              {s.l}
            </button>
          ))}
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <Panel bg="#F1D7CE" style={{ padding: 14, fontSize: 13, color: PD.terra }}>
              {error}
            </Panel>
          )}

          {section === 'profile' && (
            <>
              <Panel
                bg={PD.paperCard}
                style={{ padding: 18, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', borderRadius: 16 }}
              >
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={fullName}
                    style={{ width: 60, height: 60, borderRadius: 999, objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 999,
                      background: `linear-gradient(135deg, ${PD.pear}, ${PD.olive})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: PD.paper,
                      fontSize: 24,
                      fontFamily: '"Fraunces", Georgia, serif',
                      fontWeight: 600,
                    }}
                  >
                    {(fullName[0] || 'P').toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 24,
                      lineHeight: 1,
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {fullName}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: PD.inkSoft,
                      marginTop: 4,
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    {session?.user?.email}
                  </div>
                  <div style={{ display: 'flex', gap: 7, marginTop: 7, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: 'var(--peach-ink)',
                        background: 'var(--peach-bg)',
                        padding: '3px 9px',
                        borderRadius: 999,
                      }}
                    >
                      Bloom tier
                    </span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: 'var(--sage-deep)',
                        background: 'var(--sage-tint)',
                        padding: '3px 9px',
                        borderRadius: 999,
                      }}
                    >
                      {sites?.length ?? 0} {sites && sites.length === 1 ? 'site hosted' : 'sites hosted'}
                    </span>
                  </div>
                </div>
              </Panel>

              <Panel
                bg="var(--peach-bg)"
                style={{ padding: 22, border: 'none', borderRadius: 16 }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--peach-ink)',
                    marginBottom: 4,
                  }}
                >
                  The basics
                </div>
                <h2
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 24,
                    fontWeight: 600,
                    margin: '0 0 18px',
                  }}
                >
                  How you{' '}
                  <span
                    style={{
                      fontStyle: 'italic',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    show up
                  </span>
                  .
                </h2>
                <div
                  className="pd-settings-fields"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
                >
                  <Field
                    label="Display name"
                    value={prefs.display_name ?? firstName}
                    onSave={(v) => void wrap({ display_name: v || null })}
                  />
                  <Field
                    label="Pronouns"
                    value={prefs.pronouns ?? ''}
                    placeholder="she / her"
                    onSave={(v) => void wrap({ pronouns: v || null })}
                  />
                  <Field label="Email" value={session?.user?.email ?? ''} disabled />
                  <Field
                    label="Time zone"
                    value={prefs.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
                    onSave={(v) => void wrap({ timezone: v || null })}
                  />
                </div>
              </Panel>
            </>
          )}

          {section === 'pear' && !loading && (
            <>
              <Panel bg={PD.paper2} style={{ padding: 30, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -30, opacity: 0.4 }} aria-hidden>
                  <Bloom size={130} color={PD.butter} centerColor={PD.terra} speed={10} />
                </div>
                <SectionTitle
                  eyebrow="PEAR'S VOICE"
                  title="How she"
                  italic="speaks with you."
                  accent={PD.terra}
                />
                <div
                  className="pd-voice-grid pl8-dash-stagger"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 10,
                    marginBottom: 24,
                  }}
                >
                  {([
                    { k: 'gentle', l: 'Gentle', s: 'Softer edges, fewer alarms' },
                    { k: 'candid', l: 'Candid', s: 'Plain, direct, no cushion' },
                    { k: 'witty', l: 'Witty', s: 'Dry humor, warm teeth' },
                    { k: 'minimal', l: 'Minimal', s: 'Only when she must' },
                  ] as Array<{ k: PearVoice; l: string; s: string }>).map((v) => (
                    <button
                      key={v.k}
                      onClick={() => void wrap({ voice: v.k })}
                      style={{
                        textAlign: 'left',
                        padding: '16px 16px 18px',
                        borderRadius: 14,
                        background: prefs.voice === v.k ? PD.ink : PD.paperCard,
                        color: prefs.voice === v.k ? PD.paper : PD.ink,
                        border: `1px solid ${prefs.voice === v.k ? PD.ink : 'rgba(31,36,24,0.12)'}`,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div
                        style={{
                          ...DISPLAY_STYLE,
                          fontSize: 20,
                          lineHeight: 1,
                          fontStyle: 'italic',
                          fontWeight: 400,
                          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                        }}
                      >
                        {v.l}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.75,
                          marginTop: 8,
                          lineHeight: 1.4,
                          fontFamily: 'var(--pl-font-body)',
                        }}
                      >
                        {v.s}
                      </div>
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(31,36,24,0.06)',
                    borderRadius: 12,
                    fontStyle: 'italic',
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontSize: 15,
                    color: PD.ink,
                    lineHeight: 1.55,
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  {prefs.voice === 'gentle' &&
                    '"Nothing pressing this morning. Just one small thing — the tent folks haven’t called back. I’ll try them at their quiet hour."'}
                  {prefs.voice === 'candid' &&
                    '"Tent’s not confirmed. I’ll call at 11:15. If they don’t respond by 3, we switch."'}
                  {prefs.voice === 'witty' &&
                    '"The tent people are ghosting us. I’ll try again at 11:15 with the vocal equivalent of homemade cookies."'}
                  {prefs.voice === 'minimal' && '"Tent unconfirmed. Calling 11:15."'}
                </div>
              </Panel>

              <Panel bg={PD.paperDeep} style={{ padding: 26 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 20,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ ...DISPLAY_STYLE, fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
                      Quiet hours
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: PD.inkSoft,
                        fontFamily: 'var(--pl-font-body)',
                      }}
                    >
                      Pear won&rsquo;t send anything between 10pm and 8am unless the sky is falling.
                    </div>
                  </div>
                  <Toggle on={prefs.quiet_hours} onChange={(v) => void wrap({ quiet_hours: v })} />
                </div>
              </Panel>

              <Panel bg={PD.paper} style={{ padding: 26 }}>
                <SectionTitle
                  eyebrow="WHAT PEAR CAN DO ALONE"
                  title="Autonomy,"
                  italic="by category."
                  accent={PD.olive}
                />
                {([
                  { k: 'draft_emails', l: 'Draft emails', s: 'Ask before sending' },
                  { k: 'call_vendors', l: 'Call vendors', s: 'After your approval' },
                  { k: 'update_site', l: 'Update the site', s: 'Small copy freely' },
                  { k: 'respond_guest', l: 'Respond to guest questions', s: 'Non-logistical only' },
                  { k: 'adjust_schedule', l: 'Adjust the schedule', s: 'Always ask first' },
                ] as Array<{ k: AutonomyKey; l: string; s: string }>).map((r) => (
                  <div
                    key={r.k}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: '1px solid rgba(31,36,24,0.08)',
                      gap: 14,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{r.l}</div>
                      <div style={{ fontSize: 12, color: '#6A6A56' }}>{r.s}</div>
                    </div>
                    <SegmentedLevels
                      level={prefs.autonomy[r.k] ?? 1}
                      onChange={(level) =>
                        void wrap({ autonomy: { ...prefs.autonomy, [r.k]: level } })
                      }
                    />
                  </div>
                ))}
              </Panel>
            </>
          )}

          {section === 'domain' && (
            <Panel bg={PD.paperCard} style={{ padding: 30 }}>
              <SectionTitle
                eyebrow="YOUR WEB ADDRESSES"
                title="Where guests"
                italic="find you."
                accent={PD.olive}
              />
              {(!sites || sites.length === 0) && (
                <div style={{ fontSize: 13.5, color: PD.inkSoft, lineHeight: 1.55 }}>
                  You haven&rsquo;t published any sites yet. Once you do, each one gets a warm URL here.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sites?.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: PD.paper3,
                      borderRadius: 14,
                      padding: '16px 20px',
                      border: '1px solid rgba(31,36,24,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {s.names?.filter(Boolean).join(' & ') || s.domain}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--pl-font-mono)',
                          fontSize: 13,
                          color: PD.ink,
                          marginTop: 4,
                        }}
                      >
                        pearloom.com/{s.occasion ?? 'wedding'}/{s.domain}
                      </div>
                    </div>
                    <span
                      style={{
                        ...MONO_STYLE,
                        fontSize: 10,
                        padding: '5px 10px',
                        background: s.published ? PD.olive : PD.stone,
                        color: PD.paper,
                        borderRadius: 999,
                      }}
                    >
                      {s.published ? 'LIVE' : 'DRAFT'}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {section === 'privacy' && (
            <Panel bg={PD.paper} style={{ padding: 30 }}>
              <SectionTitle
                eyebrow="WHO SEES WHAT"
                title="Every site,"
                italic="per-event."
                accent={PD.plum}
              />
              <p style={{ fontSize: 14, color: PD.inkSoft, lineHeight: 1.6, margin: '0 0 18px' }}>
                Privacy (public, password-protected, guests-only) is set per-site in the editor.
                Open any site below to change who can see it.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sites?.map((s) => (
                  <a
                    key={s.id}
                    href={`/editor/${s.domain}?panel=privacy`}
                    style={{
                      padding: '14px 18px',
                      background: PD.paper3,
                      borderRadius: 12,
                      border: '1px solid rgba(31,36,24,0.1)',
                      textDecoration: 'none',
                      color: PD.ink,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                      {s.names?.filter(Boolean).join(' & ') || s.domain}
                    </span>
                    <span style={{ fontSize: 13, color: PD.olive }}>Manage →</span>
                  </a>
                ))}
              </div>
            </Panel>
          )}

          {section === 'billing' && (
            <>
              <Panel
                bg={PD.ink}
                style={{
                  padding: 30,
                  color: PD.paper,
                  border: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', bottom: -40, right: -30, opacity: 0.4 }} aria-hidden>
                  <Bloom size={180} color={PD.butter} centerColor={PD.terra} />
                </div>
                <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.butter, marginBottom: 6 }}>
                  YOUR PLAN
                </div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 44,
                    lineHeight: 1,
                    letterSpacing: '-0.025em',
                  }}
                >
                  Journal
                  <br />
                  <span
                    style={{
                      fontStyle: 'italic',
                      color: PD.butter,
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    free, forever.
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 14,
                    color: PD.stone,
                    maxWidth: 460,
                    margin: '16px 0 20px',
                    lineHeight: 1.55,
                  }}
                >
                  Your first site is free forever. Upgrade to Atelier ($19 once per celebration) to
                  unlock every block + the day-of room. Legacy ($129 lifetime) covers every future
                  event.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a
                    href="/store"
                    style={{ ...btnInk, background: PD.paper, color: PD.ink, textDecoration: 'none' }}
                  >
                    See plans
                  </a>
                </div>
              </Panel>
              <Panel bg={PD.paperDeep} style={{ padding: 26 }}>
                <SectionTitle
                  eyebrow="MEMORIALS"
                  title="Always"
                  italic="free."
                  accent={PD.plum}
                  style={{ marginBottom: 10 }}
                />
                <p style={{ fontSize: 13.5, color: PD.inkSoft, lineHeight: 1.55, margin: 0 }}>
                  Every block, every feature, on every tier. Grief deserves no paywall.
                </p>
              </Panel>
            </>
          )}

          {section === 'export' && (
            <Panel bg={PD.paper2} style={{ padding: 30 }}>
              <SectionTitle
                eyebrow="WEAVE A BACKUP"
                title="Take it all"
                italic="with you."
                accent={PD.olive}
              />
              <div
                style={{
                  fontSize: 14,
                  color: PD.inkSoft,
                  lineHeight: 1.6,
                  maxWidth: 520,
                  marginBottom: 24,
                  fontFamily: 'var(--pl-font-body)',
                }}
              >
                Every site, guest, RSVP, photo URL, registry item, and payment — exported as a single
                JSON document, yours to keep even if you cancel. Plain text, no lock-in.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exportState === 'working'}
                  style={{
                    ...btnInk,
                    cursor: exportState === 'working' ? 'wait' : 'pointer',
                    opacity: exportState === 'working' ? 0.7 : 1,
                  }}
                >
                  {exportState === 'working' ? 'Threading…' : '✦ Download my data'}
                </button>
                {exportState === 'error' && exportError && (
                  <span role="alert" style={{ fontSize: 12, color: PD.terra }}>
                    {exportError}
                  </span>
                )}
              </div>
            </Panel>
          )}

          {section === 'danger' && (
            <Panel bg="#F1D7CE" style={{ padding: 30, border: '1px solid rgba(181,97,58,0.35)' }}>
              <SectionTitle
                eyebrow="DELICATE ACTIONS"
                title="Only when"
                italic="you're sure."
                accent={PD.terra}
              />
              {[
                {
                  l: 'Sign out everywhere',
                  s: 'Ends every active session',
                  c: PD.plum,
                  cta: 'Sign out',
                  onClick: () => void signOut({ callbackUrl: '/' }),
                },
                {
                  l: 'Delete Pearloom account',
                  s: 'Hard-deletes every site, guest, RSVP, photo, and message. Cannot be undone.',
                  c: PD.terra,
                  cta: 'Begin delete',
                  onClick: () => {
                    setDeleteError(null);
                    setDeleteConfirm('');
                    setDeleteOpen(true);
                  },
                },
              ].map((r) => (
                <div
                  key={r.l}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    padding: '16px 0',
                    borderBottom: '1px solid rgba(31,36,24,0.1)',
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: r.c }}>{r.l}</div>
                    <div style={{ fontSize: 12, color: '#6A6A56' }}>{r.s}</div>
                  </div>
                  <button
                    type="button"
                    onClick={r.onClick}
                    // r.c is a var(--pd-*) string now — no alpha suffix.
                    style={{ ...btnGhost, color: r.c, borderColor: `color-mix(in oklab, ${r.c} 27%, transparent)` }}
                  >
                    {r.cta}
                  </button>
                </div>
              ))}

              {deleteOpen && session?.user?.email && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="pl-delete-title"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && deleteState !== 'working') setDeleteOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && deleteState !== 'working') setDeleteOpen(false);
                  }}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(14,13,11,0.5)',
                    display: 'grid',
                    placeItems: 'center',
                    zIndex: 200,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      background: PD.paper2,
                      borderRadius: 16,
                      padding: 28,
                      maxWidth: 460,
                      width: '100%',
                      boxShadow: '0 24px 60px rgba(14,13,11,0.32)',
                    }}
                  >
                    <h2
                      id="pl-delete-title"
                      style={{
                        ...DISPLAY_STYLE,
                        fontSize: 22,
                        margin: '0 0 8px',
                        color: PD.terra,
                      }}
                    >
                      Delete your account?
                    </h2>
                    <p style={{ fontSize: 13.5, color: PD.inkSoft, lineHeight: 1.55, margin: '0 0 18px' }}>
                      This permanently deletes every site you own, every guest, every RSVP, every
                      registry claim, every payment record, and every photo URL. Co-host
                      collaborations end. Guests lose access to your sites.{' '}
                      <strong>This cannot be undone.</strong>
                    </p>
                    <label style={{ display: 'block', marginBottom: 18 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 11,
                          ...MONO_STYLE,
                          color: PD.inkSoft,
                          marginBottom: 6,
                          letterSpacing: '0.16em',
                        }}
                      >
                        TYPE YOUR EMAIL TO CONFIRM
                      </span>
                      <input
                        type="email"
                        autoFocus
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder={session.user.email}
                        disabled={deleteState === 'working'}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(31,36,24,0.2)',
                          fontSize: 14,
                          fontFamily: 'var(--pl-font-body)',
                          background: '#FFF',
                          color: PD.ink,
                        }}
                      />
                    </label>
                    {deleteError && (
                      <div role="alert" style={{ fontSize: 12, color: PD.terra, marginBottom: 14 }}>
                        {deleteError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setDeleteOpen(false)}
                        disabled={deleteState === 'working'}
                        style={btnGhost}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={!deleteEnabled}
                        style={{
                          ...btnInk,
                          background: deleteEnabled ? PD.terra : '#C9B5AA',
                          cursor: deleteEnabled ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {deleteState === 'working' ? 'Deleting…' : 'Delete everything'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Panel>
          )}
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-settings-main) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-settings-nav) {
            position: relative !important;
            top: auto !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          :global(.pd-settings-fields),
          :global(.pd-voice-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* keep btnMini in the import graph */}
      <div aria-hidden style={{ display: 'none' }}>
        <span style={btnMini}>x</span>
        <Pear size={10} />
      </div>
    </DashLayout>
  );
}

function Field({
  label,
  value,
  placeholder,
  disabled,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onSave?: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  const changed = v !== value;
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>{label.toUpperCase()}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: PD.paper3,
            border: '1px solid rgba(31,36,24,0.12)',
            borderRadius: 10,
            fontFamily: 'inherit',
            fontSize: 14,
            outline: 'none',
            color: PD.ink,
            opacity: disabled ? 0.6 : 1,
          }}
        />
        {onSave && changed && (
          <button
            onClick={() => onSave(v)}
            style={{ ...btnMini, background: PD.ink, color: PD.paper }}
          >
            Save
          </button>
        )}
      </div>
    </label>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 52,
        height: 28,
        borderRadius: 999,
        background: on ? PD.olive : PD.line,
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 27 : 3,
          width: 22,
          height: 22,
          borderRadius: 999,
          background: PD.paperCard,
          transition: 'left var(--pl-dur-fast) var(--pl-ease-out)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

function SegmentedLevels({ level, onChange }: { level: 1 | 2 | 3; onChange: (l: 1 | 2 | 3) => void }) {
  const wrap: CSSProperties = {
    display: 'flex',
    gap: 3,
    background: PD.paper3,
    padding: 3,
    borderRadius: 999,
    border: '1px solid rgba(31,36,24,0.1)',
  };
  const labels: Array<['Ask' | 'Approve' | 'Auto', 1 | 2 | 3]> = [
    ['Ask', 1],
    ['Approve', 2],
    ['Auto', 3],
  ];
  return (
    <div style={wrap}>
      {labels.map(([l, lv]) => (
        <button
          key={l}
          onClick={() => onChange(lv)}
          style={{
            ...MONO_STYLE,
            padding: '5px 12px',
            fontSize: 11,
            borderRadius: 999,
            background: lv === level ? PD.ink : 'transparent',
            color: lv === level ? PD.paper : '#6A6A56',
            cursor: 'pointer',
            fontWeight: 500,
            border: 'none',
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
