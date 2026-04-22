'use client';

// Day-of sections: Topbar (tabs + header strip), RunOfShow (manifest
// events timeline), Announcements (real API), HeroGreeting.

import { useState } from 'react';
import Link from 'next/link';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../design/DesignAtoms';
import type { WeddingEvent } from '@/types';
import type { Announcement } from './DayOfHooks';

const HERO_IMG =
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=80';

// ── Tabs + header strip ──────────────────────────────────────
const TABS: Array<{ k: string; l: string; href: string }> = [
  { k: 'overview', l: 'Overview', href: '/dashboard' },
  { k: 'guests', l: 'Guest List', href: '/rsvps' },
  { k: 'day-of', l: 'Day Of', href: '/dashboard/day-of' },
  { k: 'timeline', l: 'Timeline', href: '/dashboard/day-of#timeline' },
  { k: 'design', l: 'Design', href: '/dashboard/gallery' },
];

export function DayOfTabs({ active = 'day-of' }: { active?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 28,
        justifyContent: 'center',
        padding: '6px 0',
        flexWrap: 'wrap',
      }}
    >
      {TABS.map((t) => {
        const on = t.k === active;
        return (
          <Link
            key={t.k}
            href={t.href}
            style={{
              color: PD.ink,
              fontSize: 14,
              fontWeight: on ? 500 : 400,
              textDecoration: 'none',
              position: 'relative',
              padding: '6px 2px',
              borderBottom: on ? `1.5px solid ${PD.olive}` : '1.5px solid transparent',
            }}
          >
            {t.l}
          </Link>
        );
      })}
    </div>
  );
}

export function DayOfHeaderStrip({
  dateLabel,
  progress,
  onView,
}: {
  dateLabel: string;
  progress: number;
  onView: () => void;
}) {
  const pct = Math.round(progress * 100);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)',
        gap: 16,
        padding: '0 clamp(16px, 4vw, 32px) 22px',
      }}
      className="pl-dayof-header"
    >
      <Tile
        lead="📅"
        title={dateLabel}
        sub="Day of"
        leadBg="#E8DFE9"
      />
      <Tile
        lead={<span style={{ fontSize: 10, fontWeight: 600 }}>{pct}%</span>}
        title="Day of progress"
        sub={`${pct}% complete`}
        progress={progress}
        leadBg={PD.paperCard}
      />
      <Tile
        lead="☀"
        title="82°F"
        sub="Mostly sunny"
        leadBg="#F3D0BD"
      />
      <Tile
        lead="✓"
        title="All systems go"
        sub="No alerts"
        leadBg="#D9E0C2"
      />
      <Tile
        lead={<Pear size={18} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />}
        title="Pear is online"
        sub="Last updated just now"
        leadBg={PD.paperCard}
        onClick={onView}
      />
      <style jsx>{`
        @media (max-width: 1060px) {
          :global(.pl-dayof-header) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 640px) {
          :global(.pl-dayof-header) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function Tile({
  lead,
  title,
  sub,
  progress,
  leadBg,
  onClick,
}: {
  lead: React.ReactNode;
  title: string;
  sub: string;
  progress?: number;
  leadBg?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFEF7',
        border: '1px solid rgba(31,36,24,0.06)',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: leadBg ?? PD.paperCard,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          color: PD.ink,
          flexShrink: 0,
        }}
      >
        {lead}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: PD.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        {progress !== undefined ? (
          <div
            style={{
              marginTop: 6,
              height: 4,
              background: 'rgba(31,36,24,0.08)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round(progress * 100)}%`,
                height: '100%',
                background: PD.olive,
                transition: 'width 300ms',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              fontSize: 11,
              color: PD.inkSoft,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Run of Show ──────────────────────────────────────────────
export function RunOfShow({
  events,
  now = new Date(),
}: {
  events: WeddingEvent[];
  now?: Date;
}) {
  const sorted = [...events].sort((a, b) => {
    const at = timeMinutes(a.time);
    const bt = timeMinutes(b.time);
    return at - bt;
  });
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let activeIdx = sorted.findIndex((e) => timeMinutes(e.time) > nowMin);
  if (activeIdx === -1) activeIdx = sorted.length; // all past
  const activeEvent = activeIdx > 0 ? sorted[activeIdx - 1] : null;

  return (
    <section
      style={{
        background: '#FFFEF7',
        borderRadius: 18,
        padding: 22,
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10.5,
            color: PD.inkSoft,
            letterSpacing: '0.24em',
          }}
        >
          RUN OF SHOW
        </div>
        <Link
          href="/dashboard/day-of#timeline"
          style={{
            fontSize: 12,
            color: PD.ink,
            textDecoration: 'none',
            border: '1px solid rgba(31,36,24,0.15)',
            padding: '6px 12px',
            borderRadius: 999,
            fontWeight: 500,
          }}
        >
          View full timeline
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div
          style={{
            padding: '28px 10px',
            textAlign: 'center',
            fontSize: 13,
            color: PD.inkSoft,
            lineHeight: 1.55,
          }}
        >
          No events scheduled yet. Add a ceremony time in the editor.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 10,
              top: 8,
              bottom: 8,
              width: 1,
              background: 'rgba(31,36,24,0.08)',
            }}
          />
          {sorted.map((ev, i) => {
            const isPast = i < activeIdx - 1;
            const isActive = activeEvent?.id === ev.id;
            const isLive = isActive && timeMinutes(ev.time) <= nowMin;
            return (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '12px 0',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 20,
                    display: 'flex',
                    justifyContent: 'center',
                    paddingTop: 6,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: isActive ? 14 : 10,
                      height: isActive ? 14 : 10,
                      borderRadius: 999,
                      background: isActive ? '#6E5BA8' : isPast ? PD.olive : '#FFFEF7',
                      border: isPast || isActive ? 'none' : '1.5px solid rgba(31,36,24,0.2)',
                      boxShadow: isActive ? '0 0 0 4px rgba(110,91,168,0.18)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFEF7',
                      fontSize: 8,
                    }}
                  >
                    {isPast ? '✓' : ''}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: PD.inkSoft,
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ fontWeight: 500, color: PD.ink }}>{ev.time || '—'}</span>
                    {isLive && (
                      <span
                        style={{
                          fontSize: 10,
                          color: '#6E5BA8',
                          background: '#E8DFE9',
                          padding: '1px 8px',
                          borderRadius: 999,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 999,
                            background: '#6E5BA8',
                          }}
                        />
                        LIVE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: PD.ink, lineHeight: 1.3 }}>
                    {ev.name}
                  </div>
                  {ev.description && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: PD.inkSoft,
                        lineHeight: 1.4,
                        marginTop: 2,
                      }}
                    >
                      {ev.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeEvent && activeIdx < sorted.length && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            background: '#E8DFE9',
            borderRadius: 10,
            fontSize: 12,
            color: PD.ink,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: PD.inkSoft }}>Next up in {minutesUntil(sorted[activeIdx].time, now)}</span>
          <strong>{sorted[activeIdx].name}</strong>
        </div>
      )}
    </section>
  );
}

