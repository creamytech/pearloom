'use client';

// Submissions — friends submit photos, toasts, songs; moderation feed.

import { useState } from 'react';
import { Worm } from '@/components/brand/groove';
import { PD, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, btnInk, btnGhost, btnMini, btnMiniGhost } from './DashShell';

type SubKind = 'photo' | 'song' | 'note';
type SubStatus = 'pending' | 'approved' | 'flag';

interface Submission {
  k: SubKind;
  from: string;
  when: string;
  t: string;
  img?: { bg: string; accent: string; shape: 'circle' | 'wave' | 'blob' };
  status: SubStatus;
}

const SUBS: Submission[] = [
  { k: 'photo', from: 'Hailey Chen',    when: '2 hr',      t: 'Rehearsal dinner at the inn — the whole table laughing.', img: { bg: PD.gold, accent: PD.paperDeep, shape: 'circle' }, status: 'pending' },
  { k: 'song',  from: 'Marcus Kim',     when: '4 hr',      t: 'Bill Withers — Lovely Day (for the father-daughter)', status: 'approved' },
  { k: 'note',  from: 'Aunt Ines',      when: '6 hr',      t: 'To Priya and Dev: I remember when you two first met in my kitchen on the Fourth. You stole a peach. The rest is history. Love you both.', status: 'pending' },
  { k: 'photo', from: 'Halide Studios', when: 'yesterday', t: "Couple's session in the meadow.", img: { bg: PD.olive, accent: PD.butter, shape: 'wave' }, status: 'approved' },
  { k: 'song',  from: 'Jenna + Theo',   when: 'yesterday', t: 'Sade — By Your Side', status: 'approved' },
  { k: 'photo', from: 'Oscar Santos',   when: '2 d',       t: 'Dad teaching you to tie your shoes, 1994. Peach sauce on your cheek.', img: { bg: PD.rose, accent: PD.plum, shape: 'blob' }, status: 'flag' },
  { k: 'note',  from: 'Dr. Wen',        when: '2 d',       t: "I'm on call but my heart is on the lawn. Love you both. W.", status: 'approved' },
  { k: 'song',  from: 'DJ Harriet',     when: '3 d',       t: 'Curated the first-dance run-up (12 tracks). Need your blessing.', status: 'pending' },
];

const iconFor = (k: SubKind) => (k === 'photo' ? '◎' : k === 'song' ? '♫' : '✢');
const colorFor = (k: SubKind) => (k === 'photo' ? PD.olive : k === 'song' ? PD.plum : PD.gold);

function SubImage({ img }: { img: NonNullable<Submission['img']> }) {
  return (
    <div
      style={{
        height: 140,
        background: img.bg,
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
        {img.shape === 'circle' && (
          <div style={{ width: 90, height: 90, borderRadius: 999, background: img.accent, opacity: 0.85 }} />
        )}
        {img.shape === 'wave' && (
          <Worm width={220} height={80} color={img.accent} strokeWidth={4} segments={3} />
        )}
        {img.shape === 'blob' && (
          <div
            style={{
              width: 110,
              height: 110,
              background: img.accent,
              borderRadius: '62% 38% 54% 46% / 49% 58% 42% 51%',
              animation: 'pl-blob-morph 14s ease-in-out infinite',
            }}
          />
        )}
      </div>
      <div
        style={{
          ...MONO_STYLE,
          position: 'absolute',
          bottom: 8,
          left: 10,
          fontSize: 9,
          color: PD.paper,
          opacity: 0.85,
        }}
      >
        PLACEHOLDER · AWAITING UPLOAD
      </div>
    </div>
  );
}

export function DashSubmissions() {
  const [tab, setTab] = useState<SubStatus | 'all'>('pending');
  const filtered = SUBS.filter((s) => tab === 'all' || s.status === tab);

  return (
    <DashShell>
      <Topbar
        subtitle="SUBMISSIONS · INBOX"
        title={
          <span>
            Friends are{' '}
            <span style={{ fontStyle: 'italic', color: PD.terra, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              weaving
            </span>{' '}
            the reel.
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnGhost}>Submission link</button>
            <button style={btnInk}>✦ Ask Pear to pre-sort</button>
          </div>
        }
      >
        Photos, toasts, and song requests come here first. Approve, edit, or tuck away. Pear has pre-flagged
        one that might be sensitive.
      </Topbar>

      <main style={{ padding: '20px 40px 60px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {([
            { k: 'pending', l: 'Pending · 3', c: PD.gold },
            { k: 'approved', l: 'Approved · 4', c: PD.olive },
            { k: 'flag', l: 'Flagged · 1', c: PD.terra },
            { k: 'all', l: 'All · 8', c: PD.ink },
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))',
            gap: 16,
          }}
        >
          {filtered.map((s, i) => (
            <Panel
              key={i}
              bg={s.status === 'flag' ? '#F1D7CE' : PD.paperCard}
              style={{ padding: 18 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    background: colorFor(s.k),
                    color: PD.paper,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontFamily: '"Fraunces", Georgia, serif',
                  }}
                >
                  {iconFor(s.k)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.from}</div>
                  <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>
                    {s.k.toUpperCase()} · {s.when}
                  </div>
                </div>
                {s.status === 'flag' && (
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
                    PEAR FLAGGED
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

              {s.img && <SubImage img={s.img} />}
              <div
                style={{
                  fontSize: s.k === 'note' ? 14.5 : 13.5,
                  color: PD.ink,
                  lineHeight: 1.55,
                  marginTop: s.img ? 14 : 0,
                  fontFamily: s.k === 'note' ? '"Fraunces", Georgia, serif' : 'var(--pl-font-body)',
                  fontStyle: s.k === 'note' ? 'italic' : 'normal',
                  fontVariationSettings: s.k === 'note' ? '"opsz" 144, "SOFT" 80, "WONK" 1' : undefined,
                }}
              >
                {s.t}
              </div>

              {s.status === 'flag' && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.6)',
                    borderRadius: 10,
                    borderLeft: `3px solid ${PD.terra}`,
                  }}
                >
                  <div style={{ ...MONO_STYLE, fontSize: 9, color: PD.terra, marginBottom: 3 }}>
                    PEAR&rsquo;S NOTE
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: PD.inkSoft,
                      lineHeight: 1.45,
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    The couple asked no childhood embarrassment photos. You decide.
                  </div>
                </div>
              )}

              {s.status !== 'approved' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                  <button style={{ ...btnMini, background: PD.ink, color: PD.paper, flex: 1 }}>
                    Approve
                  </button>
                  <button style={btnMiniGhost}>Reply</button>
                  <button style={btnMiniGhost}>Tuck away</button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      </main>
    </DashShell>
  );
}
