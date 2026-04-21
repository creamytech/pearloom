'use client';

// Settings — warm, editorial, not a form-dump.

import { useState, type CSSProperties } from 'react';
import { Bloom } from '@/components/brand/groove';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, SectionTitle, btnInk, btnGhost, btnMini } from './DashShell';

type Section = 'profile' | 'pear' | 'domain' | 'privacy' | 'billing' | 'export' | 'danger';
type Voice = 'gentle' | 'candid' | 'witty' | 'minimal';

const SECTIONS: Array<{ k: Section; l: string }> = [
  { k: 'profile', l: 'You, in the loom' },
  { k: 'pear', l: "Pear's voice" },
  { k: 'domain', l: 'Your web address' },
  { k: 'privacy', l: 'Who can see what' },
  { k: 'billing', l: 'Plan + pear credits' },
  { k: 'export', l: 'Weave a backup' },
  { k: 'danger', l: 'Delicate actions' },
];

export function DashSettings() {
  const [section, setSection] = useState<Section>('profile');
  const [voice, setVoice] = useState<Voice>('gentle');
  const [quiet, setQuiet] = useState(true);
  const [domain, setDomain] = useState('santos-kim');

  return (
    <DashShell>
      <Topbar
        subtitle="SETTINGS"
        title={
          <span>
            Your{' '}
            <span style={{ fontStyle: 'italic', color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              preferences
            </span>
            , woven in.
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnGhost}>Billing history</button>
            <button style={btnInk}>Save changes</button>
          </div>
        }
      >
        Pear learns from every tweak. The more you adjust, the more she matches your voice.
      </Topbar>

      <main
        className="pd-settings-main"
        style={{
          padding: '20px 40px 60px',
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 28,
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
                padding: '10px 14px',
                background: section === s.k ? PD.paper2 : 'transparent',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                fontSize: 14,
                fontWeight: section === s.k ? 600 : 500,
                color: s.k === 'danger' ? PD.terra : PD.ink,
              }}
            >
              {s.l}
            </button>
          ))}
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {section === 'profile' && (
            <>
              <Panel bg={PD.paperCard} style={{ padding: 32, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 999,
                    background: `linear-gradient(135deg, ${PD.pear}, ${PD.olive})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: PD.paper,
                    fontSize: 40,
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontStyle: 'italic',
                  }}
                >
                  S
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 32,
                      lineHeight: 1,
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Scott Santos-Kim
                  </div>
                  <div style={{ fontSize: 14, color: PD.inkSoft, marginTop: 6, fontFamily: 'var(--pl-font-body)' }}>
                    scott@santos-kim.co · member since March 2026
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        ...MONO_STYLE,
                        fontSize: 9,
                        padding: '4px 10px',
                        background: PD.butter,
                        color: PD.oliveDeep,
                        borderRadius: 999,
                      }}
                    >
                      LOOM TIER
                    </span>
                    <span
                      style={{
                        ...MONO_STYLE,
                        fontSize: 9,
                        padding: '4px 10px',
                        background: PD.paper3,
                        border: '1px solid rgba(31,36,24,0.12)',
                        borderRadius: 999,
                      }}
                    >
                      4 EVENTS HOSTED
                    </span>
                  </div>
                </div>
                <button style={btnGhost}>Change photo</button>
              </Panel>

              <Panel bg={PD.paper} style={{ padding: 28 }}>
                <SectionTitle eyebrow="THE BASICS" title="How you" italic="show up." />
                <div
                  className="pd-settings-fields"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
                >
                  <Field label="Display name" value="Scott" />
                  <Field label="Pronouns" value="he / him" />
                  <Field label="Email" value="scott@santos-kim.co" />
                  <Field label="Time zone" value="Mountain · Boise" />
                </div>
              </Panel>
            </>
          )}

          {section === 'pear' && (
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
                  className="pd-voice-grid"
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
                  ] as const).map((v) => (
                    <button
                      key={v.k}
                      onClick={() => setVoice(v.k)}
                      style={{
                        textAlign: 'left',
                        padding: '16px 16px 18px',
                        borderRadius: 14,
                        background: voice === v.k ? PD.ink : PD.paperCard,
                        color: voice === v.k ? PD.paper : PD.ink,
                        border: `1px solid ${voice === v.k ? PD.ink : 'rgba(31,36,24,0.12)'}`,
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
                  {voice === 'gentle' && '"Nothing pressing this morning. Just one small thing — the tent folks haven\'t called back. I\'ll try them at their quiet hour."'}
                  {voice === 'candid' && '"Tent\'s not confirmed. I\'ll call at 11:15. If they don\'t respond by 3, we switch."'}
                  {voice === 'witty' && '"The tent people are ghosting us. I\'ll try again at 11:15 with the vocal equivalent of homemade cookies."'}
                  {voice === 'minimal' && '"Tent unconfirmed. Calling 11:15."'}
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
                    <div style={{ fontSize: 13, color: PD.inkSoft, fontFamily: 'var(--pl-font-body)' }}>
                      Pear won&rsquo;t send anything between 10pm and 8am unless the sky is falling.
                    </div>
                  </div>
                  <Toggle on={quiet} onChange={setQuiet} />
                </div>
              </Panel>

              <Panel bg={PD.paper} style={{ padding: 26 }}>
                <SectionTitle
                  eyebrow="WHAT PEAR CAN DO ALONE"
                  title="Autonomy,"
                  italic="by category."
                  accent={PD.olive}
                />
                {[
                  { l: 'Draft emails',              s: 'Ask before sending',   level: 2 },
                  { l: 'Call vendors',              s: 'After your approval',  level: 1 },
                  { l: 'Update the site',           s: 'Small copy freely',    level: 3 },
                  { l: 'Respond to guest questions', s: 'Non-logistical only', level: 2 },
                  { l: 'Adjust the schedule',       s: 'Always ask first',     level: 1 },
                ].map((r) => (
                  <div
                    key={r.l}
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
                    <SegmentedLevels level={r.level} />
                  </div>
                ))}
              </Panel>
            </>
          )}

          {section === 'domain' && (
            <Panel bg={PD.paperCard} style={{ padding: 30 }}>
              <SectionTitle
                eyebrow="YOUR WEB ADDRESS"
                title="Where they"
                italic="find you."
                accent={PD.olive}
              />
              <div
                style={{
                  background: PD.paper3,
                  borderRadius: 14,
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                  border: '1px solid rgba(31,36,24,0.12)',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    color: '#6A6A56',
                    fontFamily: 'var(--pl-font-mono)',
                  }}
                >
                  pearloom.co/
                </span>
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: 18,
                    fontFamily: 'var(--pl-font-mono)',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: PD.ink,
                    fontWeight: 500,
                    minWidth: 120,
                  }}
                />
                <span
                  style={{
                    ...MONO_STYLE,
                    fontSize: 10,
                    padding: '5px 10px',
                    background: PD.olive,
                    color: PD.paper,
                    borderRadius: 999,
                  }}
                >
                  AVAILABLE
                </span>
              </div>
              <div
                style={{
                  marginTop: 24,
                  padding: '18px 22px',
                  background: PD.paper2,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px dashed rgba(31,36,24,0.2)',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Bring your own domain</div>
                  <div style={{ fontSize: 12.5, color: '#6A6A56', marginTop: 3 }}>
                    Point santosandkim.com here. Free on Loom tier.
                  </div>
                </div>
                <button style={btnGhost}>Connect →</button>
              </div>
            </Panel>
          )}

          {section === 'privacy' && (
            <Panel bg={PD.paper} style={{ padding: 30 }}>
              <SectionTitle
                eyebrow="WHO SEES WHAT"
                title="Three"
                italic="circles."
                accent={PD.plum}
              />
              {[
                {
                  l: 'The whole internet',
                  s: 'Search engines, anyone with the link',
                  on: false,
                  c: PD.terra,
                },
                {
                  l: 'Anyone with the password',
                  s: 'Current: rooted-peach-3-cinnamon',
                  on: true,
                  c: PD.gold,
                },
                {
                  l: 'Just invited guests',
                  s: '138 people, verified by email',
                  on: false,
                  c: PD.olive,
                },
              ].map((r) => (
                <div
                  key={r.l}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '20px 1fr auto',
                    gap: 14,
                    alignItems: 'center',
                    padding: '16px 0',
                    borderBottom: '1px solid rgba(31,36,24,0.08)',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 99,
                      background: r.on ? r.c : 'transparent',
                      border: `2px solid ${r.c}`,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{r.l}</div>
                    <div style={{ fontSize: 12, color: '#6A6A56' }}>{r.s}</div>
                  </div>
                  <span
                    style={{
                      ...MONO_STYLE,
                      fontSize: 9,
                      padding: '4px 9px',
                      borderRadius: 999,
                      background: r.on ? r.c : 'rgba(31,36,24,0.06)',
                      color: r.on ? PD.paper : '#6A6A56',
                    }}
                  >
                    {r.on ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              ))}
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
                  LOOM TIER · $18/MO
                </div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 44,
                    lineHeight: 1,
                    letterSpacing: '-0.025em',
                  }}
                >
                  Unlimited events.
                  <br />
                  <span
                    style={{
                      fontStyle: 'italic',
                      color: PD.butter,
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    Unlimited memories.
                  </span>
                </div>
                <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button style={{ ...btnInk, background: PD.paper, color: PD.ink }}>
                    Change plan
                  </button>
                  <button
                    style={{
                      ...btnGhost,
                      color: PD.paper,
                      borderColor: 'rgba(244,236,216,0.22)',
                    }}
                  >
                    Update card · ··· 4204
                  </button>
                </div>
              </Panel>
              <Panel bg={PD.paperDeep} style={{ padding: 26 }}>
                <SectionTitle
                  eyebrow="PEAR CREDITS"
                  title="13 of 15"
                  italic="left this month."
                  accent={PD.gold}
                />
                <div
                  style={{
                    height: 14,
                    background: PD.paper3,
                    borderRadius: 99,
                    overflow: 'hidden',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: '87%',
                      height: '100%',
                      background: `linear-gradient(90deg, ${PD.olive}, ${PD.gold})`,
                      borderRadius: 99,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                    color: PD.inkSoft,
                    fontFamily: 'var(--pl-font-body)',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <span>Resets in 18 days</span>
                  <button style={{ ...btnMini, background: PD.gold, color: PD.paper }}>
                    Top up · +5 for $8
                  </button>
                </div>
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
                Every photo, guest, thread, and message. Exported as a single archive, yours forever even
                if you cancel. No lock-in.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button style={btnInk}>✦ Generate archive (~92 MB)</button>
                <button style={btnGhost}>Email me instead</button>
              </div>
            </Panel>
          )}

          {section === 'danger' && (
            <Panel
              bg="#F1D7CE"
              style={{ padding: 30, border: '1px solid rgba(181,97,58,0.35)' }}
            >
              <SectionTitle
                eyebrow="DELICATE ACTIONS"
                title="Only when"
                italic="you're sure."
                accent={PD.terra}
              />
              {[
                { l: 'Archive this event', s: 'Hides the site but keeps the weave', c: PD.gold },
                { l: 'Transfer ownership', s: 'Hand the loom to someone else', c: PD.plum },
                {
                  l: 'Delete Pearloom account',
                  s: 'Removes every event, every thread, every photo',
                  c: PD.terra,
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
                    style={{
                      ...btnGhost,
                      color: r.c,
                      borderColor: `${r.c}44`,
                    }}
                  >
                    Proceed
                  </button>
                </div>
              ))}
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
    </DashShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>{label.toUpperCase()}</span>
      <input
        defaultValue={value}
        style={{
          padding: '10px 14px',
          background: PD.paper3,
          border: '1px solid rgba(31,36,24,0.12)',
          borderRadius: 10,
          fontFamily: 'inherit',
          fontSize: 14,
          outline: 'none',
          color: PD.ink,
        }}
      />
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
        transition: 'background 180ms',
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
          transition: 'left 180ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

function SegmentedLevels({ level }: { level: number }) {
  const wrap: CSSProperties = {
    display: 'flex',
    gap: 3,
    background: PD.paper3,
    padding: 3,
    borderRadius: 999,
    border: '1px solid rgba(31,36,24,0.1)',
  };
  return (
    <div style={wrap}>
      {['Ask', 'Approve', 'Auto'].map((l, i) => (
        <span
          key={l}
          style={{
            ...MONO_STYLE,
            padding: '5px 12px',
            fontSize: 11,
            borderRadius: 999,
            background: i === level - 1 ? PD.ink : 'transparent',
            color: i === level - 1 ? PD.paper : '#6A6A56',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}