function timeMinutes(t: string): number {
  if (!t) return 0;
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ampm = m[3]?.toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + mm;
}

function minutesUntil(time: string, now: Date): string {
  const target = timeMinutes(time);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const diff = target - nowMin;
  if (diff <= 0) return 'now';
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ── Hero greeting card ───────────────────────────────────────
export function DayOfHero({ firstName }: { firstName: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <section
      style={{
        background: PD.paperCard,
        borderRadius: 22,
        padding: 28,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
        gap: 22,
        alignItems: 'center',
        border: '1px solid rgba(31,36,24,0.05)',
      }}
      className="pl-dayof-hero"
    >
      <div>
        <h2
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(28px, 3.4vw, 40px)',
            margin: '0 0 14px',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          {greeting},{' '}
          <span
            style={{
              fontStyle: 'italic',
              color: PD.olive,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            {firstName}.
          </span>
        </h2>
        <p style={{ fontSize: 14, color: PD.inkSoft, lineHeight: 1.55, margin: '0 0 18px', maxWidth: 360 }}>
          You&rsquo;ve got this. We&rsquo;re here to help every moment feel seamless and special.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/day-of#timeline"
            style={{
              background: PD.oliveDeep,
              color: '#FFFEF7',
              padding: '10px 18px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            View timeline <span>→</span>
          </Link>
          <button
            style={{
              background: 'transparent',
              border: '1px solid rgba(31,36,24,0.18)',
              padding: '10px 18px',
              borderRadius: 999,
              fontSize: 13,
              color: PD.ink,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ★ Mark milestone
          </button>
        </div>
      </div>
      <div
        style={{
          aspectRatio: '4 / 3',
          borderRadius: 14,
          background: `url(${HERO_IMG}) center/cover`,
        }}
        className="pl-dayof-hero-img"
      />
      <style jsx>{`
        @media (max-width: 720px) {
          :global(.pl-dayof-hero) {
            grid-template-columns: 1fr !important;
          }
          :global(.pl-dayof-hero-img) {
            order: -1;
          }
        }
      `}</style>
    </section>
  );
}

// ── Announcements (real API + compose) ───────────────────────
export function Announcements({
  siteId,
  items,
  loading,
  onRefresh,
}: {
  siteId?: string | null;
  items: Announcement[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!siteId || !text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, body: text.trim(), kind: 'update' }),
      });
      if (res.ok) {
        setText('');
        setComposing(false);
        onRefresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      style={{
        background: '#FFFEF7',
        borderRadius: 18,
        padding: 22,
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10.5,
            color: PD.inkSoft,
            letterSpacing: '0.24em',
          }}
        >
          ANNOUNCEMENTS
        </div>
        <button
          onClick={() => setComposing((v) => !v)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(31,36,24,0.15)',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 12,
            color: PD.ink,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {composing ? 'Cancel' : '+ New announcement'}
        </button>
      </div>

      {composing && (
        <div style={{ marginBottom: 14 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Shuttles are at the hotel entrance every 20 minutes."
            rows={3}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 10,
              border: '1px solid rgba(31,36,24,0.12)',
              fontFamily: 'inherit',
              fontSize: 13.5,
              color: PD.ink,
              background: PD.paperCard,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={submit}
              disabled={busy || !text.trim()}
              style={{
                background: PD.oliveDeep,
                color: '#FFFEF7',
                border: 'none',
                borderRadius: 999,
                padding: '8px 18px',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: busy || !text.trim() ? 'not-allowed' : 'pointer',
                opacity: busy || !text.trim() ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: PD.inkSoft, padding: '12px 0' }}>Threading…</div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 13, color: PD.inkSoft, padding: '12px 0', lineHeight: 1.55 }}>
          Nothing yet. Post a day-of update — it goes straight to guests.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.slice(0, 5).map((a) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid rgba(31,36,24,0.04)',
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: PD.paperCard,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                📣
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: PD.ink, lineHeight: 1.5 }}>{a.body}</div>
                <div style={{ fontSize: 11, color: PD.inkSoft, marginTop: 3 }}>
                  {a.sent_at
                    ? new Date(a.sent_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'Draft'}
                  {a.author_email ? ` · ${a.author_email.split('@')[0]}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
