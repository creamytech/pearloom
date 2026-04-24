'use client';

/* ========================================================================
   PEARLOOM — DASHBOARD HOME (v8 handoff port)
   Wired to real data via existing dash hooks.
   ======================================================================== */

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';
import { Heart, Icon, PhotoPlaceholder, Pear, PostIt, Sparkle, Stamp } from '../motifs';
import { DashLayout } from '../dash/DashShell';
import { useSelectedSite, siteDisplayName } from '@/components/marketing/design/dash/hooks';
import { useDashStats, useLinkedCelebrations, useDaysToGo } from '@/components/marketing/v2/useDashStats';
import { formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { getKickoffCards, getKickoffEyebrow, type KickoffCard } from '@/lib/event-os/dashboard-presets';

function Section({
  title,
  icon = 'sparkles',
  right,
  children,
}: {
  title: string;
  icon?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>
          <Icon name={icon} size={15} color="var(--gold)" />
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function kickoffIcon(kind: KickoffCard['icon']) {
  switch (kind) {
    case 'pear':
      return <Pear size={44} tone="ink" shadow={false} sparkle />;
    case 'image':
      return (
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="#3D4A1F" strokeWidth={1.6}>
          <rect x="6" y="14" width="28" height="22" rx="2" fill="#fff" />
          <rect x="12" y="10" width="28" height="22" rx="2" fill="#fff" />
          <circle cx="28" cy="18" r="2.5" fill="#D4A95D" />
          <path d="M14 26l6-6 6 6 4-4 10 10H14z" fill="#8B9C5A" />
        </svg>
      );
    case 'grid':
      return (
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="#3D4A1F" strokeWidth={1.6}>
          <rect x="6" y="10" width="36" height="24" rx="2" fill="#fff" />
          <path d="M6 16h36" />
          <circle cx="10" cy="13" r="1" fill="#3D4A1F" />
          <circle cx="14" cy="13" r="1" fill="#3D4A1F" />
          <rect x="10" y="20" width="12" height="10" fill="#C4B5D9" />
          <rect x="26" y="20" width="12" height="10" fill="#F0C9A8" />
        </svg>
      );
    case 'heart':
      return <Heart size={40} color="var(--peach-ink)" />;
    default:
      return <Icon name={kind} size={28} color="var(--ink)" />;
  }
}

function KickoffCards({ occasion }: { occasion?: string | null }) {
  const cards = getKickoffCards(occasion);
  const eyebrow = getKickoffEyebrow(occasion);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0 12px' }}>
        <Sparkle size={14} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{eyebrow}</span>
      </div>
      <div className="pl8-kickoff">
        {cards.map((c) => (
          <div
            key={c.title}
            className="card"
            style={{
              padding: 20,
              background:
                c.tone === 'lavender'
                  ? 'var(--lavender-bg)'
                  : c.tone === 'peach'
                    ? 'var(--peach-bg)'
                    : 'var(--sage-tint)',
              border: 'none',
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background:
                  c.tone === 'lavender'
                    ? '#C4B5D9'
                    : c.tone === 'peach'
                      ? '#F0C9A8'
                      : c.tone === 'sage'
                        ? '#CBD29E'
                        : 'var(--cream-2)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {kickoffIcon(c.icon)}
            </div>
            <div style={{ flex: 1 }}>
              <div
                className="display"
                style={{
                  fontSize: 20,
                  marginBottom: 4,
                  color:
                    c.tone === 'lavender'
                      ? 'var(--lavender-ink)'
                      : c.tone === 'peach'
                        ? 'var(--peach-ink)'
                        : 'var(--ink)',
                }}
              >
                {c.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4, marginBottom: 12 }}>{c.body}</div>
              <Link href={c.href} className="btn btn-outline btn-sm">
                {c.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventSites({
  sites,
  loading,
}: {
  sites: Array<{ id: string; domain: string; published?: boolean; coverPhoto?: string | null; names?: [string, string] | null; occasion?: string }>;
  loading: boolean;
}) {
  const statusFor = (s: { published?: boolean; updatedAt?: unknown }) =>
    s.published ? 'Published' : 'Draft';
  const statusColor: Record<string, { bg: string; fg: string }> = {
    Published: { bg: 'var(--sage-tint)', fg: 'var(--sage-deep)' },
    'In progress': { bg: 'var(--peach-bg)', fg: 'var(--peach-ink)' },
    Draft: { bg: 'var(--cream-2)', fg: 'var(--ink-soft)' },
    'Not started': { bg: 'var(--card)', fg: 'var(--ink-muted)' },
  };
  return (
    <Section
      title="Your event sites"
      icon="layout"
      right={
        <Link href="/dashboard/event" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          View all sites
        </Link>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && (
          <div style={{ padding: 14, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
            Loading your sites…
          </div>
        )}
        {!loading && sites.length === 0 && (
          <div
            style={{
              padding: 22,
              textAlign: 'center',
              background: 'var(--cream-2)',
              borderRadius: 12,
              color: 'var(--ink-soft)',
              fontSize: 13,
            }}
          >
            <Pear size={42} tone="sage" />
            <div style={{ marginTop: 8 }}>No sites yet — let&apos;s make one.</div>
          </div>
        )}
        {sites.slice(0, 4).map((s) => {
          const name =
            siteDisplayName({
              id: s.id,
              domain: s.domain,
              names: s.names,
              occasion: s.occasion,
            } as Parameters<typeof siteDisplayName>[0]) ?? s.domain;
          const prettyUrl = formatSiteDisplayUrl(s.domain, '', normalizeOccasion(s.occasion));
          const status = statusFor(s);
          const c = statusColor[status];
          return (
            <Link
              key={s.id}
              href={`/dashboard/event?site=${encodeURIComponent(s.id)}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 10,
                borderRadius: 12,
                background: 'var(--cream-2)',
              }}
            >
              <div style={{ width: 54, height: 44, borderRadius: 8, flexShrink: 0, overflow: 'hidden' }}>
                <PhotoPlaceholder
                  tone={s.coverPhoto ? undefined : 'warm'}
                  src={s.coverPhoto ?? undefined}
                  aspect="54/44"
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prettyUrl}</div>
              </div>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: c.bg,
                  color: c.fg,
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                {status}
              </span>
            </Link>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <Link href="/wizard/new" className="btn btn-outline btn-sm">
          + Create new site
        </Link>
      </div>
    </Section>
  );
}

function Milestones({ eventDate }: { eventDate?: string | null }) {
  const rows = useMemo(() => {
    const out: Array<{ d: string; task: string; due: string; big?: boolean }> = [];
    const today = new Date();
    const base = eventDate ? new Date(eventDate) : null;
    const addRow = (daysFromNow: number, task: string, big = false) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + daysFromNow);
      const d = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const due =
        daysFromNow === 0 ? 'today' : daysFromNow === 1 ? 'tomorrow' : `in ${daysFromNow} days`;
      out.push({ d, task, due, big });
    };
    addRow(11, 'Send invitations');
    addRow(18, 'RSVP deadline');
    addRow(26, 'Menu selection');
    addRow(34, 'Finalize seating chart');
    if (base) {
      const diff = Math.round((base.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0)
        out.push({
          d: base.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          task: 'The big day!',
          due: '',
          big: true,
        });
    }
    return out;
  }, [eventDate]);
  return (
    <Section
      title="Upcoming milestones"
      icon="clock"
      right={
        <Link href="/dashboard/day-of" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          View timeline
        </Link>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((r, i) => (
          <div
            key={`${r.task}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 18px 1fr auto',
              gap: 10,
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid var(--line-soft)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 500 }}>{r.d}</div>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                border: '2px solid var(--ink-muted)',
                background: r.big ? 'var(--ink)' : 'transparent',
                borderColor: r.big ? 'var(--ink)' : 'var(--ink-muted)',
              }}
            />
            <div style={{ fontSize: 13.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {r.task}
              {r.big && <Heart size={12} />}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{r.due}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

interface GuestTasksProps {
  /** Real RSVP-stats passed in from the dashboard data loader.
   *  When the host hasn't imported any guests yet, pass
   *  all zeros and the component renders an empty-state card
   *  instead of fake percentages. */
  invited?: number;
  responded?: number;
  yes?: number;
  no?: number;
  awaiting?: number;
  needRsvp?: number;
  needMeal?: number;
  needSong?: number;
}

function GuestTasks({ invited = 0, responded = 0, yes = 0, no = 0, awaiting = 0, needRsvp = 0, needMeal = 0, needSong = 0 }: GuestTasksProps) {
  const stats = [
    { label: 'Invited', val: invited },
    { label: 'Responded', val: responded },
    { label: 'Yes', val: yes },
    { label: 'No', val: no },
    { label: 'Awaiting', val: awaiting },
  ];
  const tasks = [
    { label: 'Need to RSVP', count: needRsvp },
    { label: 'Need meal selection', count: needMeal },
    { label: 'Need to submit song request', count: needSong },
  ].filter((t) => t.count > 0);
  const hasAny = invited > 0 || responded > 0;
  return (
    <Section
      title="Guest tasks & RSVPs"
      icon="users"
      right={
        <Link href="/dashboard/rsvp" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          View guests
        </Link>
      }
    >
      {hasAny ? (
        <>
          <div className="pl8-cols-5" style={{ gap: 6, marginBottom: 14 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ background: 'var(--cream-2)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{s.val}</div>
              </div>
            ))}
          </div>
          {tasks.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 6 }}>Outstanding tasks</div>
              {tasks.map((t) => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 5, border: '1.5px solid var(--line)', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13 }}>{t.label}</div>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t.count}</span>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <div
          style={{
            padding: 16,
            textAlign: 'center',
            background: 'var(--cream-2)',
            borderRadius: 12,
            border: '1px dashed var(--line)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
            No guests yet. Import your list to start tracking RSVPs.
          </div>
          <Link href="/dashboard/rsvp" className="btn btn-outline btn-sm">
            <Icon name="users" size={13} /> Add guests
          </Link>
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <Link href="/dashboard/rsvp" className="btn btn-outline btn-sm">
          <Icon name="mail" size={13} /> Message guests
        </Link>
      </div>
    </Section>
  );
}

function Moments() {
  const tones = ['warm', 'cream', 'dusk', 'peach'] as const;
  return (
    <Section
      title="Moments & memories"
      icon="image"
      right={
        <Link href="/dashboard/gallery" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          View all photos
        </Link>
      }
    >
      <div className="pl8-cols-5" style={{ gap: 8 }}>
        {tones.map((t, i) => (
          <div key={i} style={{ borderRadius: 10, overflow: 'hidden' }}>
            <PhotoPlaceholder tone={t} aspect="1/1" />
          </div>
        ))}
        <Link
          href="/dashboard/gallery"
          style={{
            borderRadius: 10,
            background: 'var(--lavender-bg)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--lavender-ink)',
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
            padding: 10,
            gap: 6,
            aspectRatio: '1/1',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--lavender)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name="plus" size={14} color="#fff" strokeWidth={2.5} />
            </div>
            Upload
            <br />
            more
          </div>
        </Link>
      </div>
    </Section>
  );
}

function LinkedCelebrations({
  items,
}: {
  items: Array<{ id?: string; name: string; date?: string | null; tone: string }>;
}) {
  return (
    <Section
      title="Linked celebrations"
      icon="link"
      right={
        <Link href="/dashboard/event" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          View all
        </Link>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.length === 0 && (
          <div style={{ padding: '8px 4px', color: 'var(--ink-muted)', fontSize: 13 }}>
            No linked events yet.
          </div>
        )}
        {items.map((i) => (
          <div key={i.id ?? i.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background:
                  i.tone === 'sage'
                    ? 'var(--sage-tint)'
                    : i.tone === 'lavender'
                      ? 'var(--lavender-bg)'
                      : 'var(--peach-bg)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" color="var(--ink-soft)">
                <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{i.name}</div>
              {i.date && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{i.date}</div>}
            </div>
            <Icon name="check" size={16} color="var(--sage-deep)" />
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <Link href="/wizard/new" className="btn btn-outline btn-sm">
          + Add celebration
        </Link>
      </div>
    </Section>
  );
}

interface PearChatMessage {
  role: 'pear' | 'user';
  text: string;
}

function PearAssistant() {
  const [messages, setMessages] = useState<PearChatMessage[]>([
    {
      role: 'pear',
      text:
        "Hi! I'm Pear. Ask me to draft a guest reminder, brainstorm menu ideas, write invite copy, or anything else — I'll help.",
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          // Dashboard-level chat has no single active manifest; send an
          // empty one and a dashboard siteState so Pear knows this is
          // general guidance, not a specific-site edit.
          manifest: {},
          siteState: 'dashboard',
          names: null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `Pear is unavailable (${res.status})`);
      }
      const reply: string =
        typeof data?.reply === 'string'
          ? data.reply
          : typeof data?.message === 'string'
            ? data.message
            : typeof data?.text === 'string'
              ? data.text
              : "I'm here whenever you need me. — Pear";
      setMessages((prev) => [...prev, { role: 'pear', text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pear is resting. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const quickActions = [
    'Write a save-the-date reminder',
    'Draft a welcome message for guests',
    'Brainstorm menu ideas',
  ];

  return (
    <Section title="Pear Assistant" icon="sparkles">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 14,
          maxHeight: 280,
          overflowY: 'auto',
          paddingRight: 4,
        }}
      >
        {messages.map((m, i) => {
          const mine = m.role === 'user';
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              {!mine && <Pear size={36} tone="sage" sparkle />}
              <div
                style={{
                  background: mine ? 'var(--ink, #18181B)' : 'var(--cream-2)',
                  color: mine ? 'var(--cream, #FDFAF0)' : 'var(--ink-soft)',
                  padding: '10px 14px',
                  borderRadius: 14,
                  borderBottomLeftRadius: mine ? 14 : 2,
                  borderBottomRightRadius: mine ? 2 : 14,
                  fontSize: 13,
                  lineHeight: 1.5,
                  maxWidth: '82%',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        {busy && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Pear size={36} tone="sage" sparkle />
            <div
              style={{
                background: 'var(--cream-2)',
                padding: '10px 14px',
                borderRadius: 14,
                borderBottomLeftRadius: 2,
                fontSize: 13,
                color: 'var(--ink-muted)',
                fontStyle: 'italic',
              }}
            >
              Pear is thinking…
            </div>
          </div>
        )}
      </div>
      {error && (
        <div style={{ fontSize: 12, color: 'var(--peach-ink)', marginBottom: 8 }}>{error}</div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        style={{ position: 'relative', marginBottom: 10 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Pear anything…"
          disabled={busy}
          style={{
            width: '100%',
            padding: '12px 48px 12px 16px',
            background: 'var(--cream-2)',
            border: '1px solid var(--line)',
            borderRadius: 999,
            fontSize: 13,
            outline: 'none',
            color: 'var(--ink)',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          style={{
            position: 'absolute',
            right: 6,
            top: 6,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: input.trim() ? 'var(--lavender-ink, #6B5A8C)' : 'var(--line)',
            display: 'grid',
            placeItems: 'center',
            border: 0,
            cursor: busy ? 'wait' : input.trim() ? 'pointer' : 'not-allowed',
          }}
          aria-label="Send"
        >
          <Icon name="arrow-right" size={14} color="#fff" strokeWidth={2.5} />
        </button>
      </form>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {quickActions.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => void send(c)}
            disabled={busy}
            className="pill pill-cream"
            style={{
              fontSize: 11,
              cursor: busy ? 'wait' : 'pointer',
              border: 'none',
              fontFamily: 'inherit',
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </Section>
  );
}

function HelpBand() {
  return (
    <div
      style={{
        margin: '20px 32px 0',
        padding: '18px 24px',
        background: 'var(--lavender-bg)',
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        position: 'relative',
        overflow: 'hidden',
        flexWrap: 'wrap',
      }}
    >
      <Pear size={50} tone="sage" sparkle />
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
          Need a hand? Pear&apos;s here.
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
          Explore helpful tips and tools to keep everything running smoothly.
        </div>
      </div>
      {[
        { icon: 'flag' as const, label: 'Getting started', sub: 'Set up your site\nin minutes', href: '/dashboard/help' },
        { icon: 'bell' as const, label: 'Help center', sub: 'Browse guides\nand tutorials', href: '/dashboard/help' },
        { icon: 'mail' as const, label: 'Live support', sub: 'Chat with our\nfriendly team', href: '/dashboard/help' },
      ].map((it) => (
        <Link key={it.label} href={it.href} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'var(--card)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name={it.icon} size={16} color="var(--ink-soft)" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{it.label}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', whiteSpace: 'pre-line' }}>{it.sub}</div>
          </div>
        </Link>
      ))}
      <Stamp size={70} tone="lavender" text="YOU'VE GOT THIS" icon="heart" rotation={-10} />
    </div>
  );
}

export function DashHomeV8() {
  const { data: session } = useSession();
  const { sites, site, loading } = useSelectedSite();
  const stats = useDashStats(site?.id);
  const linked = useLinkedCelebrations(site?.id);
  const daysToGo = useDaysToGo(site?.eventDate ?? undefined);
  const first = (session?.user?.name || session?.user?.email || 'there').split(/[\s@]/)[0];
  const activeName = site ? siteDisplayName(site) : 'your celebration';
  const linkedItems = (linked?.siblings ?? []).map((i, idx) => ({
    id: i.domain,
    name: i.title || i.domain,
    date: i.date ?? null,
    tone: idx % 3 === 0 ? 'sage' : idx % 3 === 1 ? 'lavender' : 'peach',
  }));

  return (
    <DashLayout
      active="dashboard"
      title={`Welcome back, ${first}`}
      subtitle={
        <>
          Here&apos;s what&apos;s happening with{' '}
          <span style={{ color: 'var(--lavender-ink)', fontWeight: 500 }}>{activeName}</span>
          {daysToGo !== null && daysToGo !== undefined ? (
            <> — {daysToGo} days to go.</>
          ) : (
            <>.</>
          )}
        </>
      }
      ctaText="Create new event"
      ctaHref="/wizard/new"
    >
      <div data-welcome-notes style={{ position: 'absolute', top: 60, right: 160, zIndex: 2, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <PostIt tone="lavender" width={160} rotation={-6}>
          Every detail,
          <br />
          together.
          <span style={{ fontFamily: 'var(--font-script)', color: 'var(--ink-muted)', fontSize: 18 }}> ~</span>
        </PostIt>
        <Stamp size={80} tone="peach" text="MADE FOR MEANINGFUL MOMENTS" icon="pear" rotation={10} />
      </div>

      <div style={{ padding: '0 32px 24px', maxWidth: 1240 }}>
        <KickoffCards occasion={site?.occasion} />
        <div className="pl8-dash-threecol" style={{ marginTop: 24 }}>
          <EventSites sites={sites ?? []} loading={loading} />
          <Milestones eventDate={site?.eventDate ?? null} />
          <GuestTasks
            invited={stats.invited}
            responded={stats.rsvps}
            yes={stats.yes}
            no={stats.no}
            awaiting={stats.awaiting}
            needRsvp={stats.awaiting}
            needMeal={stats.needMeal}
            needSong={stats.needSong}
          />
        </div>
        <div className="pl8-dash-threecol-b" style={{ marginTop: 16 }}>
          <Moments />
          <LinkedCelebrations items={linkedItems} />
          <PearAssistant />
        </div>
      </div>
      <HelpBand />
      <div style={{ height: 40 }} />
    </DashLayout>
  );
}
